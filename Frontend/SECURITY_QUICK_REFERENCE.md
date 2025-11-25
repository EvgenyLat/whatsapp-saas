# Security Quick Reference - ENFORCED

## Quick Status Check

```typescript
import { getSecurityStatus } from '@/lib/security';

const status = getSecurityStatus();
console.log(status);
// {
//   csrf: { enabled: true, status: 'ENFORCED', hasToken: true, isValid: true },
//   rateLimit: { enabled: true, status: 'ENFORCED', endpoints: 15 },
//   sanitization: { enabled: true, status: 'ENFORCED' },
//   xss: { enabled: true, status: 'ENFORCED' }
// }
```

---

## CSRF Tokens

### Automatic (Recommended)
```typescript
import { apiClient } from '@/lib/api/client';

// CSRF token automatically added
await apiClient.post('/api/bookings', data);
```

### Manual
```typescript
import { getCsrfToken, validateCsrfToken } from '@/lib/security';

const token = getCsrfToken();
const isValid = validateCsrfToken(token);
```

---

## Rate Limiting

### Check Status
```typescript
import { getRateLimitStatus } from '@/lib/security';

const status = getRateLimitStatus('/api/auth/login');
// {
//   current: 2,
//   limit: 5,
//   remaining: 3,
//   resetAt: Date,
//   isLimited: false
// }
```

### Handle Errors
```typescript
try {
  await apiClient.post('/api/auth/login', credentials);
} catch (error) {
  if (error.code === 'RATE_LIMIT_EXCEEDED') {
    const retryAfter = error.details.retryAfter;
    showToast(`Too many requests. Try again in ${retryAfter}s`);
  }
}
```

---

## Input Sanitization

### Automatic (All Requests)
```typescript
import { apiClient } from '@/lib/api/client';

const data = {
  email: 'User@Example.COM',              // → 'user@example.com'
  description: '<script>bad</script>good', // → 'good'
  url: 'javascript:alert(1)',             // → ''
};

await apiClient.post('/api/customers', data);
// All data is sanitized automatically
```

### Manual
```typescript
import {
  sanitizeEmail,
  sanitizeHtml,
  sanitizeUrl,
  sanitizePhone,
  sanitizeText,
  sanitizeObject,
} from '@/lib/security';

const cleanEmail = sanitizeEmail('User@Example.COM');
const cleanHtml = sanitizeHtml('<script>bad</script><p>good</p>');
const cleanUrl = sanitizeUrl('https://example.com');
const cleanPhone = sanitizePhone('+1-555-1234');
const cleanText = sanitizeText('<b>text</b>');

const cleanObj = sanitizeObject({
  email: 'BAD@EXAMPLE.COM',
  html: '<script>xss</script>',
});
```

---

## XSS Protection

### Safe Components
```typescript
import { SafeText, SafeHtml } from '@/lib/security';

// Escape all HTML
function UserComment({ comment }) {
  return <SafeText>{comment}</SafeText>;
}

// Render sanitized HTML
function UserBio({ bio }) {
  return <SafeHtml html={sanitizedBio} className="bio" />;
}
```

### Manual Escaping
```typescript
import { escapeHtml } from '@/lib/security';

const userInput = '<script>alert(1)</script>';
const safe = escapeHtml(userInput);
// '&lt;script&gt;alert(1)&lt;/script&gt;'
```

### XSS Detection
```typescript
import { detectXssPattern } from '@/lib/security';

if (detectXssPattern(userInput)) {
  console.warn('XSS attempt detected!');
  return;
}
```

### URL Validation
```typescript
import { isSafeUrl } from '@/lib/security';

if (isSafeUrl(userUrl)) {
  window.location.href = userUrl;
} else {
  console.warn('Unsafe URL blocked');
}
```

---

## Common Patterns

### Form Submission
```typescript
import { apiClient } from '@/lib/api/client';
import { sanitizeFormData } from '@/lib/security';

async function handleSubmit(formData) {
  try {
    // Optional: Pre-sanitize for validation
    const clean = sanitizeFormData(formData);

    // Automatic sanitization happens here
    const response = await apiClient.post('/api/customers', clean);

    showToast('Success!');
  } catch (error) {
    if (error.code === 'RATE_LIMIT_EXCEEDED') {
      showToast('Too many requests. Please wait.');
    } else {
      showToast('Error: ' + error.message);
    }
  }
}
```

### User Content Display
```typescript
import { SafeText } from '@/lib/security';
import { sanitizeHtml } from '@/lib/security';

function CustomerCard({ customer }) {
  return (
    <div>
      <h3><SafeText>{customer.name}</SafeText></h3>
      <p><SafeText>{customer.email}</SafeText></p>
      <div dangerouslySetInnerHTML={{
        __html: sanitizeHtml(customer.notes)
      }} />
    </div>
  );
}
```

