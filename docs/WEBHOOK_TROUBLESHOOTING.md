# WhatsApp Webhook Troubleshooting Quick Reference

Quick diagnostic guide for common webhook issues during local development with ngrok.

---

## Quick Diagnostic Commands

```bash
# 1. Check if backend is running
curl http://localhost:3000/api/v1/whatsapp/health

# 2. Check if ngrok tunnel is active
curl http://localhost:4040/api/status

# 3. Test webhook verification
curl "https://YOUR_NGROK_URL.ngrok.io/api/v1/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=YOUR_VERIFY_TOKEN&hub.challenge=test123"

# 4. Check ngrok requests
# Open: http://localhost:4040
```

---

## Issue Matrix

| Symptom | Likely Cause | Quick Fix |
|---------|--------------|-----------|
| "Webhook verification failed" in Meta | Token mismatch | Check WHATSAPP_VERIFY_TOKEN in .env matches Meta Console |
| ngrok "Session Expired" | Free tier timeout | Restart ngrok, update URL in Meta |
| "Salon not found" in logs | Database mismatch | Check phone_number_id in database matches Meta |
| "Invalid webhook signature" | Secret mismatch | Update WHATSAPP_WEBHOOK_SECRET with Meta App Secret |
| Verification works, no POST webhooks | Not subscribed | Subscribe to "messages" event in Meta Console |
| Backend not responding | Port issue | Check if backend is running on port 3000 |
| ngrok URL doesn't work | HTTPS required | Use HTTPS URL from ngrok, not HTTP |

---

## Common Errors & Solutions

### 1. Webhook Verification Failed

**Error in Meta Console:**
```
The callback URL or verify token couldn't be validated. Please verify the provided information or try again later.
```

**Diagnosis:**
```bash
# Test manually
curl "https://YOUR_URL.ngrok.io/api/v1/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=dev-webhook-verify-token&hub.challenge=test"

# If this returns "test", backend is working
# If Meta still fails, check:
```

**Checklist:**
- [ ] Backend running (`curl http://localhost:3000/api/v1/whatsapp/health`)
- [ ] ngrok tunnel active (`http://localhost:4040`)
- [ ] Correct webhook URL format: `https://xxx.ngrok.io/api/v1/whatsapp/webhook`
- [ ] Verify token in Meta matches `.env` EXACTLY (case-sensitive)
- [ ] No trailing slash in webhook URL
- [ ] Using HTTPS URL (not HTTP)

---

### 2. Webhooks Not Received

**Symptom:** Verification succeeds, but POST webhooks never arrive

**Diagnosis Steps:**

```bash
# Step 1: Check ngrok dashboard
# Open: http://localhost:4040
# Send a test message from WhatsApp
# Do you see a POST request?

# YES -> Backend issue (check logs)
# NO  -> Meta configuration issue
```

**If ngrok shows request but backend fails:**

```bash
# Check backend logs for errors
# Common errors:
# - "Salon not found for phone_number_id: xxx"
# - "Invalid webhook signature"
# - "Unauthorized"
```

**If ngrok shows NO requests:**

