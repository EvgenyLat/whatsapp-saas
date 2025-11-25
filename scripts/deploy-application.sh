#!/bin/bash

# ============================================================================
# WhatsApp SaaS Platform - Application Deployment Script
# ============================================================================
#
# This script builds and deploys the application to ECS Fargate.
#
# Prerequisites:
# - Infrastructure deployed (ECS cluster, ALB, ECR repository)
# - AWS CLI configured
# - Docker installed
# - Node.js and npm installed (for building)
#
# Usage:
#   ./scripts/deploy-application.sh [options]
#
# Options:
#   --skip-build    Skip Docker image build
#   --skip-push     Skip Docker image push to ECR
#   --force         Skip confirmation prompts
#   --tag TAG       Custom image tag (default: git commit SHA)
#   --help          Show this help message
#
# ============================================================================

set -e
set -u

# ============================================================================
# CONFIGURATION
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
BACKEND_DIR="${PROJECT_ROOT}/Backend"
TERRAFORM_DIR="${PROJECT_ROOT}/terraform/environments/production"

AWS_REGION="${AWS_REGION:-us-east-1}"
ENVIRONMENT="production"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ============================================================================
# PARSE ARGUMENTS
# ============================================================================

SKIP_BUILD=false
SKIP_PUSH=false
FORCE=false
CUSTOM_TAG=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --skip-push)
            SKIP_PUSH=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        --tag)
            CUSTOM_TAG="$2"
            shift 2
            ;;
        --help)
            head -n 30 "$0" | grep "^#" | sed 's/^# //; s/^#//'
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

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
# PRE-FLIGHT CHECKS
# ============================================================================

separator
log_info "Application Deployment Pre-flight Checks"
separator

# Check Docker
if ! command -v docker &> /dev/null; then
    log_error "Docker not found. Please install Docker"
    exit 1
fi
log_success "Docker installed: $(docker --version)"

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    log_error "AWS CLI not found. Please install AWS CLI"
    exit 1
fi
log_success "AWS CLI installed: $(aws --version)"

# Check Backend directory
if [[ ! -d "${BACKEND_DIR}" ]]; then
    log_error "Backend directory not found: ${BACKEND_DIR}"
    exit 1
fi
log_success "Backend directory found"

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    log_error "AWS credentials not configured or invalid"
    exit 1
fi

AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
log_success "AWS Account ID: ${AWS_ACCOUNT_ID}"
log_info "AWS Region: ${AWS_REGION}"

# ============================================================================
# DETERMINE IMAGE TAG
# ============================================================================

separator
log_info "Determining image tag..."
separator

if [[ -n "${CUSTOM_TAG}" ]]; then
    IMAGE_TAG="${CUSTOM_TAG}"
    log_info "Using custom tag: ${IMAGE_TAG}"
else
    # Use git commit SHA
    if git rev-parse --git-dir > /dev/null 2>&1; then
        GIT_SHA=$(git rev-parse --short HEAD)
        IMAGE_TAG="v1.0.1-${GIT_SHA}"
        log_info "Using git-based tag: ${IMAGE_TAG}"
    else
        # Fallback to timestamp
        TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
        IMAGE_TAG="v1.0.1-${TIMESTAMP}"
        log_warning "Not a git repository, using timestamp tag: ${IMAGE_TAG}"
    fi
fi

# ============================================================================
# GET ECR REPOSITORY
# ============================================================================

separator
log_info "Retrieving ECR repository information..."
separator

cd "${TERRAFORM_DIR}"

ECR_REPOSITORY_URL=$(terraform output -raw ecr_repository_url 2>/dev/null || echo "")

if [[ -z "${ECR_REPOSITORY_URL}" ]]; then
    log_error "Unable to retrieve ECR repository URL from Terraform"
    log_info "Have you deployed the infrastructure?"
    exit 1
fi

log_success "ECR Repository: ${ECR_REPOSITORY_URL}"

IMAGE_URI="${ECR_REPOSITORY_URL}:${IMAGE_TAG}"
log_info "Image URI: ${IMAGE_URI}"

# ============================================================================
# BUILD DOCKER IMAGE
# ============================================================================

