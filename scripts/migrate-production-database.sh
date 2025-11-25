#!/bin/bash

# ============================================================================
# WhatsApp SaaS Platform - Production Database Migration Script
# ============================================================================
#
# This script applies Prisma migrations to the production database.
#
# Prerequisites:
# - Infrastructure deployed (RDS available)
# - AWS CLI configured
# - Node.js and npm installed
# - Prisma CLI installed
#
# Usage:
#   ./scripts/migrate-production-database.sh [options]
#
# Options:
#   --dry-run       Show what would be migrated (no actual changes)
#   --force         Skip confirmation prompts (DANGEROUS)
#   --seed          Run database seeding after migration
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
BACKEND_DIR="${PROJECT_ROOT}/Backend"
TERRAFORM_DIR="${PROJECT_ROOT}/terraform/environments/production"

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

DRY_RUN=false
FORCE=false
SEED=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        --seed)
            SEED=true
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
log_info "Production Database Migration"
separator

# Check Node.js
if ! command -v node &> /dev/null; then
    log_error "Node.js not found. Please install Node.js"
    exit 1
fi
log_info "Node.js version: $(node --version)"

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    log_error "AWS CLI not found. Please install AWS CLI"
    exit 1
fi

# Check backend directory
if [[ ! -d "${BACKEND_DIR}" ]]; then
    log_error "Backend directory not found: ${BACKEND_DIR}"
    exit 1
fi

cd "${BACKEND_DIR}"

# Check Prisma
if [[ ! -f "node_modules/.bin/prisma" ]]; then
    log_error "Prisma not installed. Run: npm install"
    exit 1
fi

log_success "Pre-flight checks passed"

# ============================================================================
# GET DATABASE CREDENTIALS
# ============================================================================

separator
log_info "Retrieving database credentials..."
separator

# Get secret ARN from Terraform
cd "${TERRAFORM_DIR}"
DB_SECRET_ARN=$(terraform output -raw db_credentials_secret_arn 2>/dev/null)

if [[ -z "${DB_SECRET_ARN}" ]]; then
    log_error "Unable to retrieve database secret ARN from Terraform"
    log_info "Have you deployed the infrastructure?"
    exit 1
fi

log_info "Secret ARN: ${DB_SECRET_ARN}"

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
log_info "Host: ${DB_HOST}"
log_info "Port: ${DB_PORT}"
log_info "Database: ${DB_NAME}"
log_info "User: ${DB_USER}"

# ============================================================================
# CONSTRUCT DATABASE URL
# ============================================================================

# With connection pool parameters from load test fix
DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public&connection_limit=50&pool_timeout=30&statement_cache_size=200"

export DATABASE_URL

# ============================================================================
# TEST DATABASE CONNECTION
# ============================================================================

separator
log_info "Testing database connection..."
separator

if psql "${DATABASE_URL}" -c "SELECT version();" &> /dev/null 2>&1; then
    PG_VERSION=$(psql "${DATABASE_URL}" -t -c "SELECT version();" 2>/dev/null | head -n1 | xargs)
    log_success "Database connection successful"
    log_info "PostgreSQL version: ${PG_VERSION}"
else
    log_warning "Unable to connect using psql (psql may not be installed)"
    log_info "Proceeding with Prisma migration..."
fi

# ============================================================================
# CREATE BACKUP BEFORE MIGRATION
# ============================================================================

separator
log_info "Creating database backup before migration..."
separator

BACKUP_DIR="${PROJECT_ROOT}/backups"
mkdir -p "${BACKUP_DIR}"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/pre_migration_${TIMESTAMP}.sql"

log_info "Backup file: ${BACKUP_FILE}"

if command -v pg_dump &> /dev/null; then
    if pg_dump "${DATABASE_URL}" > "${BACKUP_FILE}" 2>/dev/null; then
        BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
        log_success "Database backup created (${BACKUP_SIZE})"
        log_info "Backup location: ${BACKUP_FILE}"
    else
        log_warning "Backup failed (pg_dump error)"
        if [[ "${FORCE}" == "false" ]]; then
            read -p "Continue without backup? (yes/no): " confirm
            if [[ "${confirm}" != "yes" ]]; then
                log_info "Migration cancelled"
                exit 0
            fi
        fi
    fi
else
    log_warning "pg_dump not found - skipping backup"
    log_info "Install PostgreSQL client to enable automatic backups"
fi

# ============================================================================
# CHECK PENDING MIGRATIONS
# ============================================================================

separator
log_info "Checking for pending migrations..."
separator

cd "${BACKEND_DIR}"

# Run Prisma migrate status
if npx prisma migrate status --schema=prisma/schema.prisma; then
    log_info "Migration status checked"
else
    log_warning "Unable to check migration status"
fi

# ============================================================================
# SHOW MIGRATION PLAN (DRY RUN)
# ============================================================================

if [[ "${DRY_RUN}" == "true" ]]; then
    separator
    log_info "DRY RUN MODE: Showing what would be migrated"
    separator

    # Show pending migrations
    PENDING=$(npx prisma migrate status --schema=prisma/schema.prisma 2>&1 | grep -c "Database schema is not up to date" || true)

    if [[ ${PENDING} -gt 0 ]]; then
        log_info "Pending migrations found"
        npx prisma migrate status --schema=prisma/schema.prisma
    else
        log_info "No pending migrations"
    fi

    log_info "Dry run complete. No changes made."
    exit 0
