#!/usr/bin/env bash
# ==============================================================================
# TANKR Complete Screen Capture CLI
# Automates opening every app, role & view, taking retina screenshots,
# and generating an interactive HTML gallery.
#
# Usage:
#   ./scripts/capture-all-screenshots.sh          # Default: captures all web screens
#   ./scripts/capture-all-screenshots.sh --open   # Captures and opens HTML gallery in browser
#   ./scripts/capture-all-screenshots.sh --port 8082 # Custom Expo port
#   ./scripts/capture-all-screenshots.sh --ios    # Captures from booted iOS Simulator
# ==============================================================================

set -uo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PORT="8081"
AUTO_OPEN=false
MODE="web"

while [[ $# -gt 0 ]]; do
  case $1 in
    --open|-o)
      AUTO_OPEN=true
      shift
      ;;
    --port|-p)
      PORT="$2"
      shift 2
      ;;
    --ios)
      MODE="ios"
      shift
      ;;
    --web)
      MODE="web"
      shift
      ;;
    --help|-h)
      echo -e "${BLUE}${BOLD}TANKR Screenshot Capture Utility${NC}"
      echo ""
      echo "Usage:"
      echo "  ./scripts/capture-all-screenshots.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --open, -o       Open the visual HTML gallery in your browser when done"
      echo "  --port, -p <num> Port where Expo Web is running (default: 8081)"
      echo "  --ios            Capture native iOS simulator screen if booted"
      echo "  --web            Run headless browser screen capture (default)"
      echo "  --help, -h       Show this help message"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      echo "Use --help for usage details."
      exit 1
      ;;
  esac
done

echo -e "${BLUE}${BOLD}================================================================${NC}"
echo -e "${BLUE}${BOLD}        TANKR — Complete Screen & App Screenshot Capture        ${NC}"
echo -e "${BLUE}${BOLD}================================================================${NC}"
echo ""

if [ "$MODE" = "ios" ]; then
  BOOTED_SIM=$(xcrun simctl list devices | grep "Booted" | head -n 1 || true)
  if [ -z "$BOOTED_SIM" ]; then
    echo -e "${RED}[ERROR] No iOS Simulator is currently booted.${NC}"
    echo -e "Boot a simulator with: ${BOLD}xcrun simctl boot <device_id>${NC} or start the app with: ${BOLD}npx expo run:ios${NC}"
    echo -e "Falling back to Web headless capture engine..."
    MODE="web"
  else
    echo -e "${GREEN}✔ Booted iOS Simulator detected:${NC} $BOOTED_SIM"
    mkdir -p screenshots/ios
    SIM_PATH="screenshots/ios/ios_simulator_$(date +%Y%m%d_%H%M%S).png"
    xcrun simctl io booted screenshot "$SIM_PATH"
    echo -e "${GREEN}✔ iOS Simulator screenshot saved:${NC} $SIM_PATH"
    if [ "$AUTO_OPEN" = true ]; then
      open "$SIM_PATH"
    fi
    exit 0
  fi
fi

# Check if Expo Dev Server is responding on the specified port
SERVER_URL="http://localhost:${PORT}"
echo -e "Checking Expo Web server at ${BOLD}${SERVER_URL}${NC}..."

EXPO_PID=""
if ! curl -s -m 2 "$SERVER_URL" > /dev/null 2>&1; then
  echo -e "${YELLOW}Expo dev server not active. Starting background server on port ${PORT}...${NC}"
  npx expo start --web --port "$PORT" > /dev/null 2>&1 &
  EXPO_PID=$!

  # Wait for server to become available
  RETRIES=30
  while [ $RETRIES -gt 0 ]; do
    if curl -s -m 2 "$SERVER_URL" > /dev/null 2>&1; then
      break
    fi
    sleep 1
    RETRIES=$((RETRIES - 1))
    echo -n "."
  done
  echo ""

  if [ $RETRIES -eq 0 ]; then
    echo -e "${RED}[ERROR] Timed out waiting for Expo server to start on port ${PORT}.${NC}"
    kill "$EXPO_PID" 2>/dev/null || true
    exit 1
  fi
  echo -e "${GREEN}✔ Expo server is ready on ${SERVER_URL}.${NC}"
else
  echo -e "${GREEN}✔ Expo dev server is already running on ${SERVER_URL}.${NC}"
fi

# Run the node capture script
PORT="$PORT" node scripts/capture-all-screenshots.js

# If we started an ephemeral server, shut it down cleanly
if [ -n "$EXPO_PID" ]; then
  echo -e "Stopping ephemeral Expo server (PID: $EXPO_PID)..."
  kill "$EXPO_PID" 2>/dev/null || true
fi

# Auto-open gallery if requested
if [ "$AUTO_OPEN" = true ]; then
  GALLERY_PATH="screenshots/index.html"
  if [ -f "$GALLERY_PATH" ]; then
    echo -e "${GREEN}Opening screenshot gallery in your browser...${NC}"
    open "$GALLERY_PATH"
  fi
fi

echo -e "${GREEN}${BOLD}Done!${NC}"

