import hashlib
import logging
from datetime import datetime
from typing import Optional

from core.auth import AccessTokenError, decode_access_token
from core.config import settings
from core.database import get_db
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from schemas.auth import UserResponse
from services.supabase_bridge import sync_user, verify_supabase_token
from sqlalchemy.ext.asyncio import AsyncSession

# Local-mode fallback list. In Supabase mode platform admins come from public.platform_admins.
ADMIN_EMAILS = [
    "office@cargontainer.com",
    "admin@cargontainer.com",
    "eremija.mateja@gmail.com",
]


MANAGED_IN_TMS = (
    "This is managed in Cargontainer TMS Agency (Platform admin / company members). "
    "Ovim se upravlja u Cargontainer TMS Agency (Platform admin / članovi firme)."
)

# Company fields owned by the shared public.companies row in Supabase mode (synced on login,
# edited in TMS Agency). Marketplace writes to them would be overwritten, so they're refused.
SHARED_COMPANY_FIELDS = {
    "company_name", "country", "city", "vat_number", "email", "phone", "website", "address",
    "logo_url", "approval_status", "subscription_plan",
}


def require_local_mode() -> None:
    """Block marketplace-side company approval / membership changes in Supabase mode."""
    if settings.is_supabase:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=MANAGED_IN_TMS)


def is_platform_admin(user: UserResponse) -> bool:
    """Platform admin check used by the admin/cleanup/company routers."""
    if settings.is_supabase:
        return user.role == "admin"
    return (user.email or "").lower() in ADMIN_EMAILS

logger = logging.getLogger(__name__)

bearer_scheme = HTTPBearer(auto_error=False)


async def get_bearer_token(
    request: Request, credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)
) -> str:
    """Extract bearer token from Authorization header."""
    if credentials and credentials.scheme.lower() == "bearer":
        return credentials.credentials

    logger.debug("Authentication required for request %s %s", request.method, request.url.path)
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication credentials were not provided")


async def get_current_user(
    request: Request, token: str = Depends(get_bearer_token), db: AsyncSession = Depends(get_db)
) -> UserResponse:
    """Dependency to get current authenticated user via JWT token."""
    if settings.is_supabase:
        # Shared Supabase login (same account as TMS Agency / TMS Carrier). The user acts for
        # the company picked in the Marketplace company switcher (X-Company-Id header).
        sb_user = await verify_supabase_token(token)
        requested = (request.headers.get("x-company-id") or "").strip()[:64] or None
        synced = await sync_user(db, sb_user, requested)
        return UserResponse(
            id=synced["actor_id"],
            email=sb_user.get("email") or "",
            name=synced["name"],
            role="admin" if synced["admin"] else "user",
            last_login=None,
            auth_id=sb_user["id"],
            company_shared_id=synced["company_shared_id"],
        )

    try:
        payload = decode_access_token(token)
    except AccessTokenError as exc:
        # Log error type only, not the full exception which may contain sensitive token data
        logger.warning("Token validation failed: %s", type(exc).__name__)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=exc.message)

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication token")

    last_login_raw = payload.get("last_login")
    last_login = None
    if isinstance(last_login_raw, str):
        try:
            last_login = datetime.fromisoformat(last_login_raw)
        except ValueError:
            # Log user hash instead of actual user ID to avoid exposing sensitive information
            user_hash = hashlib.sha256(str(user_id).encode()).hexdigest()[:8] if user_id else "unknown"
            logger.debug("Failed to parse last_login for user hash: %s", user_hash)

    return UserResponse(
        id=user_id,
        email=payload.get("email", ""),
        name=payload.get("name"),
        role=payload.get("role", "user"),
        last_login=last_login,
    )


async def require_approved_company(
    current_user: UserResponse = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> UserResponse:
    """Supabase mode: marketplace business endpoints only for members of an approved company.

    The frontend already routes pending/rejected users to /pending-approval, but every TMS user
    gets a marketplace identity on first call, so the API itself must refuse them too.
    Platform admins always pass. Local mode keeps its old (frontend-only) behaviour.
    """
    if not settings.is_supabase or current_user.role == "admin":
        return current_user
    from models.companies import Companies
    from models.user_profiles import User_profiles
    from sqlalchemy import select

    row = await db.execute(
        select(Companies.approval_status)
        .join(User_profiles, User_profiles.company_id == Companies.id)
        .where(User_profiles.user_id == str(current_user.id))
    )
    if row.scalar_one_or_none() != "approved":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your company is not approved for Cargontainer Marketplace yet.",
        )
    return current_user


async def get_admin_user(current_user: UserResponse = Depends(get_current_user)) -> UserResponse:
    """Dependency to ensure current user has admin role."""
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user
