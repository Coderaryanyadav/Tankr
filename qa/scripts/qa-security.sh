#!/usr/bin/env bash
# ==============================================================================
# TANKR QA Script: Security, RLS & Authorization Verification
# ==============================================================================
set -euo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}${BOLD}=== TANKR Security & RLS Test Suite ===${NC}"

npx jest qa/security/ --watchAll=false
echo -e "${GREEN}${BOLD}Security and RLS tests passed.${NC}"
