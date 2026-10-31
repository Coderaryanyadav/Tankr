# TANKR — Test Data Policy & Isolation Rules

**Document ID:** `QA-POL-001`  
**Date:** 2026-10-31  

---

## 1. Absolute Directives

1. **Zero Production Customer Data:** All testing is executed with synthetic persona entities explicitly designated with test identifiers.
2. **Deterministic Prefixes:** All test-generated entities must carry the prefix `TEST_` or `test-` in their reference keys and identifiers (e.g., `#TNK-TEST-xxxx`, `test_customer_xxx@tankr.in`).
3. **No Hardcoded Production Secrets:** Test runners must never embed production service role keys, live gateway credentials, or real SMS gateway tokens in test suites or Git history.
4. **Target Guardrail:** Destructive operations (`TRUNCATE`, `DROP TABLE`, `DELETE WHERE true`) are strictly forbidden. Cleanup scripts must delete ONLY test-generated records identified by their test run ID.
5. **Simulated Financial Transactions:** Razorpay operations must run against standard test gateway keys (`rzp_test_...`) with test signatures. Never trigger real bank transfers or real UPI debits.

---

## 2. Test Personas & Role Matrix

| Persona | Role | Designated Test Identity | Purpose |
|---|---|---|---|
| **P-CUST-01** | `customer` | `+91 98200 11111` (Sunita Sharma) | Primary discovery, booking, live tracking, and invoice validation |
| **P-CUST-02** | `customer` | `+91 98200 22222` (Rahul Verma) | Concurrency testing, competing bookings for identical tanker |
| **P-SUPP-01** | `supplier` | `+91 98200 33333` (Marol Express Water Logistics) | Fleet management, booking acceptance, vehicle onboarding |
| **P-DRIV-01** | `driver` | `+91 98200 44444` (Sunil Pawar) | Duty toggle, GPS breadcrumb broadcast, flow meter handshake |
| **P-ADMN-01** | `admin` | `+91 98200 99999` (Platform Operations Desk) | KYC approvals, emergency overrides, dispute arbitration |
