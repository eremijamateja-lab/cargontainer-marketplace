"""Moje relacije (carrier corridors) + Web Push subscription endpoints."""
import logging
from typing import List, Optional

from core.database import get_db
from dependencies.auth import get_current_user, require_approved_company
from fastapi import APIRouter, Depends, HTTPException
from models.notifications import Carrier_corridors, Push_subscriptions
from pydantic import BaseModel, Field
from schemas.auth import UserResponse
from services.notifications import get_user_company_id, get_vapid_keys, send_to_subscriptions
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/notifications", tags=["notifications"], dependencies=[Depends(require_approved_company)]
)

MAX_CORRIDORS = 30


class CorridorIn(BaseModel):
    origin_country: Optional[str] = Field(None, max_length=2)
    destination_country: Optional[str] = Field(None, max_length=2)
    both_directions: bool = True


class CorridorOut(CorridorIn):
    id: int


class PushKeys(BaseModel):
    p256dh: str = Field(..., max_length=200)
    auth: str = Field(..., max_length=100)


class SubscribeIn(BaseModel):
    endpoint: str = Field(..., max_length=1000)
    keys: PushKeys
    lang: Optional[str] = Field("sr", max_length=5)


class UnsubscribeIn(BaseModel):
    endpoint: str = Field(..., max_length=1000)


async def _company_id(db: AsyncSession, user: UserResponse) -> int:
    company_id = await get_user_company_id(db, str(user.id))
    if not company_id:
        raise HTTPException(status_code=400, detail="No company profile")
    return company_id


def _code(value: Optional[str]) -> Optional[str]:
    value = (value or "").strip().upper()
    return value or None


@router.get("/corridors", response_model=List[CorridorOut])
async def list_corridors(current_user: UserResponse = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    company_id = await _company_id(db, current_user)
    rows = await db.execute(
        select(Carrier_corridors).where(Carrier_corridors.company_id == company_id).order_by(Carrier_corridors.id)
    )
    return [
        CorridorOut(
            id=c.id,
            origin_country=c.origin_country,
            destination_country=c.destination_country,
            both_directions=bool(c.both_directions),
        )
        for c in rows.scalars().all()
    ]


@router.put("/corridors", response_model=List[CorridorOut])
async def replace_corridors(
    items: List[CorridorIn],
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Replace the company's whole corridor list (the UI edits it as one list)."""
    if len(items) > MAX_CORRIDORS:
        raise HTTPException(status_code=400, detail=f"At most {MAX_CORRIDORS} corridors")
    company_id = await _company_id(db, current_user)
    await db.execute(delete(Carrier_corridors).where(Carrier_corridors.company_id == company_id))
    seen = set()
    for item in items:
        key = (_code(item.origin_country), _code(item.destination_country), item.both_directions)
        if key in seen or key[:2] == (None, None):
            continue  # duplicates and "any -> any" (that's just the whole board) are skipped
        seen.add(key)
        db.add(
            Carrier_corridors(
                company_id=company_id,
                origin_country=key[0],
                destination_country=key[1],
                both_directions=key[2],
                created_by=str(current_user.id),
            )
        )
    await db.commit()
    return await list_corridors(current_user, db)


@router.get("/push/public-key")
async def push_public_key(db: AsyncSession = Depends(get_db)):
    keys = await get_vapid_keys(db)
    return {"public_key": keys.public_key_b64}


@router.post("/push/subscribe")
async def push_subscribe(
    data: SubscribeIn, current_user: UserResponse = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    if not data.endpoint.startswith("https://"):
        raise HTTPException(status_code=400, detail="Invalid endpoint")
    company_id = await _company_id(db, current_user)
    existing = (
        await db.execute(select(Push_subscriptions).where(Push_subscriptions.endpoint == data.endpoint))
    ).scalars().first()
    sub = existing or Push_subscriptions(endpoint=data.endpoint)
    sub.user_id = str(current_user.id)
    sub.company_id = company_id
    sub.p256dh = data.keys.p256dh
    sub.auth = data.keys.auth
    sub.lang = (data.lang or "sr")[:5]
    if not existing:
        db.add(sub)
    await db.commit()
    return {"ok": True}


@router.post("/push/unsubscribe")
async def push_unsubscribe(
    data: UnsubscribeIn, current_user: UserResponse = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    await db.execute(
        delete(Push_subscriptions).where(
            Push_subscriptions.endpoint == data.endpoint, Push_subscriptions.user_id == str(current_user.id)
        )
    )
    await db.commit()
    return {"ok": True}


@router.get("/push/status")
async def push_status(current_user: UserResponse = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    rows = await db.execute(select(Push_subscriptions.id).where(Push_subscriptions.user_id == str(current_user.id)))
    return {"devices": len(rows.scalars().all())}


@router.post("/push/test")
async def push_test(current_user: UserResponse = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    subs = (
        await db.execute(select(Push_subscriptions).where(Push_subscriptions.user_id == str(current_user.id)))
    ).scalars().all()

    def payload(lang: str) -> dict:
        en = lang == "en"
        return {
            "title": "Cargontainer Marketplace",
            "body": "Notifications are on ✔" if en else "Obaveštenja su uključena ✔",
            "url": "/marketplace",
            "tag": "test",
        }

    sent = await send_to_subscriptions(db, subs, payload)
    return {"sent": sent, "devices": len(subs)}
