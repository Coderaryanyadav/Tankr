# TANKR — Notifications & Alert Setup

## 1. Notification Types

TANKR provides three layers of event notifications:
1. **In-App Notification Feed**: Stored in `public.notifications` and rendered in the customer and driver interfaces.
2. **Push Notifications**: Powered by Expo Push Notification Service for mobile clients.
3. **SMS Alerts**: Delivery confirmations and 4-digit verification PINs dispatched via Supabase Auth SMS or Twilio.

---

## 2. Notification Triggers

- **Booking Accepted**: Customer receives estimated arrival window.
- **Driver En Route**: Customer receives live tracking link and driver contact details.
- **Tanker Arrived**: Customer receives 4-digit PIN notification required to authorize valve opening.
- **Emergency Escalation**: Drivers within 5km receive hospital dispatch priority alarms.
