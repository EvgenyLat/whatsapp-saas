#!/bin/bash

################################################################################
# CloudWatch Monitoring Setup for Database Backups
################################################################################
#
# Description: Sets up CloudWatch alarms and dashboards for backup monitoring
#
# Usage: ./setup-backup-monitoring.sh [OPTIONS]
#
# Options:
#   --install       Install CloudWatch alarms and dashboard
#   --remove        Remove CloudWatch alarms and dashboard
#   --test          Test alarm configuration
#   --sns-topic     SNS topic ARN for notifications
#
################################################################################

set -euo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
readonly NAMESPACE="WhatsAppSaaS/Backups"
readonly ALARM_PREFIX="WhatsAppSaaS-Backup"

# Configuration
SNS_TOPIC_ARN="${SNS_TOPIC_ARN:-}"
AWS_REGION="${AWS_REGION:-us-east-1}"

################################################################################
# UTILITY FUNCTIONS
################################################################################

log_info() {
    echo "[INFO] $*"
}

log_error() {
    echo "[ERROR] $*" >&2
}

error_exit() {
    log_error "$1"
    exit "${2:-1}"
}

check_aws_cli() {
    if ! command -v aws &> /dev/null; then
        error_exit "AWS CLI is not installed" 1
    fi
}

################################################################################
# SNS TOPIC FUNCTIONS
################################################################################

create_sns_topic() {
    local topic_name="whatsapp-saas-backup-alerts"
    local email="${1:-}"

    log_info "Creating SNS topic for backup alerts..."

    # Create SNS topic
    SNS_TOPIC_ARN=$(aws sns create-topic \
        --name "${topic_name}" \
        --region "${AWS_REGION}" \
        --output text --query 'TopicArn')

    log_info "SNS Topic created: ${SNS_TOPIC_ARN}"

    # Subscribe email if provided
    if [[ -n "${email}" ]]; then
        log_info "Subscribing ${email} to SNS topic..."
        aws sns subscribe \
            --topic-arn "${SNS_TOPIC_ARN}" \
            --protocol email \
            --notification-endpoint "${email}" \
            --region "${AWS_REGION}"

        log_info "Subscription created (check email for confirmation)"
    fi

    echo "${SNS_TOPIC_ARN}"
}

################################################################################
# CLOUDWATCH ALARM FUNCTIONS
################################################################################

create_backup_failure_alarm() {
    local alarm_name="${ALARM_PREFIX}-Failure"

    log_info "Creating backup failure alarm..."

    aws cloudwatch put-metric-alarm \
        --alarm-name "${alarm_name}" \
        --alarm-description "Alert when database backup fails" \
        --namespace "${NAMESPACE}" \
        --metric-name "BackupSuccess" \
        --statistic "Sum" \
        --period 86400 \
        --evaluation-periods 1 \
        --threshold 0 \
        --comparison-operator "LessThanThreshold" \
        --treat-missing-data "breaching" \
        --alarm-actions "${SNS_TOPIC_ARN}" \
        --region "${AWS_REGION}"

    log_info "✓ Backup failure alarm created"
}

create_backup_size_alarm() {
    local alarm_name="${ALARM_PREFIX}-Size-Anomaly"

    log_info "Creating backup size anomaly alarm..."

    # Alarm if backup size drops by more than 50% (potential corruption)
    aws cloudwatch put-metric-alarm \
        --alarm-name "${alarm_name}" \
        --alarm-description "Alert when backup size drops significantly" \
        --namespace "${NAMESPACE}" \
        --metric-name "BackupSize" \
        --statistic "Average" \
        --period 86400 \
        --evaluation-periods 2 \
        --threshold 50 \
        --comparison-operator "LessThanThreshold" \
        --treat-missing-data "notBreaching" \
        --alarm-actions "${SNS_TOPIC_ARN}" \
        --region "${AWS_REGION}" \
        --unit "Percent" \
        --datapoints-to-alarm 2

    log_info "✓ Backup size anomaly alarm created"
}

