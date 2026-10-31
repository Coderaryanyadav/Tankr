# TANKR — Codebase Structure Reference

## 1. Top-Level Directory Layout

```text
TANKR/
├── .github/             # GitHub Actions CI/CD workflows and issue templates
├── assets/              # Static branding, logo, and app icons
├── docs/                # Architecture, setup, API, and project documentation
├── plugins/             # Native Expo config plugins (e.g. withMappls)
├── scripts/             # Automated setup, validation, test, and seeding scripts
├── src/                 # Main application source code
├── supabase/            # PostgreSQL migrations, seeds, and config.toml
├── __tests__/           # Jest unit, concurrency, RBAC, and regression test suites
├── App.tsx              # Application entry point with SafeAreaProvider
├── app.json             # Expo project configuration and native permissions
├── package.json         # Dependencies and lifecycle scripts
└── tsconfig.json        # Strict TypeScript compiler options
```

---

## 2. Source Code Architecture (`src/`)

```text
src/
├── components/          # Reusable design system UI components
│   └── common/          # Standard Buttons, Cards, Inputs, Feedback banners
├── features/            # Feature slices organized by operational domain
│   ├── admin/           # Super Admin portal & 10 operations desks
│   ├── auth/            # Mobile phone OTP login and authentication
│   ├── booking/         # Sump capacity selection, quote review, checkout
│   ├── community/       # Apartment pool sharing & bulk discounts
│   ├── discovery/       # Geospatial tanker radar & search
│   ├── disputes/        # Customer complaint filing & evidence upload
│   ├── location/        # Address management & reverse geocoding
│   ├── notifications/   # Push notification inbox & delivery alerts
│   ├── onboarding/      # Profile setup & delivery address onboarding
│   ├── orders/          # Active delivery tracking & order history
│   ├── profile/         # User preferences & account management
│   ├── supply/          # Supplier fleet manager & Driver consoles
│   └── tracking/        # Live GPS telemetry & route visualization
├── navigation/          # RootNavigator (role router) & AppTabs
├── services/            # Supabase client, Mappls, Razorpay adapters
├── stores/              # Zustand domain state stores (auth, admin, tracking)
├── theme/               # Design tokens (colors, typography, spacing, shadows)
├── types/               # TypeScript interfaces, database types, Zod schemas
└── utils/               # Formatters, alert bridges, validation helpers
```
