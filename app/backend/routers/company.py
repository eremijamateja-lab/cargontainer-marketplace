import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.company import CompanyService
from core.config import settings
from dependencies.auth import SHARED_COMPANY_FIELDS, get_current_user, is_platform_admin, require_local_mode
from schemas.auth import UserResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/company", tags=["company"])


# ---------- Pydantic Schemas ----------
class CreateCompanyRequest(BaseModel):
    company_name: str
    company_type: str
    company_roles: Optional[str] = None
    country: str
    city: str
    vat_number: str
    email: str
    phone: str
    website: Optional[str] = None
    address: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    capabilities: Optional[Dict[str, Any]] = None


class UpdateCompanyRequest(BaseModel):
    company_name: Optional[str] = None
    company_type: Optional[str] = None
    company_roles: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    vat_number: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    is_public: Optional[bool] = None
    capabilities: Optional[Dict[str, Any]] = None


# ---------- Routes ----------
@router.post("/create")
async def create_company(
    data: CreateCompanyRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new company and link the current user as admin."""
    require_local_mode()
    service = CompanyService(db)
    try:
        result = await service.create_company(
            user_id=str(current_user.id),
            company_name=data.company_name,
            company_type=data.company_type,
            country=data.country,
            city=data.city,
            vat_number=data.vat_number,
            email=data.email,
            phone=data.phone,
            website=data.website,
            address=data.address,
            description=data.description,
            logo_url=data.logo_url,
            capabilities=data.capabilities,
            company_roles=data.company_roles,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating company: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/my-company")
async def get_my_company(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the current user's company profile with capabilities and members."""
    service = CompanyService(db)
    try:
        result = await service.get_my_company(user_id=str(current_user.id))
        if not result:
            return {"company": None}
        return result
    except Exception as e:
        logger.error(f"Error getting company: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


# Platform admin emails — these users can update locked fields
PLATFORM_ADMIN_EMAILS = [
    "office@cargontainer.com",
    "admin@cargontainer.com",
    "eremija.mateja@gmail.com",
]


@router.put("/update")
async def update_company(
    data: UpdateCompanyRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update company profile (admin only). Locked fields require platform admin."""
    service = CompanyService(db)
    # Check if current user is platform admin
    user_email = current_user.email or ""
    platform_admin = is_platform_admin(current_user)

    try:
        company_data = data.model_dump(exclude={"capabilities"}, exclude_none=True)
        if settings.is_supabase:
            # Legal/contact fields live on the shared company and are edited in TMS Agency
            for field in SHARED_COMPANY_FIELDS:
                company_data.pop(field, None)
        result = await service.update_company(
            user_id=str(current_user.id),
            company_data=company_data,
            capabilities_data=data.capabilities,
            is_platform_admin=platform_admin,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating company: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/members")
async def get_company_members(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all members of the current user's company."""
    service = CompanyService(db)
    try:
        members = await service.get_members(user_id=str(current_user.id))
        return {"members": members}
    except Exception as e:
        logger.error(f"Error getting members: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


class InviteMemberRequest(BaseModel):
    email: str
    member_role: str = "operations"


class JoinCompanyRequest(BaseModel):
    company_id: int
    member_role: str = "operations"


class RemoveMemberRequest(BaseModel):
    member_user_id: str


@router.post("/invite")
async def invite_member(
    data: InviteMemberRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Invite a user to the company (admin only)."""
    require_local_mode()
    service = CompanyService(db)
    try:
        result = await service.invite_member(
            user_id=str(current_user.id),
            invite_email=data.email,
            member_role=data.member_role,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error inviting member: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/join")
async def join_company(
    data: JoinCompanyRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Join a company (accept invite)."""
    require_local_mode()
    service = CompanyService(db)
    try:
        result = await service.join_company(
            user_id=str(current_user.id),
            company_id=data.company_id,
            member_role=data.member_role,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error joining company: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/remove-member")
async def remove_member(
    data: RemoveMemberRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove a member from the company (admin only)."""
    require_local_mode()
    service = CompanyService(db)
    try:
        result = await service.remove_member(
            user_id=str(current_user.id),
            member_user_id=data.member_user_id,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error removing member: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/directory")
async def get_company_directory(
    search: Optional[str] = Query(None, description="Search by company name"),
    company_type: Optional[str] = Query(None, description="Filter by company type"),
    country: Optional[str] = Query(None, description="Filter by country"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Public company directory with search and filters."""
    service = CompanyService(db)
    try:
        result = await service.get_directory(
            search=search,
            company_type=company_type,
            country=country,
            skip=skip,
            limit=limit,
        )
        logger.info(
            f"Directory query: search={search}, type={company_type}, country={country}, "
            f"skip={skip}, limit={limit} → returned {result.get('total', 0)} companies"
        )
        return result
    except Exception as e:
        logger.error(f"Error getting directory: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{company_id}")
async def get_company_public(
    company_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get a public company profile by ID."""
    service = CompanyService(db)
    try:
        result = await service.get_company_public(company_id=company_id)
        if not result:
            raise HTTPException(status_code=404, detail="Company not found")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting company {company_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")