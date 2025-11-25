#!/bin/bash

################################################################################
# AWS Secrets Manager Setup Script
# Creates and populates all required secrets for WhatsApp SaaS application
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
AWS_REGION="${AWS_REGION:-us-east-1}"
PROJECT_NAME="whatsapp-saas"
ENVIRONMENT="${ENVIRONMENT:-mvp}"

# Secret paths
SECRET_PREFIX="${PROJECT_NAME}/${ENVIRONMENT}"

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

    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed"
        exit 1
    fi

    # Check jq
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
}

generate_admin_token() {
    # Generate a secure 64-character random token
    openssl rand -base64 48 | tr -d '\n'
}

generate_verify_token() {
    # Generate a secure 32-character random token
    openssl rand -base64 24 | tr -d '\n'
}

create_or_update_secret() {
    local secret_name="$1"
    local secret_value="$2"
    local description="$3"

    log_info "Processing secret: ${secret_name}"

    # Check if secret exists
    if aws secretsmanager describe-secret \
        --secret-id "${secret_name}" \
        --region "${AWS_REGION}" &> /dev/null; then

        log_warning "Secret exists, updating value..."

        aws secretsmanager put-secret-value \
            --secret-id "${secret_name}" \
            --secret-string "${secret_value}" \
            --region "${AWS_REGION}" > /dev/null

        log_success "Updated: ${secret_name}"
    else
        log_info "Creating new secret..."

        aws secretsmanager create-secret \
            --name "${secret_name}" \
            --description "${description}" \
            --secret-string "${secret_value}" \
            --region "${AWS_REGION}" \
            --tags "Key=Project,Value=${PROJECT_NAME}" \
                   "Key=Environment,Value=${ENVIRONMENT}" \
                   "Key=ManagedBy,Value=setup-script" > /dev/null

        log_success "Created: ${secret_name}"
    fi
}

get_secret_value() {
    local secret_name="$1"

    aws secretsmanager get-secret-value \
        --secret-id "${secret_name}" \
        --region "${AWS_REGION}" \
        --query 'SecretString' \
        --output text 2>/dev/null || echo ""
}

prompt_for_value() {
    local prompt="$1"
    local default="$2"
    local secret_mode="${3:-false}"

    if [ "$secret_mode" = "true" ]; then
        read -s -p "${prompt} [${default}]: " value
        echo  # New line after hidden input
    else
        read -p "${prompt} [${default}]: " value
    fi

    if [ -z "$value" ]; then
        echo "$default"
    else
        echo "$value"
    fi
}

setup_database_secret() {
    log_info "Setting up DATABASE_URL secret..."

    # Try to get from Terraform outputs
    local db_endpoint=""
    local db_name=""

    if [ -f "terraform-outputs.json" ]; then
        db_endpoint=$(jq -r '.rds_address.value' terraform-outputs.json 2>/dev/null || echo "")
        db_name=$(jq -r '.rds_database_name.value' terraform-outputs.json 2>/dev/null || echo "whatsapp_saas")
    fi

    if [ -n "$db_endpoint" ]; then
        log_success "Found RDS endpoint from Terraform: ${db_endpoint}"

        # Get password from Terraform-created secret
        local db_secret_arn=$(jq -r '.db_credentials_secret_arn.value' terraform-outputs.json 2>/dev/null)
        if [ -n "$db_secret_arn" ] && [ "$db_secret_arn" != "null" ]; then
            local db_creds=$(aws secretsmanager get-secret-value \
                --secret-id "${db_secret_arn}" \
                --region "${AWS_REGION}" \
                --query 'SecretString' \
                --output text 2>/dev/null)

            local db_username=$(echo "$db_creds" | jq -r '.username')
            local db_password=$(echo "$db_creds" | jq -r '.password')
            local db_port=$(echo "$db_creds" | jq -r '.port')

            DATABASE_URL="postgresql://${db_username}:${db_password}@${db_endpoint}:${db_port}/${db_name}?schema=public"
        else
            log_warning "Could not retrieve DB credentials from Terraform secret"
            DATABASE_URL=$(prompt_for_value "Enter DATABASE_URL" "postgresql://user:pass@localhost:5432/whatsapp_saas")
        fi
    else
        DATABASE_URL=$(prompt_for_value "Enter DATABASE_URL" "postgresql://user:pass@localhost:5432/whatsapp_saas")
    fi

    create_or_update_secret \
        "${SECRET_PREFIX}/database-url" \
        "${DATABASE_URL}" \
        "PostgreSQL database connection string"
}

