# TANKR — Known Issues & Pilot Limitations

**Document ID:** `QA-REP-12-ISSUES`  
**Date:** 2026-10-31  

---

## 1. Known Non-Blocking Limitations

1. **Physical Device Push Notifications:**
   - Push notifications require physical Apple APNs and Google FCM credentials configured in production EAS builds. In the current test environment, local in-app push banners and database notifications function as designed.
   - Severity: **P2** | Workaround: In-app real-time notification modal.

2. **Direct PostgreSQL Connection String for Staging Suite:**
   - `__tests__/e2e_live_booking_lifecycle.test.ts` connects via `pg.Pool` directly to PostgreSQL port 5432 and is skipped unless `TEST_DATABASE_URL` is provided. The REST/RPC-based test suite (`qa/e2e/full-lifecycle/real_world_scenarios.test.ts`) tests the identical lifecycle over PostgREST with 100% pass rate.
   - Severity: **P3** | Workaround: Provide dedicated staging Postgres URI in CI/CD pipeline.

3. **External Payment Gateway Live Credentials:**
   - Razorpay test keys are configured (`rzp_test_...`). Real bank settlement and UPI deep linking require production KYC approval from Razorpay prior to public launch.
   - Severity: **P2** | Workaround: Test mode operational for pilot.

---

## 2. Zero Unresolved P0 / P1 Defects

All P0 (Critical) and P1 (High) bugs identified during the audit have been fully remediated and verified with passing regression tests.
