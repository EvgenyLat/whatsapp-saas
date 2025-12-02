#!/bin/bash

# ============================================================================
# AWS Secrets Manager Setup Script
# ============================================================================
#
# This script automates the setup of AWS Secrets Manager for the
# WhatsApp SaaS Starter application.
#
# Prerequisites:
# - AWS CLI installed and configured
# - AWS account with permissions to create secrets and IAM policies
# - Bash shell (Linux/macOS) or Git Bash (Windows)
#
# Usage:
#   ./scripts/setup-secrets-manager.sh
#
# ============================================================================

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
SECRET_PREFIX="whatsapp-saas"
IAM_POLICY_NAME="${SECRET_PREFIX}-secrets-policy"
IAM_ROLE_NAME="${SECRET_PREFIX}-secrets-role"

# ============================================================================
# Helper Functions
# ============================================================================

print_header() {
    echo -e "${BLUE}======================================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}======================================================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

prompt_secret() {
    local prompt_text="$1"
    local secret_value=""

    echo -n "$prompt_text: "
    read -r secret_value

    if [ -z "$secret_value" ]; then
        print_warning "No value entered, using placeholder"
        secret_value="PLACEHOLDER-CHANGE-ME"
    fi

    echo "$secret_value"
}

prompt_secret_hidden() {
    local prompt_text="$1"
    local secret_value=""

    echo -n "$prompt_text: "
    read -rs secret_value
    echo ""  # New line after hidden input

    if [ -z "$secret_value" ]; then
        print_warning "No value entered, using placeholder"
        secret_value="PLACEHOLDER-CHANGE-ME"
    fi

    echo "$secret_value"
}

# ============================================================================
# Validation Functions
# ============================================================================

check_aws_cli() {
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI not found"
        echo ""
        echo "Please install AWS CLI:"
        echo "  macOS:   brew install awscli"
        echo "  Windows: winget install Amazon.AWSCLI"
        echo "  Linux:   https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
        exit 1
    fi
    print_success "AWS CLI installed"
}

check_aws_credentials() {
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS credentials not configured"
        echo ""
        echo "Please configure AWS credentials:"
        echo "  aws configure"
        echo ""
        echo "You will need:"
        echo "  - AWS Access Key ID"
        echo "  - AWS Secret Access Key"
        echo "  - Default region (e.g., us-east-1)"
        exit 1
    fi

    local account_id=$(aws sts get-caller-identity --query Account --output text)
    local user_arn=$(aws sts get-caller-identity --query Arn --output text)

    print_success "AWS credentials configured"
    print_info "Account: $account_id"
    print_info "Identity: $user_arn"
}

# ============================================================================
# Secret Management Functions
# ============================================================================

create_secret() {
    local secret_name="$1"
    local secret_value="$2"
    local description="$3"

    print_info "Creating secret: $secret_name"

    # Check if secret already exists
    if aws secretsmanager describe-secret \
        --secret-id "$secret_name" \
        --region "$AWS_REGION" &> /dev/null; then

        print_warning "Secret already exists, updating..."
        aws secretsmanager update-secret \
            --secret-id "$secret_name" \
            --secret-string "$secret_value" \
            --region "$AWS_REGION" > /dev/null
    else
        aws secretsmanager create-secret \
            --name "$secret_name" \
            --description "$description" \
            --secret-string "$secret_value" \
            --region "$AWS_REGION" > /dev/null
    fi

    print_success "Secret created: $secret_name"
}

# ============================================================================
# IAM Policy and Role Creation
# ============================================================================

create_iam_policy() {
    print_header "Creating IAM Policy"

    local account_id=$(aws sts get-caller-identity --query Account --output text)

    # Check if policy already exists
    local policy_arn="arn:aws:iam::${account_id}:policy/${IAM_POLICY_NAME}"

    if aws iam get-policy --policy-arn "$policy_arn" &> /dev/null; then
        print_warning "IAM policy already exists: $IAM_POLICY_NAME"
        echo "$policy_arn"
        return
    fi

    print_info "Creating IAM policy: $IAM_POLICY_NAME"

    # Create policy document
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
        "arn:aws:secretsmanager:${AWS_REGION}:${account_id}:secret:${SECRET_PREFIX}/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:ListSecrets"
      ],
      "Resource": "*"
    }
  ]
}
EOF
)

    aws iam create-policy \
        --policy-name "$IAM_POLICY_NAME" \
        --policy-document "$policy_document" \
        --description "Allow access to ${SECRET_PREFIX} secrets" > /dev/null

    print_success "IAM policy created: $policy_arn"
    echo "$policy_arn"
}

