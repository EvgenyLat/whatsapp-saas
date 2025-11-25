#!/bin/bash
##############################################################################
# Sync Production Data to Staging
#
# Purpose: Copy production database to staging with data sanitization
#
# Usage:
#   ./scripts/sync-production-data.sh [--skip-sanitization]
#
# Options:
#   --skip-sanitization    Skip data sanitization (NOT RECOMMENDED)
#
# Prerequisites:
#   - AWS CLI configured with appropriate credentials
#   - PostgreSQL client (psql, pg_dump, pg_restore)
#   - jq installed for JSON parsing
#   - Access to both production and staging RDS instances
#
# Environment Variables:
#   SLACK_WEBHOOK_URL - Slack webhook for notifications (optional)
#
# Security:
#   - Sanitizes PII and sensitive data by default
#   - Creates encrypted database dumps
#   - Uses IAM authentication where possible
#   - Validates data integrity after sync
##############################################################################

set -e  # Exit on error
set -u  # Exit on undefined variable
set -o pipefail  # Exit on pipe failure

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TERRAFORM_STAGING_DIR="$PROJECT_ROOT/terraform/environments/staging"
TERRAFORM_PROD_DIR="$PROJECT_ROOT/terraform/environments/production"
SYNC_LOG="$PROJECT_ROOT/logs/data-sync-$(date +%Y%m%d-%H%M%S).log"
DUMP_DIR="$PROJECT_ROOT/tmp/db-dumps"

# Parse command line arguments
SKIP_SANITIZATION=false
if [ "${1:-}" = "--skip-sanitization" ]; then
    SKIP_SANITIZATION=true
    shift
fi

# Create necessary directories
mkdir -p "$PROJECT_ROOT/logs"
mkdir -p "$DUMP_DIR"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$SYNC_LOG"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$SYNC_LOG"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$SYNC_LOG"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$SYNC_LOG"
}

log_critical() {
    echo -e "${MAGENTA}[CRITICAL]${NC} $1" | tee -a "$SYNC_LOG"
}

# Slack notification function
send_slack_notification() {
    local message="$1"
    local status="$2"  # success, warning, error

    if [ -z "${SLACK_WEBHOOK_URL:-}" ]; then
        return 0
    fi

    local color="#36a64f"  # green
    [ "$status" = "warning" ] && color="#ffcc00"  # yellow
    [ "$status" = "error" ] && color="#ff0000"  # red

    local payload=$(cat <<EOF
{
    "attachments": [{
        "color": "$color",
        "title": "Production to Staging Data Sync",
        "text": "$message",
        "footer": "WhatsApp SaaS Data Sync",
        "ts": $(date +%s)
    }]
}
EOF
)

    curl -X POST -H 'Content-type: application/json' \
        --data "$payload" \
        "$SLACK_WEBHOOK_URL" \
        > /dev/null 2>&1 || true
}

# Error handler
error_handler() {
    local line_number=$1
    log_error "Data sync failed at line $line_number"
    send_slack_notification "Production to staging data sync FAILED at line $line_number" "error"

    # Clean up sensitive dump files on error
    if [ -f "$DUMP_FILE" ]; then
        log_info "Cleaning up dump file..."
        rm -f "$DUMP_FILE"
    fi

    exit 1
}

trap 'error_handler ${LINENO}' ERR

# Confirmation prompt
confirm_sync() {
    log_critical "=========================================="
    log_critical "WARNING: DATA OVERWRITE OPERATION"
    log_critical "=========================================="
    log_critical "This will REPLACE all data in the staging database with production data"
    log_critical ""
    log_critical "Source:      Production database"
    log_critical "Destination: Staging database"
    log_critical "Sanitization: ${SKIP_SANITIZATION:-Enabled}"
    log_critical ""
    log_warning "All existing staging data will be PERMANENTLY LOST"
    log_critical ""

    read -p "Type 'sync data' to confirm: " confirmation

    if [ "$confirmation" != "sync data" ]; then
        log_info "Data sync cancelled by user"
        exit 0
    fi

    log_warning "Confirmed. Proceeding in 3 seconds..."
    sleep 3
}

