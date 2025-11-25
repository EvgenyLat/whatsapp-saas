#!/bin/bash

# ============================================================================
# WhatsApp SaaS Platform - Production Infrastructure Validation Script
# ============================================================================
#
# This script validates that all infrastructure components are healthy
# and correctly configured after deployment.
#
# Usage:
#   ./scripts/validate-production.sh
#
# Exit codes:
#   0 - All validations passed
#   1 - One or more validations failed
#
# ============================================================================

set -e
set -u

# ============================================================================
# CONFIGURATION
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
TERRAFORM_DIR="${PROJECT_ROOT}/terraform/environments/production"

AWS_REGION="${AWS_REGION:-us-east-1}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0;33m'

# Validation results
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0
TOTAL_CHECKS=0

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
    ((PASSED_CHECKS++))
    ((TOTAL_CHECKS++))
}

log_failure() {
    echo -e "${RED}[✗]${NC} $1"
    ((FAILED_CHECKS++))
    ((TOTAL_CHECKS++))
}

log_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
    ((WARNING_CHECKS++))
    ((TOTAL_CHECKS++))
}

separator() {
    echo "============================================================================"
}

check_command() {
    local cmd=$1
    local name=$2

    if command -v "${cmd}" &> /dev/null; then
        log_success "${name} is installed"
        return 0
    else
        log_failure "${name} is not installed"
        return 1
    fi
}

# ============================================================================
# GET TERRAFORM OUTPUTS
# ============================================================================

get_terraform_output() {
    local output_name=$1
    cd "${TERRAFORM_DIR}"
    terraform output -raw "${output_name}" 2>/dev/null || echo ""
}

# ============================================================================
# START VALIDATION
# ============================================================================

separator
log_info "WhatsApp SaaS Production Infrastructure Validation"
separator
log_info "Region: ${AWS_REGION}"
log_info "Time: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
separator

# ============================================================================
# CHECK PREREQUISITES
# ============================================================================

separator
log_info "Checking prerequisites..."
separator

check_command "aws" "AWS CLI"
check_command "terraform" "Terraform"
check_command "psql" "PostgreSQL client (psql)" || log_warning "PostgreSQL client not found (optional for DB connection test)"
check_command "redis-cli" "Redis CLI" || log_warning "Redis CLI not found (optional for Redis connection test)"

# Check AWS authentication
if aws sts get-caller-identity &> /dev/null; then
    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    log_success "AWS credentials valid (Account: ${AWS_ACCOUNT_ID})"
else
    log_failure "AWS credentials invalid or not configured"
    exit 1
fi

# ============================================================================
# RETRIEVE INFRASTRUCTURE INFO
# ============================================================================

separator
log_info "Retrieving infrastructure information..."
separator

VPC_ID=$(get_terraform_output "vpc_id")
DB_ENDPOINT=$(get_terraform_output "database_endpoint")
REDIS_ENDPOINT=$(get_terraform_output "redis_endpoint")
DB_SECRET_ARN=$(get_terraform_output "db_credentials_secret_arn")
REDIS_SECRET_ARN=$(get_terraform_output "redis_credentials_secret_arn")
ALB_SG=$(get_terraform_output "alb_security_group_id")
ECS_SG=$(get_terraform_output "ecs_security_group_id")
BACKUPS_BUCKET=$(get_terraform_output "backups_bucket_name")

if [[ -z "${VPC_ID}" ]]; then
    log_failure "Unable to retrieve VPC ID from Terraform outputs"
    log_info "Have you deployed the infrastructure? Run: ./scripts/deploy-production-infrastructure.sh"
    exit 1
fi

log_success "Retrieved infrastructure information from Terraform"

# ============================================================================
# VPC VALIDATION
# ============================================================================

separator
log_info "Validating VPC..."
separator

# Check VPC exists
if aws ec2 describe-vpcs --vpc-ids "${VPC_ID}" --region "${AWS_REGION}" &> /dev/null; then
    VPC_STATE=$(aws ec2 describe-vpcs --vpc-ids "${VPC_ID}" --region "${AWS_REGION}" --query 'Vpcs[0].State' --output text)
    if [[ "${VPC_STATE}" == "available" ]]; then
        log_success "VPC ${VPC_ID} is available"
    else
        log_failure "VPC ${VPC_ID} is in state: ${VPC_STATE}"
    fi
else
    log_failure "VPC ${VPC_ID} not found"
fi

# Check DNS settings
DNS_HOSTNAMES=$(aws ec2 describe-vpc-attribute --vpc-id "${VPC_ID}" --attribute enableDnsHostnames --region "${AWS_REGION}" --query 'EnableDnsHostnames.Value' --output text)
DNS_SUPPORT=$(aws ec2 describe-vpc-attribute --vpc-id "${VPC_ID}" --attribute enableDnsSupport --region "${AWS_REGION}" --query 'EnableDnsSupport.Value' --output text)

