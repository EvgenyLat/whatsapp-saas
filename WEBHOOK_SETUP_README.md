# WhatsApp Webhook Local Testing Setup

Quick start guide for testing WhatsApp webhooks during local development using ngrok.

---

## Quick Start (5 Minutes)

### Prerequisites
- Backend running on `http://localhost:3000`
- PostgreSQL and Redis running
- Meta Developer Account with WhatsApp app

### Steps

1. **Install ngrok** (if not already installed)
   ```powershell
   # Using Chocolatey
   choco install ngrok

   # Or using Scoop
   scoop install ngrok
   ```

2. **Configure ngrok**
   ```powershell
   # Get authtoken from: https://dashboard.ngrok.com/signup
   ngrok config add-authtoken YOUR_AUTH_TOKEN
   ```

3. **Start ngrok** (Option A: Quick Start Script)
   ```powershell
   # Double-click this file in Windows Explorer:
   start-ngrok.bat

   # Or run in PowerShell:
   .\scripts\start-ngrok.ps1
   ```

   **OR Option B: Manual Start**
   ```powershell
   ngrok http 3000
   ```

4. **Copy the HTTPS URL** from ngrok output:
   ```
   Forwarding: https://abc123def456.ngrok.io -> http://localhost:3000
   ```

5. **Configure Meta Webhook**
   - Go to: https://developers.facebook.com/apps/
   - Your App → WhatsApp → Configuration
   - **Callback URL**: `https://abc123def456.ngrok.io/api/v1/whatsapp/webhook`
   - **Verify Token**: `dev-webhook-verify-token` (from your `.env`)
   - Click "Verify and Save"

6. **Subscribe to Events**
   - messages
   - message_status

7. **Test**
   - Send a message from WhatsApp to your business number
   - Check ngrok dashboard: http://localhost:4040
   - Check backend logs for webhook processing

---

## What's Included

### Documentation

1. **Complete Setup Guide** ([docs/NGROK_WEBHOOK_SETUP.md](./docs/NGROK_WEBHOOK_SETUP.md))
   - Detailed installation instructions
   - Step-by-step Meta configuration
   - Testing procedures
   - Security best practices
   - Production deployment guidance

2. **Troubleshooting Guide** ([docs/WEBHOOK_TROUBLESHOOTING.md](./docs/WEBHOOK_TROUBLESHOOTING.md))
   - Common issues and solutions
   - Quick diagnostic commands
   - Error message decoder
   - Debugging tools
   - Testing checklists

### Scripts

1. **PowerShell Quick Start** (`scripts/start-ngrok.ps1`)
   - Automated setup and validation
   - Checks prerequisites
   - Displays webhook URL
   - Opens relevant dashboards
   - Copies webhook URL to clipboard

2. **Batch File Launcher** (`start-ngrok.bat`)
   - Double-click to start ngrok
   - Windows-friendly launcher
   - Calls PowerShell script

---

## Architecture

```
WhatsApp Cloud API
        ↓
    (HTTPS Webhook)
        ↓
ngrok Public URL (https://abc123.ngrok.io)
        ↓
    (Secure Tunnel)
        ↓
ngrok Client (Your Machine)
        ↓
    (HTTP Local)
        ↓
NestJS Backend (localhost:3000)
        ↓
   /api/v1/whatsapp/webhook
        ↓
  Webhook Processing
        ↓
    Database Storage
```

---

## Files & Endpoints

### Important Files

| File | Purpose |
|------|---------|
| `Backend/.env` | Environment configuration |
| `Backend/src/modules/whatsapp/whatsapp.controller.ts` | Webhook endpoints |
| `Backend/src/modules/whatsapp/webhook.service.ts` | Webhook processing logic |
| `docs/NGROK_WEBHOOK_SETUP.md` | Complete setup guide |
| `docs/WEBHOOK_TROUBLESHOOTING.md` | Troubleshooting reference |
| `scripts/start-ngrok.ps1` | Automated ngrok startup |

### Webhook Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/whatsapp/webhook` | Webhook verification |
| POST | `/api/v1/whatsapp/webhook` | Receive webhook events |
| GET | `/api/v1/whatsapp/health` | Health check |

### Dashboard URLs

| Service | URL | Purpose |
|---------|-----|---------|
| ngrok Dashboard | http://localhost:4040 | Request inspection |
| Backend Health | http://localhost:3000/api/v1/whatsapp/health | Verify backend |
| Backend Swagger | http://localhost:3000/api/docs | API documentation |
| Meta Console | https://developers.facebook.com/apps/ | Configure webhooks |

---

## Environment Variables

Required in `Backend/.env`:

```bash
# Webhook Verification
WHATSAPP_VERIFY_TOKEN=dev-webhook-verify-token

# Webhook Security (use Meta App Secret)
WHATSAPP_WEBHOOK_SECRET=dev-webhook-secret

# WhatsApp API
WHATSAPP_API_VERSION=v18.0
WHATSAPP_API_URL=https://graph.facebook.com
```

---

## How It Works

### Webhook Verification (GET Request)

1. You configure webhook URL in Meta Console
2. Meta sends GET request with verification challenge
3. Backend validates `hub.verify_token`
4. Backend returns `hub.challenge` if valid
5. Meta confirms webhook is verified

**Code Reference:** `whatsapp.controller.ts` lines 25-49

### Webhook Events (POST Request)

1. User sends message to WhatsApp Business number
2. Meta sends POST webhook to your URL
3. ngrok tunnels request to localhost:3000
4. Backend validates signature (optional, see security notes)
5. Backend processes webhook payload
6. Backend saves message to database
7. Backend returns success response to Meta

