#!/bin/bash
##############################################################################
# Deploy Staging Infrastructure
#
# Purpose: Automated deployment script for staging infrastructure using Terraform
#
# Usage:
#   ./scripts/deploy-staging-infrastructure.sh
#
# Prerequisites:
#   - AWS CLI configured with appropriate credentials
#   - Terraform installed (>= 1.5.0)
#   - jq installed for JSON parsing
#   - terraform.tfvars file created with required variables
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
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TERRAFORM_DIR="$PROJECT_ROOT/terraform/environments/staging"
DEPLOYMENT_LOG="$PROJECT_ROOT/logs/staging-infra-deployment-$(date +%Y%m%d-%H%M%S).log"

# Create logs directory if it doesn't exist
mkdir -p "$PROJECT_ROOT/logs"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

# Slack notification function
send_slack_notification() {
    local message="$1"
    local status="$2"  # success, warning, error

    if [ -z "${SLACK_WEBHOOK_URL:-}" ]; then
        log_warning "SLACK_WEBHOOK_URL not set, skipping notification"
        return 0
    fi

    local color="#36a64f"  # green
    [ "$status" = "warning" ] && color="#ffcc00"  # yellow
    [ "$status" = "error" ] && color="#ff0000"  # red

    local payload=$(cat <<EOF
{
    "attachments": [{
        "color": "$color",
        "title": "Staging Infrastructure Deployment",
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
        > /dev/null 2>&1 || log_warning "Failed to send Slack notification"
}

# Error handler
error_handler() {
    local line_number=$1
    log_error "Deployment failed at line $line_number"
    send_slack_notification "Staging infrastructure deployment FAILED at line $line_number" "error"
    exit 1
}

trap 'error_handler ${LINENO}' ERR

# Start deployment
log_info "=========================================="
log_info "Starting Staging Infrastructure Deployment"
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

TERRAFORM_VERSION=$(terraform version -json | jq -r '.terraform_version')
log_info "Terraform version: $TERRAFORM_VERSION"

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

# Check if terraform.tfvars exists
if [ ! -f "$TERRAFORM_DIR/terraform.tfvars" ]; then
    log_error "terraform.tfvars not found at $TERRAFORM_DIR/terraform.tfvars"
    log_error ""
    log_error "Please create terraform.tfvars with required variables:"
    log_error "  db_password       = \"<secure-password>\"    # At least 8 characters"
    log_error "  admin_token       = \"<secure-token>\"       # At least 32 characters"
    log_error "  alert_email       = \"your@email.com\"       # Optional"
    log_error "  meta_verify_token = \"<meta-token>\"         # Optional"
    log_error "  meta_app_secret   = \"<meta-secret>\"        # Optional"
    log_error "  openai_api_key    = \"<openai-key>\"         # Optional"
    exit 1
fi

log_info "Found terraform.tfvars"

# Navigate to Terraform directory
cd "$TERRAFORM_DIR"

# Terraform Init
log_info "Initializing Terraform..."
if terraform init -upgrade 2>&1 | tee -a "$DEPLOYMENT_LOG"; then
    log_success "Terraform initialized successfully"
else
    log_error "Terraform initialization failed"
    exit 1
fi
log_info ""

# Terraform Validate
log_info "Validating Terraform configuration..."
if terraform validate 2>&1 | tee -a "$DEPLOYMENT_LOG"; then
    log_success "Terraform configuration is valid"
else
    log_error "Terraform validation failed"
    exit 1
fi
log_info ""

# Terraform Plan
log_info "Creating Terraform execution plan..."
log_info "This may take a few moments..."
if terraform plan -out=tfplan 2>&1 | tee -a "$DEPLOYMENT_LOG"; then
    log_success "Terraform plan created successfully"
else
    log_error "Terraform plan failed"
    exit 1
fi
log_info ""

# Show plan summary
log_info "Review the plan above. Continuing with apply in 5 seconds..."
log_info "Press Ctrl+C to cancel"
sleep 5

# Terraform Apply
log_info ""
log_info "Applying Terraform configuration..."
send_slack_notification "Starting staging infrastructure deployment..." "warning"

if terraform apply -auto-approve tfplan 2>&1 | tee -a "$DEPLOYMENT_LOG"; then
    log_success "Terraform apply completed successfully"
else
    log_error "Terraform apply failed"
    send_slack_notification "Staging infrastructure deployment FAILED" "error"
    exit 1
fi

# Clean up plan file
rm -f tfplan

# Export Terraform outputs
log_info ""
log_info "Exporting Terraform outputs..."
terraform output -json > "$PROJECT_ROOT/terraform-staging-outputs.json"
log_success "Terraform outputs saved to terraform-staging-outputs.json"

# Extract key outputs
RDS_ENDPOINT=$(terraform output -raw rds_endpoint 2>/dev/null || echo "N/A")
REDIS_ENDPOINT=$(terraform output -raw redis_endpoint 2>/dev/null || echo "N/A")
DATABASE_URL_SECRET_ARN=$(terraform output -raw database_url_secret_arn 2>/dev/null || echo "N/A")
REDIS_URL_SECRET_ARN=$(terraform output -raw redis_url_secret_arn 2>/dev/null || echo "N/A")
APP_SECURITY_GROUP_ID=$(terraform output -raw app_security_group_id 2>/dev/null || echo "N/A")
SNS_TOPIC_ARN=$(terraform output -raw sns_topic_arn 2>/dev/null || echo "N/A")

log_info ""
log_info "=========================================="
log_info "Infrastructure Details:"
log_info "=========================================="
log_info "RDS Endpoint:         $RDS_ENDPOINT"
log_info "Redis Endpoint:       $REDIS_ENDPOINT"
log_info "Database Secret ARN:  $DATABASE_URL_SECRET_ARN"
log_info "Redis Secret ARN:     $REDIS_URL_SECRET_ARN"
log_info "App Security Group:   $APP_SECURITY_GROUP_ID"
log_info "SNS Topic ARN:        $SNS_TOPIC_ARN"
log_info ""

# Wait for RDS to be available
log_info "Waiting for RDS instance to be available..."
RDS_INSTANCE_ID=$(terraform output -raw rds_instance_id 2>/dev/null || echo "")

if [ -n "$RDS_INSTANCE_ID" ]; then
    max_attempts=60
    attempt=0
    while [ $attempt -lt $max_attempts ]; do
        status=$(aws rds describe-db-instances \
            --db-instance-identifier "$RDS_INSTANCE_ID" \
            --query 'DBInstances[0].DBInstanceStatus' \
            --output text 2>/dev/null || echo "unknown")

        if [ "$status" = "available" ]; then
            log_success "RDS instance is available"
            break
        fi

        attempt=$((attempt + 1))
        if [ $((attempt % 6)) -eq 0 ]; then
            log_info "RDS status: $status (waiting... $attempt/$max_attempts)"
        fi
        sleep 10
    done

    if [ $attempt -eq $max_attempts ]; then
        log_warning "RDS instance did not become available within expected time"
        log_warning "Current status: $status"
    fi
else
    log_warning "Could not retrieve RDS instance ID"
fi
log_info ""

# Wait for Redis to be available
log_info "Waiting for Redis cluster to be available..."
REDIS_CLUSTER_ID=$(terraform output -raw redis_cluster_id 2>/dev/null || echo "")

if [ -n "$REDIS_CLUSTER_ID" ]; then
    max_attempts=60
    attempt=0
    while [ $attempt -lt $max_attempts ]; do
        status=$(aws elasticache describe-cache-clusters \
            --cache-cluster-id "$REDIS_CLUSTER_ID" \
            --query 'CacheClusters[0].CacheClusterStatus' \
            --output text 2>/dev/null || echo "unknown")

        if [ "$status" = "available" ]; then
            log_success "Redis cluster is available"
            break
        fi

        attempt=$((attempt + 1))
        if [ $((attempt % 6)) -eq 0 ]; then
            log_info "Redis status: $status (waiting... $attempt/$max_attempts)"
        fi
        sleep 10
    done

    if [ $attempt -eq $max_attempts ]; then
        log_warning "Redis cluster did not become available within expected time"
        log_warning "Current status: $status"
    fi
else
    log_warning "Could not retrieve Redis cluster ID"
fi
log_info ""

# Retrieve secrets from AWS Secrets Manager (for verification)
log_info "Verifying secrets in AWS Secrets Manager..."

if [ "$DATABASE_URL_SECRET_ARN" != "N/A" ]; then
    if aws secretsmanager get-secret-value \
        --secret-id "$DATABASE_URL_SECRET_ARN" \
        --query 'SecretString' \
        --output text > /dev/null 2>&1; then
        log_success "Database URL secret verified"
    else
        log_warning "Could not retrieve database URL secret"
    fi
fi

if [ "$REDIS_URL_SECRET_ARN" != "N/A" ]; then
    if aws secretsmanager get-secret-value \
        --secret-id "$REDIS_URL_SECRET_ARN" \
        --query 'SecretString' \
        --output text > /dev/null 2>&1; then
        log_success "Redis URL secret verified"
    else
        log_warning "Could not retrieve Redis URL secret"
    fi
fi

# Deployment summary
log_info ""
log_info "=========================================="
log_info "Deployment Summary"
log_info "=========================================="
log_info "Status:               SUCCESS"
log_info "Environment:          staging"
log_info "Timestamp:            $(date)"
log_info "AWS Account:          $AWS_ACCOUNT_ID"
log_info "AWS Region:           $(terraform output -raw region 2>/dev/null || echo 'us-east-1')"
log_info "RDS Endpoint:         $RDS_ENDPOINT"
log_info "Redis Endpoint:       $REDIS_ENDPOINT"
log_info "Deployment Log:       $DEPLOYMENT_LOG"
log_info "Terraform Outputs:    $PROJECT_ROOT/terraform-staging-outputs.json"
log_info ""
log_success "Staging infrastructure deployed successfully!"
log_info ""

# Send success notification
send_slack_notification "Staging infrastructure deployed successfully! 🎉
RDS: $RDS_ENDPOINT
Redis: $REDIS_ENDPOINT
Account: $AWS_ACCOUNT_ID" "success"

# Display next steps
log_info "=========================================="
log_info "Next Steps:"
log_info "=========================================="
log_info "1. Run database migrations:"
log_info "   export DATABASE_URL=\$(aws secretsmanager get-secret-value --secret-id $DATABASE_URL_SECRET_ARN --query SecretString --output text)"
log_info "   npm run prisma:migrate:deploy"
log_info ""
log_info "2. Deploy application to staging environment:"
log_info "   ./scripts/deploy-staging.sh"
log_info ""
log_info "3. Configure DNS records:"
log_info "   staging-api.yourapp.com -> [Load Balancer]"
log_info "   staging.yourapp.com -> [Load Balancer]"
log_info ""
log_info "4. Subscribe to SNS alerts:"
log_info "   aws sns subscribe --topic-arn $SNS_TOPIC_ARN --protocol email --notification-endpoint your@email.com"
log_info ""
log_info "5. Monitor CloudWatch logs:"
log_info "   Log Group: /aws/staging/whatsapp-saas/application"
log_info ""
log_info "6. Run smoke tests after application deployment:"
log_info "   npm run test:staging"
log_info ""

exit 0
