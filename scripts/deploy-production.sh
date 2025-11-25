#!/bin/bash

##############################################################################
# Production Deployment Script (Blue-Green)
#
# Deploys the WhatsApp SaaS MVP application to production using blue-green
# deployment strategy for zero-downtime and easy rollback.
#
# Usage:
#   ./scripts/deploy-production.sh
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
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT="${ENVIRONMENT:-production}"

# Required environment variables
: "${AWS_REGION:?AWS_REGION is required}"
: "${ECS_CLUSTER:?ECS_CLUSTER is required}"
: "${ECS_SERVICE:?ECS_SERVICE is required}"
: "${TASK_DEFINITION:?TASK_DEFINITION is required}"
: "${IMAGE_TAG:?IMAGE_TAG is required}"
: "${ECR_REGISTRY:?ECR_REGISTRY is required}"

IMAGE_NAME="${IMAGE_NAME:-whatsapp-saas-mvp}"
FULL_IMAGE="${ECR_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"

# Deployment configuration
MIN_HEALTHY_PERCENT="${MIN_HEALTHY_PERCENT:-100}"
MAX_PERCENT="${MAX_PERCENT:-200}"
HEALTH_CHECK_GRACE_PERIOD="${HEALTH_CHECK_GRACE_PERIOD:-60}"

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

log_step() {
    echo -e "${MAGENTA}[STEP]${NC} $1"
}

# Error handler
error_exit() {
    log_error "$1"
    log_error "Deployment failed. Initiating rollback..."
    rollback_deployment
    exit 1
}

# Main deployment function
main() {
    log_step "Starting PRODUCTION deployment with Blue-Green strategy..."
    log_info "Cluster: ${ECS_CLUSTER}"
    log_info "Service: ${ECS_SERVICE}"
    log_info "Image: ${FULL_IMAGE}"
    log_info "Strategy: Blue-Green (min=${MIN_HEALTHY_PERCENT}%, max=${MAX_PERCENT}%)"
    echo ""

    # Pre-deployment checks
    pre_deployment_checks

    # Step 1: Verify AWS credentials
    verify_aws_credentials

    # Step 2: Verify ECS cluster exists
    verify_ecs_cluster

    # Step 3: Get current task definition (BLUE)
    get_current_task_definition

    # Step 4: Create deployment record
    create_deployment_record

    # Step 5: Create new task definition (GREEN)
    create_new_task_definition

    # Step 6: Update ECS service (Blue-Green deployment)
    update_ecs_service_blue_green

    # Step 7: Monitor deployment
    monitor_deployment

    # Step 8: Verify deployment health
    verify_deployment_health

    # Step 9: Post-deployment tasks
    post_deployment_tasks

    log_success "PRODUCTION deployment completed successfully! 🎉"
    echo ""
    log_info "Deployment Summary:"
    log_info "  Environment: ${ENVIRONMENT}"
    log_info "  Cluster: ${ECS_CLUSTER}"
    log_info "  Service: ${ECS_SERVICE}"
    log_info "  Previous Task Definition: ${CURRENT_TASK_DEF_ARN}"
    log_info "  New Task Definition: ${NEW_TASK_DEFINITION_ARN}"
    log_info "  Image: ${FULL_IMAGE}"
    log_info "  Deployment ID: ${DEPLOYMENT_ID}"
}

# Pre-deployment safety checks
pre_deployment_checks() {
    log_step "Running pre-deployment safety checks..."

    # Check if this is actually production
    if [ "$ENVIRONMENT" != "production" ]; then
        error_exit "This script should only be used for production deployments"
    fi

    # Verify critical environment variables
    if [ -z "${IMAGE_TAG}" ] || [ "${IMAGE_TAG}" = "latest" ]; then
        error_exit "IMAGE_TAG must be set to a specific version, not 'latest'"
    fi

    # Check if it's during maintenance window (optional)
    local current_hour=$(date +%H)
    if [ "$current_hour" -lt 2 ] || [ "$current_hour" -gt 6 ]; then
        log_warning "Deploying outside recommended maintenance window (02:00-06:00 UTC)"
        log_warning "Continue? (yes/no)"
        # In CI/CD, this check would be skipped
        if [ -t 0 ]; then  # Only prompt if running interactively
            read -r response
            if [ "$response" != "yes" ]; then
                log_info "Deployment cancelled by user"
                exit 0
            fi
        fi
    fi

    log_success "Pre-deployment checks passed"
}

