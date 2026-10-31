# TANKR — Database Architecture Reference

## 1. Schema Overview

The database runs on PostgreSQL 15 with the PostGIS extension (`postgis`). All tables reside in the `public` schema and enforce Row-Level Security (RLS).

The schema is maintained in [`supabase/migrations/20261031000001_master_database_schema.sql`](../../supabase/migrations/20261031000001_master_database_schema.sql).

---

## 2. Table Catalog (21 Tables)

### User & Identity Management
1. **`public.profiles`**: Extends `auth.users`. Stores phone numbers, display names, delivery addresses, and user roles (`customer`, `driver`, `supplier`, `admin`).
2. **`public.saved_addresses`**: Customer delivery destinations with PostGIS `geography(POINT, 4326)` coordinates, apartment/flat numbers, landmarks, and PIN codes.
3. **`public.driver_profiles`**: Driver licensing details, active duty flags, and assigned tanker foreign key references.
4. **`public.suppliers`**: Water vendors, business names, GSTIN, verified water sources, ratings, and KYC verification status.

### Fleet & Geospatial Service Zones
5. **`public.service_zones`**: Geospatial service zones across Mumbai hubs (Marol, Sakinaka, SEEPZ, Powai, Chakala, Chandivali). Contains polygon boundaries, center coordinates, traffic multipliers, and minimum fleet density.
6. **`public.tankers`**: Core fleet inventory. Contains license plates, capacities (2k, 5k, 10k, 20k L), water grade, current PostGIS coordinates, heading degrees, online status, and availability flags.
7. **`public.tracking_breadcrumbs`**: Historical GPS telemetry stream recorded during active deliveries for route tracing and speed analytics.

### Commerce, Orders & Settlement
8. **`public.bookings`**: Core order ledger. Contains booking reference, customer ID, supplier ID, tanker ID, delivery coordinates, 4-digit verification PIN, pricing breakdown, quote expiration timestamps, and status state machine.
9. **`public.payments`**: Payment transaction logs, gateway references (Razorpay payment ID), amounts, and payment methods (UPI, Card, Netbanking, COD).
10. **`public.invoices`**: GST-compliant invoice records, tax breakdowns, and customer billing data.
11. **`public.driver_payout_ledger`**: Automated 85/5/10 earnings breakdown, tips, and settlement disbursement statuses.

### Operations, Compliance & Escalation
12. **`public.disputes`**: Customer arbitration claims, reason codes, refund amounts, and administrative resolutions.
13. **`public.emergency_dispatches`**: 20-minute SLA dispatches for hospitals, dialysis centers, and critical care units.
14. **`public.water_quality_certificates`**: Laboratory compliance records tracking Total Dissolved Solids (TDS), pH balances, turbidity, and coliform screenings (BIS 10500 standard).
15. **`public.corporate_subscriptions`**: B2B bulk supply contracts, scheduled delivery slots, and recurring billing.
16. **`public.community_pools`**: Apartment complex group delivery pools allowing residents to share large 20kL tanker loads.
17. **`public.community_pool_contributions`**: Individual resident financial contributions toward community water orders.
18. **`public.notifications`**: In-app and push notification event stream.
19. **`public.platform_settings`**: Global configuration key-value store (pricing defaults, commission take-rates, SLA thresholds).
20. **`public.admin_audit_logs`**: Immutable event ledger recording administrative interventions (rebalancing, fee overrides, KYC approvals).
21. **`public.suspended_entities`**: Security blacklist tracking suspended drivers, suppliers, or vehicles.

---

## 3. Spatial Indexing & Geospatial Performance

Spatial queries utilize GiST (Generalized Search Tree) indexes:

```sql
CREATE INDEX idx_tankers_location ON public.tankers USING GIST (current_location);
CREATE INDEX idx_saved_addresses_coordinates ON public.saved_addresses USING GIST (coordinates);
CREATE INDEX idx_service_zones_boundary ON public.service_zones USING GIST (boundary);
CREATE INDEX idx_tracking_breadcrumbs_coords ON public.tracking_breadcrumbs USING GIST (coordinates);
```

### Proximity Calculation
Nearest available tanker queries utilize PostGIS spherical distance:
```sql
SELECT id, vehicle_number, 
       ST_Distance(current_location, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography) AS distance_meters
FROM public.tankers
WHERE is_available = TRUE AND is_online = TRUE
ORDER BY current_location <-> ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
LIMIT 5;
```
