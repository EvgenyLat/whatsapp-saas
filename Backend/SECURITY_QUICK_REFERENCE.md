# Security Quick Reference Guide

**Quick access to all security implementations**

---

## 1. Phone Number Encryption

### Generate Encryption Key
```bash
node scripts/generate-encryption-key.js
```

### Use in Code
```javascript
const { encryptPhoneNumber, decryptPhoneNumber } = require('./src/utils/encryption');

// Encrypt
const encrypted = encryptPhoneNumber('+1234567890');

// Decrypt
const phone = decryptPhoneNumber(encrypted);
```

### Migrate Existing Data
```bash
# Test first
node scripts/encrypt-phone-numbers.js --dry-run

# Backup
node scripts/encrypt-phone-numbers.js --backup

# Migrate
node scripts/encrypt-phone-numbers.js
```

---

## 2. Key Rotation

### Manual Rotation
```javascript
const { rotateKey } = require('./src/utils/key-rotation');

const result = await rotateKey({
  storeInSecretsManager: true,
  metadata: { rotatedBy: 'admin@example.com' }
});
```

### Automated Rotation (Lambda)
```javascript
const { scheduleKeyRotation } = require('./src/utils/key-rotation');

exports.handler = async () => {
  return await scheduleKeyRotation({ maxKeyAgeMonths: 12 });
};
```

---

## 3. Rate Limiting

### Apply to Routes
```javascript
const { authLimiter, adminLimiter, apiLimiter } = require('./src/middleware/rate-limiter');

// Authentication endpoints (5 req/15min)
app.post('/auth/login', authLimiter, handler);

// Admin endpoints (20 req/15min)
app.use('/admin', adminLimiter);

// API endpoints (60 req/min)
app.use('/api', apiLimiter);
```

### Custom Rate Limiter
```javascript
const { createRateLimiter } = require('./src/middleware/rate-limiter');

const custom = createRateLimiter({
  windowMs: 60000,
  max: 10,
  prefix: 'custom'
});
```

---

## 4. Error Handling

### Use Middleware
```javascript
const { errorHandler, asyncHandler } = require('./src/middleware/error-handler');

// Wrap async routes
app.get('/users', asyncHandler(async (req, res) => {
  const users = await db.users.findMany();
  res.json(users);
}));

// Apply error handler (LAST middleware)
app.use(errorHandler);
```

---

## 5. Security Headers

### Already Applied
Headers are automatically applied via `Backend/src/middleware/security.js`

### Test Headers
```bash
# Test with curl
curl -I https://your-domain.com/

# Or use online tools:
# - https://securityheaders.com/
# - https://observatory.mozilla.org/
```

---

## 6. Environment Variables

### Required for Security
```bash
# Encryption (64 hex characters)
ENCRYPTION_KEY=your-64-char-hex-key

# Admin access
ADMIN_TOKEN=your-admin-token

# AWS (for key rotation)
AWS_REGION=us-east-1
ENCRYPTION_KEY_SECRET_PREFIX=whatsapp-saas/encryption-key
```

### Generate Keys
```bash
# Encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Admin token
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Or use the script
node scripts/generate-encryption-key.js
```

---

## 7. Testing

### Run Security Tests
```bash
# Encryption tests
npm test -- tests/utils/encryption.test.js

# All security tests
npm run test:security

# OWASP tests
npm run test:owasp

# All tests
npm test
```

### Check Dependencies
```bash
# Audit
npm run security:audit

# Fix (if possible)
npm run security:fix
```

---

## 8. Terraform Encryption Verification

### Check RDS Encryption
```hcl
# In terraform/environments/production/main.tf
storage_encrypted = true
kms_key_id = aws_kms_key.rds.arn
```

### Check S3 Encryption
```hcl
# In terraform/environments/production/main.tf
apply_server_side_encryption_by_default {
  sse_algorithm = "AES256"
}
```

### Check ElastiCache Encryption
```hcl
# In terraform/environments/production/main.tf
at_rest_encryption_enabled = true
transit_encryption_enabled = true
kms_key_id = aws_kms_key.elasticache.arn
```

---

## 9. Health Checks

