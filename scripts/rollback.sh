#!/bin/bash

##############################################################################
# Rollback Script
#
# Rolls back an ECS service to a previous task definition.
# Can be used manually or automatically by the deployment pipeline.
#
# Usage:
#   ./scripts/rollback.sh <cluster> <service> [task-definition-arn]
#
# Examples:
#   # Rollback to previous version
#   ./scripts/rollback.sh my-cluster my-service
#
#   # Rollback to specific task definition
#   ./scripts/rollback.sh my-cluster my-service arn:aws:ecs:...
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
CLUSTER="${1:-}"
SERVICE="${2:-}"
TARGET_TASK_DEF="${3:-}"
AWS_REGION="${AWS_REGION:-us-east-1}"

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
    exit 1
}

# Validate inputs
validate_inputs() {
    if [ -z "$CLUSTER" ] || [ -z "$SERVICE" ]; then
        echo "Usage: $0 <cluster> <service> [task-definition-arn]"
        echo ""
        echo "Examples:"
        echo "  $0 my-cluster my-service                    # Rollback to previous version"
        echo "  $0 my-cluster my-service arn:aws:ecs:...    # Rollback to specific version"
        exit 1
    fi
}

# Main function
main() {
    log_step "Starting rollback procedure..."
    log_info "Cluster: $CLUSTER"
    log_info "Service: $SERVICE"
    log_info "Region: $AWS_REGION"
    echo ""

    # Validate inputs
    validate_inputs

    # Verify AWS credentials
    verify_aws_credentials

    # Get current service state
    get_current_state

    # Determine rollback target
    determine_rollback_target

    # Confirm rollback
    confirm_rollback

    # Execute rollback
    execute_rollback

    # Monitor rollback
    monitor_rollback

    # Verify rollback
    verify_rollback

    log_success "Rollback completed successfully! ✅"
    echo ""
    print_summary
}

# Verify AWS credentials
verify_aws_credentials() {
    log_step "Verifying AWS credentials..."

    if ! aws sts get-caller-identity &> /dev/null; then
        error_exit "AWS credentials not configured or invalid"
    fi

    log_success "AWS credentials verified"
}

# Get current service state
get_current_state() {
    log_step "Getting current service state..."

    # Get service details
    SERVICE_DETAILS=$(aws ecs describe-services \
        --cluster "$CLUSTER" \
        --services "$SERVICE" \
        --region "$AWS_REGION" \
        --output json)

    # Check if service exists
    local service_count=$(echo "$SERVICE_DETAILS" | jq -r '.services | length')
    if [ "$service_count" -eq 0 ]; then
        error_exit "Service $SERVICE not found in cluster $CLUSTER"
    fi

    # Get current task definition
    CURRENT_TASK_DEF=$(echo "$SERVICE_DETAILS" | jq -r '.services[0].taskDefinition')
    CURRENT_RUNNING=$(echo "$SERVICE_DETAILS" | jq -r '.services[0].runningCount')
    CURRENT_DESIRED=$(echo "$SERVICE_DETAILS" | jq -r '.services[0].desiredCount')

    log_info "Current task definition: $CURRENT_TASK_DEF"
    log_info "Current running tasks: $CURRENT_RUNNING/$CURRENT_DESIRED"

    # Get deployment history
    DEPLOYMENTS=$(echo "$SERVICE_DETAILS" | jq -r '.services[0].deployments')
    DEPLOYMENT_COUNT=$(echo "$DEPLOYMENTS" | jq 'length')

    log_info "Active deployments: $DEPLOYMENT_COUNT"

    if [ "$DEPLOYMENT_COUNT" -gt 1 ]; then
        log_warning "Multiple deployments detected - service may be mid-deployment"
    fi
}

