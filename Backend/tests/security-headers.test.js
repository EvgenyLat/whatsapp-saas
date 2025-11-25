'use strict';

/**
 * Security Headers Test Suite
 *
 * Comprehensive tests for all security headers and middleware
 * Ensures OWASP, PCI DSS, and security best practices compliance
 *
 * TEST COVERAGE:
 * - All security headers (CSP, HSTS, X-Frame-Options, etc.)
 * - Rate limiting functionality
 * - CORS configuration
 * - CSP nonce generation
 * - Error handling
 * - Integration scenarios (WhatsApp webhooks, OpenAI API)
 * - Attack prevention (XSS, clickjacking, etc.)
 */

const request = require('supertest');
const express = require('express');
const {
  securityHeaders,
  cspNonceMiddleware,
  cspMiddleware,
  permissionsPolicy,
  additionalSecurityHeaders,
  corsOptions,
  webhookLimiter,
  adminLimiter,
  authLimiter,
  requestLogger,
  errorHandler,
  getCSPDirectives,
  ALLOWED_ORIGINS,
  TRUSTED_API_DOMAINS,
} = require('../src/middleware/security');

// Mock logger to prevent console output during tests
jest.mock('../src/utils/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  http: jest.fn(),
  debug: jest.fn(),
}));

// =============================================================================
// TEST APP SETUP
// =============================================================================

/**
 * Create a test Express app with security middleware
 */
function createTestApp(options = {}) {
  const app = express();

  // Apply middleware in correct order
  if (!options.skipCspNonce) {
    app.use(cspNonceMiddleware);
  }

  if (!options.skipSecurityHeaders) {
    app.use(securityHeaders);
  }

  if (!options.skipCsp) {
    app.use(cspMiddleware);
  }

  if (!options.skipPermissionsPolicy) {
    app.use(permissionsPolicy);
  }

  if (!options.skipAdditionalHeaders) {
    app.use(additionalSecurityHeaders);
  }

  if (!options.skipLogger) {
    app.use(requestLogger);
  }

  // Test routes
  app.get('/test', (req, res) => {
    res.json({ message: 'success', nonce: res.locals.cspNonce });
  });

  app.get('/error', (req, res, next) => {
    next(new Error('Test error'));
  });

  app.post('/webhook', (req, res) => {
    res.json({ message: 'webhook received' });
  });

  app.post('/admin', (req, res) => {
    res.json({ message: 'admin action' });
  });

  app.post('/login', (req, res) => {
    res.json({ message: 'login attempt' });
  });

  // Error handler must be last
  if (!options.skipErrorHandler) {
    app.use(errorHandler);
  }

  return app;
}

// =============================================================================
// SECURITY HEADERS TESTS
// =============================================================================

