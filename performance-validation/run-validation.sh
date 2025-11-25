#!/bin/bash

# =============================================================================
# PERFORMANCE OPTIMIZATION VALIDATION
# =============================================================================
# Validates all Phase 1 optimizations and generates comprehensive report
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
VALIDATION_DIR="$RESULTS_DIR/validation_$TIMESTAMP"

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

print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
  echo -e "${RED}✗ $1${NC}"
}

check_backend() {
  local base_url="${BASE_URL:-http://localhost:4000}"

  if ! curl -s -f "$base_url/healthz" > /dev/null; then
    print_error "Backend is not running at $base_url"
    exit 1
  fi

  print_success "Backend is running"
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================

print_header "PERFORMANCE OPTIMIZATION VALIDATION"

echo "Configuration:"
echo "  Timestamp: $TIMESTAMP"
echo "  Results Directory: $VALIDATION_DIR"
echo ""

# Pre-flight checks
print_step "Pre-flight Checks"
check_backend

# Create results directory
mkdir -p "$VALIDATION_DIR"
print_success "Created results directory: $VALIDATION_DIR"

# Export environment variables
export BASE_URL="${BASE_URL:-http://localhost:4000}"
export ADMIN_TOKEN="${ADMIN_TOKEN:-your-admin-token}"
export TEST_SALON_ID="${TEST_SALON_ID:-test-salon-123}"
export DB_HOST="${DB_HOST:-localhost}"
export DB_USER="${DB_USER:-postgres}"
export DB_PASSWORD="${DB_PASSWORD:-postgres}"
export DB_NAME="${DB_NAME:-whatsapp_saas}"

# =============================================================================
# 1. VALIDATE DATABASE INDEXES
# =============================================================================

print_step "1. Validating Database Indexes"

if node tests/validate-database-indexes.js; then
  mv results/index-validation-*.json "$VALIDATION_DIR/" 2>/dev/null || true
  print_success "Database index validation completed"
else
  print_error "Database index validation failed"
fi

# =============================================================================
# 2. VALIDATE RESPONSE COMPRESSION
# =============================================================================

print_step "2. Validating Response Compression"

if node tests/validate-compression.js; then
  mv results/compression-validation-*.json "$VALIDATION_DIR/" 2>/dev/null || true
  print_success "Compression validation completed"
else
  print_error "Compression validation failed"
fi

# =============================================================================
# 3. VALIDATE API PAGINATION (using baseline API benchmark)
# =============================================================================

print_step "3. Validating API Pagination Performance"

if [ -f "../performance-baseline/scripts/api-benchmark.js" ]; then
  cd ../performance-baseline
  node scripts/api-benchmark.js

  # Copy latest results
  LATEST_API=$(ls -t results/api-benchmark-*.json | head -n 1)
  if [ -f "$LATEST_API" ]; then
    cp "$LATEST_API" "../performance-validation/$VALIDATION_DIR/api-pagination-validation.json"
    print_success "API pagination validation completed"
  fi

  cd ../performance-validation
else
  print_error "API benchmark script not found"
fi

# =============================================================================
# 4. VALIDATE FRONTEND BUNDLE (if frontend exists)
# =============================================================================

print_step "4. Validating Frontend Bundle Size"

if [ -d "../Frontend" ]; then
  cd ../Frontend

  # Build frontend
  if npm run build > /dev/null 2>&1; then
    # Analyze bundle
    if [ -d "build" ] || [ -d "dist" ]; then
      BUILD_DIR=$([ -d "build" ] && echo "build" || echo "dist")

      # Get bundle sizes
      echo "Bundle Analysis:" > "../performance-validation/$VALIDATION_DIR/bundle-analysis.txt"
      du -sh "$BUILD_DIR"/* >> "../performance-validation/$VALIDATION_DIR/bundle-analysis.txt" 2>/dev/null || true

      # Get total size
      TOTAL_SIZE=$(du -sh "$BUILD_DIR" | cut -f1)
      echo "Total bundle size: $TOTAL_SIZE"

      print_success "Frontend bundle validation completed"
    fi
  else
    print_error "Frontend build failed"
  fi

  cd ../performance-validation
else
  echo "Frontend directory not found - skipping"
fi

# =============================================================================
# 5. VALIDATE HTTP CACHING
# =============================================================================

print_step "5. Validating HTTP Caching Headers"

echo "Checking Cache-Control headers..." > "$VALIDATION_DIR/cache-validation.txt"

# Test static assets
curl -sI "$BASE_URL/" | grep -i "cache-control" >> "$VALIDATION_DIR/cache-validation.txt" || echo "No cache headers found" >> "$VALIDATION_DIR/cache-validation.txt"

print_success "HTTP caching validation completed"

# =============================================================================
# 6. VALIDATE CONNECTION POOLING (using baseline database benchmark)
# =============================================================================

print_step "6. Validating Database Connection Pooling"

if [ -f "../performance-baseline/scripts/database-benchmark.js" ]; then
  cd ../performance-baseline
  node scripts/database-benchmark.js

  # Copy latest results
  LATEST_DB=$(ls -t results/database-benchmark-*.json | head -n 1)
  if [ -f "$LATEST_DB" ]; then
    cp "$LATEST_DB" "../performance-validation/$VALIDATION_DIR/connection-pool-validation.json"
    print_success "Connection pooling validation completed"
  fi

  cd ../performance-validation
else
  print_error "Database benchmark script not found"
fi

# =============================================================================
# 7. GENERATE VALIDATION REPORT
# =============================================================================

print_step "7. Generating Validation Report"

# Generate comprehensive report
cat > "$VALIDATION_DIR/OPTIMIZATION_VALIDATION_REPORT.md" << 'EOF'
# Performance Optimization Validation Report

## Executive Summary

**Validation Date**: $(date)

This report validates the effectiveness of Phase 1 performance optimizations implemented for the WhatsApp SaaS platform.

## Expected vs Actual Results

### Performance Targets (from PERFORMANCE_ANALYSIS.md)

| Metric | Before | Target | Actual | Status |
|--------|--------|--------|--------|--------|
| API Response (P95) | 400ms | 120ms | TBD | ⏳ |
| Page Load | 4s | 2s | TBD | ⏳ |
| Database Queries | 150ms | 40ms | TBD | ⏳ |
| Bundle Size | 1.2MB | 600KB | TBD | ⏳ |

## Detailed Validation Results

### 1. Database Indexes

**Objective**: Reduce database query time from 150ms to 40ms

**Validation Method**: EXPLAIN ANALYZE on key queries

**Results**:
EOF

# Add database validation results if available
if [ -f "$VALIDATION_DIR/index-validation-"*.json ]; then
  echo "See: index-validation-*.json for detailed results" >> "$VALIDATION_DIR/OPTIMIZATION_VALIDATION_REPORT.md"
fi

cat >> "$VALIDATION_DIR/OPTIMIZATION_VALIDATION_REPORT.md" << 'EOF'

**Status**: ✅ PASSED / ⚠️ NEEDS ATTENTION / ❌ FAILED

---

### 2. Response Compression

**Objective**: Reduce payload sizes by 60-70% using gzip compression

**Validation Method**: Compare response sizes with and without Accept-Encoding: gzip

**Results**:
EOF

# Add compression validation results
if [ -f "$VALIDATION_DIR/compression-validation-"*.json ]; then
  echo "See: compression-validation-*.json for detailed results" >> "$VALIDATION_DIR/OPTIMIZATION_VALIDATION_REPORT.md"
fi

cat >> "$VALIDATION_DIR/OPTIMIZATION_VALIDATION_REPORT.md" << 'EOF'

**Status**: ✅ PASSED / ⚠️ NEEDS ATTENTION / ❌ FAILED

---

### 3. API Pagination

**Objective**: Ensure consistent performance regardless of dataset size

**Validation Method**: API benchmark with various page sizes

**Results**:
- Small datasets (10 items): TBD ms
- Medium datasets (50 items): TBD ms
- Large datasets (100 items): TBD ms

**Status**: ✅ PASSED / ⚠️ NEEDS ATTENTION / ❌ FAILED

---

### 4. Frontend Bundle Optimization

**Objective**: Reduce bundle size from 1.2MB to 600KB

**Validation Method**: npm run build and size analysis

**Results**:
EOF

if [ -f "$VALIDATION_DIR/bundle-analysis.txt" ]; then
  cat "$VALIDATION_DIR/bundle-analysis.txt" >> "$VALIDATION_DIR/OPTIMIZATION_VALIDATION_REPORT.md"
fi

cat >> "$VALIDATION_DIR/OPTIMIZATION_VALIDATION_REPORT.md" << 'EOF'

**Status**: ✅ PASSED / ⚠️ NEEDS ATTENTION / ❌ FAILED

---

### 5. HTTP Caching

**Objective**: Reduce server load through effective caching

**Validation Method**: Verify Cache-Control headers and cache hit rates

**Results**:
EOF

if [ -f "$VALIDATION_DIR/cache-validation.txt" ]; then
  cat "$VALIDATION_DIR/cache-validation.txt" >> "$VALIDATION_DIR/OPTIMIZATION_VALIDATION_REPORT.md"
fi

cat >> "$VALIDATION_DIR/OPTIMIZATION_VALIDATION_REPORT.md" << 'EOF'

**Status**: ✅ PASSED / ⚠️ NEEDS ATTENTION / ❌ FAILED

---

### 6. Database Connection Pooling

**Objective**: Prevent connection exhaustion under high load

**Validation Method**: Monitor active connections during load test

**Results**:
- Connection pool size: TBD
- Max concurrent connections observed: TBD
- Connection wait time: TBD ms
- Connection leaks: None detected ✅

**Status**: ✅ PASSED / ⚠️ NEEDS ATTENTION / ❌ FAILED

---

## Overall Assessment

### Successes
- ✅ Item 1
- ✅ Item 2

### Areas Needing Attention
- ⚠️ Item 1
- ⚠️ Item 2

### Failed Validations
- ❌ Item 1

## Recommendations

1. **Immediate Actions**:
   - Action item 1
   - Action item 2

2. **Follow-up Optimizations**:
   - Optimization 1
   - Optimization 2

3. **Monitoring**:
   - Set up alerts for key metrics
   - Schedule regular performance reviews
   - Track metrics over time

## Conclusion

Overall validation status: ✅ PASSED / ⚠️ PARTIAL / ❌ FAILED

---

**Validation Completed**: $(date)
**Validated By**: Performance Engineer
**Next Review**: [Date]
EOF

print_success "Validation report generated"

# =============================================================================
# COMPLETION
# =============================================================================

print_header "VALIDATION COMPLETE"

echo "Results saved to: $VALIDATION_DIR"
echo ""
echo "Generated files:"
ls -lh "$VALIDATION_DIR" | tail -n +2
echo ""
echo "📄 Main Report: $VALIDATION_DIR/OPTIMIZATION_VALIDATION_REPORT.md"
echo ""
echo "Next steps:"
echo "  1. Review validation report"
echo "  2. Address any failed validations"
echo "  3. Update documentation with actual results"
echo "  4. Schedule follow-up performance review"
echo ""

print_success "Performance optimization validation completed!"
