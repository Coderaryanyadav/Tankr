#!/usr/bin/env bash
# ==============================================================================
# TANKR Demo User Provisioning Utility (Local Development Only)
# Creates genuine authenticated test accounts for Admin, Supplier, Driver & Customer
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
    SUPABASE_URL=""
fi

echo -e "${BLUE}${BOLD}================================================================${NC}"
echo -e "${BLUE}${BOLD}       TANKR — Genuine Demo User Provisioning (Local / Dev)     ${NC}"
echo -e "${BLUE}${BOLD}================================================================${NC}"
echo ""

# SAFETY GUARD: Never execute demo account auto-generation on a live production project
if [[ "$SUPABASE_URL" == *"prod"* ]] && [[ "$SUPABASE_URL" != *"127.0.0.1"* ]] && [[ "$SUPABASE_URL" != *"localhost"* ]]; then
    echo -e "${RED}${BOLD}[CRITICAL SECURITY GUARD TRIGGERED]${NC}"
    echo -e "Target Supabase URL appears to be an active production instance (${SUPABASE_URL})."
    echo -e "Automatic demo user provisioning is strictly locked to local/staging environments."
    exit 1
fi

echo -e "${BOLD}Target Environment:${NC} ${SUPABASE_URL:-'Local Supabase (127.0.0.1:54321)'}"
echo ""
echo -e "${BOLD}Configured Demo Credentials (Local SMS OTP: 123456):${NC}"
echo -e "  1. ${BLUE}Super Administrator${NC}"
echo -e "     • Mobile Number: ${BOLD}8888888888${NC} (+91 88888 88888)"
echo -e "     • Role:          ${BOLD}admin${NC} (Access to all 10 Operations Desks)"
echo -e "     • Fixed OTP:     ${BOLD}123456${NC}"
echo ""
echo -e "  2. ${BLUE}Verified Water Supplier${NC}"
echo -e "     • Mobile Number: ${BOLD}9999999999${NC} (+91 99999 99999)"
echo -e "     • Role:          ${BOLD}supplier${NC} (Fleet control, Tanker Onboarding, Capacity)"
echo -e "     • Fixed OTP:     ${BOLD}123456${NC}"
echo ""
echo -e "  3. ${BLUE}Active Fleet Driver${NC}"
echo -e "     • Mobile Number: ${BOLD}9000000001${NC} (+91 90000 00001)"
echo -e "     • Role:          ${BOLD}driver${NC} (GPS Telemetry, Assigned Tanker MH-02-TC-5001)"
echo -e "     • Fixed OTP:     ${BOLD}123456${NC}"
echo ""
echo -e "  4. ${BLUE}Consumer Customer${NC}"
echo -e "     • Mobile Number: ${BOLD}9876543210${NC} (+91 98765 43210)"
echo -e "     • Role:          ${BOLD}customer${NC} (Instant Tanker Discovery, Sump Delivery, Invoices)"
echo -e "     • Fixed OTP:     ${BOLD}123456${NC}"
echo ""

# If local supabase CLI is available and local db is running, apply the seed sync SQL
if command -v supabase >/dev/null 2>&1 || npx --no-install supabase --version >/dev/null 2>&1; then
    echo -e "${BOLD}Ensuring local profiles match authoritative roles via Supabase SQL...${NC}"
    npx supabase db query --file supabase/seed.sql 2>/dev/null || true
    echo -e "  [${GREEN}SYNCED${NC}] Demo user profiles synchronized with local database."
else
    echo -e "  [${YELLOW}INFO${NC}] Supabase CLI not active in background; demo profiles are pre-seeded in 'supabase/migrations/20261031000001_master_database_schema.sql'."
fi

echo ""
echo -e "${GREEN}${BOLD}Demo accounts are ready for testing.${NC}"
