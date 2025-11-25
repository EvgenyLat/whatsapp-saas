#!/bin/bash

# =============================================================================
# PERFORMANCE BASELINE RUNNER
# =============================================================================
# Runs all performance benchmarks and generates comprehensive report
# Usage: ./run-baseline.sh [--skip-frontend] [--skip-load-test]
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
BASELINE_DIR="$RESULTS_DIR/baseline_$TIMESTAMP"

SKIP_FRONTEND=false
SKIP_LOAD_TEST=false

# Parse arguments
for arg in "$@"; do
  case $arg in
    --skip-frontend)
      SKIP_FRONTEND=true
      shift
      ;;
    --skip-load-test)
      SKIP_LOAD_TEST=true
      shift
      ;;
  esac
done

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

print_step() {
  echo ""
  echo -e "${GREEN}▶ $1${NC}"
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_error() {
  echo -e "${RED}✗ Error: $1${NC}"
}

print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

check_node() {
  if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    exit 1
  fi
  print_success "Node.js is installed"
}

check_backend() {
  local base_url="${BASE_URL:-http://localhost:4000}"

  if ! curl -s -f "$base_url/healthz" > /dev/null; then
    print_error "Backend is not running at $base_url"
    echo "Please start your backend server before running baseline"
    exit 1
  fi

  print_success "Backend is running at $base_url"
}

check_database() {
  if ! command -v psql &> /dev/null; then
    print_error "PostgreSQL client (psql) is not installed"
    return 1
  fi

  # Try to connect
  export PGPASSWORD="${DB_PASSWORD:-postgres}"
  if psql -h "${DB_HOST:-localhost}" -U "${DB_USER:-postgres}" -d "${DB_NAME:-whatsapp_saas}" -c "SELECT 1" > /dev/null 2>&1; then
    print_success "Database is accessible"
    return 0
  else
    print_error "Database is not accessible"
    return 1
  fi
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================

print_header "PERFORMANCE BASELINE"

echo "Configuration:"
echo "  Timestamp: $TIMESTAMP"
echo "  Results Directory: $BASELINE_DIR"
echo "  Skip Frontend: $SKIP_FRONTEND"
echo "  Skip Load Test: $SKIP_LOAD_TEST"
echo ""

# Pre-flight checks
print_step "Pre-flight Checks"
check_node
check_backend

DB_ACCESSIBLE=false
if check_database; then
  DB_ACCESSIBLE=true
fi

# Create results directory
mkdir -p "$BASELINE_DIR"
print_success "Created results directory: $BASELINE_DIR"

# Export environment variables
export BASE_URL="${BASE_URL:-http://localhost:4000}"
export ADMIN_TOKEN="${ADMIN_TOKEN:-your-admin-token}"
export TEST_SALON_ID="${TEST_SALON_ID:-test-salon-123}"

# =============================================================================
# 1. API PERFORMANCE BENCHMARK
# =============================================================================

print_step "1. API Performance Benchmark"

node scripts/api-benchmark.js

# Move results
mv results/api-benchmark-*.json "$BASELINE_DIR/" 2>/dev/null || true

print_success "API benchmark completed"

# =============================================================================
# 2. DATABASE PERFORMANCE BENCHMARK
# =============================================================================

if [ "$DB_ACCESSIBLE" = true ]; then
  print_step "2. Database Performance Benchmark"

  # Install pg if not present
  if ! node -e "require('pg')" 2>/dev/null; then
    echo "Installing pg module..."
    npm install pg
  fi

  node scripts/database-benchmark.js

  # Move results
  mv results/database-benchmark-*.json "$BASELINE_DIR/" 2>/dev/null || true

  print_success "Database benchmark completed"
else
  print_error "Skipping database benchmark (database not accessible)"
fi

# =============================================================================
# 3. FRONTEND PERFORMANCE AUDIT
# =============================================================================

if [ "$SKIP_FRONTEND" = false ]; then
  print_step "3. Frontend Performance Audit"

  # Check if lighthouse is installed
  if command -v lighthouse &> /dev/null; then
    node scripts/frontend-audit.js

    # Move results
    mv results/frontend-audit-*.json "$BASELINE_DIR/" 2>/dev/null || true

    print_success "Frontend audit completed"
  else
    print_error "Lighthouse not installed - skipping frontend audit"
    echo "Install with: npm install -g lighthouse chrome-launcher"
  fi
else
  echo "Skipping frontend audit (--skip-frontend flag)"
fi

# =============================================================================
# 4. SYSTEM RESOURCE MONITORING
# =============================================================================

print_step "4. System Resource Monitoring (60 seconds)"

MONITOR_DURATION=60 node scripts/system-monitor.js &
MONITOR_PID=$!

# Wait for monitor to finish
wait $MONITOR_PID

# Move results
mv results/system-monitor-*.json "$BASELINE_DIR/" 2>/dev/null || true

print_success "System monitoring completed"

# =============================================================================
# 5. LOAD TEST (OPTIONAL)
# =============================================================================

if [ "$SKIP_LOAD_TEST" = false ]; then
  echo ""
  read -p "Run load test? (5 minutes, recommended) [y/N]: " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_step "5. Load Test (Quick Mode)"

    # Check if k6 is installed
    if command -v k6 &> /dev/null; then
      cd ../load-tests
      ./run-all-tests.sh --quick

      # Copy latest results
      LATEST_RUN=$(ls -t results/ | head -n 1)
      if [ -d "results/$LATEST_RUN" ]; then
        cp -r "results/$LATEST_RUN" "../performance-baseline/$BASELINE_DIR/load-test-results"
        print_success "Load test completed"
      fi

      cd ../performance-baseline
    else
      print_error "k6 not installed - skipping load test"
      echo "Install k6: https://k6.io/docs/getting-started/installation/"
    fi
  else
    echo "Skipping load test"
  fi
else
  echo "Skipping load test (--skip-load-test flag)"
fi

# =============================================================================
# 6. GENERATE BASELINE REPORT
# =============================================================================

print_step "6. Generating Baseline Report"

# Check if analysis script exists
if [ -f "analysis/generate-report.js" ]; then
  node analysis/generate-report.js "$BASELINE_DIR"
  print_success "Baseline report generated"
else
  print_error "Report generator not found - creating basic summary"

  # Create basic summary
  cat > "$BASELINE_DIR/SUMMARY.txt" << EOF
PERFORMANCE BASELINE SUMMARY
Generated: $(date)

Baseline Directory: $BASELINE_DIR

Files Generated:
$(ls -lh "$BASELINE_DIR")

To view detailed results, examine the JSON files in this directory.

Next Steps:
1. Review individual benchmark results
2. Identify performance bottlenecks
3. Implement optimizations
4. Re-run baseline to compare improvements
EOF

  print_success "Basic summary created"
fi

# =============================================================================
# COMPLETION
# =============================================================================

print_header "BASELINE COMPLETE"

echo "Results saved to: $BASELINE_DIR"
echo ""
echo "Generated files:"
ls -lh "$BASELINE_DIR" | tail -n +2
echo ""
echo "Next steps:"
echo "  1. Review baseline results"
echo "  2. Identify optimization opportunities"
echo "  3. Implement performance improvements"
echo "  4. Re-run baseline: ./run-baseline.sh"
echo "  5. Compare results: node analysis/compare-baselines.js baseline_OLD baseline_NEW"
echo ""

print_success "Performance baseline established successfully!"
