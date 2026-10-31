#!/usr/bin/env bash
set -eo pipefail

echo "=========================================================="
echo "  TANKR LOGIC AUDIT — Comprehensive End-to-End Suite"
echo "=========================================================="

npx jest qa/logic-tests/ --verbose