setup_redis_secret() {
    log_info "Setting up REDIS_URL secret..."

    # Try to get from Terraform outputs
    local redis_endpoint=""

    if [ -f "terraform-outputs.json" ]; then
        redis_endpoint=$(jq -r '.redis_endpoint.value' terraform-outputs.json 2>/dev/null || echo "")
    fi

    if [ -n "$redis_endpoint" ]; then
        log_success "Found Redis endpoint from Terraform: ${redis_endpoint}"
        REDIS_URL="redis://${redis_endpoint}"
    else
        REDIS_URL=$(prompt_for_value "Enter REDIS_URL" "redis://localhost:6379")
    fi

    create_or_update_secret \
        "${SECRET_PREFIX}/redis-url" \
        "${REDIS_URL}" \
        "Redis connection string"
}

setup_admin_token() {
    log_info "Setting up ADMIN_TOKEN secret..."

    # Check if admin token already exists
    local existing_token=$(get_secret_value "${SECRET_PREFIX}/admin-token")

    if [ -n "$existing_token" ]; then
        log_warning "Admin token already exists"
        read -p "Generate new admin token? (yes/no): " regenerate

        if [ "$regenerate" = "yes" ]; then
            ADMIN_TOKEN=$(generate_admin_token)
            log_success "Generated new admin token"
        else
            log_info "Keeping existing admin token"
            return
        fi
    else
        # Check if there's a Terraform-generated token
        if [ -f "terraform-outputs.json" ]; then
            local admin_secret_arn=$(jq -r '.admin_token_secret_arn.value' terraform-outputs.json 2>/dev/null)
            if [ -n "$admin_secret_arn" ] && [ "$admin_secret_arn" != "null" ]; then
                local terraform_token=$(aws secretsmanager get-secret-value \
                    --secret-id "${admin_secret_arn}" \
                    --region "${AWS_REGION}" \
                    --query 'SecretString' \
                    --output text 2>/dev/null | jq -r '.token')

                if [ -n "$terraform_token" ] && [ "$terraform_token" != "null" ]; then
                    log_success "Using admin token from Terraform"
                    ADMIN_TOKEN="$terraform_token"
                else
                    ADMIN_TOKEN=$(generate_admin_token)
                    log_success "Generated new admin token"
                fi
            else
                ADMIN_TOKEN=$(generate_admin_token)
                log_success "Generated new admin token"
            fi
        else
            ADMIN_TOKEN=$(generate_admin_token)
            log_success "Generated new admin token"
        fi
    fi

    create_or_update_secret \
        "${SECRET_PREFIX}/admin-token" \
        "${ADMIN_TOKEN}" \
        "Admin API authentication token"

    # Save to file for reference (will be deleted at end)
    echo "${ADMIN_TOKEN}" > .admin-token.txt
    log_warning "Admin token saved to: .admin-token.txt (will be deleted)"
}

setup_meta_secrets() {
    log_info "Setting up Meta WhatsApp secrets..."

    # META_VERIFY_TOKEN
    local existing_verify=$(get_secret_value "${SECRET_PREFIX}/meta-verify-token")
    if [ -n "$existing_verify" ]; then
        log_info "Meta verify token already exists"
        META_VERIFY_TOKEN="$existing_verify"
    else
        META_VERIFY_TOKEN=$(generate_verify_token)
        log_success "Generated new Meta verify token"
    fi

    create_or_update_secret \
        "${SECRET_PREFIX}/meta-verify-token" \
        "${META_VERIFY_TOKEN}" \
        "Meta webhook verification token"

    # META_APP_SECRET
    META_APP_SECRET=$(prompt_for_value "Enter META_APP_SECRET" "your-meta-app-secret" true)

    create_or_update_secret \
        "${SECRET_PREFIX}/meta-app-secret" \
        "${META_APP_SECRET}" \
        "Meta app secret for HMAC validation"

    # Save verify token to file for reference
    echo "${META_VERIFY_TOKEN}" > .meta-verify-token.txt
    log_warning "Meta verify token saved to: .meta-verify-token.txt (will be deleted)"
}

