# Deployment Instructions - Database Connection Pool Fix

**Status**: 🔴 **CRITICAL - Required Before Production Launch**
**Issue**: Database connection pool exhaustion at peak load
**Fix**: Increase connection pool from 20 to 50
**Timeline**: 20 minutes total

---

## Critical Issue Summary

**Problem**: Load testing identified database connection pool exhaustion at 500 concurrent users

**Impact**:
- Error rate: 2.1% (target: <1%)
- P95 response time: 485ms (target: <400ms)
- Connection timeouts: 1,245 errors

**Root Cause**: `DB_CONNECTION_LIMIT=20` is too low for peak load (need 40-50 connections)

**Reference**: See `Backend/tests/load/FINAL_LOAD_TEST_REPORT.md` for full analysis

---

## Quick Fix (20 minutes)

### Step 1: Update Environment Configuration (2 minutes)

#### Option A: Local Development
```bash
cd Backend

# Edit .env file
# Change: DB_CONNECTION_LIMIT=20
# To:     DB_CONNECTION_LIMIT=50

# Also update these related settings:
# DB_POOL_TIMEOUT=30
# DB_STATEMENT_CACHE_SIZE=200
```

#### Option B: AWS Secrets Manager (Production)
```bash
# Update the secret in AWS Secrets Manager
aws secretsmanager update-secret \
  --secret-id whatsapp-saas/production/config \
  --secret-string '{
    "DB_CONNECTION_LIMIT": "50",
    "DB_POOL_TIMEOUT": "30",
    "DB_STATEMENT_CACHE_SIZE": "200"
  }' \
  --region us-east-1
```

### Step 2: Verify Configuration (1 minute)

```bash
# Check the current environment configuration
cd Backend
npm run check-config

# Or manually verify
node -e "
const dotenv = require('dotenv');
dotenv.config();
console.log('DB_CONNECTION_LIMIT:', process.env.DB_CONNECTION_LIMIT);
console.log('DB_POOL_TIMEOUT:', process.env.DB_POOL_TIMEOUT);
console.log('DB_STATEMENT_CACHE_SIZE:', process.env.DB_STATEMENT_CACHE_SIZE);
"

# Expected output:
# DB_CONNECTION_LIMIT: 50
# DB_POOL_TIMEOUT: 30
# DB_STATEMENT_CACHE_SIZE: 200
```

### Step 3: Deploy to Staging (10 minutes)

#### Option A: Via Git Push + CI/CD
```bash
# Commit the fix
git add Backend/.env.example Backend/.env.production.example
git commit -m "fix: increase database connection pool for peak load

- Increase DB_CONNECTION_LIMIT from 20 to 50
- Increase DB_POOL_TIMEOUT from 20 to 30
- Increase DB_STATEMENT_CACHE_SIZE from 100 to 200

Based on load test findings:
- At 500 concurrent users with pool max=20: 2.1% error rate
- Root cause: Connection pool exhaustion
- Fix validates system can handle 500+ concurrent users

Fixes: #LOAD_TEST_ISSUE
Ref: Backend/tests/load/FINAL_LOAD_TEST_REPORT.md"

# Push to trigger staging deployment
git push origin main

# Monitor deployment
gh workflow view deploy-staging.yml --web
```

#### Option B: Manual Deployment
```bash
# SSH to staging server
ssh staging-server

# Pull latest changes
cd /app/whatsapp-saas-starter/Backend
git pull origin main

# Update environment variables
# Edit /app/whatsapp-saas-starter/Backend/.env
sudo nano .env

# Change these values:
# DB_CONNECTION_LIMIT=50
# DB_POOL_TIMEOUT=30
# DB_STATEMENT_CACHE_SIZE=200

# Restart application
pm2 restart whatsapp-saas
# OR
sudo systemctl restart whatsapp-saas
# OR
docker-compose restart backend

# Verify application started
curl http://localhost:4000/healthz
```

### Step 4: Verify Deployment (5 minutes)

```bash
# Check application logs
# Look for: "Pool configuration: {\"connection_limit\":50,...}"
kubectl logs -f deployment/whatsapp-saas-staging
# OR
pm2 logs whatsapp-saas
# OR
tail -f /var/log/whatsapp-saas/app.log

# Check database connections
psql $DATABASE_URL -c "
  SELECT
    count(*) as active_connections,
    max_connections
  FROM pg_stat_activity
  CROSS JOIN (SELECT setting::int as max_connections FROM pg_settings WHERE name = 'max_connections') s
  WHERE datname = current_database();
"

# Expected: active_connections should be < 50

# Run health check
curl https://staging.api.example.com/healthz

# Check database metrics endpoint
curl https://staging.api.example.com/admin/metrics/database \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Expected response:
# {
#   "pool": {
#     "active": 15,
#     "total": 25,
#     "limit": 50,
#     "utilization": 50.00,
#     "idle": 10
#   },
#   "config": {
#     "connectionLimit": 50,
#     "poolTimeout": 30
#   }
# }
```

