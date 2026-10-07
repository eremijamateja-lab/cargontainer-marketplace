import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.transport_requests import Transport_requests

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class Transport_requestsService:
    """Service layer for Transport_requests operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any], user_id: Optional[str] = None) -> Optional[Transport_requests]:
        """Create a new transport_requests"""
        try:
            if user_id:
                data['user_id'] = user_id
            obj = Transport_requests(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created transport_requests with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating transport_requests: {str(e)}")
            raise

    async def check_ownership(self, obj_id: int, user_id: str) -> bool:
        """Check if user owns this record"""
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id)
            return obj is not None
        except Exception as e:
            logger.error(f"Error checking ownership for transport_requests {obj_id}: {str(e)}")
            return False

    async def get_by_id(self, obj_id: int, user_id: Optional[str] = None) -> Optional[Transport_requests]:
        """Get transport_requests by ID (user can only see their own records)"""
        try:
            query = select(Transport_requests).where(Transport_requests.id == obj_id)
            if user_id:
                query = query.where(Transport_requests.user_id == user_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching transport_requests {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        user_id: Optional[str] = None,
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of transport_requestss (user can only see their own records)"""
        try:
            query = select(Transport_requests)
            count_query = select(func.count(Transport_requests.id))
            
            if user_id:
                query = query.where(Transport_requests.user_id == user_id)
                count_query = count_query.where(Transport_requests.user_id == user_id)
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Transport_requests, field):
                        query = query.where(getattr(Transport_requests, field) == value)
                        count_query = count_query.where(getattr(Transport_requests, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Transport_requests, field_name):
                        query = query.order_by(getattr(Transport_requests, field_name).desc())
                else:
                    if hasattr(Transport_requests, sort):
                        query = query.order_by(getattr(Transport_requests, sort))
            else:
                query = query.order_by(Transport_requests.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching transport_requests list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any], user_id: Optional[str] = None) -> Optional[Transport_requests]:
        """Update transport_requests (requires ownership)"""
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id)
            if not obj:
                logger.warning(f"Transport_requests {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key) and key != 'user_id':
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated transport_requests {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating transport_requests {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int, user_id: Optional[str] = None) -> bool:
        """Delete transport_requests (requires ownership)"""
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id)
            if not obj:
                logger.warning(f"Transport_requests {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted transport_requests {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting transport_requests {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Transport_requests]:
        """Get transport_requests by any field"""
        try:
            if not hasattr(Transport_requests, field_name):
                raise ValueError(f"Field {field_name} does not exist on Transport_requests")
            result = await self.db.execute(
                select(Transport_requests).where(getattr(Transport_requests, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching transport_requests by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Transport_requests]:
        """Get list of transport_requestss filtered by field"""
        try:
            if not hasattr(Transport_requests, field_name):
                raise ValueError(f"Field {field_name} does not exist on Transport_requests")
            result = await self.db.execute(
                select(Transport_requests)
                .where(getattr(Transport_requests, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Transport_requests.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching transport_requestss by {field_name}: {str(e)}")
            raise