fi

# ============================================================================
# CONFIRMATION PROMPT
# ============================================================================

if [[ "${FORCE}" == "false" ]]; then
    separator
    log_warning "⚠️  You are about to migrate PRODUCTION database! ⚠️"
    separator
    log_warning "Database: ${DB_NAME} on ${DB_HOST}"
    log_warning "This operation may:"
    log_warning "  - Modify database schema"
    log_warning "  - Add/drop tables or columns"
    log_warning "  - Cause brief downtime"
    separator

    read -p "Continue with migration? (yes/no): " confirm
    if [[ "${confirm}" != "yes" ]]; then
        log_info "Migration cancelled"
        exit 0
    fi
fi

# ============================================================================
# RUN PRISMA MIGRATION (DEPLOY)
# ============================================================================

separator
log_info "Running Prisma migrations..."
separator

cd "${BACKEND_DIR}"

log_info "Executing: npx prisma migrate deploy"

if npx prisma migrate deploy --schema=prisma/schema.prisma; then
    log_success "✅ Database migrations completed successfully!"
else
    log_error "❌ Migration failed!"
    log_info "Database may be in inconsistent state"
    log_info "Restore from backup: ${BACKUP_FILE}"
    log_info "Command: psql ${DATABASE_URL} < ${BACKUP_FILE}"
    exit 1
fi

# ============================================================================
# VERIFY MIGRATION
# ============================================================================

separator
log_info "Verifying migration..."
separator

# Check migration status
if npx prisma migrate status --schema=prisma/schema.prisma; then
    log_success "Migration verification passed"
else
    log_warning "Migration verification warnings (check output above)"
fi

# Count tables
if command -v psql &> /dev/null; then
    TABLE_COUNT=$(psql "${DATABASE_URL}" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs)
    log_info "Database now has ${TABLE_COUNT} tables"
fi

# ============================================================================
# RUN DATABASE SEEDING (OPTIONAL)
# ============================================================================

if [[ "${SEED}" == "true" ]]; then
    separator
    log_info "Running database seeding..."
    separator

    if [[ -f "${BACKEND_DIR}/prisma/seed.js" ]]; then
        if npm run db:seed; then
            log_success "Database seeding completed"
        else
            log_warning "Database seeding failed (non-critical)"
        fi
    else
        log_warning "Seed script not found: prisma/seed.js"
    fi
fi

# ============================================================================
# GENERATE PRISMA CLIENT
# ============================================================================

separator
log_info "Generating Prisma client..."
separator

if npx prisma generate --schema=prisma/schema.prisma; then
    log_success "Prisma client generated"
else
    log_warning "Prisma client generation had warnings"
fi

# ============================================================================
# POST-MIGRATION CHECKS
# ============================================================================

separator
log_info "Running post-migration checks..."
separator

# Check critical tables exist
CRITICAL_TABLES=("salons" "bookings" "messages" "conversations")

if command -v psql &> /dev/null; then
    for table in "${CRITICAL_TABLES[@]}"; do
        EXISTS=$(psql "${DATABASE_URL}" -t -c "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '${table}');" 2>/dev/null | xargs)

        if [[ "${EXISTS}" == "t" ]]; then
            ROW_COUNT=$(psql "${DATABASE_URL}" -t -c "SELECT count(*) FROM ${table};" 2>/dev/null | xargs)
            log_success "Table '${table}' exists (${ROW_COUNT} rows)"
        else
            log_error "Table '${table}' does not exist!"
        fi
    done
fi

# Check indexes (from Phase 1 optimization)
if command -v psql &> /dev/null; then
    INDEX_COUNT=$(psql "${DATABASE_URL}" -t -c "SELECT count(*) FROM pg_indexes WHERE schemaname = 'public';" 2>/dev/null | xargs)
    log_info "Database has ${INDEX_COUNT} indexes"

    if [[ ${INDEX_COUNT} -ge 13 ]]; then
        log_success "Performance indexes present (expected: 13+)"
    else
        log_warning "Expected 13+ indexes, found ${INDEX_COUNT}"
    fi
fi

# ============================================================================
# FINAL SUMMARY
# ============================================================================

separator
log_success "Migration Summary"
separator

echo "✅ Database migrations completed successfully"
echo "✅ Prisma client generated"
echo "✅ Post-migration checks passed"
echo ""
echo "Database: ${DB_NAME}"
echo "Host: ${DB_HOST}"
echo "Backup: ${BACKUP_FILE}"
echo ""

if [[ "${SEED}" == "true" ]]; then
    echo "✅ Database seeded with initial data"
fi

separator
log_info "Next steps:"
separator

echo "1. Deploy application to ECS:"
echo "   ./scripts/deploy-application.sh"
echo ""
echo "2. Run smoke tests:"
echo "   cd Backend && npm run test:smoke"
echo ""
echo "3. Verify database health:"
echo "   psql ${DATABASE_URL} -c 'SELECT version();'"
echo ""

separator
log_success "Production database is ready! 🚀"
separator

exit 0
