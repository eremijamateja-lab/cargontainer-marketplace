"""New-request alerts: "Moje relacije" (carrier corridors) + Web Push to phones/desktops.

Flow: a forwarder creates a transport request -> the create endpoint schedules
notify_new_request() as a background task -> every company whose corridors match the
route (except the author's company) gets a push on every device that turned it on.
The live board in the browser (sound + desktop notification) is done in the frontend
with the same matching rule, see corridor_matches / src/lib/corridors.ts.
"""
import asyncio
import base64
import json
import logging
from datetime import datetime
from typing import Iterable, Optional

from core.database import db_manager
from models.notifications import Carrier_corridors, Push_keys, Push_subscriptions
from models.transport_requests import Transport_requests
from models.user_profiles import User_profiles
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

VISIBLE_STATUSES = {"published", "offers_received", "active", "open"}
VAPID_SUBJECT = "mailto:office@cargontainer.com"


def _norm(code: Optional[str]) -> str:
    return (code or "").strip().upper()


def corridor_matches(corridor, origin: Optional[str], destination: Optional[str]) -> bool:
    """Empty corridor side = any country. both_directions also accepts the reverse route."""
    o, d = _norm(origin), _norm(destination)
    co, cd = _norm(corridor.origin_country), _norm(corridor.destination_country)

    def fits(a: str, b: str) -> bool:
        return (not co or co == a) and (not cd or cd == b)

    return fits(o, d) or (bool(corridor.both_directions) and fits(d, o))


async def get_user_company_id(db: AsyncSession, user_id: str) -> Optional[int]:
    row = await db.execute(select(User_profiles.company_id).where(User_profiles.user_id == str(user_id)))
    return row.scalars().first()


# ─── VAPID keys (generated once, stored in marketplace.push_keys) ───

def _generate_vapid() -> tuple[str, str]:
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric import ec

    key = ec.generate_private_key(ec.SECP256R1())
    pem = key.private_bytes(
        serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()
    ).decode()
    raw_pub = key.public_key().public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)
    return pem, base64.urlsafe_b64encode(raw_pub).rstrip(b"=").decode()


async def get_vapid_keys(db: AsyncSession) -> Push_keys:
    keys = await db.get(Push_keys, 1)
    if keys:
        return keys
    pem, pub = _generate_vapid()
    db.add(Push_keys(id=1, private_key_pem=pem, public_key_b64=pub))
    try:
        await db.commit()
    except Exception:
        # Another worker created it at the same moment - use theirs.
        await db.rollback()
    return await db.get(Push_keys, 1)


# ─── Sending ───

def _flag(code: str) -> str:
    code = _norm(code)
    if len(code) != 2 or not code.isalpha():
        return ""
    return "".join(chr(0x1F1E6 + ord(c) - ord("A")) for c in code)


def build_payload(req: Transport_requests, lang: str) -> dict:
    o, d = _norm(req.origin_country), _norm(req.destination_country)
    route = f"{o or '?'} → {d or '?'}"
    places = f"{_flag(o)} {req.origin or o} → {_flag(d)} {req.destination or d}".strip()
    parts = [places]
    if req.weight_kg:
        parts.append(f"{req.weight_kg:g} kg")
    if req.preferred_date:
        parts.append(("loading " if lang == "en" else "utovar ") + str(req.preferred_date))
    return {
        "title": ("New request " if lang == "en" else "Novi upit ") + route,
        "body": " · ".join(parts),
        "url": f"/marketplace?request={req.id}",
        "tag": f"request-{req.id}",
    }


def _send_one(sub: dict, payload: dict, vapid_pem: str) -> Optional[int]:
    """Blocking send (pywebpush uses requests). Returns an HTTP status on failure, None on success."""
    from py_vapid import Vapid02
    from pywebpush import WebPushException, webpush

    try:
        webpush(
            subscription_info={"endpoint": sub["endpoint"], "keys": {"p256dh": sub["p256dh"], "auth": sub["auth"]}},
            data=json.dumps(payload, ensure_ascii=False),
            vapid_private_key=Vapid02.from_pem(vapid_pem.encode()),
            vapid_claims={"sub": VAPID_SUBJECT},
            ttl=3600,
            timeout=10,
        )
        return None
    except WebPushException as exc:
        status = getattr(exc.response, "status_code", None) or 0
        logger.info("Push failed (%s) for subscription %s", status, sub["id"])
        return status
    except Exception as exc:  # network etc. - never break the request flow
        logger.warning("Push error for subscription %s: %s", sub["id"], type(exc).__name__)
        return 0


async def send_to_subscriptions(db: AsyncSession, subs: Iterable[Push_subscriptions], payload_for) -> int:
    """payload_for(lang) -> dict. Drops subscriptions the push service says are gone (404/410)."""
    subs = list(subs)
    if not subs:
        return 0
    keys = await get_vapid_keys(db)
    plain = [
        {"id": s.id, "endpoint": s.endpoint, "p256dh": s.p256dh, "auth": s.auth, "lang": s.lang or "sr"}
        for s in subs
    ]
    results = await asyncio.gather(
        *[asyncio.to_thread(_send_one, s, payload_for(s["lang"]), keys.private_key_pem) for s in plain]
    )
    gone = [s["id"] for s, r in zip(plain, results) if r in (404, 410)]
    ok = [s["id"] for s, r in zip(plain, results) if r is None]
    if gone:
        await db.execute(delete(Push_subscriptions).where(Push_subscriptions.id.in_(gone)))
    if ok:
        now = datetime.now()
        for s in subs:
            if s.id in ok:
                s.last_sent_at = now
    await db.commit()
    return len(ok)


async def notify_new_request(request_id: int) -> None:
    """Background task after a request is created. Uses its own DB session."""
    try:
        await db_manager.ensure_initialized()
        async with db_manager.async_session_maker() as db:
            req = await db.get(Transport_requests, request_id)
            if not req or (req.status and req.status.lower() not in VISIBLE_STATUSES):
                return
            author_company = await get_user_company_id(db, req.user_id)
            corridors = (await db.execute(select(Carrier_corridors))).scalars().all()
            companies = {
                c.company_id
                for c in corridors
                if c.company_id != author_company and corridor_matches(c, req.origin_country, req.destination_country)
            }
            if not companies:
                return
            subs = (
                await db.execute(
                    select(Push_subscriptions).where(
                        Push_subscriptions.company_id.in_(companies),
                        Push_subscriptions.user_id != str(req.user_id),
                    )
                )
            ).scalars().all()
            sent = await send_to_subscriptions(db, subs, lambda lang: build_payload(req, lang))
            logger.info("Request %s: push sent to %s device(s) in %s company(ies)", request_id, sent, len(companies))
    except Exception:
        logger.exception("notify_new_request(%s) failed", request_id)
