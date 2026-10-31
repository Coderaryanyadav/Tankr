# TANKR — Database & Schema Audit Report

**Document ID:** `QA-REP-06-DATABASE`  
**Date:** 2026-10-31  

---

## 1. Schema & Migration Architecture

- **Active Migrations in `supabase/migrations/`:**
  1. `20261031000001_master_database_schema.sql` (2,164 lines) — Master DDL, table structures, PostGIS extensions, base triggers, and Mumbai Metro seed records.
  2. `20261031000002_core_operational_rpcs.sql` (652 lines) — Forward migration adding core stored procedures (`create_payment_order`, `generate_invoice_for_booking`, `supplier_accept_booking`, `driver_update_delivery_status`, `contribute_to_community_pool`, `submit_customer_dispute`, `register_supplier`, `get_nearby_tankers`).

---

## 2. Table & Integrity Verification

- **Foreign Key Constraints:** Verified on `bookings.customer_id -> profiles.id`, `bookings.supplier_id -> suppliers.id`, `bookings.tanker_id -> tankers.id`, `invoices.booking_id -> bookings.id`.
- **Unique Constraints:** `tankers.vehicle_number`, `suppliers.gstin`, `invoices.invoice_number`, `payments.idempotency_key`.
- **Spatial Geometry:** `coordinates GEOGRAPHY(Point, 4326)` indexed on `saved_addresses`, `service_zones`, and `tankers.current_location`.
- **Transaction Safety:** Stored procedures utilize `FOR UPDATE` row locks to prevent concurrency deadlocks and race conditions.

