#!/usr/bin/env bash
set -eo pipefail

echo "=========================================================="
echo "  TANKR LOGIC AUDIT — Property-Based Invariant Fuzzing"
echo "=========================================================="

npx jest qa/logic-tests/property_based_fuzzing.test.ts --verbose
