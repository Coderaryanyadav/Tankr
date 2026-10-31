# TANKR — Core Business Invariants

These 15 business invariants are non-negotiable architectural truths that must hold across all operations, database states, and edge conditions.

---

### Invariant 1: Single Active Reservation per Tanker
- **Rule**: A tanker vehicle cannot be assigned to two conflicting active deliveries simultaneously.
- **Enforcement**: Database transaction `create_booking_atomic` acquires `FOR UPDATE` lock and sets `tankers.is_available = FALSE`.
- **Failure Mode Blocked**: Double booking of physical tanker assets.

### Invariant 2: Immutability of Terminal States
- **Rule**: A booking in `delivered` or `cancelled` status cannot transition to any other status.
- **Enforcement**: Enforced by `customer_cancel_booking_with_policy` and `driver_update_delivery_status` RPCs.
- **Failure Mode Blocked**: Re-cancelling delivered water or resurrecting cancelled orders.

### Invariant 3: Authoritative Server-Side Pricing
- **Rule**: Total payable amount is computed exclusively by `calculate_booking_quote` RPC based on verified PostGIS distance, base rate, evening peak surge (18:00–22:00 IST), and 5% GST.
- **Enforcement**: Client-side prices submitted in payloads are ignored in favor of `v_quote.final_payable_amount`.
- **Failure Mode Blocked**: Client parameter tampering and underpaying.

### Invariant 4: Payment Capture Verification
- **Rule**: A booking cannot be transitioned to `paid` status without verified payment order match or valid cryptographic gateway signature.
- **Enforcement**: `verify_and_reconcile_payment` RPC validates transaction existence and signature before updating `bookings.payment_status`.
- **Failure Mode Blocked**: Fraudulent client state injection claiming order is paid.

### Invariant 5: Delivery PIN Security Protocol
- **Rule**: A driver cannot complete delivery without providing the matching 4-digit PIN cryptographically generated for the customer.
- **Enforcement**: `driver_complete_delivery_with_meter` verifies `p_delivery_pin = v_b.delivery_pin`.
- **Failure Mode Blocked**: Driver marking order delivered without visiting customer sump.

### Invariant 6: Flow-Meter Monotonicity
- **Rule**: Ending meter reading must strictly exceed starting meter reading (`meter_end > meter_start`).
- **Enforcement**: Schema check constraint `meter_end > meter_start` and RPC guard condition.
- **Failure Mode Blocked**: Negative delivery volumes and arithmetic overflows.

### Invariant 7: Refund Upper Bound
- **Rule**: Total refunded amount cannot exceed the net captured payment amount for that booking (`refund_amount <= captured_amount`).
- **Enforcement**: `processRefund` verifies captured ledger amount before initiating refund.
- **Failure Mode Blocked**: Financial overdraft and duplicate refund drains.

### Invariant 8: Geographic Coordinates Sanity
- **Rule**: GPS telemetry coordinates must fall strictly within valid geographic bounds (`-90 <= lat <= 90`, `-180 <= lng <= 180`) and reject Null Island `(0, 0)`.
- **Enforcement**: Validated in `trackingService.ts` and `record_driver_location_ping` RPC.
- **Failure Mode Blocked**: PostGIS projection crashes and invalid location rendering.

### Invariant 9: Customer Data Isolation (Row-Level Security)
- **Rule**: A customer cannot read or modify another customer's profile, saved addresses, or booking history.
- **Enforcement**: PostgreSQL Row-Level Security (`auth.uid() = customer_id`).
- **Failure Mode Blocked**: Cross-tenant data leaks and unauthorized booking tampering.

### Invariant 10: Role Escalation Prevention
- **Rule**: A customer cannot escalate their role to `admin` or `supplier` via profile updates.
- **Enforcement**: PostgreSQL trigger `protect_profile_role_escalation` throws `42501 Unauthorized` if `NEW.role != OLD.role` without `service_role`.
- **Failure Mode Blocked**: Privilege escalation attacks.

### Invariant 11: Non-negative Financial Quantities
- **Rule**: Booking amounts, community pool contributions, surcharges, and delivery charges must be strictly non-negative (`>= 0`).
- **Enforcement**: Schema `CHECK (final_payable_amount >= 0)`, `CHECK (amount > 0)`.
- **Failure Mode Blocked**: Negative value drain attacks.

### Invariant 12: Community Sump Pool Cap
- **Rule**: A community pool cannot accept contributions beyond its target funding threshold once marked `funded` or `dispatched`.
- **Enforcement**: `contribute_to_community_pool` checks pool status is `collecting` and `collected_amount < target_amount`.
- **Failure Mode Blocked**: Over-collection of resident funds.

### Invariant 13: Unique Active Dispute per Booking
- **Rule**: A customer cannot file multiple concurrent pending disputes on the same booking.
- **Enforcement**: `submit_customer_dispute` verifies `count(*) = 0` for pending disputes on `booking_id`.
- **Failure Mode Blocked**: Duplicate dispute filings and double refunds.

### Invariant 14: Monotonic GPS Breadcrumb Timestamps
- **Rule**: GPS breadcrumbs must have monotonically increasing timestamps for any given active delivery trip.
- **Enforcement**: `record_driver_location_ping` rejects updates older than the most recent recorded breadcrumb.
- **Failure Mode Blocked**: Out-of-order packet replay attacks causing vehicle rubber-banding.

### Invariant 15: Tax Invoice Reconciliation
- **Rule**: Every generated tax invoice must reconcile exactly with the booking's final payable amount, base price, delivery charge, and 5% GST breakdown.
- **Enforcement**: `generate_invoice_for_booking` computes line items directly from authoritative booking records.
- **Failure Mode Blocked**: Discrepancies between payment gateway captures and GST invoices.
