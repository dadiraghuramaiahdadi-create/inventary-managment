import datetime
from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, desc

from database import get_db
from db_models import Product, StockTransaction, PurchaseOrder, Category

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/summary")
def get_dashboard_summary(db: Session = Depends(get_db)):
    """Get top KPI statistics cards for dashboard overview."""
    products = db.query(Product).all()

    total_products = len(products)
    total_cost_val = sum(p.quantity * p.cost_price for p in products)
    total_sell_val = sum(p.quantity * p.selling_price for p in products)
    low_stock_count = sum(1 for p in products if p.quantity <= p.reorder_level and p.quantity > 0)
    out_of_stock_count = sum(1 for p in products if p.quantity <= 0)

    pending_pos = db.query(PurchaseOrder).filter(
        PurchaseOrder.status.in_(["PENDING", "APPROVED", "DRAFT"])
    ).count()

    return {
        "totalProducts": total_products,
        "totalCostValue": round(float(total_cost_val), 2),
        "totalSellingValue": round(float(total_sell_val), 2),
        "lowStockCount": low_stock_count,
        "outOfStockCount": out_of_stock_count,
        "pendingPurchaseOrders": pending_pos
    }

@router.get("/stock-movement")
def get_stock_movement(days: int = Query(14, ge=1, le=90), db: Session = Depends(get_db)):
    """Get historical daily stock IN vs OUT data for the area chart."""
    today = datetime.date.today()
    start_date = today - datetime.timedelta(days=days - 1)
    start_dt = datetime.datetime.combine(start_date, datetime.time.min)

    txs = db.query(StockTransaction).filter(StockTransaction.timestamp >= start_dt).all()

    # Prepopulate each date in range with 0
    daily_map = {}
    for i in range(days):
        d_str = (start_date + datetime.timedelta(days=i)).isoformat()
        daily_map[d_str] = {"date": d_str, "stockIn": 0, "stockOut": 0}

    for tx in txs:
        d_str = tx.timestamp.date().isoformat()
        if d_str in daily_map:
            if tx.transaction_type in ("IN", "PO_RECEIVE"):
                daily_map[d_str]["stockIn"] += abs(tx.quantity_changed)
            elif tx.transaction_type == "OUT":
                daily_map[d_str]["stockOut"] += abs(tx.quantity_changed)
            elif tx.transaction_type == "ADJUSTMENT":
                if tx.quantity_changed > 0:
                    daily_map[d_str]["stockIn"] += tx.quantity_changed
                else:
                    daily_map[d_str]["stockOut"] += abs(tx.quantity_changed)

    return sorted(list(daily_map.values()), key=lambda x: x["date"])

@router.get("/category-distribution")
def get_category_distribution(db: Session = Depends(get_db)):
    """Get category breakdown and inventory value share for pie chart."""
    categories = db.query(Category).all()
    results = []

    for cat in categories:
        products = db.query(Product).filter(Product.category_id == cat.id).all()
        prod_count = len(products)
        stock_val = sum(p.quantity * p.cost_price for p in products)
        results.append({
            "categoryName": cat.name,
            "productCount": prod_count,
            "stockValue": round(float(stock_val), 2)
        })

    return results

@router.get("/top-movers")
def get_top_movers(limit: int = Query(5, ge=1, le=20), db: Session = Depends(get_db)):
    """Get top high-velocity moving products based on outward transactions."""
    out_txs = db.query(
        StockTransaction.product_id,
        func.sum(func.abs(StockTransaction.quantity_changed)).label("total_sold")
    ).filter(
        StockTransaction.transaction_type == "OUT"
    ).group_by(
        StockTransaction.product_id
    ).order_by(
        desc("total_sold")
    ).limit(limit).all()

    results = []
    for pid, total_sold in out_txs:
        p = db.query(Product).filter(Product.id == pid).first()
        if p:
            results.append({
                "productId": p.id,
                "productName": p.name,
                "sku": p.sku,
                "totalSoldQuantity": int(total_sold or 0)
            })

    return results

@router.get("/low-stock-alerts")
def get_low_stock_alerts(db: Session = Depends(get_db)):
    """Get current low stock items requiring prompt replenishment."""
    low_products = db.query(Product).filter(
        Product.quantity <= Product.reorder_level
    ).order_by(Product.quantity.asc()).all()
    return [p.to_dict() for p in low_products]

@router.get("/recent-activity")
def get_recent_activity(db: Session = Depends(get_db)):
    """Get recent stock operations for the live dashboard feed."""
    txs = db.query(StockTransaction).order_by(StockTransaction.timestamp.desc()).limit(15).all()
    return [tx.to_dict() for tx in txs]
