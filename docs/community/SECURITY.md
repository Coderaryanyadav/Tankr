# Security Policy

At TANKR, the integrity of essential municipal water infrastructure, customer delivery data, and financial transactions is of paramount importance.

---

## 1. Supported Versions

Security updates and critical patches are actively provided for the following releases:

| Version | Supported | Status |
| :--- | :--- | :--- |
| `1.0.x` | ✅ Yes | Current Production & Active Maintenance |
| `< 1.0.0` | ❌ No | Historical Development Prototypes |

---

## 2. Reporting a Security Vulnerability

If you believe you have discovered a vulnerability or security defect in TANKR:

> [!CAUTION]
> **DO NOT** open a public GitHub issue, discussion thread, or pull request to report security vulnerabilities.

### Submission Process:
1. Send an email to **`security@tankr.in`** with the subject line `[SECURITY REPORT] Vulnerability in <component>`.
2. Include in your report:
   - Detailed description of the vulnerability.
   - Exact steps to reproduce or Proof-of-Concept (PoC) payload.
   - Potential impact assessment (e.g., authorization bypass, data exposure, denial of service).
   - Component affected (Mobile client, PostgreSQL RPC, Supabase Auth, or Admin Portal).
3. We will acknowledge receipt of your report within **24 hours** and provide regular status updates during remediation.

---

## 3. Platform Security Architecture

TANKR follows defense-in-depth principles:
- **Authoritative Database RBAC**: All permissions are enforced at the PostgreSQL layer via Row-Level Security (RLS) policies and `SECURITY DEFINER` procedures. Client applications cannot modify administrative fields directly.
- **Client Credential Isolation**: Only publishable, public client tokens (such as `EXPO_PUBLIC_SUPABASE_ANON_KEY` and public Maps keys) are bundled into the application. Supabase `service_role` secrets and database superuser credentials are strictly prohibited from frontend builds.
- **Transactional State Transitions**: Critical workflows—such as tanker booking creation, driver location recording, and dispute settlement—run within atomic transactions with concurrency locks to prevent race conditions.
- **Audit Trails**: All administrative interventions (rebalancing, fee overrides, supplier verification, dispute resolution) are recorded in `public.admin_audit_logs`.
