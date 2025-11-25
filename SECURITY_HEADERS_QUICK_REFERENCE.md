# Security Headers Quick Reference

**One-page reference for WhatsApp SaaS security headers**

---

## Expected Headers

### Production Response

```http
HTTP/2 200 OK
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-ABC123'; style-src 'self' 'nonce-ABC123'; img-src 'self' data: blob: https://graph.facebook.com; font-src 'self' data:; connect-src 'self' https://graph.facebook.com https://api.openai.com https://api.whatsapp.com; frame-src 'none'; object-src 'none'; media-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'self'; upgrade-insecure-requests; block-all-mixed-content; worker-src 'self' blob:; manifest-src 'self'
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-DNS-Prefetch-Control: off
X-Download-Options: noopen
X-Permitted-Cross-Domain-Policies: none
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), accelerometer=(), gyroscope=(), interest-cohort=(), browsing-topics=(), autoplay=(self), fullscreen=(self), picture-in-picture=(self), screen-wake-lock=(self), web-share=(self)
X-Response-Time: 23ms
```

---

## Quick Commands

### Test Headers

```bash
# Test all headers
curl -I https://yourapp.com

# Test specific header
curl -I https://yourapp.com | grep -i content-security-policy

# Test CORS
curl -H "Origin: https://unauthorized.com" -I https://yourapp.com

# Test rate limiting
for i in {1..6}; do curl -I https://yourapp.com/login; sleep 1; done

# Pretty print all headers
curl -v https://yourapp.com 2>&1 | grep "< "
```

### Run Tests

```bash
# All security tests
npm test tests/security-headers.test.js

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch tests/security-headers.test.js

# Specific test suite
npm test -- --testNamePattern="Content-Security-Policy"
```

### Security Scanners

```bash
# Mozilla Observatory
https://observatory.mozilla.org/analyze/yourapp.com

# Security Headers
https://securityheaders.com/?q=yourapp.com

# SSL Labs
https://www.ssllabs.com/ssltest/analyze.html?d=yourapp.com

# CSP Evaluator
https://csp-evaluator.withgoogle.com/
```

---

## Common Issues & Fixes

### 1. CSP Blocking Resources

**Error**: "Refused to load script from '...' because it violates CSP"

**Fix**:
```javascript
// In security.js, add domain to appropriate directive
scriptSrc: [
  "'self'",
  'https://trusted-cdn.com'  // Add here
]
```

---

### 2. Inline Scripts Blocked

**Error**: "Refused to execute inline script"

**Fix**:
```html
<!-- Add nonce attribute -->
<script nonce="<%= cspNonce %>">
  console.log('Now allowed!');
</script>
```

---

### 3. CORS Error

**Error**: "No 'Access-Control-Allow-Origin' header present"

**Fix**:
```bash
# Add to .env
ALLOWED_ORIGINS=http://localhost:3000,https://yourfrontend.com
```

---

### 4. Rate Limit Too Strict

**Error**: 429 Too Many Requests

**Fix**:
```javascript
// In security.js, increase limit
const webhookLimiter = rateLimit({
  max: 200,  // Increased from 100
  // ...
});
```

---

### 5. HSTS Preventing HTTP Access

**Issue**: Can't access site over HTTP

**Fix**:
```bash
# Chrome
chrome://net-internals/#hsts
# Query domain, then Delete

# Firefox
about:preferences#privacy
# Clear History → Cookies and Site Data

# Safari
Develop → Empty Caches
```

---

## Header Checklist

### Pre-Deployment

- [ ] All headers present in test response
- [ ] CSP allows WhatsApp API (graph.facebook.com)
- [ ] CSP allows OpenAI API (api.openai.com)
- [ ] CORS configured with production origins
- [ ] Rate limiting tested and tuned
- [ ] Mozilla Observatory: Grade A
- [ ] Security Headers: Grade A+
- [ ] All tests passing (51/51)
- [ ] No console warnings in development

