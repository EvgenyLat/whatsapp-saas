#!/bin/bash

# ============================================================================
# WhatsApp SaaS Platform - Cost Monitoring Script
# ============================================================================
#
# This script provides cost analysis and optimization recommendations.
#
# Prerequisites:
# - AWS CLI configured
# - Cost Explorer API enabled
#
# Usage:
#   ./scripts/check-costs.sh [options]
#
# Options:
#   --month YYYY-MM    Check costs for specific month (default: current)
#   --detailed         Show per-service breakdown
#   --forecast         Show cost forecast for current month
#   --help             Show this help message
#
# ============================================================================

set -e
set -u

# ============================================================================
# CONFIGURATION
# ============================================================================

AWS_REGION="${AWS_REGION:-us-east-1}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ============================================================================
# PARSE ARGUMENTS
# ============================================================================

MONTH=$(date +"%Y-%m")
DETAILED=false
FORECAST=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --month)
            MONTH="$2"
            shift 2
            ;;
        --detailed)
            DETAILED=true
            shift
            ;;
        --forecast)
            FORECAST=true
            shift
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

if ! command -v aws &> /dev/null; then
    log_error "AWS CLI not found. Please install AWS CLI"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    log_error "jq not found. Please install jq"
    exit 1
fi

# ============================================================================
# CALCULATE DATE RANGES
# ============================================================================

# Current month start/end
CURRENT_MONTH_START=$(date +"%Y-%m-01")
CURRENT_MONTH_END=$(date -d "$(date +%Y-%m-01) +1 month" +"%Y-%m-01")

# Selected month start/end
if [[ "${MONTH}" == "$(date +"%Y-%m")" ]]; then
    MONTH_START="${CURRENT_MONTH_START}"
    MONTH_END=$(date +"%Y-%m-%d")
else
    MONTH_START="${MONTH}-01"
    MONTH_END=$(date -d "${MONTH_START} +1 month" +"%Y-%m-01")
fi

separator
log_info "AWS Cost Analysis"
separator
log_info "Period: ${MONTH_START} to ${MONTH_END}"
separator

# ============================================================================
# GET MONTH-TO-DATE COSTS
# ============================================================================

log_info "Retrieving cost data..."

MTD_COST=$(aws ce get-cost-and-usage \
    --time-period Start=${MONTH_START},End=${MONTH_END} \
    --granularity MONTHLY \
    --metrics "UnblendedCost" \
    --region us-east-1 \
    --query 'ResultsByTime[0].Total.UnblendedCost.Amount' \
    --output text 2>/dev/null || echo "0")

if [[ -z "${MTD_COST}" ]] || [[ "${MTD_COST}" == "None" ]]; then
    MTD_COST="0"
fi

MTD_COST_FORMATTED=$(printf "%.2f" "${MTD_COST}")

separator
echo -e "${GREEN}Month-to-Date Cost:${NC} \$${MTD_COST_FORMATTED}"
separator

# ============================================================================
# COST FORECAST
# ============================================================================

if [[ "${FORECAST}" == "true" ]] || [[ "${MONTH}" == "$(date +"%Y-%m")" ]]; then
    log_info "Calculating cost forecast..."

    FORECAST_COST=$(aws ce get-cost-forecast \
        --time-period Start=${MONTH_START},End=${CURRENT_MONTH_END} \
        --metric UNBLENDED_COST \
        --granularity MONTHLY \
        --region us-east-1 \
        --query 'Total.Amount' \
        --output text 2>/dev/null || echo "0")

    if [[ -z "${FORECAST_COST}" ]] || [[ "${FORECAST_COST}" == "None" ]]; then
        FORECAST_COST="${MTD_COST}"
    fi

    FORECAST_FORMATTED=$(printf "%.2f" "${FORECAST_COST}")

    echo -e "${YELLOW}Forecasted Month-End:${NC} \$${FORECAST_FORMATTED}"
    separator
fi

# ============================================================================
# PER-SERVICE BREAKDOWN
# ============================================================================

if [[ "${DETAILED}" == "true" ]]; then
    log_info "Service breakdown:"
    separator

    aws ce get-cost-and-usage \
        --time-period Start=${MONTH_START},End=${MONTH_END} \
        --granularity MONTHLY \
        --metrics "UnblendedCost" \
        --group-by Type=DIMENSION,Key=SERVICE \
        --region us-east-1 \
        --query 'ResultsByTime[0].Groups[].[Keys[0], Metrics.UnblendedCost.Amount]' \
        --output text 2>/dev/null | \
        sort -t$'\t' -k2 -rn | \
        head -n 15 | \
        awk '{printf "%-40s $%.2f\n", $1, $2}'

    separator
fi

# ============================================================================
# BUDGET COMPARISON
# ============================================================================

BUDGET_LIMIT=60.00 # From terraform.tfvars

PERCENTAGE=$(awk "BEGIN {printf \"%.1f\", (${MTD_COST} / ${BUDGET_LIMIT}) * 100}")

echo ""
log_info "Budget Analysis:"
echo "Monthly Budget: \$${BUDGET_LIMIT}"
echo "Current Spend: \$${MTD_COST_FORMATTED} (${PERCENTAGE}%)"

if (( $(echo "${PERCENTAGE} > 100" | bc -l) )); then
    echo -e "${RED}Status: OVER BUDGET ⚠️${NC}"
elif (( $(echo "${PERCENTAGE} > 80" | bc -l) )); then
    echo -e "${YELLOW}Status: Approaching limit${NC}"
elif (( $(echo "${PERCENTAGE} > 50" | bc -l) )); then
    echo -e "${YELLOW}Status: On track${NC}"
