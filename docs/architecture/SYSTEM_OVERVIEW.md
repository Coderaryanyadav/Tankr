# TANKR — System Overview

This document describes the four primary user experiences and operational personas implemented in the TANKR platform.

---

## 1. Consumer Customer Experience (`customer`)

The consumer customer flow is accessible via mobile app or web browser, defaulting to `src/navigation/AppTabs.tsx`:

- **Nearby Tanker Radar & Discovery**:
  - Scans active PostGIS service zones.
  - Filters tankers by capacity tier (2,000L, 5,000L, 10,000L, 20,000L) and water grade (Potable BIS 10500, Filtered Borewell, Industrial Treated).
  - Displays real-time ETA based on vehicle distance and current zone traffic multipliers.
- **Atomic Booking & Guaranteed Quoting**:
  - Generates binding 15-minute price quotes (`calculate_booking_quote`).
  - Calculates transparent breakdown: Base fare + Distance surcharge + Peak dynamic surge + GST.
- **Live Dispatch & GPS Telemetry**:
  - Map tracking with vehicle heading and smooth marker interpolation.
  - Driver contact details, license plate, and 4-digit secure delivery confirmation PIN.
- **Escrow & Order History**:
  - Secure payments via Razorpay (UPI, Credit/Debit card, Netbanking) or COD.
  - Downloadable GST invoice records.
  - Dispute filing with photo evidence submission.

---

## 2. Water Supplier Experience (`supplier`)

Accessible via `src/features/supply/screens/SupplierDashboardScreen.tsx`:

- **Fleet Inventory & Status**:
  - Real-time overview of tanker status (Available, En Route, Inactive).
  - Capacity utilization metrics and daily delivered liters.
- **Tanker Onboarding**:
  - Registration of new vehicles: Plate number, driver phone, capacity tier, water source, and base pricing.
  - Assignment of registered drivers to tanker hardware.
- **Revenue & Payout Overview**:
  - Gross delivery volume tracking.
  - Settleable earnings breakdown and historical disbursements.

---

## 3. Fleet Driver Console (`driver`)

Accessible via `src/features/supply/screens/DriverDashboardScreen.tsx`:

- **Continuous GPS Telemetry**:
  - Foreground and background location ingestion via `expo-location` and `expo-task-manager`.
  - Automatic queueing and offline sync for unstable cellular connectivity.
  - Updates vehicle position in `public.tankers` and streams breadcrumbs to `public.tracking_breadcrumbs`.
- **Order Dispatch & Navigation**:
  - Turn-by-turn route coordinates to destination customer sump.
  - Customer contact calling shortcut.
- **Delivery Verification & Flow Meter Integration**:
  - Requires customer 4-digit PIN verification before dispensing.
  - Integrates calibrated flow meter sensor reading to ensure delivered liters match ordered volume.

---

## 4. Super Administrator Command Portal (`admin`)

Accessible via `src/features/admin/screens/AdminDashboardScreen.tsx`. Provides 10 dedicated operational desks:

1. **Operations Desk**: Live gross merchandise value (GMV), platform revenue (10% take-rate), total completed deliveries, water dispatched (kL), dynamic network surge pricing sliders.
2. **Fleet Map & Heatmap**: Geospatial surveillance across Mumbai hubs with anti-collision dispersion, live telemetry, and vehicle CRUD (Add, Edit, Toggle Status, Retire, Rebalance).
3. **Hospital Dispatch (20m SLA)**: Priority dispatch console for dialysis centers, ICUs, and critical municipal institutions with 20-minute SLA fulfillment monitoring.
4. **Financial & Payouts**: Automated 85/5/10 revenue split (85% driver, 5% fleet maintenance, 10% platform fee), pending ledger inspection, and batch/individual settlement.
5. **Water Quality Audit Desk**: Sensor surveillance tracking Total Dissolved Solids (TDS < 250 ppm), pH (6.5 - 8.5), turbidity (< 5.0 NTU), coliform screenings, and laboratory certificate management.
6. **Corporate Contracts Desk**: Commercial B2B recurring delivery agreements, daily volume allocation, and SLA compliance.
7. **Supplier KYC Approvals Desk**: Vendor license verification, GSTIN cross-checking, water source safety auditing, and approval/rejection actions.
8. **Disputes & Escrow Desk**: Customer complaint arbitration, evidence review, and atomic refund disbursement.
9. **PostGIS Service Zones Desk**: Spatial zone boundaries, minimum fleet density thresholds, and live liquidity health.
10. **System Audit Trail**: Immutable ledger of administrative interventions and operational events.
