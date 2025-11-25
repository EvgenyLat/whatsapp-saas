# AI Service Module - Deployment Guide

Complete guide for deploying the AI booking assistant to production.

## Prerequisites

- ✅ OpenAI API account with billing enabled
- ✅ PostgreSQL database (existing schema)
- ✅ NestJS backend running
- ✅ WhatsApp Business API configured

## Installation Steps

### 1. Database Migration

The AI service uses existing schema. Run Prisma migration:

```bash
cd Backend
npx prisma migrate deploy
```

Verify tables exist:
```sql
-- Check AI tables
SELECT * FROM ai_conversations LIMIT 1;
SELECT * FROM ai_messages LIMIT 1;
```

### 2. Environment Configuration

Add to `.env` or `.env.production`:

```env
# OpenAI Configuration (REQUIRED)
OPENAI_API_KEY=sk-proj-...                # Your OpenAI API key
OPENAI_MODEL=gpt-4                        # or gpt-3.5-turbo for lower cost
OPENAI_MAX_TOKENS=1000                    # Max tokens per request
OPENAI_TEMPERATURE=0.7                    # Creativity (0-2)
```

**Getting OpenAI API Key:**
1. Go to https://platform.openai.com/api-keys
2. Create new secret key
3. Copy and save (shown only once)
4. Add to environment variables

**Model Selection:**
- `gpt-4`: Best quality, higher cost (~$0.03/request)
- `gpt-4-turbo-preview`: Good quality, medium cost (~$0.015/request)
- `gpt-3.5-turbo`: Fast and cheap (~$0.002/request)

### 3. Verify Installation

```bash
# Start server
npm run start:dev

# Check AI service health
curl http://localhost:3000/api/v1/ai/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "ai",
  "timestamp": "2025-10-23T...",
  "openai": "connected"
}
```

### 4. Test AI Service

Create a test request:

```bash
curl -X POST http://localhost:3000/api/v1/ai/process-message \
  -H "Content-Type: application/json" \
  -d '{
    "salon_id": "YOUR_SALON_ID",
    "phone_number": "+79001234567",
    "message": "Привет! Хочу записаться на маникюр",
    "conversation_id": "test_conv_001"
  }'
```

Expected response:
```json
{
  "response": "Здравствуйте! 💅 С удовольствием помогу записаться на маникюр...",
  "tokens_used": 450,
  "cost": 0.0135,
  "response_time_ms": 1250,
  "model": "gpt-4"
}
```

## Production Configuration

### Cost Management

1. **Set Daily Budget Limits**

Monitor costs daily:
```typescript
// Add to your cron job
async function checkDailyCosts() {
  const stats = await aiService.getMessageStats(salonId, startOfDay, endOfDay);

  if (stats.totalCost > DAILY_LIMIT) {
    // Disable AI or send alert
    await sendCostAlert(stats.totalCost);
  }
}
```

2. **Use Rate Limiting**

Already configured in `app.module.ts`:
```typescript
ThrottlerModule.forRoot([{
  ttl: 60000,
  limit: 100, // 100 requests per minute
}])
```

3. **Choose Cost-Effective Model**

For production, consider:
```env
# Lower cost option
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_MAX_TOKENS=500  # Reduce token limit
```

**Cost Comparison (1000 requests/day):**
- GPT-4: ~$30-40/day
- GPT-3.5 Turbo: ~$2-3/day

### Performance Optimization

1. **Database Indexes**

Already configured in Prisma schema:
```prisma
@@index([conversation_id, created_at])
@@index([salon_id, created_at])
```

2. **Response Caching**

Implement caching for common questions:
```typescript
@Injectable()
export class AICacheService {
  async getCachedResponse(question: string): Promise<string | null> {
    // Check Redis for cached response
    return await this.cacheService.get(`ai:response:${hash(question)}`);
  }
}
```

3. **Connection Pooling**

Configure in `.env`:
```env
DATABASE_POOL_SIZE=10
DATABASE_CONNECTION_TIMEOUT=10000
```

### Security Best Practices

1. **Protect API Endpoints**

AI endpoints use guards:
```typescript
@UseGuards(JwtAuthGuard)  // Authenticated endpoints
@Public()                  // Webhook endpoint only
```

2. **Sanitize User Input**

Already implemented in DTOs with class-validator:
```typescript
@IsString()
@IsNotEmpty()
message: string;
```

3. **Rate Limiting per User**

Add user-specific limits:
```typescript
@Throttle(10, 60)  // 10 requests per 60 seconds
async processMessage() { ... }
```

4. **API Key Security**

- Store in environment variables only
- Never commit to git
- Rotate keys regularly
- Use separate keys for dev/prod

### Monitoring & Logging

1. **Enable Detailed Logging**

```env
LOG_LEVEL=debug  # For development
LOG_LEVEL=info   # For production
```

2. **Track Key Metrics**

Monitor these metrics:
- Average response time
- Token usage per conversation
- Daily cost
- Error rate
- Booking conversion rate

3. **Set Up Alerts**

Create alerts for:
- Daily cost exceeds threshold
- High error rate (>5%)
- Slow response time (>3s)
- OpenAI API failures

Example alert:
```typescript
if (dailyCost > 50) {
  await slack.send({
    text: `⚠️ AI costs reached $${dailyCost} today!`,
    channel: '#alerts',
  });
}
```

### Error Handling

1. **OpenAI API Failures**

Service automatically falls back:
```typescript
return {
  response: 'Извините, произошла ошибка...',
  tokens_used: 0,
  cost: 0,
};
```

