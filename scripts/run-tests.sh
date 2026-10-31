#!/usr/bin/env bash
# ==============================================================================
# TANKR Automated Test Runner
# Runs static type analysis, regression suites, and domain tests
# ==============================================================================

set -uo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}${BOLD}================================================================${NC}"
echo -e "${BLUE}${BOLD}                TANKR — Automated Test Suite                    ${NC}"
echo -e "${BLUE}${BOLD}================================================================${NC}"
echo ""

OVERALL_STATUS=0

# 1. TypeScript Static Typecheck
echo -e "${BOLD}1. Running TypeScript Static Type Checking (tsc --noEmit)...${NC}"
if npx tsc --noEmit; then
    echo -e "  [${GREEN}PASS${NC}] TypeScript compilation passed with 0 errors."
else
    echo -e "  [${RED}FAIL${NC}] TypeScript compilation encountered errors."
    OVERALL_STATUS=1
fi
echo ""

# 2. Jest Unit & Regression Test Suite
echo -e "${BOLD}2. Running Jest Regression & Domain Unit Test Suites...${NC}"
if npm test -- --watchAll=false; then
    echo -e "  [${GREEN}PASS${NC}] Jest test suite completed successfully."
else
    echo -e "  [${RED}FAIL${NC}] One or more Jest tests failed."
    OVERALL_STATUS=1
fi
echo ""

echo -e "${BLUE}${BOLD}================================================================${NC}"
if [ "$OVERALL_STATUS" -eq 0 ]; then
    echo -e "${GREEN}${BOLD}All tests and typechecks passed successfully!${NC}"
    exit 0
else
    echo -e "${RED}${BOLD}Test suite failed. Please review errors above.${NC}"
    exit 1
fi
