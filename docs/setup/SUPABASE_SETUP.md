# TANKR — Supabase Configuration Guide

This guide details the specific Supabase platform settings required to run TANKR.

---

## 1. Authentication (SMS OTP & Test Credentials)

TANKR uses phone number authentication (`supabase.auth.signInWithOtp`).

### For Local Development (`supabase/config.toml`):
The test OTP credentials are pre-configured:
```toml
[auth.sms.test_otp]
"918888888888" = "123456" # Super Admin
"919999999999" = "123456" # Supplier
"919000000001" = "123456" # Driver
"919876543210" = "123456" # Customer
```

### For Supabase Cloud:
1. Navigate to **Authentication** > **Providers** > **Phone**.
2. Enable the Phone provider.
3. Configure your SMS gateway (Twilio, MessageBird, or Vonage) or add the test phone numbers above under **Test Phone Numbers** with OTP `123456` for instant zero-cost testing.

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