if [[ "${DNS_HOSTNAMES}" == "true" ]]; then
    log_success "DNS hostnames enabled in VPC"
else
    log_failure "DNS hostnames not enabled in VPC"
fi

if [[ "${DNS_SUPPORT}" == "true" ]]; then
    log_success "DNS support enabled in VPC"
else
    log_failure "DNS support not enabled in VPC"
fi

# Check subnets
SUBNET_COUNT=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=${VPC_ID}" --region "${AWS_REGION}" --query 'length(Subnets)' --output text)
log_info "Found ${SUBNET_COUNT} subnets in VPC"

if [[ ${SUBNET_COUNT} -ge 6 ]]; then
    log_success "Sufficient subnets (${SUBNET_COUNT}) for multi-AZ deployment"
else
    log_warning "Only ${SUBNET_COUNT} subnets found (expected 6: 2 public, 2 private, 2 database)"
fi

# ============================================================================
# RDS VALIDATION
# ============================================================================

separator
log_info "Validating RDS PostgreSQL..."
separator

# Extract DB instance identifier from endpoint
DB_IDENTIFIER=$(echo "${DB_ENDPOINT}" | cut -d'.' -f1)

if aws rds describe-db-instances --db-instance-identifier "${DB_IDENTIFIER}" --region "${AWS_REGION}" &> /dev/null; then
    DB_STATUS=$(aws rds describe-db-instances --db-instance-identifier "${DB_IDENTIFIER}" --region "${AWS_REGION}" --query 'DBInstances[0].DBInstanceStatus' --output text)

    if [[ "${DB_STATUS}" == "available" ]]; then
        log_success "RDS instance ${DB_IDENTIFIER} is available"
    else
        log_warning "RDS instance ${DB_IDENTIFIER} is in state: ${DB_STATUS}"
    fi

    # Check instance class
    DB_CLASS=$(aws rds describe-db-instances --db-instance-identifier "${DB_IDENTIFIER}" --region "${AWS_REGION}" --query 'DBInstances[0].DBInstanceClass' --output text)
    log_info "Instance class: ${DB_CLASS}"

    if [[ "${DB_CLASS}" == "db.t3.small" ]] || [[ "${DB_CLASS}" == "db.t3.medium" ]] || [[ "${DB_CLASS}" == "db.t3.large" ]]; then
        log_success "Instance class ${DB_CLASS} is suitable for production"
    else
        log_warning "Instance class ${DB_CLASS} may be undersized for production"
    fi

    # Check Multi-AZ
    MULTI_AZ=$(aws rds describe-db-instances --db-instance-identifier "${DB_IDENTIFIER}" --region "${AWS_REGION}" --query 'DBInstances[0].MultiAZ' --output text)
    if [[ "${MULTI_AZ}" == "true" ]]; then
        log_success "Multi-AZ enabled for high availability"
    else
        log_warning "Multi-AZ not enabled (single point of failure)"
    fi

    # Check encryption
    ENCRYPTED=$(aws rds describe-db-instances --db-instance-identifier "${DB_IDENTIFIER}" --region "${AWS_REGION}" --query 'DBInstances[0].StorageEncrypted' --output text)
    if [[ "${ENCRYPTED}" == "true" ]]; then
        log_success "Storage encryption enabled"
    else
        log_failure "Storage encryption not enabled"
    fi

    # Check automated backups
    BACKUP_RETENTION=$(aws rds describe-db-instances --db-instance-identifier "${DB_IDENTIFIER}" --region "${AWS_REGION}" --query 'DBInstances[0].BackupRetentionPeriod' --output text)
    if [[ ${BACKUP_RETENTION} -ge 7 ]]; then
        log_success "Automated backups enabled (${BACKUP_RETENTION} days)"
    else
        log_warning "Backup retention is only ${BACKUP_RETENTION} days (recommended: 7+)"
    fi

    # Check Performance Insights
    PERF_INSIGHTS=$(aws rds describe-db-instances --db-instance-identifier "${DB_IDENTIFIER}" --region "${AWS_REGION}" --query 'DBInstances[0].PerformanceInsightsEnabled' --output text)
    if [[ "${PERF_INSIGHTS}" == "true" ]]; then
        log_success "Performance Insights enabled"
    else
        log_warning "Performance Insights not enabled (recommended for monitoring)"
    fi

else
    log_failure "RDS instance ${DB_IDENTIFIER} not found"
fi

