import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.locations import LocationsService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/locations", tags=["locations"])


# ---------- Pydantic Schemas ----------
class LocationsData(BaseModel):
    """Entity data schema (for create/update)"""
    country_code: str
    country_name: str
    postal_code: str = None
    city: str
    location_name: str
    location_type: str = None


class LocationsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    country_code: Optional[str] = None
    country_name: Optional[str] = None
    postal_code: Optional[str] = None
    city: Optional[str] = None
    location_name: Optional[str] = None
    location_type: Optional[str] = None


class LocationsResponse(BaseModel):
    """Entity response schema"""
    id: int
    country_code: str
    country_name: str
    postal_code: Optional[str] = None
    city: str
    location_name: str
    location_type: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class LocationsListResponse(BaseModel):
    """List response schema"""
    items: List[LocationsResponse]
    total: int
    skip: int
    limit: int


class LocationsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[LocationsData]


class LocationsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: LocationsUpdateData


class LocationsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[LocationsBatchUpdateItem]


class LocationsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=LocationsListResponse)
async def query_locationss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Query locationss with filtering, sorting, and pagination"""
    logger.debug(f"Querying locationss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = LocationsService(db)
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
        )
        logger.debug(f"Found {result['total']} locationss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying locationss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=LocationsListResponse)
async def query_locationss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query locationss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying locationss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = LocationsService(db)
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
        logger.debug(f"Found {result['total']} locationss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying locationss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=LocationsResponse)
async def get_locations(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Get a single locations by ID"""
    logger.debug(f"Fetching locations with id: {id}, fields={fields}")
    
    service = LocationsService(db)
    try:
        result = await service.get_by_id(id)
        if not result:
            logger.warning(f"Locations with id {id} not found")
            raise HTTPException(status_code=404, detail="Locations not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching locations {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=LocationsResponse, status_code=201)
async def create_locations(
    data: LocationsData,
    db: AsyncSession = Depends(get_db),
):
    """Create a new locations"""
    logger.debug(f"Creating new locations with data: {data}")
    
    service = LocationsService(db)
    try:
        result = await service.create(data.model_dump())
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create locations")
        
        logger.info(f"Locations created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating locations: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating locations: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[LocationsResponse], status_code=201)
async def create_locationss_batch(
    request: LocationsBatchCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create multiple locationss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} locationss")
    
    service = LocationsService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump())
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} locationss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[LocationsResponse])
async def update_locationss_batch(
    request: LocationsBatchUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update multiple locationss in a single request"""
    logger.debug(f"Batch updating {len(request.items)} locationss")
    
    service = LocationsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict)
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} locationss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=LocationsResponse)
async def update_locations(
    id: int,
    data: LocationsUpdateData,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing locations"""
    logger.debug(f"Updating locations {id} with data: {data}")

    service = LocationsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict)
        if not result:
            logger.warning(f"Locations with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Locations not found")
        
        logger.info(f"Locations {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating locations {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating locations {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_locationss_batch(
    request: LocationsBatchDeleteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple locationss by their IDs"""
    logger.debug(f"Batch deleting {len(request.ids)} locationss")
    
    service = LocationsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id)
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} locationss successfully")
        return {"message": f"Successfully deleted {deleted_count} locationss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_locations(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a single locations by ID"""
    logger.debug(f"Deleting locations with id: {id}")
    
    service = LocationsService(db)
    try:
        success = await service.delete(id)
        if not success:
            logger.warning(f"Locations with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Locations not found")
        
        logger.info(f"Locations {id} deleted successfully")
        return {"message": "Locations deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting locations {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")