# Verify AWS credentials are configured
verify_aws_credentials() {
    log_step "Verifying AWS credentials..."

    if ! aws sts get-caller-identity &> /dev/null; then
        error_exit "AWS credentials not configured or invalid"
    fi

    local account_id=$(aws sts get-caller-identity --query Account --output text)
    local caller_arn=$(aws sts get-caller-identity --query Arn --output text)

    log_success "AWS credentials verified"
    log_info "  Account: ${account_id}"
    log_info "  Caller: ${caller_arn}"
}

# Verify ECS cluster exists
verify_ecs_cluster() {
    log_step "Verifying ECS cluster: ${ECS_CLUSTER}..."

    local cluster_status=$(aws ecs describe-clusters \
        --clusters "${ECS_CLUSTER}" \
        --region "${AWS_REGION}" \
        --query 'clusters[0].status' \
        --output text)

    if [ "$cluster_status" != "ACTIVE" ]; then
        error_exit "ECS cluster ${ECS_CLUSTER} not found or not active (Status: ${cluster_status})"
    fi

    local running_tasks=$(aws ecs describe-clusters \
        --clusters "${ECS_CLUSTER}" \
        --region "${AWS_REGION}" \
        --query 'clusters[0].runningTasksCount' \
        --output text)

    log_success "ECS cluster verified (Running tasks: ${running_tasks})"
}

# Get current task definition (BLUE environment)
get_current_task_definition() {
    log_step "Retrieving current task definition (BLUE)..."

    # Get the current task definition ARN
    CURRENT_TASK_DEF_ARN=$(aws ecs describe-services \
        --cluster "${ECS_CLUSTER}" \
        --services "${ECS_SERVICE}" \
        --region "${AWS_REGION}" \
        --query 'services[0].taskDefinition' \
        --output text)

    if [ -z "$CURRENT_TASK_DEF_ARN" ] || [ "$CURRENT_TASK_DEF_ARN" = "None" ]; then
        error_exit "No current task definition found. Service may not exist."
    fi

    log_success "Current task definition (BLUE): ${CURRENT_TASK_DEF_ARN}"

    # Save current task definition for rollback
    local backup_file="/tmp/task-def-backup-$(date +%Y%m%d-%H%M%S).json"
    aws ecs describe-task-definition \
        --task-definition "${CURRENT_TASK_DEF_ARN}" \
        --region "${AWS_REGION}" \
        > "$backup_file"

    log_info "Current task definition backed up to: ${backup_file}"

    # Export for rollback function
    export ROLLBACK_TASK_DEF_ARN="$CURRENT_TASK_DEF_ARN"
    export ROLLBACK_BACKUP_FILE="$backup_file"
}

# Create deployment record
create_deployment_record() {
    log_step "Creating deployment record..."

    DEPLOYMENT_ID="deploy-$(date +%Y%m%d-%H%M%S)-${IMAGE_TAG}"

    local record_file="/tmp/deployment-${DEPLOYMENT_ID}.json"

    cat > "$record_file" <<EOF
{
  "deploymentId": "${DEPLOYMENT_ID}",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "environment": "${ENVIRONMENT}",
  "cluster": "${ECS_CLUSTER}",
  "service": "${ECS_SERVICE}",
  "previousTaskDefinition": "${CURRENT_TASK_DEF_ARN}",
  "newImage": "${FULL_IMAGE}",
  "imageTag": "${IMAGE_TAG}",
  "deployedBy": "${USER:-github-actions}",
  "gitCommit": "${GITHUB_SHA:-unknown}"
}
EOF

    log_success "Deployment record created: ${record_file}"
    export DEPLOYMENT_RECORD_FILE="$record_file"
}

