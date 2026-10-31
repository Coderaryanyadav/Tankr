# TANKR — Business Rule Coverage Matrix

This matrix maps every documented business rule to its corresponding automated logic test suite and verification outcome.

| Rule Category | Business Rule Description | Validating Test File | Status |
| :--- | :--- | :--- | :--- |
| **Identity & Auth** | Customer cannot escalate role to admin | `qa/logic-tests/customer_and_address_logic.test.ts` | **PASS** |
| **Address & Geo** | Rejects Null Island `(0, 0)` coordinates | `qa/logic-tests/customer_and_address_logic.test.ts` | **PASS** |
| **Address & Geo** | Rejects coordinates outside WGS-84 ranges | `qa/logic-tests/customer_and_address_logic.test.ts` | **PASS** |
| **Discovery** | Unavailable tankers hidden from bookable list | `qa/logic-tests/discovery_and_matching_logic.test.ts` | **PASS** |
| **Discovery** | Tankers from unverified suppliers excluded | `qa/logic-tests/supplier_and_driver_logic.test.ts` | **PASS** |
| **Discovery** | Capacity filtering strictly matches user choice | `qa/logic-tests/discovery_and_matching_logic.test.ts` | **PASS** |
| **Pricing** | Daytime price matches independent oracle | `qa/logic-tests/pricing_and_financial_logic.test.ts` | **PASS** |
| **Pricing** | Peak 18-22h IST adds +10% base surge | `qa/logic-tests/pricing_and_financial_logic.test.ts` | **PASS** |
| **Pricing** | 5% GST calculated on exact subtotal | `qa/logic-tests/pricing_and_financial_logic.test.ts` | **PASS** |
| **Pricing** | Negative prices or distances rejected | `qa/logic-tests/pricing_and_financial_logic.test.ts` | **PASS** |
| **State Machine** | Linear forward progression allowed | `qa/logic-tests/booking_state_machine_logic.test.ts` | **PASS** |
| **State Machine** | Backward transitions rejected | `qa/logic-tests/booking_state_machine_logic.test.ts` | **PASS** |
| **State Machine** | Terminal states (`delivered`, `cancelled`) immutable | `qa/logic-tests/booking_state_machine_logic.test.ts` | **PASS** |
| **Cancellation** | 100% refund before dispatch | `qa/logic-tests/booking_state_machine_logic.test.ts` | **PASS** |
| **Cancellation** | ₹150 logistics fee applied when en route | `qa/logic-tests/booking_state_machine_logic.test.ts` | **PASS** |
| **Cancellation** | Cancellation blocked once delivering | `qa/logic-tests/booking_state_machine_logic.test.ts` | **PASS** |
| **Delivery PIN** | Pumping requires matching 4-digit PIN | `qa/logic-tests/booking_state_machine_logic.test.ts` | **PASS** |
| **Metering** | Ending meter must exceed start meter | `qa/logic-tests/booking_state_machine_logic.test.ts` | **PASS** |
| **Metering** | Pumping flow-rate adheres to physical bounds | `qa/logic-tests/supplier_and_driver_logic.test.ts` | **PASS** |
| **Concurrency** | Double booking of tanker prevented | `qa/logic-tests/concurrency_and_race_logic.test.ts` | **PASS** |
| **Community Pool** | Concurrent pledges capped at target sum | `qa/logic-tests/concurrency_and_race_logic.test.ts` | **PASS** |
| **GPS Telemetry** | Stale / non-monotonic timestamps rejected | `qa/logic-tests/gps_telemetry_logic.test.ts` | **PASS** |
| **GPS Telemetry** | Teleportation (> 120 km/h) rejected | `qa/logic-tests/gps_telemetry_logic.test.ts` | **PASS** |
| **Payments** | Webhook idempotency protects against replay | `qa/logic-tests/payment_and_refund_logic.test.ts` | **PASS** |
| **Payments** | Total refunds cannot exceed captured payment | `qa/logic-tests/payment_and_refund_logic.test.ts` | **PASS** |
| **Compliance** | 15-character Indian GSTIN validation | `qa/logic-tests/supplier_and_driver_logic.test.ts` | **PASS** |
| **Invariants** | All 15 architectural business invariants | `qa/logic-tests/business_invariants.test.ts` | **PASS** |
| **Fuzzing** | 500 randomized pricing calculations | `qa/logic-tests/property_based_fuzzing.test.ts` | **PASS** |