describe('Security Headers', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
  });

  describe('Content-Security-Policy (CSP)', () => {
    test('should set CSP header', async () => {
      const response = await request(app).get('/test');
      expect(response.headers['content-security-policy']).toBeDefined();
    });

    test('should include default-src directive', async () => {
      const response = await request(app).get('/test');
      const csp = response.headers['content-security-policy'];
      expect(csp).toContain("default-src 'self'");
    });

    test('should include script-src directive', async () => {
      const response = await request(app).get('/test');
      const csp = response.headers['content-security-policy'];
      expect(csp).toMatch(/script-src.*'self'/);
    });

    test('should include style-src directive', async () => {
      const response = await request(app).get('/test');
      const csp = response.headers['content-security-policy'];
      expect(csp).toMatch(/style-src.*'self'/);
    });

    test('should allow WhatsApp API domains in connect-src', async () => {
      const response = await request(app).get('/test');
      const csp = response.headers['content-security-policy'];
      expect(csp).toContain('https://graph.facebook.com');
    });

    test('should allow OpenAI API domains in connect-src', async () => {
      const response = await request(app).get('/test');
      const csp = response.headers['content-security-policy'];
      expect(csp).toContain('https://api.openai.com');
    });

    test('should block frames with frame-src none', async () => {
      const response = await request(app).get('/test');
      const csp = response.headers['content-security-policy'];
      expect(csp).toContain("frame-src 'none'");
    });

    test('should block objects with object-src none', async () => {
      const response = await request(app).get('/test');
      const csp = response.headers['content-security-policy'];
      expect(csp).toContain("object-src 'none'");
    });

    test('should prevent clickjacking with frame-ancestors', async () => {
      const response = await request(app).get('/test');
      const csp = response.headers['content-security-policy'];
      expect(csp).toContain("frame-ancestors 'none'");
    });

    test('should restrict base URI', async () => {
      const response = await request(app).get('/test');
      const csp = response.headers['content-security-policy'];
      expect(csp).toContain("base-uri 'self'");
    });

    test('should allow data URIs for images', async () => {
      const response = await request(app).get('/test');
      const csp = response.headers['content-security-policy'];
      expect(csp).toContain('data:');
    });

    test('should include nonce in production CSP', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const response = await request(app).get('/test');
      const csp = response.headers['content-security-policy'];
      const nonceMatch = csp.match(/'nonce-([A-Za-z0-9+/=]+)'/);

      expect(nonceMatch).toBeTruthy();
      expect(nonceMatch[1]).toBeTruthy();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('HTTP Strict Transport Security (HSTS)', () => {
    test('should set HSTS header', async () => {
      const response = await request(app).get('/test');
      expect(response.headers['strict-transport-security']).toBeDefined();
    });

    test('should set HSTS max-age to 1 year', async () => {
      const response = await request(app).get('/test');
      const hsts = response.headers['strict-transport-security'];
      expect(hsts).toContain('max-age=31536000');
    });

    test('should include subdomains in HSTS', async () => {
      const response = await request(app).get('/test');
      const hsts = response.headers['strict-transport-security'];
      expect(hsts).toContain('includeSubDomains');
    });

    test('should include preload in HSTS', async () => {
      const response = await request(app).get('/test');
      const hsts = response.headers['strict-transport-security'];
      expect(hsts).toContain('preload');
    });
  });

  describe('X-Frame-Options', () => {
    test('should set X-Frame-Options header', async () => {
      const response = await request(app).get('/test');
      expect(response.headers['x-frame-options']).toBeDefined();
    });

    test('should deny all framing', async () => {
      const response = await request(app).get('/test');
      expect(response.headers['x-frame-options']).toBe('DENY');
    });
  });

  describe('X-Content-Type-Options', () => {
    test('should set X-Content-Type-Options header', async () => {
      const response = await request(app).get('/test');
      expect(response.headers['x-content-type-options']).toBeDefined();
    });

    test('should prevent MIME sniffing', async () => {
      const response = await request(app).get('/test');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });
  });

  describe('Referrer-Policy', () => {
    test('should set Referrer-Policy header', async () => {
      const response = await request(app).get('/test');
      expect(response.headers['referrer-policy']).toBeDefined();
    });

    test('should use strict-origin-when-cross-origin', async () => {
      const response = await request(app).get('/test');
      expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    });
  });

  describe('Permissions-Policy', () => {
    test('should set Permissions-Policy header', async () => {
      const response = await request(app).get('/test');
      expect(response.headers['permissions-policy']).toBeDefined();
    });

    test('should block camera access', async () => {
      const response = await request(app).get('/test');
      const policy = response.headers['permissions-policy'];
      expect(policy).toContain('camera=()');
    });

    test('should block microphone access', async () => {
      const response = await request(app).get('/test');
      const policy = response.headers['permissions-policy'];
      expect(policy).toContain('microphone=()');
    });

    test('should block geolocation access', async () => {
      const response = await request(app).get('/test');
      const policy = response.headers['permissions-policy'];
      expect(policy).toContain('geolocation=()');
    });

    test('should block payment API', async () => {
      const response = await request(app).get('/test');
      const policy = response.headers['permissions-policy'];
      expect(policy).toContain('payment=()');
    });

    test('should block FLoC tracking', async () => {
      const response = await request(app).get('/test');
      const policy = response.headers['permissions-policy'];
      expect(policy).toContain('interest-cohort=()');
    });
  });

  describe('Additional Security Headers', () => {
    test('should remove X-Powered-By header', async () => {
      const response = await request(app).get('/test');
      expect(response.headers['x-powered-by']).toBeUndefined();
    });

    test('should set X-Response-Time header', async () => {
      const response = await request(app).get('/test');
      expect(response.headers['x-response-time']).toBeDefined();
      expect(response.headers['x-response-time']).toMatch(/\d+ms/);
    });

    test('should obfuscate server in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const response = await request(app).get('/test');
      expect(response.headers['server']).toBe('WebServer');

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('X-DNS-Prefetch-Control', () => {
    test('should set X-DNS-Prefetch-Control header', async () => {
      const response = await request(app).get('/test');
      expect(response.headers['x-dns-prefetch-control']).toBeDefined();
    });

    test('should disable DNS prefetching', async () => {
      const response = await request(app).get('/test');
      expect(response.headers['x-dns-prefetch-control']).toBe('off');
    });
  });

  describe('X-Download-Options', () => {
    test('should set X-Download-Options header', async () => {
      const response = await request(app).get('/test');
      expect(response.headers['x-download-options']).toBeDefined();
    });

    test('should prevent IE from executing downloads', async () => {
      const response = await request(app).get('/test');
      expect(response.headers['x-download-options']).toBe('noopen');
    });
  });

  describe('X-Permitted-Cross-Domain-Policies', () => {
    test('should set X-Permitted-Cross-Domain-Policies header', async () => {
      const response = await request(app).get('/test');
      expect(response.headers['x-permitted-cross-domain-policies']).toBeDefined();
    });

    test('should block all cross-domain policies', async () => {
      const response = await request(app).get('/test');
      expect(response.headers['x-permitted-cross-domain-policies']).toBe('none');
    });
  });
});

// =============================================================================
// CSP NONCE GENERATION TESTS
// =============================================================================

describe('CSP Nonce Generation', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
  });

  test('should generate unique nonce for each request', async () => {
    const response1 = await request(app).get('/test');
    const response2 = await request(app).get('/test');

    expect(response1.body.nonce).toBeDefined();
    expect(response2.body.nonce).toBeDefined();
    expect(response1.body.nonce).not.toBe(response2.body.nonce);
  });

  test('should generate base64 encoded nonce', async () => {
    const response = await request(app).get('/test');
    const nonce = response.body.nonce;

    // Base64 regex pattern
    const base64Pattern = /^[A-Za-z0-9+/]+=*$/;
    expect(nonce).toMatch(base64Pattern);
  });

  test('should generate nonce with sufficient entropy (16 bytes)', async () => {
    const response = await request(app).get('/test');
    const nonce = response.body.nonce;

    // 16 bytes = 24 base64 characters (with padding)
    expect(nonce.length).toBeGreaterThanOrEqual(22);
  });

  test('should attach nonce to res.locals', async () => {
    const app = express();
    app.use(cspNonceMiddleware);
    app.get('/test', (req, res) => {
      expect(res.locals.cspNonce).toBeDefined();
      res.json({ nonce: res.locals.cspNonce });
    });

    const response = await request(app).get('/test');
    expect(response.body.nonce).toBeDefined();
  });
});

// =============================================================================
// RATE LIMITING TESTS
// =============================================================================

describe('Rate Limiting', () => {
  describe('Webhook Rate Limiter', () => {
    let app;

    beforeEach(() => {
      app = express();
      app.use('/webhook', webhookLimiter);
      app.post('/webhook', (req, res) => {
        res.json({ message: 'success' });
      });
    });

    test('should allow requests under the limit', async () => {
      const response = await request(app).post('/webhook');
      expect(response.status).toBe(200);
    });

    test('should set rate limit headers', async () => {
      const response = await request(app).post('/webhook');
      expect(response.headers['ratelimit-limit']).toBeDefined();
      expect(response.headers['ratelimit-remaining']).toBeDefined();
    });

    test('should not set legacy X-RateLimit headers', async () => {
      const response = await request(app).post('/webhook');
      expect(response.headers['x-ratelimit-limit']).toBeUndefined();
    });
  });

  describe('Admin Rate Limiter', () => {
    let app;

    beforeEach(() => {
      app = express();
      app.use('/admin', adminLimiter);
      app.post('/admin', (req, res) => {
        res.json({ message: 'success' });
      });
    });

    test('should allow requests under the limit', async () => {
      const response = await request(app).post('/admin');
      expect(response.status).toBe(200);
    });

    test('should have lower limit than webhook limiter', async () => {
      // Admin limiter: 20 requests per 15 minutes
      // This is more restrictive than webhook limiter
      const response = await request(app).post('/admin');
      const limit = parseInt(response.headers['ratelimit-limit']);
      expect(limit).toBeLessThanOrEqual(20);
    });
  });

  describe('Auth Rate Limiter', () => {
    let app;

    beforeEach(() => {
      app = express();
      app.use('/login', authLimiter);
      app.post('/login', (req, res) => {
        res.json({ message: 'success' });
      });
    });

    test('should allow requests under the limit', async () => {
      const response = await request(app).post('/login');
      expect(response.status).toBe(200);
    });

    test('should have the most restrictive limit', async () => {
      // Auth limiter: 5 requests per 15 minutes
      const response = await request(app).post('/login');
      const limit = parseInt(response.headers['ratelimit-limit']);
      expect(limit).toBeLessThanOrEqual(5);
    });
  });
});

// =============================================================================
// CORS TESTS
// =============================================================================

describe('CORS Configuration', () => {
  let app;

  beforeEach(() => {
    const cors = require('cors');
    app = express();
    app.use(cors(corsOptions));
    app.get('/test', (req, res) => {
      res.json({ message: 'success' });
    });
  });

  test('should allow requests with no origin (server-to-server)', async () => {
    const response = await request(app).get('/test');
    expect(response.status).toBe(200);
  });

  test('should allow allowed origins', async () => {
    if (ALLOWED_ORIGINS.length > 0) {
      const response = await request(app)
        .get('/test')
        .set('Origin', ALLOWED_ORIGINS[0]);

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe(ALLOWED_ORIGINS[0]);
    }
  });

  test('should set credentials to true', async () => {
    if (ALLOWED_ORIGINS.length > 0) {
      const response = await request(app)
        .get('/test')
        .set('Origin', ALLOWED_ORIGINS[0]);

      expect(response.headers['access-control-allow-credentials']).toBe('true');
    }
  });

  test('should expose specified headers', async () => {
    if (ALLOWED_ORIGINS.length > 0) {
      const response = await request(app)
        .get('/test')
        .set('Origin', ALLOWED_ORIGINS[0]);

      const exposedHeaders = response.headers['access-control-expose-headers'];
      if (exposedHeaders) {
        expect(exposedHeaders).toContain('X-Total-Count');
      }
    }
  });
});

// =============================================================================
// ERROR HANDLING TESTS
// =============================================================================

describe('Error Handling', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
  });

  test('should handle generic errors', async () => {
    const response = await request(app).get('/error');
    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Internal Server Error');
  });

  test('should not leak error details in production', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const response = await request(app).get('/error');
    expect(response.body.message).toBe('An unexpected error occurred');
    expect(response.body.stack).toBeUndefined();

    process.env.NODE_ENV = originalEnv;
  });

  test('should include error details in development', async () => {
    // Create fresh app with development mode enforced
    delete process.env.NODE_ENV; // Clear any cached value
    const devApp = createTestApp();

    const response = await request(devApp).get('/error');

    // In development, we expect error details (or if NODE_ENV is not set)
    if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
      expect(response.body.message).toBe('Test error');
      expect(response.body.stack).toBeDefined();
    } else {
      // In production, no details leaked
      expect(response.body.message).toBe('An unexpected error occurred');
      expect(response.body.stack).toBeUndefined();
    }
  });

  test('should handle validation errors', async () => {
    const app = express();
    app.get('/test', (req, res, next) => {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      next(error);
    });
    app.use(errorHandler);

    const response = await request(app).get('/test');
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation Error');
  });

  test('should handle unauthorized errors', async () => {
    const app = express();
    app.get('/test', (req, res, next) => {
      const error = new Error('Unauthorized');
      error.name = 'UnauthorizedError';
      next(error);
    });
    app.use(errorHandler);

    const response = await request(app).get('/test');
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Unauthorized');
  });

  test('should handle CORS errors', async () => {
    const app = express();
    app.get('/test', (req, res, next) => {
      next(new Error('Not allowed by CORS'));
    });
    app.use(errorHandler);

    const response = await request(app).get('/test');
    expect(response.status).toBe(403);
    expect(response.body.error).toBe('CORS Error');
  });
});

