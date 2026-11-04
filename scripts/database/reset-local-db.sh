#!/usr/bin/env bash
# ==============================================================================
# TANKR Local Database Reset Utility
# Re-applies migrations from scratch and seeds local development database
# ==============================================================================

set -uo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ENV_FILE=".env"
if [ -f "$ENV_FILE" ]; then
    SUPABASE_URL=$(grep -E "^EXPO_PUBLIC_SUPABASE_URL=" "$ENV_FILE" | cut -d'=' -f2- | tr -d '\r' | tr -d '"' | tr -d "'")
else
    SUPABASE_URL="Local Development"
fi

echo -e "${BLUE}${BOLD}================================================================${NC}"
echo -e "${BLUE}${BOLD}          TANKR — Local Database Reset & Migration Reset        ${NC}"
echo -e "${BLUE}${BOLD}================================================================${NC}"
echo ""

# CRITICAL SECURITY GUARD
if [[ "$SUPABASE_URL" == *"supabase.co"* ]]; then
    echo -e "${RED}${BOLD}[DANGER / ACTION PROHIBITED]${NC}"
    echo -e "Your current .env points to a remote Supabase cloud project: ${BOLD}${SUPABASE_URL}${NC}"
    echo -e "This script resets the database completely and is strictly restricted to local Docker environments."
    echo -e "To reset a remote database, do so deliberately via the Supabase Cloud Management Console."
    exit 1
fi

echo -e "${YELLOW}${BOLD}[WARNING] This will drop all local tables and re-apply all migrations and seeds.${NC}"
read -r -p "Are you sure you want to completely reset your local database? [y/N]: " response
case "$response" in
    [yY][eE][sS]|[yY])
        echo ""
        echo -e "${BOLD}Resetting local Supabase database...${NC}"
        if command -v supabase >/dev/null 2>&1 || npx --no-install supabase --version >/dev/null 2>&1; then
            npx supabase db reset
            echo -e "${GREEN}${BOLD}Local database reset and seeded successfully!${NC}"
        else
            echo -e "${RED}[ERROR] Supabase CLI is required for local database reset.${NC}"
            exit 1
        fi
        ;;
    *)
        echo -e "${YELLOW}Database reset cancelled.${NC}"
        exit 0
        ;;
esac
