# Phase 6: Real WhatsApp Integration - Complete Guide

**Status**: ✅ Ready for Production Testing
**Date**: 2025-10-24
**ngrok Tunnel**: `https://grayce-nonrevocable-criminologically.ngrok-free.dev`

---

## ✅ Completed Setup

### 1. Backend Service
- ✅ Running on http://localhost:3000
- ✅ AI Service configured (gpt-3.5-turbo)
- ✅ Database connected
- ✅ Webhook endpoint: `/api/v1/whatsapp/webhook`
- ✅ Verify token: `dev-webhook-verify-token`

### 2. ngrok Tunnel
- ✅ Installed via `@ngrok/ngrok` npm package
- ✅ Configured with authtoken
- ✅ Active tunnel: https://grayce-nonrevocable-criminologically.ngrok-free.dev
- ✅ Local verification passing

### 3. Launcher Script
- ✅ Created: `start-ngrok-programmatic.js`
- ✅ Handles cross-platform binary issues
- ✅ Displays setup instructions

---

## 📋 Step-by-Step: Meta Developer Console Configuration

### Prerequisites
- Facebook Developer account
- WhatsApp Business app created
- Phone number verified with Meta

### Step 1: Access Meta Developer Console

1. Open: https://developers.facebook.com/apps/
2. Log in with your Facebook Developer account
3. Select your WhatsApp Business application

### Step 2: Navigate to WhatsApp Configuration

1. In the left sidebar, click **"WhatsApp"**
2. Click **"Configuration"** under WhatsApp settings
3. Locate the **"Webhook"** section

### Step 3: Configure Webhook

Click **"Edit"** next to the Webhook URL and enter:

```
Callback URL:  https://grayce-nonrevocable-criminologically.ngrok-free.dev/api/v1/whatsapp/webhook
Verify Token:  dev-webhook-verify-token
```

**Important**:
- Copy the URL exactly as shown (including `/api/v1/whatsapp/webhook`)
- The verify token is case-sensitive
- Make sure ngrok is running before clicking "Verify and Save"

### Step 4: Verify Webhook

1. Click **"Verify and Save"**
2. Meta will send a GET request to verify the webhook
3. You should see:
   - ✅ "Webhook verified successfully" message
   - Green checkmark next to webhook URL

**If verification fails**, check:
- Is ngrok tunnel still running? (Check terminal)
- Is backend service running on port 3000?
- Is the verify token correct in `.env` file?

### Step 5: Subscribe to Webhook Events

In the **"Webhook fields"** section, subscribe to:

- ✅ **messages** - Receive incoming messages
- ✅ **message_status** - Track message delivery status

Click **"Save"** after selecting events.

### Step 6: Get Test Phone Number (Development Mode)

1. In WhatsApp Configuration, go to **"API Setup"**
2. Note the **"Phone Number ID"** and **"WhatsApp Business Account ID"**
3. Add test recipient numbers in **"To"** field
4. Copy the **"Temporary access token"** (valid 24 hours)

---

## 🧪 Testing Your Integration

### Test 1: Webhook Verification (Manual)

Run this in your terminal:

```bash
curl "https://grayce-nonrevocable-criminologically.ngrok-free.dev/api/v1/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=dev-webhook-verify-token&hub.challenge=test123"
```

**Expected Output**: `test123`

✅ **Result**: Working (verified locally)

### Test 2: Send Test Message via Meta Console

1. In Meta Developer Console, go to **WhatsApp > API Setup**
2. Find the **"Send and receive messages"** section
3. Enter a test phone number
4. Click **"Send Message"**

