#!/usr/bin/env bash
# ==============================================================================
# TANKR Master QA Orchestration Suite
# Runs preflight, static, unit, integration, database, security, performance, and E2E
# ==============================================================================
set -euo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

START_TIME=$(date +%s)
echo -e "${BLUE}${BOLD}================================================================${NC}"
echo -e "${BLUE}${BOLD}          TANKR — Master QA & Production Audit Suite            ${NC}"
echo -e "${BLUE}${BOLD}================================================================${NC}"
echo ""

# Stage 1: Preflight
echo -e "${BOLD}[Stage 1/8] Preflight Discovery & Environment...${NC}"
./qa/scripts/qa-preflight.sh
echo ""

# Stage 2: Static Analysis
echo -e "${BOLD}[Stage 2/8] Static Analysis, Types & Secret Scanning...${NC}"
./qa/scripts/qa-static.sh
echo ""

# Stage 3: Database Verification
echo -e "${BOLD}[Stage 3/8] Database Schema & Migration Verifier...${NC}"
./qa/scripts/qa-database.sh
echo ""

# Stage 4: Unit Tests
echo -e "${BOLD}[Stage 4/8] Unit Tests (Pricing, Zod Contracts)...${NC}"
./qa/scripts/qa-unit.sh
echo ""

# Stage 5: Integration Tests
echo -e "${BOLD}[Stage 5/8] Integration Tests (Booking Lifecycle, Payments)...${NC}"
./qa/scripts/qa-integration.sh
echo ""

# Stage 6: Security & RLS
echo -e "${BOLD}[Stage 6/8] Security, Authorization & Tenant Isolation...${NC}"
./qa/scripts/qa-security.sh
echo ""

# Stage 7: Performance & Concurrency
echo -e "${BOLD}[Stage 7/8] Performance, Concurrency & Race Conditions...${NC}"
./qa/scripts/qa-performance.sh
echo ""

# Stage 8: Real-World Scenarios
echo -e "${BOLD}[Stage 8/8] Real-World Multi-Role Scenarios (1 to 20)...${NC}"
./qa/scripts/qa-e2e.sh
echo ""

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo -e "${GREEN}${BOLD}================================================================${NC}"
echo -e "${GREEN}${BOLD}       ALL 8 QA STAGES PASSED SUCCESSFULLY IN ${DURATION}s              ${NC}"
echo -e "${GREEN}${BOLD}================================================================${NC}"

