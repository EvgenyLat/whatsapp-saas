# WhatsApp Business API Integration Module

## Overview

This module provides a complete integration with the WhatsApp Business Cloud API, enabling the platform to send and receive WhatsApp messages. The implementation follows AAA++ quality standards with comprehensive testing, error handling, and production-ready features.

## Architecture

### Module Structure

```
src/modules/whatsapp/
├── dto/                          # Data Transfer Objects
│   ├── send-text.dto.ts         # Text message DTO
│   ├── send-template.dto.ts     # Template message DTO
│   ├── send-media.dto.ts        # Media message DTO
│   ├── webhook-verify.dto.ts    # Webhook verification DTO
│   ├── whatsapp-response.dto.ts # Response DTOs
│   └── index.ts
├── interfaces/                   # TypeScript Interfaces
│   ├── whatsapp-message.interface.ts
│   ├── message-response.interface.ts
│   ├── template-parameter.interface.ts
│   └── index.ts
├── whatsapp.service.ts          # Core WhatsApp API service
├── webhook.service.ts           # Webhook processing service
├── whatsapp.controller.ts       # REST API endpoints
├── whatsapp.module.ts           # Module definition
├── whatsapp.service.spec.ts     # Service tests (24 tests)
├── webhook.service.spec.ts      # Webhook tests (17 tests)
└── whatsapp.controller.spec.ts  # Controller tests (8 tests)
```

### Configuration

```typescript
// src/config/whatsapp.config.ts
{
  apiVersion: 'v18.0',
  apiUrl: 'https://graph.facebook.com',
  webhookVerifyToken: process.env.WHATSAPP_VERIFY_TOKEN,
  webhookSecret: process.env.WHATSAPP_WEBHOOK_SECRET,
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000
}
```

## Features Implemented

### 1. WhatsApp Service (whatsapp.service.ts)

**Core Methods:**

- `sendTextMessage()` - Send text messages
- `sendTemplateMessage()` - Send pre-approved template messages
- `sendMediaMessage()` - Send images, documents, audio, video
- `markAsRead()` - Mark messages as read
- `getMediaUrl()` - Retrieve media URLs from WhatsApp
- `verifyWebhookSignature()` - Verify webhook authenticity

**Advanced Features:**

- Automatic retry with exponential backoff
- Comprehensive error handling for all WhatsApp API errors
- Message cost calculation and tracking
- Conversation auto-creation and updates
- Salon ownership verification
- Database integration for message tracking

### 2. Webhook Service (webhook.service.ts)

**Webhook Processing:**

- Process incoming messages (text, image, document, audio, video)
- Process message status updates (sent, delivered, read, failed)
- Auto-create/update conversations
- Webhook logging for debugging
- Duplicate message detection
- Error recovery and resilience

### 3. REST API Endpoints (whatsapp.controller.ts)

**Endpoints:**

1. `GET /api/v1/whatsapp/webhook` - Webhook verification
2. `POST /api/v1/whatsapp/webhook` - Receive webhook events
3. `POST /api/v1/whatsapp/send-text` - Send text message
4. `POST /api/v1/whatsapp/send-template` - Send template message
5. `POST /api/v1/whatsapp/send-media` - Send media message
6. `GET /api/v1/whatsapp/health` - Health check

**Security:**

- JWT authentication on all send endpoints
- Webhook signature verification (HMAC-SHA256)
- Salon ownership validation
- Request validation with class-validator

## API Documentation

### Send Text Message

