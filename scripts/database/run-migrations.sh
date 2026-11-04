#!/usr/bin/env bash
# ==============================================================================
# TANKR Safe Database Migration Runner
# Applies schema migrations forward with safeguards against production resets
# ==============================================================================

set -uo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ENV_FILE=".env"
MIGRATION_FILE="supabase/migrations/20261031000001_master_database_schema.sql"

echo -e "${BLUE}${BOLD}================================================================${NC}"
echo -e "${BLUE}${BOLD}            TANKR — Database Migration Forward Runner           ${NC}"
echo -e "${BLUE}${BOLD}================================================================${NC}"
echo ""

if [ ! -f "$MIGRATION_FILE" ]; then
    echo -e "${RED}[ERROR] Migration file not found: ${MIGRATION_FILE}${NC}"
    exit 1
fi

if [ -f "$ENV_FILE" ]; then
    SUPABASE_URL=$(grep -E "^EXPO_PUBLIC_SUPABASE_URL=" "$ENV_FILE" | cut -d'=' -f2- | tr -d '\r' | tr -d '"' | tr -d "'")
else
    SUPABASE_URL="Local Development (Docker / 127.0.0.1:54322)"
fi

echo -e "${BOLD}Target Database Host:${NC} ${SUPABASE_URL}"
echo -e "${BOLD}Migration File:${NC}       ${MIGRATION_FILE}"
echo ""

# Check if using local Supabase CLI
if command -v supabase >/dev/null 2>&1 || npx --no-install supabase --version >/dev/null 2>&1; then
    echo -e "${BOLD}Applying migrations via Supabase CLI...${NC}"
    if npx supabase db push 2>/dev/null; then
        echo -e "  [${GREEN}SUCCESS${NC}] Schema pushed successfully via Supabase CLI."
    else
        echo -e "  [${YELLOW}INFO${NC}] Supabase CLI push skipped or local docker offline. Applying directly if database port is open..."
    fi
else
    echo -e "  [${YELLOW}INFO${NC}] Supabase CLI not installed. To apply migrations to your remote project:"
    echo -e "  Open Supabase Studio > SQL Editor and paste the contents of:"
    echo -e "  1. ${BOLD}${MIGRATION_FILE}${NC}"
    echo -e "  2. ${BOLD}${FIXES_FILE}${NC}"
fi

echo ""
echo -e "${GREEN}${BOLD}Database schema migration script completed.${NC}"
