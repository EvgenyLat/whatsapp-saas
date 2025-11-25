#!/bin/bash

# ============================================================================
# WhatsApp SaaS Platform - Database Backup Script
# ============================================================================
#
# This script creates a backup of the production PostgreSQL database.
#
# Prerequisites:
# - AWS CLI configured
# - PostgreSQL client (pg_dump) installed
# - Infrastructure deployed (RDS available)
#
# Usage:
#   ./scripts/backup-database.sh [options]
#
# Options:
#   --manual        Create manual backup (uploaded to S3)
#   --local-only    Create local backup only (no S3 upload)
#   --snapshot      Create RDS snapshot instead of pg_dump
#   --help          Show this help message
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

MANUAL_BACKUP=false
LOCAL_ONLY=false
SNAPSHOT=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --manual)
            MANUAL_BACKUP=true
            shift
            ;;
        --local-only)
            LOCAL_ONLY=true
            shift
            ;;
        --snapshot)
            SNAPSHOT=true
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
# PRE-FLIGHT CHECKS
# ============================================================================

separator
log_info "Database Backup"
separator

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    log_error "AWS CLI not found. Please install AWS CLI"
    exit 1
fi

# Check pg_dump if not using snapshot
if [[ "${SNAPSHOT}" == "false" ]] && ! command -v pg_dump &> /dev/null; then
    log_error "pg_dump not found. Please install PostgreSQL client tools"
    log_info "Alternative: Use --snapshot to create RDS snapshot instead"
    exit 1
fi

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# ============================================================================
# GET DATABASE CREDENTIALS
# ============================================================================

separator
log_info "Retrieving database information..."
separator

cd "${TERRAFORM_DIR}"

# Get RDS instance identifier
DB_IDENTIFIER=$(terraform output -raw database_endpoint 2>/dev/null | cut -d: -f1 || echo "")

if [[ -z "${DB_IDENTIFIER}" ]]; then
    log_error "Unable to retrieve database endpoint from Terraform"
    log_info "Have you deployed the infrastructure?"
    exit 1
fi

log_info "Database Instance: ${DB_IDENTIFIER}"

# ============================================================================
# CREATE RDS SNAPSHOT
# ============================================================================

if [[ "${SNAPSHOT}" == "true" ]]; then
    separator
    log_info "Creating RDS snapshot..."
    separator

    TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
    SNAPSHOT_ID="whatsapp-saas-prod-manual-${TIMESTAMP}"

    if [[ "${MANUAL_BACKUP}" == "true" ]]; then
        SNAPSHOT_ID="whatsapp-saas-prod-manual-${TIMESTAMP}"
    else
        SNAPSHOT_ID="whatsapp-saas-prod-auto-${TIMESTAMP}"
    fi

    log_info "Snapshot ID: ${SNAPSHOT_ID}"

    aws rds create-db-snapshot \
        --db-instance-identifier "${DB_IDENTIFIER}" \
        --db-snapshot-identifier "${SNAPSHOT_ID}" \
        --region "${AWS_REGION}" \
        --tags "Key=Type,Value=$(if [[ "${MANUAL_BACKUP}" == "true" ]]; then echo "Manual"; else echo "Automated"; fi)" \
        --tags "Key=Date,Value=$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

    log_info "Waiting for snapshot to complete (this may take several minutes)..."

    aws rds wait db-snapshot-completed \
        --db-snapshot-identifier "${SNAPSHOT_ID}" \
        --region "${AWS_REGION}"

    log_success "RDS snapshot created: ${SNAPSHOT_ID}"

    # Get snapshot size
    SNAPSHOT_SIZE=$(aws rds describe-db-snapshots \
        --db-snapshot-identifier "${SNAPSHOT_ID}" \
        --region "${AWS_REGION}" \
        --query 'DBSnapshots[0].AllocatedStorage' \
        --output text)

    log_info "Snapshot size: ${SNAPSHOT_SIZE}GB"

    separator
    log_success "Backup Summary"
    separator

    echo "Type: RDS Snapshot"
    echo "Snapshot ID: ${SNAPSHOT_ID}"
    echo "Size: ${SNAPSHOT_SIZE}GB"
    echo "Retention: 7 days (automatic snapshots), indefinite (manual snapshots)"
    echo ""
    echo "To restore from this snapshot:"
    echo "  aws rds restore-db-instance-from-db-snapshot \\"
    echo "    --db-instance-identifier whatsapp-saas-prod-restored \\"
    echo "    --db-snapshot-identifier ${SNAPSHOT_ID}"

    exit 0
fi

# ============================================================================
# GET DATABASE CONNECTION STRING
# ============================================================================

# Get secret ARN
DB_SECRET_ARN=$(terraform output -raw db_credentials_secret_arn 2>/dev/null)

