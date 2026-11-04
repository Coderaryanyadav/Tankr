# Changelog

All notable changes to the TANKR platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-10-31

### Added
- **Unified Master Database Architecture**:
  - Consolidated PostgreSQL database schema across 21 core tables in `supabase/migrations/20261031000001_master_database_schema.sql`.
  - Implemented 19 atomic `SECURITY DEFINER` stored procedures governing booking quotes, payments, emergency dispatches, and KYC approvals.
  - Comprehensive Row-Level Security (RLS) policies for `customer`, `driver`, `supplier`, and `admin` roles.
- **Operations Command Admin Portal (10 Live Desks)**:
  - Desk 1: *Operations Desk* — Live GMV, revenue, delivery rates, dynamic surge multiplier controls.
  - Desk 2: *Fleet Map & Heatmap* — Anti-collision golden-angle tanker dispersion, perimeter-anchored zone badges, live telemetry, and full vehicle CRUD.
  - Desk 3: *Hospital Dispatch (20m SLA)* — Priority routing for dialysis units, ICUs, and critical care sumps.
  - Desk 4: *Financial & Payouts* — Driver payout reconciliation, 85/5/10 breakdown, UPI/Bank settlement.
  - Desk 5: *Water Quality Audit* — BIS 10500 potable certification records, sensor tracking for TDS (<250 ppm), pH, and microbial safety.
  - Desk 6: *Corporate Contracts* — B2B SLAs, scheduled recurring bulk deliveries, and commercial sumps.
  - Desk 7: *Supplier KYC Approvals* — Vendor licensing, GSTIN compliance, and fleet verification workflow.
  - Desk 8: *Disputes & Escrow* — Automated refund issuance, evidence tracking, and conflict dismissals.
  - Desk 9: *PostGIS Service Zones* — Geospatial polygons, traffic multipliers, and live liquidity health.
  - Desk 10: *System Audit Trail* — Real-time event log for administrative actions.
- **Role-Based Experience**:
  - Server-authoritative role routing via `RootNavigator.tsx` (`admin`, `supplier`, `driver`, `customer`).
  - Genuine OTP authentication supporting local test SMS credentials.
- **Automated Developer Tooling**:
  - One-command setup (`./scripts/setup.sh`).
  - Comprehensive diagnostic utilities (`check-environment.sh`, `validate-env.sh`, `verify-project.sh`).
  - Local database reset and seeding scripts (`reset-local-db.sh`, `seed-demo-data.sh`).

### Fixed
- Map visual clutter: tankers now disperse in a spiral pattern to eliminate pin overlap, and license plates toggle cleanly on demand.
- Mobile profile onboarding error: added `complete_customer_onboarding` RPC and resolved PostgreSQL 42501 permission denial.
- Unified fragmented migration files into a single master schema with complete test coverage.
