#!/bin/bash

################################################################################
# PostgreSQL Automated Backup Script
# WhatsApp SaaS Starter - Production Database Backup
#
# Features:
# - Automated full and incremental backups
# - Backup encryption with GPG
# - Backup verification
# - Automated cleanup based on retention policy
# - S3/Cloud storage upload
# - Slack/Email notifications
# - Backup integrity testing
#
# Usage:
#   ./backup-automation.sh [full|incremental|verify]
#
# Cron Schedule Examples:
#   Full backup daily:    0 2 * * * /path/to/backup-automation.sh full
#   Incremental hourly:   0 * * * * /path/to/backup-automation.sh incremental
#   Verify weekly:        0 3 * * 0 /path/to/backup-automation.sh verify
################################################################################

set -euo pipefail

# ============================================================================
# CONFIGURATION
# ============================================================================

# Database Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-whatsapp_saas}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD}"

# Backup Configuration
BACKUP_DIR="${BACKUP_DIR:-/var/backups/postgresql}"
BACKUP_TYPE="${1:-full}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATE_DIR=$(date +%Y/%m/%d)

# Retention Policy (days)
RETENTION_DAILY=7      # Keep daily backups for 7 days
RETENTION_WEEKLY=30    # Keep weekly backups for 30 days
RETENTION_MONTHLY=365  # Keep monthly backups for 1 year

# S3 Configuration (optional)
S3_BUCKET="${S3_BUCKET:-}"
S3_PREFIX="${S3_PREFIX:-backups/postgresql}"
AWS_REGION="${AWS_REGION:-us-east-1}"

# Encryption Configuration
GPG_RECIPIENT="${GPG_RECIPIENT:-backup@yourdomain.com}"
ENCRYPT_BACKUPS="${ENCRYPT_BACKUPS:-true}"

# Notification Configuration
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"
EMAIL_TO="${EMAIL_TO:-ops@yourdomain.com}"
EMAIL_FROM="${EMAIL_FROM:-backups@yourdomain.com}"

# Logging
LOG_FILE="${BACKUP_DIR}/backup.log"
ERROR_LOG="${BACKUP_DIR}/backup_errors.log"

# ============================================================================
# FUNCTIONS
# ============================================================================

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $*" | tee -a "$ERROR_LOG" >&2
}

send_notification() {
    local status="$1"
    local message="$2"
    local color="${3:-#36a64f}"

    # Slack notification
    if [[ -n "$SLACK_WEBHOOK" ]]; then
        curl -X POST "$SLACK_WEBHOOK" \
            -H 'Content-Type: application/json' \
            -d "{
                \"attachments\": [{
                    \"color\": \"$color\",
                    \"title\": \"PostgreSQL Backup $status\",
                    \"text\": \"$message\",
                    \"fields\": [
                        {\"title\": \"Database\", \"value\": \"$DB_NAME\", \"short\": true},
                        {\"title\": \"Host\", \"value\": \"$DB_HOST\", \"short\": true},
                        {\"title\": \"Type\", \"value\": \"$BACKUP_TYPE\", \"short\": true},
                        {\"title\": \"Timestamp\", \"value\": \"$TIMESTAMP\", \"short\": true}
                    ],
                    \"footer\": \"PostgreSQL Backup System\",
                    \"ts\": $(date +%s)
                }]
            }" 2>/dev/null || error "Failed to send Slack notification"
    fi

    # Email notification (requires mailx or sendmail)
    if command -v mailx >/dev/null 2>&1; then
        echo "$message" | mailx -s "PostgreSQL Backup $status - $DB_NAME" \
            -r "$EMAIL_FROM" "$EMAIL_TO" || true
    fi
}

check_prerequisites() {
    log "Checking prerequisites..."

    # Check required commands
    local required_commands="pg_dump pg_basebackup aws gpg"
    for cmd in $required_commands; do
        if ! command -v "$cmd" >/dev/null 2>&1; then
            error "Required command not found: $cmd"
            exit 1
        fi
    done

    # Create backup directory
    mkdir -p "$BACKUP_DIR/$DATE_DIR"

    # Test database connection
    if ! PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" >/dev/null 2>&1; then
        error "Cannot connect to database"
        send_notification "FAILED" "Cannot connect to database $DB_NAME" "#ff0000"
        exit 1
    fi

    log "Prerequisites check completed"
}

