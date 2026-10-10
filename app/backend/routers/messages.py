import logging
from typing import List, Optional

from datetime import datetime

from fastapi import BackgroundTasks, APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.notifications import notify_new_message
from services.messages import MessagesService
from dependencies.auth import get_current_user, require_approved_company
from schemas.auth import UserResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/marketplace/offers", tags=["messages"], dependencies=[Depends(require_approved_company)])


class MessageResponse(BaseModel):
    id: int
    offer_id: int
    sender_user_id: str
    sender_name: Optional[str] = None
    body: str
    read_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SendMessageRequest(BaseModel):
    body: str


@router.get("/{offer_id}/messages", response_model=List[MessageResponse])
async def list_messages(
    offer_id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List every message in this offer's negotiation thread. Only the
    carrier who made the offer or the forwarder who owns the request may
    see it. Opening the thread marks the other party's messages read."""
    service = MessagesService(db)
    try:
        return await service.list_messages(offer_id, str(current_user.id))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error listing messages for offer {offer_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/{offer_id}/messages", response_model=MessageResponse, status_code=201)
async def send_message(
    offer_id: int,
    data: SendMessageRequest,
    background_tasks: BackgroundTasks,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send a message in this offer's negotiation thread."""
    service = MessagesService(db)
    try:
        sender_name = current_user.name or current_user.email
        message = await service.send_message(offer_id, str(current_user.id), sender_name, data.body)
        background_tasks.add_task(notify_new_message, message.id)
        return message
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error sending message for offer {offer_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/messages/unread-count")
async def unread_message_count(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Total unread messages across every negotiation this user is part of."""
    service = MessagesService(db)
    try:
        count = await service.unread_count(str(current_user.id))
        return {"unread_count": count}
    except Exception as e:
        logger.error(f"Error counting unread messages: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")
