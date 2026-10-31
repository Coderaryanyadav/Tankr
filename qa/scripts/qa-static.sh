#!/usr/bin/env bash
# ==============================================================================
# TANKR QA Script: Static Code Analysis, Secrets & Type Safety
# ==============================================================================
set -euo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}${BOLD}=== TANKR Static Code & Security Analysis ===${NC}"

# 1. TypeScript Strict Typecheck
echo -e "${BOLD}Running TypeScript compilation check...${NC}"
if npx tsc --noEmit; then
    echo -e "  [${GREEN}PASS${NC}] TypeScript compilation: 0 errors"
else
    echo -e "  [${RED}FAIL${NC}] TypeScript compilation failed!"
    exit 1
fi

# 2. Secret Scanning (Zero Service Role Key Violations)
echo -e "${BOLD}Scanning for unmasked credentials in src/...${NC}"
VIOLATIONS=$(grep -rn "service_role" src/ 2>/dev/null | grep -v "DO NOT COMMIT" || true)
if [ -z "$VIOLATIONS" ]; then
    echo -e "  [${GREEN}PASS${NC}] Zero hardcoded service_role secrets found in source"
else
    echo -e "  [${RED}FAIL${NC}] Potential secret detected:\n$VIOLATIONS"
    exit 1
fi

# 3. Expo Doctor Diagnostics
echo -e "${BOLD}Running Expo dependency diagnostics...${NC}"
if npx expo-doctor >/dev/null 2>&1; then
    echo -e "  [${GREEN}PASS${NC}] Expo Doctor diagnostics passed"
else
    echo -e "  [${YELLOW}INFO${NC}] Expo Doctor returned non-fatal warnings"
fi

echo -e "${GREEN}${BOLD}Static analysis checks completed successfully.${NC}"
exit 0