setup_whatsapp_secrets() {
    log_info "Setting up WhatsApp credentials..."

    WHATSAPP_PHONE_NUMBER_ID=$(prompt_for_value "Enter WHATSAPP_PHONE_NUMBER_ID" "123456789012345")
    WHATSAPP_ACCESS_TOKEN=$(prompt_for_value "Enter WHATSAPP_ACCESS_TOKEN" "your-whatsapp-access-token" true)

    create_or_update_secret \
        "${SECRET_PREFIX}/whatsapp-phone-number-id" \
        "${WHATSAPP_PHONE_NUMBER_ID}" \
        "Default WhatsApp phone number ID"

    create_or_update_secret \
        "${SECRET_PREFIX}/whatsapp-access-token" \
        "${WHATSAPP_ACCESS_TOKEN}" \
        "Default WhatsApp access token"
}

setup_openai_secrets() {
    log_info "Setting up OpenAI credentials..."

    # Check if OpenAI secret exists in Terraform
    if [ -f "terraform-outputs.json" ]; then
        local openai_secret_arn=$(jq -r '.openai_api_key_secret_arn.value' terraform-outputs.json 2>/dev/null)
        if [ -n "$openai_secret_arn" ] && [ "$openai_secret_arn" != "null" ]; then
            local existing_key=$(aws secretsmanager get-secret-value \
                --secret-id "${openai_secret_arn}" \
                --region "${AWS_REGION}" \
                --query 'SecretString' \
                --output text 2>/dev/null | jq -r '.api_key')

            if [ "$existing_key" != "PLACEHOLDER_UPDATE_MANUALLY" ]; then
                log_info "OpenAI API key already configured in Terraform secret"
                read -p "Update OpenAI API key? (yes/no): " update_key
                if [ "$update_key" != "yes" ]; then
                    return
                fi
            fi
        fi
    fi

    OPENAI_API_KEY=$(prompt_for_value "Enter OPENAI_API_KEY" "sk-..." true)

    create_or_update_secret \
        "${SECRET_PREFIX}/openai-api-key" \
        "${OPENAI_API_KEY}" \
        "OpenAI API key for AI conversations"

    # Optional: Other OpenAI settings
    OPENAI_MODEL=$(prompt_for_value "Enter OPENAI_MODEL" "gpt-4")
    OPENAI_MAX_TOKENS=$(prompt_for_value "Enter OPENAI_MAX_TOKENS" "1000")
    OPENAI_TEMPERATURE=$(prompt_for_value "Enter OPENAI_TEMPERATURE" "0.7")

    create_or_update_secret \
        "${SECRET_PREFIX}/openai-model" \
        "${OPENAI_MODEL}" \
        "OpenAI model to use"

    create_or_update_secret \
        "${SECRET_PREFIX}/openai-max-tokens" \
        "${OPENAI_MAX_TOKENS}" \
        "Maximum tokens per OpenAI request"

    create_or_update_secret \
        "${SECRET_PREFIX}/openai-temperature" \
        "${OPENAI_TEMPERATURE}" \
        "OpenAI temperature setting"
}

list_all_secrets() {
    log_info "Current secrets in AWS Secrets Manager:"
    echo ""

    aws secretsmanager list-secrets \
        --region "${AWS_REGION}" \
        --query "SecretList[?contains(Name, '${SECRET_PREFIX}')].{Name:Name,LastChanged:LastChangedDate,Description:Description}" \
        --output table

    echo ""
}

