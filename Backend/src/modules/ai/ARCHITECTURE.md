# AI Service Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         WhatsApp Business API                        │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                │ Webhook (Inbound Message)
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    WhatsApp Webhook Controller                       │
│                    (whatsapp.controller.ts)                          │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                │ Queue Job
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   WhatsApp Webhook Processor                         │
│                  (whatsapp-webhook.processor.ts)                     │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 1. Extract message data                                      │   │
│  │ 2. Identify salon                                            │   │
│  │ 3. Generate conversation ID                                  │   │
│  └────────────────────────┬────────────────────────────────────┘   │
└───────────────────────────┼─────────────────────────────────────────┘
                            │
                            │ Call AI Service
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          AI Service                                  │
│                        (ai.service.ts)                               │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Step 1: Find/Create Conversation                              │  │
│  │  └─→ AIConversationRepository.findOrCreate()                 │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                            │                                          │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Step 2: Store Inbound Message                                 │  │
│  │  └─→ AIMessageRepository.create(direction: INBOUND)          │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                            │                                          │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Step 3: Load Conversation History                             │  │
│  │  └─→ AIMessageRepository.getLastN(10)                        │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                            │                                          │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Step 4: Build OpenAI Request                                  │  │
│  │  ├─→ System Prompt (services, masters, instructions)         │  │
│  │  ├─→ Conversation History (last 10 messages)                 │  │
│  │  ├─→ Current User Message                                    │  │
│  │  └─→ Function Definitions (check_availability, create_booking)│ │
│  └──────────────────────────────────────────────────────────────┘  │
│                            │                                          │
│                            ▼                                          │
│                   ┌─────────────────┐                                │
│                   │   OpenAI API    │                                │
│                   │   (GPT-4/3.5)   │                                │
│                   └────────┬────────┘                                │
│                            │                                          │
│                            │ Response + Function Call                │
│                            ▼                                          │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Step 5: Process Function Calls                                │  │
│  │                                                                │  │
│  │  IF function_call.name == "check_availability":               │  │
│  │    ├─→ Parse arguments (master_name, date_time)              │  │
│  │    ├─→ Query BookingsRepository for conflicts                │  │
│  │    ├─→ Check ±2 hour window for existing bookings            │  │
│  │    └─→ Return: {available: bool, alternatives?: [...]}       │  │
│  │                                                                │  │
│  │  IF function_call.name == "create_booking":                   │  │
│  │    ├─→ Parse arguments (customer, service, date_time)        │  │
│  │    ├─→ Check availability FIRST                              │  │
│  │    ├─→ If available: BookingsRepository.create()             │  │
│  │    ├─→ Generate booking code (BK-XXXXX)                      │  │
│  │    └─→ Return: {success: bool, bookingCode?: string}         │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                            │                                          │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Step 6: Call OpenAI Again with Function Result                │  │
│  │  (OpenAI generates natural language response)                 │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                            │                                          │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Step 7: Calculate Cost & Store Response                       │  │
│  │  ├─→ Calculate tokens (prompt + completion)                  │  │
│  │  ├─→ Calculate cost ($0.03/$0.06 per 1K tokens for GPT-4)    │  │
│  │  ├─→ AIMessageRepository.create(direction: OUTBOUND)         │  │
│  │  └─→ AIConversationRepository.updateTokens()                 │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                            │                                          │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Step 8: Return Response                                       │  │
│  │  {                                                             │  │
│  │    response: "✅ Записала вас...",                            │  │
│  │    tokens_used: 450,                                          │  │
│  │    cost: 0.0135,                                              │  │
│  │    booking_code?: "BK-ABC123"                                 │  │
│  │  }                                                             │  │
│  └──────────────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            │ Return to Webhook Processor
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   WhatsApp Webhook Processor                         │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Send Response via WhatsApp                                    │  │
│  │  └─→ WhatsAppService.sendText(from, response.response)       │  │
│  └──────────────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            │ Message Sent
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Customer WhatsApp                            │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

