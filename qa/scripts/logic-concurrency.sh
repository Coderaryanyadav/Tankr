#!/usr/bin/env bash
set -eo pipefail

echo "=========================================================="
echo "  TANKR LOGIC AUDIT — Concurrency, Race Conditions & Locks"
echo "=========================================================="

npx jest qa/logic-tests/concurrency_and_race_logic.test.ts --verbose
