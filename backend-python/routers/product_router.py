import io
import csv
import math
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import or_, asc, desc

from database import get_db
from db_models import Product, Category, Supplier, User
from auth import get_current_user, require_roles
from barcode_generator import generate_barcode_bundle, generate_code128_base64, generate_qrcode_base64
from websocket_manager import ws_manager

router = APIRouter(prefix="/products", tags=["Products"])

class ProductCreateUpdateRequest(BaseModel):
    sku: str
    name: str
    description: Optional[str] = ""
    categoryId: Optional[int] = None
    supplierId: Optional[int] = None
    costPrice: float = Field(..., ge=0)
    sellingPrice: float = Field(..., ge=0)
    quantity: int = Field(..., ge=0)
    reorderLevel: Optional[int] = 10
    unit: Optional[str] = "PCS"
    imageUrl: Optional[str] = ""

@router.get("")
def get_products(
    search: Optional[str] = None,
    categoryId: Optional[int] = None,
    supplierId: Optional[int] = None,
    lowStockOnly: bool = False,
    page: int = Query(0, ge=0),
    size: int = Query(10, ge=1, le=100),
    sortBy: str = "name",
    sortDir: str = "asc",
    db: Session = Depends(get_db)
):
    """Get paginated, searchable, and filtered product catalog matching Spring Data Page structure."""
    query = db.query(Product)

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(or_(Product.name.ilike(term), Product.sku.ilike(term)))

    if categoryId:
        query = query.filter(Product.category_id == categoryId)

    if supplierId:
        query = query.filter(Product.supplier_id == supplierId)

    if lowStockOnly:
        query = query.filter(Product.quantity <= Product.reorder_level)

    # Sorting
    col_attr = getattr(Product, sortBy, None)
    if col_attr is not None:
        query = query.order_by(desc(col_attr) if sortDir.lower() == "desc" else asc(col_attr))
    else:
        query = query.order_by(Product.name.asc())

    total_elements = query.count()
    total_pages = math.ceil(total_elements / size) if total_elements > 0 else 1
    offset = page * size
    products = query.offset(offset).limit(size).all()

    return {
        "content": [p.to_dict() for p in products],
        "totalElements": total_elements,
        "totalPages": total_pages,
        "size": size,
        "number": page,
        "first": (page == 0),
        "last": (page >= total_pages - 1),
        "empty": (len(products) == 0)
    }

@router.get("/all", response_model=List[dict])
def get_all_products_list(db: Session = Depends(get_db)):
    """Get list of all products without pagination for dropdowns and selection controls."""
    products = db.query(Product).order_by(Product.name.asc()).all()
    return [p.to_dict() for p in products]

@router.get("/low-stock", response_model=List[dict])
def get_low_stock_products(db: Session = Depends(get_db)):
    """Get all items currently at or below their reorder level."""
    products = db.query(Product).filter(Product.quantity <= Product.reorder_level).all()
    return [p.to_dict() for p in products]

@router.get("/scan/{identifier}")
def get_product_by_scan(identifier: str, db: Session = Depends(get_db)):
    """Quick lookup by SKU or Barcode for barcode scanners and camera scan."""
    clean_id = identifier.strip()
    product = db.query(Product).filter(
        or_(Product.sku.ilike(clean_id), Product.barcode.ilike(clean_id))
    ).first()

    if not product:
        raise HTTPException(
            status_code=404,
            detail=f"No product found matching SKU or Barcode: '{clean_id}'"
        )
    return product.to_dict()

@router.get("/{id}/barcode")
def get_product_barcode(id: int, db: Session = Depends(get_db)):
    """Get Base64 Code128 barcode and QR code for printable product labels."""
    product = db.query(Product).filter(Product.id == id).first()
    if not product:
        raise HTTPException(status_code=404, detail=f"Product not found with id {id}")

    return generate_barcode_bundle(product.sku, product.name)

@router.get("/barcode/generate")
def generate_arbitrary_barcode(text: str):
    """Generate barcode and QR code for an arbitrary text/SKU."""
    return generate_barcode_bundle(text.strip(), text.strip())

@router.get("/{id}")
def get_product_by_id(id: int, db: Session = Depends(get_db)):
    """Get single product by ID."""
    product = db.query(Product).filter(Product.id == id).first()
    if not product:
        raise HTTPException(status_code=404, detail=f"Product not found with id {id}")
    return product.to_dict()

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_product(
    req: ProductCreateUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "MANAGER"]))
):
    """Create a new product."""
    clean_sku = req.sku.strip().upper()
    existing = db.query(Product).filter(Product.sku.ilike(clean_sku)).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Product with SKU '{clean_sku}' already exists")

    product = Product(
        sku=clean_sku,
        name=req.name.strip(),
        description=req.description or "",
        category_id=req.categoryId,
        supplier_id=req.supplierId,
        cost_price=req.costPrice,
        selling_price=req.sellingPrice,
        quantity=req.quantity,
        reorder_level=req.reorderLevel or 10,
        unit=req.unit or "PCS",
        image_url=req.imageUrl or "",
        barcode=clean_sku,
        version=1
    )
    db.add(product)
    db.commit()
    db.refresh(product)

    product_dict = product.to_dict()
    await ws_manager.broadcast_stock_update(product_dict)
    return product_dict

