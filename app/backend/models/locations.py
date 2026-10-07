from core.database import Base
from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String


class Locations(Base):
    __tablename__ = "locations"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    country_code = Column(String, nullable=False)
    country_name = Column(String, nullable=False)
    postal_code = Column(String, nullable=True)
    city = Column(String, nullable=False)
    location_name = Column(String, nullable=False)
    location_type = Column(String, nullable=True)
    # Diacritic-folded, lowercased copy of city/postal_code/location_name —
    # lets "sabac" match "Šabac", "munchen" match "München", etc.
    search_key = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)