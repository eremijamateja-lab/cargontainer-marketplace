"""Phase 3 "poverenje": verification badge, ratings after delivery, completed transports.

Companies are identified by the shared company uuid, the part after ':' of an actor id
(supabase_bridge.make_actor). In local mode (no ':' in ids) the actor id itself is used, and
there is no verification (no public.companies).
"""
import logging
from typing import Iterable, Optional

from core.config import settings
from models.offers import Offers
from models.ratings import Ratings
from models.shipments import Shipments
from services.supabase_bridge import split_actor
from sqlalchemy import func, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

MIN_RATINGS_SHOWN = 3


def company_of(actor: Optional[str]) -> Optional[str]:
    if not actor:
        return None
    return split_actor(actor)[1] or actor


async def shipment_parties(db: AsyncSession, shipment: Shipments) -> tuple[Optional[str], Optional[str]]:
    """(forwarder actor, carrier actor) of a Marketplace shipment."""
    offer = await db.get(Offers, shipment.offer_id) if shipment.offer_id else None
    return shipment.user_id, (offer.user_id if offer else None)


async def lookup(db: AsyncSession, company_ids: Iterable[str]) -> dict:
    ids = sorted({c for c in company_ids if c})[:200]
    if not ids:
        return {}
    out = {c: {"verified": False, "member_since": None, "rating": None, "rating_count": 0, "completed": 0} for c in ids}

    if settings.is_supabase:
        rows = await db.execute(
            text(
                "select id::text id, verified_at, created_at from public.companies "
                "where id::text = any(:ids)"
            ),
            {"ids": ids},
        )
        for r in rows.mappings():
            out[r["id"]]["verified"] = r["verified_at"] is not None
            out[r["id"]]["member_since"] = r["created_at"].date().isoformat() if r["created_at"] else None

    agg = await db.execute(
        select(Ratings.rated_company, func.count(Ratings.id), func.avg(Ratings.overall))
        .where(Ratings.rated_company.in_(ids))
        .group_by(Ratings.rated_company)
    )
    for company, n, avg in agg.all():
        out[company]["rating_count"] = int(n)
        if n >= MIN_RATINGS_SHOWN and avg is not None:
            out[company]["rating"] = round(float(avg), 1)

    # Delivered Marketplace transports, as forwarder (shipment owner) or carrier (offer owner)
    delivered = (
        await db.execute(
            select(Shipments.user_id, Offers.user_id)
            .outerjoin(Offers, Offers.id == Shipments.offer_id)
            .where(Shipments.status == "delivered")
        )
    ).all()
    for fwd, car in delivered:
        for actor in {fwd, car}:
            c = company_of(actor)
            if c in out:
                out[c]["completed"] += 1
    return out


async def reviews(db: AsyncSession, company_id: str) -> dict:
    rows = (
        await db.execute(
            select(Ratings).where(Ratings.rated_company == company_id).order_by(Ratings.created_at.desc()).limit(100)
        )
    ).scalars().all()
    if len(rows) < MIN_RATINGS_SHOWN:
        return {"count": len(rows), "visible": False, "items": []}
    return {
        "count": len(rows),
        "visible": True,
        "items": [
            {
                "overall": r.overall,
                "s1": r.s1,
                "s2": r.s2,
                "s3": r.s3,
                "rater_role": r.rater_role,
                "comment": r.comment,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ],
    }


async def rating_state(db: AsyncSession, shipment: Shipments, actor: str) -> dict:
    fwd, car = await shipment_parties(db, shipment)
    me = company_of(actor)
    role = "forwarder" if me and me == company_of(fwd) else "carrier" if me and me == company_of(car) else None
    mine = None
    if role:
        r = (
            await db.execute(select(Ratings).where(Ratings.shipment_id == shipment.id, Ratings.rater_company == me))
        ).scalars().first()
        if r:
            mine = {"s1": r.s1, "s2": r.s2, "s3": r.s3, "overall": r.overall, "comment": r.comment}
    return {
        "role": role,
        "can_rate": bool(role) and shipment.status == "delivered" and mine is None,
        "mine": mine,
    }


async def rate(db: AsyncSession, shipment: Shipments, actor: str, s1: int, s2: int, s3: int, comment: Optional[str]) -> Ratings:
    if shipment.status != "delivered":
        raise ValueError("Ocenjivanje je moguće tek kad je transport isporučen.")
    fwd, car = await shipment_parties(db, shipment)
    me = company_of(actor)
    if me and me == company_of(fwd):
        role, other = "forwarder", company_of(car)
    elif me and me == company_of(car):
        role, other = "carrier", company_of(fwd)
    else:
        raise PermissionError("Niste učesnik ovog transporta.")
    if not other or other == me:
        raise ValueError("Druga strana ovog transporta nije poznata.")
    exists = (
        await db.execute(select(Ratings.id).where(Ratings.shipment_id == shipment.id, Ratings.rater_company == me))
    ).first()
    if exists:
        raise ValueError("Ovaj transport ste već ocenili.")
    for v in (s1, s2, s3):
        if v not in (1, 2, 3, 4, 5):
            raise ValueError("Ocene moraju biti od 1 do 5.")
    rating = Ratings(
        shipment_id=shipment.id,
        rater_company=me,
        rater_user_id=actor,
        rated_company=other,
        rater_role=role,
        s1=s1,
        s2=s2,
        s3=s3,
        overall=round((s1 + s2 + s3) / 3, 2),
        comment=(comment or "").strip()[:1000] or None,
    )
    db.add(rating)
    await db.commit()
    await db.refresh(rating)
    return rating


async def my_reputation(db: AsyncSession, actor: str) -> dict:
    """The logged-in company's own trust info: badges, per-criteria averages and reviews (from 3)."""
    company = company_of(actor)
    if not company:
        return {"company_id": None}
    info = (await lookup(db, [company]))[company]
    groups = {}
    rows = await db.execute(
        select(Ratings.rater_role, func.count(Ratings.id), func.avg(Ratings.s1), func.avg(Ratings.s2), func.avg(Ratings.s3))
        .where(Ratings.rated_company == company)
        .group_by(Ratings.rater_role)
    )
    for role, n, a1, a2, a3 in rows.all():
        # rater_role 'forwarder' = rated by a forwarder = this company acted as carrier
        groups[role] = {
            "count": int(n),
            "s": [round(float(a), 1) for a in (a1, a2, a3)] if n >= MIN_RATINGS_SHOWN else None,
        }
    return {
        "company_id": company,
        **info,
        "min_shown": MIN_RATINGS_SHOWN,
        "by_forwarders": groups.get("forwarder"),
        "by_carriers": groups.get("carrier"),
        "reviews": await reviews(db, company),
    }
