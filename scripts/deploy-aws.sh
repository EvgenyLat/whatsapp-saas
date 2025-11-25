#!/bin/bash

################################################################################
# AWS Infrastructure Deployment Script
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
OUTPUTS_FILE="terraform-outputs.json"
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

    # Check if Terraform is installed
    if ! command -v terraform &> /dev/null; then
        log_error "Terraform is not installed. Please install Terraform first."
        log_info "Visit: https://www.terraform.io/downloads"
        exit 1
    fi

    local tf_version=$(terraform version -json | jq -r '.terraform_version')
    log_success "Terraform installed: v${tf_version}"

    # Check if AWS CLI is installed
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed. Please install AWS CLI first."
        log_info "Visit: https://aws.amazon.com/cli/"
        exit 1
    fi

    local aws_version=$(aws --version 2>&1 | cut -d' ' -f1 | cut -d'/' -f2)
    log_success "AWS CLI installed: v${aws_version}"

    # Check if jq is installed
    if ! command -v jq &> /dev/null; then
        log_error "jq is not installed. Please install jq for JSON processing."
        log_info "Visit: https://stedolan.github.io/jq/download/"
        exit 1
    fi

    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured or invalid."
        log_info "Run: aws configure"
        exit 1
    fi

    local aws_account=$(aws sts get-caller-identity --query Account --output text)
    local aws_user=$(aws sts get-caller-identity --query Arn --output text)
    log_success "AWS credentials configured"
    log_info "Account: ${aws_account}"
    log_info "User: ${aws_user}"
}

check_backend_exists() {
    log_info "Checking if Terraform backend exists..."

    # Check if S3 bucket exists
    if aws s3 ls "s3://${STATE_BUCKET}" --region "${AWS_REGION}" 2>/dev/null; then
        log_success "S3 bucket exists: ${STATE_BUCKET}"
        return 0
    else
        log_warning "S3 bucket does not exist: ${STATE_BUCKET}"
        return 1
    fi
}

initialize_backend() {
    log_info "Initializing Terraform backend infrastructure..."

    cd "${TERRAFORM_DIR}"

    # Check if backend-init.tf exists
    if [ ! -f "backend-init.tf" ]; then
        log_error "backend-init.tf not found. Cannot initialize backend."
        exit 1
    fi

    # Temporarily rename main.tf to avoid backend configuration conflict
    if [ -f "main.tf" ]; then
        mv main.tf main.tf.bak
        log_info "Temporarily renamed main.tf to main.tf.bak"
    fi

    # Initialize and apply backend infrastructure
    log_info "Creating S3 bucket and DynamoDB table..."
    terraform init
    terraform plan -out=backend-init.tfplan

    echo ""
    log_warning "About to create backend infrastructure (S3 + DynamoDB)"
    read -p "Continue? (yes/no): " confirm

    if [ "$confirm" != "yes" ]; then
        log_error "Deployment cancelled by user"
        # Restore main.tf
        if [ -f "main.tf.bak" ]; then
            mv main.tf.bak main.tf
        fi
        exit 1
    fi

    terraform apply backend-init.tfplan
    rm backend-init.tfplan

    log_success "Backend infrastructure created!"

    # Restore main.tf
    if [ -f "main.tf.bak" ]; then
        mv main.tf.bak main.tf
        log_info "Restored main.tf"
    fi

    # Rename backend-init.tf so it's not used again
    mv backend-init.tf backend-init.tf.completed
    log_info "Renamed backend-init.tf to backend-init.tf.completed"

    log_info "Migrating state to S3..."
    terraform init -migrate-state -force-copy

    log_success "State migrated to S3 backend"

    # Clean up local state files
    rm -f terraform.tfstate terraform.tfstate.backup
    log_info "Removed local state files"

    cd - > /dev/null
}

terraform_init() {
    log_info "Initializing Terraform..."

    cd "${TERRAFORM_DIR}"

    terraform init \
        -backend-config="bucket=${STATE_BUCKET}" \
        -backend-config="key=${STATE_KEY}" \
        -backend-config="region=${AWS_REGION}" \
        -backend-config="dynamodb_table=${LOCK_TABLE}" \
        -backend-config="encrypt=true"

    log_success "Terraform initialized"

    cd - > /dev/null
}

