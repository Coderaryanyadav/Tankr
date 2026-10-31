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
