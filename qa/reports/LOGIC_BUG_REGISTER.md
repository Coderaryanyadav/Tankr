# TANKR — Business Logic Bug Register

| Bug ID | Severity | Module | Description | Root Cause | Remediated In | Verification Test |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **BUG-LOGIC-01** | High | Location Store | Null Island `(0, 0)` accepted as delivery coordinate | Missing guard in `setActiveLocation` | `src/stores/locationStore.ts` | `qa/logic-tests/customer_and_address_logic.test.ts` |
| **BUG-LOGIC-02** | High | State Machine | Terminal state permitted self-transition | `if (from === to) return true` executed prior to terminal check | `src/services/stateMachineService.ts` | `qa/logic-tests/booking_state_machine_logic.test.ts` |
| **BUG-LOGIC-03** | Medium | Discovery | Mock fleet objects lacked complete schema properties | Strict Zod validation caught missing driver fields | `qa/logic-tests/discovery_and_matching_logic.test.ts` | `qa/logic-tests/discovery_and_matching_logic.test.ts` |
| **BUG-LOGIC-04** | Critical | Tracking UI | Live tracking displayed active tanker when status was `pending` | Frontend simulation timer ran unconditionally | `src/features/tracking/screens/LiveTrackingScreen.tsx` | `qa/e2e/full-lifecycle/real_world_scenarios.test.ts` |
| **BUG-LOGIC-05** | High | Booking Action | Cancellation button did not execute on web platform | React Native `Alert.alert` has no web DOM implementation | `src/utils/alertUtils.ts` | `qa/regression/adversarial_audit_regressions.test.ts` |
| **BUG-LOGIC-06** | Medium | Pricing | Potential fractional paisa rounding discrepancies | Floating point math without 2-decimal truncation | `src/services/pricingService.ts` | `qa/logic-tests/pricing_and_financial_logic.test.ts` |
| **BUG-LOGIC-07** | High | Community Pool | Uncapped concurrent pledges exceeding pool capacity | Lack of atomic lock and clamp to remaining needed amount | `qa/logic-tests/concurrency_and_race_logic.test.ts` | `qa/logic-tests/concurrency_and_race_logic.test.ts` |
| **BUG-LOGIC-08** | Medium | Profile View | Customer unable to edit sump address and name | Profile screen was read-only with no edit modal | `src/features/profile/components/EditProfileModal.tsx` | `src/stores/authStore.ts` |
