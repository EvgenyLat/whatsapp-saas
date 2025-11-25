#!/bin/bash

################################################################################
# Database Backup Script for WhatsApp SaaS
################################################################################
#
# Description: Automated PostgreSQL backup with S3 upload, compression,
#              retention management, and failure notifications
#
# Usage:
#   ./backup-database.sh [OPTIONS]
#
# Options:
#   --daily          Daily incremental backup (default)
#   --weekly         Weekly full backup
#   --monthly        Monthly archive
#   --dry-run        Simulate backup without uploading
#   --verbose        Verbose output
#   --no-upload      Skip S3 upload (local backup only)
#
# Environment Variables Required:
#   DATABASE_URL              PostgreSQL connection string
#   AWS_S3_BACKUP_BUCKET      S3 bucket name for backups
#   NOTIFICATION_EMAIL        Email for failure notifications (optional)
#
# Exit Codes:
#   0   Success
#   1   General error
#   2   Database connection failed
#   3   Backup creation failed
#   4   S3 upload failed
#   5   Cleanup failed
#
################################################################################

set -euo pipefail  # Exit on error, undefined vars, pipe failures

################################################################################
# CONFIGURATION
################################################################################

# Script metadata
readonly SCRIPT_NAME="$(basename "$0")"
readonly SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
readonly TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
readonly DATE_ONLY="$(date +%Y%m%d)"

# Backup configuration
readonly BACKUP_TYPE="${1:-daily}"  # daily, weekly, monthly
readonly LOCAL_BACKUP_DIR="${BACKUP_DIR:-/var/backups/whatsapp-saas}"
readonly LOG_FILE="${LOG_FILE:-/var/log/backups.log}"
readonly RETENTION_DAYS=30
readonly MONTHLY_RETENTION_DAYS=365

# Compression settings
readonly COMPRESSION_LEVEL=9  # 1-9, higher = better compression
readonly USE_PIGZ=false  # Use pigz (parallel gzip) if available

# S3 configuration
readonly S3_BUCKET="${AWS_S3_BACKUP_BUCKET:-}"
readonly S3_PREFIX="database-backups"
readonly S3_STORAGE_CLASS="STANDARD_IA"  # STANDARD, STANDARD_IA, GLACIER

# Notification settings
readonly NOTIFICATION_EMAIL="${NOTIFICATION_EMAIL:-}"
readonly NOTIFICATION_ENABLED="${NOTIFICATION_ENABLED:-false}"

# Database configuration
readonly DATABASE_URL="${DATABASE_URL:-}"
readonly PGDUMP_OPTIONS="--verbose --format=custom --no-owner --no-acl"

# Feature flags
DRY_RUN=false
VERBOSE=false
NO_UPLOAD=false

################################################################################
# UTILITY FUNCTIONS
################################################################################

# Logging function
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

# Error handler
error_exit() {
    local message="$1"
    local exit_code="${2:-1}"

    log_error "${message}"
    send_failure_notification "${message}"
    exit "${exit_code}"
}

# Send failure notification
send_failure_notification() {
    local error_message="$1"

    if [[ "${NOTIFICATION_ENABLED}" != "true" ]] || [[ -z "${NOTIFICATION_EMAIL}" ]]; then
        return 0
    fi

    local subject="[ALERT] Database Backup Failed - $(hostname)"
    local body="Database backup failed on $(date)

Error: ${error_message}

Backup Type: ${BACKUP_TYPE}
Server: $(hostname)
Timestamp: $(date '+%Y-%m-%d %H:%M:%S')

Please investigate immediately.
"

    # Try AWS SES first, fallback to mail command
    if command -v aws &> /dev/null; then
        aws ses send-email \
            --from "backups@$(hostname)" \
            --to "${NOTIFICATION_EMAIL}" \
            --subject "${subject}" \
            --text "${body}" 2>/dev/null || true
    elif command -v mail &> /dev/null; then
        echo "${body}" | mail -s "${subject}" "${NOTIFICATION_EMAIL}" 2>/dev/null || true
    fi
}

