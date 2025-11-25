##############################################################################
# Terraform Configuration - Staging Environment
#
# Purpose: Isolated staging environment for WhatsApp SaaS MVP
#
# Features:
# - Cost-optimized instance sizes
# - Separate from production
# - Auto-deploy on develop branch merge
# - Auto-destroy after 7 days of inactivity
#
# Usage:
#   terraform init
#   terraform plan
#   terraform apply
##############################################################################

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Remote state storage (recommended for team use)
  backend "s3" {
    bucket         = "whatsapp-saas-terraform-state"
    key            = "staging/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}

# Provider configuration
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "Terraform"
      CostCenter  = "Staging"
      AutoDestroy = "true"  # For cleanup automation
    }
  }
}

# Data sources
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}
data "aws_availability_zones" "available" {
  state = "available"
}

##############################################################################
# VPC and Networking
##############################################################################

# Get default VPC (cost optimization - reuse existing VPC)
data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# Security Group for RDS
resource "aws_security_group" "rds_staging" {
  name_prefix = "${var.project_name}-${var.environment}-rds-"
  description = "Security group for RDS staging database"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "PostgreSQL from application"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    security_groups = [
      aws_security_group.app_staging.id
    ]
  }

  egress {
    description = "Allow all outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-rds-sg"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Security Group for ElastiCache Redis
resource "aws_security_group" "redis_staging" {
  name_prefix = "${var.project_name}-${var.environment}-redis-"
  description = "Security group for ElastiCache Redis staging"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "Redis from application"
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    security_groups = [
      aws_security_group.app_staging.id
    ]
  }

  egress {
    description = "Allow all outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-redis-sg"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Security Group for Application (EC2/ECS)
resource "aws_security_group" "app_staging" {
  name_prefix = "${var.project_name}-${var.environment}-app-"
  description = "Security group for application servers staging"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "HTTP from anywhere"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS from anywhere"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Application port"
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "SSH for management"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.allowed_ssh_cidr
  }

  egress {
    description = "Allow all outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-app-sg"
  }

  lifecycle {
    create_before_destroy = true
  }
}

##############################################################################
# RDS PostgreSQL Database (Staging)
##############################################################################

# DB Subnet Group
resource "aws_db_subnet_group" "staging" {
  name_prefix = "${var.project_name}-${var.environment}-"
  description = "Subnet group for staging RDS"
  subnet_ids  = data.aws_subnets.default.ids

  tags = {
    Name = "${var.project_name}-${var.environment}-db-subnet-group"
  }
}

# RDS Parameter Group
resource "aws_db_parameter_group" "staging" {
  name_prefix = "${var.project_name}-${var.environment}-pg15-"
  family      = "postgres15"
  description = "Custom parameter group for staging PostgreSQL"

  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  parameter {
    name  = "log_statement"
    value = "all"
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-pg-params"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# RDS PostgreSQL Instance
resource "aws_db_instance" "staging" {
  identifier = "${var.project_name}-${var.environment}-db"

  # Engine
  engine         = "postgres"
  engine_version = "15.4"

  # Instance class (cost-optimized for staging)
  instance_class = var.rds_instance_class

  # Storage
  allocated_storage     = var.rds_allocated_storage
  max_allocated_storage = var.rds_max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true

  # Database configuration
  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  # Network configuration
  db_subnet_group_name   = aws_db_subnet_group.staging.name
  vpc_security_group_ids = [aws_security_group.rds_staging.id]
  publicly_accessible    = false
  port                   = 5432

  # Backup configuration
  backup_retention_period = var.db_backup_retention_days
  backup_window           = "03:00-04:00"  # UTC
  maintenance_window      = "mon:04:00-mon:05:00"

  # Parameter and option groups
  parameter_group_name = aws_db_parameter_group.staging.name

  # Monitoring
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  monitoring_interval             = 60
  monitoring_role_arn             = aws_iam_role.rds_monitoring.arn

  # Protection and lifecycle
  deletion_protection = false  # Allow deletion for staging
  skip_final_snapshot = true   # No final snapshot for staging

  # Performance Insights
  performance_insights_enabled = false  # Disabled for cost optimization

  # Auto minor version upgrade
  auto_minor_version_upgrade = true

  tags = {
    Name        = "${var.project_name}-${var.environment}-db"
    BackupPolicy = "7-days"
  }
}

# IAM Role for RDS Enhanced Monitoring
resource "aws_iam_role" "rds_monitoring" {
  name_prefix = "${var.project_name}-${var.environment}-rds-mon-"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "monitoring.rds.amazonaws.com"
      }
    }]
  })

  tags = {
    Name = "${var.project_name}-${var.environment}-rds-monitoring-role"
  }
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

##############################################################################
# ElastiCache Redis (Staging)
##############################################################################

# ElastiCache Subnet Group
resource "aws_elasticache_subnet_group" "staging" {
  name        = "${var.project_name}-${var.environment}-redis-subnet"
  description = "Subnet group for staging Redis"
  subnet_ids  = data.aws_subnets.default.ids

  tags = {
    Name = "${var.project_name}-${var.environment}-redis-subnet-group"
  }
}

