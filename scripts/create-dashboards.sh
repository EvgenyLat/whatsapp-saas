#!/bin/bash

################################################################################
# CloudWatch Dashboard Creation Script
# Creates comprehensive monitoring dashboards for WhatsApp SaaS MVP
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
DASHBOARD_NAME="${PROJECT_NAME}-${ENVIRONMENT}-overview"

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

    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed"
        exit 1
    fi

    if ! command -v jq &> /dev/null; then
        log_error "jq is not installed"
        exit 1
    fi

    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured"
        exit 1
    fi

    log_success "Prerequisites check passed"
}

get_resource_ids() {
    log_info "Detecting AWS resources..."

    # Get RDS instance ID
    if [ -f "terraform-outputs.json" ]; then
        RDS_INSTANCE_ID=$(jq -r '.rds_database_name.value // empty' terraform-outputs.json 2>/dev/null || echo "")
    fi

    if [ -z "$RDS_INSTANCE_ID" ]; then
        RDS_INSTANCE_ID="whatsapp-saas-mvp-postgres"
        log_warning "Using default RDS instance ID: $RDS_INSTANCE_ID"
    else
        log_success "Found RDS instance: $RDS_INSTANCE_ID"
    fi

    # Get Redis cluster ID
    REDIS_CLUSTER_ID="whatsapp-saas-mvp-redis"
    log_info "Redis cluster: $REDIS_CLUSTER_ID"

    # Get EC2 instance IDs
    EC2_INSTANCES=$(aws ec2 describe-instances \
        --filters "Name=tag:Project,Values=$PROJECT_NAME" \
                  "Name=tag:Environment,Values=$ENVIRONMENT" \
                  "Name=instance-state-name,Values=running" \
        --query 'Reservations[].Instances[].InstanceId' \
        --region "$AWS_REGION" \
        --output json 2>/dev/null || echo "[]")

    if [ "$EC2_INSTANCES" != "[]" ]; then
        log_success "Found EC2 instances: $EC2_INSTANCES"
    else
        log_warning "No EC2 instances found"
    fi
}

################################################################################
# Dashboard JSON Generation
################################################################################

