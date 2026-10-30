# TANKR — Production Deployment & Release Checklist

**Release Target:** Google Play Store (Android) & Apple App Store (iOS)  
**Build System:** EAS (Expo Application Services)  
**Backend:** Supabase Cloud (PostgreSQL 15+, PostGIS 3.3+, Supabase Realtime, Phone OTP)  

---

## 1. Environment & Cloud Configuration

- [x] **Supabase Production Project Ref:** `qicoczialqxulcbipuix`
- [x] **PostGIS Extension:** Verified active (`CREATE EXTENSION IF NOT EXISTS postgis;`)
- [x] **Database Migrations:** All 8 production migrations generated and sequenced in `supabase/migrations/`:
  1. `20261030000001_auth_profiles.sql`
  2. `20261030000002_user_addresses.sql`
  3. `20261030000003_tankers_and_discovery.sql`
  4. `20261030000004_bookings_and_pricing.sql`
  5. `20261030000005_supplier_driver_dashboards.sql`
  6. `20261030000006_realtime_tracking.sql`
  7. `20261030000007_payments_invoices_notifications.sql`
  8. `20261030000008_admin_analytics.sql`
- [x] **Row-Level Security (RLS):** Enabled and active on all production tables.
- [x] **Secure Storage:** Token persistence via `expo-secure-store` (AES-256 encrypted hardware keychain).

---

## 2. Code Quality & Dependency Diagnostics

- [x] **TypeScript Strict Mode:** Zero compilation errors (`npx tsc --noEmit` exits with 0).
- [x] **Expo Doctor Diagnostics:** 20/20 checks passed with zero warnings.
- [x] **No Hardcoded Demo Keys:** Production credentials managed securely via environment configurations.
- [x] **Mobile First Responsive Design:** Verified across iPhone and Android viewport sizes.

---

## 3. App Store Submission Readiness

### iOS App Store
1. **Bundle Identifier:** `com.tankr.app`
2. **Permissions (Info.plist / app.json):**
   - `NSLocationWhenInUseUsageDescription`: "TANKR requires your location to discover nearby water tankers and accurately dispatch water deliveries to your address."
   - `NSLocationAlwaysAndWhenInUseUsageDescription`: "TANKR uses your location in background while driving a tanker to share live dispatch telemetry with customers."
   - `NSCameraUsageDescription`: "TANKR uses your camera to capture profile photos and supplier compliance certificates."
   - `NSPhotoLibraryUsageDescription`: "TANKR accesses your photos to upload verification documents."

### Google Play Store
1. **Application ID:** `com.tankr.app`
2. **Permissions (AndroidManifest.xml / app.json):**
   - `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`
   - `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION` (Driver mode telemetry broadcast)
   - `CAMERA`, `READ_EXTERNAL_STORAGE`

---

## 4. EAS Build & Release Commands

### Development Build
```bash
# Generate development client for testing native modules
bunx eas-cli build --profile development --platform all
```

### Production Release Build
```bash
# Production AAB for Google Play and IPA for App Store
bunx eas-cli build --profile production --platform all
```

### Over-The-Air (OTA) Updates
```bash
# Push instant bugfix without full App Store review
bunx eas-cli update --branch production --message "Hotfix: Realtime tracking latency optimization"
```

