#!/bin/bash

# ============================================================================
# WhatsApp SaaS Platform - Production Infrastructure Deployment Script
# ============================================================================
#
# This script deploys the complete AWS infrastructure for production.
#
# Prerequisites:
# - AWS CLI configured with appropriate credentials
# - Terraform >= 1.0 installed
# - Sufficient AWS permissions (AdministratorAccess or similar)
#
# Usage:
#   ./scripts/deploy-production-infrastructure.sh [options]
#
# Options:
#   --plan-only     Run terraform plan only (no apply)
#   --auto-approve  Skip confirmation prompt
#   --destroy       Destroy infrastructure (DANGEROUS)
#   --help          Show this help message
#
# ============================================================================

set -e  # Exit on error
set -u  # Exit on undefined variable

# ============================================================================
# CONFIGURATION
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
TERRAFORM_DIR="${PROJECT_ROOT}/terraform/environments/production"

AWS_REGION="${AWS_REGION:-us-east-1}"
ENVIRONMENT="production"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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
# PARSE COMMAND LINE ARGUMENTS
# ============================================================================

PLAN_ONLY=false
AUTO_APPROVE=false
DESTROY=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --plan-only)
            PLAN_ONLY=true
            shift
            ;;
        --auto-approve)
            AUTO_APPROVE=true
            shift
            ;;
        --destroy)
            DESTROY=true
            shift
            ;;
        --help)
            head -n 30 "$0" | grep "^#" | sed 's/^# //; s/^#//'
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            log_info "Use --help for usage information"
            exit 1
            ;;
    esac
done

# ============================================================================
# PRE-FLIGHT CHECKS
# ============================================================================

separator
log_info "Starting pre-flight checks..."
separator

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    log_error "AWS CLI not found. Please install: https://aws.amazon.com/cli/"
    exit 1
fi
log_success "AWS CLI installed: $(aws --version)"

# Check Terraform
if ! command -v terraform &> /dev/null; then
    log_error "Terraform not found. Please install: https://www.terraform.io/downloads"
    exit 1
fi
log_success "Terraform installed: $(terraform version -json | jq -r .terraform_version)"

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    log_error "AWS credentials not configured or invalid"
    log_info "Run: aws configure"
    exit 1
fi

AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_USER=$(aws sts get-caller-identity --query Arn --output text)
log_success "AWS authenticated as: ${AWS_USER}"
log_info "AWS Account ID: ${AWS_ACCOUNT_ID}"
log_info "AWS Region: ${AWS_REGION}"

# Verify Terraform directory
if [[ ! -d "${TERRAFORM_DIR}" ]]; then
    log_error "Terraform directory not found: ${TERRAFORM_DIR}"
    exit 1
fi
log_success "Terraform directory found"

# Check terraform.tfvars exists
if [[ ! -f "${TERRAFORM_DIR}/terraform.tfvars" ]]; then
    log_error "terraform.tfvars not found in ${TERRAFORM_DIR}"
    log_info "Create terraform.tfvars from terraform.tfvars.example and fill in values"
    exit 1
fi
log_success "terraform.tfvars found"

# ============================================================================
# SAFETY CHECKS FOR PRODUCTION
# ============================================================================

if [[ "${DESTROY}" == "true" ]]; then
    separator
    log_warning "⚠️  DANGER: You are about to DESTROY production infrastructure! ⚠️"
    separator
    log_warning "This will DELETE:"
    log_warning "  - RDS database (with all data)"
    log_warning "  - Redis cache"
    log_warning "  - ECS cluster and tasks"
    log_warning "  - Load balancer"
    log_warning "  - VPC and networking"
    log_warning "  - S3 backups"
    log_warning "  - All other resources"
    separator

    if [[ "${AUTO_APPROVE}" == "false" ]]; then
        read -p "Type 'DESTROY PRODUCTION' to confirm: " confirmation
        if [[ "${confirmation}" != "DESTROY PRODUCTION" ]]; then
            log_info "Destruction cancelled"
            exit 0
        fi
    fi
fi

if [[ "${ENVIRONMENT}" == "production" ]] && [[ "${AUTO_APPROVE}" == "false" ]] && [[ "${DESTROY}" == "false" ]]; then
    separator
    log_warning "You are deploying to PRODUCTION environment"
    log_info "This will create/update resources that cost money (~$57/month)"
    separator
    read -p "Continue with production deployment? (yes/no): " confirm
    if [[ "${confirm}" != "yes" ]]; then
        log_info "Deployment cancelled"
        exit 0
    fi
fi

# ============================================================================
# TERRAFORM STATE BACKEND SETUP
# ============================================================================

separator
log_info "Checking Terraform state backend..."
separator

STATE_BUCKET="whatsapp-saas-terraform-state"
STATE_LOCK_TABLE="terraform-state-lock"

# Check if S3 bucket exists
if ! aws s3 ls "s3://${STATE_BUCKET}" &> /dev/null; then
    log_warning "Terraform state bucket does not exist: ${STATE_BUCKET}"
    log_info "Creating S3 bucket for Terraform state..."

    aws s3 mb "s3://${STATE_BUCKET}" --region "${AWS_REGION}"

    # Enable versioning
    aws s3api put-bucket-versioning \
        --bucket "${STATE_BUCKET}" \
        --versioning-configuration Status=Enabled

    # Enable encryption
    aws s3api put-bucket-encryption \
        --bucket "${STATE_BUCKET}" \
        --server-side-encryption-configuration '{
            "Rules": [{
                "ApplyServerSideEncryptionByDefault": {
                    "SSEAlgorithm": "AES256"
                }
            }]
        }'

    # Block public access
    aws s3api put-public-access-block \
        --bucket "${STATE_BUCKET}" \
        --public-access-block-configuration \
            BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

    log_success "S3 bucket created: ${STATE_BUCKET}"
