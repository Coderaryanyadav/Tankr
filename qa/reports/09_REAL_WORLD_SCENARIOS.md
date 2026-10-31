# TANKR — Real-World Scenario Testing Report

**Document ID:** `QA-REP-09-SCENARIOS`  
**Date:** 2026-10-31  

---

## 1. Real-World Failure Scenarios Audit (1 to 20)

| Scenario # | Title | Expected Behavior | Observed Result | Status |
|---|---|---|---|---|
| **Scenario 1** | Normal Customer Booking | Quote -> Acceptance -> En Route -> Arrived -> PIN Handshake -> Delivered -> GST Invoice | Full lifecycle executed and verified | **PASS** |
| **Scenario 2** | Two Customers Compete for One Tanker | Only one customer receives booking; other gets clear availability response | Exactly 1 confirmed, 1 rejected | **PASS** |
| **Scenario 3** | Supplier Rejects Booking | Triggers automatic fleet reassignment or safe cancellation | Reassigned safely | **PASS** |
| **Scenario 4** | Driver Internet Loss During Delivery | Telemetry queue stores offline pings, syncs in order when back online | Ingested and synchronized in order | **PASS** |
| **Scenario 5** | Payment Succeeds But Mobile App Closes | Backend reconciles via webhook; app restores state upon restart | State restored correctly | **PASS** |
| **Scenario 6** | Payment Fails But Customer Retries | Reuses idempotency key; zero duplicate charges or bookings | Verified idempotent | **PASS** |
| **Scenario 7** | Supplier Goes Offline After Accepting | Booking is not dropped; persists on driver dispatch desk | Preserved in dispatch | **PASS** |
| **Scenario 8** | Driver No-Show Policy | Automatic cancellation and 100% refund after SLA timeout | Auto-cancelled and refunded | **PASS** |
| **Scenario 9** | Delivery PIN Brute-Force Rejection | Incorrect PIN rejected; authentic 4-digit code accepted | PIN verified strictly | **PASS** |
| **Scenario 10** | Invoice Generation Retry | Returns existing invoice on duplicate request; zero duplicate records | Deduplication verified | **PASS** |
| **Scenario 11** | Customer Cancels Post-Arrival | Prorated compensation fee deducted; balance refunded to customer | Fee applied correctly | **PASS** |
| **Scenario 12** | Supplier Suspended by Admin | In-flight deliveries complete safely; new bookings blocked | Policy enforced | **PASS** |
| **Scenario 13** | Database Connection Failure | Surfaces truthful error state without fake success states | Truthful error message rendered | **PASS** |
| **Scenario 14** | App Terminated Mid-Booking | Re-queries active state from backend upon restart | State restored | **PASS** |
| **Scenario 15** | Location Permissions Revoked | Informs user of GPS signal loss; zero fake movement simulated | Honest degraded state | **PASS** |
| **Scenario 16** | Duplicate Webhook Delivery | Secondary webhook ignored idempotently | Ignored safely | **PASS** |
| **Scenario 17** | Realtime WebSocket Reconnect | Resubscribes to channel updates after network restored | Reconnection verified | **PASS** |
| **Scenario 18** | Expired Booking Quote Rejection | Checkout rejected if quote is > 10 minutes old | Stale quote rejected | **PASS** |
| **Scenario 19** | Tanker Availability Change Mid-Checkout | Safely rejected if tanker went offline before confirmation | Rejection verified | **PASS** |
| **Scenario 20** | Account Deletion Retention | Personal data scrubbed; anonymized financial tax receipts retained | Compliant data retention | **PASS** |

