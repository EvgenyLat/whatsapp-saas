#!/bin/bash
##############################################################################
# Destroy Staging Environment
#
# Purpose: Safely destroy the staging infrastructure and clean up all resources
#
# Usage:
#   ./scripts/destroy-staging.sh [--force]
#
# Options:
#   --force    Skip confirmation prompts (use with caution)
#
# Prerequisites:
#   - AWS CLI configured with appropriate credentials
#   - Terraform installed (>= 1.5.0)
#   - jq installed for JSON parsing
#
# Environment Variables:
#   SLACK_WEBHOOK_URL - Slack webhook for notifications (optional)
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
TERRAFORM_DIR="$PROJECT_ROOT/terraform/environments/staging"
DESTRUCTION_LOG="$PROJECT_ROOT/logs/staging-destruction-$(date +%Y%m%d-%H%M%S).log"

# Parse command line arguments
FORCE_MODE=false
if [ "${1:-}" = "--force" ]; then
    FORCE_MODE=true
    shift
fi

# Create logs directory if it doesn't exist
mkdir -p "$PROJECT_ROOT/logs"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$DESTRUCTION_LOG"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$DESTRUCTION_LOG"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$DESTRUCTION_LOG"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$DESTRUCTION_LOG"
}

log_critical() {
    echo -e "${MAGENTA}[CRITICAL]${NC} $1" | tee -a "$DESTRUCTION_LOG"
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
        "title": "Staging Environment Destruction",
        "text": "$message",
        "footer": "WhatsApp SaaS Staging",
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
    log_error "Destruction failed at line $line_number"
    send_slack_notification "Staging environment destruction FAILED at line $line_number" "error"
    exit 1
}

trap 'error_handler ${LINENO}' ERR

# Confirmation prompt
confirm_destruction() {
    if [ "$FORCE_MODE" = true ]; then
        log_warning "Force mode enabled, skipping confirmation"
        return 0
    fi

    log_critical "=========================================="
    log_critical "WARNING: DESTRUCTIVE OPERATION"
    log_critical "=========================================="
    log_critical "This will PERMANENTLY DELETE all staging infrastructure including:"
    log_critical "  - RDS PostgreSQL database (all data will be lost)"
    log_critical "  - ElastiCache Redis cluster"
    log_critical "  - AWS Secrets Manager secrets"
    log_critical "  - Security groups"
    log_critical "  - CloudWatch log groups and logs"
    log_critical "  - SNS topics and subscriptions"
    log_critical ""
    log_warning "Database snapshots: ${SKIP_FINAL_SNAPSHOT:-enabled}"
    log_warning "This action CANNOT be undone!"
    log_critical ""

    read -p "Type 'destroy staging' to confirm: " confirmation

    if [ "$confirmation" != "destroy staging" ]; then
        log_info "Destruction cancelled by user"
        exit 0
    fi

    log_warning "Confirmed. Proceeding with destruction in 5 seconds..."
    log_warning "Press Ctrl+C to cancel"
    sleep 5
}

# Start destruction
log_info "=========================================="
log_info "Starting Staging Environment Destruction"
log_info "=========================================="
log_info "Timestamp: $(date)"
log_info "Project Root: $PROJECT_ROOT"
log_info "Terraform Directory: $TERRAFORM_DIR"
log_info ""

# Check prerequisites
log_info "Checking prerequisites..."

if ! command -v terraform &> /dev/null; then
    log_error "Terraform is not installed. Please install Terraform >= 1.5.0"
    exit 1
fi

if ! command -v aws &> /dev/null; then
    log_error "AWS CLI is not installed. Please install AWS CLI"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    log_error "jq is not installed. Please install jq for JSON parsing"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    log_error "AWS credentials not configured. Please configure AWS CLI"
    exit 1
fi

AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_USER=$(aws sts get-caller-identity --query Arn --output text)
log_info "AWS Account: $AWS_ACCOUNT_ID"
log_info "AWS User: $AWS_USER"

log_success "Prerequisites check passed"
log_info ""

# Check if Terraform state exists
if [ ! -d "$TERRAFORM_DIR" ]; then
    log_error "Terraform directory not found: $TERRAFORM_DIR"
    exit 1
fi

cd "$TERRAFORM_DIR"

# Initialize Terraform
log_info "Initializing Terraform..."
if terraform init > /dev/null 2>&1; then
    log_success "Terraform initialized"
else
    log_error "Terraform initialization failed"
    exit 1
fi

# Check if any resources exist
log_info "Checking for existing resources..."
RESOURCE_COUNT=$(terraform state list 2>/dev/null | wc -l || echo "0")

if [ "$RESOURCE_COUNT" -eq 0 ]; then
    log_warning "No resources found in Terraform state"
    log_info "Nothing to destroy"
    exit 0
fi

log_info "Found $RESOURCE_COUNT resources in Terraform state"
log_info ""

# Show what will be destroyed
log_info "Creating destruction plan..."
if terraform plan -destroy -out=destroy.tfplan 2>&1 | tee -a "$DESTRUCTION_LOG"; then
    log_success "Destruction plan created"
else
    log_error "Failed to create destruction plan"
    exit 1
fi
log_info ""

# Get confirmation
confirm_destruction

# Send notification
send_slack_notification "Starting staging environment destruction. This will delete all staging resources." "warning"

# Backup current state before destruction
log_info "Backing up current Terraform state..."
BACKUP_DIR="$PROJECT_ROOT/backups/staging-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

if [ -f ".terraform/terraform.tfstate" ]; then
    cp ".terraform/terraform.tfstate" "$BACKUP_DIR/terraform.tfstate.backup"
fi

