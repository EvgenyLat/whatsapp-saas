# Security Tests

Comprehensive security test suite for the WhatsApp SaaS platform.

## Quick Start

```bash
# Install dependencies
cd Backend
npm install

# Set environment variables
cp .env.example .env.test

# Run all security tests
npm run test:security

# Run with coverage
npm run test:security -- --coverage

# Run specific test suite
npm run test:security -- authentication
npm run test:security -- authorization
npm run test:security -- input-validation
```

## Test Suites

| Suite | Tests | Description |
|-------|-------|-------------|
| **authentication.security.test.js** | 30+ | Token validation, expiration, brute force protection |
| **authorization.security.test.js** | 40+ | Access control, data isolation, RBAC |
| **input-validation.security.test.js** | 60+ | SQL injection, XSS, command injection prevention |
| **api-security.test.js** | 45+ | CORS, CSRF, security headers, SSL/TLS |
| **webhook-security.test.js** | 35+ | Signature verification, replay attacks |
| **data-protection.security.test.js** | 40+ | Encryption, PII handling, GDPR compliance |

**Total**: 250+ security tests

## Running Tests

### All Tests

```bash
# Run all
npm run test:security

# With coverage
npm run test:security -- --coverage

# Watch mode
npm run test:security -- --watch

# Verbose output
npm run test:security -- --verbose
```

### Specific Suites

```bash
# Authentication tests
npm run test:security -- authentication

# Authorization tests
npm run test:security -- authorization

# Input validation tests
npm run test:security -- input-validation

# API security tests
npm run test:security -- api-security

# Webhook security tests
npm run test:security -- webhook-security

# Data protection tests
npm run test:security -- data-protection
```

### Test Categories

```bash
# SQL injection tests
npm run test:security -- --testNamePattern="SQL Injection"

# XSS tests
npm run test:security -- --testNamePattern="XSS"

# Rate limiting tests
npm run test:security -- --testNamePattern="Rate Limiting"

# Encryption tests
npm run test:security -- --testNamePattern="Encryption"
```

## Test Structure

```
Backend/tests/security/
├── suites/                           # Test suites
│   ├── authentication.security.test.js   # 30+ tests
│   ├── authorization.security.test.js    # 40+ tests
│   ├── input-validation.security.test.js # 60+ tests
│   ├── api-security.test.js             # 45+ tests
│   ├── webhook-security.test.js         # 35+ tests
│   └── data-protection.security.test.js # 40+ tests
├── fixtures/                         # Test data
│   └── security.fixtures.js
├── helpers/                          # Test helpers
│   └── security-helpers.js
├── jest.config.js                    # Jest configuration
├── setup.js                          # Test setup
├── README.md                         # This file
├── SECURITY_TESTING_GUIDE.md         # Comprehensive guide
└── SECURITY_TEST_REPORT.md           # Latest test report
```

## Environment Variables

Required in `.env.test`:

```env
NODE_ENV=test
JWT_SECRET=test-jwt-secret
ENCRYPTION_KEY=64-character-hex-string
WHATSAPP_WEBHOOK_SECRET=test-webhook-secret
WHATSAPP_VERIFY_TOKEN=test-verify-token
DB_NAME=whatsapp_saas_test
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=postgres
```

## Test Categories

### 1. Authentication Security

Tests admin token validation, expiration, brute force protection, and session management.

**Key Tests**:
- Valid/invalid token acceptance
- Token expiration handling
- Brute force rate limiting
- Session isolation
- Token tampering prevention

### 2. Authorization Security

Tests access control, data isolation, and role-based permissions.

**Key Tests**:
- Endpoint access control
- Cross-salon data isolation
- IDOR prevention
- Role-based access control
- API key scopes

### 3. Input Validation

Tests protection against injection attacks and malicious input.

**Key Tests**:
- SQL injection prevention (10+ payloads)
- XSS prevention (15+ payloads)
- Command injection blocking
- Path traversal prevention
- NoSQL injection blocking
- Rate limiting

### 4. API Security

Tests CORS, CSRF, security headers, and API best practices.

**Key Tests**:
- CORS configuration
- CSRF token validation
- Security headers (HSTS, CSP, etc.)
- SSL/TLS enforcement
- Content-Type validation
- Request size limits

### 5. Webhook Security

Tests signature verification and webhook-specific security.

**Key Tests**:
- HMAC-SHA256 signature verification
- Replay attack prevention
- Timestamp validation
- Payload validation
- Rate limiting
- Media URL validation

### 6. Data Protection

Tests encryption, PII handling, and compliance.

**Key Tests**:
- Encryption at rest (AES-256-GCM)
- PII masking in logs
- Secrets management
- GDPR compliance
- Data sanitization
- Backup security

