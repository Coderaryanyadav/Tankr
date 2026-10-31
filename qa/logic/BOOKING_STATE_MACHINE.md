# TANKR — Booking State Machine & Lifecycle Invariants

## 1. Formal State Machine Diagram

```mermaid
stateDiagram-v2
    [*] --> pending: Customer creates booking (create_booking_atomic)
    
    pending --> accepted: Supplier dispatch desk accepts (supplier_accept_booking)
    pending --> cancelled: Customer cancels / dispatch timeout (customer_cancel_booking_with_policy)
    
    accepted --> driver_assigned: Fleet assigns driver & vehicle
    accepted --> cancelled: Customer cancels (Full refund)
    
    driver_assigned --> en_route: Driver departs depot / begins trip (driver_update_delivery_status)
    driver_assigned --> cancelled: Customer cancels (Cancellation policy applies)
    
    en_route --> arrived: Driver docks at customer sump (driver_update_delivery_status)
    en_route --> cancelled: Customer cancels (Prorated fee applies)
    
    arrived --> delivering: Customer shares PIN & driver connects hose
    arrived --> cancelled: Customer rejects tanker at sump (Incident filed)
    
    delivering --> delivered: PIN verified & Flow-meter pumped (driver_complete_delivery_with_meter)
    delivering --> disputed: Volume shortfall detected / customer dispute (submit_customer_dispute)
    
    delivered --> [*]: Invoice generated & Payout scheduled
    cancelled --> [*]: Tanker released (is_available = true) & Refund processed
    disputed --> delivered: Admin arbitrates & settles prorated refund
```

---

## 2. Transition Validity Matrix

| From State | To State | Permitted? | Enforcing RPC / Trigger | Policy & Business Rules |
| :--- | :--- | :--- | :--- | :--- |
| `[*]` | `pending` | **YES** | `create_booking_atomic` | Requires available tanker, unexpired quote, authenticated customer. |
| `pending` | `accepted` | **YES** | `supplier_accept_booking` | Supplier must own the tanker and be verified. |
| `pending` | `cancelled` | **YES** | `customer_cancel_booking_with_policy` | 100% refund; tanker availability reset to `TRUE`. |
| `accepted` | `driver_assigned` | **YES** | `driver_update_delivery_status` | Assigned driver must be on-duty. |
| `driver_assigned` | `en_route` | **YES** | `driver_update_delivery_status` | Telemetry starts streaming to `tracking_breadcrumbs`. |
| `en_route` | `arrived` | **YES** | `driver_update_delivery_status` | Proximity check (`< 200m` from customer sump). |
| `arrived` | `delivering` | **YES** | `driver_update_delivery_status` | Pumping commences. Cancellation locked. |
| `delivering` | `delivered` | **YES** | `driver_complete_delivery_with_meter` | Requires valid 4-digit PIN + `meter_end > meter_start`. |
| **`delivered`** | **`cancelled`** | **FORBIDDEN** | `customer_cancel_booking_with_policy` | **BLOCKED:** Water already pumped into sump. |
| **`delivering`** | **`cancelled`** | **FORBIDDEN** | `customer_cancel_booking_with_policy` | **BLOCKED:** Water actively discharging. |
| **`cancelled`** | **`accepted`** | **FORBIDDEN** | `supplier_accept_booking` | **BLOCKED:** Dead order cannot be resurrected. |
| **`delivered`** | **`delivered`** | **FORBIDDEN** | `driver_complete_delivery_with_meter` | **BLOCKED:** Cannot complete a delivery twice. |
