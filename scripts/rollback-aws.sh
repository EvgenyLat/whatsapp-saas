#!/bin/bash

################################################################################
# AWS Infrastructure Rollback Script
# WhatsApp SaaS Starter - MVP Environment
################################################################################

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TERRAFORM_DIR="terraform/environments/mvp"
STATE_BUCKET="whatsapp-saas-terraform-state"
STATE_KEY="mvp/terraform.tfstate"
LOCK_TABLE="whatsapp-saas-terraform-locks"
AWS_REGION="${AWS_REGION:-us-east-1}"

################################################################################
# Helper Functions
################################################################################

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

check_prerequisites() {
    log_info "Checking prerequisites..."

    if ! command -v terraform &> /dev/null; then
        log_error "Terraform is not installed"
        exit 1
    fi

    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed"
        exit 1
    fi

    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured"
        exit 1
    fi

    log_success "Prerequisites check passed"
}

disable_deletion_protection() {
    log_info "Checking for resources with deletion protection..."

    cd "${TERRAFORM_DIR}"

    # Get RDS instance identifier from state
    local rds_id=$(terraform output -raw rds_database_name 2>/dev/null || echo "")

    if [ -n "$rds_id" ]; then
        log_info "Disabling deletion protection on RDS instance..."

        # Modify RDS to disable deletion protection
        aws rds modify-db-instance \
            --db-instance-identifier "whatsapp-saas-mvp-postgres" \
            --no-deletion-protection \
            --apply-immediately \
            --region "${AWS_REGION}" 2>/dev/null || true

        log_success "Deletion protection disabled (if it was enabled)"

        # Wait for modification to complete
        log_info "Waiting for RDS modification to complete (this may take a few minutes)..."
        aws rds wait db-instance-available \
            --db-instance-identifier "whatsapp-saas-mvp-postgres" \
            --region "${AWS_REGION}" 2>/dev/null || true
    fi

    cd - > /dev/null
}

create_final_backup() {
    log_info "Creating final backup of RDS database..."

    local snapshot_id="whatsapp-saas-mvp-final-backup-$(date +%Y%m%d-%H%M%S)"

    aws rds create-db-snapshot \
        --db-instance-identifier "whatsapp-saas-mvp-postgres" \
        --db-snapshot-identifier "${snapshot_id}" \
        --region "${AWS_REGION}" 2>/dev/null || true

    log_success "Final snapshot created: ${snapshot_id}"
    log_info "This snapshot will be retained for 7 days before manual deletion"
}

terraform_destroy() {
    log_info "Running Terraform destroy..."

    cd "${TERRAFORM_DIR}"

    # Initialize if needed
    terraform init \
        -backend-config="bucket=${STATE_BUCKET}" \
        -backend-config="key=${STATE_KEY}" \
        -backend-config="region=${AWS_REGION}" \
        -backend-config="dynamodb_table=${LOCK_TABLE}" \
        -backend-config="encrypt=true" \
        > /dev/null 2>&1 || true

    # Plan destroy
    terraform plan -destroy -out=destroy.tfplan

    log_warning "About to DESTROY all infrastructure resources!"
    log_warning "This action CANNOT be undone!"
    echo ""
    read -p "Type 'destroy' to confirm: " confirm

    if [ "$confirm" != "destroy" ]; then
        log_error "Rollback cancelled by user"
        rm -f destroy.tfplan
        cd - > /dev/null
        exit 1
    fi

    # Apply destroy
    terraform apply destroy.tfplan
    rm -f destroy.tfplan

    log_success "Infrastructure destroyed"

    cd - > /dev/null
}

cleanup_state() {
    log_info "Cleaning up Terraform state..."

    cd "${TERRAFORM_DIR}"

    # Remove local state files
    rm -f terraform.tfstate terraform.tfstate.backup
    rm -f .terraform.lock.hcl
    rm -rf .terraform

    log_success "Local Terraform files cleaned up"

    cd - > /dev/null
}

cleanup_backend() {
    log_warning "Backend cleanup is optional and will remove S3 bucket and DynamoDB table"
    read -p "Remove backend infrastructure (S3 + DynamoDB)? (yes/no): " cleanup_backend

    if [ "$cleanup_backend" = "yes" ]; then
        log_info "Removing backend infrastructure..."

        # Empty S3 bucket
        log_info "Emptying S3 bucket..."
        aws s3 rm "s3://${STATE_BUCKET}" --recursive --region "${AWS_REGION}" 2>/dev/null || true

        # Delete S3 bucket
        log_info "Deleting S3 bucket..."
        aws s3api delete-bucket \
            --bucket "${STATE_BUCKET}" \
            --region "${AWS_REGION}" 2>/dev/null || true

        # Delete DynamoDB table
        log_info "Deleting DynamoDB table..."
        aws dynamodb delete-table \
            --table-name "${LOCK_TABLE}" \
            --region "${AWS_REGION}" 2>/dev/null || true

        log_success "Backend infrastructure removed"
    else
        log_info "Backend infrastructure preserved"
        log_info "S3 bucket: ${STATE_BUCKET}"
        log_info "DynamoDB table: ${LOCK_TABLE}"
    fi
}

