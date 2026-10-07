import logging
from datetime import datetime, timezone
from typing import Optional, List

from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from models.companies import Companies
from models.company_capabilities import Company_capabilities
from models.user_profiles import User_profiles

logger = logging.getLogger(__name__)


class CompanyService:
    """Service for company management operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_company(
        self,
        user_id: str,
        company_name: str,
        company_type: str,
        country: str,
        city: str,
        vat_number: str,
        email: str,
        phone: str,
        website: Optional[str] = None,
        address: Optional[str] = None,
        description: Optional[str] = None,
        logo_url: Optional[str] = None,
        capabilities: Optional[dict] = None,
        company_roles: Optional[str] = None,
    ) -> dict:
        """Create a new company and link the user as admin."""
        try:
            # Check if user already has a company
            profile_result = await self.db.execute(
                select(User_profiles).where(User_profiles.user_id == user_id)
            )
            profile = profile_result.scalar_one_or_none()
            if not profile:
                raise ValueError("User profile not found. Complete onboarding first.")
            if profile.company_id:
                raise ValueError("User already belongs to a company.")

            # Create company — new companies start as "pending" until admin approves
            now = datetime.now(timezone.utc)
            company = Companies(
                company_name=company_name,
                company_type=company_type,
                company_roles=company_roles,
                country=country,
                city=city,
                vat_number=vat_number,
                email=email,
                phone=phone,
                website=website or None,
                address=address or None,
                description=description or None,
                logo_url=logo_url or None,
                is_public=True,
                subscription_plan="free",
                active_user_count=1,
                approval_status="pending",
                created_at=now,
                updated_at=now,
            )
            self.db.add(company)
            await self.db.flush()

            # Create capabilities — normalize arrays to comma-separated strings for DB storage
            caps = capabilities or {}
            def _to_str(val):
                if isinstance(val, list):
                    return ",".join(val)
                return val or ""

            company_caps = Company_capabilities(
                company_id=company.id,
                vehicle_count=caps.get("vehicle_count", 0),
                vehicle_types=_to_str(caps.get("vehicle_types", "")),
                main_routes=caps.get("main_routes", ""),
                transport_categories=_to_str(caps.get("transport_categories", "")),
                customs_services=caps.get("customs_services", False) or caps.get("customs_capability", False),
                countries_covered=_to_str(caps.get("countries_covered", "")),
                customs_offices=caps.get("customs_offices", ""),
                service_regions=caps.get("service_regions", ""),
                created_at=now,
                updated_at=now,
            )
            self.db.add(company_caps)

            # Link user to company as admin
            profile.company_id = company.id
            profile.member_role = "admin"
            profile.company_name = company_name

            await self.db.commit()
            await self.db.refresh(company)
            await self.db.refresh(company_caps)
            await self.db.refresh(profile)

            return self._company_to_dict(company, company_caps, [profile])

        except ValueError:
            await self.db.rollback()
            raise
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating company: {str(e)}")
            raise

    async def get_my_company(self, user_id: str) -> Optional[dict]:
        """Get the current user's company with capabilities and members."""
        try:
            profile_result = await self.db.execute(
                select(User_profiles).where(User_profiles.user_id == user_id)
            )
            profile = profile_result.scalar_one_or_none()
            if not profile or not profile.company_id:
                return None

            company_result = await self.db.execute(
                select(Companies).where(Companies.id == profile.company_id)
            )
            company = company_result.scalar_one_or_none()
            if not company:
                return None

            caps_result = await self.db.execute(
                select(Company_capabilities).where(
                    Company_capabilities.company_id == company.id
                )
            )
            caps = caps_result.scalar_one_or_none()

            members_result = await self.db.execute(
                select(User_profiles).where(
                    User_profiles.company_id == company.id
                )
            )
            members = list(members_result.scalars().all())

            return self._company_to_dict(company, caps, members)

        except Exception as e:
            logger.error(f"Error getting company for user {user_id}: {str(e)}")
            raise

    async def update_company(
        self, user_id: str, company_data: dict, capabilities_data: Optional[dict] = None,
        is_platform_admin: bool = False,
    ) -> Optional[dict]:
        """Update company profile (company admin only). Locked fields require platform admin."""
        try:
            profile_result = await self.db.execute(
                select(User_profiles).where(User_profiles.user_id == user_id)
            )
            profile = profile_result.scalar_one_or_none()
            if not profile or not profile.company_id:
                raise ValueError("User does not belong to a company")
            if profile.member_role != "admin":
                raise ValueError("Only company admins can update the company profile")

            company_result = await self.db.execute(
                select(Companies).where(Companies.id == profile.company_id)
            )
            company = company_result.scalar_one_or_none()
            if not company:
                raise ValueError("Company not found")

            # Locked fields — only platform admin can update these on approved companies
            LOCKED_FIELDS = {"company_name", "company_type", "company_roles", "country", "city", "vat_number", "approval_status"}
            is_approved = (company.approval_status or "approved") == "approved"

            # Update company fields
            updatable_fields = [
                "company_name", "company_type", "company_roles", "country", "city", "vat_number",
                "email", "phone", "website", "address", "description",
                "logo_url", "is_public",
            ]
            for field in updatable_fields:
                if field in company_data and company_data[field] is not None:
                    # Block normal users from CHANGING an already-verified locked field on an
                    # approved company. A field that was never filled in (e.g. country/city/
                    # vat_number, which onboarding never collects) has nothing to protect —
                    # only block once it already holds a real value.
                    current_value = getattr(company, field, None)
                    if is_approved and field in LOCKED_FIELDS and not is_platform_admin and current_value:
                        logger.warning(
                            f"User {user_id} attempted to update locked field '{field}' on approved company {company.id}"
                        )
                        continue  # Skip locked field silently
                    setattr(company, field, company_data[field])
            company.updated_at = datetime.now(timezone.utc)

            # If company_name changed, update all members' company_name
            if "company_name" in company_data and company_data["company_name"]:
                members_result = await self.db.execute(
                    select(User_profiles).where(
                        User_profiles.company_id == company.id
                    )
                )
                for member in members_result.scalars().all():
                    member.company_name = company_data["company_name"]

            # Update capabilities if provided
            caps = None
            if capabilities_data:
                caps_result = await self.db.execute(
                    select(Company_capabilities).where(
                        Company_capabilities.company_id == company.id
                    )
                )
                caps = caps_result.scalar_one_or_none()
                if caps:
                    def _to_str(val):
                        if isinstance(val, list):
                            return ",".join(val)
                        return val or ""

                    # Map frontend JSON keys to DB column names
                    field_mapping = {
                        "vehicle_count": "vehicle_count",
                        "vehicle_types": "vehicle_types",
                        "main_routes": "main_routes",
                        "transport_categories": "transport_categories",
                        "customs_services": "customs_services",
                        "customs_capability": "customs_services",  # frontend sends customs_capability
                        "countries_covered": "countries_covered",
                        "customs_offices": "customs_offices",
                        "service_regions": "service_regions",
                        "transport_modes": "vehicle_types",  # transport_modes maps to vehicle_types for now
                    }
                    str_fields = {"vehicle_types", "transport_categories", "countries_covered"}

                    for src_field, db_field in field_mapping.items():
                        if src_field in capabilities_data and capabilities_data[src_field] is not None:
                            val = capabilities_data[src_field]
                            if db_field in str_fields:
                                val = _to_str(val)
                            setattr(caps, db_field, val)
                    caps.updated_at = datetime.now(timezone.utc)

            await self.db.commit()
            await self.db.refresh(company)

            if not caps:
                caps_result = await self.db.execute(
                    select(Company_capabilities).where(
                        Company_capabilities.company_id == company.id
                    )
                )
                caps = caps_result.scalar_one_or_none()

            members_result = await self.db.execute(
                select(User_profiles).where(User_profiles.company_id == company.id)
            )
            members = list(members_result.scalars().all())

            return self._company_to_dict(company, caps, members)

        except ValueError:
            await self.db.rollback()
            raise
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating company: {str(e)}")
            raise

    async def get_members(self, user_id: str) -> List[dict]:
        """Get all members of the current user's company."""
        try:
            profile_result = await self.db.execute(
                select(User_profiles).where(User_profiles.user_id == user_id)
            )
            profile = profile_result.scalar_one_or_none()
            if not profile or not profile.company_id:
                return []

            members_result = await self.db.execute(
                select(User_profiles).where(
                    User_profiles.company_id == profile.company_id
                ).order_by(User_profiles.id)
            )
            members = members_result.scalars().all()
            return [self._member_to_dict(m) for m in members]

        except Exception as e:
            logger.error(f"Error getting members: {str(e)}")
            raise

    async def invite_member(self, user_id: str, invite_email: str, member_role: str = "operations") -> dict:
        """Add a member to the company directly. Creates a placeholder profile linked to the company."""
        try:
            # Verify inviter is admin
            inviter_result = await self.db.execute(
                select(User_profiles).where(User_profiles.user_id == user_id)
            )
            inviter = inviter_result.scalar_one_or_none()
            if not inviter or not inviter.company_id:
                raise ValueError("You must belong to a company to add members")
            if inviter.member_role != "admin":
                raise ValueError("Only company admins can add members")

            # Get company info
            company_result = await self.db.execute(
                select(Companies).where(Companies.id == inviter.company_id)
            )
            company = company_result.scalar_one_or_none()
            if not company:
                raise ValueError("Company not found")

            # Synthetic user_id for placeholder members, scoped to this company (not just
            # the email) — otherwise two different companies inviting the same email would
            # collide on the same placeholder row and one invite could silently re-link an
            # existing member into the wrong company.
            normalized_email = invite_email.lower().replace('@', '_at_').replace('.', '_')
            placeholder_user_id = f"member_{company.id}_{normalized_email}"

            existing_result = await self.db.execute(
                select(User_profiles).where(
                    User_profiles.user_id == placeholder_user_id
                )
            )
            existing = existing_result.scalar_one_or_none()

            if existing:
                raise ValueError("This member is already in your company")

            # Create a new placeholder profile for this member
            now = datetime.now(timezone.utc)
            # Use email prefix as display name
            display_name = invite_email.split("@")[0].replace(".", " ").replace("_", " ").title()

            new_member = User_profiles(
                user_id=placeholder_user_id,
                role="member",
                company_name=company.company_name,
                display_name=display_name,
                company_id=company.id,
                member_role=member_role,
                member_status="pending",
                created_at=now,
            )
            self.db.add(new_member)

            # active_user_count is incremented on admin approval (routers/admin.py
            # update_member_status "approve" transition), not here — this member
            # isn't active yet.
            company.updated_at = now

            await self.db.commit()

            return {
                "status": "pending_approval",
                "company_id": company.id,
                "company_name": company.company_name,
                "member_role": member_role,
            }

        except ValueError:
            await self.db.rollback()
            raise
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error adding member: {str(e)}")
            raise

    async def join_company(self, user_id: str, company_id: int, member_role: str = "operations") -> dict:
        """Join a company (used when accepting an invite)."""
        try:
            profile_result = await self.db.execute(
                select(User_profiles).where(User_profiles.user_id == user_id)
            )
            profile = profile_result.scalar_one_or_none()
            if not profile:
                raise ValueError("User profile not found")
            if profile.company_id:
                raise ValueError("User already belongs to a company")

            # Verify company exists
            company_result = await self.db.execute(
                select(Companies).where(Companies.id == company_id)
            )
            company = company_result.scalar_one_or_none()
            if not company:
                raise ValueError("Company not found")

            # Link user to company
            profile.company_id = company.id
            profile.member_role = member_role
            profile.company_name = company.company_name

            # Update active user count
            company.active_user_count = (company.active_user_count or 0) + 1
            company.updated_at = datetime.now(timezone.utc)

            await self.db.commit()
            await self.db.refresh(profile)

            return {
                "status": "joined",
                "company_id": company.id,
                "company_name": company.company_name,
                "member_role": member_role,
            }

        except ValueError:
            await self.db.rollback()
            raise
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error joining company: {str(e)}")
            raise

    async def remove_member(self, user_id: str, member_user_id: str) -> dict:
        """Remove a member from the company (admin only). Cannot remove self."""
        try:
            # Verify requester is admin
            admin_result = await self.db.execute(
                select(User_profiles).where(User_profiles.user_id == user_id)
            )
            admin_profile = admin_result.scalar_one_or_none()
            if not admin_profile or not admin_profile.company_id:
                raise ValueError("You must belong to a company")
            if admin_profile.member_role != "admin":
                raise ValueError("Only admins can remove members")
            if user_id == member_user_id:
                raise ValueError("Cannot remove yourself from the company")

            # Find the member
            member_result = await self.db.execute(
                select(User_profiles).where(
                    User_profiles.user_id == member_user_id,
                    User_profiles.company_id == admin_profile.company_id,
                )
            )
            member = member_result.scalar_one_or_none()
            if not member:
                raise ValueError("Member not found in your company")

            # Unlink member
            member.company_id = None
            member.member_role = None

            # Update active user count
            company_result = await self.db.execute(
                select(Companies).where(Companies.id == admin_profile.company_id)
            )
            company = company_result.scalar_one_or_none()
            if company:
                company.active_user_count = max(0, (company.active_user_count or 1) - 1)
                company.updated_at = datetime.now(timezone.utc)

            await self.db.commit()
            return {"status": "removed", "member_user_id": member_user_id}

        except ValueError:
            await self.db.rollback()
            raise
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error removing member: {str(e)}")
            raise

    async def get_directory(
        self,
        search: Optional[str] = None,
        company_type: Optional[str] = None,
        country: Optional[str] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> dict:
        """Get public company directory with filtering.
        
        Shows companies where:
        - approval_status = 'approved' OR approval_status IS NULL (legacy companies)
        - Does NOT show pending or rejected companies
        - Does NOT require is_public=True (treats NULL as public)
        """
        try:
            # First, log total companies in DB for debugging
            total_all_result = await self.db.execute(select(func.count(Companies.id)))
            total_all = total_all_result.scalar()
            logger.info(f"[Directory] Total companies in DB: {total_all}")

            # Visibility rule: approved OR legacy (NULL status treated as approved)
            # Exclude only explicitly pending/rejected companies
            visibility_filter = or_(
                Companies.approval_status == "approved",
                Companies.approval_status.is_(None),
            )
            # Also exclude companies explicitly marked as not public (is_public=False)
            # But treat is_public=NULL as public (default visible)
            public_filter = or_(
                Companies.is_public == True,
                Companies.is_public.is_(None),
            )

            base_query = select(Companies).where(visibility_filter).where(public_filter)
            count_query = select(func.count(Companies.id)).where(visibility_filter).where(public_filter)

            if search:
                search_filter = Companies.company_name.ilike(f"%{search}%")
                base_query = base_query.where(search_filter)
                count_query = count_query.where(search_filter)

            if company_type:
                # Search in both company_type and company_roles fields
                type_lower = company_type.lower()
                type_filter = or_(
                    func.lower(Companies.company_type) == type_lower,
                    func.lower(Companies.company_roles).contains(type_lower),
                )
                base_query = base_query.where(type_filter)
                count_query = count_query.where(type_filter)

            if country:
                country_filter = func.lower(Companies.country) == country.lower()
                base_query = base_query.where(country_filter)
                count_query = count_query.where(country_filter)

            count_result = await self.db.execute(count_query)
            total = count_result.scalar()
            logger.info(f"[Directory] After filters: {total} companies match visibility criteria")

            base_query = base_query.order_by(Companies.company_name)
            result = await self.db.execute(base_query.offset(skip).limit(limit))
            companies = list(result.scalars().all())

            # Log each company for debugging
            for c in companies:
                logger.info(
                    f"[Directory] Company: id={c.id}, name={c.company_name}, "
                    f"approval_status={c.approval_status}, is_public={c.is_public}"
                )

            # Batch fetch capabilities
            company_ids = [c.id for c in companies]
            caps_map: dict = {}
            if company_ids:
                caps_result = await self.db.execute(
                    select(Company_capabilities).where(
                        Company_capabilities.company_id.in_(company_ids)
                    )
                )
                for cap in caps_result.scalars().all():
                    caps_map[cap.company_id] = cap

            # Batch fetch member counts
            member_counts: dict = {}
            if company_ids:
                mc_result = await self.db.execute(
                    select(
                        User_profiles.company_id,
                        func.count(User_profiles.id)
                    ).where(
                        User_profiles.company_id.in_(company_ids)
                    ).group_by(User_profiles.company_id)
                )
                for row in mc_result.fetchall():
                    member_counts[row[0]] = row[1]

            items = []
            for c in companies:
                d = self._company_summary_dict(c, caps_map.get(c.id))
                d["member_count"] = member_counts.get(c.id, 0)
                items.append(d)

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }

        except Exception as e:
            logger.error(f"Error getting directory: {str(e)}")
            raise

    async def get_company_public(self, company_id: int) -> Optional[dict]:
        """Get a public company profile by ID."""
        try:
            result = await self.db.execute(
                select(Companies).where(
                    Companies.id == company_id,
                    or_(Companies.is_public == True, Companies.is_public.is_(None)),
                )
            )
            company = result.scalar_one_or_none()
            if not company:
                return None

            caps_result = await self.db.execute(
                select(Company_capabilities).where(
                    Company_capabilities.company_id == company.id
                )
            )
            caps = caps_result.scalar_one_or_none()

            # Get member count
            mc_result = await self.db.execute(
                select(func.count(User_profiles.id)).where(
                    User_profiles.company_id == company.id
                )
            )
            member_count = mc_result.scalar() or 0

            d = self._company_summary_dict(company, caps)
            d["member_count"] = member_count
            return d

        except Exception as e:
            logger.error(f"Error getting company {company_id}: {str(e)}")
            raise

    # ─── Helpers ───

    def _company_to_dict(self, company, caps, members) -> dict:
        return {
            "id": company.id,
            "company_name": company.company_name,
            "company_type": company.company_type,
            "company_roles": company.company_roles,
            "country": company.country,
            "city": company.city,
            "vat_number": company.vat_number,
            "email": company.email,
            "phone": company.phone,
            "website": company.website,
            "address": company.address,
            "description": company.description,
            "logo_url": company.logo_url,
            "is_public": company.is_public,
            "subscription_plan": company.subscription_plan,
            "active_user_count": company.active_user_count,
            "approval_status": company.approval_status or "approved",
            "created_at": str(company.created_at) if company.created_at else None,
            "updated_at": str(company.updated_at) if company.updated_at else None,
            "capabilities": self._caps_to_dict(caps) if caps else None,
            "members": [self._member_to_dict(m) for m in members] if members else [],
        }

    def _caps_to_dict(self, caps) -> dict:
        def _to_list(val):
            if not val:
                return []
            if isinstance(val, list):
                return val
            return [v.strip() for v in val.split(",") if v.strip()]

        return {
            "id": caps.id,
            "vehicle_count": caps.vehicle_count,
            "transport_modes": _to_list(caps.vehicle_types),  # expose as transport_modes for frontend
            "vehicle_types": _to_list(caps.vehicle_types),
            "main_routes": caps.main_routes or "",
            "transport_categories": _to_list(caps.transport_categories),
            "customs_services": caps.customs_services or False,
            "customs_capability": caps.customs_services or False,  # alias for frontend
            "countries_covered": _to_list(caps.countries_covered),
            "customs_offices": caps.customs_offices or "",
            "service_regions": caps.service_regions or "",
        }

    def _member_to_dict(self, m) -> dict:
        # Extract email from user_id for placeholder members. Current format is
        # member_{company_id}_{encoded email}; older rows (pre company-scoping)
        # are plain member_{encoded email} with no numeric id segment.
        email = ""
        if m.user_id and m.user_id.startswith("member_"):
            rest = m.user_id[7:]  # remove "member_"
            cid_prefix, sep, remainder = rest.partition("_")
            encoded = remainder if (sep and cid_prefix.isdigit()) else rest
            email = encoded.replace("_at_", "@").replace("_", ".")
        return {
            "id": m.id,
            "user_id": m.user_id,
            "display_name": m.display_name,
            "email": email,
            "role": m.role,
            "member_role": m.member_role or "member",
            "member_status": m.member_status or "active",
            "company_name": m.company_name,
        }

    def _company_summary_dict(self, company, caps) -> dict:
        d = {
            "id": company.id,
            "company_name": company.company_name,
            "company_type": company.company_type,
            "company_roles": company.company_roles,
            "country": company.country,
            "city": company.city,
            "email": company.email,
            "phone": company.phone,
            "website": company.website,
            "description": company.description,
            "logo_url": company.logo_url,
            "created_at": str(company.created_at) if company.created_at else None,
        }
        if caps:
            d["capabilities"] = self._caps_to_dict(caps)
        return d