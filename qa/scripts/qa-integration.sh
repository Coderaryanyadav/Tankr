#!/usr/bin/env bash
# ==============================================================================
# TANKR QA Script: Integration Test Runner
# ==============================================================================
set -euo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}${BOLD}=== TANKR Integration Test Suite ===${NC}"

npx jest qa/integration/ --watchAll=false
echo -e "${GREEN}${BOLD}Integration tests passed.${NC}"
