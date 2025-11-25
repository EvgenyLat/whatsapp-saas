#!/bin/bash

# ============================================================================
# WhatsApp SaaS Platform - Database Restore Script
# ============================================================================
#
# This script restores a PostgreSQL database backup.
#
# Prerequisites:
# - AWS CLI configured
# - PostgreSQL client (pg_restore) installed
# - Database backup file available
#
# Usage:
#   ./scripts/restore-database.sh [options]
#
# Options:
#   --backup FILENAME    Backup file to restore (local or S3)
#   --snapshot ID        RDS snapshot ID to restore from
#   --dry-run            Show what would be restored (no actual changes)
#   --force              Skip confirmation prompts (DANGEROUS)
#   --help               Show this help message
#
# ============================================================================

set -e
set -u

# ============================================================================
# CONFIGURATION
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
TERRAFORM_DIR="${PROJECT_ROOT}/terraform/environments/production"
BACKUP_DIR="${PROJECT_ROOT}/backups"

AWS_REGION="${AWS_REGION:-us-east-1}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ============================================================================
# PARSE ARGUMENTS
# ============================================================================

BACKUP_FILE=""
SNAPSHOT_ID=""
DRY_RUN=false
FORCE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --backup)
            BACKUP_FILE="$2"
            shift 2
            ;;
        --snapshot)
            SNAPSHOT_ID="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        --help)
            head -n 30 "$0" | grep "^#" | sed 's/^# //; s/^#//'
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

separator() {
    echo "============================================================================"
}

# ============================================================================
# VALIDATION
# ============================================================================

separator
log_info "Database Restore"
separator

if [[ -z "${BACKUP_FILE}" ]] && [[ -z "${SNAPSHOT_ID}" ]]; then
    log_error "Must specify either --backup or --snapshot"
    log_info "Usage: $0 --backup <filename> OR $0 --snapshot <snapshot-id>"
    exit 1
fi

if [[ -n "${BACKUP_FILE}" ]] && [[ -n "${SNAPSHOT_ID}" ]]; then
    log_error "Cannot specify both --backup and --snapshot"
    exit 1
fi

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    log_error "AWS CLI not found. Please install AWS CLI"
    exit 1
fi

# ============================================================================
# RDS SNAPSHOT RESTORE
# ============================================================================

if [[ -n "${SNAPSHOT_ID}" ]]; then
    separator
    log_warning "⚠️  DANGER: Restoring from RDS snapshot ⚠️"
    separator
    log_warning "This will:"
    log_warning "  1. Create a NEW RDS instance from snapshot"
    log_warning "  2. Require manual cutover to new instance"
    log_warning "  3. Cause application downtime"
    separator

    if [[ "${DRY_RUN}" == "true" ]]; then
        log_info "DRY RUN: Would restore from snapshot ${SNAPSHOT_ID}"
        exit 0
    fi

    if [[ "${FORCE}" == "false" ]]; then
        read -p "Type 'RESTORE FROM SNAPSHOT' to confirm: " confirmation
        if [[ "${confirmation}" != "RESTORE FROM SNAPSHOT" ]]; then
            log_info "Restore cancelled"
            exit 0
        fi
    fi

    TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
    NEW_DB_IDENTIFIER="whatsapp-saas-prod-restored-${TIMESTAMP}"

    log_info "Creating new RDS instance: ${NEW_DB_IDENTIFIER}"

    aws rds restore-db-instance-from-db-snapshot \
        --db-instance-identifier "${NEW_DB_IDENTIFIER}" \
        --db-snapshot-identifier "${SNAPSHOT_ID}" \
        --db-instance-class "db.t3.small" \
        --publicly-accessible false \
        --region "${AWS_REGION}"

    log_info "Waiting for instance to be available (this may take 10-15 minutes)..."

    aws rds wait db-instance-available \
        --db-instance-identifier "${NEW_DB_IDENTIFIER}" \
        --region "${AWS_REGION}"

    NEW_ENDPOINT=$(aws rds describe-db-instances \
        --db-instance-identifier "${NEW_DB_IDENTIFIER}" \
        --region "${AWS_REGION}" \
        --query 'DBInstances[0].Endpoint.Address' \
        --output text)

    log_success "New database instance created!"

    separator
    log_info "Manual Steps Required:"
    separator

    echo "1. Update Terraform to point to new instance:"
    echo "   DB Identifier: ${NEW_DB_IDENTIFIER}"
    echo "   Endpoint: ${NEW_ENDPOINT}"
    echo ""
    echo "2. Update Secrets Manager with new endpoint"
    echo ""
    echo "3. Deploy application with updated DATABASE_URL"
    echo ""
    echo "4. Verify application connectivity"
    echo ""
    echo "5. Delete old RDS instance if no longer needed"

    exit 0