## Automated Scanning

Security tests are automatically run on:
- Every PR to `main`/`develop`
- Every push to `main`
- Weekly security scan (Sunday midnight)
- Manual trigger via workflow_dispatch

See `.github/workflows/security.yml`

## Tools Integration

### npm audit

```bash
npm audit --audit-level=moderate
```

### Snyk

```bash
npx snyk test --severity-threshold=high
```

### OWASP ZAP

```bash
# Baseline scan
docker run -v $(pwd):/zap/wrk/:rw \
  -t owasp/zap2docker-stable zap-baseline.py \
  -t http://localhost:4000

# Full scan
docker run -v $(pwd):/zap/wrk/:rw \
  -t owasp/zap2docker-stable zap-full-scan.py \
  -t http://localhost:4000
```

## Writing Security Tests

### Basic Test Structure

```javascript
const request = require('supertest');
const { app } = require('../../../src/app');
const fixtures = require('../fixtures/security.fixtures');
const helpers = require('../helpers/security-helpers');

describe('Security Feature', () => {
  let testData;

  beforeAll(async () => {
    testData = await fixtures.setupSecurityTest();
  });

  afterAll(async () => {
    await fixtures.cleanupSecurityTest(testData);
  });

  it('should prevent security vulnerability', async () => {
    const maliciousInput = helpers.getSQLInjectionPayloads()[0];

    const response = await request(app)
      .post('/api/endpoint')
      .set('Authorization', `Bearer ${testData.validToken}`)
      .send({ input: maliciousInput })
      .expect(400);

    expect(response.body.error).toContain('invalid');
  });
});
```

### Testing Attack Vectors

```javascript
// SQL Injection
const sqlPayloads = helpers.getSQLInjectionPayloads();
for (const payload of sqlPayloads) {
  // Test each payload
}

// XSS
const xssPayloads = helpers.getXSSPayloads();
for (const payload of xssPayloads) {
  // Test each payload
}

// Command Injection
const cmdPayloads = helpers.getCommandInjectionPayloads();
for (const payload of cmdPayloads) {
  // Test each payload
}
```

## Custom Matchers

```javascript
// Check for security headers
expect(response).toHaveSecurityHeaders();

// Check for masked PII
expect(logOutput).toContainMaskedPII('phone');

// Check for rate limiting
expect(response).toBeRateLimited();

// Check for encryption
expect(databaseValue).toBeEncrypted();

// Check SQL injection prevention
expect(output).toPreventSQLInjection();

// Check XSS prevention
expect(output).toPreventXSS();
```

## Troubleshooting

### Tests Fail with Timeout

```bash
# Increase timeout
JEST_TIMEOUT=60000 npm run test:security
```

### Database Connection Errors

```bash
# Check database exists
psql -l | grep whatsapp_saas_test

# Create if missing
createdb whatsapp_saas_test

# Run migrations
npm run migrate -- --env test
```

### Rate Limit Tests Fail

```bash
# Clear Redis cache
redis-cli FLUSHALL

# Or restart Redis
brew services restart redis  # macOS
sudo systemctl restart redis # Linux
```

## CI/CD Integration

Tests run automatically in GitHub Actions. See workflow configuration:

- `.github/workflows/security.yml` - Main security workflow
- Runs dependency scans, SAST, DAST, secrets detection
- Blocks deployment on CRITICAL/HIGH vulnerabilities

## Coverage Targets

| Category | Target | Current |
|----------|--------|---------|
| Overall | 75%+ | TBD |
| Authentication | 90%+ | TBD |
| Authorization | 90%+ | TBD |
| Input Validation | 95%+ | TBD |
| API Security | 85%+ | TBD |
| Data Protection | 90%+ | TBD |

## Documentation

**Full Guide**: [SECURITY_TESTING_GUIDE.md](./SECURITY_TESTING_GUIDE.md)

Includes:
- Comprehensive test descriptions
- Attack vector examples
- Security best practices
- Penetration testing checklist
- Incident response workflow

**Test Report**: [SECURITY_TEST_REPORT.md](./SECURITY_TEST_REPORT.md)

Includes:
- Latest security scan results
- Vulnerability findings
- Remediation recommendations
- Compliance status

## Security Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [CWE Top 25](https://cwe.mitre.org/top25/)

## Support

- **Documentation**: See SECURITY_TESTING_GUIDE.md
- **Issues**: Create GitHub issue with 'security' label
- **Questions**: Ask in team security channel

---

**Last Updated**: 2025-01-18
**Jest Version**: 29.7.0
**Test Framework**: Jest + Supertest
**Security Tools**: OWASP ZAP, Snyk, npm audit
