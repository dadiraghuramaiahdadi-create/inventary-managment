from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from db_models import Supplier, User
from auth import get_current_user, require_roles

router = APIRouter(prefix="/suppliers", tags=["Suppliers"])

class SupplierRequest(BaseModel):
    name: str
    contactPerson: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    leadTimeDays: Optional[int] = 7

@router.get("", response_model=List[dict])
def get_all_suppliers(db: Session = Depends(get_db)):
    """Retrieve all suppliers."""
    suppliers = db.query(Supplier).order_by(Supplier.name.asc()).all()
    return [s.to_dict() for s in suppliers]

@router.post("", status_code=status.HTTP_201_CREATED)
def create_supplier(
    req: SupplierRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "MANAGER"]))
):
    """Create a new supplier."""
    supplier = Supplier(
        name=req.name.strip(),
        contact_person=req.contactPerson,
        email=req.email,
        phone=req.phone,
        address=req.address,
        lead_time_days=req.leadTimeDays or 7
    )
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier.to_dict()

@router.put("/{id}")
def update_supplier(
    id: int,
    req: SupplierRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "MANAGER"]))
):
    """Update supplier details."""
    sup = db.query(Supplier).filter(Supplier.id == id).first()
    if not sup:
        raise HTTPException(status_code=404, detail=f"Supplier not found with id {id}")

    sup.name = req.name.strip()
    sup.contact_person = req.contactPerson
    sup.email = req.email
    sup.phone = req.phone
    sup.address = req.address
    if req.leadTimeDays is not None:
        sup.lead_time_days = req.leadTimeDays

    db.commit()
    db.refresh(sup)
    return sup.to_dict()

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_supplier(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "MANAGER"]))
):
    """Delete a supplier by ID."""
    sup = db.query(Supplier).filter(Supplier.id == id).first()
    if not sup:
        raise HTTPException(status_code=404, detail=f"Supplier not found with id {id}")

    db.delete(sup)
    db.commit()
    return None
