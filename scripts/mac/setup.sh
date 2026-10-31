#!/usr/bin/env bash
# ==============================================================================
# TANKR — macOS Developer Setup Automation
# ==============================================================================

set -uo pipefail

# Navigate to project root if invoked from scripts/mac
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${PROJECT_ROOT}"

exec ./scripts/setup.sh "$@"
