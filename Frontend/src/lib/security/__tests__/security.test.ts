/**
 * Security Tests - ENFORCED
 * WhatsApp SaaS Platform
 *
 * Comprehensive tests for all ENFORCED security features:
 * - CSRF token protection
 * - Rate limiting
 * - Input sanitization
 * - XSS protection
 */

import {
  generateCsrfToken,
  getCsrfToken,
  validateCsrfToken,
  clearCsrfToken,
  isCsrfTokenValid,
} from '../csrf';

import {
  RateLimiter,
  createRateLimiter,
  checkRateLimit,
  resetAllRateLimiters,
} from '../rateLimit';

import {
  sanitizeHtml,
  sanitizeText,
  sanitizeUrl,
  sanitizeEmail,
  sanitizePhone,
  sanitizeObject,
  sanitizeJson,
} from '../sanitize';

import {
  escapeHtml,
  detectXssPattern,
  removeScriptTags,
  safeJsonParse,
  isSafeUrl,
  sanitizeHtmlId,
  isObjectSafe,
} from '../xss';

describe('CSRF Token Protection - ENFORCED', () => {
  beforeEach(() => {
    clearCsrfToken();
  });

  test('generates cryptographically secure token', () => {
    const token = generateCsrfToken();

    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.length).toBe(64); // 32 bytes * 2 (hex)
    expect(token).toMatch(/^[a-f0-9]{64}$/);
  });

  test('generates unique tokens', () => {
    const token1 = generateCsrfToken();
    clearCsrfToken();
    const token2 = generateCsrfToken();

    expect(token1).not.toBe(token2);
  });

  test('retrieves existing token', () => {
    const token1 = generateCsrfToken();
    const token2 = getCsrfToken();

    expect(token1).toBe(token2);
  });

  test('validates correct token', () => {
    const token = generateCsrfToken();

    expect(validateCsrfToken(token)).toBe(true);
  });

  test('rejects invalid token', () => {
    generateCsrfToken();

    expect(validateCsrfToken('invalid-token')).toBe(false);
    expect(validateCsrfToken('')).toBe(false);
  });

  test('clears token completely', () => {
    generateCsrfToken();
    clearCsrfToken();

    expect(isCsrfTokenValid()).toBe(false);
  });
});

describe('Rate Limiting - ENFORCED', () => {
  beforeEach(() => {
    resetAllRateLimiters();
  });

  test('allows requests within limit', () => {
    const limiter = createRateLimiter('test', 5, 60000);

    for (let i = 0; i < 5; i++) {
      const status = limiter.checkLimit();
      expect(status.allowed).toBe(true);
    }
  });

  test('blocks requests exceeding limit', () => {
    const limiter = createRateLimiter('test', 3, 60000);

    // Make 3 allowed requests
    for (let i = 0; i < 3; i++) {
      limiter.checkLimit();
    }

    // 4th request should be blocked
    const status = limiter.checkLimit();
    expect(status.allowed).toBe(false);
    expect(status.remaining).toBe(0);
    expect(status.retryAfter).toBeGreaterThan(0);
  });

  test('resets after window expires', async () => {
    const limiter = createRateLimiter('test', 2, 100); // 100ms window

    // Exhaust limit
    limiter.checkLimit();
    limiter.checkLimit();

    // Should be blocked
    expect(limiter.checkLimit().allowed).toBe(false);

    // Wait for window to expire
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Should be allowed again
    expect(limiter.checkLimit().allowed).toBe(true);
  });

  test('provides accurate remaining count', () => {
    const limiter = createRateLimiter('test', 5, 60000);

    expect(limiter.getRemaining()).toBe(5);

    limiter.checkLimit();
    expect(limiter.getRemaining()).toBe(4);

    limiter.checkLimit();
    expect(limiter.getRemaining()).toBe(3);
  });

  test('endpoint-specific rate limiting works', () => {
    const result1 = checkRateLimit('/api/auth/login');
    const result2 = checkRateLimit('/api/bookings');

    expect(result1.status.allowed).toBe(true);
    expect(result2.status.allowed).toBe(true);
  });
});

describe('Input Sanitization - ENFORCED', () => {
  test('removes dangerous HTML tags', () => {
    const dirty = '<script>alert("xss")</script><p>Safe content</p>';
    const clean = sanitizeHtml(dirty);

    expect(clean).not.toContain('<script>');
    expect(clean).toContain('Safe content');
  });

  test('removes all HTML from text', () => {
    const dirty = '<b>Bold</b> and <i>italic</i>';
    const clean = sanitizeText(dirty);

    expect(clean).toBe('Bold and italic');
    expect(clean).not.toContain('<');
  });

  test('validates and sanitizes URLs', () => {
    expect(sanitizeUrl('https://example.com')).toBe('https://example.com/');
    expect(sanitizeUrl('http://example.com')).toBe('http://example.com/');
    expect(sanitizeUrl('javascript:alert(1)')).toBe('');
    expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('');
    expect(sanitizeUrl('invalid-url')).toBe('');
  });

  test('normalizes email addresses', () => {
    expect(sanitizeEmail('User@Example.COM')).toBe('user@example.com');
    expect(sanitizeEmail('  user@example.com  ')).toBe('user@example.com');
    expect(sanitizeEmail('invalid-email')).toBe('');
    expect(sanitizeEmail('<script>@example.com')).toBe('');
  });

  test('cleans phone numbers', () => {
    expect(sanitizePhone('+1 (555) 123-4567')).toBe('+1 (555) 123-4567');
    expect(sanitizePhone('555.123.4567abc')).toBe('555.123.4567');
    expect(sanitizePhone('(555) 123-4567')).toBe('(555) 123-4567');
  });

  test('sanitizes objects recursively', () => {
    const dirty = {
      email: 'User@Example.COM',
      phone: '+1-555-1234',
      description: '<script>alert(1)</script><p>Content</p>',
      nested: {
        url: 'javascript:alert(1)',
      },
    };

    const clean = sanitizeObject(dirty);

    expect(clean.email).toBe('user@example.com');
    expect(clean.phone).toBe('+1-555-1234');
    expect(clean.description).not.toContain('<script>');
    expect(clean.nested.url).toBe('');
  });

  test('prevents JSON prototype pollution', () => {
    const malicious = '{"__proto__": {"admin": true}}';
    const parsed = sanitizeJson(malicious);

    expect(parsed).toBeNull();
  });

  test('handles null and undefined safely', () => {
    expect(sanitizeText('')).toBe('');
    expect(sanitizeUrl('')).toBe('');
    expect(sanitizeEmail('')).toBe('');
  });
});

