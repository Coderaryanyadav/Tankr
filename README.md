# TANKR 💧

> **Water delivery, just a tap away.**

TANKR is an on-demand water tanker booking and real-time dispatch platform built with React Native and Expo, inspired by the familiar interaction patterns of ride-hailing applications such as Uber and Ola.

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

## 🚀 Key Features

* **Passwordless Mobile OTP Login:** Real SMS OTP verification powered by Supabase Auth with rate limiting and secure session persistence via `expo-secure-store`.
* **Map-First Delivery Experience:** Large interactive map interface with floating delivery address pills, animated markers, and vehicle ETAs.
* **Streamlined Onboarding & Location:** Automated GPS reverse-geocoding via `expo-location`, manual address entry, apartment/landmark details, and saved addresses (`Home`, `Work`, `Other`).
* **Configurable Tanker Tiers:** Dedicated cards for Mini (5,000L), Standard (10,000L), and Jumbo (20,000L) tankers with transparent pricing and water cleanliness guarantees.
* **Production-Grade Architecture:** PostGIS geospatial indexing (`geography(POINT)`), atomic booking transactions, and Supabase Realtime broadcast channels for live driver tracking.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | [React Native](https://reactnative.dev/) / [Expo SDK 58](https://expo.dev/) |
| **Language** | [TypeScript](https://www.typescriptlang.org/) |
| **Backend & Database** | [Supabase](https://supabase.com/) / [PostgreSQL](https://www.postgresql.org/) with [PostGIS](https://postgis.net/) |
| **State Management** | [Zustand](https://github.com/pmndrs/zustand) |
| **Form Validation** | [Zod](https://zod.dev/) |
| **Maps & Location** | Google Maps SDK / `expo-location` |
| **Secure Storage** | `expo-secure-store` (iOS Keychain / Android Keystore) |
| **Icons & Typography** | `@expo/vector-icons` / `expo-font` |

---

## 📂 Project Structure

```text
TANKR/
├── src/
│   ├── components/            # Reusable UI component library
│   │   ├── common/
│   │   │   ├── Button/        # Primary, Secondary, Outline, Danger, IconButtons
│   │   │   ├── Card/          # TankerCard, StatusBadge, base Card
│   │   │   ├── Feedback/      # Skeletons, EmptyState, ErrorBanner
│   │   │   ├── Input/         # PhoneInput, OtpInput, SearchBar, TextInput
│   │   │   ├── Navigation/    # BottomNav, HeaderBar, LocationPill
│   │   │   └── Overlay/       # BottomSheet, Modal dialogs
│   ├── features/
│   │   ├── auth/              # Mobile OTP login & verification screens
│   │   ├── location/          # Saved addresses & location management
│   │   └── onboarding/        # Customer profile & delivery setup
│   ├── navigation/            # Root flow controller & route guards
│   ├── services/
│   │   ├── location/          # Expo Location & reverse geocoding
│   │   └── supabase/          # Supabase client & SecureStore adapter
│   ├── showcase/              # Interactive Design System showcase
│   ├── stores/                # Zustand global state (auth, location)
│   ├── theme/                 # Design tokens (colors, typography, spacing, shadows)
│   └── utils/                 # Zod validation schemas
└── supabase/
    └── migrations/            # Versioned SQL migrations (PostGIS, RLS, profiles)
```

---

## 🏃 Getting Started

### Prerequisites
* Node.js LTS (v20 or v22 recommended)
* npm or bun
* Expo Go or a development build

### Installation
```bash
# Clone the repository
git clone https://github.com/Coderaryanyadav/Tankr.git
cd Tankr

# Install SDK-compatible dependencies
npx expo install

# Run TypeScript check
npx tsc --noEmit

# Run diagnostics
npx expo-doctor

# Start the Expo development server
npx expo start
```

---

## 📄 License
MIT License.

