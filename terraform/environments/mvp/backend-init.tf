################################################################################
# Backend Initialization Configuration
# This file is used ONLY for initial S3 bucket and DynamoDB table creation
# After initial setup, this file should be removed and main.tf backend used
################################################################################

terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # No backend configuration for initial setup
  # State will be stored locally until S3 bucket is created
}

provider "aws" {
  region = "us-east-1"

  default_tags {
    tags = {
      Environment = "mvp"
      Project     = "whatsapp-saas-starter"
      ManagedBy   = "terraform"
      Purpose     = "backend-infrastructure"
    }
  }
}

################################################################################
# S3 Bucket for Terraform State
################################################################################

resource "aws_s3_bucket" "terraform_state" {
  bucket = "whatsapp-saas-terraform-state"

  tags = {
    Name        = "whatsapp-saas-terraform-state"
    Description = "Terraform state storage for WhatsApp SaaS project"
  }

  lifecycle {
    prevent_destroy = true
  }
}

# Enable versioning
resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Enable server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Block public access
resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Enable lifecycle policy to manage old versions
resource "aws_s3_bucket_lifecycle_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    id     = "expire-old-versions"
    status = "Enabled"

    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }

  rule {
    id     = "abort-incomplete-multipart-uploads"
    status = "Enabled"

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

################################################################################
# DynamoDB Table for State Locking
################################################################################

resource "aws_dynamodb_table" "terraform_locks" {
  name         = "whatsapp-saas-terraform-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  tags = {
    Name        = "whatsapp-saas-terraform-locks"
    Description = "Terraform state locking for WhatsApp SaaS project"
  }

  lifecycle {
    prevent_destroy = true
  }
}

# Enable point-in-time recovery for DynamoDB
resource "aws_dynamodb_table" "terraform_locks_pitr" {
  name         = aws_dynamodb_table.terraform_locks.name
  billing_mode = aws_dynamodb_table.terraform_locks.billing_mode
  hash_key     = aws_dynamodb_table.terraform_locks.hash_key

  attribute {
    name = "LockID"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = aws_dynamodb_table.terraform_locks.tags

  lifecycle {
    ignore_changes = [point_in_time_recovery]
  }
}

################################################################################
# Outputs
################################################################################

output "s3_bucket_name" {
  description = "Name of the S3 bucket for Terraform state"
  value       = aws_s3_bucket.terraform_state.id
}

output "s3_bucket_arn" {
  description = "ARN of the S3 bucket for Terraform state"
  value       = aws_s3_bucket.terraform_state.arn
}

output "dynamodb_table_name" {
  description = "Name of the DynamoDB table for state locking"
  value       = aws_dynamodb_table.terraform_locks.id
}

output "dynamodb_table_arn" {
  description = "ARN of the DynamoDB table for state locking"
  value       = aws_dynamodb_table.terraform_locks.arn
}

output "next_steps" {
  description = "Next steps after backend initialization"
  value = <<-EOT
    Backend infrastructure created successfully!

    Next steps:
    1. Remove or rename backend-init.tf
    2. Run: terraform init -migrate-state
    3. Terraform will migrate local state to S3
    4. Verify state is in S3: aws s3 ls s3://whatsapp-saas-terraform-state/
    5. Delete local terraform.tfstate files
  EOT
}