fi

# ============================================================================
# PG_RESTORE FROM BACKUP
# ============================================================================

separator
log_info "Restoring from backup file..."
separator

# Check pg_restore
if ! command -v pg_restore &> /dev/null; then
    log_error "pg_restore not found. Please install PostgreSQL client tools"
    exit 1
fi

# Determine backup file location
if [[ -f "${BACKUP_FILE}" ]]; then
    # File exists locally
    LOCAL_BACKUP="${BACKUP_FILE}"
    log_info "Using local backup: ${LOCAL_BACKUP}"
elif [[ -f "${BACKUP_DIR}/${BACKUP_FILE}" ]]; then
    # File in backup directory
    LOCAL_BACKUP="${BACKUP_DIR}/${BACKUP_FILE}"
    log_info "Using backup: ${LOCAL_BACKUP}"
else
    # Try downloading from S3
    log_info "Backup not found locally, checking S3..."

    cd "${TERRAFORM_DIR}"
    BACKUP_BUCKET=$(terraform output -raw backups_bucket_name 2>/dev/null)

    if [[ -z "${BACKUP_BUCKET}" ]]; then
        log_error "Unable to retrieve backup bucket name"
        exit 1
    fi

    S3_KEY="database-backups/${BACKUP_FILE}"
    S3_URL="s3://${BACKUP_BUCKET}/${S3_KEY}"
    LOCAL_BACKUP="${BACKUP_DIR}/${BACKUP_FILE}"

    log_info "Downloading from S3: ${S3_URL}"

    mkdir -p "${BACKUP_DIR}"

    if aws s3 cp "${S3_URL}" "${LOCAL_BACKUP}" --region "${AWS_REGION}"; then
        log_success "Backup downloaded from S3"
    else
        log_error "Failed to download backup from S3"
        exit 1
    fi
fi

# Verify backup file
if [[ ! -f "${LOCAL_BACKUP}" ]]; then
    log_error "Backup file not found: ${LOCAL_BACKUP}"
    exit 1
fi

BACKUP_SIZE=$(du -h "${LOCAL_BACKUP}" | cut -f1)
log_info "Backup file size: ${BACKUP_SIZE}"

# ============================================================================
# GET DATABASE CREDENTIALS
# ============================================================================

separator
log_info "Retrieving database credentials..."
separator

cd "${TERRAFORM_DIR}"

DB_SECRET_ARN=$(terraform output -raw db_credentials_secret_arn 2>/dev/null)

if [[ -z "${DB_SECRET_ARN}" ]]; then
    log_error "Unable to retrieve database secret ARN from Terraform"
    exit 1
fi

DB_SECRET=$(aws secretsmanager get-secret-value \
    --secret-id "${DB_SECRET_ARN}" \
    --region "${AWS_REGION}" \
    --query SecretString \
    --output text 2>/dev/null)

if [[ -z "${DB_SECRET}" ]]; then
    log_error "Unable to retrieve database credentials from Secrets Manager"
    exit 1
fi

DB_HOST=$(echo "${DB_SECRET}" | jq -r '.host')
DB_PORT=$(echo "${DB_SECRET}" | jq -r '.port')
DB_NAME=$(echo "${DB_SECRET}" | jq -r '.dbname')
DB_USER=$(echo "${DB_SECRET}" | jq -r '.username')
DB_PASS=$(echo "${DB_SECRET}" | jq -r '.password')

log_success "Database credentials retrieved"
log_info "Target database: ${DB_NAME} on ${DB_HOST}"

# ============================================================================
# CONFIRMATION
# ============================================================================

separator
log_warning "⚠️  DANGER: You are about to restore PRODUCTION database! ⚠️"
separator
log_warning "This will:"
log_warning "  - OVERWRITE all current data in ${DB_NAME}"
log_warning "  - Terminate all active connections"
log_warning "  - Cause application downtime"
log_warning "  - Cannot be undone"
separator
log_info "Backup file: ${LOCAL_BACKUP}"
log_info "Target: ${DB_NAME} on ${DB_HOST}"
separator

if [[ "${DRY_RUN}" == "true" ]]; then
    log_info "DRY RUN: Would restore ${LOCAL_BACKUP} to ${DB_NAME}"
    exit 0
fi

