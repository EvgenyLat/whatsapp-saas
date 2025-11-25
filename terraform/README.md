# Terraform Infrastructure

This directory contains Terraform configurations for deploying AWS infrastructure for the WhatsApp SaaS Starter project.

## Directory Structure

```
terraform/
├── environments/
│   └── mvp/
│       ├── main.tf              # Main infrastructure configuration
│       ├── backend-init.tf      # Backend initialization (use once)
│       ├── terraform.tfvars     # Variable values
│       └── terraform.tfstate    # State file (in S3 after init)
├── modules/                     # Reusable Terraform modules (future)
└── README.md                    # This file
```

## Quick Start

### Prerequisites

- Terraform >= 1.0
- AWS CLI configured
- jq (for JSON processing)

### Deploy Infrastructure

```bash
# From project root
./scripts/deploy-aws.sh
```

### View Outputs

```bash
./scripts/deploy-aws.sh outputs
```

### Rollback

```bash
./scripts/rollback-aws.sh
```

## Infrastructure Components

### Deployed Resources

- **RDS PostgreSQL** (db.t3.micro, 20 GB)
  - Single-AZ for cost optimization
  - Automated backups (7 days)
  - Encryption at rest enabled
  - CloudWatch logs enabled

- **ElastiCache Redis** (cache.t3.micro)
  - Single node
  - Snapshot backups (5 days)
  - Encryption at rest enabled

- **AWS Secrets Manager**
  - Database credentials
  - Redis connection string
  - OpenAI API key (placeholder)
  - WhatsApp credentials (placeholder)
  - Admin token (auto-generated)

- **Security Groups**
  - RDS: port 5432 (VPC only)
  - Redis: port 6379 (VPC only)

- **Terraform Backend**
  - S3 bucket (versioned, encrypted)
  - DynamoDB table (state locking)

### Monthly Cost

**Estimated: $38.60 - $50.00/month**

See [AWS_SETUP_GUIDE.md](../AWS_SETUP_GUIDE.md) for detailed cost breakdown.

## Configuration

### Environment Variables

Customize `terraform/environments/mvp/terraform.tfvars`:

```hcl
aws_region              = "us-east-1"
project_name            = "whatsapp-saas"
environment             = "mvp"
db_instance_class       = "db.t3.micro"
db_allocated_storage    = 20
redis_node_type         = "cache.t3.micro"
```

### Backend Configuration

The Terraform state is stored in S3:

- **Bucket:** whatsapp-saas-terraform-state
- **Key:** mvp/terraform.tfstate
- **Region:** us-east-1
- **Lock Table:** whatsapp-saas-terraform-locks

## Common Commands

### Initialize

```bash
cd terraform/environments/mvp
terraform init
```

### Plan Changes

```bash
terraform plan
```

### Apply Changes

```bash
terraform apply
```

### View Outputs

```bash
terraform output
terraform output -json > outputs.json
```

### Destroy Infrastructure

```bash
terraform destroy
```

### Check State

```bash
terraform state list
terraform state show aws_db_instance.postgresql
```

## Outputs

After deployment, the following outputs are available:

| Output | Description |
|--------|-------------|
| `rds_endpoint` | RDS PostgreSQL endpoint (host:port) |
| `rds_address` | RDS hostname only |
| `rds_database_name` | Database name |
| `redis_endpoint` | Redis endpoint (host:port) |
| `redis_address` | Redis hostname only |
| `db_credentials_secret_arn` | ARN for database credentials secret |
| `redis_connection_secret_arn` | ARN for Redis connection secret |
| `openai_api_key_secret_arn` | ARN for OpenAI API key secret |
| `whatsapp_credentials_secret_arn` | ARN for WhatsApp credentials secret |
| `admin_token_secret_arn` | ARN for admin token secret |
| `vpc_id` | VPC ID |
| `security_group_rds_id` | RDS security group ID |
| `security_group_redis_id` | Redis security group ID |

## Troubleshooting

### Backend Not Initialized

```bash
./scripts/deploy-aws.sh init
```

### State Lock

```bash
terraform force-unlock <lock-id>
```

### RDS Deletion Protection

```bash
aws rds modify-db-instance \
  --db-instance-identifier whatsapp-saas-mvp-postgres \
  --no-deletion-protection \
  --apply-immediately
```

## Documentation

For detailed setup instructions, see:
- [AWS_SETUP_GUIDE.md](../AWS_SETUP_GUIDE.md) - Complete setup guide
- [QUICK_START_DEVOPS.md](../QUICK_START_DEVOPS.md) - DevOps quick start

## Security

- All secrets are stored in AWS Secrets Manager
- Encryption at rest enabled for RDS and Redis
- VPC-only access (no public endpoints)
- Security groups restrict access to necessary ports only

## Scaling

To scale the infrastructure:

**Increase RDS capacity:**
```hcl
db_instance_class    = "db.t3.small"
db_allocated_storage = 100
```

**Enable Multi-AZ:**
```hcl
# In main.tf, change:
multi_az = true
```

**Scale Redis:**
```hcl
redis_node_type = "cache.t3.small"
```

Apply changes:
```bash
terraform plan
terraform apply
```

## Cost Optimization

Current configuration is optimized for cost:
- Single-AZ deployment (saves ~50%)
- t3.micro instances (burstable performance)
- Performance Insights disabled (saves $7/month)
- Enhanced Monitoring disabled (saves $3/month)

For production, consider:
- Multi-AZ for high availability
- Reserved instances (30-40% savings)
- Larger instance types for better performance

## Support

For issues or questions:
1. Check [AWS_SETUP_GUIDE.md](../AWS_SETUP_GUIDE.md) troubleshooting section
2. Review Terraform logs: `TF_LOG=DEBUG terraform apply`
3. Check AWS CloudWatch logs for resource-specific issues

---

**Last Updated:** 2025-10-17