# Check required commands
check_prerequisites() {
    local missing_commands=()

    for cmd in pg_dump aws gzip; do
        if ! command -v "${cmd}" &> /dev/null; then
            missing_commands+=("${cmd}")
        fi
    done

    if [[ ${#missing_commands[@]} -gt 0 ]]; then
        error_exit "Missing required commands: ${missing_commands[*]}" 1
    fi

    # Check for pigz (optional)
    if command -v pigz &> /dev/null && [[ "${USE_PIGZ}" == "true" ]]; then
        log_info "Using pigz for parallel compression"
    fi
}

# Validate environment
validate_environment() {
    log_info "Validating environment configuration..."

    if [[ -z "${DATABASE_URL}" ]]; then
        error_exit "DATABASE_URL environment variable is not set" 1
    fi

    if [[ "${NO_UPLOAD}" == "false" ]] && [[ -z "${S3_BUCKET}" ]]; then
        error_exit "AWS_S3_BACKUP_BUCKET environment variable is not set" 1
    fi

    # Create backup directory if it doesn't exist
    if [[ ! -d "${LOCAL_BACKUP_DIR}" ]]; then
        log_info "Creating backup directory: ${LOCAL_BACKUP_DIR}"
        mkdir -p "${LOCAL_BACKUP_DIR}" || error_exit "Failed to create backup directory" 1
    fi

    # Create log directory if it doesn't exist
    local log_dir
    log_dir="$(dirname "${LOG_FILE}")"
    if [[ ! -d "${log_dir}" ]]; then
        log_info "Creating log directory: ${log_dir}"
        mkdir -p "${log_dir}" || error_exit "Failed to create log directory" 1
    fi

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
# BACKUP FUNCTIONS
################################################################################

# Generate backup filename
generate_backup_filename() {
    local backup_type="$1"
    local filename

    case "${backup_type}" in
        daily)
            filename="daily_${DATE_ONLY}_${TIMESTAMP}.dump"
            ;;
        weekly)
            filename="weekly_$(date +%Y_W%U)_${TIMESTAMP}.dump"
            ;;
        monthly)
            filename="monthly_$(date +%Y_%m)_${TIMESTAMP}.dump"
            ;;
        *)
            filename="backup_${TIMESTAMP}.dump"
            ;;
    esac

    echo "${filename}"
}

# Create database backup
create_backup() {
    local backup_type="$1"
    local backup_filename
    local backup_path
    local compressed_path
    local start_time
    local end_time
    local duration
    local backup_size

    backup_filename="$(generate_backup_filename "${backup_type}")"
    backup_path="${LOCAL_BACKUP_DIR}/${backup_filename}"
    compressed_path="${backup_path}.gz"

    log_info "Starting ${backup_type} backup..."
    log_info "Backup file: ${backup_filename}"

    if [[ "${DRY_RUN}" == "true" ]]; then
        log_info "[DRY RUN] Would create backup at: ${compressed_path}"
        echo "${compressed_path}"
        return 0
    fi

    # Record start time
    start_time=$(date +%s)

    # Create backup using pg_dump
    log_info "Running pg_dump..."
    if ! pg_dump "${DATABASE_URL}" ${PGDUMP_OPTIONS} --file="${backup_path}"; then
        rm -f "${backup_path}" 2>/dev/null || true
        error_exit "pg_dump failed" 3
    fi

    # Compress backup
    log_info "Compressing backup..."
    if command -v pigz &> /dev/null && [[ "${USE_PIGZ}" == "true" ]]; then
        if ! pigz -${COMPRESSION_LEVEL} "${backup_path}"; then
            rm -f "${backup_path}" "${compressed_path}" 2>/dev/null || true
            error_exit "Backup compression (pigz) failed" 3
        fi
    else
        if ! gzip -${COMPRESSION_LEVEL} "${backup_path}"; then
            rm -f "${backup_path}" "${compressed_path}" 2>/dev/null || true
            error_exit "Backup compression (gzip) failed" 3
        fi
    fi

    # Record end time and calculate duration
    end_time=$(date +%s)
    duration=$((end_time - start_time))

    # Get backup size
    if [[ -f "${compressed_path}" ]]; then
        backup_size=$(du -h "${compressed_path}" | cut -f1)
    else
        error_exit "Compressed backup file not found" 3
    fi

    log_info "Backup created successfully"
    log_info "File: ${compressed_path}"
    log_info "Size: ${backup_size}"
    log_info "Duration: ${duration} seconds"

    # Write metadata
    write_backup_metadata "${compressed_path}" "${duration}" "${backup_size}"

    echo "${compressed_path}"
}

# Write backup metadata
write_backup_metadata() {
    local backup_path="$1"
    local duration="$2"
    local size="$3"
    local metadata_path="${backup_path}.meta"

    cat > "${metadata_path}" <<EOF
{
  "backup_file": "$(basename "${backup_path}")",
  "backup_type": "${BACKUP_TYPE}",
  "timestamp": "${TIMESTAMP}",
  "date": "$(date -Iseconds)",
  "hostname": "$(hostname)",
  "database_url": "***REDACTED***",
  "size": "${size}",
  "duration_seconds": ${duration},
  "compression": "gzip-${COMPRESSION_LEVEL}",
  "pg_dump_version": "$(pg_dump --version | head -n1)"
}
EOF

    log_debug "Metadata written to ${metadata_path}"
}

