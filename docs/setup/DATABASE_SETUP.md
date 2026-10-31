# TANKR — Database Setup & Migration Guide

## 1. Prerequisites

TANKR requires **PostgreSQL 15** with the **PostGIS** geospatial extension enabled.

---

## 2. Setting Up Database via Supabase Cloud (Recommended for Teams)

1. Create a project at [supabase.com](https://supabase.com).
2. Go to **Database** > **Extensions** and ensure `postgis` is enabled.
3. Open **SQL Editor** > **New Query**.
4. Paste and execute the contents of [`supabase/migrations/20261031000001_master_database_schema.sql`](../../supabase/migrations/20261031000001_master_database_schema.sql).
5. Paste and execute [`supabase/admin_fixes.sql`](../../supabase/admin_fixes.sql).
6. Copy your project URL and `anon` key from **Project Settings** > **API** into `.env`.

---

## 3. Setting Up Database Locally via Supabase CLI

If you have Docker running locally:

```bash
# 1. Start local Supabase container stack
npx supabase start

# 2. Push migrations forward
./scripts/run-migrations.sh

# 3. Seed realistic Mumbai operational fleet data
./scripts/seed-demo-data.sh
```

Local Supabase services:
- **API URL**: `http://127.0.0.1:54321`
- **Database**: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
- **Studio Dashboard**: `http://127.0.0.1:54323`
- **Inbucket (Mock SMS & Emails)**: `http://127.0.0.1:54324`

---

## 4. Resetting the Local Database

To wipe and rebuild your local database:

```bash
./scripts/reset-local-db.sh
```

*(Note: This script contains an automated guard preventing accidental execution against remote Supabase cloud projects).*
