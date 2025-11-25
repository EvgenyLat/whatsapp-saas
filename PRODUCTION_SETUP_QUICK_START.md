# Production Setup Quick Start Guide

**Last Updated:** 2025-10-23
**Time Required:** 30-45 minutes
**Status:** Ready for Production Deployment

---

## 🚨 Critical Pre-Deployment Actions (MUST DO)

### 1️⃣ Production Secrets Already Generated ✅

The `.env.production` file has been created with **secure production secrets**:

```bash
# Location: Backend/.env.production

✅ JWT_SECRET:           d41fbe24031d00b105b98a38b388f20bf9372f69d4d9d7e69c579bb743be4c9b
✅ JWT_REFRESH_SECRET:   78624261dc6c96e769693e28015b58aba845251cc980c3aa36b3c24ec40c5dbe
✅ CSRF_SECRET:          5cd156ee5d1c3303a83dfac1a58daaf8
✅ META_VERIFY_TOKEN:    80b74f5e11b2ed15aaab0c491590b9b8472f51071e7b298f621f3a9cf135f5bb
```

**🔐 Security Notice:**
- These secrets were generated using: `openssl rand -hex 32/16`
- Generated: 2025-10-23
- Next rotation due: 2025-11-23 (monthly)
- **NEVER commit .env.production to version control**
- Store in AWS Secrets Manager for production

---

### 2️⃣ Configure Production CORS (5 minutes)

**Action Required:** Update `Backend/.env.production`

```bash
# BEFORE (DO NOT USE IN PRODUCTION):
CORS_ORIGIN=*

# AFTER (Replace with your actual domains):
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com,https://app.yourdomain.com
```

**⚠️ CRITICAL:** Never use wildcard (`*`) in production! List all allowed origins explicitly.

---

### 3️⃣ Configure Production Database (10 minutes)

**Option A: AWS RDS (Recommended)**

```bash
# 1. Create RDS PostgreSQL instance
aws rds create-db-instance \
  --db-instance-identifier whatsapp-saas-prod \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 14.10 \
  --allocated-storage 100 \
  --master-username admin \
  --master-user-password YOUR_SECURE_PASSWORD

# 2. Update .env.production
DATABASE_URL=postgresql://admin:YOUR_SECURE_PASSWORD@whatsapp-saas-prod.xxx.rds.amazonaws.com:5432/whatsapp_saas_prod?schema=public&sslmode=require

# 3. Run migrations
cd Backend
npx prisma migrate deploy
npx prisma db push
```

**Option B: Existing PostgreSQL Server**

```bash
# 1. Create production database
createdb -h your-db-host -U postgres whatsapp_saas_prod

# 2. Update .env.production
DATABASE_URL=postgresql://username:password@your-db-host:5432/whatsapp_saas_prod?schema=public&sslmode=require

# 3. Run migrations
cd Backend
npx prisma migrate deploy
```

**Database Security Checklist:**
- [ ] Password is 20+ characters with mixed case, numbers, symbols
- [ ] SSL mode is enabled (`sslmode=require`)
- [ ] Database is not publicly accessible (VPC-only)
- [ ] Backup schedule configured (daily minimum)
- [ ] Connection limit set to 50+ for production load

---

### 4️⃣ Configure Production Redis (10 minutes)

**Option A: AWS ElastiCache (Recommended)**

```bash
# 1. Create ElastiCache Redis cluster
aws elasticache create-cache-cluster \
  --cache-cluster-id whatsapp-saas-prod-redis \
  --cache-node-type cache.t3.medium \
  --engine redis \
  --num-cache-nodes 1 \
  --auth-token YOUR_REDIS_PASSWORD

# 2. Update .env.production
REDIS_HOST=whatsapp-saas-prod-redis.xxx.cache.amazonaws.com
REDIS_PORT=6379
REDIS_PASSWORD=YOUR_REDIS_PASSWORD
REDIS_DB=0
REDIS_QUEUE_DB=1
```

**Option B: Self-Hosted Redis**

```bash
# 1. Install Redis with password authentication
redis-server --requirepass YOUR_REDIS_PASSWORD

# 2. Update .env.production
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=YOUR_REDIS_PASSWORD
REDIS_DB=0
REDIS_QUEUE_DB=1

# 3. Verify connection
redis-cli -h your-redis-host -p 6379 -a YOUR_REDIS_PASSWORD ping
# Expected: PONG
```

---

### 5️⃣ Configure Production SMTP (10 minutes)

**Option A: SendGrid (Recommended for Production)**

