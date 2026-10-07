---
last_updated: 2026-08-12T00:00:00Z
---

# Requirements & Progress

## Requirements Overview
Operational improvements: dynamic request forms by transport type, location/postal code database with autocomplete, remove Kosovo, multi-user company support, enhanced location display on cards.

## User Stories

## Task Breakdown
- [x] Dynamic request form by transport type (show/hide fields based on Container/Truck/Rail/Oversized)
- [x] Create locations table + seed data for 12 countries + autocomplete API endpoint
- [x] Build LocationAutocomplete frontend component
- [x] Remove Kosovo (XK) from country lists
- [x] Multi-user company support (invite members, shared workspace)
- [x] Display structured location info on cards and share messages
- [x] Stability verification (lint + build pass)
- [x] Shipment milestone history: 8-step status flow + milestone_history JSON column + expandable UI
- [x] Transport structure rework: FTL/LTL mode + vehicle type for Truck/Van
- [x] Customs-only request type with proper customs fields
- [x] i18n audit: complete EN/SR translations for all features (full audit pass — all hardcoded strings replaced with t() keys across Offers, Requests, Onboarding, Shipments, Company, Contact, Marketplace, Dashboard pages)
- [x] Filter system redesign: dropdown-based compact filters
- [x] Company capabilities cleanup: remove vehicle count, add capability fields
- [x] Full translation correction: all micro UI text, badges, status labels, timeline labels, filter dropdowns, form buttons now language-aware
- [x] Admin/test account seed endpoint created with reset capability
- [x] Global language sync: LanguageContext + all pages subscribe to language changes for consistent EN/SR rendering
- [x] Final Translation Cleanup: nav.admin SR→"Admin panel", shipping_line SR→"Brodska linija / NVOCC", Company placeholders/status strings localized (placeholderFullName, placeholderEmail, adding, unnamed), lint empty-catch fix
- [x] Verified legal fields locking: approved non-admin users see company_name, roles, country, city, vat_number as read-only with lock indicators
- [x] Backend enforcement: LOCKED_FIELDS in CompanyService.update_company() silently skips locked fields for non-admin users
- [x] Admin Panel Edit Company: expanded edit form with approval_status, email, phone, website, description, address fields
- [x] Admin endpoint expanded: /api/v1/admin/update-company accepts all verified+contact fields
- [x] i18n keys added for admin edit fields and company lock helper text (EN+SR)
- [x] Member approval workflow: backend member_status column + admin member-status endpoint (approve/reject/deactivate/reactivate)
- [x] Member approval workflow: frontend Company.tsx shows member status badges + pending helper
- [x] Member approval workflow: Admin.tsx Company Members modal with status counts + action buttons
- [x] Member approval workflow: invite_member creates members as pending (not active)
- [x] Pilot Cleanup: backend scan endpoint identifies test data by email/company name criteria
- [x] Pilot Cleanup: backend archive endpoint with soft-delete (archived_test status), protected records enforcement
- [x] Pilot Cleanup: frontend PilotCleanup component with scan, selection, confirmation modal (type DELETE)
- [x] Pilot Cleanup: integrated as tab in Admin panel (admin-only), i18n EN+SR complete
- [x] Pilot Cleanup: lint + build + py_compile pass
- [x] Pilot Cleanup i18n fix: connected to LanguageContext, all labels use t() keys, status badges formatted, immediate language switch reactivity
- [x] Logo update: user-provided EN/SR logo images (with built-in slogan) replace old logo; text tagline removed from Layout, Login, Index, Onboarding

## Stable Checkpoints
| Checkpoint | Date | Description |
|------------|------|-------------|
| **MVP-1** | 2026-08-09 | **Cargontainer MVP Stable Checkpoint — Approval + RFQ + Offers Flow Working** |
| **MVP-2** | 2026-08-09 | **Cargontainer MVP Stable Checkpoint — Full i18n + Translation Reactivity** |
| **MVP-3** | 2026-08-09 | **Cargontainer MVP Stable Checkpoint 3 — Company Admin + Member Approval** |
| **MVP-4** | 2026-08-14 | **Cargontainer MVP Stable Checkpoint 4 — Pilot Cleanup Ready** |

### MVP-4 Confirmed Working Features (14.08.2026):
- Pilot Cleanup visible only to admin
- Test RFQs/offers/transports detected
- Admin can select/deselect test data
- Archive confirmation requires typing DELETE
- Selected test data can be archived safely
- Archived counts update correctly
- Pilot Cleanup Serbian/English translation works
- Status labels are formatted, not raw enum values
- Existing approval/RFQ/offer/transport/member flows still work