terraform_plan() {
    log_info "Running Terraform plan..."

    cd "${TERRAFORM_DIR}"

    terraform plan -out=tfplan

    log_success "Terraform plan completed"
    log_info "Plan saved to: ${TERRAFORM_DIR}/tfplan"

    cd - > /dev/null
}

terraform_apply() {
    log_info "Applying Terraform configuration..."

    cd "${TERRAFORM_DIR}"

    echo ""
    log_warning "About to create AWS infrastructure (RDS + Redis + Secrets)"
    log_warning "Estimated cost: $50-60/month"
    read -p "Continue? (yes/no): " confirm

    if [ "$confirm" != "yes" ]; then
        log_error "Deployment cancelled by user"
        rm -f tfplan
        cd - > /dev/null
        exit 1
    fi

    terraform apply tfplan
    rm -f tfplan

    log_success "Infrastructure deployed successfully!"

    cd - > /dev/null
}

save_outputs() {
    log_info "Saving Terraform outputs to JSON..."

    cd "${TERRAFORM_DIR}"

    terraform output -json > "../../${OUTPUTS_FILE}"

    cd - > /dev/null

    log_success "Outputs saved to: ${OUTPUTS_FILE}"
}

display_outputs() {
    log_info "Infrastructure outputs:"
    echo ""

    if [ -f "${OUTPUTS_FILE}" ]; then
        # RDS outputs
        echo -e "${GREEN}RDS PostgreSQL:${NC}"
        echo "  Endpoint: $(jq -r '.rds_endpoint.value' ${OUTPUTS_FILE})"
        echo "  Database: $(jq -r '.rds_database_name.value' ${OUTPUTS_FILE})"
        echo "  Secret ARN: $(jq -r '.db_credentials_secret_arn.value' ${OUTPUTS_FILE})"
        echo ""

        # Redis outputs
        echo -e "${GREEN}ElastiCache Redis:${NC}"
        echo "  Endpoint: $(jq -r '.redis_endpoint.value' ${OUTPUTS_FILE})"
        echo "  Secret ARN: $(jq -r '.redis_connection_secret_arn.value' ${OUTPUTS_FILE})"
        echo ""

        # Secrets outputs
        echo -e "${GREEN}AWS Secrets Manager:${NC}"
        echo "  DB Credentials: $(jq -r '.db_credentials_secret_arn.value' ${OUTPUTS_FILE})"
        echo "  Redis Connection: $(jq -r '.redis_connection_secret_arn.value' ${OUTPUTS_FILE})"
        echo "  OpenAI API Key: $(jq -r '.openai_api_key_secret_arn.value' ${OUTPUTS_FILE})"
        echo "  WhatsApp Credentials: $(jq -r '.whatsapp_credentials_secret_arn.value' ${OUTPUTS_FILE})"
        echo "  Admin Token: $(jq -r '.admin_token_secret_arn.value' ${OUTPUTS_FILE})"
        echo ""

        # Other outputs
        echo -e "${GREEN}Other:${NC}"
        echo "  Region: $(jq -r '.region.value' ${OUTPUTS_FILE})"
        echo "  Environment: $(jq -r '.environment.value' ${OUTPUTS_FILE})"
        echo "  VPC ID: $(jq -r '.vpc_id.value' ${OUTPUTS_FILE})"
    else
        log_error "Outputs file not found: ${OUTPUTS_FILE}"
    fi
}

update_secrets() {
    log_info "Next steps for updating secrets:"
    echo ""
    echo "Update the following secrets manually in AWS Secrets Manager:"
    echo ""
    echo "1. OpenAI API Key:"
    echo "   aws secretsmanager put-secret-value \\"
    echo "     --secret-id $(jq -r '.openai_api_key_secret_arn.value' ${OUTPUTS_FILE}) \\"
    echo "     --secret-string '{\"api_key\":\"YOUR_OPENAI_API_KEY\",\"model\":\"gpt-4\"}'"
    echo ""
    echo "2. WhatsApp Credentials:"
    echo "   aws secretsmanager put-secret-value \\"
    echo "     --secret-id $(jq -r '.whatsapp_credentials_secret_arn.value' ${OUTPUTS_FILE}) \\"
    echo "     --secret-string '{\"phone_number_id\":\"YOUR_PHONE_NUMBER_ID\",\"access_token\":\"YOUR_ACCESS_TOKEN\",\"verify_token\":\"YOUR_VERIFY_TOKEN\",\"app_secret\":\"YOUR_APP_SECRET\"}'"
    echo ""
    echo "Or update via AWS Console:"
    echo "  https://console.aws.amazon.com/secretsmanager/home?region=${AWS_REGION}"
}

