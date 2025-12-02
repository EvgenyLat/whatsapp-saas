#!/bin/bash

##############################################################################
# Smoke Tests Script
#
# Runs smoke tests against a deployed environment to verify basic functionality
# after deployment. Tests critical endpoints and functionality.
#
# Usage:
#   ./scripts/smoke-tests.sh <base-url>
#
# Example:
#   ./scripts/smoke-tests.sh https://staging.example.com
#   ./scripts/smoke-tests.sh https://api.example.com
#
##############################################################################

set -e  # Exit on error
set -u  # Exit on undefined variable
set -o pipefail  # Exit on pipe failure

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${1:-}"
ADMIN_TOKEN="${ADMIN_TOKEN:-}"
TIMEOUT=10
MAX_RETRIES=3

# Test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
WARNINGS=0

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
    ((WARNINGS++))
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

log_test() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

# Test result tracking
test_passed() {
    ((TOTAL_TESTS++))
    ((PASSED_TESTS++))
    log_success "$1"
}

test_failed() {
    ((TOTAL_TESTS++))
    ((FAILED_TESTS++))
    log_error "$1"
}

# HTTP request helper
http_get() {
    local url="$1"
    local expected_status="${2:-200}"
    local headers="${3:-}"

    local curl_cmd="curl -s -o /tmp/smoke-response.txt -w '%{http_code}' --max-time $TIMEOUT"

    if [ -n "$headers" ]; then
        curl_cmd="$curl_cmd -H '$headers'"
    fi

    local status_code=$(eval "$curl_cmd '$url'")

    if [ "$status_code" -eq "$expected_status" ]; then
        return 0
    else
        log_warning "Expected status $expected_status, got $status_code"
        return 1
    fi
}

# Main function
main() {
    # Validate inputs
    if [ -z "$BASE_URL" ]; then
        echo "Usage: $0 <base-url>"
        echo "Example: $0 https://staging.example.com"
        exit 1
    fi

    # Remove trailing slash
    BASE_URL="${BASE_URL%/}"

    log_info "Starting smoke tests..."
    log_info "Target: $BASE_URL"
    log_info "Timeout: ${TIMEOUT}s per request"
    echo ""

    # Run all test suites
    test_basic_connectivity
    test_health_endpoints
    test_api_endpoints
    test_security
    test_performance

    # Print summary
    print_summary

    # Exit with appropriate code
    if [ "$FAILED_TESTS" -gt 0 ]; then
        exit 1
    else
        exit 0
    fi
}

# Test Suite 1: Basic Connectivity
test_basic_connectivity() {
    log_test "Testing basic connectivity..."

    # Test 1: DNS resolution
    log_info "Checking DNS resolution..."
    local hostname=$(echo "$BASE_URL" | sed -E 's|^https?://||' | cut -d'/' -f1)

    if nslookup "$hostname" > /dev/null 2>&1; then
        test_passed "DNS resolution successful for $hostname"
    else
        test_failed "DNS resolution failed for $hostname"
        return 1
    fi

    # Test 2: TCP connectivity
    log_info "Checking TCP connectivity..."
    local port=443
    if echo "$BASE_URL" | grep -q "^http://"; then
        port=80
    fi

    if timeout 5 bash -c "echo > /dev/tcp/$hostname/$port" 2>/dev/null; then
        test_passed "TCP connection successful to $hostname:$port"
    else
        test_failed "TCP connection failed to $hostname:$port"
        return 1
    fi

    # Test 3: HTTPS certificate (if HTTPS)
    if echo "$BASE_URL" | grep -q "^https://"; then
        log_info "Checking SSL certificate..."
        if curl -s --max-time 5 --head "$BASE_URL" > /dev/null 2>&1; then
            test_passed "SSL certificate valid"
        else
            test_warning "SSL certificate check failed (may be self-signed)"
        fi
    fi

    echo ""
}

