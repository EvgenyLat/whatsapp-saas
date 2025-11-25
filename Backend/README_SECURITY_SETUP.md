# Security Setup Guide

## Overview

This guide walks you through setting up all security features for the WhatsApp SaaS Platform. Follow these steps in order for a secure production deployment.

---

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database configured
- Redis server configured
- AWS account (for production key storage)
- SSL/TLS certificate for HTTPS

---

## Step 1: Install Dependencies

```bash
cd Backend
npm install
```

This installs all required security packages including:
- `helmet` - Security headers
- `express-rate-limit` - Rate limiting
- `rate-limit-redis` - Redis-backed rate limiting
- `@aws-sdk/client-secrets-manager` - AWS Secrets Manager integration

---

## Step 2: Generate Encryption Keys

Generate cryptographically secure keys for encryption and authentication:

```bash
npm run security:generate-keys
```

This will output:
- `ENCRYPTION_KEY` - 64-character hex key for AES-256-GCM
- `ADMIN_TOKEN` - Base64-encoded admin authentication token
- `ENCRYPTION_KEY_CREATED_AT` - Timestamp for rotation tracking

**Save these values securely!** You'll need them in the next step.

---

## Step 3: Configure Environment Variables

Copy the example environment file:

```bash
cp env.example .env
```

Edit `.env` and add the keys generated in Step 2:

```bash
# Security - Encryption
ENCRYPTION_KEY=your-64-character-hex-encryption-key-here
ENCRYPTION_KEY_CREATED_AT=2025-01-18T00:00:00Z

# Security - Admin Access
ADMIN_TOKEN=your-base64-admin-token-here

# Other required variables...
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname
REDIS_URL=redis://localhost:6379
```

**Important:**
- Never commit `.env` to version control
- Use different keys for each environment (dev/staging/prod)
- Store production keys in AWS Secrets Manager

---

## Step 4: Set Up AWS Secrets Manager (Production Only)

For production deployments, store encryption keys in AWS Secrets Manager:

### 4.1 Create IAM Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:CreateSecret",
        "secretsmanager:UpdateSecret",
        "secretsmanager:PutSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:*:*:secret:whatsapp-saas/*"
    }
  ]
}
```

### 4.2 Store Encryption Key

```bash
aws secretsmanager create-secret \
  --name whatsapp-saas/encryption-key-v1 \
  --description "WhatsApp SaaS AES-256-GCM encryption key" \
  --secret-string '{"key":"YOUR_ENCRYPTION_KEY","version":1,"createdAt":"2025-01-18T00:00:00Z"}'
```

### 4.3 Update Environment Variables

```bash
AWS_REGION=us-east-1
ENCRYPTION_KEY_SECRET_PREFIX=whatsapp-saas/encryption-key
```

---

## Step 5: Migrate Existing Phone Numbers (If Applicable)

If you have existing data with plaintext phone numbers, encrypt them:

### 5.1 Dry Run (Test)

```bash
npm run security:encrypt-phones:dry
```

This simulates the migration without making changes.

### 5.2 Create Backup

```bash
npm run security:encrypt-phones:backup
```

This creates a JSON backup in `Backend/backups/`.

### 5.3 Run Migration

```bash
npm run security:encrypt-phones
```

This encrypts all phone numbers in:
- `bookings.customer_phone`
- `messages.phone_number`
- `conversations.phone_number`
- `ai_conversations.phone_number`
- `ai_messages.phone_number`

**Migration is idempotent** - safe to run multiple times.

---

## Step 6: Verify Encryption

Test that encryption is working correctly:

```bash
npm run test:encryption
```

Expected output:
```
PASS  tests/utils/encryption.test.js
  Encryption Utilities
    encrypt() and decrypt()
      ✓ should encrypt and decrypt text correctly
      ✓ should produce different ciphertext for same plaintext
      ...
    encryptPhoneNumber() and decryptPhoneNumber()
      ✓ should encrypt and decrypt phone number
      ✓ should normalize phone number before encryption
      ...

Tests: XX passed, XX total
```

---

## Step 7: Configure Rate Limiting

Rate limiting is automatically enabled when Redis is available.

### 7.1 Verify Redis Connection

```bash
redis-cli ping
# Expected: PONG
```

### 7.2 Test Rate Limiting

Start the server:
```bash
npm start
```

Test authentication rate limit (5 requests per 15 minutes):
```bash
for i in {1..10}; do
  curl -X POST http://localhost:3000/admin/salons \
    -H "Content-Type: application/json" \
    -d '{"test": "data"}'
