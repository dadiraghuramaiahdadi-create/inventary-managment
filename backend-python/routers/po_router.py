import math
import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from database import get_db
from db_models import PurchaseOrder, PurchaseOrderItem, Product, Supplier, StockTransaction, User
from auth import get_current_user, require_roles
from websocket_manager import ws_manager

router = APIRouter(prefix="/purchase-orders", tags=["Purchase Orders"])

class POItemRequest(BaseModel):
    productId: int
    quantityOrdered: int = Field(..., ge=1)
    unitPrice: float = Field(..., ge=0)

class PORequest(BaseModel):
    supplierId: int
    expectedDeliveryDate: Optional[str] = None
    notes: Optional[str] = ""
    items: List[POItemRequest]

@router.get("")
def get_purchase_orders(
    search: Optional[str] = None,
    status: Optional[str] = None,
    supplierId: Optional[int] = None,
    page: int = Query(0, ge=0),
    size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Retrieve paginated, searchable purchase orders."""
    query = db.query(PurchaseOrder)

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(PurchaseOrder.order_number.ilike(term))

    if status and status.strip():
        query = query.filter(PurchaseOrder.status == status.strip().upper())

    if supplierId:
        query = query.filter(PurchaseOrder.supplier_id == supplierId)

    total_elements = query.count()
    total_pages = math.ceil(total_elements / size) if total_elements > 0 else 1
    offset = page * size

    orders = query.order_by(PurchaseOrder.created_at.desc()).offset(offset).limit(size).all()

    return {
        "content": [po.to_dict() for po in orders],
        "totalPages": total_pages,
        "totalElements": total_elements,
        "size": size,
        "number": page,
        "first": (page == 0),
        "last": (page >= total_pages - 1),
        "empty": (len(orders) == 0)
    }

@router.get("/{id}")
def get_purchase_order_by_id(id: int, db: Session = Depends(get_db)):
    """Retrieve a single purchase order by ID."""
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == id).first()
    if not po:
        raise HTTPException(status_code=404, detail=f"Purchase order not found with id {id}")
    return po.to_dict()

@router.post("", status_code=status.HTTP_201_CREATED)
def create_purchase_order(
    req: PORequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new purchase order with line items."""
    supplier = db.query(Supplier).filter(Supplier.id == req.supplierId).first()
    if not supplier:
        raise HTTPException(status_code=404, detail=f"Supplier not found with id {req.supplierId}")

    if not req.items:
        raise HTTPException(status_code=400, detail="Purchase order must contain at least one line item")

    # Generate sequence order number
    count_today = db.query(PurchaseOrder).count() + 1
    year = datetime.date.today().year
    order_num = f"PO-{year}-{count_today:04d}"

    exp_date = None
    if req.expectedDeliveryDate:
        try:
            exp_date = datetime.date.fromisoformat(req.expectedDeliveryDate.split("T")[0])
        except Exception:
            exp_date = datetime.date.today() + datetime.timedelta(days=supplier.lead_time_days or 7)
    else:
        exp_date = datetime.date.today() + datetime.timedelta(days=supplier.lead_time_days or 7)

    subtotal = 0.0
    for it in req.items:
        subtotal += it.quantityOrdered * it.unitPrice

    tax_amount = subtotal * 0.08  # 8% estimated standard tax
    total_amount = subtotal + tax_amount

    po = PurchaseOrder(
        order_number=order_num,
        supplier_id=supplier.id,
        status="PENDING",
        order_date=datetime.date.today(),
        expected_delivery_date=exp_date,
        subtotal=round(subtotal, 2),
        tax_amount=round(tax_amount, 2),
        total_amount=round(total_amount, 2),
        notes=req.notes or "",
        created_by=current_user.username if current_user else "admin"
    )
    db.add(po)
    db.commit()
    db.refresh(po)

    for it in req.items:
        item = PurchaseOrderItem(
            purchase_order_id=po.id,
            product_id=it.productId,
            quantity_ordered=it.quantityOrdered,
            quantity_received=0,
            unit_price=it.unitPrice,
            line_total=round(it.quantityOrdered * it.unitPrice, 2)
        )
        db.add(item)

    db.commit()
    db.refresh(po)
    return po.to_dict()

@router.put("/{id}")
def update_purchase_order(
    id: int,
    req: PORequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "MANAGER"]))
):
    """Update a pending purchase order."""
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == id).first()
    if not po:
        raise HTTPException(status_code=404, detail=f"Purchase order not found with id {id}")

    if po.status in ("RECEIVED", "CANCELLED"):
        raise HTTPException(status_code=400, detail=f"Cannot edit order in {po.status} status")

    po.supplier_id = req.supplierId
    po.notes = req.notes or ""

    if req.expectedDeliveryDate:
        try:
            po.expected_delivery_date = datetime.date.fromisoformat(req.expectedDeliveryDate.split("T")[0])
        except Exception:
            pass

    # Clear old items and repopulate
    db.query(PurchaseOrderItem).filter(PurchaseOrderItem.purchase_order_id == po.id).delete()

    subtotal = 0.0
    for it in req.items:
        subtotal += it.quantityOrdered * it.unitPrice
        item = PurchaseOrderItem(
            purchase_order_id=po.id,
            product_id=it.productId,
            quantity_ordered=it.quantityOrdered,
            quantity_received=0,
            unit_price=it.unitPrice,
            line_total=round(it.quantityOrdered * it.unitPrice, 2)
        )
        db.add(item)

    po.subtotal = round(subtotal, 2)
    po.tax_amount = round(subtotal * 0.08, 2)
    po.total_amount = round(po.subtotal + po.tax_amount, 2)

    db.commit()
    db.refresh(po)
    return po.to_dict()

