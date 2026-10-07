import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.database import get_db
from services.supabase_bridge import MEMBER_ROLE_MAP, invalidate_user, load_memberships
from services.user_profiles import User_profilesService
from dependencies.auth import get_current_user
from schemas.auth import UserResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/profile", tags=["profile"])


class ProfileData(BaseModel):
    role: str
    company_name: str
    display_name: Optional[str] = None


class ProfileResponse(BaseModel):
    id: int
    user_id: str
    role: str
    company_name: str
    display_name: Optional[str] = None
    company_id: Optional[int] = None
    member_role: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


@router.get("/me", response_model=Optional[ProfileResponse])
async def get_my_profile(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the current user's profile. Auto-migrates existing company creators to admin role."""
    service = User_profilesService(db)
    try:
        profile = await service.get_by_field("user_id", str(current_user.id))
        if not profile:
            return None

        from sqlalchemy import select
        from models.companies import Companies

        needs_commit = False

        # Auto-migration A: if user has company_name but no company_id, find and link their company
        # (local mode only — in Supabase mode membership comes from the shared register)
        if not settings.is_supabase and not profile.company_id and profile.company_name:
            company_result = await db.execute(
                select(Companies).where(Companies.company_name == profile.company_name)
            )
            company = company_result.scalar_one_or_none()
            if company:
                profile.company_id = company.id
                profile.member_role = "admin"
                needs_commit = True

        # Auto-migration B: if user has a company_id but no member_role, set them as admin
        if profile.company_id and not profile.member_role:
            company_result = await db.execute(
                select(Companies).where(Companies.id == profile.company_id)
            )
            company = company_result.scalar_one_or_none()
            if company:
                profile.member_role = "admin"
                needs_commit = True

        if needs_commit:
            await db.commit()
            await db.refresh(profile)

        return profile
    except Exception as e:
        logger.error(f"Error fetching profile: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/me", response_model=ProfileResponse)
async def create_or_update_profile(
    data: ProfileData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create or update the current user's profile.
    
    On first creation, also creates a Companies record with approval_status='pending'
    and links it to the profile.
    """
    from sqlalchemy import select
    from models.companies import Companies
    from models.user_profiles import User_profiles

    service = User_profilesService(db)
    try:
        existing = await service.get_by_field("user_id", str(current_user.id))
        if existing:
            result = await service.update(
                existing.id,
                {
                    "role": data.role,
                    "company_name": data.company_name,
                    "display_name": data.display_name,
                },
                user_id=str(current_user.id),
            )
            return result
        elif settings.is_supabase:
            # The company already exists in the shared register (created via TMS Agency
            # self-signup / Platform admin) and was mirrored by get_current_user's sync.
            # Onboarding here only picks the marketplace role.
            memberships = await load_memberships(db, str(current_user.id))
            company = None
            if memberships:
                company = (
                    await db.execute(
                        select(Companies).where(Companies.shared_company_id == memberships[0]["company_id"])
                    )
                ).scalar_one_or_none()
            if not company:
                raise HTTPException(
                    status_code=409,
                    detail="No company registered for this account — register it in Cargontainer TMS Agency first.",
                )
            if not company.company_type:
                company.company_type = data.role
            if not company.company_roles:
                company.company_roles = data.role
            new_profile = User_profiles(
                user_id=str(current_user.id),
                role=data.role,
                company_name=company.company_name,
                display_name=data.display_name or current_user.name or company.company_name,
                created_at=datetime.now(),
                company_id=company.id,
                member_role=MEMBER_ROLE_MAP.get(memberships[0]["member_role"], "operations"),
                member_status="active",
            )
            db.add(new_profile)
            await db.commit()
            await db.refresh(new_profile)
            invalidate_user(str(current_user.id))
            return new_profile
        else:
            # Create a new Companies record with pending approval
            new_company = Companies(
                company_name=data.company_name,
                company_type=data.role,
                company_roles=data.role,
                email=current_user.email or "",
                approval_status="pending",
            )
            db.add(new_company)
            await db.flush()  # Get the company ID without committing

            # Create the user profile linked to the new company
            new_profile = User_profiles(
                user_id=str(current_user.id),
                role=data.role,
                company_name=data.company_name,
                display_name=data.display_name or current_user.name or data.company_name,
                created_at=datetime.now(),
                company_id=new_company.id,
                member_role="admin",
            )
            db.add(new_profile)
            await db.commit()
            await db.refresh(new_profile)
            logger.info(f"Created profile for user {current_user.id} with company {new_company.id} (pending approval)")
            return new_profile
    except Exception as e:
        await db.rollback()
        logger.error(f"Error creating/updating profile: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))