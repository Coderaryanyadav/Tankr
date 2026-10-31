# TANKR — CI/CD Pipeline & GitHub Actions Reference

## 1. Automated Pipelines

TANKR maintains automated GitHub Actions pipelines located in [`.github/workflows/`](../../.github/workflows/):

1. **`ci.yml`**: Triggered on push or pull request to `main`. Executes `npm ci`, strict TypeScript compilation (`tsc --noEmit`), all Jest test suites, and scans for hardcoded secrets.
2. **`typecheck.yml`**: Triggered on pull requests modifying TypeScript files. Enforces zero compiler errors.
3. **`tests.yml`**: Runs Jest unit and regression suites.
4. **`lint.yml`**: Detects accidental commits of `.env` files or hardcoded API keys.

---

## 2. Release & Build Automation

Release tagging triggers the production web export (`npx expo export --platform web`) and automated dispatch to EAS for mobile binaries.
