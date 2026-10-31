# TANKR — Error Codes & Exception Catalog

This reference lists standard error codes returned by TANKR stored procedures and APIs.

---

## 1. Domain Error Codes

| Code | HTTP / RPC | Message | Cause & Mitigation |
| :--- | :---: | :--- | :--- |
| `QUOTE_EXPIRED` | 400 | Price quote has expired (15m TTL). | Customer waited longer than 15 minutes to confirm checkout. Refresh quote via discovery screen. |
| `TANKER_UNAVAILABLE`| 409 | Selected tanker has been booked by another customer. | Concurrency lock lost. The app automatically re-queries the nearest available vehicle. |
| `INVALID_PIN` | 403 | Delivery verification PIN is incorrect. | Driver entered mismatched PIN. Customer must read the 4-digit code from their tracking screen. |
| `OUTSIDE_ZONE` | 422 | Delivery coordinates lie outside operational zones. | Selected dropoff is not within current Mumbai service zones (Marol, Sakinaka, SEEPZ, Powai, Chakala, Chandivali). |
| `INSUFFICIENT_FUNDS`| 402 | Payment authorization failed. | Customer card or UPI payment was declined by issuing bank. |

---

## 2. PostgreSQL Error Codes

| Code | Name | Cause | Resolution |
| :--- | :--- | :--- | :--- |
| `42501` | `insufficient_privilege` | Table grant missing for role `authenticated` or `anon`. | Re-apply [`supabase/migrations/20261031000001_master_database_schema.sql`](../../supabase/migrations/20261031000001_master_database_schema.sql). |
| `23505` | `unique_violation` | Vehicle license plate or phone number already registered. | Check input fields for duplicate entries. |
| `23503` | `foreign_key_violation` | Referenced tanker, customer, or booking ID does not exist. | Ensure parent entity exists before inserting child records. |
