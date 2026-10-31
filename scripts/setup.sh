#!/usr/bin/env bash
# ==============================================================================
# TANKR Automated One-Command Local Developer Setup
# Automates environment verification, dependencies, database setup & test checks
# ==============================================================================

set -uo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}${BOLD}================================================================${NC}"
echo -e "${CYAN}${BOLD}       💧 TANKR — One-Command Developer Setup Automation       ${NC}"
echo -e "${BLUE}${BOLD}================================================================${NC}"
echo ""

# 1. Verify Repository Root
if [ ! -f "package.json" ] || ! grep -q '"name": "tankr"' package.json 2>/dev/null; then
    echo -e "${RED}[ERROR] Please run this script from the root of the TANKR repository.${NC}"
    exit 1
fi
echo -e "${BOLD}[1/7] Repository root verified.${NC}"

# 2. Check Prerequisites & Environment Health
echo ""
echo -e "${BOLD}[2/7] Running Environment Diagnostics...${NC}"
chmod +x scripts/*.sh 2>/dev/null || true
if ! ./scripts/check-environment.sh; then
    echo -e "${RED}[ABORT] Missing required environment prerequisites.${NC}"
    exit 1
fi

# 3. Environment Configuration Setup (.env)
echo ""
echo -e "${BOLD}[3/7] Setting up Environment Configuration...${NC}"
if [ ! -f ".env" ]; then
    echo -e "  Copying default template: .env.example -> .env"
    cp .env.example .env
    echo -e "  [${GREEN}CREATED${NC}] .env file generated."
else
    echo -e "  [${GREEN}EXISTS${NC}] .env file already present (preserving existing settings)."
fi

# 4. Install Dependencies
echo ""
echo -e "${BOLD}[4/7] Installing Project Dependencies...${NC}"
if [ -f "bun.lock" ] && command -v bun >/dev/null 2>&1; then
    echo -e "  Using bun to install dependencies..."
    bun install
elif [ -f "package-lock.json" ]; then
    echo -e "  Running npm install..."
    npm install
else
    npm install
fi
echo -e "  [${GREEN}SUCCESS${NC}] Dependencies installed."

# 5. Database & Supabase Check
echo ""
echo -e "${BOLD}[5/7] Checking Database & Backend Connectivity...${NC}"
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
    echo -e "  Docker daemon is running. Local Supabase can be started."
    if [ ! -d "supabase/.temp" ]; then
        echo -e "  [${CYAN}INFO${NC}] To run local Supabase: run 'npx supabase start'."
    fi
else
    echo -e "  [${YELLOW}INFO${NC}] Docker not running or remote Supabase configured in .env."
fi

# 6. Typecheck & Tests Verification
echo ""
echo -e "${BOLD}[6/7] Running Quality & Regression Checks...${NC}"
echo -e "  • Static Typecheck (tsc --noEmit)..."
if npx tsc --noEmit; then
    echo -e "    [${GREEN}PASS${NC}] TypeScript strict checks passed (0 errors)."
else
    echo -e "    [${RED}FAIL${NC}] TypeScript check failed."
    exit 1
fi

echo -e "  • Unit & Regression Tests (jest)..."
if npm test -- --watchAll=false; then
    echo -e "    [${GREEN}PASS${NC}] 100% test suites passed."
else
    echo -e "    [${RED}FAIL${NC}] Test suite failed."
    exit 1
fi

# 7. Final Summary and Demo Credentials
echo ""
echo -e "${BLUE}${BOLD}================================================================${NC}"
echo -e "${GREEN}${BOLD}           ✨ TANKR LOCAL ENVIRONMENT SETUP COMPLETE! ✨        ${NC}"
echo -e "${BLUE}${BOLD}================================================================${NC}"
echo ""
echo -e "${BOLD}To start the local development server:${NC}"
echo -e "  ${CYAN}./scripts/start-dev.sh web${NC}       # Open Web Browser (http://localhost:8081)"
echo -e "  ${CYAN}./scripts/start-dev.sh ios${NC}       # iOS Simulator"
echo -e "  ${CYAN}./scripts/start-dev.sh android${NC}   # Android Emulator"
echo ""
echo -e "${BOLD}Local Demo Credentials (OTP: 123456):${NC}"
echo -e "  • ${BOLD}Admin Portal:${NC}     Phone: ${CYAN}8888888888${NC} (Super Admin, all 10 desks)"
echo -e "  • ${BOLD}Supplier Portal:${NC}  Phone: ${CYAN}9999999999${NC} (Marol Potable Water Hub)"
echo -e "  • ${BOLD}Driver Console:${NC}   Phone: ${CYAN}9000000001${NC} (Rajesh Sharma, Tanker MH-02-TC-5001)"
echo -e "  • ${BOLD}Customer App:${NC}     Phone: ${CYAN}9876543210${NC} (Vikram Malhotra)"
echo ""
echo -e "${BLUE}${BOLD}================================================================${NC}"
exit 0
