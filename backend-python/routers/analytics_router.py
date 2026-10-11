import datetime
import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from db_models import PurchaseOrder, PurchaseOrderItem, Product, Supplier, User
from auth import get_current_user
from models.request_models import SimulationRequest
from models.response_models import (
    IntelligenceResponse,
    SimulationResponse,
    SmartReorderResponse
)
from services.intelligence_service import calculate_product_intelligence
from services.simulation_service import run_inventory_simulation
from services.forecasting_service import calculate_smart_reorder_recommendations

logger = logging.getLogger("inveniq.analytics_router")

router = APIRouter(prefix="/analytics", tags=["Product Intelligence & Analytics"])

class AutoOrderRequest(BaseModel):
    productId: Optional[int] = None
    supplierId: Optional[int] = None
    notes: Optional[str] = "Automated replenishment order generated via InvenIQ Smart Inventory"

@router.get("/intelligence", response_model=IntelligenceResponse)
async def get_product_intelligence():
    """
    ABC Analysis, Fast/Slow/Dead stock classification, Turnover ratios,
    and Days-of-Stock-Left calculations.
    """
    try:
        return await calculate_product_intelligence()
    except Exception as e:
        logger.error(f"Intelligence calculation error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to calculate product intelligence: {str(e)}"
        )

@router.post("/simulate", response_model=SimulationResponse)
async def simulate_inventory_scenarios(request: SimulationRequest):
    """
    What-If Simulator: project stockouts, revenue, and cost impacts across
    demand swings, lead time variations, price changes, and reorder levels.
    """
    try:
        return await run_inventory_simulation(request)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        logger.error(f"Simulation execution error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Simulation failed: {str(e)}"
        )

@router.get("/smart-reorder", response_model=SmartReorderResponse)
async def get_smart_reorder_recommendations():
    """
    Smart Inventory Recommendations: Moving Average demand forecasts,
    safety stock, reorder points, and Wilson Economic Order Quantity (EOQ).
    """
    try:
        return await calculate_smart_reorder_recommendations()
    except Exception as e:
        logger.error(f"Smart reorder forecast error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Forecasting calculation failed: {str(e)}"
        )

@router.post("/auto-order")
async def execute_auto_order(
    req: Optional[AutoOrderRequest] = None,
    db: Session = Depends(get_db)
):
    """
    Automated Reordering Engine: Instantly generates Purchase Orders for products
    at or below their statistical Reorder Point (ROP) grouped by supplier.
    """
    try:
        reorder_data = await calculate_smart_reorder_recommendations()
        items = reorder_data.recommendations

        # Filter items
        target_product_id = req.productId if req else None
        target_supplier_id = req.supplierId if req else None

        if target_product_id:
            items_to_order = [it for it in items if it.productId == target_product_id]
        else:
            items_to_order = [it for it in items if it.needsReorder and it.suggestedOrderQuantity > 0]

        if target_supplier_id:
            items_to_order = [it for it in items_to_order if it.supplierId == target_supplier_id]

        if not items_to_order:
            return {
                "success": True,
                "createdOrdersCount": 0,
                "totalItemsOrdered": 0,
                "totalValue": 0.0,
                "orders": [],
                "message": "All analyzed products have sufficient inventory above their reorder points. No orders needed."
            }

        # Group by supplier
        by_supplier: Dict[int, List[Any]] = {}
        for it in items_to_order:
            # Fallback supplier lookup from Product table if needed
            s_id = it.supplierId
            if not s_id:
                p_db = db.query(Product).filter(Product.id == it.productId).first()
                s_id = p_db.supplier_id if (p_db and p_db.supplier_id) else 1

            if s_id not in by_supplier:
                by_supplier[s_id] = []
            by_supplier[s_id].append(it)

        created_orders = []
        total_value_all = 0.0
        total_units_all = 0
        year = datetime.date.today().year

        for sup_id, sup_items in by_supplier.items():
            supplier = db.query(Supplier).filter(Supplier.id == sup_id).first()
            sup_name = supplier.name if supplier else f"Supplier #{sup_id}"
            lead_time = supplier.lead_time_days if supplier else 7

            count_po = db.query(PurchaseOrder).count() + 1
            po_number = f"PO-{year}-{count_po:04d}"
            exp_date = datetime.date.today() + datetime.timedelta(days=lead_time)

            subtotal = sum(item.suggestedOrderQuantity * item.costPrice for item in sup_items)
            tax = subtotal * 0.08
            total = subtotal + tax

            po = PurchaseOrder(
                order_number=po_number,
                supplier_id=sup_id,
                status="PENDING",
                order_date=datetime.date.today(),
                expected_delivery_date=exp_date,
                subtotal=round(subtotal, 2),
                tax_amount=round(tax, 2),
                total_amount=round(total, 2),
                notes=f"Auto-generated by InvenIQ Smart Reorder Engine for {len(sup_items)} SKUs. {req.notes if req else ''}",
                created_by="system_auto_reorder"
            )
            db.add(po)
            db.commit()
            db.refresh(po)

            for item in sup_items:
                line = PurchaseOrderItem(
                    purchase_order_id=po.id,
                    product_id=item.productId,
                    quantity_ordered=item.suggestedOrderQuantity,
                    quantity_received=0,
                    unit_price=item.costPrice,
                    line_total=round(item.suggestedOrderQuantity * item.costPrice, 2)
                )
                db.add(line)
                total_units_all += item.suggestedOrderQuantity

            db.commit()
            total_value_all += total

            created_orders.append({
                "id": po.id,
                "orderNumber": po.order_number,
                "supplierName": sup_name,
                "itemCount": len(sup_items),
                "totalAmount": round(total, 2)
            })

        return {
            "success": True,
            "createdOrdersCount": len(created_orders),
            "totalItemsOrdered": total_units_all,
            "totalValue": round(total_value_all, 2),
            "orders": created_orders,
            "message": f"Successfully created {len(created_orders)} purchase orders for {total_units_all} units totaling ${total_value_all:,.2f}"
        }

    except Exception as e:
        logger.error(f"Auto-order error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Auto order generation failed: {str(e)}"
        )
