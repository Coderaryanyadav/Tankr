# TANKR — API Integration Reference

## 1. Supabase Client Architecture

Initialized in [`src/services/supabase/client.ts`](../../src/services/supabase/client.ts):
- Implements custom storage adapter bridging `expo-secure-store` on iOS/Android and Web `localStorage`.
- Configures automatic JWT token refresh.
- Configures WebSocket reconnect backoff for real-time telemetry.

---

## 2. Calling PostgreSQL Stored Procedures (RPCs)

All transactional operations call PostgreSQL functions:

```typescript
import { supabase } from '../services/supabase/client';

export const createBooking = async (params: CreateBookingParams) => {
  const { data, error } = await supabase.rpc('create_booking_atomic', {
    p_customer_id: params.customerId,
    p_tanker_id: params.tankerId,
    p_capacity_liters: params.capacityLiters,
    p_delivery_address: params.deliveryAddress,
    p_lat: params.latitude,
    p_lng: params.longitude,
    p_payment_preference: params.paymentPreference,
  });

  if (error) throw new Error(error.message);
  return data;
};
```

---

## 3. Third-Party Service Adapters

- **Mappls Service** (`src/services/mappls/mapplsService.ts`): Implements geocoding, reverse geocoding, and distance calculations for the Mumbai metro area.
- **Payment Service** (`src/services/payment/paymentService.ts`): Handles Razorpay order initialization, UPI deep-linking, and payment verification RPC calls.
