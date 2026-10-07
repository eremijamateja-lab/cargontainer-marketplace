from core.database import Base
from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String


class Messages(Base):
    """One chat message. Either tied to a specific offer (offer_id) — the
    negotiation thread between the forwarder and the carrier who made that
    offer — or, before any offer exists, tied to a request + carrier pair
    (request_id + carrier_user_id) so a carrier can ask the forwarder a
    question about an open request first."""

    __tablename__ = "messages"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    offer_id = Column(Integer, nullable=True, index=True)
    request_id = Column(Integer, nullable=True, index=True)
    carrier_user_id = Column(String, nullable=True, index=True)
    sender_user_id = Column(String, nullable=False)
    sender_name = Column(String, nullable=True)
    body = Column(String, nullable=False)
    read_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now, index=True)
