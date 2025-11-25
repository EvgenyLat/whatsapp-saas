#!/bin/bash

##############################################################################
# Staging Deployment Script
#
# Deploys the WhatsApp SaaS MVP application to the staging environment
# on AWS ECS with zero-downtime deployment.
#
# Usage:
#   ./scripts/deploy-staging.sh
#
# Environment Variables Required:
#   - AWS_REGION: AWS region
#   - ECS_CLUSTER: ECS cluster name
#   - ECS_SERVICE: ECS service name
#   - TASK_DEFINITION: Task definition family name
#   - IMAGE_TAG: Docker image tag to deploy
#   - ECR_REGISTRY: ECR registry URL
#
##############################################################################

set -e  # Exit on error
set -u  # Exit on undefined variable
set -o pipefail  # Exit on pipe failure

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT="${ENVIRONMENT:-staging}"

# Required environment variables
: "${AWS_REGION:?AWS_REGION is required}"
: "${ECS_CLUSTER:?ECS_CLUSTER is required}"
: "${ECS_SERVICE:?ECS_SERVICE is required}"
: "${TASK_DEFINITION:?TASK_DEFINITION is required}"
: "${IMAGE_TAG:?IMAGE_TAG is required}"
: "${ECR_REGISTRY:?ECR_REGISTRY is required}"

IMAGE_NAME="${IMAGE_NAME:-whatsapp-saas-mvp}"
FULL_IMAGE="${ECR_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"

# Logging functions
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

# Error handler
error_exit() {
    log_error "$1"
    exit 1
}

# Main deployment function
main() {
    log_info "Starting deployment to ${ENVIRONMENT} environment..."
    log_info "Cluster: ${ECS_CLUSTER}"
    log_info "Service: ${ECS_SERVICE}"
    log_info "Image: ${FULL_IMAGE}"
    echo ""

    # Step 1: Verify AWS credentials
    verify_aws_credentials

    # Step 2: Verify ECS cluster exists
    verify_ecs_cluster

    # Step 3: Get current task definition
    get_current_task_definition

    # Step 4: Create new task definition
    create_new_task_definition

    # Step 5: Update ECS service
    update_ecs_service

    # Step 6: Monitor deployment
    monitor_deployment

    log_success "Deployment to ${ENVIRONMENT} completed successfully!"
    echo ""
    log_info "Deployment Summary:"
    log_info "  Environment: ${ENVIRONMENT}"
    log_info "  Cluster: ${ECS_CLUSTER}"
    log_info "  Service: ${ECS_SERVICE}"
    log_info "  Image: ${FULL_IMAGE}"
    log_info "  Task Definition: ${NEW_TASK_DEFINITION_ARN}"
}

# Verify AWS credentials are configured
verify_aws_credentials() {
    log_info "Verifying AWS credentials..."

    if ! aws sts get-caller-identity &> /dev/null; then
        error_exit "AWS credentials not configured or invalid"
    fi

    local account_id=$(aws sts get-caller-identity --query Account --output text)
    log_success "AWS credentials verified (Account: ${account_id})"
}

# Verify ECS cluster exists
verify_ecs_cluster() {
    log_info "Verifying ECS cluster: ${ECS_CLUSTER}..."

    if ! aws ecs describe-clusters \
        --clusters "${ECS_CLUSTER}" \
        --region "${AWS_REGION}" \
        --query 'clusters[0].status' \
        --output text | grep -q "ACTIVE"; then
        error_exit "ECS cluster ${ECS_CLUSTER} not found or not active"
    fi

    log_success "ECS cluster verified"
}

# Get current task definition
get_current_task_definition() {
    log_info "Retrieving current task definition..."

    # Get the current task definition ARN
    CURRENT_TASK_DEF_ARN=$(aws ecs describe-services \
        --cluster "${ECS_CLUSTER}" \
        --services "${ECS_SERVICE}" \
        --region "${AWS_REGION}" \
        --query 'services[0].taskDefinition' \
        --output text)

    if [ -z "$CURRENT_TASK_DEF_ARN" ] || [ "$CURRENT_TASK_DEF_ARN" = "None" ]; then
        log_warning "No current task definition found, will create new one"
        CURRENT_TASK_DEF_ARN=""
    else
        log_success "Current task definition: ${CURRENT_TASK_DEF_ARN}"

        # Save current task definition for potential rollback
        aws ecs describe-task-definition \
            --task-definition "${CURRENT_TASK_DEF_ARN}" \
            --region "${AWS_REGION}" \
            > "/tmp/task-def-backup-$(date +%Y%m%d-%H%M%S).json"

        log_info "Current task definition backed up"
    fi
}

