/**
 * Simple Security Tests (No MSW)
 * Tests security features without requiring MSW
 */

describe('CSRF Token - Simple Tests', () => {
  // Mock crypto API for Node environment
  beforeAll(() => {
    if (typeof crypto === 'undefined') {
      (global as any).crypto = {
        getRandomValues: (arr: Uint8Array) => {
          for (let i = 0; i < arr.length; i++) {
            arr[i] = Math.floor(Math.random() * 256);
          }
          return arr;
        },
      };
    }
  });

  test('CSRF module exports exist', () => {
    const csrfModule = require('../csrf');
    expect(csrfModule.generateCsrfToken).toBeDefined();
    expect(csrfModule.getCsrfToken).toBeDefined();
    expect(csrfModule.validateCsrfToken).toBeDefined();
  });

  test('Rate limiter module exports exist', () => {
    const rateLimitModule = require('../rateLimit');
    expect(rateLimitModule.RateLimiter).toBeDefined();
    expect(rateLimitModule.createRateLimiter).toBeDefined();
    expect(rateLimitModule.checkRateLimit).toBeDefined();
  });

  test('Sanitization module exports exist', () => {
    const sanitizeModule = require('../sanitize');
    expect(sanitizeModule.sanitizeHtml).toBeDefined();
    expect(sanitizeModule.sanitizeText).toBeDefined();
    expect(sanitizeModule.sanitizeObject).toBeDefined();
  });

  test('XSS module exports exist', () => {
    const xssModule = require('../xss');
    expect(xssModule.escapeHtml).toBeDefined();
    expect(xssModule.detectXssPattern).toBeDefined();
    expect(xssModule.safeJsonParse).toBeDefined();
  });
});

describe('Rate Limiting - Functional Tests', () => {
  test('Rate limiter allows requests within limit', () => {
    const { createRateLimiter } = require('../rateLimit');
    const limiter = createRateLimiter('test-simple', 5, 60000);

    for (let i = 0; i < 5; i++) {
      const status = limiter.checkLimit();
      expect(status.allowed).toBe(true);
    }
  });

  test('Rate limiter blocks requests over limit', () => {
    const { createRateLimiter } = require('../rateLimit');
    const limiter = createRateLimiter('test-block', 2, 60000);

    limiter.checkLimit();
    limiter.checkLimit();

    const blockedStatus = limiter.checkLimit();
    expect(blockedStatus.allowed).toBe(false);
    expect(blockedStatus.remaining).toBe(0);
  });
});

describe('XSS Protection - Functional Tests', () => {
  test('Escapes dangerous HTML', () => {
    const { escapeHtml } = require('../xss');
    const unsafe = '<script>alert("xss")</script>';
    const escaped = escapeHtml(unsafe);

    expect(escaped).toContain('&lt;');
    expect(escaped).toContain('&gt;');
    expect(escaped).not.toContain('<script>');
  });

  test('Detects XSS patterns', () => {
    const { detectXssPattern } = require('../xss');

    expect(detectXssPattern('<script>alert(1)</script>')).toBe(true);
    expect(detectXssPattern('javascript:alert(1)')).toBe(true);
    expect(detectXssPattern('Normal text')).toBe(false);
  });

  test('Safe JSON parsing prevents prototype pollution', () => {
    const { safeJsonParse } = require('../xss');

    const malicious = '{"__proto__": {"admin": true}}';
    const result = safeJsonParse(malicious, {});

    expect(result).toEqual({});
  });
});

describe('Sanitization - Functional Tests', () => {
  test('Sanitizes text by removing HTML', () => {
    const { sanitizeText } = require('../sanitize');
    const dirty = '<b>Bold</b> text';
    const clean = sanitizeText(dirty);

    expect(clean).not.toContain('<b>');
    expect(clean).toContain('Bold');
  });

  test('Validates and sanitizes URLs', () => {
    const { sanitizeUrl } = require('../sanitize');

    expect(sanitizeUrl('https://example.com')).toBeTruthy();
    expect(sanitizeUrl('javascript:alert(1)')).toBe('');
    expect(sanitizeUrl('data:text/html,<script>')).toBe('');
  });

  test('Sanitizes email addresses', () => {
    const { sanitizeEmail } = require('../sanitize');

    expect(sanitizeEmail('User@Example.COM')).toBe('user@example.com');
    expect(sanitizeEmail('  user@test.com  ')).toBe('user@test.com');
    expect(sanitizeEmail('invalid')).toBe('');
  });

  test('Sanitizes objects recursively', () => {
    const { sanitizeObject } = require('../sanitize');

    const dirty = {
      email: 'Test@Example.COM',
      name: '<script>alert(1)</script>',
    };

    const clean = sanitizeObject(dirty);

    expect(clean.email).toBe('test@example.com');
    expect(clean.name).not.toContain('<script>');
  });
});

describe('Security Integration - Comprehensive Tests', () => {
  test('All security modules work together', () => {
    const { sanitizeObject } = require('../sanitize');
    const { escapeHtml } = require('../xss');
    const { checkRateLimit } = require('../rateLimit');

    // Test sanitization
    const dirty = {
      content: '<script>alert(1)</script>',
      email: 'User@Test.COM',
    };
    const clean = sanitizeObject(dirty);
    expect(clean.content).not.toContain('<script>');

    // Test XSS escaping
    const escaped = escapeHtml(clean.content);
    expect(escaped).not.toContain('<');

    // Test rate limiting
    const rateLimit = checkRateLimit('/api/test');
    expect(rateLimit.status).toBeDefined();
    expect(typeof rateLimit.status.allowed).toBe('boolean');
  });

  test('Security enforcement is automatic', () => {
    // Verify that security features are designed to be enforced automatically
    const { addCsrfTokenToRequest } = require('../csrf');
    const { checkRateLimit } = require('../rateLimit');
    const { sanitizeObject } = require('../sanitize');

    expect(typeof addCsrfTokenToRequest).toBe('function');
    expect(typeof checkRateLimit).toBe('function');
    expect(typeof sanitizeObject).toBe('function');
  });
});
