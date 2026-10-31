# TANKR — State Management Reference

TANKR utilizes [Zustand](https://github.com/pmndrs/zustand) for centralized, reactive domain state management.

---

## 1. Store Architecture

```text
src/stores/
├── authStore.ts       # Authentication, SMS OTP, session persistence, profile sync
├── adminStore.ts      # Admin KPIs, 10 desks state, live fleet telemetry, CRUD mutations
├── bookingStore.ts    # Quote computation, capacity selection, checkout flow
├── locationStore.ts   # Active GPS coordinates, saved customer sumps
└── trackingStore.ts   # Real-time vehicle coordinates and ETA calculation
```

---

## 2. Key Store Details

### `useAuthStore`
- **Responsibilities**: Session initialization via `supabase.auth`, phone OTP requests, OTP verification, user profile fetching, role detection.
- **Persistence**: Backed by `expo-secure-store` on native iOS/Android and `localStorage` on Web.

### `useAdminStore`
- **Responsibilities**: Real-time admin operations dashboard, active fleet queries, deficit zones, hospital emergency dispatch queue, driver payout ledger, dispute resolution, and water safety lab audits.
- **Realtime Integration**: Subscribes directly to `supabase_realtime` channels on `tankers`, `bookings`, `emergency_dispatches`, and `water_quality_certificates`.
