import datetime
import secrets
from typing import Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from db_models import User
from auth import verify_password, hash_password, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

# In-memory storage for active password reset codes: {user_id: {"code": "123456", "expires": datetime}}
RESET_CODES: Dict[int, dict] = {}

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    accessToken: str
    tokenType: str = "Bearer"
    user: dict

class SupabaseLoginRequest(BaseModel):
    email: str
    fullName: Optional[str] = None
    supabaseId: Optional[str] = None
    avatarUrl: Optional[str] = None

class ForgotPasswordRequest(BaseModel):
    identifier: str

class ResetPasswordRequest(BaseModel):
    identifier: str
    code: str
    newPassword: str

@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate user with username and password, returns JWT token and user info."""
    clean_user = request.username.strip()
    user = db.query(User).filter(User.username == clean_user).first()
    
    if not user or not verify_password(request.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )

    if not user.enabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Please contact an administrator."
        )

    token = create_access_token({"sub": user.username, "role": user.role})
    return LoginResponse(
        accessToken=token,
        tokenType="Bearer",
        user=user.to_dict()
    )

@router.post("/supabase-login", response_model=LoginResponse)
def supabase_login(request: SupabaseLoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate or auto-provision user authenticated via Supabase (e.g. Google OAuth).
    Returns an InvenIQ JWT access token and user profile.
    """
    clean_email = request.email.strip().lower()
    if not clean_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Valid email address is required for Supabase authentication"
        )

    # 1. Look up existing user by email
    user = db.query(User).filter(User.email.ilike(clean_email)).first()

    # 2. If user doesn't exist by email, try matching username by local part
    local_part = clean_email.split("@")[0].replace(".", "_")
    if not user:
        user = db.query(User).filter(User.username == local_part).first()
        if user and not user.email:
            user.email = clean_email
            db.commit()

    # 3. If user still does not exist, auto-provision user
    if not user:
        base_username = local_part[:40]
        # ensure unique username
        candidate_username = base_username
        suffix = 1
        while db.query(User).filter(User.username == candidate_username).first():
            candidate_username = f"{base_username}_{suffix}"
            suffix += 1

        # Determine default role (ADMIN if email contains admin, else STAFF)
        role = "ADMIN" if "admin" in clean_email else "STAFF"
        display_name = request.fullName.strip() if request.fullName and request.fullName.strip() else candidate_username.title()

        random_secret = secrets.token_urlsafe(24)
        user = User(
            username=candidate_username,
            email=clean_email,
            full_name=display_name,
            password=hash_password(random_secret),
            role=role,
            enabled=True,
            created_at=datetime.datetime.utcnow()
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    if not user.enabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Please contact an administrator."
        )

    # Issue InvenIQ system JWT
    token = create_access_token({"sub": user.username, "role": user.role})
    return LoginResponse(
        accessToken=token,
        tokenType="Bearer",
        user=user.to_dict()
    )

@router.post("/forgot-password")
def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Generates a secure 6-digit password reset code for a given username or email.
    """
    clean_id = request.identifier.strip()
    if not clean_id:
        raise HTTPException(status_code=400, detail="Username or email is required")

    user = db.query(User).filter(
        (User.username.ilike(clean_id)) | (User.email.ilike(clean_id))
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No account found matching '{clean_id}'"
        )

    if not user.enabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been disabled. Please contact an administrator."
        )

    # Generate 6-digit code with 15-minute expiration
    code = f"{secrets.randbelow(900000) + 100000}"
    expires_at = datetime.datetime.utcnow() + datetime.timedelta(minutes=15)
    RESET_CODES[user.id] = {
        "code": code,
        "expires": expires_at,
        "username": user.username
    }

    # Mask email for privacy
    parts = user.email.split("@")
    masked_email = f"{parts[0][:2]}***@{parts[1]}" if len(parts) == 2 and len(parts[0]) > 2 else user.email

    return {
        "success": True,
        "message": f"Reset code generated for {masked_email}. Code is valid for 15 minutes.",
        "username": user.username,
        "maskedEmail": masked_email,
        "resetCode": code  # returned for quick demo verification / local environments
    }

@router.post("/reset-password")
def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    """
    Validates the 6-digit reset code and sets a new password.
    """
    clean_id = request.identifier.strip()
    clean_code = request.code.strip()
    new_pass = request.newPassword.strip()

    if not clean_id or not clean_code or not new_pass:
        raise HTTPException(status_code=400, detail="Missing required reset fields")

    if len(new_pass) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long")

    user = db.query(User).filter(
        (User.username.ilike(clean_id)) | (User.email.ilike(clean_id))
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="Account not found")

    stored = RESET_CODES.get(user.id)
    if not stored:
        raise HTTPException(
            status_code=400,
            detail="No active password reset request found. Please request a new code."
        )

    if datetime.datetime.utcnow() > stored["expires"]:
        RESET_CODES.pop(user.id, None)
        raise HTTPException(
            status_code=400,
            detail="The reset code has expired. Please request a new one."
        )

    if stored["code"] != clean_code:
        raise HTTPException(
            status_code=400,
            detail="Invalid reset code. Please check and try again."
        )

    # Code is valid, update password
    user.password = hash_password(new_pass)
    db.commit()

    # Clear code
    RESET_CODES.pop(user.id, None)

    return {
        "success": True,
        "message": "Password successfully updated! You can now log in with your new password.",
        "username": user.username
    }

@router.get("/me")
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Returns the profile of the currently authenticated user."""
    return current_user.to_dict()