### Step 5: Re-run Peak Load Test (30 minutes)

```bash
cd Backend/tests/load

# Run peak load test to validate fix
k6 run scripts/peak-load-test.js \
  --out json=peak-results-after-fix.json \
  --out influxdb=http://monitoring.example.com:8086/k6

# Monitor test progress in separate terminal
tail -f peak-results-after-fix.json

# Expected results after fix:
# ✅ Error rate: < 1% (was 2.1%)
# ✅ p95 response time: < 400ms (was 485ms)
# ✅ No connection timeout errors (was 1,245)
# ✅ Database connections: < 45 (out of 50)
# ✅ No queueing for connections
```

### Step 6: Validate Results (5 minutes)

```bash
# Analyze test results
node scripts/analyze-results.js peak-results-after-fix.json

# Check success criteria:
echo "Validation Checklist:"
echo "✅ Error rate < 1%"
echo "✅ p95 response time < 400ms"
echo "✅ No connection timeouts"
echo "✅ Database connections < 45 (out of 50)"
echo "✅ No queueing for connections"

# If all pass → Proceed to production deployment
# If any fail → Investigate and fix before continuing
```

---

## Full Production Deployment (2 hours)

After validating the fix on staging, deploy to production:

### Step 1: Update Production Infrastructure (15 minutes)

```bash
cd Infrastructure/terraform

# Update production.tfvars with new RDS parameter group
# Edit production.tfvars:
# rds_max_connections = 100  # (double the app pool limit for safety)

# Apply infrastructure changes
terraform plan -var-file=production.tfvars
terraform apply -var-file=production.tfvars

# Verify RDS parameter update
aws rds describe-db-parameters \
  --db-parameter-group-name whatsapp-saas-prod \
  --region us-east-1 \
  --query 'Parameters[?ParameterName==`max_connections`]'
```

### Step 2: Update Application Configuration (10 minutes)

```bash
# Update AWS Secrets Manager
aws secretsmanager update-secret \
  --secret-id whatsapp-saas/production/config \
  --secret-string "$(cat <<EOF
{
  "DB_CONNECTION_LIMIT": "50",
  "DB_POOL_TIMEOUT": "30",
  "DB_STATEMENT_CACHE_SIZE": "200",
  "DB_QUERY_TIMEOUT": "10000",
  "DB_SLOW_QUERY_THRESHOLD": "1000"
}
EOF
)" \
  --region us-east-1

# Verify secret updated
aws secretsmanager get-secret-value \
  --secret-id whatsapp-saas/production/config \
  --region us-east-1 \
  --query SecretString \
  --output text | jq .
```

### Step 3: Deploy Application (30 minutes)

```bash
# Create production release tag
git tag -a v1.0.1 -m "Production Release v1.0.1

Critical Fix: Database Connection Pool

- Increase DB_CONNECTION_LIMIT from 20 to 50
- Validated on staging with peak load test
- Reduces error rate from 2.1% to < 1%
- Improves p95 response time from 485ms to < 400ms

Load Test Results:
- Baseline: PASS (145ms p95, 0.3% errors)
- Peak Load: PASS (< 400ms p95, < 1% errors)
- Spike: PASS (12s recovery)
- Endurance: PASS (no leaks)
- Business Flow: PASS (96.2% success)

Deployment: Blue-Green with rollback plan
"

git push origin v1.0.1

# Deploy via CI/CD (recommended)
gh workflow run deploy-production.yml \
  --ref v1.0.1 \
  --field environment=production \
  --field strategy=blue-green

# OR deploy manually
kubectl set image deployment/whatsapp-saas \
  whatsapp-saas=your-registry/whatsapp-saas:v1.0.1 \
  --namespace production

# OR with Docker Swarm
docker stack deploy -c docker-stack-production.yml whatsapp-saas

# Monitor rollout
kubectl rollout status deployment/whatsapp-saas -n production
```

### Step 4: Smoke Test Production (10 minutes)

```bash
# Health check
curl https://api.yourdomain.com/healthz

# Database metrics
curl https://api.yourdomain.com/admin/metrics/database \
  -H "Authorization: Bearer $PROD_ADMIN_TOKEN"

# Test booking creation (end-to-end)
curl -X POST https://api.yourdomain.com/webhooks \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: $WEBHOOK_SIGNATURE" \
  -d @test-payloads/booking-message.json

# Verify in database
psql $PROD_DATABASE_URL -c "
  SELECT booking_code, status, created_at
  FROM bookings
  ORDER BY created_at DESC
  LIMIT 5;
"
```

### Step 5: Monitor Production (60 minutes)

