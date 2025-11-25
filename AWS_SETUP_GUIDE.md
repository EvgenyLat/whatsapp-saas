# 🚀 AWS Infrastructure Setup Guide

**Version:** 1.0
**Last Updated:** 2025-10-17
**Status:** ✅ Production Ready

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Cost Breakdown](#cost-breakdown)
4. [Quick Start](#quick-start)
5. [Detailed Setup](#detailed-setup)
6. [Configuration](#configuration)
7. [Deployment](#deployment)
8. [Post-Deployment](#post-deployment)
9. [Rollback Procedure](#rollback-procedure)
10. [Troubleshooting](#troubleshooting)
11. [Best Practices](#best-practices)

---

## Overview

This guide covers the deployment of minimal AWS production infrastructure for the WhatsApp SaaS Starter MVP. The infrastructure is designed for cost optimization while maintaining production-grade reliability.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      AWS Cloud (us-east-1)                   │
│                                                               │
│  ┌─────────────────┐         ┌─────────────────┐           │
│  │  Application     │◄───────►│  AWS Secrets    │           │
│  │  (EC2/ECS/       │         │  Manager        │           │
│  │   Lambda)        │         │  - DB Creds     │           │
│  └────────┬─────────┘         │  - Redis URL    │           │
│           │                    │  - API Keys     │           │
│           │                    └─────────────────┘           │
│           │                                                   │
│           ├──────────┐                                       │
│           ▼          ▼                                       │
│  ┌─────────────┐  ┌────────────┐                           │
│  │ RDS         │  │ ElastiCache│                           │
│  │ PostgreSQL  │  │ Redis      │                           │
│  │ (db.t3.micro│  │(cache.t3   │                           │
│  │  20 GB)     │  │ .micro)    │                           │
│  │             │  │            │                           │
│  │ Multi-AZ: ❌│  │Single Node │                           │
│  │ Encrypted:✅│  │Encrypted:✅│                           │
│  │ Backups: 7d │  │Snapshots:5d│                           │
│  └─────────────┘  └────────────┘                           │
│                                                               │
│  ┌─────────────────────────────────────┐                    │
│  │     Security Groups                  │                    │
│  │  - RDS: port 5432 (VPC only)       │                    │
│  │  - Redis: port 6379 (VPC only)     │                    │
│  └─────────────────────────────────────┘                    │
│                                                               │
│  ┌─────────────────────────────────────┐                    │
│  │  Terraform State Backend             │                    │
│  │  - S3 Bucket (encrypted, versioned)  │                    │
│  │  - DynamoDB Table (state locking)    │                    │
│  └─────────────────────────────────────┘                    │
└─────────────────────────────────────────────────────────────┘
```

### Key Features

✅ **Cost-Optimized** - Minimal resources targeting $50-60/month
✅ **Production-Grade Security** - Encryption at rest, VPC isolation, Secrets Manager
✅ **Automated Backups** - 7-day RDS backups, 5-day Redis snapshots
✅ **Infrastructure as Code** - Terraform-managed, version-controlled
✅ **State Management** - Remote S3 backend with DynamoDB locking
✅ **Easy Rollback** - Automated rollback scripts with safety checks

---

## Prerequisites

### Required Tools

1. **Terraform** (>= 1.0)
   ```bash
   # Install Terraform
   # Visit: https://www.terraform.io/downloads

   # Verify installation
   terraform version
   ```

2. **AWS CLI** (>= 2.0)
   ```bash
   # Install AWS CLI
   # Visit: https://aws.amazon.com/cli/

   # Verify installation
   aws --version
   ```

3. **jq** (JSON processor)
   ```bash
   # Install jq
   # Visit: https://stedolan.github.io/jq/download/

   # Verify installation
   jq --version
   ```

### AWS Account Requirements

- Active AWS account
- IAM user with appropriate permissions (see below)
- AWS credentials configured locally

### IAM Permissions Required

The IAM user deploying the infrastructure needs the following permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "rds:*",
        "elasticache:*",
        "ec2:Describe*",
        "ec2:CreateSecurityGroup",
        "ec2:DeleteSecurityGroup",
        "ec2:AuthorizeSecurityGroupIngress",
        "ec2:RevokeSecurityGroupIngress",
        "secretsmanager:*",
        "s3:*",
        "dynamodb:*",
        "sts:GetCallerIdentity"
      ],
      "Resource": "*"
    }
  ]
}
```

**Recommended:** Use AWS managed policy `AdministratorAccess` for initial setup, then restrict to least-privilege policy for ongoing operations.

### AWS CLI Configuration

```bash
# Configure AWS credentials
aws configure

# Enter your credentials:
# AWS Access Key ID: YOUR_ACCESS_KEY
# AWS Secret Access Key: YOUR_SECRET_KEY
# Default region: us-east-1
# Default output format: json

# Verify configuration
aws sts get-caller-identity
```

---

## Cost Breakdown

### Monthly Cost Estimate

| Service | Resource | Specs | Monthly Cost |
|---------|----------|-------|--------------|
| **RDS PostgreSQL** | db.t3.micro | 2 vCPU, 1 GB RAM | $13.00 |
| **RDS Storage** | gp3 | 20 GB | $2.00 |
| **RDS Backups** | Automated snapshots | 7 days retention | $1.00 |
| **ElastiCache Redis** | cache.t3.micro | 1 node, 0.5 GB RAM | $12.00 |
| **ElastiCache Backups** | Snapshots | 5 days retention | $0.50 |
| **Secrets Manager** | 5 secrets | Standard secrets | $2.50 |
| **S3** | Terraform state | < 1 GB | $0.10 |
| **DynamoDB** | State locking | Pay-per-request | $0.50 |
| **Data Transfer** | Outbound | Estimated | $5.00 |
| **CloudWatch Logs** | Application logs | Estimated | $2.00 |
| **Total** | | | **$38.60 - $50.00/month** |

### Cost Optimization Features

✅ **Single-AZ Deployment** - Saves ~50% on RDS and Redis costs
✅ **t3.micro Instances** - Burstable performance for cost efficiency
✅ **Disabled Features:**
  - RDS Performance Insights (saves $7/month)
  - RDS Enhanced Monitoring (saves $3/month)
  - Multi-AZ for Redis (saves $12/month)

### Scaling Costs

When you need to scale, expect these cost increases:

| Upgrade | From | To | Additional Cost |
|---------|------|----|--------------------|
| **RDS Multi-AZ** | Single-AZ | Multi-AZ | +$13/month |
| **RDS Scale Up** | db.t3.micro | db.t3.small | +$13/month |
| **RDS Storage** | 20 GB | 100 GB | +$8/month |
| **Redis Scale Up** | cache.t3.micro | cache.t3.small | +$12/month |
| **Redis Cluster** | Single node | 3-node cluster | +$24/month |

---

## Quick Start

### One-Command Deployment

```bash
# Clone repository (if not already cloned)
git clone <your-repo-url>
cd whatsapp-saas-starter

# Make scripts executable
chmod +x scripts/deploy-aws.sh
chmod +x scripts/rollback-aws.sh

# Deploy infrastructure
./scripts/deploy-aws.sh

# Follow the prompts:
# 1. Prerequisites check
# 2. Cost estimate display
# 3. Backend initialization (if needed)
# 4. Terraform plan review
# 5. Apply confirmation
```

**Expected Deployment Time:** 10-15 minutes

### What Gets Created

After deployment, you'll have:

✅ S3 bucket for Terraform state
✅ DynamoDB table for state locking
✅ RDS PostgreSQL database (ready to use)
✅ ElastiCache Redis cluster (ready to use)
✅ Security groups configured
✅ AWS Secrets Manager secrets (with placeholders)
✅ JSON output file with all endpoints and ARNs

---

## Detailed Setup

### Step 1: Backend Initialization

The first deployment will create the Terraform backend infrastructure:

```bash
# Check if backend exists
aws s3 ls s3://whatsapp-saas-terraform-state

# If not exists, run:
./scripts/deploy-aws.sh init
```

This creates:
- S3 bucket: `whatsapp-saas-terraform-state`
  - Versioning enabled
  - Encryption enabled (AES256)
  - Public access blocked
  - Lifecycle policy: expire old versions after 90 days
- DynamoDB table: `whatsapp-saas-terraform-locks`
  - Pay-per-request billing
  - Point-in-time recovery enabled

### Step 2: Review Configuration

Review and customize `terraform/environments/mvp/terraform.tfvars`:

```hcl
# AWS Configuration
aws_region = "us-east-1"

# Project Configuration
project_name = "whatsapp-saas"
environment  = "mvp"

# RDS Configuration
db_instance_class       = "db.t3.micro"
db_allocated_storage    = 20
db_backup_retention_days = 7

# ElastiCache Configuration
redis_node_type = "cache.t3.micro"

# Network Configuration
allowed_cidr_blocks = ["10.0.0.0/8"]
```

### Step 3: Deploy Infrastructure

```bash
# Run full deployment
./scripts/deploy-aws.sh deploy

# Or step-by-step:
./scripts/deploy-aws.sh init    # Initialize Terraform
./scripts/deploy-aws.sh plan    # Review changes
./scripts/deploy-aws.sh deploy  # Apply changes
```

### Step 4: Verify Deployment

```bash
# Check outputs
./scripts/deploy-aws.sh outputs

# Verify RDS
aws rds describe-db-instances \
  --db-instance-identifier whatsapp-saas-mvp-postgres \
  --query 'DBInstances[0].[DBInstanceStatus,Endpoint.Address]'

# Verify Redis
aws elasticache describe-cache-clusters \
  --cache-cluster-id whatsapp-saas-mvp-redis \
  --show-cache-node-info \
  --query 'CacheClusters[0].[CacheClusterStatus,CacheNodes[0].Endpoint]'

# Verify Secrets
aws secretsmanager list-secrets \
  --query 'SecretList[?contains(Name, `whatsapp-saas`)].Name'
```

---

## Configuration

### Environment Variables

Create a `.env` file in your application with the values from Terraform outputs:

```bash
# Get outputs
cat terraform-outputs.json

# Or use jq to extract values
export DATABASE_URL="postgresql://dbadmin:$(aws secretsmanager get-secret-value \
  --secret-id <db-credentials-arn> \
  --query SecretString --output text | jq -r .password)@$(terraform output -raw rds_address):5432/whatsapp_saas"

export REDIS_URL="redis://$(terraform output -raw redis_endpoint)"
```

### Secrets Manager Integration

The application should fetch secrets from AWS Secrets Manager:

**Database Credentials:**
```bash
SECRET_ARN=$(terraform output -raw db_credentials_secret_arn)
aws secretsmanager get-secret-value \
  --secret-id $SECRET_ARN \
  --query SecretString \
  --output text | jq .
```

**Redis Connection:**
```bash
SECRET_ARN=$(terraform output -raw redis_connection_secret_arn)
aws secretsmanager get-secret-value \
  --secret-id $SECRET_ARN \
  --query SecretString \
  --output text | jq .
```

### Updating Secrets

Update placeholder secrets with real values:

**OpenAI API Key:**
```bash
aws secretsmanager put-secret-value \
  --secret-id $(terraform output -raw openai_api_key_secret_arn) \
  --secret-string '{
    "api_key": "sk-YOUR-OPENAI-API-KEY",
    "model": "gpt-4"
  }'
```

**WhatsApp Credentials:**
```bash
aws secretsmanager put-secret-value \
  --secret-id $(terraform output -raw whatsapp_credentials_secret_arn) \
  --secret-string '{
    "phone_number_id": "YOUR_PHONE_NUMBER_ID",
    "access_token": "YOUR_WHATSAPP_ACCESS_TOKEN",
    "verify_token": "YOUR_VERIFY_TOKEN",
    "app_secret": "YOUR_APP_SECRET"
  }'
```

**Admin Token (already generated):**
```bash
# View the auto-generated admin token
aws secretsmanager get-secret-value \
  --secret-id $(terraform output -raw admin_token_secret_arn) \
  --query SecretString \
  --output text | jq -r .token
```

---

## Deployment

### Application Deployment Options

After infrastructure is ready, deploy your application using one of these methods:

#### Option 1: EC2 Instance

```bash
# Launch EC2 instance in same VPC
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t3.micro \
  --key-name your-key-pair \
  --security-group-ids $(terraform output -raw security_group_rds_id) \
  --subnet-id <subnet-id> \
  --iam-instance-profile <instance-profile-with-secrets-access> \
  --user-data file://deploy-script.sh

# SSH into instance
ssh -i your-key.pem ec2-user@<instance-ip>

# Deploy application
git clone <your-repo>
cd whatsapp-saas-starter/Backend
npm install
npm run migrate
npm start
```

#### Option 2: ECS/Fargate

```bash
# Create ECS cluster
aws ecs create-cluster --cluster-name whatsapp-saas-mvp

# Create task definition (see ecs-task-definition.json)
aws ecs register-task-definition \
  --cli-input-json file://ecs-task-definition.json

# Create service
aws ecs create-service \
  --cluster whatsapp-saas-mvp \
  --service-name whatsapp-saas-api \
  --task-definition whatsapp-saas-api:1 \
  --desired-count 1 \
  --launch-type FARGATE
```

#### Option 3: AWS Lambda (Serverless)

```bash
# Package application
zip -r function.zip . -x "*.git*"

# Create Lambda function
aws lambda create-function \
  --function-name whatsapp-saas-api \
  --runtime nodejs18.x \
  --handler index.handler \
  --role <lambda-execution-role> \
  --zip-file fileb://function.zip \
  --environment Variables="{
    DATABASE_URL=$(aws secretsmanager get-secret-value ...),
    REDIS_URL=$(aws secretsmanager get-secret-value ...)
  }"
```

### Database Migration

After deploying the application, run database migrations:

```bash
# From application directory
cd Backend

# Run Prisma migrations
npx prisma migrate deploy

# Verify database schema
npx prisma db pull
```

### Testing Connectivity

Test connectivity from your application:

**RDS Connection Test:**
```bash
# Install PostgreSQL client
sudo apt-get install postgresql-client

# Test connection
psql -h $(terraform output -raw rds_address) \
     -U dbadmin \
     -d whatsapp_saas \
     -c "SELECT version();"
```

**Redis Connection Test:**
```bash
# Install Redis client
sudo apt-get install redis-tools

# Test connection
redis-cli -h $(terraform output -raw redis_address) ping
```

---

## Post-Deployment

### Security Checklist

After deployment, complete these security tasks:

- [ ] Update all placeholder secrets in Secrets Manager
- [ ] Rotate the database password (initial password is auto-generated)
- [ ] Configure security group rules for your specific use case
- [ ] Enable CloudWatch alarms for RDS and Redis
- [ ] Set up AWS Config rules for compliance monitoring
- [ ] Enable AWS CloudTrail for audit logging
- [ ] Review IAM roles and policies for least privilege
- [ ] Enable MFA on AWS root account and IAM users

### Monitoring Setup

Configure CloudWatch alarms:

**RDS CPU Utilization:**
```bash
aws cloudwatch put-metric-alarm \
  --alarm-name whatsapp-saas-rds-cpu-high \
  --alarm-description "RDS CPU > 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/RDS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=DBInstanceIdentifier,Value=whatsapp-saas-mvp-postgres \
  --evaluation-periods 2 \
  --alarm-actions <sns-topic-arn>
```

**Redis Memory Usage:**
```bash
aws cloudwatch put-metric-alarm \
  --alarm-name whatsapp-saas-redis-memory-high \
  --alarm-description "Redis memory > 80%" \
  --metric-name DatabaseMemoryUsagePercentage \
  --namespace AWS/ElastiCache \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=CacheClusterId,Value=whatsapp-saas-mvp-redis \
  --evaluation-periods 2 \
  --alarm-actions <sns-topic-arn>
```

### Backup Verification

Verify automated backups are working:

**RDS Snapshots:**
```bash
aws rds describe-db-snapshots \
  --db-instance-identifier whatsapp-saas-mvp-postgres \
  --query 'DBSnapshots[*].[DBSnapshotIdentifier,SnapshotCreateTime,Status]' \
  --output table
```

**Redis Snapshots:**
```bash
aws elasticache describe-snapshots \
  --cache-cluster-id whatsapp-saas-mvp-redis \
  --query 'Snapshots[*].[SnapshotName,NodeSnapshots[0].SnapshotCreateTime,SnapshotStatus]' \
  --output table
```

### Performance Tuning

Monitor and optimize database performance:

**Enable RDS Performance Insights (optional, costs $7/month):**
```bash
aws rds modify-db-instance \
  --db-instance-identifier whatsapp-saas-mvp-postgres \
  --enable-performance-insights \
  --performance-insights-retention-period 7 \
  --apply-immediately
```

**Review slow query logs:**
```bash
aws rds download-db-log-file-portion \
  --db-instance-identifier whatsapp-saas-mvp-postgres \
  --log-file-name error/postgresql.log.2025-10-17-12 \
  --output text
```

---

## Rollback Procedure

### Full Rollback

Use the automated rollback script:

```bash
# Full rollback with prompts
./scripts/rollback-aws.sh

# The script will:
# 1. Prompt for final RDS snapshot
# 2. Disable deletion protection
# 3. Destroy all infrastructure
# 4. Clean up local state
# 5. Optionally remove backend (S3 + DynamoDB)
```

### Partial Rollback

Roll back specific resources:

**Destroy only RDS:**
```bash
cd terraform/environments/mvp
terraform destroy -target=aws_db_instance.postgresql
```

**Destroy only Redis:**
```bash
terraform destroy -target=aws_elasticache_cluster.redis
```

### Manual Rollback

If automated rollback fails:

**1. Delete RDS Instance:**
```bash
# Disable deletion protection
aws rds modify-db-instance \
  --db-instance-identifier whatsapp-saas-mvp-postgres \
  --no-deletion-protection \
  --apply-immediately

# Create final snapshot
aws rds create-db-snapshot \
  --db-instance-identifier whatsapp-saas-mvp-postgres \
  --db-snapshot-identifier final-backup-$(date +%Y%m%d)

# Delete instance
aws rds delete-db-instance \
  --db-instance-identifier whatsapp-saas-mvp-postgres \
  --skip-final-snapshot
```

**2. Delete Redis Cluster:**
```bash
aws elasticache delete-cache-cluster \
  --cache-cluster-id whatsapp-saas-mvp-redis
```

**3. Delete Secrets:**
```bash
# List secrets
aws secretsmanager list-secrets \
  --query 'SecretList[?contains(Name, `whatsapp-saas`)].ARN' \
  --output text

# Delete each secret (with recovery window)
aws secretsmanager delete-secret \
  --secret-id <secret-arn> \
  --recovery-window-in-days 7

# Or force delete immediately
aws secretsmanager delete-secret \
  --secret-id <secret-arn> \
  --force-delete-without-recovery
```

**4. Delete Security Groups:**
```bash
aws ec2 delete-security-group \
  --group-id $(terraform output -raw security_group_rds_id)

aws ec2 delete-security-group \
  --group-id $(terraform output -raw security_group_redis_id)
```

**5. Clean Up Backend (Optional):**
```bash
# Empty S3 bucket
aws s3 rm s3://whatsapp-saas-terraform-state --recursive

# Delete S3 bucket
aws s3api delete-bucket \
  --bucket whatsapp-saas-terraform-state

# Delete DynamoDB table
aws dynamodb delete-table \
  --table-name whatsapp-saas-terraform-locks
```

### Rollback Verification

After rollback, verify all resources are deleted:

```bash
# Run verification script
./scripts/rollback-aws.sh list

# Or manually check:
aws rds describe-db-instances --query 'DBInstances[?contains(DBInstanceIdentifier, `whatsapp-saas`)].DBInstanceIdentifier'
aws elasticache describe-cache-clusters --query 'CacheClusters[?contains(CacheClusterId, `whatsapp-saas`)].CacheClusterId'
aws secretsmanager list-secrets --query 'SecretList[?contains(Name, `whatsapp-saas`)].Name'
```

---

## Troubleshooting

### Issue 1: Terraform Backend Not Initialized

**Symptoms:**
```
Error: Backend initialization required
```

**Solution:**
```bash
# Initialize backend
./scripts/deploy-aws.sh init

# Or manually:
cd terraform/environments/mvp
terraform init \
  -backend-config="bucket=whatsapp-saas-terraform-state" \
  -backend-config="key=mvp/terraform.tfstate" \
  -backend-config="region=us-east-1"
```

### Issue 2: RDS Deletion Protection

**Symptoms:**
```
Error: Cannot delete DB instance with deletion protection enabled
```

**Solution:**
```bash
# Disable deletion protection
aws rds modify-db-instance \
  --db-instance-identifier whatsapp-saas-mvp-postgres \
  --no-deletion-protection \
  --apply-immediately

# Wait for modification
aws rds wait db-instance-available \
  --db-instance-identifier whatsapp-saas-mvp-postgres
```

### Issue 3: State Lock

**Symptoms:**
```
Error acquiring the state lock
```

**Solution:**
```bash
# List locks
aws dynamodb scan \
  --table-name whatsapp-saas-terraform-locks

# Force unlock (use with caution)
cd terraform/environments/mvp
terraform force-unlock <lock-id>
```

### Issue 4: Insufficient IAM Permissions

**Symptoms:**
```
Error: UnauthorizedOperation
```

**Solution:**
```bash
# Check current permissions
aws iam get-user
aws iam list-attached-user-policies --user-name <your-username>

# Attach required policy
aws iam attach-user-policy \
  --user-name <your-username> \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess
```

### Issue 5: RDS Connection Timeout

**Symptoms:**
```
could not connect to server: Connection timed out
```

**Solution:**
```bash
# Check security group rules
aws ec2 describe-security-groups \
  --group-ids $(terraform output -raw security_group_rds_id)

# Verify application is in same VPC
aws ec2 describe-instances \
  --instance-ids <your-instance-id> \
  --query 'Reservations[0].Instances[0].VpcId'

# Add inbound rule if needed
aws ec2 authorize-security-group-ingress \
  --group-id $(terraform output -raw security_group_rds_id) \
  --protocol tcp \
  --port 5432 \
  --source-group <your-app-security-group-id>
```

### Issue 6: Redis Connection Refused

**Symptoms:**
```
Error: ECONNREFUSED - Connection refused
```

**Solution:**
```bash
# Check Redis status
aws elasticache describe-cache-clusters \
  --cache-cluster-id whatsapp-saas-mvp-redis \
  --show-cache-node-info

# Check security group
aws ec2 describe-security-groups \
  --group-ids $(terraform output -raw security_group_redis_id)

# Test connectivity from within VPC
redis-cli -h $(terraform output -raw redis_address) ping
```

### Issue 7: Secrets Not Found

**Symptoms:**
```
Error: ResourceNotFoundException - Secrets Manager can't find the specified secret
```

**Solution:**
```bash
# List all secrets
aws secretsmanager list-secrets

# Verify Terraform outputs
terraform output

# If secrets are missing, re-apply Terraform
cd terraform/environments/mvp
terraform apply -target=aws_secretsmanager_secret.db_credentials
```

---

## Best Practices

### Infrastructure Management

✅ **Use Version Control**
```bash
# Always commit infrastructure changes
git add terraform/
git commit -m "Update AWS infrastructure configuration"
git push
```

✅ **Tag Resources**
```hcl
# Add custom tags in terraform.tfvars
default_tags = {
  Environment = "mvp"
  Project     = "whatsapp-saas"
  ManagedBy   = "terraform"
  CostCenter  = "engineering"
  Owner       = "devops-team"
}
```

✅ **Use Terraform Workspaces** (for multiple environments)
```bash
# Create workspaces
terraform workspace new staging
terraform workspace new production

# Switch workspaces
terraform workspace select production
```

✅ **Enable Resource Termination Protection**
```hcl
# In main.tf for critical resources
deletion_protection = true
prevent_destroy     = true
```

### Security Best Practices

✅ **Rotate Secrets Regularly**
```bash
# Rotate database password every 90 days
aws secretsmanager rotate-secret \
  --secret-id $(terraform output -raw db_credentials_secret_arn) \
  --rotation-lambda-arn <rotation-lambda-arn>
```

✅ **Use IAM Database Authentication** (optional upgrade)
```bash
# Enable IAM authentication on RDS
aws rds modify-db-instance \
  --db-instance-identifier whatsapp-saas-mvp-postgres \
  --enable-iam-database-authentication
```

✅ **Enable Audit Logging**
```bash
# Enable PostgreSQL audit log
aws rds modify-db-instance \
  --db-instance-identifier whatsapp-saas-mvp-postgres \
  --cloudwatch-logs-export-configuration '{"LogTypesToEnable":["postgresql"]}'
```

✅ **Restrict Network Access**
```hcl
# Use specific CIDR blocks in terraform.tfvars
allowed_cidr_blocks = ["10.0.1.0/24"]  # Only app subnet
```

### Cost Optimization

✅ **Use Reserved Instances** (for long-term deployments)
```bash
# Purchase RDS reserved instance (saves 30-40%)
aws rds purchase-reserved-db-instances-offering \
  --reserved-db-instances-offering-id <offering-id> \
  --reserved-db-instance-id whatsapp-saas-mvp-ri
```

✅ **Enable Auto-Scaling** (when traffic grows)
```hcl
# Add auto-scaling for Redis
resource "aws_appautoscaling_target" "redis" {
  max_capacity       = 5
  min_capacity       = 1
  resource_id        = "replication-group/${aws_elasticache_cluster.redis.id}"
  scalable_dimension = "elasticache:replication-group:NodeGroups"
  service_namespace  = "elasticache"
}
```

✅ **Schedule Shutdown** (for non-production environments)
```bash
# Stop RDS during off-hours (staging/dev)
aws rds stop-db-instance \
  --db-instance-identifier whatsapp-saas-mvp-postgres

# Start when needed
aws rds start-db-instance \
  --db-instance-identifier whatsapp-saas-mvp-postgres
```

### Monitoring and Alerts

✅ **Set Up Cost Alerts**
```bash
# Create billing alarm
aws cloudwatch put-metric-alarm \
  --alarm-name aws-billing-alert \
  --alarm-description "Alert when monthly bill exceeds $60" \
  --metric-name EstimatedCharges \
  --namespace AWS/Billing \
  --statistic Maximum \
  --period 21600 \
  --threshold 60 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1
```

✅ **Monitor Key Metrics**
```bash
# RDS metrics to monitor:
# - CPUUtilization (< 80%)
# - DatabaseConnections (< max_connections)
# - FreeableMemory (> 100 MB)
# - ReadLatency / WriteLatency (< 10ms)

# Redis metrics to monitor:
# - CPUUtilization (< 80%)
# - DatabaseMemoryUsagePercentage (< 80%)
# - CurrConnections (< max_connections)
# - EngineCPUUtilization (< 90%)
```

---

## Summary

**Infrastructure Status:** ✅ Ready for Deployment

**What You've Deployed:**
- ✅ Terraform backend (S3 + DynamoDB)
- ✅ RDS PostgreSQL (db.t3.micro, 20 GB, encrypted)
- ✅ ElastiCache Redis (cache.t3.micro, single-node)
- ✅ Security Groups (VPC-only access)
- ✅ AWS Secrets Manager (5 secrets)
- ✅ Automated backup configuration

**Monthly Cost:** $38.60 - $50.00

**Deployment Time:** 10-15 minutes

**Next Steps:**
1. Update secrets in AWS Secrets Manager
2. Deploy application to AWS
3. Run database migrations
4. Configure monitoring and alerts
5. Test application connectivity
6. Set up CI/CD pipeline

**Support:**
- For rollback: `./scripts/rollback-aws.sh`
- For outputs: `./scripts/deploy-aws.sh outputs`
- For costs: `./scripts/deploy-aws.sh cost`

---

**Last Updated:** 2025-10-17
**Version:** 1.0
**Terraform Version:** >= 1.0
**AWS Provider Version:** ~> 5.0
