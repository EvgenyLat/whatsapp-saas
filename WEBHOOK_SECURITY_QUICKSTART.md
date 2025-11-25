# WhatsApp Webhook Security - Quick Start Guide

## For Developers

This guide helps you quickly set up and test WhatsApp webhook signature validation.

---

## 1. Get Your App Secret

### From Meta Developer Dashboard

1. Go to [Meta Developer Dashboard](https://developers.facebook.com/apps/)
2. Select your WhatsApp app
3. Navigate to **Settings > Basic**
4. Copy **App Secret** (click "Show" button)

---

## 2. Configure Environment

### Development Setup

**Option A: Use Real App Secret (Recommended)**
```bash
# Backend/.env
META_APP_SECRET=your-actual-app-secret-from-meta
DISABLE_WEBHOOK_VALIDATION=false
```

**Option B: Bypass Validation (Testing Only)**
```bash
# Backend/.env
DISABLE_WEBHOOK_VALIDATION=true
```

**⚠️ WARNING:** Option B logs security warnings and should NEVER be used in production!

### Production Setup

**AWS Secrets Manager (Recommended):**
```bash
aws secretsmanager create-secret \
  --name whatsapp-saas/production/whatsapp \
  --secret-string '{"META_APP_SECRET":"your-actual-app-secret"}'
```

**Environment Variables:**
```bash
export META_APP_SECRET=your-actual-app-secret
export DISABLE_WEBHOOK_VALIDATION=false
export NODE_ENV=production
```

---

## 3. Start Application

```bash
cd Backend
npm install
npm run dev

# Check logs for:
# ✅ "Webhook signature validation is ENABLED"
# ❌ NOT "Webhook signature validation is DISABLED"
```

---

## 4. Test Webhook Security

### Test 1: Reject Missing Signature

```bash
curl -X POST http://localhost:3000/api/v1/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -d '{"test":"data"}'

# Expected: 401 Unauthorized
# Response: {"statusCode":401,"message":"Missing webhook signature"}
```

### Test 2: Reject Invalid Signature

```bash
curl -X POST http://localhost:3000/api/v1/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=invalidhash" \
  -d '{"test":"data"}'

# Expected: 401 Unauthorized
# Response: {"statusCode":401,"message":"Invalid webhook signature"}
```

### Test 3: Accept Valid Signature

**Generate valid signature:**
```bash
# Linux/Mac
PAYLOAD='{"test":"data"}'
APP_SECRET="your-app-secret"
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$APP_SECRET" | cut -d' ' -f2)

# Windows PowerShell
$Payload = '{"test":"data"}'
$AppSecret = "your-app-secret"
$hmacsha = New-Object System.Security.Cryptography.HMACSHA256
$hmacsha.key = [Text.Encoding]::UTF8.GetBytes($AppSecret)
$Signature = [BitConverter]::ToString($hmacsha.ComputeHash([Text.Encoding]::UTF8.GetBytes($Payload))) -replace '-',''
$Signature = $Signature.ToLower()
```

**Send request:**
```bash
curl -X POST http://localhost:3000/api/v1/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=$SIGNATURE" \
  -d "$PAYLOAD"

# Expected: 200 OK
# Response: {"status":"success"}
```

---

## 5. Run Tests

```bash
cd Backend

# Run webhook signature tests
npm test -- webhook-signature

# Expected:
# Test Suites: 2 passed, 2 total
# Tests:       46 passed, 46 total
```

---

## 6. Common Issues & Solutions

### Issue: "Missing webhook signature"

**Cause:** No `X-Hub-Signature-256` header in request

**Solution:**
```bash
# Add header to request
-H "X-Hub-Signature-256: sha256=<calculated-signature>"
```

### Issue: "Invalid webhook signature"

**Causes:**
1. Wrong `META_APP_SECRET`
2. Signature calculated with wrong body
3. Body was modified after signature calculation

**Solutions:**
```bash
# 1. Verify APP_SECRET matches Meta dashboard
echo $META_APP_SECRET

# 2. Ensure body is EXACTLY the same
# Don't add spaces, newlines, or modify JSON

# 3. Use raw body parser (already configured in main.ts)
```

### Issue: "WHATSAPP_APP_SECRET not configured"

**Cause:** Environment variable not set

**Solution:**
```bash
# Check if variable is set
echo $META_APP_SECRET

# Set variable
export META_APP_SECRET=your-app-secret

# Restart application
npm run dev
```

### Issue: Validation always passes

**Cause:** `DISABLE_WEBHOOK_VALIDATION=true`

**Solution:**
```bash
# In .env file
DISABLE_WEBHOOK_VALIDATION=false

# Restart application
npm run dev

# Check logs for "validation is ENABLED"
```

---

## 7. Development Workflow

### Local Testing with ngrok

**1. Start ngrok:**
```bash
ngrok http 3000
```

**2. Configure Meta webhook URL:**
```
https://your-ngrok-url.ngrok.io/api/v1/whatsapp/webhook
```

**3. Set verify token:**
```bash
# In .env
META_VERIFY_TOKEN=your-verify-token
```

**4. Verify webhook in Meta dashboard:**
- Meta sends GET request with `hub.verify_token`
- Application verifies token and returns `hub.challenge`

**5. Test with real WhatsApp message:**
- Send message to your WhatsApp Business number
- Meta sends POST with signature
- Application validates signature
- Webhook is processed

### Signature Validation Flow

```
1. WhatsApp message sent
2. Meta calculates HMAC-SHA256(APP_SECRET, webhook_body)
3. Meta sends POST with X-Hub-Signature-256 header
4. Your app:
   a. Raw body parser captures original body
   b. WebhookSignatureGuard extracts signature
   c. WebhookSignatureValidator calculates expected signature
   d. Compares signatures using constant-time comparison
   e. Rejects if mismatch, processes if valid
```

---

## 8. Security Checklist

**Before Deployment:**
- ✅ `META_APP_SECRET` configured
- ✅ `DISABLE_WEBHOOK_VALIDATION=false`
- ✅ All tests passing
- ✅ Logs show "validation is ENABLED"
- ✅ Test webhook with valid signature works
- ✅ Test webhook without signature is rejected
- ✅ Test webhook with invalid signature is rejected

**Production:**
- ✅ Use AWS Secrets Manager (not env vars)
- ✅ Enable CloudWatch logging
- ✅ Set up alerts for failed validations
- ✅ Monitor signature validation success rate
- ✅ Rotate APP_SECRET monthly

---

## 9. Debugging

### Enable Debug Logs

```bash
# In .env
LOG_LEVEL=debug

# Restart application
npm run dev
```

### Check Logs

```bash
# Successful validation
grep "Webhook signature validated successfully" logs/app.log

# Failed validation
grep "Signature validation failed" logs/app.log

# Missing signature
grep "Missing X-Hub-Signature-256" logs/app.log
```

### Verify Configuration

```bash
# Check all webhook-related config
cd Backend
node -e "
const config = require('./src/config/whatsapp.config').default();
console.log('Webhook Secret:', config.webhookSecret ? '✅ SET' : '❌ NOT SET');
console.log('Validation Disabled:', config.disableWebhookValidation ? '⚠️  YES' : '✅ NO');
"
```

---

## 10. Resources

**Documentation:**
- [Full Security Documentation](./WEBHOOK_SIGNATURE_VALIDATION.md)
- [Security Audit Report](./WEBHOOK_SECURITY_AUDIT_REPORT.md)
- [WhatsApp Cloud API Docs](https://developers.facebook.com/docs/whatsapp/cloud-api)

**Code Locations:**
- Validator: `Backend/src/modules/whatsapp/security/webhook-signature.validator.ts`
- Guard: `Backend/src/modules/whatsapp/guards/webhook-signature.guard.ts`
- Controller: `Backend/src/modules/whatsapp/whatsapp.controller.ts`
- Config: `Backend/src/config/whatsapp.config.ts`

**Tests:**
- Validator: `Backend/src/modules/whatsapp/security/webhook-signature.validator.spec.ts`
- Guard: `Backend/src/modules/whatsapp/guards/webhook-signature.guard.spec.ts`

---

## Quick Commands Cheat Sheet

```bash
# Set up environment
cp Backend/.env.example Backend/.env
# Edit .env and add META_APP_SECRET

# Install dependencies
cd Backend && npm install

# Run tests
npm test -- webhook-signature

# Start dev server
npm run dev

# Test webhook (no signature - should fail)
curl -X POST http://localhost:3000/api/v1/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -d '{"test":"data"}'

# Generate signature for testing
PAYLOAD='{"test":"data"}'
APP_SECRET="your-secret"
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$APP_SECRET" | cut -d' ' -f2)

# Test webhook (with signature - should succeed)
curl -X POST http://localhost:3000/api/v1/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=$SIGNATURE" \
  -d "$PAYLOAD"

# Check logs
tail -f logs/app.log | grep "Webhook"
```

---

## Need Help?

1. **Check logs first:** `tail -f logs/app.log`
2. **Run tests:** `npm test -- webhook-signature`
3. **Verify config:** Check `.env` file for `META_APP_SECRET`
4. **Read docs:** [WEBHOOK_SIGNATURE_VALIDATION.md](./WEBHOOK_SIGNATURE_VALIDATION.md)
5. **Check Meta dashboard:** Verify App Secret is correct

---

**Security Status:** 🔒 **SECURE**

Your WhatsApp webhook is now protected with mandatory HMAC SHA256 signature validation!
