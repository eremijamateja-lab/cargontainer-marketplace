---
last_updated: 2026-08-12T00:00:00Z
status: active
---

# Project Context

## Project Overview
Cargontainer is a logistics coordination platform that coordinates container movement communication across freight forwarders, carriers, rail operators, and terminals. It supports an admin-approved company onboarding flow and an RFQ-based marketplace where companies submit and manage RFQs and offers under consistent, role-aware lifecycle/status rules. Admin tooling includes Pilot Cleanup for safe test-data archival.

## Key Decisions
| Date | Decision | By | Rationale |
|------|----------|-----|-----------|
| 2026-08-09 | MVP-1 Stable Checkpoint recorded | Alex | All core flows verified working end-to-end (admin login, registration, approval, marketplace, RFQ, offers, accept/reject). This is the stable base before any future changes. |
| 2026-08-09 | MVP-2 Stable Checkpoint recorded | Alex | Full i18n reactivity + translation regression passed. All flows confirmed working in both EN and SR. This is the stable base before future changes. |
| 2026-08-09 | MVP-3 Stable Checkpoint recorded | Alex | Company Admin + Member Approval workflow complete. Admin can manage company members (approve/reject/deactivate/reactivate). All existing flows confirmed working. |
| 2026-08-09 | Pilot Cleanup implemented | Alex | Admin-only safe archival tool for test data. Soft-delete via archived_test status. No business logic changes. |
| 2026-08-09 | Pilot Cleanup i18n fix | Alex | PilotCleanup.tsx connected to LanguageContext for immediate SR/EN reactivity. Status badges formatted via getStatusLabel(). |
| 2026-08-14 | MVP-4 Stable Checkpoint recorded | Alex | "Cargontainer MVP Stable Checkpoint 4 — Pilot Cleanup Ready". Admin-only Pilot Cleanup verified (detection, selection, DELETE confirmation, safe archival, correct counts, EN/SR translation, formatted status labels). All existing flows confirmed working. This is the stable base before future changes. |

## Constraints
- **MVP-4 FREEZE (current stable base)**: No code changes, refactoring, redesign, or new features without explicit user request. The MVP-4 "Pilot Cleanup Ready" version is the stable baseline for all future work.
- **MVP-3+ FREEZE**: No code changes to RFQ, offer, transport, company approval, or member approval logic without explicit user request.
- **Pilot Cleanup scope**: scan criteria, archive behavior, and permissions must not change without explicit request.


