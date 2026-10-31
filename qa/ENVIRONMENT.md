# TANKR — Test Environment Setup & Configuration

**Document ID:** `QA-ENV-001`  
**Date:** 2026-10-31  

---

## 1. System Architecture Under Test

- **Frontend Container:** Expo SDK 58 React Native application (running on iOS / Android / Web)
- **Local Dev Server:** `http://localhost:8081` (active Expo Web bundler)
- **Database Engine:** Supabase PostgreSQL with PostGIS extensions
- **API Protocol:** REST (PostgREST), WebSocket (Supabase Realtime), RPC (PL/pgSQL Functions)

---

## 2. Environment Variables Specification

The test environment operates with `.env`:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://qicoczialqxulcbipuix.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<public_anon_publishable_key>
EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_test_5yL7gq7b8A88N4
EXPO_PUBLIC_MAPPLS_REST_KEY=demo_mappls_rest_key
```

---

## 3. Test Runner Configuration

- **Unit & Integration:** Jest with `ts-jest` targeting Node runtime with React Native / polyfill mocking.
- **Concurrency & Live Database:** Direct HTTP RPC invocation against Supabase PostgREST endpoints and `pg.Pool` connection where direct database credentials are provided.
- **Safe Cleanup:** All test runs execute `qa/scripts/qa-cleanup.sh` to purge synthetic test records without affecting seed data.
