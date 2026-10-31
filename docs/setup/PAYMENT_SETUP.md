# TANKR — Payment Gateway & Escrow Configuration

## 1. Gateway Overview

TANKR supports hybrid escrow settlement for municipal water dispatches:
- **Online Checkout**: UPI (Google Pay, PhonePe, Paytm), Credit/Debit Cards, and Netbanking via Razorpay.
- **Pay on Delivery (COD)**: Cash or direct driver UPI collection upon physical drop verification.

---

## 2. Sandbox Setup

1. Create a Razorpay test account at [dashboard.razorpay.com](https://dashboard.razorpay.com).
2. Go to **Settings** > **API Keys** > **Generate Test Key**.
3. Add your Key ID to `.env`:
   ```env
   EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_test_your_key_id
   ```

---

## 3. Escrow & Driver Payout Engine

When a customer confirms an order:
1. Online funds are authorized and captured into an escrow hold.
2. The payment record is created in `public.payments`.
3. When the driver completes the delivery and enters the customer's 4-digit PIN:
   - Platform take-rate (10%) is routed to TANKR.
   - Fleet maintenance fee (5%) is allocated.
   - Driver delivery payout (85%) is credited to `public.driver_payout_ledger`.
4. Administrators can disburse driver payouts via the **Financial & Payouts** desk in the Admin Portal.