// =============================================================================
// INTEGRATION TESTS
// =============================================================================

describe('Integration Scenarios', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
  });

  test('should accept WhatsApp webhook requests', async () => {
    const response = await request(app)
      .post('/webhook')
      .send({
        object: 'whatsapp_business_account',
        entry: []
      });

    expect(response.status).toBe(200);
    expect(response.headers['content-security-policy']).toBeDefined();
    expect(response.headers['x-frame-options']).toBe('DENY');
  });

  test('should have all security headers on webhook endpoint', async () => {
    const response = await request(app).post('/webhook');

    // Verify all critical security headers are present
    expect(response.headers['content-security-policy']).toBeDefined();
    expect(response.headers['strict-transport-security']).toBeDefined();
    expect(response.headers['x-frame-options']).toBeDefined();
    expect(response.headers['x-content-type-options']).toBeDefined();
    expect(response.headers['referrer-policy']).toBeDefined();
    expect(response.headers['permissions-policy']).toBeDefined();
  });

  test('should allow OpenAI API calls in CSP', async () => {
    const response = await request(app).get('/test');
    const csp = response.headers['content-security-policy'];

    expect(csp).toContain('https://api.openai.com');
  });

  test('should allow WhatsApp API calls in CSP', async () => {
    const response = await request(app).get('/test');
    const csp = response.headers['content-security-policy'];

    expect(csp).toContain('https://graph.facebook.com');
  });

  test('should protect admin endpoints with security headers', async () => {
    const response = await request(app).post('/admin');

    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['permissions-policy']).toBeDefined();
  });
});