display_cost_estimate() {
    log_info "Monthly cost estimate:"
    echo ""
    echo "  RDS PostgreSQL (db.t3.micro):     ~\$13.00"
    echo "  RDS Storage (20 GB gp3):          ~\$2.00"
    echo "  RDS Backups (estimated):          ~\$1.00"
    echo "  ElastiCache Redis (cache.t3.micro): ~\$12.00"
    echo "  ElastiCache Backups (estimated):  ~\$0.50"
    echo "  AWS Secrets Manager (5 secrets):  ~\$2.50"
    echo "  S3 (Terraform state):             ~\$0.10"
    echo "  DynamoDB (state locking):         ~\$0.50"
    echo "  Data Transfer (estimated):        ~\$5.00"
    echo "  CloudWatch Logs (estimated):      ~\$2.00"
    echo "  ${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo "  ${GREEN}Total (estimated):                  ~\$38.60 - \$50.00/month${NC}"
    echo ""
    echo "Note: Actual costs may vary based on usage and data transfer."
}

################################################################################
# Main Script
################################################################################

main() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║         AWS Infrastructure Deployment Script                   ║"
    echo "║         WhatsApp SaaS Starter - MVP Environment                ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""

    # Check prerequisites
    check_prerequisites
    echo ""

    # Display cost estimate
    display_cost_estimate
    echo ""

    # Check if backend exists
    if ! check_backend_exists; then
        log_warning "Backend infrastructure not found"
        read -p "Initialize backend infrastructure? (yes/no): " init_backend

        if [ "$init_backend" = "yes" ]; then
            initialize_backend
            echo ""
        else
            log_error "Cannot proceed without backend infrastructure"
            exit 1
        fi
    fi

    # Initialize Terraform
    terraform_init
    echo ""

    # Run Terraform plan
    terraform_plan
    echo ""

    # Apply Terraform configuration
    terraform_apply
    echo ""

    # Save outputs
    save_outputs
    echo ""

    # Display outputs
    display_outputs
    echo ""

    # Show next steps for secrets
    update_secrets
    echo ""

    log_success "Deployment completed successfully!"
    log_info "Infrastructure is ready for application deployment"
    echo ""
    log_info "Next steps:"
    echo "  1. Update secrets in AWS Secrets Manager (see above)"
    echo "  2. Configure application to use AWS resources"
    echo "  3. Deploy application to AWS (EC2, ECS, Lambda, etc.)"
    echo "  4. Run database migrations"
    echo "  5. Test application connectivity"
    echo ""
    log_info "For rollback instructions, see: AWS_SETUP_GUIDE.md"
}

# Handle script arguments
case "${1:-deploy}" in
    deploy)
        main
        ;;
    init)
        check_prerequisites
        if ! check_backend_exists; then
            initialize_backend
        else
            terraform_init
        fi
        ;;
    plan)
        check_prerequisites
        terraform_init
        terraform_plan
        ;;
    outputs)
        if [ -f "${OUTPUTS_FILE}" ]; then
            display_outputs
        else
            cd "${TERRAFORM_DIR}"
            terraform output -json > "../../${OUTPUTS_FILE}"
            cd - > /dev/null
            display_outputs
        fi
        ;;
    cost)
        display_cost_estimate
        ;;
    *)
        echo "Usage: $0 {deploy|init|plan|outputs|cost}"
        echo ""
        echo "Commands:"
        echo "  deploy   - Full deployment (default)"
        echo "  init     - Initialize Terraform only"
        echo "  plan     - Run Terraform plan only"
        echo "  outputs  - Display infrastructure outputs"
        echo "  cost     - Display cost estimate"
        exit 1
        ;;
esac
