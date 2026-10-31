#!/usr/bin/env bash
# ==============================================================================
# TANKR Environment Configuration Validator
# Safely inspects .env without exposing secret keys
# ==============================================================================

set -uo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ENV_FILE=".env"

if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}[ERROR] .env file not found at project root.${NC}"
    echo -e "Run: cp .env.example .env"
    exit 1
fi

echo -e "${BLUE}${BOLD}================================================================${NC}"
echo -e "${BLUE}${BOLD}            TANKR — Environment Variable Validation             ${NC}"
echo -e "${BLUE}${BOLD}================================================================${NC}"
echo ""

# Helper to mask secret value
mask_val() {
    local val="$1"
    local len=${#val}
    if [ "$len" -le 8 ]; then
        echo "********"
    else
        local start="${val:0:4}"
        local end="${val: -4}"
        echo "${start}****${end} (${len} chars)"
    fi
}

ERRORS=0
WARNINGS=0

check_var() {
    local var_name="$1"
    local is_required="$2"
    local desc="$3"

    # Read variable safely without evaluating code
    local val
    val=$(grep -E "^${var_name}=" "$ENV_FILE" | cut -d'=' -f2- | tr -d '\r' | tr -d '"' | tr -d "'")

    if [ -z "$val" ]; then
        if [ "$is_required" = "true" ]; then
            echo -e "  [${RED}MISSING${NC}] ${BOLD}${var_name}${NC} (${desc})"
            ERRORS=$((ERRORS + 1))
        else
            echo -e "  [${YELLOW}OPTIONAL${NC}] ${BOLD}${var_name}${NC} is not set (${desc})"
            WARNINGS=$((WARNINGS + 1))
        fi
    elif [[ "$val" == *"your-"* ]] || [[ "$val" == *"example"* ]] || [[ "$val" == *"placeholder"* ]]; then
        if [ "$is_required" = "true" ]; then
            echo -e "  [${RED}PLACEHOLDER${NC}] ${BOLD}${var_name}${NC} has unconfigured template value: $(mask_val "$val")"
            ERRORS=$((ERRORS + 1))
        else
            echo -e "  [${YELLOW}PLACEHOLDER${NC}] ${BOLD}${var_name}${NC} has placeholder value: $(mask_val "$val")"
            WARNINGS=$((WARNINGS + 1))
        fi
    else
        echo -e "  [${GREEN}CONFIGURED${NC}] ${BOLD}${var_name}${NC}: $(mask_val "$val")"
    fi
}

echo -e "${BOLD}1. Supabase Backend Connectivity (Mandatory):${NC}"
check_var "EXPO_PUBLIC_SUPABASE_URL" "true" "Supabase Project URL"
check_var "EXPO_PUBLIC_SUPABASE_ANON_KEY" "true" "Supabase Anonymous Publishable Key"

echo ""
echo -e "${BOLD}2. Maps & Geospatial Services (Optional Fallbacks):${NC}"
check_var "EXPO_PUBLIC_MAPPLS_REST_KEY" "false" "Mappls / MapmyIndia REST API Key"
check_var "EXPO_PUBLIC_MAPPLS_CLIENT_ID" "false" "Mappls OAuth Client ID"
check_var "EXPO_PUBLIC_MAPPLS_CLIENT_SECRET" "false" "Mappls OAuth Client Secret"
check_var "EXPO_PUBLIC_CARTO_API_KEY" "false" "Carto Basemaps API Key (Fallback to OSM when absent)"

echo ""
echo -e "${BOLD}3. Payment Gateway (Test Mode / Sandbox):${NC}"
check_var "EXPO_PUBLIC_RAZORPAY_KEY_ID" "false" "Razorpay Key ID (Defaults to internal test sandbox if empty)"

echo ""
echo -e "${BLUE}${BOLD}================================================================${NC}"
if [ "$ERRORS" -gt 0 ]; then
    echo -e "${RED}${BOLD}Validation failed with ${ERRORS} error(s). Please configure missing variables in .env.${NC}"
    exit 1
elif [ "$WARNINGS" -gt 0 ]; then
    echo -e "${YELLOW}${BOLD}Validation passed with ${WARNINGS} optional warning(s). TANKR can operate in fallback mode.${NC}"
    exit 0
else
    echo -e "${GREEN}${BOLD}All environment variables are properly configured!${NC}"
    exit 0
fi
