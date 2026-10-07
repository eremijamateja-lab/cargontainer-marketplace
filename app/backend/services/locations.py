import logging
import unicodedata
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.locations import Locations

logger = logging.getLogger(__name__)


def fold_diacritics(text: str) -> str:
    """Lowercase + strip diacritics so 'sabac' matches 'Šabac', 'munchen'
    matches 'München', etc. Covers every European accented letter."""
    if not text:
        return ""
    nfkd = unicodedata.normalize("NFKD", text)
    result = "".join(c for c in nfkd if not unicodedata.combining(c))
    # A few letters NFKD doesn't decompose into base + accent
    result = (
        result.replace("ł", "l").replace("Ł", "L")  # ł/Ł
        .replace("ß", "ss")  # ß
        .replace("đ", "d").replace("Đ", "D")  # đ/Đ
    )
    return result.lower()


# ------------------ Service Layer ------------------
class LocationsService:
    """Service layer for Locations operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any]) -> Optional[Locations]:
        """Create a new locations"""
        try:
            data = dict(data)
            data["search_key"] = fold_diacritics(
                f'{data.get("city", "")} {data.get("postal_code", "") or ""} {data.get("location_name", "")}'
            )
            obj = Locations(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created locations with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating locations: {str(e)}")
            raise

    async def get_by_id(self, obj_id: int) -> Optional[Locations]:
        """Get locations by ID"""
        try:
            query = select(Locations).where(Locations.id == obj_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching locations {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of locationss"""
        try:
            query = select(Locations)
            count_query = select(func.count(Locations.id))
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Locations, field):
                        query = query.where(getattr(Locations, field) == value)
                        count_query = count_query.where(getattr(Locations, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Locations, field_name):
                        query = query.order_by(getattr(Locations, field_name).desc())
                else:
                    if hasattr(Locations, sort):
                        query = query.order_by(getattr(Locations, sort))
            else:
                query = query.order_by(Locations.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching locations list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any]) -> Optional[Locations]:
        """Update locations"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Locations {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)

            if any(k in update_data for k in ("city", "postal_code", "location_name")):
                obj.search_key = fold_diacritics(
                    f"{obj.city} {obj.postal_code or ''} {obj.location_name}"
                )

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated locations {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating locations {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int) -> bool:
        """Delete locations"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Locations {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted locations {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting locations {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Locations]:
        """Get locations by any field"""
        try:
            if not hasattr(Locations, field_name):
                raise ValueError(f"Field {field_name} does not exist on Locations")
            result = await self.db.execute(
                select(Locations).where(getattr(Locations, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching locations by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Locations]:
        """Get list of locationss filtered by field"""
        try:
            if not hasattr(Locations, field_name):
                raise ValueError(f"Field {field_name} does not exist on Locations")
            result = await self.db.execute(
                select(Locations)
                .where(getattr(Locations, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Locations.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching locationss by {field_name}: {str(e)}")
            raise

    async def autocomplete(
        self, search: str, country_code: Optional[str] = None, limit: int = 10
    ) -> List[Locations]:
        """Search locations by city name or postal code for autocomplete.

        Matches against the diacritic-folded search_key so a plain ASCII
        search ("sabac", "munchen") finds accented names ("Šabac",
        "München") — falls back to the raw fields for any row whose
        search_key hasn't been backfilled yet.
        """
        try:
            from sqlalchemy import or_

            query = select(Locations)

            folded = f"%{fold_diacritics(search)}%"
            search_lower = f"%{search.lower()}%"
            if self.db.bind.dialect.name == "postgresql":
                # Supabase: every row's search_key is backfilled by scripts/seed_locations_supabase.py
                # and trigram-indexed; the raw-field fallbacks below would force a seq scan
                # over ~600k rows.
                query = query.where(Locations.search_key.like(folded))
            else:
                query = query.where(
                    or_(
                        Locations.search_key.like(folded),
                        func.lower(Locations.city).like(search_lower),
                        func.lower(Locations.postal_code).like(search_lower),
                        func.lower(Locations.location_name).like(search_lower),
                    )
                )

            # Optionally filter by country
            if country_code:
                query = query.where(Locations.country_code == country_code.upper())

            query = query.order_by(Locations.city).limit(limit)
            result = await self.db.execute(query)
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error in autocomplete search: {str(e)}")
            raise