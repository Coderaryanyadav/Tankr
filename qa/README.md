# TANKR — Complete QA, SDLC & Production Readiness Framework

Welcome to the central quality engineering and testing framework for **TANKR**.

---

## 1. Quick Start

Run the entire automated QA suite with a single command:

```bash
# Run all 8 QA stages end-to-end (Preflight, Static, Database, Unit, Integration, Security, Performance, E2E)
./qa/scripts/qa-full.sh
```

Individual stage runners:

```bash
./qa/scripts/qa-preflight.sh     # Environment and dependency verification
./qa/scripts/qa-static.sh        # TypeScript strict check & secret scanning
./qa/scripts/qa-unit.sh          # Pricing engine & Zod contract boundary tests
./qa/scripts/qa-integration.sh   # Booking lifecycle, state machine & payment tests
./qa/scripts/qa-database.sh      # Database migrations and DDL verification
./qa/scripts/qa-security.sh      # Role isolation (RLS) & vertical privilege tests
./qa/scripts/qa-performance.sh   # Concurrency & race condition tests
./qa/scripts/qa-e2e.sh           # 20 Real-World failure & multi-role scenarios
./qa/scripts/qa-cleanup.sh       # Safe cache & temporary artifact cleanup
```

---

## 2. Directory Structure

```text
qa/
├── README.md                      # This guide
├── FEATURE_INVENTORY.md           # 30-feature traceability matrix
├── TEST_PLAN.md                   # Master quality strategy & release gates
├── TEST_MATRIX.md                 # Test case mapping across all layers
├── TEST_DATA_POLICY.md            # Synthetic data rules & safety guardrails
├── ENVIRONMENT.md                 # Test environment configuration
├── BUG_REPORT_TEMPLATE.md         # Standardized bug reporting format
│
├── unit/                          # Unit test suites (Pricing, Zod schemas)
├── integration/                   # Integration suites (Booking, Driver, Payments)
├── security/                      # Security suites (RLS, RBAC, Secret scanning)
├── performance/                   # Concurrency suites (Race conditions, 10-way contention)
├── e2e/                           # End-to-end suites (20 Real-World scenarios)
├── fixtures/                      # Deterministic test fixtures
├── scripts/                       # Executable bash test runners
└── reports/                       # Formal audit reports (00 to 14) + JSON metrics
```

---

## 3. Latest Audit Summary

- **Total Automated Tests:** 84 passed, 0 failed
- **Execution Time:** ~11 seconds
- **TypeScript Errors:** 0 errors
- **P0/P1 Defects Remaining:** 0
- **Pilot Readiness Status:** **APPROVED FOR CONTROLLED PILOT**

