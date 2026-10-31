# TANKR — Production Launch & Go-Live Checklist

Complete all verification gates before enabling public traffic.

---

## 1. Security & Access Control Gates

- [ ] All 21 PostgreSQL tables have `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`.
- [ ] No `SUPABASE_SERVICE_ROLE_KEY` or database superuser credentials present in `.env` or client bundles.
- [ ] `./scripts/verify-project.sh` passes 100% of checks.
- [ ] Test SMS OTP numbers (`auth.sms.test_otp`) disabled or restricted in production Supabase config.
- [ ] Production SMS gateway (Twilio / MessageBird) loaded with prepaid credit and registered DLT headers.

---

## 2. Payment & Legal Compliance

- [ ] `EXPO_PUBLIC_RAZORPAY_KEY_ID` swapped from `rzp_test_...` to live production key.
- [ ] Razorpay Webhooks configured with secret signature verification.
- [ ] GSTIN validation enabled for all participating water suppliers.
- [ ] Terms of Service and Privacy Policy published and accessible.

---

## 3. Geospatial & Infrastructure

- [ ] PostGIS extension verified active on production database.
- [ ] Mappls enterprise REST quota allocated.
- [ ] Point-in-time recovery (PITR) and daily automated database backups enabled.
- [ ] Cold-standby replication configured for disaster recovery.
