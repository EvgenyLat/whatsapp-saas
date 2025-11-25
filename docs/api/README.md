# WhatsApp SaaS Platform API Documentation

**Version:** 1.0.0
**Last Updated:** January 18, 2025

---

## 📚 Documentation Index

### Interactive API Documentation
- **[Swagger UI](index.html)** - Interactive API explorer with try-it-out functionality

### Core API Documentation
- **[OpenAPI Specification](openapi.yaml)** - Complete API reference in OpenAPI 3.0 format
- **[Authentication & Authorization](AUTHENTICATION.md)** - Admin token auth, HMAC verification, security best practices
- **[Request & Response Examples](EXAMPLES.md)** - Code examples in cURL, JavaScript, Python
- **[Webhook Events Guide](WEBHOOKS.md)** - WhatsApp webhook integration, event types, security

### Additional Resources
- **[Rate Limiting Guide](RATE_LIMITING.md)** - Rate limits, quotas, and throttling strategies
- **[Error Handling Guide](ERROR_HANDLING.md)** - Error codes, responses, and troubleshooting
- **[API Usage Guide](API_USAGE_GUIDE.md)** - Getting started, best practices, common patterns

---

## 🚀 Quick Start

### 1. Get Your Admin Token

Your admin token is stored in AWS Secrets Manager:

```bash
# Using AWS CLI
aws secretsmanager get-secret-value \
  --secret-id whatsapp-saas/admin-token \
  --query SecretString \
  --output text | jq -r .ADMIN_TOKEN
```

### 2. Make Your First API Call

```bash
curl https://api.example.com/admin/salons \
  -H "x-admin-token: YOUR_ADMIN_TOKEN"
```

### 3. Explore Interactive Documentation

Open [index.html](index.html) in your browser to explore the API with Swagger UI.

---

## 📖 API Overview

### Base URLs

- **Production:** `https://api.example.com`
- **Staging:** `https://staging-api.example.com`
- **Local Development:** `http://localhost:3000`

### Authentication

Two authentication methods:

1. **Admin Token Authentication** (`x-admin-token` header)
   - Used for: All admin endpoints
   - Token stored in AWS Secrets Manager
   - See: [Authentication Guide](AUTHENTICATION.md)

2. **HMAC Signature Verification** (`x-hub-signature-256` header)
   - Used for: Webhook endpoints from Meta Platform
   - Verifies requests are from WhatsApp
   - See: [Webhooks Guide](WEBHOOKS.md)

### Rate Limits

- **Webhook endpoints:** 100 requests/minute per IP
- **Admin endpoints:** 30 requests/minute per IP

See: [Rate Limiting Guide](RATE_LIMITING.md)

---

## 🔧 API Endpoints

### Health & Monitoring

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/` | GET | API status | No |
| `/healthz` | GET | Health check | No |
| `/metrics` | GET | Prometheus metrics | No |
| `/metrics/database` | GET | Database metrics | No |

### Webhooks

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/webhook` | GET | Webhook verification | No (uses verify token) |
| `/webhook` | POST | Receive webhook events | Yes (HMAC signature) |

### Admin - Salon Management

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/admin/salons` | GET | List all salons | Yes |
| `/admin/salons` | POST | Create/update salon | Yes |

### Admin - Bookings

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/admin/bookings/:salonId` | GET | Get salon bookings | Yes |

### Admin - Messages

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/admin/messages/:salonId` | GET | Get salon messages | Yes |

### Admin - Analytics

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/admin/stats/:salonId` | GET | Get salon statistics | Yes |
| `/admin/ai/analytics/:salonId` | GET | Get AI analytics | Yes |
| `/admin/ai/conversations/:salonId` | GET | Get conversation stats | Yes |

### Admin - System

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/admin/refresh-secrets` | POST | Refresh AWS secrets | Yes |
| `/admin/secrets/health` | GET | Secrets health check | Yes |

---

## 💡 Common Use Cases

### Creating a New Salon

```bash
curl -X POST https://api.example.com/admin/salons \
  -H "Content-Type: application/json" \
  -H "x-admin-token: YOUR_TOKEN" \
  -d '{
    "name": "Hair Studio Downtown",
    "phone_number_id": "987654321",
    "access_token": "EAAG..."
  }'
```

### Getting Bookings with Filters

```bash
curl "https://api.example.com/admin/bookings/SALON_ID?status=confirmed&page=1&limit=20" \
  -H "x-admin-token: YOUR_TOKEN"