```bash
# 1. Sign up at https://sendgrid.com/
# 2. Create API key with "Mail Send" permission
# 3. Update .env.production:

SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=SG.your-api-key-here
SMTP_FROM_EMAIL=noreply@yourdomain.com
SMTP_FROM_NAME=WhatsApp SaaS Platform

# 4. Verify domain in SendGrid dashboard
# 5. Test email sending
```

**Option B: AWS SES**

```bash
# 1. Set up AWS SES and verify domain
aws ses verify-domain-identity --domain yourdomain.com

# 2. Create SMTP credentials
aws iam create-user --user-name ses-smtp-user
aws iam create-access-key --user-name ses-smtp-user

# 3. Update .env.production:
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=YOUR_SES_SMTP_USERNAME
SMTP_PASSWORD=YOUR_SES_SMTP_PASSWORD
SMTP_FROM_EMAIL=noreply@yourdomain.com
SMTP_FROM_NAME=WhatsApp SaaS Platform

# 4. Move out of SES sandbox (production sending)
```

**Option C: Gmail (Development/Testing Only)**

```bash
# NOT RECOMMENDED FOR PRODUCTION
# Daily send limit: 500 emails
# Use for local testing only

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-specific-password
SMTP_FROM_EMAIL=your-email@gmail.com
SMTP_FROM_NAME=WhatsApp SaaS Platform
```

---

### 6️⃣ Configure WhatsApp Business API (15 minutes)

**Prerequisites:**
- Facebook Developer Account
- Business Verification (for production)
- WhatsApp Business Account

**Setup Steps:**

```bash
# 1. Create Facebook App
# Visit: https://developers.facebook.com/apps/create/

# 2. Add WhatsApp Product
# Dashboard > Add Product > WhatsApp

# 3. Get Phone Number ID
# Dashboard > WhatsApp > API Setup > Phone Number ID

# 4. Generate System User Access Token
# Business Settings > System Users > Add
# Assign whatsapp_business_messaging permission
# Generate permanent token

# 5. Update .env.production
META_APP_SECRET=your-app-secret-from-dashboard
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
WHATSAPP_ACCESS_TOKEN=your-permanent-access-token

# 6. Configure Webhook
# Dashboard > WhatsApp > Configuration
# Callback URL: https://api.yourdomain.com/api/v1/webhooks/whatsapp
# Verify Token: Use META_VERIFY_TOKEN from .env.production
# Subscribe to: messages, message_status events
```

---

## 📋 Pre-Deployment Verification Checklist

Run through this checklist before deploying:

### Security ✅
- [ ] JWT secrets are 64 characters (hex)
- [ ] CSRF secret is 32 characters (hex)
- [ ] All secrets are different from development
- [ ] CORS_ORIGIN contains NO wildcards (*)
- [ ] Database password is strong (20+ chars)
- [ ] Redis password is set
- [ ] .env.production is NOT in git

### Database ✅
- [ ] Production database created
- [ ] DATABASE_URL is correct
- [ ] SSL mode enabled (sslmode=require)
- [ ] Migrations run successfully: `npx prisma migrate deploy`
- [ ] Database accessible from application servers
- [ ] Backup schedule configured

### Redis ✅
- [ ] Production Redis instance running
- [ ] REDIS_HOST, REDIS_PORT, REDIS_PASSWORD set
- [ ] Redis accessible from application servers
- [ ] Connection test successful: `redis-cli ping`

### SMTP ✅
- [ ] SMTP provider configured (SendGrid/SES/Gmail)
- [ ] SMTP credentials tested
- [ ] FROM email verified/whitelisted
- [ ] Domain SPF/DKIM records configured

### WhatsApp ✅
- [ ] Facebook App created
- [ ] WhatsApp product added
- [ ] Phone Number ID obtained
- [ ] Permanent access token generated
- [ ] Webhook URL configured in Facebook Console
- [ ] Webhook verified with META_VERIFY_TOKEN
- [ ] Business verification completed (for production)

### Infrastructure ✅
- [ ] Docker images built and tagged
- [ ] Images pushed to container registry (ECR/Docker Hub)
- [ ] Load balancer configured
- [ ] SSL certificates installed and valid
- [ ] DNS records pointing to production servers
- [ ] CloudWatch/monitoring configured
- [ ] Backup and disaster recovery procedures documented

---

## 🚀 Quick Deployment Commands

### Docker Deployment

```bash
# 1. Build images
cd Backend
docker build -t whatsapp-saas-backend:v1.0.0 .

cd ../Frontend
docker build -t whatsapp-saas-frontend:v1.0.0 .

# 2. Push to registry
docker tag whatsapp-saas-backend:v1.0.0 your-registry/backend:v1.0.0
docker push your-registry/backend:v1.0.0

docker tag whatsapp-saas-frontend:v1.0.0 your-registry/frontend:v1.0.0
docker push your-registry/frontend:v1.0.0

# 3. Deploy with docker-compose
docker-compose -f docker-compose.prod.yml up -d
```

