# TANKR — Architectural Blueprint & System Architecture

This document outlines the technical design, architectural layers, data pathways, and geospatial calculation pipelines of the TANKR mobile platform.

---

## 1. Multi-Tier System Architecture

```mermaid
flowchart TD
    subgraph Client ["Client Layer (React Native + Expo SDK 58)"]
        UI["UI Screens & Design System<br/>(Tailwind/StyleSheet, Custom Components)"]
        Zustand["Zustand Global State Stores<br/>(Auth, Location, Booking, Supply, Admin)"]
        SecureStore["expo-secure-store<br/>(Hardware Keychain / Keystore)"]
    end

    subgraph Gateway ["Network & Transport Gateway"]
        REST["PostgREST HTTP API<br/>(JWT Bearer Auth)"]
        Realtime["Supabase Realtime WebSockets<br/>(Telemetry broadcast & presence)"]
    end

    subgraph Backend ["Backend & Database (Supabase / PostgreSQL 15)"]
        PostGIS["PostGIS Spatial Engine 3.3+<br/>(geography POINT 4326, ST_DWithin)"]
        RLS["Row-Level Security (RLS)<br/>(Tenant & Role Data Isolation)"]
        RPCs["Authoritative PL/pgSQL RPCs<br/>(Atomic booking, quote calculation, invoices)"]
    end

    UI --> Zustand
    Zustand --> SecureStore
    Zustand --> REST
    Zustand --> Realtime
    REST --> RLS
    Realtime --> RPCs
    RLS --> PostGIS
    RPCs --> PostGIS
```

---

## 2. Concurrency Control & Double-Booking Prevention

On-demand utility dispatch platforms encounter high contention during peak demand periods. Two users may attempt to reserve the same tanker simultaneously. TANKR uses pessimistic row locking inside the database engine:

```mermaid
sequenceDiagram
    autonumber
    actor Customer_A as Customer A
    actor Customer_B as Customer B
    participant DB as PostgreSQL Transaction Engine

    Customer_A->>DB: BEGIN create_booking_atomic(tanker_1)
    Note over DB: SELECT * FROM tankers WHERE id = 'tanker_1' FOR UPDATE;
    Note over DB: Lock acquired by Customer A
    Customer_B->>DB: BEGIN create_booking_atomic(tanker_1)
    Note over DB: SELECT * FROM tankers WHERE id = 'tanker_1' FOR UPDATE;
    Note over DB: Customer B is BLOCKED waiting for lock release...
    DB-->>Customer_A: Tanker available -> Booking created -> UPDATE tanker is_available = FALSE
    Customer_A->>DB: COMMIT (Lock released)
    Note over DB: Customer B resumes evaluation...
    DB-->>Customer_B: Tanker is_available == FALSE -> RAISE EXCEPTION 'Tanker already booked'
    Customer_B->>DB: ROLLBACK
```

---

## 3. PostGIS Spatial Discovery & Route Distance Estimation

When discovering nearby tankers, aerial straight-line distance (haversine) does not reflect actual road travel times in dense metropolitan traffic. TANKR calculates road travel distance using a 1.25 urban winding correction factor:

$$\text{Road Distance (km)} = \left(\frac{\text{ST\_Distance}(\text{tanker\_coord}, \text{user\_coord})}{1000}\right) \times 1.25$$

$$\text{Estimated Travel Time (minutes)} = \left(\frac{\text{Road Distance}}{\text{Urban Avg Speed (20 km/h)}}\right) \times 60 + \text{Depot Prep Time (5 mins)}$$

```mermaid
flowchart LR
    Coords["Customer Coordinates (Lat, Lng)"] --> PostGIS["ST_DWithin(tanker.location, user.location, 10,000m)"]
    PostGIS --> Filter["Filter tankers where is_online = true AND is_available = true"]
    Filter --> Distance["ST_Distance multiplied by 1.25 Winding Factor"]
    Distance --> Sort["Sort by ETA ascending & Price"]
    Sort --> Result["Emit JSON list of nearby tankers to Discovery Bottom Sheet"]
```

---

## 4. Multi-Role Permissions & Architectural Separation

```mermaid
flowchart TD
    subgraph Roles ["Platform Roles"]
        Customer["Customer Role"]
        Supplier["Supplier Role"]
        Driver["Driver Role"]
        Admin["Ops Admin Role"]
    end

    subgraph Capabilities ["Permitted Actions"]
        Customer --> C_Act["• Discover tankers<br/>• Request quotes<br/>• Pay & book<br/>• Track live GPS<br/>• View tax invoices"]
        Supplier --> S_Act["• Accept/reject dispatches<br/>• Manage fleet vehicles<br/>• View depot revenues<br/>• Monitor driver assignments"]
        Driver --> D_Act["• Toggle on/off duty<br/>• Google Maps turn-by-turn navigation<br/>• Broadcast GPS pings<br/>• Verify 4-digit PIN"]
        Admin --> A_Act["• Review supplier KYC<br/>• Dynamic surge adjustments<br/>• Crisis emergency override<br/>• Settle disputes & refunds"]
    end
```
