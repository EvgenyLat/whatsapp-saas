# AI Service Module - WhatsApp Booking Assistant

Complete AI-powered booking assistant for WhatsApp beauty salon automation.

## Features

- **Natural Language Understanding**: Understands Russian booking requests like "Хочу к Ане на маникюр завтра в 3"
- **Availability Checking**: Always checks database before creating bookings to prevent double-bookings
- **Alternative Suggestions**: Suggests 3 alternative time slots when requested time is occupied
- **Conversation History**: Maintains context across multiple messages
- **Token Tracking**: Tracks OpenAI API usage and costs
- **Function Calling**: Uses OpenAI function calling for structured booking operations

## Architecture

```
Backend/src/modules/ai/
├── ai.module.ts                           # Module definition
├── ai.service.ts                          # Core AI logic & OpenAI integration
├── ai.controller.ts                       # REST API endpoints
├── dto/                                   # Data Transfer Objects
│   ├── process-message.dto.ts            # Input for message processing
│   ├── ai-response.dto.ts                # AI response format
│   ├── booking-extraction.dto.ts         # Extracted booking data
│   └── availability-check.dto.ts         # Availability check I/O
├── interfaces/                            # TypeScript interfaces
│   ├── openai-message.interface.ts       # OpenAI message formats
│   ├── conversation-context.interface.ts # Conversation context
│   └── booking-function.interface.ts     # Function calling schemas
└── repositories/                          # Database repositories
    ├── ai-conversation.repository.ts     # Conversation management
    └── ai-message.repository.ts          # Message storage
```

## Database Schema

### AIConversation
Tracks conversation-level statistics:
- `id`: UUID
- `salon_id`: Reference to salon
- `phone_number`: Customer phone (E.164)
- `conversation_id`: Unique conversation identifier
- `ai_model`: OpenAI model used (e.g., "gpt-4")
- `total_tokens`: Total tokens consumed
- `total_cost`: Total cost in USD
- `message_count`: Number of messages
- `last_activity`: Last message timestamp

### AIMessage
Stores individual messages:
- `id`: UUID
- `conversation_id`: Reference to conversation
- `direction`: INBOUND or OUTBOUND
- `content`: Message text
- `ai_model`: Model used for this message
- `tokens_used`: Tokens consumed
- `cost`: Cost for this message
- `response_time_ms`: Processing time

### Booking
Existing booking schema with AI metadata:
- `metadata.created_by`: "ai_assistant"
- `metadata.master_name`: Requested master
- `metadata.ai_conversation`: true

## Environment Variables

Add to your `.env` file:

```env
# OpenAI Configuration (Required for AI Assistant)
OPENAI_API_KEY=sk-...                    # Your OpenAI API key
OPENAI_MODEL=gpt-4                       # Model: gpt-4, gpt-4-turbo-preview, gpt-3.5-turbo
OPENAI_MAX_TOKENS=1000                   # Max tokens per request
OPENAI_TEMPERATURE=0.7                   # Temperature (0-2)
```

## API Endpoints

### POST /api/v1/ai/process-message
Process incoming WhatsApp message through AI.

**Request:**
```json
{
  "salon_id": "123e4567-e89b-12d3-a456-426614174000",
  "phone_number": "+79001234567",
  "message": "Хочу к Ане на маникюр завтра в 15:00",
  "conversation_id": "conv_unique_id",
  "customer_name": "Анна Иванова"
}
```

**Response:**
```json
{
  "response": "✅ Записала вас на маникюр к Ане 25 октября в 15:00. Код брони: BK-ABC123",
  "tokens_used": 450,
  "cost": 0.0135,
  "response_time_ms": 1250,
  "model": "gpt-4",
  "booking_code": "BK-ABC123",
  "function_calls": [
    {
      "name": "check_availability",
      "arguments": {
        "master_name": "Аня",
        "date_time": "2025-10-25T15:00:00Z"
      },
      "result": {
        "available": true
      }
    }
  ]
}
```

### GET /api/v1/ai/conversations/:salonId
Get all AI conversations for a salon.

