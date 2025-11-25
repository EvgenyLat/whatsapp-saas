################################################################################
# WhatsApp SaaS Starter - MVP Infrastructure
# Terraform Configuration for AWS
# Budget: $50-60/month
################################################################################

terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }

  backend "s3" {
    bucket         = "whatsapp-saas-terraform-state"
    key            = "mvp/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "whatsapp-saas-terraform-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment = "mvp"
      Project     = "whatsapp-saas-starter"
      ManagedBy   = "terraform"
      CostCenter  = "mvp-production"
    }
  }
}

################################################################################
# Variables
################################################################################

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "whatsapp-saas"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "mvp"
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "redis_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t3.micro"
}

variable "db_allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = number
  default     = 20
}

variable "db_backup_retention_days" {
  description = "Number of days to retain automated backups"
  type        = number
  default     = 7
}

variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to access resources"
  type        = list(string)
  default     = ["10.0.0.0/8"] # Adjust based on your VPC/network setup
}

################################################################################
# Data Sources
################################################################################

data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

################################################################################
# VPC Configuration (using default VPC for cost optimization)
################################################################################

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

################################################################################
# Security Groups
################################################################################

# Security group for RDS PostgreSQL
resource "aws_security_group" "rds" {
  name_prefix = "${var.project_name}-${var.environment}-rds-"
  description = "Security group for RDS PostgreSQL database"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "PostgreSQL from VPC"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [data.aws_vpc.default.cidr_block]
  }

  egress {
    description = "Allow all outbound traffic"
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

# Security group for ElastiCache Redis
resource "aws_security_group" "redis" {
  name_prefix = "${var.project_name}-${var.environment}-redis-"
  description = "Security group for ElastiCache Redis"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "Redis from VPC"
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = [data.aws_vpc.default.cidr_block]
  }

  egress {
    description = "Allow all outbound traffic"
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

################################################################################
# RDS Subnet Group
################################################################################

resource "aws_db_subnet_group" "main" {
  name_prefix = "${var.project_name}-${var.environment}-"
  description = "Database subnet group for ${var.project_name}"
  subnet_ids  = data.aws_subnets.default.ids

  tags = {
    Name = "${var.project_name}-${var.environment}-db-subnet-group"
  }
}

################################################################################
# ElastiCache Subnet Group
################################################################################

resource "aws_elasticache_subnet_group" "main" {
  name        = "${var.project_name}-${var.environment}-redis-subnet-group"
  description = "ElastiCache subnet group for ${var.project_name}"
  subnet_ids  = data.aws_subnets.default.ids

  tags = {
    Name = "${var.project_name}-${var.environment}-redis-subnet-group"
  }
}

################################################################################
# Random Password Generation
################################################################################

resource "random_password" "db_password" {
  length  = 32
  special = true
  # Avoid characters that might cause issues in connection strings
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

################################################################################
# RDS PostgreSQL Instance
################################################################################

resource "aws_db_instance" "postgresql" {
  identifier = "${var.project_name}-${var.environment}-postgres"

  # Engine configuration
  engine               = "postgres"
  engine_version       = "15.4"
  instance_class       = var.db_instance_class
  allocated_storage    = var.db_allocated_storage
  storage_type         = "gp3"
  storage_encrypted    = true

  # Database configuration
  db_name  = "whatsapp_saas"
  username = "dbadmin"
  password = random_password.db_password.result
  port     = 5432

  # Network configuration
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false

  # Backup configuration
  backup_retention_period = var.db_backup_retention_days
  backup_window          = "03:00-04:00"  # 3-4 AM UTC
  maintenance_window     = "mon:04:00-mon:05:00"  # Monday 4-5 AM UTC

  # High availability - DISABLED for cost optimization
  multi_az = false

  # Performance and monitoring
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  performance_insights_enabled    = false  # Disabled for cost optimization
  monitoring_interval             = 0      # Disabled for cost optimization

  # Deletion protection
  deletion_protection = true
  skip_final_snapshot = false
  final_snapshot_identifier = "${var.project_name}-${var.environment}-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"

  # Auto minor version upgrade
  auto_minor_version_upgrade = true

  # Parameter group
  parameter_group_name = aws_db_parameter_group.postgresql.name

  tags = {
    Name = "${var.project_name}-${var.environment}-postgres"
  }
}

################################################################################
# RDS Parameter Group
################################################################################

resource "aws_db_parameter_group" "postgresql" {
  name_prefix = "${var.project_name}-${var.environment}-postgres-"
  family      = "postgres15"
  description = "Custom parameter group for ${var.project_name} PostgreSQL"

  # Connection pooling optimization
  parameter {
    name  = "max_connections"
    value = "100"
  }

  parameter {
    name  = "shared_buffers"
    value = "{DBInstanceClassMemory/32768}"  # ~25% of RAM for t3.micro
  }

  parameter {
    name  = "effective_cache_size"
    value = "{DBInstanceClassMemory/16384}"  # ~50% of RAM
  }

  parameter {
    name  = "work_mem"
    value = "4096"  # 4MB
  }

  parameter {
    name  = "maintenance_work_mem"
    value = "65536"  # 64MB
  }

  # Logging
  parameter {
    name  = "log_min_duration_statement"
    value = "1000"  # Log queries > 1 second
  }

  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-postgres-params"
  }
}

################################################################################
# ElastiCache Redis Cluster
################################################################################

resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "${var.project_name}-${var.environment}-redis"
  engine               = "redis"
  engine_version       = "7.0"
  node_type            = var.redis_node_type
  num_cache_nodes      = 1
  parameter_group_name = aws_elasticache_parameter_group.redis.name
  port                 = 6379

  # Network configuration
  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]

  # Backup configuration
  snapshot_retention_limit = 5
  snapshot_window         = "03:00-05:00"  # 3-5 AM UTC
  maintenance_window      = "mon:05:00-mon:06:00"  # Monday 5-6 AM UTC

  # High availability - DISABLED for cost optimization
  az_mode = "single-az"

  # Encryption
  at_rest_encryption_enabled = true
  transit_encryption_enabled = false  # Disabled for simplicity in MVP

  # Auto minor version upgrade
  auto_minor_version_upgrade = true

  tags = {
    Name = "${var.project_name}-${var.environment}-redis"
  }
}

