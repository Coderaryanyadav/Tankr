# TANKR Environment Baseline & Inventory

**Date:** 2026-10-31  
**Auditor:** Independent Engineering & QA Organization  
**Operating System:** macOS (Darwin arm64)  
**Workspace:** `/Users/aryan/Desktop/PROJECTS/TANKR`  
**Git Branch:** `main`  
**Git Commit Baseline:** `54357f8`  

---

## 1. Toolchains & Runtimes

| Component | Detected Version | Target / Minimum | Status |
|---|---|---|---|
| **Node.js** | `v26.11.1` | `>= 18.0.0` | Verified |
| **npm** | `11.20.0` | `>= 9.0.0` | Verified |
| **Git** | `2.56.0` | `>= 2.30.0` | Verified |
| **Docker** | `29.8.2` (CLI present, daemon inactive) | Optional for local | Monitored |
| **Supabase CLI** | `2.122.0` (via npx) | `>= 1.100.0` | Verified |
| **TypeScript** | `6.0.3` | `>= 5.0.0` | Verified |
| **Jest** | `30.5.2` | `>= 29.0.0` | Verified |
| **ts-jest** | `29.4.15` | `>= 29.0.0` | Verified |

---

## 2. Mobile Frameworks & Runtimes

| Library | Version | Purpose |
|---|---|---|
| **Expo SDK** | `~58.0.21` | Application container & native bridging |
| **React** | `19.3.0` | UI Component rendering |
| **React Native** | `0.88.1` | Mobile core engine |
| **React Native Web** | `^0.21.4` | Browser fallback & responsive viewport |
| **Zustand** | `^5.0.16` | Atomic state stores |
| **Zod** | `^4.6.7` | Runtime contract & input validation |
| **Expo Location** | `~58.0.20` | GPS coordinate acquisition & background telemetry |
| **Expo SecureStore** | `~58.0.2` | Keychain/Keystore encrypted token persistence |
| **React Native Maps** | `1.29.11` | Native mapping interface |

---

## 3. Database & Backend Connectivity

- **Supabase Cloud Target:** `https://qicoczialqxulcbipuix.supabase.co`
- **PostgREST Status:** HTTP 200 OK (`apikey` + `Bearer` token authenticated)
- **Database Engine:** PostgreSQL 15+ with `PostGIS` and `uuid-ossp` extensions
- **Connected Tables Probed:**
  - `profiles`: 5 seed records
  - `suppliers`: 4 seed records
  - `tankers`: 6 seed records
  - `service_zones`: 6 seed records (Mumbai Metro / Marol HQ)
  - `community_pools`: 3 seed records
  - `bookings`: 0 active records
  - `invoices`: 0 active records

---

## 4. External Services & Sandboxes

- **Maps Provider:** OpenStreetMap CDN (primary) + Mappls / Carto fallback hooks configured
- **Payment Gateway:** Razorpay Test Sandbox (`EXPO_PUBLIC_RAZORPAY_KEY_ID` configured)
- **Push Notifications:** Expo Notifications / local push dispatch service
- **Authentication:** Supabase Auth (Phone OTP + Email fallback)

---

## 5. Safety & Isolation Guard

- Production Safety Guard: Test runners must check `NODE_ENV=test` and confirm that target database operations are confined to test entities with unique testing prefixes (`test-`, `test_run_`).
- Destructive operations (`DROP DATABASE`, unrestricted `DELETE FROM`) are strictly prevented by environment filters and RLS policies.
