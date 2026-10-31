# TANKR — Developer Installation Guide

## 1. Quick Start (Automated One-Command Setup)

The fastest and most reliable way to prepare your machine for TANKR development is our platform-specific automated setup:

### macOS / Linux
```bash
# 1. Clone the repository
git clone https://github.com/Coderaryanyadav/Tankr.git
cd Tankr

# 2. Make scripts executable and run setup
chmod +x scripts/*.sh scripts/mac/*.sh
./scripts/mac/setup.sh
# or simply: ./scripts/setup.sh
```

### Windows (CMD & PowerShell)
```bat
REM From Command Prompt:
scripts\win\setup.bat
REM or simply:
scripts\setup.bat
```
```powershell
# From PowerShell:
powershell -ExecutionPolicy Bypass -File scripts\win\setup.ps1
```

The setup script automatically:
1. Verifies operating system and architecture prerequisites.
2. Confirms Node.js (`>= v18`) and package managers.
3. Installs dependencies from lockfiles.
4. Generates `.env` from `.env.example` if not present.
5. Runs static type compilation (`npx tsc --noEmit`).
6. Runs all Jest test suites to ensure 100% regression passing.

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