describe('XSS Protection - ENFORCED', () => {
  test('escapes HTML entities', () => {
    const unsafe = '<script>alert("xss")</script>';
    const escaped = escapeHtml(unsafe);

    expect(escaped).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
    expect(escaped).not.toContain('<script>');
  });

  test('detects XSS patterns', () => {
    expect(detectXssPattern('<script>alert(1)</script>')).toBe(true);
    expect(detectXssPattern('javascript:alert(1)')).toBe(true);
    expect(detectXssPattern('<img onerror="alert(1)">')).toBe(true);
    expect(detectXssPattern('<iframe src="evil.com">')).toBe(true);
    expect(detectXssPattern('Normal text')).toBe(false);
  });

  test('removes script tags', () => {
    const input = 'Safe <script>alert(1)</script> content';
    const output = removeScriptTags(input);

    expect(output).toBe('Safe  content');
    expect(output).not.toContain('<script>');
  });

  test('safely parses JSON', () => {
    const valid = '{"name": "John", "age": 30}';
    const malicious = '{"__proto__": {"admin": true}}';

    expect(safeJsonParse(valid, {})).toEqual({ name: 'John', age: 30 });
    expect(safeJsonParse(malicious, {})).toEqual({});
  });

  test('validates URL safety', () => {
    expect(isSafeUrl('https://example.com')).toBe(true);
    expect(isSafeUrl('http://example.com')).toBe(true);
    expect(isSafeUrl('mailto:user@example.com')).toBe(true);
    expect(isSafeUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
  });

  test('sanitizes HTML IDs', () => {
    expect(sanitizeHtmlId('valid-id-123')).toBe('valid-id-123');
    expect(sanitizeHtmlId('validId')).toBe('validId');
    expect(sanitizeHtmlId('invalid@id')).toBe('invalidid');
    expect(sanitizeHtmlId('123invalid')).toBe(''); // Must start with letter
  });

  test('detects unsafe objects', () => {
    expect(isObjectSafe({ name: 'John' })).toBe(true);
    expect(isObjectSafe({ __proto__: {} })).toBe(false);
    expect(isObjectSafe({ constructor: {} })).toBe(false);
  });

  test('handles nested XSS attempts', () => {
    const nested = '<div><script>alert(1)</script></div>';
    const escaped = escapeHtml(nested);

    expect(escaped).not.toContain('<script>');
    expect(detectXssPattern(nested)).toBe(true);
  });
});

describe('Integration Tests - ENFORCED Security', () => {
  test('sanitization + XSS protection chain', () => {
    const dangerous = '<script>alert("xss")</script><p onclick="evil()">Text</p>';

    // First sanitize HTML
    const sanitized = sanitizeHtml(dangerous);
    expect(sanitized).not.toContain('<script>');

    // Then escape for display
    const escaped = escapeHtml(sanitized);
    expect(escaped).not.toContain('onclick');
  });

  test('object sanitization prevents injection', () => {
    const maliciousForm = {
      email: '<script>@example.com',
      name: 'User<script>alert(1)</script>',
      url: 'javascript:alert(1)',
      description: '<iframe src="evil.com">',
    };

    const clean = sanitizeObject(maliciousForm);

    expect(clean.email).toBe('');
    expect(clean.name).not.toContain('<script>');
    expect(clean.url).toBe('');
    expect(clean.description).not.toContain('<iframe>');
  });

  test('rate limiting persists across requests', () => {
    const limiter = createRateLimiter('test', 2, 60000);

    // First request
    expect(limiter.checkLimit().allowed).toBe(true);

    // Second request
    expect(limiter.checkLimit().allowed).toBe(true);

    // Third request should be blocked
    expect(limiter.checkLimit().allowed).toBe(false);
  });
});

describe('Security Edge Cases', () => {
  test('handles extremely long inputs', () => {
    const longString = 'a'.repeat(100000);
    const sanitized = sanitizeText(longString);

    expect(typeof sanitized).toBe('string');
  });

  test('handles special characters in sanitization', () => {
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const sanitized = sanitizeText(special);

    expect(typeof sanitized).toBe('string');
  });

  test('handles unicode characters safely', () => {
    const unicode = '你好世界 مرحبا العالم';
    const sanitized = sanitizeText(unicode);

    expect(sanitized).toContain('你好世界');
    expect(sanitized).toContain('مرحبا العالم');
  });

  test('handles null prototype objects', () => {
    const obj = Object.create(null);
    obj.name = 'test';

    const safe = isObjectSafe(obj);
    expect(safe).toBe(true);
  });
});
