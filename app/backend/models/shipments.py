from core.database import Base
from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String, Text


class Shipments(Base):
    __tablename__ = "shipments"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    request_id = Column(Integer, nullable=True)
    offer_id = Column(Integer, nullable=True)
    tracking_number = Column(String, nullable=True)
    status = Column(String, nullable=True)
    current_location = Column(String, nullable=True)
    origin = Column(String, nullable=True)
    destination = Column(String, nullable=True)
    origin_country = Column(String, nullable=True)
    destination_country = Column(String, nullable=True)
    transport_category = Column(String, nullable=True)
    additional_services = Column(String, nullable=True)
    carrier_name = Column(String, nullable=True)
    estimated_arrival = Column(String, nullable=True)
    actual_arrival = Column(String, nullable=True)
    vehicle_plate = Column(String, nullable=True)
    container_number = Column(String, nullable=True)
    driver_name = Column(String, nullable=True)
    driver_phone = Column(String, nullable=True)
    trailer_plate = Column(String, nullable=True)
    carrier_email = Column(String, nullable=True)
    carrier_phone = Column(String, nullable=True)
    operational_notes = Column(String, nullable=True)
    forwarder_notes = Column(String, nullable=True)
    # Milestone history: JSON string storing {status: {timestamp, updated_by}}
    milestone_history = Column(Text, nullable=True)
    # Customs / T1 service fields
    customs_offer_id = Column(Integer, nullable=True)
    customs_agent_name = Column(String, nullable=True)
    customs_status = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)