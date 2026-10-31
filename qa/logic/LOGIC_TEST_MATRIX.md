# TANKR — Business Logic Testing Matrix

| Suite ID | Logic Module | Coverage Scope | Primary Target Functions / Modules | Test Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **LOGIC-01** | Customer Identity & RLS | Isolation, role manipulation, session tampering | `protect_profile_role_escalation`, `profiles` RLS | Adversarial role elevation attacks |
| **LOGIC-02** | Address & Geo Boundaries | Saved addresses, null coordinates, coordinate bounds | `locationStore.ts`, `DEFAULT_FALLBACK_LOCATION` | Fuzzing lat/lng outside bounds |
| **LOGIC-03** | Discovery & Matching | Capacity filter, offline tankers, sort nearest/price | `get_nearby_tankers`, `discoveryStore.ts` | Contradictory vehicle availability states |
| **LOGIC-04** | Authoritative Pricing | Base rates, distance charge, peak surcharge, GST | `calculate_booking_quote`, `pricingCalculations.ts` | Independent mathematical oracle assertions |
| **LOGIC-05** | Booking State Transitions | Valid transitions, terminal states, invalid actions | `create_booking_atomic`, `customer_cancel_booking` | Exhaustive state transition permutation matrix |
| **LOGIC-06** | Concurrency & Race Hazards | Simultaneous bookings, double payouts, duplicate webhooks | `create_booking_atomic` (`FOR UPDATE` locking) | Promise.all() parallel bombardment |
| **LOGIC-07** | Supplier Operations | Onboarding, fleet registration, tanker verification | `register_supplier`, `supplier_onboard_tanker` | Duplicate GSTIN, offline tankers |
| **LOGIC-08** | Driver & Meter Handshake | PIN validation, monotonic meter readings | `driver_complete_delivery_with_meter` | Invalid PIN, meter_end < meter_start |
| **LOGIC-09** | GPS Telemetry Integrity | Coordinate bounds, out-of-order breadcrumbs | `record_driver_location_ping`, `trackingService` | Timestamp replay, Null Island (0,0) injection |
| **LOGIC-10** | Payment & Reconciliation | Signature checks, duplicate webhooks, refund bounds | `verify_and_reconcile_payment`, `paymentService` | Webhook replay, refund exceeding capture |
| **LOGIC-11** | Community Pooling Ledger | 100% funding lock, zero/negative contributions | `contribute_to_community_pool`, `communityPoolStore` | Negative pledge, over-subscription attacks |
| **LOGIC-12** | Business Invariants | 15 foundational system rules | Multi-module integration | Automated invariant assertion suite |