# ElastiCache Parameter Group
resource "aws_elasticache_parameter_group" "staging" {
  name_prefix = "${var.project_name}-${var.environment}-redis7-"
  family      = "redis7"
  description = "Custom parameter group for staging Redis"

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  parameter {
    name  = "timeout"
    value = "300"
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-redis-params"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# ElastiCache Redis Cluster
resource "aws_elasticache_cluster" "staging" {
  cluster_id = "${var.project_name}-${var.environment}-redis"

  # Engine
  engine         = "redis"
  engine_version = "7.0"

  # Node configuration (cost-optimized for staging)
  node_type            = var.redis_node_type
  num_cache_nodes      = 1
  parameter_group_name = aws_elasticache_parameter_group.staging.name

  # Network configuration
  subnet_group_name  = aws_elasticache_subnet_group.staging.name
  security_group_ids = [aws_security_group.redis_staging.id]
  port               = 6379

  # Backup configuration
  snapshot_retention_limit = var.redis_snapshot_retention_days
  snapshot_window          = "03:00-05:00"  # UTC
  maintenance_window       = "mon:05:00-mon:06:00"

  # Monitoring
  notification_topic_arn = aws_sns_topic.staging_alerts.arn

  # Auto minor version upgrade
  auto_minor_version_upgrade = true

  tags = {
    Name = "${var.project_name}-${var.environment}-redis"
  }
}

##############################################################################
# AWS Secrets Manager
##############################################################################

# Admin Token
resource "aws_secretsmanager_secret" "admin_token_staging" {
  name_prefix = "${var.project_name}/${var.environment}/admin-token-"
  description = "Admin authentication token for staging"

  recovery_window_in_days = 7  # Shorter recovery for staging

  tags = {
    Name = "${var.project_name}-${var.environment}-admin-token"
  }
}

resource "aws_secretsmanager_secret_version" "admin_token_staging" {
  secret_id     = aws_secretsmanager_secret.admin_token_staging.id
  secret_string = var.admin_token
}

# Database URL
resource "aws_secretsmanager_secret" "database_url_staging" {
  name_prefix = "${var.project_name}/${var.environment}/database-url-"
  description = "PostgreSQL connection string for staging"

  recovery_window_in_days = 7

  tags = {
    Name = "${var.project_name}-${var.environment}-database-url"
  }
}

resource "aws_secretsmanager_secret_version" "database_url_staging" {
  secret_id = aws_secretsmanager_secret.database_url_staging.id
  secret_string = "postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.staging.endpoint}/${var.db_name}?schema=public"
}

# Redis URL
resource "aws_secretsmanager_secret" "redis_url_staging" {
  name_prefix = "${var.project_name}/${var.environment}/redis-url-"
  description = "Redis connection string for staging"

  recovery_window_in_days = 7

  tags = {
    Name = "${var.project_name}-${var.environment}-redis-url"
  }
}

resource "aws_secretsmanager_secret_version" "redis_url_staging" {
  secret_id     = aws_secretsmanager_secret.redis_url_staging.id
  secret_string = "redis://${aws_elasticache_cluster.staging.cache_nodes[0].address}:${aws_elasticache_cluster.staging.cache_nodes[0].port}"
}

##############################################################################
# SNS Topics for Alerts
##############################################################################

resource "aws_sns_topic" "staging_alerts" {
  name_prefix = "${var.project_name}-${var.environment}-alerts-"

  tags = {
    Name = "${var.project_name}-${var.environment}-alerts"
  }
}

resource "aws_sns_topic_subscription" "staging_alerts_email" {
  count = var.alert_email != "" ? 1 : 0

  topic_arn = aws_sns_topic.staging_alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

##############################################################################
# CloudWatch Log Groups
##############################################################################

resource "aws_cloudwatch_log_group" "app_logs_staging" {
  name              = "/aws/${var.environment}/${var.project_name}/application"
  retention_in_days = var.log_retention_days

  tags = {
    Name = "${var.project_name}-${var.environment}-app-logs"
  }
}

##############################################################################
# Auto-Destroy Lambda (Cleanup after 7 days of inactivity)
##############################################################################

# IAM Role for Lambda
resource "aws_iam_role" "auto_destroy_lambda" {
  name_prefix = "${var.project_name}-${var.environment}-auto-destroy-"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })

  tags = {
    Name = "${var.project_name}-${var.environment}-auto-destroy-role"
  }
}

# Lambda policy for auto-destroy
resource "aws_iam_role_policy" "auto_destroy_lambda" {
  name_prefix = "${var.project_name}-${var.environment}-auto-destroy-"
  role        = aws_iam_role.auto_destroy_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "ec2:DescribeInstances",
          "ec2:DescribeTags",
          "rds:DescribeDBInstances",
          "elasticache:DescribeCacheClusters",
          "cloudwatch:GetMetricStatistics"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = aws_sns_topic.staging_alerts.arn
      }
    ]
  })
}

# Note: Lambda function code would be uploaded separately
# This is just the infrastructure definition

##############################################################################
# Outputs
##############################################################################

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint"
  value       = aws_db_instance.staging.endpoint
}

output "redis_endpoint" {
  description = "ElastiCache Redis endpoint"
  value       = "${aws_elasticache_cluster.staging.cache_nodes[0].address}:${aws_elasticache_cluster.staging.cache_nodes[0].port}"
}

output "database_url_secret_arn" {
  description = "ARN of Database URL secret"
  value       = aws_secretsmanager_secret.database_url_staging.arn
}

output "redis_url_secret_arn" {
  description = "ARN of Redis URL secret"
  value       = aws_secretsmanager_secret.redis_url_staging.arn
}

output "app_security_group_id" {
  description = "Application security group ID"
  value       = aws_security_group.app_staging.id
}

output "sns_topic_arn" {
  description = "SNS topic ARN for alerts"
  value       = aws_sns_topic.staging_alerts.arn
}