# Create new task definition (GREEN environment)
create_new_task_definition() {
    log_step "Creating new task definition (GREEN) with image: ${FULL_IMAGE}..."

    # Get current task definition
    TASK_DEF_JSON=$(aws ecs describe-task-definition \
        --task-definition "${CURRENT_TASK_DEF_ARN}" \
        --region "${AWS_REGION}" \
        --query 'taskDefinition' \
        --output json)

    # Update image in task definition and add deployment metadata
    NEW_TASK_DEF_JSON=$(echo "$TASK_DEF_JSON" | jq --arg IMAGE "$FULL_IMAGE" --arg DEPLOY_ID "$DEPLOYMENT_ID" '
        .containerDefinitions[0].image = $IMAGE |
        .containerDefinitions[0].environment += [
            {"name": "DEPLOYMENT_ID", "value": $DEPLOY_ID},
            {"name": "DEPLOYMENT_TIME", "value": (now | todate)}
        ] |
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

    log_success "New task definition (GREEN) registered: ${NEW_TASK_DEF_ARN}"

    # Export for use in other functions
    export NEW_TASK_DEFINITION_ARN="$NEW_TASK_DEF_ARN"
}

# Update ECS service with Blue-Green deployment strategy
update_ecs_service_blue_green() {
    log_step "Initiating Blue-Green deployment..."

    # Update service with new task definition
    # ECS will automatically handle blue-green deployment based on deployment configuration
    local update_output=$(aws ecs update-service \
        --cluster "${ECS_CLUSTER}" \
        --service "${ECS_SERVICE}" \
        --task-definition "${NEW_TASK_DEF_ARN}" \
        --region "${AWS_REGION}" \
        --force-new-deployment \
        --deployment-configuration \
            "minimumHealthyPercent=${MIN_HEALTHY_PERCENT},maximumPercent=${MAX_PERCENT}" \
        --output json)

    local service_arn=$(echo "$update_output" | jq -r '.service.serviceArn')

    log_success "ECS service updated: ${service_arn}"
    log_info "Blue-Green deployment initiated"
    log_info "  Minimum Healthy: ${MIN_HEALTHY_PERCENT}%"
    log_info "  Maximum: ${MAX_PERCENT}%"
    log_info ""
    log_info "ECS will now:"
    log_info "  1. Start new tasks (GREEN) with new task definition"
    log_info "  2. Wait for new tasks to pass health checks"
    log_info "  3. Drain connections from old tasks (BLUE)"
    log_info "  4. Stop old tasks (BLUE)"
}

# Monitor deployment progress
monitor_deployment() {
    log_step "Monitoring Blue-Green deployment progress..."
    log_info "This may take several minutes..."
    echo ""

    local max_wait=900  # 15 minutes
    local elapsed=0
    local interval=20
    local last_event=""

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
        local pending_count=$(echo "$SERVICE_STATUS" | jq -r '.pendingCount')
        local deployments=$(echo "$SERVICE_STATUS" | jq -r '.deployments')
        local deployment_count=$(echo "$deployments" | jq 'length')

        # Display deployment status
        log_info "Status: Running=${running_count}/${desired_count}, Pending=${pending_count}, Deployments=${deployment_count}"

        # Show deployment details
        if [ "$deployment_count" -gt 0 ]; then
            for i in $(seq 0 $((deployment_count - 1))); do
                local deployment=$(echo "$deployments" | jq -r ".[$i]")
                local status=$(echo "$deployment" | jq -r '.status')
                local rollout_state=$(echo "$deployment" | jq -r '.rolloutState // "IN_PROGRESS"')
                local task_def=$(echo "$deployment" | jq -r '.taskDefinition' | awk -F'/' '{print $NF}')
                local running=$(echo "$deployment" | jq -r '.runningCount')
                local desired=$(echo "$deployment" | jq -r '.desiredCount')

                if [ "$i" -eq 0 ]; then
                    log_info "  PRIMARY: ${task_def} - ${status} (${rollout_state}) - ${running}/${desired} tasks"
                else
                    log_info "  ACTIVE:  ${task_def} - ${status} (${rollout_state}) - ${running}/${desired} tasks"
                fi
            done
        fi

        # Check recent events
        local latest_event=$(echo "$SERVICE_STATUS" | jq -r '.events[0].message')
        if [ "$latest_event" != "$last_event" ]; then
            log_info "Event: ${latest_event}"
            last_event="$latest_event"
        fi

        # Check if deployment is complete
        if [ "$running_count" -eq "$desired_count" ] && [ "$pending_count" -eq 0 ] && [ "$deployment_count" -eq 1 ]; then
            local primary_deployment=$(echo "$deployments" | jq -r '.[0]')
            local deployment_status=$(echo "$primary_deployment" | jq -r '.rolloutState // "IN_PROGRESS"')
            local deployment_task_def=$(echo "$primary_deployment" | jq -r '.taskDefinition')

            if [ "$deployment_status" = "COMPLETED" ] && [ "$deployment_task_def" = "$NEW_TASK_DEF_ARN" ]; then
                log_success "Blue-Green deployment completed successfully!"
                log_success "All tasks are now running the new version (GREEN)"
                return 0
            fi
        fi

        # Wait before next check
        sleep $interval
        elapsed=$((elapsed + interval))
        echo ""
    done

    error_exit "Deployment monitoring timed out after ${max_wait} seconds"
}

# Verify deployment health
verify_deployment_health() {
    log_step "Verifying deployment health..."

    # Wait for health check grace period
    log_info "Waiting ${HEALTH_CHECK_GRACE_PERIOD} seconds for health checks..."
    sleep "$HEALTH_CHECK_GRACE_PERIOD"

    # Get task health status
    local task_arns=$(aws ecs list-tasks \
        --cluster "${ECS_CLUSTER}" \
        --service-name "${ECS_SERVICE}" \
        --region "${AWS_REGION}" \
        --query 'taskArns[]' \
        --output text)

    if [ -z "$task_arns" ]; then
        error_exit "No tasks found for service ${ECS_SERVICE}"
    fi

    local task_count=$(echo "$task_arns" | wc -w)
    log_info "Checking health of ${task_count} tasks..."

    # Check each task
    local healthy_count=0
    for task_arn in $task_arns; do
        local task_details=$(aws ecs describe-tasks \
            --cluster "${ECS_CLUSTER}" \
            --tasks "$task_arn" \
            --region "${AWS_REGION}" \
            --query 'tasks[0]' \
            --output json)

        local task_status=$(echo "$task_details" | jq -r '.lastStatus')
        local health_status=$(echo "$task_details" | jq -r '.healthStatus // "UNKNOWN"')

        if [ "$task_status" = "RUNNING" ] && [ "$health_status" = "HEALTHY" ]; then
            ((healthy_count++))
        fi
    done

    log_info "Healthy tasks: ${healthy_count}/${task_count}"

    if [ "$healthy_count" -eq "$task_count" ]; then
        log_success "All tasks are healthy!"
    elif [ "$healthy_count" -gt 0 ]; then
        log_warning "Some tasks are not healthy yet (${healthy_count}/${task_count})"
        log_warning "Deployment may still be stabilizing"
    else
        error_exit "No healthy tasks found"
    fi
}

# Post-deployment tasks
post_deployment_tasks() {
    log_step "Running post-deployment tasks..."

    # Tag the successful deployment
    aws ecs tag-resource \
        --resource-arn "$(aws ecs describe-services \
            --cluster "${ECS_CLUSTER}" \
            --services "${ECS_SERVICE}" \
            --region "${AWS_REGION}" \
            --query 'services[0].serviceArn' \
            --output text)" \
        --tags \
            "key=LastDeployment,value=${DEPLOYMENT_ID}" \
            "key=LastDeploymentTime,value=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
            "key=ImageTag,value=${IMAGE_TAG}" \
        --region "${AWS_REGION}" \
        2>/dev/null || log_warning "Failed to tag service (non-critical)"

    # Upload deployment record to S3 (optional)
    if [ -n "${DEPLOYMENT_RECORD_BUCKET:-}" ]; then
        log_info "Uploading deployment record to S3..."
        aws s3 cp "$DEPLOYMENT_RECORD_FILE" \
            "s3://${DEPLOYMENT_RECORD_BUCKET}/deployments/${DEPLOYMENT_ID}.json" \
            --region "${AWS_REGION}" \
            2>/dev/null || log_warning "Failed to upload deployment record to S3"
    fi

    log_success "Post-deployment tasks completed"
}

# Rollback deployment
rollback_deployment() {
    log_error "Initiating rollback to previous task definition..."

    if [ -z "${ROLLBACK_TASK_DEF_ARN:-}" ]; then
        log_error "No rollback task definition available"
        return 1
    fi

    log_info "Rolling back to: ${ROLLBACK_TASK_DEF_ARN}"

    aws ecs update-service \
        --cluster "${ECS_CLUSTER}" \
        --service "${ECS_SERVICE}" \
        --task-definition "${ROLLBACK_TASK_DEF_ARN}" \
        --region "${AWS_REGION}" \
        --force-new-deployment \
        > /dev/null

    log_warning "Rollback initiated. Service will revert to previous version."
    log_warning "Monitor the rollback in AWS Console: https://console.aws.amazon.com/ecs/"
}

# Cleanup function
cleanup() {
    if [ -n "${DEPLOYMENT_RECORD_FILE:-}" ] && [ -f "$DEPLOYMENT_RECORD_FILE" ]; then
        log_info "Deployment record saved: ${DEPLOYMENT_RECORD_FILE}"
    fi
}

# Trap errors and cleanup
trap cleanup EXIT

# Run main function
main

exit 0