# Determine rollback target
determine_rollback_target() {
    log_step "Determining rollback target..."

    if [ -n "$TARGET_TASK_DEF" ]; then
        # User specified a task definition
        log_info "Using specified task definition: $TARGET_TASK_DEF"
        ROLLBACK_TASK_DEF="$TARGET_TASK_DEF"
    else
        # Find previous task definition from task definition family
        log_info "Finding previous task definition..."

        # Extract task definition family and revision
        local task_family=$(echo "$CURRENT_TASK_DEF" | awk -F':' '{print $6}' | cut -d'/' -f2)
        local current_revision=$(echo "$CURRENT_TASK_DEF" | awk -F':' '{print $7}')

        log_info "Task family: $task_family"
        log_info "Current revision: $current_revision"

        # Get previous revision
        local previous_revision=$((current_revision - 1))

        if [ "$previous_revision" -lt 1 ]; then
            error_exit "No previous revision available (current is revision 1)"
        fi

        # Construct previous task definition ARN
        ROLLBACK_TASK_DEF="${CURRENT_TASK_DEF%:*}:$previous_revision"

        # Verify previous task definition exists
        if ! aws ecs describe-task-definition \
            --task-definition "$ROLLBACK_TASK_DEF" \
            --region "$AWS_REGION" \
            &> /dev/null; then
            error_exit "Previous task definition not found: $ROLLBACK_TASK_DEF"
        fi

        log_success "Found previous task definition: $ROLLBACK_TASK_DEF"
    fi

    # Get rollback task definition details
    ROLLBACK_TASK_DETAILS=$(aws ecs describe-task-definition \
        --task-definition "$ROLLBACK_TASK_DEF" \
        --region "$AWS_REGION" \
        --query 'taskDefinition' \
        --output json)

    # Extract image from rollback task definition
    ROLLBACK_IMAGE=$(echo "$ROLLBACK_TASK_DETAILS" | jq -r '.containerDefinitions[0].image')

    log_info "Rollback image: $ROLLBACK_IMAGE"
}

# Confirm rollback
confirm_rollback() {
    log_step "Rollback confirmation required"
    echo ""
    echo "=========================================="
    echo "ROLLBACK DETAILS"
    echo "=========================================="
    echo ""
    echo "Cluster:  $CLUSTER"
    echo "Service:  $SERVICE"
    echo ""
    echo -e "${RED}Current:${NC}  $CURRENT_TASK_DEF"
    echo "          Image: $(echo "$SERVICE_DETAILS" | jq -r '.services[0].taskDefinition' | xargs -I {} aws ecs describe-task-definition --task-definition {} --region "$AWS_REGION" --query 'taskDefinition.containerDefinitions[0].image' --output text)"
    echo ""
    echo -e "${GREEN}Target:${NC}   $ROLLBACK_TASK_DEF"
    echo "          Image: $ROLLBACK_IMAGE"
    echo ""
    echo "=========================================="
    echo ""

    # In CI/CD environments, skip confirmation
    if [ -n "${CI:-}" ] || [ -n "${GITHUB_ACTIONS:-}" ]; then
        log_info "Running in CI/CD environment, skipping confirmation"
        return 0
    fi

    # Interactive confirmation
    read -p "Do you want to proceed with rollback? (yes/no): " -r
    echo

    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        log_info "Rollback cancelled by user"
        exit 0
    fi
}

# Execute rollback
execute_rollback() {
    log_step "Executing rollback..."

    # Create rollback record
    local rollback_id="rollback-$(date +%Y%m%d-%H%M%S)"
    local record_file="/tmp/${rollback_id}.json"

    cat > "$record_file" <<EOF
{
  "rollbackId": "$rollback_id",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "cluster": "$CLUSTER",
  "service": "$SERVICE",
  "fromTaskDefinition": "$CURRENT_TASK_DEF",
  "toTaskDefinition": "$ROLLBACK_TASK_DEF",
  "reason": "Manual rollback or deployment failure",
  "initiatedBy": "${USER:-github-actions}"
}
EOF

    log_info "Rollback record created: $record_file"

    # Update service with rollback task definition
    log_info "Updating ECS service..."

    UPDATE_RESULT=$(aws ecs update-service \
        --cluster "$CLUSTER" \
        --service "$SERVICE" \
        --task-definition "$ROLLBACK_TASK_DEF" \
        --region "$AWS_REGION" \
        --force-new-deployment \
        --output json)

    if [ $? -eq 0 ]; then
        log_success "ECS service update initiated"
    else
        error_exit "Failed to update ECS service"
    fi

    # Export rollback ID
    export ROLLBACK_ID="$rollback_id"
    export ROLLBACK_RECORD_FILE="$record_file"
}