else
    echo -e "${GREEN}Status: Under budget ✓${NC}"
fi

separator

# ============================================================================
# TOP COST DRIVERS
# ============================================================================

log_info "Top Cost Drivers:"
separator

# RDS
RDS_COST=$(aws ce get-cost-and-usage \
    --time-period Start=${MONTH_START},End=${MONTH_END} \
    --granularity MONTHLY \
    --metrics "UnblendedCost" \
    --filter "{\"Dimensions\":{\"Key\":\"SERVICE\",\"Values\":[\"Amazon Relational Database Service\"]}}" \
    --region us-east-1 \
    --query 'ResultsByTime[0].Total.UnblendedCost.Amount' \
    --output text 2>/dev/null || echo "0")

# ElastiCache
REDIS_COST=$(aws ce get-cost-and-usage \
    --time-period Start=${MONTH_START},End=${MONTH_END} \
    --granularity MONTHLY \
    --metrics "UnblendedCost" \
    --filter "{\"Dimensions\":{\"Key\":\"SERVICE\",\"Values\":[\"Amazon ElastiCache\"]}}" \
    --region us-east-1 \
    --query 'ResultsByTime[0].Total.UnblendedCost.Amount' \
    --output text 2>/dev/null || echo "0")

# ECS
ECS_COST=$(aws ce get-cost-and-usage \
    --time-period Start=${MONTH_START},End=${MONTH_END} \
    --granularity MONTHLY \
    --metrics "UnblendedCost" \
    --filter "{\"Dimensions\":{\"Key\":\"SERVICE\",\"Values\":[\"Amazon Elastic Container Service\"]}}" \
    --region us-east-1 \
    --query 'ResultsByTime[0].Total.UnblendedCost.Amount' \
    --output text 2>/dev/null || echo "0")

# ALB
ALB_COST=$(aws ce get-cost-and-usage \
    --time-period Start=${MONTH_START},End=${MONTH_END} \
    --granularity MONTHLY \
    --metrics "UnblendedCost" \
    --filter "{\"Dimensions\":{\"Key\":\"SERVICE\",\"Values\":[\"Amazon EC2\"]}}" \
    --region us-east-1 \
    --query 'ResultsByTime[0].Total.UnblendedCost.Amount' \
    --output text 2>/dev/null || echo "0")

printf "%-30s \$%.2f\n" "RDS (PostgreSQL):" "${RDS_COST}"
printf "%-30s \$%.2f\n" "ElastiCache (Redis):" "${REDIS_COST}"
printf "%-30s \$%.2f\n" "ECS (Fargate):" "${ECS_COST}"
printf "%-30s \$%.2f\n" "EC2 (ALB, NAT):" "${ALB_COST}"

separator

# ============================================================================
# COST OPTIMIZATION RECOMMENDATIONS
# ============================================================================

log_info "Cost Optimization Recommendations:"
separator

# Check if over budget
if (( $(echo "${MTD_COST} > ${BUDGET_LIMIT}" | bc -l) )); then
    echo "🔴 IMMEDIATE ACTION REQUIRED:"
    echo "   - Review resource usage (./scripts/validate-production.sh)"
    echo "   - Check for unexpected resources in AWS Console"
    echo "   - Consider scaling down non-essential services"
    echo ""
fi

# RDS recommendations
if (( $(echo "${RDS_COST} > 35" | bc -l) )); then
    echo "🟡 RDS Optimization:"
    echo "   - Current: ~\$${RDS_COST}/month"
    echo "   - Consider: Single-AZ deployment (saves \$17/month)"
    echo "   - Consider: Reserved Instances (saves 30-40%)"
    echo ""
fi

# ECS recommendations
if (( $(echo "${ECS_COST} > 30" | bc -l) )); then
    echo "🟡 ECS Optimization:"
    echo "   - Current: ~\$${ECS_COST}/month"
    echo "   - Review: ECS task count and auto-scaling settings"
    echo "   - Consider: Compute Savings Plans (saves 20%)"
    echo ""
fi

# General recommendations
echo "💡 General Tips:"
echo "   - Enable AWS Cost Anomaly Detection"
echo "   - Review unused resources weekly"
echo "   - Set up billing alerts at 50%, 80%, 100%"
echo "   - Consider Reserved Instances after 3 months"
echo ""

separator

# ============================================================================
# COST HISTORY (LAST 6 MONTHS)
# ============================================================================

log_info "Cost History (Last 6 Months):"
separator

START_DATE=$(date -d "6 months ago" +"%Y-%m-01")
END_DATE=$(date +"%Y-%m-01")

aws ce get-cost-and-usage \
    --time-period Start=${START_DATE},End=${END_DATE} \
    --granularity MONTHLY \
    --metrics "UnblendedCost" \
    --region us-east-1 \
    --query 'ResultsByTime[].[TimePeriod.Start, Total.UnblendedCost.Amount]' \
    --output text 2>/dev/null | \
    awk '{printf "%s: $%.2f\n", $1, $2}'

separator

# ============================================================================
# SUMMARY
# ============================================================================

log_success "Cost Analysis Complete"
separator

echo "Report Generated: $(date)"
echo "Period: ${MONTH_START} to ${MONTH_END}"
echo "Total Spend: \$${MTD_COST_FORMATTED}"
echo "Budget: \$${BUDGET_LIMIT} (${PERCENTAGE}% used)"
echo ""
echo "For detailed cost analysis, visit:"
echo "https://console.aws.amazon.com/cost-management/home?region=${AWS_REGION}#/cost-explorer"

separator

exit 0
