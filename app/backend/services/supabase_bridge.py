"""Supabase mode bridge: one login and one company register shared with TMS Agency / TMS Carrier.

Only used when AUTH_MODE=supabase.

* verify_supabase_token() checks a Supabase access token by asking Supabase Auth itself
  (GET /auth/v1/user), so it works no matter which JWT signing keys the project uses.
* sync_user() runs on every authenticated request (cached per user for SYNC_TTL seconds) and
  mirrors the shared truth into the marketplace tables the rest of the app already uses:
    public.platform_admins                    -> users.role = "admin"
    public.company_members + public.companies -> marketplace companies row (shared_company_id)
    public.company_products ('marketplace')
      + companies.plan                        -> companies.approval_status
    company_members.role                      -> user_profiles.member_role
  The marketplace keeps owning what only it has: company_roles/description/is_public,
  capabilities, and the user's marketplace role (forwarder / trucking / terminal).

Raw SQL here is always schema-qualified (public.*). The ORM models are unqualified and get
mapped to the marketplace schema by the engine's schema_translate_map.
"""

import hashlib
import logging
import time
from datetime import datetime, timezone
from typing import Optional

import httpx
from fastapi import HTTPException, status
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from models.auth import User
from models.companies import Companies
from models.user_profiles import User_profiles

logger = logging.getLogger(__name__)

TOKEN_TTL = 60  # seconds a verified token is trusted without asking Supabase again
SYNC_TTL = 60  # seconds between re-syncs of the same user

_token_cache: dict[str, tuple[float, dict]] = {}
_sync_cache: dict[str, tuple[float, dict]] = {}

# TMS member roles -> marketplace member roles
MEMBER_ROLE_MAP = {"Admin": "admin", "Prodaja": "operations", "Finansije": "finance"}

ACTIVE_PLANS = {"Trial", "Active Paid"}


