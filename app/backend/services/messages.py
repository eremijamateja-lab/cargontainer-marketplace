import logging
from datetime import datetime, timezone
from typing import List, Optional, Tuple

from sqlalchemy import select, update, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from models.messages import Messages
from models.offers import Offers
from models.transport_requests import Transport_requests

logger = logging.getLogger(__name__)


class MessagesService:
    """Chat between a forwarder (request owner) and a carrier. Two thread
    kinds share the same table: offer-scoped (offer_id set) once an offer
    exists, and request-scoped (request_id + carrier_user_id set) so a
    carrier can ask the forwarder a question before submitting one."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def _authorize(self, offer_id: int, user_id: str) -> Tuple[Offers, Transport_requests]:
        """Confirm user_id is one of the two parties on this offer's
        negotiation (the carrier who made it, or the forwarder who owns
        the request it was made on). Raises ValueError otherwise."""
        offer_result = await self.db.execute(select(Offers).where(Offers.id == offer_id))
        offer = offer_result.scalar_one_or_none()
        if not offer:
            raise ValueError("Offer not found")

        request_result = await self.db.execute(
            select(Transport_requests).where(Transport_requests.id == offer.request_id)
        )
        request_obj = request_result.scalar_one_or_none()
        if not request_obj:
            raise ValueError("Request not found")

        if user_id not in (offer.user_id, request_obj.user_id):
            raise PermissionError("Not a party to this offer's negotiation")

        return offer, request_obj

    async def list_messages(self, offer_id: int, user_id: str) -> List[Messages]:
        await self._authorize(offer_id, user_id)

        result = await self.db.execute(
            select(Messages).where(Messages.offer_id == offer_id).order_by(Messages.id.asc())
        )
        messages = list(result.scalars().all())

        # Mark the other party's messages as read now that this user opened the thread
        unread_ids = [m.id for m in messages if m.sender_user_id != user_id and m.read_at is None]
        if unread_ids:
            await self.db.execute(
                update(Messages)
                .where(Messages.id.in_(unread_ids))
                .values(read_at=datetime.now(timezone.utc))
            )
            await self.db.commit()
            for m in messages:
                if m.id in unread_ids:
                    m.read_at = datetime.now(timezone.utc)

        return messages

    async def send_message(self, offer_id: int, user_id: str, sender_name: str, body: str) -> Messages:
        body = (body or "").strip()
        if not body:
            raise ValueError("Message cannot be empty")
        if len(body) > 4000:
            raise ValueError("Message is too long")

        await self._authorize(offer_id, user_id)

        message = Messages(
            offer_id=offer_id,
            sender_user_id=user_id,
            sender_name=sender_name,
            body=body,
            created_at=datetime.now(timezone.utc),
        )
        self.db.add(message)
        await self.db.commit()
        await self.db.refresh(message)
        return message

    async def _authorize_request_thread(
        self, request_id: int, user_id: str, carrier_user_id: Optional[str]
    ) -> Tuple[Transport_requests, str]:
        """Resolve which carrier's thread is being accessed and confirm
        user_id is a legitimate party to it. Returns (request, thread's
        carrier_user_id). Raises ValueError/PermissionError otherwise."""
        request_result = await self.db.execute(
            select(Transport_requests).where(Transport_requests.id == request_id)
        )
        request_obj = request_result.scalar_one_or_none()
        if not request_obj:
            raise ValueError("Request not found")

        if user_id == request_obj.user_id:
            # Forwarder viewing/replying to one specific carrier's thread
            if not carrier_user_id:
                raise ValueError("carrier_user_id is required for the request owner")
            return request_obj, carrier_user_id

        # Anyone else is acting as a carrier — always their own thread
        return request_obj, user_id

    async def list_request_messages(
        self, request_id: int, user_id: str, carrier_user_id: Optional[str] = None
    ) -> List[Messages]:
        request_obj, thread_carrier_id = await self._authorize_request_thread(
            request_id, user_id, carrier_user_id
        )

        result = await self.db.execute(
            select(Messages)
            .where(Messages.request_id == request_id, Messages.carrier_user_id == thread_carrier_id)
            .order_by(Messages.id.asc())
        )
        messages = list(result.scalars().all())

        unread_ids = [m.id for m in messages if m.sender_user_id != user_id and m.read_at is None]
        if unread_ids:
            await self.db.execute(
                update(Messages)
                .where(Messages.id.in_(unread_ids))
                .values(read_at=datetime.now(timezone.utc))
            )
            await self.db.commit()
            for m in messages:
                if m.id in unread_ids:
                    m.read_at = datetime.now(timezone.utc)

        return messages

    async def send_request_message(
        self,
        request_id: int,
        user_id: str,
        sender_name: str,
        body: str,
        carrier_user_id: Optional[str] = None,
    ) -> Messages:
        body = (body or "").strip()
        if not body:
            raise ValueError("Message cannot be empty")
        if len(body) > 4000:
            raise ValueError("Message is too long")

        request_obj, thread_carrier_id = await self._authorize_request_thread(
            request_id, user_id, carrier_user_id
        )

        message = Messages(
            request_id=request_id,
            carrier_user_id=thread_carrier_id,
            sender_user_id=user_id,
            sender_name=sender_name,
            body=body,
            created_at=datetime.now(timezone.utc),
        )
        self.db.add(message)
        await self.db.commit()
        await self.db.refresh(message)
        return message

    async def list_request_threads(self, request_id: int, user_id: str) -> List[dict]:
        """Forwarder-only inbox: one row per carrier who has messaged
        about this request, with their last message and unread count."""
        request_result = await self.db.execute(
            select(Transport_requests).where(Transport_requests.id == request_id)
        )
        request_obj = request_result.scalar_one_or_none()
        if not request_obj:
            raise ValueError("Request not found")
        if request_obj.user_id != user_id:
            raise PermissionError("Only the request owner can view its message threads")

        result = await self.db.execute(
            select(Messages).where(Messages.request_id == request_id).order_by(Messages.id.asc())
        )
        messages = list(result.scalars().all())

        threads: dict = {}
        for m in messages:
            th = threads.setdefault(m.carrier_user_id, {
                "carrier_user_id": m.carrier_user_id,
                "carrier_name": None,
                "last_message": None,
                "last_created_at": None,
                "unread_count": 0,
            })
            if m.sender_user_id == m.carrier_user_id:
                th["carrier_name"] = m.sender_name
            th["last_message"] = m.body
            th["last_created_at"] = m.created_at
            if m.sender_user_id != user_id and m.read_at is None:
                th["unread_count"] += 1

        return sorted(threads.values(), key=lambda t: t["last_created_at"] or datetime.min, reverse=True)

    async def list_my_threads(self, user_id: str) -> List[dict]:
        """Unified inbox: every conversation (offer-scoped or request-scoped
        pre-offer inquiry) this user is a party to, one row per thread, with
        the counterpart's name, route context, last message and unread
        count — enough to open the thread directly, no navigating through
        the offers list to find it."""
        threads: dict = {}

        # --- Offer-scoped threads ---
        offer_rows = await self.db.execute(
            select(Messages, Offers, Transport_requests)
            .join(Offers, Messages.offer_id == Offers.id)
            .join(Transport_requests, Offers.request_id == Transport_requests.id)
            .where(or_(Offers.user_id == user_id, Transport_requests.user_id == user_id))
            .order_by(Messages.id.asc())
        )
        for m, offer, req in offer_rows.all():
            key = f"offer:{offer.id}"
            is_carrier = user_id == offer.user_id
            counterpart_name = req.user_company if is_carrier else (offer.carrier_name or "—")
            th = threads.setdefault(key, {
                "thread_key": key,
                "kind": "offer",
                "offer_id": offer.id,
                "request_id": req.id,
                "carrier_user_id": None,
                "counterpart_name": counterpart_name or "—",
                "route": f"{req.origin} → {req.destination}" if req.destination else (req.origin or ""),
                "last_message": None,
                "last_created_at": None,
                "unread_count": 0,
            })
            th["last_message"] = m.body
            th["last_created_at"] = m.created_at
            if m.sender_user_id != user_id and m.read_at is None:
                th["unread_count"] += 1

        # --- Request-scoped (pre-offer) threads ---
        own_request_ids_sql = select(Transport_requests.id).where(Transport_requests.user_id == user_id)
        own_request_ids = set((await self.db.execute(own_request_ids_sql)).scalars().all())

        request_rows = await self.db.execute(
            select(Messages, Transport_requests)
            .join(Transport_requests, Messages.request_id == Transport_requests.id)
            .where(
                Messages.request_id.isnot(None),
                or_(Messages.carrier_user_id == user_id, Transport_requests.user_id == user_id),
            )
            .order_by(Messages.id.asc())
        )
        for m, req in request_rows.all():
            key = f"request:{req.id}:{m.carrier_user_id}"
            is_forwarder = user_id == req.user_id
            th = threads.setdefault(key, {
                "thread_key": key,
                "kind": "request",
                "offer_id": None,
                "request_id": req.id,
                "carrier_user_id": m.carrier_user_id,
                "counterpart_name": (req.user_company or "—") if not is_forwarder else "—",
                "route": f"{req.origin} → {req.destination}" if req.destination else (req.origin or ""),
                "last_message": None,
                "last_created_at": None,
                "unread_count": 0,
            })
            # Carrier's own display name comes from their own messages (sender_name)
            if m.sender_user_id == m.carrier_user_id and is_forwarder:
                th["counterpart_name"] = m.sender_name or th["counterpart_name"]
            th["last_message"] = m.body
            th["last_created_at"] = m.created_at
            if m.sender_user_id != user_id and m.read_at is None:
                th["unread_count"] += 1

        return sorted(threads.values(), key=lambda t: t["last_created_at"] or datetime.min, reverse=True)

    async def unread_count(self, user_id: str) -> int:
        """Count unread messages across every thread this user is a party
        to — offer-scoped (carrier or forwarder) and request-scoped
        (carrier's own pre-offer thread, or forwarder's requests)."""
        own_request_ids_sql = select(Transport_requests.id).where(Transport_requests.user_id == user_id)
        own_request_ids = (await self.db.execute(own_request_ids_sql)).scalars().all()

        offer_sql = select(Messages).join(Offers, Messages.offer_id == Offers.id).join(
            Transport_requests, Offers.request_id == Transport_requests.id
        ).where(
            Messages.sender_user_id != user_id,
            Messages.read_at.is_(None),
            or_(Offers.user_id == user_id, Transport_requests.user_id == user_id),
        )
        offer_result = await self.db.execute(offer_sql)
        count = len(offer_result.scalars().all())

        request_filters = [Messages.carrier_user_id == user_id]
        if own_request_ids:
            request_filters.append(
                and_(Messages.request_id.in_(own_request_ids), Messages.carrier_user_id.isnot(None))
            )
        request_sql = select(Messages).where(
            Messages.request_id.isnot(None),
            Messages.sender_user_id != user_id,
            Messages.read_at.is_(None),
            or_(*request_filters),
        )
        request_result = await self.db.execute(request_sql)
        count += len(request_result.scalars().all())

        return count
