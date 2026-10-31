#!/usr/bin/env bash
# ==============================================================================
# TANKR QA Script: Safe Test Artifact & Cache Cleanup
# ==============================================================================
set -euo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}${BOLD}=== TANKR QA Artifacts Cleanup ===${NC}"

# Clear jest cache safely
npx jest --clearCache 2>/dev/null || true
echo -e "  [${GREEN}OK${NC}] Cleared Jest cache"

# Ensure no orphaned test scratch files
rm -rf qa/reports/*.tmp 2>/dev/null || true
echo -e "  [${GREEN}OK${NC}] Temporary test artifacts cleaned"

echo -e "${GREEN}${BOLD}Cleanup completed safely.${NC}"

