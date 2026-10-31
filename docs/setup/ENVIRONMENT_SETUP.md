# TANKR — Environment Configuration Reference

This guide details all environment variables used across the TANKR stack.

---

## 1. Environment Variable Catalog

| Variable Name | Required | Context | Purpose | Where to Obtain |
| :--- | :---: | :---: | :--- | :--- |
| `EXPO_PUBLIC_SUPABASE_URL` | **Yes** | Client & Web | Supabase Project API URL | Supabase Dashboard > Project Settings > API |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | **Yes** | Client & Web | Publishable Anon Key | Supabase Dashboard > Project Settings > API |
| `EXPO_PUBLIC_RAZORPAY_KEY_ID` | Optional | Client & Web | Razorpay Test Key ID | Razorpay Dashboard > Settings > API Keys |
| `EXPO_PUBLIC_MAPPLS_REST_KEY` | Optional | Client & Web | Mappls Map REST API Key | https://auth.mappls.com/console/ |
| `EXPO_PUBLIC_MAPPLS_CLIENT_ID` | Optional | Client & Web | Mappls OAuth Client ID | https://auth.mappls.com/console/ |
| `EXPO_PUBLIC_MAPPLS_CLIENT_SECRET` | Optional | Client & Web | Mappls Client Secret | https://auth.mappls.com/console/ |
| `EXPO_PUBLIC_CARTO_API_KEY` | Optional | Web | Carto Basemaps API Key | https://carto.com/ (Defaults to OSM tiles if absent) |

---

## 2. Client vs Server Secrets

> [!WARNING]
> **Expo Public Variables (`EXPO_PUBLIC_`)**:
> Any variable prefixed with `EXPO_PUBLIC_` is inlined directly into client JavaScript bundles during compilation.
> **NEVER** assign `SUPABASE_SERVICE_ROLE_KEY`, database passwords, or private payment gateway secrets to an `EXPO_PUBLIC_` variable.

---

## 3. Safe Validation Utility

To inspect your local environment configuration without exposing cleartext credentials:

```bash
./scripts/validate-env.sh
```

The script will mask your keys (e.g. `http****e.co (40 chars)`) and report missing or unconfigured placeholder values.
