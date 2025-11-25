# Authentication & Authorization Guide

**Last Updated: January 18, 2025**

---

## Overview

The WhatsApp SaaS Platform API uses different authentication mechanisms depending on the endpoint type:

1. **Admin Endpoints**: API token authentication via `x-admin-token` header
2. **Webhook Endpoints**: HMAC signature verification via `x-hub-signature-256` header
3. **Public Endpoints**: No authentication required (health checks, root endpoint)

---

## Authentication Methods

### 1. Admin Token Authentication

Admin endpoints require an API token passed in the `x-admin-token` header.

#### Token Management

**Token Storage:**
- Admin token is stored securely in AWS Secrets Manager
- Token is loaded during application initialization
- Token is cached in memory (encrypted) and refreshed automatically

**Token Format:**
- 32-64 character alphanumeric string
- Example: `YOUR_ADMIN_TOKEN_HERE`

**Getting Your Token:**
1. Navigate to AWS Secrets Manager console
2. Open secret: `whatsapp-saas/admin-token`
3. Copy the `ADMIN_TOKEN` value
4. Store securely (never commit to version control)

#### Using Admin Token

**HTTP Header:**
```http
POST /admin/salons HTTP/1.1
Host: api.example.com
Content-Type: application/json
x-admin-token: YOUR_ADMIN_TOKEN_HERE

{
  "name": "Hair Studio Downtown",
  "phone_number_id": "987654321",
  "access_token": "EAAG...xyz"
}
```

**cURL Example:**
```bash
curl -X POST https://api.example.com/admin/salons \
  -H "Content-Type: application/json" \
  -H "x-admin-token: YOUR_ADMIN_TOKEN_HERE" \
  -d '{
    "name": "Hair Studio Downtown",
    "phone_number_id": "987654321",
    "access_token": "EAAG...xyz"
  }'
```

**JavaScript (fetch):**
```javascript
const response = await fetch('https://api.example.com/admin/salons', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-admin-token': 'YOUR_ADMIN_TOKEN_HERE'
  },
  body: JSON.stringify({
    name: 'Hair Studio Downtown',
    phone_number_id: '987654321',
    access_token: 'EAAG...xyz'
  })
});

const data = await response.json();
```

**Python (requests):**
```python
import requests

headers = {
    'Content-Type': 'application/json',
    'x-admin-token': 'YOUR_ADMIN_TOKEN_HERE'
}

payload = {
    'name': 'Hair Studio Downtown',
    'phone_number_id': '987654321',
    'access_token': 'EAAG...xyz'
}

response = requests.post(
    'https://api.example.com/admin/salons',
    headers=headers,
    json=payload
)

data = response.json()
```

#### Admin Endpoints

The following endpoints require admin token authentication:

**Salon Management:**
- `POST /admin/salons` - Create or update salon
- `GET /admin/salons` - List all salons

**Bookings:**
- `GET /admin/bookings/:salonId` - Get salon bookings

**Messages:**
- `GET /admin/messages/:salonId` - Get salon messages

**Analytics:**
- `GET /admin/stats/:salonId` - Get salon statistics
- `GET /admin/ai/analytics/:salonId` - Get AI analytics
- `GET /admin/ai/conversations/:salonId` - Get conversation stats

**System Administration:**
- `POST /admin/refresh-secrets` - Refresh secrets from AWS
- `GET /admin/secrets/health` - Check secrets health

---

### 2. Webhook HMAC Signature Verification

WhatsApp webhook endpoints use HMAC SHA-256 signature verification to ensure requests come from Meta Platform.

#### How It Works

1. **Meta Platform** sends webhook event
2. Calculates HMAC SHA-256 of request body using shared `APP_SECRET`
3. Includes signature in `x-hub-signature-256` header
4. **Your Server** receives request
5. Recalculates HMAC using same `APP_SECRET`
6. Compares signatures using timing-safe comparison
7. Accepts if signatures match, rejects otherwise

#### Signature Format

```
x-hub-signature-256: sha256=<hex_encoded_signature>
```

Example:
```
x-hub-signature-256: sha256=a1b2c3d4e5f6...xyz
```

#### Implementation

**Node.js Verification (from webhook.js):**
```javascript
const crypto = require('crypto');

function verifySignature(rawBody, signatureHeader) {
  // APP_SECRET is your Meta app secret
  const APP_SECRET = process.env.META_APP_SECRET;

  if (!APP_SECRET) {
    // Development mode - skip verification
    return true;
  }

  if (!signatureHeader) {
    return false;
  }

  // Calculate expected signature
  const hmac = crypto.createHmac('sha256', APP_SECRET);
  hmac.update(rawBody);
  const expected = 'sha256=' + hmac.digest('hex');

  // Use timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signatureHeader)
    );
  } catch (error) {
    return false;
  }
}

// Usage in Express middleware
app.post('/webhook', (req, res) => {
  const signature = req.get('x-hub-signature-256');

  if (!verifySignature(req.rawBody, signature)) {
    return res.sendStatus(401);
  }

  // Process webhook event
  res.status(200).send('EVENT_RECEIVED');
});
```

