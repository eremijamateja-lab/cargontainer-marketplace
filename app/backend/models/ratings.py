from core.database import Base
from datetime import datetime
from sqlalchemy import Column, DateTime, Float, Integer, String, UniqueConstraint


class Ratings(Base):
    """One company's rating of the other party after a delivered Marketplace transport.

    rater_role 'forwarder' rates the carrier on s1 punctuality, s2 communication, s3 cargo condition;
    rater_role 'carrier' rates the forwarder on s1 payment, s2 communication, s3 order accuracy.
    Companies are shared company uuids (actor suffix); shown to others only as an average and
    anonymous comments once a company has at least 3 ratings."""

    __tablename__ = "ratings"
    __table_args__ = (UniqueConstraint("shipment_id", "rater_company", name="uq_ratings_shipment_rater"), {"extend_existing": True})

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    shipment_id = Column(Integer, nullable=False, index=True)
    rater_company = Column(String, nullable=False)
    rater_user_id = Column(String, nullable=False)
    rated_company = Column(String, nullable=False, index=True)
    rater_role = Column(String, nullable=False)
    s1 = Column(Integer, nullable=False)
    s2 = Column(Integer, nullable=False)
    s3 = Column(Integer, nullable=False)
    overall = Column(Float, nullable=False)
    comment = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