################################################################################
# S3 FUNCTIONS
################################################################################

# Upload backup to S3
upload_to_s3() {
    local backup_path="$1"
    local backup_filename
    local s3_path
    local metadata_path
    local start_time
    local end_time
    local duration

    backup_filename="$(basename "${backup_path}")"
    s3_path="s3://${S3_BUCKET}/${S3_PREFIX}/${BACKUP_TYPE}/${backup_filename}"
    metadata_path="${backup_path}.meta"

    if [[ "${NO_UPLOAD}" == "true" ]]; then
        log_info "Skipping S3 upload (--no-upload flag set)"
        return 0
    fi

    if [[ "${DRY_RUN}" == "true" ]]; then
        log_info "[DRY RUN] Would upload to: ${s3_path}"
        return 0
    fi

    log_info "Uploading backup to S3..."
    log_info "Destination: ${s3_path}"

    # Record start time
    start_time=$(date +%s)

    # Upload backup file
    if ! aws s3 cp "${backup_path}" "${s3_path}" \
        --storage-class "${S3_STORAGE_CLASS}" \
        --metadata "backup-type=${BACKUP_TYPE},timestamp=${TIMESTAMP}"; then
        error_exit "S3 upload failed" 4
    fi

    # Upload metadata file
    if [[ -f "${metadata_path}" ]]; then
        aws s3 cp "${metadata_path}" "${s3_path}.meta" \
            --storage-class "${S3_STORAGE_CLASS}" 2>/dev/null || true
    fi

    # Record end time
    end_time=$(date +%s)
    duration=$((end_time - start_time))

    log_info "Upload complete (${duration} seconds)"
    log_info "S3 URI: ${s3_path}"
}

# Verify S3 upload
verify_s3_upload() {
    local backup_path="$1"
    local backup_filename
    local s3_path
    local local_size
    local s3_size

    if [[ "${NO_UPLOAD}" == "true" ]] || [[ "${DRY_RUN}" == "true" ]]; then
        return 0
    fi

    backup_filename="$(basename "${backup_path}")"
    s3_path="s3://${S3_BUCKET}/${S3_PREFIX}/${BACKUP_TYPE}/${backup_filename}"

    log_info "Verifying S3 upload..."

    # Get local file size
    local_size=$(stat -c%s "${backup_path}" 2>/dev/null || stat -f%z "${backup_path}" 2>/dev/null)

    # Get S3 file size
    s3_size=$(aws s3 ls "${s3_path}" | awk '{print $3}')

    if [[ "${local_size}" -eq "${s3_size}" ]]; then
        log_info "S3 upload verified (size match: ${local_size} bytes)"
    else
        log_warn "S3 upload size mismatch (local: ${local_size}, S3: ${s3_size})"
    fi
}

################################################################################
# CLEANUP FUNCTIONS
################################################################################

# Cleanup old local backups
cleanup_old_backups() {
    local retention_days="$1"
    local backup_type="$2"
    local deleted_count=0

    log_info "Cleaning up local backups older than ${retention_days} days..."

    if [[ "${DRY_RUN}" == "true" ]]; then
        log_info "[DRY RUN] Would delete old backups"
        return 0
    fi

    # Find and delete old backups
    while IFS= read -r -d '' file; do
        log_debug "Deleting old backup: ${file}"
        rm -f "${file}" "${file}.meta" 2>/dev/null || true
        ((deleted_count++))
    done < <(find "${LOCAL_BACKUP_DIR}" -name "*${backup_type}*.dump.gz" -mtime "+${retention_days}" -print0 2>/dev/null)

    if [[ ${deleted_count} -gt 0 ]]; then
        log_info "Deleted ${deleted_count} old local backup(s)"
    else
        log_info "No old local backups to delete"
    fi
}