# Test Suite 2: Health Endpoints
test_health_endpoints() {
    log_test "Testing health endpoints..."

    # Test 1: Main health endpoint
    log_info "GET /api/v1/health"
    if http_get "$BASE_URL/api/v1/health" 200; then
        local response=$(cat /tmp/smoke-response.txt)

        # Check if response is JSON
        if echo "$response" | jq . > /dev/null 2>&1; then
            test_passed "Health endpoint returned valid JSON"

            # Check for expected fields
            local status=$(echo "$response" | jq -r '.status // empty')
            if [ "$status" = "ok" ] || [ "$status" = "healthy" ]; then
                test_passed "Health status is OK"
            else
                test_warning "Health status is not OK: $status"
            fi
        else
            test_warning "Health endpoint did not return JSON"
        fi
    else
        test_failed "Health endpoint check failed"
    fi

    # Test 2 removed - main health endpoint at /api/v1/health is the only one

    echo ""
}

# Test Suite 3: API Endpoints
test_api_endpoints() {
    log_test "Testing API endpoints..."

    # Test 1: Webhook endpoint (should require verification)
    log_info "GET /webhook"
    if http_get "$BASE_URL/webhook" 400; then
        test_passed "Webhook endpoint responds to invalid requests with 400"
    elif http_get "$BASE_URL/webhook" 403; then
        test_passed "Webhook endpoint responds to invalid requests with 403"
    else
        test_warning "Webhook endpoint unexpected response"
    fi

    # Test 2: Admin endpoints (without auth should fail)
    log_info "GET /admin/health (no auth)"
    if http_get "$BASE_URL/admin/health" 401; then
        test_passed "Admin endpoints properly require authentication"
    elif http_get "$BASE_URL/admin/health" 403; then
        test_passed "Admin endpoints properly require authentication"
    else
        test_warning "Admin endpoints may not require authentication (security issue!)"
    fi

    # Test 3: Admin endpoints (with auth - if token provided)
    if [ -n "$ADMIN_TOKEN" ]; then
        log_info "GET /admin/health (with auth)"
        if http_get "$BASE_URL/admin/health" 200 "x-admin-token: $ADMIN_TOKEN"; then
            test_passed "Admin authentication successful"
        else
            test_failed "Admin authentication failed"
        fi
    fi

    # Test 4: Non-existent endpoint (should 404)
    log_info "GET /nonexistent"
    if http_get "$BASE_URL/nonexistent" 404; then
        test_passed "Non-existent routes return 404"
    else
        test_warning "Non-existent routes do not return 404"
    fi

    echo ""
}

# Test Suite 4: Security
test_security() {
    log_test "Testing security headers and configurations..."

    # Test 1: Security headers
    log_info "Checking security headers..."
    local headers=$(curl -s -I --max-time 5 "$BASE_URL/api/v1/health" 2>/dev/null)

    # Check for important security headers
    if echo "$headers" | grep -qi "x-frame-options"; then
        test_passed "X-Frame-Options header present"
    else
        test_warning "X-Frame-Options header missing (clickjacking protection)"
    fi

    if echo "$headers" | grep -qi "x-content-type-options"; then
        test_passed "X-Content-Type-Options header present"
    else
        test_warning "X-Content-Type-Options header missing"
    fi

    if echo "$headers" | grep -qi "strict-transport-security"; then
        test_passed "Strict-Transport-Security header present (HSTS)"
    else
        test_warning "HSTS header missing (recommended for HTTPS)"
    fi

    # Test 2: CORS configuration
    log_info "Checking CORS configuration..."
    local cors_response=$(curl -s -I --max-time 5 \
        -H "Origin: https://malicious-site.com" \
        "$BASE_URL/api/v1/health" 2>/dev/null)

    if echo "$cors_response" | grep -qi "access-control-allow-origin: \*"; then
        test_warning "CORS allows all origins (may be intentional for public API)"
    elif echo "$cors_response" | grep -qi "access-control-allow-origin"; then
        test_passed "CORS configured with restrictions"
    else
        test_passed "CORS not allowing arbitrary origins"
    fi

    # Test 3: Rate limiting (if implemented)
    log_info "Checking for rate limiting..."
    local rate_limit_detected=false

    for i in {1..50}; do
        local status=$(curl -s -o /dev/null -w '%{http_code}' --max-time 1 "$BASE_URL/api/v1/health" 2>/dev/null || echo "000")
        if [ "$status" = "429" ]; then
            rate_limit_detected=true
            break
        fi
    done

    if [ "$rate_limit_detected" = true ]; then
        test_passed "Rate limiting is active"
    else
        test_warning "No rate limiting detected (may not be implemented yet)"
    fi

    echo ""
}

