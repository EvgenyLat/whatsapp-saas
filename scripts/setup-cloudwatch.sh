#!/bin/bash

################################################################################
# CloudWatch Monitoring Setup Script
# Creates alarms, SNS topics, and log groups for WhatsApp SaaS MVP
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
ALARM_PREFIX="${PROJECT_NAME}-${ENVIRONMENT}"

# Email for critical alerts
ALERT_EMAIL="${ALERT_EMAIL:-}"

# Slack webhook for alerts (optional)
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"

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

prompt_for_email() {
    if [ -z "$ALERT_EMAIL" ]; then
        read -p "Enter email address for critical alerts: " ALERT_EMAIL

        if [ -z "$ALERT_EMAIL" ]; then
            log_error "Email address is required"
            exit 1
        fi
    fi

    log_info "Alerts will be sent to: $ALERT_EMAIL"
}

################################################################################
# SNS Topics
################################################################################

create_sns_topics() {
    log_info "Creating SNS topics..."

    # Critical alerts topic
    local critical_topic_name="${ALARM_PREFIX}-critical-alerts"

    if aws sns list-topics --region "$AWS_REGION" | grep -q "$critical_topic_name"; then
        log_info "Critical alerts topic already exists"
        CRITICAL_TOPIC_ARN=$(aws sns list-topics --region "$AWS_REGION" \
            --query "Topics[?contains(TopicArn, '$critical_topic_name')].TopicArn" \
            --output text)
    else
        CRITICAL_TOPIC_ARN=$(aws sns create-topic \
            --name "$critical_topic_name" \
            --region "$AWS_REGION" \
            --tags "Key=Project,Value=$PROJECT_NAME" \
                   "Key=Environment,Value=$ENVIRONMENT" \
            --query 'TopicArn' \
            --output text)

        log_success "Created critical alerts topic: $CRITICAL_TOPIC_ARN"
    fi

    # Warning alerts topic
    local warning_topic_name="${ALARM_PREFIX}-warning-alerts"

    if aws sns list-topics --region "$AWS_REGION" | grep -q "$warning_topic_name"; then
        log_info "Warning alerts topic already exists"
        WARNING_TOPIC_ARN=$(aws sns list-topics --region "$AWS_REGION" \
            --query "Topics[?contains(TopicArn, '$warning_topic_name')].TopicArn" \
            --output text)
    else
        WARNING_TOPIC_ARN=$(aws sns create-topic \
            --name "$warning_topic_name" \
            --region "$AWS_REGION" \
            --tags "Key=Project,Value=$PROJECT_NAME" \
                   "Key=Environment,Value=$ENVIRONMENT" \
            --query 'TopicArn' \
            --output text)

        log_success "Created warning alerts topic: $WARNING_TOPIC_ARN"
    fi

    # Subscribe email to critical alerts
    subscribe_email_to_topic "$CRITICAL_TOPIC_ARN" "$ALERT_EMAIL"

    # Subscribe Slack if webhook provided
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        configure_slack_integration "$CRITICAL_TOPIC_ARN" "$WARNING_TOPIC_ARN"
    fi

    log_success "SNS topics configured"
}

subscribe_email_to_topic() {
    local topic_arn="$1"
    local email="$2"

    log_info "Subscribing $email to $topic_arn..."

    # Check if already subscribed
    local existing=$(aws sns list-subscriptions-by-topic \
        --topic-arn "$topic_arn" \
        --region "$AWS_REGION" \
        --query "Subscriptions[?Endpoint=='$email'].SubscriptionArn" \
        --output text)

    if [ -n "$existing" ] && [ "$existing" != "None" ]; then
        log_info "Email already subscribed"
    else
        aws sns subscribe \
            --topic-arn "$topic_arn" \
            --protocol email \
            --notification-endpoint "$email" \
            --region "$AWS_REGION" > /dev/null

        log_warning "Email subscription requires confirmation. Check your inbox!"
    fi
}

configure_slack_integration() {
    log_info "Slack integration requires Lambda function"
    log_info "See MONITORING_GUIDE.md for Slack setup instructions"
    # Note: Slack integration via Lambda is documented but not automated
}

################################################################################
# Log Groups
################################################################################

