# TANKR 💧

> **Water delivery, just a tap away.**

[![React Native](https://img.shields.io/badge/React_Native-0.88-61DAFB?logo=react&logoColor=black)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo_SDK-58.0-000020?logo=expo&logoColor=white)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL_15-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![PostGIS](https://img.shields.io/badge/PostGIS-3.3_Spatial-blue?logo=postgresql&logoColor=white)](https://postgis.net/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**TANKR** is an on-demand water tanker booking, fleet dispatch, and live GPS tracking platform inspired by the interaction patterns of ride-hailing applications like Uber and Ola. It features passwordless mobile OTP authentication, a map-first discovery interface with PostGIS spatial radial queries, atomic transaction locking, multi-role dispatch portals (Customer, Supplier, Driver, Operations Admin), sub-200ms real-time telemetry streaming, and automated GST tax invoicing.

---

## 📑 Table of Contents

- [Visual Identity & Design System](#-visual-identity--design-system)
- [System Architecture & Data Flow](#-system-architecture--data-flow)
- [Platform Roles & User Journeys](#-platform-roles--user-journeys)
- [Deep-Dive Documentation Catalog](#-deep-dive-documentation-catalog)
- [Key Features by Phase](#-key-features-by-phase)
- [Technology Stack](#-technology-stack)
- [Project Directory Structure](#-project-directory-structure)
- [Getting Started & Local Development](#-getting-started--local-development)
- [Database Migrations & Supabase Deployment](#-database-migrations--supabase-deployment)
- [Quality Assurance & Diagnostics](#-quality-assurance--diagnostics)

---

## 🎨 Visual Identity & Design System

TANKR uses a crisp, high-contrast, accessibility-first utility palette designed for outdoor mobile readability in bright daylight:

```text
#0B64C0  ██████  Primary Brand Blue
#2688E8  ██████  Secondary Action Blue
#EAF4FF  ██████  App Canvas & Background
#16395E  ██████  Dark Navy Headings
#FFFFFF  ██████  Surface Cards & Elevated Modals
#18283B  ██████  Body Typography
#16A36A  ██████  Success Green (Delivered / Paid)
#F59E0B  ██████  Warning Amber (Approaching / Surge)
#DC3545  ██████  Alert Red (Cancelled / Crisis)
```

---

## 🔄 System Architecture & Data Flow

```mermaid
flowchart TD
    subgraph Client ["Mobile Client (React Native + Expo SDK 58)"]
        UI["Modern UI / Design System Tokens"]
        Zustand["Zustand Global State Stores<br/>(Auth, Location, Booking, Supply, Admin)"]
        SecureStore["expo-secure-store<br/>(Hardware Encrypted Keychain)"]
    end

    subgraph Network ["Transport Gateway"]
        REST["PostgREST API<br/>(JWT Bearer)"]
        Realtime["Supabase Realtime WebSockets<br/>(Live Telemetry & Channels)"]
    end

    subgraph Database ["Database Layer (Supabase / PostgreSQL 15)"]
        PostGIS["PostGIS Spatial Engine<br/>(ST_DWithin, ST_Distance)"]
        RLS["Row-Level Security (RLS)"]
        RPCs["Authoritative PL/pgSQL RPCs<br/>(Atomic Locking & Invoices)"]
    end

    UI --> Zustand
    Zustand --> SecureStore
    Zustand --> REST
    Zustand --> Realtime
    REST --> RLS
    Realtime --> RPCs
    RLS --> PostGIS
    RPCs --> PostGIS
```

---

## 👥 Platform Roles & User Journeys

TANKR provides dedicated experiences across four distinct operational roles:

```mermaid
flowchart LR
    Customer["🧑 Customer"] --> C1["Map Discovery & Capacity Filters (1kL - 20kL)"]
    Customer --> C2["Itemized Quote (Base + Distance + Surge + GST)"]
    Customer --> C3["Receive 4-Digit Handover PIN"]
    Customer --> C4["Real-Time Live Tanker Tracking"]
    Customer --> C5["GST Tax Invoice Sharing (PDF/Text)"]

    Supplier["🏢 Water Supplier"] --> S1["Accept/Decline Incoming Dispatches"]
    Supplier --> S2["Fleet Vehicle Status & Driver Roster"]
    Supplier --> S3["Daily Volume & Revenue Metrics"]

    Driver["🚛 Tanker Driver"] --> D1["On-Duty / Off-Duty Toggle"]
    Driver --> D2["Google Maps Navigation Intent"]
    Driver --> D3["Direct One-Touch Customer Call"]
    Driver --> D4["Verify 4-Digit Delivery PIN at Valve"]

    Admin["🛡️ Operations Admin"] --> A1["Executive KPI Dashboard (GMV, Volume)"]
    Admin --> A2["Supplier KYC & Water Quality Approval"]
    Admin --> A3["Dynamic Surge Pricing (1.0x - 2.0x)"]
    Admin --> A4["Crisis Drought Emergency Override"]
```

---

## 📚 Deep-Dive Documentation Catalog

Detailed technical documentation and architecture artifacts are located in the [`docs/`](docs/) directory:

| Document | Description |
| :--- | :--- |
| 🗺️ **[`docs/REMEDIATION_ROADMAP.md`](docs/REMEDIATION_ROADMAP.md)** | **6-Sprint Remediation & Production Launch Roadmap** (Security, Fleet, Bookings, Payments, Admin, Testing). |
| 📊 **[`docs/FLOW_DIAGRAMS.md`](docs/FLOW_DIAGRAMS.md)** | Sequence diagrams, PIN verification flowchart, tracking pipeline, and booking state machines. |
| 🏗️ **[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)** | Multi-tier system blueprint, pessimistic row locking (`FOR UPDATE`), and PostGIS winding formulas. |
| 🗄️ **[`docs/DATABASE_SCHEMA.md`](docs/DATABASE_SCHEMA.md)** | Full Mermaid Entity-Relationship (ER) diagram, table schemas, and RPC function catalog. |
| ✅ **[`docs/QA_AUDIT_REPORT.md`](docs/QA_AUDIT_REPORT.md)** | Comprehensive test verification matrices covering all authentication, booking, and dispatch edge cases. |
| 🔒 **[`docs/SECURITY_AUDIT_REPORT.md`](docs/SECURITY_AUDIT_REPORT.md)** | Threat model, Row-Level Security (RLS) enforcement, price manipulation safeguards, and velocity filters. |
| 🚀 **[`docs/PRODUCTION_DEPLOYMENT_CHECKLIST.md`](docs/PRODUCTION_DEPLOYMENT_CHECKLIST.md)** | Google Play & Apple App Store readiness, permissions, and EAS cloud build commands. |

---

## 🌟 Key Features by Phase

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

| Layer | Component | Version / Technology |
| :--- | :--- | :--- |
| **Frontend** | Mobile Framework | React Native 0.88 + Expo SDK 58 |
| **Language** | Static Typing | TypeScript 5.9 (Strict Mode) |
| **Backend** | BaaS Engine | Supabase (Phone OTP, Storage, Realtime) |
| **Database** | Spatial Relational DB | PostgreSQL 15+ with PostGIS 3.3+ |
| **State** | Global Store | Zustand 5.0 |
| **Schemas** | Form & Data Validation | Zod 3.24 |
| **Mapping** | Geospatial Client | `react-native-maps`, `expo-location` |
| **Storage** | Secure Storage | `expo-secure-store` (AES-256 Keychain/Keystore) |

---

## 📂 Project Directory Structure

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
│   ├── full_schema.sql        # Consolidated 1,234-line single-run database schema
│   └── migrations/            # 8 sequential PostGIS & RLS migrations
└── docs/                      # Production QA, Security & Architecture documentation
    ├── ARCHITECTURE.md
    ├── DATABASE_SCHEMA.md
    ├── FLOW_DIAGRAMS.md
    ├── PRODUCTION_DEPLOYMENT_CHECKLIST.md
    ├── QA_AUDIT_REPORT.md
    └── SECURITY_AUDIT_REPORT.md
```

---

## ⚡ Getting Started & Local Development

### 1. Prerequisites
* Node.js LTS (v20+ recommended)
* Expo CLI
* Git

### 2. Environment Configuration
Create a `.env` file in the project root:
```env
EXPO_PUBLIC_SUPABASE_URL=https://qicoczialqxulcbipuix.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Installation & Verification
```bash
# Clone the repository
git clone https://github.com/Coderaryanyadav/Tankr.git
cd Tankr

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

## 🗄️ Database Migrations & Supabase Deployment

The repository includes all 8 versioned migrations in `supabase/migrations/` as well as a single consolidated schema file:

👉 **[`supabase/full_schema.sql`](supabase/full_schema.sql)**

### Applying to Supabase Cloud:
1. Open the [Supabase SQL Editor](https://supabase.com/dashboard/project/qicoczialqxulcbipuix/sql/new).
2. Copy and paste the contents of `supabase/full_schema.sql`.
3. Click **Run** (or `Cmd + Enter`).

Alternatively, deploy using the Supabase CLI:
```bash
npx supabase db push --db-url "postgresql://postgres:[PASSWORD]@db.qicoczialqxulcbipuix.supabase.co:5432/postgres"
```

---

## 🧪 Quality Assurance & Diagnostics

```text
$ npx expo-doctor
20/20 checks passed. No issues detected!

$ npx tsc --noEmit
0 errors detected.
```

---

## 📄 License
MIT License. Built for TANKR Technologies.
