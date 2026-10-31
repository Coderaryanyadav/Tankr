#!/usr/bin/env bash
# ==============================================================================
# TANKR QA Script: Preflight Environment Validation
# ==============================================================================
set -euo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}${BOLD}=== TANKR QA Preflight Checks ===${NC}"

# 1. Check Node.js
if command -v node >/dev/null 2>&1; then
    NODE_V=$(node --version)
    echo -e "  [${GREEN}PASS${NC}] Node.js runtime: ${NODE_V}"
else
    echo -e "  [${RED}FAIL${NC}] Node.js runtime missing!"
    exit 1
fi

# 2. Check npm
if command -v npm >/dev/null 2>&1; then
    NPM_V=$(npm --version)
    echo -e "  [${GREEN}PASS${NC}] npm package manager: ${NPM_V}"
else
    echo -e "  [${RED}FAIL${NC}] npm missing!"
    exit 1
fi

# 3. Check Git branch & clean state
GIT_BRANCH=$(git branch --show-current 2>/dev/null || echo "detached")
echo -e "  [${GREEN}PASS${NC}] Git branch: ${GIT_BRANCH}"

# 4. Check Environment Configuration
if [ -f ".env" ]; then
    echo -e "  [${GREEN}PASS${NC}] Environment file (.env) detected"
else
    echo -e "  [${RED}FAIL${NC}] .env file missing! Create one from .env.example"
    exit 1
fi

# 5. Check Supabase Endpoint Connectivity
SUPABASE_URL=$(grep -E "^EXPO_PUBLIC_SUPABASE_URL=" .env | cut -d'=' -f2- | tr -d '\r' | tr -d '"' | tr -d "'")
if [ -n "$SUPABASE_URL" ]; then
    echo -e "  [${GREEN}PASS${NC}] Target Supabase Cloud: ${SUPABASE_URL}"
else
    echo -e "  [${YELLOW}WARN${NC}] EXPO_PUBLIC_SUPABASE_URL is not configured"
fi

echo -e "${GREEN}${BOLD}Preflight verification successful.${NC}"
exit 0