### Encryption System
```javascript
const { healthCheck } = require('./src/utils/encryption');

const status = healthCheck();
console.log(status);
// { healthy: true, keyVersion: 1, algorithm: 'aes-256-gcm', ... }
```

### Rate Limiter
```javascript
const { healthCheck } = require('./src/middleware/rate-limiter');

const status = await healthCheck();
console.log(status);
// { healthy: true, store: 'redis', ... }
```

---

## 10. Security Headers Reference

| Header | Value | Purpose |
|--------|-------|---------|
| `Content-Security-Policy` | Strict policy | XSS prevention |
| `Strict-Transport-Security` | max-age=31536000 | Force HTTPS |
| `X-Frame-Options` | DENY | Clickjacking |
| `X-Content-Type-Options` | nosniff | MIME sniffing |
| `Referrer-Policy` | strict-origin-when-cross-origin | Privacy |
| `Permissions-Policy` | Restrictive | Feature control |

---

## 11. Rate Limit Headers

When rate limited:
```
HTTP/1.1 429 Too Many Requests
RateLimit-Limit: 100
RateLimit-Remaining: 0
RateLimit-Reset: 2025-01-18T12:15:00Z
Retry-After: 900
```

---

## 12. Common Operations

### Check Encryption Status
```bash
node -e "
const { isEncrypted } = require('./src/utils/encryption');
console.log('Is encrypted:', isEncrypted('1:abc:def:ghi'));
"
```

### Re-encrypt with New Key
```javascript
const { reencrypt } = require('./src/utils/encryption');

const oldEncrypted = '1:iv:tag:data';
const newEncrypted = reencrypt(oldEncrypted, 2); // Use key version 2
```

### Custom Error Response
```javascript
const { buildErrorResponse } = require('./src/middleware/error-handler');

const error = new Error('Database connection failed');
const response = buildErrorResponse(error, 500, req);
```

---

## 13. Production Checklist

Before deployment:
- [ ] `ENCRYPTION_KEY` generated and in AWS Secrets Manager
- [ ] `ADMIN_TOKEN` generated and stored securely
- [ ] Database phone numbers encrypted
- [ ] `npm audit` shows 0 vulnerabilities
- [ ] Security headers tested online
- [ ] Rate limiting tested
- [ ] Error handling verified (no leaks)
- [ ] SSL/TLS certificate installed
- [ ] Backups encrypted (Terraform verified)
- [ ] Dependabot enabled
- [ ] Monitoring alerts configured

---

## 14. Incident Response

### Emergency Key Rotation
```bash
# 1. Generate new key
NEW_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# 2. Update environment
export ENCRYPTION_KEY_V2=$NEW_KEY

# 3. Rotate via API or manually
node -e "
const { rotateKey } = require('./src/utils/key-rotation');
rotateKey({ metadata: { reason: 'security-incident' } }).then(console.log);
"
```

### Block IP Address
```javascript
// Add to rate-limiter.js skipRateLimiting()
const blockedIPs = ['1.2.3.4', '5.6.7.8'];
if (blockedIPs.includes(req.ip)) {
  return res.status(403).json({ error: 'Forbidden' });
}
```

---

## 15. Monitoring

### Security Events to Monitor
- Rate limit violations
- Failed authentication attempts
- 429 Too Many Requests
- 401 Unauthorized
- 403 Forbidden
- 500 Internal Server Error
- Unusual error patterns

### Logs Location
- Application: `Backend/logs/`
- Winston logger output
- CloudWatch (production)

---

## 16. Documentation Links

- **Full Security Guide:** `Backend/SECURITY.md`
- **Implementation Summary:** `Backend/SECURITY_IMPLEMENTATION_SUMMARY.md`
- **Environment Setup:** `Backend/env.example`
- **OWASP Top 10:** https://owasp.org/Top10/
- **Helmet.js:** https://helmetjs.github.io/

---

## 17. Support

**Security Issues:** security@example.com
**Responsible Disclosure:** security-disclosure@example.com

**Do not create public GitHub issues for security vulnerabilities.**

---

*Quick Reference v1.0.0 - Last Updated: 2025-01-18*