@router.post("/{id}/approve")
def approve_purchase_order(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "MANAGER"]))
):
    """Approve a purchase order."""
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == id).first()
    if not po:
        raise HTTPException(status_code=404, detail=f"Purchase order not found with id {id}")

    if po.status != "PENDING" and po.status != "DRAFT":
        raise HTTPException(status_code=400, detail=f"Only PENDING or DRAFT orders can be approved (current: {po.status})")

    po.status = "APPROVED"
    db.commit()
    db.refresh(po)
    return po.to_dict()

@router.post("/{id}/receive")
async def receive_purchase_order(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "MANAGER", "STAFF"]))
):
    """
    Mark a purchase order as RECEIVED. Automatically adds ordered quantities
    to inventory, writes PO_RECEIVE entries to audit log, and broadcasts live updates.
    """
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == id).first()
    if not po:
        raise HTTPException(status_code=404, detail=f"Purchase order not found with id {id}")

    if po.status == "RECEIVED":
        raise HTTPException(status_code=400, detail="This purchase order has already been received")

    if po.status == "CANCELLED":
        raise HTTPException(status_code=400, detail="Cancelled purchase orders cannot be received")

    po.status = "RECEIVED"
    po.received_date = datetime.date.today()

    now = datetime.datetime.utcnow()
    performed_by_name = current_user.username if current_user else "manager"

    for item in po.items:
        item.quantity_received = item.quantity_ordered
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if product:
            before_qty = product.quantity
            after_qty = before_qty + item.quantity_ordered
            product.quantity = after_qty
            product.version += 1

            tx = StockTransaction(
                product_id=product.id,
                transaction_type="PO_RECEIVE",
                quantity_changed=item.quantity_ordered,
                before_quantity=before_qty,
                after_quantity=after_qty,
                reference_number=f"PO-RCV-{po.order_number}",
                reason=f"Purchase Order Delivery: {po.order_number}",
                performed_by=performed_by_name,
                timestamp=now
            )
            db.add(tx)
            db.commit()
            db.refresh(tx)
            db.refresh(product)

            # Broadcast update
            await ws_manager.broadcast_stock_update(product.to_dict())
            await ws_manager.broadcast_activity(tx.to_dict())

    db.commit()
    db.refresh(po)
    return po.to_dict()

@router.post("/{id}/cancel")
def cancel_purchase_order(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "MANAGER"]))
):
    """Cancel a purchase order."""
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == id).first()
    if not po:
        raise HTTPException(status_code=404, detail=f"Purchase order not found with id {id}")

    if po.status == "RECEIVED":
        raise HTTPException(status_code=400, detail="Cannot cancel an order that has already been received into stock")

    po.status = "CANCELLED"
    db.commit()
    db.refresh(po)
    return po.to_dict()
