# ============================================================================
# AWS Secrets Manager Setup Script (PowerShell)
# ============================================================================
#
# This script automates the setup of AWS Secrets Manager for the
# WhatsApp SaaS Starter application on Windows.
#
# Prerequisites:
# - AWS CLI installed (winget install Amazon.AWSCLI)
# - AWS credentials configured (aws configure)
# - PowerShell 5.1 or later
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts\setup-secrets-manager.ps1
#
# ============================================================================

$ErrorActionPreference = "Stop"

# Configuration
$AWS_REGION = if ($env:AWS_REGION) { $env:AWS_REGION } else { "us-east-1" }
$SECRET_PREFIX = "whatsapp-saas"
$IAM_POLICY_NAME = "$SECRET_PREFIX-secrets-policy"
$IAM_ROLE_NAME = "$SECRET_PREFIX-secrets-role"

# ============================================================================
# Helper Functions
# ============================================================================

function Write-Header {
    param([string]$Message)
    Write-Host "======================================================================" -ForegroundColor Blue
    Write-Host $Message -ForegroundColor Blue
    Write-Host "======================================================================" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Write-ErrorMessage {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

function Write-WarningMessage {
    param([string]$Message)
    Write-Host "⚠ $Message" -ForegroundColor Yellow
}

function Write-InfoMessage {
    param([string]$Message)
    Write-Host "ℹ $Message" -ForegroundColor Cyan
}

function Read-SecretValue {
    param(
        [string]$Prompt,
        [switch]$Hidden
    )

    if ($Hidden) {
        $secureValue = Read-Host "$Prompt" -AsSecureString
        $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureValue)
        $value = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
        [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)
    } else {
        $value = Read-Host "$Prompt"
    }

    if ([string]::IsNullOrWhiteSpace($value)) {
        Write-WarningMessage "No value entered, using placeholder"
        return "PLACEHOLDER-CHANGE-ME"
    }

    return $value
}

# ============================================================================
# Validation Functions
# ============================================================================

function Test-AWSCli {
    Write-InfoMessage "Checking AWS CLI installation..."

    $awsCommand = Get-Command aws -ErrorAction SilentlyContinue

    if (-not $awsCommand) {
        Write-ErrorMessage "AWS CLI not found"
        Write-Host ""
        Write-Host "Please install AWS CLI:"
        Write-Host "  winget install Amazon.AWSCLI"
        Write-Host ""
        Write-Host "Or download from:"
        Write-Host "  https://aws.amazon.com/cli/"
        exit 1
    }

    Write-Success "AWS CLI installed"
}

function Test-AWSCredentials {
    Write-InfoMessage "Checking AWS credentials..."

    try {
        $identity = aws sts get-caller-identity --output json | ConvertFrom-Json

        Write-Success "AWS credentials configured"
        Write-InfoMessage "Account: $($identity.Account)"
        Write-InfoMessage "Identity: $($identity.Arn)"

        return $identity.Account
    } catch {
        Write-ErrorMessage "AWS credentials not configured"
        Write-Host ""
        Write-Host "Please configure AWS credentials:"
        Write-Host "  aws configure"
        Write-Host ""
        Write-Host "You will need:"
        Write-Host "  - AWS Access Key ID"
        Write-Host "  - AWS Secret Access Key"
        Write-Host "  - Default region (e.g., us-east-1)"
        exit 1
    }
}

# ============================================================================
# Secret Management Functions
# ============================================================================

function New-Secret {
    param(
        [string]$Name,
        [string]$Value,
        [string]$Description
    )

    Write-InfoMessage "Creating secret: $Name"

    # Check if secret exists
    try {
        $existingSecret = aws secretsmanager describe-secret `
            --secret-id $Name `
            --region $AWS_REGION 2>$null | ConvertFrom-Json

        Write-WarningMessage "Secret already exists, updating..."

        aws secretsmanager update-secret `
            --secret-id $Name `
            --secret-string $Value `
            --region $AWS_REGION >$null

    } catch {
        # Secret doesn't exist, create it
        aws secretsmanager create-secret `
            --name $Name `
            --description $Description `
            --secret-string $Value `
            --region $AWS_REGION >$null
    }

    Write-Success "Secret created: $Name"
}

# ============================================================================
# IAM Policy and Role Creation
# ============================================================================

function New-IAMPolicy {
    Write-Header "Creating IAM Policy"

    $accountId = (aws sts get-caller-identity --query Account --output text)
    $policyArn = "arn:aws:iam::${accountId}:policy/${IAM_POLICY_NAME}"

    # Check if policy exists
    try {
        aws iam get-policy --policy-arn $policyArn >$null 2>&1
        Write-WarningMessage "IAM policy already exists: $IAM_POLICY_NAME"
        return $policyArn
    } catch {
        # Policy doesn't exist
    }

    Write-InfoMessage "Creating IAM policy: $IAM_POLICY_NAME"

    $policyDocument = @{
        Version = "2012-10-17"
        Statement = @(
            @{
                Effect = "Allow"
                Action = @(
                    "secretsmanager:GetSecretValue",
                    "secretsmanager:DescribeSecret"
                )
                Resource = @(
                    "arn:aws:secretsmanager:${AWS_REGION}:${accountId}:secret:${SECRET_PREFIX}/*"
                )
            },
            @{
                Effect = "Allow"
                Action = @(
                    "secretsmanager:ListSecrets"
                )
                Resource = "*"
            }
        )
    } | ConvertTo-Json -Depth 10

    aws iam create-policy `
        --policy-name $IAM_POLICY_NAME `
        --policy-document $policyDocument `
        --description "Allow access to ${SECRET_PREFIX} secrets" >$null

    Write-Success "IAM policy created: $policyArn"
    return $policyArn
}

function New-IAMRole {
    Write-Header "Creating IAM Role for EC2/ECS"

    # Check if role exists
    try {
        aws iam get-role --role-name $IAM_ROLE_NAME >$null 2>&1
        Write-WarningMessage "IAM role already exists: $IAM_ROLE_NAME"
        return
    } catch {
        # Role doesn't exist
    }

    Write-InfoMessage "Creating IAM role: $IAM_ROLE_NAME"

    $trustPolicy = @{
        Version = "2012-10-17"
        Statement = @(
            @{
                Effect = "Allow"
                Principal = @{
                    Service = @(
                        "ec2.amazonaws.com",
                        "ecs-tasks.amazonaws.com"
                    )
                }
                Action = "sts:AssumeRole"
            }
        )
    } | ConvertTo-Json -Depth 10

    aws iam create-role `
        --role-name $IAM_ROLE_NAME `
        --assume-role-policy-document $trustPolicy `
        --description "Role for ${SECRET_PREFIX} application to access secrets" >$null

    # Attach policy to role
    $accountId = (aws sts get-caller-identity --query Account --output text)
    $policyArn = "arn:aws:iam::${accountId}:policy/${IAM_POLICY_NAME}"

    aws iam attach-role-policy `
        --role-name $IAM_ROLE_NAME `
        --policy-arn $policyArn

    Write-Success "IAM role created: $IAM_ROLE_NAME"
    Write-InfoMessage "Attach this role to your EC2 instances or ECS tasks"
}

# ============================================================================
# Main Setup Flow
# ============================================================================

function Main {
    Write-Header "AWS Secrets Manager Setup for WhatsApp SaaS Starter"

    Write-Host ""
    Write-InfoMessage "This script will create secrets in AWS Secrets Manager"
    Write-InfoMessage "Region: $AWS_REGION"
    Write-InfoMessage "Secret prefix: $SECRET_PREFIX"
    Write-Host ""

    # Validate prerequisites
    Write-Header "Validating Prerequisites"
    Test-AWSCli
    $accountId = Test-AWSCredentials

    Write-Host ""
    Write-WarningMessage "You will be prompted to enter secret values"
    Write-WarningMessage "Press Enter to use placeholder values (update later)"
    Write-Host ""

    Read-Host "Press Enter to continue or Ctrl+C to cancel"

    # Collect secret values
    Write-Header "Collecting Secret Values"

    Write-Host ""
    Write-Host "OpenAI Configuration:" -ForegroundColor Yellow
    $OPENAI_API_KEY = Read-SecretValue -Prompt "OpenAI API Key (from https://platform.openai.com/api-keys)" -Hidden
    $OPENAI_MODEL = Read-SecretValue -Prompt "OpenAI Model [gpt-4]"
    if ([string]::IsNullOrWhiteSpace($OPENAI_MODEL) -or $OPENAI_MODEL -eq "PLACEHOLDER-CHANGE-ME") {
        $OPENAI_MODEL = "gpt-4"
    }

    Write-Host ""
    Write-Host "Database Configuration:" -ForegroundColor Yellow
    $DATABASE_URL = Read-SecretValue -Prompt "Database URL (postgresql://...)" -Hidden

    Write-Host ""
    Write-Host "Redis Configuration:" -ForegroundColor Yellow
    $REDIS_URL = Read-SecretValue -Prompt "Redis URL (redis://...)" -Hidden

    Write-Host ""
    Write-Host "Admin Security:" -ForegroundColor Yellow
    $ADMIN_TOKEN = Read-SecretValue -Prompt "Admin Token (generate with: openssl rand -base64 32)" -Hidden

    Write-Host ""
    Write-Host "Meta/WhatsApp Configuration:" -ForegroundColor Yellow
    $META_VERIFY_TOKEN = Read-SecretValue -Prompt "Meta Verify Token"
    $META_APP_SECRET = Read-SecretValue -Prompt "Meta App Secret" -Hidden
    $WHATSAPP_PHONE_NUMBER_ID = Read-SecretValue -Prompt "WhatsApp Phone Number ID (optional)"
    $WHATSAPP_ACCESS_TOKEN = Read-SecretValue -Prompt "WhatsApp Access Token (optional)" -Hidden

    # Create secrets
    Write-Header "Creating Secrets in AWS Secrets Manager"

    New-Secret -Name "${SECRET_PREFIX}/openai-api-key" -Value $OPENAI_API_KEY -Description "OpenAI API key for AI conversations"
    New-Secret -Name "${SECRET_PREFIX}/openai-model" -Value $OPENAI_MODEL -Description "OpenAI model to use"
    New-Secret -Name "${SECRET_PREFIX}/openai-max-tokens" -Value "1000" -Description "Maximum tokens per OpenAI request"
    New-Secret -Name "${SECRET_PREFIX}/openai-temperature" -Value "0.7" -Description "OpenAI temperature setting"
    New-Secret -Name "${SECRET_PREFIX}/database-url" -Value $DATABASE_URL -Description "PostgreSQL connection string"
    New-Secret -Name "${SECRET_PREFIX}/redis-url" -Value $REDIS_URL -Description "Redis connection string"
    New-Secret -Name "${SECRET_PREFIX}/admin-token" -Value $ADMIN_TOKEN -Description "Admin API authentication token"
    New-Secret -Name "${SECRET_PREFIX}/meta-verify-token" -Value $META_VERIFY_TOKEN -Description "Meta webhook verification token"
    New-Secret -Name "${SECRET_PREFIX}/meta-app-secret" -Value $META_APP_SECRET -Description "Meta app secret for HMAC validation"
    New-Secret -Name "${SECRET_PREFIX}/whatsapp-phone-number-id" -Value $WHATSAPP_PHONE_NUMBER_ID -Description "Default WhatsApp phone number ID"
    New-Secret -Name "${SECRET_PREFIX}/whatsapp-access-token" -Value $WHATSAPP_ACCESS_TOKEN -Description "Default WhatsApp access token"

    # Create IAM policy and role
    $policyArn = New-IAMPolicy
    New-IAMRole

    # Test secret retrieval
    Write-Header "Testing Secret Retrieval"

    Write-InfoMessage "Testing retrieval of OpenAI API key..."
    try {
        aws secretsmanager get-secret-value `
            --secret-id "${SECRET_PREFIX}/openai-api-key" `
            --region $AWS_REGION >$null
        Write-Success "Successfully retrieved secret"
    } catch {
        Write-ErrorMessage "Failed to retrieve secret"
        exit 1
    }

    # Cost estimation
    Write-Header "Cost Estimation"

    $secretCount = 11
    $monthlyStorageCost = $secretCount * 0.40
    $estimatedApiCalls = 10000
    $monthlyApiCost = 0.05
    $totalCost = $monthlyStorageCost + $monthlyApiCost

    Write-Host ""
    Write-InfoMessage "Estimated AWS Secrets Manager costs:"
    Write-Host "  - Storage: $secretCount secrets × `$0.40 = `$$monthlyStorageCost/month"
    Write-Host "  - API calls: ~$estimatedApiCalls calls × `$0.05/10k = `$$monthlyApiCost/month"
    Write-Host "  - Total estimated: `$$totalCost/month"
    Write-Host ""
    Write-InfoMessage "Note: Application caches secrets (1-hour TTL) to minimize API calls"

    # Summary
    Write-Header "Setup Complete!"

    Write-Host ""
    Write-Success "All secrets created successfully"
    Write-Success "IAM policy created: $policyArn"
    Write-Success "IAM role created: $IAM_ROLE_NAME"
    Write-Host ""

    Write-InfoMessage "Next Steps:"
    Write-Host ""
    Write-Host "1. Update application environment variables:"
    Write-Host "   `$env:USE_AWS_SECRETS = 'true'"
    Write-Host "   `$env:AWS_REGION = '$AWS_REGION'"
    Write-Host ""
    Write-Host "2. For EC2 deployment:"
    Write-Host "   - Attach IAM role '$IAM_ROLE_NAME' to your EC2 instance"
    Write-Host ""
    Write-Host "3. For ECS deployment:"
    Write-Host "   - Set task role to '$IAM_ROLE_NAME' in task definition"
    Write-Host ""
    Write-Host "4. For local testing:"
    Write-Host "   - Ensure AWS credentials are configured (aws configure)"
    Write-Host "   - Set environment variables as shown above"
    Write-Host ""
    Write-Host "5. Start your application:"
    Write-Host "   cd Backend"
    Write-Host "   npm start"
    Write-Host ""
    Write-Host "6. Verify secrets are loaded:"
    Write-Host "   curl http://localhost:3000/healthz"
    Write-Host ""

    Write-InfoMessage "Documentation: See SECURITY_FIX.md for detailed instructions"
    Write-Host ""

    Write-Success "Setup completed successfully!"
}

# ============================================================================
# Run main function
# ============================================================================

try {
    Main
} catch {
    Write-ErrorMessage "An error occurred: $_"
    exit 1
}