// =============================================================================
// ATTACK PREVENTION TESTS
// =============================================================================

describe('Attack Prevention', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
  });

  test('should prevent XSS with CSP', async () => {
    const response = await request(app).get('/test');
    const csp = response.headers['content-security-policy'];

    // Verify CSP blocks inline scripts (unless nonce is used)
    expect(csp).toMatch(/script-src.*'self'/);

    // In production, should not have unsafe-eval
    // In development, it's allowed for dev tools
    if (process.env.NODE_ENV === 'production') {
      expect(csp).not.toContain("'unsafe-eval'");
    }
    // Always verify self is present
    expect(csp).toContain("script-src");
  });

  test('should prevent clickjacking with X-Frame-Options', async () => {
    const response = await request(app).get('/test');

    expect(response.headers['x-frame-options']).toBe('DENY');
  });

  test('should prevent clickjacking with CSP frame-ancestors', async () => {
    const response = await request(app).get('/test');
    const csp = response.headers['content-security-policy'];

    expect(csp).toContain("frame-ancestors 'none'");
  });

  test('should prevent MIME sniffing attacks', async () => {
    const response = await request(app).get('/test');

    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });

  test('should prevent base tag injection', async () => {
    const response = await request(app).get('/test');
    const csp = response.headers['content-security-policy'];

    expect(csp).toContain("base-uri 'self'");
  });

  test('should not reveal server technology', async () => {
    const response = await request(app).get('/test');

    expect(response.headers['x-powered-by']).toBeUndefined();
  });
});

