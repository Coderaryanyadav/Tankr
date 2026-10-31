# TANKR — Technical & Domain Glossary

This glossary clarifies domain-specific concepts used across the codebase and documentation.

---

## 1. Domain Terminology

- **Sump**: The underground or ground-level water storage reservoir of a residential apartment building or commercial facility into which tankers discharge water.
- **Deficit Zone**: A designated municipal cluster where instantaneous water demand exceeds local aquifer and pipeline capacity, triggering dynamic pricing surge multipliers.
- **BIS 10500**: The mandatory Bureau of Indian Standards specification for drinking water purity, specifying acceptable thresholds for TDS, pH, turbidity, and microbiological contamination.
- **TDS (Total Dissolved Solids)**: Concentration of dissolved minerals and organic matter in water measured in parts per million (ppm). TANKR enforces a potable threshold of `< 250 ppm`.
- **4-Digit Delivery PIN**: A one-time cryptographic code issued to the customer upon order confirmation. The driver must enter this PIN into their console to authorize valve opening and complete delivery.
- **85/5/10 Payout Split**: TANKR's economic distribution model: 85% of base and distance fares are credited to the driver, 5% is allocated to fleet vehicle maintenance, and 10% represents platform commission.

---

## 2. Technical & Architecture Terms

- **PostGIS**: Spatial database extender for PostgreSQL that enables geographic calculations (point distance, polygon intersections, and bounding box clustering).
- **Fermat Spiral Anti-Collision**: The golden-angle radial dispersion algorithm used in `AdminFleetMapView.tsx` to offset vehicles parked at the same depot coordinates so markers remain individually clickable.
- **CDC (Change Data Capture)**: Streaming mechanism in PostgreSQL where database row mutations are published directly to WebSocket clients via Supabase Realtime.
- **Security Definer**: PostgreSQL function execution mode where stored procedures execute with the privileges of the database owner rather than the calling client, securely bypassing RLS boundaries for vetted operations.
