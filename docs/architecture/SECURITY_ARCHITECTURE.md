# TANKR — Security Architecture Reference

## 1. Security Philosophy

TANKR operates in critical physical infrastructure: potable municipal water distribution. A compromise of dispatch authority or pricing controls could disrupt emergency hospital supplies or enable unfair extraction.

The architecture enforces a strict **Zero-Trust Client** security model:
- The mobile application and web frontend are treated as untrusted clients.
- All authorization decisions are evaluated by PostgreSQL at the transaction boundary.
- No client-side role switching or admin bypass flags exist.

---

## 2. Role-Based Access Control (RBAC) Matrix

| Table / Resource | Customer | Driver | Supplier | Admin |
| :--- | :---: | :---: | :---: | :---: |
| `public.profiles` | Own Profile Only | Own Profile Only | Own Profile Only | Full Read / Write |
| `public.saved_addresses` | Own Addresses | None | None | Full Read / Write |
| `public.tankers` | Read (Online/Available) | Read Assigned | Manage Own Fleet | Full Read / Write |
| `public.bookings` | Own Bookings | Read Assigned Trips | Read Fleet Orders | Full Read / Write |
| `public.payments` | Own Payments | None | Read Fleet Receipts | Full Read / Write |
| `public.invoices` | Own Invoices | None | Read Fleet Invoices | Full Read / Write |
| `public.driver_payout_ledger`| None | Own Ledger Entries | Read Fleet Ledger | Full Read / Write / Settle |
| `public.water_quality_certificates`| Read Certified | Read Certified | Read Certified | Full Read / Write / Suspend |
| `public.disputes` | Raise & Read Own | Read Trips | Read Trips | Full Read / Resolve / Refund |
| `public.emergency_dispatches` | None | Assigned Only | Assigned Only | Full Dispatch Authority |
| `public.admin_audit_logs` | None | None | None | Append-Only (Security Definer) |

---

## 3. Defense Against Privilege Escalation

To prevent malicious clients from updating their own role from `customer` to `admin`:

```sql
CREATE OR REPLACE FUNCTION public.protect_profile_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF OLD.role IS DISTINCT FROM NEW.role THEN
        IF NOT public.is_admin(auth.uid()) THEN
            RAISE EXCEPTION 'Privilege escalation rejected: only administrators can alter user roles';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;
```

---

## 4. Client Credential & Secret Isolation

1. **Publishable Keys Only**:
   Only `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are packaged into the application.
2. **Forbidden Service Keys**:
   The Supabase `SUPABASE_SERVICE_ROLE_KEY` is strictly prohibited from client bundles and CI environment configurations. Automated scanners (`scripts/verify-project.sh`) reject builds containing service-role references.
3. **PIN Delivery Verification**:
   The customer is issued a 4-digit cryptographic PIN upon booking creation. The driver cannot mark the delivery completed until the customer provides the PIN, preventing false drop claims.
