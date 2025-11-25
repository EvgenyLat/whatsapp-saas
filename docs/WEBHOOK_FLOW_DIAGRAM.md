# WhatsApp Webhook Flow Diagrams

Visual representations of webhook flows for local development with ngrok.

---

## 1. Overall Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    WhatsApp Cloud API (Meta)                     │
│                  https://graph.facebook.com                      │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ HTTPS Webhook POST/GET
                            │ (Secure, Encrypted)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ngrok Public Endpoint                         │
│              https://abc123def456.ngrok.io                       │
│                                                                  │
│  Features:                                                       │
│  • HTTPS with valid SSL certificate                             │
│  • Public IP address                                             │
│  • Request inspection dashboard                                 │
│  • Auto-generated URL (free tier)                               │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ Secure Tunnel
                            │ (Encrypted Connection)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ngrok Client (Local)                          │
│                    Running on Your Machine                       │
│                                                                  │
│  Web Interface: http://localhost:4040                           │
│  • Request/Response Inspection                                  │
│  • Real-time Monitoring                                         │
│  • Request Replay                                               │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ HTTP (Local Network)
                            │ Forwards to localhost:3000
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NestJS Backend Server                         │
│                   http://localhost:3000                          │
│                                                                  │
│  Endpoints:                                                      │
│  • GET  /api/v1/whatsapp/webhook  (Verification)                │
│  • POST /api/v1/whatsapp/webhook  (Events)                      │
│  • GET  /api/v1/whatsapp/health   (Health Check)               │
│                                                                  │
│  Components:                                                     │
│  • WhatsAppController  - HTTP handlers                          │
│  • WebhookService      - Business logic                         │
│  • WhatsAppService     - API integration                        │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ Database Operations
                            │
        ┌───────────────────┴────────────────────┐
        ▼                                        ▼
┌──────────────────┐                  ┌──────────────────┐
│   PostgreSQL     │                  │      Redis       │
│    Database      │                  │      Cache       │
│                  │                  │                  │
│ Tables:          │                  │ Features:        │
│ • webhook_log    │                  │ • Job queues     │
│ • message        │                  │ • Caching        │
│ • conversation   │                  │ • Rate limiting  │
│ • salon          │                  │                  │
└──────────────────┘                  └──────────────────┘
```

---

## 2. Webhook Verification Flow (GET Request)

**Triggered when:** You configure webhook URL in Meta Developer Console

```
┌──────────────┐
│  Meta Console│
│              │
│ Admin clicks │
│ "Verify and  │
│  Save"       │
└──────┬───────┘
       │
       │ [1] Sends verification challenge
       │
       │ GET https://abc123.ngrok.io/api/v1/whatsapp/webhook?
       │     hub.mode=subscribe&
       │     hub.verify_token=dev-webhook-verify-token&
       │     hub.challenge=1234567890
       │
       ▼
┌──────────────────────────────────────────────────────┐
│                  ngrok Tunnel                        │
│  Forwards request to: localhost:3000                 │
└──────┬───────────────────────────────────────────────┘
       │
       │ [2] Tunnels to backend
       │
       ▼
┌──────────────────────────────────────────────────────┐
│        NestJS Backend - WhatsAppController           │
│                                                      │
│  @Get('webhook')                                     │
│  verifyWebhook(@Query() query) {                     │
│                                                      │
│    [3] Extract query parameters:                    │
│        mode = 'subscribe'                            │
│        token = 'dev-webhook-verify-token'            │
│        challenge = '1234567890'                      │
│                                                      │
│    [4] Validate token:                               │
│        if (token === this.webhookVerifyToken) {      │
│          ✓ Token matches                             │
│        }                                             │
│                                                      │
│    [5] Return challenge:                             │
│        return challenge; // '1234567890'             │
│  }                                                   │
└──────┬───────────────────────────────────────────────┘
       │
       │ [6] Response: 1234567890
       │     Status: 200 OK
       │
       ▼
┌──────────────────────────────────────────────────────┐
│              ngrok Tunnel (Return)                   │
│  Forwards response back to Meta                      │
└──────┬───────────────────────────────────────────────┘
       │
       │ [7] Returns challenge to Meta
       │
       ▼
┌──────────────────────────────────────────────────────┐
│                  Meta Console                        │
│                                                      │
│  [8] Validates response:                             │
│      ✓ Status 200 OK                                 │
│      ✓ Challenge matches sent value                  │
│                                                      │
│  [9] Shows: "Webhook verified successfully"          │
│                                                      │
│  [10] Enables webhook subscription                   │
└──────────────────────────────────────────────────────┘

