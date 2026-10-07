import logging
from datetime import datetime, timezone
from typing import Optional, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.companies import Companies
from models.user_profiles import User_profiles

logger = logging.getLogger(__name__)

# Platform admin email
ADMIN_EMAIL = "eremija.mateja@gmail.com"


class AdminService:
    """Service for platform admin operations (approval, rejection)."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_pending_companies(self) -> List[dict]:
        """Get all companies with pending approval status."""
        try:
            result = await self.db.execute(
                select(Companies).where(
                    Companies.approval_status == "pending"
                ).order_by(Companies.created_at.desc())
            )
            companies = list(result.scalars().all())

            items = []
            for company in companies:
                # Get the admin user of this company
                admin_result = await self.db.execute(
                    select(User_profiles).where(
                        User_profiles.company_id == company.id,
                        User_profiles.member_role == "admin",
                    )
                )
                admin_profile = admin_result.scalar_one_or_none()

                # Get the user email from the auth users table
                user_email = ""
                user_name = ""
                if admin_profile:
                    from models.auth import User as AuthUser
                    auth_result = await self.db.execute(
                        select(AuthUser).where(AuthUser.id == admin_profile.user_id)
                    )
                    auth_user = auth_result.scalar_one_or_none()
                    if auth_user:
                        user_email = auth_user.email or ""
                        user_name = auth_user.name or admin_profile.display_name or ""
                    else:
                        user_name = admin_profile.display_name or ""

                items.append({
                    "id": company.id,
                    "company_name": company.company_name,
                    "company_roles": company.company_roles,
                    "country": company.country,
                    "city": company.city,
                    "user_name": user_name,
                    "user_email": user_email,
                    "approval_status": company.approval_status or "pending",
                    "created_at": str(company.created_at) if company.created_at else None,
                })

            return items

        except Exception as e:
            logger.error(f"Error getting pending companies: {str(e)}")
            raise

    async def get_all_companies_for_admin(self) -> List[dict]:
        """Get all companies for admin review (pending, approved, rejected)."""
        try:
            result = await self.db.execute(
                select(Companies).order_by(Companies.created_at.desc())
            )
            companies = list(result.scalars().all())

            items = []
            for company in companies:
                # Get the admin user of this company
                admin_result = await self.db.execute(
                    select(User_profiles).where(
                        User_profiles.company_id == company.id,
                        User_profiles.member_role == "admin",
                    )
                )
                admin_profile = admin_result.scalar_one_or_none()

                user_email = ""
                user_name = ""
                if admin_profile:
                    from models.auth import User as AuthUser
                    auth_result = await self.db.execute(
                        select(AuthUser).where(AuthUser.id == admin_profile.user_id)
                    )
                    auth_user = auth_result.scalar_one_or_none()
                    if auth_user:
                        user_email = auth_user.email or ""
                        user_name = auth_user.name or admin_profile.display_name or ""
                    else:
                        user_name = admin_profile.display_name or ""

                items.append({
                    "id": company.id,
                    "company_name": company.company_name,
                    "company_roles": company.company_roles,
                    "country": company.country,
                    "city": company.city,
                    "user_name": user_name,
                    "user_email": user_email,
                    "approval_status": company.approval_status or "approved",
                    "created_at": str(company.created_at) if company.created_at else None,
                })

            return items

        except Exception as e:
            logger.error(f"Error getting all companies: {str(e)}")
            raise

    async def approve_company(self, company_id: int) -> dict:
        """Approve a company, granting full platform access."""
        try:
            result = await self.db.execute(
                select(Companies).where(Companies.id == company_id)
            )
            company = result.scalar_one_or_none()
            if not company:
                raise ValueError("Company not found")

            company.approval_status = "approved"
            company.updated_at = datetime.now(timezone.utc)
            await self.db.commit()
            await self.db.refresh(company)

            return {
                "id": company.id,
                "company_name": company.company_name,
                "approval_status": "approved",
            }

        except ValueError:
            await self.db.rollback()
            raise
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error approving company {company_id}: {str(e)}")
            raise

    async def reject_company(self, company_id: int) -> dict:
        """Reject a company, denying platform access."""
        try:
            result = await self.db.execute(
                select(Companies).where(Companies.id == company_id)
            )
            company = result.scalar_one_or_none()
            if not company:
                raise ValueError("Company not found")

            company.approval_status = "rejected"
            company.updated_at = datetime.now(timezone.utc)
            await self.db.commit()
            await self.db.refresh(company)

            return {
                "id": company.id,
                "company_name": company.company_name,
                "approval_status": "rejected",
            }

        except ValueError:
            await self.db.rollback()
            raise
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error rejecting company {company_id}: {str(e)}")
            raise

    async def get_approval_status_for_user(self, user_id: str) -> dict:
        """Get the approval status for a user based on their company."""
        try:
            profile_result = await self.db.execute(
                select(User_profiles).where(User_profiles.user_id == user_id)
            )
            profile = profile_result.scalar_one_or_none()

            if not profile:
                return {"status": "no_profile", "company_name": None}

            if not profile.company_id:
                return {"status": "no_company", "company_name": profile.company_name}

            company_result = await self.db.execute(
                select(Companies).where(Companies.id == profile.company_id)
            )
            company = company_result.scalar_one_or_none()

            if not company:
                return {"status": "no_company", "company_name": profile.company_name}

            approval_status = company.approval_status or "approved"
            return {
                "status": approval_status,
                "company_name": company.company_name,
                "company_id": company.id,
            }

        except Exception as e:
            logger.error(f"Error getting approval status for user {user_id}: {str(e)}")
            raise