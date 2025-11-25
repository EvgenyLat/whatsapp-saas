# Security Documentation

## Overview

This document outlines the security measures implemented in the WhatsApp SaaS Platform to protect against OWASP Top 10 vulnerabilities and ensure data protection compliance.

**Security Compliance:**
- OWASP Top 10 2021
- PCI DSS 3.2.1
- GDPR Article 32
- NIST Cybersecurity Framework
- CIS Controls v8

**Last Updated:** 2025-01-18

---

## Table of Contents

1. [Security Features](#security-features)
2. [Encryption](#encryption)
3. [Authentication & Authorization](#authentication--authorization)
4. [Rate Limiting](#rate-limiting)
5. [Security Headers](#security-headers)
6. [Error Handling](#error-handling)
7. [Dependency Management](#dependency-management)
8. [Database Security](#database-security)
9. [Key Rotation](#key-rotation)
10. [Security Testing](#security-testing)
11. [Incident Response](#incident-response)
12. [Security Checklist](#security-checklist)

---

## Security Features

### Implemented Security Controls

#### 1. Phone Number Encryption (HIGH PRIORITY) ✅
**Status:** Implemented
**OWASP:** A02:2021 - Cryptographic Failures
**Implementation:** `Backend/src/utils/encryption.js`

- **Algorithm:** AES-256-GCM (Authenticated Encryption)
- **Key Size:** 256 bits (32 bytes)
- **IV Size:** 96 bits (12 bytes, recommended for GCM)
- **Authentication Tag:** 128 bits (prevents tampering)

**Features:**
- Unique IV per encryption operation
- Key versioning for zero-downtime rotation
- Constant-time comparison to prevent timing attacks
- Comprehensive error handling without information disclosure

**Usage:**
```javascript
const { encryptPhoneNumber, decryptPhoneNumber } = require('./src/utils/encryption');

// Encrypt before storing
const encrypted = encryptPhoneNumber('+1234567890');

// Decrypt when retrieving
const decrypted = decryptPhoneNumber(encrypted);
```

**Migration:**
```bash
# Dry run to test migration
node scripts/encrypt-phone-numbers.js --dry-run

# Create backup before migration
node scripts/encrypt-phone-numbers.js --backup

# Run actual migration
node scripts/encrypt-phone-numbers.js
```

#### 2. Backup Encryption ✅
**Status:** Implemented in Terraform
**Location:** `terraform/environments/production/main.tf`

- **S3 Bucket Encryption:** AES-256 with AWS KMS
- **RDS Snapshots:** Encrypted with AWS KMS
- **Terraform Configuration:**
  ```hcl
  encryption {
    encryption_type = "KMS"
    kms_key_id      = aws_kms_key.rds_encryption.arn
  }
  ```

#### 3. Key Rotation ✅
**Status:** Implemented
**NIST:** SP 800-57 Key Management
**Implementation:** `Backend/src/utils/key-rotation.js`

**Features:**
- AWS Secrets Manager integration
- Automated rotation scheduling
- Zero-downtime key updates
- Backward compatibility with old keys
- Re-encryption utilities

**Setup:**
```javascript
const { rotateKey, scheduleKeyRotation } = require('./src/utils/key-rotation');

// Manual rotation
const result = await rotateKey({
  storeInSecretsManager: true,
  metadata: { rotatedBy: 'admin@example.com' }
});

// Automated rotation (Lambda/Cron)
const status = await scheduleKeyRotation({
  maxKeyAgeMonths: 12,
  dryRun: false
});
```

**Recommended Rotation Schedule:**
- Development: Every 12 months
- Production: Every 6 months
- After security incident: Immediately

#### 4. Security Headers ✅
**Status:** Implemented
**OWASP:** A05:2021 - Security Misconfiguration
**Implementation:** `Backend/src/middleware/security.js`

**Headers Configured:**

| Header | Value | Purpose |
|--------|-------|---------|
| `Content-Security-Policy` | Strict policy with nonce | XSS prevention |
| `Strict-Transport-Security` | max-age=31536000; includeSubDomains; preload | Force HTTPS |
| `X-Frame-Options` | DENY | Clickjacking prevention |
| `X-Content-Type-Options` | nosniff | MIME sniffing prevention |
| `X-DNS-Prefetch-Control` | off | Privacy protection |
| `Referrer-Policy` | strict-origin-when-cross-origin | Privacy control |
| `Permissions-Policy` | Restrictive | Feature control |

**Content Security Policy (CSP):**
```
default-src 'self';
script-src 'self' 'nonce-{random}';
style-src 'self' 'nonce-{random}';
img-src 'self' data: blob: https://graph.facebook.com;
connect-src 'self' https://api.openai.com https://graph.facebook.com;
frame-src 'none';
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'none';
```

#### 5. Error Message Sanitization ✅
**Status:** Implemented
**OWASP:** A05:2021 - Security Misconfiguration
**CWE:** CWE-209 Information Exposure
**Implementation:** `Backend/src/middleware/error-handler.js`

**Security Features:**
- Stack trace sanitization in production
- Sensitive data redaction (API keys, tokens, passwords)
- No information disclosure to attackers
- Detailed logging for debugging (server-side only)
- Generic error messages in production

**Redacted Patterns:**
- API keys and tokens
- Database connection strings
- Email addresses (partial)
- Phone numbers
- Credit card numbers
- IP addresses (internal)
- File paths
- Session IDs and UUIDs
- JWT tokens

**Example:**
```javascript
// Development response
{
  "error": "Internal Server Error",
  "message": "Database connection failed: ECONNREFUSED",
  "stack": "Error: ...",
  "statusCode": 500
}

// Production response
{
  "error": "Internal Server Error",
  "message": "An internal error occurred. Please try again later.",
  "statusCode": 500,
  "errorId": "ERR-ABC123"
}
```

#### 6. npm Dependencies Audit ✅
**Status:** Implemented
**OWASP:** A06:2021 - Vulnerable Components

**Current Status:** 0 known vulnerabilities

**Automated Checks:**
- Dependabot: Weekly automated PR for updates
- GitHub Security Advisories: Enabled
- npm audit: Run in CI/CD pipeline

**Manual Audit:**
```bash
# Check for vulnerabilities
npm audit --audit-level=moderate

# Fix automatically (if possible)
npm audit fix

# Force fix (may introduce breaking changes)
npm audit fix --force
```

**Dependency Update Strategy:**
- Security patches: Immediate
- Minor updates: Weekly review
- Major updates: Monthly review with testing

#### 7. Rate Limiting ✅
**Status:** Implemented
**OWASP:** API4:2023 Unrestricted Resource Consumption
**Implementation:** `Backend/src/middleware/rate-limiter.js`

**Rate Limit Configuration:**

| Endpoint Type | Limit | Window | Store |
|---------------|-------|--------|-------|
| Authentication | 5 requests | 15 minutes | Redis |
| Admin | 20 requests | 15 minutes | Redis |
| Webhook | 100 requests | 15 minutes | Redis |
| API | 60 requests | 1 minute | Redis |
| Global | 1000 requests | 1 minute | Redis |

**Features:**
- Redis-backed distributed rate limiting
- Automatic fallback to memory store
- Rate limit headers (RateLimit-*)
- Security event logging
- Configurable per endpoint

**Usage:**
```javascript
const { authLimiter, adminLimiter, apiLimiter } = require('./src/middleware/rate-limiter');

// Apply to authentication endpoints
app.post('/auth/login', authLimiter, loginHandler);

// Apply to admin endpoints
app.use('/admin', adminLimiter);

// Apply to API endpoints
app.use('/api', apiLimiter);
```

---

## Encryption

### AES-256-GCM Encryption

**Algorithm Details:**
- **Cipher:** AES-256-GCM (Advanced Encryption Standard, Galois/Counter Mode)
- **Key Length:** 256 bits (32 bytes)
- **IV Length:** 96 bits (12 bytes)
- **Tag Length:** 128 bits (16 bytes)

**Security Properties:**
- **Confidentiality:** 256-bit AES encryption
- **Integrity:** Authentication tag prevents tampering
- **Authenticity:** AEAD (Authenticated Encryption with Associated Data)

**Key Generation:**
```bash
# Generate new encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Environment Setup:**
```bash
# Add to .env
ENCRYPTION_KEY=your-64-character-hex-key-here
ENCRYPTION_KEY_CREATED_AT=2025-01-01T00:00:00Z
```

**Best Practices:**
1. Use AWS Secrets Manager in production
2. Never commit keys to version control
3. Rotate keys every 6-12 months
4. Keep old keys for decryption during rotation
5. Use different keys per environment

---

## Authentication & Authorization

### Admin Token Authentication

**Implementation:** Bearer token in `X-Admin-Token` header

**Token Generation:**
```bash
# Generate secure admin token
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Usage:**
```bash
curl -H "X-Admin-Token: YOUR_TOKEN" https://api.example.com/admin/salons
```

**Security Considerations:**
- Token should be at least 32 bytes (256 bits)
- Store in environment variables, not code
- Use HTTPS for all admin requests
- Implement token rotation policy
- Log all admin access attempts

### Future Enhancements

**Planned Authentication Improvements:**
1. JWT-based authentication
2. Multi-factor authentication (MFA)
3. OAuth2/OpenID Connect integration
4. Role-based access control (RBAC)
5. Session management with Redis

---

## Rate Limiting

### Strategy

**Fixed Window Rate Limiting:**
- Simple and efficient
- Memory-light implementation
- Good for most use cases

**Sliding Window Rate Limiting:**
- More accurate
- Prevents burst attacks
- Redis-based implementation

### Configuration

**Global Rate Limit:**
```javascript
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 1000,            // 1000 requests per window
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(globalLimiter);
```

**Custom Rate Limiter:**
```javascript
const { createRateLimiter } = require('./src/middleware/rate-limiter');

const customLimiter = createRateLimiter({
  windowMs: 60000,
  max: 10,
  prefix: 'custom-endpoint',
  message: 'Too many requests to custom endpoint'
});
```

### Monitoring

**Rate Limit Events:**
- Logged to Winston logger
- Security team notifications
- Metrics tracked in Prometheus

**Detection of Attacks:**
- Repeated rate limit violations
- Distributed attacks (multiple IPs)
- Pattern-based detection

---

## Security Headers

### Implementation

All security headers are configured in `Backend/src/middleware/security.js` using Helmet.js.

### Testing Security Headers

**Online Tools:**
- [Security Headers](https://securityheaders.com/)
- [Mozilla Observatory](https://observatory.mozilla.org/)
- [SSL Labs](https://www.ssllabs.com/ssltest/)

**Expected Scores:**
- Security Headers: A+
- Mozilla Observatory: A+
- SSL Labs: A or higher

### Header Customization

**CSP Customization:**
Edit `getCSPDirectives()` in `Backend/src/middleware/security.js`:

```javascript
connectSrc: [
  "'self'",
  'https://api.example.com',  // Add your API
],
```

---

## Error Handling

### Error Response Format

**Development:**
```json
{
  "error": "Bad Request",
  "message": "Validation failed: phone_number is required",
  "statusCode": 400,
  "timestamp": "2025-01-18T12:00:00Z",
  "errorId": "ERR-ABC123",
  "stack": "Error: Validation failed..."
}
```

**Production:**
```json
{
  "error": "Bad Request",
  "message": "Invalid request. Please check your input and try again.",
  "statusCode": 400,
  "timestamp": "2025-01-18T12:00:00Z",
  "errorId": "ERR-ABC123"
}
```

### Error Logging

All errors are logged with:
- Error ID (for tracking)
- Request context (path, method, IP)
- User context (if authenticated)
- Sanitized stack trace
- Timestamp

### Sensitive Data Redaction

**Automatically Redacted:**
- Passwords and secrets
- API keys and tokens
- Database credentials
- Email addresses
- Phone numbers
- Credit card numbers
- IP addresses (internal)
- File paths
- Session IDs

---

## Dependency Management

### Automated Updates

**Dependabot Configuration:**
- Weekly dependency updates
- Automated PR creation
- Security vulnerability alerts
- Grouped updates (minor/patch)

**Manual Review Required:**
- Major version updates
- Security-critical dependencies
- Breaking changes

### Security Scanning

**Tools Used:**
- npm audit (built-in)
- Dependabot (GitHub)
- Snyk (optional)
- OWASP Dependency-Check (optional)

**CI/CD Integration:**
```yaml
- name: Security Audit
  run: npm audit --audit-level=moderate
```

---

## Database Security

### Encryption at Rest

**RDS Configuration:**
- Encryption enabled with AWS KMS
- Automated backups encrypted
- Snapshots encrypted

**Sensitive Data:**
- Phone numbers: AES-256-GCM encrypted
- Future: Email addresses, names (if needed)

### Connection Security

**TLS/SSL:**
- Force SSL connections in production
- Certificate validation enabled

**Connection Pooling:**
- Limited connections (prevents exhaustion)
- Connection timeout configured
- Statement caching enabled

### Query Security

**Prisma ORM:**
- Parameterized queries (SQL injection prevention)
- Input validation with Joi
- Type safety with TypeScript schemas

---

## Key Rotation

### Rotation Process

**Step 1: Generate New Key**
```javascript
const { rotateKey } = require('./src/utils/key-rotation');

const result = await rotateKey({
  storeInSecretsManager: true,
  metadata: { rotatedBy: 'admin@example.com' }
});
```

**Step 2: Update Environment**
```bash
# Old key remains for decryption
ENCRYPTION_KEY_V1=old-key-here

# New key used for encryption
ENCRYPTION_KEY=new-key-here
```

**Step 3: Re-encrypt Data (Optional)**
```bash
# Re-encrypt all phone numbers with new key
node scripts/encrypt-phone-numbers.js --batch-size=100
```

**Step 4: Retire Old Key**
After grace period (e.g., 30 days), remove old key from environment.

### Automated Rotation

**Lambda Function (AWS):**
```javascript
exports.handler = async (event) => {
  const { scheduleKeyRotation } = require('./src/utils/key-rotation');

  return await scheduleKeyRotation({
    maxKeyAgeMonths: 12
  });
};
```

**CloudWatch Events Rule:**
```hcl
resource "aws_cloudwatch_event_rule" "key_rotation" {
  name                = "whatsapp-saas-key-rotation"
  schedule_expression = "rate(6 months)"
}
```

---

## Security Testing

### Unit Tests

**Encryption Tests:**
```bash
npm test -- tests/utils/encryption.test.js
```

**Coverage:**
- Encryption/decryption functionality
- Phone number validation
- Key management
- Error handling
- Security properties

### Integration Tests

**Security Middleware Tests:**
```bash
npm run test:security
```

**OWASP Tests:**
```bash
npm run test:owasp
```

### Penetration Testing

**Recommended Tools:**
- OWASP ZAP
- Burp Suite
- Nmap
- SQLMap
- Metasploit

**Test Frequency:**
- Before production deployment
- After major security updates
- Quarterly security audits

---

## Incident Response

### Security Incident Procedure

**Step 1: Detection**
- Monitor logs for suspicious activity
- Rate limit violations
- Failed authentication attempts
- Unusual error patterns

**Step 2: Containment**
- Revoke compromised credentials
- Block malicious IPs
- Disable affected endpoints
- Enable enhanced logging

**Step 3: Investigation**
- Review access logs
- Identify attack vector
- Assess data exposure
- Document findings

**Step 4: Recovery**
- Rotate all keys and tokens
- Patch vulnerabilities
- Restore from backups (if needed)
- Re-encrypt sensitive data

**Step 5: Post-Incident**
- Update security policies
- Improve monitoring
- Train team members
- Notify affected parties (if required by GDPR)

### Contact Information

**Security Team:**
- Email: security@example.com
- On-call: +1-XXX-XXX-XXXX
- Slack: #security-incidents

---

## Security Checklist

### Pre-Deployment Checklist

- [ ] All encryption keys generated and stored securely
- [ ] AWS Secrets Manager configured for production
- [ ] Database backups encrypted
- [ ] SSL/TLS certificates installed
- [ ] Security headers configured and tested
- [ ] Rate limiting enabled on all endpoints
- [ ] Error handling tested (no information disclosure)
- [ ] npm audit shows 0 vulnerabilities
- [ ] Dependabot enabled
- [ ] Sensitive data encrypted (phone numbers)
- [ ] CORS configured for production domains
- [ ] Admin tokens rotated
- [ ] Logging configured and tested
- [ ] Monitoring alerts set up
- [ ] Incident response plan documented
- [ ] Security testing completed

### Regular Maintenance

**Daily:**
- [ ] Review security logs
- [ ] Monitor rate limit violations

**Weekly:**
- [ ] Review Dependabot PRs
- [ ] Check for security advisories
- [ ] Review error logs

**Monthly:**
- [ ] Run npm audit
- [ ] Review access logs
- [ ] Update security documentation

**Quarterly:**
- [ ] Rotate admin tokens
- [ ] Security audit
- [ ] Penetration testing
- [ ] Review and update policies

**Annually:**
- [ ] Rotate encryption keys
- [ ] Full security review
- [ ] Update compliance documentation
- [ ] Team security training

---

## References

### OWASP Resources
- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)

### Compliance Standards
- [PCI DSS 3.2.1](https://www.pcisecuritystandards.org/)
- [GDPR Article 32](https://gdpr-info.eu/art-32-gdpr/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

### Best Practices
- [NIST SP 800-57: Key Management](https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final)
- [NIST SP 800-38D: GCM Mode](https://csrc.nist.gov/publications/detail/sp/800-38d/final)
- [CIS Controls v8](https://www.cisecurity.org/controls/v8)

---

## Support

For security questions or to report vulnerabilities, contact:
- **Email:** security@example.com
- **Responsible Disclosure:** security-disclosure@example.com

**Please do not create public GitHub issues for security vulnerabilities.**

---

*Last Updated: 2025-01-18*
*Version: 1.0.0*
*Maintained by: Security Team*