Logs in Backend:
  [WhatsAppController] Webhook verification request received
  [WhatsAppController] Webhook verified successfully
```

---

## 3. Incoming Message Webhook Flow (POST Request)

**Triggered when:** User sends message to WhatsApp Business number

```
┌────────────────┐
│  WhatsApp User │
│                │
│ Sends message  │──┐
│ "Hello"        │  │
└────────────────┘  │
                    │ [1] User sends message to Business
                    │
                    ▼
        ┌───────────────────────┐
        │  WhatsApp Cloud API   │
        │  (Meta Infrastructure)│
        │                       │
        │ [2] Processes message │
        │     Creates webhook   │
        │     payload           │
        └───────┬───────────────┘
                │
                │ [3] POST https://abc123.ngrok.io/api/v1/whatsapp/webhook
                │
                │ Headers:
                │   Content-Type: application/json
                │   X-Hub-Signature-256: sha256=abc123...
                │
                │ Body:
                │   {
                │     "object": "whatsapp_business_account",
                │     "entry": [{
                │       "id": "BUSINESS_ACCOUNT_ID",
                │       "changes": [{
                │         "value": {
                │           "messaging_product": "whatsapp",
                │           "metadata": {
                │             "phone_number_id": "123456789012345"
                │           },
                │           "messages": [{
                │             "from": "1234567890",
                │             "id": "wamid.ABC123XYZ",
                │             "timestamp": "1234567890",
                │             "type": "text",
                │             "text": { "body": "Hello" }
                │           }]
                │         },
                │         "field": "messages"
                │       }]
                │     }]
                │   }
                │
                ▼
┌──────────────────────────────────────────────────────────┐
│                   ngrok Public Endpoint                  │
│                                                          │
│  [4] Receives POST request                               │
│  [5] Logs in Web Interface (localhost:4040)              │
│  [6] Forwards to localhost:3000                          │
└──────────────┬───────────────────────────────────────────┘
               │
               │ [7] Tunnels to backend
               │
               ▼
┌──────────────────────────────────────────────────────────┐
│          NestJS Backend - WhatsAppController             │
│                                                          │
│  @Post('webhook')                                        │
│  async handleWebhook(                                    │
│    @Body() body: any,                                    │
│    @Headers('x-hub-signature-256') signature?: string    │
│  ) {                                                     │
│                                                          │
│    [8] Log webhook received                              │
│                                                          │
│    [9] Validate signature (if present):                  │
│        const payload = JSON.stringify(body);             │
│        if (signature) {                                  │
│          isValid = verifySignature(payload, signature);  │
│          if (!isValid) throw Unauthorized;               │
│        }                                                 │
│                                                          │
│    [10] Process webhook:                                 │
│         await webhookService.processWebhook(body);       │
│                                                          │
│    [11] Return success:                                  │
│         return { status: 'success' };                    │
│  }                                                       │
└──────────────┬───────────────────────────────────────────┘
               │
               │ [12] Delegates to WebhookService
               │
               ▼
┌──────────────────────────────────────────────────────────┐
│              WebhookService.processWebhook()             │
│                                                          │
│  [13] Loop through entries and changes:                  │
│       for (entry of payload.entry) {                     │
│         for (change of entry.changes) {                  │
│                                                          │
│           [14] Extract phone_number_id:                  │
│                phoneNumberId = '123456789012345'         │
│                                                          │
│           [15] Find salon by phone_number_id:            │
│                salon = await findSalonByPhoneNumberId()  │
│                                                          │
│           [16] If salon not found:                       │
│                ✗ Log error, save to webhook_log          │
│                  continue to next entry                  │
│                                                          │
│           [17] If salon found:                           │
│                ✓ Process messages                        │
│                                                          │
│           [18] For each message:                         │
│                await processIncomingMessage(             │
│                  salonId, message                        │
│                );                                        │
│                                                          │
│           [19] For each status update:                   │
│                await processStatusUpdate(                │
│                  salonId, status                         │
│                );                                        │
│                                                          │
│           [20] Log webhook success:                      │
│                await logWebhook(                         │
│                  salonId, 'messages', 'SUCCESS'          │
│                );                                        │
│       }                                                  │
│  }                                                       │
└──────────────┬───────────────────────────────────────────┘
               │
               │ [21] Process individual message
               │
               ▼