**Endpoint:** `POST /api/v1/whatsapp/send-text`

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "salon_id": "123e4567-e89b-12d3-a456-426614174000",
  "to": "+1234567890",
  "text": "Hello from WhatsApp SaaS!",
  "conversation_id": "optional-conv-id"
}
```

**Response:**
```json
{
  "success": true,
  "whatsapp_id": "wamid.HBgNMTIzNDU2Nzg5MAA=",
  "message_id": "msg-db-id",
  "status": "SENT"
}
```

### Send Template Message

**Endpoint:** `POST /api/v1/whatsapp/send-template`

**Request Body:**
```json
{
  "salon_id": "123e4567-e89b-12d3-a456-426614174000",
  "to": "+1234567890",
  "template_name": "booking_confirmation",
  "language_code": "en",
  "parameters": [
    { "type": "text", "text": "John Doe" },
    { "type": "text", "text": "Dec 25, 2024 10:00 AM" }
  ]
}
```

### Send Media Message

**Endpoint:** `POST /api/v1/whatsapp/send-media`

**Request Body:**
```json
{
  "salon_id": "123e4567-e89b-12d3-a456-426614174000",
  "to": "+1234567890",
  "media_type": "image",
  "media_url_or_id": "https://example.com/image.jpg",
  "caption": "Your booking confirmation"
}
```

### Webhook Verification

**Endpoint:** `GET /api/v1/whatsapp/webhook`

**Query Parameters:**
```
hub.mode=subscribe
hub.verify_token=your-verify-token
hub.challenge=challenge-string-1234567890
```

**Response:** Returns `hub.challenge` value

### Webhook Event Handling

**Endpoint:** `POST /api/v1/whatsapp/webhook`

**Headers:**
```
X-Hub-Signature-256: sha256=<signature>
Content-Type: application/json
```

**Webhook Payload (Incoming Message):**
```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
    "changes": [{
      "value": {
        "messaging_product": "whatsapp",
        "metadata": {
          "display_phone_number": "+1234567890",
          "phone_number_id": "PHONE_NUMBER_ID"
        },
        "messages": [{
          "from": "+1234567890",
          "id": "wamid.xxx",
          "timestamp": "1234567890",
          "text": { "body": "Hello" },
          "type": "text"
        }]
      },
      "field": "messages"
    }]
  }]
}
```

**Webhook Payload (Status Update):**
```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
    "changes": [{
      "value": {
        "messaging_product": "whatsapp",
        "metadata": {
          "display_phone_number": "+1234567890",
          "phone_number_id": "PHONE_NUMBER_ID"
        },
        "statuses": [{
          "id": "wamid.xxx",
          "status": "delivered",
          "timestamp": "1234567890",
          "recipient_id": "+1234567890"
        }]
      },
      "field": "messages"
    }]
  }]
}
```

## Environment Configuration

Add to `.env.development`:

```env
# WhatsApp Business API
WHATSAPP_API_VERSION=v18.0
WHATSAPP_API_URL=https://graph.facebook.com
WHATSAPP_VERIFY_TOKEN=your-verify-token-here
WHATSAPP_WEBHOOK_SECRET=your-webhook-secret-here
WHATSAPP_TIMEOUT=30000
WHATSAPP_RETRY_ATTEMPTS=3
WHATSAPP_RETRY_DELAY=1000
```

## Error Handling

### WhatsApp API Error Codes

| Status | Error | Handling |
|--------|-------|----------|
| 400 | Bad Request | Returns BadRequestException with error details |
| 401 | Unauthorized | Invalid access token error |
| 403 | Forbidden | Insufficient permissions error |
| 429 | Rate Limit | Automatic retry with exponential backoff |
| 500+ | Server Error | Retry up to 3 times, then error |

### Error Response Format

```json
{
  "statusCode": 400,
  "message": "WhatsApp API error: Invalid phone number",
  "error": "Bad Request"
}
```

## Database Integration

### Message Storage

All messages (inbound/outbound) are stored in the `messages` table:

```sql
- salon_id: UUID
- direction: INBOUND/OUTBOUND
- conversation_id: UUID (optional)
- phone_number: String
- message_type: TEXT/TEMPLATE/IMAGE/DOCUMENT/AUDIO/VIDEO
- content: String
- whatsapp_id: String (unique)
- status: SENT/DELIVERED/READ/FAILED
- cost: Float
- created_at: DateTime
```

### Conversation Tracking

Conversations are auto-created and updated:

```sql
- salon_id: UUID
- phone_number: String
- status: ACTIVE/EXPIRED/BLOCKED
- started_at: DateTime
- last_message_at: DateTime
- message_count: Integer
- cost: Float
```

### Webhook Logging

All webhook events are logged:

```sql
- salon_id: UUID (nullable)
- event_type: String
- payload: JSON String
- status: SUCCESS/FAILED
- error: String (nullable)
- created_at: DateTime
```

## Testing

### Test Coverage

- **WhatsAppService**: 24 tests covering all scenarios
- **WebhookService**: 17 tests covering webhook processing
- **WhatsAppController**: 8 tests covering all endpoints
- **Total**: 49 tests, all passing

### Run Tests

```bash
# Run all WhatsApp tests
npm test -- --testPathPattern=whatsapp

