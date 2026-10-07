from core.database import Base
from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Integer, String


class Companies(Base):
    __tablename__ = "companies"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    company_name = Column(String, nullable=False)
    company_type = Column(String, nullable=True)
    company_roles = Column(String, nullable=True)
    country = Column(String, nullable=True)
    city = Column(String, nullable=True)
    vat_number = Column(String, nullable=True)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    website = Column(String, nullable=True)
    address = Column(String, nullable=True)
    description = Column(String, nullable=True)
    logo_url = Column(String, nullable=True)
    is_public = Column(Boolean, nullable=True)
    subscription_plan = Column(String, nullable=True)
    active_user_count = Column(Integer, nullable=True)
    approval_status = Column(String, nullable=True)
    # Supabase mode: id (uuid) of the shared public.companies row this marketplace company
    # mirrors. Legal/contact fields and approval are synced from there on login.
    shared_company_id = Column(String, nullable=True, unique=True, index=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)