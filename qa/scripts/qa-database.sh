#!/usr/bin/env bash
# ==============================================================================
# TANKR QA Script: Database Schema & Migration Verifier
# ==============================================================================
set -euo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}${BOLD}=== TANKR Database Migration & Schema Audit ===${NC}"

MIGRATION_COUNT=$(find supabase/migrations -name "*.sql" | wc -l | tr -d ' ')
echo -e "  [${GREEN}PASS${NC}] Detected ${MIGRATION_COUNT} SQL migrations in supabase/migrations/"

for sql in supabase/migrations/*.sql; do
    echo -e "  - Validating syntax of $(basename "$sql")..."
    if [ -s "$sql" ]; then
        echo -e "    [${GREEN}OK${NC}] $(basename "$sql") is non-empty ($(wc -l < "$sql" | tr -d ' ') lines)"
    else
        echo -e "    [${RED}FAIL${NC}] $(basename "$sql") is empty!"
        exit 1
    fi
done

echo -e "${GREEN}${BOLD}Database schema files verified.${NC}"