# Check database connectivity (if psql available and credentials accessible)
if command -v psql &> /dev/null && [[ -n "${DB_SECRET_ARN}" ]]; then
    log_info "Testing database connectivity..."

    DB_SECRET=$(aws secretsmanager get-secret-value --secret-id "${DB_SECRET_ARN}" --region "${AWS_REGION}" --query SecretString --output text 2>/dev/null)

    if [[ -n "${DB_SECRET}" ]]; then
        DB_HOST=$(echo "${DB_SECRET}" | jq -r '.host')
        DB_PORT=$(echo "${DB_SECRET}" | jq -r '.port')
        DB_NAME=$(echo "${DB_SECRET}" | jq -r '.dbname')
        DB_USER=$(echo "${DB_SECRET}" | jq -r '.username')
        DB_PASS=$(echo "${DB_SECRET}" | jq -r '.password')

        export PGPASSWORD="${DB_PASS}"

        if psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -c "SELECT 1;" &> /dev/null; then
            log_success "Database connectivity test passed"
        else
            log_warning "Unable to connect to database (may be network/security group issue)"
        fi

        unset PGPASSWORD
    else
        log_warning "Unable to retrieve database credentials from Secrets Manager"
    fi
fi

# ============================================================================
# ELASTICACHE (REDIS) VALIDATION
# ============================================================================

separator
log_info "Validating ElastiCache Redis..."
separator

# Extract replication group ID
REDIS_RG_ID=$(echo "${REDIS_ENDPOINT}" | cut -d'.' -f1)

if aws elasticache describe-replication-groups --replication-group-id "${REDIS_RG_ID}" --region "${AWS_REGION}" &> /dev/null; then
    REDIS_STATUS=$(aws elasticache describe-replication-groups --replication-group-id "${REDIS_RG_ID}" --region "${AWS_REGION}" --query 'ReplicationGroups[0].Status' --output text)

    if [[ "${REDIS_STATUS}" == "available" ]]; then
        log_success "Redis replication group ${REDIS_RG_ID} is available"
    else
        log_warning "Redis replication group ${REDIS_RG_ID} is in state: ${REDIS_STATUS}"
    fi

    # Check encryption
    AT_REST_ENC=$(aws elasticache describe-replication-groups --replication-group-id "${REDIS_RG_ID}" --region "${AWS_REGION}" --query 'ReplicationGroups[0].AtRestEncryptionEnabled' --output text)
    TRANSIT_ENC=$(aws elasticache describe-replication-groups --replication-group-id "${REDIS_RG_ID}" --region "${AWS_REGION}" --query 'ReplicationGroups[0].TransitEncryptionEnabled' --output text)

    if [[ "${AT_REST_ENC}" == "true" ]]; then
        log_success "Redis encryption at rest enabled"
    else
        log_failure "Redis encryption at rest not enabled"
    fi

    if [[ "${TRANSIT_ENC}" == "true" ]]; then
        log_success "Redis encryption in transit enabled"
    else
        log_failure "Redis encryption in transit not enabled"
    fi

    # Check number of nodes
    NODE_COUNT=$(aws elasticache describe-replication-groups --replication-group-id "${REDIS_RG_ID}" --region "${AWS_REGION}" --query 'ReplicationGroups[0].MemberClusters | length(@)' --output text)
    log_info "Redis cluster has ${NODE_COUNT} node(s)"

    if [[ ${NODE_COUNT} -ge 2 ]]; then
        log_success "Redis has replica for high availability"
    else
        log_warning "Redis has no replica (single point of failure)"
    fi

    # Check automatic failover
    AUTO_FAILOVER=$(aws elasticache describe-replication-groups --replication-group-id "${REDIS_RG_ID}" --region "${AWS_REGION}" --query 'ReplicationGroups[0].AutomaticFailover' --output text)
    if [[ "${AUTO_FAILOVER}" == "enabled" ]]; then
        log_success "Redis automatic failover enabled"
    else
        log_warning "Redis automatic failover not enabled"
    fi

else
    log_failure "Redis replication group ${REDIS_RG_ID} not found"
fi

# ============================================================================
# SECRETS MANAGER VALIDATION
# ============================================================================

separator
log_info "Validating Secrets Manager..."
separator

# Check database credentials secret
if aws secretsmanager describe-secret --secret-id "${DB_SECRET_ARN}" --region "${AWS_REGION}" &> /dev/null; then
    log_success "Database credentials secret exists"

    # Check encryption
    DB_SECRET_KMS=$(aws secretsmanager describe-secret --secret-id "${DB_SECRET_ARN}" --region "${AWS_REGION}" --query 'KmsKeyId' --output text)
    if [[ -n "${DB_SECRET_KMS}" ]] && [[ "${DB_SECRET_KMS}" != "None" ]]; then
        log_success "Database credentials encrypted with KMS"
    else
        log_warning "Database credentials not encrypted with customer-managed KMS key"
    fi
else
    log_failure "Database credentials secret not found"
fi

# Check Redis credentials secret
if aws secretsmanager describe-secret --secret-id "${REDIS_SECRET_ARN}" --region "${AWS_REGION}" &> /dev/null; then
    log_success "Redis credentials secret exists"
