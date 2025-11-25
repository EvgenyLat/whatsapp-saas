#!/bin/bash

################################################################################
# Backup and Restore Test Script
################################################################################
#
# Description: Comprehensive testing of backup and restore procedures
#
# Usage: ./test-backup-restore.sh [OPTIONS]
#
# Options:
#   --full               Run full test suite
#   --backup-only        Test backup only
#   --restore-only       Test restore only
#   --integrity-only     Test backup integrity only
#   --performance        Measure performance metrics
#
################################################################################

set -euo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
readonly BACKUP_SCRIPT="${SCRIPT_DIR}/backup-database.sh"
readonly RESTORE_SCRIPT="${SCRIPT_DIR}/restore-database.sh"
readonly TEST_DB_NAME="whatsapp_saas_test_$(date +%s)"
readonly TEST_RESULTS_DIR="${SCRIPT_DIR}/../test-results"
readonly TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
readonly TEST_REPORT="${TEST_RESULTS_DIR}/backup_test_report_${TIMESTAMP}.md"

# Test configuration
TEST_MODE="full"
VERBOSE=false

# Test results
declare -A TEST_RESULTS
declare -A TEST_DURATIONS

################################################################################
# UTILITY FUNCTIONS
################################################################################

log_info() {
    echo "[INFO] $*" | tee -a "${TEST_REPORT}"
}

log_success() {
    echo "[✓] $*" | tee -a "${TEST_REPORT}"
}

log_error() {
    echo "[✗] $*" | tee -a "${TEST_REPORT}"
}

log_section() {
    echo "" | tee -a "${TEST_REPORT}"
    echo "============================================" | tee -a "${TEST_REPORT}"
    echo "$*" | tee -a "${TEST_REPORT}"
    echo "============================================" | tee -a "${TEST_REPORT}"
}

record_test_result() {
    local test_name="$1"
    local result="$2"
    local duration="${3:-0}"

    TEST_RESULTS["${test_name}"]="${result}"
    TEST_DURATIONS["${test_name}"]="${duration}"

    if [[ "${result}" == "PASS" ]]; then
        log_success "${test_name}: PASS (${duration}s)"
    else
        log_error "${test_name}: FAIL"
    fi
}

################################################################################
# TEST SETUP FUNCTIONS
################################################################################

setup_test_environment() {
    log_section "Setting Up Test Environment"

    # Create test results directory
    mkdir -p "${TEST_RESULTS_DIR}"

    # Initialize test report
    cat > "${TEST_REPORT}" <<EOF
# Backup and Restore Test Report

**Date:** $(date '+%Y-%m-%d %H:%M:%S')
**Hostname:** $(hostname)
**Test Mode:** ${TEST_MODE}

---

EOF

    log_info "Test environment ready"
    log_info "Test results will be saved to: ${TEST_REPORT}"
}

