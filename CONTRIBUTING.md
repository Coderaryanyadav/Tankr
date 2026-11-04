# Contributing to TANKR

Thank you for your interest in contributing to **TANKR** — the modern, on-demand water logistics and deficit dispatch platform.

This guide outlines our development workflow, engineering standards, testing expectations, and contribution lifecycle.

---

## 1. Code of Conduct

All contributors and maintainers are expected to adhere to our [Code of Conduct](CODE_OF_CONDUCT.md). Please report unacceptable behavior to `security@tankr.in`.

---

## 2. Prerequisites & Machine Setup

Ensure your local machine satisfies the baseline developer requirements:
- **Node.js**: `v18.0.0+` (Node.js `v20+` LTS recommended).
- **npm**: `v9.0.0+` or `v10+`.
- **Git**: `v2.30+`.
- **Docker Engine** (Optional, required for running the local Supabase container).
- **Supabase CLI** (Optional, for local migrations and test seeding).

Quick setup:
```bash
# Clone the repository
git clone https://github.com/Coderaryanyadav/Tankr.git
cd Tankr

# Run the automated one-command setup
./scripts/setup.sh
```

---

## 3. Branching Strategy & Git Workflow

We adhere to the GitHub Flow model:
- `main`: Production-ready, deployable branch. All PRs target `main`.
- `feature/<name>`: New capabilities (e.g., `feature/live-telemetry-smoothing`).
- `bugfix/<issue>`: Fixes for verified defects (e.g., `bugfix/payout-reconciliation`).
- `docs/<topic>`: Documentation enhancements (e.g., `docs/architecture-er-update`).
- `refactor/<scope>`: Code cleanup or performance refactoring without functional changes.

---

## 4. Commit Message Conventions

We enforce [Conventional Commits v1.0.0](https://www.conventionalcommits.org/):

```text
<type>(<optional scope>): <description in imperative mood>

[optional body]

[optional footer(s)]
```

### Supported Types:
- `feat`: A new user-facing feature or API capability.
- `fix`: A bug fix or patch.
- `docs`: Documentation changes only.
- `refactor`: Code change that neither fixes a bug nor adds a feature.
- `test`: Adding or updating test suites.
- `chore`: Maintenance tasks, dependency updates, configuration changes.

*Example:*
```bash
git commit -m "feat(supply): add high-pressure pump toggle to tanker onboarding"
git commit -m "fix(auth): resolve profile upsert RLS denial for mobile onboarding"
```

---

## 5. Engineering & Code Standards

- **TypeScript Strictness**: Zero compilation errors under `tsc --noEmit`. No untyped `any` without documented reason.
- **Mobile-First Responsive Design**: Always use `Platform.OS` guards and theme tokens (`src/theme/`) rather than hardcoded dimensions or colors.
- **State Management**: Domain logic resides in Zustand stores (`src/stores/`), keeping UI components declarative and lightweight.
- **Database & RLS Integrity**:
  - Never bypass Row-Level Security in client applications.
  - Privileged actions must be implemented as PostgreSQL `SECURITY DEFINER` stored procedures.
  - Every table must have explicit `GRANT` statements and RLS policies for `anon` and `authenticated`.
- **Zero Mocking of Core Domain Logic**: Supabase tables and RPC functions are authoritative.

---

## 6. Testing & Release Gate Requirements

Before opening a pull request, your branch **must** pass all local verification gates:

```bash
# 1. Static Typecheck
npm run typecheck

# 2. Automated Jest Test Suite
npm run test:ci

# 3. Complete Pre-Release Verification Script
./scripts/verify-project.sh
```

---

## 7. Submitting a Pull Request

1. Push your branch to GitHub:
   ```bash
   git push origin feature/your-feature-name
   ```
2. Open a Pull Request against `main`.
3. Complete all fields in the [.github/PULL_REQUEST_TEMPLATE.md](.github/PULL_REQUEST_TEMPLATE.md).
4. Ensure all automated GitHub Actions CI checks pass.
5. Address reviewer feedback constructively.

---

## 8. Database Migrations Guide

If your change involves database schema modifications:
1. Never edit historical migrations in `supabase/migrations_archive/`.
2. Place forward migrations in `supabase/migrations/`.
3. Include idempotency guards (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `ON CONFLICT DO UPDATE`).
4. Apply the migration using `./scripts/run-migrations.sh`.
5. Ensure tests in `__tests__/` are updated to assert on the new database structures.

Thank you for building the future of resilient water infrastructure with TANKR! 💧
