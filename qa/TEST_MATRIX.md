# TANKR — Comprehensive Test Matrix

**Document ID:** `QA-MAT-001`  
**Date:** 2026-10-31  

---

## 1. Test Suite Coverage Summary

| Domain | Area | Test Cases | Automation Suite | Priority |
|---|---|---|---|---|
| **UNIT** | Pricing & Surcharges | TC-UNIT-01 to TC-UNIT-08 | `qa/unit/pricing/` | P1 |
| **UNIT** | Zod Contract Validation | TC-UNIT-09 to TC-UNIT-16 | `qa/unit/validation/` | P1 |
| **UNIT** | State Store Reducers | TC-UNIT-17 to TC-UNIT-24 | `qa/unit/state/` | P2 |
| **INTEG** | Multi-Role Authentication | TC-INT-01 to TC-INT-08 | `qa/integration/auth/` | P0 |
| **INTEG** | Booking State Transitions | TC-INT-09 to TC-INT-18 | `qa/integration/booking/` | P0 |
| **INTEG** | Two-Way Flow Meter Handshake | TC-INT-19 to TC-INT-24 | `qa/integration/driver/` | P0 |
| **INTEG** | Payment Verification & Webhooks | TC-INT-25 to TC-INT-30 | `qa/integration/payments/` | P0 |
| **INTEG** | GPS Breadcrumb Queue & Sync | TC-INT-31 to TC-INT-36 | `qa/integration/tracking/` | P1 |
| **INTEG** | Invoice PDF & Calculations | TC-INT-37 to TC-INT-42 | `qa/integration/notifications/` | P1 |
| **SEC** | Database Row-Level Security (RLS) | TC-SEC-01 to TC-SEC-10 | `qa/security/rls/` | P0 |
| **SEC** | Role Privilege Escalation | TC-SEC-11 to TC-SEC-18 | `qa/security/authorization/` | P0 |
| **SEC** | Secret Scanning & Leaks | TC-SEC-19 to TC-SEC-24 | `qa/security/secrets/` | P0 |
| **PERF** | Concurrency & Race Conditions | TC-PERF-01 to TC-PERF-06 | `qa/performance/concurrency/` | P0 |
| **PERF** | PostGIS Latency & DB Queries | TC-PERF-07 to TC-PERF-12 | `qa/performance/database/` | P1 |
| **E2E** | Full Lifecycle (Scenarios 1-20) | TC-SCEN-01 to TC-SCEN-20 | `qa/e2e/full-lifecycle/` | P0 |

---

## 2. Real-World Scenario Mapping (Scenarios 1 to 20)

1. **Scenario 1:** Normal customer booking from discovery to flow meter delivery and GST invoice.
2. **Scenario 2:** Competing booking race condition — Two customers attempt to book the exact same tanker simultaneously.
3. **Scenario 3:** Supplier booking rejection & automatic reassignment.
4. **Scenario 4:** Driver internet loss during delivery & offline telemetry sync.
5. **Scenario 5:** Payment succeeds but mobile application closes before webhook acknowledgment.
6. **Scenario 6:** Payment failure idempotency & retry without double-charge.
7. **Scenario 7:** Supplier goes offline after accepting dispatch.
8. **Scenario 8:** Driver no-show policy & automated cancellation/refund.
9. **Scenario 9:** Delivery PIN brute-force attempt & secure 4-digit verification.
10. **Scenario 10:** Delivery complete but invoice generation retry without double-billing.
11. **Scenario 11:** Customer cancellation post-acceptance with prorated policy penalty.
12. **Scenario 12:** Supplier suspended by admin during active trip.
13. **Scenario 13:** Database connection failure & truthful offline error handling.
14. **Scenario 14:** App terminated mid-booking & state recovery from backend.
15. **Scenario 15:** Location permissions revoked during active live tracking.
16. **Scenario 16:** Duplicate payment webhook delivery idempotency.
17. **Scenario 17:** Realtime WebSocket connection drop and auto-reconnect.
18. **Scenario 18:** Expired booking quote rejection by backend stored procedure.
19. **Scenario 19:** Tanker capacity & availability changes during customer checkout.
20. **Scenario 20:** Account deletion, personal data scrub, and regulatory financial data retention.