┌──────────────────────────────────────────────────────────┐
│        WebhookService.processIncomingMessage()           │
│                                                          │
│  [22] Check if message already processed:                │
│       existingMessage = await findUnique({               │
│         whatsapp_id: message.id                          │
│       });                                                │
│                                                          │
│       if (existingMessage) {                             │
│         ✓ Skip duplicate                                 │
│         return;                                          │
│       }                                                  │
│                                                          │
│  [23] Extract message content:                           │
│       switch (message.type) {                            │
│         case 'text':                                     │
│           content = message.text.body; // "Hello"        │
│         case 'image':                                    │
│           content = "IMAGE: " + message.image.id;        │
│         // ... other types                               │
│       }                                                  │
│                                                          │
│  [24] Get or create conversation:                        │
│       conversation = await getOrCreateConversation(      │
│         salonId,                                         │
│         message.from  // user phone number               │
│       );                                                 │
│                                                          │
│  [25] Save message to database:                          │
│       await prisma.message.create({                      │
│         salon_id: salonId,                               │
│         direction: 'INBOUND',                            │
│         conversation_id: conversation.id,                │
│         phone_number: message.from,                      │
│         message_type: 'TEXT',                            │
│         content: "Hello",                                │
│         whatsapp_id: "wamid.ABC123XYZ",                  │
│         status: 'DELIVERED'                              │
│       });                                                │
│                                                          │
│  [26] Update conversation:                               │
│       await prisma.conversation.update({                 │
│         last_message_at: new Date(),                     │
│         message_count: { increment: 1 }                  │
│       });                                                │
│                                                          │
│  [27] Log success                                        │
└──────────────┬───────────────────────────────────────────┘
               │
               │ [28] Database operations
               │
               ▼
┌──────────────────────────────────────────────────────────┐
│                  PostgreSQL Database                     │
│                                                          │
│  Tables Updated:                                         │
│                                                          │
│  webhook_log:                                            │
│    ├─ salon_id: "salon-123"                              │
│    ├─ event_type: "messages"                             │
│    ├─ status: "SUCCESS"                                  │
│    ├─ payload: {...}                                     │
│    └─ created_at: timestamp                              │
│                                                          │
│  message:                                                │
│    ├─ id: "msg-456"                                      │
│    ├─ salon_id: "salon-123"                              │
│    ├─ direction: "INBOUND"                               │
│    ├─ conversation_id: "conv-789"                        │
│    ├─ phone_number: "1234567890"                         │
│    ├─ message_type: "TEXT"                               │
│    ├─ content: "Hello"                                   │
│    ├─ whatsapp_id: "wamid.ABC123XYZ"                     │
│    ├─ status: "DELIVERED"                                │
│    └─ created_at: timestamp                              │
│                                                          │
│  conversation:                                           │
│    ├─ id: "conv-789"                                     │
│    ├─ salon_id: "salon-123"                              │
│    ├─ phone_number: "1234567890"                         │
│    ├─ status: "ACTIVE"                                   │
│    ├─ message_count: 1                                   │
│    └─ last_message_at: timestamp                         │
└──────────────┬───────────────────────────────────────────┘
               │
               │ [29] Return to controller
               │
               ▼
┌──────────────────────────────────────────────────────────┐
│            WhatsAppController Response                   │
│                                                          │
│  [30] Return success to Meta:                            │
│       Response: { status: 'success' }                    │
│       HTTP Status: 200 OK                                │
└──────────────┬───────────────────────────────────────────┘
               │
               │ [31] Response via ngrok
               │
               ▼
┌──────────────────────────────────────────────────────────┐
│                  ngrok Tunnel                            │
│  [32] Forwards response to Meta                          │
└──────────────┬───────────────────────────────────────────┘
               │
               │ [33] HTTP 200 { status: 'success' }
               │
               ▼
┌──────────────────────────────────────────────────────────┐
│              WhatsApp Cloud API (Meta)                   │
│                                                          │
│  [34] Receives success response                          │
│  [35] Marks webhook as delivered                         │
│  [36] Will not retry                                     │
└──────────────────────────────────────────────────────────┘

Backend Logs:
  [WhatsAppController] Webhook event received
  [WebhookService] Processing WhatsApp webhook event
  [WebhookService] Processing incoming message wamid.ABC123XYZ for salon salon-123
  [WebhookService] Incoming message wamid.ABC123XYZ processed successfully
  [WhatsAppController] Webhook processed successfully
