# TANKR — Core Business Rules

## 1. Domain Entities & Roles
TANKR connects four primary user personas with distinct rights and business workflows:
1. **Customer**: Books water tankers, manages sump delivery addresses, tracks live GPS delivery, validates delivery with 4-digit PIN, contributes to Community Sump Pools, and raises disputes.
2. **Supplier / Fleet Owner**: Owns water source depots, manages tanker vehicle inventory, monitors dispatch jobs, and views revenue payouts.
3. **Driver**: Dispatched for tanker delivery, streams live PostGIS GPS breadcrumbs, verifies customer sump PIN, logs calibrated digital meter readings, and completes orders.
4. **Platform Admin**: Manages supplier verification, disputes arbitration, emergency hospital priority routing, platform commission settlement, and audit logging.

---

## 2. Order Lifecycle & Status Progression
```
[pending] ➔ [accepted] ➔ [driver_assigned] ➔ [en_route] ➔ [arrived] ➔ [delivering] ➔ [delivered]
   │             │               │              │           │
   ▼             ▼               ▼              ▼           ▼
[cancelled]  [cancelled]     [cancelled]   [cancelled]  [cancelled with fee]
```
- **pending**: Customer placed booking. Dispatch desk or automated matching connects nearby tanker.
- **accepted**: Supplier accepts order; tanker reserved.
- **driver_assigned**: Specific driver attached to vehicle for this trip.
- **en_route**: Tanker has departed depot and is traveling to customer delivery address.
- **arrived**: Tanker reached destination sump area.
- **delivering**: Driver verified customer delivery PIN; pumping commenced. Cancellation blocked.
- **delivered**: Meter reading entered, pumping completed, digital invoice issued. Terminal state.
- **cancelled**: Either by customer (with policy fee if en route) or supplier (with automatic 100% refund).

---

## 3. Financial & Metering Rules
- **Tariff Engine**: Base Tariff + (PostGIS Haversine Road Distance * Per Km Rate) + Evening Peak Surge (18:00 - 22:00 IST: 10%) + 5% GST.
- **Delivery PIN**: Secure 4-digit numeric code required before driver starts pumping.
- **Digital Flow-Meter**: Calibration readings required (`meter_end > meter_start`). Delivered volume must be within +/- 5% of booked capacity.
- **Payment Reconciliation**: Net balance must reconcile: `Final_Amount = Base + Delivery + Surcharge + GST - Discount`.

---

## 4. Community Sump Cost-Splitting Rules
- Apartment residents can pool contributions towards a 20,000L Jumbo Tanker.
- Target funding is strictly capped at the tanker price (e.g. ₹2,400).
- Contributions close when target is reached (100% funded) or automatically refunded if expiry passes without reaching 100%.
- Single active contribution per flat per pool.

---

## 5. Security & Isolation Rules
- Zero Trust Client Architecture: Client-computed prices or status transitions are rejected.
- PostgreSQL Row-Level Security: Strict tenant isolation (`auth.uid() = customer_id`).
- Concurrency Lock: `SELECT ... FOR UPDATE` prevents double-booking of tankers or concurrent dispute payouts.
