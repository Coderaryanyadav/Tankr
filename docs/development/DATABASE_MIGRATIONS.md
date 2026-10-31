# TANKR — Database Migrations Guide

## 1. Architecture & Migration Strategy

TANKR maintains a clean, consolidated migration model:
- **Master Database Schema**: [`supabase/migrations/20261031000001_master_database_schema.sql`](../../supabase/migrations/20261031000001_master_database_schema.sql) contains the unified, self-contained definition of all 21 tables, spatial indexes, triggers, RLS policies, table grants, and core stored procedures.
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
   - Include explicit `GRANT ALL ON TABLE public.your_table TO anon, authenticated, service_role`.
3. Apply locally:
   ```bash
   ./scripts/run-migrations.sh
   ```
4. Verify tests pass:
   ```bash
   npm run test:ci
   ```