################################################################################
# ElastiCache Parameter Group
################################################################################

resource "aws_elasticache_parameter_group" "redis" {
  name_prefix = "${var.project_name}-${var.environment}-redis-"
  family      = "redis7"
  description = "Custom parameter group for ${var.project_name} Redis"

  # Memory management
  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  # Persistence (disabled for cost optimization)
  parameter {
    name  = "save"
    value = ""
  }

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-redis-params"
  }
}

################################################################################
# AWS Secrets Manager - Database Credentials
################################################################################

resource "aws_secretsmanager_secret" "db_credentials" {
  name_prefix             = "${var.project_name}-${var.environment}-db-credentials-"
  description             = "Database credentials for ${var.project_name}"
  recovery_window_in_days = 7

  tags = {
    Name = "${var.project_name}-${var.environment}-db-credentials"
  }
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username             = aws_db_instance.postgresql.username
    password             = random_password.db_password.result
    engine               = "postgres"
    host                 = aws_db_instance.postgresql.address
    port                 = aws_db_instance.postgresql.port
    dbname               = aws_db_instance.postgresql.db_name
    dbInstanceIdentifier = aws_db_instance.postgresql.identifier
  })
}

################################################################################
# AWS Secrets Manager - Redis Connection
################################################################################

resource "aws_secretsmanager_secret" "redis_connection" {
  name_prefix             = "${var.project_name}-${var.environment}-redis-connection-"
  description             = "Redis connection string for ${var.project_name}"
  recovery_window_in_days = 7

  tags = {
    Name = "${var.project_name}-${var.environment}-redis-connection"
  }
}

resource "aws_secretsmanager_secret_version" "redis_connection" {
  secret_id = aws_secretsmanager_secret.redis_connection.id
  secret_string = jsonencode({
    host                = aws_elasticache_cluster.redis.cache_nodes[0].address
    port                = aws_elasticache_cluster.redis.cache_nodes[0].port
    connection_string   = "redis://${aws_elasticache_cluster.redis.cache_nodes[0].address}:${aws_elasticache_cluster.redis.cache_nodes[0].port}"
    cluster_id          = aws_elasticache_cluster.redis.cluster_id
  })
}

################################################################################
# AWS Secrets Manager - OpenAI API Key (Placeholder)
################################################################################

resource "aws_secretsmanager_secret" "openai_api_key" {
  name_prefix             = "${var.project_name}-${var.environment}-openai-api-key-"
  description             = "OpenAI API Key for ${var.project_name}"
  recovery_window_in_days = 7

  tags = {
    Name = "${var.project_name}-${var.environment}-openai-api-key"
  }
}

