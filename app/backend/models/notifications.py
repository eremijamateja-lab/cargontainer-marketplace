from core.database import Base
from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Integer, String


class Carrier_corridors(Base):
    """A company's "Moje relacije" entry: which new requests it wants to be alerted about.
    Empty origin/destination country means "any". both_directions also matches the reverse
    route. Matching rule lives in services/notifications.py::corridor_matches."""

    __tablename__ = "carrier_corridors"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    company_id = Column(Integer, nullable=False, index=True)
    origin_country = Column(String, nullable=True)
    destination_country = Column(String, nullable=True)
    both_directions = Column(Boolean, nullable=False, default=True)
    created_by = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)


class Push_subscriptions(Base):
    """One browser/phone that turned on push notifications (Web Push API subscription)."""

    __tablename__ = "push_subscriptions"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False, index=True)
    company_id = Column(Integer, nullable=True, index=True)
    endpoint = Column(String, nullable=False, unique=True)
    p256dh = Column(String, nullable=False)
    auth = Column(String, nullable=False)
    lang = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    last_sent_at = Column(DateTime(timezone=True), nullable=True)


class Push_keys(Base):
    """The server's VAPID key pair, generated once on first use (single row, id=1).
    Kept in the DB rather than env so no secret has to be created by hand."""

    __tablename__ = "push_keys"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, nullable=False)
    private_key_pem = Column(String, nullable=False)
    public_key_b64 = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
