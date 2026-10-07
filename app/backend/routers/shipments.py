import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.shipments import ShipmentsService
from dependencies.auth import get_current_user, require_approved_company
from schemas.auth import UserResponse

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/shipments", tags=["shipments"], dependencies=[Depends(require_approved_company)])


# ---------- Pydantic Schemas ----------
class ShipmentsData(BaseModel):
    """Entity data schema (for create/update)"""
    request_id: int = None
    offer_id: int = None
    tracking_number: str = None
    status: str = None
    current_location: str = None
    origin: str = None
    destination: str = None
    origin_country: str = None
    destination_country: str = None
    transport_category: str = None
    carrier_name: str = None
    estimated_arrival: str = None
    actual_arrival: str = None
    vehicle_plate: str = None
    container_number: str = None
    driver_name: str = None
    driver_phone: str = None
    trailer_plate: str = None
    carrier_email: str = None
    carrier_phone: str = None
    operational_notes: str = None
    forwarder_notes: str = None


class ShipmentsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
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


class ShipmentsResponse(BaseModel):
    """Entity response schema"""
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
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ShipmentsListResponse(BaseModel):
    """List response schema"""
    items: List[ShipmentsResponse]
    total: int
    skip: int
    limit: int


class ShipmentsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[ShipmentsData]


class ShipmentsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: ShipmentsUpdateData


class ShipmentsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[ShipmentsBatchUpdateItem]


class ShipmentsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=ShipmentsListResponse)
async def query_shipmentss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Query shipmentss with filtering, sorting, and pagination (user can only see their own records)"""
    logger.debug(f"Querying shipmentss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = ShipmentsService(db)
    try:
        # Parse query JSON if provided
        query_dict = None
        if query:
            try:
                query_dict = json.loads(query)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid query JSON format")
        
        result = await service.get_list(
            skip=skip, 
            limit=limit,
            query_dict=query_dict,
            sort=sort,
            user_id=str(current_user.id),
        )
        logger.debug(f"Found {result['total']} shipmentss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying shipmentss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=ShipmentsListResponse)
async def query_shipmentss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query shipmentss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying shipmentss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = ShipmentsService(db)
    try:
        # Parse query JSON if provided
        query_dict = None
        if query:
            try:
                query_dict = json.loads(query)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid query JSON format")

        result = await service.get_list(
            skip=skip,
            limit=limit,
            query_dict=query_dict,
            sort=sort
        )
        logger.debug(f"Found {result['total']} shipmentss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying shipmentss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=ShipmentsResponse)
async def get_shipments(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single shipments by ID (user can only see their own records)"""
    logger.debug(f"Fetching shipments with id: {id}, fields={fields}")
    
    service = ShipmentsService(db)
    try:
        result = await service.get_by_id(id, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Shipments with id {id} not found")
            raise HTTPException(status_code=404, detail="Shipments not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching shipments {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=ShipmentsResponse, status_code=201)
async def create_shipments(
    data: ShipmentsData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new shipments"""
    logger.debug(f"Creating new shipments with data: {data}")
    
    service = ShipmentsService(db)
    try:
        result = await service.create(data.model_dump(), user_id=str(current_user.id))
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create shipments")
        
        logger.info(f"Shipments created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating shipments: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating shipments: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[ShipmentsResponse], status_code=201)
async def create_shipmentss_batch(
    request: ShipmentsBatchCreateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple shipmentss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} shipmentss")
    
    service = ShipmentsService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump(), user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} shipmentss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[ShipmentsResponse])
async def update_shipmentss_batch(
    request: ShipmentsBatchUpdateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple shipmentss in a single request (requires ownership)"""
    logger.debug(f"Batch updating {len(request.items)} shipmentss")
    
    service = ShipmentsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict, user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} shipmentss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=ShipmentsResponse)
async def update_shipments(
    id: int,
    data: ShipmentsUpdateData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing shipments (requires ownership)"""
    logger.debug(f"Updating shipments {id} with data: {data}")

    service = ShipmentsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Shipments with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Shipments not found")
        
        logger.info(f"Shipments {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating shipments {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating shipments {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_shipmentss_batch(
    request: ShipmentsBatchDeleteRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple shipmentss by their IDs (requires ownership)"""
    logger.debug(f"Batch deleting {len(request.ids)} shipmentss")
    
    service = ShipmentsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id, user_id=str(current_user.id))
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} shipmentss successfully")
        return {"message": f"Successfully deleted {deleted_count} shipmentss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_shipments(
    id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single shipments by ID (requires ownership)"""
    logger.debug(f"Deleting shipments with id: {id}")
    
    service = ShipmentsService(db)
    try:
        success = await service.delete(id, user_id=str(current_user.id))
        if not success:
            logger.warning(f"Shipments with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Shipments not found")
        
        logger.info(f"Shipments {id} deleted successfully")
        return {"message": "Shipments deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting shipments {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")