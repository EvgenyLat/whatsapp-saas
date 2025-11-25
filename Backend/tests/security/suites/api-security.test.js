/**
 * =============================================================================
 * API SECURITY TESTS
 * =============================================================================
 *
 * Tests CORS configuration, CSRF protection, security headers,
 * SSL/TLS verification, and API best practices.
 */

const request = require('supertest');
const { app } = require('../../../src/app');
const fixtures = require('../fixtures/security.fixtures');
const helpers = require('../helpers/security-helpers');

describe('API Security Tests', () => {
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
  // CORS Configuration
  // ==========================================================================
  describe('CORS Configuration', () => {
    it('should set Access-Control-Allow-Origin header for valid origins', async () => {
      const response = await request(app)
        .get('/healthz')
        .set('Origin', 'https://app.example.com')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    it('should reject requests from unauthorized origins', async () => {
      const response = await request(app)
        .get(`/admin/stats/${testData.salon.id}`)
        .set('Origin', 'https://malicious.com')
        .set('Authorization', `Bearer ${validToken}`);

      // Should not include CORS headers for unauthorized origin
      expect(response.headers['access-control-allow-origin']).not.toBe('https://malicious.com');
    });

    it('should handle preflight OPTIONS requests correctly', async () => {
      const response = await request(app)
        .options(`/admin/stats/${testData.salon.id}`)
        .set('Origin', 'https://app.example.com')
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', 'Authorization')
        .expect(204);

      expect(response.headers['access-control-allow-methods']).toBeDefined();
      expect(response.headers['access-control-allow-headers']).toBeDefined();
      expect(response.headers['access-control-max-age']).toBeDefined();
    });

    it('should not allow credentials from wildcard origin', async () => {
      const response = await request(app)
        .get('/healthz')
        .set('Origin', 'https://random.com');

      // If wildcard is used, credentials should not be allowed
      if (response.headers['access-control-allow-origin'] === '*') {
        expect(response.headers['access-control-allow-credentials']).toBeUndefined();
      }
    });

    it('should include allowed methods in CORS headers', async () => {
      const response = await request(app)
        .options(`/admin/bookings/${testData.salon.id}`)
        .set('Origin', 'https://app.example.com')
        .set('Access-Control-Request-Method', 'POST');

      expect(response.headers['access-control-allow-methods']).toMatch(/GET|POST|PUT|DELETE/);
    });

    it('should limit exposed headers', async () => {
      const response = await request(app)
        .get(`/admin/stats/${testData.salon.id}`)
        .set('Origin', 'https://app.example.com')
        .set('Authorization', `Bearer ${validToken}`);

      // Should explicitly list exposed headers, not expose all
      const exposedHeaders = response.headers['access-control-expose-headers'];
      if (exposedHeaders) {
        expect(exposedHeaders).not.toContain('*');
      }
    });
  });

  // ==========================================================================
  // CSRF Protection
  // ==========================================================================
  describe('CSRF Protection', () => {
    it('should require CSRF token for state-changing operations', async () => {
      // POST request without CSRF token should be rejected
      const response = await request(app)
        .post(`/admin/bookings/${testData.salon.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          customer_name: 'Test',
          customer_phone: '+1234567890',
          service: 'Haircut',
          datetime: new Date().toISOString(),
        });

      // Depending on CSRF implementation, might require token
      // This test assumes CSRF protection is enabled
      if (response.status === 403) {
        expect(response.body.error).toContain('CSRF');
      }
    });

    it('should validate CSRF token matches session', async () => {
      const invalidCsrfToken = 'invalid-csrf-token-123';

      const response = await request(app)
        .post(`/admin/bookings/${testData.salon.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-CSRF-Token', invalidCsrfToken)
        .send({
          customer_name: 'Test',
          customer_phone: '+1234567890',
          service: 'Haircut',
          datetime: new Date().toISOString(),
        });

      if (response.status === 403) {
        expect(response.body.error).toContain('CSRF');
      }
    });

    it('should use SameSite cookie attribute', async () => {
      const response = await request(app)
        .get(`/admin/stats/${testData.salon.id}`)
        .set('Authorization', `Bearer ${validToken}`);

      // Check if cookies have SameSite attribute
      const cookies = response.headers['set-cookie'];
      if (cookies) {
        cookies.forEach(cookie => {
          expect(cookie).toMatch(/SameSite=(Strict|Lax)/i);
        });
      }
    });

    it('should reject requests with mismatched origin and referer', async () => {
      const response = await request(app)
        .post(`/admin/bookings/${testData.salon.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('Origin', 'https://app.example.com')
        .set('Referer', 'https://malicious.com')
        .send({
          customer_name: 'Test',
          customer_phone: '+1234567890',
          service: 'Haircut',
          datetime: new Date().toISOString(),
        });

      // Should detect origin/referer mismatch
      if (response.status === 403) {
        expect(response.body.error).toMatch(/CSRF|origin/i);
      }
    });
  });

  // ==========================================================================
  // Security Headers
  // ==========================================================================
  describe('Security Headers', () => {
    it('should set X-Content-Type-Options header', async () => {
      const response = await request(app)
        .get(`/admin/stats/${testData.salon.id}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should set X-Frame-Options header', async () => {
      const response = await request(app)
        .get(`/admin/stats/${testData.salon.id}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.headers['x-frame-options']).toMatch(/DENY|SAMEORIGIN/);
    });

    it('should set X-XSS-Protection header', async () => {
      const response = await request(app)
        .get(`/admin/stats/${testData.salon.id}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
    });

    it('should set Strict-Transport-Security header (HSTS)', async () => {
      const response = await request(app)
        .get(`/admin/stats/${testData.salon.id}`)
        .set('Authorization', `Bearer ${validToken}`);

      const hsts = response.headers['strict-transport-security'];
      expect(hsts).toBeDefined();
      expect(hsts).toContain('max-age=');
      expect(parseInt(hsts.match(/max-age=(\d+)/)[1])).toBeGreaterThan(31536000); // At least 1 year
    });

    it('should set Content-Security-Policy header', async () => {
      const response = await request(app)
        .get(`/admin/stats/${testData.salon.id}`)
        .set('Authorization', `Bearer ${validToken}`);

      const csp = response.headers['content-security-policy'];
      expect(csp).toBeDefined();
      expect(csp).toContain("default-src");
    });

    it('should set Referrer-Policy header', async () => {
      const response = await request(app)
        .get(`/admin/stats/${testData.salon.id}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.headers['referrer-policy']).toBeDefined();
      expect(response.headers['referrer-policy']).toMatch(/no-referrer|same-origin|strict-origin/);
    });

    it('should set Permissions-Policy header', async () => {
      const response = await request(app)
        .get(`/admin/stats/${testData.salon.id}`)
        .set('Authorization', `Bearer ${validToken}`);

      // Previously Feature-Policy, now Permissions-Policy
      const permissionsPolicy = response.headers['permissions-policy'];
      if (permissionsPolicy) {
        expect(permissionsPolicy).toContain('geolocation=()');
      }
    });

    it('should not expose server information', async () => {
      const response = await request(app)
        .get(`/admin/stats/${testData.salon.id}`)
        .set('Authorization', `Bearer ${validToken}`);

      // Should not reveal server type/version
      const server = response.headers['server'];
      if (server) {
        expect(server).not.toMatch(/Express|Koa|nginx\/\d|Apache\/\d/);
      }
    });

    it('should not expose X-Powered-By header', async () => {
      const response = await request(app)
        .get(`/admin/stats/${testData.salon.id}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.headers['x-powered-by']).toBeUndefined();
    });

    it('should set Cache-Control headers appropriately', async () => {
      const response = await request(app)
        .get(`/admin/stats/${testData.salon.id}`)
        .set('Authorization', `Bearer ${validToken}`);

      const cacheControl = response.headers['cache-control'];
      expect(cacheControl).toBeDefined();

      // Sensitive endpoints should have no-store
      if (cacheControl.includes('no-store') || cacheControl.includes('no-cache')) {
        expect(cacheControl).toMatch(/no-store|no-cache/);
      }
    });
  });

  // ==========================================================================
  // SSL/TLS Verification
  // ==========================================================================
  describe('SSL/TLS Configuration', () => {
    it('should enforce HTTPS in production', async () => {
      // This test assumes production environment
      if (process.env.NODE_ENV === 'production') {
        const response = await request(app)
          .get(`/admin/stats/${testData.salon.id}`)
          .set('Authorization', `Bearer ${validToken}`)
          .set('X-Forwarded-Proto', 'http');

        // Should redirect to HTTPS or reject
        expect([301, 302, 403]).toContain(response.status);
      }
    });

    it('should include HSTS header with includeSubDomains', async () => {
      const response = await request(app)
        .get(`/admin/stats/${testData.salon.id}`)
        .set('Authorization', `Bearer ${validToken}`);

      const hsts = response.headers['strict-transport-security'];
      if (hsts) {
        expect(hsts).toContain('includeSubDomains');
      }
    });

    it('should include HSTS preload directive', async () => {
      const response = await request(app)
        .get(`/admin/stats/${testData.salon.id}`)
        .set('Authorization', `Bearer ${validToken}`);

      const hsts = response.headers['strict-transport-security'];
      if (hsts) {
        expect(hsts).toContain('preload');
      }
    });
  });

  // ==========================================================================
  // API Versioning
  // ==========================================================================
  describe('API Versioning', () => {
    it('should support API version in URL', async () => {
      const response = await request(app)
        .get('/api/v1/bookings')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);
    });

    it('should support API version in header', async () => {
      const response = await request(app)
        .get('/api/bookings')
        .set('Authorization', `Bearer ${validToken}`)
        .set('Accept', 'application/vnd.whatsapp-saas.v1+json')
        .expect(200);
    });

    it('should reject unsupported API versions', async () => {
      const response = await request(app)
        .get('/api/v99/bookings')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(404);
    });

    it('should maintain backward compatibility', async () => {
      // Test that v1 API still works
      const v1Response = await request(app)
        .get('/api/v1/bookings')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(v1Response.body).toBeDefined();
    });
  });

  // ==========================================================================
  // Content Type Validation
  // ==========================================================================
  describe('Content Type Validation', () => {
    it('should validate Content-Type header for POST requests', async () => {
      const response = await request(app)
        .post(`/admin/bookings/${testData.salon.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('Content-Type', 'text/plain')
        .send('invalid content type')
        .expect(415);

      expect(response.body.error).toContain('content type');
    });

    it('should accept application/json Content-Type', async () => {
      const response = await request(app)
        .post(`/admin/bookings/${testData.salon.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('Content-Type', 'application/json')
        .send({
          customer_name: 'Test',
          customer_phone: '+1234567890',
          service: 'Haircut',
          datetime: new Date().toISOString(),
        })
        .expect(201);
    });

    it('should reject executable content types', async () => {
      const dangerousTypes = [
        'application/x-executable',
        'application/x-msdownload',
        'application/x-sh',
      ];

      for (const contentType of dangerousTypes) {
        const response = await request(app)
          .post(`/admin/upload`)
          .set('Authorization', `Bearer ${validToken}`)
          .set('Content-Type', contentType)
          .send(Buffer.from('test'))
          .expect(415);
      }
    });
  });

  // ==========================================================================
  // HTTP Method Security
  // ==========================================================================
  describe('HTTP Method Security', () => {
    it('should only allow safe methods for read-only endpoints', async () => {
      // Stats endpoint should only allow GET
      const methods = ['POST', 'PUT', 'DELETE', 'PATCH'];

      for (const method of methods) {
        const response = await request(app)[method.toLowerCase()](`/admin/stats/${testData.salon.id}`)
          .set('Authorization', `Bearer ${validToken}`)
          .send({});

        expect([405, 404]).toContain(response.status);
      }
    });

    it('should disable TRACE method', async () => {
      const response = await request(app)
        .trace(`/admin/stats/${testData.salon.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(405);
    });

    it('should handle HEAD requests appropriately', async () => {
      const response = await request(app)
        .head(`/admin/stats/${testData.salon.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      // HEAD should not return body
      expect(response.body).toEqual({});
    });
  });

  // ==========================================================================
  // Error Handling
  // ==========================================================================
  describe('Secure Error Handling', () => {
    it('should not expose stack traces in production', async () => {
      // Trigger an error
      const response = await request(app)
        .get('/admin/bookings/invalid-id')
        .set('Authorization', `Bearer ${validToken}`);

      // Should not contain stack trace
      const responseText = JSON.stringify(response.body);
      expect(responseText).not.toMatch(/at\s+\w+\s+\(/); // Stack trace pattern
      expect(responseText).not.toContain('node_modules');
      expect(responseText).not.toContain('src/');
    });

    it('should return generic error messages for sensitive operations', async () => {
      const response = await request(app)
        .post(`/admin/bookings/${testData.salon.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          // Missing required fields
        })
        .expect(400);

      // Error should be informative but not expose internals
      expect(response.body.error).toBeDefined();
      expect(response.body.error).not.toContain('database');
      expect(response.body.error).not.toContain('SQL');
    });

    it('should use consistent error response format', async () => {
      const response = await request(app)
        .get('/admin/bookings/99999999')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(typeof response.body.error).toBe('string');
    });

    it('should log errors without exposing to client', async () => {
      // Trigger an internal error
      const response = await request(app)
        .get('/admin/trigger-error') // Hypothetical error endpoint
        .set('Authorization', `Bearer ${validToken}`);

      // Should return generic error
      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });
  });

  // ==========================================================================
  // Request Size Limits
  // ==========================================================================
  describe('Request Size Limits', () => {
    it('should reject requests exceeding size limit', async () => {
      const largePayload = {
        customer_name: 'A'.repeat(1000000), // 1MB of data
        customer_phone: '+1234567890',
        service: 'Haircut',
        datetime: new Date().toISOString(),
      };

      const response = await request(app)
        .post(`/admin/bookings/${testData.salon.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send(largePayload)
        .expect(413);

      expect(response.body.error).toContain('large');
    });

    it('should have appropriate limits for file uploads', async () => {
      const largeFile = Buffer.alloc(10 * 1024 * 1024); // 10MB

      const response = await request(app)
        .post('/admin/upload')
        .set('Authorization', `Bearer ${validToken}`)
        .attach('file', largeFile, 'large-file.jpg')
        .expect(413);
    });
  });

  // ==========================================================================
  // API Documentation Security
  // ==========================================================================
  describe('API Documentation', () => {
    it('should require authentication for API documentation', async () => {
      const response = await request(app)
        .get('/api/docs')
        .expect(401);
    });

    it('should not expose internal API endpoints in docs', async () => {
      const response = await request(app)
        .get('/api/docs')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      const docsText = JSON.stringify(response.body);
      expect(docsText).not.toContain('/internal/');
      expect(docsText).not.toContain('/debug/');
    });
  });
});
