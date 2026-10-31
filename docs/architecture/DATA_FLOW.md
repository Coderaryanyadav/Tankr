# TANKR — Data Flow Reference

This document traces the data trajectories across the system during key operational phases.

---

## 1. Discovery & Quoting Flow

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Customer App
    participant PostGIS as PostGIS (calculate_booking_quote)
    participant Zones as public.service_zones
    participant Tankers as public.tankers

    Customer->>PostGIS: RPC calculate_booking_quote(lat, lng, capacity, water_type)
    PostGIS->>Zones: Intersect delivery coords with service zone boundaries
    Zones-->>PostGIS: Return active zone & traffic_multiplier (e.g. 1.25x)
    PostGIS->>Tankers: Query nearest available vehicle
    Tankers-->>PostGIS: Distance km, base price
    PostGIS->>PostGIS: Compute fare = base + (dist * rate) * surge + tax
    PostGIS-->>Customer: Return structured quote JSON with 15-minute TTL
```

---

## 2. Order Placement & Atomic Concurrency Lock

To prevent race conditions where two customers book the same physical tanker simultaneously:

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Customer
    participant RPC as create_booking_atomic
    participant DB as public.tankers & public.bookings

    Customer->>RPC: create_booking_atomic(payload)
    critical Concurrency Locking
        RPC->>DB: SELECT * FROM public.tankers WHERE id = p_tanker_id FOR UPDATE
        Note over RPC,DB: Row lock acquired on physical vehicle
        RPC->>RPC: Verify tanker is still available (is_available == TRUE)
        RPC->>DB: UPDATE public.tankers SET is_available = FALSE WHERE id = p_tanker_id
        RPC->>DB: INSERT INTO public.bookings (status = 'requested', delivery_pin = gen_pin())
    end
    RPC-->>Customer: Return booking_reference & delivery PIN
```

---

## 3. High-Frequency Telemetry Ingestion

```mermaid
sequenceDiagram
    autonumber
    actor Driver as Driver Device
    participant Task as Expo Background Task
    participant RPC as record_driver_location_ping
    participant CDC as Supabase Realtime CDC
    participant Radar as Customer Radar Map

    Task->>RPC: Ingest GPS ping (lat, lng, heading, speed)
    RPC->>RPC: Validate distance delta (dead reckoning anomaly filter)
    RPC->>CDC: UPDATE public.tankers SET current_location = ST_MakePoint(...)
    RPC->>CDC: INSERT INTO public.tracking_breadcrumbs (...)
    CDC-->>Radar: Broadcast updated location over WebSocket
    Radar->>Radar: Update pin rotation & ETA countdown
```
