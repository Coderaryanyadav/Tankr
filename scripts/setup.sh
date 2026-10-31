#!/usr/bin/env bash
# ==============================================================================
# TANKR Automated One-Command Local Developer Setup
# Automates environment verification, dependencies, auto-installation, database & test checks
# ==============================================================================

set -uo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}${BOLD}================================================================${NC}"
echo -e "${CYAN}${BOLD}       💧 TANKR — One-Command Developer Setup Automation       ${NC}"
echo -e "${BLUE}${BOLD}================================================================${NC}"
echo ""

# 1. Verify Repository Root
if [ ! -f "package.json" ] || ! grep -q '"name": "tankr"' package.json 2>/dev/null; then
    echo -e "${RED}[ERROR] Please run this script from the root of the TANKR repository.${NC}"
    exit 1
fi
echo -e "${BOLD}[1/7] Repository root verified.${NC}"

# Auto-installer helper for missing prerequisites
ensure_prerequisites() {
    local OS="$(uname -s)"
    
    # 1. Check & Install Git if missing
    if ! command -v git >/dev/null 2>&1; then
        echo -e "${YELLOW}[AUTO-INSTALL] Git is missing. Installing Git automatically...${NC}"
        if [ "$OS" = "Darwin" ]; then
            if command -v brew >/dev/null 2>&1; then
                brew install git
            else
                xcode-select --install 2>/dev/null || true
            fi
        elif [ "$OS" = "Linux" ]; then
            if command -v apt-get >/dev/null 2>&1; then
                sudo apt-get update && sudo apt-get install -y git
            elif command -v dnf >/dev/null 2>&1; then
                sudo dnf install -y git
            elif command -v pacman >/dev/null 2>&1; then
                sudo pacman -Sy --noconfirm git
            fi
        fi
    fi

    # 2. Check & Install Node.js if missing or outdated (< 18)
    local NEED_NODE=0
    if ! command -v node >/dev/null 2>&1; then
        NEED_NODE=1
    else
        local NODE_VER="$(node -v | sed 's/v//')"
        local NODE_MAJOR="$(echo "$NODE_VER" | cut -d. -f1)"
        if [ "$NODE_MAJOR" -lt 18 ]; then
            echo -e "${YELLOW}[NOTICE] Detected Node.js v${NODE_VER}. TANKR requires >= v18.0.0 (v20+ LTS recommended).${NC}"
            NEED_NODE=1
        fi
    fi

    if [ "$NEED_NODE" -eq 1 ]; then
        echo -e "${YELLOW}[AUTO-INSTALL] Installing Node.js v20 LTS automatically...${NC}"
        if [ "$OS" = "Darwin" ]; then
            if ! command -v brew >/dev/null 2>&1; then
                echo -e "  Installing Homebrew package manager..."
                NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" || true
                if [ -f "/opt/homebrew/bin/brew" ]; then
                    eval "$(/opt/homebrew/bin/brew shellenv)"
                elif [ -f "/usr/local/bin/brew" ]; then
                    eval "$(/usr/local/bin/brew shellenv)"
                fi
            fi
            if command -v brew >/dev/null 2>&1; then
                brew install node@20
                brew link --overwrite --force node@20 2>/dev/null || true
                export PATH="/opt/homebrew/opt/node@20/bin:/usr/local/opt/node@20/bin:$PATH"
            else
                echo -e "  Installing Node.js v20 via NVM..."
                curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
                export NVM_DIR="$HOME/.nvm"
                [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
                nvm install 20
                nvm use 20
            fi
        elif [ "$OS" = "Linux" ]; then
            if command -v apt-get >/dev/null 2>&1; then
                curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
                sudo apt-get install -y nodejs
            elif command -v dnf >/dev/null 2>&1; then
                curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
                sudo dnf install -y nodejs
            else
                curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
                export NVM_DIR="$HOME/.nvm"
                [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
                nvm install 20
                nvm use 20
            fi
        fi
    fi

    # 3. macOS recommended file watcher (Watchman - optional)
    if [ "$OS" = "Darwin" ] && ! command -v watchman >/dev/null 2>&1 && command -v brew >/dev/null 2>&1; then
        echo -e "  [${CYAN}RECOMMENDED${NC}] Watchman improves Metro file watching performance on macOS."
        echo -e "  To install Watchman: ${BOLD}brew install watchman${NC}"
    fi
}

# 2. Check Prerequisites & Auto-Install Missing Components
echo ""
echo -e "${BOLD}[2/7] Checking & Auto-Installing Prerequisites...${NC}"
chmod +x scripts/*.sh 2>/dev/null || true
chmod +x scripts/mac/*.sh 2>/dev/null || true

ensure_prerequisites

# Run environment health check
if ! ./scripts/check-environment.sh; then
    echo -e "${YELLOW}[RE-CHECK] Retrying diagnostics after automated setup...${NC}"
    ensure_prerequisites
fi

# 3. Environment Configuration Setup (.env)
echo ""
echo -e "${BOLD}[3/7] Setting up Environment Configuration...${NC}"
if [ ! -f ".env" ]; then
    echo -e "  Copying default template: .env.example -> .env"
    cp .env.example .env
    echo -e "  [${GREEN}CREATED${NC}] .env file generated."
else
    echo -e "  [${GREEN}EXISTS${NC}] .env file already present (preserving existing settings)."
fi

# 4. Install Dependencies
echo ""
echo -e "${BOLD}[4/7] Installing Project Dependencies...${NC}"
if [ -f "bun.lock" ] && command -v bun >/dev/null 2>&1; then
    echo -e "  Using bun to install dependencies..."
    bun install
elif [ -f "package-lock.json" ]; then
    echo -e "  Running npm install..."
    npm install
else
    npm install
fi
echo -e "  [${GREEN}SUCCESS${NC}] Dependencies installed."

# 5. Database & Supabase Check
echo ""
echo -e "${BOLD}[5/7] Checking Database & Backend Connectivity...${NC}"
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
    echo -e "  Docker daemon is running. Local Supabase can be started."
    if [ ! -d "supabase/.temp" ]; then
        echo -e "  [${CYAN}INFO${NC}] To run local Supabase: run 'npx supabase start'."
    fi
else
    echo -e "  [${YELLOW}INFO${NC}] Docker not running or remote Supabase configured in .env."
fi

# 6. Typecheck & Tests Verification
echo ""
echo -e "${BOLD}[6/7] Running Quality & Regression Checks...${NC}"
echo -e "  • Static Typecheck (tsc --noEmit)..."
if npx tsc --noEmit; then
    echo -e "    [${GREEN}PASS${NC}] TypeScript strict checks passed (0 errors)."
else
    echo -e "    [${RED}FAIL${NC}] TypeScript check failed."
    exit 1
fi

echo -e "  • Unit & Regression Tests (jest)..."
if npm test -- --watchAll=false; then
    echo -e "    [${GREEN}PASS${NC}] 100% test suites passed."
else
    echo -e "    [${RED}FAIL${NC}] Test suite failed."
    exit 1
fi

# 7. Final Summary and Demo Credentials
echo ""
echo -e "${BLUE}${BOLD}================================================================${NC}"
echo -e "${GREEN}${BOLD}           ✨ TANKR LOCAL ENVIRONMENT SETUP COMPLETE! ✨        ${NC}"
echo -e "${BLUE}${BOLD}================================================================${NC}"
echo ""
echo -e "${BOLD}To start the local development server:${NC}"
echo -e "  ${CYAN}./scripts/mac/start-dev.sh web${NC}       (Browser: http://localhost:8081)"
echo -e "  ${CYAN}./scripts/mac/start-dev.sh android${NC}   (Android Emulator)"
echo -e "  ${CYAN}./scripts/mac/start-dev.sh ios${NC}       (iOS Simulator)"
echo ""
echo -e "${BOLD}Local Demo Credentials (fixed OTP: 123456):${NC}"
echo -e "  • Super Admin:     Phone: ${BOLD}8888888888${NC} (Access to all 10 Operations Desks)"
echo -e "  • Water Supplier:  Phone: ${BOLD}9999999999${NC} (Marol Potable Water Hub)"
echo -e "  • Fleet Driver:    Phone: ${BOLD}9000000001${NC} (Rajesh Sharma — MH-02-TC-5001)"
echo -e "  • Customer:        Phone: ${BOLD}9876543210${NC} (Vikram Malhotra)"
echo -e "${BLUE}${BOLD}================================================================${NC}"
echo ""
