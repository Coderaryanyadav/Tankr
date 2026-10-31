# TANKR — Production Environment Matrix

This reference documents environment configuration across tiers.

---

## 1. Environment Tier Matrix

| Variable | Local Development | Staging Tier | Production Cloud |
| :--- | :--- | :--- | :--- |
| `EXPO_PUBLIC_SUPABASE_URL` | `http://127.0.0.1:54321` | `https://staging-ref.supabase.co` | `https://app-prod.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Local anon key | Staging anon key | Production anon key |
| `EXPO_PUBLIC_RAZORPAY_KEY_ID` | `rzp_test_...` (Sandbox) | `rzp_test_...` (Sandbox) | `rzp_live_...` (Live Gateway) |
| `EXPO_PUBLIC_MAPPLS_REST_KEY` | Sandbox / Free Tier | Staging Enterprise Key | High-Quota Enterprise Key |
| `EXPO_PUBLIC_CARTO_API_KEY` | Optional (OSM fallback) | Registered Key | Production CDN Key |