create_test_database() {
    log_section "Creating Test Database"

    local start_time
    local end_time
    local duration

    start_time=$(date +%s)

    # Create test database
    if psql "${DATABASE_URL}" -c "CREATE DATABASE ${TEST_DB_NAME};" 2>/dev/null; then
        log_success "Test database created: ${TEST_DB_NAME}"
    else
        log_error "Failed to create test database"
        return 1
    fi

    # Populate with test data
    log_info "Populating test database with sample data..."

    local test_db_url
    test_db_url=$(echo "${DATABASE_URL}" | sed "s|/[^/]*$|/${TEST_DB_NAME}|")

    # Create sample schema
    psql "${test_db_url}" <<'SQL'
CREATE TABLE test_salons (
    id UUID PRIMARY KEY,
    name TEXT,
    phone_number_id TEXT UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE test_bookings (
    id UUID PRIMARY KEY,
    salon_id UUID,
    customer_name TEXT,
    service TEXT,
    start_ts TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert test data
INSERT INTO test_salons (id, name, phone_number_id)
SELECT
    gen_random_uuid(),
    'Test Salon ' || generate_series,
    'phone_' || generate_series
FROM generate_series(1, 100);

INSERT INTO test_bookings (id, salon_id, customer_name, service, start_ts)
SELECT
    gen_random_uuid(),
    (SELECT id FROM test_salons ORDER BY random() LIMIT 1),
    'Customer ' || generate_series,
    'Service ' || (generate_series % 10 + 1),
    NOW() + (generate_series || ' hours')::INTERVAL
FROM generate_series(1, 1000);
SQL

    end_time=$(date +%s)
    duration=$((end_time - start_time))

    log_info "Test data populated (${duration}s)"
    log_info "  - 100 salons"
    log_info "  - 1000 bookings"

    echo "${test_db_url}"
}

################################################################################
# BACKUP TESTS
################################################################################

test_backup_creation() {
    log_section "Test 1: Backup Creation"

    local start_time
    local end_time
    local duration
    local backup_file

    start_time=$(date +%s)

    # Run backup
    if backup_file=$("${BACKUP_SCRIPT}" --daily --no-upload 2>&1 | tail -n1); then
        end_time=$(date +%s)
        duration=$((end_time - start_time))

        if [[ -f "${backup_file}" ]]; then
            local backup_size
            backup_size=$(du -h "${backup_file}" | cut -f1)

            log_info "Backup file: ${backup_file}"
            log_info "Backup size: ${backup_size}"
            record_test_result "backup_creation" "PASS" "${duration}"

            echo "${backup_file}"
            return 0
        fi
    fi

    record_test_result "backup_creation" "FAIL" "0"
    return 1
}

test_backup_compression() {
    log_section "Test 2: Backup Compression"

    local backup_file="$1"
    local start_time
    local end_time
    local duration

    start_time=$(date +%s)

    # Test gzip integrity
    if gunzip -t "${backup_file}" 2>/dev/null; then
        end_time=$(date +%s)
        duration=$((end_time - start_time))

        # Calculate compression ratio
        local compressed_size
        local uncompressed_size
        local ratio

        compressed_size=$(stat -c%s "${backup_file}" 2>/dev/null || stat -f%z "${backup_file}")
        uncompressed_size=$(gunzip -l "${backup_file}" | tail -n1 | awk '{print $2}')
        ratio=$(awk "BEGIN {printf \"%.1f\", ${uncompressed_size}/${compressed_size}}")

        log_info "Compressed size: $(numfmt --to=iec-i --suffix=B ${compressed_size})"
        log_info "Uncompressed size: $(numfmt --to=iec-i --suffix=B ${uncompressed_size})"
        log_info "Compression ratio: ${ratio}:1"

        record_test_result "backup_compression" "PASS" "${duration}"
        return 0
    fi

    record_test_result "backup_compression" "FAIL" "0"
    return 1
}

test_backup_integrity() {
    log_section "Test 3: Backup Integrity Verification"

    local backup_file="$1"
    local start_time
    local end_time
    local duration

    start_time=$(date +%s)

    # Use restore script to verify integrity
    if "${RESTORE_SCRIPT}" --verify-only "${backup_file}" > /dev/null 2>&1; then
        end_time=$(date +%s)
        duration=$((end_time - start_time))

        record_test_result "backup_integrity" "PASS" "${duration}"
        return 0
    fi

    record_test_result "backup_integrity" "FAIL" "0"
    return 1
}

test_s3_upload() {
    log_section "Test 4: S3 Upload"

    if [[ -z "${AWS_S3_BACKUP_BUCKET:-}" ]]; then
        log_info "Skipping S3 upload test (AWS_S3_BACKUP_BUCKET not set)"
        record_test_result "s3_upload" "SKIP" "0"
        return 0
    fi

    local start_time
    local end_time
    local duration

    start_time=$(date +%s)

    # Run backup with S3 upload
    if "${BACKUP_SCRIPT}" --daily > /dev/null 2>&1; then
        end_time=$(date +%s)
        duration=$((end_time - start_time))

        record_test_result "s3_upload" "PASS" "${duration}"
        return 0
    fi

    record_test_result "s3_upload" "FAIL" "0"
    return 1
}

################################################################################
# RESTORE TESTS
################################################################################

test_restore_from_backup() {
    log_section "Test 5: Database Restore"

    local backup_file="$1"
    local start_time
    local end_time
    local duration

    start_time=$(date +%s)

    # Restore to test database
    local test_db_url
    test_db_url=$(echo "${DATABASE_URL}" | sed "s|/[^/]*$|/${TEST_DB_NAME}_restored|")

    # Create restore target database
    psql "${DATABASE_URL}" -c "CREATE DATABASE ${TEST_DB_NAME}_restored;" 2>/dev/null || true

    # Perform restore
    export DATABASE_URL="${test_db_url}"
    if "${RESTORE_SCRIPT}" --force "${backup_file}" > /dev/null 2>&1; then
        end_time=$(date +%s)
        duration=$((end_time - start_time))

        record_test_result "database_restore" "PASS" "${duration}"
        echo "${test_db_url}"
        return 0
    fi

    record_test_result "database_restore" "FAIL" "0"
    return 1
}

test_data_integrity_after_restore() {
    log_section "Test 6: Data Integrity After Restore"

    local original_db_url="$1"
    local restored_db_url="$2"
    local start_time
    local end_time
    local duration

    start_time=$(date +%s)

    # Compare row counts
    local original_salons
    local original_bookings
    local restored_salons
    local restored_bookings

    original_salons=$(psql "${original_db_url}" -t -c "SELECT COUNT(*) FROM test_salons;" | xargs)
    original_bookings=$(psql "${original_db_url}" -t -c "SELECT COUNT(*) FROM test_bookings;" | xargs)
    restored_salons=$(psql "${restored_db_url}" -t -c "SELECT COUNT(*) FROM test_salons;" | xargs)
    restored_bookings=$(psql "${restored_db_url}" -t -c "SELECT COUNT(*) FROM test_bookings;" | xargs)

    log_info "Original database:"
    log_info "  - Salons: ${original_salons}"
    log_info "  - Bookings: ${original_bookings}"
    log_info "Restored database:"
    log_info "  - Salons: ${restored_salons}"
    log_info "  - Bookings: ${restored_bookings}"

    end_time=$(date +%s)
    duration=$((end_time - start_time))

    if [[ "${original_salons}" == "${restored_salons}" ]] && \
       [[ "${original_bookings}" == "${restored_bookings}" ]]; then
        record_test_result "data_integrity" "PASS" "${duration}"
        return 0
    fi

    record_test_result "data_integrity" "FAIL" "0"
    return 1
}

################################################################################
# PERFORMANCE TESTS
################################################################################

test_backup_performance() {
    log_section "Test 7: Backup Performance (Multiple Runs)"

    local iterations=3
    local total_duration=0
    local min_duration=999999
    local max_duration=0

    for i in $(seq 1 ${iterations}); do
        log_info "Performance test iteration $i/${iterations}..."

        local start_time
        local end_time
        local duration

        start_time=$(date +%s)

        "${BACKUP_SCRIPT}" --daily --no-upload > /dev/null 2>&1

        end_time=$(date +%s)
        duration=$((end_time - start_time))

        total_duration=$((total_duration + duration))

        if [[ ${duration} -lt ${min_duration} ]]; then
            min_duration=${duration}
        fi

        if [[ ${duration} -gt ${max_duration} ]]; then
            max_duration=${duration}
        fi
    done

    local avg_duration=$((total_duration / iterations))

    log_info "Performance results:"
    log_info "  - Min: ${min_duration}s"
    log_info "  - Max: ${max_duration}s"
    log_info "  - Avg: ${avg_duration}s"

    record_test_result "backup_performance" "PASS" "${avg_duration}"
}

################################################################################
# CLEANUP FUNCTIONS
################################################################################

cleanup_test_databases() {
    log_section "Cleaning Up Test Databases"

    psql "${DATABASE_URL}" -c "DROP DATABASE IF EXISTS ${TEST_DB_NAME};" 2>/dev/null || true
    psql "${DATABASE_URL}" -c "DROP DATABASE IF EXISTS ${TEST_DB_NAME}_restored;" 2>/dev/null || true

    log_info "Test databases cleaned up"
}

cleanup_test_backups() {
    log_section "Cleaning Up Test Backups"

    # Remove test backup files
    find "${LOCAL_BACKUP_DIR:-/var/backups/whatsapp-saas}" -name "*test*.dump.gz" -delete 2>/dev/null || true

    log_info "Test backups cleaned up"
}

################################################################################
# REPORT GENERATION
################################################################################

generate_test_report() {
    log_section "Test Summary"

    local total_tests=0
    local passed_tests=0
    local failed_tests=0
    local skipped_tests=0

    # Count results
    for test_name in "${!TEST_RESULTS[@]}"; do
        ((total_tests++))

        case "${TEST_RESULTS[${test_name}]}" in
            PASS)
                ((passed_tests++))
                ;;
            FAIL)
                ((failed_tests++))
                ;;
            SKIP)
                ((skipped_tests++))
                ;;
        esac
    done

    # Print summary
    cat >> "${TEST_REPORT}" <<EOF

