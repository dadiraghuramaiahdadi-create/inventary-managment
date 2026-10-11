import io
import datetime
from typing import List
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Table, TableStyle, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

from db_models import Product

def generate_inventory_valuation_pdf(products: List[Product]) -> bytes:
    """Generates an enterprise-grade Inventory Valuation Report PDF."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'ReportTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=18,
        textColor=colors.HexColor('#1E3A8A'),
        alignment=1, # Centered
        spaceAfter=6
    )
    subtitle_style = ParagraphStyle(
        'ReportSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        textColor=colors.HexColor('#6B7280'),
        alignment=1,
        spaceAfter=15
    )
    cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#1F2937')
    )

    elements = []

    # 1. Header
    elements.append(Paragraph("InvenIQ - Inventory Valuation Report", title_style))
    now_str = datetime.datetime.utcnow().strftime("%d %b %Y, %I:%M:%S %p UTC")
    elements.append(Paragraph(f"Generated automatically by InvenIQ Core Backend &bull; Timestamp: {now_str}", subtitle_style))
    elements.append(Spacer(1, 10))

    # 2. Table Data
    table_data = [
        ["SKU", "Product Name", "Category", "Qty", "Cost ($)", "Price ($)", "Total Cost ($)"]
    ]

    total_cost_val = 0.0
    total_selling_val = 0.0
    total_units = 0

    for p in products:
        qty = int(p.quantity)
        cost = float(p.cost_price)
        price = float(p.selling_price)
        row_cost = qty * cost
        row_sell = qty * price

        total_cost_val += row_cost
        total_selling_val += row_sell
        total_units += qty

        cat_name = p.category.name if p.category else "-"
        table_data.append([
            p.sku,
            p.name[:28] + ("..." if len(p.name) > 28 else ""),
            cat_name[:20],
            str(qty),
            f"${cost:,.2f}",
            f"${price:,.2f}",
            f"${row_cost:,.2f}"
        ])

    # Grand total row
    table_data.append([
        "TOTAL",
        f"{len(products)} Products Catalog",
        "-",
        str(total_units),
        "-",
        "-",
        f"${total_cost_val:,.2f}"
    ])

    col_widths = [85, 145, 100, 40, 50, 50, 65]
    table = Table(table_data, colWidths=col_widths, repeatRows=1)

    t_style = [
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1E40AF')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('ALIGN', (0, 0), (2, -1), 'LEFT'),
        ('ALIGN', (3, 0), (-1, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
        ('TOPPADDING', (0, 0), (-1, 0), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E5E7EB')),
        ('FONTNAME', (0, 1), (-1, -2), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -2), 8),
        ('ROWBACKGROUNDS', (0, 1), (-1, -2), [colors.white, colors.HexColor('#F9FAFB')]),
        # Highlight Total row
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#EEF2F6')),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, -1), (-1, -1), 9),
        ('TOPPADDING', (0, -1), (-1, -1), 6),
        ('BOTTOMPADDING', (0, -1), (-1, -1), 6),
    ]

    table.setStyle(TableStyle(t_style))
    elements.append(table)
    elements.append(Spacer(1, 15))

    # Summary box
    margin_val = total_selling_val - total_cost_val
    summary_text = (
        f"<b>Valuation Summary:</b> Total Stock Holding Cost: <b>${total_cost_val:,.2f}</b> | "
        f"Projected Retail Valuation: <b>${total_selling_val:,.2f}</b> | "
        f"Potential Gross Margin: <b>${margin_val:,.2f}</b>"
    )
    elements.append(Paragraph(summary_text, styles['Normal']))

    doc.build(elements)
    return buf.getvalue()
