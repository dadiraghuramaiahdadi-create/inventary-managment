from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from database import get_db
from db_models import User
from auth import get_current_user, require_roles, hash_password

router = APIRouter(prefix="/users", tags=["User Management"])

class UserCreateRequest(BaseModel):
    username: str
    password: str
    email: str
    fullName: str
    role: str = "STAFF"  # ADMIN, MANAGER, STAFF

class UserUpdateRequest(BaseModel):
    email: Optional[str] = None
    fullName: Optional[str] = None
    role: Optional[str] = None
    password: Optional[str] = None

@router.get("", response_model=List[dict])
def get_all_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN"]))
):
    """Retrieve all users (Admin only)."""
    users = db.query(User).order_by(User.id.asc()).all()
    return [u.to_dict() for u in users]

@router.post("", status_code=status.HTTP_201_CREATED)
def create_user(
    req: UserCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN"]))
):
    """Create a new user account (Admin only)."""
    clean_user = req.username.strip()
    if db.query(User).filter(User.username == clean_user).first():
        raise HTTPException(status_code=400, detail=f"Username '{clean_user}' is already taken")

    if db.query(User).filter(User.email == req.email.strip()).first():
        raise HTTPException(status_code=400, detail=f"Email '{req.email}' is already registered")

    user = User(
        username=clean_user,
        password=hash_password(req.password),
        email=req.email.strip(),
        full_name=req.fullName.strip(),
        role=req.role.upper(),
        enabled=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user.to_dict()

@router.put("/{id}")
def update_user(
    id: int,
    req: UserUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN"]))
):
    """Update user information (Admin only)."""
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail=f"User not found with id {id}")

    if req.email and req.email.strip() != user.email:
        if db.query(User).filter(User.email == req.email.strip()).first():
            raise HTTPException(status_code=400, detail=f"Email '{req.email}' is already in use")
        user.email = req.email.strip()

    if req.fullName:
        user.full_name = req.fullName.strip()

    if req.role:
        user.role = req.role.upper()

    if req.password and req.password.strip():
        user.password = hash_password(req.password.strip())

    db.commit()
    db.refresh(user)
    return user.to_dict()

@router.patch("/{id}/toggle-status")
def toggle_user_status(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN"]))
):
    """Toggle user active / deactivated state (Admin only)."""
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail=f"User not found with id {id}")

    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Administrators cannot deactivate their own account")

    user.enabled = not user.enabled
    db.commit()
    db.refresh(user)
    return user.to_dict()

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN"]))
):
    """Delete a user account (Admin only)."""
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail=f"User not found with id {id}")

    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Administrators cannot delete their own account")

    db.delete(user)
    db.commit()
    return None
