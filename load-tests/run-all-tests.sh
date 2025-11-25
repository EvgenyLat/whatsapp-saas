#!/bin/bash

# =============================================================================
# RUN ALL LOAD TESTS
# =============================================================================
# Runs the complete load testing suite and generates comparison reports
# Usage: ./run-all-tests.sh [--quick]
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
RESULTS_DIR="./results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RUN_DIR="$RESULTS_DIR/run_$TIMESTAMP"

# Quick mode (shorter tests)
QUICK_MODE=false
if [[ "$1" == "--quick" ]]; then
  QUICK_MODE=true
  echo -e "${YELLOW}⚡ Quick mode enabled - tests will run faster with reduced duration${NC}"
fi

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

print_header() {
  echo ""
  echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
  echo ""
}

print_test_start() {
  echo ""
  echo -e "${GREEN}▶ Starting: $1${NC}"
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_test_complete() {
  echo -e "${GREEN}✓ Completed: $1${NC}"
  echo ""
}

print_error() {
  echo -e "${RED}✗ Error: $1${NC}"
}

check_k6_installed() {
  if ! command -v k6 &> /dev/null; then
    print_error "k6 is not installed"
    echo "Install k6: https://k6.io/docs/getting-started/installation/"
    exit 1
  fi
}

check_backend_running() {
  local base_url="${BASE_URL:-http://localhost:4000}"

  echo "Checking backend at: $base_url"

  if ! curl -s -f "$base_url/healthz" > /dev/null; then
    print_error "Backend is not running at $base_url"
    echo "Please start your backend server before running load tests"
    exit 1
  fi

  echo -e "${GREEN}✓ Backend is running${NC}"
}

setup_results_dir() {
  mkdir -p "$RUN_DIR"
  echo -e "${GREEN}✓ Results directory: $RUN_DIR${NC}"
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================

print_header "LOAD TESTING SUITE"

echo "🔧 Configuration:"
echo "  Base URL: ${BASE_URL:-http://localhost:4000}"
echo "  Admin Token: ${ADMIN_TOKEN:-<not set>}"
echo "  Test Salon ID: ${TEST_SALON_ID:-<not set>}"
echo "  Quick Mode: $QUICK_MODE"
echo ""

# Pre-flight checks
check_k6_installed
check_backend_running
setup_results_dir

# Export environment variables for k6
export BASE_URL="${BASE_URL:-http://localhost:4000}"
export ADMIN_TOKEN="${ADMIN_TOKEN:-your-admin-token-here}"
export TEST_SALON_ID="${TEST_SALON_ID:-test-salon-123}"
export WHATSAPP_VERIFY_TOKEN="${WHATSAPP_VERIFY_TOKEN:-your-verify-token}"
export PHONE_NUMBER_ID="${PHONE_NUMBER_ID:-1234567890}"

# =============================================================================
# TEST 1: API LOAD TEST
# =============================================================================

print_test_start "API Load Test (General API endpoints)"

if $QUICK_MODE; then
  # Quick mode: 2 minutes instead of 10
  K6_OPTIONS="--stage 30s:10,30s:25,30s:10,30s:0"
else
  K6_OPTIONS=""
fi

k6 run $K6_OPTIONS \
  --out json="$RUN_DIR/api-test-raw.json" \
  scripts/api-test.js

print_test_complete "API Load Test"

# =============================================================================
# TEST 2: DATABASE LOAD TEST
# =============================================================================

print_test_start "Database Load Test (Query performance)"

if $QUICK_MODE; then
  K6_OPTIONS="--stage 20s:25,40s:100,30s:100,30s:0"
else
  K6_OPTIONS=""
fi

k6 run $K6_OPTIONS \
  --out json="$RUN_DIR/database-test-raw.json" \
  scripts/database-test.js

print_test_complete "Database Load Test"

# =============================================================================
# TEST 3: WEBHOOK LOAD TEST
# =============================================================================

print_test_start "Webhook Load Test (WhatsApp message processing)"

if $QUICK_MODE; then
  K6_OPTIONS="--stage 20s:10,1m:50,1m:50,30s:0"
else
  K6_OPTIONS=""
fi

k6 run $K6_OPTIONS \
  --out json="$RUN_DIR/webhook-test-raw.json" \
  scripts/webhook-test.js

print_test_complete "Webhook Load Test"

# =============================================================================
# TEST 4: SPIKE TEST
# =============================================================================

print_test_start "Spike Test (Sudden traffic surge)"

if $QUICK_MODE; then
  K6_OPTIONS="--stage 10s:5,20s:100,40s:100,20s:5,10s:0"
else
  K6_OPTIONS=""
fi

k6 run $K6_OPTIONS \
  --out json="$RUN_DIR/spike-test-raw.json" \
  scripts/spike-test.js

print_test_complete "Spike Test"

# =============================================================================
# TEST 5: SOAK TEST (OPTIONAL - LONG RUNNING)
# =============================================================================

if ! $QUICK_MODE; then
  echo ""
  read -p "Run Soak Test? (1 hour duration) [y/N]: " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_test_start "Soak Test (1 hour stability test)"

    k6 run \
      --out json="$RUN_DIR/soak-test-raw.json" \
      scripts/soak-test.js

    print_test_complete "Soak Test"
  else
    echo -e "${YELLOW}⊘ Skipping Soak Test${NC}"
  fi
else
  echo -e "${YELLOW}⊘ Skipping Soak Test in quick mode${NC}"
fi

# =============================================================================
# TEST 6: STRESS TEST (OPTIONAL)
# =============================================================================

if ! $QUICK_MODE; then
  echo ""
  read -p "Run Stress Test? (Breaking point test - may cause errors) [y/N]: " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_test_start "Stress Test (Finding breaking point)"

    k6 run \
      --out json="$RUN_DIR/stress-test-raw.json" \
      scripts/stress-test.js

    print_test_complete "Stress Test"
  else
    echo -e "${YELLOW}⊘ Skipping Stress Test${NC}"
  fi
else
  echo -e "${YELLOW}⊘ Skipping Stress Test in quick mode${NC}"
fi

# =============================================================================
# GENERATE SUMMARY REPORT
# =============================================================================

print_header "TEST SUMMARY"

echo -e "${GREEN}✓ All tests completed successfully!${NC}"
echo ""
echo "📊 Results saved to: $RUN_DIR"
echo ""
echo "📁 Generated files:"
ls -lh "$RUN_DIR" | tail -n +2

# Generate summary if Node.js is available
if command -v node &> /dev/null; then
  echo ""
  echo "📈 Generating comparison report..."

  if [ -f "tools/analyze-results.js" ]; then
    node tools/analyze-results.js "$RUN_DIR"
  else
    echo -e "${YELLOW}⚠ analyze-results.js not found - skipping analysis${NC}"
  fi
fi

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}All load tests completed!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "Next steps:"
echo "  1. Review HTML reports in: $RUN_DIR"
echo "  2. Compare with previous runs: node tools/compare-runs.js"
echo "  3. Check Grafana dashboards for detailed metrics"
echo ""