# Cleanup old S3 backups
cleanup_old_s3_backups() {
    local retention_days="$1"
    local backup_type="$2"
    local cutoff_date

    if [[ "${NO_UPLOAD}" == "true" ]] || [[ "${DRY_RUN}" == "true" ]]; then
        return 0
    fi

    log_info "Cleaning up S3 backups older than ${retention_days} days..."

    cutoff_date=$(date -d "${retention_days} days ago" +%Y-%m-%d 2>/dev/null || date -v-${retention_days}d +%Y-%m-%d)

    # List and delete old backups from S3
    aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}/${backup_type}/" | \
    while read -r line; do
        local file_date
        local file_name

        file_date=$(echo "${line}" | awk '{print $1}')
        file_name=$(echo "${line}" | awk '{print $4}')

        if [[ "${file_date}" < "${cutoff_date}" ]] && [[ -n "${file_name}" ]]; then
            log_debug "Deleting old S3 backup: ${file_name}"
            aws s3 rm "s3://${S3_BUCKET}/${S3_PREFIX}/${backup_type}/${file_name}" 2>/dev/null || true
            aws s3 rm "s3://${S3_BUCKET}/${S3_PREFIX}/${backup_type}/${file_name}.meta" 2>/dev/null || true
        fi
    done

    log_info "S3 cleanup complete"
}

################################################################################
# MONITORING FUNCTIONS
################################################################################

# Send CloudWatch metrics
send_cloudwatch_metrics() {
    local backup_path="$1"
    local duration="$2"
    local size_bytes

    if ! command -v aws &> /dev/null; then
        log_debug "AWS CLI not available, skipping CloudWatch metrics"
        return 0
    fi

    size_bytes=$(stat -c%s "${backup_path}" 2>/dev/null || stat -f%z "${backup_path}" 2>/dev/null)

    # Send backup size metric
    aws cloudwatch put-metric-data \
        --namespace "WhatsAppSaaS/Backups" \
        --metric-name "BackupSize" \
        --value "${size_bytes}" \
        --unit "Bytes" \
        --dimensions "BackupType=${BACKUP_TYPE},Hostname=$(hostname)" \
        2>/dev/null || true

    # Send backup duration metric
    aws cloudwatch put-metric-data \
        --namespace "WhatsAppSaaS/Backups" \
        --metric-name "BackupDuration" \
        --value "${duration}" \
        --unit "Seconds" \
        --dimensions "BackupType=${BACKUP_TYPE},Hostname=$(hostname)" \
        2>/dev/null || true

    # Send success metric
    aws cloudwatch put-metric-data \
        --namespace "WhatsAppSaaS/Backups" \
        --metric-name "BackupSuccess" \
        --value 1 \
        --unit "Count" \
        --dimensions "BackupType=${BACKUP_TYPE},Hostname=$(hostname)" \
        2>/dev/null || true

    log_debug "CloudWatch metrics sent"
}

################################################################################
# MAIN FUNCTION
################################################################################

main() {
    local backup_path
    local total_start_time
    local total_end_time
    local total_duration

    log_info "=========================================="
    log_info "Database Backup Script Started"
    log_info "=========================================="
    log_info "Backup Type: ${BACKUP_TYPE}"
    log_info "Timestamp: ${TIMESTAMP}"
    log_info "Hostname: $(hostname)"

    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --dry-run)
                DRY_RUN=true
                log_info "Running in DRY RUN mode"
                ;;
            --verbose)
                VERBOSE=true
                ;;
            --no-upload)
                NO_UPLOAD=true
                log_info "S3 upload disabled"
                ;;
            --daily|--weekly|--monthly)
                # Already handled
                ;;
        esac
        shift
    done

    # Record total start time
    total_start_time=$(date +%s)

    # Run backup workflow
    check_prerequisites
    validate_environment
    test_database_connection

    backup_path=$(create_backup "${BACKUP_TYPE}")

    if [[ -n "${backup_path}" ]]; then
        upload_to_s3 "${backup_path}"
        verify_s3_upload "${backup_path}"

        # Send metrics
        local backup_duration=0
        if [[ -f "${backup_path}.meta" ]]; then
            backup_duration=$(grep -oP '"duration_seconds":\s*\K\d+' "${backup_path}.meta" 2>/dev/null || echo "0")
        fi
        send_cloudwatch_metrics "${backup_path}" "${backup_duration}"

        # Cleanup old backups
        if [[ "${BACKUP_TYPE}" == "monthly" ]]; then
            cleanup_old_backups "${MONTHLY_RETENTION_DAYS}" "${BACKUP_TYPE}"
            cleanup_old_s3_backups "${MONTHLY_RETENTION_DAYS}" "${BACKUP_TYPE}"
        else
            cleanup_old_backups "${RETENTION_DAYS}" "${BACKUP_TYPE}"
            cleanup_old_s3_backups "${RETENTION_DAYS}" "${BACKUP_TYPE}"
        fi
    fi

    # Record total end time
    total_end_time=$(date +%s)
    total_duration=$((total_end_time - total_start_time))

    log_info "=========================================="
    log_info "Backup Complete"
    log_info "Total Duration: ${total_duration} seconds"
    log_info "=========================================="

    exit 0
}

# Run main function
main "$@"