**Checklist:**
- [ ] Subscribed to "messages" event in Meta Console
- [ ] Subscribed to "message_status" event in Meta Console
- [ ] Webhook URL still correct (ngrok URL didn't change)
- [ ] Test phone number added to Meta account
- [ ] Message sent FROM user TO business (not business to user)
- [ ] Within 24-hour messaging window

---

### 3. Salon Not Found

**Error in logs:**
```
[WebhookService] Salon not found for phone_number_id: 123456789012345
```

**Cause:** Your database doesn't have a salon with the matching phone_number_id.

**Solution:**

```sql
-- Check existing salons
SELECT id, name, phone_number_id, is_active FROM salon;

-- Find your phone_number_id in Meta Console:
-- WhatsApp > API Setup > Phone number ID

-- Update existing salon
UPDATE salon
SET phone_number_id = '123456789012345'  -- Replace with your actual ID
WHERE id = 'your-salon-id';

-- Verify it's active
UPDATE salon
SET is_active = true
WHERE id = 'your-salon-id';
```

---

### 4. Invalid Webhook Signature

**Error in logs:**
```
[WhatsAppController] Invalid webhook signature
```

**Cause:** `WHATSAPP_WEBHOOK_SECRET` doesn't match Meta App Secret

**Solution:**

```bash
# Step 1: Get Meta App Secret
# Go to: https://developers.facebook.com/apps/
# Your App > Settings > Basic
# App Secret (click "Show")

# Step 2: Update .env file
# Edit: C:\whatsapp-saas-starter\Backend\.env
WHATSAPP_WEBHOOK_SECRET=your-actual-meta-app-secret-from-step-1

# Step 3: Restart backend
cd C:\whatsapp-saas-starter\Backend
npm run dev

# Step 4: Send test message from WhatsApp
```

---

### 5. ngrok URL Changed

**Symptom:** Webhooks stop working after restarting ngrok

**Cause:** Free ngrok tier generates new random URL each time

**Solution:**

```bash
# Step 1: Get new ngrok URL
# Look at ngrok terminal window
# Forwarding: https://abc123.ngrok.io -> http://localhost:3000

# Step 2: Update Meta Console
# Go to: https://developers.facebook.com/apps/
# Your App > WhatsApp > Configuration
# Edit Webhook URL
# Enter: https://NEW_URL.ngrok.io/api/v1/whatsapp/webhook
# Click "Verify and Save"
```

**Prevention:**
- Upgrade to ngrok paid plan for static URLs
- Use reserved domain feature

---

### 6. Port 3000 Already in Use

**Error when starting backend:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:**

```powershell
# Option 1: Kill process on port 3000
netstat -ano | findstr :3000
# Note the PID (last column)
taskkill /PID <PID> /F

# Option 2: Use different port
# Edit: Backend/.env
PORT=3001

# Update ngrok
ngrok http 3001
```

---

### 7. Missing Environment Variables

**Error when starting backend:**
```
Error: WHATSAPP_VERIFY_TOKEN is not defined
```

**Solution:**

```bash
# Check .env file exists
# Location: C:\whatsapp-saas-starter\Backend\.env

# If missing, copy from example
cd C:\whatsapp-saas-starter\Backend
copy .env.example .env

# Edit .env and set:
WHATSAPP_VERIFY_TOKEN=dev-webhook-verify-token
WHATSAPP_WEBHOOK_SECRET=dev-webhook-secret

# Restart backend
npm run dev
```

---

## Verification Checklist

Use this checklist when setting up or troubleshooting:

### Pre-Flight Check

```
[ ] PostgreSQL running
[ ] Redis running
[ ] Backend .env file exists and configured
[ ] Backend running on port 3000
[ ] Backend health check passes
[ ] ngrok installed and configured with authtoken
[ ] ngrok tunnel running with HTTPS URL
```

### Meta Configuration Check

```
[ ] Meta App created with WhatsApp product
[ ] Webhook URL configured: https://xxx.ngrok.io/api/v1/whatsapp/webhook
[ ] Verify token matches WHATSAPP_VERIFY_TOKEN in .env
[ ] Webhook verified successfully
[ ] Subscribed to "messages" event
[ ] Subscribed to "message_status" event
[ ] Test phone number added
```

### Database Check

```sql
-- Run these queries to verify setup

-- 1. Check salon configuration
SELECT id, name, phone_number_id, is_active, access_token IS NOT NULL as has_token
FROM salon;

-- 2. Check recent webhook logs
SELECT event_type, status, error, created_at
FROM webhook_log
ORDER BY created_at DESC
LIMIT 5;

-- 3. Check recent messages
SELECT direction, message_type, content, status, created_at
FROM message
ORDER BY created_at DESC
LIMIT 5;
```

---

## Testing Workflow

### Manual Verification Test

```bash
# Test 1: Backend health
curl http://localhost:3000/api/v1/whatsapp/health
# Expected: {"status":"ok","timestamp":"..."}

# Test 2: ngrok tunnel
curl https://YOUR_URL.ngrok.io/api/v1/whatsapp/health
# Expected: {"status":"ok","timestamp":"..."}

# Test 3: Webhook verification
curl "https://YOUR_URL.ngrok.io/api/v1/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=dev-webhook-verify-token&hub.challenge=test123"
# Expected: test123
```

### End-to-End Webhook Test

```bash
# Step 1: Open ngrok dashboard
http://localhost:4040

# Step 2: Send test message from WhatsApp
# Use your phone to send a message to the WhatsApp Business number

# Step 3: Check ngrok dashboard
# You should see: POST /api/v1/whatsapp/webhook  200 OK

# Step 4: Check backend logs
# You should see:
# [WhatsAppController] Webhook event received
# [WebhookService] Processing WhatsApp webhook event
# [WebhookService] Processing incoming message wamid.xxx
# [WebhookService] Incoming message wamid.xxx processed successfully

# Step 5: Check database
SELECT * FROM webhook_log ORDER BY created_at DESC LIMIT 1;
SELECT * FROM message ORDER BY created_at DESC LIMIT 1;
```

---

## Debugging Tools

### 1. ngrok Web Inspector

```
URL: http://localhost:4040

Features:
- Real-time request list
- Full request/response inspection
- Request replay
- Header inspection
- Body viewing (JSON/text)

Usage:
1. Open http://localhost:4040
2. Click on any request
3. View "Raw" tab for complete details
4. Click "Replay" to resend request
```

### 2. Backend Logs

```bash
# Watch logs in real-time
cd C:\whatsapp-saas-starter\Backend
npm run dev

# Filter for webhook-related logs
npm run dev | findstr "Webhook"

# Look for these key log messages:
# [WhatsAppController] Webhook verification request received
# [WhatsAppController] Webhook verified successfully
# [WhatsAppController] Webhook event received
# [WebhookService] Processing WhatsApp webhook event
# [WebhookService] Processing incoming message {id}
```

### 3. Database Logs

```sql
-- View all webhook attempts (success and failure)
SELECT
    id,
    salon_id,
    event_type,
    status,
    error,
    created_at,
    payload
FROM webhook_log
ORDER BY created_at DESC
LIMIT 10;

-- Find failed webhooks with details
SELECT
    id,
    event_type,
    error,
    payload,
    created_at
FROM webhook_log
WHERE status = 'FAILED'
ORDER BY created_at DESC;

-- Check message processing
SELECT
    m.id,
    m.direction,
    m.message_type,
    m.content,
    m.status,
    m.whatsapp_id,
    m.created_at
FROM message m
ORDER BY m.created_at DESC
LIMIT 10;
```

### 4. PowerShell Debug Script

```powershell
# Quick diagnostic script
# Save as: check-webhook-status.ps1

Write-Host "WhatsApp Webhook Diagnostic Check" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# Check backend
Write-Host "`nChecking backend..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod "http://localhost:3000/api/v1/whatsapp/health"
    Write-Host "[OK] Backend is running: $($health.status)" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Backend not responding" -ForegroundColor Red
}

