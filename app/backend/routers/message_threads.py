import logging
from typing import List, Optional

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.messages import MessagesService
from dependencies.auth import get_current_user, require_approved_company
from schemas.auth import UserResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/marketplace/messages", tags=["messages"], dependencies=[Depends(require_approved_company)])


class ThreadSummaryResponse(BaseModel):
    thread_key: str
    kind: str
    offer_id: Optional[int] = None
    request_id: Optional[int] = None
    carrier_user_id: Optional[str] = None
    counterpart_name: str
    route: str
    last_message: Optional[str] = None
    last_created_at: Optional[datetime] = None
    unread_count: int = 0


@router.get("/threads", response_model=List[ThreadSummaryResponse])
async def list_my_threads(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Unified inbox — every conversation (offer negotiation or pre-offer
    inquiry) this user is part of, most recently active first."""
    service = MessagesService(db)
    try:
        return await service.list_my_threads(str(current_user.id))
    except Exception as e:
        logger.error(f"Error listing message threads: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")