```
┌─────────────┐
│   Customer  │
│  (WhatsApp) │
└──────┬──────┘
       │
       │ "Хочу к Ане на маникюр завтра в 15:00"
       │
       ▼
┌─────────────────────────┐
│  WhatsApp Business API  │
└──────────┬──────────────┘
           │
           │ Webhook POST
           │
           ▼
┌──────────────────────────┐
│   NestJS Application     │
│                          │
│   ┌──────────────────┐   │
│   │  AI Service      │   │
│   │                  │   │
│   │  1. Store msg    │───┼──→ PostgreSQL (ai_messages)
│   │  2. Get history  │◄──┼──
│   │  3. Call OpenAI  │───┼──→ OpenAI API
│   │  4. Execute fn   │───┼──→ PostgreSQL (bookings)
│   │  5. Store reply  │───┼──→ PostgreSQL (ai_messages)
│   │  6. Update stats │───┼──→ PostgreSQL (ai_conversations)
│   └──────────────────┘   │
└──────────┬───────────────┘
           │
           │ "✅ Записала вас на 25 октября в 15:00. Код: BK-ABC123"
           │
           ▼
┌──────────────────────────┐
│  WhatsApp Business API   │
└──────────┬───────────────┘
           │
           │ Message Delivered
           │
           ▼
┌─────────────┐
│   Customer  │
│  (WhatsApp) │
└─────────────┘
```

## Database Schema Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                          Database                                │
│                                                                   │
│  ┌──────────────────────┐         ┌──────────────────────┐      │
│  │   ai_conversations   │         │     ai_messages      │      │
│  ├──────────────────────┤         ├──────────────────────┤      │
│  │ id (PK)             │◄────────│ conversation_id (FK) │      │
│  │ salon_id            │         │ id (PK)             │      │
│  │ phone_number        │         │ salon_id            │      │
│  │ conversation_id (UK)│         │ phone_number        │      │
│  │ ai_model            │         │ direction           │      │
│  │ total_tokens        │         │ content             │      │
│  │ total_cost          │         │ ai_model            │      │
│  │ message_count       │         │ tokens_used         │      │
│  │ last_activity       │         │ cost                │      │
│  └──────────────────────┘         │ response_time_ms    │      │
│           │                        └──────────────────────┘      │
│           │                                                       │
│           │ salon_id                                              │
│           ▼                                                       │
│  ┌──────────────────────┐         ┌──────────────────────┐      │
│  │       salons         │         │      bookings        │      │
│  ├──────────────────────┤         ├──────────────────────┤      │
│  │ id (PK)             │◄────────│ salon_id (FK)        │      │
│  │ name                │         │ id (PK)             │      │
│  │ phone_number_id     │         │ booking_code        │      │
│  │ access_token        │         │ customer_phone      │      │
│  │ is_active           │         │ customer_name       │      │
│  └──────────────────────┘         │ service             │      │
│                                    │ start_ts            │      │
│                                    │ status              │      │
│                                    │ metadata            │      │
│                                    └──────────────────────┘      │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

## Module Dependencies

```
┌─────────────────────────────────────────────────────────────────┐
│                         AppModule                                │
│                                                                   │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │ AuthModule  │    │SalonsModule │    │MessagesModule│         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│                                                                   │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │BookingsModule│   │WhatsAppModule│   │   AIModule  │◄────────┼── NEW
│  └──────┬──────┘    └─────────────┘    └──────┬──────┘         │
│         │                                       │                │
│         │                                       │                │
│         │          ┌─────────────┐             │                │
│         └─────────►│DatabaseModule│◄───────────┘                │
│                    │  (Prisma)    │                             │
│                    └─────────────┘                              │
│                                                                   │
│  AIModule imports:                                               │
│    - BookingsModule (for creating bookings)                     │
│    - DatabaseModule (for Prisma access)                         │
│    - ConfigModule (for OpenAI config)                           │
└───────────────────────────────────────────────────────────────────┘
```

