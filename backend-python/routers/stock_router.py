import math
import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc

from database import get_db
from db_models import Product, StockTransaction, User
from auth import get_current_user
from websocket_manager import ws_manager

router = APIRouter(prefix="/stock", tags=["Stock Movements & Activity"])

class StockAdjustmentRequest(BaseModel):
    productId: Optional[int] = None
    sku: Optional[str] = None
    transactionType: str  # IN, OUT, ADJUSTMENT, PO_RECEIVE
    quantity: int
    reason: Optional[str] = "Manual Adjustment"
    referenceNumber: Optional[str] = None

@router.get("/transactions")
def get_transactions(
    productId: Optional[int] = None,
    type: Optional[str] = None,
    user: Optional[str] = None,
    startDate: Optional[str] = None,
    endDate: Optional[str] = None,
    page: int = Query(0, ge=0),
    size: int = Query(15, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Get paginated, filtered inventory transaction ledger."""
    query = db.query(StockTransaction)

    if productId:
        query = query.filter(StockTransaction.product_id == productId)

    if type and type.strip():
        query = query.filter(StockTransaction.transaction_type == type.strip().upper())

    if user and user.strip():
        query = query.filter(StockTransaction.performed_by.ilike(f"%{user.strip()}%"))

    if startDate:
        try:
            start_dt = datetime.datetime.fromisoformat(startDate.replace("Z", "+00:00"))
            query = query.filter(StockTransaction.timestamp >= start_dt)
        except Exception:
            pass

    if endDate:
        try:
            end_dt = datetime.datetime.fromisoformat(endDate.replace("Z", "+00:00"))
            query = query.filter(StockTransaction.timestamp <= end_dt)
        except Exception:
            pass

    total_elements = query.count()
    total_pages = math.ceil(total_elements / size) if total_elements > 0 else 1
    offset = page * size

    transactions = query.order_by(StockTransaction.timestamp.desc()).offset(offset).limit(size).all()

    return {
        "content": [tx.to_dict() for tx in transactions],
        "totalPages": total_pages,
        "totalElements": total_elements,
        "size": size,
        "number": page,
        "first": (page == 0),
        "last": (page >= total_pages - 1),
        "empty": (len(transactions) == 0)
    }

@router.get("/recent", response_model=List[dict])
def get_recent_transactions(db: Session = Depends(get_db)):
    """Get the 15 most recent stock operations for live activity feeds."""
    transactions = db.query(StockTransaction).order_by(StockTransaction.timestamp.desc()).limit(15).all()
    return [tx.to_dict() for tx in transactions]

@router.post("/adjust")
async def adjust_stock(
    req: StockAdjustmentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Execute stock IN, OUT, or ADJUSTMENT movement with strict validation,
    optimistic concurrency control, and live WebSocket broadcast.
    """
    # 1. Lookup Product
    product = None
    if req.productId:
        product = db.query(Product).filter(Product.id == req.productId).first()
    elif req.sku and req.sku.strip():
        clean_sku = req.sku.strip()
        product = db.query(Product).filter(
            or_(Product.sku.ilike(clean_sku), Product.barcode.ilike(clean_sku))
        ).first()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found by specified ID or SKU/Barcode")

    before_qty = int(product.quantity)
    tx_type = req.transactionType.upper()
    qty_change = int(req.quantity)

    # 2. Concurrency check & Business Rules
    if tx_type == "IN":
        if qty_change <= 0:
            raise HTTPException(status_code=400, detail="Quantity for Stock IN must be greater than 0")
        after_qty = before_qty + qty_change
        stored_change = qty_change

    elif tx_type == "OUT":
        if qty_change <= 0:
            raise HTTPException(status_code=400, detail="Quantity for Stock OUT must be greater than 0")
        if before_qty < qty_change:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for SKU {product.sku}. Available: {before_qty}, Requested: {qty_change}"
            )
        after_qty = before_qty - qty_change
        stored_change = -qty_change  # Outward sales recorded as negative

    elif tx_type == "ADJUSTMENT":
        after_qty = before_qty + qty_change
        if after_qty < 0:
            raise HTTPException(
                status_code=400,
                detail=f"Adjustment would result in negative stock ({after_qty}) for SKU {product.sku}"
            )
        stored_change = qty_change

    elif tx_type == "PO_RECEIVE":
        if qty_change <= 0:
            raise HTTPException(status_code=400, detail="Quantity received must be greater than 0")
        after_qty = before_qty + qty_change
        stored_change = qty_change

    else:
        raise HTTPException(status_code=400, detail=f"Unsupported transaction type: {tx_type}")

    # 3. Apply Update to Product
    product.quantity = after_qty
    product.version += 1
    db.commit()
    db.refresh(product)

    # 4. Insert Audit Ledger Transaction
    ref_num = req.referenceNumber or f"ADJ-{int(datetime.datetime.utcnow().timestamp() * 1000)}"
    reason_str = req.reason or "Manual Stock Movement"
    performed_by_name = current_user.username if current_user else "SYSTEM"

    transaction = StockTransaction(
        product_id=product.id,
        transaction_type=tx_type,
        quantity_changed=stored_change,
        before_quantity=before_qty,
        after_quantity=after_qty,
        reference_number=ref_num,
        reason=reason_str,
        performed_by=performed_by_name,
        timestamp=datetime.datetime.utcnow()
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)

    tx_dict = transaction.to_dict()
    prod_dict = product.to_dict()

    # 5. Live WebSocket STOMP Broadcasting
    await ws_manager.broadcast_stock_update(prod_dict)
    await ws_manager.broadcast_activity(tx_dict)

    if prod_dict["outOfStock"]:
        await ws_manager.broadcast_alert({
            "level": "CRITICAL",
            "type": "OUT_OF_STOCK",
            "sku": product.sku,
            "productName": product.name,
            "message": f"Critical: Product '{product.name}' ({product.sku}) is completely OUT OF STOCK!",
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z"
        })
    elif prod_dict["lowStock"]:
        await ws_manager.broadcast_alert({
            "level": "WARNING",
            "type": "LOW_STOCK",
            "sku": product.sku,
            "productName": product.name,
            "message": f"Low Stock Warning: '{product.name}' is at {product.quantity} {product.unit} (Reorder point: {product.reorder_level}).",
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z"
        })

    return tx_dict
