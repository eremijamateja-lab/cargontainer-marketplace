---
last_updated: 2026-08-12T00:00:00Z
---

# Architecture Design

## System Overview
Full-stack logistics platform (Cargontainer) with React frontend + FastAPI backend. Forwarders create transport requests, carriers submit offers, and shipments are tracked through a multi-step lifecycle. Admin tooling includes company/member approval and Pilot Cleanup for safe test-data archival.

## Tech Stack
Frontend: React 18, TypeScript, Vite, TanStack React Query, shadcn/ui, Tailwind CSS
Backend: FastAPI, SQLAlchemy async, PostgreSQL (Atoms Cloud)
Deployment: Docker, AWS Lambda

## Module Design
| Module | Responsibility | Key Files |
|--------|---------------|-----------|
| Auth & Profiles | User login, role-based access, member_status | hooks/useAuth.ts, routers/user_profiles.py, models/user_profiles.py |
| Transport Requests | RFQ creation, marketplace listing | pages/Requests.tsx, models/transport_requests.py |
| Offers | Carrier offer submission, forwarder acceptance | pages/Offers.tsx, pages/Marketplace.tsx, routers/offers.py |
| Shipments | Lifecycle tracking, status progression | pages/Shipments.tsx, services/marketplace.py |
| Admin & Approvals | Company approval, member approval, edit company | pages/Admin.tsx, routers/admin.py |
| Pilot Cleanup | Test data scan + selective archive | pages/PilotCleanup.tsx, routers/cleanup.py |
| i18n | EN/SR translations, LanguageContext | lib/i18n.ts, contexts/LanguageContext.tsx |
| Data Layer | React Query hooks, cache invalidation | hooks/useAppQueries.ts, lib/queryKeys.ts |
| UI Components | Skeleton loading, Layout, shared UI | components/Skeleton.tsx, components/Layout.tsx |

## Tech Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| State management | TanStack React Query | Auto-invalidation after mutations, stale-while-revalidate, no manual refetch needed |
| Shipment status | 10-step enum (booked→delivered) | Matches real logistics lifecycle with border/customs/transit steps |
| API pattern | Custom FastAPI endpoints | Role-based access control, validated status progression |
| i18n approach | Custom t() + LanguageContext | Lightweight, reactive on language toggle, no heavy library needed |
| Test data cleanup | Soft-delete (archived_test status) | Reversible, no data loss, hidden from normal views |

## File Tree Plan
```
app/frontend/src/
├── hooks/useAppQueries.ts    # All React Query hooks + mutations
├── hooks/useAuth.ts          # Auth state management
├── lib/queryKeys.ts          # Centralized cache keys
├── lib/i18n.ts               # EN/SR translation dictionaries + helpers
├── contexts/LanguageContext.tsx # Global language state
├── components/Skeleton.tsx   # Loading skeleton components
├── components/Layout.tsx     # App shell with nav
├── pages/Dashboard.tsx       # Stats + recent activity
├── pages/Requests.tsx        # Forwarder RFQ management
├── pages/Marketplace.tsx     # Carrier browsing + offer submission
├── pages/Offers.tsx          # Offer review + acceptance
├── pages/Shipments.tsx       # Shipment lifecycle tracking
├── pages/Admin.tsx           # Admin panel (approvals, members, cleanup tabs)
├── pages/PilotCleanup.tsx    # Pilot Cleanup UI
├── pages/Company.tsx         # Company profile + member management
├── pages/Directory.tsx       # Public company directory
app/backend/
├── models/user_profiles.py   # User profile + member_status
├── models/shipments.py       # Shipment entity
├── services/marketplace.py   # Business logic (status validation, offer acceptance)
├── services/company.py       # Company + member management
├── routers/marketplace.py    # Marketplace API endpoints
├── routers/admin.py          # Admin endpoints (company/member management)
├── routers/cleanup.py        # Pilot Cleanup endpoints (scan + archive)
├── main.py                   # App entry + router auto-discovery
```

## Implementation Guide
- All mutations invalidate related query keys for automatic UI refresh
- Shipment status progression is validated server-side (forward-only)
- Delivered shipments become read-only
- Skeleton loading shown during initial data fetch
- Mobile: card layout replaces tables on small screens, horizontal pill timeline for shipments
- i18n: all pages subscribe to LanguageContext; t() calls re-render immediately on toggle
- Pilot Cleanup: admin-only, scan uses safe criteria, archive is soft-delete, protected records enforced