else
    log_failure "Redis credentials secret not found"
fi

# ============================================================================
# S3 VALIDATION
# ============================================================================

separator
log_info "Validating S3 buckets..."
separator

# Check backups bucket
if aws s3 ls "s3://${BACKUPS_BUCKET}" --region "${AWS_REGION}" &> /dev/null; then
    log_success "Backups bucket exists: ${BACKUPS_BUCKET}"

    # Check versioning
    VERSIONING=$(aws s3api get-bucket-versioning --bucket "${BACKUPS_BUCKET}" --query 'Status' --output text)
    if [[ "${VERSIONING}" == "Enabled" ]]; then
        log_success "Bucket versioning enabled"
    else
        log_warning "Bucket versioning not enabled"
    fi

    # Check encryption
    if aws s3api get-bucket-encryption --bucket "${BACKUPS_BUCKET}" &> /dev/null; then
        log_success "Bucket encryption enabled"
    else
        log_warning "Bucket encryption not configured"
    fi

    # Check public access block
    PUBLIC_ACCESS=$(aws s3api get-public-access-block --bucket "${BACKUPS_BUCKET}" --query 'PublicAccessBlockConfiguration.BlockPublicAcls' --output text)
    if [[ "${PUBLIC_ACCESS}" == "true" ]]; then
        log_success "Public access blocked on bucket"
    else
        log_failure "Public access not fully blocked on bucket"
    fi
else
    log_failure "Backups bucket not found: ${BACKUPS_BUCKET}"
fi

# ============================================================================
# SECURITY GROUPS VALIDATION
# ============================================================================

separator
log_info "Validating Security Groups..."
separator

# Check ALB security group
if aws ec2 describe-security-groups --group-ids "${ALB_SG}" --region "${AWS_REGION}" &> /dev/null; then
    log_success "ALB security group exists: ${ALB_SG}"

    # Check for HTTPS ingress
    HTTPS_RULES=$(aws ec2 describe-security-groups --group-ids "${ALB_SG}" --region "${AWS_REGION}" --query 'SecurityGroups[0].IpPermissions[?FromPort==`443`] | length(@)' --output text)
    if [[ ${HTTPS_RULES} -gt 0 ]]; then
        log_success "ALB allows HTTPS (port 443) ingress"
    else
        log_warning "ALB does not allow HTTPS (port 443) ingress"
    fi
else
    log_failure "ALB security group not found: ${ALB_SG}"
fi

# Check ECS security group
if aws ec2 describe-security-groups --group-ids "${ECS_SG}" --region "${AWS_REGION}" &> /dev/null; then
    log_success "ECS security group exists: ${ECS_SG}"
else
    log_failure "ECS security group not found: ${ECS_SG}"
fi

# ============================================================================
# COST ESTIMATION
# ============================================================================

separator
log_info "Estimating monthly costs..."
separator

log_info "Based on deployed resources:"
log_info "  - RDS ${DB_CLASS} Multi-AZ: ~\$35-50/month"
log_info "  - ElastiCache (${NODE_COUNT} nodes): ~\$12-15/month"
log_info "  - NAT Gateways (2): ~\$32/month"
log_info "  - ECS Fargate (varies with load): ~\$10-50/month"
log_info "  - ALB: ~\$18/month"
log_info "  - Data transfer & misc: ~\$5-10/month"
log_info ""
log_warning "ESTIMATED TOTAL: ~\$112-175/month"
log_info ""
log_info "To reduce costs:"
log_info "  - Consider single NAT Gateway (save \$16/month, reduces availability)"
log_info "  - Use Reserved Instances for RDS/ElastiCache (save 30-40%)"
log_info "  - Optimize ECS task count based on actual load"
log_info ""
log_info "For detailed cost analysis, check AWS Cost Explorer"

# ============================================================================
# FINAL SUMMARY
# ============================================================================

separator
log_info "Validation Summary"
separator

echo -e "${GREEN}Passed:${NC}  ${PASSED_CHECKS}"
echo -e "${YELLOW}Warnings:${NC} ${WARNING_CHECKS}"
echo -e "${RED}Failed:${NC}  ${FAILED_CHECKS}"
echo -e "Total:   ${TOTAL_CHECKS}"

separator

if [[ ${FAILED_CHECKS} -eq 0 ]]; then
    if [[ ${WARNING_CHECKS} -eq 0 ]]; then
        log_success "All validations passed! Infrastructure is healthy. ✅"
        exit 0
    else
        log_warning "Validations passed with warnings. Review warnings above. ⚠️"
        exit 0
    fi
else
    log_failure "Validation failed. ${FAILED_CHECKS} check(s) failed. ❌"
    log_info "Review failed checks above and fix issues before proceeding."
    exit 1
fi