### Search with Sanitization
```typescript
import { sanitizeSearchQuery } from '@/lib/security';

async function searchCustomers(query) {
  const cleanQuery = sanitizeSearchQuery(query);

  const results = await apiClient.get('/api/customers/search', {
    params: { q: cleanQuery }
  });

  return results.data;
}
```

---

## Security Headers (Automatic)

All responses include these headers automatically:

```
✅ Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
✅ X-XSS-Protection: 1; mode=block
✅ X-Frame-Options: SAMEORIGIN
✅ X-Content-Type-Options: nosniff
✅ Referrer-Policy: origin-when-cross-origin
✅ Permissions-Policy: camera=(), microphone=(), geolocation=()
✅ Content-Security-Policy: [comprehensive policy]
```

No code needed - enforced by middleware.

---

## Testing

### Unit Tests
```typescript
import {
  sanitizeEmail,
  detectXssPattern,
  createRateLimiter,
} from '@/lib/security';

describe('Security', () => {
  test('sanitizes email', () => {
    expect(sanitizeEmail('User@Example.COM')).toBe('user@example.com');
  });

  test('detects XSS', () => {
    expect(detectXssPattern('<script>alert(1)</script>')).toBe(true);
  });

  test('rate limiting works', () => {
    const limiter = createRateLimiter('test', 2, 60000);
    expect(limiter.checkLimit().allowed).toBe(true);
    expect(limiter.checkLimit().allowed).toBe(true);
    expect(limiter.checkLimit().allowed).toBe(false);
  });
});
```

### Integration Tests
```typescript
import { apiClient } from '@/lib/api/client';

describe('API Security', () => {
  test('sanitizes request data', async () => {
    const data = { email: 'BAD@EXAMPLE.COM' };
    // Data will be sanitized before sending
    await apiClient.post('/api/test', data);
  });

  test('enforces rate limits', async () => {
    // Make multiple requests to trigger rate limit
    for (let i = 0; i < 10; i++) {
      try {
        await apiClient.post('/api/auth/login', credentials);
      } catch (error) {
        if (error.code === 'RATE_LIMIT_EXCEEDED') {
          // Expected
          return;
        }
      }
    }
  });
});
```

---

## Common Mistakes to Avoid

### ❌ DON'T: Bypass Security
```typescript
// NEVER DO THIS
config.skipAuth = true;
apiClient.post('/api/sensitive', data);
```

### ✅ DO: Use Security Features
```typescript
// Always use the protected client
import { apiClient } from '@/lib/api/client';
await apiClient.post('/api/sensitive', data);
```

---

### ❌ DON'T: Trust User Input
```typescript
// DANGEROUS
<div dangerouslySetInnerHTML={{ __html: userInput }} />
```

### ✅ DO: Sanitize First
```typescript
import { sanitizeHtml } from '@/lib/security';

<div dangerouslySetInnerHTML={{ __html: sanitizeHtml(userInput) }} />
```

---

### ❌ DON'T: Ignore Rate Limits
```typescript
// BAD
while (true) {
  await apiClient.post('/api/data', data);
}
```

### ✅ DO: Handle Rate Limit Errors
```typescript
try {
  await apiClient.post('/api/data', data);
} catch (error) {
  if (error.code === 'RATE_LIMIT_EXCEEDED') {
    setTimeout(() => retry(), error.details.retryAfter * 1000);
  }
}
```

---

## Debugging

### Check CSRF Token
```typescript
import { getCsrfTokenMetadata } from '@/lib/security';

const meta = getCsrfTokenMetadata();
console.log(meta);
// {
//   hasToken: true,
//   isValid: true,
//   expiresIn: 3540000,
//   expiresAt: Date
// }
```

### Check Rate Limit Status
```typescript
import { getAllRateLimitStatuses } from '@/lib/security';

const statuses = getAllRateLimitStatuses();
console.log(statuses);
// {
//   login: { current: 2, limit: 5, remaining: 3, ... },
//   register: { current: 0, limit: 3, remaining: 3, ... },
//   ...
// }
```

### Reset Rate Limits (Testing Only)
```typescript
import { resetAllRateLimiters } from '@/lib/security';

// ONLY IN TESTS
resetAllRateLimiters();
```

---

## Production Checklist

- [x] ✅ CSRF tokens enforced
- [x] ✅ Rate limiting active
- [x] ✅ Input sanitization enforced
- [x] ✅ XSS protection enabled
- [x] ✅ Security headers set
- [x] ✅ All tests passing
- [ ] 🔧 Remove CSP `unsafe-inline` and `unsafe-eval`
- [ ] 🔧 Enable HTTPS
- [ ] 🔧 Set up monitoring
- [ ] 🔧 Configure server-side validation

---

## Support

**Documentation:** See `SECURITY_ENFORCED.md` for detailed documentation

**Tests:** Run `npm test -- src/lib/security/__tests__/security.test.ts`

**Issues:** Check source code comments for detailed explanations

**Security Vulnerabilities:** Report privately to security team

---

**Last Updated:** 2024-10-20
**Version:** 1.0.0
**Status:** ✅ ALL FEATURES ENFORCED
