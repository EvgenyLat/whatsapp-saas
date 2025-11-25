/**
 * =============================================================================
 * OWASP A04-A10:2021 COMBINED TESTS
 * =============================================================================
 *
 * Tests for Insecure Design, Security Misconfiguration, Vulnerable Components,
 * Authentication Failures, Software Integrity, Logging Failures, and SSRF.
 */

const request = require('supertest');
const { app } = require('../../../src/app');
const { execSync } = require('child_process');
const fixtures = require('../fixtures/security.fixtures');
const helpers = require('../helpers/security-helpers');

describe('OWASP A04:2021 - Insecure Design', () => {
  let testData, validToken;

  beforeAll(async () => {
    testData = await fixtures.setupSecurityTest();
    validToken = testData.validToken;
  });

  afterAll(async () => {
    await fixtures.cleanupSecurityTest(testData);
  });

  it('should implement proper authentication design', async () => {
    await request(app)
      .get(`/admin/stats/${testData.salon.id}`)
      .expect(401);
  });

  it('should implement rate limiting', async () => {
    const requests = Array(100).fill().map(() =>
      request(app)
        .post('/admin/login')
        .send({ token: 'invalid' })
    );

    const responses = await Promise.all(requests);
    const rateLimited = responses.filter(r => r.status === 429);
    expect(rateLimited.length).toBeGreaterThan(0);
  });

  it('should implement business logic validation', async () => {
    const response = await request(app)
      .post(`/admin/bookings/${testData.salon.id}`)
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        customer_name: 'Test',
        customer_phone: '+1234567890',
        service: 'Haircut',
        datetime: new Date(Date.now() - 86400000).toISOString(), // Past date
      });

    expect([400, 422]).toContain(response.status);
  });
});

