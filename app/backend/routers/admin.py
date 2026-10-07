import logging
from typing import Optional, Any, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, update, func
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.database import get_db
from dependencies.auth import SHARED_COMPANY_FIELDS, get_current_user, is_platform_admin, require_local_mode
from services.supabase_bridge import load_memberships
from models.companies import Companies
from models.user_profiles import User_profiles
from schemas.auth import UserResponse

logger = logging.getLogger(__name__)


def normalize_company_roles(value: Any) -> List[str]:
    """Normalize company_roles to always return a list of strings.
    
    Handles: list, comma-separated string, JSON string, null/None, other types.
    """
    if value is None:
        return []
    if isinstance(value, list):
        return [str(v) for v in value if v]
    if isinstance(value, str):
        stripped = value.strip()
        if not stripped:
            return []
        # Try JSON parse first (e.g. '["forwarder","carrier"]')
        if stripped.startswith("["):
            try:
                import json
                parsed = json.loads(stripped)
                if isinstance(parsed, list):
                    return [str(v) for v in parsed if v]
            except (json.JSONDecodeError, TypeError):
                pass
        # Comma-separated string
        return [s.strip() for s in stripped.split(",") if s.strip()]
    return [str(value)]

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])

# Platform admin emails — these users can approve/reject companies
ADMIN_EMAILS = [
    "office@cargontainer.com",
    "admin@cargontainer.com",
    "eremija.mateja@gmail.com",
]


class ApproveRejectRequest(BaseModel):
    company_id: int


@router.get("/is-admin")
async def check_is_admin(
    current_user: UserResponse = Depends(get_current_user),
):
    """Check if the current user is a platform admin."""
    email = current_user.email or ""
    is_admin = is_platform_admin(current_user)
    return {"is_admin": is_admin}


