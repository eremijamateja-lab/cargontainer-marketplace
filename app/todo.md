# Cargontainer MVP - Role-Based Multi-User Platform

## Design Guidelines
- **Style**: Clean, professional logistics platform — white/blue theme
- **Color Palette**: Primary #2563EB (Blue-600), Background #F9FAFB (Gray-50), Cards #FFFFFF, Text #111827 (Gray-900)
- **Typography**: System default sans-serif, clean and readable
- **Existing images**: Already generated, reuse from CDN

## Architecture
- Backend: Atoms Cloud with user_profiles, transport_requests, offers, shipments tables
- Frontend: React + shadcn/ui + Tailwind CSS
- Auth: Built-in auth via web-sdk
- Role system: forwarder, trucking, rail, terminal stored in user_profiles

## Database Tables (existing)
- `user_profiles` (create_only=true): id, user_id, role, company_name, display_name, created_at
- `transport_requests` (create_only=true): id, user_id, title, origin, destination, container_type, container_count, cargo_description, weight_kg, preferred_date, deadline_date, special_requirements, status, user_role, user_company, tracking_link, created_at
- `offers` (create_only=true): id, user_id, request_id, price, currency, estimated_days, transport_mode, notes, status, carrier_name, created_at
- `shipments` (create_only=true): id, user_id, request_id, offer_id, tracking_number, status, current_location, origin, destination, carrier_name, estimated_arrival, actual_arrival, created_at

## API Endpoints
- `GET /api/v1/profile/me` — Get current user's profile ✅
- `POST /api/v1/profile/me` — Create/update current user's profile ✅
- `GET /api/v1/marketplace/requests` — All open requests ✅
- `GET /api/v1/marketplace/offers?request_id=X` — Offers for a request (query param) ✅
- `GET /api/v1/marketplace/offers/by-request/{request_id}` — Offers for a request (path param) ✅
- `POST /api/v1/marketplace/accept-offer` — Accept offer ✅
- `POST /api/v1/marketplace/update-tracking-link` — Carrier updates tracking link ✅
- `GET /api/v1/marketplace/my-offers` — Current user's submitted offers ✅
- `GET /api/v1/marketplace/carrier-shipments` — Carrier's assigned shipments ✅

## Files to Create/Modify

### Backend (2 files)
1. `backend/routers/profile.py` — Custom API for /api/v1/profile/me (GET + POST)
2. `backend/routers/marketplace.py` — Add GET /api/v1/marketplace/my-offers endpoint

### Frontend (6 files)
3. `frontend/src/pages/Onboarding.tsx` — Role selection + company name form
4. `frontend/src/components/Layout.tsx` — Role-aware navigation
5. `frontend/src/pages/Dashboard.tsx` — Role-aware stats and recent activity
6. `frontend/src/pages/Requests.tsx` — Forwarder: create + manage requests
7. `frontend/src/pages/Marketplace.tsx` — Transport companies: browse + submit offers
8. `frontend/src/pages/Offers.tsx` — Role-aware: forwarders see received, carriers see sent

## Role-Based Navigation
- **Forwarder**: Dashboard, Create Request, My Offers (received), My Transports
- **Trucking/Rail**: Dashboard, Open Requests (marketplace), My Offers (sent), My Transports
- **Terminal**: Dashboard, All Requests (read-only)

## Status Workflow
- Transport Request: open → offers_received → assigned → in_progress → delivered
- Offer: pending → accepted/rejected
- Shipment: booked → picked_up → in_transit → customs → delivered