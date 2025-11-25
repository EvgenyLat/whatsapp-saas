# WhatsApp Webhook Testing with ngrok - Local Development Guide

Complete guide to setting up ngrok for testing WhatsApp Business API webhooks during local development.

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Task 1: ngrok Installation & Setup](#task-1-ngrok-installation--setup)
4. [Task 2: Meta Webhook Configuration](#task-2-meta-webhook-configuration)
5. [Task 3: Testing & Verification](#task-3-testing--verification)
6. [Task 4: Monitoring & Debugging](#task-4-monitoring--debugging)
7. [Security Considerations](#security-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Best Practices](#best-practices)

---

## Overview

### What is ngrok?

ngrok is a tunneling service that creates a secure public URL pointing to your local development server. This allows external services (like Meta's WhatsApp API) to send webhooks to your localhost during development.

### Architecture

```
WhatsApp API (Meta Cloud)
    |
    | HTTPS Webhook Events
    v
ngrok Public URL (https://abc123.ngrok.io)
    |
    | Tunnel
    v
ngrok Client (Your Machine)
    |
    | HTTP
    v
NestJS Backend (localhost:3000)
    |
    v
Webhook Endpoints:
  - GET  /api/v1/whatsapp/webhook  (Verification)
  - POST /api/v1/whatsapp/webhook  (Events)
```

### What This Guide Covers

- Installing ngrok on Windows
- Starting ngrok tunnel to localhost:3000
- Configuring Meta Business Suite webhooks
- Setting up environment variables
- Testing webhook verification
- Monitoring webhook requests
- Debugging common issues

---

## Prerequisites

### Required Services

- [ ] NestJS backend running on `http://localhost:3000`
- [ ] PostgreSQL database running and configured
- [ ] Redis server running (for job queues)
- [ ] Meta Developer Account with WhatsApp Business API access
- [ ] Meta App with WhatsApp product configured

### Verify Backend is Running

```bash
# Check if backend is running
curl http://localhost:3000/api/v1/whatsapp/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2025-10-24T12:34:56.789Z"
}
```

### Environment Files

Ensure you have configured:
- `C:\whatsapp-saas-starter\Backend\.env`

---

## Task 1: ngrok Installation & Setup

### Step 1.1: Check if ngrok is Already Installed

Open PowerShell or Command Prompt and run:

```powershell
where ngrok
```

**If ngrok is found**: You'll see the path to ngrok.exe. Skip to Step 1.3.

**If not found**: Continue to Step 1.2.

### Step 1.2: Install ngrok on Windows

#### Option A: Using Chocolatey (Recommended)

```powershell
# Install Chocolatey if not already installed
# Run PowerShell as Administrator
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install ngrok
choco install ngrok
```

#### Option B: Using Scoop

```powershell
# Install Scoop if not already installed
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex

# Install ngrok
scoop install ngrok
```

#### Option C: Manual Installation

1. Download ngrok from: https://ngrok.com/download
2. Extract the ZIP file
3. Move `ngrok.exe` to a directory in your PATH (e.g., `C:\Windows\System32`)
4. Verify installation:

```powershell
ngrok version
```

### Step 1.3: Create ngrok Account (Free Tier)

1. Go to: https://dashboard.ngrok.com/signup
2. Sign up with email or GitHub
3. Verify your email address
4. Login to dashboard: https://dashboard.ngrok.com/

### Step 1.4: Get Your ngrok Auth Token

1. Navigate to: https://dashboard.ngrok.com/get-started/your-authtoken
2. Copy your authtoken (looks like: `2abcdefGHIJklmNOPqrsTUVwxyz123456789_ABCDEFghijklmn`)

### Step 1.5: Configure ngrok Auth Token

```powershell
ngrok config add-authtoken YOUR_AUTH_TOKEN_HERE
```

Example:
```powershell
ngrok config add-authtoken 2abcdefGHIJklmNOPqrsTUVwxyz123456789_ABCDEFghijklmn
```

**Expected Output:**
```
Authtoken saved to configuration file: C:\Users\YourUsername\.ngrok2\ngrok.yml
```

### Step 1.6: Start ngrok Tunnel

Open a new terminal window and run:

```powershell
ngrok http 3000
```

**Expected Output:**

```
ngrok

Session Status                online
Account                       your-email@example.com (Plan: Free)
Version                       3.5.0
Region                        United States (us)
Latency                       23ms
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123def456.ngrok.io -> http://localhost:3000

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

### Step 1.7: Copy Your Public HTTPS URL

**IMPORTANT:** Copy the HTTPS Forwarding URL. It will look like:
```
https://abc123def456.ngrok.io
```

**Note:**
- This URL changes every time you restart ngrok (on free tier)
- Keep ngrok running in a terminal window
- Do NOT use the HTTP URL - WhatsApp requires HTTPS

### Step 1.8: Test ngrok Tunnel

In another terminal:

```bash
# Test health endpoint through ngrok
curl https://abc123def456.ngrok.io/api/v1/whatsapp/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2025-10-24T12:34:56.789Z"
}
```

---

## Task 2: Meta Webhook Configuration

### Step 2.1: Configure Environment Variables

Edit `C:\whatsapp-saas-starter\Backend\.env`:

```bash
# WhatsApp Webhook Configuration
# Generate a random verify token:
# PowerShell: -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
# Or use: openssl rand -base64 32

WHATSAPP_VERIFY_TOKEN=your-secure-random-verify-token-here-32chars
WHATSAPP_WEBHOOK_SECRET=your-webhook-secret-for-signature-validation

# Example (CHANGE THESE):
# WHATSAPP_VERIFY_TOKEN=k8L9mN3pQ7rS2tU5vW8xY1zA4bC6dE9fG2hJ5kM8nP0qR3sT6uV9wX2yZ5aB8cD1
# WHATSAPP_WEBHOOK_SECRET=webhook_secret_abc123def456ghi789jkl012mno345pqr678stu901vwx234
```

**Current Configuration Check:**

Based on your `.env` file:
```bash
WHATSAPP_VERIFY_TOKEN=dev-webhook-verify-token
WHATSAPP_WEBHOOK_SECRET=dev-webhook-secret
```

**For Development:** You can use the existing tokens above.

**For Production:** Generate new secure tokens using:

```powershell
# PowerShell - Generate random token
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

### Step 2.2: Restart Backend Server

After updating `.env`, restart your NestJS backend:

```bash
cd C:\whatsapp-saas-starter\Backend
npm run dev
```

Wait for:
```
[Nest] 12345  - 10/24/2025, 12:34:56 PM     LOG [NestApplication] Nest application successfully started
```

### Step 2.3: Access Meta Business Suite

1. Go to: https://developers.facebook.com/apps/
2. Select your WhatsApp Business API App
3. Click on "WhatsApp" in the left sidebar
4. Click on "Configuration" or "Webhooks"

### Step 2.4: Configure Webhook URL

#### In Meta Developer Console:

1. **Callback URL**: Enter your ngrok URL + webhook path
   ```
   https://abc123def456.ngrok.io/api/v1/whatsapp/webhook
   ```

2. **Verify Token**: Enter the EXACT token from your `.env` file
   ```
   dev-webhook-verify-token
   ```

   **CRITICAL:** This must match `WHATSAPP_VERIFY_TOKEN` in your `.env` exactly.

3. Click "Verify and Save"

#### Expected Behavior:

Meta will send a GET request to verify your webhook:
```
GET https://abc123def456.ngrok.io/api/v1/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=dev-webhook-verify-token&hub.challenge=1234567890
```

Your backend will:
1. Validate `hub.verify_token` matches your `WHATSAPP_VERIFY_TOKEN`
2. Return the `hub.challenge` value
3. Meta validates the response and marks webhook as verified

**Success Message:** "Webhook verified successfully"

### Step 2.5: Subscribe to Webhook Events

After verification, subscribe to these events:

- [x] **messages** - Incoming messages from users
- [x] **message_status** - Message delivery, read receipts, failures

Click "Subscribe" for each event.

### Step 2.6: Configure App Secret (For Signature Validation)

1. In your Meta App settings, go to "Settings" > "Basic"
2. Copy your "App Secret" (click "Show")
3. Update your `.env` file:

```bash
# Meta App Configuration
META_APP_SECRET=your-meta-app-secret-from-dashboard

# This is used for webhook signature validation
WHATSAPP_WEBHOOK_SECRET=your-meta-app-secret-from-dashboard
```

**Note:** The `WHATSAPP_WEBHOOK_SECRET` should match your Meta App Secret for proper signature verification.

---

## Task 3: Testing & Verification

### Step 3.1: Test Webhook Verification (GET Request)

```bash
# Test webhook verification manually
curl "https://abc123def456.ngrok.io/api/v1/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=dev-webhook-verify-token&hub.challenge=test123"

# Expected response: test123
```

### Step 3.2: Check Backend Logs

In your backend terminal, you should see:

```
[Nest] 12345  - 10/24/2025, 12:34:56 PM     LOG [WhatsAppController] Webhook verification request received
[Nest] 12345  - 10/24/2025, 12:34:56 PM     LOG [WhatsAppController] Webhook verified successfully
```

### Step 3.3: Send Test Message from WhatsApp

#### Option A: Using WhatsApp Business Test Number

1. In Meta Developer Console > WhatsApp > API Setup
2. Find "Send and receive messages"
3. Add your phone number to test recipients
4. Verify your phone number (you'll receive a code)
5. Send a test message TO the WhatsApp Business number

#### Option B: Using Real WhatsApp User

1. Have a user send a message to your WhatsApp Business number
2. Message must be initiated by the user (24-hour window rule)

### Step 3.4: Monitor Incoming Webhook

When a message is received, you should see:

**In ngrok Web Interface (http://localhost:4040):**
```
POST /api/v1/whatsapp/webhook  200 OK  45ms
```

**In Backend Logs:**
```
[Nest] 12345  - 10/24/2025, 12:35:10 PM     LOG [WhatsAppController] Webhook event received
[Nest] 12345  - 10/24/2025, 12:35:10 PM     LOG [WebhookService] Processing WhatsApp webhook event
[Nest] 12345  - 10/24/2025, 12:35:10 PM     LOG [WebhookService] Processing incoming message wamid.ABC123... for salon salon-id-123
[Nest] 12345  - 10/24/2025, 12:35:10 PM     LOG [WebhookService] Incoming message wamid.ABC123... processed successfully
[Nest] 12345  - 10/24/2025, 12:35:10 PM     LOG [WhatsAppController] Webhook processed successfully
```

### Step 3.5: Verify Database Records

Check if webhook data was saved:

```sql
-- Check webhook logs
SELECT * FROM webhook_log ORDER BY created_at DESC LIMIT 5;

-- Check messages
SELECT * FROM message ORDER BY created_at DESC LIMIT 5;

-- Check conversations
SELECT * FROM conversation ORDER BY last_message_at DESC LIMIT 5;
```

### Step 3.6: Testing Checklist

```
[x] ngrok installed and configured
[x] ngrok tunnel running (https://abc123def456.ngrok.io)
[x] Backend running on localhost:3000
[x] Environment variables configured (.env)
[x] Meta webhook URL configured
[x] Meta verify token matches .env
[x] Webhook verification successful (GET request)
[x] Subscribed to messages and message_status events
[x] Test message sent from WhatsApp
[x] Webhook received POST request
[x] Backend logs show successful processing
[x] Database records created (webhook_log, message, conversation)
[x] ngrok dashboard shows request/response
```

---

## Task 4: Monitoring & Debugging

### 4.1: ngrok Web Interface

Access ngrok's built-in dashboard:

```
http://localhost:4040
```

**Features:**
- Real-time request list
- Request/response inspection
- Replay requests
- Request timing
- Status codes

**How to Use:**

1. Open http://localhost:4040 in your browser
2. Click on any request to see full details
3. Inspect headers, body, response
4. Use "Replay" to resend the same request

**Example: Inspecting a Webhook Request**

1. Click on `POST /api/v1/whatsapp/webhook`
2. View "Raw" tab for complete request
3. Check headers for `X-Hub-Signature-256`
4. Inspect JSON payload
5. View response status and body

### 4.2: Backend Logging

Your backend has comprehensive logging configured:

```typescript
// Current Log Levels
LOG_LEVEL=debug  // Shows: error, warn, info, debug
```

**Key Log Messages:**

```
[WhatsAppController] Webhook verification request received
[WhatsAppController] Webhook verified successfully
[WhatsAppController] Webhook event received
[WebhookService] Processing WhatsApp webhook event
[WebhookService] Processing incoming message {message_id}
[WebhookService] Incoming message {message_id} processed successfully
```

**How to Tail Logs:**

```bash
# In your backend terminal, logs appear automatically
# Or filter for specific components:

# Watch webhook-related logs only
npm run dev | findstr "Webhook"

# Watch all logs with timestamps
npm run dev
```

### 4.3: Database Monitoring

**Webhook Logs Table:**

```sql
-- View recent webhook events
SELECT
  id,
  salon_id,
  event_type,
  status,
  error,
  created_at
FROM webhook_log
ORDER BY created_at DESC
LIMIT 10;

-- Check for failed webhooks
SELECT * FROM webhook_log
WHERE status = 'FAILED'
ORDER BY created_at DESC;
```

**Messages Table:**

```sql
-- View recent messages
SELECT
  id,
  salon_id,
  direction,
  message_type,
  content,
  status,
  whatsapp_id,
  created_at
FROM message
ORDER BY created_at DESC
LIMIT 10;

-- Check message statuses
SELECT status, COUNT(*)
FROM message
GROUP BY status;
```

### 4.4: Debugging Tools

#### Test Webhook Signature Validation

Your backend validates webhook signatures using the Meta App Secret:

```typescript
// In whatsapp.service.ts (lines 255-272)
verifyWebhookSignature(payload: string, signature: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', this.webhookSecret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(signatureToVerify, 'hex'),
  );
}
```

**Manual Testing:**

```bash
# Generate signature for testing
node -e "const crypto = require('crypto'); const payload = '{\"test\":\"data\"}'; const secret = 'dev-webhook-secret'; console.log('sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex'));"
```

#### Check Webhook Configuration

```typescript
// Verify config is loaded
console.log({
  apiUrl: configService.get('whatsapp.apiUrl'),
  apiVersion: configService.get('whatsapp.apiVersion'),
  webhookVerifyToken: configService.get('whatsapp.webhookVerifyToken'),
  webhookSecret: configService.get('whatsapp.webhookSecret')
});
```

#### Test Webhook Endpoint Manually

```bash
# Test verification
curl "https://abc123def456.ngrok.io/api/v1/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=dev-webhook-verify-token&hub.challenge=test-challenge"

# Expected: test-challenge

# Test webhook POST (simulate Meta webhook)
curl -X POST https://abc123def456.ngrok.io/api/v1/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=YOUR_CALCULATED_SIGNATURE" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [{
      "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
      "changes": [{
        "value": {
          "messaging_product": "whatsapp",
          "metadata": {
            "display_phone_number": "1234567890",
            "phone_number_id": "123456789012345"
          },
          "messages": [{
            "from": "1234567890",
            "id": "wamid.ABC123",
            "timestamp": "1234567890",
            "type": "text",
            "text": {
              "body": "Test message"
            }
          }]
        },
        "field": "messages"
      }]
    }]
  }'
```

---

## Security Considerations

### 5.1: Webhook Signature Verification

**Current Implementation:**

```typescript
// In whatsapp.controller.ts (lines 59-73)
async handleWebhook(
  @Body() body: any,
  @Headers('x-hub-signature-256') signature?: string,
): Promise<{ status: string }> {
  if (signature) {
    const isValid = this.whatsappService.verifyWebhookSignature(payload, signature);
    if (!isValid) {
      throw new UnauthorizedException('Invalid webhook signature');
    }
  }
}
```

**Status:** Signature verification is implemented but optional.

**Security Warning:** In the current code, if `signature` header is missing, the webhook is still processed. This is acceptable for development but should be enforced in production.

**Recommendation for Production:**

```typescript
// Make signature validation mandatory
if (!signature) {
  throw new UnauthorizedException('Missing webhook signature');
}

const isValid = this.whatsappService.verifyWebhookSignature(payload, signature);
if (!isValid) {
  throw new UnauthorizedException('Invalid webhook signature');
}
```

### 5.2: Verify Token Security

**Current Setup:**
```bash
WHATSAPP_VERIFY_TOKEN=dev-webhook-verify-token
```

**Best Practices:**

1. **Generate Strong Tokens:**
   ```powershell
   # Generate secure random token
   -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
   ```

2. **Different Tokens for Different Environments:**
   ```bash
   # Development
   WHATSAPP_VERIFY_TOKEN=dev_token_123abc

   # Production
   WHATSAPP_VERIFY_TOKEN=prod_secure_random_token_456def
   ```

3. **Never Commit Tokens to Git:**
   - `.env` should be in `.gitignore`
   - Use `.env.example` for templates

### 5.3: Rate Limiting

**Current Configuration:**

```bash
# From .env.example
WEBHOOK_RATE_LIMIT=100
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
```

**Check if Applied to Webhook Endpoints:**

The webhook endpoints should have rate limiting applied. Verify in your NestJS configuration.

**Recommendation:**

```typescript
// Apply rate limiting to webhook endpoint
@UseGuards(ThrottlerGuard)
@Throttle(100, 900) // 100 requests per 15 minutes
@Post('webhook')
async handleWebhook(...) { ... }
```

### 5.4: HTTPS Only

**ngrok:** Automatically provides HTTPS.

**Meta Requirements:** WhatsApp webhooks MUST use HTTPS.

**Production:** Always use HTTPS with valid SSL certificate.

### 5.5: IP Whitelisting

**Meta Webhook IPs:**

For production, consider whitelisting Meta's webhook IP ranges:
- Obtain from: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/ip-addresses

**Implementation:**

```typescript
// Example IP whitelist middleware
@Post('webhook')
@UseGuards(IpWhitelistGuard)
async handleWebhook(...) { ... }
```

### 5.6: Environment Variable Security

**Development:**
- Store in `.env` file (in `.gitignore`)

**Production:**
- Use AWS Secrets Manager (as configured in your app)
- Set `USE_AWS_SECRETS=true`

**Current Setup:**
```bash
USE_AWS_SECRETS=false  # Development
```

---

## Troubleshooting Guide

### Issue 1: Webhook Verification Failed

**Symptom:**
```
Meta Console: "Webhook verification failed"
```

**Possible Causes:**

1. **Verify Token Mismatch**
   ```bash
   # Check your .env file
   WHATSAPP_VERIFY_TOKEN=dev-webhook-verify-token

   # Must match EXACTLY what you entered in Meta Console
   ```

2. **Backend Not Running**
   ```bash
   # Check if backend is running
   curl http://localhost:3000/api/v1/whatsapp/health
   ```

3. **ngrok Not Running**
   ```bash
   # Check ngrok status
   curl http://localhost:4040/api/status
   ```

4. **Wrong Webhook URL**
   ```
   # Correct format:
   https://abc123def456.ngrok.io/api/v1/whatsapp/webhook

   # NOT:
   https://abc123def456.ngrok.io/whatsapp/webhook  (missing /api/v1)
   http://abc123def456.ngrok.io/...  (HTTP not allowed)
   ```

**Solution:**

```bash
# Step 1: Verify backend is running
curl http://localhost:3000/api/v1/whatsapp/health

# Step 2: Verify ngrok tunnel
curl https://YOUR_NGROK_URL.ngrok.io/api/v1/whatsapp/health

# Step 3: Test verification manually
curl "https://YOUR_NGROK_URL.ngrok.io/api/v1/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=dev-webhook-verify-token&hub.challenge=test123"

# Expected: test123

# Step 4: Check backend logs for errors

# Step 5: Re-enter webhook URL in Meta Console
```

### Issue 2: ngrok Session Expired

**Symptom:**
```
ngrok: Session Expired
```

**Cause:** Free ngrok sessions timeout after 2 hours (or account limits).

**Solution:**

```bash
# Stop ngrok (Ctrl+C)
# Restart ngrok
ngrok http 3000

# Copy new URL
# Update webhook URL in Meta Console
```

**Prevention:**

- Upgrade to ngrok paid plan for persistent URLs
- Use `ngrok http 3000 --region us` to select closer region

### Issue 3: Webhook Not Receiving Messages

**Symptom:**
- Verification works
- But POST webhooks not received

**Possible Causes:**

1. **Not Subscribed to Events**
   - Go to Meta Console > WhatsApp > Configuration
   - Ensure "messages" and "message_status" are subscribed

2. **Phone Number Not Registered**
   - Salon's `phone_number_id` in database doesn't match Meta account

   ```sql
   -- Check phone_number_id
   SELECT id, name, phone_number_id FROM salon;
   ```

3. **24-Hour Window Expired**
   - Users can only receive non-template messages within 24 hours of their last message
   - Test by sending a message FROM user TO business

4. **Webhook Signature Validation Failing**
   ```bash
   # Check backend logs for:
   [WhatsAppController] Invalid webhook signature
   ```

**Solution:**

```bash
# Step 1: Check ngrok dashboard (http://localhost:4040)
# Verify POST requests are being received

# Step 2: Check backend logs
# Look for "Webhook event received" and any errors

# Step 3: Check webhook_log table
SELECT * FROM webhook_log ORDER BY created_at DESC LIMIT 5;

# Step 4: Verify phone_number_id matches
# In database AND Meta Console

# Step 5: Test with ngrok request inspector
# Replay failed requests
```

### Issue 4: Invalid Webhook Signature

**Symptom:**
```
[WhatsAppController] Invalid webhook signature
```

**Cause:** `WHATSAPP_WEBHOOK_SECRET` doesn't match Meta App Secret.

**Solution:**

```bash
# Step 1: Get Meta App Secret
# Meta Console > Settings > Basic > App Secret (Show)

# Step 2: Update .env
WHATSAPP_WEBHOOK_SECRET=your-actual-meta-app-secret

# Step 3: Restart backend
npm run dev

# Step 4: Resend test message
```

### Issue 5: Salon Not Found

**Symptom:**
```
[WebhookService] Salon not found for phone_number_id: 123456789012345
```

**Cause:** Database has no salon record with matching `phone_number_id`.

**Solution:**

```sql
-- Check existing salons
SELECT id, name, phone_number_id FROM salon;

-- Update salon with correct phone_number_id
UPDATE salon
SET phone_number_id = '123456789012345'
WHERE id = 'your-salon-id';

-- OR create new salon (via API or SQL)
```

### Issue 6: ngrok URL Changed

**Symptom:**
- Webhooks stop working after ngrok restart

**Cause:** Free ngrok generates new URL on each restart.

**Solution:**

```bash
# Step 1: Get new ngrok URL
# Look at ngrok terminal output
# Forwarding: https://NEW_URL.ngrok.io -> http://localhost:3000

# Step 2: Update Meta Console
# Webhooks > Edit URL > Enter new URL > Verify and Save

# Step 3: Test verification
curl "https://NEW_URL.ngrok.io/api/v1/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=dev-webhook-verify-token&hub.challenge=test"
```

**Prevention:**

- Upgrade to ngrok paid plan for static domains
- Use ngrok configuration file with reserved domain

### Issue 7: Port 3000 Already in Use

**Symptom:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:**

```bash
# Option 1: Kill process on port 3000
netstat -ano | findstr :3000
taskkill /PID <PID_NUMBER> /F

# Option 2: Use different port
ngrok http 3001
# Update backend to run on port 3001
```

---

## Best Practices

### 1. Development Workflow

```bash
# Terminal 1: Start Backend
cd C:\whatsapp-saas-starter\Backend
npm run dev

# Terminal 2: Start ngrok
ngrok http 3000

# Terminal 3: Monitor database (optional)
psql -U postgres -d whatsapp_saas

# Browser Tab 1: ngrok dashboard
http://localhost:4040

# Browser Tab 2: Meta Developer Console
https://developers.facebook.com/apps/
```

### 2. Keep ngrok Running

- Don't close ngrok terminal
- If ngrok crashes, you'll need to update webhook URL in Meta
- Consider running ngrok in background or as service

### 3. Environment Variable Management

```bash
# Use different .env files
Backend/.env              # Active environment
Backend/.env.development  # Development defaults
Backend/.env.example      # Template (committed to git)

# Never commit actual secrets
# .gitignore should include:
.env
.env.local
.env.*.local
```

### 4. Logging Best Practices

```typescript
// Add contextual logging
this.logger.log(`Processing webhook for salon ${salonId}`);
this.logger.debug(`Payload: ${JSON.stringify(payload)}`);
this.logger.error(`Error: ${error.message}`, error.stack);

// Use structured logging
this.logger.log({
  event: 'webhook_received',
  salon_id: salonId,
  message_id: messageId,
  timestamp: new Date().toISOString()
});
```

### 5. Database Maintenance

```sql
-- Regularly check webhook logs
SELECT status, COUNT(*) FROM webhook_log
WHERE created_at > NOW() - INTERVAL '1 day'
GROUP BY status;

-- Monitor failed webhooks
SELECT * FROM webhook_log
WHERE status = 'FAILED'
  AND created_at > NOW() - INTERVAL '1 day';

-- Clean old webhook logs (optional)
DELETE FROM webhook_log
WHERE created_at < NOW() - INTERVAL '30 days';
```

### 6. Testing Checklist

Before each testing session:

```
[ ] PostgreSQL running
[ ] Redis running
[ ] Backend running (localhost:3000)
[ ] Backend .env configured
[ ] ngrok running with HTTPS URL
[ ] Meta webhook URL updated (if ngrok URL changed)
[ ] Meta events subscribed (messages, message_status)
[ ] Test phone number added to Meta account
[ ] ngrok dashboard accessible (localhost:4040)
```

### 7. Debugging Checklist

When webhooks fail:

```
[ ] Check ngrok dashboard for requests
[ ] Check backend logs for errors
[ ] Check database webhook_log table
[ ] Verify WHATSAPP_VERIFY_TOKEN matches Meta
[ ] Verify WHATSAPP_WEBHOOK_SECRET matches Meta App Secret
[ ] Verify phone_number_id in database matches Meta
[ ] Test webhook verification manually with curl
[ ] Check Meta Developer Console for errors
[ ] Verify backend is running on port 3000
[ ] Verify ngrok tunnel is active
```

---

## Quick Reference

### Important URLs

```
ngrok Dashboard:        http://localhost:4040
Backend Health:         http://localhost:3000/api/v1/whatsapp/health
Backend Swagger:        http://localhost:3000/api/docs
Meta Developer Console: https://developers.facebook.com/apps/
ngrok Dashboard (Web):  https://dashboard.ngrok.com/
```

### Important Files

```
Backend Config:         C:\whatsapp-saas-starter\Backend\.env
WhatsApp Controller:    C:\whatsapp-saas-starter\Backend\src\modules\whatsapp\whatsapp.controller.ts
Webhook Service:        C:\whatsapp-saas-starter\Backend\src\modules\whatsapp\webhook.service.ts
WhatsApp Service:       C:\whatsapp-saas-starter\Backend\src\modules\whatsapp\whatsapp.service.ts
```

### Important Commands

```bash
# Start ngrok
ngrok http 3000

# Start backend
cd C:\whatsapp-saas-starter\Backend && npm run dev

# Test webhook verification
curl "https://YOUR_URL.ngrok.io/api/v1/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=dev-webhook-verify-token&hub.challenge=test"

# Check backend health
curl http://localhost:3000/api/v1/whatsapp/health

# View ngrok requests
curl http://localhost:4040/api/requests

# Generate random token
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Environment Variables Reference

```bash
# Webhook Configuration
WHATSAPP_VERIFY_TOKEN=dev-webhook-verify-token
WHATSAPP_WEBHOOK_SECRET=dev-webhook-secret

# WhatsApp API
WHATSAPP_API_VERSION=v18.0
WHATSAPP_API_URL=https://graph.facebook.com

# Meta App
META_APP_SECRET=your-meta-app-secret
META_VERIFY_TOKEN=same-as-whatsapp-verify-token

# Rate Limiting
WEBHOOK_RATE_LIMIT=100
RATE_LIMIT_WINDOW_MS=900000
```

---

## Next Steps

After completing this setup:

1. **Test Different Message Types**
   - Text messages
   - Images
   - Documents
   - Audio
   - Video

2. **Test Status Updates**
   - Message sent
   - Message delivered
   - Message read
   - Message failed

3. **Implement Error Handling**
   - Handle invalid payloads
   - Handle duplicate messages
   - Handle missing salon records

4. **Setup Monitoring**
   - Create alerts for failed webhooks
   - Monitor webhook latency
   - Track webhook success rates

5. **Production Planning**
   - Replace ngrok with proper domain
   - Implement IP whitelisting
   - Enable mandatory signature verification
   - Setup AWS Secrets Manager
   - Configure production logging

---

## Support & Resources

### Documentation
- WhatsApp Cloud API: https://developers.facebook.com/docs/whatsapp/cloud-api
- ngrok Documentation: https://ngrok.com/docs
- NestJS Documentation: https://docs.nestjs.com

### Troubleshooting
- Meta Developer Support: https://developers.facebook.com/support/
- ngrok Status: https://status.ngrok.com/
- WhatsApp Business API Status: https://developers.facebook.com/status/

### Community
- WhatsApp Business Developers: https://www.facebook.com/groups/whatsappbusiness
- ngrok Community: https://ngrok.com/slack

---

**Last Updated:** 2025-10-24
**Version:** 1.0.0
**Maintainer:** DevOps Team
