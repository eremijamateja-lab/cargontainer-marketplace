import logging
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.tms_handoff import create_handoff
from services.marketplace import MarketplaceService
from dependencies.auth import get_current_user, require_approved_company
from schemas.auth import UserResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/marketplace", tags=["marketplace"], dependencies=[Depends(require_approved_company)])


# ---------- Pydantic Schemas ----------
class MarketplaceRequestResponse(BaseModel):
    id: int
    user_id: str
    title: Optional[str] = None
    origin: Optional[str] = None
    destination: Optional[str] = None
    origin_country: Optional[str] = None
    destination_country: Optional[str] = None
    transport_category: Optional[str] = None
    transport_mode: Optional[str] = None
    vehicle_type: Optional[str] = None
    customs_service_type: Optional[str] = None
    customs_office: Optional[str] = None
    invoice_ref: Optional[str] = None
    additional_services: Optional[str] = None
    container_type: Optional[str] = None
    container_count: Optional[int] = None
    cargo_description: Optional[str] = None
    weight_kg: Optional[float] = None
    preferred_date: Optional[str] = None
    deadline_date: Optional[str] = None
    special_requirements: Optional[str] = None
    status: Optional[str] = "published"
    user_role: Optional[str] = None
    user_company: Optional[str] = None
    tracking_link: Optional[str] = None
    created_at: Optional[Any] = None
    updated_at: Optional[Any] = None

    class Config:
        from_attributes = True


class MarketplaceRequestListResponse(BaseModel):
    items: List[MarketplaceRequestResponse]
    total: int
    skip: int
    limit: int


class OfferResponse(BaseModel):
    id: int
    user_id: str
    request_id: int
    price: float
    currency: str
    estimated_days: Optional[int] = None
    transport_mode: Optional[str] = None
    notes: Optional[str] = None
    status: str
    carrier_name: Optional[str] = None
    service_type: Optional[str] = "transport"

    class Config:
        from_attributes = True


class RejectOfferRequest(BaseModel):
    offer_id: int
    request_id: int


class AcceptOfferRequest(BaseModel):
    offer_id: int
    request_id: int


class UpdateTrackingLinkRequest(BaseModel):
    request_id: int
    tracking_link: str


class ShipmentResponse(BaseModel):
    id: int
    user_id: str
    request_id: Optional[int] = None
    offer_id: Optional[int] = None
    tracking_number: Optional[str] = None
    status: Optional[str] = None
    current_location: Optional[str] = None
    origin: Optional[str] = None
    destination: Optional[str] = None
    origin_country: Optional[str] = None
    destination_country: Optional[str] = None
    transport_category: Optional[str] = None
    additional_services: Optional[str] = None
    carrier_name: Optional[str] = None
    estimated_arrival: Optional[str] = None
    actual_arrival: Optional[str] = None
    vehicle_plate: Optional[str] = None
    container_number: Optional[str] = None
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    trailer_plate: Optional[str] = None
    carrier_email: Optional[str] = None
    carrier_phone: Optional[str] = None
    operational_notes: Optional[str] = None
    forwarder_notes: Optional[str] = None
    milestone_history: Optional[str] = None
    customs_offer_id: Optional[int] = None
    customs_agent_name: Optional[str] = None
    customs_status: Optional[str] = None
    tracking_link: Optional[str] = None
    created_at: Optional[Any] = None
    updated_at: Optional[Any] = None

    class Config:
        from_attributes = True


class UpdateShipmentStatusRequest(BaseModel):
    shipment_id: int
    status: str
    current_location: Optional[str] = None
    vehicle_plate: Optional[str] = None
    container_number: Optional[str] = None


class UpdateDriverDetailsRequest(BaseModel):
    shipment_id: int
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    vehicle_plate: Optional[str] = None
    trailer_plate: Optional[str] = None
    container_number: Optional[str] = None
    carrier_email: Optional[str] = None
    carrier_phone: Optional[str] = None
    operational_notes: Optional[str] = None
    forwarder_notes: Optional[str] = None