@router.get("/approval-status")
async def get_approval_status(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the approval status of the current user's company."""
    # Get user profile
    result = await db.execute(
        select(User_profiles).where(User_profiles.user_id == str(current_user.id))
    )
    profile = result.scalar_one_or_none()

    if not profile:
        if settings.is_supabase:
            # Tell /onboarding whether a shared company already exists (then only the marketplace
            # role is asked) or the user still has to register their company via TMS Agency.
            memberships = await load_memberships(db, str(current_user.id))
            if memberships:
                return {
                    "status": "no_profile",
                    "company_name": memberships[0]["name"],
                    "company_id": None,
                    "has_shared_company": True,
                }
            return {"status": "no_profile", "company_name": None, "company_id": None, "has_shared_company": False}
        return {"status": "no_profile", "company_name": None, "company_id": None}

    if not profile.company_id:
        return {"status": "no_company", "company_name": None, "company_id": None}

    # Get company
    company_result = await db.execute(
        select(Companies).where(Companies.id == profile.company_id)
    )
    company = company_result.scalar_one_or_none()

    if not company:
        return {"status": "no_company", "company_name": None, "company_id": None}

    # Check if user is admin — admins are always approved
    email = current_user.email or ""
    if is_platform_admin(current_user):
        return {
            "status": "approved",
            "company_name": company.company_name,
            "company_id": company.id,
        }

    # Return company approval status
    status = company.approval_status or "approved"  # Existing companies without status are approved
    return {
        "status": status,
        "company_name": company.company_name,
        "company_id": company.id,
    }


@router.get("/pending-companies")
async def get_pending_companies(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all companies pending approval (admin only)."""
    email = current_user.email or ""
    if not is_platform_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")

    result = await db.execute(
        select(Companies).where(Companies.approval_status == "pending").order_by(Companies.id.desc())
    )
    companies = result.scalars().all()

    items = []
    for company in companies:
        # Safely get the admin user for this company
        admin_profile = None
        try:
            user_result = await db.execute(
                select(User_profiles).where(
                    User_profiles.company_id == company.id,
                    User_profiles.member_role == "admin",
                )
            )
            admin_profile = user_result.scalar_one_or_none()
        except Exception as e:
            logger.warning(f"Failed to fetch admin profile for company {company.id}: {e}")

        items.append({
            "id": company.id,
            "company_name": company.company_name or "—",
            "company_type": company.company_type or "—",
            "company_roles": normalize_company_roles(company.company_roles),
            "country": company.country or "—",
            "city": company.city or "—",
            "vat_number": company.vat_number or "—",
            "email": company.email or "—",
            "phone": company.phone or "—",
            "approval_status": company.approval_status or "pending",
            "created_at": str(company.created_at) if company.created_at else None,
            "user_name": admin_profile.display_name if admin_profile else "—",
            "user_email": admin_profile.user_id if admin_profile else "—",
        })

    return {"items": items}


@router.get("/pending-members")
async def get_pending_members(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all team members pending approval, across every company (admin only)."""
    email = current_user.email or ""
    if not is_platform_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")

    result = await db.execute(
        select(User_profiles).where(User_profiles.member_status == "pending").order_by(User_profiles.id.desc())
    )
    members = result.scalars().all()

    items = []
    for m in members:
        email_guess = ""
        if m.user_id and m.user_id.startswith("member_"):
            rest = m.user_id[7:]
            cid_prefix, sep, remainder = rest.partition("_")
            encoded = remainder if (sep and cid_prefix.isdigit()) else rest
            email_guess = encoded.replace("_at_", "@").replace("_", ".")
        items.append({
            "id": m.id,
            "display_name": m.display_name or "—",
            "email": email_guess,
            "member_role": m.member_role or "member",
            "company_id": m.company_id,
            "company_name": m.company_name or "—",
            "created_at": str(m.created_at) if m.created_at else None,
        })

    return {"items": items}


@router.get("/pending-count")
async def get_pending_count(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lightweight combined count of pending companies + pending members, for a nav badge."""
    email = current_user.email or ""
    if not is_platform_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")

    companies_count = (await db.execute(
        select(func.count()).select_from(Companies).where(Companies.approval_status == "pending")
    )).scalar_one()
    members_count = (await db.execute(
        select(func.count()).select_from(User_profiles).where(User_profiles.member_status == "pending")
    )).scalar_one()

    return {
        "pending_companies": companies_count,
        "pending_members": members_count,
        "total": companies_count + members_count,
    }


@router.get("/all-companies")
async def get_all_companies(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all companies (admin only).
    
    Returns ALL companies regardless of approval_status, missing fields,
    company_roles format, or missing user/profile associations.
    Never excludes a company due to optional missing data.
    """
    email = current_user.email or ""
    if not is_platform_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")

    result = await db.execute(
        select(Companies).order_by(Companies.id.desc())
    )
    companies = result.scalars().all()

    items = []
    for company in companies:
        # Safely get the admin user for this company - never let join failure exclude company
        admin_profile = None
        try:
            user_result = await db.execute(
                select(User_profiles).where(
                    User_profiles.company_id == company.id,
                    User_profiles.member_role == "admin",
                )
            )
            admin_profile = user_result.scalar_one_or_none()
        except Exception as e:
            logger.warning(f"Failed to fetch admin profile for company {company.id}: {e}")

        items.append({
            "id": company.id,
            "company_name": company.company_name or "—",
            "company_type": company.company_type or "—",
            "company_roles": normalize_company_roles(company.company_roles),
            "country": company.country or "—",
            "city": company.city or "—",
            "vat_number": company.vat_number or "—",
            "email": company.email or "—",
            "phone": company.phone or "—",
            "approval_status": company.approval_status or "approved",
            "created_at": str(company.created_at) if company.created_at else None,
            "user_name": admin_profile.display_name if admin_profile else "—",
            "user_email": admin_profile.user_id if admin_profile else "—",
        })

    logger.info(f"Admin all-companies: returning {len(items)} companies")
    return {"items": items}


class AdminUpdateCompanyRequest(BaseModel):
    company_id: int
    company_name: Optional[str] = None
    company_roles: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    vat_number: Optional[str] = None
    registration_number: Optional[str] = None
    company_type: Optional[str] = None
    approval_status: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None


@router.post("/update-company")
async def admin_update_company(
    data: AdminUpdateCompanyRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Admin-only: update verified/locked fields on any company."""
    email = current_user.email or ""
    if not is_platform_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")

    result = await db.execute(
        select(Companies).where(Companies.id == data.company_id)
    )
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    if settings.is_supabase and company.shared_company_id:
        # Legal/contact fields + approval belong to the shared company (edited in TMS Agency)
        for field in SHARED_COMPANY_FIELDS:
            if hasattr(data, field):
                setattr(data, field, None)

    # Update only provided fields
    if data.company_name is not None:
        company.company_name = data.company_name
        # Also update all member profiles' company_name
        members_result = await db.execute(
            select(User_profiles).where(User_profiles.company_id == company.id)
        )
        for member in members_result.scalars().all():
            member.company_name = data.company_name
    if data.company_roles is not None:
        company.company_roles = data.company_roles
    if data.country is not None:
        company.country = data.country
    if data.city is not None:
        company.city = data.city
    if data.vat_number is not None:
        company.vat_number = data.vat_number
    if data.registration_number is not None:
        # Store in description or a dedicated field if available
        pass  # registration_number field may not exist yet — skip silently
    if data.company_type is not None:
        company.company_type = data.company_type
    if data.approval_status is not None:
        if data.approval_status in ("pending", "approved", "rejected"):
            company.approval_status = data.approval_status
    if data.email is not None:
        company.email = data.email
    if data.phone is not None:
        company.phone = data.phone
    if data.website is not None:
        company.website = data.website
    if data.description is not None:
        company.description = data.description
    if data.address is not None:
        company.address = data.address

    from datetime import datetime, timezone
    company.updated_at = datetime.now(timezone.utc)
    await db.commit()

    logger.info(f"Admin {email} updated company {company.company_name} (ID: {data.company_id})")
    return {"success": True, "message": f"Company '{company.company_name}' updated by admin"}


@router.post("/approve")
async def approve_company(
    data: ApproveRejectRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Approve a company (admin only)."""
    email = current_user.email or ""
    if not is_platform_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    require_local_mode()

    result = await db.execute(
        select(Companies).where(Companies.id == data.company_id)
    )
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    await db.execute(
        update(Companies)
        .where(Companies.id == data.company_id)
        .values(approval_status="approved")
    )
    await db.commit()

    logger.info(f"Company {company.company_name} (ID: {data.company_id}) approved by {email}")
    return {"success": True, "message": f"Company '{company.company_name}' approved"}


@router.post("/reject")
async def reject_company(
    data: ApproveRejectRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Reject a company (admin only)."""
    email = current_user.email or ""
    if not is_platform_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    require_local_mode()

    result = await db.execute(
        select(Companies).where(Companies.id == data.company_id)
    )
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    await db.execute(
        update(Companies)
        .where(Companies.id == data.company_id)
        .values(approval_status="rejected")
    )
    await db.commit()

    logger.info(f"Company {company.company_name} (ID: {data.company_id}) rejected by {email}")
    return {"success": True, "message": f"Company '{company.company_name}' rejected"}


# ─── Member Status Management (Admin Only) ───


class MemberStatusRequest(BaseModel):
    member_id: int
    action: str  # approve, reject, deactivate, reactivate


@router.post("/member-status")
async def update_member_status(
    data: MemberStatusRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Admin-only: change a company member's status (approve/reject/deactivate/reactivate)."""
    email = current_user.email or ""
    if not is_platform_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    require_local_mode()

    # Valid transitions
    valid_actions = {
        "approve": {"from": ["pending"], "to": "active"},
        "reject": {"from": ["pending"], "to": "rejected"},
        "deactivate": {"from": ["active"], "to": "inactive"},
        "reactivate": {"from": ["inactive"], "to": "active"},
    }

    if data.action not in valid_actions:
        raise HTTPException(status_code=400, detail=f"Invalid action: {data.action}. Valid: {list(valid_actions.keys())}")

    result = await db.execute(
        select(User_profiles).where(User_profiles.id == data.member_id)
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    current_status = member.member_status or "active"
    transition = valid_actions[data.action]

    if current_status not in transition["from"]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot {data.action} member with status '{current_status}'. Required status: {transition['from']}"
        )

    member.member_status = transition["to"]
    await db.commit()

    # Update active_user_count on the company if transitioning to/from active
    if member.company_id:
        if transition["to"] == "active":
            await db.execute(
                update(Companies)
                .where(Companies.id == member.company_id)
                .values(active_user_count=Companies.active_user_count + 1)
            )
            await db.commit()
        elif current_status == "active" and transition["to"] in ("inactive", "rejected"):
            await db.execute(
                update(Companies)
                .where(Companies.id == member.company_id)
                .values(active_user_count=func.greatest(0, Companies.active_user_count - 1))
            )
            await db.commit()

    logger.info(f"Admin {email} changed member {member.display_name} (ID: {data.member_id}) status: {current_status} -> {transition['to']}")
    return {
        "success": True,
        "member_id": data.member_id,
        "old_status": current_status,
        "new_status": transition["to"],
        "message": f"Member '{member.display_name}' status changed to {transition['to']}",
    }


@router.get("/company-members/{company_id}")
async def get_company_members(
    company_id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Admin-only: get all members of a specific company with their statuses."""
    email = current_user.email or ""
    if not is_platform_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")

    result = await db.execute(
        select(User_profiles).where(User_profiles.company_id == company_id).order_by(User_profiles.id)
    )
    members = result.scalars().all()

    items = []
    for m in members:
        # Extract email from placeholder user_id
        member_email = ""
        if m.user_id and m.user_id.startswith("member_"):
            parts = m.user_id[7:]
            member_email = parts.replace("_at_", "@").replace("_", ".")
        items.append({
            "id": m.id,
            "user_id": m.user_id,
            "display_name": m.display_name or "—",
            "email": member_email or m.user_id,
            "member_role": m.member_role or "member",
            "member_status": m.member_status or "active",
            "created_at": str(m.created_at) if m.created_at else None,
        })

    # Counts by status
    counts = {"active": 0, "pending": 0, "rejected": 0, "inactive": 0}
    for item in items:
        status = item["member_status"]
        if status in counts:
            counts[status] += 1

    return {"items": items, "counts": counts, "total": len(items)}