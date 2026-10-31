## Description

<!-- Provide a brief summary of the changes in this pull request and the problem they solve. -->

## Type of Change

- [ ] 🐛 Bug fix (non-breaking change which fixes a verified issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that causes existing functionality to change)
- [ ] 📝 Documentation update (no code logic changes)
- [ ] ⚙️ CI/CD or build tooling change

## Target Area

- [ ] Customer Mobile Experience
- [ ] Supplier Dashboard & Fleet Control
- [ ] Driver Console & Telemetry
- [ ] Admin Operations Command Portal (10 Desks)
- [ ] PostgreSQL Schema / Migrations / RPCs
- [ ] Setup Scripts & Developer Experience

## Related Issues / Tickets

Closes #<!-- issue number -->

## Testing Checklist

- [ ] `npx tsc --noEmit` runs with **0 errors**.
- [ ] `npm test -- --watchAll=false` passes all test suites.
- [ ] `./scripts/verify-project.sh` passes all 6 verification gates.
- [ ] Tested on web browser (`./scripts/start-dev.sh web`).
- [ ] Verified on mobile layout / simulator where applicable.

## Database Impact

- [ ] No database schema changes.
- [ ] Includes database migration with `CREATE TABLE IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`.
- [ ] Row-Level Security (RLS) policies and `SECURITY DEFINER` grants updated.
- [ ] Regression tests added in `__tests__/` for new stored procedures.

## Security Confirmation

- [ ] I have verified that no private API keys, `service_role` secrets, or credentials are committed in this PR.
