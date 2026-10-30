# TANKR — Comprehensive Security & Threat Model Audit

**Date:** October 30, 2026  
**Auditor:** Senior Security Architect  
**Classification:** Confidential / Production Readiness  
**Target:** Client-Side Application, Supabase Backend, PostGIS Engine, Realtime Gateway  

---

## 1. Threat Modeling Overview

TANKR operates as a two-sided on-demand utility marketplace with real-world physical delivery of bulk water. The security surface includes:
1. **Financial Security:** Pricing integrity, double debit prevention, payment capture verification.
2. **Delivery & Handoff Security:** Proof-of-delivery verification, water theft prevention, unauthorized driver impersonation.
3. **Data Privacy & PII:** Customer addresses, phone numbers, GPS location telemetry.
4. **Platform Infrastructure:** Row-Level Security (RLS) enforcement, database transaction atomicity, rate limiting.

---

## 2. Row-Level Security (RLS) Enforcement

All PostgreSQL tables have Row Level Security enabled (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`).

| Table | RLS Policy | Security Justification |
| :--- | :--- | :--- |
| `public.profiles` | `auth.uid() = id` | Customers can only view and mutate their own profile information. |
| `public.user_addresses` | `auth.uid() = user_id` | Prevents malicious users from reading or altering another customer's saved homes/work addresses. |
| `public.bookings` | Select/Update filtered by `customer_id` or `supplier_id` | Customer only sees their bookings; suppliers only see dispatches assigned to their fleet. |
| `public.invoices` | `auth.uid() = customer_id` | Protects financial tax invoices and PII from unauthorized scrapers. |
| `public.notifications` | `auth.uid() = user_id` | Notification inbox is strictly isolated per authenticated user. |
| `public.tanker_telemetry` | Driver inserts authenticated telemetry; customers read only active booking channel. | Prevents fleet tracking spoofing by unassigned parties. |

---

## 3. Financial Integrity & Price Tampering Defenses

### Threat 3.1: Client-Side Price Manipulation
- **Vulnerability:** Malicious actor modifies the HTTP payload to request a 10,000L tanker for ₹10.
- **TANKR Defense:** All price quotes and final charges are calculated **authoritatively on the database server** inside `calculate_booking_quote` and `create_booking_atomic`. The client's requested price is completely ignored; rates are fetched from verified supplier records and platform settings.

### Threat 3.2: Concurrent Double-Booking
- **Vulnerability:** Two users simultaneously book the same 5,000L tanker within the same millisecond.
- **TANKR Defense:** `create_booking_atomic` executes `SELECT id FROM public.tankers WHERE id = p_tanker_id FOR UPDATE`. This acquires an exclusive database row lock, guaranteeing sequential evaluation and aborting the second request with a clean concurrency error.

### Threat 3.3: Duplicate Payment Debits
- **Vulnerability:** Unstable network causes user to tap "Pay" multiple times, resulting in duplicate transactions.
- **TANKR Defense:** Every payment intent generates an RFC-4122 `idempotency_key` which is indexed with a `UNIQUE` constraint in `public.payments`. Subsequent duplicate requests with identical keys are deduplicated without re-charging.

---

## 4. Delivery Handoff & Water Transfer Verification

### Threat 4.1: Driver Marks Order "Delivered" Without Physical Water Delivery
- **TANKR Defense:** At booking creation, a secure 4-digit cryptographic numeric PIN (`delivery_pin`) is generated and delivered exclusively to the customer's authenticated device.
- The driver cannot advance the trip status to `delivered` in `driver_update_delivery_status` without entering this exact PIN code. This forces physical customer verification prior to tanker valve release and invoice generation.

---

## 5. Location Privacy & Anti-Spoofing

### Threat 5.1: GPS Teleportation / Driver Location Spoofing
- **TANKR Defense:** The PostgreSQL function `record_driver_location_ping` calculates the spatial velocity:
  $$\text{Speed} = \frac{\text{ST\_Distance}(\text{previous\_pt}, \text{current\_pt})}{\Delta t}$$
  If the calculated speed exceeds 100 km/h (unrealistic for a heavy water tanker in urban traffic), the coordinate is flagged as invalid and rejected from the customer tracking view.

### Threat 5.2: Secret Leakage & API Keys
- No service role keys, database passwords, or administrative tokens are bundled in the mobile application binary.
- All secrets are encapsulated in `.env` (ignored via `.gitignore`) and accessed via Supabase authenticated sessions.