else
    log_success "S3 bucket exists: ${STATE_BUCKET}"
fi

# Check if DynamoDB table exists
if ! aws dynamodb describe-table --table-name "${STATE_LOCK_TABLE}" &> /dev/null; then
    log_warning "DynamoDB table for state locking does not exist: ${STATE_LOCK_TABLE}"
    log_info "Creating DynamoDB table for state locking..."

    aws dynamodb create-table \
        --table-name "${STATE_LOCK_TABLE}" \
        --attribute-definitions AttributeName=LockID,AttributeType=S \
        --key-schema AttributeName=LockID,KeyType=HASH \
        --billing-mode PAY_PER_REQUEST \
        --region "${AWS_REGION}"

    log_info "Waiting for table to be active..."
    aws dynamodb wait table-exists --table-name "${STATE_LOCK_TABLE}"

    log_success "DynamoDB table created: ${STATE_LOCK_TABLE}"
else
    log_success "DynamoDB table exists: ${STATE_LOCK_TABLE}"
fi

# ============================================================================
# TERRAFORM INITIALIZATION
# ============================================================================

separator
log_info "Initializing Terraform..."
separator

cd "${TERRAFORM_DIR}"

terraform init -upgrade

if [[ $? -ne 0 ]]; then
    log_error "Terraform initialization failed"
    exit 1
fi

log_success "Terraform initialized successfully"

# ============================================================================
# TERRAFORM VALIDATION
# ============================================================================

separator
log_info "Validating Terraform configuration..."
separator

terraform validate

if [[ $? -ne 0 ]]; then
    log_error "Terraform validation failed"
    exit 1
fi

log_success "Terraform configuration is valid"

# ============================================================================
# TERRAFORM PLAN
# ============================================================================

separator
log_info "Running Terraform plan..."
separator

PLAN_FILE="${TERRAFORM_DIR}/tfplan"

if [[ "${DESTROY}" == "true" ]]; then
    terraform plan -destroy -out="${PLAN_FILE}"
else
    terraform plan -out="${PLAN_FILE}"
fi

if [[ $? -ne 0 ]]; then
    log_error "Terraform plan failed"
    exit 1
fi

log_success "Terraform plan completed"

# If plan-only mode, exit here
if [[ "${PLAN_ONLY}" == "true" ]]; then
    log_info "Plan-only mode: Exiting without applying changes"
    log_info "To apply these changes, run without --plan-only flag"
    exit 0
fi

# ============================================================================
# TERRAFORM APPLY
# ============================================================================

separator
if [[ "${DESTROY}" == "true" ]]; then
    log_warning "Destroying infrastructure..."
else
    log_info "Applying Terraform changes..."
fi
separator

APPLY_ARGS="-input=false"
if [[ "${AUTO_APPROVE}" == "true" ]]; then
    APPLY_ARGS="${APPLY_ARGS} -auto-approve"
fi

terraform apply ${APPLY_ARGS} "${PLAN_FILE}"

if [[ $? -ne 0 ]]; then
    log_error "Terraform apply failed"
    exit 1
fi

# Clean up plan file
rm -f "${PLAN_FILE}"

if [[ "${DESTROY}" == "true" ]]; then
    log_success "Infrastructure destroyed successfully"
    exit 0
fi

log_success "Infrastructure deployed successfully!"

# ============================================================================
# POST-DEPLOYMENT OUTPUTS
# ============================================================================

separator
log_info "Deployment Summary"
separator

# Get Terraform outputs
VPC_ID=$(terraform output -raw vpc_id 2>/dev/null || echo "N/A")
DB_ENDPOINT=$(terraform output -raw database_endpoint 2>/dev/null || echo "N/A")
REDIS_ENDPOINT=$(terraform output -raw redis_endpoint 2>/dev/null || echo "N/A")
DB_SECRET_ARN=$(terraform output -raw db_credentials_secret_arn 2>/dev/null || echo "N/A")
REDIS_SECRET_ARN=$(terraform output -raw redis_credentials_secret_arn 2>/dev/null || echo "N/A")

log_info "VPC ID: ${VPC_ID}"
log_info "Database Endpoint: ${DB_ENDPOINT}"
log_info "Redis Endpoint: ${REDIS_ENDPOINT}"
log_info "DB Credentials Secret ARN: ${DB_SECRET_ARN}"
log_info "Redis Credentials Secret ARN: ${REDIS_SECRET_ARN}"

separator
log_info "Next Steps:"
separator

echo "1. Verify infrastructure health:"
echo "   ./scripts/validate-production.sh"
echo ""
echo "2. Run database migrations:"
echo "   ./scripts/migrate-production-database.sh"
echo ""
echo "3. Deploy application to ECS:"
echo "   ./scripts/deploy-application.sh"
echo ""
echo "4. Run smoke tests:"
echo "   cd Backend/tests/e2e && npm run test:smoke"
echo ""
echo "5. Configure monitoring:"
echo "   See: monitoring/README.md"
echo ""

separator
log_success "Production infrastructure deployment complete! 🚀"
separator

# Save deployment timestamp
echo "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" > "${TERRAFORM_DIR}/.last_deployment"

exit 0