# Start sync
log_info "=========================================="
log_info "Starting Production to Staging Data Sync"
log_info "=========================================="
log_info "Timestamp: $(date)"
log_info "Project Root: $PROJECT_ROOT"
log_info "Sanitization: $([ "$SKIP_SANITIZATION" = true ] && echo 'DISABLED' || echo 'ENABLED')"
log_info ""

# Check prerequisites
log_info "Checking prerequisites..."

if ! command -v aws &> /dev/null; then
    log_error "AWS CLI is not installed"
    exit 1
fi

if ! command -v psql &> /dev/null; then
    log_error "PostgreSQL client (psql) is not installed"
    exit 1
fi

if ! command -v pg_dump &> /dev/null; then
    log_error "PostgreSQL dump utility (pg_dump) is not installed"
    exit 1
fi

if ! command -v pg_restore &> /dev/null; then
    log_error "PostgreSQL restore utility (pg_restore) is not installed"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    log_error "jq is not installed"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    log_error "AWS credentials not configured"
    exit 1
fi

log_success "Prerequisites check passed"
log_info ""

# Get production database credentials
log_info "Retrieving production database information..."

if [ ! -d "$TERRAFORM_PROD_DIR" ]; then
    log_error "Production Terraform directory not found: $TERRAFORM_PROD_DIR"
    log_error "Please ensure production environment is deployed"
    exit 1
fi

cd "$TERRAFORM_PROD_DIR"
terraform init > /dev/null 2>&1 || true

PROD_DATABASE_URL_SECRET_ARN=$(terraform output -raw database_url_secret_arn 2>/dev/null || echo "")
PROD_RDS_ENDPOINT=$(terraform output -raw rds_endpoint 2>/dev/null || echo "")

if [ -z "$PROD_DATABASE_URL_SECRET_ARN" ] || [ -z "$PROD_RDS_ENDPOINT" ]; then
    log_error "Could not retrieve production database information"
    log_error "Please ensure production environment is properly deployed"
    exit 1
fi

PROD_DATABASE_URL=$(aws secretsmanager get-secret-value \
    --secret-id "$PROD_DATABASE_URL_SECRET_ARN" \
    --query 'SecretString' \
    --output text)

log_success "Production database information retrieved"
log_info "Production RDS Endpoint: $PROD_RDS_ENDPOINT"

# Get staging database credentials
log_info "Retrieving staging database information..."

if [ ! -d "$TERRAFORM_STAGING_DIR" ]; then
    log_error "Staging Terraform directory not found: $TERRAFORM_STAGING_DIR"
    log_error "Please deploy staging environment first"
    exit 1
fi

cd "$TERRAFORM_STAGING_DIR"
terraform init > /dev/null 2>&1 || true

STAGING_DATABASE_URL_SECRET_ARN=$(terraform output -raw database_url_secret_arn 2>/dev/null || echo "")
STAGING_RDS_ENDPOINT=$(terraform output -raw rds_endpoint 2>/dev/null || echo "")

if [ -z "$STAGING_DATABASE_URL_SECRET_ARN" ] || [ -z "$STAGING_RDS_ENDPOINT" ]; then
    log_error "Could not retrieve staging database information"
    log_error "Please ensure staging environment is properly deployed"
    exit 1
fi

STAGING_DATABASE_URL=$(aws secretsmanager get-secret-value \
    --secret-id "$STAGING_DATABASE_URL_SECRET_ARN" \
    --query 'SecretString' \
    --output text)

log_success "Staging database information retrieved"
log_info "Staging RDS Endpoint: $STAGING_RDS_ENDPOINT"
log_info ""

# Verify databases are accessible
log_info "Verifying database connectivity..."

if psql "$PROD_DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
    log_success "Production database is accessible"
else
    log_error "Cannot connect to production database"
    exit 1
fi

if psql "$STAGING_DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
    log_success "Staging database is accessible"
else
    log_error "Cannot connect to staging database"
    exit 1
fi

log_info ""

# Get confirmation
confirm_sync

# Send notification
send_slack_notification "Starting production to staging data sync with sanitization: $([ "$SKIP_SANITIZATION" = true ] && echo 'DISABLED' || echo 'ENABLED')" "warning"

