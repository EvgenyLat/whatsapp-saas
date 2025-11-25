# Security Testing Guide

Comprehensive guide for security testing of the WhatsApp SaaS platform.

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Security Test Suites](#security-test-suites)
4. [Automated Security Scanning](#automated-security-scanning)
5. [Manual Security Testing](#manual-security-testing)
6. [Penetration Testing](#penetration-testing)
7. [Security Best Practices](#security-best-practices)
8. [Incident Response](#incident-response)

---

## Overview

### Security Testing Pyramid

```
           /\
          /  \  Manual Penetration Testing (Quarterly)
         /____\
        /      \  Automated Dynamic Scans (Weekly)
       /________\
      /          \  Automated Security Tests (Every PR)
     /____ ________\
    /              \  Dependency Scans (Every Commit)
   /________________\
```

### Test Coverage

| Category | Automated | Manual | Frequency |
|----------|-----------|--------|-----------|
| Dependency Scanning | ✅ Yes | ❌ No | Every commit |
| Security Unit Tests | ✅ Yes | ❌ No | Every PR |
| SAST (Static Analysis) | ✅ Yes | ❌ No | Every PR |
| DAST (Dynamic Analysis) | ✅ Yes | ✅ Yes | Weekly + Quarterly |
| Penetration Testing | ❌ No | ✅ Yes | Quarterly |
| Code Review | ❌ No | ✅ Yes | Every PR |

---

## Quick Start

### Prerequisites

```bash
# Node.js 18+
node --version

# Security tools
npm install -g snyk
brew install zap  # OWASP ZAP (macOS)
```

### Installation

```bash
# Navigate to security tests
cd Backend/tests/security

# Install dependencies
npm install

# Install test-specific tools
npm install --save-dev jest-security
```

### Environment Setup

Create `.env.security` in the `Backend/` directory:

```env
# Test Environment
NODE_ENV=security_test
PORT=4002

# Database
DB_HOST=localhost
DB_NAME=whatsapp_saas_security_test

# Security Test Credentials
SECURITY_TEST_ADMIN_TOKEN=security-test-token
SECURITY_TEST_WEBHOOK_SECRET=security-test-webhook-secret

# Attack Simulation
ENABLE_ATTACK_SIMULATION=true
ALLOW_SECURITY_TESTS=true
```

### Running Security Tests

```bash
# Run all security tests
npm run test:security

# Run specific category
npm run test:security:auth
npm run test:security:injection
npm run test:security:xss

# Run with coverage
npm run test:security -- --coverage

# Run vulnerability scan
npm run security:scan
```

---

## Security Test Suites

### 1. Authentication Security Tests

**File**: `suites/authentication.security.test.js`

**Test Coverage** (15 tests):

#### Admin Token Validation
```javascript
describe('Admin Token Validation', () => {
  it('should accept valid admin token', async () => {
    const response = await request(app)
      .get('/admin/stats/salon-123')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);
  });

  it('should reject invalid token', async () => {
    const response = await request(app)
      .get('/admin/stats/salon-123')
      .set('Authorization', 'Bearer invalid_token')
      .expect(401);

    expect(response.body.error).toMatch(/invalid|unauthorized/i);
  });

  it('should reject missing token', async () => {
    const response = await request(app)
      .get('/admin/stats/salon-123')
      .expect(401);
  });

  it('should reject malformed token', async () => {
    const response = await request(app)
      .get('/admin/stats/salon-123')
      .set('Authorization', 'NotBearer token')
      .expect(401);
  });
});
```

#### Token Expiration
```javascript
describe('Token Expiration', () => {
  it('should reject expired token', async () => {
    const expiredToken = jwt.sign(
      { salon_id: 'salon-123' },
      JWT_SECRET,
      { expiresIn: '-1h' } // Expired 1 hour ago
    );

    const response = await request(app)
      .get('/admin/stats/salon-123')
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(401);

    expect(response.body.error).toMatch(/expired/i);
  });
});
```

#### Brute Force Protection
```javascript
describe('Brute Force Protection', () => {
  it('should rate limit after 5 failed login attempts', async () => {
    const attempts = [];

    for (let i = 0; i < 6; i++) {
      const response = await request(app)
        .post('/auth/login')
        .send({ token: 'invalid' });

      attempts.push(response);
    }

    expect(attempts[5].status).toBe(429);
    expect(attempts[5].headers).toHaveProperty('retry-after');
  });
});
```

---

### 2. Authorization Security Tests

**File**: `suites/authorization.security.test.js`

**Test Coverage** (12 tests):

#### Endpoint Access Control
```javascript
describe('Endpoint Access Control', () => {
  it('should prevent cross-salon data access', async () => {
    const salon1Token = generateToken({ salon_id: 'salon-1' });

    const response = await request(app)
      .get('/admin/bookings/salon-2')  // Trying to access salon-2
      .set('Authorization', `Bearer ${salon1Token}`)
      .expect(403);

    expect(response.body.error).toMatch(/forbidden|unauthorized/i);
  });
});
```

#### Data Isolation
```javascript
describe('Data Isolation', () => {
  it('should only return data for authorized salon', async () => {
    const salon1Token = generateToken({ salon_id: 'salon-1' });

    const response = await request(app)
      .get('/admin/bookings/salon-1')
      .set('Authorization', `Bearer ${salon1Token}`)
      .expect(200);

    // Verify all returned bookings belong to salon-1
    response.body.data.forEach(booking => {
      expect(booking.salon_id).toBe('salon-1');
    });
  });
});
```

---

### 3. Input Validation Security Tests

**File**: `suites/input-validation.security.test.js`

**Test Coverage** (25 tests):

#### SQL Injection Prevention
```javascript
describe('SQL Injection Prevention', () => {
  const sqlInjectionPayloads = [
    "' OR '1'='1",
    "'; DROP TABLE users--",
    "1' UNION SELECT * FROM salons--",
    "admin'--",
    "' OR 1=1--",
  ];

  sqlInjectionPayloads.forEach(payload => {
    it(`should reject SQL injection attempt: ${payload}`, async () => {
      const response = await request(app)
        .get('/admin/bookings/salon-123')
        .query({ search: payload })
        .set('Authorization', `Bearer ${validToken}`)
        .expect(400);

      // Verify no data was returned
      expect(response.body.data || []).toHaveLength(0);
    });
  });
});
```

#### XSS Prevention
```javascript
describe('XSS Prevention', () => {
  const xssPayloads = [
    '<script>alert("XSS")</script>',
    '<img src=x onerror=alert(1)>',
    'javascript:alert(1)',
    '<svg/onload=alert(1)>',
    '"><script>alert(String.fromCharCode(88,83,83))</script>',
  ];

  xssPayloads.forEach(payload => {
    it(`should sanitize XSS payload: ${payload}`, async () => {
      const response = await request(app)
        .post('/admin/bookings')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          salon_id: 'salon-123',
          customer_name: payload,
          service_type: 'Haircut',
        });

      if (response.status === 200) {
        const booking = await Booking.findById(response.body.id);
        // Verify payload was sanitized
        expect(booking.customer_name).not.toContain('<script>');
        expect(booking.customer_name).not.toContain('onerror');
      }
    });
  });
});
```

#### Command Injection Prevention
```javascript
describe('Command Injection Prevention', () => {
  const commandInjectionPayloads = [
    '; rm -rf /',
    '| cat /etc/passwd',
    '`whoami`',
    '$(ls -la)',
    '; cat /etc/shadow',
  ];

  commandInjectionPayloads.forEach(payload => {
    it(`should reject command injection: ${payload}`, async () => {
      const response = await request(app)
        .post('/admin/export')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ filename: payload })
        .expect(400);
    });
  });
});
```

#### Path Traversal Prevention
```javascript
describe('Path Traversal Prevention', () => {
  const pathTraversalPayloads = [
    '../../../etc/passwd',
    '..\\..\\..\\windows\\system32',
    '....//....//....//etc/passwd',
    '/etc/passwd',
  ];

  pathTraversalPayloads.forEach(payload => {
    it(`should reject path traversal: ${payload}`, async () => {
      const response = await request(app)
        .get('/admin/files')
        .query({ path: payload })
        .set('Authorization', `Bearer ${validToken}`)
        .expect(400);
    });
  });
});
```

---

### 4. API Security Tests

**File**: `suites/api-security.test.js`

**Test Coverage** (18 tests):

#### Security Headers
```javascript
describe('Security Headers', () => {
  it('should include all required security headers', async () => {
    const response = await request(app)
      .get('/healthz')
      .expect(200);

    // HSTS
    expect(response.headers['strict-transport-security']).toBeDefined();
    expect(response.headers['strict-transport-security']).toMatch(/max-age=/);

    // X-Content-Type-Options
    expect(response.headers['x-content-type-options']).toBe('nosniff');

    // X-Frame-Options
    expect(response.headers['x-frame-options']).toMatch(/DENY|SAMEORIGIN/);

    // Content-Security-Policy
    expect(response.headers['content-security-policy']).toBeDefined();

    // X-XSS-Protection
    expect(response.headers['x-xss-protection']).toBe('1; mode=block');
  });
});
```

#### CORS Configuration
```javascript
describe('CORS Configuration', () => {
  it('should allow requests from whitelisted origins', async () => {
    const response = await request(app)
      .get('/api/health')
      .set('Origin', 'https://app.example.com')
      .expect(200);

    expect(response.headers['access-control-allow-origin']).toBe('https://app.example.com');
  });

  it('should block requests from non-whitelisted origins', async () => {
    const response = await request(app)
      .get('/api/health')
      .set('Origin', 'https://malicious.com');

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
});
```

---

### 5. Webhook Security Tests

**File**: `suites/webhook-security.test.js`

**Test Coverage** (20 tests):

#### Signature Verification
```javascript
describe('Webhook Signature Verification', () => {
  it('should reject webhook without signature', async () => {
    const payload = { message: 'test' };

    const response = await request(app)
      .post('/webhook/whatsapp')
      .send(payload)
      .expect(401);

    expect(response.body.error).toMatch(/signature/i);
  });

  it('should reject webhook with invalid signature', async () => {
    const payload = { message: 'test' };

    const response = await request(app)
      .post('/webhook/whatsapp')
      .set('X-Hub-Signature-256', 'sha256=invalid')
      .send(payload)
      .expect(401);
  });

  it('should accept webhook with valid signature', async () => {
    const payload = { message: 'test' };
    const signature = generateSignature(payload, WEBHOOK_SECRET);

    const response = await request(app)
      .post('/webhook/whatsapp')
      .set('X-Hub-Signature-256', signature)
      .send(payload)
      .expect(200);
  });
});
```

#### Replay Attack Prevention
```javascript
describe('Replay Attack Prevention', () => {
  it('should reject webhook with old timestamp', async () => {
    const payload = {
      timestamp: Date.now() - 600000, // 10 minutes ago
      message: 'test',
    };

    const signature = generateSignature(payload, WEBHOOK_SECRET);

    const response = await request(app)
      .post('/webhook/whatsapp')
      .set('X-Hub-Signature-256', signature)
      .send(payload)
      .expect(401);

    expect(response.body.error).toMatch(/timestamp|expired/i);
  });
});
```

---

### 6. Data Protection Tests

**File**: `suites/data-protection.security.test.js`

**Test Coverage** (15 tests):

#### PII Handling
```javascript
describe('PII Handling', () => {
  it('should mask phone numbers in logs', async () => {
    const logs = [];
    const originalLog = console.log;
    console.log = (...args) => logs.push(args.join(' '));

    await processMessage({
      from: '+1234567890',
      body: 'Test message',
    });

    console.log = originalLog;

    // Verify phone number is masked
    const logsText = logs.join('\n');
    expect(logsText).not.toContain('+1234567890');
    expect(logsText).toMatch(/\+123\*\*\*\*890/); // Masked format
  });

  it('should not expose PII in error messages', async () => {
    const response = await request(app)
      .get('/admin/customer/+1234567890')
      .set('Authorization', 'Bearer invalid')
      .expect(401);

    expect(response.body.error).not.toContain('+1234567890');
  });
});
```

#### Secrets Management
```javascript
describe('Secrets Management', () => {
  it('should not expose secrets in responses', async () => {
    const response = await request(app)
      .get('/admin/config')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);

    // Verify no secrets in response
    const responseText = JSON.stringify(response.body);
    expect(responseText).not.toContain(process.env.OPENAI_API_KEY);
    expect(responseText).not.toContain(process.env.WHATSAPP_WEBHOOK_SECRET);
    expect(responseText).not.toContain(process.env.JWT_SECRET);
  });

  it('should not log secrets in debug mode', async () => {
    // Test implementation
  });
});
```

---

## Automated Security Scanning

### Dependency Scanning

#### npm audit
```bash
# Run npm audit
npm audit

# Fix automatically
npm audit fix

# Force fix (may introduce breaking changes)
npm audit fix --force

# Generate JSON report
npm audit --json > audit-report.json
```

#### Snyk
```bash
# Install Snyk CLI
npm install -g snyk

# Authenticate
snyk auth

# Test for vulnerabilities
snyk test

# Monitor continuously
snyk monitor

# Fix vulnerabilities
snyk fix
```

### SAST (Static Application Security Testing)

#### SonarQube
```bash
# Run SonarQube scan
sonar-scanner \
  -Dsonar.projectKey=whatsapp-saas \
  -Dsonar.sources=Backend/src \
  -Dsonar.host.url=http://localhost:9000
```

#### ESLint Security Plugin
```bash
# Install
npm install --save-dev eslint-plugin-security

# Run
npx eslint --plugin security Backend/src
```

### DAST (Dynamic Application Security Testing)

#### OWASP ZAP
```bash
# Baseline scan (fast)
zap-baseline.py -t http://localhost:4000 -r zap-report.html

# Full scan (thorough)
zap-full-scan.py -t http://localhost:4000 -r zap-report.html

# API scan
zap-api-scan.py \
  -t http://localhost:4000/api/openapi.json \
  -f openapi \
  -r zap-api-report.html
```

---

## Manual Security Testing

### Penetration Testing Checklist

#### Authentication & Session Management
- [ ] Test password complexity requirements
- [ ] Test account lockout mechanism
- [ ] Test session timeout
- [ ] Test concurrent sessions
- [ ] Test session fixation
- [ ] Test CSRF protection
- [ ] Test "Remember Me" functionality
- [ ] Test password reset flow
- [ ] Test logout functionality

#### Authorization
- [ ] Test horizontal privilege escalation
- [ ] Test vertical privilege escalation
- [ ] Test direct object references (IDOR)
- [ ] Test API endpoint authorization
- [ ] Test file access permissions
- [ ] Test admin panel access

#### Input Validation
- [ ] Test SQL injection (all inputs)
- [ ] Test XSS (reflected, stored, DOM-based)
- [ ] Test command injection
- [ ] Test XML injection
- [ ] Test LDAP injection
- [ ] Test file upload (type, size, content)
- [ ] Test path traversal
- [ ] Test buffer overflow

#### Business Logic
- [ ] Test negative numbers
- [ ] Test race conditions
- [ ] Test workflow bypass
- [ ] Test price manipulation
- [ ] Test quantity manipulation

#### API Security
- [ ] Test rate limiting
- [ ] Test mass assignment
- [ ] Test API versioning
- [ ] Test error messages (information disclosure)
- [ ] Test HTTP methods
- [ ] Test CORS configuration

#### Data Protection
- [ ] Test encryption in transit (TLS)
- [ ] Test encryption at rest
- [ ] Test sensitive data in URLs
- [ ] Test sensitive data in logs
- [ ] Test data retention
- [ ] Test data backup security

---

## Security Best Practices

### Secure Coding Guidelines

#### Input Validation
```javascript
// ✅ Good: Validate and sanitize
const validatePhoneNumber = (phone) => {
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  if (!phoneRegex.test(phone)) {
    throw new Error('Invalid phone number format');
  }
  return phone;
};

// ❌ Bad: No validation
const phone = req.body.phone; // Direct use
```

#### Output Encoding
```javascript
// ✅ Good: Sanitize HTML
const DOMPurify = require('isomorphic-dompurify');
const sanitizedNote = DOMPurify.sanitize(userNote);

// ❌ Bad: No sanitization
res.send(`<div>${userNote}</div>`);
```

#### Secrets Management
```javascript
// ✅ Good: Use environment variables
const apiKey = process.env.OPENAI_API_KEY;

// ❌ Bad: Hardcoded secrets
const apiKey = 'sk-abc123def456...';
```

#### Error Handling
```javascript
// ✅ Good: Generic error message
try {
  await processPayment();
} catch (error) {
  logger.error('Payment processing failed', { error });
  res.status(500).json({ error: 'Payment processing failed' });
}

// ❌ Bad: Expose internal details
try {
  await processPayment();
} catch (error) {
  res.status(500).json({ error: error.message, stack: error.stack });
}
```

---

## Incident Response

### Security Incident Workflow

```
1. DETECT → 2. CONTAIN → 3. INVESTIGATE → 4. REMEDIATE → 5. REVIEW
```

### Steps

1. **Detection**
   - Monitor security alerts
   - Review logs
   - User reports

2. **Containment**
   - Isolate affected systems
   - Disable compromised accounts
   - Block malicious IPs

3. **Investigation**
   - Identify root cause
   - Determine scope
   - Collect evidence

4. **Remediation**
   - Fix vulnerability
   - Deploy patch
   - Restore from backup

5. **Post-Incident Review**
   - Document incident
   - Update procedures
   - Improve defenses

---

## Resources

### Tools
- **OWASP ZAP**: https://www.zaproxy.org
- **Burp Suite**: https://portswigger.net/burp
- **Snyk**: https://snyk.io
- **SonarQube**: https://www.sonarqube.org

### Documentation
- **OWASP Top 10**: https://owasp.org/www-project-top-ten/
- **OWASP ASVS**: https://owasp.org/www-project-application-security-verification-standard/
- **CWE Top 25**: https://cwe.mitre.org/top25/

### Training
- **OWASP WebGoat**: https://owasp.org/www-project-webgoat/
- **HackTheBox**: https://www.hackthebox.com
- **DVWA**: http://www.dvwa.co.uk

---

**Last Updated**: 2025-01-18
**Security Framework**: OWASP ASVS Level 2
**Compliance**: GDPR, PCI DSS Ready