generate_dashboard_json() {
    log_info "Generating dashboard JSON..."

    # Create EC2 widgets dynamically
    local ec2_widgets=""
    if [ "$EC2_INSTANCES" != "[]" ]; then
        local instance_ids=$(echo "$EC2_INSTANCES" | jq -r '.[]')
        for instance_id in $instance_ids; do
            ec2_widgets="${ec2_widgets}
            {
                \"type\": \"metric\",
                \"properties\": {
                    \"metrics\": [
                        [ \"AWS/EC2\", \"CPUUtilization\", { \"stat\": \"Average\", \"label\": \"CPU\" } ]
                    ],
                    \"view\": \"timeSeries\",
                    \"stacked\": false,
                    \"region\": \"$AWS_REGION\",
                    \"title\": \"EC2 CPU - $instance_id\",
                    \"period\": 300,
                    \"yAxis\": {
                        \"left\": {
                            \"min\": 0,
                            \"max\": 100
                        }
                    }
                }
            },"
        done
    fi

    cat > dashboard.json <<EOF
{
    \"widgets\": [
        {
            \"type\": \"metric\",
            \"x\": 0,
            \"y\": 0,
            \"width\": 24,
            \"height\": 1,
            \"properties\": {
                \"markdown\": \"# WhatsApp SaaS - MVP Monitoring Dashboard\\n\\n**Environment:** ${ENVIRONMENT} | **Region:** ${AWS_REGION} | **Last Updated:** $(date -u +\"%Y-%m-%d %H:%M:%S UTC\")\"
            }
        },
        {
            \"type\": \"metric\",
            \"x\": 0,
            \"y\": 1,
            \"width\": 12,
            \"height\": 6,
            \"properties\": {
                \"metrics\": [
                    [ \"AWS/RDS\", \"CPUUtilization\", { \"stat\": \"Average\", \"label\": \"CPU %\" } ],
                    [ \".\", \"DatabaseConnections\", { \"stat\": \"Average\", \"label\": \"Connections\", \"yAxis\": \"right\" } ]
                ],
                \"view\": \"timeSeries\",
                \"stacked\": false,
                \"region\": \"$AWS_REGION\",
                \"title\": \"RDS - CPU & Connections\",
                \"period\": 300,
                \"yAxis\": {
                    \"left\": {
                        \"min\": 0,
                        \"max\": 100,
                        \"label\": \"CPU %\"
                    },
                    \"right\": {
                        \"min\": 0,
                        \"label\": \"Connections\"
                    }
                },
                \"annotations\": {
                    \"horizontal\": [
                        {
                            \"value\": 80,
                            \"label\": \"High CPU\",
                            \"fill\": \"above\",
                            \"color\": \"#d13212\"
                        }
                    ]
                }
            }
        },
        {
            \"type\": \"metric\",
            \"x\": 12,
            \"y\": 1,
            \"width\": 12,
            \"height\": 6,
            \"properties\": {
                \"metrics\": [
                    [ \"AWS/RDS\", \"FreeStorageSpace\", { \"stat\": \"Average\", \"label\": \"Free Storage (GB)\" } ],
                    [ \".\", \"FreeableMemory\", { \"stat\": \"Average\", \"label\": \"Free Memory (MB)\", \"yAxis\": \"right\" } ]
                ],
                \"view\": \"timeSeries\",
                \"stacked\": false,
                \"region\": \"$AWS_REGION\",
                \"title\": \"RDS - Storage & Memory\",
                \"period\": 300,
                \"yAxis\": {
                    \"left\": {
                        \"min\": 0,
                        \"label\": \"Storage (Bytes)\"
                    },
                    \"right\": {
                        \"min\": 0,
                        \"label\": \"Memory (Bytes)\"
                    }
                }
            }
        },
        {
            \"type\": \"metric\",
            \"x\": 0,
            \"y\": 7,
            \"width\": 12,
            \"height\": 6,
            \"properties\": {
                \"metrics\": [
                    [ \"AWS/RDS\", \"ReadLatency\", { \"stat\": \"Average\", \"label\": \"Read Latency\" } ],
                    [ \".\", \"WriteLatency\", { \"stat\": \"Average\", \"label\": \"Write Latency\" } ]
                ],
                \"view\": \"timeSeries\",
                \"stacked\": false,
                \"region\": \"$AWS_REGION\",
                \"title\": \"RDS - Latency (seconds)\",
                \"period\": 300,
                \"yAxis\": {
                    \"left\": {
                        \"min\": 0,
                        \"label\": \"Seconds\"
                    }
                },
                \"annotations\": {
                    \"horizontal\": [
                        {
                            \"value\": 0.1,
                            \"label\": \"100ms threshold\",
                            \"fill\": \"above\",
                            \"color\": \"#ff7f0e\"
                        }
                    ]
                }
            }
        },
        {
            \"type\": \"metric\",
            \"x\": 12,
            \"y\": 7,
            \"width\": 12,
            \"height\": 6,
            \"properties\": {
                \"metrics\": [
                    [ \"AWS/RDS\", \"ReadIOPS\", { \"stat\": \"Average\", \"label\": \"Read IOPS\" } ],
                    [ \".\", \"WriteIOPS\", { \"stat\": \"Average\", \"label\": \"Write IOPS\" } ]
                ],
                \"view\": \"timeSeries\",
                \"stacked\": false,
                \"region\": \"$AWS_REGION\",
                \"title\": \"RDS - IOPS\",
                \"period\": 300,
                \"yAxis\": {
                    \"left\": {
                        \"min\": 0,
                        \"label\": \"IOPS\"
                    }
                }
            }
        },
        {
            \"type\": \"metric\",
            \"x\": 0,
            \"y\": 13,
            \"width\": 12,
            \"height\": 6,
            \"properties\": {
                \"metrics\": [
                    [ \"AWS/ElastiCache\", \"CPUUtilization\", { \"stat\": \"Average\", \"label\": \"CPU %\" } ],
                    [ \".\", \"DatabaseMemoryUsagePercentage\", { \"stat\": \"Average\", \"label\": \"Memory %\" } ]
                ],
                \"view\": \"timeSeries\",
                \"stacked\": false,
                \"region\": \"$AWS_REGION\",
                \"title\": \"Redis - CPU & Memory\",
                \"period\": 300,
                \"yAxis\": {
                    \"left\": {
                        \"min\": 0,
                        \"max\": 100,
                        \"label\": \"Percentage\"
                    }
                },
                \"annotations\": {
                    \"horizontal\": [
                        {
                            \"value\": 80,
                            \"label\": \"High Usage\",
                            \"fill\": \"above\",
                            \"color\": \"#ff7f0e\"
                        },
                        {
                            \"value\": 90,
                            \"label\": \"Critical\",
                            \"fill\": \"above\",
                            \"color\": \"#d13212\"
                        }
                    ]
                }
            }
        },
        {
            \"type\": \"metric\",
            \"x\": 12,
            \"y\": 13,
            \"width\": 12,
            \"height\": 6,
            \"properties\": {
                \"metrics\": [
                    [ \"AWS/ElastiCache\", \"CurrConnections\", { \"stat\": \"Average\", \"label\": \"Current Connections\" } ],
                    [ \".\", \"NewConnections\", { \"stat\": \"Sum\", \"label\": \"New Connections\" } ],
                    [ \".\", \"Evictions\", { \"stat\": \"Sum\", \"label\": \"Evictions\", \"yAxis\": \"right\" } ]
                ],
                \"view\": \"timeSeries\",
                \"stacked\": false,
                \"region\": \"$AWS_REGION\",
                \"title\": \"Redis - Connections & Evictions\",
                \"period\": 300
            }
        },
        {
            \"type\": \"metric\",
            \"x\": 0,
            \"y\": 19,
            \"width\": 12,
            \"height\": 6,
            \"properties\": {
                \"metrics\": [
                    [ \"AWS/ElastiCache\", \"CacheHits\", { \"stat\": \"Sum\", \"label\": \"Cache Hits\" } ],
                    [ \".\", \"CacheMisses\", { \"stat\": \"Sum\", \"label\": \"Cache Misses\" } ]
                ],
                \"view\": \"timeSeries\",
                \"stacked\": false,
                \"region\": \"$AWS_REGION\",
                \"title\": \"Redis - Cache Hit/Miss\",
                \"period\": 300
            }
        },
        {
            \"type\": \"metric\",
            \"x\": 12,
            \"y\": 19,
            \"width\": 12,
            \"height\": 6,
            \"properties\": {
                \"metrics\": [
                    [ \"AWS/ElastiCache\", \"NetworkBytesIn\", { \"stat\": \"Sum\", \"label\": \"Network In\" } ],
                    [ \".\", \"NetworkBytesOut\", { \"stat\": \"Sum\", \"label\": \"Network Out\" } ]
                ],
                \"view\": \"timeSeries\",
                \"stacked\": false,
                \"region\": \"$AWS_REGION\",
                \"title\": \"Redis - Network I/O\",
                \"period\": 300
            }
        },
        {
            \"type\": \"metric\",
            \"x\": 0,
            \"y\": 25,
            \"width\": 12,
            \"height\": 6,
            \"properties\": {
                \"metrics\": [
                    [ \"$PROJECT_NAME/$ENVIRONMENT\", \"RequestCount\", { \"stat\": \"Sum\", \"label\": \"Total Requests\" } ],
                    [ \".\", \"ErrorRate\", { \"stat\": \"Average\", \"label\": \"Error Rate %\", \"yAxis\": \"right\" } ]
                ],
                \"view\": \"timeSeries\",
                \"stacked\": false,
                \"region\": \"$AWS_REGION\",
                \"title\": \"Application - Requests & Errors\",
                \"period\": 300,
                \"annotations\": {
                    \"horizontal\": [
                        {
                            \"value\": 5,
                            \"label\": \"Error Rate Threshold\",
                            \"fill\": \"above\",
                            \"color\": \"#d13212\"
                        }
                    ]
                }
            }
        },
        {
            \"type\": \"metric\",
            \"x\": 12,
            \"y\": 25,
            \"width\": 12,
            \"height\": 6,
            \"properties\": {
                \"metrics\": [
                    [ \"$PROJECT_NAME/$ENVIRONMENT\", \"ResponseTime\", { \"stat\": \"p50\", \"label\": \"p50\" } ],
                    [ \"...\", { \"stat\": \"p95\", \"label\": \"p95\" } ],
                    [ \"...\", { \"stat\": \"p99\", \"label\": \"p99\" } ]
                ],
                \"view\": \"timeSeries\",
                \"stacked\": false,
                \"region\": \"$AWS_REGION\",
                \"title\": \"Application - Response Time (ms)\",
                \"period\": 300,
                \"yAxis\": {
                    \"left\": {
                        \"min\": 0,
                        \"label\": \"Milliseconds\"
                    }
                },
                \"annotations\": {
                    \"horizontal\": [
                        {
                            \"value\": 500,
                            \"label\": \"p95 Threshold\",
                            \"fill\": \"above\",
                            \"color\": \"#ff7f0e\"
                        }
                    ]
                }
            }
        },
        {
            \"type\": \"log\",
            \"x\": 0,
            \"y\": 31,
            \"width\": 24,
            \"height\": 6,
            \"properties\": {
                \"query\": \"SOURCE '/aws/ec2/$PROJECT_NAME-$ENVIRONMENT/application'\\n| fields @timestamp, @message\\n| filter @message like /ERROR/\\n| sort @timestamp desc\\n| limit 20\",
                \"region\": \"$AWS_REGION\",
                \"title\": \"Recent Application Errors\",
                \"stacked\": false,
                \"view\": \"table\"
            }
        }
    ]
}
EOF

    log_success "Dashboard JSON generated: dashboard.json"
}

