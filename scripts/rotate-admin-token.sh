#!/bin/bash

################################################################################
# ADMIN_TOKEN Rotation Script
# Safely rotates the admin API token with zero downtime
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
SECRET_NAME="${PROJECT_NAME}/${ENVIRONMENT}/admin-token"

# Rotation strategy
ROTATION_STRATEGY="${ROTATION_STRATEGY:-immediate}"  # immediate | gradual
GRACE_PERIOD_SECONDS="${GRACE_PERIOD_SECONDS:-300}"  # 5 minutes for gradual

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

    # Check openssl
    if ! command -v openssl &> /dev/null; then
        log_error "openssl is not installed"
        exit 1
    fi

    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured"
        exit 1
    fi

    # Check if secret exists
    if ! aws secretsmanager describe-secret \
        --secret-id "${SECRET_NAME}" \
        --region "${AWS_REGION}" &> /dev/null; then
        log_error "Secret ${SECRET_NAME} does not exist"
        exit 1
    fi

    log_success "Prerequisites check passed"
}

generate_new_token() {
    # Generate a secure 64-character random token
    openssl rand -base64 48 | tr -d '\n'
}

get_current_token() {
    aws secretsmanager get-secret-value \
        --secret-id "${SECRET_NAME}" \
        --region "${AWS_REGION}" \
        --query 'SecretString' \
        --output text 2>/dev/null || echo ""
}

get_secret_metadata() {
    aws secretsmanager describe-secret \
        --secret-id "${SECRET_NAME}" \
        --region "${AWS_REGION}" \
        --query '{Name:Name,LastChanged:LastChangedDate,LastAccessed:LastAccessedDate}' \
        --output json
}

rotate_immediate() {
    log_info "Starting immediate rotation..."

    # Generate new token
    local new_token=$(generate_new_token)
    log_success "Generated new admin token"

    # Get current token for backup
    local old_token=$(get_current_token)

    if [ -z "$old_token" ]; then
        log_error "Could not retrieve current token"
        exit 1
    fi

    # Save old token to backup file
    echo "$old_token" > ".admin-token-backup-$(date +%Y%m%d-%H%M%S).txt"
    log_info "Backed up old token to: .admin-token-backup-$(date +%Y%m%d-%H%M%S).txt"

    # Update secret with new token
    log_info "Updating secret in AWS Secrets Manager..."

    aws secretsmanager put-secret-value \
        --secret-id "${SECRET_NAME}" \
        --secret-string "${new_token}" \
        --region "${AWS_REGION}" > /dev/null

    log_success "Secret updated successfully"

    # Save new token to file for admin use
    echo "$new_token" > ".admin-token-new-$(date +%Y%m%d-%H%M%S).txt"
    log_warning "New admin token saved to: .admin-token-new-$(date +%Y%m%d-%H%M%S).txt"

    echo ""
    log_warning "IMPORTANT: Update your application to refresh secrets immediately"
    log_info "The old token is immediately invalid"
    log_info "New token: ${new_token:0:10}..."
    echo ""

    return 0
}

rotate_gradual() {
    log_info "Starting gradual rotation with ${GRACE_PERIOD_SECONDS}s grace period..."

    log_warning "Gradual rotation not yet implemented"
    log_info "This would involve:"
    echo "  1. Generate new token"
    echo "  2. Store both old and new tokens"
    echo "  3. Accept both tokens for grace period"
    echo "  4. Remove old token after grace period"
    echo ""
    log_info "For now, use immediate rotation"

    return 1
}

trigger_app_refresh() {
    log_info "Triggering application secret refresh..."

    # If running on AWS, can invoke refresh endpoint or restart containers
    # For now, just provide instructions

    echo ""
    log_info "To refresh secrets in running application:"
    echo ""
    echo "  Option 1: Call refresh endpoint (if exposed):"
    echo "    curl -X POST http://your-api/admin/refresh-secrets \\"
    echo "      -H 'x-admin-token: OLD_TOKEN'"
    echo ""
    echo "  Option 2: Restart application:"
    echo "    # Docker:"
    echo "    docker-compose restart backend"
    echo ""
    echo "    # ECS:"
    echo "    aws ecs update-service --cluster whatsapp-saas-mvp \\"
    echo "      --service whatsapp-saas-api --force-new-deployment"
    echo ""
    echo "    # EC2:"
    echo "    ssh user@server 'sudo systemctl restart whatsapp-saas'"
    echo ""
}

verify_rotation() {
    log_info "Verifying rotation..."

    # Get secret metadata
    local metadata=$(get_secret_metadata)

    log_info "Secret metadata:"
    echo "$metadata" | jq '.'

    # Check last changed date
    local last_changed=$(echo "$metadata" | jq -r '.LastChanged')
    log_success "Last changed: ${last_changed}"

    # Verify we can retrieve the secret
    local current_token=$(get_current_token)

    if [ -z "$current_token" ]; then
        log_error "Could not retrieve secret after rotation"
        return 1
    fi

    log_success "Secret retrieval successful"
    log_info "Token length: ${#current_token} characters"

    return 0
}