## Summary

- **Total Tests:** ${total_tests}
- **Passed:** ${passed_tests}
- **Failed:** ${failed_tests}
- **Skipped:** ${skipped_tests}

## Test Results

| Test Name | Result | Duration |
|-----------|--------|----------|
EOF

    for test_name in "${!TEST_RESULTS[@]}"; do
        local result="${TEST_RESULTS[${test_name}]}"
        local duration="${TEST_DURATIONS[${test_name}]}"
        echo "| ${test_name} | ${result} | ${duration}s |" >> "${TEST_REPORT}"
    done

    cat >> "${TEST_REPORT}" <<EOF

## Recommendations

EOF

    if [[ ${failed_tests} -eq 0 ]]; then
        cat >> "${TEST_REPORT}" <<EOF
✅ **All tests passed!** Backup and restore procedures are working correctly.

Recommended actions:
1. Schedule regular automated backups
2. Perform monthly restore tests
3. Monitor backup metrics in CloudWatch
4. Review backup retention policies
EOF
    else
        cat >> "${TEST_REPORT}" <<EOF
⚠️ **Some tests failed.** Please review the failures above and fix issues before deploying to production.

Required actions:
1. Review failed test logs
2. Fix configuration issues
3. Re-run tests until all pass
4. Do not proceed with production deployment
EOF
    fi

    log_info ""
    log_info "Test report saved to: ${TEST_REPORT}"
    log_info ""
    log_info "Summary: ${passed_tests}/${total_tests} tests passed"

    if [[ ${failed_tests} -gt 0 ]]; then
        exit 1
    fi
}