################################################################################
# Create Dashboard
################################################################################

create_dashboard() {
    log_info "Creating CloudWatch dashboard: $DASHBOARD_NAME"

    # Read dashboard JSON
    local dashboard_body=$(cat dashboard.json)

    # Create or update dashboard
    aws cloudwatch put-dashboard \
        --dashboard-name "$DASHBOARD_NAME" \
        --dashboard-body "$dashboard_body" \
        --region "$AWS_REGION"

    log_success "Dashboard created: $DASHBOARD_NAME"

    # Save dashboard JSON for reference
    mkdir -p cloudwatch-dashboards
    cp dashboard.json "cloudwatch-dashboards/${DASHBOARD_NAME}.json"

    log_info "Dashboard JSON saved to: cloudwatch-dashboards/${DASHBOARD_NAME}.json"
}

################################################################################
# Display Summary
################################################################################

display_summary() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║           CloudWatch Dashboard Created                        ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""

    log_success "Dashboard created successfully!"
    echo ""

    log_info "Dashboard: $DASHBOARD_NAME"
    log_info "Region: $AWS_REGION"
    echo ""

    log_info "View dashboard in AWS Console:"
    echo "  https://console.aws.amazon.com/cloudwatch/home?region=${AWS_REGION}#dashboards:name=${DASHBOARD_NAME}"
    echo ""

    log_info "Dashboard includes:"
    echo "  ✓ RDS CPU & Connections"
    echo "  ✓ RDS Storage & Memory"
    echo "  ✓ RDS Latency & IOPS"
    echo "  ✓ Redis CPU & Memory"
    echo "  ✓ Redis Connections & Evictions"
    echo "  ✓ Redis Cache Hit/Miss"
    echo "  ✓ Application Requests & Errors"
    echo "  ✓ Application Response Times"
    echo "  ✓ Recent Error Logs"
    echo ""

    log_info "Next Steps:"
    echo "  1. View dashboard in AWS Console"
    echo "  2. Customize widgets as needed"
    echo "  3. Implement custom application metrics"
    echo "  4. Configure log forwarding"
    echo ""
}

################################################################################
# Main Script
################################################################################

main() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║       CloudWatch Dashboard Creation Script                    ║"
    echo "║       WhatsApp SaaS Starter - MVP Environment                 ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""

    check_prerequisites
    echo ""

    get_resource_ids
    echo ""

    generate_dashboard_json
    echo ""

    create_dashboard
    echo ""

    display_summary

    log_success "Dashboard setup complete!"
}

# Handle script arguments
case "${1:-create}" in
    create)
        main
        ;;
    json-only)
        check_prerequisites
        get_resource_ids
        generate_dashboard_json
        log_success "Dashboard JSON generated"
        ;;
    *)
        echo "Usage: $0 {create|json-only}"
        echo ""
        echo "Commands:"
        echo "  create     - Create dashboard in AWS (default)"
        echo "  json-only  - Generate JSON only (don't create)"
        echo ""
        echo "Environment variables:"
        echo "  AWS_REGION    - AWS region (default: us-east-1)"
        echo "  ENVIRONMENT   - Environment name (default: mvp)"
        exit 1
        ;;
esac