if [[ "${SKIP_BUILD}" == "false" ]]; then
    separator
    log_info "Building Docker image..."
    separator

    cd "${BACKEND_DIR}"

    # Check for Dockerfile
    if [[ ! -f "Dockerfile" ]]; then
        log_error "Dockerfile not found in ${BACKEND_DIR}"
        exit 1
    fi

    log_info "Building image: ${IMAGE_URI}"

    docker build \
        --tag "${IMAGE_URI}" \
        --tag "${ECR_REPOSITORY_URL}:latest" \
        --build-arg NODE_ENV=production \
        --platform linux/amd64 \
        .

    if [[ $? -ne 0 ]]; then
        log_error "Docker build failed"
        exit 1
    fi

    log_success "Docker image built successfully"

    # Show image size
    IMAGE_SIZE=$(docker images "${IMAGE_URI}" --format "{{.Size}}")
    log_info "Image size: ${IMAGE_SIZE}"
else
    log_warning "Skipping Docker build (--skip-build)"
fi

# ============================================================================
# PUSH TO ECR
# ============================================================================

if [[ "${SKIP_PUSH}" == "false" ]]; then
    separator
    log_info "Pushing image to ECR..."
    separator

    # ECR login
    log_info "Logging into ECR..."
    aws ecr get-login-password --region "${AWS_REGION}" | \
        docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

    if [[ $? -ne 0 ]]; then
        log_error "ECR login failed"
        exit 1
    fi

    log_success "ECR login successful"

    # Push image with version tag
    log_info "Pushing image: ${IMAGE_URI}"
    docker push "${IMAGE_URI}"

    if [[ $? -ne 0 ]]; then
        log_error "Docker push failed"
        exit 1
    fi

    log_success "Image pushed: ${IMAGE_URI}"

    # Push latest tag
    log_info "Pushing latest tag..."
    docker push "${ECR_REPOSITORY_URL}:latest"

    log_success "Latest tag pushed"
else
    log_warning "Skipping Docker push (--skip-push)"
fi

# ============================================================================
# UPDATE ECS SERVICE
# ============================================================================

separator
log_info "Updating ECS service with new image..."
separator

cd "${TERRAFORM_DIR}"

# Get ECS cluster and service names
ECS_CLUSTER=$(terraform output -raw ecs_cluster_name 2>/dev/null || echo "")
ECS_SERVICE=$(terraform output -raw ecs_service_name 2>/dev/null || echo "")

if [[ -z "${ECS_CLUSTER}" ]] || [[ -z "${ECS_SERVICE}" ]]; then
    log_error "Unable to retrieve ECS cluster/service from Terraform"
    exit 1
fi

log_info "ECS Cluster: ${ECS_CLUSTER}"
log_info "ECS Service: ${ECS_SERVICE}"

# Confirmation prompt
if [[ "${FORCE}" == "false" ]]; then
    separator
    log_warning "⚠️  You are about to deploy to PRODUCTION! ⚠️"
    separator
    log_warning "Cluster: ${ECS_CLUSTER}"
    log_warning "Service: ${ECS_SERVICE}"
    log_warning "Image: ${IMAGE_URI}"
    separator

    read -p "Continue with deployment? (yes/no): " confirm
    if [[ "${confirm}" != "yes" ]]; then
        log_info "Deployment cancelled"
        exit 0
    fi
fi

# Update task definition with new image
log_info "Creating new task definition revision..."

# Get current task definition
TASK_FAMILY="${ECS_CLUSTER}-task"
CURRENT_TASK_DEF=$(aws ecs describe-task-definition \
    --task-definition "${TASK_FAMILY}" \
    --region "${AWS_REGION}" \
    --query 'taskDefinition' \
    --output json)

# Update image in container definitions
NEW_CONTAINER_DEFS=$(echo "${CURRENT_TASK_DEF}" | jq \
    --arg IMAGE_URI "${IMAGE_URI}" \
    '.containerDefinitions[0].image = $IMAGE_URI')

# Extract necessary fields for new task definition
NEW_TASK_DEF=$(echo "${CURRENT_TASK_DEF}" | jq \
    --arg IMAGE_URI "${IMAGE_URI}" \
    --argjson CONTAINER_DEFS "$(echo "${NEW_CONTAINER_DEFS}" | jq '[.]')" \
    '{
        family: .family,
        taskRoleArn: .taskRoleArn,
        executionRoleArn: .executionRoleArn,
        networkMode: .networkMode,
        containerDefinitions: $CONTAINER_DEFS,
        requiresCompatibilities: .requiresCompatibilities,
        cpu: .cpu,
        memory: .memory
    }')