create_backup_duration_alarm() {
    local alarm_name="${ALARM_PREFIX}-Duration-High"

    log_info "Creating backup duration alarm..."

    # Alarm if backup takes longer than 30 minutes (1800 seconds)
    aws cloudwatch put-metric-alarm \
        --alarm-name "${alarm_name}" \
        --alarm-description "Alert when backup takes too long" \
        --namespace "${NAMESPACE}" \
        --metric-name "BackupDuration" \
        --statistic "Maximum" \
        --period 86400 \
        --evaluation-periods 1 \
        --threshold 1800 \
        --comparison-operator "GreaterThanThreshold" \
        --treat-missing-data "notBreaching" \
        --alarm-actions "${SNS_TOPIC_ARN}" \
        --region "${AWS_REGION}"

    log_info "✓ Backup duration alarm created"
}

create_restore_test_alarm() {
    local alarm_name="${ALARM_PREFIX}-Restore-Test-Missing"

    log_info "Creating restore test alarm..."

    # Alarm if no restore test has been performed in 30 days
    aws cloudwatch put-metric-alarm \
        --alarm-name "${alarm_name}" \
        --alarm-description "Alert when restore test is overdue" \
        --namespace "${NAMESPACE}" \
        --metric-name "RestoreSuccess" \
        --statistic "Sum" \
        --period 2592000 \
        --evaluation-periods 1 \
        --threshold 1 \
        --comparison-operator "LessThanThreshold" \
        --treat-missing-data "breaching" \
        --alarm-actions "${SNS_TOPIC_ARN}" \
        --region "${AWS_REGION}"

    log_info "✓ Restore test alarm created"
}

################################################################################
# CLOUDWATCH DASHBOARD FUNCTIONS
################################################################################

create_backup_dashboard() {
    local dashboard_name="WhatsAppSaaS-Backups"

    log_info "Creating CloudWatch dashboard..."

    local dashboard_body
    dashboard_body=$(cat <<'EOF'
{
    "widgets": [
        {
            "type": "metric",
            "properties": {
                "metrics": [
                    [ "WhatsAppSaaS/Backups", "BackupSuccess", { "stat": "Sum", "label": "Successful Backups" } ]
                ],
                "period": 86400,
                "stat": "Sum",
                "region": "us-east-1",
                "title": "Backup Success Rate (24h)",
                "yAxis": {
                    "left": {
                        "min": 0
                    }
                }
            }
        },
        {
            "type": "metric",
            "properties": {
                "metrics": [
                    [ "WhatsAppSaaS/Backups", "BackupSize", { "stat": "Average" } ]
                ],
                "period": 86400,
                "stat": "Average",
                "region": "us-east-1",
                "title": "Backup Size Trend",
                "yAxis": {
                    "left": {
                        "label": "Bytes"
                    }
                }
            }
        },
        {
            "type": "metric",
            "properties": {
                "metrics": [
                    [ "WhatsAppSaaS/Backups", "BackupDuration", { "stat": "Average", "label": "Avg Duration" } ],
                    [ "...", { "stat": "Maximum", "label": "Max Duration" } ]
                ],
                "period": 86400,
                "stat": "Average",
                "region": "us-east-1",
                "title": "Backup Duration",
                "yAxis": {
                    "left": {
                        "label": "Seconds"
                    }
                }
            }
        },
        {
            "type": "metric",
            "properties": {
                "metrics": [
                    [ "WhatsAppSaaS/Backups", "RestoreSuccess", { "stat": "Sum" } ],
                    [ ".", "RestoreDuration", { "stat": "Average", "yAxis": "right" } ]
                ],
                "period": 2592000,
                "stat": "Sum",
                "region": "us-east-1",
                "title": "Restore Tests (30 days)",
                "yAxis": {
                    "left": {
                        "label": "Count"
                    },
                    "right": {
                        "label": "Duration (seconds)"
                    }
                }
            }
        },
        {
            "type": "log",
            "properties": {
                "query": "SOURCE '/var/log/backups.log'\n| fields @timestamp, @message\n| filter @message like /ERROR/\n| sort @timestamp desc\n| limit 20",
                "region": "us-east-1",
                "title": "Recent Backup Errors",
                "stacked": false
            }
        }
    ]
}
EOF
)

    aws cloudwatch put-dashboard \
        --dashboard-name "${dashboard_name}" \
        --dashboard-body "${dashboard_body}" \
        --region "${AWS_REGION}"

    log_info "✓ CloudWatch dashboard created: ${dashboard_name}"
    log_info "View at: https://console.aws.amazon.com/cloudwatch/home?region=${AWS_REGION}#dashboards:name=${dashboard_name}"
}