2. **Database Connection Issues**

Use retry logic:
```typescript
@Retry({ maxAttempts: 3, delay: 1000 })
async createBooking() { ... }
```

3. **Timeout Handling**

Set OpenAI timeout:
```typescript
this.openai = new OpenAI({
  apiKey,
  timeout: 30000,  // 30 seconds
});
```

## Integration with WhatsApp

### Step 1: Update Webhook Processor

Add AI service to `whatsapp-webhook.processor.ts`:

```typescript
import { AIService } from '@modules/ai/ai.service';

@Processor('whatsapp-webhook')
export class WhatsAppWebhookProcessor {
  constructor(
    private readonly aiService: AIService,
    private readonly whatsappService: WhatsAppService,
  ) {}

  @Process('inbound-message')
  async handleInboundMessage(job: Job) {
    const { from, text, salon } = job.data;

    // Generate conversation ID
    const conversationId = `conv_${salon.id}_${from}`;

    // Process through AI
    const aiResponse = await this.aiService.processMessage({
      salon_id: salon.id,
      phone_number: from,
      message: text,
      conversation_id: conversationId,
    });

    // Send response back
    await this.whatsappService.sendText(
      from,
      aiResponse.response,
      salon.phone_number_id,
      salon.access_token,
    );

    return { success: true, booking_code: aiResponse.booking_code };
  }
}
```

### Step 2: Enable AI for Specific Salons

Add feature flag to salon settings:

```typescript
// Add to Salon model
ai_enabled: boolean @default(false)

// Check before processing
if (salon.ai_enabled) {
  // Use AI
} else {
  // Use manual processing
}
```

### Step 3: Test Integration

1. Send test WhatsApp message
2. Check AI conversation created
3. Verify response sent back
4. Check booking created if applicable

## Database Maintenance

### Cleanup Old Data

Add cron job:

```typescript
@Cron('0 2 * * *')  // 2 AM daily
async cleanupOldData() {
  // Delete conversations older than 30 days
  await this.aiConversationRepository.deleteOldConversations(30);

  // Delete messages older than 90 days
  await this.aiMessageRepository.deleteOldMessages(90);
}
```

### Backup AI Data

Include in regular backups:

```bash
# PostgreSQL backup
pg_dump -t ai_conversations -t ai_messages > ai_backup.sql
```

## Cost Estimation

### Monthly Cost Calculator

Based on 100 customers/month, 3 messages per customer:

**GPT-4:**
- Requests: 300/month
- Avg tokens: 500/request
- Cost: ~$45/month

**GPT-3.5 Turbo:**
- Requests: 300/month
- Avg tokens: 500/request
- Cost: ~$3/month

**Scaling:**
- 1000 customers: $450/month (GPT-4) or $30/month (GPT-3.5)
- 10000 customers: $4500/month (GPT-4) or $300/month (GPT-3.5)

**Recommendation:**
Start with GPT-3.5 Turbo for cost-effectiveness, upgrade to GPT-4 for better quality if needed.

## Troubleshooting

### Issue: "OPENAI_API_KEY is not configured"

**Solution:**
```bash
# Check .env file
cat .env | grep OPENAI_API_KEY

# Verify environment loading
echo $OPENAI_API_KEY
```

### Issue: High costs

**Solutions:**
1. Reduce `OPENAI_MAX_TOKENS`
2. Switch to GPT-3.5 Turbo
3. Implement response caching
4. Set daily budget limits

### Issue: Slow responses

**Solutions:**
1. Use `gpt-3.5-turbo` (faster)
2. Reduce conversation history (change `getLastN(10)` to `getLastN(5)`)
3. Implement timeout handling
4. Use streaming responses

### Issue: Bookings not created

**Solutions:**
1. Check availability logic
2. Verify salon_id exists
3. Check database permissions
4. Review function call logs

### Issue: AI gives wrong responses

**Solutions:**
1. Update system prompt
2. Add more examples
3. Adjust temperature (lower = more focused)
4. Review conversation history

## Deployment Checklist

- [ ] Database tables exist (ai_conversations, ai_messages)
- [ ] OPENAI_API_KEY configured
- [ ] Environment variables set
- [ ] Health check passing
- [ ] Test message processed successfully
- [ ] WhatsApp integration updated
- [ ] Cost monitoring enabled
- [ ] Alerts configured
- [ ] Logging enabled
- [ ] Backup strategy in place
- [ ] Rate limiting configured
- [ ] Error handling tested

## Rollback Plan

If issues occur:

1. **Disable AI Feature:**
```typescript
// In webhook processor
const AI_ENABLED = false;

if (AI_ENABLED) {
  // Use AI
} else {
  // Use manual processing
}
```

2. **Switch to Fallback:**
```typescript
try {
  return await aiService.processMessage(dto);
} catch (error) {
  // Use rule-based fallback
  return fallbackService.processMessage(dto);
}
```

3. **Revert Code:**
```bash
git revert <commit-hash>
npm run build
pm2 restart all
```

## Support

For issues or questions:
- Check logs: `tail -f logs/app.log`
- Review OpenAI status: https://status.openai.com
- Contact support: support@yourcompany.com

## Next Steps

After deployment:
1. Monitor costs daily for first week
2. Collect user feedback
3. Analyze conversation quality
4. Optimize prompts based on real usage
5. A/B test different models
6. Implement caching for common questions
7. Add multi-language support
8. Train on salon-specific data

## License

MIT
