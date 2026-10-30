# TANKR 💧

> **Water delivery, just a tap away.**

TANKR is a comprehensive on-demand water tanker booking, fleet dispatch, and real-time tracking platform inspired by the interaction patterns of ride-hailing applications like Uber and Ola. Built with **React Native**, **Expo SDK 58**, **TypeScript**, and **Supabase (PostgreSQL + PostGIS + Realtime)**.

---

## 🎨 Visual Identity & Color Palette

* **Primary Blue:** `#0B64C0`
* **Secondary Blue:** `#2688E8`
* **Background Blue:** `#EAF4FF`
* **Dark Navy:** `#16395E`
* **White Surface:** `#FFFFFF`
* **Text:** `#18283B`
* **Semantic Tones:** Success (`#16A36A`), Warning (`#F59E0B`), Error (`#DC3545`)

---

## 🌟 Key Capabilities by Phase

### 🔐 1. Mobile OTP Authentication & Profiles (Phases 1–3)
* Passwordless Indian 10-digit mobile login with automated 30s resend cooldown.
* Hardware-encrypted session persistence via `expo-secure-store`.
* Onboarding workflow with photo avatar selection (`expo-image-picker`), automatic GPS geocoding (`expo-location`), and saved address slots (`Home`, `Work`, `Other`).

### 🗺️ 2. Map-First Discovery & PostGIS Spatial Engine (Phase 4)
* Full-screen interactive map with animated radar scanning, tanker capacity markers, and live distance calculations.
* Capacity filtering chips for **1kL, 2kL, 5kL, 10kL, 12kL, and 20kL** tankers with potable/domestic water classification.
* PostGIS spatial radial search (`ST_DWithin` & `ST_Distance`) with urban traffic route ETA estimations.

### 💰 3. Server-Authoritative Pricing & Atomic Booking (Phase 5)
* PostgreSQL RPC `calculate_booking_quote` computes itemized quotes (base fare, distance fare, peak surcharge, 5% GST).
* Concurrency row-locking (`SELECT ... FOR UPDATE`) prevents double-booking collisions.
* Cryptographic 4-digit Delivery Handover PIN generated for secure water transfer.

### 🚛 4. Multi-Role Dispatch Dashboards (Phase 6)
* **Supplier Portal:** Incoming dispatch request review, vehicle availability management, and depot metrics.
* **Driver Console:** On-duty/off-duty switch, native Google Maps turn-by-turn navigation intent, protected customer calling, and PIN verification.

### 📍 5. Real-Time Telemetry & Anti-Spoofing (Phase 7)
* Sub-200ms location streaming over Supabase Realtime broadcast channels (`booking:tracking:<id>`).
* Smooth heading rotation, live route polyline, and arrival countdown.
* Database velocity filter (`ST_Distance / delta_t`) rejecting unrealistic telemetry (>100 km/h).

### 🧾 6. Idempotent Payments, Invoices & Notifications (Phase 8)
* UPI & card payment processing with RFC-4122 idempotency protection preventing duplicate debits.
* Automated GST Tax Invoice generation (`generate_invoice_for_booking`) with digital share intent.
* Real-time notifications for all 8 dispatch lifecycle events.

### 🛡️ 7. Executive Operations & Command Center (Phase 9)
* Live KPI aggregation: Gross Merchandise Value (GMV), platform commission take rate, fleet utilization.
* Supplier compliance verification queue with document approval/rejection workflows.
* Real-time network surge pricing controls (1.0x to 2.0x) and Crisis Drought Emergency toggle.

---

## 🛠️ Technology Stack

| Component | Technology |
| :--- | :--- |
| **Mobile Client** | React Native 0.88 + Expo SDK 58 |
| **Language** | TypeScript (Strict Mode) |
| **Backend & Auth** | Supabase (Phone OTP, Storage, Realtime) |
| **Database** | PostgreSQL 15+ with PostGIS 3.3+ spatial extension |
| **State Management**| Zustand |
| **Validation** | Zod Schema Validation |
| **Maps & Location** | `react-native-maps`, `expo-location` |
| **Device Security** | `expo-secure-store` (Hardware Keychain / Keystore) |

---

## 📂 Project Architecture

```text
TANKR/
├── src/
│   ├── components/            # Reusable atomic & composite components
│   │   ├── common/
│   │   │   ├── Button/        # Primary, Secondary, Outline, Danger buttons
│   │   │   ├── Card/          # TankerCard, StatusBadge, Base Card
│   │   │   ├── Feedback/      # Skeletons, EmptyState, ErrorBanner
│   │   │   ├── Input/         # PhoneInput, OtpInput, SearchBar, TextInput
│   │   │   ├── Navigation/    # BottomNav, HeaderBar, LocationPill
│   │   │   └── Overlay/       # BottomSheet, Modal dialogs
│   ├── features/
│   │   ├── admin/             # Operations command center & KYC approval
│   │   ├── auth/              # Mobile OTP login & verification
│   │   ├── booking/           # Price quote reviews, active trip overlays
│   │   ├── discovery/         # Full-screen interactive map & tanker filters
│   │   ├── location/          # Saved addresses & reverse geocoding
│   │   ├── notifications/     # Real-time lifecycle alerts modal
│   │   ├── onboarding/        # Customer profile setup & PIN code
│   │   ├── orders/            # Official GST Tax Invoice viewer & sharing
│   │   ├── supply/            # Supplier & Driver operations portals
│   │   └── tracking/          # Real-time WebSocket tanker tracking screen
│   ├── navigation/            # RootNavigator & role-based routing
│   ├── services/
│   │   ├── invoice/           # PostgreSQL invoice RPC client
│   │   ├── location/          # Expo Location & reverse geocoder
│   │   ├── notification/      # Realtime alert dispatch service
│   │   ├── payment/           # Idempotent payment gateway service
│   │   ├── supabase/          # Supabase client with SecureStore adapter
│   │   └── tracking/          # High-frequency GPS tracking publisher/subscriber
│   ├── stores/                # Zustand global stores (auth, booking, admin, supply)
│   ├── theme/                 # Design tokens (colors, typography, shadows, spacing)
│   └── utils/                 # Zod validation schemas
├── supabase/
│   └── migrations/            # 8 sequential PostGIS & RLS migrations
└── docs/                      # Production QA & Security audit reports
    ├── QA_AUDIT_REPORT.md
    ├── SECURITY_AUDIT_REPORT.md
    └── PRODUCTION_DEPLOYMENT_CHECKLIST.md
```

---

## ⚡ Getting Started

### 1. Prerequisites
* Node.js LTS (v20+)
* Expo CLI & Bun / npm
* Active Supabase project with PostGIS enabled

### 2. Environment Setup
Create a `.env` file in the project root:
```env
EXPO_PUBLIC_SUPABASE_URL=https://qicoczialqxulcbipuix.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

### 3. Installation & Verification
```bash
# Install SDK-compatible dependencies
npx expo install

# Run TypeScript compilation check
npx tsc --noEmit

# Run Expo Doctor health check (20/20 checks)
npx expo-doctor

# Start development server
npx expo start
```

---

## 📄 License
MIT License. Built for TANKR Technologies.
