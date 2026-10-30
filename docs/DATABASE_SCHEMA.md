# TANKR — Database Schema & Data Dictionary

This document specifies the PostgreSQL 15+ relational schema, PostGIS spatial data types, indices, and server-side RPC functions.

---

## 1. Entity-Relationship Diagram

```mermaid
erDiagram
    PROFILES ||--o{ USER_ADDRESSES : "saves"
    PROFILES ||--o{ BOOKINGS : "places"
    PROFILES ||--o{ INVOICES : "receives"
    PROFILES ||--o{ NOTIFICATIONS : "receives"
    PROFILES ||--o{ DISPUTES : "opens"
    
    SUPPLIERS ||--o{ TANKERS : "operates"
    SUPPLIERS ||--o{ BOOKINGS : "dispatches"
    
    TANKERS ||--o{ BOOKINGS : "fulfills"
    TANKERS ||--o{ TANKER_TELEMETRY : "emits"
    
    BOOKINGS ||--|| PAYMENTS : "contains"
    BOOKINGS ||--|| INVOICES : "generates"
    BOOKINGS ||--o{ NOTIFICATIONS : "triggers"
    BOOKINGS ||--o{ DISPUTES : "subject_to"

    PROFILES {
        UUID id PK
        TEXT phone_number UK
        TEXT full_name
        TEXT profile_photo_url
        BOOLEAN is_onboarding_completed
        TIMESTAMPTZ created_at
    }

    USER_ADDRESSES {
        UUID id PK
        UUID user_id FK
        TEXT label
        TEXT full_address
        GEOGRAPHY location "POINT(4326)"
        VARCHAR postal_code
        BOOLEAN is_default
    }

    SUPPLIERS {
        UUID id PK
        TEXT business_name
        TEXT contact_person
        TEXT phone_number
        TEXT gstin
        TEXT verification_status
        GEOGRAPHY depot_location "POINT(4326)"
    }

    TANKERS {
        UUID id PK
        UUID supplier_id FK
        TEXT vehicle_number UK
        INT capacity_liters
        TEXT water_type
        BOOLEAN is_online
        BOOLEAN is_available
        GEOGRAPHY current_location "POINT(4326)"
        NUMERIC base_price
        NUMERIC price_per_km
    }

    BOOKINGS {
        UUID id PK
        TEXT booking_reference UK
        UUID customer_id FK
        UUID tanker_id FK
        UUID supplier_id FK
        TEXT status
        TEXT delivery_pin
        NUMERIC final_payable_amount
        TIMESTAMPTZ created_at
    }

    PAYMENTS {
        UUID id PK
        UUID booking_id FK
        TEXT gateway_order_id
        NUMERIC amount
        TEXT method
        TEXT status
        TEXT idempotency_key UK
    }

    INVOICES {
        UUID id PK
        UUID booking_id FK
        TEXT invoice_number UK
        UUID customer_id FK
        NUMERIC total_amount
        TEXT payment_status
        TIMESTAMPTZ issued_at
    }

    NOTIFICATIONS {
        UUID id PK
        UUID user_id FK
        TEXT title
        TEXT body
        TEXT type
        BOOLEAN is_read
    }

    DISPUTES {
        UUID id PK
        UUID booking_id FK
        UUID customer_id FK
        TEXT reason
        TEXT status
        NUMERIC refund_amount
    }
```

---

## 2. Server-Side RPC Functions Catalog

| Function Name | Return Type | Purpose |
| :--- | :--- | :--- |
| `get_nearby_tankers(lat, lng, radius_km)` | `TABLE(...)` | Executes PostGIS `ST_DWithin` and `ST_Distance` query to locate available tankers within radius. |
| `calculate_booking_quote(tanker_id, lat, lng)` | `TABLE(...)` | Authoritatively calculates base fare, distance charge, peak surcharge, and 5% GST. |
| `create_booking_atomic(tanker_id, ...)` | `TABLE(...)` | Atomically locks tanker row with `FOR UPDATE`, checks availability, and inserts booking with 4-digit PIN. |
| `cancel_booking_atomic(booking_id, reason)` | `BOOLEAN` | Cancels booking, releases tanker availability, and triggers refund record. |
| `supplier_accept_booking(booking_id, supplier_id)` | `BOOLEAN` | Supplier accepts incoming dispatch request and initiates driver assignment. |
| `driver_update_delivery_status(booking_id, status, pin)` | `BOOLEAN` | Advances delivery status (`en_route` ➔ `arrived` ➔ `delivered`), validating PIN on completion. |
| `record_driver_location_ping(booking_id, ...)` | `BOOLEAN` | Logs driver telemetry with velocity check (>100 km/h rejected) and updates current tanker coordinates. |
| `generate_invoice_for_booking(booking_id)` | `TABLE(...)` | Generates official tax invoice record and delivery completion notification. |
| `get_admin_dashboard_metrics()` | `TABLE(...)` | Aggregates Gross Merchandise Value (GMV), platform commission, fleet count, and water volume. |
| `admin_verify_supplier(supplier_id, status)` | `BOOLEAN` | Approves or rejects supplier KYC compliance status. |