**Query Parameters:**
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset (default: 0)

### GET /api/v1/ai/conversation/:conversationId/history
Get message history for a conversation.

**Query Parameters:**
- `limit` (optional): Number of messages (default: 100)

### GET /api/v1/ai/stats/conversations/:salonId
Get conversation statistics for a salon.

**Response:**
```json
{
  "totalConversations": 45,
  "totalMessages": 320,
  "totalTokens": 145000,
  "totalCost": 4.35
}
```

### GET /api/v1/ai/stats/messages/:salonId
Get message statistics for a salon.

**Query Parameters:**
- `start_date` (optional): Start date (ISO 8601)
- `end_date` (optional): End date (ISO 8601)

### POST /api/v1/ai/test
Test AI with sample message (development only).

### GET /api/v1/ai/health
Health check for AI service.

## Usage Example

### From WhatsApp Webhook Processor

```typescript
import { AIService } from '@modules/ai/ai.service';

@Injectable()
export class WhatsAppWebhookProcessor {
  constructor(private readonly aiService: AIService) {}

  async processInboundMessage(message: WhatsAppMessage) {
    // Extract message details
    const { from, text, salon_id } = message;

    // Generate unique conversation ID
    const conversationId = `conv_${salon_id}_${from}`;

    // Process through AI
    const aiResponse = await this.aiService.processMessage({
      salon_id,
      phone_number: from,
      message: text.body,
      conversation_id: conversationId,
    });

    // Send AI response back to WhatsApp
    await this.whatsappService.sendText(from, aiResponse.response);

    // Log token usage for billing
    console.log(`AI cost: $${aiResponse.cost.toFixed(4)} (${aiResponse.tokens_used} tokens)`);
  }
}
```

### Direct Usage

```typescript
import { AIService } from '@modules/ai/ai.service';

@Injectable()
export class MyService {
  constructor(private readonly aiService: AIService) {}

  async handleBookingRequest() {
    const response = await this.aiService.processMessage({
      salon_id: 'salon-uuid',
      phone_number: '+79001234567',
      message: 'Хочу записаться на стрижку',
      conversation_id: 'conv_unique_id',
      customer_name: 'Иван',
    });

    console.log(response.response);
    // Output: "Конечно! Стрижка стоит 1500₽ и занимает 1 час. На какую дату и время хотите записаться?"
  }
}
```

## AI Workflow

```
1. User: "Хочу к Ане на маникюр завтра в 3"
   ↓
2. AI Service receives message
   ↓
3. Load conversation history (last 10 messages)
   ↓
4. Build OpenAI request:
   - System prompt (salon info, services, masters)
   - Conversation history
   - Current message
   - Available functions (check_availability, create_booking)
   ↓
5. OpenAI analyzes message
   ↓
6. OpenAI calls: check_availability("Аня", "2025-10-25T15:00:00Z")
   ↓
7. AI Service queries database:
   - Check existing bookings
   - If occupied: find 3 alternative slots
   ↓
8. Return availability result to OpenAI
   ↓
9. If available:
   - OpenAI calls: create_booking(...)
   - AI Service creates booking in database
   - Response: "✅ Записала вас на 25 октября в 15:00 к Ане. Код: BK-ABC123"

   If occupied:
   - Response: "⚠️ 15:00 занято. Доступны: 14:00, 16:00, 17:00"
   ↓
10. Store message in ai_messages table
    ↓
11. Update conversation stats (tokens, cost)
    ↓
12. Return response to caller
```

## Availability Checking Logic

The AI service ALWAYS checks availability before creating bookings:

1. **Query existing bookings** in ±2 hour window
2. **Check for conflicts** (bookings within 1 hour)
3. **If available**: Allow booking creation
4. **If occupied**: Find 3 alternative slots:
   - Same day, different hours
   - Next day if needed
   - Only during working hours (10:00-20:00)

## Token Tracking & Cost