full_backup() {
    log "Starting full backup..."
    local backup_file="$BACKUP_DIR/$DATE_DIR/${DB_NAME}_full_${TIMESTAMP}.sql"
    local compressed_file="${backup_file}.gz"
    local encrypted_file="${compressed_file}.gpg"

    # Perform pg_dump
    PGPASSWORD="$DB_PASSWORD" pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --verbose \
        --format=custom \
        --compress=9 \
        --file="$backup_file" 2>>"$ERROR_LOG"

    if [[ $? -ne 0 ]]; then
        error "pg_dump failed"
        send_notification "FAILED" "Full backup failed for $DB_NAME" "#ff0000"
        exit 1
    fi

    # Compress backup
    gzip "$backup_file"
    log "Backup compressed: $compressed_file"

    # Encrypt backup if enabled
    if [[ "$ENCRYPT_BACKUPS" == "true" ]]; then
        gpg --encrypt --recipient "$GPG_RECIPIENT" \
            --output "$encrypted_file" "$compressed_file"

        if [[ $? -eq 0 ]]; then
            rm "$compressed_file"
            backup_file="$encrypted_file"
            log "Backup encrypted: $encrypted_file"
        else
            error "Encryption failed, keeping unencrypted backup"
            backup_file="$compressed_file"
        fi
    else
        backup_file="$compressed_file"
    fi

    # Calculate backup size and checksum
    local backup_size=$(du -h "$backup_file" | cut -f1)
    local checksum=$(sha256sum "$backup_file" | awk '{print $1}')

    # Save metadata
    cat > "${backup_file}.meta" <<EOF
Backup Type: Full
Database: $DB_NAME
Host: $DB_HOST
Timestamp: $TIMESTAMP
Size: $backup_size
SHA256: $checksum
Encrypted: $ENCRYPT_BACKUPS
EOF

    log "Full backup completed: $backup_file (Size: $backup_size)"

    # Upload to S3 if configured
    if [[ -n "$S3_BUCKET" ]]; then
        upload_to_s3 "$backup_file" "${backup_file}.meta"
    fi

    send_notification "SUCCESS" "Full backup completed successfully\nSize: $backup_size\nFile: $(basename $backup_file)"

    return 0
}

incremental_backup() {
    log "Starting incremental backup (WAL archiving)..."

    # This requires WAL archiving to be configured in postgresql.conf
    # archive_mode = on
    # archive_command = 'test ! -f /var/backups/postgresql/wal_archive/%f && cp %p /var/backups/postgresql/wal_archive/%f'

    local wal_dir="$BACKUP_DIR/wal_archive"
    mkdir -p "$wal_dir"

    # Create a base backup if this is the first incremental
    if [[ ! -f "$BACKUP_DIR/last_base_backup.timestamp" ]]; then
        log "No base backup found, creating base backup first..."
        pg_basebackup -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" \
            -D "$BACKUP_DIR/base_backup_$TIMESTAMP" \
            -Ft -z -Xs -P -v 2>>"$ERROR_LOG"

        echo "$TIMESTAMP" > "$BACKUP_DIR/last_base_backup.timestamp"
        log "Base backup created for incremental backups"
    fi

    # Archive current WAL files
    local archived_count=$(find "$wal_dir" -type f -mmin -60 | wc -l)
    log "Archived $archived_count WAL files in the last hour"

    # Compress old WAL files
    find "$wal_dir" -type f -name "*.wal" -mtime +1 -exec gzip {} \;

    send_notification "SUCCESS" "Incremental backup completed\nWAL files archived: $archived_count"

    return 0
}

