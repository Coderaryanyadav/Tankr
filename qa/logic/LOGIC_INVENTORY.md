# TANKR — Complete Business Logic Inventory

**System**: TANKR On-Demand Water Delivery Marketplace  
**Version**: 1.0.0 Production Architecture  
**Audit Standard**: Independent Systems Logic & Mathematical Integrity Audit  

---

## 1. Domain Workflows

### 1.1 Customer Workflow
- **Discovery**: Geo-spatial proximity search using PostGIS spherical radius (`ST_DWithin` @ 4326), filtering by vehicle capacity (`1000L`, `2000L`, `5000L`, `10000L`, `20000L`) and potable/drinking grade.
- **Quote Calculation**: Authoritative server-side pricing via `calculate_booking_quote` RPC (base price + distance charge + surge + GST). Client cannot manipulate quote prices.
- **Booking Creation**: Atomic transaction via `create_booking_atomic` acquiring an exclusive row lock (`FOR UPDATE`) on the chosen tanker, generating a cryptographically secure 4-digit PIN, setting tanker availability to `FALSE`.
- **Payment Authorization**: Razorpay/UPI authorization via `create_payment_order` with cryptographic HMAC-SHA256 signature verification.
- **Live GPS Tracking**: Real-time GPS stream via `tracking_breadcrumbs` table and `get_latest_tracking_breadcrumb` RPC.
- **Delivery Verification**: 4-digit PIN handoff to driver only after tanker docks at customer's sump.
- **Dispute Resolution**: Filing flow-meter shortfall or quality issues via `submit_customer_dispute` with auto-prorated refund.

### 1.2 Supplier Workflow
- **Onboarding**: KYC registration with GSTIN uniqueness check via `register_supplier`.
- **Fleet Management**: Adding tankers with RTO registration, ultrasonic meter calibration numbers, and driver linkage via `supplier_onboard_tanker`.
- **Order Dispatch**: Real-time order notification, acceptance via `supplier_accept_booking`, or reassignment via `supplier_cancel_and_reassign`.
- **Payouts**: Reconciliation of net supplier payouts (85% Net Disbursed / 15% Platform Take including 10% Platform Commission and 5% Fleet Maintenance Reserve) through `admin_execute_batch_payout`.

### 1.3 Driver Workflow
- **Duty Staging**: Driver logs in, sets duty status `on_duty`.
- **Order Handshake**: Receives dispatch, updates delivery status (`driver_assigned` ➔ `en_route` ➔ `arrived` ➔ `delivering`) via `driver_update_delivery_status`.
- **Telemetry Streaming**: Real-time breadcrumb recording via `record_driver_location_ping` with bounding box validation.
- **Flow-Meter Discharge**: Connects digital hose, verifies customer 4-digit PIN, inputs start/end flow meter readings via `driver_complete_delivery_with_meter`.

### 1.4 Admin Workflow
- **Fleet Governance**: Verification and suspension of suppliers/tankers via `admin_verify_supplier`.
- **Emergency Dispatch**: Priority bypass allocation for hospitals and emergency sumps via `admin_emergency_dispatch`.
- **Dispute Adjudication**: Authoritative arbitration and instant ledger refund execution via `admin_resolve_dispute`.

---

## 2. End-to-End Operation Traceability Matrix

| Feature | Trigger | Required Preconditions | Validation Rules | DB Changes | Idempotency / Double Call | Concurrency Safety |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Quote Calculation** | Address selection or tanker tap | Valid tanker ID, valid coordinates in Mumbai service area | `-90 <= lat <= 90`, `-180 <= lng <= 180`, `lat != 0`, `lng != 0` | None (STABLE RPC) | Pure idempotent function | Read-only |
| **Atomic Booking** | Customer taps "Confirm Booking" | Tanker is available and online, quote unexpired | Customer owns session, payment preference valid | Inserts `bookings` row, sets `tankers.is_available = FALSE` | Returns existing or rejects duplicate submission | `FOR UPDATE` row lock on `tankers` |
| **Payment Reconciliation** | Payment webhook or client callback | Booking exists, status `pending` or `accepted` | HMAC-SHA256 signature match, amount >= booking amount | Updates `payments.status = 'captured'`, `bookings.payment_status = 'paid'` | Idempotent (checks existing payment status) | Atomic database transaction |
| **Driver Location Ping** | Background GPS service | Assigned active trip exists in `en_route` status | Mumbai geo-bounds (`18.7` to `19.5` lat), timestamp monotonic | Inserts `tracking_breadcrumbs`, updates `tankers.current_location` | Deduplicated on timestamp | Append-only log |
| **Meter Delivery Completion** | Driver submits PIN + flow readings | Status `delivering` or `arrived`, PIN matches booking | `end_meter > start_meter`, delivered volume >= 0 | Updates `bookings.status = 'delivered'`, generates tax invoice | Rejects if already `delivered` | Row locked via RPC |
| **Customer Cancellation** | Customer taps "Cancel" | Status IN (`pending`, `driver_assigned`, `en_route`, `arrived`) | Status NOT IN (`delivering`, `delivered`, `cancelled`) | Updates `bookings.status = 'cancelled'`, sets `tankers.is_available = TRUE` | Idempotent rejection on repeated cancellation | Row locked via RPC |
| **Community Pool Contribution** | Neighbor pledges split payment | Pool status `collecting`, pool not 100% funded | Contribution amount > 0, pledged flat provided | Inserts `pool_contributions`, increments `collected_amount` | Rejects negative or zero amounts | Atomic transaction |
