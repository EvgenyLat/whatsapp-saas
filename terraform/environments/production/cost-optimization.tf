# ============================================================================
# Cost Optimization & Budget Alerts
# ============================================================================

# ============================================================================
# AWS BUDGETS
# ============================================================================

# Monthly budget with alerts
resource "aws_budgets_budget" "monthly" {
  name              = "${var.project_name}-${var.environment}-monthly-budget"
  budget_type       = "COST"
  limit_amount      = var.budget_limit_monthly
  limit_unit        = "USD"
  time_unit         = "MONTHLY"
  time_period_start = "2024-01-01_00:00"

  cost_filters = {
    TagKey = "Project"
    TagValue = var.project_name
  }

  # Alert at 50% of budget
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 50
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = var.alert_email != "" ? [var.alert_email] : []
  }

  # Alert at 80% of budget
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = var.alert_email != "" ? [var.alert_email] : []
  }

  # Alert at 100% of budget
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = var.alert_email != "" ? [var.alert_email] : []
  }

  # Forecasted alert at 100%
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = var.alert_email != "" ? [var.alert_email] : []
  }
}

# ============================================================================
# COST ANOMALY DETECTION
# ============================================================================

resource "aws_ce_anomaly_monitor" "service" {
  name              = "${var.project_name}-${var.environment}-anomaly-monitor"
  monitor_type      = "DIMENSIONAL"
  monitor_dimension = "SERVICE"

  tags = {
    Name = "${var.project_name}-${var.environment}-anomaly-monitor"
  }
}

resource "aws_ce_anomaly_subscription" "anomaly_alerts" {
  name      = "${var.project_name}-${var.environment}-anomaly-subscription"
  frequency = "DAILY"

  monitor_arn_list = [
    aws_ce_anomaly_monitor.service.arn
  ]

  subscriber {
    type    = "EMAIL"
    address = var.alert_email != "" ? var.alert_email : "alerts@example.com"
  }

  threshold_expression {
    dimension {
      key           = "ANOMALY_TOTAL_IMPACT_ABSOLUTE"
      values        = ["10"] # Alert if anomaly > $10
      match_options = ["GREATER_THAN_OR_EQUAL"]
    }
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-anomaly-subscription"
  }
}

# ============================================================================
# COST ALLOCATION TAGS
# ============================================================================

# Enable cost allocation tags for detailed cost tracking
resource "aws_ce_cost_category" "environment" {
  name         = "Environment"
  rule_version = "CostCategoryExpression.v1"

  rule {
    value = "Production"
    rule {
      dimension {
        key           = "ENVIRONMENT"
        values        = ["production"]
        match_options = ["EQUALS"]
      }
    }
  }

  rule {
    value = "Development"
    rule {
      dimension {
        key           = "ENVIRONMENT"
        values        = ["development", "dev", "staging"]
        match_options = ["EQUALS"]
      }
    }
  }

  tags = {
    Name = "${var.project_name}-cost-category"
  }
}

# ============================================================================
# CLOUDWATCH DASHBOARD FOR COST MONITORING
# ============================================================================

resource "aws_cloudwatch_dashboard" "cost_optimization" {
  dashboard_name = "${var.project_name}-${var.environment}-cost-dashboard"

  dashboard_body = jsonencode({
    widgets = [
      # Estimated charges
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/Billing", "EstimatedCharges", { stat = "Maximum", label = "Estimated Monthly Charges" }]
          ]
          view    = "timeSeries"
          region  = "us-east-1" # Billing metrics only in us-east-1
          title   = "Estimated Monthly Charges"
          period  = 21600 # 6 hours
          yAxis = {
            left = {
              label = "USD"
            }
          }
        }
      },
      # RDS costs (estimated based on runtime)
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/RDS", "CPUUtilization", { stat = "Average" }],
            [".", "DatabaseConnections", { stat = "Average" }]
          ]
          view   = "timeSeries"
          region = var.aws_region
          title  = "RDS Usage (Cost Driver)"
          period = 300
        }
      },
      # ECS task count (direct cost)
      {
        type = "metric"
        properties = {
          metrics = [
            ["ECS/ContainerInsights", "RunningTaskCount", { stat = "Average" }]
          ]
          view   = "singleValue"
          region = var.aws_region
          title  = "ECS Running Tasks (Hourly Cost)"
          period = 300
        }
      },
      # ALB request count (data transfer cost)
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/ApplicationELB", "RequestCount", { stat = "Sum" }],
            [".", "ProcessedBytes", { stat = "Sum", yAxis = "right" }]
          ]
          view   = "timeSeries"
          region = var.aws_region
          title  = "ALB Requests & Data Transfer"
          period = 3600
        }
      }
    ]
  })
}

# ============================================================================
# COST OPTIMIZATION RECOMMENDATIONS (Comments)
# ============================================================================

# 1. RIGHT-SIZING
#    - Monitor RDS CPUUtilization and DatabaseConnections
#    - If CPU < 40% for 7 days, consider downgrading to db.t3.micro
#    - If connections < 50 for 7 days, reduce max_connections parameter
#
# 2. RESERVED INSTANCES
#    - After 3 months of stable usage, purchase 1-year RDS Reserved Instance
#    - Savings: ~30-40% on RDS costs ($35 → $23/month)
#    - Purchase Redis Reserved Nodes for additional 30% savings
#
# 3. SAVINGS PLANS
#    - Compute Savings Plans for ECS Fargate (after usage stabilizes)
#    - Commit to baseline usage (2 tasks minimum)
#    - Savings: ~20% on ECS costs
#
# 4. S3 LIFECYCLE POLICIES
#    - Already implemented: 30-day retention, then delete
#    - Consider Glacier for long-term compliance backups
#
# 5. CLOUDWATCH LOGS RETENTION
#    - Already set to 7 days
#    - Archive important logs to S3 if needed for compliance
#
# 6. NAT GATEWAY OPTIMIZATION
#    - Currently using 2 NAT Gateways ($0.045/hour each = $65/month)
#    - Consider single NAT Gateway ($32.5/month) if HA not critical
#    - Or use NAT Instances (t4g.nano = $3/month) for dev environments
#
# 7. UNUSED RESOURCES
#    - Delete old ECS task definitions (keep last 10)
#    - Delete old RDS snapshots (keep last 10 manual snapshots)
#    - Delete unused ECR images (already have lifecycle policy)
#
# 8. DATA TRANSFER OPTIMIZATION
#    - Enable CloudFront if serving static assets (reduces ALB data transfer)
#    - Use VPC Endpoints for AWS services to avoid NAT Gateway charges
#
# 9. DEVELOPMENT ENVIRONMENTS
#    - Use smaller instance types (db.t3.micro, cache.t2.micro)
#    - Schedule dev resources to shut down nights/weekends
#    - Consider AWS Instance Scheduler
#
# 10. MONITORING & ALERTS
#     - Set CloudWatch alarm for unexpected cost increases
#     - Review Cost Explorer weekly
#     - Enable AWS Cost Anomaly Detection (already configured)

# ============================================================================
# OUTPUTS
# ============================================================================

output "monthly_budget_name" {
  description = "Monthly budget name"
  value       = aws_budgets_budget.monthly.name
}

output "cost_anomaly_monitor_arn" {
  description = "Cost anomaly monitor ARN"
  value       = aws_ce_anomaly_monitor.service.arn
}

output "cost_dashboard_url" {
  description = "Cost optimization dashboard URL"
  value       = "https://console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${aws_cloudwatch_dashboard.cost_optimization.dashboard_name}"
}