**Python Verification:**
```python
import hmac
import hashlib

def verify_signature(payload_body, signature_header, app_secret):
    """Verify webhook signature from Meta Platform"""
    if not app_secret:
        return True  # Development mode

    if not signature_header:
        return False

    # Calculate expected signature
    expected = 'sha256=' + hmac.new(
        app_secret.encode('utf-8'),
        payload_body.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

    # Use timing-safe comparison
    return hmac.compare_digest(expected, signature_header)

# Usage in Flask
@app.route('/webhook', methods=['POST'])
def webhook():
    signature = request.headers.get('x-hub-signature-256')

    if not verify_signature(request.data.decode('utf-8'), signature, APP_SECRET):
        return '', 401

    # Process webhook event
    return 'EVENT_RECEIVED', 200
```

#### Webhook Verification Endpoint

Meta Platform requires a verification endpoint for webhook setup:

**GET /webhook**

**Parameters:**
- `hub.mode`: Must be "subscribe"
- `hub.verify_token`: Your configured verify token
- `hub.challenge`: Random string to echo back

**Example Request:**
```http
GET /webhook?hub.mode=subscribe&hub.verify_token=my_verify_token&hub.challenge=abc123xyz HTTP/1.1
Host: api.example.com
```

**Example Response:**
```http
HTTP/1.1 200 OK
Content-Type: text/plain

abc123xyz
```

**Implementation:**
```javascript
function verify(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token && mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('WEBHOOK_VERIFIED');
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
}
```

---

### 3. Public Endpoints

The following endpoints do not require authentication:

- `GET /` - Root endpoint (API status)
- `GET /healthz` - Health check endpoint
- `GET /metrics` - Prometheus metrics (should be restricted by firewall)
- `GET /metrics/database` - Database metrics (should be restricted by firewall)

**Note:** While these endpoints don't require authentication, production deployments should:
- Restrict `/metrics` and `/metrics/database` to monitoring systems only
- Use firewall rules or load balancer settings to limit access
- Never expose these endpoints publicly on the internet

---

## Authorization

### Role-Based Access Control (RBAC)

Currently, the API implements a simple two-tier authorization model:

1. **Admin** - Full access to all admin endpoints
2. **Public** - Access to public endpoints and webhooks only

#### Admin Authorization

**Token Validation:**
```javascript
// Middleware checks admin token
function requireAdmin(req, res, next) {
  const providedToken = req.get('x-admin-token');

  if (!ADMIN_TOKEN) {
    return res.status(503).json({
      error: 'Admin functionality not configured'
    });
  }

  if (!providedToken || providedToken !== ADMIN_TOKEN) {
    console.log(`Unauthorized admin access attempt from ${req.ip}`);
    return res.status(401).json({
      error: 'Unauthorized'
    });
  }

  next();
}

// Usage
app.post('/admin/salons', requireAdmin, (req, res) => {
  // Admin-only logic
});
```

#### Multi-Tenancy & Data Isolation

**Salon-Level Isolation:**
- Each salon has a unique `salon_id`
- Bookings and messages are tied to specific `salon_id`
- Admin endpoints require explicit `salon_id` in path parameter
- Database queries filter by `salon_id` to ensure data isolation

**Example:**
```javascript
// Get bookings for specific salon only
GET /admin/bookings/a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d

// Database query automatically filters by salon_id
const bookings = await db.getBookingsBySalon(salonId, filters, pagination);
```

---

## Security Best Practices

### Token Management

**DO:**
- ✅ Store tokens in AWS Secrets Manager or equivalent
- ✅ Use environment variables for local development
- ✅ Rotate tokens regularly (every 90 days recommended)
- ✅ Use different tokens for production/staging/development
- ✅ Implement automatic token rotation with AWS Secrets Manager
- ✅ Log all admin authentication attempts

**DON'T:**
- ❌ Never commit tokens to version control (Git)
- ❌ Never log tokens in application logs
- ❌ Never send tokens in URL parameters
- ❌ Never share tokens via email or chat
- ❌ Never use the same token across environments
- ❌ Never store tokens in client-side code

### HMAC Signature Verification

**DO:**
- ✅ Always verify webhook signatures in production
- ✅ Use timing-safe comparison (`crypto.timingSafeEqual`)
- ✅ Use raw request body for HMAC calculation
- ✅ Store `APP_SECRET` securely
- ✅ Reject requests with missing or invalid signatures
- ✅ Log failed verification attempts

**DON'T:**
- ❌ Never skip signature verification in production
- ❌ Never use regular string comparison (timing attack risk)
- ❌ Never calculate HMAC from parsed JSON (use raw body)
- ❌ Never expose `APP_SECRET` in client-side code

### Rate Limiting

**Webhook Endpoints:**
- 100 requests per minute per IP address
- Enforced using Redis-backed rate limiter
- Returns 429 Too Many Requests if exceeded

**Admin Endpoints:**
- 30 requests per minute per IP address
- Enforced using Redis-backed rate limiter
- Returns 429 Too Many Requests if exceeded