# Check ngrok
Write-Host "`nChecking ngrok..." -ForegroundColor Yellow
try {
    $ngrok = Invoke-RestMethod "http://localhost:4040/api/tunnels"
    $tunnel = $ngrok.tunnels | Where-Object { $_.proto -eq "https" } | Select-Object -First 1
    if ($tunnel) {
        Write-Host "[OK] ngrok tunnel active: $($tunnel.public_url)" -ForegroundColor Green
        Write-Host "    Webhook URL: $($tunnel.public_url)/api/v1/whatsapp/webhook" -ForegroundColor Gray
    }
} catch {
    Write-Host "[ERROR] ngrok not running" -ForegroundColor Red
}

# Check environment
Write-Host "`nChecking environment..." -ForegroundColor Yellow
$envPath = "C:\whatsapp-saas-starter\Backend\.env"
if (Test-Path $envPath) {
    Write-Host "[OK] .env file exists" -ForegroundColor Green
    $content = Get-Content $envPath
    $verifyToken = ($content | Select-String "WHATSAPP_VERIFY_TOKEN=(.+)" | ForEach-Object { $_.Matches.Groups[1].Value })
    if ($verifyToken) {
        Write-Host "    Verify Token: $verifyToken" -ForegroundColor Gray
    }
} else {
    Write-Host "[ERROR] .env file not found" -ForegroundColor Red
}

