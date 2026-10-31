#!/usr/bin/env bash
# ==============================================================================
# TANKR Complete Project Verification Utility
# Comprehensive CI & release gate checking code, types, tests, and security
# ==============================================================================

set -uo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASSED_STEPS=0
FAILED_STEPS=0

report_step() {
    local name="$1"
    local exit_code="$2"
    if [ "$exit_code" -eq 0 ]; then
        echo -e "  [${GREEN}PASS${NC}] ${name}"
        PASSED_STEPS=$((PASSED_STEPS + 1))
    else
        echo -e "  [${RED}FAIL${NC}] ${name}"
        FAILED_STEPS=$((FAILED_STEPS + 1))
    fi
}

echo -e "${BLUE}${BOLD}================================================================${NC}"
echo -e "${BLUE}${BOLD}          TANKR — Complete Pre-Release Project Verification     ${NC}"
echo -e "${BLUE}${BOLD}================================================================${NC}"
echo ""

# 1. Environment Check
echo -e "${BOLD}[1/6] Environment Configuration Validation...${NC}"
./scripts/validate-env.sh >/dev/null 2>&1
report_step "Environment variables (.env)" $?

# 2. Package Dependencies
echo -e "${BOLD}[2/6] Verifying Node Dependencies...${NC}"
if [ -d "node_modules" ]; then
    report_step "node_modules installed" 0
else
    echo -e "  [${YELLOW}WARN${NC}] node_modules missing. Run 'npm install'."
    report_step "node_modules installed" 1
fi

# 3. TypeScript Type Checking
echo -e "${BOLD}[3/6] Static Type Analysis (tsc)...${NC}"
npx tsc --noEmit
report_step "TypeScript compiler (tsc --noEmit)" $?

# 4. Jest Unit & Domain Tests
echo -e "${BOLD}[4/6] Automated Test Suites...${NC}"
npm test -- --watchAll=false
report_step "Jest test suites" $?

# 5. Database Schema Integrity
echo -e "${BOLD}[5/6] Database Schema Migration Integrity...${NC}"
if [ -f "supabase/migrations/20261031000001_master_database_schema.sql" ] && [ -f "supabase/seed.sql" ]; then
    report_step "Master database migration & seed files present" 0
else
    report_step "Master database migration & seed files present" 1
fi

# 6. Hardcoded Secret & Security Scan
echo -e "${BOLD}[6/6] Scanning for Hardcoded Secrets & Service Keys...${NC}"
SECRET_LEAK=0

# Check if private service role keys or private PEMs exist in tracked src/
if git grep -i "service_role" -- 'src/' >/dev/null 2>&1; then
    echo -e "  [${RED}ALERT${NC}] Found potential 'service_role' reference in src/!"
    SECRET_LEAK=1
fi

if git grep -i "PRIVATE KEY" -- 'src/' >/dev/null 2>&1; then
    echo -e "  [${RED}ALERT${NC}] Found potential private key in src/!"
    SECRET_LEAK=1
fi

report_step "Static secret leak scan" $SECRET_LEAK

echo ""
echo -e "${BLUE}${BOLD}================================================================${NC}"
echo -e "Verification Summary: ${GREEN}${PASSED_STEPS} Steps Passed${NC}, ${RED}${FAILED_STEPS} Steps Failed${NC}"
echo -e "${BLUE}${BOLD}================================================================${NC}"

if [ "$FAILED_STEPS" -eq 0 ]; then
    echo -e "${GREEN}${BOLD}PROJECT VERIFICATION SUCCESSFUL: Ready for development or deployment.${NC}"
    exit 0
else
    echo -e "${RED}${BOLD}Project verification encountered issues. Please resolve the failing steps above.${NC}"
    exit 1
fi
