# Webhook Events Guide

**Last Updated: January 18, 2025**

---

## Table of Contents

1. [Overview](#overview)
2. [Webhook Setup](#webhook-setup)
3. [Security & Verification](#security--verification)
4. [Event Types](#event-types)
5. [Message Events](#message-events)
6. [Status Events](#status-events)
7. [Error Handling](#error-handling)
8. [Best Practices](#best-practices)
9. [Testing Webhooks](#testing-webhooks)
10. [Troubleshooting](#troubleshooting)

---

## Overview

WhatsApp uses webhooks to send real-time updates about messages, statuses, and other events to your application. Your webhook endpoint must:

- Accept POST requests from WhatsApp servers
- Verify HMAC signatures for security
- Respond with 200 OK within 20 seconds
- Process events asynchronously

**Webhook URL:**
```
POST https://api.example.com/webhook
```

---

## Webhook Setup

### 1. Configure Webhook in Meta Developer Portal

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Select your app
3. Navigate to **WhatsApp > Configuration**
4. Click **Edit** next to Webhook
5. Enter your webhook URL: `https://api.example.com/webhook`
6. Enter your verify token (matches `META_VERIFY_TOKEN` env variable)
7. Click **Verify and Save**

### 2. Subscribe to Webhook Events

After verification, subscribe to events:
- ✅ **messages** - Incoming customer messages
- ✅ **message_status** - Message delivery status updates
- ⚠️ **message_template_status_update** - Template approval status (optional)
- ⚠️ **account_update** - Account changes (optional)

### 3. Verification Endpoint

WhatsApp calls your verification endpoint during setup:

**GET /webhook**

**Query Parameters:**
- `hub.mode`: "subscribe"
- `hub.verify_token`: Your configured verify token
- `hub.challenge`: Random string to echo back

**Implementation:**
```javascript
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
    console.log('WEBHOOK_VERIFIED');
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});
```

**Example Request:**
```http
GET /webhook?hub.mode=subscribe&hub.verify_token=my_token&hub.challenge=abc123 HTTP/1.1
Host: api.example.com
```

**Example Response:**
```http
HTTP/1.1 200 OK
Content-Type: text/plain

abc123
```

---

## Security & Verification

### HMAC Signature Verification

Every webhook request includes an HMAC SHA-256 signature in the `x-hub-signature-256` header. You MUST verify this signature before processing events.

**Signature Header Format:**
```
x-hub-signature-256: sha256=<hex_encoded_signature>
```

**Verification Process:**
1. Get request raw body (before JSON parsing)
2. Calculate HMAC SHA-256 using `META_APP_SECRET`
3. Compare with signature from header using timing-safe comparison
4. Reject if signatures don't match

**Implementation:**
```javascript
const crypto = require('crypto');

function verifySignature(rawBody, signatureHeader) {
  const APP_SECRET = process.env.META_APP_SECRET;

  if (!APP_SECRET) {
    console.warn('META_APP_SECRET not set - skipping verification');
    return true; // Development mode only
  }

  if (!signatureHeader) {
    return false;
  }

  // Calculate expected signature
  const hmac = crypto.createHmac('sha256', APP_SECRET);
  hmac.update(rawBody);
  const expected = 'sha256=' + hmac.digest('hex');

  // Use timing-safe comparison
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signatureHeader)
    );
  } catch (error) {
    return false;
  }
}

// Express middleware
app.post('/webhook', (req, res) => {
  const signature = req.get('x-hub-signature-256');

  if (!verifySignature(req.rawBody, signature)) {
    console.error('Invalid webhook signature');
    return res.sendStatus(401);
  }

  // Process webhook
  res.status(200).send('EVENT_RECEIVED');

  // Process events asynchronously
  processWebhookAsync(req.body);
});
```

---

## Event Types

WhatsApp sends different types of events. All events follow the same base structure:

```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "<WHATSAPP_BUSINESS_ACCOUNT_ID>",
      "changes": [
        {
          "value": {
            /* Event-specific data */
          },
          "field": "<EVENT_TYPE>"
        }
      ]
    }
  ]
}
```

**Event Types:**
- `messages` - Incoming messages from customers
- `message_status` - Message delivery status updates
- `message_template_status_update` - Template approval status
- `account_update` - Account configuration changes

---

## Message Events

### Text Message Event

Customer sends a text message.

**Event Payload:**
```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "123456789",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "+1234567890",
              "phone_number_id": "987654321"
            },
            "contacts": [
              {
                "profile": {
                  "name": "John Doe"
                },
                "wa_id": "1234567890"
              }
            ],
            "messages": [
              {
                "from": "1234567890",
                "id": "wamid.HBgNMTIzNDU2Nzg5MAVReg==",
                "timestamp": "1642512000",
                "type": "text",
                "text": {
                  "body": "I would like to book an appointment tomorrow at 2pm"
                }
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
```

**Processing Logic:**
```javascript
async function handleMessage(message, metadata) {
  const from = message.from;
  const text = message.text.body;
  const phoneNumberId = metadata.phone_number_id;

  // Get salon configuration
  const salon = await salons.getByPhoneNumberId(phoneNumberId);

  // Process message with AI
  const parsed = await ai.aiParse(text, from, salon, metadata);

  // Handle intent (booking, FAQ, etc.)
  if (parsed.intent === 'booking') {
    await handleBooking(parsed, from, salon);
  }

  // Send AI response
  if (parsed.aiResponse) {
    await messaging.sendText(from, parsed.aiResponse, salon);
  }
}
```

---

### Image Message Event

Customer sends an image with optional caption.

**Event Payload:**
```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "123456789",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "+1234567890",
              "phone_number_id": "987654321"
            },
            "messages": [
              {
                "from": "1234567890",
                "id": "wamid.ABCxyz123",
                "timestamp": "1642512000",
                "type": "image",
                "image": {
                  "caption": "Here's my hair photo",
                  "mime_type": "image/jpeg",
                  "sha256": "abc123...xyz",
                  "id": "IMAGE_ID"
                }
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
```

**Downloading Media:**
```javascript
async function downloadMedia(mediaId, accessToken) {
  // 1. Get media URL
  const urlResponse = await fetch(
    `https://graph.facebook.com/v18.0/${mediaId}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );

  const { url } = await urlResponse.json();

  // 2. Download media file
  const fileResponse = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  const buffer = await fileResponse.buffer();

  // 3. Save or process file
  return buffer;
}
```

---

### Location Message Event

Customer shares their location.

**Event Payload:**
```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "123456789",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "+1234567890",
              "phone_number_id": "987654321"
            },
            "messages": [
              {
                "from": "1234567890",
                "id": "wamid.LOCxyz789",
                "timestamp": "1642512000",
                "type": "location",
                "location": {
                  "latitude": 37.7749,
                  "longitude": -122.4194,
                  "name": "Downtown Hair Studio",
                  "address": "123 Main St, San Francisco, CA"
                }
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
```

---

### Interactive Button Reply Event

Customer clicks an interactive button.

**Event Payload:**
```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "123456789",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "+1234567890",
              "phone_number_id": "987654321"
            },
            "messages": [
              {
                "from": "1234567890",
                "id": "wamid.BTNxyz456",
                "timestamp": "1642512000",
                "type": "button",
                "button": {
                  "payload": "booking_confirm_yes",
                  "text": "Yes, confirm booking"
                }
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
```

**Processing Button Reply:**
```javascript
async function handleButtonReply(message, metadata) {
  const from = message.from;
  const payload = message.button.payload;
  const phoneNumberId = metadata.phone_number_id;

  const salon = await salons.getByPhoneNumberId(phoneNumberId);

  switch (payload) {
    case 'booking_confirm_yes':
      await confirmBooking(from, salon);
      break;
    case 'booking_cancel':
      await cancelBooking(from, salon);
      break;
    default:
      console.warn('Unknown button payload:', payload);
  }
}
```

---

## Status Events

### Message Delivered Event

Message was successfully delivered to customer's device.

**Event Payload:**
```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "123456789",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "+1234567890",
              "phone_number_id": "987654321"
            },
            "statuses": [
              {
                "id": "wamid.HBgNMTIzNDU2Nzg5MAVReg==",
                "status": "delivered",
                "timestamp": "1642512100",
                "recipient_id": "1234567890",
                "conversation": {
                  "id": "CONVERSATION_ID",
                  "origin": {
                    "type": "service"
                  }
                },
                "pricing": {
                  "billable": true,
                  "pricing_model": "CBP",
                  "category": "service"
                }
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
```

**Status Values:**
- `sent` - Message sent to WhatsApp servers
- `delivered` - Message delivered to recipient's device
- `read` - Message read by recipient
- `failed` - Message delivery failed

**Processing Status Updates:**
```javascript
async function handleStatus(status, metadata) {
  const messageId = status.id;
  const statusValue = status.status;
  const recipientId = status.recipient_id;

  // Update message status in database
  await db.updateMessageStatus(messageId, statusValue);

  // Track delivery metrics
  if (statusValue === 'delivered') {
    await metrics.increment('messages.delivered');
  } else if (statusValue === 'failed') {
    await metrics.increment('messages.failed');

    // Log failure for investigation
    console.error('Message delivery failed:', {
      messageId,
      recipientId,
      error: status.errors
    });
  }
}
```

---

### Message Failed Event

Message delivery failed.

**Event Payload:**
```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "123456789",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "+1234567890",
              "phone_number_id": "987654321"
            },
            "statuses": [
              {
                "id": "wamid.HBgNMTIzNDU2Nzg5MAVReg==",
                "status": "failed",
                "timestamp": "1642512100",
                "recipient_id": "1234567890",
                "errors": [
                  {
                    "code": 131026,
                    "title": "Message Undeliverable",
                    "message": "Message failed to send because more than 24 hours have passed since the customer last replied to this number.",
                    "error_data": {
                      "details": "Message failed to send because more than 24 hours have passed since the customer last replied to this number."
                    }
                  }
                ]
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
```

**Common Error Codes:**
- `131026` - Message Undeliverable (24-hour window expired)
- `131047` - Re-engagement message
- `131053` - User phone number is part of an experiment
- `132000` - Generic user's number is unavailable

---

## Error Handling

### Webhook Errors

**Invalid Signature:**
```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{
  "error": "Invalid signature"
}
```

**Rate Limit Exceeded:**
```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json

{
  "error": "Rate limit exceeded",
  "retryAfter": 60
}
```

### Retry Logic

WhatsApp retries failed webhooks with exponential backoff:
1. Immediate retry
2. After 1 second
3. After 5 seconds
4. After 30 seconds
5. After 5 minutes
6. Stops after 5 attempts

**Recommendation:** Always return 200 OK immediately and process events asynchronously.

---

## Best Practices

### 1. Always Return 200 OK Immediately

```javascript
app.post('/webhook', async (req, res) => {
  // Verify signature
  if (!verifySignature(req.rawBody, req.get('x-hub-signature-256'))) {
    return res.sendStatus(401);
  }

  // Return 200 OK immediately
  res.status(200).send('EVENT_RECEIVED');

  // Process events asynchronously
  try {
    await processWebhookAsync(req.body);
  } catch (error) {
    console.error('Error processing webhook:', error);
    // Don't throw - already sent 200 OK
  }
});
```

### 2. Use Message Queues

Process webhook events through a message queue for reliability:

```javascript
const messageQueue = require('./queue/messageQueue');

async function processWebhookAsync(body) {
  const { entry } = body;

  for (const item of entry) {
    for (const change of item.changes) {
      // Add to queue for processing
      await messageQueue.add('webhook-event', {
        change,
        receivedAt: new Date().toISOString()
      });
    }
  }
}
```

### 3. Implement Idempotency

Handle duplicate webhook events gracefully:

```javascript
async function handleMessage(message, metadata) {
  const messageId = message.id;

  // Check if already processed
  const exists = await db.messageExists(messageId);
  if (exists) {
    console.log('Message already processed:', messageId);
    return;
  }

  // Process message
  await processMessage(message, metadata);

  // Mark as processed
  await db.markMessageProcessed(messageId);
}
```

### 4. Log All Webhook Events

```javascript
async function processWebhookAsync(body) {
  // Log raw webhook payload
  await logger.info('Webhook received', {
    object: body.object,
    entryCount: body.entry?.length || 0,
    payload: JSON.stringify(body)
  });

  // Process events
  await processEvents(body);
}
```

### 5. Monitor Webhook Health

Track webhook performance metrics:
- Event processing time
- Event failure rate
- Queue depth
- Signature verification failures

```javascript
const metrics = require('./middleware/metrics');

async function processWebhookAsync(body) {
  const start = Date.now();

  try {
    await processEvents(body);

    const duration = Date.now() - start;
    metrics.histogram('webhook.processing.duration', duration);
    metrics.increment('webhook.events.success');
  } catch (error) {
    metrics.increment('webhook.events.failed');
    throw error;
  }
}
```

---

## Testing Webhooks

### Local Development with ngrok

1. Install ngrok: `npm install -g ngrok`
2. Start your local server: `npm run dev` (port 3000)
3. Start ngrok tunnel: `ngrok http 3000`
4. Copy ngrok URL: `https://abc123.ngrok.io`
5. Configure in Meta Developer Portal: `https://abc123.ngrok.io/webhook`

### Testing with cURL

**Simulate Text Message Event:**
```bash
# Calculate HMAC signature
SECRET="your_app_secret"
PAYLOAD='{"object":"whatsapp_business_account","entry":[{"id":"123456789","changes":[{"value":{"messaging_product":"whatsapp","metadata":{"display_phone_number":"+1234567890","phone_number_id":"987654321"},"messages":[{"from":"1234567890","id":"wamid.test123","timestamp":"1642512000","type":"text","text":{"body":"Test message"}}]},"field":"messages"}]}]}'

SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print $2}')

curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -H "x-hub-signature-256: sha256=$SIGNATURE" \
  -d "$PAYLOAD"
```

### Testing with Postman

1. Create POST request to `http://localhost:3000/webhook`
2. Add header: `Content-Type: application/json`
3. Add Pre-request Script for signature:
```javascript
const crypto = require('crypto');
const secret = pm.environment.get('APP_SECRET');
const payload = pm.request.body.raw;

const hmac = crypto.createHmac('sha256', secret);
hmac.update(payload);
const signature = 'sha256=' + hmac.digest('hex');

pm.request.headers.add({
  key: 'x-hub-signature-256',
  value: signature
});
```

---

## Troubleshooting

### Webhook Not Receiving Events

**Check 1: Webhook Verification**
- Verify token matches `META_VERIFY_TOKEN`
- Check that verification endpoint returns challenge
- Ensure HTTPS is used (not HTTP)

**Check 2: Subscriptions**
- Verify subscribed to "messages" field
- Check subscription in Meta Developer Portal

**Check 3: Server Accessibility**
- Ensure webhook URL is publicly accessible
- Check firewall rules
- Verify SSL certificate is valid

### Signature Verification Failing

**Common Issues:**
1. Using parsed JSON instead of raw body
2. Wrong `META_APP_SECRET` value
3. Modifying body before verification
4. Not using timing-safe comparison

**Solution:**
```javascript
// Capture raw body BEFORE parsing
app.use(bodyParser.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

// Use raw body for signature verification
const signature = req.get('x-hub-signature-256');
if (!verifySignature(req.rawBody, signature)) {
  return res.sendStatus(401);
}
```

### Events Processing Slowly

**Symptoms:**
- Webhook timeouts
- Events backing up
- Messages delayed

**Solutions:**
1. Return 200 OK immediately
2. Use message queues for async processing
3. Scale worker processes
4. Optimize database queries
5. Add Redis caching

---

## Related Documentation

- [OpenAPI Specification](openapi.yaml) - Complete API reference
- [Authentication Guide](AUTHENTICATION.md) - Authentication & security
- [API Examples](EXAMPLES.md) - Request/response examples
- [Rate Limiting Guide](RATE_LIMITING.md) - Rate limits and quotas
- [WhatsApp Business API Docs](https://developers.facebook.com/docs/whatsapp) - Official WhatsApp docs

---

**Last Updated: January 18, 2025**
