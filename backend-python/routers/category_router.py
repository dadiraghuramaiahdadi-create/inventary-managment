from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from db_models import Category, User
from auth import get_current_user, require_roles

router = APIRouter(prefix="/categories", tags=["Categories"])

class CategoryRequest(BaseModel):
    name: str
    description: Optional[str] = None

@router.get("", response_model=List[dict])
def get_all_categories(db: Session = Depends(get_db)):
    """Retrieve all product categories."""
    categories = db.query(Category).order_by(Category.name.asc()).all()
    return [c.to_dict() for c in categories]

@router.post("", status_code=status.HTTP_201_CREATED)
def create_category(
    req: CategoryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "MANAGER"]))
):
    """Create a new product category."""
    existing = db.query(Category).filter(Category.name.ilike(req.name.strip())).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Category with name '{req.name}' already exists")

    cat = Category(name=req.name.strip(), description=req.description)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat.to_dict()

@router.put("/{id}")
def update_category(
    id: int,
    req: CategoryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "MANAGER"]))
):
    """Update an existing category."""
    cat = db.query(Category).filter(Category.id == id).first()
    if not cat:
        raise HTTPException(status_code=404, detail=f"Category not found with id {id}")

    # Check for name uniqueness if name was changed
    if req.name.strip().lower() != cat.name.lower():
        existing = db.query(Category).filter(Category.name.ilike(req.name.strip())).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"Category with name '{req.name}' already exists")

    cat.name = req.name.strip()
    cat.description = req.description
    db.commit()
    db.refresh(cat)
    return cat.to_dict()

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "MANAGER"]))
):
    """Delete a category by ID."""
    cat = db.query(Category).filter(Category.id == id).first()
    if not cat:
        raise HTTPException(status_code=404, detail=f"Category not found with id {id}")

    db.delete(cat)
    db.commit()
    return None
