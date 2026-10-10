"""Companies the logged-in person can act for on the Marketplace (Supabase mode).

The frontend shows a company switcher when there is more than one; the chosen company's
shared uuid is sent back on every request as the X-Company-Id header (see dependencies/auth.py).
"""
from core.config import settings
from core.database import get_db
from dependencies.auth import get_current_user
from fastapi import APIRouter, Depends
from schemas.auth import UserResponse
from services.supabase_bridge import approval_from_shared, load_memberships
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api/v1/profile", tags=["profile"])


@router.get("/companies")
async def my_companies(current_user: UserResponse = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not settings.is_supabase or not current_user.auth_id:
        return []
    memberships = await load_memberships(db, current_user.auth_id)
    return [
        {
            "id": m["company_id"],
            "name": m["name"],
            "has_marketplace": "marketplace" in (m["products"] or []),
            "approval_status": approval_from_shared(list(m["products"] or []), m["plan"]),
            "active": m["company_id"] == current_user.company_shared_id,
        }
        for m in memberships
        if "marketplace" in (m["products"] or [])
    ]
