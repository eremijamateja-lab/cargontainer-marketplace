import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, BackgroundTasks, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.notifications import notify_new_request
from services.transport_requests import Transport_requestsService
from dependencies.auth import get_current_user, require_approved_company
from schemas.auth import UserResponse

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/transport_requests", tags=["transport_requests"], dependencies=[Depends(require_approved_company)])


# ---------- Pydantic Schemas ----------
class Transport_requestsData(BaseModel):
    """Entity data schema (for create/update)"""
    title: str = None
    origin: str = None
    destination: str = None
    origin_country: str = None
    destination_country: str = None
    transport_category: str = None
    transport_mode: str = None
    vehicle_type: str = None
    customs_service_type: str = None
    customs_office: str = None
    invoice_ref: str = None
    additional_services: str = None
    container_type: str = None
    container_count: int = None
    cargo_description: str = None
    weight_kg: float = None
    preferred_date: str = None
    deadline_date: str = None
    special_requirements: str = None
    status: str = None
    user_role: str = None
    user_company: str = None
    tracking_link: str = None


class Transport_requestsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
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
    status: Optional[str] = None
    user_role: Optional[str] = None
    user_company: Optional[str] = None
    tracking_link: Optional[str] = None


class Transport_requestsResponse(BaseModel):
    """Entity response schema"""
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
    status: Optional[str] = None
    user_role: Optional[str] = None
    user_company: Optional[str] = None
    tracking_link: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Transport_requestsListResponse(BaseModel):
    """List response schema"""
    items: List[Transport_requestsResponse]
    total: int
    skip: int
    limit: int


class Transport_requestsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Transport_requestsData]


class Transport_requestsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Transport_requestsUpdateData


class Transport_requestsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Transport_requestsBatchUpdateItem]


class Transport_requestsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Transport_requestsListResponse)
async def query_transport_requestss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Query transport_requestss with filtering, sorting, and pagination (user can only see their own records)"""
    logger.debug(f"Querying transport_requestss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Transport_requestsService(db)
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
        logger.debug(f"Found {result['total']} transport_requestss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying transport_requestss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Transport_requestsListResponse)
async def query_transport_requestss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query transport_requestss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying transport_requestss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Transport_requestsService(db)
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
        logger.debug(f"Found {result['total']} transport_requestss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying transport_requestss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Transport_requestsResponse)
async def get_transport_requests(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single transport_requests by ID (user can only see their own records)"""
    logger.debug(f"Fetching transport_requests with id: {id}, fields={fields}")
    
    service = Transport_requestsService(db)
    try:
        result = await service.get_by_id(id, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Transport_requests with id {id} not found")
            raise HTTPException(status_code=404, detail="Transport_requests not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching transport_requests {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Transport_requestsResponse, status_code=201)
async def create_transport_requests(
    data: Transport_requestsData,
    background_tasks: BackgroundTasks,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new transport_requests"""
    logger.debug(f"Creating new transport_requests with data: {data}")
    
    service = Transport_requestsService(db)
    try:
        result = await service.create(data.model_dump(), user_id=str(current_user.id))
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create transport_requests")
        
        logger.info(f"Transport_requests created successfully with id: {result.id}")
        # Push "Novi upit" to carriers whose corridors match (after the response is sent)
        background_tasks.add_task(notify_new_request, result.id)
        return result
    except ValueError as e:
        logger.error(f"Validation error creating transport_requests: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating transport_requests: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Transport_requestsResponse], status_code=201)
async def create_transport_requestss_batch(
    request: Transport_requestsBatchCreateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple transport_requestss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} transport_requestss")
    
    service = Transport_requestsService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump(), user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} transport_requestss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Transport_requestsResponse])
async def update_transport_requestss_batch(
    request: Transport_requestsBatchUpdateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple transport_requestss in a single request (requires ownership)"""
    logger.debug(f"Batch updating {len(request.items)} transport_requestss")
    
    service = Transport_requestsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict, user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} transport_requestss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Transport_requestsResponse)
async def update_transport_requests(
    id: int,
    data: Transport_requestsUpdateData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing transport_requests (requires ownership)"""
    logger.debug(f"Updating transport_requests {id} with data: {data}")

    service = Transport_requestsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Transport_requests with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Transport_requests not found")
        
        logger.info(f"Transport_requests {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating transport_requests {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating transport_requests {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_transport_requestss_batch(
    request: Transport_requestsBatchDeleteRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple transport_requestss by their IDs (requires ownership)"""
    logger.debug(f"Batch deleting {len(request.ids)} transport_requestss")
    
    service = Transport_requestsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id, user_id=str(current_user.id))
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} transport_requestss successfully")
        return {"message": f"Successfully deleted {deleted_count} transport_requestss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_transport_requests(
    id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single transport_requests by ID (requires ownership)"""
    logger.debug(f"Deleting transport_requests with id: {id}")
    
    service = Transport_requestsService(db)
    try:
        success = await service.delete(id, user_id=str(current_user.id))
        if not success:
            logger.warning(f"Transport_requests with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Transport_requests not found")
        
        logger.info(f"Transport_requests {id} deleted successfully")
        return {"message": "Transport_requests deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting transport_requests {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")