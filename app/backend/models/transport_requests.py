from core.database import Base
from datetime import datetime
from sqlalchemy import Column, DateTime, Float, Integer, String


class Transport_requests(Base):
    __tablename__ = "transport_requests"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    title = Column(String, nullable=True)
    origin = Column(String, nullable=True)
    destination = Column(String, nullable=True)
    origin_country = Column(String, nullable=True)
    destination_country = Column(String, nullable=True)
    transport_category = Column(String, nullable=True)
    transport_mode = Column(String, nullable=True)
    vehicle_type = Column(String, nullable=True)
    customs_service_type = Column(String, nullable=True)
    customs_office = Column(String, nullable=True)
    invoice_ref = Column(String, nullable=True)
    additional_services = Column(String, nullable=True)
    container_type = Column(String, nullable=True)
    container_count = Column(Integer, nullable=True)
    cargo_description = Column(String, nullable=True)
    weight_kg = Column(Float, nullable=True)
    preferred_date = Column(String, nullable=True)
    deadline_date = Column(String, nullable=True)
    special_requirements = Column(String, nullable=True)
    status = Column(String, nullable=True)
    user_role = Column(String, nullable=True)
    user_company = Column(String, nullable=True)
    tracking_link = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)