## OpenAI Function Calling Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    OpenAI Function Calling                       │
│                                                                   │
│  Step 1: Send Request with Functions                            │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ {                                                          │  │
│  │   model: "gpt-4",                                          │  │
│  │   messages: [                                              │  │
│  │     {role: "system", content: "Ты ассистент салона..."},   │  │
│  │     {role: "user", content: "Хочу к Ане на маникюр"}      │  │
│  │   ],                                                        │  │
│  │   functions: [                                             │  │
│  │     {name: "check_availability", params: {...}},           │  │
│  │     {name: "create_booking", params: {...}}                │  │
│  │   ]                                                         │  │
│  │ }                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                            │                                      │
│                            ▼                                      │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ OpenAI Response                                            │  │
│  │ {                                                          │  │
│  │   choices: [{                                              │  │
│  │     message: {                                             │  │
│  │       function_call: {                                     │  │
│  │         name: "check_availability",                        │  │
│  │         arguments: '{"master_name":"Аня","date_time":...}' │  │
│  │       }                                                     │  │
│  │     }                                                       │  │
│  │   }]                                                        │  │
│  │ }                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                            │                                      │
│                            ▼                                      │
│  Step 2: Execute Function in Our Code                           │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ const result = await checkAvailability(                   │  │
│  │   "salon-id",                                              │  │
│  │   "Аня",                                                   │  │
│  │   "2025-10-25T15:00:00Z"                                   │  │
│  │ );                                                          │  │
│  │ // → { available: true }                                   │  │
│  └───────────────────────────────────────────────────────────┘  │
│                            │                                      │
│                            ▼                                      │
│  Step 3: Send Function Result Back to OpenAI                    │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ {                                                          │  │
│  │   model: "gpt-4",                                          │  │
│  │   messages: [                                              │  │
│  │     ...previous_messages,                                  │  │
│  │     {role: "function",                                     │  │
│  │      name: "check_availability",                           │  │
│  │      content: '{"available":true}'}                        │  │
│  │   ]                                                         │  │
│  │ }                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                            │                                      │
│                            ▼                                      │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ OpenAI Final Response                                      │  │
│  │ {                                                          │  │
│  │   choices: [{                                              │  │
│  │     message: {                                             │  │
│  │       content: "✅ Время свободно! К какому мастеру         │  │
│  │                 хотите записаться?"                        │  │
│  │     }                                                       │  │
│  │   }],                                                       │  │
│  │   usage: {prompt_tokens: 250, completion_tokens: 50}       │  │
│  │ }                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Availability Checking Algorithm

