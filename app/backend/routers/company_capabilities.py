import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from dependencies.auth import get_admin_user
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.company_capabilities import Company_capabilitiesService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/company_capabilities", tags=["company_capabilities"], dependencies=[Depends(get_admin_user)])


# ---------- Pydantic Schemas ----------
class Company_capabilitiesData(BaseModel):
    """Entity data schema (for create/update)"""
    company_id: int
    vehicle_count: int = None
    vehicle_types: str = None
    main_routes: str = None
    transport_categories: str = None
    customs_services: bool = None
    countries_covered: str = None
    customs_offices: str = None
    service_regions: str = None


class Company_capabilitiesUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    company_id: Optional[int] = None
    vehicle_count: Optional[int] = None
    vehicle_types: Optional[str] = None
    main_routes: Optional[str] = None
    transport_categories: Optional[str] = None
    customs_services: Optional[bool] = None
    countries_covered: Optional[str] = None
    customs_offices: Optional[str] = None
    service_regions: Optional[str] = None


class Company_capabilitiesResponse(BaseModel):
    """Entity response schema"""
    id: int
    company_id: int
    vehicle_count: Optional[int] = None
    vehicle_types: Optional[str] = None
    main_routes: Optional[str] = None
    transport_categories: Optional[str] = None
    customs_services: Optional[bool] = None
    countries_covered: Optional[str] = None
    customs_offices: Optional[str] = None
    service_regions: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Company_capabilitiesListResponse(BaseModel):
    """List response schema"""
    items: List[Company_capabilitiesResponse]
    total: int
    skip: int
    limit: int


class Company_capabilitiesBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Company_capabilitiesData]


class Company_capabilitiesBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Company_capabilitiesUpdateData


class Company_capabilitiesBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Company_capabilitiesBatchUpdateItem]


class Company_capabilitiesBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Company_capabilitiesListResponse)
async def query_company_capabilitiess(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Query company_capabilitiess with filtering, sorting, and pagination"""
    logger.debug(f"Querying company_capabilitiess: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Company_capabilitiesService(db)
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
        logger.debug(f"Found {result['total']} company_capabilitiess")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying company_capabilitiess: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Company_capabilitiesListResponse)
async def query_company_capabilitiess_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query company_capabilitiess with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying company_capabilitiess: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Company_capabilitiesService(db)
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
        logger.debug(f"Found {result['total']} company_capabilitiess")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying company_capabilitiess: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Company_capabilitiesResponse)
async def get_company_capabilities(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Get a single company_capabilities by ID"""
    logger.debug(f"Fetching company_capabilities with id: {id}, fields={fields}")
    
    service = Company_capabilitiesService(db)
    try:
        result = await service.get_by_id(id)
        if not result:
            logger.warning(f"Company_capabilities with id {id} not found")
            raise HTTPException(status_code=404, detail="Company_capabilities not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching company_capabilities {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Company_capabilitiesResponse, status_code=201)
async def create_company_capabilities(
    data: Company_capabilitiesData,
    db: AsyncSession = Depends(get_db),
):
    """Create a new company_capabilities"""
    logger.debug(f"Creating new company_capabilities with data: {data}")
    
    service = Company_capabilitiesService(db)
    try:
        result = await service.create(data.model_dump())
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create company_capabilities")
        
        logger.info(f"Company_capabilities created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating company_capabilities: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating company_capabilities: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Company_capabilitiesResponse], status_code=201)
async def create_company_capabilitiess_batch(
    request: Company_capabilitiesBatchCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create multiple company_capabilitiess in a single request"""
    logger.debug(f"Batch creating {len(request.items)} company_capabilitiess")
    
    service = Company_capabilitiesService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump())
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} company_capabilitiess successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Company_capabilitiesResponse])
async def update_company_capabilitiess_batch(
    request: Company_capabilitiesBatchUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update multiple company_capabilitiess in a single request"""
    logger.debug(f"Batch updating {len(request.items)} company_capabilitiess")
    
    service = Company_capabilitiesService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict)
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} company_capabilitiess successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Company_capabilitiesResponse)
async def update_company_capabilities(
    id: int,
    data: Company_capabilitiesUpdateData,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing company_capabilities"""
    logger.debug(f"Updating company_capabilities {id} with data: {data}")

    service = Company_capabilitiesService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict)
        if not result:
            logger.warning(f"Company_capabilities with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Company_capabilities not found")
        
        logger.info(f"Company_capabilities {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating company_capabilities {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating company_capabilities {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_company_capabilitiess_batch(
    request: Company_capabilitiesBatchDeleteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple company_capabilitiess by their IDs"""
    logger.debug(f"Batch deleting {len(request.ids)} company_capabilitiess")
    
    service = Company_capabilitiesService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id)
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} company_capabilitiess successfully")
        return {"message": f"Successfully deleted {deleted_count} company_capabilitiess", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_company_capabilities(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a single company_capabilities by ID"""
    logger.debug(f"Deleting company_capabilities with id: {id}")
    
    service = Company_capabilitiesService(db)
    try:
        success = await service.delete(id)
        if not success:
            logger.warning(f"Company_capabilities with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Company_capabilities not found")
        
        logger.info(f"Company_capabilities {id} deleted successfully")
        return {"message": "Company_capabilities deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting company_capabilities {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")