**Expected Flow**:
1. Message appears in ngrok dashboard (http://localhost:4040)
2. Backend logs show webhook received
3. AI processes message
4. Response sent back to phone number

### Test 3: Real WhatsApp Message

1. Send a message to your WhatsApp Business number from your personal phone
2. Check ngrok dashboard for incoming webhook
3. Check backend logs:
   ```bash
   # In Backend directory
   npm run start:dev

   # Watch for:
   [WhatsAppService] Webhook received
   [AIService] Processing message
   [WhatsAppService] Sending response
   ```

### Test 4: Monitor ngrok Dashboard

Open http://localhost:4040 in your browser

**Features**:
- View all incoming requests
- See request/response bodies
- Replay requests for debugging
- Check response times

---

## 📊 Expected Behavior

### When Message Received:

1. **ngrok Dashboard** shows POST request to `/api/v1/whatsapp/webhook`
2. **Backend Logs**:
   ```
   [WhatsAppController] POST /api/v1/whatsapp/webhook
   [WhatsAppService] Processing message from +1234567890
   [AIService] Generating response for: "Hello"
   [CacheService] Cache MISS: <hash>
   [AIService] OpenAI API call successful
   [CacheService] Cache SET: <hash>
   [WhatsAppService] Sending message to +1234567890
   ```
3. **User Receives**: AI-generated response in WhatsApp

### AI Response Caching:

- **First time**: Cache MISS → OpenAI API call → Response cached
- **Second time**: Cache HIT → Instant response (90%+ cost savings)

---

## 🔍 Troubleshooting

### Issue: Webhook Verification Fails

**Symptoms**: Meta shows "Failed to verify webhook"

**Solutions**:

1. Check ngrok is running:
   ```bash
   curl http://localhost:4040/api/tunnels
   ```

2. Check backend is running:
   ```bash
   curl http://localhost:3000/api/v1/whatsapp/health
   ```

3. Check verify token matches:
   ```bash
   # In Backend/.env
   WHATSAPP_VERIFY_TOKEN=dev-webhook-verify-token
   ```

4. Test locally:
   ```bash
   curl "http://localhost:3000/api/v1/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=dev-webhook-verify-token&hub.challenge=test"
   ```

### Issue: Messages Not Received

**Symptoms**: Sending message to WhatsApp but webhook not triggered

**Solutions**:

1. Check webhook subscription in Meta Console:
   - WhatsApp > Configuration > Webhook Fields
   - Ensure "messages" is checked ✅

2. Check phone number is verified:
   - WhatsApp > API Setup
   - Add your test phone to recipient list

3. Check ngrok dashboard:
   - Open http://localhost:4040
   - Look for incoming requests
   - If no requests, Meta isn't sending webhooks

4. Check backend logs for errors:
   ```bash
   # Look for errors in terminal running backend
   [ERROR] ...
   ```

### Issue: ngrok Free Warning Page

**Symptoms**: Browser shows ngrok warning page when opening URL

**This is normal!** ngrok free plan shows warning in browsers, but:
- ✅ Webhook API calls work fine
- ✅ Meta verification works
- ✅ Message delivery works

To avoid warning:
- Upgrade to ngrok paid plan ($8/month)
- Or use alternative: localtunnel, serveo, etc.

### Issue: AI Not Responding

**Symptoms**: Webhook received, but no AI response

**Solutions**:

1. Check OpenAI API key:
   ```bash
   # In Backend/.env
   OPENAI_API_KEY=sk-...
   ```

2. Check AI service logs:
   ```bash
   # Look for:
   [AIService] Error: ...
   ```

3. Check OpenAI API quota:
   - Visit https://platform.openai.com/usage
   - Ensure you have credits

4. Test AI service directly:
   ```bash
   curl -X POST http://localhost:3000/api/v1/ai/chat \
     -H "Content-Type: application/json" \
     -d '{"message":"test"}'
   ```

---

## 🚀 Production Deployment

### When Moving to Production:

1. **Replace ngrok with permanent domain**:
   - Deploy backend to cloud service (Heroku, AWS, DigitalOcean)
   - Get SSL certificate (Let's Encrypt)
   - Update webhook URL in Meta Console

2. **Update environment variables**:
   ```bash
   # Production .env
   NODE_ENV=production
   WHATSAPP_VERIFY_TOKEN=<strong-random-token>
   OPENAI_API_KEY=<production-key>
   DATABASE_URL=<production-db>
   ```

3. **Enable production features**:
   - Rate limiting (already implemented)
   - Request logging
   - Error monitoring (Sentry)
   - Analytics tracking

4. **Security checklist**:
   - ✅ HTTPS enabled
   - ✅ Verify token is strong (32+ characters)
   - ✅ WhatsApp signature validation enabled
   - ✅ Rate limiting active
   - ✅ Input validation on all endpoints
   - ✅ Database connections encrypted

---

## 📈 Monitoring & Metrics

### Key Metrics to Track:

1. **Webhook Performance**:
   - Response time (target: < 500ms)
   - Success rate (target: 99%+)
   - Error rate

2. **AI Cache Performance**:
   - Cache hit rate (target: 90%+)
   - Average response time with cache
   - Cost savings estimate

3. **Message Volume**:
   - Messages received per day
   - Messages sent per day
   - Active conversations

### View Cache Statistics:

```bash
# If you add a cache stats endpoint
curl http://localhost:3000/api/v1/ai/cache/stats
```

**Expected Output**:
```json
{
  "total_entries": 150,
  "total_hits": 450,
  "avg_confidence": 0.92,
  "cache_size_mb": 2.5,
  "hit_rate": "90.2%"
}
```

---

## 🎯 Success Criteria

Phase 6 is complete when:

- ✅ Webhook verified in Meta Developer Console
- ✅ Test message received and processed
- ✅ AI response sent back to WhatsApp
- ✅ Cache working (second message instant)
- ✅ ngrok dashboard showing traffic
- ✅ No errors in backend logs
- ✅ Multi-language support working (try Russian message)

---

## 📝 Next Steps

After completing Phase 6:

1. **Test multi-language support**:
   - Send messages in English, Russian, Spanish
   - Verify AI responds in correct language

2. **Test booking flow**:
   - "Хочу записаться на маникюр"
   - Verify booking creation in database

3. **Test cache performance**:
   - Send same message twice
   - Verify second response is instant (cache hit)

4. **Load testing**:
   - Simulate multiple concurrent messages
   - Verify system handles load

5. **Deploy to production**:
   - Follow production deployment guide above

---

## 🔗 Useful Links

- **ngrok Dashboard**: http://localhost:4040
- **Backend Health**: http://localhost:3000/api/v1/whatsapp/health
- **Meta Developer Console**: https://developers.facebook.com/apps/
- **WhatsApp API Docs**: https://developers.facebook.com/docs/whatsapp
- **Project Documentation**: C:\whatsapp-saas-starter\docs\

---

## 💾 Current Configuration

```yaml
Environment: Development
Backend: http://localhost:3000
Public URL: https://grayce-nonrevocable-criminologically.ngrok-free.dev
Webhook: /api/v1/whatsapp/webhook
Verify Token: dev-webhook-verify-token
AI Model: gpt-3.5-turbo
Database: PostgreSQL (local)
Cache: Enabled (90%+ target hit rate)
```

---

## 📞 Support

If you encounter issues:

1. Check troubleshooting section above
2. Review backend logs
3. Check ngrok dashboard for request details
4. Verify Meta Developer Console settings

**Common Issues Already Solved**:
- ✅ ngrok binary platform mismatch (fixed with @ngrok/ngrok)
- ✅ Windows path issues (solved with programmatic launcher)
- ✅ Webhook verification working locally