create_log_groups() {
    log_info "Creating CloudWatch Log Groups..."

    local log_groups=(
        "/aws/rds/$PROJECT_NAME-$ENVIRONMENT"
        "/aws/elasticache/$PROJECT_NAME-$ENVIRONMENT"
        "/aws/ec2/$PROJECT_NAME-$ENVIRONMENT/application"
        "/aws/ec2/$PROJECT_NAME-$ENVIRONMENT/nginx"
    )

    for log_group in "${log_groups[@]}"; do
        if aws logs describe-log-groups \
            --log-group-name-prefix "$log_group" \
            --region "$AWS_REGION" 2>/dev/null | grep -q "$log_group"; then
            log_info "Log group exists: $log_group"
        else
            aws logs create-log-group \
                --log-group-name "$log_group" \
                --region "$AWS_REGION"

            # Set retention to 30 days
            aws logs put-retention-policy \
                --log-group-name "$log_group" \
                --retention-in-days 30 \
                --region "$AWS_REGION"

            log_success "Created log group: $log_group"
        fi
    done

    log_success "Log groups configured"
}

################################################################################
# RDS Alarms
################################################################################

create_rds_alarms() {
    log_info "Creating RDS CloudWatch alarms..."

    # Get RDS instance ID from Terraform outputs or prompt
    local rds_instance_id="${RDS_INSTANCE_ID:-}"

    if [ -z "$rds_instance_id" ]; then
        if [ -f "terraform-outputs.json" ]; then
            rds_instance_id=$(jq -r '.rds_database_name.value // empty' terraform-outputs.json 2>/dev/null || echo "")
        fi
    fi

    if [ -z "$rds_instance_id" ]; then
        rds_instance_id="whatsapp-saas-mvp-postgres"
        log_warning "Using default RDS instance ID: $rds_instance_id"
    fi

    log_info "RDS Instance: $rds_instance_id"

    # 1. RDS CPU > 80% for 5 minutes
    aws cloudwatch put-metric-alarm \
        --alarm-name "${ALARM_PREFIX}-rds-cpu-high" \
        --alarm-description "RDS CPU utilization above 80%" \
        --metric-name CPUUtilization \
        --namespace AWS/RDS \
        --statistic Average \
        --period 300 \
        --evaluation-periods 1 \
        --threshold 80 \
        --comparison-operator GreaterThanThreshold \
        --dimensions Name=DBInstanceIdentifier,Value="$rds_instance_id" \
        --alarm-actions "$CRITICAL_TOPIC_ARN" \
        --region "$AWS_REGION" \
        --tags "Key=Project,Value=$PROJECT_NAME" "Key=Environment,Value=$ENVIRONMENT"

    log_success "Created alarm: ${ALARM_PREFIX}-rds-cpu-high"

    # 2. RDS Free Storage < 2GB
    aws cloudwatch put-metric-alarm \
        --alarm-name "${ALARM_PREFIX}-rds-storage-low" \
        --alarm-description "RDS free storage below 2GB" \
        --metric-name FreeStorageSpace \
        --namespace AWS/RDS \
        --statistic Average \
        --period 300 \
        --evaluation-periods 1 \
        --threshold 2147483648 \
        --comparison-operator LessThanThreshold \
        --dimensions Name=DBInstanceIdentifier,Value="$rds_instance_id" \
        --alarm-actions "$CRITICAL_TOPIC_ARN" \
        --region "$AWS_REGION" \
        --tags "Key=Project,Value=$PROJECT_NAME" "Key=Environment,Value=$ENVIRONMENT"

    log_success "Created alarm: ${ALARM_PREFIX}-rds-storage-low"

    # 3. RDS Connection count > 80
    aws cloudwatch put-metric-alarm \
        --alarm-name "${ALARM_PREFIX}-rds-connections-high" \
        --alarm-description "RDS database connections above 80" \
        --metric-name DatabaseConnections \
        --namespace AWS/RDS \
        --statistic Average \
        --period 300 \
        --evaluation-periods 2 \
        --threshold 80 \
        --comparison-operator GreaterThanThreshold \
        --dimensions Name=DBInstanceIdentifier,Value="$rds_instance_id" \
        --alarm-actions "$WARNING_TOPIC_ARN" \
        --region "$AWS_REGION" \
        --tags "Key=Project,Value=$PROJECT_NAME" "Key=Environment,Value=$ENVIRONMENT"

    log_success "Created alarm: ${ALARM_PREFIX}-rds-connections-high"

    # Additional RDS alarms
    # 4. RDS Read Latency > 100ms
    aws cloudwatch put-metric-alarm \
        --alarm-name "${ALARM_PREFIX}-rds-read-latency-high" \
        --alarm-description "RDS read latency above 100ms" \
        --metric-name ReadLatency \
        --namespace AWS/RDS \
        --statistic Average \
        --period 300 \
        --evaluation-periods 2 \
        --threshold 0.1 \
        --comparison-operator GreaterThanThreshold \
        --dimensions Name=DBInstanceIdentifier,Value="$rds_instance_id" \
        --alarm-actions "$WARNING_TOPIC_ARN" \
        --region "$AWS_REGION" \
        --tags "Key=Project,Value=$PROJECT_NAME" "Key=Environment,Value=$ENVIRONMENT"

    log_success "Created alarm: ${ALARM_PREFIX}-rds-read-latency-high"

    # 5. RDS Write Latency > 100ms
    aws cloudwatch put-metric-alarm \
        --alarm-name "${ALARM_PREFIX}-rds-write-latency-high" \
        --alarm-description "RDS write latency above 100ms" \
        --metric-name WriteLatency \
        --namespace AWS/RDS \
        --statistic Average \
        --period 300 \
        --evaluation-periods 2 \
        --threshold 0.1 \
        --comparison-operator GreaterThanThreshold \
        --dimensions Name=DBInstanceIdentifier,Value="$rds_instance_id" \
        --alarm-actions "$WARNING_TOPIC_ARN" \
        --region "$AWS_REGION" \
        --tags "Key=Project,Value=$PROJECT_NAME" "Key=Environment,Value=$ENVIRONMENT"

    log_success "Created alarm: ${ALARM_PREFIX}-rds-write-latency-high"

    log_success "RDS alarms configured"
}