# Register new task definition
log_info "Registering new task definition..."
NEW_TASK_ARN=$(aws ecs register-task-definition \
    --cli-input-json "${NEW_TASK_DEF}" \
    --region "${AWS_REGION}" \
    --query 'taskDefinition.taskDefinitionArn' \
    --output text)

if [[ -z "${NEW_TASK_ARN}" ]]; then
    log_error "Failed to register new task definition"
    exit 1
fi

log_success "New task definition registered: ${NEW_TASK_ARN}"

# Update ECS service with new task definition
log_info "Updating ECS service..."
aws ecs update-service \
    --cluster "${ECS_CLUSTER}" \
    --service "${ECS_SERVICE}" \
    --task-definition "${NEW_TASK_ARN}" \
    --force-new-deployment \
    --region "${AWS_REGION}" \
    > /dev/null

if [[ $? -ne 0 ]]; then
    log_error "Failed to update ECS service"
    exit 1
fi

log_success "ECS service update initiated"

# ============================================================================
# MONITOR DEPLOYMENT
# ============================================================================

separator
log_info "Monitoring deployment progress..."
separator

log_info "Waiting for service to stabilize (this may take 2-5 minutes)..."

aws ecs wait services-stable \
    --cluster "${ECS_CLUSTER}" \
    --services "${ECS_SERVICE}" \
    --region "${AWS_REGION}"

if [[ $? -eq 0 ]]; then
    log_success "✅ Deployment completed successfully!"
else
    log_error "❌ Deployment failed or timed out"
    log_info "Check service events with: aws ecs describe-services --cluster ${ECS_CLUSTER} --services ${ECS_SERVICE}"
    exit 1
fi

# ============================================================================
# POST-DEPLOYMENT VERIFICATION
# ============================================================================

separator
log_info "Running post-deployment checks..."
separator

# Check running tasks
RUNNING_TASKS=$(aws ecs describe-services \
    --cluster "${ECS_CLUSTER}" \
    --services "${ECS_SERVICE}" \
    --region "${AWS_REGION}" \
    --query 'services[0].runningCount' \
    --output text)

DESIRED_TASKS=$(aws ecs describe-services \
    --cluster "${ECS_CLUSTER}" \
    --services "${ECS_SERVICE}" \
    --region "${AWS_REGION}" \
    --query 'services[0].desiredCount' \
    --output text)

log_info "Running tasks: ${RUNNING_TASKS}/${DESIRED_TASKS}"

if [[ "${RUNNING_TASKS}" == "${DESIRED_TASKS}" ]]; then
    log_success "All tasks are running"
else
    log_warning "Running tasks (${RUNNING_TASKS}) != Desired tasks (${DESIRED_TASKS})"
fi

# Get ALB DNS name
ALB_DNS=$(terraform output -raw alb_dns_name 2>/dev/null || echo "")
if [[ -n "${ALB_DNS}" ]]; then
    log_info "Application URL: http://${ALB_DNS}"

    # Test health endpoint
    log_info "Testing health endpoint..."
    sleep 10 # Wait for ALB to register new targets

    if curl -f -s -o /dev/null "http://${ALB_DNS}/health"; then
        log_success "Health check passed"
    else
        log_warning "Health check failed (may need time to warm up)"
    fi
fi

# ============================================================================
# DEPLOYMENT SUMMARY
# ============================================================================

separator
log_success "Deployment Summary"
separator

echo "✅ Docker image built and pushed"
echo "✅ ECS task definition updated"
echo "✅ ECS service deployment successful"
echo ""
echo "Image: ${IMAGE_URI}"
echo "Cluster: ${ECS_CLUSTER}"
echo "Service: ${ECS_SERVICE}"
echo "Running Tasks: ${RUNNING_TASKS}/${DESIRED_TASKS}"
echo ""

if [[ -n "${ALB_DNS}" ]]; then
    echo "Application URL: http://${ALB_DNS}"
    echo ""
fi

separator
log_info "Next steps:"
separator

echo "1. Monitor application logs:"
echo "   aws logs tail /ecs/${ECS_CLUSTER} --follow --region ${AWS_REGION}"
echo ""
echo "2. Check service health:"
echo "   ./scripts/validate-production.sh"
echo ""
echo "3. Run smoke tests:"
echo "   cd Backend && npm run test:smoke"
echo ""
echo "4. Monitor CloudWatch metrics:"
echo "   https://console.aws.amazon.com/cloudwatch"
echo ""

separator
log_success "Application deployment complete! 🚀"
separator

exit 0
