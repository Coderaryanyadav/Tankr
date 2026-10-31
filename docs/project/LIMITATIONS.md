# TANKR — Architectural & Operational Boundaries

This document defines the intentional operational constraints of the current platform version.

---

## 1. Geospatial Scope

- **Active Operational Hubs**: Delivery dispatch is currently restricted to Mumbai Metro operational zones (Marol, Sakinaka, SEEPZ, Powai, Chakala, Chandivali).
- **Out-of-Bounds Handling**: Orders initiated with delivery coordinates outside these polygons are rejected with `OUTSIDE_ZONE`.

---

## 2. Capacity Tiers

To match physical tanker manufacturing standards in India:
- Supported volume tiers: **2,000L**, **5,000L**, **10,000L**, and **20,000L**.
- Arbitrary partial load requests (e.g. 3,450L) are not supported to preserve hydraulic tank balance during transit.

---

## 3. Database Connection Pooling

- In high-throughput production environments, Supabase direct connections on port `5432` must be routed through the Supavisor connection pooler on port `6543` (transaction mode) to avoid PostgreSQL connection exhaustion.
