import logging
from typing import List, Optional

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.messages import MessagesService
from dependencies.auth import get_current_user, require_approved_company
from schemas.auth import UserResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/marketplace/requests", tags=["messages"], dependencies=[Depends(require_approved_company)])


class RequestMessageResponse(BaseModel):
    id: int
    request_id: int
    carrier_user_id: str
    sender_user_id: str
    sender_name: Optional[str] = None
    body: str
    read_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SendMessageRequest(BaseModel):
    body: str


class ThreadResponse(BaseModel):
    carrier_user_id: str
    carrier_name: Optional[str] = None
    last_message: Optional[str] = None
    last_created_at: Optional[datetime] = None
    unread_count: int = 0


@router.get("/{request_id}/messages", response_model=List[RequestMessageResponse])
async def list_request_messages(
    request_id: int,
    carrier_user_id: Optional[str] = Query(None),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List a pre-offer inquiry thread on a request. A carrier always sees
    their own thread; the forwarder who owns the request must pass
    carrier_user_id to pick which carrier's thread to view."""
    service = MessagesService(db)
    try:
        return await service.list_request_messages(request_id, str(current_user.id), carrier_user_id)
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error listing request messages for request {request_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/{request_id}/messages", response_model=RequestMessageResponse, status_code=201)
async def send_request_message(
    request_id: int,
    data: SendMessageRequest,
    carrier_user_id: Optional[str] = Query(None),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send a message in a pre-offer inquiry thread on a request."""
    service = MessagesService(db)
    try:
        sender_name = current_user.name or current_user.email
        return await service.send_request_message(
            request_id, str(current_user.id), sender_name, data.body, carrier_user_id
        )
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error sending request message for request {request_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{request_id}/messages/threads", response_model=List[ThreadResponse])
async def list_request_threads(
    request_id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Forwarder-only: list every carrier who has an inquiry thread open
    on this request, most recently active first."""
    service = MessagesService(db)
    try:
        return await service.list_request_threads(request_id, str(current_user.id))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error listing request threads for request {request_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")