# Monitor rollback
monitor_rollback() {
    log_step "Monitoring rollback progress..."
    echo ""

    local max_wait=600  # 10 minutes
    local elapsed=0
    local interval=15

    while [ $elapsed -lt $max_wait ]; do
        # Get service status
        SERVICE_STATUS=$(aws ecs describe-services \
            --cluster "$CLUSTER" \
            --services "$SERVICE" \
            --region "$AWS_REGION" \
            --query 'services[0]' \
            --output json)

        # Parse deployment information
        local running_count=$(echo "$SERVICE_STATUS" | jq -r '.runningCount')
        local desired_count=$(echo "$SERVICE_STATUS" | jq -r '.desiredCount')
        local pending_count=$(echo "$SERVICE_STATUS" | jq -r '.pendingCount')
        local deployments=$(echo "$SERVICE_STATUS" | jq -r '.deployments')
        local deployment_count=$(echo "$deployments" | jq 'length')

        log_info "Status: Running=$running_count/$desired_count, Pending=$pending_count, Deployments=$deployment_count"

        # Check if rollback is complete
        if [ "$running_count" -eq "$desired_count" ] && [ "$pending_count" -eq 0 ] && [ "$deployment_count" -eq 1 ]; then
            local primary_deployment=$(echo "$deployments" | jq -r '.[0]')
            local deployment_status=$(echo "$primary_deployment" | jq -r '.rolloutState // "IN_PROGRESS"')
            local deployment_task_def=$(echo "$primary_deployment" | jq -r '.taskDefinition')

            # Check if it's our rollback task definition
            if [ "$deployment_status" = "COMPLETED" ] && [ "$deployment_task_def" = "$ROLLBACK_TASK_DEF" ]; then
                log_success "Rollback deployment completed!"
                return 0
            fi
        fi

        # Wait before next check
        sleep $interval
        elapsed=$((elapsed + interval))
    done

    log_warning "Rollback monitoring timed out after ${max_wait} seconds"
    log_info "Rollback may still be in progress. Check AWS Console for status."
}

# Verify rollback
verify_rollback() {
    log_step "Verifying rollback..."

    # Get final service state
    FINAL_SERVICE_STATE=$(aws ecs describe-services \
        --cluster "$CLUSTER" \
        --services "$SERVICE" \
        --region "$AWS_REGION" \
        --query 'services[0]' \
        --output json)

    local final_task_def=$(echo "$FINAL_SERVICE_STATE" | jq -r '.taskDefinition')
    local final_running=$(echo "$FINAL_SERVICE_STATE" | jq -r '.runningCount')
    local final_desired=$(echo "$FINAL_SERVICE_STATE" | jq -r '.desiredCount')

    if [ "$final_task_def" = "$ROLLBACK_TASK_DEF" ]; then
        log_success "Service is now running rollback task definition"
    else
        log_warning "Service task definition does not match rollback target"
        log_warning "Expected: $ROLLBACK_TASK_DEF"
        log_warning "Actual:   $final_task_def"
    fi

    if [ "$final_running" -eq "$final_desired" ]; then
        log_success "All tasks are running ($final_running/$final_desired)"
    else
        log_warning "Not all tasks are running yet ($final_running/$final_desired)"
    fi

    # Check task health
    log_info "Checking task health..."

    local task_arns=$(aws ecs list-tasks \
        --cluster "$CLUSTER" \
        --service-name "$SERVICE" \
        --region "$AWS_REGION" \
        --query 'taskArns[]' \
        --output text)

    if [ -n "$task_arns" ]; then
        local task_count=$(echo "$task_arns" | wc -w)
        local healthy_count=0

        for task_arn in $task_arns; do
            local task_status=$(aws ecs describe-tasks \
                --cluster "$CLUSTER" \
                --tasks "$task_arn" \
                --region "$AWS_REGION" \
                --query 'tasks[0].lastStatus' \
                --output text)

            if [ "$task_status" = "RUNNING" ]; then
                ((healthy_count++))
            fi
        done

        log_info "Healthy tasks: $healthy_count/$task_count"

        if [ "$healthy_count" -eq "$task_count" ]; then
            log_success "All tasks are healthy"
        else
            log_warning "Some tasks may not be healthy yet"
        fi
    fi
}

# Print summary
print_summary() {
    echo "=========================================="
    echo "ROLLBACK SUMMARY"
    echo "=========================================="
    echo ""
    echo "Cluster:       $CLUSTER"
    echo "Service:       $SERVICE"
    echo ""
    echo "Previous:      $CURRENT_TASK_DEF"
    echo "Rolled back to: $ROLLBACK_TASK_DEF"
    echo "Image:         $ROLLBACK_IMAGE"
    echo ""
    echo "Rollback ID:   ${ROLLBACK_ID:-unknown}"
    echo "Record:        ${ROLLBACK_RECORD_FILE:-none}"
    echo ""
    echo "=========================================="
}

# Cleanup
cleanup() {
    if [ -n "${ROLLBACK_RECORD_FILE:-}" ] && [ -f "$ROLLBACK_RECORD_FILE" ]; then
        log_info "Rollback record saved: $ROLLBACK_RECORD_FILE"
    fi
}

trap cleanup EXIT

# Run main function
main

exit 0
