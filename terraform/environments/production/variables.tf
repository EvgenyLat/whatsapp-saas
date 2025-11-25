# ============================================================================
# WhatsApp SaaS Platform - Production Variables
# ============================================================================

# ============================================================================
# GENERAL
# ============================================================================

variable "aws_region" {
  description = "AWS region for deployment"
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
  default     = "production"
}

# ============================================================================
# NETWORKING
# ============================================================================

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

# ============================================================================
# DATABASE (RDS PostgreSQL)
# ============================================================================

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.small" # 2 vCPU, 2GB RAM - handles 100 connections
}

variable "db_allocated_storage" {
  description = "Initial allocated storage in GB"
  type        = number
  default     = 50
}

variable "db_max_allocated_storage" {
  description = "Maximum allocated storage in GB (for autoscaling)"
  type        = number
  default     = 100
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "whatsapp_saas"
}

variable "db_username" {
  description = "Database master username"
  type        = string
  default     = "whatsapp_admin"
  sensitive   = true
}

variable "db_multi_az" {
  description = "Enable Multi-AZ deployment for high availability"
  type        = bool
  default     = true
}

variable "db_deletion_protection" {
  description = "Enable deletion protection"
  type        = bool
  default     = true
}

# ============================================================================
# CACHE (ElastiCache Redis)
# ============================================================================

variable "redis_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t3.micro" # 0.5GB memory - sufficient for session/query caching
}

variable "redis_num_cache_nodes" {
  description = "Number of cache nodes (1 for single node, 2+ for replication)"
  type        = number
  default     = 2 # Primary + replica for high availability
}

# ============================================================================
# COMPUTE (ECS)
# ============================================================================

variable "container_port" {
  description = "Container port for the application"
  type        = number
  default     = 4000
}

variable "ecs_task_cpu" {
  description = "Fargate task CPU units (1024 = 1 vCPU)"
  type        = number
  default     = 1024 # 1 vCPU
}

variable "ecs_task_memory" {
  description = "Fargate task memory in MB"
  type        = number
  default     = 2048 # 2GB
}

variable "ecs_desired_count" {
  description = "Desired number of ECS tasks"
  type        = number
  default     = 2
}

variable "ecs_min_capacity" {
  description = "Minimum number of ECS tasks (auto-scaling)"
  type        = number
  default     = 2
}

variable "ecs_max_capacity" {
  description = "Maximum number of ECS tasks (auto-scaling)"
  type        = number
  default     = 10
}

# ============================================================================
# APPLICATION
# ============================================================================

variable "ecr_repository_url" {
  description = "ECR repository URL for application images"
  type        = string
  default     = "" # Will be created and set during deployment
}

variable "app_image_tag" {
  description = "Application image tag"
  type        = string
  default     = "latest"
}

variable "log_level" {
  description = "Application log level"
  type        = string
  default     = "info"
}

# ============================================================================
# DOMAIN & SSL
# ============================================================================

variable "domain_name" {
  description = "Domain name for the application (e.g., api.example.com)"
  type        = string
  default     = "" # Must be set for production
}

variable "certificate_arn" {
  description = "ARN of ACM certificate for SSL/TLS"
  type        = string
  default     = "" # Must be set for production
}

variable "alb_deletion_protection" {
  description = "Enable deletion protection for ALB"
  type        = bool
  default     = true
}

# ============================================================================
# MONITORING & ALERTS
# ============================================================================

variable "alert_email" {
  description = "Email address for CloudWatch alerts"
  type        = string
  default     = ""
}

variable "enable_performance_insights" {
  description = "Enable RDS Performance Insights"
  type        = bool
  default     = true
}

# ============================================================================
# BACKUP & RETENTION
# ============================================================================

variable "backup_retention_days" {
  description = "Number of days to retain automated backups"
  type        = number
  default     = 7
}

variable "snapshot_retention_days" {
  description = "Number of days to retain manual snapshots"
  type        = number
  default     = 30
}

# ============================================================================
# COST OPTIMIZATION
# ============================================================================

variable "enable_deletion_protection" {
  description = "Enable deletion protection on critical resources"
  type        = bool
  default     = true
}

variable "budget_limit_monthly" {
  description = "Monthly budget limit in USD"
  type        = number
  default     = 60
}
