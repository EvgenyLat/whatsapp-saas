#!/bin/bash

################################################################################
# Database Restore Script for WhatsApp SaaS
################################################################################
#
# Description: Restore PostgreSQL database from S3 backups with integrity
#              verification and safety checks
#
# Usage:
#   ./restore-database.sh [OPTIONS] <backup-file>
#
# Options:
#   --from-s3 <s3-path>   Restore from specific S3 path
#   --list-backups        List available backups
#   --latest              Restore from latest backup
#   --dry-run             Simulate restore without making changes
#   --verify-only         Only verify backup integrity
#   --force               Skip confirmation prompts (dangerous!)
#   --target-db <name>    Restore to specific database
#   --verbose             Verbose output
#
# Examples:
#   # List available backups
#   ./restore-database.sh --list-backups
#
#   # Restore latest backup (with confirmation)
#   ./restore-database.sh --latest
#
#   # Restore specific backup from S3
#   ./restore-database.sh --from-s3 s3://bucket/path/backup.dump.gz
#
#   # Dry run (test without restoring)
#   ./restore-database.sh --latest --dry-run
#
# Exit Codes:
#   0   Success
#   1   General error
#   2   Database connection failed
#   3   Backup download failed
#   4   Backup verification failed
#   5   Restore failed
#   6   User cancelled operation
#
################################################################################

set -euo pipefail

################################################################################
# CONFIGURATION
################################################################################

readonly SCRIPT_NAME="$(basename "$0")"
readonly SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
readonly TIMESTAMP="$(date +%Y%m%d_%H%M%S)"

# Restore configuration
readonly LOCAL_BACKUP_DIR="${BACKUP_DIR:-/var/backups/whatsapp-saas}"
readonly RESTORE_TEMP_DIR="${RESTORE_TEMP_DIR:-/tmp/whatsapp-restore}"
readonly LOG_FILE="${LOG_FILE:-/var/log/restores.log}"

# S3 configuration
readonly S3_BUCKET="${AWS_S3_BACKUP_BUCKET:-}"
readonly S3_PREFIX="database-backups"

# Database configuration
readonly DATABASE_URL="${DATABASE_URL:-}"
readonly PGRESTORE_OPTIONS="--verbose --clean --no-owner --no-acl"

# Feature flags
DRY_RUN=false
VERBOSE=false
FORCE=false
VERIFY_ONLY=false
LIST_BACKUPS=false
USE_LATEST=false
BACKUP_FILE=""
S3_PATH=""
TARGET_DB=""

################################################################################
# UTILITY FUNCTIONS
################################################################################

log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp
    timestamp="$(date '+%Y-%m-%d %H:%M:%S')"

    echo "[${timestamp}] [${level}] ${message}" | tee -a "${LOG_FILE}"
}

log_info() {
    log "INFO" "$@"
}

log_warn() {
    log "WARN" "$@"
}

log_error() {
    log "ERROR" "$@"
}

log_debug() {
    if [[ "${VERBOSE}" == "true" ]]; then
        log "DEBUG" "$@"
    fi
}

error_exit() {
    local message="$1"
    local exit_code="${2:-1}"

    log_error "${message}"
    cleanup_temp_files
    exit "${exit_code}"
}

# Cleanup temporary files
cleanup_temp_files() {
    if [[ -d "${RESTORE_TEMP_DIR}" ]]; then
        log_debug "Cleaning up temporary files..."
        rm -rf "${RESTORE_TEMP_DIR}" 2>/dev/null || true
    fi
}