done
```

Expected:
- First 5 requests: Normal response
- Remaining requests: 429 Too Many Requests

---

## Step 8: Verify Security Headers

### 8.1 Check Headers Locally

```bash
curl -I http://localhost:3000/
```

Expected headers:
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'; ...
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), ...
```

### 8.2 Test Online (Production)

After deploying to production, test with:
- https://securityheaders.com/
- https://observatory.mozilla.org/

**Target Scores:**
- Security Headers: A+
- Mozilla Observatory: A+

---

## Step 9: Run Security Tests

Run the full security test suite:

```bash
# Encryption tests
npm run test:encryption

# All security tests
npm run test:security

# OWASP compliance tests
npm run test:owasp

# Complete test suite
npm test
```

All tests should pass before deployment.

---

## Step 10: Audit Dependencies

Check for vulnerable dependencies:

```bash
npm run security:audit
```

Expected output:
```
found 0 vulnerabilities
```

If vulnerabilities are found:
```bash
# Try automatic fix
npm run security:fix

# Review and update manually if needed
npm update [package-name]
```

---

## Step 11: Enable Dependabot

Dependabot configuration is already in `.github/dependabot.yml`.

### 11.1 Enable in GitHub

1. Go to repository settings
2. Navigate to "Code security and analysis"
3. Enable "Dependabot alerts"
4. Enable "Dependabot security updates"

### 11.2 Review PRs Weekly

Dependabot will create PRs for:
- Security updates (immediate)
- Dependency updates (weekly on Mondays)

---

## Step 12: Configure Terraform Encryption (Production)

Verify backup encryption is configured in Terraform:

### 12.1 RDS Encryption

In `terraform/environments/production/main.tf`:
```hcl
resource "aws_db_instance" "main" {
  storage_encrypted = true
  kms_key_id        = aws_kms_key.rds.arn
  # ...
}
```

### 12.2 S3 Backup Encryption

```hcl
resource "aws_s3_bucket_server_side_encryption_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}
```

### 12.3 ElastiCache Encryption

```hcl
resource "aws_elasticache_replication_group" "main" {
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  kms_key_id                 = aws_kms_key.elasticache.arn
  # ...
}
```

### 12.4 Apply Terraform

```bash
cd terraform/environments/production
terraform init
terraform plan
terraform apply
```

---

## Step 13: Set Up Key Rotation Schedule

### 13.1 Create Lambda Function

Create `lambda/key-rotation.js`:
```javascript
const { scheduleKeyRotation } = require('./src/utils/key-rotation');

exports.handler = async (event) => {
  return await scheduleKeyRotation({
    maxKeyAgeMonths: 12,
    dryRun: false
  });
};
```

### 13.2 Configure CloudWatch Events

```hcl
resource "aws_cloudwatch_event_rule" "key_rotation" {
  name                = "whatsapp-saas-key-rotation"
  description         = "Trigger key rotation every 6 months"
  schedule_expression = "rate(6 months)"
}

resource "aws_cloudwatch_event_target" "key_rotation" {
  rule      = aws_cloudwatch_event_rule.key_rotation.name
  target_id = "lambda"
  arn       = aws_lambda_function.key_rotation.arn
}
```

---

## Step 14: Configure Monitoring

### 14.1 Security Events to Monitor

Set up alerts for:
- Rate limit violations
- Failed authentication attempts
- 401/403 responses (high frequency)
- 500 errors
- Unusual traffic patterns

### 14.2 CloudWatch Alarms

```hcl
resource "aws_cloudwatch_metric_alarm" "rate_limit_violations" {
  alarm_name          = "whatsapp-saas-rate-limit-violations"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "RateLimitViolations"
  namespace           = "WhatsAppSaaS"
  period              = "300"
  statistic           = "Sum"
  threshold           = "100"
  alarm_description   = "High rate limit violations detected"
  alarm_actions       = [aws_sns_topic.alerts.arn]
}
```

---

## Step 15: Production Deployment Checklist

Before deploying to production:

### Security Configuration
- [ ] Encryption keys generated and stored in AWS Secrets Manager
- [ ] `.env` file configured with production values
- [ ] Database phone numbers encrypted
- [ ] SSL/TLS certificate installed and configured
- [ ] HTTPS redirect enabled on load balancer

### Testing
- [ ] All unit tests passing (`npm test`)
- [ ] Security tests passing (`npm run test:security`)
- [ ] OWASP tests passing (`npm run test:owasp`)
- [ ] Encryption tests passing (`npm run test:encryption`)
- [ ] npm audit shows 0 vulnerabilities

