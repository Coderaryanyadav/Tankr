# TANKR — Features & Implementation Status

This catalog documents the operational status of every major capability in TANKR.

---

## 1. Status Legend

- **VERIFIED WORKING**: Fully implemented, backed by live Supabase stored procedures and passing regression tests.
- **PARTIALLY IMPLEMENTED**: Functional UI and database integration; requires final hardware or external vendor pairing.
- **PLANNED**: On the engineering roadmap.
- **REQUIRES EXTERNAL CREDENTIALS**: Requires paid enterprise API credentials.

---

## 2. Feature Matrix

### Consumer Customer Experience
| Feature | Status | Notes |
| :--- | :---: | :--- |
| Mobile Phone OTP Login | **VERIFIED WORKING** | Backed by Supabase Auth with fixed test OTPs for development. |
| Onboarding & Delivery Sump Setup | **VERIFIED WORKING** | PostGIS coordinates, apartment details, saved addresses. |
| Nearby Tanker Radar | **VERIFIED WORKING** | Real-time map displaying nearest available tankers. |
| Dynamic 15m Price Quoting | **VERIFIED WORKING** | `calculate_booking_quote` with surge and capacity multipliers. |
| Atomic Booking & Tanker Lock | **VERIFIED WORKING** | Row-level locking preventing concurrent double-bookings. |
| 4-Digit Delivery PIN Verification | **VERIFIED WORKING** | Secure handover code required before driver can pump water. |
| Razorpay / UPI Escrow Checkout | **VERIFIED WORKING** | Escrow settlement hold released upon delivery completion. |
| PDF GST Invoicing | **VERIFIED WORKING** | Instant invoice record generation upon settlement. |
| Apartment Community Pooling | **VERIFIED WORKING** | Residents pool funds to purchase 20kL bulk dispatches. |

### Supplier & Fleet Management
| Feature | Status | Notes |
| :--- | :---: | :--- |
| Supplier Dashboard & Fleet Health | **VERIFIED WORKING** | Active vehicles, available liters, completed drops. |
| Tanker Onboarding & KYC | **VERIFIED WORKING** | License plates, water sources, capacity tiers. |
| Revenue & Settleable Balances | **VERIFIED WORKING** | 85/5/10 fee split tracking. |

### Driver Console & Telemetry
| Feature | Status | Notes |
| :--- | :---: | :--- |
| Order Acceptance & Turn-by-Turn | **VERIFIED WORKING** | Customer contact shortcuts and route guidance. |
| Real-time GPS Location Streaming | **VERIFIED WORKING** | Foreground and background location ingestion task. |
| Offline Breadcrumb Queueing | **VERIFIED WORKING** | Automatic retry buffer during cellular dead-zones. |
| Digital Flow Meter Integration | **PARTIALLY IMPLEMENTED**| Simulated Bluetooth flow sensor; physical hardware pairing required. |

### Super Administrator Command Portal (10 Desks)
| Admin Desk | Status | Operational Capability |
| :--- | :---: | :--- |
| 1. Operations Desk | **VERIFIED WORKING** | Real-time GMV, revenue, delivery fulfillment rate, surge controls. |
| 2. Fleet Map & Heatmap | **VERIFIED WORKING** | Anti-collision radar dispersion, live telemetry, and vehicle CRUD. |
| 3. Hospital Dispatch (20m SLA) | **VERIFIED WORKING** | Critical care emergency override dispatch console. |
| 4. Financial & Payouts | **VERIFIED WORKING** | 85/5/10 payout reconciliation, individual and batch settlement. |
| 5. Water Quality Audit Desk | **VERIFIED WORKING** | BIS 10500 potable certification records, sensor tracking. |
| 6. Corporate Contracts Desk | **VERIFIED WORKING** | Recurring commercial delivery contracts and volume tracking. |
| 7. Supplier KYC Approvals | **VERIFIED WORKING** | Vendor verification queue with instant approve/reject actions. |
| 8. Disputes & Escrow Desk | **VERIFIED WORKING** | Customer complaint arbitration and atomic refund issuance. |
| 9. PostGIS Service Zones | **VERIFIED WORKING** | Geospatial zone boundaries and liquidity health monitoring. |
| 10. System Audit Trail | **VERIFIED WORKING** | Immutable log of administrative actions. |
