# TANKR — Backend Architecture Reference

## 1. Architectural Overview

The TANKR backend leverages **Supabase** running **PostgreSQL 15** with the **PostGIS** geospatial extension enabled.

The backend is built around a "Thick Database, Thin Client" pattern:
- Complex transactional operations, concurrency locks, dynamic surge calculations, and state machine transitions execute inside PostgreSQL functions marked `SECURITY DEFINER`.
- Row-Level Security (RLS) policies guarantee that clients can only query and mutate records they own or are authorized to inspect.
- Real-time updates are pushed to clients using PostgreSQL Change Data Capture (CDC) via Supabase Realtime WebSockets.

---

## 2. Core Stored Procedures (RPCs)

All stored procedures reside in `public` with `SECURITY DEFINER` and strict `search_path = public, pg_temp` guards:

| Stored Procedure | Purpose | Access Control |
| :--- | :--- | :--- |
| `calculate_booking_quote()` | Computes base fare, distance charge, dynamic surge, and tax. Issues 15m expiration. | Public / Authenticated |
| `create_booking_atomic()` | Locks selected tanker, validates expiration, creates booking, and sets vehicle status. | Authenticated Customer |
| `cancel_booking_atomic()` | Cancels booking and handles conditional cancellation penalties based on driver proximity. | Customer / Admin |
| `verify_and_reconcile_payment()`| Verifies gateway receipt, settles invoice, and credits driver payout ledger. | Authenticated / Admin |
| `driver_complete_delivery_with_meter()` | Verifies 4-digit PIN, validates flow meter calibration, completes drop, records audit. | Authenticated Driver |
| `record_driver_location_ping()` | Ingests GPS breadcrumb, updates live tanker geography, broadcasts CDC event. | Authenticated Driver |
| `supplier_onboard_tanker()` | Enrolls new vehicle into fleet with license, capacity, and water source validation. | Verified Supplier |
| `complete_customer_onboarding()`| Upserts user profile and default delivery address with elevated privileges. | Authenticated User |
| `admin_emergency_dispatch()` | Dispatches closest high-capacity tanker to hospital/dialysis node within 20m SLA. | Super Admin |
| `admin_verify_supplier()` | Approves or rejects vendor KYC documents, activating/suspending fleet dispatches. | Super Admin |
| `admin_resolve_dispute()` | Arbitrates customer complaints, issuing refunds or dismissing claims. | Super Admin |
| `admin_rebalance_tanker()` | Auto-reroutes idle tankers to active deficit clusters. | Super Admin |
| `get_admin_dashboard_metrics()`| Calculates live GMV, 10% platform revenue, delivery counts, and surge multipliers. | Super Admin |

---

## 3. Database Triggers

1. **`on_auth_user_created` (`handle_new_user`)**:
   Fires after user registration in `auth.users`. Automatically synchronizes phone numbers and provisions a linked profile row in `public.profiles`.
2. **`on_profile_update_role_check` (`protect_profile_role_escalation`)**:
   Prevents non-admin callers from modifying the `role` column in `public.profiles`.
3. **`trg_sync_address_coordinates`**:
   Automatically generates PostGIS `geography(POINT, 4326)` objects whenever `latitude` and `longitude` are updated on `public.saved_addresses` or `public.tankers`.

---

## 4. Supabase Realtime CDC Publication

The following tables are published to `supabase_realtime`:
- `public.tankers`: Pushes continuous coordinate and status updates to consumer radars and admin fleet maps.
- `public.bookings`: Notifies drivers of new orders and updates customer tracking screens.
- `public.tracking_breadcrumbs`: High-frequency breadcrumb streams for route visualization.
- `public.emergency_dispatches`: Real-time updates for critical care hospital dispatch monitors.
- `public.community_pools`: Updates group pool balance and delivery milestones.