**Code Reference:**
- Controller: `whatsapp.controller.ts` lines 51-83
- Processing: `webhook.service.ts` lines 16-57

---

## Testing Checklist

Before testing webhooks:

```
[ ] PostgreSQL running
[ ] Redis running
[ ] Backend running (http://localhost:3000)
[ ] Backend .env configured
[ ] ngrok installed and configured
[ ] ngrok tunnel active (https://xxx.ngrok.io)
[ ] Meta webhook URL configured
[ ] Meta events subscribed (messages, message_status)
[ ] Test phone number added to Meta account
```

---

## Common Issues

### Webhook Verification Failed
- **Cause**: Verify token mismatch
- **Fix**: Ensure `WHATSAPP_VERIFY_TOKEN` in `.env` matches Meta Console exactly

### Webhooks Not Received
- **Cause**: Not subscribed to events
- **Fix**: Subscribe to "messages" and "message_status" in Meta Console

### Salon Not Found
- **Cause**: Database `phone_number_id` mismatch
- **Fix**: Update salon record with correct `phone_number_id` from Meta

### Invalid Signature
- **Cause**: Webhook secret mismatch
- **Fix**: Update `WHATSAPP_WEBHOOK_SECRET` with Meta App Secret

See [WEBHOOK_TROUBLESHOOTING.md](./docs/WEBHOOK_TROUBLESHOOTING.md) for complete troubleshooting guide.

---

## Monitoring & Debugging

### ngrok Web Interface
```
URL: http://localhost:4040

Features:
- Real-time request/response inspection
- Request replay
- Header and body viewing
- Performance metrics
```

### Backend Logs
```bash
# Watch logs in terminal
cd Backend
npm run dev

# Key log messages:
[WhatsAppController] Webhook verification request received
[WhatsAppController] Webhook verified successfully
[WhatsAppController] Webhook event received
[WebhookService] Processing WhatsApp webhook event
```

### Database Monitoring
```sql
-- Check webhook logs
SELECT * FROM webhook_log ORDER BY created_at DESC LIMIT 10;

-- Check messages
SELECT * FROM message ORDER BY created_at DESC LIMIT 10;

-- Failed webhooks
SELECT * FROM webhook_log WHERE status = 'FAILED';
```

---

## Security Notes

### Current Implementation

1. **Verification Token**: Required and validated
2. **Webhook Signature**: Optional validation implemented
   - If signature header present, it's validated
   - If missing, webhook still processed (development mode)

### Production Recommendations

1. **Enforce Signature Validation**
   ```typescript
   // Make signature mandatory
   if (!signature) {
     throw new UnauthorizedException('Missing webhook signature');
   }
   ```

2. **Use Strong Verify Tokens**
   ```powershell
   # Generate secure random token
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

3. **Implement Rate Limiting**
   - Already configured in `.env`
   - Ensure applied to webhook endpoints

4. **Use HTTPS in Production**
   - Replace ngrok with proper domain
   - Use valid SSL certificate

5. **Enable IP Whitelisting**
   - Whitelist Meta's webhook IPs
   - Available at: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/ip-addresses

---

## Next Steps

After successful setup:

1. **Test Different Message Types**
   - Text messages
   - Images, documents, audio, video
   - Template messages

2. **Test Status Updates**
   - Message sent/delivered/read
   - Message failures

3. **Implement Business Logic**
   - Auto-replies
   - Message routing
   - AI integration

4. **Setup Monitoring**
   - Webhook success rate tracking
   - Error alerting
   - Performance monitoring

5. **Production Planning**
   - Replace ngrok with production domain
   - Enable AWS Secrets Manager
   - Configure production security
   - Setup CI/CD pipelines

---

## Resources

### Documentation
- [Complete Setup Guide](./docs/NGROK_WEBHOOK_SETUP.md)
- [Troubleshooting Guide](./docs/WEBHOOK_TROUBLESHOOTING.md)
- [WhatsApp Cloud API Docs](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [ngrok Documentation](https://ngrok.com/docs)

### Tools
- [Meta Developer Console](https://developers.facebook.com/apps/)
- [ngrok Dashboard](https://dashboard.ngrok.com/)
- [WhatsApp Business API Setup](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started)

### Support
- [Meta Developer Support](https://developers.facebook.com/support/)
- [ngrok Status Page](https://status.ngrok.com/)
- [WhatsApp Business Developers Group](https://www.facebook.com/groups/whatsappbusiness)

---

## Quick Reference Commands

```bash
# Install ngrok
choco install ngrok

# Configure ngrok
ngrok config add-authtoken YOUR_TOKEN

# Start ngrok (automated)
.\start-ngrok.bat

# Start ngrok (manual)
ngrok http 3000

# Test backend
curl http://localhost:3000/api/v1/whatsapp/health

# Test webhook verification
curl "https://YOUR_URL.ngrok.io/api/v1/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=dev-webhook-verify-token&hub.challenge=test"

# View ngrok requests
http://localhost:4040

# Check backend logs
cd Backend && npm run dev
```

---

## Support

For issues or questions:

1. Check [Troubleshooting Guide](./docs/WEBHOOK_TROUBLESHOOTING.md)
2. Review [Complete Setup Guide](./docs/NGROK_WEBHOOK_SETUP.md)
3. Consult WhatsApp API documentation
4. Contact Meta Developer Support

---

**Version:** 1.0.0
**Last Updated:** 2025-10-24
**Maintainer:** DevOps Team
**License:** MIT