################################################################################
# REMOVAL FUNCTIONS
################################################################################

remove_alarms() {
    log_info "Removing CloudWatch alarms..."

    local alarms=(
        "${ALARM_PREFIX}-Failure"
        "${ALARM_PREFIX}-Size-Anomaly"
        "${ALARM_PREFIX}-Duration-High"
        "${ALARM_PREFIX}-Restore-Test-Missing"
    )

    for alarm in "${alarms[@]}"; do
        if aws cloudwatch delete-alarms --alarm-names "${alarm}" --region "${AWS_REGION}" 2>/dev/null; then
            log_info "✓ Removed alarm: ${alarm}"
        fi
    done
}

remove_dashboard() {
    local dashboard_name="WhatsAppSaaS-Backups"

    log_info "Removing CloudWatch dashboard..."

    if aws cloudwatch delete-dashboards --dashboard-names "${dashboard_name}" --region "${AWS_REGION}" 2>/dev/null; then
        log_info "✓ Removed dashboard: ${dashboard_name}"
    fi
}

################################################################################
# TEST FUNCTIONS
################################################################################

test_monitoring() {
    log_info "Testing CloudWatch monitoring..."

    # Send test metrics
    log_info "Sending test metrics..."

    aws cloudwatch put-metric-data \
        --namespace "${NAMESPACE}" \
        --metric-name "BackupSuccess" \
        --value 1 \
        --unit "Count" \
        --region "${AWS_REGION}"

    aws cloudwatch put-metric-data \
        --namespace "${NAMESPACE}" \
        --metric-name "BackupSize" \
        --value 1048576 \
        --unit "Bytes" \
        --region "${AWS_REGION}"

    aws cloudwatch put-metric-data \
        --namespace "${NAMESPACE}" \
        --metric-name "BackupDuration" \
        --value 300 \
        --unit "Seconds" \
        --region "${AWS_REGION}"

    log_info "✓ Test metrics sent"
    log_info "Check CloudWatch console to verify metrics appear"
}

################################################################################
# MAIN FUNCTION
################################################################################

usage() {
    cat <<EOF
Usage: $0 [OPTIONS]

Options:
  --install            Install CloudWatch alarms and dashboard
  --remove             Remove CloudWatch alarms and dashboard
  --test               Test monitoring configuration
  --sns-topic ARN      Specify SNS topic ARN for notifications
  --email EMAIL        Create SNS topic and subscribe email
  --region REGION      AWS region (default: us-east-1)

Examples:
  # Install with email notifications
  $0 --install --email admin@example.com

  # Install with existing SNS topic
  $0 --install --sns-topic arn:aws:sns:us-east-1:123456789:my-topic

  # Test monitoring
  $0 --test

  # Remove all monitoring
  $0 --remove
EOF
}

main() {
    local action=""
    local email=""

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --install)
                action="install"
                shift
                ;;
            --remove)
                action="remove"
                shift
                ;;
            --test)
                action="test"
                shift
                ;;
            --sns-topic)
                SNS_TOPIC_ARN="$2"
                shift 2
                ;;
            --email)
                email="$2"
                shift 2
                ;;
            --region)
                AWS_REGION="$2"
                shift 2
                ;;
            --help|-h)
                usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                usage
                exit 1
                ;;
        esac
    done

    check_aws_cli

    case "${action}" in
        install)
            # Create SNS topic if email provided and no topic ARN
            if [[ -z "${SNS_TOPIC_ARN}" ]]; then
                if [[ -n "${email}" ]]; then
                    SNS_TOPIC_ARN=$(create_sns_topic "${email}")
                else
                    error_exit "Please provide --email or --sns-topic" 1
                fi
            fi

            # Create alarms
            create_backup_failure_alarm
            create_backup_size_alarm
            create_backup_duration_alarm
            create_restore_test_alarm

            # Create dashboard
            create_backup_dashboard

            log_info ""
            log_info "============================================"
            log_info "Monitoring setup complete!"
            log_info "============================================"
            log_info "SNS Topic: ${SNS_TOPIC_ARN}"
            log_info "Region: ${AWS_REGION}"
            ;;
        remove)
            remove_alarms
            remove_dashboard
            log_info "Monitoring removed"
            ;;
        test)
            test_monitoring
            ;;
        *)
            usage
            ;;
    esac
}

main "$@"