################################################################################
# ElastiCache Redis Alarms
################################################################################

create_redis_alarms() {
    log_info "Creating ElastiCache Redis CloudWatch alarms..."

    # Get Redis cluster ID
    local redis_cluster_id="${REDIS_CLUSTER_ID:-}"

    if [ -z "$redis_cluster_id" ]; then
        redis_cluster_id="whatsapp-saas-mvp-redis"
        log_warning "Using default Redis cluster ID: $redis_cluster_id"
    fi

    log_info "Redis Cluster: $redis_cluster_id"

    # 1. Redis CPU > 80%
    aws cloudwatch put-metric-alarm \
        --alarm-name "${ALARM_PREFIX}-redis-cpu-high" \
        --alarm-description "Redis CPU utilization above 80%" \
        --metric-name CPUUtilization \
        --namespace AWS/ElastiCache \
        --statistic Average \
        --period 300 \
        --evaluation-periods 2 \
        --threshold 80 \
        --comparison-operator GreaterThanThreshold \
        --dimensions Name=CacheClusterId,Value="$redis_cluster_id" \
        --alarm-actions "$CRITICAL_TOPIC_ARN" \
        --region "$AWS_REGION" \
        --tags "Key=Project,Value=$PROJECT_NAME" "Key=Environment,Value=$ENVIRONMENT"

    log_success "Created alarm: ${ALARM_PREFIX}-redis-cpu-high"

    # 2. Redis Memory > 90%
    aws cloudwatch put-metric-alarm \
        --alarm-name "${ALARM_PREFIX}-redis-memory-high" \
        --alarm-description "Redis memory usage above 90%" \
        --metric-name DatabaseMemoryUsagePercentage \
        --namespace AWS/ElastiCache \
        --statistic Average \
        --period 300 \
        --evaluation-periods 2 \
        --threshold 90 \
        --comparison-operator GreaterThanThreshold \
        --dimensions Name=CacheClusterId,Value="$redis_cluster_id" \
        --alarm-actions "$CRITICAL_TOPIC_ARN" \
        --region "$AWS_REGION" \
        --tags "Key=Project,Value=$PROJECT_NAME" "Key=Environment,Value=$ENVIRONMENT"

    log_success "Created alarm: ${ALARM_PREFIX}-redis-memory-high"

    # 3. Redis Evictions
    aws cloudwatch put-metric-alarm \
        --alarm-name "${ALARM_PREFIX}-redis-evictions" \
        --alarm-description "Redis evictions detected" \
        --metric-name Evictions \
        --namespace AWS/ElastiCache \
        --statistic Sum \
        --period 300 \
        --evaluation-periods 1 \
        --threshold 100 \
        --comparison-operator GreaterThanThreshold \
        --dimensions Name=CacheClusterId,Value="$redis_cluster_id" \
        --alarm-actions "$WARNING_TOPIC_ARN" \
        --region "$AWS_REGION" \
        --tags "Key=Project,Value=$PROJECT_NAME" "Key=Environment,Value=$ENVIRONMENT"

    log_success "Created alarm: ${ALARM_PREFIX}-redis-evictions"

    # 4. Redis Current Connections
    aws cloudwatch put-metric-alarm \
        --alarm-name "${ALARM_PREFIX}-redis-connections-high" \
        --alarm-description "Redis current connections high" \
        --metric-name CurrConnections \
        --namespace AWS/ElastiCache \
        --statistic Average \
        --period 300 \
        --evaluation-periods 2 \
        --threshold 5000 \
        --comparison-operator GreaterThanThreshold \
        --dimensions Name=CacheClusterId,Value="$redis_cluster_id" \
        --alarm-actions "$WARNING_TOPIC_ARN" \
        --region "$AWS_REGION" \
        --tags "Key=Project,Value=$PROJECT_NAME" "Key=Environment,Value=$ENVIRONMENT"

    log_success "Created alarm: ${ALARM_PREFIX}-redis-connections-high"

    log_success "Redis alarms configured"
}