The service automatically tracks:
- **Prompt tokens**: Input tokens (system + history + user message)
- **Completion tokens**: Output tokens (AI response)
- **Total cost**: Calculated based on model pricing

**Pricing (per 1K tokens):**
- GPT-4: $0.03 input, $0.06 output
- GPT-4 Turbo: $0.01 input, $0.03 output
- GPT-3.5 Turbo: $0.0005 input, $0.0015 output

**Average costs:**
- Simple query (e.g., "What's the price?"): ~$0.005-0.01
- Booking with availability check: ~$0.015-0.025
- Complex conversation: ~$0.03-0.05

## System Prompt

The AI is configured with:
- **Services**: Маникюр (2000₽), Педикюр (2500₽), Стрижка (1500₽), etc.
- **Masters**: Аня, Мария, Ольга
- **Working hours**: 10:00-20:00 daily
- **Instructions**: Always check availability, suggest alternatives, be friendly

See `ai.service.ts` → `getSystemPrompt()` for full prompt.

## Error Handling

The service includes comprehensive error handling:

1. **OpenAI API errors**: Returns fallback message
2. **Database errors**: Logs and returns error response
3. **Validation errors**: Clear error messages
4. **Network timeouts**: Graceful degradation

**Fallback response:**
```
"Извините, произошла ошибка при обработке вашего сообщения.
Пожалуйста, попробуйте позже или позвоните нам напрямую."
```

## Testing

### Unit Tests
```bash
npm test -- ai.service.spec.ts
```

### Manual Testing
```bash
# 1. Start server
npm run start:dev

# 2. Test message processing
curl -X POST http://localhost:3000/api/v1/ai/test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "salon_id": "your-salon-id",
    "phone_number": "+79001234567",
    "message": "Хочу записаться на маникюр",
    "conversation_id": "test_conv_123"
  }'
```

### Example Test Messages

**Booking request:**
- "Хочу к Ане на маникюр завтра в 3"
- "Запишите меня на стрижку на понедельник в 10 утра"
- "Можно к Ольге на педикюр послезавтра?"

**Price inquiry:**
- "Сколько стоит окрашивание?"
- "Какие у вас цены на маникюр?"

**Cancellation:**
- "Отменить мою запись"
- "Хочу перенести запись"

**General questions:**
- "В какое время вы работаете?"
- "Какие услуги у вас есть?"

## Performance Optimization

1. **Context window**: Limited to last 10 messages
2. **Caching**: System prompts cached in memory
3. **Parallel processing**: Independent requests processed concurrently
4. **Database indexes**: Optimized queries for availability checking

## Production Considerations

1. **Rate limiting**: Implement per-user rate limits to prevent abuse
2. **Cost monitoring**: Set up alerts for high token usage
3. **Fallback**: Have manual booking option if AI fails
4. **Logging**: Log all AI interactions for debugging
5. **A/B testing**: Test different prompts and models
6. **User feedback**: Collect feedback on AI responses

## Maintenance

### Cleanup old data
```typescript
// Delete conversations older than 30 days
await aiConversationRepository.deleteOldConversations(30);

// Delete messages older than 90 days
await aiMessageRepository.deleteOldMessages(90);
```

### Monitor costs
```typescript
// Get cost statistics
const stats = await aiService.getConversationStats(salonId);
console.log(`Total AI cost: $${stats.totalCost.toFixed(2)}`);
```

## Troubleshooting

**AI not responding:**
- Check `OPENAI_API_KEY` is valid
- Verify OpenAI API status
- Check logs for error messages

**Bookings not created:**
- Verify availability checking logic
- Check database permissions
- Review function call logs

**High costs:**
- Review `OPENAI_MAX_TOKENS` setting
- Consider using GPT-3.5 Turbo
- Implement caching for common questions

## Future Enhancements

- [ ] Multi-language support (English, Spanish)
- [ ] Image recognition for service requests
- [ ] Voice message transcription
- [ ] Integration with calendar systems
- [ ] Customer preference learning
- [ ] Automated reminders
- [ ] Payment integration
- [ ] Sentiment analysis

## License

MIT
