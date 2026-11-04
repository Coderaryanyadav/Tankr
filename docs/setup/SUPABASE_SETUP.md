# TANKR — Supabase Configuration Guide

This guide details the specific Supabase platform settings required to run TANKR.

---

## 1. Authentication (SMS OTP & Test Credentials)

TANKR uses phone number authentication (`supabase.auth.signInWithOtp`).

### For Local Development (`supabase/config.toml`):
The test OTP credentials are for isolated local Docker/CLI development only:
```toml
[auth.sms.test_otp]
"918888888888" = "123456" # Super Admin (Local Dev Only)
"919999999999" = "123456" # Supplier (Local Dev Only)
"919000000001" = "123456" # Driver (Local Dev Only)
"919876543210" = "123456" # Customer (Local Dev Only)
```

### For Supabase Cloud & Production Environments:
> [!CAUTION]
> **CRITICAL SECURITY REQUIREMENT**: Never add static test OTPs (`123456`) or shared test phone numbers (`918888888888`, `919999999999`) to cloud staging or production projects. Doing so exposes administrative and supplier roles to account takeover without physical phone possession.

1. Navigate to **Authentication** > **Providers** > **Phone**.
2. Enable the Phone provider.
3. Configure your production SMS gateway (Twilio, MessageBird, or Vonage) with real dynamic OTP dispatch. Ensure "Test Phone Numbers" in Supabase Cloud remains **completely empty** in production.

---

## 2. Realtime Engine Publication

To enable live vehicle movement and dispatch feeds:
1. Go to **Database** > **Publications**.
2. Verify that `supabase_realtime` contains the following tables:
   - `public.tankers`
   - `public.bookings`
   - `public.tracking_breadcrumbs`
   - `public.emergency_dispatches`
   - `public.community_pools`

---

## 3. Storage Buckets

TANKR utilizes Supabase Storage for document uploads:
- `water-certificates`: Lab reports and BIS 10500 compliance PDFs.
- `supplier-kyc`: Vendor trade licenses, tanker registration certificates, and driver commercial licenses.
- `dispute-evidence`: Customer photographs of delivery sumps or contaminated water.
