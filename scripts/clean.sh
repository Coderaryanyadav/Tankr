#!/usr/bin/env bash
# ==============================================================================
# TANKR Development Cache & Build Cleaner
# Safely clears temporary bundler artifacts and caches with user confirmation
# ==============================================================================

set -uo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}${BOLD}================================================================${NC}"
echo -e "${BLUE}${BOLD}              TANKR — Cache & Build Artifact Cleaner            ${NC}"
echo -e "${BLUE}${BOLD}================================================================${NC}"
echo ""

echo -e "${YELLOW}This utility will remove temporary build caches and bundler outputs:${NC}"
echo -e "  • .expo/ (Metro bundler cache)"
echo -e "  • web-build/ & dist/ (Production web outputs)"
echo -e "  • *.tsbuildinfo (TypeScript build cache)"
echo -e "  • node_modules/.cache (Jest and Babel caches)"
echo ""
echo -e "${GREEN}Note: Source code, .env, and database files will NOT be touched.${NC}"
echo ""

read -r -p "Do you want to proceed with clearing temporary caches? [y/N]: " response
case "$response" in
    [yY][eE][sS]|[yY])
        echo ""
        echo -e "Cleaning Metro and Expo caches..."
        rm -rf .expo dist web-build
        rm -rf node_modules/.cache
        rm -f tsconfig.tsbuildinfo
        echo -e "  [${GREEN}DONE${NC}] Temporary caches removed."
        echo ""
        echo -e "${GREEN}${BOLD}Clean completed successfully. You can restart the server now.${NC}"
        ;;
    *)
        echo -e "${YELLOW}Clean operation aborted.${NC}"
        exit 0
        ;;
esac
