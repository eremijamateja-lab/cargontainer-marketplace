from core.database import Base
from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Integer, String


class Company_capabilities(Base):
    __tablename__ = "company_capabilities"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    company_id = Column(Integer, nullable=False)
    vehicle_count = Column(Integer, nullable=True)
    vehicle_types = Column(String, nullable=True)
    main_routes = Column(String, nullable=True)
    transport_categories = Column(String, nullable=True)
    customs_services = Column(Boolean, nullable=True)
    countries_covered = Column(String, nullable=True)
    customs_offices = Column(String, nullable=True)
    service_regions = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)