# Test Suite 5: Performance
test_performance() {
    log_test "Testing basic performance..."

    # Test 1: Response time
    log_info "Measuring response time for /api/v1/health..."

    local total_time=0
    local requests=5

    for i in $(seq 1 $requests); do
        local time=$(curl -s -o /dev/null -w '%{time_total}' --max-time $TIMEOUT "$BASE_URL/api/v1/health" 2>/dev/null || echo "10.0")
        total_time=$(echo "$total_time + $time" | bc)
    done

    local avg_time=$(echo "scale=3; $total_time / $requests" | bc)
    local avg_time_ms=$(echo "$avg_time * 1000 / 1" | bc)

    log_info "Average response time: ${avg_time_ms}ms (${requests} requests)"

    if (( $(echo "$avg_time < 0.5" | bc -l) )); then
        test_passed "Response time excellent (< 500ms)"
    elif (( $(echo "$avg_time < 1.0" | bc -l) )); then
        test_passed "Response time good (< 1s)"
    elif (( $(echo "$avg_time < 2.0" | bc -l) )); then
        test_warning "Response time acceptable but could be improved (< 2s)"
    else
        test_failed "Response time too slow (> 2s)"
    fi

    # Test 2: Concurrent requests
    log_info "Testing concurrent request handling..."

    local concurrent=10
    local start_time=$(date +%s.%N)

    for i in $(seq 1 $concurrent); do
        curl -s -o /dev/null --max-time $TIMEOUT "$BASE_URL/api/v1/health" 2>/dev/null &
    done

    wait

    local end_time=$(date +%s.%N)
    local duration=$(echo "$end_time - $start_time" | bc)
    local duration_ms=$(echo "$duration * 1000 / 1" | bc)

    log_info "Handled $concurrent concurrent requests in ${duration_ms}ms"

    if (( $(echo "$duration < 2.0" | bc -l) )); then
        test_passed "Concurrent request handling is good"
    else
        test_warning "Concurrent request handling could be improved"
    fi

    echo ""
}

# Print test summary
print_summary() {
    echo ""
    echo "=========================================="
    echo "Smoke Test Summary"
    echo "=========================================="
    echo ""
    echo "Target:    $BASE_URL"
    echo "Total:     $TOTAL_TESTS tests"
    echo -e "Passed:    ${GREEN}$PASSED_TESTS${NC}"
    echo -e "Failed:    ${RED}$FAILED_TESTS${NC}"
    echo -e "Warnings:  ${YELLOW}$WARNINGS${NC}"
    echo ""

    if [ "$FAILED_TESTS" -eq 0 ]; then
        echo -e "${GREEN}✓ All critical tests passed${NC}"
        if [ "$WARNINGS" -gt 0 ]; then
            echo -e "${YELLOW}! $WARNINGS warnings - review recommended${NC}"
        fi
    else
        echo -e "${RED}✗ $FAILED_TESTS tests failed${NC}"
        echo -e "${RED}Deployment verification failed!${NC}"
    fi

    echo ""
    echo "=========================================="

    # Save results to JSON file
    save_results_json
}

# Save results to JSON file
save_results_json() {
    local results_file="smoke-test-results.json"

    cat > "$results_file" <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "target": "$BASE_URL",
  "summary": {
    "total": $TOTAL_TESTS,
    "passed": $PASSED_TESTS,
    "failed": $FAILED_TESTS,
    "warnings": $WARNINGS
  },
  "success": $([ "$FAILED_TESTS" -eq 0 ] && echo "true" || echo "false")
}
EOF

    log_info "Results saved to: $results_file"
}

# Cleanup
cleanup() {
    rm -f /tmp/smoke-response.txt
}

trap cleanup EXIT

# Run main function
main

exit 0
