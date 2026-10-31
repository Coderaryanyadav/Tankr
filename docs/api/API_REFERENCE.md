# TANKR — Client API & Store Reference

## 1. Authentication Store (`useAuthStore`)

```typescript
interface AuthStoreState {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  rawPhoneDigits: string;
  isLoading: boolean;
  authError: string | null;

  sendOtp: (phoneDigits: string) => Promise<{ success: boolean; error?: string }>;
  verifyOtp: (token: string) => Promise<{ success: boolean; isOnboarded?: boolean; error?: string }>;
  completeOnboarding: (data: OnboardingFormData) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
}
```

---

## 2. Admin Operations Store (`useAdminStore`)

```typescript
interface AdminStoreState {
  metrics: AdminDashboardMetrics | null;
  fleetTankers: FleetTankerItem[];
  deficitZones: DeficitZoneItem[];
  emergencyDispatches: EmergencyDispatchItem[];
  driverPayoutLedger: DriverPayoutLedgerItem[];
  waterCertificates: WaterCertificateItem[];
  disputes: DisputeItem[];
  serviceZones: ServiceZoneItem[];
  auditLogs: AdminAuditLogItem[];

  // Live Telemetry & Subscriptions
  fetchAdminMetrics: () => Promise<void>;
  fetchFleetTankers: () => Promise<void>;
  subscribeToLiveFleetAndHeatmap: () => () => void;

  // Real Mutations & CRUD
  createTanker: (payload: CreateTankerPayload) => Promise<boolean>;
  updateTanker: (id: string, payload: UpdateTankerPayload) => Promise<boolean>;
  deleteTanker: (id: string) => Promise<boolean>;
  rebalanceTankerToZone: (tankerId: string, zoneName: string) => Promise<boolean>;
  createWaterCertificate: (payload: CreateCertificatePayload) => Promise<boolean>;
  reinstateWaterCertificate: (id: string) => Promise<boolean>;
  deleteWaterCertificate: (id: string) => Promise<boolean>;
  settleIndividualPayout: (id: string) => Promise<boolean>;
  createServiceZone: (payload: CreateServiceZonePayload) => Promise<boolean>;
  updateServiceZone: (zoneName: string, multiplier: number, isOperational: boolean) => Promise<boolean>;
}
```
