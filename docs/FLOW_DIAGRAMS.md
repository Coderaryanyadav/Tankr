# TANKR — System Flow Diagrams & Lifecycle State Machines

This document provides visual flowcharts and sequence diagrams detailing every user journey and operational protocol within the TANKR ecosystem.

---

## 1. End-to-End Booking & Delivery Lifecycle

The interaction between Customer, Platform Engine, Tanker Supplier, and Driver follows an Uber/Ola-style dispatch loop:

```mermaid
sequenceDiagram
    autonumber
    actor Customer
    participant App as TANKR Mobile App
    participant Engine as PostgreSQL & PostGIS
    actor Supplier as Water Supplier
    actor Driver as Tanker Driver

    Customer->>App: Opens map & selects tanker capacity (e.g. 5,000L)
    App->>Engine: get_nearby_tankers(lat, lng, radius_km=10)
    Engine-->>App: Tankers list sorted by ETA & pricing
    Customer->>App: Taps "Book Now" & selects payment mode
    App->>Engine: calculate_booking_quote(tanker_id, lat, lng)
    Engine-->>App: Itemized quote (Base + Distance + Surge + 5% GST)
    Customer->>App: Confirms booking
    App->>Engine: create_booking_atomic(tanker_id, customer_id, address)
    Note over Engine: Locks tanker with SELECT ... FOR UPDATE<br/>Generates 4-digit Delivery PIN
    Engine-->>App: Booking created with Delivery PIN (e.g. 4829)
    Engine->>Supplier: Dispatch alert notification
    Supplier->>Engine: supplier_accept_booking(booking_id)
    Supplier->>Driver: Assigns vehicle & dispatch order
    Driver->>Engine: driver_update_delivery_status('en_route')
    loop Real-Time Telemetry (every 3-5s)
        Driver->>Engine: record_driver_location_ping(lat, lng, speed, heading)
        Engine->>App: Broadcasts via Supabase Realtime (booking:tracking:id)
        App-->>Customer: Tanker pin moves along polyline route
    end
    Driver->>Engine: driver_update_delivery_status('arrived')
    Driver->>Customer: Arrives at delivery address
    Customer->>Driver: Shares 4-digit PIN (4829)
    Driver->>Engine: driver_update_delivery_status('delivered', pin='4829')
    Note over Engine: Validates PIN match<br/>Executes generate_invoice_for_booking RPC
    Engine-->>Customer: Delivery completed alert + Official Tax Invoice
```

---

## 2. 4-Digit Delivery PIN Verification State Machine

To prevent drivers from marking deliveries complete without physical water transfer, completion is guarded by a cryptographic PIN exchange:

```mermaid
flowchart TD
    A["Customer initiates booking"] --> B["Database generates unique 4-digit PIN<br/>(e.g., '4829')"]
    B --> C["PIN stored securely on booking record"]
    C --> D["PIN displayed on Customer screen & in-trip card"]
    D --> E["Driver arrives at customer location"]
    E --> F["Driver requests PIN from customer"]
    F --> G["Driver enters 4-digit PIN in Driver Console"]
    G --> H{"Does entered PIN match<br/>booking.delivery_pin?"}
    H -- "NO (Mismatch)" --> I["Show Error: 'Invalid PIN. Please check with customer.'"]
    I --> F
    H -- "YES (Match)" --> J["Update status to 'delivered'"]
    J --> K["Generate official GST Tax Invoice"]
    K --> L["Trigger 'delivery_completed' push notification"]
    L --> M["Capture/Settle payment transaction"]
```

---

## 3. Booking State Machine & Permitted Transitions

A booking must advance through strict, immutable state transitions:

```mermaid
stateDiagram-v2
    [*] --> pending: Customer creates booking
    pending --> accepted: Supplier accepts dispatch
    pending --> cancelled: Customer cancels / Supplier declines
    accepted --> en_route: Driver starts transit
    accepted --> cancelled: Emergency abort
    en_route --> arrived: Driver arrives at gate
    arrived --> pumping: Water hose connected & transfer starts
    pumping --> delivered: 4-digit PIN verified & transfer done
    delivered --> [*]
    cancelled --> [*]
```

---

## 4. Real-time Telemetry & Velocity Anti-Spoofing Filter

To prevent spoofed coordinates or unrealistic teleportation pings, every driver coordinate update passes through a spatial velocity filter:

```mermaid
flowchart TD
    P["Driver GPS Ping (lat, lng, timestamp)"] --> Q["Retrieve previous coordinate (prev_lat, prev_lng, prev_time)"]
    Q --> R["Compute distance: ST_Distance(current_pt, prev_pt)"]
    R --> S["Compute time delta: delta_t = timestamp - prev_time"]
    S --> T["Calculate velocity: Speed = distance / delta_t"]
    T --> U{"Is calculated speed > 100 km/h?"}
    U -- "YES (> 100 km/h)" --> V["Flag as Spoofed/Invalid<br/>Discard from map stream"]
    U -- "NO (<= 100 km/h)" --> W["Store in tanker_telemetry table"]
    W --> X["Broadcast to Supabase Realtime channel<br/>'booking:tracking:<booking_id>'"]
    X --> Y["Customer App rotates tanker pin & recalculates ETA"]
```

---

## 5. Operations Command Center: Emergency Drought Protocol

In severe water shortage scenarios or civic emergencies, the platform enables priority routing and regulatory price controls:

```mermaid
flowchart LR
    Admin["Ops Admin Dashboard"] --> Toggle{"Toggle Crisis Drought Mode"}
    Toggle -- "ENABLED" --> Cap["Cap Max Price per kL<br/>(Prevents gouging)"]
    Toggle -- "ENABLED" --> Priority["Route Available Tankers to<br/>Hospitals & Critical Infrastructure"]
    Toggle -- "ENABLED" --> Alert["Broadcast Urgent Water Rationing<br/>Alert to All Users"]
    Toggle -- "DISABLED" --> Normal["Resume Standard Algorithmic Pricing<br/>(Dynamic Surge 1.0x - 2.0x)"]
```