if [[ "${FORCE}" == "false" ]]; then
    read -p "Type 'RESTORE DATABASE' to confirm: " confirmation
    if [[ "${confirmation}" != "RESTORE DATABASE" ]]; then
        log_info "Restore cancelled"
        exit 0
    fi
fi

# ============================================================================
# CREATE BACKUP BEFORE RESTORE
# ============================================================================

separator
log_info "Creating safety backup before restore..."
separator

PRE_RESTORE_BACKUP="${BACKUP_DIR}/pre_restore_${DB_NAME}_$(date +"%Y%m%d_%H%M%S").sql"

export PGPASSWORD="${DB_PASS}"

if pg_dump \
    -h "${DB_HOST}" \
    -p "${DB_PORT}" \
    -U "${DB_USER}" \
    -d "${DB_NAME}" \
    --format=custom \
    --compress=9 \
    --file="${PRE_RESTORE_BACKUP}" 2>/dev/null; then

    log_success "Safety backup created: ${PRE_RESTORE_BACKUP}"
else
    log_warning "Failed to create safety backup"

    if [[ "${FORCE}" == "false" ]]; then
        read -p "Continue without safety backup? (yes/no): " confirm
        if [[ "${confirm}" != "yes" ]]; then
            log_info "Restore cancelled"
            exit 0
        fi
    fi
fi

# ============================================================================
# TERMINATE CONNECTIONS
# ============================================================================

separator
log_info "Terminating active connections..."
separator

psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres -c \
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();" \
    &> /dev/null || true

log_info "Connections terminated"

# ============================================================================
# RESTORE DATABASE
# ============================================================================

separator
log_info "Restoring database (this may take several minutes)..."
separator

# Drop and recreate database (clean restore)
log_info "Dropping existing database..."
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres -c \
    "DROP DATABASE IF EXISTS ${DB_NAME};" 2>/dev/null

log_info "Creating fresh database..."
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres -c \
    "CREATE DATABASE ${DB_NAME};" 2>/dev/null

# Restore from backup
log_info "Restoring data from backup..."

if pg_restore \
    -h "${DB_HOST}" \
    -p "${DB_PORT}" \
    -U "${DB_USER}" \
    -d "${DB_NAME}" \
    --verbose \
    --no-owner \
    --no-acl \
    "${LOCAL_BACKUP}" 2>&1 | tee "${LOCAL_BACKUP}.restore.log"; then

    log_success "Database restored successfully"
else
    log_error "Database restore failed"
    log_info "Restore log: ${LOCAL_BACKUP}.restore.log"
    log_info "You can attempt to recover using: ${PRE_RESTORE_BACKUP}"
    exit 1
fi

unset PGPASSWORD

# ============================================================================
# VERIFY RESTORE
# ============================================================================

separator
log_info "Verifying restore..."
separator

export PGPASSWORD="${DB_PASS}"

# Count tables
TABLE_COUNT=$(psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -t -c \
    "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs)

log_info "Tables restored: ${TABLE_COUNT}"

# Check critical tables
CRITICAL_TABLES=("salons" "bookings" "messages" "conversations")
for table in "${CRITICAL_TABLES[@]}"; do
    if psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -t -c \
        "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '${table}');" 2>/dev/null | grep -q "t"; then

        ROW_COUNT=$(psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -t -c \
            "SELECT count(*) FROM ${table};" 2>/dev/null | xargs)

        log_success "Table '${table}' exists (${ROW_COUNT} rows)"
    else
        log_error "Table '${table}' does not exist!"
    fi
done

unset PGPASSWORD

# ============================================================================
# RESTORE SUMMARY
# ============================================================================

separator
log_success "Database Restore Summary"
separator

echo "✅ Database restored successfully"
echo "✅ ${TABLE_COUNT} tables restored"
echo "✅ Critical tables verified"
echo ""
echo "Source: ${LOCAL_BACKUP}"
echo "Target: ${DB_NAME} on ${DB_HOST}"
echo "Safety backup: ${PRE_RESTORE_BACKUP}"
echo ""

separator
log_info "Next steps:"
separator

echo "1. Verify application connectivity:"
echo "   cd Backend && npm run test:health"
echo ""
echo "2. Run smoke tests:"
echo "   cd Backend && npm run test:smoke"
echo ""
echo "3. Monitor application logs:"
echo "   ./scripts/view-logs.sh"
echo ""
echo "4. If restore was unsuccessful, revert using:"
echo "   ./scripts/restore-database.sh --backup $(basename ${PRE_RESTORE_BACKUP})"

separator
log_success "Database restore complete! 🔄"
separator

exit 0
