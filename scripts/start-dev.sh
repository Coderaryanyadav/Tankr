#!/usr/bin/env bash
# ==============================================================================
# TANKR Development Server Launcher
# Launches Expo Dev Server with Metro bundler and web support
# ==============================================================================

set -uo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}${BOLD}================================================================${NC}"
echo -e "${BLUE}${BOLD}                TANKR — Development Server Launcher             ${NC}"
echo -e "${BLUE}${BOLD}================================================================${NC}"
echo ""

# Ensure .env is present
if [ ! -f ".env" ]; then
    echo -e "Copying default .env from .env.example..."
    cp .env.example .env
fi

MODE="${1:-web}"

case "$MODE" in
    ios)
        echo -e "${GREEN}Starting Expo for iOS Simulator...${NC}"
        npx expo start --ios
        ;;
    android)
        echo -e "${GREEN}Starting Expo for Android Emulator...${NC}"
        npx expo start --android
        ;;
    web)
        echo -e "${GREEN}Starting Expo for Web Browser (http://localhost:8081)...${NC}"
        npx expo start --web
        ;;
    *)
        echo -e "${GREEN}Starting Expo Interactive Console...${NC}"
        npx expo start
        ;;
esac
