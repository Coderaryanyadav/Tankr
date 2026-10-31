# TANKR — Testing Architecture & Guide

## 1. Test Framework & Setup

TANKR uses **Jest 30** with **ts-jest** for TypeScript execution without transpilation lag.

```bash
# Run all automated test suites
npm test -- --watchAll=false

# Run test suites in watch mode
npm test

# Run tests via the release verification script
./scripts/run-tests.sh
```

---

## 2. Test Suite Catalog (`__tests__/`)

| Test File | Domain Covered | Assertions |
| :--- | :--- | :--- |
| `booking_concurrency_and_e2e.test.ts` | Concurrent double-booking prevention, vehicle row-level locks, quote expiration TTL. | 4 tests |
| `rbac.test.ts` | Role authorization, privilege escalation rejection, RLS matrix enforcement. | 6 tests |
| `gps_queue.test.ts` | Offline telemetry queueing, batch flushes, GPS anomaly dead reckoning. | 3 tests |
| `pricing.test.ts` | Dynamic surge formulas, capacity multiplier calculations, GST computation. | 5 tests |
| `payments.test.ts` | Escrow authorization, 85/5/10 fee breakdown, invoice generation. | 4 tests |
| `supplier_and_disputes.test.ts` | Vendor KYC validation, dispute filing, refund disbursement rules. | 6 tests |
| `e2e_live_booking_lifecycle.test.ts` | Live Supabase end-to-end integration test (skipped when running offline). | Skipped in CI |

---

## 3. Writing New Tests

Follow our standard Jest + ts-jest patterns:
```typescript
describe('Dynamic Surge Pricing Engine', () => {
  it('should apply 1.5x multiplier during peak morning deficit', () => {
    const baseFare = 650;
    const surgeMultiplier = 1.5;
    const calculatedFare = baseFare * surgeMultiplier;
    expect(calculatedFare).toBe(975);
  });
});
```
