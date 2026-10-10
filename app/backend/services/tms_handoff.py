"""Accepted Marketplace offer -> "📥 Novo sa Marketplace-a" inbox in Cargontainer TMS Agency.

Supabase mode only. After a forwarder accepts a transport offer, one row is written to
public.marketplace_handoffs (table + RLS + RPCs live in the cargontainer-tms repo,
migration 20261010090000_marketplace_handoffs.sql). TMS Agency shows it to the forwarder's
company and builds the shipment itself through its normal "Novi transport" wizard,
pre-filled from `payload`, so the Marketplace never writes Agency's shipment format.

Never raises: a failed hand-off must not undo or fail the offer acceptance.
"""
import json
import logging
from typing import Optional

from core.config import settings
from models.companies import Companies
from models.offers import Offers
from models.shipments import Shipments
from models.transport_requests import Transport_requests
from models.user_profiles import User_profiles
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


async def _company_of(db: AsyncSession, user_id: str) -> Optional[Companies]:
    row = await db.execute(
        select(Companies).join(User_profiles, User_profiles.company_id == Companies.id).where(
            User_profiles.user_id == str(user_id)
        )
    )
    return row.scalars().first()


def _company_block(co: Optional[Companies], fallback_name: Optional[str] = None) -> dict:
    return {
        "name": (co.company_name if co else None) or fallback_name,
        "vat_number": co.vat_number if co else None,
        "email": co.email if co else None,
        "phone": co.phone if co else None,
        "address": co.address if co else None,
        "city": co.city if co else None,
        "country": co.country if co else None,
    }


def build_payload(
    req: Transport_requests,
    offer: Offers,
    shipment: Shipments,
    carrier: Optional[Companies],
    forwarder: Optional[Companies] = None,
) -> dict:
    return {
        "source": "marketplace",
        "request": {
            "id": req.id,
            "origin": req.origin,
            "origin_country": req.origin_country,
            "destination": req.destination,
            "destination_country": req.destination_country,
            "preferred_date": req.preferred_date,
            "deadline_date": req.deadline_date,
            "transport_category": req.transport_category,
            "transport_mode": req.transport_mode,
            "vehicle_type": req.vehicle_type,
            "container_type": req.container_type,
            "container_count": req.container_count,
            "cargo_description": req.cargo_description,
            "weight_kg": req.weight_kg,
            "special_requirements": req.special_requirements,
        },
        "offer": {
            "id": offer.id,
            "price": offer.price,
            "currency": offer.currency,
            "estimated_days": offer.estimated_days,
            "notes": offer.notes,
        },
        "carrier": _company_block(carrier, offer.carrier_name),
        # the forwarder = the carrier's client on the TMS Carrier side
        "forwarder": _company_block(forwarder, req.user_company),
        "marketplace_shipment": {"id": shipment.id, "tracking_number": shipment.tracking_number},
    }


async def create_handoff(db: AsyncSession, shipment: Shipments) -> None:
    if not settings.is_supabase or not shipment or not shipment.offer_id or not shipment.request_id:
        return
    try:
        req = await db.get(Transport_requests, shipment.request_id)
        offer = await db.get(Offers, shipment.offer_id)
        if not req or not offer or (offer.service_type or "transport") != "transport":
            return
        forwarder = await _company_of(db, req.user_id)
        if not forwarder or not forwarder.shared_company_id:
            return
        carrier = await _company_of(db, offer.user_id)
        payload = build_payload(req, offer, shipment, carrier, forwarder)
        await db.execute(
            text(
                """
                insert into public.marketplace_handoffs
                  (agency_company_id, carrier_company_id, marketplace_request_id, marketplace_offer_id,
                   marketplace_shipment_id, tracking_number, payload)
                values (cast(:agency as uuid), cast(:carrier as uuid), :req, :offer, :ship, :trk, cast(:payload as jsonb))
                on conflict (marketplace_offer_id) do nothing
                """
            ),
            {
                "agency": forwarder.shared_company_id,
                "carrier": carrier.shared_company_id if carrier else None,
                "req": req.id,
                "offer": offer.id,
                "ship": shipment.id,
                "trk": shipment.tracking_number,
                "payload": json.dumps(payload, ensure_ascii=False, default=str),
            },
        )
        await db.commit()
        logger.info("TMS hand-off created for offer %s (shipment %s)", offer.id, shipment.id)
    except Exception:
        await db.rollback()
        logger.exception("TMS hand-off failed for shipment %s", getattr(shipment, "id", None))