### Infrastructure
- [ ] Terraform encryption verified (RDS, S3, ElastiCache)
- [ ] KMS keys created and configured
- [ ] Backup retention configured (7 days minimum)
- [ ] Multi-AZ deployment enabled

### Monitoring
- [ ] CloudWatch alarms configured
- [ ] SNS topic for alerts created
- [ ] Log aggregation configured
- [ ] Security event monitoring enabled

### Rate Limiting
- [ ] Redis connection tested
- [ ] Rate limiters applied to all endpoints
- [ ] Rate limit tested with load testing

### Security Headers
- [ ] Headers tested with securityheaders.com (A+ score)
- [ ] CSP policy configured and tested
- [ ] HSTS preload list submission (optional)

### Error Handling
- [ ] Error handler middleware applied
- [ ] Error responses tested in production mode
- [ ] No sensitive data in error messages verified

### Dependencies
- [ ] Dependabot enabled
- [ ] GitHub Security Advisories enabled
- [ ] Automated dependency updates configured

### Documentation
- [ ] Security documentation reviewed
- [ ] Incident response procedures documented
- [ ] Team trained on security practices

### Access Control
- [ ] Admin tokens rotated
- [ ] IAM policies configured with least privilege
- [ ] Security groups configured (restrictive)

---

## Step 16: Post-Deployment Verification

After deploying to production:

### 16.1 Test Encryption

```bash
# Via API
curl -X POST https://api.example.com/admin/salons \
  -H "X-Admin-Token: YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Salon","phone_number_id":"123","access_token":"abc"}'

# Verify phone numbers are encrypted in database
psql $DATABASE_URL -c "SELECT customer_phone FROM bookings LIMIT 1;"
# Should show encrypted format: "1:base64iv:base64tag:base64data"
```

### 16.2 Test Rate Limiting

```bash
# Trigger rate limit
for i in {1..10}; do
  curl https://api.example.com/admin/salons \
    -H "X-Admin-Token: invalid"
done

# Should return 429 after 5 attempts
```

### 16.3 Test Security Headers

```bash
curl -I https://api.example.com/
```

Verify all security headers are present.

### 16.4 Test Error Handling

```bash
# Production mode should not show stack traces
curl https://api.example.com/nonexistent
```

Should return generic error message only.

---

## Step 17: Ongoing Maintenance

### Daily
- Review security event logs
- Monitor rate limit violations
- Check for failed authentication attempts

### Weekly
- Review and merge Dependabot PRs
- Check for security advisories
- Review error logs

### Monthly
- Run `npm audit`
- Review access patterns
- Update security documentation

### Quarterly
- Rotate admin tokens
- Security audit
- Review and update policies

### Annually
- Rotate encryption keys
- Full penetration testing
- Compliance audit
- Team security training

---

## Troubleshooting

### Encryption Issues

**Problem:** `Error: Encryption key not configured`
**Solution:** Set `ENCRYPTION_KEY` in `.env` file

**Problem:** `Error: Invalid encryption key length`
**Solution:** Key must be exactly 64 hexadecimal characters (32 bytes)

**Problem:** `Error: Decryption failed: Invalid authentication tag`
**Solution:** Data may be corrupted or tampered. Restore from backup.

### Rate Limiting Issues

**Problem:** Rate limiting not working
**Solution:** Check Redis connection. Rate limiting falls back to memory if Redis unavailable.

**Problem:** Getting rate limited unexpectedly
**Solution:** Check if behind proxy. Use `trust proxy` in Express.

### Security Header Issues

**Problem:** CSP blocking resources
**Solution:** Add allowed domains to CSP directives in `Backend/src/middleware/security.js`

**Problem:** CORS errors
**Solution:** Add domains to `ALLOWED_ORIGINS` in `.env`

---

## Support

**Security Issues:** security@example.com
**Documentation:** `Backend/SECURITY.md`
**Quick Reference:** `Backend/SECURITY_QUICK_REFERENCE.md`

---

## Additional Resources

- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [NIST Cryptographic Standards](https://csrc.nist.gov/Projects/Cryptographic-Standards-and-Guidelines)
- [AWS Secrets Manager Best Practices](https://docs.aws.amazon.com/secretsmanager/latest/userguide/best-practices.html)
- [Helmet.js Documentation](https://helmetjs.github.io/)
- [Express Rate Limit](https://github.com/express-rate-limit/express-rate-limit)

---

*Last Updated: 2025-01-18*
*Version: 1.0.0*
