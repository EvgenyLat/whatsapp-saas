##############################################################################
# Terraform Outputs - Staging Environment
#
# Purpose: Export important resource information for use by deployment scripts
#
# Usage:
#   terraform output
#   terraform output -json > terraform-outputs.json
##############################################################################

# Database Outputs
output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint (host:port)"
  value       = aws_db_instance.staging.endpoint
}

output "rds_address" {
  description = "RDS PostgreSQL address (host only)"
  value       = aws_db_instance.staging.address
}

output "rds_port" {
  description = "RDS PostgreSQL port"
  value       = aws_db_instance.staging.port
}

output "rds_database_name" {
  description = "RDS database name"
  value       = aws_db_instance.staging.db_name
}

output "rds_instance_id" {
  description = "RDS instance identifier"
  value       = aws_db_instance.staging.id
}

# Redis Outputs
output "redis_endpoint" {
  description = "ElastiCache Redis endpoint (host:port)"
  value       = "${aws_elasticache_cluster.staging.cache_nodes[0].address}:${aws_elasticache_cluster.staging.cache_nodes[0].port}"
}

output "redis_address" {
  description = "ElastiCache Redis address (host only)"
  value       = aws_elasticache_cluster.staging.cache_nodes[0].address
}

output "redis_port" {
  description = "ElastiCache Redis port"
  value       = aws_elasticache_cluster.staging.cache_nodes[0].port
}

output "redis_cluster_id" {
  description = "ElastiCache cluster identifier"
  value       = aws_elasticache_cluster.staging.id
}

# Secrets Manager Outputs
output "admin_token_secret_arn" {
  description = "ARN of Admin Token secret"
  value       = aws_secretsmanager_secret.admin_token_staging.arn
  sensitive   = true
}

output "database_url_secret_arn" {
  description = "ARN of Database URL secret"
  value       = aws_secretsmanager_secret.database_url_staging.arn
  sensitive   = true
}

output "redis_url_secret_arn" {
  description = "ARN of Redis URL secret"
  value       = aws_secretsmanager_secret.redis_url_staging.arn
  sensitive   = true
}

# Secret Names (for easy retrieval)
output "secret_names" {
  description = "Names of all secrets in Secrets Manager"
  value = {
    admin_token  = aws_secretsmanager_secret.admin_token_staging.name
    database_url = aws_secretsmanager_secret.database_url_staging.name
    redis_url    = aws_secretsmanager_secret.redis_url_staging.name
  }
}

# Security Group Outputs
output "app_security_group_id" {
  description = "Application security group ID"
  value       = aws_security_group.app_staging.id
}

output "rds_security_group_id" {
  description = "RDS security group ID"
  value       = aws_security_group.rds_staging.id
}

output "redis_security_group_id" {
  description = "Redis security group ID"
  value       = aws_security_group.redis_staging.id
}

# Monitoring Outputs
output "sns_topic_arn" {
  description = "SNS topic ARN for alerts"
  value       = aws_sns_topic.staging_alerts.arn
}

output "cloudwatch_log_group_name" {
  description = "CloudWatch log group name"
  value       = aws_cloudwatch_log_group.app_logs_staging.name
}

# Network Outputs
output "vpc_id" {
  description = "VPC ID used for resources"
  value       = data.aws_vpc.default.id
}

output "subnet_ids" {
  description = "Subnet IDs used for resources"
  value       = data.aws_subnets.default.ids
}

# Environment Information
output "environment" {
  description = "Environment name"
  value       = var.environment
}

output "region" {
  description = "AWS region"
  value       = var.aws_region
}

output "account_id" {
  description = "AWS account ID"
  value       = data.aws_caller_identity.current.account_id
}

# Connection Strings (formatted for easy use)
output "database_url" {
  description = "PostgreSQL connection string (use for local testing only)"
  value       = "postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.staging.endpoint}/${var.db_name}?schema=public"
  sensitive   = true
}

output "redis_url" {
  description = "Redis connection string (use for local testing only)"
  value       = "redis://${aws_elasticache_cluster.staging.cache_nodes[0].address}:${aws_elasticache_cluster.staging.cache_nodes[0].port}"
  sensitive   = true
}

# Cost Tracking
output "resource_tags" {
  description = "Resource tags for cost tracking"
  value = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
    CostCenter  = "Staging"
    AutoDestroy = var.auto_destroy_enabled ? "true" : "false"
  }
}

# Deployment Information
output "deployment_info" {
  description = "Information for deployment scripts"
  value = {
    environment     = var.environment
    region          = var.aws_region
    rds_endpoint    = aws_db_instance.staging.endpoint
    redis_endpoint  = "${aws_elasticache_cluster.staging.cache_nodes[0].address}:${aws_elasticache_cluster.staging.cache_nodes[0].port}"
    log_group       = aws_cloudwatch_log_group.app_logs_staging.name
    security_groups = {
      app   = aws_security_group.app_staging.id
      rds   = aws_security_group.rds_staging.id
      redis = aws_security_group.redis_staging.id
    }
  }
}

# Export as JSON for scripts
output "terraform_outputs_json" {
  description = "All outputs in JSON format for scripts"
  value = jsonencode({
    rds = {
      endpoint      = aws_db_instance.staging.endpoint
      address       = aws_db_instance.staging.address
      port          = aws_db_instance.staging.port
      database_name = aws_db_instance.staging.db_name
      instance_id   = aws_db_instance.staging.id
    }
    redis = {
      endpoint   = "${aws_elasticache_cluster.staging.cache_nodes[0].address}:${aws_elasticache_cluster.staging.cache_nodes[0].port}"
      address    = aws_elasticache_cluster.staging.cache_nodes[0].address
      port       = aws_elasticache_cluster.staging.cache_nodes[0].port
      cluster_id = aws_elasticache_cluster.staging.id
    }
    secrets = {
      admin_token  = aws_secretsmanager_secret.admin_token_staging.arn
      database_url = aws_secretsmanager_secret.database_url_staging.arn
      redis_url    = aws_secretsmanager_secret.redis_url_staging.arn
    }
    monitoring = {
      sns_topic = aws_sns_topic.staging_alerts.arn
      log_group = aws_cloudwatch_log_group.app_logs_staging.name
    }
  })
  sensitive = true
}