create_secret_access_policy() {
    log_info "Creating IAM policy for secret access..."

    local policy_name="${PROJECT_NAME}-${ENVIRONMENT}-secrets-read"
    local policy_document=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": [
        "arn:aws:secretsmanager:${AWS_REGION}:*:secret:${SECRET_PREFIX}/*"
      ]
    }
  ]
}
EOF
)

    # Save policy to file
    echo "$policy_document" > "${policy_name}.json"
    log_success "IAM policy saved to: ${policy_name}.json"

    echo ""
    log_info "To create the IAM policy, run:"
    echo "  aws iam create-policy \\"
    echo "    --policy-name ${policy_name} \\"
    echo "    --policy-document file://${policy_name}.json"
    echo ""
}

display_summary() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║           Secrets Setup Complete                               ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""

    log_success "All secrets have been created/updated in AWS Secrets Manager"
    echo ""

    log_info "Secret prefix: ${SECRET_PREFIX}"
    log_info "AWS Region: ${AWS_REGION}"
    echo ""

    if [ -f ".admin-token.txt" ]; then
        log_warning "IMPORTANT: Your admin token is:"
        cat .admin-token.txt
        echo ""
        log_warning "Store this securely and delete .admin-token.txt"
    fi

    if [ -f ".meta-verify-token.txt" ]; then
        log_warning "IMPORTANT: Your Meta verify token is:"
        cat .meta-verify-token.txt
        echo ""
        log_warning "Use this when configuring Meta webhook"
        log_warning "Store this securely and delete .meta-verify-token.txt"
    fi

    echo ""
    log_info "To use these secrets in your application:"
    echo "  1. Set environment variable: USE_AWS_SECRETS=true"
    echo "  2. Set AWS_REGION=${AWS_REGION}"
    echo "  3. Ensure IAM role has read access to secrets"
    echo ""

    log_info "To view all secrets:"
    echo "  aws secretsmanager list-secrets --region ${AWS_REGION}"
    echo ""

    log_info "To delete temporary files:"
    echo "  rm -f .admin-token.txt .meta-verify-token.txt"
    echo ""
}

cleanup_temp_files() {
    log_info "Cleaning up temporary files..."

    if [ -f ".admin-token.txt" ]; then
        rm -f .admin-token.txt
        log_success "Deleted .admin-token.txt"
    fi

    if [ -f ".meta-verify-token.txt" ]; then
        rm -f .meta-verify-token.txt
        log_success "Deleted .meta-verify-token.txt"
    fi
}

################################################################################
# Main Script
################################################################################

main() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║       AWS Secrets Manager Setup Script                        ║"
    echo "║       WhatsApp SaaS Starter                                    ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""

    check_prerequisites
    echo ""

    log_info "Project: ${PROJECT_NAME}"
    log_info "Environment: ${ENVIRONMENT}"
    log_info "AWS Region: ${AWS_REGION}"
    log_info "Secret prefix: ${SECRET_PREFIX}"
    echo ""

    read -p "Continue with setup? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        log_error "Setup cancelled"
        exit 1
    fi

    echo ""

    # Setup all secrets
    setup_database_secret
    setup_redis_secret
    setup_admin_token
    setup_meta_secrets
    setup_whatsapp_secrets
    setup_openai_secrets

    echo ""

    # List all secrets
    list_all_secrets

    # Create IAM policy
    create_secret_access_policy

    # Display summary
    display_summary

    # Ask if user wants to clean up temp files
    read -p "Delete temporary token files? (yes/no): " cleanup
    if [ "$cleanup" = "yes" ]; then
        cleanup_temp_files
    fi

    echo ""
    log_success "Setup complete!"
}

# Handle script arguments
case "${1:-setup}" in
    setup)
        main
        ;;
    list)
        check_prerequisites
        list_all_secrets
        ;;
    policy)
        create_secret_access_policy
        ;;
    clean)
        cleanup_temp_files
        ;;
    *)
        echo "Usage: $0 {setup|list|policy|clean}"
        echo ""
        echo "Commands:"
        echo "  setup   - Interactive setup of all secrets (default)"
        echo "  list    - List all existing secrets"
        echo "  policy  - Generate IAM policy document"
        echo "  clean   - Clean up temporary files"
        exit 1
        ;;
esac