```

---

## 4. Signature Verification Flow

```
┌─────────────────────────────────────────────────────────┐
│           Meta Sends Webhook with Signature             │
│                                                         │
│  Headers:                                               │
│    X-Hub-Signature-256: sha256=abc123def456...          │
│                                                         │
│  Body (JSON):                                           │
│    { "object": "whatsapp_business_account", ... }       │
└───────────────┬─────────────────────────────────────────┘
                │
                │ [1] Webhook arrives at backend
                │
                ▼
┌─────────────────────────────────────────────────────────┐
│          WhatsAppController.handleWebhook()             │
│                                                         │
│  [2] Extract signature header:                          │
│      signature = headers['x-hub-signature-256']         │
│      // "sha256=abc123def456..."                        │
│                                                         │
│  [3] Convert body to string:                            │
│      payload = JSON.stringify(body);                    │
│                                                         │
│  [4] If signature present:                              │
│      if (signature) {                                   │
│        const isValid =                                  │
│          whatsappService.verifyWebhookSignature(        │
│            payload,                                     │
│            signature                                    │
│          );                                             │
│                                                         │
│        if (!isValid) {                                  │
│          throw UnauthorizedException(                   │
│            'Invalid webhook signature'                  │
│          );                                             │
│        }                                                │
│      }                                                  │
└───────────────┬─────────────────────────────────────────┘
                │
                │ [5] Delegate to verification method
                │
                ▼
┌─────────────────────────────────────────────────────────┐
│      WhatsAppService.verifyWebhookSignature()           │
│                                                         │
│  Input:                                                 │
│    payload = '{"object":"whatsapp_business_account"...}'│
│    signature = 'sha256=abc123def456...'                 │
│                                                         │
│  [6] Get webhook secret from config:                    │
│      webhookSecret = 'dev-webhook-secret'               │
│                                                         │
│  [7] Calculate expected signature:                      │
│      const expectedSignature = crypto                   │
│        .createHmac('sha256', webhookSecret)             │
│        .update(payload)                                 │
│        .digest('hex');                                  │
│      // Result: "abc123def456..."                       │
│                                                         │
│  [8] Remove "sha256=" prefix from received signature:   │
│      signatureToVerify = signature.substring(7);        │
│      // "abc123def456..."                               │
│                                                         │
│  [9] Compare using timing-safe comparison:              │
│      return crypto.timingSafeEqual(                     │
│        Buffer.from(expectedSignature, 'hex'),           │
│        Buffer.from(signatureToVerify, 'hex')            │
│      );                                                 │
│                                                         │
│  [10] Return result:                                    │
│       true  ✓ Signature valid                           │
│       false ✗ Signature invalid                         │
└───────────────┬─────────────────────────────────────────┘
                │
                │ [11] Return to controller
                │
                ▼
┌─────────────────────────────────────────────────────────┐
│            Controller Decision                          │
│                                                         │
│  If isValid === true:                                   │
│    ✓ Continue processing webhook                        │
│    ✓ Call webhookService.processWebhook()               │
│                                                         │
│  If isValid === false:                                  │
│    ✗ Throw UnauthorizedException                        │
│    ✗ Return 401 Unauthorized to Meta                    │
│    ✗ Webhook not processed                              │
└─────────────────────────────────────────────────────────┘

Security Note:
  WHATSAPP_WEBHOOK_SECRET must match Meta App Secret
  Found in: Meta Console > Settings > Basic > App Secret
```

---

## 5. Error Handling Flow

```
┌─────────────────────────────────────────────────────────┐
│              Webhook Processing Error                   │
└───────────────┬─────────────────────────────────────────┘
                │
                │ Various failure points:
                │
    ┌───────────┼───────────┬──────────────┬──────────────┐
    │           │           │              │              │
    ▼           ▼           ▼              ▼              ▼
┌──────┐  ┌─────────┐  ┌──────────┐  ┌─────────┐  ┌───────────┐
│Verify│  │Signature│  │  Salon   │  │Database │  │Processing │
│Token │  │Invalid  │  │Not Found │  │  Error  │  │   Error   │
│Error │  │         │  │          │  │         │  │           │
└──┬───┘  └────┬────┘  └────┬─────┘  └────┬────┘  └─────┬─────┘
   │           │            │             │             │
   │           │            │             │             │
   ▼           ▼            ▼             ▼             ▼