### Post-Deployment

- [ ] Verify headers with curl
- [ ] Test frontend loads correctly
- [ ] Test WhatsApp webhooks work
- [ ] Test OpenAI API calls work
- [ ] Run security scanners
- [ ] Monitor CSP violation reports
- [ ] Check rate limit logs
- [ ] Verify HSTS preload eligible

---

## Configuration Snippets

### Enable Google Analytics

```javascript
// In getCSPDirectives() function
scriptSrc: [
  "'self'",
  'https://www.google-analytics.com',
  'https://www.googletagmanager.com'
],
connectSrc: [
  "'self'",
  'https://www.google-analytics.com',
  // ... other domains
],
imgSrc: [
  "'self'",
  'data:',
  'https://www.google-analytics.com',
  // ... other domains
]
```

### Enable Google Fonts

```javascript
styleSrc: [
  "'self'",
  'https://fonts.googleapis.com'
],
fontSrc: [
  "'self'",
  'data:',
  'https://fonts.gstatic.com'
]
```

### Enable Stripe Payments

```javascript
scriptSrc: [
  "'self'",
  'https://js.stripe.com'
],
connectSrc: [
  "'self'",
  'https://api.stripe.com'
],
frameSrc: [
  'https://js.stripe.com'  // Changed from 'none'
]
```

### Enable Camera/Microphone

```javascript
function permissionsPolicy(req, res, next) {
  const policies = [
    'camera=(self)',  // Changed from ()
    'microphone=(self)',  // Changed from ()
    // ... rest
  ];
  res.setHeader('Permissions-Policy', policies.join(', '));
  next();
}
```

### Relax CSP for Development

```javascript
// In security.js, add to development CSP
scriptSrc: [
  "'self'",
  "'unsafe-inline'",
  "'unsafe-eval'",
  'http://localhost:*',
  'ws://localhost:*'
]
```

---

## Middleware Order

**CRITICAL**: Middleware must be applied in this order:

```javascript
app.use(cspNonceMiddleware);           // 1. Generate nonce FIRST
app.use(securityHeaders);              // 2. Apply Helmet headers
app.use(permissionsPolicy);            // 3. Add Permissions-Policy
app.use(additionalSecurityHeaders);    // 4. Additional headers
app.use(requestLogger);                // 5. Log requests

// ... your routes ...

app.use(errorHandler);                 // 6. Error handler LAST
```

---

## Testing Checklist

### Unit Tests

```bash
npm test tests/security-headers.test.js
```

**Expected**: 51 tests passed

### Manual Tests

```bash
# 1. Headers present
curl -I https://yourapp.com

# 2. CSP includes WhatsApp
curl -I https://yourapp.com | grep "graph.facebook.com"

# 3. CSP includes OpenAI
curl -I https://yourapp.com | grep "api.openai.com"

# 4. HSTS configured
curl -I https://yourapp.com | grep "max-age=31536000"

# 5. X-Frame-Options DENY
curl -I https://yourapp.com | grep "X-Frame-Options: DENY"

# 6. No X-Powered-By
curl -I https://yourapp.com | grep "X-Powered-By"
# Should return nothing

# 7. Permissions-Policy present
curl -I https://yourapp.com | grep "Permissions-Policy"
```

### Integration Tests

```bash
# 1. Frontend loads
# Open https://yourapp.com in browser
# Check for no console errors

# 2. WhatsApp webhook
curl -X POST https://yourapp.com/webhook \
  -H "Content-Type: application/json" \
  -d '{"object":"whatsapp_business_account","entry":[]}'

# 3. Admin endpoint
curl -X POST https://yourapp.com/admin \
  -H "Content-Type: application/json" \
  -d '{"action":"test"}'

# 4. Rate limiting
for i in {1..6}; do
  curl -I https://yourapp.com/login
  echo "Request $i"
done
# Should see 429 on request 6
```

---

## Expected Security Grades

