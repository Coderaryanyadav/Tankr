# TANKR — Financial Ledger & Settlement Rules

## 1. Settlement Split Architecture

Every completed water tanker order generates the following ledger splits:

```
Gross Booking Amount = Base_Price + Delivery_Charge + Surcharge + GST
Taxes Payable (GST) = GST_Amount  -- 5% Remitted to State GST Portal

Gross Fare (Excl. Tax) = Base_Price + Delivery_Charge + Surcharge
- Driver Delivery Payout = ROUND(Gross Fare * 0.85, 2)       -- 85% Driver / Hub Delivery Share
- Fleet Maintenance / Escrow = ROUND(Gross Fare * 0.05, 2)   -- 5% Fleet Maintenance Reserve
- Platform Commission = ROUND(Gross Fare * 0.10, 2)          -- 10% TANKR Platform Take-Rate
Total Platform Fee (Commission + Maintenance) = ROUND(Gross Fare * 0.15, 2) -- 15% Total Fee
Net Supplier / Hub Share = ROUND(Gross Fare * 0.85, 2)                      -- 85% Net Disbursed (T+1 Settlement)
```

---

## 2. Refund Matrix & Cancellation Penalties

| Trigger Stage | Customer Penalty | Supplier / Driver Compensation | Platform Fee | Refund to Customer |
| :--- | :--- | :--- | :--- | :--- |
| **`pending`** (Awaiting Supplier) | ₹0.00 | ₹0.00 | ₹0.00 | **100% Full Refund** |
| **`accepted`** (Supplier Confirmed) | ₹0.00 | ₹0.00 | ₹0.00 | **100% Full Refund** |
| **`driver_assigned`** (Depot Staging) | ₹0.00 | ₹0.00 | ₹0.00 | **100% Full Refund** |
| **`en_route`** (Tanker on Road) | ₹150.00 (Fuel/Dispatch Fee) | ₹150.00 | ₹0.00 | **Balance Refunded** |
| **`arrived`** (At Customer Sump) | ₹200.00 (Trip Dry-Run Surcharge) | ₹200.00 | ₹0.00 | **Balance Refunded** |
| **`delivering`** (Pumping in Progress) | Non-cancellable | N/A | N/A | **Dispute Required** |
| **Flow-meter Shortfall** | ₹0.00 | Prorated deduction | Prorated deduction | **Automated Prorated Refund** |