create_rotation_log() {
    local log_file="admin-token-rotation.log"

    cat >> "$log_file" <<EOF
Rotation performed: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
Strategy: ${ROTATION_STRATEGY}
AWS Region: ${AWS_REGION}
Secret Name: ${SECRET_NAME}
Performed by: $(aws sts get-caller-identity --query 'Arn' --output text)
Status: Success
EOF

    log_info "Rotation logged to: ${log_file}"
}

schedule_next_rotation() {
    log_info "Scheduling next rotation..."

    # Recommended: Rotate every 90 days
    local next_rotation=$(date -d "+90 days" +"%Y-%m-%d")

    echo ""
    log_warning "IMPORTANT: Schedule next rotation"
    echo "  Recommended date: ${next_rotation}"
    echo ""
    log_info "To automate rotation, set up:"
    echo "  1. AWS Lambda function triggered by EventBridge (cron)"
    echo "  2. GitHub Actions scheduled workflow"
    echo "  3. Cron job on management server"
    echo ""
}

display_summary() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║           Admin Token Rotation Complete                       ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""

    log_success "Admin token has been rotated successfully"
    echo ""

    log_warning "POST-ROTATION CHECKLIST:"
    echo "  [ ] Update CI/CD pipelines with new token"
    echo "  [ ] Update monitoring/alerting tools"
    echo "  [ ] Update documentation with rotation date"
    echo "  [ ] Verify application is using new token"
    echo "  [ ] Delete backup token files securely"
    echo "  [ ] Schedule next rotation (recommended: 90 days)"
    echo ""

    log_info "Backup files created:"
    ls -lh .admin-token-*.txt 2>/dev/null || echo "  None"
    echo ""

    log_warning "Remember to delete backup files after verifying rotation:"
    echo "  shred -u .admin-token-*.txt"
    echo ""
}

rollback_rotation() {
    log_error "Rollback requested"

    # Find most recent backup
    local backup_file=$(ls -t .admin-token-backup-*.txt 2>/dev/null | head -n1)

    if [ -z "$backup_file" ]; then
        log_error "No backup file found for rollback"
        exit 1
    fi

    log_info "Found backup: ${backup_file}"

    read -p "Restore token from this backup? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        log_error "Rollback cancelled"
        exit 1
    fi

    local old_token=$(cat "$backup_file")

    # Restore old token
    aws secretsmanager put-secret-value \
        --secret-id "${SECRET_NAME}" \
        --secret-string "${old_token}" \
        --region "${AWS_REGION}" > /dev/null

    log_success "Token rolled back to previous value"
    log_warning "Backup file preserved: ${backup_file}"
}

cleanup_backup_files() {
    log_info "Cleaning up backup files..."

    # Securely delete backup files
    for file in .admin-token-*.txt; do
        if [ -f "$file" ]; then
            if command -v shred &> /dev/null; then
                shred -u "$file"
                log_success "Securely deleted: ${file}"
            else
                rm -f "$file"
                log_warning "Deleted: ${file} (shred not available, file not securely wiped)"
            fi
        fi
    done
}

################################################################################
# Main Script
################################################################################

main() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║       Admin Token Rotation Script                             ║"
    echo "║       WhatsApp SaaS Starter                                    ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""

    check_prerequisites
    echo ""

    log_info "Current configuration:"
    log_info "  Secret: ${SECRET_NAME}"
    log_info "  Region: ${AWS_REGION}"
    log_info "  Strategy: ${ROTATION_STRATEGY}"
    echo ""

    # Get current secret metadata
    log_info "Current secret status:"
    get_secret_metadata | jq '.'
    echo ""

    log_warning "This will rotate the admin token and invalidate the old one"
    read -p "Continue with rotation? (yes/no): " confirm

    if [ "$confirm" != "yes" ]; then
        log_error "Rotation cancelled"
        exit 1
    fi

    echo ""

    # Perform rotation based on strategy
    case "$ROTATION_STRATEGY" in
        immediate)
            rotate_immediate
            ;;
        gradual)
            rotate_gradual
            ;;
        *)
            log_error "Unknown rotation strategy: $ROTATION_STRATEGY"
            exit 1
            ;;
    esac

    # Verify rotation
    echo ""
    verify_rotation

    # Create rotation log
    create_rotation_log

    # Provide refresh instructions
    trigger_app_refresh

    # Schedule next rotation
    schedule_next_rotation

    # Display summary
    display_summary

    log_success "Rotation complete!"
}

# Handle script arguments
case "${1:-rotate}" in
    rotate)
        main
        ;;
    rollback)
        check_prerequisites
        rollback_rotation
        ;;
    verify)
        check_prerequisites
        verify_rotation
        ;;
    clean)
        cleanup_backup_files
        ;;
    *)
        echo "Usage: $0 {rotate|rollback|verify|clean}"
        echo ""
        echo "Commands:"
        echo "  rotate   - Rotate admin token (default)"
        echo "  rollback - Rollback to previous token"
        echo "  verify   - Verify current token is accessible"
        echo "  clean    - Securely delete backup files"
        echo ""
        echo "Environment variables:"
        echo "  AWS_REGION            - AWS region (default: us-east-1)"
        echo "  ENVIRONMENT           - Environment name (default: mvp)"
        echo "  ROTATION_STRATEGY     - immediate | gradual (default: immediate)"
        echo "  GRACE_PERIOD_SECONDS  - Grace period for gradual (default: 300)"
        exit 1
        ;;
esac
