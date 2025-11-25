##############################################################################
# Terraform Variables - Staging Environment
#
# Purpose: Define all configurable variables for staging environment
#
# Usage:
#   terraform apply -var="db_password=secret"
#   or use terraform.tfvars file
##############################################################################

# General Configuration
variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "whatsapp-saas"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "staging"
}

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

# Network Configuration
variable "allowed_ssh_cidr" {
  description = "CIDR blocks allowed to SSH to instances"
  type        = list(string)
  default     = ["0.0.0.0/0"]  # Restrict this in production
}

# RDS Configuration
variable "rds_instance_class" {
  description = "RDS instance class (cost-optimized for staging)"
  type        = string
  default     = "db.t3.micro"

  validation {
    condition     = can(regex("^db\\.(t3|t4g)\\.(micro|small|medium)$", var.rds_instance_class))
    error_message = "For staging, use cost-optimized instances: db.t3.micro, db.t3.small, or db.t4g.micro"
  }
}

variable "rds_allocated_storage" {
  description = "Initial allocated storage for RDS (GB)"
  type        = number
  default     = 20

  validation {
    condition     = var.rds_allocated_storage >= 20 && var.rds_allocated_storage <= 100
    error_message = "Allocated storage must be between 20 and 100 GB for staging"
  }
}

variable "rds_max_allocated_storage" {
  description = "Maximum allocated storage for RDS autoscaling (GB)"
  type        = number
  default     = 50

  validation {
    condition     = var.rds_max_allocated_storage >= var.rds_allocated_storage && var.rds_max_allocated_storage <= 100
    error_message = "Max storage must be >= allocated storage and <= 100 GB for staging"
  }
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "whatsapp_saas_staging"

  validation {
    condition     = can(regex("^[a-zA-Z][a-zA-Z0-9_]*$", var.db_name))
    error_message = "Database name must start with a letter and contain only alphanumeric characters and underscores"
  }
}

variable "db_username" {
  description = "Database master username"
  type        = string
  default     = "postgres"
  sensitive   = true

  validation {
    condition     = length(var.db_username) >= 1 && length(var.db_username) <= 16
    error_message = "Username must be between 1 and 16 characters"
  }
}

variable "db_password" {
  description = "Database master password"
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.db_password) >= 8
    error_message = "Password must be at least 8 characters long"
  }
}

variable "db_backup_retention_days" {
  description = "Number of days to retain automated backups"
  type        = number
  default     = 7

  validation {
    condition     = var.db_backup_retention_days >= 1 && var.db_backup_retention_days <= 35
    error_message = "Backup retention must be between 1 and 35 days"
  }
}

# ElastiCache Redis Configuration
variable "redis_node_type" {
  description = "ElastiCache node type (cost-optimized for staging)"
  type        = string
  default     = "cache.t3.micro"

  validation {
    condition     = can(regex("^cache\\.(t3|t4g)\\.(micro|small|medium)$", var.redis_node_type))
    error_message = "For staging, use cost-optimized nodes: cache.t3.micro, cache.t3.small, or cache.t4g.micro"
  }
}

variable "redis_snapshot_retention_days" {
  description = "Number of days to retain Redis snapshots"
  type        = number
  default     = 3

  validation {
    condition     = var.redis_snapshot_retention_days >= 0 && var.redis_snapshot_retention_days <= 35
    error_message = "Snapshot retention must be between 0 and 35 days"
  }
}

# Secrets Configuration
variable "admin_token" {
  description = "Admin authentication token"
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.admin_token) >= 32
    error_message = "Admin token must be at least 32 characters long"
  }
}

variable "meta_verify_token" {
  description = "Meta webhook verification token"
  type        = string
  sensitive   = true
  default     = ""
}

variable "meta_app_secret" {
  description = "Meta application secret"
  type        = string
  sensitive   = true
  default     = ""
}

variable "openai_api_key" {
  description = "OpenAI API key"
  type        = string
  sensitive   = true
  default     = ""
}

# Monitoring and Logging
variable "alert_email" {
  description = "Email address for CloudWatch alerts"
  type        = string
  default     = ""

  validation {
    condition     = var.alert_email == "" || can(regex("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", var.alert_email))
    error_message = "Must be a valid email address or empty string"
  }
}

variable "log_retention_days" {
  description = "CloudWatch Logs retention period"
  type        = number
  default     = 7

  validation {
    condition     = contains([1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653], var.log_retention_days)
    error_message = "Log retention must be a valid CloudWatch Logs retention period"
  }
}

# Auto-Destroy Configuration
variable "auto_destroy_enabled" {
  description = "Enable auto-destroy after inactivity period"
  type        = bool
  default     = true
}

variable "auto_destroy_days" {
  description = "Days of inactivity before auto-destroy"
  type        = number
  default     = 7

  validation {
    condition     = var.auto_destroy_days >= 1 && var.auto_destroy_days <= 30
    error_message = "Auto-destroy days must be between 1 and 30"
  }
}

# Cost Tags
variable "cost_tags" {
  description = "Additional cost allocation tags"
  type        = map(string)
  default = {
    Department = "Engineering"
    Team       = "DevOps"
    Purpose    = "Staging"
  }
}

# DNS Configuration
variable "domain_name" {
  description = "Base domain name for staging"
  type        = string
  default     = ""
}

variable "create_dns_records" {
  description = "Create Route53 DNS records"
  type        = bool
  default     = false
}

# Feature Flags
variable "enable_performance_insights" {
  description = "Enable RDS Performance Insights (additional cost)"
  type        = bool
  default     = false
}

variable "enable_enhanced_monitoring" {
  description = "Enable RDS Enhanced Monitoring"
  type        = bool
  default     = true
}

variable "enable_deletion_protection" {
  description = "Enable deletion protection for RDS"
  type        = bool
  default     = false  # Disabled for staging
}
