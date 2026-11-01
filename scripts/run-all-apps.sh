#!/usr/bin/env bash
# ==============================================================================
# TANKR — Launch All 3 Apps Concurrently
# Opens Customer, Driver, and Supplier applications in your browser
# ==============================================================================

set -uo pipefail

PORT="${PORT:-8081}"
BASE_URL="http://localhost:${PORT}"

echo "Checking Expo Web server at ${BASE_URL}..."

# Check if Expo Dev Server is running
if ! curl -s -m 2 "${BASE_URL}" > /dev/null 2>&1; then
  echo "Expo server not active. Starting Expo Web server in background..."
  npx expo start --web --port "${PORT}" > /dev/null 2>&1 &
  SERVER_PID=$!

  RETRIES=30
  while [ $RETRIES -gt 0 ]; do
    if curl -s -m 2 "${BASE_URL}" > /dev/null 2>&1; then
      break
    fi
    sleep 1
    RETRIES=$((RETRIES - 1))
    echo -n "."
  done
  echo ""

  if [ $RETRIES -eq 0 ]; then
    echo "Timed out waiting for Expo server to start on port ${PORT}."
    exit 1
  fi
  echo "Expo server is ready on ${BASE_URL}."
else
  echo "Expo server is active on ${BASE_URL}."
fi

echo "Launching all 3 apps in browser..."
open "${BASE_URL}/?app=customer"
sleep 0.5
open "${BASE_URL}/?app=driver"
sleep 0.5
open "${BASE_URL}/?app=supplier"

echo "================================================================"
echo " All 3 TANKR Apps Launched Successfully!"
echo "   1. Customer App:        ${BASE_URL}/?app=customer"
echo "   2. Fleet Driver App:    ${BASE_URL}/?app=driver"
echo "   3. Water Supplier App:  ${BASE_URL}/?app=supplier"
echo "   *  Admin Desk:          ${BASE_URL}/?app=admin"
echo "================================================================"

