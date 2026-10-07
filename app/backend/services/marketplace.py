import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional, List

from sqlalchemy import select, func, update, or_, text
from sqlalchemy.ext.asyncio import AsyncSession

from models.transport_requests import Transport_requests
from models.offers import Offers
from models.shipments import Shipments

logger = logging.getLogger(__name__)


class MarketplaceService:
    """Service for marketplace operations across entities"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_published_requests(self, skip: int = 0, limit: int = 20):
        """Get all transport requests visible in the marketplace.
        
        Includes requests with NULL status (treated as published) and
        requests with explicit marketplace-visible statuses.
        """
        try:
            allowed_statuses = ["published", "offers_received", "active", "open"]

            # Include NULL status (legacy/default) OR explicit allowed statuses
            status_filter = or_(
                Transport_requests.status.is_(None),
                func.lower(Transport_requests.status).in_(allowed_statuses)
            )

            query = select(Transport_requests).where(status_filter)
            count_query = select(func.count(Transport_requests.id)).where(status_filter)

            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

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
            logger.error(f"Error fetching published requests: {str(e)}")
            raise

    async def get_request_by_id(self, request_id: int) -> Optional[Transport_requests]:
        """Get any transport request by ID."""
        try:
            result = await self.db.execute(
                select(Transport_requests).where(Transport_requests.id == request_id)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching request {request_id}: {str(e)}")
            raise

    async def get_offers_for_request(self, request_id: int, user_id: str) -> List[Offers]:
        """Get all offers for a request. Owner sees all; carrier/provider sees own."""
        try:
            logger.info(f"get_offers_for_request: request_id={request_id}, user_id={user_id}")

            # Check if current user is the request owner
            req = await self.db.execute(
                select(Transport_requests).where(
                    Transport_requests.id == request_id,
                    Transport_requests.user_id == user_id,
                )
            )
            request_obj = req.scalar_one_or_none()

            if request_obj:
                # Owner sees ALL offers for their request
                logger.info(f"User {user_id} is owner of request {request_id} — returning all offers")
                result = await self.db.execute(
                    select(Offers)
                    .where(Offers.request_id == request_id)
                    .order_by(Offers.id.desc())
                )
                offers = result.scalars().all()
                logger.info(f"Found {len(offers)} offers for request {request_id}")
                return offers
            else:
                # Non-owner (carrier/provider) sees only their own offers for this request
                logger.info(f"User {user_id} is NOT owner of request {request_id} — returning own offers only")
                result = await self.db.execute(
                    select(Offers)
                    .where(
                        Offers.request_id == request_id,
                        Offers.user_id == user_id,
                    )
                    .order_by(Offers.id.desc())
                )
                offers = result.scalars().all()
                logger.info(f"Found {len(offers)} own offers for user {user_id} on request {request_id}")
                return offers
        except Exception as e:
            logger.error(f"Error fetching offers for request {request_id}: {str(e)}")
            raise

    async def update_tracking_link(
        self, request_id: int, tracking_link: str, carrier_user_id: str
    ) -> Optional[Transport_requests]:
        """Update tracking link on a transport request (carrier only)."""
        try:
            offer_result = await self.db.execute(
                select(Offers).where(
                    Offers.request_id == request_id,
                    Offers.user_id == carrier_user_id,
                    Offers.status == "accepted",
                )
            )
            offer_obj = offer_result.scalar_one_or_none()
            if not offer_obj:
                raise ValueError(
                    "No accepted offer found. Only the assigned carrier can add a tracking link."
                )

            req_result = await self.db.execute(
                select(Transport_requests).where(Transport_requests.id == request_id)
            )
            request_obj = req_result.scalar_one_or_none()
            if not request_obj:
                raise ValueError("Transport request not found")

            request_obj.tracking_link = tracking_link
            await self.db.commit()
            await self.db.refresh(request_obj)
            return request_obj
        except ValueError:
            await self.db.rollback()
            raise
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating tracking link: {str(e)}")
            raise

    async def get_my_shipments(self, user_id: str, skip: int = 0, limit: int = 50) -> list:
        """Get shipments for the current user — both as forwarder and carrier.

        Forwarder: Shipments.user_id == user_id
        Carrier: Shipments linked via offer where Offers.user_id == user_id

        Returns list of dicts (not ORM objects) to allow attaching tracking_link.
        """
        try:
            # Part A: Forwarder-owned shipments (archived test data excluded —
            # Pilot Cleanup marks rows with a status like 'archived_test'
            # instead of deleting them, so they must never surface here)
            owned_result = await self.db.execute(
                select(Shipments)
                .where(
                    Shipments.user_id == user_id,
                    or_(Shipments.status.is_(None), ~Shipments.status.like("archived%")),
                )
                .order_by(Shipments.id.desc())
                .offset(skip)
                .limit(limit)
            )
            owned_shipments = list(owned_result.scalars().all())
            owned_ids = {s.id for s in owned_shipments}

            # Part B: Carrier shipments via JOIN (transport offers)
            # ORM (not raw SQL) so the table names get the Postgres schema_translate_map —
            # unqualified raw "shipments" would resolve to the TMS table in Supabase.
            not_archived = or_(Shipments.status.is_(None), ~Shipments.status.like("archived%"))
            carrier_id_result = await self.db.execute(
                select(Shipments.id)
                .join(Offers, Shipments.offer_id == Offers.id)
                .where(Offers.user_id == user_id, not_archived)
                .order_by(Shipments.id.desc())
                .limit(limit)
                .offset(skip)
            )
            carrier_shipment_ids = [row[0] for row in carrier_id_result.fetchall()]

            # Part C: Customs agent shipments via customs_offer_id JOIN
            customs_id_result = await self.db.execute(
                select(Shipments.id)
                .join(Offers, Shipments.customs_offer_id == Offers.id)
                .where(Offers.user_id == user_id, not_archived)
                .order_by(Shipments.id.desc())
                .limit(limit)
                .offset(skip)
            )
            customs_shipment_ids = [row[0] for row in customs_id_result.fetchall()]

            # Fetch full objects for carrier/customs IDs not already in owned set
            all_extra_ids = set(carrier_shipment_ids + customs_shipment_ids) - owned_ids
            extra_shipments: list = []
            if all_extra_ids:
                extra_obj_result = await self.db.execute(
                    select(Shipments)
                    .where(Shipments.id.in_(list(all_extra_ids)))
                    .order_by(Shipments.id.desc())
                )
                extra_shipments = list(extra_obj_result.scalars().all())

            # Combine and sort
            all_shipments = owned_shipments + extra_shipments
            all_shipments.sort(key=lambda s: s.id, reverse=True)
            all_shipments = all_shipments[:limit]

            # Batch-fetch tracking links from transport_requests
            request_ids = [s.request_id for s in all_shipments if s.request_id]
            tracking_map: dict = {}
            if request_ids:
                tl_result = await self.db.execute(
                    select(Transport_requests.id, Transport_requests.tracking_link).where(
                        Transport_requests.id.in_(request_ids)
                    )
                )
                for row in tl_result.fetchall():
                    if row[1]:
                        tracking_map[row[0]] = row[1]

            # Convert to dicts with tracking_link attached
            result = []
            for s in all_shipments:
                d = {
                    "id": s.id,
                    "user_id": s.user_id,
                    "request_id": s.request_id,
                    "offer_id": s.offer_id,
                    "tracking_number": s.tracking_number,
                    "status": s.status,
                    "current_location": s.current_location,
                    "origin": s.origin,
                    "destination": s.destination,
                    "origin_country": getattr(s, "origin_country", None),
                    "destination_country": getattr(s, "destination_country", None),
                    "transport_category": getattr(s, "transport_category", None),
                    "additional_services": getattr(s, "additional_services", None),
                    "carrier_name": s.carrier_name,
                    "estimated_arrival": s.estimated_arrival,
                    "actual_arrival": s.actual_arrival,
                    "vehicle_plate": s.vehicle_plate,
                    "container_number": s.container_number,
                    "driver_name": getattr(s, "driver_name", None),
                    "driver_phone": getattr(s, "driver_phone", None),
                    "trailer_plate": getattr(s, "trailer_plate", None),
                    "carrier_email": getattr(s, "carrier_email", None),
                    "carrier_phone": getattr(s, "carrier_phone", None),
                    "operational_notes": getattr(s, "operational_notes", None),
                    "forwarder_notes": getattr(s, "forwarder_notes", None),
                    "customs_offer_id": getattr(s, "customs_offer_id", None),
                    "customs_agent_name": getattr(s, "customs_agent_name", None),
                    "customs_status": getattr(s, "customs_status", None),
                    "milestone_history": getattr(s, "milestone_history", None),
                    "tracking_link": tracking_map.get(s.request_id),
                    "created_at": s.created_at,
                    "updated_at": s.updated_at,
                }
                result.append(d)

            return result
        except Exception as e:
            logger.error(f"Error in get_my_shipments: {str(e)}")
            raise

    async def get_carrier_shipments(self, carrier_user_id: str, skip: int = 0, limit: int = 50) -> list:
        """Get shipments where the user is the assigned carrier."""
        try:
            id_result = await self.db.execute(
                select(Shipments.id)
                .join(Offers, Shipments.offer_id == Offers.id)
                .where(Offers.user_id == carrier_user_id)
                .order_by(Shipments.id.desc())
                .limit(limit)
                .offset(skip)
            )
            shipment_ids = [row[0] for row in id_result.fetchall()]

            if not shipment_ids:
                return []

            result = await self.db.execute(
                select(Shipments)
                .where(Shipments.id.in_(shipment_ids))
                .order_by(Shipments.id.desc())
            )
            return list(result.scalars().all())
        except Exception as e:
            logger.error(f"Error fetching carrier shipments: {str(e)}")
            raise

    # Valid status progression order (10-step operational milestones)
    STATUS_ORDER = [
        "booked",
        "picked_up",
        "in_transit",
        "border_exit",
        "in_transit_2",
        "customs",
        "in_transit_3",
        "arrived_at_delivery",
        "unloaded",
        "delivered",
    ]

    async def update_driver_details(
        self,
        shipment_id: int,
        user_id: str,
        driver_name: Optional[str] = None,
        driver_phone: Optional[str] = None,
        vehicle_plate: Optional[str] = None,
        trailer_plate: Optional[str] = None,
        container_number: Optional[str] = None,
        carrier_email: Optional[str] = None,
        carrier_phone: Optional[str] = None,
        operational_notes: Optional[str] = None,
        forwarder_notes: Optional[str] = None,
    ) -> Optional[Shipments]:
        """Update shipment details with role-based permissions.
        
        Carrier can edit: driver_name, driver_phone, vehicle_plate, trailer_plate,
                         container_number, carrier_email, carrier_phone, operational_notes
        Forwarder can edit: forwarder_notes ONLY (cannot overwrite carrier fields)
        """
        try:
            result = await self.db.execute(
                select(Shipments).where(Shipments.id == shipment_id)
            )
            shipment = result.scalar_one_or_none()
            if not shipment:
                raise ValueError("Shipment not found")

            # Check authorization: forwarder (owner) OR assigned carrier
            is_owner = str(shipment.user_id) == str(user_id)
            is_carrier = False
            if shipment.offer_id:
                offer_result = await self.db.execute(
                    select(Offers).where(
                        Offers.id == shipment.offer_id,
                        Offers.user_id == user_id,
                        Offers.status == "accepted",
                    )
                )
                is_carrier = offer_result.scalar_one_or_none() is not None

            if not is_owner and not is_carrier:
                raise ValueError("Only the forwarder or assigned carrier can update shipment details")

            if shipment.status == "delivered":
                raise ValueError("Delivered shipments cannot be updated")

            # Role-based field updates
            if is_carrier:
                # Carrier can update driver/vehicle/carrier note fields
                if driver_name is not None:
                    shipment.driver_name = driver_name
                if driver_phone is not None:
                    shipment.driver_phone = driver_phone
                if vehicle_plate is not None:
                    shipment.vehicle_plate = vehicle_plate
                if trailer_plate is not None:
                    shipment.trailer_plate = trailer_plate
                if container_number is not None:
                    shipment.container_number = container_number
                if carrier_email is not None:
                    shipment.carrier_email = carrier_email
                if carrier_phone is not None:
                    shipment.carrier_phone = carrier_phone
                if operational_notes is not None:
                    shipment.operational_notes = operational_notes

            if is_owner:
                # Forwarder can only update forwarder_notes
                if forwarder_notes is not None:
                    shipment.forwarder_notes = forwarder_notes

            shipment.updated_at = datetime.now(timezone.utc)

            await self.db.commit()
            await self.db.refresh(shipment)
            return shipment
        except ValueError:
            await self.db.rollback()
            raise
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating driver details: {str(e)}")
            raise

    async def update_shipment_status(
        self,
        shipment_id: int,
        new_status: str,
        carrier_user_id: str,
        current_location: Optional[str] = None,
        vehicle_plate: Optional[str] = None,
        container_number: Optional[str] = None,
    ) -> Optional[Shipments]:
        """Update shipment status. Only the assigned carrier can update. Forward-only."""
        try:
            result = await self.db.execute(
                select(Shipments).where(Shipments.id == shipment_id)
            )
            shipment = result.scalar_one_or_none()
            if not shipment:
                raise ValueError("Shipment not found")

            # Verify carrier ownership
            if shipment.offer_id:
                offer_result = await self.db.execute(
                    select(Offers).where(
                        Offers.id == shipment.offer_id,
                        Offers.user_id == carrier_user_id,
                        Offers.status == "accepted",
                    )
                )
                if not offer_result.scalar_one_or_none():
                    raise ValueError("Only the assigned carrier can update shipment status")
            else:
                raise ValueError("No offer linked to this shipment")

            # Validate status progression
            if new_status not in self.STATUS_ORDER:
                raise ValueError(f"Invalid status: {new_status}")

            current_idx = self.STATUS_ORDER.index(shipment.status) if shipment.status in self.STATUS_ORDER else -1
            new_idx = self.STATUS_ORDER.index(new_status)

            if new_idx <= current_idx:
                raise ValueError(
                    f"Cannot move from '{shipment.status}' to '{new_status}'. Status can only progress forward."
                )

            if shipment.status == "delivered":
                raise ValueError("Delivered shipments cannot be updated")

            # Update fields
            shipment.status = new_status
            if current_location is not None:
                shipment.current_location = current_location
            if vehicle_plate is not None:
                shipment.vehicle_plate = vehicle_plate
            if container_number is not None:
                shipment.container_number = container_number

            if new_status == "delivered":
                shipment.actual_arrival = datetime.now(timezone.utc).isoformat()

                if shipment.request_id:
                    request_result = await self.db.execute(
                        select(Transport_requests).where(
                            Transport_requests.id == shipment.request_id
                        )
                    )
                    request_obj = request_result.scalar_one_or_none()
                    if request_obj:
                        request_obj.status = "delivered"
                        request_obj.updated_at = datetime.now(timezone.utc)

            # Record milestone history
            now_iso = datetime.now(timezone.utc).isoformat()
            history: dict = {}
            if shipment.milestone_history:
                try:
                    history = json.loads(shipment.milestone_history)
                except (json.JSONDecodeError, TypeError):
                    history = {}
            history[new_status] = {
                "timestamp": now_iso,
                "updated_by": carrier_user_id,
            }
            shipment.milestone_history = json.dumps(history)

            shipment.updated_at = datetime.now(timezone.utc)

            await self.db.commit()
            await self.db.refresh(shipment)
            return shipment
        except ValueError:
            await self.db.rollback()
            raise
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating shipment status: {str(e)}")
            raise

    async def accept_offer(
        self, offer_id: int, request_id: int, user_id: str
    ) -> Optional[Shipments]:
        """Accept an offer with service_type-aware logic.
        
        Transport offers: creates shipment (or updates existing), rejects other transport offers only.
        Customs/T1 offers: attaches customs agent to existing shipment, rejects other customs_t1 offers only.
        """
        try:
            # Verify request ownership
            req_result = await self.db.execute(
                select(Transport_requests).where(
                    Transport_requests.id == request_id,
                    Transport_requests.user_id == user_id,
                )
            )
            request_obj = req_result.scalar_one_or_none()
            if not request_obj:
                raise ValueError("Transport request not found or not owned by user")

            # Get the offer
            offer_result = await self.db.execute(
                select(Offers).where(
                    Offers.id == offer_id,
                    Offers.request_id == request_id,
                )
            )
            offer_obj = offer_result.scalar_one_or_none()
            if not offer_obj:
                raise ValueError("Offer not found for this request")

            service_type = getattr(offer_obj, "service_type", None) or "transport"

            # Accept the offer
            offer_obj.status = "accepted"

            # Reject other offers of the SAME service_type only
            await self.db.execute(
                update(Offers)
                .where(
                    Offers.request_id == request_id,
                    Offers.id != offer_id,
                    Offers.status == "pending",
                    Offers.service_type == service_type,
                )
                .values(status="rejected")
            )

            if service_type == "transport":
                # Transport offer: create shipment
                request_obj.status = "in_progress"

                tracking_number = f"CRG-{uuid.uuid4().hex[:8].upper()}"

                initial_history = json.dumps({
                    "booked": {
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "updated_by": user_id,
                    }
                })
                shipment = Shipments(
                    user_id=user_id,
                    request_id=request_id,
                    offer_id=offer_id,
                    tracking_number=tracking_number,
                    status="booked",
                    current_location=request_obj.origin,
                    origin=request_obj.origin,
                    destination=request_obj.destination,
                    origin_country=getattr(request_obj, "origin_country", None),
                    destination_country=getattr(request_obj, "destination_country", None),
                    transport_category=getattr(request_obj, "transport_category", None),
                    additional_services=getattr(request_obj, "additional_services", None),
                    carrier_name=offer_obj.carrier_name,
                    milestone_history=initial_history,
                    estimated_arrival=None,
                    created_at=datetime.now(timezone.utc),
                )
                self.db.add(shipment)

                await self.db.commit()
                await self.db.refresh(shipment)
                logger.info(
                    f"Accepted transport offer {offer_id} for request {request_id}, "
                    f"created shipment {shipment.id}"
                )
                return shipment

            else:
                # Customs/T1 offer: attach to existing shipment for this request
                shipment_result = await self.db.execute(
                    select(Shipments).where(Shipments.request_id == request_id)
                )
                shipment = shipment_result.scalar_one_or_none()

                if shipment:
                    # Attach customs agent to existing shipment
                    shipment.customs_offer_id = offer_id
                    shipment.customs_agent_name = offer_obj.carrier_name
                    shipment.customs_status = "assigned"
                    shipment.updated_at = datetime.now(timezone.utc)
                else:
                    # No transport shipment yet — create a placeholder shipment
                    tracking_number = f"CRG-{uuid.uuid4().hex[:8].upper()}"
                    shipment = Shipments(
                        user_id=user_id,
                        request_id=request_id,
                        offer_id=None,
                        customs_offer_id=offer_id,
                        customs_agent_name=offer_obj.carrier_name,
                        customs_status="assigned",
                        tracking_number=tracking_number,
                        status="booked",
                        current_location=request_obj.origin,
                        origin=request_obj.origin,
                        destination=request_obj.destination,
                        origin_country=getattr(request_obj, "origin_country", None),
                        destination_country=getattr(request_obj, "destination_country", None),
                        transport_category=getattr(request_obj, "transport_category", None),
                        additional_services=getattr(request_obj, "additional_services", None),
                        carrier_name=None,
                        estimated_arrival=None,
                        created_at=datetime.now(timezone.utc),
                    )
                    self.db.add(shipment)

                # Update request status if not already in_progress
                if request_obj.status not in ("in_progress",):
                    request_obj.status = "in_progress"

                await self.db.commit()
                await self.db.refresh(shipment)
                logger.info(
                    f"Accepted customs_t1 offer {offer_id} for request {request_id}, "
                    f"attached to shipment {shipment.id}"
                )
                return shipment

        except ValueError:
            await self.db.rollback()
            raise
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error accepting offer {offer_id}: {str(e)}")
            raise

    async def reject_offer(
        self, offer_id: int, request_id: int, user_id: str
    ) -> bool:
        """Reject an offer. Only the RFQ owner can reject offers on their requests."""
        try:
            # Verify request ownership
            req_result = await self.db.execute(
                select(Transport_requests).where(
                    Transport_requests.id == request_id,
                    Transport_requests.user_id == user_id,
                )
            )
            request_obj = req_result.scalar_one_or_none()
            if not request_obj:
                raise ValueError("Transport request not found or not owned by user")

            # Get the offer and verify it belongs to this request
            offer_result = await self.db.execute(
                select(Offers).where(
                    Offers.id == offer_id,
                    Offers.request_id == request_id,
                )
            )
            offer_obj = offer_result.scalar_one_or_none()
            if not offer_obj:
                raise ValueError("Offer not found for this request")

            if offer_obj.status != "pending":
                raise ValueError(f"Cannot reject offer with status '{offer_obj.status}'. Only pending offers can be rejected.")

            # Reject the offer
            offer_obj.status = "rejected"
            offer_obj.updated_at = datetime.now(timezone.utc)

            await self.db.commit()
            logger.info(f"Rejected offer {offer_id} for request {request_id} by user {user_id}")
            return True

        except ValueError:
            await self.db.rollback()
            raise
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error rejecting offer {offer_id}: {str(e)}")
            raise

    async def get_received_offers(
        self, user_id: str, status_filter: Optional[str] = None, skip: int = 0, limit: int = 50
    ) -> list:
        """Get all offers received on RFQs owned by the user.
        
        This finds all transport_requests owned by user_id, then returns
        all offers on those requests, optionally filtered by status.
        """
        try:
            # Get all request IDs owned by this user
            req_result = await self.db.execute(
                select(Transport_requests.id).where(
                    Transport_requests.user_id == user_id
                )
            )
            my_request_ids = [row[0] for row in req_result.fetchall()]

            if not my_request_ids:
                return []

            # Build query for offers on those requests
            query = select(Offers).where(
                Offers.request_id.in_(my_request_ids)
            )

            if status_filter:
                query = query.where(Offers.status == status_filter)

            query = query.order_by(Offers.created_at.desc()).offset(skip).limit(limit)

            result = await self.db.execute(query)
            offers = result.scalars().all()
            return list(offers)

        except Exception as e:
            logger.error(f"Error fetching received offers for user {user_id}: {str(e)}")
            raise