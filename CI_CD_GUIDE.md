# WhatsApp SaaS MVP - CI/CD Guide

**Version:** 1.0
**Last Updated:** 2025-10-18
**Status:** Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Quick Start](#quick-start)
4. [GitHub Actions Workflows](#github-actions-workflows)
5. [Test Pipeline](#test-pipeline)
6. [Build and Deploy Pipeline](#build-and-deploy-pipeline)
7. [Deployment Scripts](#deployment-scripts)
8. [Environment Configuration](#environment-configuration)
9. [Security Scanning](#security-scanning)
10. [Rollback Procedures](#rollback-procedures)
11. [Troubleshooting](#troubleshooting)
12. [Best Practices](#best-practices)

---

## Overview

This guide covers the complete CI/CD setup for the WhatsApp SaaS MVP platform using GitHub Actions, AWS ECS, and automated deployment pipelines.

### Pipeline Features

- ✅ **Automated Testing** - Unit, integration, and smoke tests
- ✅ **Code Quality** - Linting, formatting, security audits
- ✅ **Security Scanning** - Trivy and Snyk for Docker images
- ✅ **Blue-Green Deployment** - Zero-downtime production deployments
- ✅ **Automated Rollback** - Automatic rollback on deployment failures
- ✅ **Slack Notifications** - Real-time deployment status updates
- ✅ **Manual Approval** - Required approval for production deployments

### Environments

| Environment | Trigger | Approval | URL |
|-------------|---------|----------|-----|
| **Staging** | Automatic on `main` branch | None | `$STAGING_URL` |
| **Production** | Manual approval after staging | Required | `$PRODUCTION_URL` |

---

## Architecture

### CI/CD Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                         GitHub Repository                         │
│                                                                   │
│  Developer → Push/PR → main branch                               │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │     GitHub Actions Workflows          │
        │                                       │
        │  1. TEST PIPELINE (test.yml)         │
        │     - Lint & Format                  │
        │     - Unit Tests                     │
        │     - Integration Tests              │
        │     - Security Audit                 │
        │                                       │
        │  2. DEPLOY PIPELINE (deploy.yml)     │
        │     - Build Docker Image             │
        │     - Security Scan (Trivy/Snyk)     │
        │     - Push to ECR                    │
        │     - Deploy to Staging              │
        │     - Smoke Tests                    │
        │     - Performance Tests              │
        │     - [Manual Approval]              │
        │     - Deploy to Production           │
        │     - Blue-Green Deployment          │
        │     - Health Checks                  │
        │     - Rollback on Failure            │
        └───────────┬───────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌─────────────┐       ┌─────────────┐
│   Staging   │       │ Production  │
│             │       │             │
│ ECS Cluster │       │ ECS Cluster │
│   (Auto)    │       │  (Manual)   │
└─────────────┘       └─────────────┘
```

### Deployment Strategy

**Staging:** Standard rolling deployment
**Production:** Blue-Green deployment with health checks

```
Blue-Green Deployment Flow:

OLD (BLUE)              NEW (GREEN)
┌──────────┐            ┌──────────┐
│  Task 1  │            │          │
│  Task 2  │  ───────>  │  Task 1' │
│  Task 3  │            │  Task 2' │
│          │            │  Task 3' │
└──────────┘            └──────────┘
    ↓                        ↓
Running 100%           Start new tasks
                            ↓
                       Health checks pass
                            ↓
                       Switch traffic
                            ↓
                       Drain old tasks
                            ↓
                       Stop old tasks
```

---

## Quick Start

### Prerequisites

1. **GitHub Repository** with admin access
2. **AWS Account** with ECS, ECR configured
3. **Slack Workspace** (optional, for notifications)
4. **Required Secrets** configured in GitHub

### 1. Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

**Required Secrets:**

```bash
# AWS Configuration
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
ECR_REGISTRY=123456789.dkr.ecr.us-east-1.amazonaws.com

# ECS Configuration - Staging
STAGING_ECS_CLUSTER=whatsapp-saas-staging-cluster
STAGING_ECS_SERVICE=whatsapp-saas-staging-service
STAGING_TASK_DEFINITION=whatsapp-saas-staging
STAGING_URL=https://staging.example.com
STAGING_ADMIN_TOKEN=...

# ECS Configuration - Production
PRODUCTION_ECS_CLUSTER=whatsapp-saas-production-cluster
PRODUCTION_ECS_SERVICE=whatsapp-saas-production-service
PRODUCTION_TASK_DEFINITION=whatsapp-saas-production
PRODUCTION_URL=https://api.example.com
PRODUCTION_ADMIN_TOKEN=...

# Slack Notifications (optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# Security Scanning
SNYK_TOKEN=...  # Get from https://snyk.io
CODECOV_TOKEN=...  # Get from https://codecov.io
```

### 2. Enable GitHub Actions

Create the workflow files:

```bash
# Already created in this project:
.github/workflows/test.yml
.github/workflows/deploy-production.yml
```

### 3. Make Scripts Executable

```bash
chmod +x scripts/deploy-staging.sh
chmod +x scripts/deploy-production.sh
chmod +x scripts/smoke-tests.sh
chmod +x scripts/rollback.sh
```

### 4. Test the Pipeline

```bash
# Create a test branch
git checkout -b test-ci-cd

# Make a small change
echo "# CI/CD Test" >> README.md

# Commit and push
git add .
git commit -m "test: CI/CD pipeline"
git push origin test-ci-cd

# Create pull request
gh pr create --title "Test CI/CD" --body "Testing CI/CD pipeline"
```

---

## GitHub Actions Workflows

### Workflow 1: Test Pipeline (`test.yml`)

**Triggers:**
- Every push to any branch
- Every pull request to `main` or `develop`

**Jobs:**

1. **lint-and-format** (10 min)
   - ESLint check
   - Prettier check
   - Console.log detection

2. **type-check** (10 min) - Disabled until TypeScript implemented
   - TypeScript type checking

3. **unit-tests** (15 min)
   - Run unit tests with coverage
   - Upload coverage to Codecov
   - PostgreSQL + Redis test services

4. **integration-tests** (20 min)
   - Run integration tests
   - Full database + Redis setup
   - Seed test data

5. **security-audit** (10 min)
   - npm audit for vulnerabilities
   - Check for critical/high vulnerabilities

6. **dependency-review** (5 min) - PRs only
   - Review dependency changes
   - Check licenses

7. **code-quality** (10 min) - PRs only
   - Code complexity analysis
   - Duplication detection

8. **test-summary** (Required for branch protection)
   - Summarize all test results
   - Post comment on PR

**Usage:**

```bash
# Runs automatically on push
git push origin feature-branch

# Runs automatically on PR
gh pr create --title "New Feature"
```

### Workflow 2: Deploy to Production (`deploy-production.yml`)

**Triggers:**
- Push to `main` branch (automatic staging deployment)
- Manual workflow dispatch (choose environment)

**Jobs:**

1. **build-and-test** (20 min)
   - Install dependencies
   - Run linting
   - Run tests

2. **build-image** (30 min)
   - Build Docker image
   - Tag with git SHA + latest
   - Push to Amazon ECR

3. **security-scan** (15 min)
   - Trivy vulnerability scan
   - Snyk Docker scan
   - Upload results to GitHub Security

4. **deploy-staging** (15 min) - Auto
   - Deploy to staging ECS
   - Wait for service stabilization

5. **smoke-tests** (10 min)
   - Run smoke tests on staging
   - Verify health endpoints
   - Check API functionality

6. **performance-tests** (15 min)
   - Apache Bench load tests
   - Response time validation

7. **deploy-production** (20 min) - **Manual Approval Required**
   - Blue-green deployment
   - Health checks
   - Automatic rollback on failure
   - Slack notifications

8. **post-deployment** (10 min)
   - Production smoke tests
   - Verify all endpoints
   - Check CloudWatch metrics

**Usage:**

```bash
# Automatic staging deployment on main branch merge
git checkout main
git merge feature-branch
git push origin main

# Manual production deployment
# Go to Actions → Deploy to Production → Run workflow → Select "production"
```

---

## Test Pipeline

### Running Tests Locally

Before pushing code, run tests locally:

```bash
# Start test services
docker-compose up -d postgres redis

# Run unit tests
cd Backend
npm test

# Run tests with coverage
npm test -- --coverage

# Run integration tests
npm run test:integration

# Run linting
npm run lint

# Run prettier
npx prettier --check "src/**/*.{js,json}"
```

### Test Coverage Requirements

| Metric | Target | Current |
|--------|--------|---------|
| Statements | > 80% | TBD |
| Branches | > 70% | TBD |
| Functions | > 80% | TBD |
| Lines | > 80% | TBD |

### Viewing Coverage Reports

**Locally:**
```bash
npm test -- --coverage
open coverage/lcov-report/index.html
```

**Codecov Dashboard:**
```
https://codecov.io/gh/YOUR_USERNAME/whatsapp-saas-starter
```

**GitHub Actions Artifacts:**
```
Actions → Test Pipeline → Latest run → Artifacts → coverage-report
```

---

## Build and Deploy Pipeline

### Build Stage

**Dockerfile Optimization:**

```dockerfile
# Multi-stage build for smaller images
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app .
USER node
CMD ["node", "src/server.js"]
```

**Image Tagging Strategy:**

```
ECR_REGISTRY/whatsapp-saas-mvp:main-abc123   # Git SHA
ECR_REGISTRY/whatsapp-saas-mvp:latest        # Latest on main
ECR_REGISTRY/whatsapp-saas-mvp:20251018-123456  # Timestamp
```

### Security Scanning

#### Trivy Scanner

Scans for:
- OS package vulnerabilities
- Application dependency vulnerabilities
- Misconfigurations
- Secrets in image layers

**Example Output:**
```
┌─────────────────────────────────────┬──────────────┬──────────┐
│             Library                  │ Vulnerability│ Severity │
├─────────────────────────────────────┼──────────────┼──────────┤
│ openssl                             │ CVE-2023-xxx │ CRITICAL │
│ node                                │ CVE-2023-yyy │ HIGH     │
└─────────────────────────────────────┴──────────────┴──────────┘
```

#### Snyk Scanner

Scans for:
- Known vulnerabilities in dependencies
- License compliance issues
- Docker image vulnerabilities
- Base image recommendations

**Configuration:**

```yaml
# .snyk file
version: v1.19.0
ignore:
  SNYK-JS-DOTENV-123456:
    - '*':
        reason: False positive
        expires: 2025-12-31
```

### Staging Deployment

**Process:**

1. Build Docker image
2. Push to ECR
3. Update ECS task definition
4. Deploy to staging ECS service
5. Wait for service stabilization
6. Run smoke tests
7. Run performance tests

**Staging Environment:**

```bash
# View staging logs
aws ecs execute-command \
  --cluster whatsapp-saas-staging-cluster \
  --task TASK_ID \
  --container whatsapp-saas-mvp \
  --command "/bin/sh" \
  --interactive

# View service status
aws ecs describe-services \
  --cluster whatsapp-saas-staging-cluster \
  --services whatsapp-saas-staging-service
```

### Production Deployment

**Blue-Green Strategy:**

```bash
# 1. Create new task definition (GREEN)
NEW_TASK_DEF=$(aws ecs register-task-definition \
  --cli-input-json file://new-task-def.json \
  --query 'taskDefinition.taskDefinitionArn' \
  --output text)

# 2. Update service (triggers blue-green)
aws ecs update-service \
  --cluster production-cluster \
  --service production-service \
  --task-definition $NEW_TASK_DEF \
  --deployment-configuration \
    minimumHealthyPercent=100,maximumPercent=200

# 3. Monitor deployment
aws ecs wait services-stable \
  --cluster production-cluster \
  --services production-service

# 4. Verify health
curl https://api.example.com/healthz
```

**Deployment Configuration:**

| Parameter | Value | Purpose |
|-----------|-------|---------|
| minimumHealthyPercent | 100 | Maintain full capacity during deployment |
| maximumPercent | 200 | Allow double capacity temporarily |
| healthCheckGracePeriod | 60s | Time before health checks start |

---

## Deployment Scripts

### deploy-staging.sh

**Purpose:** Deploy to staging environment with standard rolling deployment

**Usage:**
```bash
export AWS_REGION=us-east-1
export ECS_CLUSTER=whatsapp-saas-staging-cluster
export ECS_SERVICE=whatsapp-saas-staging-service
export TASK_DEFINITION=whatsapp-saas-staging
export IMAGE_TAG=main-abc123
export ECR_REGISTRY=123456789.dkr.ecr.us-east-1.amazonaws.com

./scripts/deploy-staging.sh
```

**Features:**
- ✅ AWS credentials verification
- ✅ ECS cluster validation
- ✅ Task definition backup
- ✅ Image update
- ✅ Service update
- ✅ Deployment monitoring
- ✅ Success/failure reporting

**Output:**
```
[INFO] Starting deployment to staging environment...
[INFO] Cluster: whatsapp-saas-staging-cluster
[INFO] Service: whatsapp-saas-staging-service
[INFO] Image: 123456789.dkr.ecr.us-east-1.amazonaws.com/whatsapp-saas-mvp:main-abc123

[STEP] Verifying AWS credentials...
[SUCCESS] AWS credentials verified (Account: 123456789)

[STEP] Verifying ECS cluster: whatsapp-saas-staging-cluster...
[SUCCESS] ECS cluster verified

[STEP] Retrieving current task definition...
[SUCCESS] Current task definition: arn:aws:ecs:...:task-definition/whatsapp-saas-staging:42

[STEP] Creating new task definition with image: ...
[SUCCESS] New task definition registered: arn:aws:ecs:...:task-definition/whatsapp-saas-staging:43

[STEP] Updating ECS service: whatsapp-saas-staging-service...
[SUCCESS] ECS service updated

[STEP] Monitoring deployment progress...
[INFO] Running tasks: 3/3
[INFO] Active deployments: 1
[SUCCESS] Deployment completed successfully!

[SUCCESS] Deployment to staging completed successfully!
```

### deploy-production.sh

**Purpose:** Deploy to production using blue-green strategy with zero downtime

**Usage:**
```bash
export AWS_REGION=us-east-1
export ECS_CLUSTER=whatsapp-saas-production-cluster
export ECS_SERVICE=whatsapp-saas-production-service
export TASK_DEFINITION=whatsapp-saas-production
export IMAGE_TAG=main-abc123
export ECR_REGISTRY=123456789.dkr.ecr.us-east-1.amazonaws.com
export ENVIRONMENT=production

./scripts/deploy-production.sh
```

**Features:**
- ✅ Pre-deployment safety checks
- ✅ Maintenance window verification
- ✅ Blue-green deployment strategy
- ✅ Deployment record creation
- ✅ Health check verification
- ✅ Automatic rollback on failure
- ✅ Post-deployment tasks
- ✅ Service tagging

**Safety Features:**

1. **Pre-deployment Checks:**
   - Environment validation
   - Image tag validation (no "latest")
   - Maintenance window warning
   - Interactive confirmation (non-CI)

2. **Deployment Protection:**
   - Minimum healthy percent: 100%
   - Maximum percent: 200%
   - Health check grace period: 60s

3. **Automatic Rollback:**
   - Triggered on deployment timeout
   - Triggered on health check failure
   - Reverts to previous task definition

### smoke-tests.sh

**Purpose:** Verify deployment by testing critical functionality

**Usage:**
```bash
# Test staging
./scripts/smoke-tests.sh https://staging.example.com

# Test production with admin token
export ADMIN_TOKEN=your-admin-token
./scripts/smoke-tests.sh https://api.example.com
```

**Test Suites:**

1. **Basic Connectivity** (3 tests)
   - DNS resolution
   - TCP connectivity
   - SSL certificate validation

2. **Health Endpoints** (2 tests)
   - GET /healthz
   - GET /api/health

3. **API Endpoints** (4 tests)
   - Webhook endpoint validation
   - Admin authentication
   - 404 handling
   - Authenticated admin access

4. **Security** (5 tests)
   - X-Frame-Options header
   - X-Content-Type-Options header
   - HSTS header
   - CORS configuration
   - Rate limiting detection

5. **Performance** (2 tests)
   - Response time measurement
   - Concurrent request handling

**Output:**
```
[INFO] Starting smoke tests...
[INFO] Target: https://staging.example.com
[INFO] Timeout: 10s per request

[TEST] Testing basic connectivity...
[✓] DNS resolution successful for staging.example.com
[✓] TCP connection successful to staging.example.com:443
[✓] SSL certificate valid

[TEST] Testing health endpoints...
[✓] Health endpoint returned valid JSON
[✓] Health status is OK

[TEST] Testing API endpoints...
[✓] Webhook endpoint responds to invalid requests with 400
[✓] Admin endpoints properly require authentication

[TEST] Testing security headers and configurations...
[✓] X-Frame-Options header present
[✓] X-Content-Type-Options header present
[!] HSTS header missing (recommended for HTTPS)
[✓] CORS configured with restrictions
[!] No rate limiting detected (may not be implemented yet)

[TEST] Testing basic performance...
[INFO] Average response time: 245ms (5 requests)
[✓] Response time excellent (< 500ms)
[✓] Concurrent request handling is good

==========================================
Smoke Test Summary
==========================================

Target:    https://staging.example.com
Total:     18 tests
Passed:    16
Failed:    0
Warnings:  2

✓ All critical tests passed
! 2 warnings - review recommended

==========================================
```

### rollback.sh

**Purpose:** Rollback ECS service to previous or specific task definition

**Usage:**
```bash
# Rollback to previous version
./scripts/rollback.sh my-cluster my-service

# Rollback to specific task definition
./scripts/rollback.sh my-cluster my-service arn:aws:ecs:...:task-definition/my-task:42
```

**Features:**
- ✅ Current state inspection
- ✅ Automatic previous version detection
- ✅ Rollback confirmation (interactive)
- ✅ Deployment monitoring
- ✅ Health verification
- ✅ Rollback record creation

**Example:**
```bash
./scripts/rollback.sh \
  whatsapp-saas-production-cluster \
  whatsapp-saas-production-service
```

**Output:**
```
[STEP] Starting rollback procedure...
[INFO] Cluster: whatsapp-saas-production-cluster
[INFO] Service: whatsapp-saas-production-service

[STEP] Getting current service state...
[INFO] Current task definition: arn:aws:ecs:...:task-definition/whatsapp-saas-production:45
[INFO] Current running tasks: 3/3

[STEP] Determining rollback target...
[INFO] Task family: whatsapp-saas-production
[INFO] Current revision: 45
[SUCCESS] Found previous task definition: arn:aws:ecs:...:task-definition/whatsapp-saas-production:44

[STEP] Rollback confirmation required

==========================================
ROLLBACK DETAILS
==========================================

Cluster:  whatsapp-saas-production-cluster
Service:  whatsapp-saas-production-service

Current:  arn:aws:ecs:...:task-definition/whatsapp-saas-production:45
          Image: 123456789.dkr.ecr.us-east-1.amazonaws.com/whatsapp-saas-mvp:main-abc123

Target:   arn:aws:ecs:...:task-definition/whatsapp-saas-production:44
          Image: 123456789.dkr.ecr.us-east-1.amazonaws.com/whatsapp-saas-mvp:main-def456

==========================================

Do you want to proceed with rollback? (yes/no): yes

[STEP] Executing rollback...
[INFO] Rollback record created: /tmp/rollback-20251018-123456.json
[INFO] Updating ECS service...
[SUCCESS] ECS service update initiated

[STEP] Monitoring rollback progress...
[INFO] Status: Running=3/3, Pending=0, Deployments=1
[SUCCESS] Rollback deployment completed!

[STEP] Verifying rollback...
[SUCCESS] Service is now running rollback task definition
[SUCCESS] All tasks are running (3/3)
[INFO] Healthy tasks: 3/3
[SUCCESS] All tasks are healthy

[SUCCESS] Rollback completed successfully! ✅

==========================================
ROLLBACK SUMMARY
==========================================

Cluster:       whatsapp-saas-production-cluster
Service:       whatsapp-saas-production-service

Previous:      arn:aws:ecs:...:task-definition/whatsapp-saas-production:45
Rolled back to: arn:aws:ecs:...:task-definition/whatsapp-saas-production:44
Image:         123456789.dkr.ecr.us-east-1.amazonaws.com/whatsapp-saas-mvp:main-def456

Rollback ID:   rollback-20251018-123456
Record:        /tmp/rollback-20251018-123456.json

==========================================
```

---

## Environment Configuration

### GitHub Actions Environments

**Configure in:** GitHub Repository → Settings → Environments

#### Staging Environment

**Name:** `staging`

**Protection rules:**
- ❌ Required reviewers: None (auto-deploy)
- ✅ Wait timer: 0 minutes
- ✅ Deployment branches: `main` only

**Environment secrets:**
```
STAGING_URL=https://staging.example.com
STAGING_ADMIN_TOKEN=...
STAGING_ECS_CLUSTER=whatsapp-saas-staging-cluster
STAGING_ECS_SERVICE=whatsapp-saas-staging-service
STAGING_TASK_DEFINITION=whatsapp-saas-staging
```

#### Production Environment

**Name:** `production`

**Protection rules:**
- ✅ Required reviewers: 1-2 reviewers (DevOps team)
- ✅ Wait timer: 0 minutes (or 5 minutes for safety)
- ✅ Deployment branches: `main` only

**Environment secrets:**
```
PRODUCTION_URL=https://api.example.com
PRODUCTION_ADMIN_TOKEN=...
PRODUCTION_ECS_CLUSTER=whatsapp-saas-production-cluster
PRODUCTION_ECS_SERVICE=whatsapp-saas-production-service
PRODUCTION_TASK_DEFINITION=whatsapp-saas-production
```

### AWS IAM Permissions

**Required permissions for GitHub Actions:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ECRAccess",
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload"
      ],
      "Resource": "*"
    },
    {
      "Sid": "ECSAccess",
      "Effect": "Allow",
      "Action": [
        "ecs:DescribeClusters",
        "ecs:DescribeServices",
        "ecs:DescribeTaskDefinition",
        "ecs:RegisterTaskDefinition",
        "ecs:UpdateService",
        "ecs:ListTasks",
        "ecs:DescribeTasks"
      ],
      "Resource": "*"
    },
    {
      "Sid": "IAMPassRole",
      "Effect": "Allow",
      "Action": "iam:PassRole",
      "Resource": [
        "arn:aws:iam::ACCOUNT_ID:role/ecsTaskExecutionRole",
        "arn:aws:iam::ACCOUNT_ID:role/ecsTaskRole"
      ]
    }
  ]
}
```

---

## Security Scanning

### Trivy Configuration

**Scan Levels:**
- CRITICAL: Always fail
- HIGH: Always fail
- MEDIUM: Warn only
- LOW: Ignore

**GitHub Security Integration:**

Trivy results are automatically uploaded to:
```
GitHub → Security → Code scanning alerts
```

**Manual Scan:**
```bash
# Install Trivy
brew install aquasecurity/trivy/trivy

# Scan local image
trivy image whatsapp-saas-mvp:latest

# Scan with severity filter
trivy image --severity CRITICAL,HIGH whatsapp-saas-mvp:latest

# Generate SARIF report
trivy image --format sarif --output trivy-results.sarif whatsapp-saas-mvp:latest
```

### Snyk Configuration

**Sign up:** https://snyk.io

**Get API token:**
```
Snyk Dashboard → Settings → API Token → Generate
```

**Configure in GitHub:**
```
Repository → Settings → Secrets → SNYK_TOKEN
```

**Manual Scan:**
```bash
# Install Snyk CLI
npm install -g snyk

# Authenticate
snyk auth

# Test Docker image
snyk container test whatsapp-saas-mvp:latest

# Test with severity threshold
snyk container test whatsapp-saas-mvp:latest --severity-threshold=high

# Monitor image in Snyk dashboard
snyk container monitor whatsapp-saas-mvp:latest
```

### Handling Vulnerabilities

**Workflow:**

1. **Critical/High Severity:**
   ```bash
   # Fix immediately
   npm audit fix

   # Or update specific package
   npm update package-name

   # Rebuild and redeploy
   git commit -am "fix: Update vulnerable dependency"
   git push
   ```

2. **Medium Severity:**
   ```bash
   # Schedule for next sprint
   # Document in security backlog
   # Create GitHub issue
   ```

3. **False Positives:**
   ```yaml
   # Add to .snyk file
   ignore:
     SNYK-JS-PACKAGE-123456:
       - '*':
           reason: False positive - not used in production
           expires: 2025-12-31
   ```

---

## Rollback Procedures

### Automatic Rollback

**Triggers:**
- Deployment timeout (> 15 minutes)
- Health check failure
- Smoke test failure

**Process:**
```
1. Deployment fails
2. GitHub Actions detects failure
3. Calls rollback script automatically
4. Reverts to previous task definition
5. Waits for service stabilization
6. Sends Slack notification
```

### Manual Rollback

**Scenario 1: Immediate Rollback (Last Deployment)**

```bash
# Using rollback script
./scripts/rollback.sh \
  whatsapp-saas-production-cluster \
  whatsapp-saas-production-service
```

**Scenario 2: Rollback to Specific Version**

```bash
# Find desired task definition
aws ecs list-task-definitions \
  --family-prefix whatsapp-saas-production \
  --sort DESC

# Rollback to specific version
./scripts/rollback.sh \
  whatsapp-saas-production-cluster \
  whatsapp-saas-production-service \
  arn:aws:ecs:...:task-definition/whatsapp-saas-production:42
```

**Scenario 3: Emergency Rollback via AWS Console**

```
1. Go to ECS Console
2. Select cluster → service
3. Click "Update service"
4. Select previous task definition revision
5. Click "Skip to review"
6. Click "Update service"
```

**Scenario 4: Rollback via AWS CLI**

```bash
# Get previous task definition
PREVIOUS_TASK=$(aws ecs describe-services \
  --cluster whatsapp-saas-production-cluster \
  --services whatsapp-saas-production-service \
  --query 'services[0].taskDefinition' \
  --output text | awk -F: '{print $NF-1}')

TASK_FAMILY=$(aws ecs describe-services \
  --cluster whatsapp-saas-production-cluster \
  --services whatsapp-saas-production-service \
  --query 'services[0].taskDefinition' \
  --output text | awk -F/ '{print $NF}' | awk -F: '{print $1}')

# Rollback
aws ecs update-service \
  --cluster whatsapp-saas-production-cluster \
  --service whatsapp-saas-production-service \
  --task-definition "${TASK_FAMILY}:${PREVIOUS_TASK}" \
  --force-new-deployment
```

### Post-Rollback Actions

1. **Notify Team:**
   ```
   - Slack notification (automatic)
   - Email to DevOps team
   - Update incident ticket
   ```

2. **Investigate Root Cause:**
   ```bash
   # Check application logs
   aws logs tail /aws/ecs/whatsapp-saas-production --follow

   # Check deployment events
   aws ecs describe-services \
     --cluster whatsapp-saas-production-cluster \
     --services whatsapp-saas-production-service \
     --query 'services[0].events[0:10]'

   # Check CloudWatch alarms
   aws cloudwatch describe-alarm-history \
     --alarm-name whatsapp-saas-mvp-app-error-rate-high \
     --start-date $(date -d '1 hour ago' +%Y-%m-%dT%H:%M:%S)
   ```

3. **Document Incident:**
   ```markdown
   ## Incident Report: Production Rollback

   **Date:** 2025-10-18 14:30 UTC
   **Duration:** 15 minutes
   **Impact:** No user impact (rolled back before traffic switch)

   **Timeline:**
   - 14:15 - Deployment started (v1.2.3)
   - 14:25 - Health checks failing
   - 14:27 - Automatic rollback initiated
   - 14:30 - Rollback completed (v1.2.2)

   **Root Cause:**
   - Database migration failed due to...

   **Action Items:**
   - [ ] Fix database migration script
   - [ ] Add migration tests to CI/CD
   - [ ] Update deployment checklist
   ```

---

## Troubleshooting

### Common Issues

#### 1. Workflow Not Triggering

**Symptoms:**
- Push to main but no workflow run
- PR created but no checks running

**Solutions:**

```bash
# Check workflow file syntax
yamllint .github/workflows/*.yml

# Check GitHub Actions are enabled
# Repository → Settings → Actions → General → "Allow all actions"

# Check branch protection rules
# Repository → Settings → Branches → main → Edit

# Manually trigger workflow
gh workflow run deploy-production.yml

# Check workflow runs
gh run list --workflow=deploy-production.yml
```

#### 2. AWS Authentication Failed

**Symptoms:**
```
Error: Unable to locate credentials
Error: An error occurred (UnrecognizedClientException)
```

**Solutions:**

```bash
# Verify secrets are set
gh secret list

# Test AWS credentials locally
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
aws sts get-caller-identity

# Check IAM permissions
aws iam simulate-principal-policy \
  --policy-source-arn arn:aws:iam::ACCOUNT:user/github-actions \
  --action-names ecs:UpdateService ecr:GetAuthorizationToken \
  --resource-arns "*"

# Rotate credentials
aws iam create-access-key --user-name github-actions
# Update GitHub secrets
```

#### 3. Docker Build Failed

**Symptoms:**
```
Error: failed to solve: process "/bin/sh -c npm ci" did not complete successfully
```

**Solutions:**

```bash
# Test build locally
cd Backend
docker build -t whatsapp-saas-mvp:test .

# Check Dockerfile syntax
docker build --no-cache -t whatsapp-saas-mvp:test .

# View build logs
docker build --progress=plain -t whatsapp-saas-mvp:test .

# Check package.json dependencies
npm ci --verbose

# Clear Docker cache
docker builder prune -a
```

#### 4. ECR Push Failed

**Symptoms:**
```
Error: denied: User is not authorized to perform ecr:PutImage
Error: manifest blob unknown: blob unknown to registry
```

**Solutions:**

```bash
# Test ECR login
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  123456789.dkr.ecr.us-east-1.amazonaws.com

# Check ECR repository exists
aws ecr describe-repositories --repository-names whatsapp-saas-mvp

# Create repository if missing
aws ecr create-repository --repository-name whatsapp-saas-mvp

# Check IAM permissions
aws ecr get-repository-policy --repository-name whatsapp-saas-mvp

# Set repository policy
aws ecr set-repository-policy \
  --repository-name whatsapp-saas-mvp \
  --policy-text file://ecr-policy.json
```

#### 5. ECS Deployment Stuck

**Symptoms:**
- Deployment running for > 30 minutes
- Tasks stuck in PENDING state
- Service not reaching desired count

**Solutions:**

```bash
# Check service events
aws ecs describe-services \
  --cluster whatsapp-saas-production-cluster \
  --services whatsapp-saas-production-service \
  --query 'services[0].events[0:20]'

# Check task failures
aws ecs describe-tasks \
  --cluster whatsapp-saas-production-cluster \
  --tasks $(aws ecs list-tasks \
    --cluster whatsapp-saas-production-cluster \
    --service-name whatsapp-saas-production-service \
    --query 'taskArns[0]' \
    --output text)

# Common issues:
# - Insufficient CPU/memory in cluster
# - Task definition errors
# - IAM role issues
# - Secrets not available

# Force new deployment
aws ecs update-service \
  --cluster whatsapp-saas-production-cluster \
  --service whatsapp-saas-production-service \
  --force-new-deployment

# Scale up cluster if needed
aws ecs update-service \
  --cluster whatsapp-saas-production-cluster \
  --service whatsapp-saas-production-service \
  --desired-count 5
```

#### 6. Health Checks Failing

**Symptoms:**
```
Task failed container health checks
Health check endpoint returning 503
```

**Solutions:**

```bash
# Test health endpoint
curl -v https://api.example.com/healthz

# Check application logs
aws logs tail /aws/ecs/whatsapp-saas-production --follow

# Check task definition health check
aws ecs describe-task-definition \
  --task-definition whatsapp-saas-production:latest \
  --query 'taskDefinition.containerDefinitions[0].healthCheck'

# Update health check parameters
{
  "healthCheck": {
    "command": ["CMD-SHELL", "curl -f http://localhost:3000/healthz || exit 1"],
    "interval": 30,
    "timeout": 5,
    "retries": 3,
    "startPeriod": 60
  }
}

# Increase health check grace period
aws ecs update-service \
  --cluster whatsapp-saas-production-cluster \
  --service whatsapp-saas-production-service \
  --health-check-grace-period-seconds 120
```

#### 7. Smoke Tests Failing

**Symptoms:**
```
[✗] Health endpoint check failed
[✗] Admin authentication failed
```

**Solutions:**

```bash
# Run smoke tests manually
./scripts/smoke-tests.sh https://staging.example.com

# Test specific endpoint
curl -v https://staging.example.com/healthz

# Check admin token
export ADMIN_TOKEN=your-token
curl -H "x-admin-token: $ADMIN_TOKEN" \
  https://staging.example.com/admin/health

# Check application logs
aws logs tail /aws/ecs/whatsapp-saas-staging --follow --filter-pattern "ERROR"

# Verify environment variables
aws ecs describe-task-definition \
  --task-definition whatsapp-saas-staging:latest \
  --query 'taskDefinition.containerDefinitions[0].environment'
```

#### 8. Slack Notifications Not Working

**Symptoms:**
- No Slack messages on deployment
- Webhook errors in logs

**Solutions:**

```bash
# Test Slack webhook
curl -X POST \
  -H 'Content-type: application/json' \
  --data '{"text":"Test message from CI/CD"}' \
  https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Verify secret is set
gh secret list | grep SLACK

# Check Slack webhook URL format
# Should be: https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX

# Update webhook if expired
# Slack → Apps → Incoming Webhooks → Add New Webhook to Workspace

# Update GitHub secret
gh secret set SLACK_WEBHOOK_URL < slack-webhook.txt
```

---

## Best Practices

### Development Workflow

**Feature Branch Strategy:**

```bash
# 1. Create feature branch from main
git checkout main
git pull origin main
git checkout -b feature/new-feature

# 2. Make changes and commit
git add .
git commit -m "feat: Add new feature"

# 3. Push and create PR
git push origin feature/new-feature
gh pr create --title "Add new feature" --body "Description"

# 4. CI/CD runs tests automatically
# 5. Review and merge PR
# 6. Staging deployment automatic on main merge
# 7. Production deployment requires manual approval
```

**Commit Message Convention:**

```
feat: Add new feature
fix: Fix bug in authentication
docs: Update README
refactor: Refactor user service
test: Add integration tests
chore: Update dependencies
ci: Update GitHub Actions workflow
```

### Testing

**Test Pyramid:**

```
        /\
       /  \        E2E Tests (10%)
      /____\
     /      \      Integration Tests (20%)
    /________\
   /          \    Unit Tests (70%)
  /____________\
```

**Before Merging:**

- ✅ All tests passing
- ✅ Code coverage > 80%
- ✅ No linting errors
- ✅ No security vulnerabilities
- ✅ PR approved by reviewer

### Deployment

**Deployment Checklist:**

- [ ] All tests passing in CI
- [ ] Security scans passed
- [ ] Staging deployment successful
- [ ] Smoke tests passed on staging
- [ ] Performance tests acceptable
- [ ] Database migrations tested
- [ ] Rollback plan documented
- [ ] Team notified of deployment
- [ ] Production approval obtained
- [ ] Monitoring dashboard ready

**Deployment Windows:**

| Day | Recommended | Avoid |
|-----|-------------|-------|
| Monday | ✅ 10:00-16:00 | Before 09:00 |
| Tuesday-Thursday | ✅ 09:00-17:00 | After 18:00 |
| Friday | ⚠️  10:00-14:00 | After 15:00 |
| Weekend | ❌ Avoid | All times |

**Emergency Deployments:**

```bash
# Create hotfix branch from main
git checkout main
git checkout -b hotfix/critical-bug

# Fix the bug
git commit -am "fix: Critical security vulnerability"

# Fast-track through CI/CD
git push origin hotfix/critical-bug

# Create PR with "URGENT" label
gh pr create --title "[URGENT] Fix critical bug" --label urgent

# Merge immediately after approval
# Deploy to production immediately
```

### Monitoring

**Post-Deployment Monitoring (First Hour):**

- [ ] Check CloudWatch dashboard
- [ ] Monitor error rate metrics
- [ ] Check response time p95
- [ ] Review application logs
- [ ] Verify health checks passing
- [ ] Monitor database connections
- [ ] Check Redis memory usage
- [ ] Review Slack alerts

**Dashboard URLs:**

```
CloudWatch: https://console.aws.amazon.com/cloudwatch/home#dashboards:name=WhatsApp-SaaS-MVP-Dashboard
ECS Service: https://console.aws.amazon.com/ecs/home#/clusters/whatsapp-saas-production-cluster/services/whatsapp-saas-production-service
Application Logs: https://console.aws.amazon.com/cloudwatch/home#logsV2:log-groups/log-group/$252Faws$252Fecs$252Fwhatsapp-saas-production
```

### Security

**Secrets Management:**

- ✅ Never commit secrets to repository
- ✅ Use GitHub Secrets for sensitive data
- ✅ Rotate AWS credentials quarterly
- ✅ Use AWS Secrets Manager for application secrets
- ✅ Implement least-privilege IAM policies
- ✅ Enable MFA for AWS accounts
- ✅ Audit secret access regularly

**Dependency Management:**

```bash
# Weekly: Check for vulnerabilities
npm audit

# Monthly: Update dependencies
npm update

# Quarterly: Major version updates
npm outdated
npm install package@latest
```

---

## Appendix

### GitHub Actions Syntax Reference

**Common Patterns:**

```yaml
# Conditional jobs
if: github.ref == 'refs/heads/main'
if: github.event_name == 'pull_request'
if: success() && needs.build.result == 'success'

# Matrix strategy
strategy:
  matrix:
    node-version: [16, 18, 20]
    os: [ubuntu-latest, windows-latest]

# Caching
- uses: actions/cache@v3
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}

# Artifacts
- uses: actions/upload-artifact@v3
  with:
    name: coverage-report
    path: coverage/
    retention-days: 7

# Secrets
env:
  MY_SECRET: ${{ secrets.MY_SECRET }}
```

### AWS CLI Reference

**ECS Commands:**

```bash
# Describe service
aws ecs describe-services --cluster CLUSTER --services SERVICE

# List task definitions
aws ecs list-task-definitions --family-prefix FAMILY

# Register task definition
aws ecs register-task-definition --cli-input-json file://task-def.json

# Update service
aws ecs update-service --cluster CLUSTER --service SERVICE --task-definition TASK_DEF

# List tasks
aws ecs list-tasks --cluster CLUSTER --service-name SERVICE

# Describe tasks
aws ecs describe-tasks --cluster CLUSTER --tasks TASK_ARN

# View logs
aws logs tail /aws/ecs/SERVICE --follow
```

**ECR Commands:**

```bash
# Login
aws ecr get-login-password | docker login --username AWS --password-stdin REGISTRY

# Create repository
aws ecr create-repository --repository-name NAME

# List images
aws ecr list-images --repository-name NAME

# Delete image
aws ecr batch-delete-image --repository-name NAME --image-ids imageTag=TAG
```

### Useful Scripts

**View Recent Deployments:**

```bash
#!/bin/bash
# view-deployments.sh

CLUSTER=$1
SERVICE=$2

aws ecs describe-services \
  --cluster $CLUSTER \
  --services $SERVICE \
  --query 'services[0].events[0:10]' \
  --output table
```

**Compare Task Definitions:**

```bash
#!/bin/bash
# compare-task-defs.sh

TASK_DEF_1=$1
TASK_DEF_2=$2

diff \
  <(aws ecs describe-task-definition --task-definition $TASK_DEF_1 --query 'taskDefinition' | jq .) \
  <(aws ecs describe-task-definition --task-definition $TASK_DEF_2 --query 'taskDefinition' | jq .)
```

---

## Summary

This CI/CD pipeline provides:

✅ **Automated Testing** - Comprehensive test coverage on every commit
✅ **Security Scanning** - Trivy and Snyk for vulnerability detection
✅ **Zero-Downtime Deployments** - Blue-green strategy for production
✅ **Automatic Rollback** - Intelligent rollback on deployment failures
✅ **Environment Promotion** - Staging → Production workflow
✅ **Monitoring Integration** - CloudWatch alerts and Slack notifications
✅ **Manual Approvals** - Required approval gates for production
✅ **Comprehensive Logging** - Full audit trail of all deployments

**Next Steps:**

1. Configure GitHub Secrets
2. Test the pipeline with a feature branch
3. Deploy to staging
4. Run production deployment
5. Monitor and iterate

---

**Document Version:** 1.0
**Last Updated:** 2025-10-18
**Maintained By:** DevOps Team
**Related Docs:** SECRETS_MANAGEMENT.md, MONITORING_GUIDE.md
