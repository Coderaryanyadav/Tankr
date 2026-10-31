#!/usr/bin/env bash
set -eo pipefail

REPORT_DIR="qa/reports"
mkdir -p "$REPORT_DIR"

echo "=========================================================="
echo "  TANKR LOGIC AUDIT — Generating Verification Summary"
echo "=========================================================="

npx jest qa/logic-tests/ --json --outputFile="$REPORT_DIR/LOGIC_TEST_SUMMARY.json" || true

echo "Report generated at: $REPORT_DIR/LOGIC_TEST_SUMMARY.json"
