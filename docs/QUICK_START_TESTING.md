# Quick Start: WhatsApp Integration Testing

## 🚀 Current Status

✅ **Backend Running**: http://localhost:3000
✅ **ngrok Tunnel Active**: https://grayce-nonrevocable-criminologically.ngrok-free.dev
✅ **Webhook Endpoint**: `/api/v1/whatsapp/webhook`
✅ **Verify Token**: `dev-webhook-verify-token`

---

## ⚡ Quick Actions

### 1. Start ngrok (if not running)

```bash
node C:\whatsapp-saas-starter\start-ngrok-programmatic.js
```

Keep terminal open! URL displayed will be your webhook URL.

### 2. Configure Meta Developer Console

**URL**: https://developers.facebook.com/apps/

**Steps**:
1. Select your WhatsApp app
2. WhatsApp → Configuration → Webhook
3. Click "Edit"
4. Enter:
   - **Callback URL**: `https://grayce-nonrevocable-criminologically.ngrok-free.dev/api/v1/whatsapp/webhook`
   - **Verify Token**: `dev-webhook-verify-token`
5. Click "Verify and Save"
6. Subscribe to: `messages` + `message_status`

### 3. Send Test Message

**Option A: Via Meta Console**
1. Go to WhatsApp → API Setup
2. Enter test phone number
3. Click "Send Message"

**Option B: Via Real WhatsApp**
1. Send message to your WhatsApp Business number
2. Check ngrok dashboard: http://localhost:4040
3. Check backend logs for processing

### 4. Verify End-to-End Flow

✅ **Message sent** → WhatsApp
✅ **Webhook received** → ngrok dashboard shows POST
✅ **AI processes** → Backend logs show "Processing message"
✅ **Response sent** → User receives reply
✅ **Cache working** → Second same message instant

---

## 🧪 Test Commands

### Test Webhook Verification
```bash
curl "https://grayce-nonrevocable-criminologically.ngrok-free.dev/api/v1/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=dev-webhook-verify-token&hub.challenge=test123"
```
**Expected**: `test123`

### Test Backend Health
```bash
curl http://localhost:3000/api/v1/whatsapp/health
```
**Expected**: `{"status":"ok"}`

### View ngrok Requests
Open browser: http://localhost:4040

---

## 📋 Test Scenarios

### Scenario 1: Simple Greeting
**Send**: "Привет"
**Expected**: AI greeting in Russian
**Cache**: First time = API call, second time = instant

### Scenario 2: Booking Request
**Send**: "Хочу записаться на маникюр завтра в 14:00"
**Expected**: Booking confirmation
**Verify**: Check database for new booking

### Scenario 3: Service Inquiry
**Send**: "Какие у вас услуги?"
**Expected**: List of available services
**Language**: Response in Russian

### Scenario 4: English Message
**Send**: "What services do you offer?"
**Expected**: Response in English
**Verify**: Multi-language detection working

### Scenario 5: Cache Performance
**Send same message twice**:
1. First: "Hello" → API call (~2-3 seconds)
2. Second: "Hello" → Cached (~100ms)

**Verify in logs**:
- First: `[CacheService] Cache MISS`
- Second: `[CacheService] Cache HIT`

---

## 🔍 Monitoring

### Backend Logs (watch in real-time)
```bash
cd Backend
npm run start:dev
```

**Look for**:
```
[WhatsAppController] POST /api/v1/whatsapp/webhook
[WhatsAppService] Processing message from +1234567890
[AIService] Generating response
[CacheService] Cache HIT/MISS
[WhatsAppService] Sending message
```

### ngrok Dashboard
**URL**: http://localhost:4040

**Features**:
- All HTTP requests
- Request/response bodies
- Response times
- Replay requests

### Database Queries
```bash
# Check latest messages
psql -d whatsapp_saas -c "SELECT * FROM messages ORDER BY created_at DESC LIMIT 5;"

# Check cache statistics
psql -d whatsapp_saas -c "SELECT COUNT(*), AVG(hit_count) FROM ai_response_cache;"
```

---

## ⚠️ Common Issues

### Issue: "Webhook verification failed"
- ✅ Check ngrok is running
- ✅ Check verify token matches
- ✅ Test locally first: `curl http://localhost:3000/...`

### Issue: "No response from AI"
- ✅ Check OpenAI API key in `.env`
- ✅ Check backend logs for errors
- ✅ Test AI endpoint directly

### Issue: "ngrok warning page in browser"
- ℹ️ **This is normal for free plan**
- ✅ Webhook API calls still work
- ✅ Meta verification works fine

---

## 📊 Success Metrics

### Phase 6 Complete When:
- ✅ Webhook verified in Meta Console
- ✅ Test message processed end-to-end
- ✅ AI response received in WhatsApp
- ✅ Cache hit on second same message
- ✅ Multi-language working (English + Russian)
- ✅ Booking flow tested
- ✅ No errors in logs

### Performance Targets:
- Response time: < 2s (first message)
- Response time: < 500ms (cached)
- Cache hit rate: 90%+ (after 100+ messages)
- Webhook success rate: 99%+

---

## 🎯 Next Actions

1. **Configure Meta Developer Console** (5 minutes)
   - See detailed steps in PHASE_6_WHATSAPP_INTEGRATION.md

2. **Send test message** (1 minute)
   - Via Meta Console or real WhatsApp

3. **Verify cache working** (2 minutes)
   - Send same message twice
   - Check logs for MISS then HIT

4. **Test all scenarios above** (10 minutes)
   - Greeting, booking, service inquiry
   - English and Russian messages

5. **Review logs and metrics** (5 minutes)
   - Check for any errors
   - Verify performance targets met

**Total time**: ~25 minutes to complete Phase 6

---

## 📚 Documentation

- **Complete Guide**: `docs/PHASE_6_WHATSAPP_INTEGRATION.md`
- **Webhook Setup**: `docs/NGROK_WEBHOOK_SETUP.md`
- **Troubleshooting**: `docs/WEBHOOK_TROUBLESHOOTING.md`
- **Flow Diagram**: `docs/WEBHOOK_FLOW_DIAGRAM.md`

---

## 💡 Pro Tips

1. **Keep ngrok terminal visible** - see connection status at a glance
2. **Open ngrok dashboard in browser** - invaluable for debugging
3. **Use same test message twice** - easiest way to verify cache
4. **Check logs after each action** - understand what's happening
5. **Save successful test messages** - use them for regression testing

---

**Ready to test?** Start with Meta Console configuration, then send your first test message! 🚀
