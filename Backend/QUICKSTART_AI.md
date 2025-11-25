# AI Booking Assistant - Quick Start Guide

Get your AI-powered WhatsApp booking assistant running in 5 minutes!

## Prerequisites

- ✅ NestJS backend running
- ✅ PostgreSQL database configured
- ✅ OpenAI account (get free credits to start)

## Step 1: Get OpenAI API Key (2 minutes)

1. Go to https://platform.openai.com/api-keys
2. Click **"Create new secret key"**
3. Name it: `whatsapp-booking-assistant`
4. Copy the key (starts with `sk-...`)
5. ⚠️ **IMPORTANT:** Save it somewhere safe - you can only see it once!

## Step 2: Configure Environment (1 minute)

Add to your `.env` file:

```env
# AI Configuration
OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_MAX_TOKENS=1000
OPENAI_TEMPERATURE=0.7
```

**💡 Tip:** Start with `gpt-3.5-turbo` - it's fast and cheap (~$3/month for 100 customers)

## Step 3: Database Migration (30 seconds)

The AI tables are already in your Prisma schema. Just run:

```bash
cd Backend
npx prisma migrate deploy
```

Verify tables exist:
```bash
npx prisma studio
# Look for: ai_conversations, ai_messages
```

## Step 4: Start Server (30 seconds)

```bash
npm run start:dev
```

Check logs for:
```
[AIService] AI Service initialized with model: gpt-3.5-turbo
```

## Step 5: Test It! (1 minute)

### Test 1: Health Check

```bash
curl http://localhost:3000/api/v1/ai/health
```

Expected:
```json
{
  "status": "ok",
  "service": "ai",
  "openai": "connected"
}
```

### Test 2: Send a Message

```bash
curl -X POST http://localhost:3000/api/v1/ai/process-message \
  -H "Content-Type: application/json" \
  -d '{
    "salon_id": "test-salon-123",
    "phone_number": "+79001234567",
    "message": "Привет! Хочу записаться на маникюр",
    "conversation_id": "test_conv_001"
  }'
```

Expected response:
```json
{
  "response": "Здравствуйте! 💅 С удовольствием помогу записаться на маникюр. Маникюр стоит 2000₽ и занимает 1.5 часа. К какому мастеру хотите записаться: Аня или Ольга?",
  "tokens_used": 350,
  "cost": 0.0005,
  "response_time_ms": 1200,
  "model": "gpt-3.5-turbo"
}
```

✅ **Success!** Your AI is working!

## Step 6: Test Booking Flow

### 6.1 Request Booking

```bash
curl -X POST http://localhost:3000/api/v1/ai/process-message \
  -H "Content-Type: application/json" \
  -d '{
    "salon_id": "test-salon-123",
    "phone_number": "+79001234567",
    "message": "Хочу к Ане на маникюр завтра в 15:00",
    "conversation_id": "test_conv_002"
  }'
```

The AI will:
1. Check availability
2. Create booking if time is free
3. Return confirmation with booking code

### 6.2 Check if Booking Created

```bash
# Check your database
npx prisma studio
# Look in 'bookings' table for new entry with:
#   - customer_phone: +79001234567
#   - service: Маникюр
#   - metadata.created_by: "ai_assistant"
```

## Step 7: Integrate with WhatsApp (Optional)

Update your `whatsapp-webhook.processor.ts`:

```typescript
import { AIService } from '@modules/ai/ai.service';

@Injectable()
export class WhatsAppWebhookProcessor {
  constructor(private readonly aiService: AIService) {}

  async processInboundMessage(message: any) {
    // Generate conversation ID
    const conversationId = `conv_${message.from}`;

    // Process through AI
    const response = await this.aiService.processMessage({
      salon_id: message.salon_id,
      phone_number: message.from,
      message: message.text.body,
      conversation_id: conversationId,
    });

    // Send response back
    await this.whatsappService.sendText(
      message.from,
      response.response
    );
  }
}
```

## Test Messages to Try

**Booking requests:**
- "Хочу к Ане на маникюр завтра в 15:00"
- "Запишите меня на стрижку"
- "Можно к Ольге на педикюр послезавтра в 10?"

