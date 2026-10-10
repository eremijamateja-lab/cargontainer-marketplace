from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class UserResponse(BaseModel):
    id: str  # Now a string UUID (platform sub)
    email: str
    name: Optional[str] = None
    role: str = "user"  # user/admin
    last_login: Optional[datetime] = None
    # Supabase mode: `id` is the marketplace actor "<auth uid>:<shared company uuid>" (one identity
    # per company a person belongs to); these keep the two parts for the code that needs them.
    auth_id: Optional[str] = None
    company_shared_id: Optional[str] = None

    class Config:
        from_attributes = True


class PlatformTokenExchangeRequest(BaseModel):
    """Request body for exchanging Platform token for app token."""

    platform_token: str


class TokenExchangeResponse(BaseModel):
    """Response body for issued application token."""

    token: str
