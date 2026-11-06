# TANKR — Database Migrations Guide

## 1. Architecture & Migration Strategy

TANKR maintains a clean, consolidated migration model:
- **Master Database Schema**: [`supabase/migrations/20261031000001_master_database_schema.sql`](../../supabase/migrations/20261031000001_master_database_schema.sql) contains the unified, self-contained definition of all 21 tables, spatial indexes, triggers, RLS policies, table grants, and initial stored procedures.
- **Core Operational RPCs**: [`supabase/migrations/20261031000002_core_operational_rpcs.sql`](../../supabase/migrations/20261031000002_core_operational_rpcs.sql) defines the core operational procedures (`create_payment_order`, `generate_invoice_for_booking`, `supplier_accept_booking`, `driver_update_delivery_status`, `contribute_to_community_pool`, `submit_customer_dispute`, `register_supplier`, `get_nearby_tankers`, and `get_latest_tracking_breadcrumb`).
- **Unified Seed**: [`supabase/seed.sql`](../../supabase/seed.sql) contains Mumbai operational fleet, bookings, payouts, and service zones.

---

## 2. Authoring New Migrations

1. Generate a new timestamped migration file in `supabase/migrations/`:
   ```text
   supabase/migrations/YYYYMMDDHHMMSS_description.sql
   ```
2. Write defensive, idempotent SQL:
   - Use `CREATE TABLE IF NOT EXISTS`.
   - Use `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.
   - Use `DROP POLICY IF EXISTS` before `CREATE POLICY`.
   - Apply least-privilege grants bounded by RLS: revoke blanket table DML and routines from `anon`, granting execution strictly to `authenticated` and `service_role`.
3. Apply migrations forward:
   ```bash
   ./scripts/run-migrations.sh
   ```
4. Verify tests pass:
   ```bash
   npm run test:ci
   ```
