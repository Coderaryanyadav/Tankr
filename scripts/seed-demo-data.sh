#!/usr/bin/env bash
# ==============================================================================
# TANKR Demo Data Seeding Utility
# Seeds realistic Mumbai fleet, service zones, and bookings for local development
# ==============================================================================

set -uo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SEED_FILE="supabase/seed.sql"

echo -e "${BLUE}${BOLD}================================================================${NC}"
echo -e "${BLUE}${BOLD}            TANKR — Development Data Seeding Utility            ${NC}"
echo -e "${BLUE}${BOLD}================================================================${NC}"
echo ""

if [ ! -f "$SEED_FILE" ]; then
    echo -e "${RED}[ERROR] Seed file not found: ${SEED_FILE}${NC}"
    exit 1
fi

ENV_FILE=".env"
if [ -f "$ENV_FILE" ]; then
    SUPABASE_URL=$(grep -E "^EXPO_PUBLIC_SUPABASE_URL=" "$ENV_FILE" | cut -d'=' -f2- | tr -d '\r' | tr -d '"' | tr -d "'")
else
    SUPABASE_URL="Local Development"
fi

# Production Guard
if [[ "$SUPABASE_URL" == *"prod"* ]] && [[ "$SUPABASE_URL" != *"127.0.0.1"* ]] && [[ "$SUPABASE_URL" != *"localhost"* ]]; then
    echo -e "${RED}${BOLD}[SECURITY BLOCKED] Cannot run synthetic demo seeds against production database!${NC}"
    exit 1
fi

echo -e "${BOLD}Target Environment:${NC} ${SUPABASE_URL}"
echo -e "${BOLD}Seed File:${NC}          ${SEED_FILE}"
echo ""

if command -v supabase >/dev/null 2>&1 || npx --no-install supabase --version >/dev/null 2>&1; then
    echo -e "${BOLD}Executing seed via Supabase CLI...${NC}"
    if npx supabase db query --file "$SEED_FILE" 2>/dev/null; then
        echo -e "  [${GREEN}SUCCESS${NC}] Demo data successfully seeded."
    else
        echo -e "  [${YELLOW}INFO${NC}] Local Supabase container not running. Seed data is also embedded in the master migration."
    fi
else
    echo -e "  [${YELLOW}INFO${NC}] Supabase CLI not active. You can execute ${BOLD}${SEED_FILE}${NC} directly in the Supabase SQL Editor."
fi

echo ""
echo -e "${GREEN}${BOLD}Seeding utility finished.${NC}"