@router.put("/{id}")
async def update_product(
    id: int,
    req: ProductCreateUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "MANAGER"]))
):
    """Update an existing product."""
    product = db.query(Product).filter(Product.id == id).first()
    if not product:
        raise HTTPException(status_code=404, detail=f"Product not found with id {id}")

    clean_sku = req.sku.strip().upper()
    if clean_sku.lower() != product.sku.lower():
        existing = db.query(Product).filter(Product.sku.ilike(clean_sku)).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"Product with SKU '{clean_sku}' already exists")

    product.sku = clean_sku
    product.name = req.name.strip()
    product.description = req.description or ""
    product.category_id = req.categoryId
    product.supplier_id = req.supplierId
    product.cost_price = req.costPrice
    product.selling_price = req.sellingPrice
    product.quantity = req.quantity
    product.reorder_level = req.reorderLevel or 10
    product.unit = req.unit or "PCS"
    product.image_url = req.imageUrl or ""
    product.version += 1

    db.commit()
    db.refresh(product)

    product_dict = product.to_dict()
    await ws_manager.broadcast_stock_update(product_dict)
    return product_dict

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "MANAGER"]))
):
    """Delete a product by ID."""
    product = db.query(Product).filter(Product.id == id).first()
    if not product:
        raise HTTPException(status_code=404, detail=f"Product not found with id {id}")

    db.delete(product)
    db.commit()
    return None

@router.post("/import-csv")
async def import_products_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "MANAGER"]))
):
    """Bulk import products from CSV file."""
    content = await file.read()
    text = content.decode('utf-8-sig', errors='ignore')
    reader = csv.DictReader(io.StringIO(text))

    categories_cache = {c.name.lower(): c.id for c in db.query(Category).all()}
    suppliers_cache = {s.name.lower(): s.id for s in db.query(Supplier).all()}

    imported_count = 0
    for row in reader:
        # Normalize column keys
        clean_row = {k.strip().lower(): v.strip() for k, v in row.items() if k}
        sku = clean_row.get("sku") or clean_row.get("sku code")
        name = clean_row.get("name") or clean_row.get("product name")
        if not sku or not name:
            continue

        cat_str = clean_row.get("category", "").lower()
        cat_id = categories_cache.get(cat_str)
        if not cat_id and cat_str:
            new_cat = Category(name=clean_row.get("category").strip())
            db.add(new_cat)
            db.commit()
            db.refresh(new_cat)
            categories_cache[cat_str] = new_cat.id
            cat_id = new_cat.id

        sup_str = clean_row.get("supplier", "").lower()
        sup_id = suppliers_cache.get(sup_str)
        if not sup_id and sup_str:
            new_sup = Supplier(name=clean_row.get("supplier").strip(), lead_time_days=7)
            db.add(new_sup)
            db.commit()
            db.refresh(new_sup)
            suppliers_cache[sup_str] = new_sup.id
            sup_id = new_sup.id

        cost_price = float(clean_row.get("cost price") or clean_row.get("costprice") or clean_row.get("cost") or 0.0)
        selling_price = float(clean_row.get("selling price") or clean_row.get("sellingprice") or clean_row.get("price") or 0.0)
        quantity = int(clean_row.get("quantity") or clean_row.get("qty") or 0)
        reorder_level = int(clean_row.get("reorder level") or clean_row.get("reorderlevel") or 10)
        unit = clean_row.get("unit") or "PCS"
        desc = clean_row.get("description") or ""

        existing = db.query(Product).filter(Product.sku.ilike(sku.strip())).first()
        if existing:
            existing.name = name
            existing.description = desc
            existing.category_id = cat_id
            existing.supplier_id = sup_id
            existing.cost_price = cost_price
            existing.selling_price = selling_price
            existing.quantity = quantity
            existing.reorder_level = reorder_level
            existing.unit = unit
            existing.version += 1
        else:
            p = Product(
                sku=sku.strip().upper(),
                name=name,
                description=desc,
                category_id=cat_id,
                supplier_id=sup_id,
                cost_price=cost_price,
                selling_price=selling_price,
                quantity=quantity,
                reorder_level=reorder_level,
                unit=unit,
                barcode=sku.strip().upper(),
                version=1
            )
            db.add(p)

        imported_count += 1

    db.commit()
    return {
        "success": True,
        "message": f"Successfully imported {imported_count} products",
        "importedCount": imported_count
    }
