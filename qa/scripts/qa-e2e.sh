#!/usr/bin/env bash
# ==============================================================================
# TANKR QA Script: End-to-End Real-World Multi-Role Scenarios
# ==============================================================================
set -euo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}${BOLD}=== TANKR E2E Real-World Scenarios Suite ===${NC}"

npx jest qa/e2e/ --watchAll=false
echo -e "${GREEN}${BOLD}All 20 Real-World Scenarios verified successfully.${NC}"