create_iam_role() {
    print_header "Creating IAM Role for EC2/ECS"

    # Check if role already exists
    if aws iam get-role --role-name "$IAM_ROLE_NAME" &> /dev/null; then
        print_warning "IAM role already exists: $IAM_ROLE_NAME"
        return
    fi

    print_info "Creating IAM role: $IAM_ROLE_NAME"

    # Create trust policy for EC2/ECS
    local trust_policy=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": [
          "ec2.amazonaws.com",
          "ecs-tasks.amazonaws.com"
        ]
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
)

    aws iam create-role \
        --role-name "$IAM_ROLE_NAME" \
        --assume-role-policy-document "$trust_policy" \
        --description "Role for ${SECRET_PREFIX} application to access secrets" > /dev/null

    # Attach the policy to the role
    local account_id=$(aws sts get-caller-identity --query Account --output text)
    local policy_arn="arn:aws:iam::${account_id}:policy/${IAM_POLICY_NAME}"

    aws iam attach-role-policy \
        --role-name "$IAM_ROLE_NAME" \
        --policy-arn "$policy_arn"

    print_success "IAM role created: $IAM_ROLE_NAME"
    print_info "Attach this role to your EC2 instances or ECS tasks"
}

# ============================================================================
# Main Setup Flow
# ============================================================================