**Questions:**
- "Сколько стоит маникюр?"
- "В какое время вы работаете?"
- "Какие у вас мастера?"

**Incomplete requests:**
- "Хочу записаться" (AI will ask for details)
- "Маникюр завтра" (AI will ask for time)

## Monitor Costs

Check your usage:

```bash
# View conversation stats
curl http://localhost:3000/api/v1/ai/stats/conversations/test-salon-123 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Or visit OpenAI dashboard:
https://platform.openai.com/usage

## Expected Costs

**With GPT-3.5 Turbo:**
- Per message: ~$0.001-0.003
- 100 customers/month: ~$3
- 1000 customers/month: ~$30

**With GPT-4:**
- Per message: ~$0.02-0.03
- 100 customers/month: ~$45
- 1000 customers/month: ~$450

## Troubleshooting

### "OPENAI_API_KEY is not configured"

**Fix:**
```bash
# Check .env file exists
cat .env | grep OPENAI_API_KEY

# Make sure it's in Backend/.env (not Backend/src/.env)
```

### "Invalid API key"

**Fix:**
1. Check key starts with `sk-`
2. Verify key is active at https://platform.openai.com/api-keys
3. Try creating a new key

### "Rate limit exceeded"

**Fix:**
1. Check your usage: https://platform.openai.com/usage
2. Upgrade your OpenAI plan
3. Add rate limiting to your endpoint

### AI not creating bookings

**Fix:**
1. Check logs for function call errors
2. Verify salon_id exists in database
3. Check database permissions
4. Review `ai_messages` table for errors

### High costs

**Fix:**
1. Switch to `gpt-3.5-turbo`
2. Reduce `OPENAI_MAX_TOKENS` to 500
3. Implement response caching
4. Set daily budget limits in OpenAI dashboard

## Next Steps

1. ✅ Set up cost alerts in OpenAI dashboard
2. ✅ Integrate with your WhatsApp webhook
3. ✅ Test with real customers (start small!)
4. ✅ Monitor conversation quality
5. ✅ Optimize prompts based on feedback
6. ✅ Add custom services/masters for your salon

## Configuration Files

All configuration is in one place:

```
Backend/
├── .env                              # Add OPENAI_API_KEY here
├── .env.ai.example                   # Template with all options
└── src/modules/ai/
    ├── README.md                     # Complete documentation
    ├── DEPLOYMENT.md                 # Production guide
    ├── ARCHITECTURE.md               # Technical architecture
    └── examples/
        └── whatsapp-integration.example.ts  # Integration code
```

## Support

**Documentation:**
- Full docs: `Backend/src/modules/ai/README.md`
- Production guide: `Backend/src/modules/ai/DEPLOYMENT.md`
- Architecture: `Backend/src/modules/ai/ARCHITECTURE.md`

**Logs:**
```bash
# View AI logs
tail -f logs/app.log | grep AIService
```

**API Endpoints:**
- Health: `GET /api/v1/ai/health`
- Process message: `POST /api/v1/ai/process-message`
- Stats: `GET /api/v1/ai/stats/conversations/:salonId`

## Success Checklist

- [ ] OpenAI API key obtained
- [ ] Environment variables configured
- [ ] Database migration completed
- [ ] Health check passes
- [ ] Test message processed successfully
- [ ] Booking created via AI
- [ ] WhatsApp integration updated
- [ ] Cost monitoring enabled
- [ ] First real customer tested

## Congratulations! 🎉

Your AI booking assistant is now live! Start with a few test customers and gradually roll out to everyone.

**Remember:**
- Start with `gpt-3.5-turbo` for cost savings
- Monitor costs daily for first week
- Collect customer feedback
- Optimize prompts based on real usage

Need help? Check the full documentation in `Backend/src/modules/ai/README.md`

---

**Estimated setup time:** 5 minutes
**Monthly cost (100 customers):** $3-5
**Time saved per booking:** 2-3 minutes
**Customer satisfaction:** ⭐⭐⭐⭐⭐