# Run with coverage
npm run test:cov
```

### Test Scenarios Covered

**WhatsAppService:**
- ✅ Send text message successfully
- ✅ Send template message with/without parameters
- ✅ Send media message (URL and ID)
- ✅ Salon not found errors
- ✅ Ownership validation
- ✅ Inactive salon errors
- ✅ Missing credentials errors
- ✅ WhatsApp API errors (400, 429, 500)
- ✅ Webhook signature verification
- ✅ Mark message as read
- ✅ Get media URL

**WebhookService:**
- ✅ Process incoming text messages
- ✅ Process image, document, audio, video messages
- ✅ Process status updates (delivered, read, failed)
- ✅ Skip duplicate messages
- ✅ Auto-create conversations
- ✅ Salon not found handling
- ✅ Webhook logging

**WhatsAppController:**
- ✅ Webhook verification (valid/invalid token)
- ✅ Webhook event handling
- ✅ Send endpoints with authentication
- ✅ Signature validation
- ✅ Error handling

## TypeScript Compilation

✅ **0 TypeScript errors** - Verified with `npx tsc --noEmit`

All types are strictly defined with:
- Interface definitions for all WhatsApp API payloads
- DTOs with class-validator decorators
- Proper error typing
- Generic type safety

## WhatsApp Business API Setup

### 1. Create WhatsApp Business App

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app → Business → WhatsApp
3. Add WhatsApp product to your app

### 2. Get Credentials

1. **Phone Number ID**: Found in WhatsApp > API Setup
2. **Access Token**: Generate permanent token in WhatsApp > API Setup
3. **App Secret**: Found in Settings > Basic

### 3. Configure Webhook

1. Go to WhatsApp > Configuration
2. Set Webhook URL: `https://your-domain.com/api/v1/whatsapp/webhook`
3. Set Verify Token: Same as `WHATSAPP_VERIFY_TOKEN` in .env
4. Subscribe to fields: `messages`

### 4. Store Credentials in Database

Update salon record:
```sql
UPDATE salons
SET phone_number_id = 'YOUR_PHONE_NUMBER_ID',
    access_token = 'YOUR_ACCESS_TOKEN'
WHERE id = 'salon-id';
```

## Message Cost Calculation

Default costs (configurable):

| Message Type | Cost (USD) |
|-------------|-----------|
| TEXT | $0.005 |
| TEMPLATE | $0.010 |
| IMAGE | $0.010 |
| DOCUMENT | $0.010 |
| AUDIO | $0.010 |
| VIDEO | $0.020 |

Costs are tracked per message and aggregated per conversation.

## Production Considerations

### Security

✅ JWT authentication on all send endpoints
✅ Webhook signature verification (HMAC-SHA256)
✅ Salon ownership validation
✅ Input validation with class-validator
✅ SQL injection prevention (Prisma ORM)

### Performance

✅ Automatic retry with exponential backoff
✅ Configurable timeout (default 30s)
✅ Database indexes on critical fields
✅ Efficient conversation lookup

### Monitoring

✅ Comprehensive logging (Winston)
✅ Webhook event logging
✅ Error tracking with stack traces
✅ Message status tracking

### Scalability

✅ Stateless service design
✅ Database-backed message tracking
✅ Horizontal scaling ready
✅ Rate limit handling

## Sample Integration Code

### TypeScript/Node.js Client

```typescript
import axios from 'axios';

const API_URL = 'https://your-api.com';
const JWT_TOKEN = 'your-jwt-token';

// Send text message
async function sendTextMessage() {
  const response = await axios.post(
    `${API_URL}/api/v1/whatsapp/send-text`,
    {
      salon_id: 'salon-uuid',
      to: '+1234567890',
      text: 'Hello from WhatsApp!'
    },
    {
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    }
  );

  console.log('Message sent:', response.data);
}

// Send template message
async function sendTemplateMessage() {
  const response = await axios.post(
    `${API_URL}/api/v1/whatsapp/send-template`,
    {
      salon_id: 'salon-uuid',
      to: '+1234567890',
      template_name: 'booking_confirmation',
      language_code: 'en',
      parameters: [
        { type: 'text', text: 'John Doe' },
        { type: 'text', text: 'Dec 25, 2024 10:00 AM' }
      ]
    },
    {
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    }
  );

  console.log('Template sent:', response.data);
}
```

## Troubleshooting

### Webhook Not Receiving Events

1. Check webhook URL is publicly accessible
2. Verify webhook subscription in Meta dashboard
3. Check webhook logs in database
4. Verify phone_number_id matches salon record

### Messages Not Sending

1. Verify salon access_token is valid
2. Check phone_number is in international format
3. Review WhatsApp API error in response
4. Check salon is active and credentials configured

### Signature Verification Failing

1. Ensure WHATSAPP_WEBHOOK_SECRET matches Meta app secret
2. Check X-Hub-Signature-256 header is present
3. Verify payload is not modified before verification

## Future Enhancements

Potential improvements:

- [ ] Message templates management UI
- [ ] Bulk messaging support
- [ ] Message scheduling
- [ ] Rich media carousel messages
- [ ] Interactive buttons and lists
- [ ] Message analytics dashboard
- [ ] Multi-agent support
- [ ] Message queue with BullMQ
- [ ] Redis caching for salons
- [ ] WebSocket for real-time updates

## Support

For issues or questions:

1. Check WhatsApp Business API documentation
2. Review webhook logs in database
3. Check application logs
4. Verify environment configuration

## License

This module is part of the WhatsApp SaaS Platform.