verify_backup() {
    log "Starting backup verification..."

    # Find the most recent backup
    local latest_backup=$(find "$BACKUP_DIR" -type f -name "${DB_NAME}_full_*.sql.gz*" | sort -r | head -1)

    if [[ -z "$latest_backup" ]]; then
        error "No backup found to verify"
        send_notification "FAILED" "No backup found for verification" "#ff0000"
        return 1
    fi

    log "Verifying backup: $latest_backup"

    # Create temporary test database
    local test_db="${DB_NAME}_verify_${TIMESTAMP}"
    local verification_failed=0

    # Decrypt if necessary
    local backup_to_restore="$latest_backup"
    if [[ "$latest_backup" == *.gpg ]]; then
        backup_to_restore="${latest_backup%.gpg}"
        gpg --decrypt --output "$backup_to_restore" "$latest_backup"
    fi

    # Decompress if necessary
    if [[ "$backup_to_restore" == *.gz ]]; then
        local decompressed="${backup_to_restore%.gz}"
        gunzip -c "$backup_to_restore" > "$decompressed"
        backup_to_restore="$decompressed"
    fi

    # Create test database
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" \
        -c "CREATE DATABASE $test_db" 2>>"$ERROR_LOG" || {
        error "Failed to create test database"
        verification_failed=1
    }

    if [[ $verification_failed -eq 0 ]]; then
        # Restore to test database
        PGPASSWORD="$DB_PASSWORD" pg_restore \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            -d "$test_db" \
            --no-owner \
            --no-acl \
            "$backup_to_restore" 2>>"$ERROR_LOG" || {
            error "Failed to restore backup"
            verification_failed=1
        }
    fi

    if [[ $verification_failed -eq 0 ]]; then
        # Run verification queries
        local table_count=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" \
            -U "$DB_USER" -d "$test_db" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'" 2>/dev/null | tr -d ' ')

        log "Verification successful: $table_count tables restored"
        send_notification "SUCCESS" "Backup verification passed\nBackup: $(basename $latest_backup)\nTables restored: $table_count"
    else
        error "Backup verification failed"
        send_notification "FAILED" "Backup verification failed\nBackup: $(basename $latest_backup)" "#ff0000"
    fi

    # Cleanup test database
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" \
        -c "DROP DATABASE IF EXISTS $test_db" 2>/dev/null || true

    # Cleanup temporary files
    [[ -f "$decompressed" ]] && rm -f "$decompressed"
    [[ "$latest_backup" == *.gpg ]] && [[ -f "${latest_backup%.gpg}" ]] && rm -f "${latest_backup%.gpg}"

    return $verification_failed
}

upload_to_s3() {
    local files=("$@")
    log "Uploading ${#files[@]} file(s) to S3..."

    for file in "${files[@]}"; do
        local s3_path="s3://$S3_BUCKET/$S3_PREFIX/$DATE_DIR/$(basename $file)"

        aws s3 cp "$file" "$s3_path" \
            --region "$AWS_REGION" \
            --storage-class STANDARD_IA \
            --metadata "backup-timestamp=$TIMESTAMP,database=$DB_NAME" 2>>"$ERROR_LOG"

        if [[ $? -eq 0 ]]; then
            log "Uploaded to S3: $s3_path"
        else
            error "Failed to upload to S3: $file"
        fi
    done
}

cleanup_old_backups() {
    log "Starting backup cleanup..."

    # Cleanup local backups
    find "$BACKUP_DIR" -type f -name "${DB_NAME}_full_*.sql.gz*" -mtime +$RETENTION_DAILY -delete
    find "$BACKUP_DIR/wal_archive" -type f -name "*.wal.gz" -mtime +$RETENTION_WEEKLY -delete

    log "Local backup cleanup completed"

    # Cleanup S3 backups if configured
    if [[ -n "$S3_BUCKET" ]]; then
        local cutoff_date=$(date -d "-${RETENTION_MONTHLY} days" +%Y-%m-%d)

        aws s3 ls "s3://$S3_BUCKET/$S3_PREFIX/" --recursive | \
        while read -r line; do
            local file_date=$(echo "$line" | awk '{print $1}')
            local file_path=$(echo "$line" | awk '{print $4}')

            if [[ "$file_date" < "$cutoff_date" ]]; then
                aws s3 rm "s3://$S3_BUCKET/$file_path" --region "$AWS_REGION"
                log "Deleted old S3 backup: $file_path"
            fi
        done
    fi

    log "Backup cleanup completed"
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
    log "=========================================="
    log "Starting backup process: $BACKUP_TYPE"
    log "=========================================="

    check_prerequisites

    case "$BACKUP_TYPE" in
        full)
            full_backup
            cleanup_old_backups
            ;;
        incremental)
            incremental_backup
            ;;
        verify)
            verify_backup
            ;;
        *)
            error "Invalid backup type: $BACKUP_TYPE"
            echo "Usage: $0 [full|incremental|verify]"
            exit 1
            ;;
    esac

    log "Backup process completed successfully"
    log "=========================================="
}

# Run main function
main

exit 0
