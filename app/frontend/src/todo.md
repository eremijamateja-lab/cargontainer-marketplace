# Cargontainer Platform Refinement Plan

## Changes Summary

### 1. UI Theme: Dark → Clean White/Blue Professional
- White backgrounds, blue primary (#2563EB), clean typography
- Professional minimal design throughout

### 2. Layout: Sidebar → Top Header Navigation
- Logo (from cargontainer.com with fallback) | Dashboard | Create Request | My Transports
- Clean horizontal nav, no sidebar

### 3. Landing Page (Index.tsx)
- Use cargontainer.com logo (with text fallback)
- White/blue clean design
- Professional hero section

### 4. Requests (Create Request page)
- Origin/Destination: free text inputs with placeholders "e.g. Koper Terminal" / "e.g. Belgrade"
- Container types dropdown: 20DV, 40DV, 40HC, 45HC, 20OT, 40OT, 20FR, 40FR, Reefer
- Add optional "Tracking link (URL)" field
- Remove "title" field, auto-generate from origin→destination

### 5. Dashboard
- Clean table: Route (Origin → Destination), Container type, Pickup date, Status
- Statuses: Open, Offers received, Assigned, In progress, Delivered

### 6. Offers Section
- Each offer: Company name, Price, Transit time, Optional message

### 7. Shipments (My Transports)
- Display tracking link as clickable "Track shipment"
- Clean status display

### 8. Terminology
- Use: container, terminal, port, trucking, rail
- Avoid: task, item

### 9. Navigation Structure
- Header: Logo | Dashboard | Create Request | My Transports

## Files to modify:
1. src/components/Layout.tsx - New top header nav
2. src/pages/Index.tsx - White/blue landing page with logo
3. src/pages/Dashboard.tsx - Clean table view
4. src/pages/Requests.tsx - Updated form (container types, free text origin/dest, tracking URL)
5. src/pages/Shipments.tsx - Tracking link, clean display
6. src/lib/i18n.ts - Updated translations
7. src/App.tsx - Simplified routes (remove marketplace/offers as separate, merge into flow)