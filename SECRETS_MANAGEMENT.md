# 🔐 Secrets Management Guide

**Version:** 1.0
**Last Updated:** 2025-10-17
**Status:** ✅ Production Ready

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Secret List](#secret-list)
4. [Local Development](#local-development)
5. [AWS Production Setup](#aws-production-setup)
6. [Adding New Secrets](#adding-new-secrets)
7. [Secret Rotation](#secret-rotation)
8. [Emergency Access](#emergency-access)
9. [IAM Permissions](#iam-permissions)
10. [Monitoring](#monitoring)
11. [Troubleshooting](#troubleshooting)
12. [Best Practices](#best-practices)

---

## Overview

The WhatsApp SaaS application uses a hybrid secrets management approach:

- **Local Development:** Environment variables (`.env` file)
- **AWS Production:** AWS Secrets Manager with in-memory caching

### Key Features

✅ **Dual Mode Operation** - Seamlessly switch between local and AWS secrets
✅ **In-Memory Caching** - 1-hour cache with automatic refresh
✅ **Zero Downtime Rotation** - Rotate secrets without app restart
✅ **Fail-Safe Fallback** - Continues with cached secrets if refresh fails
✅ **Audit Logging** - All secret access logged (values never exposed)
✅ **IAM Integration** - Least-privilege access control

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    Application Layer                          │
│                                                                │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  src/config/secrets.js                                  │  │
│  │  - Singleton pattern                                    │  │
│  │  - In-memory cache (1 hour TTL)                        │  │
│  │  - Auto-refresh on expiry                              │  │
│  │  - Fallback to cached values on error                  │  │
│  └───────────────┬────────────────────────────────────────┘  │
│                  │                                             │
└──────────────────┼─────────────────────────────────────────────┘
                   │
                   ├──> USE_AWS_SECRETS=false
                   │    ↓
                   │    Environment Variables (.env)
                   │
                   └──> USE_AWS_SECRETS=true
                        ↓
                   ┌────────────────────────────────────┐
                   │   AWS Secrets Manager               │
                   │   - Encrypted at rest (KMS)         │
                   │   - Encrypted in transit (TLS)      │
                   │   - Versioned                        │
                   │   - Tagged (Project, Environment)    │
                   │   - IAM access control               │
                   └────────────────────────────────────┘
```

### Cache Flow

```
Application Startup
      │
      ├──> Load secrets (AWS or ENV)
      │
      ├──> Cache in memory
      │
      ├──> Set lastRefresh timestamp
      │
      └──> Ready

Secret Request
      │
      ├──> Check cache age
      │
      ├──> If < 1 hour: Return cached value
      │
      └──> If > 1 hour: Background refresh
                │
                ├──> Success: Update cache
                │
                └──> Failure: Keep cached value, log error
```

---

## Secret List

### Required Secrets

| Secret Name | AWS Path | Required | Description |
|-------------|----------|----------|-------------|
| `ADMIN_TOKEN` | `whatsapp-saas/mvp/admin-token` | Yes | Admin API authentication token |
| `META_VERIFY_TOKEN` | `whatsapp-saas/mvp/meta-verify-token` | Yes | Meta webhook verification token |
| `META_APP_SECRET` | `whatsapp-saas/mvp/meta-app-secret` | Yes | Meta app secret for HMAC validation |
| `DATABASE_URL` | `whatsapp-saas/mvp/database-url` | Yes | PostgreSQL connection string |
| `REDIS_URL` | `whatsapp-saas/mvp/redis-url` | Yes | Redis connection string |
| `OPENAI_API_KEY` | `whatsapp-saas/mvp/openai-api-key` | Yes | OpenAI API key |

### Optional Secrets

| Secret Name | AWS Path | Required | Default | Description |
|-------------|----------|----------|---------|-------------|
| `WHATSAPP_PHONE_NUMBER_ID` | `whatsapp-saas/mvp/whatsapp-phone-number-id` | No | - | Default WhatsApp phone number ID |
| `WHATSAPP_ACCESS_TOKEN` | `whatsapp-saas/mvp/whatsapp-access-token` | No | - | Default WhatsApp access token |
| `OPENAI_MODEL` | `whatsapp-saas/mvp/openai-model` | No | gpt-4 | OpenAI model to use |
| `OPENAI_MAX_TOKENS` | `whatsapp-saas/mvp/openai-max-tokens` | No | 1000 | Max tokens per request |
| `OPENAI_TEMPERATURE` | `whatsapp-saas/mvp/openai-temperature` | No | 0.7 | Temperature setting |

---

## Local Development

### Setup

1. **Copy environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Update `.env` with your values:**
   ```bash
   # Use local mode (not AWS Secrets Manager)
   USE_AWS_SECRETS=false

   # Generate secure admin token
   ADMIN_TOKEN=$(openssl rand -base64 48)

   # Add your API keys
   OPENAI_API_KEY=sk-your-api-key
   META_APP_SECRET=your-meta-app-secret

   # For docker-compose, use these URLs:
   DATABASE_URL=postgresql://postgres:postgres@postgres:5432/whatsapp_saas?schema=public
   REDIS_URL=redis://redis:6379
   ```

3. **Start application:**
   ```bash
   # With Docker
   docker-compose up -d

   # Without Docker
   cd Backend
   npm install
   npm run dev
   ```

### Local Development Workflow

```bash
# Check if secrets are loaded
curl http://localhost:3000/healthz | jq '.services'

# Test admin endpoint (requires ADMIN_TOKEN)
curl -H "x-admin-token: $ADMIN_TOKEN" \
  http://localhost:3000/admin/salons

# View secret status (doesn't expose values)
curl -H "x-admin-token: $ADMIN_TOKEN" \
  http://localhost:3000/admin/secrets/health
```

### Docker Compose

The `docker-compose.yml` is configured for local development:

- Uses environment variables from `.env`
- Sets `USE_AWS_SECRETS=false` by default
- Includes PostgreSQL and Redis containers
- Auto-runs database migrations on startup

**Start services:**
```bash
docker-compose up -d
```

**Start with management tools:**
```bash
docker-compose --profile tools up -d

# Access:
# - Adminer (DB GUI): http://localhost:8080
# - Redis Commander: http://localhost:8081
```

---

## AWS Production Setup

### Prerequisites

- AWS CLI configured
- Terraform outputs available (if using infrastructure from Prompt 9)
- IAM permissions for Secrets Manager

### Step 1: Initialize Secrets

Run the setup script to create all secrets:

```bash
./scripts/setup-aws-secrets.sh
```

This will:
1. Check prerequisites (AWS CLI, jq)
2. Verify AWS credentials
3. Prompt for each secret value
4. Auto-generate secure tokens (ADMIN_TOKEN, META_VERIFY_TOKEN)
5. Create secrets in AWS Secrets Manager
6. Generate IAM policy documents
7. Display summary and next steps

**Example interaction:**
```
╔════════════════════════════════════════════════════════════════╗
║       AWS Secrets Manager Setup Script                        ║
╚════════════════════════════════════════════════════════════════╝

[INFO] Project: whatsapp-saas
[INFO] Environment: mvp
[INFO] AWS Region: us-east-1
[INFO] Secret prefix: whatsapp-saas/mvp

Continue with setup? (yes/no): yes

[INFO] Setting up DATABASE_URL secret...
[SUCCESS] Found RDS endpoint from Terraform: db-instance.us-east-1.rds.amazonaws.com
[SUCCESS] Created: whatsapp-saas/mvp/database-url

[INFO] Setting up ADMIN_TOKEN secret...
[SUCCESS] Generated new admin token
[SUCCESS] Created: whatsapp-saas/mvp/admin-token

...

[SUCCESS] All secrets have been created/updated!
```

### Step 2: Configure Application

Update application environment to use AWS Secrets:

```bash
# Set environment variables
export USE_AWS_SECRETS=true
export AWS_REGION=us-east-1

# Verify IAM role has read access
aws sts get-caller-identity

# Test secret access
aws secretsmanager get-secret-value \
  --secret-id whatsapp-saas/mvp/admin-token \
  --region us-east-1
```

### Step 3: Deploy Application

**Option A: ECS/Fargate**
```yaml
# task-definition.json
{
  "environment": [
    {"name": "USE_AWS_SECRETS", "value": "true"},
    {"name": "AWS_REGION", "value": "us-east-1"},
    {"name": "NODE_ENV", "value": "production"}
  ],
  "taskRoleArn": "arn:aws:iam::ACCOUNT:role/app-secrets-read-role"
}
```

**Option B: EC2**
```bash
# /etc/systemd/system/whatsapp-saas.service
[Service]
Environment="USE_AWS_SECRETS=true"
Environment="AWS_REGION=us-east-1"
Environment="NODE_ENV=production"
```

**Option C: Lambda**
```bash
aws lambda update-function-configuration \
  --function-name whatsapp-saas-api \
  --environment "Variables={USE_AWS_SECRETS=true,AWS_REGION=us-east-1}"
```

### Step 4: Verify Deployment

```bash
# Check health endpoint
curl https://your-api-domain.com/healthz | jq '.'

# Should show AWS secrets being used
{
  "status": "ok",
  "services": {
    "secrets": {
      "status": "healthy",
      "source": "aws",
      "secretsLoaded": 11
    }
  }
}
```

---

## Adding New Secrets

### Step 1: Update SECRET_CONFIG

Edit `Backend/src/config/secrets.js`:

```javascript
const SECRET_CONFIG = {
  // ... existing secrets ...

  // Add new secret
  NEW_SECRET_NAME: {
    awsSecretId: 'whatsapp-saas/mvp/new-secret-name',
    required: true,  // or false if optional
    default: null,   // optional default value
    description: 'Description of this secret'
  }
};
```

### Step 2: Create Secret in AWS

**Option A: Using AWS CLI**
```bash
aws secretsmanager create-secret \
  --name whatsapp-saas/mvp/new-secret-name \
  --description "Description of this secret" \
  --secret-string "your-secret-value" \
  --region us-east-1 \
  --tags Key=Project,Value=whatsapp-saas \
         Key=Environment,Value=mvp
```

**Option B: Using setup script**
```bash
# Add to setup-aws-secrets.sh
setup_new_secret() {
    log_info "Setting up NEW_SECRET_NAME..."
    NEW_SECRET=$(prompt_for_value "Enter NEW_SECRET_NAME" "default-value")

    create_or_update_secret \
        "${SECRET_PREFIX}/new-secret-name" \
        "${NEW_SECRET}" \
        "Description of this secret"
}

# Add to main()
setup_new_secret
```

### Step 3: Add to .env.example

```bash
# Add to .env.example
NEW_SECRET_NAME=your-secret-value
```

### Step 4: Update Documentation

Update this file (SECRETS_MANAGEMENT.md) with:
- Secret name
- AWS path
- Required/optional status
- Description

### Step 5: Test

```bash
# Local: Add to .env
echo "NEW_SECRET_NAME=test-value" >> .env

# Start application
npm run dev

# Verify secret is loaded
curl -H "x-admin-token: $ADMIN_TOKEN" \
  http://localhost:3000/admin/secrets/health | jq '.secrets'
```

---

## Secret Rotation

### ADMIN_TOKEN Rotation

The admin token should be rotated regularly (recommended: every 90 days).

**Automatic Rotation Script:**

```bash
./scripts/rotate-admin-token.sh
```

**What it does:**
1. Checks prerequisites (AWS CLI, openssl)
2. Verifies secret exists
3. Generates new secure token (64 characters)
4. Backs up old token to file
5. Updates secret in AWS Secrets Manager
6. Saves new token to file for admin use
7. Creates rotation log
8. Provides next steps for application refresh

**Example:**
```bash
$ ./scripts/rotate-admin-token.sh

╔════════════════════════════════════════════════════════════════╗
║       Admin Token Rotation Script                             ║
╚════════════════════════════════════════════════════════════════╝

[INFO] Current configuration:
  Secret: whatsapp-saas/mvp/admin-token
  Region: us-east-1
  Strategy: immediate

[WARNING] This will rotate the admin token and invalidate the old one
Continue with rotation? (yes/no): yes

[INFO] Starting immediate rotation...
[SUCCESS] Generated new admin token
[INFO] Backed up old token to: .admin-token-backup-20251017-143522.txt
[INFO] Updating secret in AWS Secrets Manager...
[SUCCESS] Secret updated successfully
[WARNING] New admin token saved to: .admin-token-new-20251017-143522.txt

[SUCCESS] Admin token has been rotated successfully

POST-ROTATION CHECKLIST:
  [ ] Update CI/CD pipelines with new token
  [ ] Update monitoring/alerting tools
  [ ] Verify application is using new token
  [ ] Delete backup token files securely
  [ ] Schedule next rotation (recommended: 90 days)
```

### Rollback Rotation

If rotation causes issues:

```bash
# Rollback to previous token
./scripts/rotate-admin-token.sh rollback

# Or manually
aws secretsmanager put-secret-value \
  --secret-id whatsapp-saas/mvp/admin-token \
  --secret-string "$(cat .admin-token-backup-TIMESTAMP.txt)" \
  --region us-east-1
```

### Manual Rotation (Other Secrets)

```bash
# Meta App Secret
aws secretsmanager put-secret-value \
  --secret-id whatsapp-saas/mvp/meta-app-secret \
  --secret-string "new-app-secret-value" \
  --region us-east-1

# OpenAI API Key
aws secretsmanager put-secret-value \
  --secret-id whatsapp-saas/mvp/openai-api-key \
  --secret-string "sk-new-api-key" \
  --region us-east-1
```

### Application Secret Refresh

After rotating secrets, refresh the application:

**Option 1: Call refresh endpoint**
```bash
curl -X POST https://your-api/admin/refresh-secrets \
  -H "x-admin-token: NEW_TOKEN"
```

**Option 2: Restart application**
```bash
# Docker
docker-compose restart backend

# ECS
aws ecs update-service \
  --cluster whatsapp-saas-mvp \
  --service whatsapp-saas-api \
  --force-new-deployment

# EC2
ssh user@server 'sudo systemctl restart whatsapp-saas'
```

### Rotation Schedule

| Secret | Frequency | Method |
|--------|-----------|--------|
| **ADMIN_TOKEN** | 90 days | `rotate-admin-token.sh` |
| **META_APP_SECRET** | When compromised | Manual |
| **META_VERIFY_TOKEN** | When compromised | Manual |
| **OPENAI_API_KEY** | When compromised | Manual |
| **DATABASE_URL** | Never (use RDS rotation) | - |
| **REDIS_URL** | Never (redeploy ElastiCache) | - |
| **WHATSAPP_ACCESS_TOKEN** | Per Meta's requirements | Manual |

---

## Emergency Access

### Scenario 1: Secrets Manager Unavailable

If AWS Secrets Manager is down, application continues with cached secrets (1-hour TTL).

**Short-term (< 1 hour):**
- Application continues normally using cache
- Monitor AWS status page

**Long-term (> 1 hour):**
1. Switch to environment variable mode:
   ```bash
   export USE_AWS_SECRETS=false
   export ADMIN_TOKEN=emergency-token
   # ... set other secrets ...

   # Restart application
   docker-compose restart backend
   ```

2. Once Secrets Manager is restored:
   ```bash
   export USE_AWS_SECRETS=true
   docker-compose restart backend
   ```

### Scenario 2: Lost Admin Token

**If token files are lost:**

1. Retrieve from AWS Secrets Manager:
   ```bash
   aws secretsmanager get-secret-value \
     --secret-id whatsapp-saas/mvp/admin-token \
     --region us-east-1 \
     --query 'SecretString' \
     --output text
   ```

2. If no AWS access:
   - Use root AWS account credentials
   - Contact AWS support
   - Check backup storage (encrypted backups)

### Scenario 3: IAM Role Lost Permissions

**Symptoms:**
```
Error: AccessDeniedException: User is not authorized to perform secretsmanager:GetSecretValue
```

**Solution:**
1. Check IAM role policies:
   ```bash
   aws iam get-role-policy \
     --role-name app-role \
     --policy-name secrets-read
   ```

2. Re-attach policy:
   ```bash
   aws iam attach-role-policy \
     --role-name app-role \
     --policy-arn arn:aws:iam::ACCOUNT:policy/secrets-read-only
   ```

3. Wait 5-10 minutes for propagation

### Scenario 4: Secret Rotation Went Wrong

**Symptoms:**
- Application can't authenticate
- 401 Unauthorized errors
- "Invalid token" errors

**Solution:**
1. Check rotation log:
   ```bash
   cat admin-token-rotation.log
   ```

2. Rollback to previous token:
   ```bash
   ./scripts/rotate-admin-token.sh rollback
   ```

3. Verify rollback:
   ```bash
   ./scripts/rotate-admin-token.sh verify
   ```

4. Test application:
   ```bash
   curl -H "x-admin-token: $(cat .admin-token-backup-*.txt)" \
     http://localhost:3000/admin/salons
   ```

### Emergency Contacts

In case of security incidents:

1. **Security Team:** security@yourcompany.com
2. **DevOps On-Call:** +1-XXX-XXX-XXXX
3. **AWS Support:** https://support.aws.amazon.com

### Break Glass Procedure

If you need emergency access without proper credentials:

1. Use AWS root account (requires MFA)
2. Create temporary IAM user with full Secrets Manager access
3. Retrieve all secrets
4. Update application with emergency credentials
5. After incident: Rotate all secrets, delete temporary user, audit access

---

## IAM Permissions

### Policy Overview

Three IAM policies are provided in `iam-policies/`:

1. **secrets-read-only-policy.json** - Application runtime
2. **secrets-cicd-policy.json** - CI/CD pipelines
3. **secrets-rotation-policy.json** - Rotation scripts

### Application Runtime (Read-Only)

**Policy:** `secrets-read-only-policy.json`

**Permissions:**
- ✅ Get secret values
- ✅ Describe secrets
- ❌ Create/update/delete secrets

**Attach to:**
- ECS task roles
- EC2 instance profiles
- Lambda execution roles

**Create and attach:**
```bash
# Create policy
aws iam create-policy \
  --policy-name whatsapp-saas-mvp-secrets-read-only \
  --policy-document file://iam-policies/secrets-read-only-policy.json

# Attach to ECS task role
aws iam attach-role-policy \
  --role-name ecs-task-role \
  --policy-arn arn:aws:iam::ACCOUNT:policy/whatsapp-saas-mvp-secrets-read-only
```

### CI/CD Pipeline (Full Access)

**Policy:** `secrets-cicd-policy.json`

**Permissions:**
- ✅ Full access to MVP secrets
- ✅ Create/update secrets
- ✅ List all secrets
- ❌ Delete production secrets

**Attach to:**
- GitHub Actions IAM user
- GitLab CI IAM role
- Jenkins IAM user

**Create and attach:**
```bash
# Create policy
aws iam create-policy \
  --policy-name whatsapp-saas-mvp-secrets-cicd \
  --policy-document file://iam-policies/secrets-cicd-policy.json

# Attach to CI/CD user
aws iam attach-user-policy \
  --user-name github-actions-user \
  --policy-arn arn:aws:iam::ACCOUNT:policy/whatsapp-saas-mvp-secrets-cicd
```

### Rotation Functions (Limited Write)

**Policy:** `secrets-rotation-policy.json`

**Permissions:**
- ✅ Rotate specific secrets (admin-token, meta-*)
- ✅ Invoke rotation Lambda functions
- ❌ Rotate database/Redis secrets

**Attach to:**
- Lambda rotation functions
- Admin users performing rotations

**Create and attach:**
```bash
# Create policy
aws iam create-policy \
  --policy-name whatsapp-saas-mvp-secrets-rotation \
  --policy-document file://iam-policies/secrets-rotation-policy.json

# Attach to Lambda role
aws iam attach-role-policy \
  --role-name rotation-lambda-role \
  --policy-arn arn:aws:iam::ACCOUNT:policy/whatsapp-saas-mvp-secrets-rotation
```

### Testing Permissions

Use IAM policy simulator:

```bash
# Test read access
aws iam simulate-principal-policy \
  --policy-source-arn arn:aws:iam::ACCOUNT:role/app-role \
  --action-names secretsmanager:GetSecretValue \
  --resource-arns "arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:whatsapp-saas/mvp/admin-token"

# Test write access
aws iam simulate-principal-policy \
  --policy-source-arn arn:aws:iam::ACCOUNT:user/cicd-user \
  --action-names secretsmanager:PutSecretValue \
  --resource-arns "arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:whatsapp-saas/mvp/admin-token"
```

---

## Monitoring

### Application Monitoring

**Health Check Endpoint:**
```bash
curl http://localhost:3000/healthz | jq '.services.secrets'
```

**Response:**
```json
{
  "status": "healthy",
  "initialized": true,
  "source": "aws",
  "secretsLoaded": 11,
  "requiredSecretsOk": true,
  "cacheAge": 1234567,
  "cacheExpired": false,
  "lastRefresh": "2025-10-17T10:30:00.000Z"
}
```

**Secrets Status Endpoint:**
```bash
curl -H "x-admin-token: $ADMIN_TOKEN" \
  http://localhost:3000/admin/secrets/health | jq '.'
```

**Response:**
```json
{
  "status": "healthy",
  "source": "AWS Secrets Manager",
  "region": "us-east-1",
  "totalSecrets": 11,
  "secrets": {
    "ADMIN_TOKEN": {
      "loaded": true,
      "required": true,
      "hasDefault": false
    },
    "DATABASE_URL": {
      "loaded": true,
      "required": true,
      "hasDefault": false
    }
    // ... other secrets ...
  }
}
```

### AWS CloudWatch Metrics

Monitor Secrets Manager usage:

```bash
# Get secret access count
aws cloudwatch get-metric-statistics \
  --namespace AWS/SecretsManager \
  --metric-name SecretAccessCount \
  --dimensions Name=SecretId,Value=whatsapp-saas/mvp/admin-token \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Sum
```

### CloudWatch Alarms

Set up alarms for:

1. **High error rate:**
   ```bash
   aws cloudwatch put-metric-alarm \
     --alarm-name secrets-access-errors \
     --alarm-description "Secrets Manager access errors" \
     --metric-name ErrorCount \
     --namespace AWS/SecretsManager \
     --statistic Sum \
     --period 300 \
     --threshold 10 \
     --comparison-operator GreaterThanThreshold \
     --evaluation-periods 2
   ```

2. **Unusual access patterns:**
   ```bash
   aws cloudwatch put-metric-alarm \
     --alarm-name secrets-unusual-access \
     --alarm-description "Unusual secrets access pattern" \
     --metric-name SecretAccessCount \
     --namespace AWS/SecretsManager \
     --statistic Sum \
     --period 3600 \
     --threshold 1000 \
     --comparison-operator GreaterThanThreshold \
     --evaluation-periods 1
   ```

### CloudTrail Logging

All Secrets Manager API calls are logged to CloudTrail:

```bash
# View recent secret accesses
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=GetSecretValue \
  --max-results 50 \
  --output json | jq '.Events[] | {
    Time: .EventTime,
    User: .Username,
    Secret: .Resources[0].ResourceName,
    IP: .SourceIPAddress
  }'
```

### Application Logs

The secrets module logs (without exposing values):

```bash
# View secrets initialization logs
docker-compose logs backend | grep "Secrets"

# Examples:
[INFO] Secrets Manager initialized with AWS Secrets Manager (region: us-east-1)
[INFO] Initializing secrets...
[INFO] Loading secrets from AWS Secrets Manager...
[INFO] Loaded 11 secrets from AWS Secrets Manager
[INFO] Secrets loaded successfully
```

---

## Troubleshooting

### Issue 1: Secrets Not Loading

**Symptoms:**
```
Error: Secrets initialization failed: Missing required secrets: ADMIN_TOKEN, DATABASE_URL
```

**Diagnosis:**
```bash
# Check if secrets exist
aws secretsmanager list-secrets \
  --query "SecretList[?contains(Name, 'whatsapp-saas/mvp')].Name" \
  --region us-east-1

# Test secret access
aws secretsmanager get-secret-value \
  --secret-id whatsapp-saas/mvp/admin-token \
  --region us-east-1
```

**Solutions:**

1. **Secrets don't exist:**
   ```bash
   ./scripts/setup-aws-secrets.sh
   ```

2. **Permission denied:**
   ```bash
   # Check IAM role
   aws sts get-caller-identity

   # Attach read policy
   aws iam attach-role-policy \
     --role-name app-role \
     --policy-arn arn:aws:iam::ACCOUNT:policy/secrets-read-only
   ```

3. **Wrong region:**
   ```bash
   export AWS_REGION=us-east-1
   docker-compose restart backend
   ```

### Issue 2: Cache Not Refreshing

**Symptoms:**
```
[WARN] Secret cache expired, triggering refresh...
[ERROR] Background secret refresh failed: AccessDeniedException
```

**Diagnosis:**
```bash
# Check application logs
docker-compose logs backend | grep "refresh"

# Check health endpoint
curl http://localhost:3000/healthz | jq '.services.secrets.cacheExpired'
```

**Solutions:**

1. **IAM permissions:**
   ```bash
   # Verify IAM policy includes secretsmanager:GetSecretValue
   aws iam get-role-policy --role-name app-role --policy-name secrets-read
   ```

2. **Force refresh:**
   ```bash
   curl -X POST -H "x-admin-token: $ADMIN_TOKEN" \
     http://localhost:3000/admin/refresh-secrets
   ```

3. **Restart application:**
   ```bash
   docker-compose restart backend
   ```

### Issue 3: AWS SDK Not Installed

**Symptoms:**
```
AWS SDK not installed. Run: npm install @aws-sdk/client-secrets-manager
```

**Solution:**
```bash
cd Backend
npm install @aws-sdk/client-secrets-manager
npm install  # Reinstall all dependencies
```

### Issue 4: Wrong Secret Path

**Symptoms:**
```
ResourceNotFoundException: Secrets Manager can't find the specified secret
```

**Diagnosis:**
```bash
# List all secrets
aws secretsmanager list-secrets --region us-east-1

# Check secret name in code
grep "awsSecretId" Backend/src/config/secrets.js
```

**Solution:**

Update `SECRET_CONFIG` in `Backend/src/config/secrets.js`:
```javascript
ADMIN_TOKEN: {
  awsSecretId: 'whatsapp-saas/mvp/admin-token',  // Must match AWS
  required: true
}
```

### Issue 5: Token Rotation Failed

**Symptoms:**
```
[ERROR] Failed to update secret: ValidationException
```

**Diagnosis:**
```bash
# Check secret exists
aws secretsmanager describe-secret \
  --secret-id whatsapp-saas/mvp/admin-token \
  --region us-east-1

# Check permissions
aws iam simulate-principal-policy \
  --policy-source-arn arn:aws:iam::ACCOUNT:role/current-role \
  --action-names secretsmanager:PutSecretValue \
  --resource-arns "arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:whatsapp-saas/mvp/admin-token"
```

**Solution:**

1. **Secret doesn't exist:**
   ```bash
   ./scripts/setup-aws-secrets.sh
   ```

2. **No write permission:**
   ```bash
   # Use IAM user with secrets-cicd policy
   aws iam attach-user-policy \
     --user-name admin-user \
     --policy-arn arn:aws:iam::ACCOUNT:policy/secrets-cicd
   ```

3. **Rollback and retry:**
   ```bash
   ./scripts/rotate-admin-token.sh rollback
   ./scripts/rotate-admin-token.sh
   ```

---

## Best Practices

### Security

1. **Never Log Secret Values**
   ```javascript
   // ❌ DON'T
   logger.info(`Admin token: ${secrets.get('ADMIN_TOKEN')}`);

   // ✅ DO
   logger.info('Admin token loaded successfully');
   ```

2. **Use IAM Roles, Not Access Keys**
   ```bash
   # ❌ DON'T: Store access keys in environment
   AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
   AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

   # ✅ DO: Use IAM role with EC2/ECS/Lambda
   # No credentials needed - automatically assumed
   ```

3. **Rotate Regularly**
   - Admin tokens: Every 90 days
   - API keys: When compromised
   - Review rotation logs quarterly

4. **Tag All Secrets**
   ```bash
   aws secretsmanager create-secret \
     --name whatsapp-saas/mvp/new-secret \
     --tags Key=Project,Value=whatsapp-saas \
            Key=Environment,Value=mvp \
            Key=Owner,Value=devops-team \
            Key=CostCenter,Value=engineering
   ```

5. **Enable CloudTrail**
   ```bash
   # Audit all secret accesses
   aws cloudtrail lookup-events \
     --lookup-attributes AttributeKey=EventName,AttributeValue=GetSecretValue
   ```

### Development

1. **Use `.env` for Local Development**
   - Never use AWS Secrets Manager locally
   - Keep `.env` out of version control
   - Use `.env.example` as template

2. **Test Secret Loading**
   ```bash
   # Test AWS secrets
   USE_AWS_SECRETS=true AWS_REGION=us-east-1 npm run dev

   # Test local secrets
   USE_AWS_SECRETS=false npm run dev
   ```

3. **Validate Required Secrets**
   ```javascript
   // Application won't start if required secrets are missing
   await secrets.initialize();  // Throws if missing required secrets
   ```

4. **Use Default Values**
   ```javascript
   // For optional configuration
   const timeout = secrets.get('TIMEOUT', '30000');
   ```

### Operations

1. **Monitor Secret Access**
   - Set up CloudWatch alarms
   - Review CloudTrail logs monthly
   - Alert on unusual access patterns

2. **Document Rotation Schedule**
   ```
   | Secret | Last Rotated | Next Rotation | Assigned To |
   |--------|--------------|---------------|-------------|
   | ADMIN_TOKEN | 2025-10-17 | 2026-01-15 | DevOps |
   ```

3. **Backup Rotation Files**
   ```bash
   # Encrypt and store backup tokens
   gpg --encrypt --recipient devops@company.com \
     .admin-token-backup-*.txt

   # Store in secure location (S3 with encryption)
   aws s3 cp backup.txt.gpg \
     s3://company-backups/secrets/ \
     --sse AES256
   ```

4. **Test Disaster Recovery**
   - Quarterly DR drills
   - Practice secret recovery
   - Verify backup procedures

### Compliance

1. **Access Auditing**
   - Enable CloudTrail
   - Enable AWS Config rules
   - Review access logs quarterly

2. **Encryption**
   - All secrets encrypted at rest (KMS)
   - TLS 1.2+ for transit
   - Rotate KMS keys annually

3. **Principle of Least Privilege**
   - Read-only for applications
   - Write access only for CI/CD
   - Admin access requires MFA

4. **Retention Policies**
   - Keep CloudTrail logs for 365 days
   - Keep secret versions for 30 days
   - Archive rotation logs for 7 years

---

## Summary

**Secrets Management Status:** ✅ Production Ready

**Key Components:**
- ✅ Dual-mode operation (local + AWS)
- ✅ In-memory caching with auto-refresh
- ✅ Zero-downtime rotation
- ✅ Comprehensive IAM policies
- ✅ Monitoring and alerting
- ✅ Emergency procedures

**Quick Reference:**

```bash
# Local Development
cp .env.example .env
# Update .env
docker-compose up -d

# AWS Production Setup
./scripts/setup-aws-secrets.sh

# Rotate Admin Token
./scripts/rotate-admin-token.sh

# Emergency Access
aws secretsmanager get-secret-value \
  --secret-id whatsapp-saas/mvp/admin-token

# Monitor
curl http://localhost:3000/admin/secrets/health
```

**Next Steps:**
1. Set up AWS secrets (if not done)
2. Configure IAM policies
3. Test secret rotation
4. Set up monitoring alerts
5. Schedule regular rotations

---

**Questions or Issues?**
- Check [Troubleshooting](#troubleshooting) section
- Review [Best Practices](#best-practices)
- Contact DevOps team: devops@yourcompany.com

**Last Updated:** 2025-10-17
**Version:** 1.0
