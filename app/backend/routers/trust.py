"""Phase 3 "poverenje": trust info for companies + ratings after a delivered transport."""
import logging
from typing import List, Optional

from core.database import get_db
from dependencies.auth import get_current_user, require_approved_company
from fastapi import APIRouter, Depends, HTTPException
from models.shipments import Shipments
from pydantic import BaseModel, Field
from schemas.auth import UserResponse
from services import trust
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/trust", tags=["trust"], dependencies=[Depends(require_approved_company)])


class LookupIn(BaseModel):
    company_ids: List[str] = Field(default_factory=list, max_length=200)


class RateIn(BaseModel):
    shipment_id: int
    s1: int = Field(..., ge=1, le=5)
    s2: int = Field(..., ge=1, le=5)
    s3: int = Field(..., ge=1, le=5)
    comment: Optional[str] = Field(None, max_length=1000)


@router.post("/lookup")
async def lookup(data: LookupIn, db: AsyncSession = Depends(get_db)):
    """Badge info per company: verified, rating (shown from 3 ratings), count, completed, member since."""
    return await trust.lookup(db, [c[:64] for c in data.company_ids])


@router.get("/me")
async def my_reputation(current_user: UserResponse = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """The current company's own badges, ratings and reviews (averages from 3 ratings)."""
    return await trust.my_reputation(db, str(current_user.id))


@router.get("/companies/{company_id}/reviews")
async def company_reviews(company_id: str, db: AsyncSession = Depends(get_db)):
    """Anonymous reviews of a company — only once it has at least 3."""
    return await trust.reviews(db, company_id[:64])


async def _shipment(db: AsyncSession, shipment_id: int) -> Shipments:
    shipment = await db.get(Shipments, shipment_id)
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    return shipment


@router.get("/ratings/shipment/{shipment_id}")
async def shipment_rating(
    shipment_id: int, current_user: UserResponse = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    state = await trust.rating_state(db, await _shipment(db, shipment_id), str(current_user.id))
    if not state["role"]:
        raise HTTPException(status_code=403, detail="Niste učesnik ovog transporta.")
    return state


@router.post("/ratings")
async def rate(data: RateIn, current_user: UserResponse = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    try:
        r = await trust.rate(db, await _shipment(db, data.shipment_id), str(current_user.id), data.s1, data.s2, data.s3, data.comment)
        return {"ok": True, "id": r.id, "overall": r.overall}
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