Write-Host "`nDiagnostic complete." -ForegroundColor Cyan
```

---

## Environment Variable Reference

### Required Variables

```bash
# Webhook Verification
WHATSAPP_VERIFY_TOKEN=dev-webhook-verify-token

# Webhook Security
WHATSAPP_WEBHOOK_SECRET=dev-webhook-secret

# WhatsApp API
WHATSAPP_API_VERSION=v18.0
WHATSAPP_API_URL=https://graph.facebook.com
```

### How to Check Current Values

```powershell
# PowerShell
Get-Content C:\whatsapp-saas-starter\Backend\.env | Select-String "WHATSAPP"

# CMD
findstr "WHATSAPP" C:\whatsapp-saas-starter\Backend\.env
```

---

## Log Message Decoder

### Normal Flow

```
[WhatsAppController] Webhook verification request received
  -> Meta is verifying webhook URL

[WhatsAppController] Webhook verified successfully
  -> Verification passed, webhook configured

[WhatsAppController] Webhook event received
  -> New webhook POST from Meta

[WebhookService] Processing WhatsApp webhook event
  -> Starting to process webhook payload

[WebhookService] Processing incoming message wamid.xxx for salon yyy
  -> Processing specific message

[WebhookService] Incoming message wamid.xxx processed successfully
  -> Message saved to database

[WhatsAppController] Webhook processed successfully
  -> Response sent to Meta
```

### Error Messages

```
[WhatsAppController] Webhook verification failed: Invalid token
  -> Verify token mismatch between .env and Meta Console

[WhatsAppController] Invalid webhook signature
  -> WHATSAPP_WEBHOOK_SECRET doesn't match Meta App Secret

[WebhookService] Salon not found for phone_number_id: xxx
  -> Database has no salon with this phone_number_id

[WebhookService] Message xxx already processed, skipping
  -> Duplicate webhook (normal, handled gracefully)

[WhatsAppService] Failed to find salon by phone_number_id
  -> Database query error or salon doesn't exist
```

---

## Quick Reference Commands

```bash
# Restart everything
# Terminal 1
cd C:\whatsapp-saas-starter\Backend
npm run dev

# Terminal 2
ngrok http 3000

# Test webhook
curl "https://YOUR_URL.ngrok.io/api/v1/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=dev-webhook-verify-token&hub.challenge=test"

# View logs
# ngrok: http://localhost:4040
# Backend: See terminal output

# Check database
psql -U postgres -d whatsapp_saas
SELECT * FROM webhook_log ORDER BY created_at DESC LIMIT 5;
```

---

## Get Help

### Documentation
- Full Setup Guide: `C:\whatsapp-saas-starter\docs\NGROK_WEBHOOK_SETUP.md`
- WhatsApp API Docs: https://developers.facebook.com/docs/whatsapp/cloud-api

### Support Resources
- Meta Developer Support: https://developers.facebook.com/support/
- ngrok Documentation: https://ngrok.com/docs
- WhatsApp Business API: https://developers.facebook.com/docs/whatsapp

### Community
- Meta Developers: https://www.facebook.com/groups/fbdevelopers
- WhatsApp Business: https://www.facebook.com/groups/whatsappbusiness

---

**Last Updated:** 2025-10-24
**Version:** 1.0.0
