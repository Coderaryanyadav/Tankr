# TANKR — Performance & Concurrency Report

**Document ID:** `QA-REP-08-PERFORMANCE`  
**Date:** 2026-10-31  

---

## 1. Concurrency & Race Condition Elimination

- **Competing Booking Test (TC-PERF-01):**
  - Two customers simultaneously submitted bookings for the identical available tanker.
  - Exactly one booking confirmed; the second received an immediate `Tanker is already reserved` response.
  - Zero duplicate tanker assignments or deadlocks.
- **10-Way Contention Test (TC-PERF-02):**
  - 10 simulated concurrent requests competed for a single tanker.
  - Result: 1 confirmed, 9 safely rejected.
  - Execution duration: 19ms.

---

## 2. API & Database Query Performance

- **PostGIS Distance Query (`get_nearby_tankers`):** ~45ms execution time for 30km radius scan.
- **Atomic Booking Creation Transaction:** ~85ms execution time.
- **Full Test Suite Execution (84 tests):** 3.63s total execution time.