```
┌─────────────────────────────────────────────────────────────────┐
│              checkAvailability(salon, master, dateTime)          │
│                                                                   │
│  1. Validate dateTime                                            │
│     ├─→ Is valid ISO 8601? ──No─→ Return error                  │
│     └─→ Is in future? ──No─→ Return "Cannot book past date"     │
│                                                                   │
│  2. Query existing bookings                                      │
│     ┌──────────────────────────────────────────────────┐        │
│     │ SELECT * FROM bookings WHERE                      │        │
│     │   salon_id = $1 AND                              │        │
│     │   start_ts BETWEEN $2 AND $3 AND                 │        │
│     │   status != 'CANCELLED'                          │        │
│     │                                                   │        │
│     │ $2 = requestedTime - 2 hours                     │        │
│     │ $3 = requestedTime + 2 hours                     │        │
│     └──────────────────────────────────────────────────┘        │
│                                                                   │
│  3. Check for conflicts                                          │
│     For each booking:                                            │
│       timeDiff = |booking.start_ts - requestedTime|              │
│       if timeDiff < 1 hour: CONFLICT!                            │
│                                                                   │
│  4. Return result                                                │
│     If NO conflicts:                                             │
│       { available: true, message: "Время свободно" }             │
│                                                                   │
│     If conflicts found:                                          │
│       { available: false,                                        │
│         alternatives: [alt1, alt2, alt3],                        │
│         message: "Занято. Доступны: 14:00, 16:00, 17:00" }      │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

## Token Tracking Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      Token Tracking                              │
│                                                                   │
│  Request                      OpenAI Returns                     │
│  ┌─────────┐                 ┌──────────────────┐               │
│  │ System  │                 │ usage: {         │               │
│  │ Prompt  │────────────────►│   prompt_tokens: │               │
│  │ (500)   │                 │     250          │               │
│  └─────────┘                 │   completion:    │               │
│                               │     200          │               │
│  ┌─────────┐                 │   total: 450     │               │
│  │ History │                 │ }                │               │
│  │ (300)   │────────────────►└──────────────────┘               │
│  └─────────┘                          │                          │
│                                        │                          │
│  ┌─────────┐                          ▼                          │
│  │ Message │                 ┌──────────────────┐               │
│  │ (100)   │                 │ Calculate Cost   │               │
│  └─────────┘                 │                  │               │
│                               │ Input:  250 ×    │               │
│  Total Input: 900 tokens     │  $0.03/1K = $0.0075             │
│                               │                  │               │
│                               │ Output: 200 ×    │               │
│                               │  $0.06/1K = $0.012│              │
│                               │                  │               │
│                               │ Total: $0.0195   │               │
│                               └────────┬─────────┘               │
│                                        │                          │
│                                        ▼                          │
│                               ┌──────────────────┐               │
│                               │ Store in DB      │               │
│                               │                  │               │
│                               │ ai_messages:     │               │
│                               │   tokens_used=450│               │
│                               │   cost=0.0195    │               │
│                               │                  │               │
│                               │ ai_conversations:│               │
│                               │   total_tokens+= │               │
│                               │   total_cost+=   │               │
│                               └──────────────────┘               │
└───────────────────────────────────────────────────────────────────┘
```

## Component Interactions

```
┌─────────────────────────────────────────────────────────────────┐
│                    Component Interactions                        │
│                                                                   │
│  AIController                                                    │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ POST /ai/process-message                                   │  │
│  │ GET  /ai/conversations/:salonId                            │  │
│  │ GET  /ai/conversation/:id/history                          │  │
│  │ GET  /ai/stats/...                                         │  │
│  └───────────────────────┬───────────────────────────────────┘  │
│                          │                                        │
│                          │ calls                                  │
│                          ▼                                        │
│  AIService                                                       │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ processMessage()      ◄───── Main entry point              │  │
│  │ checkAvailability()   ◄───── Called by OpenAI function     │  │
│  │ createBookingFromAI() ◄───── Called by OpenAI function     │  │
│  │ getConversationHistory()                                    │  │
│  └───┬───────────────┬──────────────┬────────────────────────┘  │
│      │               │              │                             │
│      │ uses          │ uses         │ uses                        │
│      ▼               ▼              ▼                             │
│  ┌─────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │ OpenAI  │  │ Bookings     │  │ AI           │               │
│  │ API     │  │ Repository   │  │ Repositories │               │
│  └─────────┘  └──────────────┘  └──────────────┘               │
│                                                                   │
│  Repositories:                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ AIConversationRepository                                   │  │
│  │  ├─→ findOrCreate()                                        │  │
│  │  ├─→ updateTokens()                                        │  │
│  │  └─→ getStats()                                            │  │
│  │                                                             │  │
│  │ AIMessageRepository                                        │  │
│  │  ├─→ create()                                              │  │
│  │  ├─→ getLastN()                                            │  │
│  │  └─→ getStats()                                            │  │
│  │                                                             │  │
│  │ BookingsRepository                                         │  │
│  │  ├─→ findAll() (for availability check)                   │  │
│  │  └─→ create() (for booking creation)                      │  │
│  └───────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────┘
```

This architecture ensures:
- ✅ Separation of concerns
- ✅ Scalability through stateless design
- ✅ Testability through dependency injection
- ✅ Maintainability through clear component boundaries
- ✅ Performance through optimized database queries
- ✅ Reliability through comprehensive error handling
