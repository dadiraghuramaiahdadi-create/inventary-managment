import logging
from typing import Dict, Any, Tuple
from database import SessionLocal
from db_models import Product, StockTransaction

logger = logging.getLogger("inveniq.dataset_provider")

async def fetch_dataset_from_java() -> Tuple[list, list]:
    """
    Fetches the live products catalog and 90-day transaction history directly
    from the local SQLite database engine for zero-latency machine learning analytics.
    """
    db = SessionLocal()
    try:
        db_products = db.query(Product).all()
        db_transactions = db.query(StockTransaction).all()

        products = []
        for p in db_products:
            products.append({
                "id": p.id,
                "sku": p.sku,
                "name": p.name,
                "category": p.category.name if p.category else "Uncategorized",
                "supplier": p.supplier.name if p.supplier else "N/A",
                "supplierId": p.supplier_id,
                "leadTimeDays": p.supplier.lead_time_days if (p.supplier and p.supplier.lead_time_days) else 7,
                "costPrice": float(p.cost_price),
                "sellingPrice": float(p.selling_price),
                "quantity": int(p.quantity),
                "reorderLevel": int(p.reorder_level),
                "unit": p.unit or "PCS"
            })

        transactions = []
        for tx in db_transactions:
            transactions.append({
                "id": tx.id,
                "productId": tx.product_id,
                "sku": tx.product.sku if tx.product else "N/A",
                "type": tx.transaction_type,
                "quantityChanged": tx.quantity_changed,
                "timestamp": tx.timestamp.isoformat() + "Z" if tx.timestamp else ""
            })

        logger.info(f"Loaded {len(products)} products and {len(transactions)} transactions directly from database.")
        return products, transactions
    except Exception as e:
        logger.error(f"Error fetching dataset from database: {e}")
        return [], []
    finally:
        db.close()
