"""Admin-only Pilot Cleanup endpoints.

Identifies test data using safe criteria and allows selective archival.
Never deletes protected records (platform admin, Ecomsped doo).
"""
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, update, or_, func
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.auth import get_current_user, is_platform_admin
from models.companies import Companies
from models.user_profiles import User_profiles
from models.transport_requests import Transport_requests
from models.offers import Offers
from models.shipments import Shipments
from schemas.auth import UserResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/admin/pilot-cleanup", tags=["admin-cleanup"])

# Platform admin emails — hard protected
ADMIN_EMAILS = [
    "office@cargontainer.com",
    "admin@cargontainer.com",
    "eremija.mateja@gmail.com",
]

# Protected company names (case-insensitive partial match)
PROTECTED_COMPANY_NAMES = ["ecomsped"]

# Test email patterns
TEST_EMAIL_PATTERNS = [
    "@cargontainer.test",
    "forwarder.test@cargontainer.com",
    "carrier.test@cargontainer.com",
    "customs.test@cargontainer.com",
    "pending.test@cargontainer.com",
    "rejected.test@cargontainer.com",
]

# Test company name keywords (case-insensitive)
TEST_COMPANY_KEYWORDS = ["test", "demo"]


def _is_protected_email(email: str) -> bool:
    """Check if email is a protected admin email."""
    return email.lower() in [e.lower() for e in ADMIN_EMAILS]


def _is_protected_company(name: str) -> bool:
    """Check if company name is protected."""
    lower = name.lower()
    for protected in PROTECTED_COMPANY_NAMES:
        if protected in lower:
            return True
    return False


def _is_test_email(email: str) -> bool:
    """Check if email matches test criteria."""
    lower = email.lower()
    # Exact match seeded accounts
    for pattern in TEST_EMAIL_PATTERNS:
        if pattern.startswith("@"):
            if lower.endswith(pattern):
                return True
        else:
            if lower == pattern:
                return True
    # Contains "test" in email
    if "test" in lower:
        return True
    return False


def _is_test_company_name(name: str) -> bool:
    """Check if company name matches test criteria."""
    lower = (name or "").lower()
    for keyword in TEST_COMPANY_KEYWORDS:
        if keyword in lower:
            return True
    return False


def _check_admin(user: UserResponse) -> None:
    """Raise 403 if not admin."""
    if not is_platform_admin(user):
        raise HTTPException(status_code=403, detail="Admin access required")


class ArchiveRequest(BaseModel):
    rfq_ids: List[int] = []
    offer_ids: List[int] = []
    shipment_ids: List[int] = []
    company_ids: List[int] = []
    member_ids: List[int] = []