# Check prerequisites
check_prerequisites() {
    local missing_commands=()

    for cmd in pg_restore psql aws gunzip; do
        if ! command -v "${cmd}" &> /dev/null; then
            missing_commands+=("${cmd}")
        fi
    done

    if [[ ${#missing_commands[@]} -gt 0 ]]; then
        error_exit "Missing required commands: ${missing_commands[*]}" 1
    fi
}

# Validate environment
validate_environment() {
    log_info "Validating environment..."

    if [[ -z "${DATABASE_URL}" ]]; then
        error_exit "DATABASE_URL environment variable is not set" 1
    fi

    # Create necessary directories
    mkdir -p "${LOCAL_BACKUP_DIR}" "${RESTORE_TEMP_DIR}" "$(dirname "${LOG_FILE}")" 2>/dev/null || true

    log_info "Environment validation complete"
}

# Test database connection
test_database_connection() {
    log_info "Testing database connection..."

    if ! pg_isready -d "${DATABASE_URL}" &> /dev/null; then
        error_exit "Cannot connect to database" 2
    fi

    log_info "Database connection successful"
}

################################################################################
# BACKUP LISTING FUNCTIONS
################################################################################

# List local backups
list_local_backups() {
    log_info "Local backups in ${LOCAL_BACKUP_DIR}:"
    echo ""
    echo "TYPE       DATE          SIZE      FILENAME"
    echo "-----------------------------------------------------------"

    find "${LOCAL_BACKUP_DIR}" -name "*.dump.gz" -type f 2>/dev/null | sort -r | while read -r file; do
        local filename
        local size
        local date
        local type

        filename=$(basename "${file}")
        size=$(du -h "${file}" | cut -f1)
        date=$(stat -c%y "${file}" 2>/dev/null | cut -d' ' -f1 || stat -f%Sm -t%Y-%m-%d "${file}" 2>/dev/null)

        if [[ "${filename}" == daily_* ]]; then
            type="daily"
        elif [[ "${filename}" == weekly_* ]]; then
            type="weekly"
        elif [[ "${filename}" == monthly_* ]]; then
            type="monthly"
        else
            type="unknown"
        fi

        printf "%-10s %-12s %-9s %s\n" "${type}" "${date}" "${size}" "${filename}"
    done

    echo ""
}

# List S3 backups
list_s3_backups() {
    if [[ -z "${S3_BUCKET}" ]]; then
        log_warn "AWS_S3_BACKUP_BUCKET not set, skipping S3 listing"
        return 0
    fi

    log_info "S3 backups in s3://${S3_BUCKET}/${S3_PREFIX}/:"
    echo ""
    echo "TYPE       DATE          SIZE      FILENAME"
    echo "-----------------------------------------------------------"

    for backup_type in daily weekly monthly; do
        aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}/${backup_type}/" 2>/dev/null | \
        grep "\.dump\.gz$" | sort -r | while read -r line; do
            local date
            local size
            local filename

            date=$(echo "${line}" | awk '{print $1}')
            size=$(echo "${line}" | awk '{print $3}')
            filename=$(echo "${line}" | awk '{print $4}')

            # Convert size to human-readable format
            if [[ ${size} -gt 1073741824 ]]; then
                size=$(awk "BEGIN {printf \"%.1fG\", ${size}/1073741824}")
            elif [[ ${size} -gt 1048576 ]]; then
                size=$(awk "BEGIN {printf \"%.1fM\", ${size}/1048576}")
            elif [[ ${size} -gt 1024 ]]; then
                size=$(awk "BEGIN {printf \"%.1fK\", ${size}/1024}")
            else
                size="${size}B"
            fi

            printf "%-10s %-12s %-9s %s\n" "${backup_type}" "${date}" "${size}" "${filename}"
        done
    done

    echo ""
}

# Get latest backup
get_latest_backup() {
    local latest_local
    local latest_s3

    # Check local backups
    latest_local=$(find "${LOCAL_BACKUP_DIR}" -name "*.dump.gz" -type f 2>/dev/null | sort -r | head -n1)

    # Check S3 backups
    if [[ -n "${S3_BUCKET}" ]]; then
        latest_s3=$(aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}/" --recursive 2>/dev/null | \
                    grep "\.dump\.gz$" | sort -k1,2 -r | head -n1 | awk '{print $4}')

        if [[ -n "${latest_s3}" ]]; then
            echo "s3://${S3_BUCKET}/${latest_s3}"
            return 0
        fi
    fi

    if [[ -n "${latest_local}" ]]; then
        echo "${latest_local}"
        return 0
    fi

    return 1
}

################################################################################
# BACKUP DOWNLOAD FUNCTIONS
################################################################################

# Download backup from S3
download_from_s3() {
    local s3_path="$1"
    local local_path
    local filename
    local start_time
    local end_time
    local duration

    filename=$(basename "${s3_path}")
    local_path="${RESTORE_TEMP_DIR}/${filename}"

    log_info "Downloading backup from S3..."
    log_info "Source: ${s3_path}"
    log_info "Destination: ${local_path}"

    if [[ "${DRY_RUN}" == "true" ]]; then
        log_info "[DRY RUN] Would download from S3"
        echo "${local_path}"
        return 0
    fi

    start_time=$(date +%s)

    if ! aws s3 cp "${s3_path}" "${local_path}"; then
        error_exit "Failed to download backup from S3" 3
    fi

    # Download metadata if available
    aws s3 cp "${s3_path}.meta" "${local_path}.meta" 2>/dev/null || true

    end_time=$(date +%s)
    duration=$((end_time - start_time))

    log_info "Download complete (${duration} seconds)"

    echo "${local_path}"
}

################################################################################
# BACKUP VERIFICATION FUNCTIONS
################################################################################

# Verify backup integrity
verify_backup_integrity() {
    local backup_path="$1"
    local uncompressed_path
    local test_result

    log_info "Verifying backup integrity..."

    if [[ "${DRY_RUN}" == "true" ]]; then
        log_info "[DRY RUN] Would verify backup integrity"
        return 0
    fi

    # Test gzip integrity
    log_debug "Testing gzip integrity..."
    if ! gunzip -t "${backup_path}" 2>/dev/null; then
        error_exit "Backup file is corrupted (gzip test failed)" 4
    fi

    # Decompress for pg_restore verification
    log_debug "Decompressing backup for verification..."
    uncompressed_path="${RESTORE_TEMP_DIR}/$(basename "${backup_path}" .gz)"

    if ! gunzip -c "${backup_path}" > "${uncompressed_path}"; then
        error_exit "Failed to decompress backup" 4
    fi

    # Verify pg_restore can read the backup
    log_debug "Verifying pg_restore compatibility..."
    if ! pg_restore --list "${uncompressed_path}" > /dev/null 2>&1; then
        rm -f "${uncompressed_path}"
        error_exit "Backup file is not a valid PostgreSQL dump" 4
    fi

    log_info "Backup integrity verified successfully"

    echo "${uncompressed_path}"
}

# Display backup information
display_backup_info() {
    local backup_path="$1"
    local metadata_path="${backup_path}.meta"
    local backup_size
    local backup_date

    backup_size=$(du -h "${backup_path}" | cut -f1)
    backup_date=$(stat -c%y "${backup_path}" 2>/dev/null | cut -d' ' -f1,2 || stat -f%Sm "${backup_path}" 2>/dev/null)

    log_info "============================================"
    log_info "Backup Information:"
    log_info "============================================"
    log_info "File: $(basename "${backup_path}")"
    log_info "Size: ${backup_size}"
    log_info "Date: ${backup_date}"

    if [[ -f "${metadata_path}" ]]; then
        log_info ""
        log_info "Metadata:"
        cat "${metadata_path}" | while IFS= read -r line; do
            log_info "  ${line}"
        done
    fi

    log_info "============================================"
}

################################################################################
# DATABASE RESTORE FUNCTIONS
################################################################################

# Get database name from URL
get_database_name() {
    local db_url="$1"
    local db_name

    # Extract database name from DATABASE_URL
    # Format: postgresql://user:pass@host:port/dbname
    db_name=$(echo "${db_url}" | sed -n 's|.*://[^/]*/\([^?]*\).*|\1|p')

    if [[ -z "${db_name}" ]]; then
        error_exit "Could not extract database name from DATABASE_URL" 1
    fi

    echo "${db_name}"
}

# Create pre-restore snapshot
create_pre_restore_snapshot() {
    local db_name="$1"
    local snapshot_file="${LOCAL_BACKUP_DIR}/pre_restore_${db_name}_${TIMESTAMP}.dump"

    if [[ "${DRY_RUN}" == "true" ]]; then
        log_info "[DRY RUN] Would create pre-restore snapshot"
        return 0
    fi

    log_info "Creating pre-restore snapshot..."
    log_info "Snapshot: ${snapshot_file}"

    if ! pg_dump "${DATABASE_URL}" --format=custom --file="${snapshot_file}"; then
        log_warn "Failed to create pre-restore snapshot (continuing anyway)"
        return 1
    fi

    log_info "Pre-restore snapshot created: ${snapshot_file}"
    echo "${snapshot_file}"
}

# Confirm restore operation
confirm_restore() {
    local backup_file="$1"
    local db_name="$2"

    if [[ "${FORCE}" == "true" ]]; then
        return 0
    fi

    echo ""
    log_warn "=========================================="
    log_warn "WARNING: DATABASE RESTORE OPERATION"
    log_warn "=========================================="
    log_warn "This will REPLACE the current database with backup data!"
    log_warn ""
    log_warn "Target Database: ${db_name}"
    log_warn "Backup File: $(basename "${backup_file}")"
    log_warn ""
    log_warn "Current database will be backed up before restore."
    log_warn "=========================================="
    echo ""

    read -rp "Are you sure you want to continue? (type 'yes' to proceed): " confirm

    if [[ "${confirm}" != "yes" ]]; then
        log_info "Restore cancelled by user"
        exit 6
    fi
}

# Restore database
restore_database() {
    local backup_path="$1"
    local db_name="$2"
    local start_time
    local end_time
    local duration

    log_info "Starting database restore..."

    if [[ "${DRY_RUN}" == "true" ]]; then
        log_info "[DRY RUN] Would restore database from ${backup_path}"
        return 0
    fi

    start_time=$(date +%s)

    # Run pg_restore
    if ! pg_restore ${PGRESTORE_OPTIONS} --dbname="${DATABASE_URL}" "${backup_path}"; then
        error_exit "Database restore failed" 5
    fi

    end_time=$(date +%s)
    duration=$((end_time - start_time))

    log_info "Database restore complete (${duration} seconds)"

    # Send CloudWatch metric
    send_restore_metrics "${duration}"
}

# Verify restore
verify_restore() {
    local db_name="$1"

    log_info "Verifying restore..."

    if [[ "${DRY_RUN}" == "true" ]]; then
        log_info "[DRY RUN] Would verify restore"
        return 0
    fi

    # Check if we can connect and query
    if ! psql "${DATABASE_URL}" -c "SELECT COUNT(*) FROM salons;" > /dev/null 2>&1; then
        log_warn "Could not verify salons table (table may not exist)"
    else
        log_info "Database queries successful"
    fi

    # Check database size
    local db_size
    db_size=$(psql "${DATABASE_URL}" -t -c "SELECT pg_size_pretty(pg_database_size(current_database()));" | xargs)
    log_info "Restored database size: ${db_size}"

    log_info "Restore verification complete"
}

################################################################################
# MONITORING FUNCTIONS
################################################################################

send_restore_metrics() {
    local duration="$1"

    if ! command -v aws &> /dev/null; then
        return 0
    fi

    # Send restore duration metric
    aws cloudwatch put-metric-data \
        --namespace "WhatsAppSaaS/Backups" \
        --metric-name "RestoreDuration" \
        --value "${duration}" \
        --unit "Seconds" \
        --dimensions "Hostname=$(hostname)" \
        2>/dev/null || true

    # Send restore success metric
    aws cloudwatch put-metric-data \
        --namespace "WhatsAppSaaS/Backups" \
        --metric-name "RestoreSuccess" \
        --value 1 \
        --unit "Count" \
        --dimensions "Hostname=$(hostname)" \
        2>/dev/null || true
}

################################################################################
# MAIN FUNCTION
################################################################################

main() {
    local backup_path
    local uncompressed_path
    local db_name

    log_info "=========================================="
    log_info "Database Restore Script Started"
    log_info "=========================================="
    log_info "Timestamp: ${TIMESTAMP}"
    log_info "Hostname: $(hostname)"

    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --from-s3)
                S3_PATH="$2"
                shift 2
                ;;
            --list-backups)
                LIST_BACKUPS=true
                shift
                ;;
            --latest)
                USE_LATEST=true
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                log_info "Running in DRY RUN mode"
                shift
                ;;
            --verify-only)
                VERIFY_ONLY=true
                shift
                ;;
            --force)
                FORCE=true
                log_warn "Force mode enabled - skipping confirmations"
                shift
                ;;
            --target-db)
                TARGET_DB="$2"
                shift 2
                ;;
            --verbose)
                VERBOSE=true
                shift
                ;;
            *)
                if [[ -z "${BACKUP_FILE}" ]]; then
                    BACKUP_FILE="$1"
                fi
                shift
                ;;
        esac
    done

    # Check prerequisites and environment
    check_prerequisites
    validate_environment

    # Handle --list-backups
    if [[ "${LIST_BACKUPS}" == "true" ]]; then
        list_local_backups
        list_s3_backups
        exit 0
    fi

    # Determine backup to restore
    if [[ "${USE_LATEST}" == "true" ]]; then
        log_info "Finding latest backup..."
        backup_path=$(get_latest_backup) || error_exit "No backups found" 1
        log_info "Latest backup: ${backup_path}"
    elif [[ -n "${S3_PATH}" ]]; then
        backup_path=$(download_from_s3 "${S3_PATH}")
    elif [[ -n "${BACKUP_FILE}" ]]; then
        if [[ ! -f "${BACKUP_FILE}" ]]; then
            error_exit "Backup file not found: ${BACKUP_FILE}" 1
        fi
        backup_path="${BACKUP_FILE}"
    else
        error_exit "No backup specified. Use --latest, --from-s3, or provide a backup file" 1
    fi

    # Display backup info
    display_backup_info "${backup_path}"

    # Verify backup integrity
    uncompressed_path=$(verify_backup_integrity "${backup_path}")

    # Exit if verify-only
    if [[ "${VERIFY_ONLY}" == "true" ]]; then
        log_info "Verification complete (--verify-only mode)"
        cleanup_temp_files
        exit 0
    fi

    # Get database name
    if [[ -n "${TARGET_DB}" ]]; then
        db_name="${TARGET_DB}"
    else
        db_name=$(get_database_name "${DATABASE_URL}")
    fi

    log_info "Target database: ${db_name}"

    # Test database connection
    test_database_connection

    # Confirm restore
    confirm_restore "${backup_path}" "${db_name}"

    # Create pre-restore snapshot
    create_pre_restore_snapshot "${db_name}"

    # Perform restore
    restore_database "${uncompressed_path}" "${db_name}"

    # Verify restore
    verify_restore "${db_name}"

    # Cleanup
    cleanup_temp_files

    log_info "=========================================="
    log_info "Restore Complete"
    log_info "=========================================="

    exit 0
}

# Trap cleanup on exit
trap cleanup_temp_files EXIT

# Run main function
main "$@"
