# WhatsApp SaaS Platform - Production Deployment Guide

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Initial Setup](#initial-setup)
4. [Infrastructure Deployment](#infrastructure-deployment)
5. [Database Setup](#database-setup)
6. [Application Deployment](#application-deployment)
7. [Post-Deployment Verification](#post-deployment-verification)
8. [Monitoring & Alerting](#monitoring--alerting)
9. [Backup & Disaster Recovery](#backup--disaster-recovery)
10. [Cost Optimization](#cost-optimization)
11. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Tools

Install the following tools before deployment:

```bash
# AWS CLI (>= 2.0)
aws --version

# Terraform (>= 1.0)
terraform version

# Node.js (>= 18.x)
node --version

# Docker (for building images)
docker --version

# PostgreSQL client (for database operations)
psql --version

# jq (for JSON parsing in scripts)
jq --version
```

### AWS Account Setup

1. **AWS Account**: Production-ready AWS account with Administrator access
2. **AWS Credentials**: Configure AWS CLI with appropriate credentials
   ```bash
   aws configure
   AWS Access Key ID: [YOUR_ACCESS_KEY]
   AWS Secret Access Key: [YOUR_SECRET_KEY]
   Default region name: us-east-1
   Default output format: json
   ```

3. **Verify Access**:
   ```bash
   aws sts get-caller-identity
   ```

### Cost Considerations

**Estimated Monthly Cost: ~$84/month**

- RDS PostgreSQL (db.t3.small Multi-AZ): ~$35/month
- ElastiCache Redis (cache.t3.micro x2): ~$12/month
- ECS Fargate (2-10 tasks): ~$10-30/month
- Application Load Balancer: ~$18/month
- Data Transfer & Other: ~$5/month

**Cost Optimization Options**:
- Single-AZ RDS (saves $17/month, reduces to ~$67/month)
- Reserved Instances after 3 months (saves 30-40%)
- See [Cost Optimization](#cost-optimization) section for details

---

## Architecture Overview

### AWS Services Used

```
┌─────────────────────────────────────────────────────────────┐
│                         Internet                             │
└────────────────────────┬────────────────────────────────────┘
                         │
                    ┌────▼────┐
                    │   ALB   │ (Application Load Balancer)
                    └────┬────┘
                         │
        ┌────────────────┴────────────────┐
        │                                 │
   ┌────▼────┐                      ┌────▼────┐
   │ ECS Task│                      │ ECS Task│
   │ (Fargate)│                     │ (Fargate)│
   └────┬────┘                      └────┬────┘
        │                                │
        └────────────────┬───────────────┘
                         │
          ┌──────────────┼──────────────┐
          │              │              │
     ┌────▼────┐    ┌────▼────┐   ┌────▼────┐
     │   RDS   │    │  Redis  │   │   S3    │
     │PostgreSQL│   │ElastiCache│ │ Backups │
     └─────────┘    └─────────┘   └─────────┘
```

### Network Architecture

- **VPC**: 10.0.0.0/16
- **Public Subnets**: 10.0.1.0/24, 10.0.2.0/24 (ALB)
- **Private Subnets**: 10.0.11.0/24, 10.0.12.0/24 (ECS Tasks)
- **Database Subnets**: 10.0.21.0/24, 10.0.22.0/24 (RDS, Redis)
- **Availability Zones**: 2 (us-east-1a, us-east-1b)

### Security

- **Encryption at Rest**: All data encrypted with AWS KMS
- **Encryption in Transit**: TLS 1.2+ for all connections
- **Secrets Management**: AWS Secrets Manager for credentials
- **Network Isolation**: Database subnets have no internet access
- **Security Groups**: Principle of least privilege

---

## Initial Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-org/whatsapp-saas-starter.git
cd whatsapp-saas-starter
```

### 2. Configure Terraform Variables

```bash
cd terraform/environments/production

# Copy example configuration
cp terraform.tfvars.example terraform.tfvars

# Edit with your values
nano terraform.tfvars
```

**Required Configuration**:

```hcl
# General
aws_region   = "us-east-1"
project_name = "whatsapp-saas"
environment  = "production"

# Database
db_instance_class    = "db.t3.small"
db_multi_az          = true
db_deletion_protection = true

# Cache
redis_node_type      = "cache.t3.micro"
redis_num_cache_nodes = 2

# Compute
ecs_desired_count = 2
ecs_min_capacity  = 2
ecs_max_capacity  = 10

# Domain & SSL (REQUIRED for HTTPS)
domain_name     = "api.yourdomain.com"
certificate_arn = "arn:aws:acm:us-east-1:123456789012:certificate/..."

# Alerts
alert_email = "alerts@yourdomain.com"
```

### 3. Create SSL Certificate (If not already done)

```bash
# Request ACM certificate
aws acm request-certificate \
  --domain-name api.yourdomain.com \
  --validation-method DNS \
  --region us-east-1

# Follow DNS validation instructions in AWS Console
# Wait for certificate to be issued
# Copy certificate ARN to terraform.tfvars
```

---

## Infrastructure Deployment

### Step 1: Deploy Infrastructure

```bash
cd terraform/environments/production

# Initialize Terraform
terraform init

# Review planned changes
terraform plan

# Deploy infrastructure
./scripts/deploy-production-infrastructure.sh
```

**What Gets Created**:
- VPC with public, private, and database subnets
- RDS PostgreSQL database (Multi-AZ)
- ElastiCache Redis cluster
- ECS Cluster (Fargate)
- Application Load Balancer
- S3 bucket for backups
- KMS keys for encryption
- Secrets Manager secrets
- CloudWatch alarms and dashboard
- SNS topic for alerts
- ECR repository for Docker images

**Expected Duration**: 15-20 minutes

### Step 2: Validate Infrastructure

```bash
./scripts/validate-production.sh
```

**Expected Output**:
```
✓ VPC exists and configured correctly
✓ RDS instance running (Multi-AZ enabled)
✓ Redis cluster healthy
✓ ECS cluster created
✓ ALB provisioned
✓ Security groups configured
✓ Encryption enabled
```

### Step 3: Save Terraform Outputs

```bash
cd terraform/environments/production

# Save all outputs for reference
terraform output > outputs.txt

# Get specific values
terraform output -raw database_endpoint
terraform output -raw redis_endpoint
terraform output -raw ecr_repository_url
terraform output -raw alb_dns_name
```

---

## Database Setup

### Step 1: Run Database Migrations

```bash
./scripts/migrate-production-database.sh
```

**What It Does**:
1. Retrieves database credentials from Secrets Manager
2. Tests database connectivity
3. Creates backup before migration
4. Runs Prisma migrations
5. Verifies migration success
6. Generates Prisma client

**Expected Output**:
```
✓ Database credentials retrieved
✓ Database connection successful
✓ Backup created: backups/pre_migration_20240115_143000.sql
✓ Migration completed: 13 migrations applied
✓ Prisma client generated
```

### Step 2: Seed Initial Data (Optional)

```bash
./scripts/migrate-production-database.sh --seed
```

### Step 3: Verify Database

```bash
# Check database tables
psql $(terraform output -raw database_url) -c "\dt"

# Verify indexes (should be 13+)
psql $(terraform output -raw database_url) -c \
  "SELECT count(*) FROM pg_indexes WHERE schemaname = 'public';"
```

---

## Application Deployment

### Step 1: Build and Push Docker Image

```bash
./scripts/deploy-application.sh
```

**What It Does**:
1. Builds Docker image from Backend/Dockerfile
2. Tags with git commit SHA
3. Pushes to ECR repository
4. Creates new ECS task definition
5. Updates ECS service
6. Waits for deployment to stabilize

**Expected Duration**: 5-10 minutes

**Expected Output**:
```
✓ Docker image built: 2.5GB
✓ Image pushed to ECR
✓ Task definition registered: revision 1
✓ ECS service updated
✓ Deployment stabilized: 2/2 tasks running
```

### Step 2: Verify Application

```bash
# Get ALB URL
ALB_URL=$(cd terraform/environments/production && terraform output -raw alb_dns_name)

# Test health endpoint
curl http://${ALB_URL}/health

# Expected response:
# {"status":"ok","database":"connected","redis":"connected"}
```

### Step 3: Monitor Deployment

```bash
# View application logs
aws logs tail /ecs/whatsapp-saas-production --follow --region us-east-1

# Check ECS service status
aws ecs describe-services \
  --cluster whatsapp-saas-production-cluster \
  --services whatsapp-saas-production-service \
  --query 'services[0].{Running:runningCount,Desired:desiredCount,Status:status}'
```

---

## Post-Deployment Verification

### Automated Validation

```bash
./scripts/validate-production.sh
```

### Manual Checks

#### 1. Infrastructure Health

```bash
# RDS
aws rds describe-db-instances \
  --db-instance-identifier whatsapp-saas-production \
  --query 'DBInstances[0].{Status:DBInstanceStatus,MultiAZ:MultiAZ,Encrypted:StorageEncrypted}'

# Redis
aws elasticache describe-replication-groups \
  --replication-group-id whatsapp-saas-production \
  --query 'ReplicationGroups[0].{Status:Status,Nodes:NodeGroups[0].NodeGroupMembers[*].CurrentRole}'

# ECS
aws ecs describe-services \
  --cluster whatsapp-saas-production-cluster \
  --services whatsapp-saas-production-service \
  --query 'services[0].deployments[0]'
```

#### 2. Application Endpoints

```bash
# Health check
curl http://${ALB_URL}/health

# API endpoints (if authentication not required)
curl http://${ALB_URL}/api/v1/status
```

#### 3. CloudWatch Metrics

View metrics in AWS Console:
- [CloudWatch Dashboard](https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:)
- Check: CPU, Memory, Request Count, Error Rate, Response Time

#### 4. Run Smoke Tests

```bash
cd Backend
npm run test:smoke
```

---

## Monitoring & Alerting

### CloudWatch Dashboards

Access dashboards:
1. **Main Dashboard**: Infrastructure metrics (RDS, Redis, ECS, ALB)
2. **Cost Dashboard**: Cost monitoring and optimization
3. **Application Logs**: Real-time log viewing

### Alarms Configured

| Alarm | Threshold | Action |
|-------|-----------|--------|
| RDS CPU High | > 80% for 10 minutes | SNS Alert |
| RDS Connections High | > 80 connections | SNS Alert |
| Redis Memory High | > 90% | SNS Alert |
| ALB 5XX Errors | > 10 errors/minute | SNS Alert |
| ECS Task Count Low | < 2 tasks | SNS Alert |
| Unhealthy Targets | > 0 unhealthy | SNS Alert |

### Email Alerts

Configure email subscriptions:
```bash
# Confirm email subscription (check inbox)
aws sns subscribe \
  --topic-arn $(cd terraform/environments/production && terraform output -raw sns_alerts_topic_arn) \
  --protocol email \
  --notification-endpoint your-email@example.com
```

### Log Insights Queries

Pre-configured queries:
- **Error Logs**: Find all ERROR level logs
- **Slow Requests**: Queries taking > 1 second
- **Connection Pool Errors**: Database connection issues

Access: [CloudWatch Logs Insights](https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#logsV2:logs-insights)

---

## Backup & Disaster Recovery

### Automated Backups

| Type | Frequency | Retention | Storage |
|------|-----------|-----------|---------|
| RDS Automated Snapshots | Every 5 minutes | 7 days | AWS-managed |
| Database pg_dump | Daily (2am UTC) | 30 days | S3 Standard-IA |
| Redis Snapshots | Daily (2am UTC) | 7 days | AWS-managed |

### Manual Backup

```bash
# Create database backup
./scripts/backup-database.sh --manual

# Create RDS snapshot
./scripts/backup-database.sh --snapshot --manual
```

### Restore Procedures

**From pg_dump backup**:
```bash
./scripts/restore-database.sh --backup <filename>
```

**From RDS snapshot**:
```bash
./scripts/restore-database.sh --snapshot <snapshot-id>
```

**See Also**: [Disaster Recovery Runbook](scripts/disaster-recovery-runbook.md)

### Recovery Objectives

- **RTO (Recovery Time Objective)**: 15 minutes
- **RPO (Recovery Point Objective)**: 5 minutes
- **Multi-AZ Failover**: Automatic (1-2 minutes)

---

## Cost Optimization

### Monitor Costs

```bash
# Check current month costs
./scripts/check-costs.sh

# Detailed breakdown
./scripts/check-costs.sh --detailed

# Cost forecast
./scripts/check-costs.sh --forecast
```

### Optimization Strategies

#### 1. Right-Sizing (Immediate)

```bash
# Monitor resource utilization for 1 week
./scripts/validate-production.sh

# If RDS CPU < 40%, downgrade to db.t3.micro
# If Redis memory < 60%, downgrade to cache.t2.micro
```

#### 2. Reserved Instances (After 3 months)

Purchase Reserved Instances for:
- **RDS**: 1-year No Upfront (saves ~30%)
- **ElastiCache**: 1-year No Upfront (saves ~30%)

Estimated savings: **$17/month**

#### 3. Compute Savings Plans (After stable usage)

- Commit to baseline ECS usage (2 tasks)
- Savings: ~20% on Fargate costs

#### 4. Single-AZ (If HA not critical)

```hcl
# In terraform.tfvars
db_multi_az = false # Saves $17/month
```

**Trade-off**: Higher downtime risk during maintenance

#### 5. Cost Alerts

Already configured:
- Alert at 50% of budget
- Alert at 80% of budget
- Alert at 100% of budget
- Anomaly detection enabled

---

## Troubleshooting

### Common Issues

#### Issue 1: ECS Tasks Failing to Start

**Symptoms**: Tasks repeatedly starting and stopping

**Diagnosis**:
```bash
aws ecs describe-tasks \
  --cluster whatsapp-saas-production-cluster \
  --tasks <task-arn> \
  --query 'tasks[0].{StoppedReason:stoppedReason,Containers:containers[*].reason}'
```

**Common Causes**:
1. **Database connection failure**
   ```bash
   # Verify database is accessible
   ./scripts/validate-production.sh

   # Check security groups
   aws ec2 describe-security-groups --group-ids <rds-sg-id>
   ```

2. **Secrets Manager access denied**
   ```bash
   # Verify task execution role permissions
   aws iam get-role-policy \
     --role-name whatsapp-saas-production-ecs-task-execution \
     --policy-name whatsapp-saas-production-secrets-access
   ```

3. **Image pull failure**
   ```bash
   # Check ECR repository
   aws ecr describe-images \
     --repository-name whatsapp-saas-production

   # Verify task definition image URI
   aws ecs describe-task-definition \
     --task-definition whatsapp-saas-production
   ```

#### Issue 2: High Error Rate

**Symptoms**: 5XX errors from ALB, high error rate alarm

**Diagnosis**:
```bash
# Check application logs
aws logs tail /ecs/whatsapp-saas-production --since 30m

# Check database connections
psql $(terraform output -raw database_url) -c \
  "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"
```

**Common Causes**:
1. **Database connection pool exhaustion**
   - Verify max_connections = 100 in RDS parameter group
   - Check application DB_CONNECTION_LIMIT = 50

2. **Redis connection issues**
   ```bash
   # Check Redis health
   aws elasticache describe-replication-groups \
     --replication-group-id whatsapp-saas-production
   ```

#### Issue 3: Slow Response Times

**Diagnosis**:
```bash
# Check CloudWatch metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApplicationELB \
  --metric-name TargetResponseTime \
  --dimensions Name=LoadBalancer,Value=<alb-name> \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average
```

**Common Causes**:
1. **Database slow queries**
   ```bash
   # Check RDS Performance Insights
   # https://console.aws.amazon.com/rds/home?region=us-east-1#performance-insights:

   # Or query slow queries
   psql $(terraform output -raw database_url) -c \
     "SELECT query, calls, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"
   ```

2. **Insufficient ECS capacity**
   ```bash
   # Check ECS service metrics
   aws ecs describe-services \
     --cluster whatsapp-saas-production-cluster \
     --services whatsapp-saas-production-service

   # Scale up if needed
   aws ecs update-service \
     --cluster whatsapp-saas-production-cluster \
     --service whatsapp-saas-production-service \
     --desired-count 4
   ```

#### Issue 4: Terraform Apply Fails

**Common Errors**:

1. **State lock error**
   ```bash
   # List DynamoDB locks
   aws dynamodb scan --table-name terraform-state-lock

   # Force unlock (use with caution)
   terraform force-unlock <lock-id>
   ```

2. **Resource already exists**
   ```bash
   # Import existing resource
   terraform import aws_rds_instance.main whatsapp-saas-production
   ```

---

## Deployment Checklist

### Pre-Deployment

- [ ] AWS credentials configured
- [ ] Terraform variables set in terraform.tfvars
- [ ] SSL certificate created and validated
- [ ] Email alerts configured
- [ ] Budget limits set
- [ ] Backup strategy reviewed

### Deployment

- [ ] Infrastructure deployed (./scripts/deploy-production-infrastructure.sh)
- [ ] Infrastructure validated (./scripts/validate-production.sh)
- [ ] Database migrated (./scripts/migrate-production-database.sh)
- [ ] Application deployed (./scripts/deploy-application.sh)
- [ ] Health checks passing

### Post-Deployment

- [ ] All CloudWatch alarms configured
- [ ] Email alerts subscribed and confirmed
- [ ] Backups running successfully
- [ ] Cost monitoring enabled
- [ ] Documentation updated
- [ ] Smoke tests passing
- [ ] Load testing completed (if applicable)

---

## Support & Resources

### Documentation

- [Disaster Recovery Runbook](scripts/disaster-recovery-runbook.md)
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)
- [Terraform Documentation](https://www.terraform.io/docs/)
- [Prisma Documentation](https://www.prisma.io/docs/)

### AWS Console Links

- [RDS Dashboard](https://console.aws.amazon.com/rds/home?region=us-east-1)
- [ECS Dashboard](https://console.aws.amazon.com/ecs/home?region=us-east-1)
- [CloudWatch Dashboard](https://console.aws.amazon.com/cloudwatch/home?region=us-east-1)
- [Cost Explorer](https://console.aws.amazon.com/cost-management/home?region=us-east-1#/cost-explorer)

### Getting Help

- **Infrastructure Issues**: Check [Troubleshooting](#troubleshooting) section
- **Cost Questions**: Run `./scripts/check-costs.sh --detailed`
- **Security Concerns**: Review AWS Security Hub
- **Performance Issues**: Check CloudWatch dashboards

---

**Last Updated**: 2024-01-15
**Version**: 1.0.1 (DB Connection Pool Fix)
**Maintainer**: DevOps Team
