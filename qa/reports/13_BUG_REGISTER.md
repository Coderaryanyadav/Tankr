# TANKR — Bug Register & Defect Log

**Document ID:** `QA-REG-BUGS-001`  
**Date:** 2026-10-31  

---

## 1. Summary of Confirmed Defects

| Bug ID | Severity | Priority | Area / Component | Description | Status |
|---|---|---|---|---|---|
| **BUG-P0-01** | **P0 (Critical)** | Urgent | Payment / Booking | Missing `create_payment_order` RPC caused all customer bookings to abort and rollback automatically | **FIXED & VERIFIED** |
| **BUG-P0-02** | **P0 (Critical)** | Urgent | Supabase CLI Config | Duplicate `[auth.sms.test_otp]` table in `config.toml` broke Supabase CLI parser and migration runner | **FIXED & VERIFIED** |
| **BUG-P1-01** | **P1 (High)** | High | Invoicing | Missing `generate_invoice_for_booking` RPC caused invoice creation to fail | **FIXED & VERIFIED** |
| **BUG-P1-02** | **P1 (High)** | High | Supply Store | Missing `supplier_accept_booking` & `supplier_cancel_and_reassign` RPCs caused supplier dashboard actions to fail | **FIXED & VERIFIED** |
| **BUG-P1-03** | **P1 (High)** | High | Driver Store | Missing `driver_update_delivery_status` RPC caused status progression to fail | **FIXED & VERIFIED** |
| **BUG-P1-04** | **P1 (High)** | High | Community Pools | Missing `contribute_to_community_pool` RPC caused community sump contributions to fail | **FIXED & VERIFIED** |
| **BUG-P2-01** | **P2 (Medium)** | Medium | Disputes | Missing `submit_customer_dispute` RPC caused customer dispute modal submission to fail | **FIXED & VERIFIED** |
| **BUG-P2-02** | **P2 (Medium)** | Medium | Supplier Reg | Missing `register_supplier` RPC caused supplier onboarding to fail | **FIXED & VERIFIED** |

---

## 2. Detailed Bug Reports

### BUG-P0-01: Missing `create_payment_order` RPC
- **Affected Role:** Customer
- **Affected Screen:** `BookingReviewModal.tsx`, `bookingStore.ts`, `paymentService.ts`
- **Root Cause:** `paymentService.createPaymentOrder` directly invoked `supabase.rpc('create_payment_order')`, which was not present in the database schema. PostgREST returned HTTP 404, causing `bookingStore.createBooking` to execute automatic rollback via `cancel_booking_atomic`.
- **Fix Applied:**
  1. Authored `supabase/migrations/20261031000002_core_operational_rpcs.sql` defining `create_payment_order(UUID, TEXT, TEXT)`.
  2. Implemented dual-layer fallback in `paymentService.ts` inserting directly into `public.payments` table if RPC is unavailable.
- **Regression Test:** `qa/integration/payments/payment_reconciliation.test.ts` (PASS).

### BUG-P0-02: Duplicate TOML Definition in `supabase/config.toml`
- **Affected Role:** DevOps / Database Engineering
- **Affected File:** `supabase/config.toml`
- **Root Cause:** `[auth.sms.test_otp]` table was defined at line 270 and again at line 301. Supabase CLI threw `DbConfigLoadError: trying to redefine an already defined table or value`.
- **Fix Applied:** Merged test OTP phone numbers into a single valid TOML table block.
- **Regression Test:** `npx supabase db push --dry-run` (PASS).

### BUG-P1-01 to BUG-P1-04: Missing Stored Procedures & Dual-Layer Resilience
- **Affected Role:** Customer, Supplier, Driver
- **Affected Files:** `invoiceService.ts`, `supplyStore.ts`, `communityPoolStore.ts`, `disputeService.ts`, `SupplierRegistrationScreen.tsx`
- **Root Cause:** Several UI workflows depended on RPC functions without direct table fallbacks.
- **Fix Applied:** Added missing functions to `20261031000002_core_operational_rpcs.sql` and implemented resilient direct table mutation fallbacks across all affected services.
- **Regression Tests:** `qa/integration/booking/booking_lifecycle.test.ts`, `qa/unit/pricing/pricing_calculations.test.ts` (ALL PASS).

