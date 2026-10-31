# TANKR — Pricing Rules & Mathematical Specifications

## 1. Authoritative Pricing Formula

```
Distance_Km = ROUND(((Haversine_Distance(Depot, Sump) * 1.25) / 1000.0), 2)
ETA_Minutes = GREATEST(5, ROUND(6 + (Distance_Km * 3.3)))

Base_Price = Tanker.base_price
Delivery_Charge = ROUND(Distance_Km * Tanker.price_per_km, 2)

Surge_Multiplier = 
    IF Current_Hour_IST >= 18 AND Current_Hour_IST <= 22 THEN 0.10 (10% Peak Evening Surcharge)
    ELSE 0.00

Surcharge = ROUND(Base_Price * Surge_Multiplier, 2)

Subtotal = Base_Price + Delivery_Charge + Surcharge
GST_Amount = ROUND(Subtotal * 0.05, 2)  -- 5% GST (SAC 9965 / 9967 Water Logistics)

Final_Payable_Amount = ROUND(Subtotal + GST_Amount, 2)
```

---

## 2. Standard Capacity & Base Tariff Benchmark (Mumbai Operations)

| Capacity (Liters) | Category | Typical Base Price | Rate / Km | Min Chargeable Distance | 5km Daytime Estimate | 5km Peak Evening (18-22h) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1,000 L** | Mini Tanker | ₹450.00 | ₹25.00/km | 1.0 km | ₹603.75 | ₹651.00 |
| **2,000 L** | Compact Tanker | ₹750.00 | ₹30.00/km | 1.0 km | ₹945.00 | ₹1,023.75 |
| **5,000 L** | Society Standard | ₹1,200.00 | ₹40.00/km | 1.5 km | ₹1,470.00 | ₹1,596.00 |
| **10,000 L** | Commercial Tanker | ₹1,800.00 | ₹45.00/km | 2.0 km | ₹2,126.25 | ₹2,315.25 |
| **20,000 L** | Jumbo Sump Pool | ₹3,200.00 | ₹60.00/km | 2.0 km | ₹3,675.00 | ₹4,011.00 |

---

## 3. Strict Pricing Boundary Invariants

1. **Negative Value Rejection**:
   - `Base_Price >= 0`
   - `Distance_Km >= 0`
   - `Delivery_Charge >= 0`
   - `Final_Payable_Amount > 0`
2. **Deterministic Rounding**:
   - Every intermediate charge (`delivery_charge`, `surcharge`, `tax_amount`) is rounded to exactly two decimal places (`NUMERIC(10, 2)`).
3. **Immutable Authority**:
   - Client applications never compute authoritative final payment amounts. The client display amount is purely advisory until confirmed by `calculate_booking_quote` RPC.
