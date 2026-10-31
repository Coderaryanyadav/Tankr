# TANKR — Financial Ledger & Settlement Rules

## 1. Settlement Split Architecture

Every completed water tanker order generates the following ledger splits:

```
Gross Booking Amount = Base_Price + Delivery_Charge + Surcharge + GST
Platform Commission = ROUND((Base_Price + Delivery_Charge + Surcharge) * 0.10, 2)  -- 10% Platform Take
Taxes Payable (GST) = GST_Amount  -- 5% Remitted to State GST Portal

Net Supplier Share = (Base_Price + Delivery_Charge + Surcharge) - Platform Commission
Driver Remuneration = Included within Supplier Fleet Disbursement or ₹150 base trip fee
```

---

## 2. Refund Matrix & Cancellation Penalties

| Trigger Stage | Customer Penalty | Supplier Compensation | Platform Fee | Refund to Customer |
| :--- | :--- | :--- | :--- | :--- |
| **`pending`** (Awaiting Supplier) | ₹0.00 | ₹0.00 | ₹0.00 | **100% Full Refund** |
| **`driver_assigned`** (Depot Staging) | ₹0.00 | ₹0.00 | ₹0.00 | **100% Full Refund** |
| **`en_route`** (Tanker on Road) | ₹100.00 (Fuel/Dispatch Surcharge) | ₹100.00 | ₹0.00 | **Balance Refunded** |
| **`arrived`** (At Customer Sump) | ₹200.00 (Trip Dry-Run Surcharge) | ₹200.00 | ₹0.00 | **Balance Refunded** |
| **`delivering`** (Pumping in Progress) | Non-cancellable | N/A | N/A | **Dispute Required** |
| **Flow-meter Shortfall** | ₹0.00 | Prorated deduction | Prorated deduction | **Automated Prorated Refund** |