resource "aws_secretsmanager_secret_version" "openai_api_key" {
  secret_id = aws_secretsmanager_secret.openai_api_key.id
  secret_string = jsonencode({
    api_key = "PLACEHOLDER_UPDATE_MANUALLY"
    model   = "gpt-4"
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

################################################################################
# AWS Secrets Manager - WhatsApp Credentials (Placeholder)
################################################################################

resource "aws_secretsmanager_secret" "whatsapp_credentials" {
  name_prefix             = "${var.project_name}-${var.environment}-whatsapp-credentials-"
  description             = "WhatsApp API credentials for ${var.project_name}"
  recovery_window_in_days = 7

  tags = {
    Name = "${var.project_name}-${var.environment}-whatsapp-credentials"
  }
}

resource "aws_secretsmanager_secret_version" "whatsapp_credentials" {
  secret_id = aws_secretsmanager_secret.whatsapp_credentials.id
  secret_string = jsonencode({
    phone_number_id = "PLACEHOLDER_UPDATE_MANUALLY"
    access_token    = "PLACEHOLDER_UPDATE_MANUALLY"
    verify_token    = "PLACEHOLDER_UPDATE_MANUALLY"
    app_secret      = "PLACEHOLDER_UPDATE_MANUALLY"
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

################################################################################
# AWS Secrets Manager - Admin Token (Placeholder)
################################################################################

resource "aws_secretsmanager_secret" "admin_token" {
  name_prefix             = "${var.project_name}-${var.environment}-admin-token-"
  description             = "Admin API token for ${var.project_name}"
  recovery_window_in_days = 7

  tags = {
    Name = "${var.project_name}-${var.environment}-admin-token"
  }
}

resource "random_password" "admin_token" {
  length  = 64
  special = true
}

resource "aws_secretsmanager_secret_version" "admin_token" {
  secret_id = aws_secretsmanager_secret.admin_token.id
  secret_string = jsonencode({
    token = random_password.admin_token.result
  })
}

################################################################################
# Outputs
################################################################################

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint"
  value       = aws_db_instance.postgresql.endpoint
  sensitive   = false
}

output "rds_address" {
  description = "RDS PostgreSQL address (hostname only)"
  value       = aws_db_instance.postgresql.address
  sensitive   = false
}

output "rds_port" {
  description = "RDS PostgreSQL port"
  value       = aws_db_instance.postgresql.port
  sensitive   = false
}

output "rds_database_name" {
  description = "RDS database name"
  value       = aws_db_instance.postgresql.db_name
  sensitive   = false
}

output "redis_endpoint" {
  description = "ElastiCache Redis endpoint"
  value       = "${aws_elasticache_cluster.redis.cache_nodes[0].address}:${aws_elasticache_cluster.redis.cache_nodes[0].port}"
  sensitive   = false
}

output "redis_address" {
  description = "ElastiCache Redis address (hostname only)"
  value       = aws_elasticache_cluster.redis.cache_nodes[0].address
  sensitive   = false
}

output "redis_port" {
  description = "ElastiCache Redis port"
  value       = aws_elasticache_cluster.redis.cache_nodes[0].port
  sensitive   = false
}

output "db_credentials_secret_arn" {
  description = "ARN of the database credentials secret"
  value       = aws_secretsmanager_secret.db_credentials.arn
  sensitive   = false
}

output "redis_connection_secret_arn" {
  description = "ARN of the Redis connection secret"
  value       = aws_secretsmanager_secret.redis_connection.arn
  sensitive   = false
}

output "openai_api_key_secret_arn" {
  description = "ARN of the OpenAI API key secret"
  value       = aws_secretsmanager_secret.openai_api_key.arn
  sensitive   = false
}

output "whatsapp_credentials_secret_arn" {
  description = "ARN of the WhatsApp credentials secret"
  value       = aws_secretsmanager_secret.whatsapp_credentials.arn
  sensitive   = false
}

output "admin_token_secret_arn" {
  description = "ARN of the admin token secret"
  value       = aws_secretsmanager_secret.admin_token.arn
  sensitive   = false
}

output "vpc_id" {
  description = "VPC ID"
  value       = data.aws_vpc.default.id
  sensitive   = false
}

output "security_group_rds_id" {
  description = "Security group ID for RDS"
  value       = aws_security_group.rds.id
  sensitive   = false
}

output "security_group_redis_id" {
  description = "Security group ID for Redis"
  value       = aws_security_group.redis.id
  sensitive   = false
}

output "region" {
  description = "AWS region"
  value       = var.aws_region
  sensitive   = false
}

output "environment" {
  description = "Environment name"
  value       = var.environment
  sensitive   = false
}

output "account_id" {
  description = "AWS Account ID"
  value       = data.aws_caller_identity.current.account_id
  sensitive   = false
}
