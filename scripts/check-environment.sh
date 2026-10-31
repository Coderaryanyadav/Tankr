#!/usr/bin/env bash
# ==============================================================================
# TANKR Environment Health Check Utility
# Non-destructive diagnostics for local development environment
# ==============================================================================

set -uo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PASSED_COUNT=0
WARNING_COUNT=0
FAILED_COUNT=0

log_pass() {
    echo -e "  [${GREEN}PASS${NC}] $1"
    PASSED_COUNT=$((PASSED_COUNT + 1))
}

log_warn() {
    echo -e "  [${YELLOW}WARN${NC}] $1"
    WARNING_COUNT=$((WARNING_COUNT + 1))
}

log_fail() {
    echo -e "  [${RED}FAIL${NC}] $1"
    FAILED_COUNT=$((FAILED_COUNT + 1))
}

echo -e "${BLUE}${BOLD}================================================================${NC}"
echo -e "${BLUE}${BOLD}       TANKR — Environment & Prerequisites Health Check         ${NC}"
echo -e "${BLUE}${BOLD}================================================================${NC}"
echo ""

# 1. Operating System & Architecture
OS_NAME="$(uname -s)"
ARCH_NAME="$(uname -m)"
echo -e "${BOLD}1. Host Machine & Architecture:${NC}"
log_pass "Detected OS: ${OS_NAME} (${ARCH_NAME})"

# 2. Node.js Check
echo ""
echo -e "${BOLD}2. Node.js Runtime Check:${NC}"
if command -v node >/dev/null 2>&1; then
    NODE_VERSION="$(node -v | sed 's/v//')"
    NODE_MAJOR="$(echo "$NODE_VERSION" | cut -d. -f1)"
    if [ "$NODE_MAJOR" -ge 18 ]; then
        log_pass "Node.js installed: v${NODE_VERSION} (supported >= v18.0.0)"
    else
        log_fail "Node.js v${NODE_VERSION} is outdated. Please upgrade to Node.js >= 18.0.0 (v20+ LTS recommended)."
    fi
else
    log_fail "Node.js is not installed. Please install Node.js >= 18 from https://nodejs.org."
fi

# 3. Package Manager (npm / bun)
echo ""
echo -e "${BOLD}3. Package Manager Check:${NC}"
if command -v npm >/dev/null 2>&1; then
    NPM_VERSION="$(npm -v)"
    log_pass "npm installed: v${NPM_VERSION}"
else
    log_fail "npm is not installed."
fi

if command -v bun >/dev/null 2>&1; then
    BUN_VERSION="$(bun -v)"
    log_pass "bun installed: v${BUN_VERSION}"
fi

# 4. Git Version Control
echo ""
echo -e "${BOLD}4. Git Version Control:${NC}"
if command -v git >/dev/null 2>&1; then
    GIT_VERSION="$(git --version)"
    log_pass "${GIT_VERSION}"
else
    log_fail "Git is not installed."
fi

# 5. Docker Daemon (for local Supabase CLI)
echo ""
echo -e "${BOLD}5. Docker Engine (Required for local Supabase):${NC}"
if command -v docker >/dev/null 2>&1; then
    if docker info >/dev/null 2>&1; then
        DOCKER_VER="$(docker --version)"
        log_pass "Docker daemon is running (${DOCKER_VER})"
    else
        log_warn "Docker CLI is installed, but Docker daemon is NOT running. (Needed only if using local Supabase stack; remote Supabase does not require Docker)."
    fi
else
    log_warn "Docker is not installed. (Optional if connecting to remote Supabase instance)."
fi

# 6. Supabase CLI Check
echo ""
echo -e "${BOLD}6. Supabase CLI Check:${NC}"
if command -v supabase >/dev/null 2>&1; then
    SUPA_VER="$(supabase --version)"
    log_pass "Supabase CLI installed: ${SUPA_VER}"
elif npx --no-install supabase --version >/dev/null 2>&1; then
    log_pass "Supabase CLI available via npx"
else
    log_warn "Supabase CLI not found globally. You can run 'npx supabase' or install via 'npm install -g supabase' or 'brew install supabase/tap/supabase'."
fi

# 7. Expo CLI Tooling
echo ""
echo -e "${BOLD}7. Expo CLI Tooling:${NC}"
if npx --no-install expo --version >/dev/null 2>&1; then
    EXPO_VER="$(npx --no-install expo --version)"
    log_pass "Expo CLI locally installed: v${EXPO_VER}"
else
    log_pass "Expo CLI available via npx expo"
fi

# 8. Available Storage Check
echo ""
echo -e "${BOLD}8. Storage Space Check:${NC}"
if command -v df >/dev/null 2>&1; then
    FREE_KB=$(df -k . | awk 'NR==2 {print $4}')
    FREE_GB=$((FREE_KB / 1024 / 1024))
    if [ "$FREE_GB" -ge 2 ]; then
        log_pass "Available disk space: ~${FREE_GB} GB"
    else
        log_warn "Low disk space: ~${FREE_GB} GB available. Recommended >= 2 GB for dependencies and build artifacts."
    fi
fi

# 9. Environment File (.env) Check
echo ""
echo -e "${BOLD}9. Configuration Check (.env):${NC}"
if [ -f ".env" ]; then
    log_pass ".env configuration file is present."
elif [ -f ".env.example" ]; then
    log_warn ".env is missing. Run './scripts/setup.sh' to copy from .env.example."
else
    log_fail "Neither .env nor .env.example found. Ensure you are in the project root directory."
fi

# Final Summary
echo ""
echo -e "${BLUE}${BOLD}================================================================${NC}"
echo -e "Health Check Summary: ${GREEN}${PASSED_COUNT} Passed${NC}, ${YELLOW}${WARNING_COUNT} Warnings${NC}, ${RED}${FAILED_COUNT} Failures${NC}"
echo -e "${BLUE}${BOLD}================================================================${NC}"

if [ "$FAILED_COUNT" -gt 0 ]; then
    echo -e "${RED}${BOLD}Some mandatory prerequisites failed. Please resolve them before proceeding.${NC}"
    exit 1
else
    echo -e "${GREEN}${BOLD}Environment is ready for TANKR development!${NC}"
    exit 0
fi