### MVP-3 Confirmed Working Features (09.08.2026):
- Admin Panel shows all companies
- Admin can edit company details
- Admin can open Company Members
- Admin can see active/pending/inactive/rejected member counts
- Company can add members
- Admin can activate/deactivate members
- Active member count is visible for future billing control
- Existing company approval flow still works
- Existing RFQ/offer/transport flow still works
- Serbian/English translation still works

### MVP-2 Confirmed Working Features (09.08.2026):
- Admin login
- New company registration
- Pending approval flow
- Admin approval of companies
- Approved company marketplace access
- RFQ creation
- RFQ visible in marketplace
- Offer submission
- Submitted offer visible to sender
- Received offer visible to RFQ owner
- Offer status and comments visible on both sides
- Accept/reject offer flow
- Transport/status flow
- Serbian/English translation looks good (all pages reactive on language toggle)
- Regression test after translation passed

### MVP-1 Confirmed Working Features:
- Admin login (eremija.mateja@gmail.com / Cargontainer2026!)
- New company registration
- Pending approval flow
- Admin approval of companies
- Approved company marketplace access
- RFQ creation
- RFQ visible in marketplace
- Offer submission by carriers/providers
- Received offers visible to RFQ owner
- Submitted offers visible to offer sender
- Accept/reject offer flow
- Comments/statuses visible on both sides
- All test accounts functional (forwarder, carrier, customs, pending, rejected)
- Auto-seed of passwords on server startup (prevents OAuth-only lockout)