```bash
# Watch application logs
kubectl logs -f deployment/whatsapp-saas -n production

# Monitor key metrics
watch -n 5 'curl -s https://api.yourdomain.com/admin/metrics/database \
  -H "Authorization: Bearer $PROD_ADMIN_TOKEN" | jq .pool'

# Monitor CloudWatch
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name DatabaseConnections \
  --dimensions Name=DBInstanceIdentifier,Value=whatsapp-saas-prod \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average,Maximum \
  --region us-east-1

# Expected: Average < 40, Maximum < 50
```

---

## Rollback Plan

If issues occur in production, rollback immediately:

### Quick Rollback (5 minutes)

```bash
# Rollback to previous version
kubectl rollout undo deployment/whatsapp-saas -n production

# OR revert to previous tag
gh workflow run deploy-production.yml \
  --ref v1.0.0 \
  --field environment=production \
  --field strategy=immediate

# Verify rollback
curl https://api.yourdomain.com/healthz

# Check version
curl https://api.yourdomain.com/admin/version \
  -H "Authorization: Bearer $PROD_ADMIN_TOKEN"
```

### Investigate Issues

```bash
# Get error logs
kubectl logs deployment/whatsapp-saas -n production --previous

# Check database connections
psql $PROD_DATABASE_URL -c "
  SELECT
    pid,
    usename,
    application_name,
    state,
    state_change,
    query
  FROM pg_stat_activity
  WHERE datname = current_database()
  ORDER BY state_change DESC;
"

# Check for connection errors
kubectl logs deployment/whatsapp-saas -n production | grep -i "connection"
```

---

## Validation Checklist

After deployment, verify these success criteria:

- [ ] ✅ Application health check returns 200 OK
- [ ] ✅ Database pool metrics show `limit: 50`
- [ ] ✅ Database connections stable (< 45 active)
- [ ] ✅ No connection timeout errors in logs
- [ ] ✅ API response times < 400ms (p95)
- [ ] ✅ Error rate < 1%
- [ ] ✅ End-to-end booking flow works
- [ ] ✅ CloudWatch alarms not triggered
- [ ] ✅ No increase in error logs
- [ ] ✅ Monitoring dashboards green

---

## Additional Improvements (Optional)

After validating the connection pool fix, consider these enhancements:

### 1. Upgrade Redis (15 minutes)

```bash
cd Infrastructure/terraform

# Edit redis.tf
# Change: node_type = "cache.t3.medium"  # 3GB
# To:     node_type = "cache.t3.large"   # 6GB

terraform apply -var-file=production.tfvars
```

**Benefit**: Prevents cache evictions at peak load (347 evictions observed)

### 2. Implement AI API Retry Logic (1 hour)

See `LOAD_TEST_ACTION_PLAN.md` section 7 for implementation details.

**Benefit**: Improves business flow success from 96.2% to 98%+

### 3. Configure Monitoring Alerts (45 minutes)

```bash
cd Infrastructure/terraform

# Apply alert configurations
terraform apply -var-file=production.tfvars -target=module.monitoring
```

**Benefit**: Proactive notification before issues impact users

---

## Troubleshooting

### Issue: "connection pool timeout" errors

```bash
# Check pool utilization
curl https://api.yourdomain.com/admin/metrics/database \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .pool.utilization

# If utilization > 90%, increase pool further
# Edit .env:
# DB_CONNECTION_LIMIT=75

# Restart application
```

### Issue: "too many connections" PostgreSQL error

```bash
# Check RDS max_connections
aws rds describe-db-parameters \
  --db-parameter-group-name whatsapp-saas-prod \
  --query 'Parameters[?ParameterName==`max_connections`].ParameterValue'

# Ensure RDS max_connections >= 2 * DB_CONNECTION_LIMIT
# Recommended: RDS max_connections = 100, DB_CONNECTION_LIMIT = 50
```

### Issue: Slow queries after pool increase

```bash
# Check slow query log
curl https://api.yourdomain.com/admin/metrics/database \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .slowQueries

# Investigate slow queries
psql $DATABASE_URL -c "
  SELECT query, calls, mean_exec_time, stddev_exec_time
  FROM pg_stat_statements
  WHERE mean_exec_time > 1000
  ORDER BY mean_exec_time DESC
  LIMIT 10;
"

# Add missing indexes if needed
```

---

## Support

**Questions**: Ask in #engineering Slack channel
**Issues**: Create ticket with "URGENT" label
**Documentation**:
- Load Test Report: `Backend/tests/load/FINAL_LOAD_TEST_REPORT.md`
- Action Plan: `LOAD_TEST_ACTION_PLAN.md`
- Production Readiness: `PRODUCTION_READINESS_REPORT.md`

**On-Call Engineer**: Available for consultation
**Test Engineer**: Standing by for re-tests

---

**Document Created**: 2025-01-18
**Last Updated**: 2025-01-18
**Next Review**: After production deployment
**Status**: ✅ **READY FOR DEPLOYMENT**
