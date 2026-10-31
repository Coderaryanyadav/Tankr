#!/usr/bin/env bash
set -eo pipefail

echo "=========================================================="
echo "  TANKR LOGIC AUDIT — Integration & State Machine Suite"
echo "=========================================================="

npx jest qa/logic-tests/booking_state_machine_logic.test.ts \
         qa/logic-tests/gps_telemetry_logic.test.ts \
         qa/logic-tests/payment_and_refund_logic.test.ts \
         qa/logic-tests/business_invariants.test.ts \
         --verbose