################################################################################
# EC2 Alarms
################################################################################

create_ec2_alarms() {
    log_info "Creating EC2 CloudWatch alarms..."

    # Get EC2 instance ID(s)
    local ec2_instances=$(aws ec2 describe-instances \
        --filters "Name=tag:Project,Values=$PROJECT_NAME" \
                  "Name=tag:Environment,Values=$ENVIRONMENT" \
                  "Name=instance-state-name,Values=running" \
        --query 'Reservations[].Instances[].InstanceId' \
        --region "$AWS_REGION" \
        --output text)

    if [ -z "$ec2_instances" ]; then
        log_warning "No EC2 instances found with Project=$PROJECT_NAME, Environment=$ENVIRONMENT tags"
        log_info "Skipping EC2 alarms. Add tags to instances and re-run."
        return
    fi

    for instance_id in $ec2_instances; do
        log_info "Creating alarms for EC2 instance: $instance_id"

        # 1. EC2 CPU > 80%
        aws cloudwatch put-metric-alarm \
            --alarm-name "${ALARM_PREFIX}-ec2-${instance_id}-cpu-high" \
            --alarm-description "EC2 CPU utilization above 80% for instance $instance_id" \
            --metric-name CPUUtilization \
            --namespace AWS/EC2 \
            --statistic Average \
            --period 300 \
            --evaluation-periods 2 \
            --threshold 80 \
            --comparison-operator GreaterThanThreshold \
            --dimensions Name=InstanceId,Value="$instance_id" \
            --alarm-actions "$CRITICAL_TOPIC_ARN" \
            --region "$AWS_REGION" \
            --tags "Key=Project,Value=$PROJECT_NAME" "Key=Environment,Value=$ENVIRONMENT"

        log_success "Created alarm: ${ALARM_PREFIX}-ec2-${instance_id}-cpu-high"

        # 2. EC2 Status Check Failed
        aws cloudwatch put-metric-alarm \
            --alarm-name "${ALARM_PREFIX}-ec2-${instance_id}-status-check-failed" \
            --alarm-description "EC2 status check failed for instance $instance_id" \
            --metric-name StatusCheckFailed \
            --namespace AWS/EC2 \
            --statistic Maximum \
            --period 60 \
            --evaluation-periods 2 \
            --threshold 1 \
            --comparison-operator GreaterThanOrEqualToThreshold \
            --dimensions Name=InstanceId,Value="$instance_id" \
            --alarm-actions "$CRITICAL_TOPIC_ARN" \
            --region "$AWS_REGION" \
            --tags "Key=Project,Value=$PROJECT_NAME" "Key=Environment,Value=$ENVIRONMENT"

        log_success "Created alarm: ${ALARM_PREFIX}-ec2-${instance_id}-status-check-failed"

        # 3. EC2 Network In (for DDoS detection)
        aws cloudwatch put-metric-alarm \
            --alarm-name "${ALARM_PREFIX}-ec2-${instance_id}-network-in-high" \
            --alarm-description "EC2 network in high for instance $instance_id" \
            --metric-name NetworkIn \
            --namespace AWS/EC2 \
            --statistic Average \
            --period 300 \
            --evaluation-periods 2 \
            --threshold 100000000 \
            --comparison-operator GreaterThanThreshold \
            --dimensions Name=InstanceId,Value="$instance_id" \
            --alarm-actions "$WARNING_TOPIC_ARN" \
            --region "$AWS_REGION" \
            --tags "Key=Project,Value=$PROJECT_NAME" "Key=Environment,Value=$ENVIRONMENT"

        log_success "Created alarm: ${ALARM_PREFIX}-ec2-${instance_id}-network-in-high"
    done

    log_success "EC2 alarms configured"
}