### Mozilla Observatory
- **Target**: A or A+
- **Required**: 85+ score
- **URL**: https://observatory.mozilla.org/

### Security Headers
- **Target**: A+
- **Required**: All headers present
- **URL**: https://securityheaders.com/

### SSL Labs
- **Target**: A or A+
- **Required**: 95+ score
- **URL**: https://www.ssllabs.com/ssltest/

---

## Environment Variables

```bash
# .env file
NODE_ENV=production
ALLOWED_ORIGINS=https://yourapp.com,https://admin.yourapp.com
LOG_LEVEL=info
PORT=3000
```

---

## Compliance Quick Check

### OWASP Top 10 2021
- [x] A03:2021 - Injection (CSP)
- [x] A04:2021 - Insecure Design (X-Frame-Options)
- [x] A05:2021 - Security Misconfiguration (All headers)
- [x] A07:2021 - Auth Failures (Rate limiting)

### PCI DSS 3.2.1
- [x] 4.1 - Strong Crypto (HSTS)
- [x] 6.5.7 - XSS Prevention (CSP)
- [x] 6.5.9 - Clickjacking (X-Frame-Options)
- [x] 10.2 - Audit Trails (Logging)

### GDPR
- [x] Article 25 - Data Protection by Design (Permissions-Policy)
- [x] Article 32 - Security of Processing (All headers)

---

## Rate Limiting Quick Reference

| Endpoint | Window | Max Requests | Purpose |
|----------|--------|--------------|---------|
| `/webhook` | 15 min | 100 | WhatsApp webhooks |
| `/admin/*` | 15 min | 20 | Admin operations |
| `/login` | 15 min | 5 | Brute force protection |

---

## CSP Directive Reference

| Directive | Purpose | Our Setting |
|-----------|---------|-------------|
| `default-src` | Fallback for other directives | `'self'` |
| `script-src` | JavaScript sources | `'self' 'nonce-*'` |
| `style-src` | CSS sources | `'self' 'nonce-*'` |
| `img-src` | Image sources | `'self' data: blob: graph.facebook.com` |
| `connect-src` | AJAX/Fetch/WebSocket | `'self' APIs` |
| `frame-src` | Iframe sources | `'none'` |
| `object-src` | Plugin sources | `'none'` |
| `base-uri` | Base tag restriction | `'self'` |
| `frame-ancestors` | Embedding control | `'none'` |

---

## Troubleshooting One-Liners

```bash
# Check if headers are set
curl -I https://yourapp.com | grep -E "Content-Security-Policy|Strict-Transport-Security|X-Frame-Options"

# Test CSP nonce generation
curl -s https://yourapp.com | grep -o "nonce-[A-Za-z0-9+/=]*" | head -1

# Count security headers
curl -I https://yourapp.com 2>&1 | grep -E "^(Content-Security-Policy|Strict-Transport-Security|X-Frame-Options|X-Content-Type-Options|Referrer-Policy|Permissions-Policy):" | wc -l
# Should be 6

# Test rate limiting
time (for i in {1..10}; do curl -s -o /dev/null -w "%{http_code}\n" https://yourapp.com/login; done)

# Check HSTS preload eligibility
curl -I https://yourapp.com | grep -i "strict-transport-security.*preload"
```

---

## File Locations

```
Backend/
├── src/
│   └── middleware/
│       └── security.js          # Main security middleware
├── tests/
│   └── security-headers.test.js # Test suite (51 tests)
├── SECURITY_HEADERS_GUIDE.md    # Complete documentation
└── SECURITY_HEADERS_QUICK_REFERENCE.md  # This file
```

---

## Support

**Issues?**
1. Check [Common Issues](#common-issues--fixes)
2. Review [Full Guide](SECURITY_HEADERS_GUIDE.md)
3. Run test suite
4. Contact security team

**Security Vulnerabilities**: Report through proper channels

---

**Last Updated**: January 2025
**Version**: 1.0