################################################################################
# MAIN FUNCTION
################################################################################

usage() {
    cat <<EOF
Usage: $0 [OPTIONS]

Options:
  --full               Run full test suite (default)
  --backup-only        Test backup functionality only
  --restore-only       Test restore functionality only
  --integrity-only     Test backup integrity only
  --performance        Run performance benchmarks
  --verbose            Verbose output

Examples:
  # Run full test suite
  $0 --full

  # Test backup only
  $0 --backup-only

  # Performance benchmark
  $0 --performance
EOF
}

main() {
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --full)
                TEST_MODE="full"
                shift
                ;;
            --backup-only)
                TEST_MODE="backup"
                shift
                ;;
            --restore-only)
                TEST_MODE="restore"
                shift
                ;;
            --integrity-only)
                TEST_MODE="integrity"
                shift
                ;;
            --performance)
                TEST_MODE="performance"
                shift
                ;;
            --verbose)
                VERBOSE=true
                shift
                ;;
            --help|-h)
                usage
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                usage
                exit 1
                ;;
        esac
    done

    # Setup
    setup_test_environment

    # Create test database
    local test_db_url
    test_db_url=$(create_test_database)

    # Export test database URL
    export DATABASE_URL="${test_db_url}"

    # Run tests based on mode
    case "${TEST_MODE}" in
        full)
            local backup_file
            backup_file=$(test_backup_creation)
            test_backup_compression "${backup_file}"
            test_backup_integrity "${backup_file}"
            test_s3_upload

            local restored_db_url
            restored_db_url=$(test_restore_from_backup "${backup_file}")
            test_data_integrity_after_restore "${test_db_url}" "${restored_db_url}"
            ;;
        backup)
            local backup_file
            backup_file=$(test_backup_creation)
            test_backup_compression "${backup_file}"
            test_backup_integrity "${backup_file}"
            ;;
        restore)
            local backup_file
            backup_file=$(test_backup_creation)
            local restored_db_url
            restored_db_url=$(test_restore_from_backup "${backup_file}")
            test_data_integrity_after_restore "${test_db_url}" "${restored_db_url}"
            ;;
        integrity)
            local backup_file
            backup_file=$(test_backup_creation)
            test_backup_integrity "${backup_file}"
            ;;
        performance)
            test_backup_performance
            ;;
    esac

    # Cleanup
    cleanup_test_databases
    cleanup_test_backups

    # Generate report
    generate_test_report
}

main "$@"
