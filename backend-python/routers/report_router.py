import io
import csv
import datetime
from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from database import get_db
from db_models import Product, StockTransaction
from pdf_generator import generate_inventory_valuation_pdf

router = APIRouter(prefix="/reports", tags=["Reports & Exports"])

@router.get("/products/export-csv")
def export_products_csv(db: Session = Depends(get_db)):
    """Export product catalog with valuations as CSV."""
    products = db.query(Product).order_by(Product.name.asc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "ID", "SKU", "Name", "Category", "Supplier", "Cost Price", "Selling Price",
        "Quantity", "Reorder Level", "Unit", "Total Cost Value", "Total Selling Value"
    ])

    for p in products:
        cost = float(p.cost_price)
        sell = float(p.selling_price)
        qty = int(p.quantity)
        writer.writerow([
            p.id,
            p.sku,
            p.name,
            p.category.name if p.category else "Uncategorized",
            p.supplier.name if p.supplier else "N/A",
            f"{cost:.2f}",
            f"{sell:.2f}",
            qty,
            p.reorder_level,
            p.unit,
            f"{cost * qty:.2f}",
            f"{sell * qty:.2f}"
        ])

    csv_data = output.getvalue()
    filename = f"inveniq-products-{datetime.date.today().isoformat()}.csv"
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/activity/export-csv")
def export_activity_csv(db: Session = Depends(get_db)):
    """Export complete audit ledger of inventory transactions as CSV."""
    txs = db.query(StockTransaction).order_by(StockTransaction.timestamp.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Transaction ID", "Timestamp (UTC)", "SKU", "Product Name", "Type",
        "Quantity Changed", "Before Qty", "After Qty", "Reference", "Reason", "Performed By"
    ])

    for st in txs:
        time_str = st.timestamp.strftime("%d %b %Y, %I:%M:%S %p") if st.timestamp else "N/A"
        writer.writerow([
            st.id,
            time_str,
            st.product.sku if st.product else "N/A",
            st.product.name if st.product else "N/A",
            st.transaction_type,
            st.quantity_changed,
            st.before_quantity,
            st.after_quantity,
            st.reference_number or "",
            st.reason or "",
            st.performed_by
        ])

    csv_data = output.getvalue()
    filename = f"inveniq-activity-{datetime.date.today().isoformat()}.csv"
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/low-stock/export-csv")
def export_low_stock_csv(db: Session = Depends(get_db)):
    """Export current deficit and low-stock items as CSV."""
    products = db.query(Product).filter(Product.quantity <= Product.reorder_level).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "SKU", "Product Name", "Category", "Supplier", "Current Stock", "Reorder Level", "Deficit", "Unit Cost"
    ])

    for p in products:
        deficit = max(0, p.reorder_level - p.quantity)
        writer.writerow([
            p.sku,
            p.name,
            p.category.name if p.category else "Uncategorized",
            p.supplier.name if p.supplier else "N/A",
            p.quantity,
            p.reorder_level,
            deficit,
            f"{p.cost_price:.2f}"
        ])

    csv_data = output.getvalue()
    filename = f"inveniq-low-stock-{datetime.date.today().isoformat()}.csv"
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/inventory-valuation/export-pdf")
def export_inventory_valuation_pdf(db: Session = Depends(get_db)):
    """Generate and export a printable inventory valuation PDF report."""
    products = db.query(Product).order_by(Product.name.asc()).all()
    pdf_bytes = generate_inventory_valuation_pdf(products)

    filename = f"inveniq-valuation-{datetime.date.today().isoformat()}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