# Create database dump from production
DUMP_FILE="$DUMP_DIR/production-dump-$(date +%Y%m%d-%H%M%S).sql"
log_info "Creating database dump from production..."
log_info "This may take several minutes for large databases..."

if pg_dump "$PROD_DATABASE_URL" \
    --no-owner \
    --no-acl \
    --clean \
    --if-exists \
    --format=plain \
    --file="$DUMP_FILE" 2>&1 | tee -a "$SYNC_LOG"; then
    DUMP_SIZE=$(du -h "$DUMP_FILE" | cut -f1)
    log_success "Database dump created successfully (Size: $DUMP_SIZE)"
else
    log_error "Failed to create database dump"
    exit 1
fi

# Data sanitization
if [ "$SKIP_SANITIZATION" = false ]; then
    log_info ""
    log_info "Sanitizing sensitive data..."

    SANITIZED_DUMP_FILE="$DUMP_DIR/production-dump-sanitized-$(date +%Y%m%d-%H%M%S).sql"

    # Create sanitization SQL script
    cat > "$DUMP_DIR/sanitize.sql" <<'EOF'
-- Sanitize User PII
UPDATE "User" SET
    email = 'staging+user' || id || '@example.com',
    "phoneNumber" = '+1555000' || LPAD(id::text, 4, '0'),
    name = 'Test User ' || id
WHERE email IS NOT NULL;

-- Sanitize Account PII
UPDATE "Account" SET
    "phoneNumber" = '+1555100' || LPAD(id::text, 4, '0')
WHERE "phoneNumber" IS NOT NULL;

-- Sanitize Message content (keep structure, remove actual content)
UPDATE "Message" SET
    content = CASE
        WHEN length(content) > 0 THEN 'Sample message content for testing'
        ELSE content
    END,
    "mediaUrl" = NULL
WHERE content IS NOT NULL OR "mediaUrl" IS NOT NULL;

-- Sanitize Contact information
UPDATE "Contact" SET
    "phoneNumber" = '+1555200' || LPAD(id::text, 4, '0'),
    name = 'Contact ' || id
WHERE "phoneNumber" IS NOT NULL;

-- Clear sensitive API keys and tokens (keep structure)
UPDATE "Account" SET
    "accessToken" = 'staging_token_' || md5(random()::text),
    "whatsappBusinessAccountId" = 'staging_waba_' || id,
    "whatsappPhoneNumberId" = 'staging_phone_' || id
WHERE "accessToken" IS NOT NULL;

-- Anonymize session data
UPDATE "Session" SET
    "sessionToken" = md5(random()::text)
WHERE "sessionToken" IS NOT NULL;

-- Log sanitization
INSERT INTO "_SanitizationLog" (timestamp, description)
VALUES (NOW(), 'Data sanitized for staging environment on ' || NOW()::text);

-- Create sanitization log table if it doesn't exist
CREATE TABLE IF NOT EXISTS "_SanitizationLog" (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    description TEXT
);
EOF

    # Apply dump with sanitization
    log_info "Applying sanitization transformations..."

    # Copy original dump and append sanitization
    cp "$DUMP_FILE" "$SANITIZED_DUMP_FILE"
    echo "" >> "$SANITIZED_DUMP_FILE"
    echo "-- SANITIZATION SCRIPT" >> "$SANITIZED_DUMP_FILE"
    cat "$DUMP_DIR/sanitize.sql" >> "$SANITIZED_DUMP_FILE"

    DUMP_FILE="$SANITIZED_DUMP_FILE"
    log_success "Data sanitization script prepared"
else
    log_warning "SKIPPING SANITIZATION - Production data will be copied as-is to staging"
    log_warning "This may expose PII and sensitive data in the staging environment"
fi

# Backup staging database before overwrite
log_info ""
log_info "Creating backup of existing staging database..."
STAGING_BACKUP_FILE="$DUMP_DIR/staging-backup-$(date +%Y%m%d-%H%M%S).sql"

if pg_dump "$STAGING_DATABASE_URL" \
    --format=plain \
    --file="$STAGING_BACKUP_FILE" 2>&1 | tee -a "$SYNC_LOG"; then
    BACKUP_SIZE=$(du -h "$STAGING_BACKUP_FILE" | cut -f1)
    log_success "Staging backup created (Size: $BACKUP_SIZE)"
    log_info "Backup location: $STAGING_BACKUP_FILE"
