# TANKR — Master Test Plan & Quality Strategy

**Document ID:** `QA-PLAN-001`  
**Version:** 1.0.0  
**Date:** 2026-10-31  

---

## 1. Objectives & Scope

The objective of this comprehensive quality engineering audit is to rigorously verify every layer of TANKR:
1. **Frontend Mobile Experience:** UI stability, state handling, touch response, and responsive layout across Customer, Supplier, Driver, and Admin.
2. **Backend & Stored Procedures:** Transaction isolation, concurrency locks, state machine integrity, and financial quote calculations.
3. **Database Security & RLS:** Multi-tenant role-based access control, tenant isolation, zero horizontal/vertical privilege escalation.
4. **GPS & Telemetry:** PostGIS radius queries, offline breadcrumb queuing, and realtime driver tracking.
5. **Payments & Reconciliation:** Digital signature verification, idempotent order processing, and meter discrepancy prorated refunds.
6. **Real-World Resilience:** Network drops, crash recovery, out-of-order webhooks, concurrent tanker bookings, and emergency hospital overrides.

---

## 2. Test Pyramid & Methodology

```
         / \
        /   \      E2E Multi-Role Lifecycles (Scenario 1-20)
       /-----\
      /       \    Integration Tests (Supabase RPCs, REST, Realtime)
     /---------\
    /           \  Security & Penetration (RLS, IDOR, Injection, Tampering)
   /-------------\
  /               \ Unit Tests (Pricing, Zod Schemas, Stores, Utilities)
 /-----------------\
```

---

## 3. Risk Priorities & Severity Criteria

| Severity | Definition | Pilot Blocking? |
|---|---|---|
| **P0 (Critical)** | Auth bypass, privilege escalation, unverified payment completion, duplicate tanker dispatch race condition, database data corruption. | **YES (Immediate Block)** |
| **P1 (High)** | Booking cannot complete, flow meter refund calculation incorrect, driver GPS drops permanently, RLS data leak between customers. | **YES (Block)** |
| **P2 (Medium)** | UI out of sync after cancellation, non-blocking RPC timeout, retry mechanism sluggish, localized styling defect on edge viewports. | No (Subject to triage) |
| **P3 (Low)** | Minor cosmetic flaws, label alignment, non-critical copy typos. | No |

---

## 4. Acceptance Criteria for Pilot Readiness Release Gates

- **Gate 1 (Functional):** 100% of P0 and P1 test scenarios pass. All 4 user roles can complete their designated end-to-end workflows.
- **Gate 2 (Data Integrity):** Atomic booking concurrency test guarantees no two customers can double-book the same tanker simultaneously.
- **Gate 3 (Security):** All RLS policies validated. Unauthenticated or wrong-role requests are rejected with HTTP 401/403 or empty rows.
- **Gate 4 (Financial Accuracy):** All quotes and meter discrepancy refunds balance to within ₹0.00 currency precision.
- **Gate 5 (Observability):** Structured logging for booking state changes, payments, and location breadcrumbs.