**Example Rate Limit Response:**
```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Try again in 60 seconds.",
  "retryAfter": 60,
  "timestamp": "2025-01-18T10:00:00.000Z"
}
```

---

## Error Responses

### Authentication Errors

**401 Unauthorized - Missing Token:**
```json
{
  "error": "Unauthorized",
  "message": "Missing admin token",
  "timestamp": "2025-01-18T10:00:00.000Z"
}
```

**401 Unauthorized - Invalid Token:**
```json
{
  "error": "Unauthorized",
  "message": "Invalid admin token",
  "timestamp": "2025-01-18T10:00:00.000Z"
}
```

**401 Unauthorized - Invalid Webhook Signature:**
```json
{
  "error": "Unauthorized",
  "message": "Invalid webhook signature",
  "timestamp": "2025-01-18T10:00:00.000Z"
}
```

**503 Service Unavailable - Admin Not Configured:**
```json
{
  "error": "Service Unavailable",
  "message": "Admin functionality not configured",
  "timestamp": "2025-01-18T10:00:00.000Z"
}
```

---

## Testing Authentication

### Testing Admin Endpoints

**Valid Request:**
```bash
curl -X GET https://api.example.com/admin/salons \
  -H "x-admin-token: YOUR_VALID_TOKEN_HERE"

# Response: 200 OK
```

**Invalid Token:**
```bash
curl -X GET https://api.example.com/admin/salons \
  -H "x-admin-token: invalid_token"

# Response: 401 Unauthorized
```

**Missing Token:**
```bash
curl -X GET https://api.example.com/admin/salons

# Response: 401 Unauthorized
```

### Testing Webhook Signature

**Generate Test Signature (Node.js):**
```javascript
const crypto = require('crypto');

const APP_SECRET = 'your_app_secret_here';
const payload = JSON.stringify({
  object: 'whatsapp_business_account',
  entry: [/* ... */]
});

const hmac = crypto.createHmac('sha256', APP_SECRET);
hmac.update(payload);
const signature = 'sha256=' + hmac.digest('hex');

console.log('Signature:', signature);
```

**Test Webhook:**
```bash
curl -X POST https://api.example.com/webhook \
  -H "Content-Type: application/json" \
  -H "x-hub-signature-256: sha256=a1b2c3d4..." \
  -d '{
    "object": "whatsapp_business_account",
    "entry": []
  }'

# Response: 200 EVENT_RECEIVED
```

---

## Troubleshooting

### Common Issues

**Issue: "Unauthorized" on admin endpoints**
- ✅ Check that `x-admin-token` header is present
- ✅ Verify token matches value in AWS Secrets Manager
- ✅ Ensure no extra whitespace or newlines in token
- ✅ Check server logs for "Unauthorized admin access attempt"

**Issue: Webhook signature verification fails**
- ✅ Verify `META_APP_SECRET` environment variable is set
- ✅ Check that raw request body is used (not parsed JSON)
- ✅ Ensure `x-hub-signature-256` header is present
- ✅ Verify APP_SECRET matches Meta Developer Portal configuration
- ✅ Check for middleware that modifies request body before verification

**Issue: "Admin functionality not configured"**
- ✅ Verify AWS Secrets Manager contains `ADMIN_TOKEN`
- ✅ Check IAM permissions for accessing Secrets Manager
- ✅ Review server startup logs for secret initialization errors
- ✅ Try refreshing secrets: `POST /admin/refresh-secrets`

---

## Security Audit Checklist

### Pre-Deployment Checklist

- [ ] Admin token is stored in AWS Secrets Manager
- [ ] Admin token is not committed to version control
- [ ] Different tokens are used for prod/staging/dev
- [ ] Webhook signature verification is enabled in production
- [ ] Rate limiting is configured and tested
- [ ] HTTPS/TLS is enforced for all endpoints
- [ ] Metrics endpoints are restricted to monitoring systems
- [ ] All admin access attempts are logged
- [ ] Token rotation policy is documented (90 days)
- [ ] Security headers are configured (HSTS, CSP, etc.)

### Regular Security Reviews

- [ ] Review admin access logs monthly
- [ ] Review failed authentication attempts
- [ ] Audit active admin tokens
- [ ] Rotate admin tokens every 90 days
- [ ] Review and update IP allow-lists
- [ ] Test rate limiting effectiveness
- [ ] Verify HMAC signature verification
- [ ] Check for leaked tokens (GitHub, etc.)

---

## Related Documentation

- [OpenAPI Specification](openapi.yaml) - Complete API reference
- [Rate Limiting Guide](RATE_LIMITING.md) - Rate limiting details
- [Webhook Events Guide](WEBHOOKS.md) - Webhook event reference
- [Error Handling Guide](ERROR_HANDLING.md) - Error codes and responses
- [Backend/SECURITY.md](../../Backend/SECURITY.md) - Security implementation details

---

## Support

For authentication or security questions:

**Email:** security@example.com
**Documentation:** https://docs.example.com/api/authentication
**Security Incidents:** security-incident@example.com (urgent only)

---

**Last Updated: January 18, 2025**
