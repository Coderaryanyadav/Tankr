# TANKR — Database Functions & Stored Procedures Reference

This document details all 19 PostgreSQL stored procedures implemented in `public` schema.

---

## 1. Commerce & Quoting Procedures

### `calculate_booking_quote()`
- **Purpose**: Computes distance, surge pricing, capacity multiplier, and tax for a candidate booking.
- **Security Context**: `SECURITY DEFINER`
- **Parameters**:
  - `p_delivery_lat` (DOUBLE PRECISION): Target dropoff latitude.
  - `p_delivery_lng` (DOUBLE PRECISION): Target dropoff longitude.
  - `p_capacity_liters` (INT): Desired volume (2000, 5000, 10000, 20000).
  - `p_water_type` (TEXT): Grade requested.
- **Returns**: JSONB containing base fare, delivery charge, dynamic surge, GST, total payable, and quote expiration timestamp (15m TTL).

### `create_booking_atomic()`
- **Purpose**: Atomically locks the nearest candidate tanker, validates price quote TTL, and inserts order.
- **Security Context**: `SECURITY DEFINER`
- **Concurrency Guard**: `SELECT ... FOR UPDATE` on candidate tanker row.
- **Parameters**: `p_customer_id`, `p_tanker_id`, `p_capacity_liters`, `p_delivery_address`, `p_lat`, `p_lng`, `p_payment_pref`.
- **Returns**: JSONB `{ success: true, booking_id, booking_reference, delivery_pin }`.

### `verify_and_reconcile_payment()`
- **Purpose**: Settles escrow hold upon successful delivery and credits driver ledger.
- **Security Context**: `SECURITY DEFINER`
- **Parameters**: `p_booking_id`, `p_amount`, `p_status`, `p_gateway_payment_id`.
- **Side Effects**: Generates invoice in `public.invoices` and inserts 85% earning row into `public.driver_payout_ledger`.

---

## 2. Fleet & Driver Procedures

### `record_driver_location_ping()`
- **Purpose**: High-frequency driver GPS telemetry ingestion.
- **Parameters**: `p_tanker_id`, `p_booking_id`, `p_lat`, `p_lng`, `p_speed`, `p_heading`.
- **Side Effects**: Updates `public.tankers` spatial coordinate and appends to `public.tracking_breadcrumbs`.

### `driver_complete_delivery_with_meter()`
- **Purpose**: Finalizes dropoff. Enforces customer 4-digit PIN verification and flow meter volume match.
- **Parameters**: `p_booking_id`, `p_driver_phone`, `p_entered_pin`, `p_meter_liters_delivered`.

---

## 3. Administrative Operations Procedures

### `get_admin_dashboard_metrics()`
- **Purpose**: Aggregates live platform volume, revenue, delivered liters, and network surge status.
- **Returns**: TABLE (gross_volume_gmv, platform_revenue, total_bookings, completed_deliveries, active_tankers_online, total_suppliers, pending_kyc_count, total_liters_delivered, network_surge_multiplier).

### `admin_emergency_dispatch()`
- **Purpose**: Overrides fleet routing to send closest available heavy tanker to a hospital within 20m SLA.
- **Parameters**: `p_institution_name`, `p_institution_type`, `p_contact_person`, `p_contact_phone`, `p_delivery_address`, `p_lat`, `p_lng`, `p_required_liters`, `p_tanker_id`.

### `admin_verify_supplier()`
- **Purpose**: Verifies or rejects vendor KYC application.
- **Parameters**: `p_supplier_id`, `p_status` ('verified' | 'rejected').

### `admin_resolve_dispute()`
- **Purpose**: Settles customer complaint. Issues refund or dismisses claim.
- **Parameters**: `p_dispute_id`, `p_status` ('refunded' | 'dismissed'), `p_refund_amount`, `p_notes`.

### `admin_rebalance_tanker()`
- **Purpose**: Relocates tanker coordinates to an active deficit service zone.
- **Parameters**: `p_tanker_id`, `p_zone_name`.

### `complete_customer_onboarding()`
- **Purpose**: Atomically upserts user profile and default delivery address, bypassing client RLS snags.
- **Parameters**: `p_full_name`, `p_preferred_address`, `p_city`, `p_pincode`.

---

## 4. Core Operational & Dispatch Procedures

### `create_payment_order()`
- **Purpose**: Creates an immutable server-side payment order record with unique gateway order reference and idempotency key.
- **Parameters**: `p_booking_id` (UUID), `p_method` (TEXT), `p_idempotency_key` (TEXT).

### `generate_invoice_for_booking()`
- **Purpose**: Authoritatively generates a tax invoice record upon delivery completion with CGST/SGST breakdown.
- **Parameters**: `p_booking_id` (UUID).

### `supplier_accept_booking()`
- **Purpose**: Validates supplier ownership, verifies quote expiration window, and transitions booking from `pending` to `accepted`.
- **Parameters**: `p_booking_id` (UUID), `p_supplier_id` (UUID).

### `supplier_cancel_and_reassign()`
- **Purpose**: Releases current tanker, searches for nearest replacement tanker, or cancels and triggers refund if no alternative vehicle exists.
- **Parameters**: `p_booking_id` (UUID), `p_supplier_id` (UUID), `p_reason` (TEXT).

### `driver_update_delivery_status()`
- **Purpose**: Transitions trip lifecycle (`en_route`, `arrived`, `delivering`, `delivered`) and enforces customer 4-digit PIN check on dropoff.
- **Parameters**: `p_booking_id` (UUID), `p_new_status` (TEXT), `p_delivery_pin` (TEXT).

### `contribute_to_community_pool()`
- **Purpose**: Registers a resident contribution to a neighborhood bulk water pool and advances pool status to `funded` upon hitting target.
- **Parameters**: `p_pool_code` (TEXT), `p_contributor_name` (TEXT), `p_flat_number` (TEXT), `p_amount` (NUMERIC).

### `submit_customer_dispute()`
- **Purpose**: Records customer dispute with category, volume shortfall details, and sets booking status to `disputed`.
- **Parameters**: `p_booking_id` (UUID), `p_category` (TEXT), `p_reason` (TEXT), `p_liters_received` (NUMERIC), `p_evidence_url` (TEXT).

### `register_supplier()`
- **Purpose**: Onboards new supplier vendor entity, validates 15-character GSTIN, and safely escalates profile role to `supplier`.
- **Parameters**: `p_business_name`, `p_owner_name`, `p_phone_number`, `p_business_address`, `p_gst_number`, `p_water_source`, `p_operating_areas`, `p_tanker_count`.

### `get_nearby_tankers()`
- **Purpose**: High-performance PostGIS spatial radius radar query returning available fleet within service range, calculating 1.25 road curvature distance, 5% GST, and redacting driver phone PII for unprivileged discovery.
- **Parameters**: `user_lat` (DOUBLE PRECISION), `user_lng` (DOUBLE PRECISION), `radius_meters` (DOUBLE PRECISION), `capacity_filter` (INT).

### `get_latest_tracking_breadcrumb()`
- **Purpose**: Returns latest GPS telemetry fix, heading, speed, remaining distance, and ETA with booking party authorization checks.
- **Parameters**: `p_booking_id` (UUID).

### `process_booking_refund()`
- **Purpose**: Authoritatively checks captured payment balances, verifies non-negative refundable bounds, inserts refund ledger records, and marks booking refunded.
- **Parameters**: `p_booking_id` (UUID), `p_reason` (TEXT).