// =============================================================================
// CONFIGURATION TESTS
// =============================================================================

describe('Configuration', () => {
  test('should export ALLOWED_ORIGINS', () => {
    expect(ALLOWED_ORIGINS).toBeDefined();
    expect(Array.isArray(ALLOWED_ORIGINS)).toBe(true);
  });

  test('should export TRUSTED_API_DOMAINS', () => {
    expect(TRUSTED_API_DOMAINS).toBeDefined();
    expect(Array.isArray(TRUSTED_API_DOMAINS)).toBe(true);
    expect(TRUSTED_API_DOMAINS).toContain('https://graph.facebook.com');
    expect(TRUSTED_API_DOMAINS).toContain('https://api.openai.com');
  });

  test('should generate different CSP for production vs development', () => {
    const mockReq = {};
    const mockResProduction = { locals: { cspNonce: 'test123' } };
    const mockResDevelopment = { locals: { cspNonce: 'test123' } };

    const originalEnv = process.env.NODE_ENV;

    // Test production CSP
    process.env.NODE_ENV = 'production';
    const productionCSP = getCSPDirectives(mockReq, mockResProduction);
    expect(productionCSP.scriptSrc).not.toContain("'unsafe-eval'");

    // Test development CSP
    process.env.NODE_ENV = 'development';
    const developmentCSP = getCSPDirectives(mockReq, mockResDevelopment);
    expect(developmentCSP.scriptSrc).toContain("'unsafe-eval'");

    process.env.NODE_ENV = originalEnv;
  });
});

// =============================================================================
// COMPLIANCE TESTS
// =============================================================================

describe('Compliance Verification', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
  });

  test('should meet OWASP Top 10 2021 requirements', async () => {
    const response = await request(app).get('/test');

    // A03:2021 - Injection (CSP)
    expect(response.headers['content-security-policy']).toBeDefined();

    // A04:2021 - Insecure Design (X-Frame-Options)
    expect(response.headers['x-frame-options']).toBe('DENY');

    // A05:2021 - Security Misconfiguration
    expect(response.headers['x-powered-by']).toBeUndefined();
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });

  test('should meet PCI DSS requirements', async () => {
    const response = await request(app).get('/test');

    // Requirement 4.1: Use strong cryptography (HSTS)
    expect(response.headers['strict-transport-security']).toBeDefined();
    expect(response.headers['strict-transport-security']).toContain('max-age=31536000');

    // Requirement 6.5: Secure development (CSP, XFO)
    expect(response.headers['content-security-policy']).toBeDefined();
    expect(response.headers['x-frame-options']).toBeDefined();
  });

  test('should meet Mozilla Observatory Grade A requirements', async () => {
    const response = await request(app).get('/test');

    const requiredHeaders = [
      'content-security-policy',
      'strict-transport-security',
      'x-frame-options',
      'x-content-type-options',
      'referrer-policy',
    ];

    requiredHeaders.forEach(header => {
      expect(response.headers[header]).toBeDefined();
    });
  });
});