main() {
    print_header "AWS Secrets Manager Setup for WhatsApp SaaS Starter"

    echo ""
    print_info "This script will create secrets in AWS Secrets Manager"
    print_info "Region: $AWS_REGION"
    print_info "Secret prefix: $SECRET_PREFIX"
    echo ""

    # Validate prerequisites
    print_header "Validating Prerequisites"
    check_aws_cli
    check_aws_credentials

    echo ""
    print_warning "You will be prompted to enter secret values"
    print_warning "Press Enter to use placeholder values (update later)"
    echo ""

    read -p "Press Enter to continue or Ctrl+C to cancel..."

    # Collect secret values
    print_header "Collecting Secret Values"

    echo ""
    echo "OpenAI Configuration:"
    OPENAI_API_KEY=$(prompt_secret_hidden "OpenAI API Key (from https://platform.openai.com/api-keys)")
    OPENAI_MODEL=$(prompt_secret "OpenAI Model [gpt-4]")
    OPENAI_MODEL=${OPENAI_MODEL:-gpt-4}

    echo ""
    echo "Database Configuration:"
    DATABASE_URL=$(prompt_secret_hidden "Database URL (postgresql://...)")

    echo ""
    echo "Redis Configuration:"
    REDIS_URL=$(prompt_secret_hidden "Redis URL (redis://...)")

    echo ""
    echo "Admin Security:"
    ADMIN_TOKEN=$(prompt_secret_hidden "Admin Token (generate with: openssl rand -base64 32)")

    echo ""
    echo "Meta/WhatsApp Configuration:"
    META_VERIFY_TOKEN=$(prompt_secret "Meta Verify Token")
    META_APP_SECRET=$(prompt_secret_hidden "Meta App Secret")
    WHATSAPP_PHONE_NUMBER_ID=$(prompt_secret "WhatsApp Phone Number ID (optional)")
    WHATSAPP_ACCESS_TOKEN=$(prompt_secret_hidden "WhatsApp Access Token (optional)")

    # Create secrets
    print_header "Creating Secrets in AWS Secrets Manager"

    create_secret "${SECRET_PREFIX}/openai-api-key" "$OPENAI_API_KEY" "OpenAI API key for AI conversations"
    create_secret "${SECRET_PREFIX}/openai-model" "$OPENAI_MODEL" "OpenAI model to use"
    create_secret "${SECRET_PREFIX}/openai-max-tokens" "1000" "Maximum tokens per OpenAI request"
    create_secret "${SECRET_PREFIX}/openai-temperature" "0.7" "OpenAI temperature setting"
    create_secret "${SECRET_PREFIX}/database-url" "$DATABASE_URL" "PostgreSQL connection string"
    create_secret "${SECRET_PREFIX}/redis-url" "$REDIS_URL" "Redis connection string"
    create_secret "${SECRET_PREFIX}/admin-token" "$ADMIN_TOKEN" "Admin API authentication token"
    create_secret "${SECRET_PREFIX}/meta-verify-token" "$META_VERIFY_TOKEN" "Meta webhook verification token"
    create_secret "${SECRET_PREFIX}/meta-app-secret" "$META_APP_SECRET" "Meta app secret for HMAC validation"
    create_secret "${SECRET_PREFIX}/whatsapp-phone-number-id" "$WHATSAPP_PHONE_NUMBER_ID" "Default WhatsApp phone number ID"
    create_secret "${SECRET_PREFIX}/whatsapp-access-token" "$WHATSAPP_ACCESS_TOKEN" "Default WhatsApp access token"

    # Create IAM policy and role
    POLICY_ARN=$(create_iam_policy)
    create_iam_role

    # Test secret retrieval
    print_header "Testing Secret Retrieval"

    print_info "Testing retrieval of OpenAI API key..."
    if aws secretsmanager get-secret-value \
        --secret-id "${SECRET_PREFIX}/openai-api-key" \
        --region "$AWS_REGION" > /dev/null; then
        print_success "Successfully retrieved secret"
    else
        print_error "Failed to retrieve secret"
        exit 1
    fi

    # Cost estimation
    print_header "Cost Estimation"

    local secret_count=11
    local monthly_storage_cost=$(echo "$secret_count * 0.40" | bc)
    local estimated_api_calls=10000
    local monthly_api_cost=0.05

    echo ""
    print_info "Estimated AWS Secrets Manager costs:"
    echo "  - Storage: $secret_count secrets × \$0.40 = \$$monthly_storage_cost/month"
    echo "  - API calls: ~$estimated_api_calls calls × \$0.05/10k = \$$monthly_api_cost/month"
    echo "  - Total estimated: \$$(echo "$monthly_storage_cost + $monthly_api_cost" | bc)/month"
    echo ""
    print_info "Note: Application caches secrets (1-hour TTL) to minimize API calls"

    # Summary
    print_header "Setup Complete!"

    echo ""
    print_success "All secrets created successfully"
    print_success "IAM policy created: $POLICY_ARN"
    print_success "IAM role created: $IAM_ROLE_NAME"
    echo ""

    print_info "Next Steps:"
    echo ""
    echo "1. Update application environment variables:"
    echo "   export USE_AWS_SECRETS=true"
    echo "   export AWS_REGION=$AWS_REGION"
    echo ""
    echo "2. For EC2 deployment:"
    echo "   - Attach IAM role '$IAM_ROLE_NAME' to your EC2 instance"
    echo ""
    echo "3. For ECS deployment:"
    echo "   - Set task role to '$IAM_ROLE_NAME' in task definition"
    echo ""
    echo "4. For local testing:"
    echo "   - Ensure AWS credentials are configured (aws configure)"
    echo "   - Set environment variables as shown above"
    echo ""
    echo "5. Start your application:"
    echo "   cd Backend && npm start"
    echo ""
    echo "6. Verify secrets are loaded:"
    echo "   curl http://localhost:4000/api/v1/health"
    echo ""

    print_info "Documentation: See SECURITY_FIX.md for detailed instructions"
    echo ""

    print_success "Setup completed successfully!"
}

# ============================================================================
# Run main function
# ============================================================================

main "$@"