################################################################################
# Application Metrics Alarms
################################################################################

create_application_alarms() {
    log_info "Creating Application CloudWatch alarms..."

    # These alarms require custom metrics published by the application
    # See MONITORING_GUIDE.md for implementing custom metrics

    # 1. Application error rate > 5%
    aws cloudwatch put-metric-alarm \
        --alarm-name "${ALARM_PREFIX}-app-error-rate-high" \
        --alarm-description "Application error rate above 5%" \
        --metric-name ErrorRate \
        --namespace "$PROJECT_NAME/$ENVIRONMENT" \
        --statistic Average \
        --period 300 \
        --evaluation-periods 2 \
        --threshold 5 \
        --comparison-operator GreaterThanThreshold \
        --alarm-actions "$CRITICAL_TOPIC_ARN" \
        --region "$AWS_REGION" \
        --tags "Key=Project,Value=$PROJECT_NAME" "Key=Environment,Value=$ENVIRONMENT" \
        --treat-missing-data notBreaching

    log_success "Created alarm: ${ALARM_PREFIX}-app-error-rate-high"

    # 2. API response time p95 > 500ms
    aws cloudwatch put-metric-alarm \
        --alarm-name "${ALARM_PREFIX}-api-response-time-high" \
        --alarm-description "API p95 response time above 500ms" \
        --metric-name ResponseTime \
        --namespace "$PROJECT_NAME/$ENVIRONMENT" \
        --extended-statistic p95 \
        --period 300 \
        --evaluation-periods 2 \
        --threshold 500 \
        --comparison-operator GreaterThanThreshold \
        --alarm-actions "$WARNING_TOPIC_ARN" \
        --region "$AWS_REGION" \
        --tags "Key=Project,Value=$PROJECT_NAME" "Key=Environment,Value=$ENVIRONMENT" \
        --treat-missing-data notBreaching

    log_success "Created alarm: ${ALARM_PREFIX}-api-response-time-high"

    # 3. Request count anomaly detection
    aws cloudwatch put-metric-alarm \
        --alarm-name "${ALARM_PREFIX}-app-request-count-anomaly" \
        --alarm-description "Unusual request count pattern detected" \
        --metric-name RequestCount \
        --namespace "$PROJECT_NAME/$ENVIRONMENT" \
        --statistic Sum \
        --period 300 \
        --evaluation-periods 3 \
        --threshold 2 \
        --comparison-operator LessThanLowerOrGreaterThanUpperThreshold \
        --alarm-actions "$WARNING_TOPIC_ARN" \
        --region "$AWS_REGION" \
        --tags "Key=Project,Value=$PROJECT_NAME" "Key=Environment,Value=$ENVIRONMENT" \
        --treat-missing-data notBreaching

    log_success "Created alarm: ${ALARM_PREFIX}-app-request-count-anomaly"

    log_warning "Application alarms require custom metrics. See MONITORING_GUIDE.md"
    log_success "Application alarms configured"
}