async def verify_supabase_token(token: str) -> dict:
    """Return the Supabase user JSON for a valid access token, else raise 401."""
    key = hashlib.sha256(token.encode()).hexdigest()
    now = time.time()
    cached = _token_cache.get(key)
    if cached and cached[0] > now:
        return cached[1]

    if not settings.supabase_url or not settings.supabase_anon_key:
        logger.error("AUTH_MODE=supabase but SUPABASE_URL / SUPABASE_ANON_KEY are not set")
        raise HTTPException(status_code=500, detail="Supabase auth is not configured")

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"{settings.supabase_url.rstrip('/')}/auth/v1/user",
                headers={"apikey": settings.supabase_anon_key, "Authorization": f"Bearer {token}"},
            )
    except httpx.HTTPError as exc:
        logger.error("Supabase auth unreachable: %s", type(exc).__name__)
        raise HTTPException(status_code=503, detail="Authentication service unavailable")

    if resp.status_code != 200:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    user = resp.json()
    if not user.get("id"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    # Small, bounded cache; drop expired entries opportunistically
    if len(_token_cache) > 5000:
        for k in [k for k, v in _token_cache.items() if v[0] <= now]:
            _token_cache.pop(k, None)
    _token_cache[key] = (now + TOKEN_TTL, user)
    return user


def invalidate_user(user_id: str) -> None:
    """Force the next request of this user to re-sync (e.g. right after onboarding)."""
    _sync_cache.pop(user_id, None)


def approval_from_shared(products: list, plan: Optional[str]) -> str:
    if plan == "Suspended":
        return "rejected"
    if "marketplace" in (products or []) and plan in ACTIVE_PLANS:
        return "approved"
    return "pending"


async def is_platform_admin(db: AsyncSession, user_id: str) -> bool:
    row = await db.execute(
        text("select 1 from public.platform_admins where user_id = cast(:uid as uuid)"), {"uid": user_id}
    )
    return row.first() is not None


async def load_memberships(db: AsyncSession, user_id: str) -> list[dict]:
    """Active shared memberships, the ones with the marketplace product first."""
    result = await db.execute(
        text(
            """
            select cm.role as member_role, cm.joined_at,
                   c.id::text as company_id, c.name, c.country, c.city, c.vat, c.email, c.phone,
                   c.website, c.address, c.logo_url, c.plan,
                   coalesce(array_agg(cp.product) filter (where cp.product is not null), '{}') as products
            from public.company_members cm
            join public.companies c on c.id = cm.company_id
            left join public.company_products cp on cp.company_id = c.id
            where cm.user_id = cast(:uid as uuid) and cm.active
            group by cm.role, cm.joined_at, c.id
            order by bool_or(cp.product = 'marketplace') desc nulls last, cm.joined_at
            """
        ),
        {"uid": user_id},
    )
    return [dict(r._mapping) for r in result.fetchall()]


async def _upsert_company(db: AsyncSession, m: dict) -> Companies:
    res = await db.execute(select(Companies).where(Companies.shared_company_id == m["company_id"]))
    company = res.scalar_one_or_none()
    now = datetime.now(timezone.utc)
    shared_fields = {
        "company_name": m["name"],
        "country": m["country"],
        "city": m["city"],
        "vat_number": m["vat"],
        "email": m["email"],
        "phone": m["phone"],
        "website": m["website"],
        "address": m["address"],
        "logo_url": m["logo_url"],
        "subscription_plan": m["plan"],
        "approval_status": approval_from_shared(list(m["products"] or []), m["plan"]),
    }
    if company is None:
        company = Companies(
            shared_company_id=m["company_id"],
            is_public=True,
            active_user_count=0,
            created_at=now,
            updated_at=now,
            **shared_fields,
        )
        db.add(company)
        await db.flush()
    else:
        changed = False
        for field, value in shared_fields.items():
            if getattr(company, field) != value:
                setattr(company, field, value)
                changed = True
        if changed:
            company.updated_at = now
    return company


async def sync_user(db: AsyncSession, sb_user: dict) -> dict:
    """Mirror the shared identity into marketplace tables.

    Returns {"admin": bool, "name": display name}. The name is what other companies see on
    messages, so it never falls back to the e-mail address: profile name (set in TMS) →
    auth metadata name → company name.
    """
    user_id = sb_user["id"]
    now_ts = time.time()
    cached = _sync_cache.get(user_id)
    if cached and cached[0] > now_ts:
        return cached[1]

    email = (sb_user.get("email") or "").lower()
    meta = sb_user.get("user_metadata") or {}
    name = meta.get("name") or meta.get("full_name")

    try:
        admin = await is_platform_admin(db, user_id)
        row = await db.execute(
            text("select name from public.profiles where id = cast(:uid as uuid)"), {"uid": user_id}
        )
        profile_name = row.scalar_one_or_none()
        if profile_name and profile_name.strip():
            name = profile_name.strip()

        # users row (FK-free mirror the existing services read)
        res = await db.execute(select(User).where(User.id == user_id))
        user_row = res.scalar_one_or_none()
        role = "admin" if admin else "user"
        if user_row is None:
            db.add(User(id=user_id, email=email, name=name, role=role, last_login=datetime.now(timezone.utc)))
        else:
            user_row.email, user_row.role, user_row.name = email, role, name

        memberships = await load_memberships(db, user_id)
        if not name:
            name = memberships[0]["name"] if memberships else "Cargontainer"
        res = await db.execute(select(User_profiles).where(User_profiles.user_id == user_id))
        profile = res.scalar_one_or_none()

        if memberships:
            m = memberships[0]
            company = await _upsert_company(db, m)
            member_role = MEMBER_ROLE_MAP.get(m["member_role"], "operations")
            if profile is None:
                # A teammate already picked the company's marketplace role — inherit it, so only the
                # first person of a company sees the role picker on /onboarding.
                if company.company_type:
                    db.add(
                        User_profiles(
                            user_id=user_id,
                            role=company.company_type,
                            company_name=company.company_name,
                            display_name=name or company.company_name,
                            created_at=datetime.now(timezone.utc),
                            company_id=company.id,
                            member_role=member_role,
                            member_status="active",
                        )
                    )
            else:
                profile.company_id = company.id
                profile.company_name = company.company_name
                profile.member_role = member_role
                profile.member_status = "active"
        elif admin and profile is None:
            # Platform admins have no company membership by design (TMS Carrier notes: adding one
            # would switch their Agency view). Give them a company-less profile so the app's
            # profile-gated pages (Admin panel) open instead of bouncing to /onboarding.
            db.add(
                User_profiles(
                    user_id=user_id,
                    role="forwarder",
                    company_name="Cargontainer (platform admin)",
                    display_name=name,
                    created_at=datetime.now(timezone.utc),
                    company_id=None,
                    member_role=None,
                    member_status="active",
                )
            )
        elif profile is not None and profile.company_id is not None:
            # No (active) shared membership any more -> detach from the mirrored company
            res = await db.execute(select(Companies).where(Companies.id == profile.company_id))
            linked = res.scalar_one_or_none()
            if linked is None or linked.shared_company_id:
                profile.company_id = None
                profile.member_status = "inactive"

        await db.commit()
    except Exception:
        await db.rollback()
        logger.exception("Supabase sync failed for user %s", user_id[:8])
        raise HTTPException(status_code=503, detail="Could not load company data")

    result = {"admin": admin, "name": name}
    _sync_cache[user_id] = (now_ts + SYNC_TTL, result)
    return result