@router.get("/scan")
async def scan_test_data(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Scan and identify test data. Returns categorized lists for admin review."""
    _check_admin(current_user)

    # 1. Find test companies
    all_companies_result = await db.execute(select(Companies))
    all_companies = all_companies_result.scalars().all()

    test_companies = []
    test_company_ids = set()
    for c in all_companies:
        # Skip archived
        if (c.approval_status or "").startswith("archived"):
            continue
        if _is_protected_company(c.company_name or ""):
            continue
        if _is_test_company_name(c.company_name):
            test_companies.append({
                "id": c.id,
                "company_name": c.company_name or "—",
                "email": c.email or "—",
                "country": c.country or "—",
                "approval_status": c.approval_status or "approved",
                "created_at": str(c.created_at) if c.created_at else None,
                "is_protected": False,
            })
            test_company_ids.add(c.id)

    # 2. Find test members/users
    all_profiles_result = await db.execute(select(User_profiles))
    all_profiles = all_profiles_result.scalars().all()

    test_members = []
    test_user_ids = set()
    for p in all_profiles:
        # Skip archived
        if (p.member_status or "").startswith("archived"):
            continue
        user_email = p.user_id or ""
        # Reconstruct email from member_ prefix
        if user_email.startswith("member_"):
            parts = user_email[7:]
            user_email = parts.replace("_at_", "@").replace("_", ".")

        if _is_protected_email(user_email):
            continue

        is_test = _is_test_email(user_email) or (p.company_id in test_company_ids)
        if is_test:
            test_members.append({
                "id": p.id,
                "user_id": p.user_id,
                "display_name": p.display_name or "—",
                "email": user_email,
                "company_name": p.company_name or "—",
                "company_id": p.company_id,
                "member_role": p.member_role or "member",
                "member_status": p.member_status or "active",
                "created_at": str(p.created_at) if p.created_at else None,
                "is_protected": False,
            })
            test_user_ids.add(p.user_id)

    # 3. Find test RFQs (created by test users/companies)
    all_rfqs_result = await db.execute(select(Transport_requests))
    all_rfqs = all_rfqs_result.scalars().all()

    test_rfqs = []
    for r in all_rfqs:
        if (r.status or "").startswith("archived"):
            continue
        is_test = (r.user_id in test_user_ids) or _is_test_email(r.user_id or "")
        # Also check user_company
        if not is_test and r.user_company:
            is_test = _is_test_company_name(r.user_company)
        if is_test:
            test_rfqs.append({
                "id": r.id,
                "title": r.title or f"RFQ #{r.id}",
                "user_id": r.user_id,
                "user_company": r.user_company or "—",
                "origin": r.origin or "—",
                "destination": r.destination or "—",
                "status": r.status or "open",
                "created_at": str(r.created_at) if r.created_at else None,
            })

    test_rfq_ids = {r["id"] for r in test_rfqs}

    # 4. Find test offers (by test users or on test RFQs)
    all_offers_result = await db.execute(select(Offers))
    all_offers = all_offers_result.scalars().all()

    test_offers = []
    for o in all_offers:
        if (o.status or "").startswith("archived"):
            continue
        is_test = (o.user_id in test_user_ids) or _is_test_email(o.user_id or "") or (o.request_id in test_rfq_ids)
        if is_test:
            test_offers.append({
                "id": o.id,
                "request_id": o.request_id,
                "user_id": o.user_id,
                "carrier_name": o.carrier_name or "—",
                "price": o.price,
                "currency": o.currency,
                "status": o.status or "pending",
                "created_at": str(o.created_at) if o.created_at else None,
            })

    test_offer_ids = {o["id"] for o in test_offers}

    # 5. Find test shipments (by test users or linked to test RFQs/offers)
    all_shipments_result = await db.execute(select(Shipments))
    all_shipments = all_shipments_result.scalars().all()

    test_shipments = []
    for s in all_shipments:
        if (s.status or "").startswith("archived"):
            continue
        is_test = (
            (s.user_id in test_user_ids)
            or _is_test_email(s.user_id or "")
            or (s.request_id and s.request_id in test_rfq_ids)
            or (s.offer_id and s.offer_id in test_offer_ids)
        )
        if is_test:
            test_shipments.append({
                "id": s.id,
                "tracking_number": s.tracking_number or "—",
                "user_id": s.user_id,
                "carrier_name": s.carrier_name or "—",
                "origin": s.origin or "—",
                "destination": s.destination or "—",
                "status": s.status or "—",
                "created_at": str(s.created_at) if s.created_at else None,
            })

    # Summary counts
    counts = {
        "rfqs": len(test_rfqs),
        "offers": len(test_offers),
        "shipments": len(test_shipments),
        "companies": len(test_companies),
        "members": len(test_members),
    }

    return {
        "counts": counts,
        "test_rfqs": test_rfqs,
        "test_offers": test_offers,
        "test_shipments": test_shipments,
        "test_companies": test_companies,
        "test_members": test_members,
    }


@router.post("/archive")
async def archive_test_data(
    data: ArchiveRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Archive selected test data. Sets status to 'archived_test'.
    
    Protected records are NEVER archived:
    - Platform admin email: eremija.mateja@gmail.com
    - Admin company: Ecomsped doo
    - Non-test companies/users
    """
    _check_admin(current_user)

    results = {
        "rfqs_archived": 0,
        "offers_archived": 0,
        "shipments_archived": 0,
        "companies_archived": 0,
        "members_archived": 0,
        "errors": [],
    }

    # Archive shipments first (least dependencies)
    for sid in data.shipment_ids:
        try:
            r = await db.execute(select(Shipments).where(Shipments.id == sid))
            shipment = r.scalar_one_or_none()
            if shipment and not (shipment.status or "").startswith("archived"):
                shipment.status = "archived_test"
                results["shipments_archived"] += 1
        except Exception as e:
            results["errors"].append(f"Shipment {sid}: {str(e)}")

    # Archive offers
    for oid in data.offer_ids:
        try:
            r = await db.execute(select(Offers).where(Offers.id == oid))
            offer = r.scalar_one_or_none()
            if offer and not (offer.status or "").startswith("archived"):
                offer.status = "archived_test"
                results["offers_archived"] += 1
        except Exception as e:
            results["errors"].append(f"Offer {oid}: {str(e)}")

    # Archive RFQs
    for rid in data.rfq_ids:
        try:
            r = await db.execute(select(Transport_requests).where(Transport_requests.id == rid))
            rfq = r.scalar_one_or_none()
            if rfq and not (rfq.status or "").startswith("archived"):
                rfq.status = "archived_test"
                results["rfqs_archived"] += 1
        except Exception as e:
            results["errors"].append(f"RFQ {rid}: {str(e)}")

    # Archive members (but NEVER admin email)
    for mid in data.member_ids:
        try:
            r = await db.execute(select(User_profiles).where(User_profiles.id == mid))
            member = r.scalar_one_or_none()
            if member:
                # Reconstruct email for protection check
                user_email = member.user_id or ""
                if user_email.startswith("member_"):
                    parts = user_email[7:]
                    user_email = parts.replace("_at_", "@").replace("_", ".")
                if _is_protected_email(user_email):
                    results["errors"].append(f"Member {mid}: PROTECTED — cannot archive admin")
                    continue
                if not (member.member_status or "").startswith("archived"):
                    member.member_status = "archived_test"
                    results["members_archived"] += 1
        except Exception as e:
            results["errors"].append(f"Member {mid}: {str(e)}")

    # Archive companies (but NEVER protected companies)
    for cid in data.company_ids:
        try:
            r = await db.execute(select(Companies).where(Companies.id == cid))
            company = r.scalar_one_or_none()
            if company:
                if _is_protected_company(company.company_name or ""):
                    results["errors"].append(f"Company {cid}: PROTECTED — cannot archive")
                    continue
                if not (company.approval_status or "").startswith("archived"):
                    company.approval_status = "archived_test"
                    results["companies_archived"] += 1
        except Exception as e:
            results["errors"].append(f"Company {cid}: {str(e)}")

    await db.commit()

    logger.info(
        f"Admin {current_user.email} pilot cleanup: "
        f"RFQs={results['rfqs_archived']}, Offers={results['offers_archived']}, "
        f"Shipments={results['shipments_archived']}, Companies={results['companies_archived']}, "
        f"Members={results['members_archived']}"
    )

    return {"success": True, "results": results}