### AWS ECS Deployment

```bash
# 1. Update ECS service with new task definition
aws ecs update-service \
  --cluster whatsapp-saas-production \
  --service backend-service \
  --force-new-deployment

aws ecs update-service \
  --cluster whatsapp-saas-production \
  --service frontend-service \
  --force-new-deployment

# 2. Monitor deployment
aws ecs describe-services \
  --cluster whatsapp-saas-production \
  --services backend-service frontend-service
```

### Kubernetes Deployment

```bash
# 1. Create namespace
kubectl create namespace whatsapp-saas-prod

# 2. Apply secrets
kubectl create secret generic app-secrets \
  --from-env-file=Backend/.env.production \
  -n whatsapp-saas-prod

# 3. Deploy with Helm
helm install whatsapp-saas ./helm-chart \
  --namespace whatsapp-saas-prod \
  --values values-production.yaml

# 4. Monitor deployment
kubectl get pods -n whatsapp-saas-prod -w
```

---

## ✅ Post-Deployment Verification

### 1. Health Check

```bash
curl https://api.yourdomain.com/api/v1/health

# Expected Response:
{
  "status": "ok",
  "timestamp": "2025-10-23T12:00:00.000Z",
  "database": "connected",
  "redis": "connected"
}
```

### 2. Authentication Test

```bash
# Login
curl -X POST https://api.yourdomain.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@yourdomain.com","password":"your-password"}'

# Expected: 200 OK with accessToken and refreshToken
```

### 3. Dashboard Performance Test

```bash
TOKEN="your-jwt-token"

curl -X GET "https://api.yourdomain.com/api/v1/analytics/dashboard?salon_id=test" \
  -H "Authorization: Bearer $TOKEN" \
  -w "\nResponse Time: %{time_total}s\n"

# Expected: Response time < 0.2s (200ms) with caching
```

### 4. CORS Verification

```bash
curl -H "Origin: https://yourdomain.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -X OPTIONS \
  https://api.yourdomain.com/api/v1/health

# Expected: Access-Control-Allow-Origin: https://yourdomain.com
```

### 5. Queue Monitoring

Visit: `https://yourdomain.com/admin/queues`

Verify:
- Bull Board UI loads successfully
- All 4 queues are visible (webhook, message-status, booking-reminder, email)
- No failed jobs in queues
- Workers are processing jobs

---

## 🔍 Monitoring & Alerts

### CloudWatch Alarms (AWS)

```bash
# High error rate alarm
aws cloudwatch put-metric-alarm \
  --alarm-name whatsapp-saas-high-error-rate \
  --alarm-description "Error rate > 5%" \
  --metric-name Errors \
  --namespace AWS/ApplicationELB \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2

# High response time alarm
aws cloudwatch put-metric-alarm \
  --alarm-name whatsapp-saas-slow-response \
  --alarm-description "P95 response time > 1s" \
  --metric-name TargetResponseTime \
  --namespace AWS/ApplicationELB \
  --statistic Average \
  --period 300 \
  --threshold 1 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2
```

### Key Metrics to Monitor

- **API Response Time:** Target < 200ms (p95)
- **Error Rate:** Target < 1%
- **Cache Hit Rate:** Target > 60%
- **Database Connections:** Monitor pool usage
- **Redis Memory:** Alert at 80% capacity
- **Queue Backlog:** Alert if > 1000 pending jobs

---

## 🆘 Emergency Contacts

**On-Call Engineer:** +1-XXX-XXX-XXXX
**DevOps Team:** devops@yourdomain.com
**CTO:** cto@yourdomain.com
**PagerDuty:** https://yourdomain.pagerduty.com

---

## 📚 Additional Resources

- **Full Deployment Guide:** [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
- **Deployment Checklist:** [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)
- **Project Summary:** [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)
- **Performance Documentation:** `Backend/docs/performance/`

---

## 🔄 Secret Rotation Schedule

| Secret | Frequency | Next Rotation |
|--------|-----------|---------------|
| JWT_SECRET | Monthly | 2025-11-23 |
| JWT_REFRESH_SECRET | Monthly | 2025-11-23 |
| CSRF_SECRET | Monthly | 2025-11-23 |
| Database Password | Quarterly | 2026-01-23 |
| Redis Password | Quarterly | 2026-01-23 |
| WhatsApp Access Token | As needed | On compromise |
| Admin Token | Monthly | 2025-11-23 |

---

**Document Version:** 1.0.0
**Last Updated:** 2025-10-23
**Status:** ✅ Ready for Production Deployment
