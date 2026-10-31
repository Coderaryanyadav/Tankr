# TANKR — Troubleshooting Guide

This guide addresses real-world issues, error messages, and verified solutions.

---

## 1. "permission denied for table profiles" (PostgreSQL Error 42501)

### Symptom:
When saving the onboarding form ("Save & Proceed to Tankers"), an alert displays:
```text
Error: permission denied for table profiles
```

### Cause:
PostgreSQL checks table-level permissions before evaluating Row-Level Security. If the database role `authenticated` or `anon` lacks explicit `GRANT ALL` on `public.profiles`, writes fail.

### Safe Solution:
Execute the master migration [`supabase/migrations/20261031000001_master_database_schema.sql`](../../supabase/migrations/20261031000001_master_database_schema.sql) in your Supabase SQL Editor. It grants full table permissions (`GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role`) and provides the atomic `complete_customer_onboarding` stored procedure with `SECURITY DEFINER`.

---

## 2. Port 8081 Already in Use / Stale Metro Bundler Cache

### Symptom:
Expo fails to launch with `EADDRINUSE: address already in use :::8081`.

### Diagnostic Command:
```bash
lsof -i :8081
```

### Solution:
```bash
# Clean temporary bundler caches safely
./scripts/clean.sh

# Or start Expo on an alternate port
npx expo start --web --port 8082
```

---

## 3. SMS OTP Not Arriving on Mobile Phone

### Symptom:
Clicking "Continue" on the login screen does not send an SMS to your mobile device.

### Cause:
Third-party SMS gateways (Twilio / MessageBird) require paid balances and template whitelisting in production.

### Safe Solution:
Use pre-configured local test phone numbers that accept fixed OTP **`123456`**:
- **Admin**: `8888888888`
- **Supplier**: `9999999999`
- **Driver**: `9000000001`
- **Customer**: `9876543210`

---

## 4. Map Telemetry Tiles Displaying Watermarks or Failing to Load

### Symptom:
The map canvas shows diagonal watermarks or failed tile network requests.

### Cause:
The optional `EXPO_PUBLIC_CARTO_API_KEY` or `EXPO_PUBLIC_MAPPLS_REST_KEY` has expired or reached usage quotas.

### Solution:
The map automatically falls back to OpenStreetMap tiles. In web mode, you can toggle between **Dark Ops** and **Street Grid** themes using the top map toolbar.
