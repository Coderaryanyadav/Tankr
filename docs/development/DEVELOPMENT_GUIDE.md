# TANKR — Developer Workflow & Daily Guide

## 1. Daily Development Workflow

```bash
# 1. Pull latest changes
git pull origin main

# 2. Check health and dependencies
./scripts/check-environment.sh

# 3. Start local development server
./scripts/start-dev.sh web
```

---

## 2. Testing Your Changes

Always run the full suite before committing:

```bash
# Static TypeScript verification
npm run typecheck

# Jest automated test suites
npm run test:ci

# Complete release gate
./scripts/verify-project.sh
```

---

## 3. Working with Multiple Roles

To test the multi-sided platform locally:
1. Open an Incognito / Private window for each role at `http://localhost:8081`.
2. Window 1 (Customer): Log in with `9876543210` (OTP `123456`) and request a 5,000L tanker.
3. Window 2 (Supplier): Log in with `9999999999` (OTP `123456`) to accept order.
4. Window 3 (Driver): Log in with `9000000001` (OTP `123456`) to drive, ping GPS, and enter customer PIN.
5. Window 4 (Admin): Log in with `8888888888` (OTP `123456`) to watch the live fleet map update in real-time.