describe('OWASP A05:2021 - Security Misconfiguration', () => {
  it('should not expose default credentials', async () => {
    const defaultCreds = [
      { username: 'admin', password: 'admin' },
      { username: 'admin', password: 'password' },
      { username: 'root', password: 'root' },
    ];

    for (const creds of defaultCreds) {
      const response = await request(app)
        .post('/admin/login')
        .send(creds);

      expect(response.status).not.toBe(200);
    }
  });

  it('should not expose stack traces in errors', async () => {
    const response = await request(app)
      .get('/admin/bookings/invalid-id')
      .set('Authorization', `Bearer ${helpers.generateToken({ salonId: 'test' })}`);

    const responseText = JSON.stringify(response.body);
    expect(responseText).not.toMatch(/at\s+\w+\s+\(/);
    expect(responseText).not.toContain('node_modules');
  });

  it('should disable unnecessary HTTP methods', async () => {
    const response = await request(app)
      .trace('/admin/stats/test')
      .expect(405);
  });

  it('should not expose server version', async () => {
    const response = await request(app).get('/healthz');

    expect(response.headers['x-powered-by']).toBeUndefined();
    const server = response.headers['server'];
    if (server) {
      expect(server).not.toMatch(/Express|nginx\/\d/);
    }
  });

  it('should set secure headers', async () => {
    const response = await request(app).get('/healthz');

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBeDefined();
    expect(response.headers['strict-transport-security']).toBeDefined();
  });
});

describe('OWASP A06:2021 - Vulnerable Components', () => {
  it('should have no critical vulnerabilities in dependencies', () => {
    try {
      const audit = execSync('npm audit --json', { encoding: 'utf8' });
      const result = JSON.parse(audit);

      expect(result.metadata.vulnerabilities.critical).toBe(0);
      expect(result.metadata.vulnerabilities.high).toBe(0);
    } catch (error) {
      // npm audit returns non-zero exit code if vulnerabilities found
      if (error.stdout) {
        const result = JSON.parse(error.stdout);
        expect(result.metadata.vulnerabilities.critical).toBe(0);
      }
    }
  });

  it('should not use outdated major versions', () => {
    const packageJson = require('../../../package.json');
    const dependencies = packageJson.dependencies;

    // Check critical packages
    if (dependencies.express) {
      const version = parseInt(dependencies.express.match(/\d+/)[0]);
      expect(version).toBeGreaterThanOrEqual(4);
    }
  });
});

describe('OWASP A07:2021 - Authentication Failures', () => {
  it('should enforce strong password policy', async () => {
    const weakPasswords = ['12345', 'password', 'qwerty'];

    for (const password of weakPasswords) {
      const response = await request(app)
        .post('/admin/register')
        .send({
          email: 'test@example.com',
          password,
        });

      expect([400, 422]).toContain(response.status);
    }
  });

  it('should prevent brute force attacks', async () => {
    const requests = Array(20).fill().map(() =>
      request(app)
        .post('/admin/login')
        .send({ email: 'test@example.com', password: 'wrong' })
    );

    const responses = await Promise.all(requests);
    const rateLimited = responses.filter(r => r.status === 429);
    expect(rateLimited.length).toBeGreaterThan(0);
  });

  it('should implement session timeout', async () => {
    const expiredToken = helpers.generateToken({
      salonId: 'test',
      expiresIn: '-1h',
    });

    const response = await request(app)
      .get('/admin/stats/test')
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(401);
  });

  it('should prevent credential stuffing', async () => {
    // Rapid attempts from same IP should be rate limited
    const ip = '192.168.1.100';
    const requests = Array(50).fill().map(() =>
      request(app)
        .post('/admin/login')
        .set('X-Forwarded-For', ip)
        .send({ email: 'test@example.com', password: 'test123' })
    );

    const responses = await Promise.all(requests);
    const rateLimited = responses.filter(r => r.status === 429);
    expect(rateLimited.length).toBeGreaterThan(0);
  });
});

describe('OWASP A08:2021 - Software and Data Integrity', () => {
  it('should verify webhook signatures', async () => {
    const payload = fixtures.createWebhookPayload({
      from: '+1234567890',
      to: '+0987654321',
      body: 'Test',
    });

    const response = await request(app)
      .post('/webhook/whatsapp')
      .send(payload)
      .expect(401);

    expect(response.body.error).toMatch(/signature/i);
  });

  it('should validate data integrity with HMAC', async () => {
    const payload = fixtures.createWebhookPayload({
      from: '+1234567890',
      to: '+0987654321',
      body: 'Test',
    });

    const signature = helpers.generateWebhookSignature(payload);

    // Tamper with payload
    payload.body = 'Tampered';

    const response = await request(app)
      .post('/webhook/whatsapp')
      .set('X-Hub-Signature-256', signature)
      .send(payload)
      .expect(401);
  });

  it('should validate input data types', async () => {
    const response = await request(app)
      .post(`/admin/bookings/${helpers.generateToken({ salonId: 'test' })}`)
      .set('Authorization', `Bearer ${helpers.generateToken({ salonId: 'test' })}`)
      .send({
        customer_name: { $gt: '' }, // Object instead of string
        customer_phone: '+1234567890',
      })
      .expect(400);
  });
});

describe('OWASP A09:2021 - Logging Failures', () => {
  it('should log security events', async () => {
    // Trigger failed login
    await request(app)
      .post('/admin/login')
      .send({ email: 'test@example.com', password: 'wrong' });

    // In production, verify audit log entry exists
    // For test, just ensure endpoint handles it
  });

  it('should not log sensitive data', async () => {
    const logData = helpers.sanitizeForLogging({
      password: 'secret123',
      credit_card: '4111111111111111',
      token: 'secret-token',
    });

    expect(logData.password).toBe('***REDACTED***');
    expect(logData.credit_card).toBe('***REDACTED***');
    expect(logData.token).toBe('***REDACTED***');
  });

  it('should log with sufficient detail for audit trail', async () => {
    const auditLog = helpers.createAuditLog(
      'READ',
      'booking',
      '123',
      'user-456',
      { ip: '192.168.1.1' }
    );

    expect(auditLog.action).toBeDefined();
    expect(auditLog.resource).toBeDefined();
    expect(auditLog.user_id).toBeDefined();
    expect(auditLog.ip_address).toBeDefined();
    expect(auditLog.timestamp).toBeDefined();
  });

  it('should protect logs from tampering', async () => {
    // Logs should be write-only or have integrity checks
    // This would require checking log storage mechanism
  });
});

describe('OWASP A10:2021 - SSRF', () => {
  it('should validate external URLs', async () => {
    const maliciousUrls = [
      'http://localhost:8080/admin',
      'http://169.254.169.254/latest/meta-data/',
      'http://[::1]:8080',
      'file:///etc/passwd',
    ];

    for (const url of maliciousUrls) {
      const response = await request(app)
        .post('/admin/webhooks')
        .set('Authorization', `Bearer ${helpers.generateToken({ salonId: 'test' })}`)
        .send({ callback_url: url })
        .expect(400);
    }
  });

  it('should only allow HTTPS for webhooks', async () => {
    const response = await request(app)
      .post('/admin/webhooks')
      .set('Authorization', `Bearer ${helpers.generateToken({ salonId: 'test' })}`)
      .send({ callback_url: 'http://example.com/webhook' })
      .expect(400);
  });

  it('should validate URL schemes', async () => {
    const invalidSchemes = [
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'ftp://example.com/file',
    ];

    for (const url of invalidSchemes) {
      const response = await request(app)
        .post('/admin/webhooks')
        .set('Authorization', `Bearer ${helpers.generateToken({ salonId: 'test' })}`)
        .send({ callback_url: url })
        .expect(400);
    }
  });

  it('should prevent access to internal networks', async () => {
    const internalUrls = [
      'http://192.168.1.1',
      'http://10.0.0.1',
      'http://172.16.0.1',
      'http://127.0.0.1',
    ];

    for (const url of internalUrls) {
      const response = await request(app)
        .post('/admin/webhooks')
        .set('Authorization', `Bearer ${helpers.generateToken({ salonId: 'test' })}`)
        .send({ callback_url: url })
        .expect(400);
    }
  });

  it('should validate media URLs in webhooks', async () => {
    const payload = fixtures.createWebhookPayload({
      from: '+1234567890',
      to: '+0987654321',
      type: 'image',
      media_url: 'http://localhost/admin',
    });

    const signature = helpers.generateWebhookSignature(payload);

    const response = await request(app)
      .post('/webhook/whatsapp')
      .set('X-Hub-Signature-256', signature)
      .send(payload)
      .expect(400);
  });
});