list_remaining_resources() {
    log_info "Checking for remaining AWS resources..."

    echo ""
    log_info "RDS Snapshots:"
    aws rds describe-db-snapshots \
        --query "DBSnapshots[?contains(DBSnapshotIdentifier, 'whatsapp-saas')].{ID:DBSnapshotIdentifier,Created:SnapshotCreateTime,Size:AllocatedStorage}" \
        --output table \
        --region "${AWS_REGION}" 2>/dev/null || echo "  None found"

    echo ""
    log_info "Secrets Manager Secrets:"
    aws secretsmanager list-secrets \
        --query "SecretList[?contains(Name, 'whatsapp-saas')].{Name:Name,LastChanged:LastChangedDate}" \
        --output table \
        --region "${AWS_REGION}" 2>/dev/null || echo "  None found"

    echo ""
    log_info "CloudWatch Log Groups:"
    aws logs describe-log-groups \
        --query "logGroups[?contains(logGroupName, 'whatsapp-saas')].{Name:logGroupName,Size:storedBytes}" \
        --output table \
        --region "${AWS_REGION}" 2>/dev/null || echo "  None found"
}

manual_cleanup_instructions() {
    echo ""
    log_info "Manual cleanup may be required for:"
    echo ""
    echo "1. RDS Final Snapshots:"
    echo "   aws rds delete-db-snapshot --db-snapshot-identifier <snapshot-id>"
    echo ""
    echo "2. Secrets Manager Secrets (in recovery):"
    echo "   aws secretsmanager delete-secret --secret-id <secret-arn> --force-delete-without-recovery"
    echo ""
    echo "3. CloudWatch Log Groups:"
    echo "   aws logs delete-log-group --log-group-name <log-group-name>"
    echo ""
    echo "4. S3 Backend Bucket (if preserved):"
    echo "   aws s3 rb s3://${STATE_BUCKET} --force"
    echo ""
    echo "5. DynamoDB Lock Table (if preserved):"
    echo "   aws dynamodb delete-table --table-name ${LOCK_TABLE}"
}

################################################################################
# Main Script
################################################################################

main() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║         AWS Infrastructure Rollback Script                     ║"
    echo "║         WhatsApp SaaS Starter - MVP Environment                ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""

    log_warning "This script will DESTROY all AWS infrastructure!"
    log_warning "Make sure you have backed up all data before proceeding!"
    echo ""

    # Check prerequisites
    check_prerequisites
    echo ""

    # Create final backup
    log_info "Step 1: Creating final backup..."
    read -p "Create final RDS snapshot before destroying? (yes/no): " create_backup

    if [ "$create_backup" = "yes" ]; then
        create_final_backup
    fi
    echo ""

    # Disable deletion protection
    log_info "Step 2: Disabling deletion protection..."
    disable_deletion_protection
    echo ""

    # Destroy infrastructure
    log_info "Step 3: Destroying infrastructure..."
    terraform_destroy
    echo ""

    # Cleanup state
    log_info "Step 4: Cleaning up local state..."
    cleanup_state
    echo ""

    # Cleanup backend (optional)
    log_info "Step 5: Backend cleanup..."
    cleanup_backend
    echo ""

    # List remaining resources
    list_remaining_resources
    echo ""

    # Manual cleanup instructions
    manual_cleanup_instructions
    echo ""

    log_success "Rollback completed!"
    log_info "Please verify all resources have been removed in AWS Console"
}

# Handle script arguments
case "${1:-rollback}" in
    rollback)
        main
        ;;
    list)
        check_prerequisites
        list_remaining_resources
        ;;
    force-destroy)
        check_prerequisites
        disable_deletion_protection
        terraform_destroy
        cleanup_state
        log_success "Force destroy completed"
        ;;
    *)
        echo "Usage: $0 {rollback|list|force-destroy}"
        echo ""
        echo "Commands:"
        echo "  rollback       - Full rollback with prompts (default)"
        echo "  list           - List remaining AWS resources"
        echo "  force-destroy  - Destroy without backup (dangerous!)"
        exit 1
        ;;
esac