if [[ -z "${DB_SECRET_ARN}" ]]; then
    log_error "Unable to retrieve database secret ARN from Terraform"
    exit 1
fi

log_info "Retrieving database credentials..."

# Retrieve secret value
DB_SECRET=$(aws secretsmanager get-secret-value \
    --secret-id "${DB_SECRET_ARN}" \
    --region "${AWS_REGION}" \
    --query SecretString \
    --output text 2>/dev/null)

if [[ -z "${DB_SECRET}" ]]; then
    log_error "Unable to retrieve database credentials from Secrets Manager"
    exit 1
fi

# Parse credentials
DB_HOST=$(echo "${DB_SECRET}" | jq -r '.host')
DB_PORT=$(echo "${DB_SECRET}" | jq -r '.port')
DB_NAME=$(echo "${DB_SECRET}" | jq -r '.dbname')
DB_USER=$(echo "${DB_SECRET}" | jq -r '.username')
DB_PASS=$(echo "${DB_SECRET}" | jq -r '.password')

log_success "Database credentials retrieved"

# ============================================================================
# CREATE PG_DUMP BACKUP
# ============================================================================

separator
log_info "Creating database backup with pg_dump..."
separator

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILENAME="whatsapp_saas_prod_${TIMESTAMP}.sql"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILENAME}"

log_info "Backup file: ${BACKUP_FILENAME}"

# Set PGPASSWORD for pg_dump
export PGPASSWORD="${DB_PASS}"

# Create backup
log_info "Running pg_dump (this may take several minutes)..."

if pg_dump \
    -h "${DB_HOST}" \
    -p "${DB_PORT}" \
    -U "${DB_USER}" \
    -d "${DB_NAME}" \
    --format=custom \
    --compress=9 \
    --verbose \
    --file="${BACKUP_PATH}" 2>&1 | tee "${BACKUP_PATH}.log"; then

    log_success "Database backup created"
else
    log_error "pg_dump failed"
    exit 1
fi

# Unset PGPASSWORD
unset PGPASSWORD

# Get backup size
BACKUP_SIZE=$(du -h "${BACKUP_PATH}" | cut -f1)
log_info "Backup size: ${BACKUP_SIZE}"

# ============================================================================
# UPLOAD TO S3
# ============================================================================

if [[ "${LOCAL_ONLY}" == "false" ]]; then
    separator
    log_info "Uploading backup to S3..."
    separator

    # Get S3 bucket name
    BACKUP_BUCKET=$(terraform output -raw backups_bucket_name 2>/dev/null)

    if [[ -z "${BACKUP_BUCKET}" ]]; then
        log_warning "Unable to retrieve backup bucket name"
        log_warning "Skipping S3 upload"
    else
        S3_KEY="database-backups/${BACKUP_FILENAME}"
        S3_URL="s3://${BACKUP_BUCKET}/${S3_KEY}"

        log_info "Uploading to: ${S3_URL}"

        if aws s3 cp "${BACKUP_PATH}" "${S3_URL}" \
            --region "${AWS_REGION}" \
            --storage-class STANDARD_IA \
            --metadata "timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ"),type=$(if [[ "${MANUAL_BACKUP}" == "true" ]]; then echo "manual"; else echo "automated"; fi)"; then

            log_success "Backup uploaded to S3"

            # Also upload the log file
            aws s3 cp "${BACKUP_PATH}.log" "${S3_URL}.log" \
                --region "${AWS_REGION}" \
                --storage-class STANDARD_IA &> /dev/null

            log_info "S3 location: ${S3_URL}"
        else
            log_warning "S3 upload failed (backup is still available locally)"
        fi
    fi
fi

# ============================================================================
# BACKUP SUMMARY
# ============================================================================

separator
log_success "Backup Summary"
separator

echo "Type: pg_dump (SQL dump)"
echo "File: ${BACKUP_PATH}"
echo "Size: ${BACKUP_SIZE}"
echo "Database: ${DB_NAME}"
echo "Timestamp: $(date)"
echo ""

if [[ "${LOCAL_ONLY}" == "false" ]] && [[ -n "${BACKUP_BUCKET:-}" ]]; then
    echo "S3 Location: s3://${BACKUP_BUCKET}/database-backups/${BACKUP_FILENAME}"
    echo "Retention: 30 days (S3 lifecycle policy)"
    echo ""
fi

echo "To restore from this backup:"
echo "  pg_restore -h <host> -U <user> -d <database> ${BACKUP_PATH}"
echo ""
echo "Or use the restore script:"
echo "  ./scripts/restore-database.sh --backup ${BACKUP_FILENAME}"

separator
log_success "Database backup complete! 💾"
separator

exit 0