┌──────────────────────────────────────────────────────────┐
│              Error Handling Strategy                     │
│                                                          │
│  Verification Error (401):                               │
│    • Return 401 Unauthorized                             │
│    • Log error                                           │
│    • Meta will see verification failed                   │
│                                                          │
│  Signature Error (401):                                  │
│    • Return 401 Unauthorized                             │
│    • Log error with signature details                    │
│    • Webhook rejected                                    │
│                                                          │
│  Salon Not Found:                                        │
│    • Log warning with phone_number_id                    │
│    • Save to webhook_log (status: FAILED)                │
│    • Continue processing (don't throw)                   │
│    • Return 200 OK to Meta (acknowledge receipt)         │
│                                                          │
│  Database Error:                                         │
│    • Log error with stack trace                          │
│    • Save to webhook_log if possible                     │
│    • Return 200 OK to Meta                               │
│    • Prevents Meta from retrying indefinitely            │
│                                                          │
│  Processing Error:                                       │
│    • Log error                                           │
│    • Try to save to webhook_log                          │
│    • Return 200 OK to Meta                               │
│    • Manual investigation required                       │
└──────────────┬───────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────┐
│              Error Logging to Database                   │
│                                                          │
│  webhook_log table:                                      │
│    {                                                     │
│      salon_id: null or salonId,                          │
│      event_type: 'messages',                             │
│      payload: originalPayload,                           │
│      status: 'FAILED',                                   │
│      error: error.message,                               │
│      created_at: timestamp                               │
│    }                                                     │
└──────────────────────────────────────────────────────────┘

Best Practice:
  Always return 200 OK to Meta for acknowledged webhooks,
  even if internal processing fails. This prevents Meta
  from retrying indefinitely. Log errors for manual review.
```

---

## 6. Development vs Production Setup

```
┌─────────────────────────────────────────────────────────────────┐
│                      DEVELOPMENT SETUP                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Internet                                                       │
│      │                                                          │
│      │ HTTPS Webhook                                            │
│      ▼                                                          │
│  ┌────────────────┐                                             │
│  │     ngrok      │                                             │
│  │  Public URL    │                                             │
│  │ (Random URL)   │                                             │
│  └───────┬────────┘                                             │
│          │                                                      │
│          │ Tunnel (Encrypted)                                   │
│          ▼                                                      │
│  ┌────────────────┐                                             │
│  │ ngrok Client   │                                             │
│  │  (localhost)   │                                             │
│  └───────┬────────┘                                             │
│          │                                                      │
│          │ HTTP                                                 │
│          ▼                                                      │
│  ┌────────────────┐      ┌──────────────┐      ┌───────────┐   │
│  │    NestJS      │────▶ │ PostgreSQL   │      │   Redis   │   │
│  │   Backend      │      │  (localhost) │      │(localhost)│   │
│  │ localhost:3000 │      └──────────────┘      └───────────┘   │
│  └────────────────┘                                             │
│                                                                 │
│  Characteristics:                                               │
│  • Easy setup                                                   │
│  • Free (ngrok free tier)                                       │
│  • URL changes on restart                                       │
│  • Single developer                                             │
│  • No persistent domain                                         │
│  • SSL/TLS handled by ngrok                                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      PRODUCTION SETUP                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Internet                                                       │
│      │                                                          │
│      │ HTTPS Webhook                                            │
│      ▼                                                          │
│  ┌────────────────┐                                             │
│  │    Route 53    │                                             │
│  │      DNS       │                                             │
│  │ webhooks.your- │                                             │
│  │  domain.com    │                                             │
│  └───────┬────────┘                                             │
│          │                                                      │
│          ▼                                                      │
│  ┌────────────────┐                                             │
│  │      ALB       │                                             │
│  │ Load Balancer  │                                             │
│  │   (SSL/TLS)    │                                             │
│  └───────┬────────┘                                             │
│          │                                                      │
│          ▼                                                      │
│  ┌────────────────┐                                             │
│  │      WAF       │                                             │
│  │  Web Firewall  │                                             │
│  │ (IP Whitelist) │                                             │
│  └───────┬────────┘                                             │
│          │                                                      │
│          ▼                                                      │
│  ┌────────────────┐                                             │
│  │  ECS/EKS       │                                             │
│  │  Container     │                                             │
│  │  NestJS App    │                                             │
│  └───────┬────────┘                                             │
│          │                                                      │
│      ┌───┴─────┬────────────┐                                   │
│      ▼         ▼            ▼                                   │
│  ┌──────┐  ┌──────┐  ┌──────────────┐                          │
│  │ RDS  │  │Redis │  │   Secrets    │                          │
│  │ Pg   │  │Elasti│  │   Manager    │                          │
│  │      │  │Cache │  │              │                          │
│  └──────┘  └──────┘  └──────────────┘                          │
│                                                                 │
│  Characteristics:                                               │
│  • Permanent domain                                             │
│  • High availability                                            │
│  • Auto-scaling                                                 │
│  • SSL/TLS certificate                                          │
│  • IP whitelisting                                              │
│  • Secure secret management                                     │
│  • Multi-region support                                         │
│  • Production-grade monitoring                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. ngrok Request Inspection Flow

```
┌─────────────────────────────────────────────────────────┐
│         WhatsApp sends webhook to ngrok URL             │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│               ngrok Edge (Cloud)                        │
│                                                         │
│  [1] Receives request                                   │
│  [2] Validates SSL/TLS                                  │
│  [3] Logs request metadata:                             │
│      • Timestamp                                        │
│      • Source IP                                        │
│      • HTTP method                                      │
│      • Headers                                          │
│      • Body                                             │
└────────────┬───────────────┬────────────────────────────┘
             │               │
             │               │ [4] Stores in request buffer
             │               │     (for Web UI)
             │               │
             │               ▼
             │    ┌──────────────────────────────┐
             │    │   ngrok Request Storage      │
             │    │   (In-memory, last N reqs)   │
             │    └──────────────────────────────┘
             │
             │ [5] Forwards to local agent
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│            ngrok Local Agent (Your PC)                  │
│                                                         │
│  [6] Receives from edge                                 │
│  [7] Exposes Web UI on localhost:4040                   │
│  [8] Forwards to configured local port (3000)           │
└────────────┬────────────────────────────────────────────┘
             │
             │ [9] HTTP to localhost:3000
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│              NestJS Backend                             │
│                                                         │
│  [10] Processes request                                 │
│  [11] Returns response                                  │
└────────────┬────────────────────────────────────────────┘
             │
             │ [12] Response back through agent
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│            ngrok Local Agent                            │
│                                                         │
│  [13] Captures response:                                │
│       • Status code                                     │
│       • Headers                                         │
│       • Body                                            │
│       • Duration (ms)                                   │
│  [14] Updates Web UI                                    │
│  [15] Forwards to edge                                  │
└────────────┬────────────────────────────────────────────┘
             │
             │ [16] Returns to WhatsApp
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│           WhatsApp Cloud API                            │
│                                                         │
│  [17] Receives response                                 │
│  [18] Marks webhook delivery status                     │
└─────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════
Meanwhile, you can access ngrok Web UI:
═══════════════════════════════════════════════════════════

http://localhost:4040
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│              ngrok Web Interface                        │
│                                                         │
│  Request List:                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │ POST /api/v1/whatsapp/webhook  200 OK   45ms      │  │
│  │ GET  /api/v1/whatsapp/health   200 OK   12ms      │  │
│  │ GET  /api/v1/whatsapp/webhook  200 OK   8ms       │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  Click on any request to view:                          │
│                                                         │
│  [Request Details]                                      │
│    Method: POST                                         │
│    Path: /api/v1/whatsapp/webhook                       │
│    Status: 200 OK                                       │
│    Duration: 45ms                                       │
│    Size: 1.2 KB                                         │
│    Timestamp: 2025-10-24T12:34:56Z                      │
│                                                         │
│  [Request Headers]                                      │
│    Content-Type: application/json                       │
│    X-Hub-Signature-256: sha256=abc123...                │
│    User-Agent: WhatsApp/2.0                             │
│                                                         │
│  [Request Body]                                         │
│    {                                                    │
│      "object": "whatsapp_business_account",             │
│      "entry": [...]                                     │
│    }                                                    │
│                                                         │
│  [Response Headers]                                     │
│    Content-Type: application/json                       │
│    Content-Length: 25                                   │
│                                                         │
│  [Response Body]                                        │
│    { "status": "success" }                              │
│                                                         │
│  [Replay Button] ← Resend same request to test          │
└─────────────────────────────────────────────────────────┘
```

---

## Summary

These diagrams illustrate:

1. **Overall Architecture**: How all components connect
2. **Verification Flow**: How Meta verifies your webhook URL
3. **Message Flow**: How incoming messages are processed
4. **Signature Verification**: How webhook security works
5. **Error Handling**: How errors are managed gracefully
6. **Dev vs Prod**: Differences in setup complexity
7. **ngrok Inspection**: How to debug with ngrok dashboard

Use these as reference when:
- Setting up webhooks for the first time
- Debugging webhook issues
- Understanding the data flow
- Explaining the architecture to team members
- Planning production deployment

---

**Last Updated:** 2025-10-24
**Version:** 1.0.0