# Create new task definition with updated image
create_new_task_definition() {
    log_info "Creating new task definition with image: ${FULL_IMAGE}..."

    if [ -z "$CURRENT_TASK_DEF_ARN" ]; then
        log_warning "Creating task definition from template (not implemented)"
        error_exit "Task definition template not found. Please create task definition first."
    fi

    # Get current task definition
    TASK_DEF_JSON=$(aws ecs describe-task-definition \
        --task-definition "${CURRENT_TASK_DEF_ARN}" \
        --region "${AWS_REGION}" \
        --query 'taskDefinition' \
        --output json)

    # Update image in task definition
    NEW_TASK_DEF_JSON=$(echo "$TASK_DEF_JSON" | jq --arg IMAGE "$FULL_IMAGE" '
        .containerDefinitions[0].image = $IMAGE |
        del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy)
    ')

    # Register new task definition
    NEW_TASK_DEF_ARN=$(echo "$NEW_TASK_DEF_JSON" | \
        aws ecs register-task-definition \
            --cli-input-json file:///dev/stdin \
            --region "${AWS_REGION}" \
            --query 'taskDefinition.taskDefinitionArn' \
            --output text)

    if [ -z "$NEW_TASK_DEF_ARN" ]; then
        error_exit "Failed to register new task definition"
    fi

    log_success "New task definition registered: ${NEW_TASK_DEF_ARN}"

    # Export for use in other functions
    export NEW_TASK_DEFINITION_ARN="$NEW_TASK_DEF_ARN"
}

# Update ECS service with new task definition
update_ecs_service() {
    log_info "Updating ECS service: ${ECS_SERVICE}..."

    # Update service with new task definition
    aws ecs update-service \
        --cluster "${ECS_CLUSTER}" \
        --service "${ECS_SERVICE}" \
        --task-definition "${NEW_TASK_DEF_ARN}" \
        --region "${AWS_REGION}" \
        --force-new-deployment \
        > /dev/null

    log_success "ECS service updated"
}

# Monitor deployment progress
monitor_deployment() {
    log_info "Monitoring deployment progress..."
    log_info "This may take several minutes..."
    echo ""

    local max_wait=600  # 10 minutes
    local elapsed=0
    local interval=15

    while [ $elapsed -lt $max_wait ]; do
        # Get service status
        SERVICE_STATUS=$(aws ecs describe-services \
            --cluster "${ECS_CLUSTER}" \
            --services "${ECS_SERVICE}" \
            --region "${AWS_REGION}" \
            --query 'services[0]' \
            --output json)

        # Parse deployment information
        local running_count=$(echo "$SERVICE_STATUS" | jq -r '.runningCount')
        local desired_count=$(echo "$SERVICE_STATUS" | jq -r '.desiredCount')
        local deployments=$(echo "$SERVICE_STATUS" | jq -r '.deployments | length')

        log_info "Running tasks: ${running_count}/${desired_count}"
        log_info "Active deployments: ${deployments}"

        # Check if deployment is complete
        if [ "$running_count" -eq "$desired_count" ] && [ "$deployments" -eq 1 ]; then
            local primary_deployment=$(echo "$SERVICE_STATUS" | jq -r '.deployments[0]')
            local deployment_status=$(echo "$primary_deployment" | jq -r '.rolloutState // "IN_PROGRESS"')

            if [ "$deployment_status" = "COMPLETED" ]; then
                log_success "Deployment completed successfully!"
                return 0
            fi
        fi

        # Wait before next check
        sleep $interval
        elapsed=$((elapsed + interval))
    done

    log_warning "Deployment monitoring timed out after ${max_wait} seconds"
    log_info "Deployment may still be in progress. Check AWS Console for status."
}

# Cleanup function
cleanup() {
    log_info "Cleaning up temporary files..."
    # Add cleanup tasks if needed
}

# Trap errors and cleanup
trap cleanup EXIT

# Run main function
main

exit 0
