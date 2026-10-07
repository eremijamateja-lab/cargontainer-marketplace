from core.database import Base
from sqlalchemy import Column, DateTime, Integer, String


class User_profiles(Base):
    __tablename__ = "user_profiles"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    role = Column(String, nullable=False)
    company_name = Column(String, nullable=False)
    display_name = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)
    company_id = Column(Integer, nullable=True)
    member_role = Column(String, nullable=True)
    member_status = Column(String, nullable=True)  # pending, active, rejected, inactive