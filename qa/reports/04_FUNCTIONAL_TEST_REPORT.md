# TANKR — Functional Test Report

**Document ID:** `QA-REP-04-FUNCTIONAL`  
**Date:** 2026-10-31  

---

## 1. Functional Test Results

All critical functional modules were tested across Customer, Supplier, Driver, and Admin workflows:

| Module | Test Suite | Tests Passed | Status |
|---|---|---|---|
| **Pricing Engine** | `qa/unit/pricing/` + `__tests__/pricing.test.ts` | 11 passed | **PASS** |
| **Zod Contracts & Boundaries** | `qa/unit/validation/` | 9 passed | **PASS** |
| **State Machine Transitions** | `qa/integration/booking/` | 8 passed | **PASS** |
| **Cancellation Policies** | `qa/integration/booking/` | 6 passed | **PASS** |
| **Flow Meter Proration** | `qa/integration/payments/` | 6 passed | **PASS** |
| **Webhook Signatures** | `qa/integration/payments/` | 4 passed | **PASS** |
| **Emergency Dispatch** | `__tests__/supplier_and_disputes.test.ts` | 4 passed | **PASS** |
| **GPS Telemetry Queue** | `__tests__/gps_queue.test.ts` | 4 passed | **PASS** |

---

## 2. Functional Highlights

- **Dynamic Quote Calculation:** Successfully verified minimum order rates, distance multipliers, peak hour surcharges, and 5% GST tax calculation.
- **PIN Verification:** Handshake PIN is strictly verified; orders cannot transition to `delivering` or `delivered` without correct matching PIN.
- **Fair Metering:** Prorated refund calculations verified to the exact Rupee when actual pumped volume is less than ordered capacity.