# ---------- Routes ----------
@router.get("/requests", response_model=MarketplaceRequestListResponse)
async def get_marketplace_requests(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all published/open transport requests visible in the marketplace."""
    service = MarketplaceService(db)
    try:
        result = await service.get_published_requests(skip=skip, limit=limit)
        return result
    except Exception as e:
        logger.error(f"Error fetching marketplace requests: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/offers", response_model=List[OfferResponse])
async def get_offers_for_request(
    request_id: int = Query(..., description="Transport request ID"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get offers for a specific transport request."""
    service = MarketplaceService(db)
    try:
        offers = await service.get_offers_for_request(
            request_id=request_id, user_id=str(current_user.id)
        )
        return offers
    except Exception as e:
        logger.error(f"Error fetching offers: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/accept-offer", response_model=ShipmentResponse)
async def accept_offer(
    data: AcceptOfferRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Accept an offer on a transport request (forwarder only). Service-type aware."""
    service = MarketplaceService(db)
    try:
        shipment = await service.accept_offer(
            offer_id=data.offer_id,
            request_id=data.request_id,
            user_id=str(current_user.id),
        )
        if not shipment:
            raise HTTPException(status_code=400, detail="Failed to accept offer")
        # Supabase mode: put it in the forwarder's TMS Agency inbox ("📥 Novo sa Marketplace-a")
        await create_handoff(db, shipment)
        return shipment
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error accepting offer: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/reject-offer")
async def reject_offer(
    data: RejectOfferRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Reject an offer on a transport request (RFQ owner only)."""
    service = MarketplaceService(db)
    try:
        result = await service.reject_offer(
            offer_id=data.offer_id,
            request_id=data.request_id,
            user_id=str(current_user.id),
        )
        if not result:
            raise HTTPException(status_code=400, detail="Failed to reject offer")
        return {"status": "rejected", "offer_id": data.offer_id}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error rejecting offer: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/received-offers", response_model=List[OfferResponse])
async def get_received_offers(
    status_filter: Optional[str] = Query(None, description="Filter by status: pending, accepted, rejected"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all offers received on RFQs owned by the current user."""
    service = MarketplaceService(db)
    try:
        offers = await service.get_received_offers(
            user_id=str(current_user.id),
            status_filter=status_filter,
            skip=skip,
            limit=limit,
        )
        return offers
    except Exception as e:
        logger.error(f"Error fetching received offers: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/update-tracking-link", response_model=MarketplaceRequestResponse)
async def update_tracking_link(
    data: UpdateTrackingLinkRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update tracking link on a transport request (carrier only)."""
    service = MarketplaceService(db)
    try:
        result = await service.update_tracking_link(
            request_id=data.request_id,
            tracking_link=data.tracking_link,
            carrier_user_id=str(current_user.id),
        )
        if not result:
            raise HTTPException(status_code=400, detail="Failed to update tracking link")
        return result
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating tracking link: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/update-shipment-status", response_model=ShipmentResponse)
async def update_shipment_status(
    data: UpdateShipmentStatusRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update shipment status (carrier only). Forward-only progression."""
    service = MarketplaceService(db)
    try:
        shipment = await service.update_shipment_status(
            shipment_id=data.shipment_id,
            new_status=data.status,
            carrier_user_id=str(current_user.id),
            current_location=data.current_location,
            vehicle_plate=data.vehicle_plate,
            container_number=data.container_number,
        )
        if not shipment:
            raise HTTPException(status_code=400, detail="Failed to update shipment status")
        return shipment
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating shipment status: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/update-driver-details", response_model=ShipmentResponse)
async def update_driver_details(
    data: UpdateDriverDetailsRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update driver, vehicle, and operational details on a shipment (forwarder or carrier)."""
    service = MarketplaceService(db)
    try:
        shipment = await service.update_driver_details(
            shipment_id=data.shipment_id,
            user_id=str(current_user.id),
            driver_name=data.driver_name,
            driver_phone=data.driver_phone,
            vehicle_plate=data.vehicle_plate,
            trailer_plate=data.trailer_plate,
            container_number=data.container_number,
            carrier_email=data.carrier_email,
            carrier_phone=data.carrier_phone,
            operational_notes=data.operational_notes,
            forwarder_notes=data.forwarder_notes,
        )
        if not shipment:
            raise HTTPException(status_code=400, detail="Failed to update driver details")
        return shipment
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating driver details: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/request/{request_id}", response_model=MarketplaceRequestResponse)
async def get_request_by_id(
    request_id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single transport request by ID."""
    service = MarketplaceService(db)
    try:
        request_obj = await service.get_request_by_id(request_id)
        if not request_obj:
            raise HTTPException(status_code=404, detail="Request not found")
        if str(request_obj.user_id) != str(current_user.id):
            if request_obj.status not in ("published", "open", "offers_received", "in_progress"):
                raise HTTPException(status_code=404, detail="Request not found")
        return request_obj
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching request {request_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/offers/by-request/{request_id}", response_model=List[OfferResponse])
async def get_offers_by_request_path(
    request_id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get offers for a specific transport request (path-based alternative)."""
    service = MarketplaceService(db)
    try:
        offers = await service.get_offers_for_request(
            request_id=request_id, user_id=str(current_user.id)
        )
        return offers
    except Exception as e:
        logger.error(f"Error fetching offers: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/my-offers", response_model=List[OfferResponse])
async def get_my_offers(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all offers submitted by the current user (carrier view)."""
    from services.offers import OffersService

    service = OffersService(db)
    try:
        result = await service.get_list(
            skip=skip, limit=limit, user_id=str(current_user.id)
        )
        return result.get("items", [])
    except Exception as e:
        logger.error(f"Error fetching my offers: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/my-shipments", response_model=List[ShipmentResponse])
async def get_my_shipments(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get shipments for the current user (both as forwarder/owner and as carrier)."""
    service = MarketplaceService(db)
    try:
        shipments = await service.get_my_shipments(
            user_id=str(current_user.id), skip=skip, limit=limit
        )
        return shipments
    except Exception as e:
        logger.error(f"Error fetching my shipments: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/carrier-shipments", response_model=List[ShipmentResponse])
async def get_carrier_shipments(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get shipments where the current user is the assigned carrier."""
    service = MarketplaceService(db)
    try:
        shipments = await service.get_carrier_shipments(
            carrier_user_id=str(current_user.id), skip=skip, limit=limit
        )
        return shipments
    except Exception as e:
        logger.error(f"Error fetching carrier shipments: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")