# Save current outputs
if terraform output -json > "$BACKUP_DIR/outputs.json" 2>/dev/null; then
    log_success "Outputs backed up to: $BACKUP_DIR/outputs.json"
else
    log_warning "Could not back up outputs (might not exist)"
fi

# Export resource information before destruction
log_info "Exporting resource information..."

RDS_INSTANCE_ID=$(terraform output -raw rds_instance_id 2>/dev/null || echo "")
REDIS_CLUSTER_ID=$(terraform output -raw redis_cluster_id 2>/dev/null || echo "")
DATABASE_URL_SECRET_ARN=$(terraform output -raw database_url_secret_arn 2>/dev/null || echo "")
REDIS_URL_SECRET_ARN=$(terraform output -raw redis_url_secret_arn 2>/dev/null || echo "")

cat > "$BACKUP_DIR/resource_info.txt" <<EOF
Staging Environment Resources (Destroyed: $(date))
================================================

RDS Instance ID: $RDS_INSTANCE_ID
Redis Cluster ID: $REDIS_CLUSTER_ID
Database URL Secret ARN: $DATABASE_URL_SECRET_ARN
Redis URL Secret ARN: $REDIS_URL_SECRET_ARN

AWS Account: $AWS_ACCOUNT_ID
AWS User: $AWS_USER
EOF

log_success "Resource information saved to: $BACKUP_DIR/resource_info.txt"
log_info ""

# Create final database snapshot (optional)
if [ -n "$RDS_INSTANCE_ID" ] && [ "${CREATE_FINAL_SNAPSHOT:-true}" = "true" ]; then
    log_info "Creating final database snapshot..."
    SNAPSHOT_ID="staging-final-$(date +%Y%m%d-%H%M%S)"

    if aws rds create-db-snapshot \
        --db-instance-identifier "$RDS_INSTANCE_ID" \
        --db-snapshot-identifier "$SNAPSHOT_ID" \
        > /dev/null 2>&1; then
        log_success "Database snapshot initiated: $SNAPSHOT_ID"
        echo "RDS Snapshot: $SNAPSHOT_ID" >> "$BACKUP_DIR/resource_info.txt"
    else
        log_warning "Could not create database snapshot (instance might not exist)"
    fi
fi

# Destroy infrastructure
log_info ""
log_critical "Destroying staging infrastructure..."
log_critical "This will permanently delete all resources"
log_info ""

if terraform apply -auto-approve destroy.tfplan 2>&1 | tee -a "$DESTRUCTION_LOG"; then
    log_success "Terraform destroy completed successfully"
else
    log_error "Terraform destroy failed"
    log_error "Some resources might still exist. Please check AWS Console."
    send_slack_notification "Staging environment destruction FAILED. Manual cleanup may be required." "error"
    exit 1
fi

# Clean up plan file
rm -f destroy.tfplan

# Verify resources are destroyed
log_info ""
log_info "Verifying resource destruction..."

# Check RDS
if [ -n "$RDS_INSTANCE_ID" ]; then
    if aws rds describe-db-instances \
        --db-instance-identifier "$RDS_INSTANCE_ID" \
        > /dev/null 2>&1; then
        log_warning "RDS instance still exists (might be deleting)"
    else
        log_success "RDS instance destroyed"
    fi
fi

# Check Redis
if [ -n "$REDIS_CLUSTER_ID" ]; then
    if aws elasticache describe-cache-clusters \
        --cache-cluster-id "$REDIS_CLUSTER_ID" \
        > /dev/null 2>&1; then
        log_warning "Redis cluster still exists (might be deleting)"
    else
        log_success "Redis cluster destroyed"
    fi
fi

# Check Secrets Manager
for secret_arn in "$DATABASE_URL_SECRET_ARN" "$REDIS_URL_SECRET_ARN"; do
    if [ -n "$secret_arn" ] && [ "$secret_arn" != "N/A" ]; then
        if aws secretsmanager describe-secret \
            --secret-id "$secret_arn" \
            > /dev/null 2>&1; then
            log_warning "Secret still exists (might be in deletion window): $secret_arn"
        else
            log_success "Secret destroyed or scheduled for deletion"
        fi
    fi
done

# Destruction summary
log_info ""
log_info "=========================================="
log_info "Destruction Summary"
log_info "=========================================="
log_info "Status:               SUCCESS"
log_info "Environment:          staging"
log_info "Timestamp:            $(date)"
log_info "AWS Account:          $AWS_ACCOUNT_ID"
log_info "Backup Location:      $BACKUP_DIR"
log_info "Destruction Log:      $DESTRUCTION_LOG"
log_info ""
log_success "Staging environment destroyed successfully!"
log_info ""

# Send success notification
send_slack_notification "Staging environment destroyed successfully. All resources have been cleaned up. Backup saved to: $BACKUP_DIR" "success"

# Display important notes
log_info "=========================================="
log_info "Important Notes:"
log_info "=========================================="
log_info "1. Backup saved to: $BACKUP_DIR"
log_info ""
log_info "2. AWS Secrets Manager secrets are in deletion window (7 days)"
log_info "   They can be recovered during this period if needed."
log_info ""
log_info "3. RDS snapshots (if created) are retained and can be used for data recovery:"
if [ -n "${SNAPSHOT_ID:-}" ]; then
    log_info "   Final snapshot: $SNAPSHOT_ID"
fi
log_info "   View snapshots: aws rds describe-db-snapshots --query 'DBSnapshots[?contains(DBSnapshotIdentifier, \`staging\`)].DBSnapshotIdentifier'"
log_info ""
log_info "4. CloudWatch logs are deleted and cannot be recovered"
log_info ""
log_info "5. To recreate the environment, run:"
log_info "   ./scripts/deploy-staging-infrastructure.sh"
log_info ""

exit 0
