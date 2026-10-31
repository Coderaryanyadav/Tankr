#!/usr/bin/env bash
set -eo pipefail

echo "=========================================================="
echo "  TANKR LOGIC AUDIT — Unit & Business Rules Logic Suite"
echo "=========================================================="

npx jest qa/logic-tests/pricing_and_financial_logic.test.ts \
         qa/logic-tests/customer_and_address_logic.test.ts \
         qa/logic-tests/discovery_and_matching_logic.test.ts \
         qa/logic-tests/supplier_and_driver_logic.test.ts \
         --verbose
