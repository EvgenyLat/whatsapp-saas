/**
 * =============================================================================
 * SECURITY TEST SETUP
 * =============================================================================
 *
 * Setup configuration that runs before each security test file.
 */

const { db } = require('../../src/config/database');

// Extend Jest timeout for security tests (they may take longer)
jest.setTimeout(30000);

// Setup before each test
beforeEach(async () => {
  // Clear rate limit counters if using in-memory store
  if (global.rateLimitStore) {
    global.rateLimitStore.clear();
  }
});

// Cleanup after each test
afterEach(async () => {
  // Reset any mocks
  jest.clearAllMocks();
});

// Global test utilities
global.securityTestUtils = {
  /**
   * Wait for async operations to complete
   */
  waitFor: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * Suppress console errors during expected error tests
   */
  suppressErrors: () => {
    const originalError = console.error;
    console.error = jest.fn();
    return () => {
      console.error = originalError;
    };
  },

  /**
   * Create mock request object
   */
  createMockRequest: (options = {}) => ({
    body: options.body || {},
    params: options.params || {},
    query: options.query || {},
    headers: options.headers || {},
    ip: options.ip || '127.0.0.1',
    get: function(header) {
      return this.headers[header.toLowerCase()];
    },
  }),

  /**
   * Create mock response object
   */
  createMockResponse: () => {
    const res = {
      statusCode: 200,
      headers: {},
      body: null,
    };

    res.status = function(code) {
      this.statusCode = code;
      return this;
    };

    res.json = function(data) {
      this.body = data;
      return this;
    };

    res.send = function(data) {
      this.body = data;
      return this;
    };

    res.setHeader = function(name, value) {
      this.headers[name.toLowerCase()] = value;
      return this;
    };

    res.getHeader = function(name) {
      return this.headers[name.toLowerCase()];
    };

    return res;
  },
};

// Custom matchers for security testing
expect.extend({
  /**
   * Check if response contains security headers
   */
  toHaveSecurityHeaders(received) {
    const requiredHeaders = [
      'x-content-type-options',
      'x-frame-options',
      'strict-transport-security',
    ];

    const missing = requiredHeaders.filter(header => !received.headers[header]);

    if (missing.length > 0) {
      return {
        message: () => `Expected security headers to be present. Missing: ${missing.join(', ')}`,
        pass: false,
      };
    }

    return {
      message: () => 'Expected security headers to be missing',
      pass: true,
    };
  },

  /**
   * Check if string contains PII that should be masked
   */
  toContainMaskedPII(received, type) {
    const patterns = {
      phone: /\+\d{3}\*{4}\d{3}/,
      email: /\w\*{3}\w@[\w.]+/,
      ssn: /\*{3}-\*{2}-\d{4}/,
    };

    const pattern = patterns[type];
    if (!pattern) {
      return {
        message: () => `Unknown PII type: ${type}`,
        pass: false,
      };
    }

    const matches = pattern.test(received);

    return {
      message: () => matches
        ? `Expected ${type} to not be masked`
        : `Expected ${type} to be masked`,
      pass: matches,
    };
  },

  /**
   * Check if response indicates rate limiting
   */
  toBeRateLimited(received) {
    const isRateLimited = received.status === 429 ||
      (received.body && received.body.error && received.body.error.toLowerCase().includes('rate limit'));

    return {
      message: () => isRateLimited
        ? 'Expected response to not be rate limited'
        : 'Expected response to be rate limited',
      pass: isRateLimited,
    };
  },

  /**
   * Check if data appears to be encrypted
   */
  toBeEncrypted(received) {
    // Encrypted data should be base64 or hex
    const looksEncrypted = /^[A-Za-z0-9+/=]+$/.test(received) ||
      /^[A-Fa-f0-9]+$/.test(received);

    return {
      message: () => looksEncrypted
        ? 'Expected data to not be encrypted'
        : 'Expected data to be encrypted',
      pass: looksEncrypted,
    };
  },

  /**
   * Check if SQL injection was prevented
   */
  toPreventSQLInjection(received) {
    const sqlKeywords = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'UNION', '--', ';'];
    const containsSQLKeywords = sqlKeywords.some(keyword =>
      received.toString().toUpperCase().includes(keyword)
    );

    return {
      message: () => !containsSQLKeywords
        ? 'Expected SQL injection to not be prevented'
        : 'Expected SQL injection to be prevented',
      pass: !containsSQLKeywords,
    };
  },

  /**
   * Check if XSS was prevented
   */
  toPreventXSS(received) {
    const xssPatterns = [
      /<script[^>]*>/i,
      /onerror\s*=/i,
      /onload\s*=/i,
      /javascript:/i,
    ];

    const containsXSS = xssPatterns.some(pattern => pattern.test(received));

    return {
      message: () => !containsXSS
        ? 'Expected XSS to not be prevented'
        : 'Expected XSS to be prevented',
      pass: !containsXSS,
    };
  },
});

// Environment setup
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-security-tests';
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'a'.repeat(64);
process.env.WHATSAPP_WEBHOOK_SECRET = process.env.WHATSAPP_WEBHOOK_SECRET || 'test-webhook-secret';
process.env.WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'test-verify-token';

console.log('Security test environment initialized');
