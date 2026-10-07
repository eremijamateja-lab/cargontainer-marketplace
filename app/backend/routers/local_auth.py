"""Email/password authentication endpoints (no OAuth/OIDC)."""

import logging
import uuid
from datetime import datetime, timezone

import bcrypt
from core.database import get_db
from fastapi import APIRouter, Depends, HTTPException, status
from models.auth import User
from pydantic import BaseModel, EmailStr
from services.auth import AuthService
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api/v1/local-auth", tags=["local-authentication"])
logger = logging.getLogger(__name__)


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    token: str
    expires_at: int
    token_type: str = "Bearer"
    user_id: str
    email: str
    name: str


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    """Verify a password against its hash."""
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


@router.post("/register", response_model=AuthResponse)
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Register a new user with email and password."""
    # Validate password length
    if len(data.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long",
        )

    # Check if email already exists
    result = await db.execute(select(User).where(User.email == data.email))
    existing_user = result.scalar_one_or_none()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists. Please login instead.",
        )

    # Create new user with a generated ID
    user_id = f"local_{uuid.uuid4().hex[:16]}"
    hashed = hash_password(data.password)

    user = User(
        id=user_id,
        email=data.email,
        name=data.name.strip(),
        password_hash=hashed,
        role="user",
        last_login=datetime.now(timezone.utc),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Issue JWT token
    auth_service = AuthService(db)
    app_token, expires_at, _ = await auth_service.issue_app_token(user=user)

    logger.info(f"[register] New user registered: {data.email}")

    return AuthResponse(
        token=app_token,
        expires_at=int(expires_at.timestamp()),
        user_id=user.id,
        email=user.email,
        name=user.name or "",
    )


@router.post("/login", response_model=AuthResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Login with email and password."""
    # Find user by email
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # Check if user has a password set (might be OAuth-only user)
    if not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="This account uses a different login method. Please contact support.",
        )

    # Verify password
    if not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # Update last login
    user.last_login = datetime.now(timezone.utc)
    await db.commit()

    # Issue JWT token
    auth_service = AuthService(db)
    app_token, expires_at, _ = await auth_service.issue_app_token(user=user)

    logger.info(f"[login] User logged in: {data.email}")

    return AuthResponse(
        token=app_token,
        expires_at=int(expires_at.timestamp()),
        user_id=user.id,
        email=user.email,
        name=user.name or "",
    )