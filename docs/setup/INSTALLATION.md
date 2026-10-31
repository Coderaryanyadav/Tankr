# TANKR — Developer Installation Guide

## 1. Quick Start (Automated One-Command Setup)

The fastest and most reliable way to prepare your machine for TANKR development is our automated setup script:

```bash
# 1. Clone the repository
git clone https://github.com/Coderaryanyadav/Tankr.git
cd Tankr

# 2. Make scripts executable and run setup
chmod +x scripts/*.sh
./scripts/setup.sh
```

The script will automatically:
1. Verify operating system and architecture prerequisites.
2. Confirm Node.js (`>= v18`) and package managers.
3. Install dependencies from lockfiles.
4. Generate `.env` from template.
5. Validate environment configuration.
6. Verify static type compilation and run all 28 automated test suites.

---

## 2. Manual Step-by-Step Installation

If you prefer to configure your workspace manually:

### Step 1: Clone Repository
```bash
git clone https://github.com/Coderaryanyadav/Tankr.git
cd Tankr
```

### Step 2: Install Node Dependencies
Ensure Node.js `v20+` is active:
```bash
node -v # Should report v18.0.0 or higher (v20+ LTS recommended)
npm install
```

### Step 3: Configure Environment
```bash
cp .env.example .env
```
Edit `.env` to configure your Supabase URL and public anonymous key. (See [Environment Setup](ENVIRONMENT_SETUP.md)).

### Step 4: Validate Health & Typecheck
```bash
./scripts/check-environment.sh
./scripts/validate-env.sh
npm run typecheck
npm test -- --watchAll=false
```

### Step 5: Start Development Server
```bash
./scripts/start-dev.sh web
```
Open your browser at `http://localhost:8081` to view the application.