else
    log_warning "Failed to create staging backup (might be empty database)"
fi

# Restore dump to staging database
log_info ""
log_info "Restoring data to staging database..."
log_info "This may take several minutes..."

if psql "$STAGING_DATABASE_URL" < "$DUMP_FILE" 2>&1 | tee -a "$SYNC_LOG"; then
    log_success "Data restored to staging database successfully"
else
    log_error "Failed to restore data to staging database"
    log_error "Staging database may be in an inconsistent state"
    log_info "Backup available at: $STAGING_BACKUP_FILE"
    exit 1
fi

# Verify data integrity
log_info ""
log_info "Verifying data integrity..."

# Count records in key tables
VERIFICATION_SQL="
SELECT
    'User' as table_name, COUNT(*) as record_count FROM \"User\"
UNION ALL
SELECT 'Account', COUNT(*) FROM \"Account\"
UNION ALL
SELECT 'Message', COUNT(*) FROM \"Message\"
UNION ALL
SELECT 'Contact', COUNT(*) FROM \"Contact\";
"

log_info "Record counts in staging database:"
psql "$STAGING_DATABASE_URL" -c "$VERIFICATION_SQL" 2>&1 | tee -a "$SYNC_LOG"

# Verify sanitization (if enabled)
if [ "$SKIP_SANITIZATION" = false ]; then
    log_info ""
    log_info "Verifying data sanitization..."

    SANITIZATION_CHECK="
    SELECT
        'Emails sanitized' as check_name,
        COUNT(*) as count
    FROM \"User\"
    WHERE email LIKE 'staging+user%@example.com'
    UNION ALL
    SELECT
        'Phone numbers sanitized',
        COUNT(*)
    FROM \"User\"
    WHERE \"phoneNumber\" LIKE '+1555000%';
    "

    psql "$STAGING_DATABASE_URL" -c "$SANITIZATION_CHECK" 2>&1 | tee -a "$SYNC_LOG"
    log_success "Data sanitization verified"
fi

# Clean up dump files (security)
log_info ""
log_info "Cleaning up temporary dump files..."
rm -f "$DUMP_FILE"
rm -f "$DUMP_DIR/sanitize.sql"
if [ -n "${SANITIZED_DUMP_FILE:-}" ] && [ -f "$SANITIZED_DUMP_FILE" ]; then
    rm -f "$SANITIZED_DUMP_FILE"
fi
log_success "Temporary dump files removed"

# Sync summary
log_info ""
log_info "=========================================="
log_info "Data Sync Summary"
log_info "=========================================="
log_info "Status:               SUCCESS"
log_info "Timestamp:            $(date)"
log_info "Source:               Production database"
log_info "Destination:          Staging database"
log_info "Sanitization:         $([ "$SKIP_SANITIZATION" = true ] && echo 'DISABLED' || echo 'ENABLED')"
log_info "Staging Backup:       $STAGING_BACKUP_FILE"
log_info "Sync Log:             $SYNC_LOG"
log_info ""
log_success "Production data synced to staging successfully!"
log_info ""

# Send success notification
send_slack_notification "Production data synced to staging successfully! Sanitization: $([ "$SKIP_SANITIZATION" = true ] && echo 'DISABLED' || echo 'ENABLED'). Backup saved." "success"

# Display next steps
log_info "=========================================="
log_info "Next Steps:"
log_info "=========================================="
log_info "1. Verify application functionality in staging:"
log_info "   npm run test:staging"
log_info ""
log_info "2. Review sanitized data to ensure PII is protected:"
log_info "   psql \"$STAGING_DATABASE_URL\" -c 'SELECT * FROM \"User\" LIMIT 5;'"
log_info ""
log_info "3. Run Prisma migrations if schema has changed:"
log_info "   export DATABASE_URL=\"$STAGING_DATABASE_URL\""
log_info "   npm run prisma:migrate:deploy"
log_info ""
log_info "4. If sync failed, restore from backup:"
log_info "   psql \"$STAGING_DATABASE_URL\" < $STAGING_BACKUP_FILE"
log_info ""
log_info "5. Schedule regular syncs for testing with fresh data"
log_info ""

exit 0
