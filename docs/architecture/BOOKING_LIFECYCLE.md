# TANKR — Booking Lifecycle & State Transitions

## 1. State Machine Definition

A water tanker delivery is a multi-step physical transaction governed by strict validation rules.

```mermaid
stateDiagram-v2
    [*] --> requested: Customer initiates booking (create_booking_atomic)
    
    requested --> accepted: Supplier confirms fleet availability
    requested --> cancelled_by_customer: Cancelled prior to acceptance (Full refund)
    requested --> auto_cancelled_timeout: No acceptance within 15-minute SLA

    accepted --> driver_assigned: Specific tanker driver designated
    accepted --> cancelled_by_supplier: Supplier fleet breakdown / shortage

    driver_assigned --> en_route: Driver acknowledges and begins navigation
    
    en_route --> arrived: Driver reaches customer sump coordinate
    en_route --> cancelled_with_fee: Customer cancels while tanker en route (Cancellation fee deducted)

    arrived --> dispensing: Driver enters valid customer 4-digit PIN
    
    dispensing --> delivered: Digital flow meter records verified dropped volume (driver_complete_delivery_with_meter)
    
    delivered --> settled: 85% driver earnings released from escrow
    delivered --> disputed: Customer files water contamination or volume shortage dispute

    disputed --> settled_refund: Admin issues customer refund
    disputed --> settled_dismissed: Admin dismisses dispute based on telemetry audit

    settled --> [*]
    settled_refund --> [*]
    settled_dismissed --> [*]
    cancelled_by_customer --> [*]
    cancelled_by_supplier --> [*]
    cancelled_with_fee --> [*]
    auto_cancelled_timeout --> [*]
```

---

## 2. Cancellation Policy & Penalty Engine

Implemented in `customer_cancel_booking_with_policy()`:

| Phase | Timing | Penalty Applied | Refund Status |
| :--- | :--- | :--- | :--- |
| **`requested`** | Before supplier acceptance | ₹0 (No penalty) | 100% Instant Refund |
| **`accepted`** | Prior to vehicle dispatch | ₹0 (No penalty) | 100% Instant Refund |
| **`en_route`** | Vehicle dispatched (> 2km away) | ₹150 (Base mobilization fee) | Remaining balance refunded |
| **`arrived`** | Tanker on site at delivery sump | 50% of base fare | 50% refunded |
| **`dispensing`** | Valve opened / Pumping active | Cancellation locked | Non-cancellable |
