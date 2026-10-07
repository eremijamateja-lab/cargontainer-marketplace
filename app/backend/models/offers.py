from core.database import Base
from datetime import datetime
from sqlalchemy import Column, DateTime, Float, Integer, String


class Offers(Base):
    __tablename__ = "offers"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    request_id = Column(Integer, nullable=False)
    price = Column(Float, nullable=False)
    currency = Column(String, nullable=False)
    estimated_days = Column(Integer, nullable=True)
    transport_mode = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    status = Column(String, nullable=False)
    carrier_name = Column(String, nullable=True)
    service_type = Column(String, nullable=True, default="transport", server_default="transport")
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)