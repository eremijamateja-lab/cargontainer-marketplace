import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.company_capabilities import Company_capabilities

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class Company_capabilitiesService:
    """Service layer for Company_capabilities operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any]) -> Optional[Company_capabilities]:
        """Create a new company_capabilities"""
        try:
            obj = Company_capabilities(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created company_capabilities with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating company_capabilities: {str(e)}")
            raise

    async def get_by_id(self, obj_id: int) -> Optional[Company_capabilities]:
        """Get company_capabilities by ID"""
        try:
            query = select(Company_capabilities).where(Company_capabilities.id == obj_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching company_capabilities {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of company_capabilitiess"""
        try:
            query = select(Company_capabilities)
            count_query = select(func.count(Company_capabilities.id))
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Company_capabilities, field):
                        query = query.where(getattr(Company_capabilities, field) == value)
                        count_query = count_query.where(getattr(Company_capabilities, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Company_capabilities, field_name):
                        query = query.order_by(getattr(Company_capabilities, field_name).desc())
                else:
                    if hasattr(Company_capabilities, sort):
                        query = query.order_by(getattr(Company_capabilities, sort))
            else:
                query = query.order_by(Company_capabilities.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching company_capabilities list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any]) -> Optional[Company_capabilities]:
        """Update company_capabilities"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Company_capabilities {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated company_capabilities {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating company_capabilities {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int) -> bool:
        """Delete company_capabilities"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Company_capabilities {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted company_capabilities {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting company_capabilities {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Company_capabilities]:
        """Get company_capabilities by any field"""
        try:
            if not hasattr(Company_capabilities, field_name):
                raise ValueError(f"Field {field_name} does not exist on Company_capabilities")
            result = await self.db.execute(
                select(Company_capabilities).where(getattr(Company_capabilities, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching company_capabilities by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Company_capabilities]:
        """Get list of company_capabilitiess filtered by field"""
        try:
            if not hasattr(Company_capabilities, field_name):
                raise ValueError(f"Field {field_name} does not exist on Company_capabilities")
            result = await self.db.execute(
                select(Company_capabilities)
                .where(getattr(Company_capabilities, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Company_capabilities.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching company_capabilitiess by {field_name}: {str(e)}")
            raise