################################################################################
# Summary
################################################################################

display_summary() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║           CloudWatch Monitoring Setup Complete                ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""

    log_success "All CloudWatch resources have been created"
    echo ""

    log_info "SNS Topics:"
    echo "  Critical Alerts: $CRITICAL_TOPIC_ARN"
    echo "  Warning Alerts:  $WARNING_TOPIC_ARN"
    echo ""

    log_info "Alarms Created:"
    aws cloudwatch describe-alarms \
        --alarm-name-prefix "$ALARM_PREFIX" \
        --region "$AWS_REGION" \
        --query 'MetricAlarms[].{Name:AlarmName,State:StateValue}' \
        --output table

    echo ""
    log_info "Log Groups:"
    aws logs describe-log-groups \
        --log-group-name-prefix "/aws" \
        --region "$AWS_REGION" \
        --query 'logGroups[].logGroupName' \
        --output table

    echo ""
    log_warning "IMPORTANT: Confirm email subscription"
    echo "  Check inbox: $ALERT_EMAIL"
    echo "  Click confirmation link in email from AWS SNS"
    echo ""

    log_info "Next Steps:"
    echo "  1. Confirm email subscription"
    echo "  2. Run: ./scripts/create-dashboards.sh"
    echo "  3. Implement custom application metrics"
    echo "  4. Configure log forwarding to CloudWatch"
    echo "  5. Test alarms: See MONITORING_GUIDE.md"
    echo ""

    log_info "View alarms in AWS Console:"
    echo "  https://console.aws.amazon.com/cloudwatch/home?region=${AWS_REGION}#alarmsV2:"
    echo ""
}

################################################################################
# Main Script
################################################################################

main() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║       CloudWatch Monitoring Setup Script                      ║"
    echo "║       WhatsApp SaaS Starter - MVP Environment                 ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""

    check_prerequisites
    echo ""

    log_info "Project: $PROJECT_NAME"
    log_info "Environment: $ENVIRONMENT"
    log_info "AWS Region: $AWS_REGION"
    echo ""

    prompt_for_email
    echo ""

    read -p "Continue with CloudWatch setup? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        log_error "Setup cancelled"
        exit 1
    fi

    echo ""

    # Create resources
    create_sns_topics
    echo ""

    create_log_groups
    echo ""

    create_rds_alarms
    echo ""

    create_redis_alarms
    echo ""

    create_ec2_alarms
    echo ""

    create_application_alarms
    echo ""

    # Display summary
    display_summary

    log_success "Setup complete!"
}

# Handle script arguments
case "${1:-setup}" in
    setup)
        main
        ;;
    sns-only)
        check_prerequisites
        prompt_for_email
        create_sns_topics
        log_success "SNS topics created"
        ;;
    logs-only)
        check_prerequisites
        create_log_groups
        log_success "Log groups created"
        ;;
    alarms-only)
        check_prerequisites
        create_rds_alarms
        create_redis_alarms
        create_ec2_alarms
        create_application_alarms
        log_success "Alarms created"
        ;;
    *)
        echo "Usage: $0 {setup|sns-only|logs-only|alarms-only}"
        echo ""
        echo "Commands:"
        echo "  setup        - Full setup (default)"
        echo "  sns-only     - Create SNS topics only"
        echo "  logs-only    - Create log groups only"
        echo "  alarms-only  - Create alarms only"
        echo ""
        echo "Environment variables:"
        echo "  AWS_REGION           - AWS region (default: us-east-1)"
        echo "  ENVIRONMENT          - Environment name (default: mvp)"
        echo "  ALERT_EMAIL          - Email for alerts (prompted if not set)"
        echo "  RDS_INSTANCE_ID      - RDS instance ID (auto-detected from Terraform)"
        echo "  REDIS_CLUSTER_ID     - Redis cluster ID (auto-detected)"
        echo "  SLACK_WEBHOOK_URL    - Slack webhook for notifications (optional)"
        exit 1
        ;;
esac
