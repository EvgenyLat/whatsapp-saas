# Staging Environment Documentation

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Infrastructure Resources](#infrastructure-resources)
4. [Cost Optimization](#cost-optimization)
5. [Getting Started](#getting-started)
6. [Deployment](#deployment)
7. [Data Management](#data-management)
8. [Monitoring & Alerting](#monitoring--alerting)
9. [Auto-Destroy](#auto-destroy)
10. [Security](#security)
11. [Troubleshooting](#troubleshooting)
12. [Scripts Reference](#scripts-reference)

---

## Overview

The staging environment is an isolated, cost-optimized environment for testing the WhatsApp SaaS MVP before production deployment. It mirrors the production architecture but uses smaller instance types and reduced backup retention to minimize costs.

### Key Features

- **Isolated Infrastructure**: Completely separate from production
- **Cost-Optimized**: Uses t3.micro instances throughout
- **Auto-Deploy**: Automatically deploys on PR merge to `develop` branch
- **Auto-Destroy**: Cleans up after 7 days of inactivity
- **Data Sanitization**: Safely sync production data with PII protection
- **Comprehensive Monitoring**: CloudWatch logs, metrics, and SNS alerts

### Environment Details

| Aspect | Staging | Production |
|--------|---------|------------|
| **RDS Instance** | db.t3.micro | db.t4g.large |
| **Redis Node** | cache.t3.micro | cache.t4g.medium |
| **EC2 Instance** | t3.micro | t3.large |
| **Backup Retention** | 7 days | 30 days |
| **Log Retention** | 7 days | 30 days |
| **Deletion Protection** | Disabled | Enabled |
| **Auto-Destroy** | Enabled | Disabled |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Staging Environment                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐ │
│  │              │      │              │      │              │ │
│  │  Application │─────>│  RDS Postgres│      │  ElastiCache │ │
│  │  (ECS)       │      │  (t3.micro)  │      │  Redis       │ │
│  │  t3.micro    │      │              │      │  (t3.micro)  │ │
│  │              │─────>│              │      │              │ │
│  └──────┬───────┘      └──────────────┘      └──────────────┘ │
│         │                                                       │
│         │                                                       │
│         v                                                       │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐ │
│  │              │      │              │      │              │ │
│  │  CloudWatch  │      │  Secrets     │      │  SNS Alerts  │ │
│  │  Logs        │      │  Manager     │      │              │ │
│  │              │      │              │      │              │ │
│  └──────────────┘      └──────────────┘      └──────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Network Architecture

- **VPC**: Default VPC (cost optimization)
- **Subnets**: Default subnets across multiple AZs
- **Security Groups**:
  - `app-staging-sg`: Application security group (HTTP, HTTPS, SSH, port 3000)
  - `rds-staging-sg`: RDS security group (PostgreSQL 5432 from app)
  - `redis-staging-sg`: Redis security group (Redis 6379 from app)

---

## Infrastructure Resources

### RDS PostgreSQL Database

**Instance Configuration:**
- Instance Class: `db.t3.micro`
- Engine: PostgreSQL 15.4
- Storage: 20 GB (gp3, encrypted)
- Max Storage: 50 GB (auto-scaling)
- Backup Retention: 7 days
- Backup Window: 03:00-04:00 UTC
- Maintenance Window: Mon 04:00-05:00 UTC

**Features:**
- ✅ Storage encryption
- ✅ Enhanced monitoring (60-second interval)
- ✅ CloudWatch logs export
- ✅ Automated backups
- ✅ Auto minor version upgrade
- ❌ Performance Insights (disabled for cost)
- ❌ Deletion protection (disabled for staging)
- ❌ Multi-AZ (single AZ for cost)

### ElastiCache Redis Cluster

**Cluster Configuration:**
- Node Type: `cache.t3.micro`
- Engine: Redis 7.0
- Nodes: 1 (single node for cost)
- Port: 6379
- Snapshot Retention: 3 days
- Snapshot Window: 03:00-05:00 UTC
- Maintenance Window: Mon 05:00-06:00 UTC

**Parameters:**
- Max Memory Policy: `allkeys-lru`
- Timeout: 300 seconds

### AWS Secrets Manager

Secrets stored with 7-day recovery window:
- `whatsapp-saas/staging/admin-token`: Admin authentication token
- `whatsapp-saas/staging/database-url`: PostgreSQL connection string
- `whatsapp-saas/staging/redis-url`: Redis connection string

### CloudWatch & Monitoring

**Log Groups:**
- `/aws/staging/whatsapp-saas/application`: Application logs (7-day retention)
- `/aws/rds/instance/whatsapp-saas-staging-db/postgresql`: RDS PostgreSQL logs

**SNS Topics:**
- `whatsapp-saas-staging-alerts`: CloudWatch alerts and notifications

---

## Cost Optimization

### Monthly Cost Estimate

| Resource | Instance Type | Estimated Cost/Month |
|----------|---------------|----------------------|
| RDS PostgreSQL | db.t3.micro (20 GB) | ~$15-20 |
| ElastiCache Redis | cache.t3.micro | ~$12-15 |
| EC2/ECS | t3.micro | ~$7-10 |
| Data Transfer | Minimal | ~$1-3 |
| CloudWatch Logs | 7-day retention | ~$1-2 |
| Secrets Manager | 3 secrets | ~$1.20 |
| **Total** | | **~$37-51/month** |

### Cost Savings Features

1. **Auto-Destroy**: Automatically removes environment after 7 days of inactivity
2. **Reduced Retention**: 7 days for backups and logs vs 30 days in production
3. **Single AZ**: No multi-AZ redundancy for RDS and Redis
4. **No Performance Insights**: Disabled on RDS
5. **Minimal Snapshots**: 3-day retention for Redis vs 7 days in production
6. **Default VPC**: Reuses default VPC instead of creating new VPC resources

### Stopping Costs

To stop all charges when not in use:
```bash
./scripts/destroy-staging.sh
```

This will permanently delete all resources. Backups are saved locally before destruction.

---

## Getting Started

### Prerequisites

1. **AWS CLI** configured with credentials
2. **Terraform** >= 1.5.0
3. **PostgreSQL client** (psql, pg_dump, pg_restore)
4. **jq** for JSON parsing
5. **Node.js** >= 20 (for migrations)
6. **Docker** (for local testing)

### Installation

```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure AWS credentials
aws configure

# Install Terraform
wget https://releases.hashicorp.com/terraform/1.5.0/terraform_1.5.0_linux_amd64.zip
unzip terraform_1.5.0_linux_amd64.zip
sudo mv terraform /usr/local/bin/

# Install PostgreSQL client
sudo apt-get install postgresql-client

# Install jq
sudo apt-get install jq
```

### Initial Setup

1. **Create terraform.tfvars file:**

```bash
cd terraform/environments/staging
cat > terraform.tfvars <<EOF
# Required Variables
db_password   = "your-secure-password-here"     # Min 8 characters
admin_token   = "your-secure-admin-token-here"  # Min 32 characters

# Optional Variables
alert_email       = "your-email@example.com"
meta_verify_token = "your-meta-verify-token"
meta_app_secret   = "your-meta-app-secret"
openai_api_key    = "your-openai-api-key"

# Cost Optimization
auto_destroy_enabled = true
auto_destroy_days    = 7
EOF
```

**Security Note**: Never commit `terraform.tfvars` to version control. It contains sensitive credentials.

2. **Deploy the infrastructure:**

```bash
./scripts/deploy-staging-infrastructure.sh
```

This will:
- Initialize Terraform
- Create all AWS resources
- Wait for RDS and Redis to be available
- Export connection details
- Verify secrets in Secrets Manager

3. **Run database migrations:**

```bash
# Get DATABASE_URL from Secrets Manager
export DATABASE_URL=$(aws secretsmanager get-secret-value \
  --secret-id $(aws secretsmanager list-secrets \
    --query "SecretList[?contains(Name, 'database-url')].ARN | [0]" \
    --output text) \
  --query SecretString \
  --output text)

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate:deploy
```

---

## Deployment

### Manual Deployment

**Deploy Infrastructure:**
```bash
./scripts/deploy-staging-infrastructure.sh
```

**Deploy Application (ECS):**
```bash
export AWS_REGION=us-east-1
export ECS_CLUSTER=whatsapp-saas-staging
export ECS_SERVICE=whatsapp-saas-staging-service
export TASK_DEFINITION=whatsapp-saas-staging
export IMAGE_TAG=latest
export ECR_REGISTRY=<your-account-id>.dkr.ecr.us-east-1.amazonaws.com

./scripts/deploy-staging.sh
```

### Automated Deployment (CI/CD)

The staging environment automatically deploys when code is merged to the `develop` branch.

**GitHub Actions Workflow:** `.github/workflows/staging-deploy.yml`

**Workflow Steps:**
1. ✅ Build Docker image
2. ✅ Push to Amazon ECR
3. ✅ Deploy infrastructure (Terraform)
4. ✅ Run database migrations
5. ✅ Deploy application (ECS)
6. ✅ Run smoke tests
7. ✅ Send Slack notification

**Required GitHub Secrets:**
```
AWS_ACCESS_KEY_ID           # AWS credentials
AWS_SECRET_ACCESS_KEY       # AWS credentials
AWS_ACCOUNT_ID              # AWS account ID
STAGING_DB_PASSWORD         # Database password
STAGING_ADMIN_TOKEN         # Admin token
STAGING_URL                 # Application URL (e.g., https://staging-api.yourapp.com)
SLACK_WEBHOOK_URL           # Slack notifications (optional)
ALERT_EMAIL                 # Alert email address (optional)
META_VERIFY_TOKEN           # Meta webhook token (optional)
META_APP_SECRET             # Meta app secret (optional)
OPENAI_API_KEY              # OpenAI API key (optional)
```

**Manual Trigger:**

You can manually trigger the deployment from GitHub Actions UI or using GitHub CLI:

```bash
gh workflow run staging-deploy.yml
```

---

## Data Management

### Syncing Production Data to Staging

Use the data sync script to copy production data to staging with automatic sanitization:

```bash
./scripts/sync-production-data.sh
```

**What it does:**
1. ✅ Creates dump of production database
2. ✅ Sanitizes PII and sensitive data
3. ✅ Backs up current staging database
4. ✅ Restores sanitized data to staging
5. ✅ Verifies data integrity
6. ✅ Cleans up temporary files

**Data Sanitization:**

The script automatically sanitizes:
- **User emails**: Replaced with `staging+user{id}@example.com`
- **Phone numbers**: Replaced with `+1555000{id}`
- **User names**: Replaced with `Test User {id}`
- **Message content**: Replaced with generic test content
- **Media URLs**: Cleared
- **API tokens**: Replaced with test tokens
- **Session tokens**: Replaced with random hashes

**Skip Sanitization (NOT RECOMMENDED):**
```bash
./scripts/sync-production-data.sh --skip-sanitization
```

**Restore from Backup:**

If sync fails, restore from the automatic backup:
```bash
export STAGING_DATABASE_URL=$(aws secretsmanager get-secret-value \
  --secret-id <staging-database-url-secret-arn> \
  --query SecretString \
  --output text)

psql "$STAGING_DATABASE_URL" < tmp/db-dumps/staging-backup-<timestamp>.sql
```

### Manual Data Operations

**Connect to Staging Database:**
```bash
export DATABASE_URL=$(aws secretsmanager get-secret-value \
  --secret-id <database-url-secret-arn> \
  --query SecretString \
  --output text)

psql "$DATABASE_URL"
```

**Create Manual Backup:**
```bash
pg_dump "$DATABASE_URL" > staging-backup-$(date +%Y%m%d).sql
```

**Seed Test Data:**
```bash
npm run prisma:seed
```

---

## Monitoring & Alerting

### CloudWatch Logs

**View Application Logs:**
```bash
aws logs tail /aws/staging/whatsapp-saas/application --follow
```

**View RDS Logs:**
```bash
aws logs tail /aws/rds/instance/whatsapp-saas-staging-db/postgresql --follow
```

**Filter Logs by Error:**
```bash
aws logs filter-log-events \
  --log-group-name /aws/staging/whatsapp-saas/application \
  --filter-pattern "ERROR"
```

### CloudWatch Metrics

**RDS Metrics:**
- CPUUtilization
- DatabaseConnections
- FreeStorageSpace
- ReadIOPS / WriteIOPS
- ReadLatency / WriteLatency

**ElastiCache Metrics:**
- CPUUtilization
- NetworkBytesIn / NetworkBytesOut
- CurrConnections
- Evictions
- CacheMisses

**View Metrics:**
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name CPUUtilization \
  --dimensions Name=DBInstanceIdentifier,Value=whatsapp-saas-staging-db \
  --statistics Average \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300
```

### SNS Alerts

**Subscribe to Alerts:**
```bash
SNS_TOPIC_ARN=$(cd terraform/environments/staging && terraform output -raw sns_topic_arn)

aws sns subscribe \
  --topic-arn "$SNS_TOPIC_ARN" \
  --protocol email \
  --notification-endpoint your-email@example.com
```

**Alert Types:**
- RDS high CPU utilization
- RDS low storage space
- Redis high memory usage
- Application errors
- Deployment notifications

### Slack Notifications

Set the `SLACK_WEBHOOK_URL` environment variable or GitHub secret to receive notifications in Slack:

**Events:**
- ✅ Deployment started
- ✅ Deployment completed
- ❌ Deployment failed
- ✅ Data sync completed
- ❌ Data sync failed
- ⚠️ Infrastructure changes

---

## Auto-Destroy

The staging environment is configured to automatically destroy itself after 7 days of inactivity to save costs.

### How It Works

1. **Lambda Function** checks for activity every 24 hours
2. **Activity Check** queries CloudWatch metrics for:
   - RDS connections
   - ECS task count
   - Application requests
3. **Destruction Trigger** if no activity for 7 consecutive days
4. **SNS Notification** sent 24 hours before destruction
5. **Automatic Cleanup** removes all resources

### Configuration

Edit in `terraform/environments/staging/variables.tf`:

```hcl
variable "auto_destroy_enabled" {
  default = true  # Set to false to disable
}

variable "auto_destroy_days" {
  default = 7  # Days of inactivity before destruction
}
```

### Manual Disable

```bash
cd terraform/environments/staging
terraform apply -var="auto_destroy_enabled=false"
```

### Prevent Auto-Destroy

To keep staging environment active, generate activity:

```bash
# Health check ping (run daily)
curl https://staging-api.yourapp.com/health
```

Or disable auto-destroy temporarily before long weekends/holidays.

---

## Security

### Network Security

**Security Group Rules:**

**Application Security Group (app-staging-sg):**
- Inbound:
  - HTTP (80) from 0.0.0.0/0
  - HTTPS (443) from 0.0.0.0/0
  - Port 3000 from 0.0.0.0/0
  - SSH (22) from configurable CIDR (default: 0.0.0.0/0)
- Outbound: All traffic

**RDS Security Group (rds-staging-sg):**
- Inbound:
  - PostgreSQL (5432) from app-staging-sg only
- Outbound: All traffic

**Redis Security Group (redis-staging-sg):**
- Inbound:
  - Redis (6379) from app-staging-sg only
- Outbound: All traffic

### Access Control

**RDS Access:**
- Not publicly accessible
- Only accessible from application security group
- Master credentials in AWS Secrets Manager

**Redis Access:**
- Not publicly accessible
- Only accessible from application security group
- No authentication (network isolation)

**Secrets Manager:**
- 7-day recovery window for deleted secrets
- Automatic rotation not enabled (staging environment)
- IAM-based access control

### Data Protection

**Encryption:**
- ✅ RDS storage encrypted (AWS KMS)
- ✅ Secrets Manager encrypted
- ✅ CloudWatch Logs encrypted
- ❌ Redis encryption at rest (not available on t3.micro)

**Backups:**
- RDS automated backups (7-day retention)
- Manual snapshots can be created
- Redis snapshots (3-day retention)

### Best Practices

1. **Restrict SSH Access**: Update `allowed_ssh_cidr` in `terraform.tfvars`
2. **Rotate Credentials**: Regularly update database password and admin token
3. **Use IAM Roles**: Prefer IAM roles over access keys where possible
4. **Enable MFA**: For AWS console access
5. **Review Security Groups**: Periodically audit security group rules
6. **Monitor Access**: Check CloudWatch logs for unauthorized access attempts

---

## Troubleshooting

### Common Issues

#### 1. Terraform Apply Fails

**Error: S3 backend not configured**
```bash
# Create S3 bucket for Terraform state
aws s3 mb s3://whatsapp-saas-terraform-state --region us-east-1
aws s3api put-bucket-versioning \
  --bucket whatsapp-saas-terraform-state \
  --versioning-configuration Status=Enabled

# Create DynamoDB table for state locking
aws dynamodb create-table \
  --table-name terraform-state-lock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

**Error: Variables not set**
```bash
# Ensure terraform.tfvars exists and contains required variables
cd terraform/environments/staging
cat terraform.tfvars
```

#### 2. RDS Connection Timeout

**Check Security Groups:**
```bash
# Verify application can reach RDS
aws ec2 describe-security-groups \
  --group-ids $(cd terraform/environments/staging && terraform output -raw rds_security_group_id)
```

**Check RDS Status:**
```bash
aws rds describe-db-instances \
  --db-instance-identifier whatsapp-saas-staging-db \
  --query 'DBInstances[0].DBInstanceStatus'
```

#### 3. Migration Fails

**Error: Cannot connect to database**
```bash
# Verify DATABASE_URL is correct
echo $DATABASE_URL | grep -o 'postgresql://.*@.*:.*/.* '

# Test connection
psql "$DATABASE_URL" -c "SELECT 1;"
```

**Error: Schema drift**
```bash
# Reset database (DESTRUCTIVE)
npm run prisma:migrate:reset

# Or create new migration
npm run prisma:migrate:dev
```

#### 4. Application Won't Start

**Check ECS Task Status:**
```bash
aws ecs list-tasks --cluster whatsapp-saas-staging

aws ecs describe-tasks \
  --cluster whatsapp-saas-staging \
  --tasks <task-arn>
```

**Check CloudWatch Logs:**
```bash
aws logs tail /aws/staging/whatsapp-saas/application --follow
```

#### 5. Auto-Destroy Not Working

**Check Lambda Function:**
```bash
# List Lambda functions
aws lambda list-functions \
  --query 'Functions[?contains(FunctionName, `staging`)]'

# Check Lambda logs
aws logs tail /aws/lambda/whatsapp-saas-staging-auto-destroy --follow
```

### Getting Help

1. **Check Logs**: Always start with CloudWatch Logs
2. **Verify Resources**: Use Terraform outputs to verify resource IDs
3. **AWS Console**: Check AWS Console for resource status
4. **Terraform State**: Review Terraform state for drift

```bash
# List all resources
cd terraform/environments/staging
terraform state list

# Show specific resource
terraform state show aws_db_instance.staging
```

---

## Scripts Reference

### deploy-staging-infrastructure.sh

**Purpose**: Deploy Terraform infrastructure for staging

**Usage:**
```bash
./scripts/deploy-staging-infrastructure.sh
```

**Steps:**
1. Check prerequisites (Terraform, AWS CLI, jq)
2. Initialize Terraform
3. Create execution plan
4. Apply infrastructure changes
5. Wait for RDS and Redis to be available
6. Export outputs to JSON
7. Send Slack notification

**Outputs:**
- `terraform-staging-outputs.json`: All Terraform outputs
- `logs/staging-infra-deployment-<timestamp>.log`: Deployment log

### destroy-staging.sh

**Purpose**: Safely destroy staging environment

**Usage:**
```bash
./scripts/destroy-staging.sh           # With confirmation prompts
./scripts/destroy-staging.sh --force   # Skip confirmations (use with caution)
```

**Steps:**
1. Confirm destruction (unless --force)
2. Backup Terraform state
3. Export resource information
4. Create final database snapshot (optional)
5. Destroy all resources
6. Verify destruction
7. Save backup locally

**Outputs:**
- `backups/staging-<timestamp>/`: Backup directory with state and outputs
- `logs/staging-destruction-<timestamp>.log`: Destruction log

**Environment Variables:**
- `CREATE_FINAL_SNAPSHOT=true`: Create RDS snapshot before destruction (default: true)
- `SLACK_WEBHOOK_URL`: Slack webhook for notifications

### sync-production-data.sh

**Purpose**: Sync production data to staging with sanitization

**Usage:**
```bash
./scripts/sync-production-data.sh                   # With sanitization
./scripts/sync-production-data.sh --skip-sanitization  # Without sanitization (NOT RECOMMENDED)
```

**Steps:**
1. Verify prerequisites (PostgreSQL client, AWS CLI)
2. Retrieve production and staging database credentials
3. Confirm data overwrite
4. Create production database dump
5. Sanitize PII and sensitive data (unless skipped)
6. Backup current staging database
7. Restore sanitized data to staging
8. Verify data integrity
9. Clean up temporary files

**Outputs:**
- `tmp/db-dumps/staging-backup-<timestamp>.sql`: Staging backup
- `logs/data-sync-<timestamp>.log`: Sync log

**Sanitization:**
- User emails → `staging+user{id}@example.com`
- Phone numbers → `+1555000{id}`
- Names → `Test User {id}`
- Message content → Generic test content
- API tokens → Test tokens

### deploy-staging.sh

**Purpose**: Deploy application to ECS

**Usage:**
```bash
export AWS_REGION=us-east-1
export ECS_CLUSTER=whatsapp-saas-staging
export ECS_SERVICE=whatsapp-saas-staging-service
export TASK_DEFINITION=whatsapp-saas-staging
export IMAGE_TAG=latest
export ECR_REGISTRY=<account-id>.dkr.ecr.us-east-1.amazonaws.com

./scripts/deploy-staging.sh
```

**Steps:**
1. Verify AWS credentials
2. Verify ECS cluster exists
3. Get current task definition
4. Create new task definition with updated image
5. Update ECS service
6. Monitor deployment progress

**Required Environment Variables:**
- `AWS_REGION`: AWS region
- `ECS_CLUSTER`: ECS cluster name
- `ECS_SERVICE`: ECS service name
- `TASK_DEFINITION`: Task definition family
- `IMAGE_TAG`: Docker image tag
- `ECR_REGISTRY`: ECR registry URL

---

## DNS Configuration

### Recommended DNS Setup

Configure DNS records for staging environment:

| Record Type | Name | Value | TTL |
|-------------|------|-------|-----|
| A or CNAME | staging-api.yourapp.com | Load Balancer DNS | 300 |
| A or CNAME | staging.yourapp.com | Load Balancer DNS | 300 |

**Using Route 53:**
```bash
# Get load balancer DNS (after ECS deployment)
LB_DNS=$(aws elbv2 describe-load-balancers \
  --query 'LoadBalancers[?contains(LoadBalancerName, `staging`)].DNSName | [0]' \
  --output text)

# Create Route 53 record (replace HOSTED_ZONE_ID)
aws route53 change-resource-record-sets \
  --hosted-zone-id <HOSTED_ZONE_ID> \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "staging-api.yourapp.com",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "'$LB_DNS'"}]
      }
    }]
  }'
```

---

## Next Steps

After setting up the staging environment:

1. ✅ **Configure DNS** for staging-api.yourapp.com and staging.yourapp.com
2. ✅ **Set up GitHub Secrets** for automated deployments
3. ✅ **Subscribe to SNS alerts** for monitoring
4. ✅ **Configure Slack webhook** for notifications
5. ✅ **Run smoke tests** to verify functionality
6. ✅ **Schedule data syncs** if testing with production data
7. ✅ **Document staging URLs** for team access
8. ✅ **Set up monitoring dashboards** in CloudWatch

---

## Support & Maintenance

### Regular Maintenance Tasks

**Weekly:**
- Review CloudWatch metrics and logs
- Check for security updates (RDS, Redis)
- Review AWS costs

**Monthly:**
- Rotate database password and admin token
- Review and optimize resource usage
- Update Terraform and dependencies

**Quarterly:**
- Security audit of infrastructure
- Review and update documentation
- Performance testing and optimization

### Backup & Recovery

**RDS Backups:**
- Automated daily backups (7-day retention)
- Manual snapshots can be created anytime
- Point-in-time recovery available

**Create Manual Snapshot:**
```bash
aws rds create-db-snapshot \
  --db-instance-identifier whatsapp-saas-staging-db \
  --db-snapshot-identifier staging-manual-$(date +%Y%m%d)
```

**Restore from Snapshot:**
```bash
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier whatsapp-saas-staging-db-restored \
  --db-snapshot-identifier staging-manual-20250118
```

### Cost Management

**View Current Costs:**
```bash
aws ce get-cost-and-usage \
  --time-period Start=2025-01-01,End=2025-01-31 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --filter file://cost-filter.json
```

**cost-filter.json:**
```json
{
  "Tags": {
    "Key": "Environment",
    "Values": ["staging"]
  }
}
```

---

## Changelog

### Version 1.0.0 (2025-01-18)

- Initial staging environment setup
- Terraform infrastructure configuration
- Deployment scripts created
- GitHub Actions workflow configured
- Auto-destroy functionality implemented
- Data sync with sanitization
- Comprehensive documentation

---

## License

This documentation is part of the WhatsApp SaaS MVP project. All rights reserved.

---

## Contact

For questions or issues with the staging environment:

- **Team Lead**: [Your Name]
- **DevOps**: [DevOps Team Email]
- **Slack Channel**: #staging-environment

---

**Last Updated**: January 18, 2025
