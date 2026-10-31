# TANKR — Debugging & Diagnostics Guide

## 1. Web & Metro Debugging

1. **Metro Bundler Console**:
   Inspect console outputs directly in the terminal where `./scripts/start-dev.sh web` is running.
2. **Browser Developer Tools**:
   Press `F12` or `Cmd+Option+I` in Chrome/Brave:
   - **Console Tab**: Inspect Zustand store updates, API exceptions, and authentication states.
   - **Network Tab**: Filter by `WS` to inspect Supabase Realtime WebSocket packets.
   - **Application Tab**: Inspect cached tokens in `localStorage`.

---

## 2. PostgreSQL & Supabase Diagnostics

### Check Active Locks:
```sql
SELECT pid, usename, query, state, age(clock_timestamp(), query_start) 
FROM pg_stat_activity 
WHERE query ILIKE '%bookings%' AND state != 'idle';
```

### Inspect Audit Logs:
```sql
SELECT action, target_entity, target_id, details, created_at 
FROM public.admin_audit_logs 
ORDER BY created_at DESC 
LIMIT 20;
```
