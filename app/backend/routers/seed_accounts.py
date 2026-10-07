"""Seed/reset test accounts endpoint for MVP development.

This endpoint creates or resets admin and test accounts with known passwords.
It should only be used in development/preview environments.
"""

import json
import logging
import uuid
from datetime import datetime, timezone

import bcrypt
from core.database import get_db
from fastapi import APIRouter, Depends, HTTPException
from models.auth import User
from models.companies import Companies
from models.user_profiles import User_profiles
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api/v1/seed", tags=["seed"])
logger = logging.getLogger(__name__)

TEMP_PASSWORD = "Cargontainer2026!"


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


# Account definitions
ACCOUNTS = [
    {
        "email": "eremija.mateja@gmail.com",
        "name": "Mateja Eremija",
        "role": "admin",
        "company_name": "Ecosped doo",
        "company_roles": ["carrier", "forwarder", "warehouse_operator"],
        "country": "RS",
        "city": "Belgrade",
        "approval_status": "approved",
        "profile_role": "forwarder",
    },
    {
        "email": "forwarder.test@cargontainer.com",
        "name": "Test Forwarder",
        "role": "user",
        "company_name": "Test Forwarder doo",
        "company_roles": ["forwarder"],
        "country": "RS",
        "city": "Belgrade",
        "approval_status": "approved",
        "profile_role": "forwarder",
    },
    {
        "email": "carrier.test@cargontainer.com",
        "name": "Test Carrier",
        "role": "user",
        "company_name": "Test Carrier doo",
        "company_roles": ["carrier"],
        "country": "RS",
        "city": "Novi Sad",
        "approval_status": "approved",
        "profile_role": "carrier",
    },
    {
        "email": "customs.test@cargontainer.com",
        "name": "Test Customs",
        "role": "user",
        "company_name": "Test Customs doo",
        "company_roles": ["customs_agent", "forwarder"],
        "country": "RS",
        "city": "Belgrade",
        "approval_status": "approved",
        "profile_role": "customs_agent",
    },
    {
        "email": "pending.test@cargontainer.com",
        "name": "Test Pending",
        "role": "user",
        "company_name": "Test Pending doo",
        "company_roles": ["forwarder"],
        "country": "RS",
        "city": "Subotica",
        "approval_status": "pending",
        "profile_role": "forwarder",
    },
    {
        "email": "rejected.test@cargontainer.com",
        "name": "Test Rejected",
        "role": "user",
        "company_name": "Test Rejected doo",
        "company_roles": ["forwarder"],
        "country": "RS",
        "city": "Niš",
        "approval_status": "rejected",
        "profile_role": "forwarder",
    },
]


@router.post("/reset-accounts")
async def reset_accounts(db: AsyncSession = Depends(get_db)):
    """Create or reset all test/admin accounts with known passwords.
    
    This endpoint:
    - Creates users if they don't exist
    - Resets passwords if they do exist
    - Creates/links companies with proper approval status
    - Creates/links user profiles
    
    Does NOT delete any existing data (RFQs, offers, shipments, etc.)
    """
    results = []
    hashed = hash_password(TEMP_PASSWORD)

    for account in ACCOUNTS:
        account_result = {
            "email": account["email"],
            "user_existed": False,
            "user_created": False,
            "password_reset": False,
            "company_existed": False,
            "company_created": False,
            "company_approval": account["approval_status"],
            "profile_existed": False,
            "profile_created": False,
        }

        # Step 1: Find or create user
        result = await db.execute(select(User).where(User.email == account["email"]))
        user = result.scalar_one_or_none()

        if user:
            account_result["user_existed"] = True
            # Reset password
            user.password_hash = hashed
            user.role = account["role"]
            user.name = account["name"]
            user.last_login = datetime.now(timezone.utc)
            account_result["password_reset"] = True
            logger.info(f"[seed] Reset password for existing user: {account['email']}")
        else:
            # Create new user
            user_id = f"local_{uuid.uuid4().hex[:16]}"
            user = User(
                id=user_id,
                email=account["email"],
                name=account["name"],
                password_hash=hashed,
                role=account["role"],
                last_login=datetime.now(timezone.utc),
            )
            db.add(user)
            await db.flush()  # Get the user ID
            account_result["user_created"] = True
            logger.info(f"[seed] Created new user: {account['email']} with id: {user_id}")

        # Step 2: Find or create company
        result = await db.execute(
            select(Companies).where(Companies.company_name == account["company_name"])
        )
        company = result.scalar_one_or_none()

        if company:
            account_result["company_existed"] = True
            # Update approval status and roles
            company.approval_status = account["approval_status"]
            company.company_roles = json.dumps(account["company_roles"])
            company.country = account["country"]
            company.city = account["city"]
            company.is_public = True if account["approval_status"] == "approved" else None
            logger.info(f"[seed] Updated company: {account['company_name']} -> {account['approval_status']}")
        else:
            # Create company
            company = Companies(
                company_name=account["company_name"],
                company_roles=json.dumps(account["company_roles"]),
                country=account["country"],
                city=account["city"],
                approval_status=account["approval_status"],
                is_public=True if account["approval_status"] == "approved" else None,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
            )
            db.add(company)
            await db.flush()  # Get the company ID
            account_result["company_created"] = True
            logger.info(f"[seed] Created company: {account['company_name']} (id: {company.id})")

        # Step 3: Find or create user profile linked to company
        result = await db.execute(
            select(User_profiles).where(User_profiles.user_id == str(user.id))
        )
        profile = result.scalar_one_or_none()

        if profile:
            account_result["profile_existed"] = True
            # Update profile to link to correct company
            profile.company_id = company.id
            profile.company_name = account["company_name"]
            profile.role = account["profile_role"]
            profile.display_name = account["name"]
            profile.member_role = "owner"
            logger.info(f"[seed] Updated profile for: {account['email']} -> company_id: {company.id}")
        else:
            # Create profile
            profile = User_profiles(
                user_id=str(user.id),
                role=account["profile_role"],
                company_name=account["company_name"],
                display_name=account["name"],
                company_id=company.id,
                member_role="owner",
            )
            db.add(profile)
            account_result["profile_created"] = True
            logger.info(f"[seed] Created profile for: {account['email']} -> company_id: {company.id}")

        results.append(account_result)

    await db.commit()

    return {
        "success": True,
        "message": "All accounts created/reset successfully",
        "password": TEMP_PASSWORD,
        "accounts": results,
    }