## Progress Log
- 2026-05-24: Started implementation of 6 operational improvements (dynamic forms, locations DB, remove Kosovo, multi-user company, location display, stability)
- 2026-05-24: Completed: dynamic form by transport type, locations table with 48 cities seeded across 12 countries, autocomplete API endpoint, LocationAutocomplete component, removed Kosovo from country list, lint+build pass
- 2026-05-24: Completed: Shipment milestone history — expanded status flow to 8 steps (added arrived_at_delivery, unloaded), added milestone_history JSON column to DB, backend records timestamps on each status change, frontend shows expandable status history with timestamps
- 2026-05-24: Completed: Multi-user company support — added invite/join/remove member endpoints, frontend invite UI with role selection, admin-only member management, capabilities cleanup (transport_modes, vehicle_types, transport_categories as arrays, removed vehicle_count dependency)
- 2026-05-24: Completed: Filter system redesign — separate Origin/Destination country dropdowns, Mode filter only shows for Truck/Van category, clear-all resets all filters. Added Driver role to company members with limited access description. Extended shipment status to 10-step flow (added in_transit_2, in_transit_3 between border/customs/delivery). Milestone history now shows duration between steps. EN/SR i18n updated for all new filter labels.
- 2026-06-15: Fixed Find Company / Company Directory page visibility. Backend get_directory now uses correct visibility filter: approval_status='approved' OR NULL (legacy), and is_public=TRUE OR NULL. Frontend Directory.tsx updated to use parseCompanyRoles + COMPANY_ROLE_MAP for professional role labels. Defensive rendering for missing fields. Database fix: set is_public=TRUE for companies with NULL value.
- 2026-06-18: Fixed RFQ offer submission and visibility flow. useSubmitOffer mutation now validates response.data.id before declaring success and throws on failed creation. useMyOffers and useOffersForRequest hooks updated with `res?.data ?? res` fallback for AxiosResponse handling, reduced staleTime to 10s, added refetchOnMount:'always' to ensure fresh data on navigation. Query invalidation covers all related keys (myOffers, offersForRequest prefix, marketplaceRequests, myRequests). Lint + build pass.
- 2026-06-19: Implemented Reject Offer action and improved offer visibility for both sender and request owner. Offers page now has Received/Submitted tabs — forwarders see all pending offers on their RFQs with Accept/Reject buttons, providers see their submitted offers. Dashboard stats show pending received offers count. Added useRejectOffer hook calling /api/v1/marketplace/reject-offer. Updated i18n (EN+SR) with new offer-related keys. Lint + build pass.
- 2026-07-15: Full translation correction pass — all micro UI text now language-aware. Fixed: Status History toggle, carrier empty state text, filter pill labels (Shipments/Marketplace/Requests), transport type/mode/vehicle form buttons, customs service type labels, additional services labels, dialog helper texts, "Read-only" badge, "No requests match filters" text, wagon type/count labels, cargo dimensions label. Added formatCustomsServiceTypeLabel helper. Created admin/test account seed endpoint (POST /api/v1/seed/reset-accounts) with 6 accounts. All accounts verified working. Lint + build pass.
- 2026-08-09: ★ STABLE MVP CHECKPOINT (MVP-1) recorded. Fixed admin/test login (password_hash auto-seed on startup). All core flows verified end-to-end. No code changes beyond this point without explicit request.
- 2026-08-09: Fixed mixed Serbian/English UI state. Created LanguageContext for global language sync across all pages. Updated Layout/Navbar to use reactive language context with formatRoleLabel for top-right role display. Updated Index.tsx, Login.tsx, Onboarding.tsx to use LanguageContext instead of local state. Added useLanguage() subscription to Dashboard, Offers, Shipments, Marketplace, Requests, Company, Directory pages so all t() calls re-render on language change. Lint + build pass.
- 2026-08-09: Language switching reactivity fix — added useLanguage() subscription to Admin.tsx, PendingApproval.tsx, Contact.tsx (the remaining pages that used t() without subscribing to language context). All 16 page components now re-render translated labels immediately on language toggle. Lint + build pass.
- 2026-08-09: ★ STABLE MVP CHECKPOINT (MVP-2) recorded. "Cargontainer MVP Stable Checkpoint — 09.08.2026". Full i18n reactivity confirmed, regression test passed. No code changes — checkpoint only.
- 2026-08-09: Implemented verified legal fields locking (MVP step). Frontend: Company.tsx locks company_name, roles, country, city, vat_number for approved non-admin users with visual lock indicators and helper banner. Backend: LOCKED_FIELDS enforcement in CompanyService.update_company() (includes approval_status). Admin Panel: expanded Edit Company form with approval_status dropdown, email, phone, website, address, description fields. Admin endpoint extended to accept all new fields. i18n keys added (EN+SR). Lint + build pass.
- 2026-08-09: ★ STABLE MVP CHECKPOINT (MVP-3) recorded. Company Admin + Member Approval workflow complete.
- 2026-08-09: Implemented Pilot Cleanup — admin-only tool for safe test-data archival. Backend: scan endpoint (GET /api/v1/admin/pilot-cleanup/scan) + archive endpoint (POST /api/v1/admin/pilot-cleanup/archive) with protected-record enforcement. Frontend: PilotCleanup.tsx with scan, categorized selection, typed DELETE confirmation. Integrated as tab in Admin panel. i18n EN+SR. Lint + build + py_compile pass.
- 2026-08-09: Pilot Cleanup i18n fix — connected PilotCleanup.tsx to LanguageContext (key={lang} for force re-render), replaced hardcoded "items selected" with t() key, added formatStatus() for translated status badges. Added admin.itemsSelected + admin.statusArchivedTest keys (EN+SR). Build pass.
- 2026-08-15: Header logo sizing fixed with a fixed-size container so EN/SR render identically (display-only CSS change) — logo wrapper 170x48px mobile / 240x56px desktop, image `w-full h-full object-contain object-left`, natural image dimensions no longer control displayed size. Removed the extra gap/margin next to the logo (gap-2.5 dropped, `shrink-0` added). Applied in Layout header, Index navbar, Login navbar; Onboarding header uses 240x56px centered. Header height (h-16) and navigation unchanged. Lint + build pass.
- 2026-08-15: Header logo display size increased (display-only CSS change, no asset change) — from h-9/h-10/h-11 (~36-44px) to h-10 mobile / h-12 desktop (40px/48px) with max-width caps 170px mobile, 230px sm, 260px md+, object-contain and vertical centering preserved. Applied in Layout header, Index navbar, Login navbar. Header height (h-16) and navigation unchanged. No separate tagline text remains. Lint + build pass.
- 2026-08-15: Logo replaced with user-provided language variants — /assets/cargontainer-logo-en.png (EN) and /assets/cargontainer-logo-sr.png (SR), both containing the slogan inside the image. Logo switches automatically with the language toggle in Layout header, Index navbar, Login navbar, and Onboarding header. Previous plain-text tagline and brand.tagline i18n key removed. Lint + build pass.
- 2026-08-15: (superseded) Logo tagline added as plain language-aware text next to the existing logo (no logo image/design change). New i18n key brand.tagline — EN "Move logistics smarter." / SR "Pametnije upravljajte logistikom." Rendered in Layout header (desktop), Login navbar, Index navbar, and Onboarding header. No business logic changes. Lint + build pass.
- 2026-08-14: ★ STABLE MVP CHECKPOINT (MVP-4) recorded — "Cargontainer MVP Stable Checkpoint 4 — Pilot Cleanup Ready". Admin-only Pilot Cleanup verified end-to-end (detection, selection, DELETE confirmation, safe archival, correct counts, EN/SR translation, formatted status labels) with all existing approval/RFQ/offer/transport/member flows intact. No code changes — checkpoint only.