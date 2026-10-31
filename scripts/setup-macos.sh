#!/usr/bin/env bash
# ==============================================================================
# TANKR macOS Host Setup Helper
# Checks and guides macOS developers on Homebrew, Watchman, and Node
# ==============================================================================

set -uo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}${BOLD}================================================================${NC}"
echo -e "${BLUE}${BOLD}            TANKR — macOS Developer Setup Assistant            ${NC}"
echo -e "${BLUE}${BOLD}================================================================${NC}"
echo ""

# 1. Homebrew
if command -v brew >/dev/null 2>&1; then
    echo -e "  [${GREEN}OK${NC}] Homebrew is installed."
else
    echo -e "  [${YELLOW}INFO${NC}] Homebrew is not installed. To install:"
    echo '  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
fi

# 2. Watchman (Recommended for Expo file watching on macOS)
if command -v watchman >/dev/null 2>&1; then
    echo -e "  [${GREEN}OK${NC}] Watchman file watcher is installed."
else
    echo -e "  [${YELLOW}RECOMMENDED${NC}] Install Watchman for optimal React Native Metro file watching:"
    echo "  brew install watchman"
fi

# 3. Node.js & npm
if command -v node >/dev/null 2>&1; then
    echo -e "  [${GREEN}OK${NC}] Node $(node -v) is installed."
else
    echo -e "  [${YELLOW}ACTION REQUIRED${NC}] Install Node.js v20+:"
    echo "  brew install node@20"
fi

# 4. Supabase CLI
if command -v supabase >/dev/null 2>&1; then
    echo -e "  [${GREEN}OK${NC}] Supabase CLI is installed."
else
    echo -e "  [${YELLOW}OPTIONAL${NC}] To install Supabase CLI for local database hosting:"
    echo "  brew install supabase/tap/supabase"
fi

echo ""
echo -e "${GREEN}${BOLD}macOS setup check completed. Run './scripts/setup.sh' to initialize the project.${NC}"
