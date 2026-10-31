#!/usr/bin/env bash
# ==============================================================================
# TANKR QA Script: Performance & Concurrency Engine
# ==============================================================================
set -euo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}${BOLD}=== TANKR Performance & Concurrency Test Suite ===${NC}"

npx jest qa/performance/ --watchAll=false
echo -e "${GREEN}${BOLD}Performance and concurrency tests passed.${NC}"
