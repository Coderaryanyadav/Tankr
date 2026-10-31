#!/usr/bin/env bash
# ==============================================================================
# TANKR Linux Host Setup Helper
# Checks and guides Linux (Ubuntu/Debian/Fedora) developers
# ==============================================================================

set -uo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}${BOLD}================================================================${NC}"
echo -e "${BLUE}${BOLD}            TANKR — Linux Developer Setup Assistant            ${NC}"
echo -e "${BLUE}${BOLD}================================================================${NC}"
echo ""

# 1. System packages
if command -v apt-get >/dev/null 2>&1; then
    echo -e "  [${GREEN}OK${NC}] Debian/Ubuntu package manager detected (apt)."
    echo -e "  Essential packages: curl, git, build-essential"
elif command -v dnf >/dev/null 2>&1; then
    echo -e "  [${GREEN}OK${NC}] Fedora/RHEL package manager detected (dnf)."
fi

# 2. Node.js check
if command -v node >/dev/null 2>&1; then
    echo -e "  [${GREEN}OK${NC}] Node $(node -v) is installed."
else
    echo -e "  [${YELLOW}ACTION REQUIRED${NC}] Install Node.js v20+ via NodeSource or NVM:"
    echo "  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
    echo "  sudo apt-get install -y nodejs"
fi

# 3. Docker check
if command -v docker >/dev/null 2>&1; then
    echo -e "  [${GREEN}OK${NC}] Docker is installed."
else
    echo -e "  [${YELLOW}OPTIONAL${NC}] For local Supabase database testing, install Docker CE:"
    echo "  https://docs.docker.com/engine/install/"
fi

echo ""
echo -e "${GREEN}${BOLD}Linux setup check completed. Run './scripts/setup.sh' to initialize the project.${NC}"