```

### Monitoring System Health

```bash
curl https://api.example.com/healthz
```

---

## 🔒 Security Best Practices

### Token Management

- ✅ Store tokens in AWS Secrets Manager
- ✅ Never commit tokens to version control
- ✅ Rotate tokens every 90 days
- ✅ Use different tokens per environment

### API Security

- ✅ Always use HTTPS in production
- ✅ Verify HMAC signatures on webhooks
- ✅ Implement rate limiting
- ✅ Log all authentication attempts
- ✅ Monitor for unusual activity

See: [Authentication Guide](AUTHENTICATION.md)

---

## 📊 Response Formats

### Success Response

```json
{
  "id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
  "name": "Hair Studio Downtown",
  "created_at": "2025-01-18T10:00:00.000Z"
}
```

### Error Response

```json
{
  "error": "Validation failed",
  "message": "phone_number_id is required",
  "timestamp": "2025-01-18T10:00:00.000Z"
}
```

### Paginated Response

```json
{
  "data": [/* ... */],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

---

## 🛠️ Development Tools

### Postman Collection

Import the OpenAPI spec into Postman:

1. Open Postman
2. Click **Import**
3. Select **openapi.yaml**
4. Configure environment variables:
   - `base_url`: Your API base URL
   - `admin_token`: Your admin API token

### cURL Examples

See [EXAMPLES.md](EXAMPLES.md) for comprehensive cURL examples.

### SDKs

Official SDKs:
- **JavaScript/TypeScript:** (coming soon)
- **Python:** (coming soon)
- **PHP:** (coming soon)

---

## 🐛 Troubleshooting

### Common Issues

**Issue: 401 Unauthorized**
- Check that `x-admin-token` header is present
- Verify token matches value in AWS Secrets Manager
- Check for extra whitespace in token

**Issue: 429 Too Many Requests**
- Implement exponential backoff
- Check current rate: 30 req/min for admin, 100 req/min for webhooks
- Consider caching responses

**Issue: Webhook signature verification fails**
- Use raw request body (not parsed JSON)
- Verify `META_APP_SECRET` is correct
- Check timing-safe comparison implementation

See: [Error Handling Guide](ERROR_HANDLING.md)

---

## 📈 Performance Tips

### Caching

Endpoints with caching:
- `/healthz` - 30 seconds
- `/admin/bookings/:salonId` - 1 minute
- `/admin/messages/:salonId` - 1 minute
- `/admin/stats/:salonId` - 2 minutes
- `/admin/ai/analytics/:salonId` - 15 minutes

### Pagination

Always use pagination for large datasets:

```bash
curl "https://api.example.com/admin/messages/SALON_ID?page=1&limit=50"
```

### Batch Operations

For multiple operations, consider:
1. Using webhooks for real-time updates
2. Implementing client-side caching
3. Polling with appropriate intervals

---

## 🔄 API Versioning

Current version: **v1.0.0**

- Version is included in OpenAPI spec
- Breaking changes will increment major version
- Backwards-compatible changes increment minor version
- Bug fixes increment patch version

---

## 📞 Support

### Documentation Issues

Found an error in the documentation?
- Email: docs@example.com
- GitHub Issues: (if applicable)

### API Support

Need help with API integration?
- Email: api-support@example.com
- Response time: 24-48 hours

### Security Issues

Found a security vulnerability?
- Email: security@example.com
- Response time: Immediate (for critical issues)

---

## 📝 Changelog

### Version 1.0.0 (January 18, 2025)

**Initial Release:**
- Complete REST API for salon management
- WhatsApp webhook integration
- AI-powered conversation handling
- Booking system integration
- Comprehensive analytics endpoints
- Rate limiting and caching
- HMAC signature verification
- Admin token authentication

---

## 📄 License

This API documentation is part of the WhatsApp SaaS Platform.

**License:** MIT
**Copyright:** © 2025 WhatsApp SaaS Platform

---

## 🔗 Related Documentation

### Backend Documentation
- [Security Implementation](../../Backend/SECURITY.md)
- [Database Schema](../../Backend/DATABASE.md)
- [Deployment Guide](../../DEPLOYMENT.md)

### Legal Documentation
- [Terms of Service](../../legal/TERMS_OF_SERVICE.md)
- [Privacy Policy](../../legal/PRIVACY_POLICY.md)
- [Data Processing Agreement](../../legal/DATA_PROCESSING_AGREEMENT.md)

### Infrastructure
- [Terraform Configuration](../../terraform/)
- [Monitoring Setup](../../monitoring/)
- [Backup Strategy](../../scripts/backup/)

---

**Happy Coding! 🚀**

For the most up-to-date API documentation, visit the [Interactive API Explorer](index.html).
