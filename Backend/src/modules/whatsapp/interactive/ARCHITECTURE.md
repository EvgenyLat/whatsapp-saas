# InteractiveCardBuilder - Architecture & Integration

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        WhatsApp Cloud API                                │
│                     (Meta Business Platform)                             │
└─────────────────┬───────────────────────────────────┬───────────────────┘
                  │                                   │
                  │ Webhook Events                    │ Send Messages
                  │ (Button Clicks)                   │ (Interactive Cards)
                  ▼                                   ▲
┌─────────────────────────────────────────────────────────────────────────┐
│                         NestJS Backend                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │              WhatsApp Webhook Controller                         │   │
│  │  - Receives webhook events                                       │   │
│  │  - Validates webhook signature                                   │   │
│  │  - Routes to appropriate handler                                 │   │
│  └───────────────────────┬─────────────────────────────────────────┘   │
│                          │                                               │
│                          ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │            Quick Booking Service                                 │   │
│  │  - Orchestrates booking flow                                     │   │
│  │  - Manages conversation state                                    │   │
│  │  - Coordinates between services                                  │   │
│  └───┬──────────────────┬──────────────────┬──────────────────────┘   │
│      │                  │                  │                            │
│      │                  │                  │                            │
│      ▼                  ▼                  ▼                            │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────┐                 │
│  │ Button   │  │ Interactive  │  │ WhatsApp         │                 │
│  │ Parser   │  │ Card Builder │  │ Service          │                 │
│  │ Service  │  │ Service      │  │ (Send Messages)  │                 │
│  └────┬─────┘  └──────┬───────┘  └────────┬─────────┘                 │
│       │               │                    │                            │
│       │               │                    │                            │
│  ┌────▼───────────────▼────────────────────▼───────────┐               │
│  │           Translations Service                       │               │
│  │  - Multi-language text                               │               │
│  │  - Date/time formatting                              │               │
│  │  - Language detection                                │               │
│  └──────────────────────────────────────────────────────┘               │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                Data Layer (Repositories)                         │   │
│  ├──────────────┬───────────────┬──────────────┬───────────────────┤   │
│  │ Slots Repo   │ Bookings Repo │ Masters Repo │ Customers Repo    │   │
│  └──────┬───────┴───────┬───────┴──────┬───────┴──────┬────────────┘   │
│         │               │              │              │                 │
└─────────┼───────────────┼──────────────┼──────────────┼─────────────────┘
          │               │              │              │
          ▼               ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        PostgreSQL Database                               │
│  - Slots table                                                           │
│  - Bookings table                                                        │
│  - Masters table                                                         │
│  - Customers table                                                       │
│  - Conversations table                                                   │
└─────────────────────────────────────────────────────────────────────────┘
```

## Component Interaction Flow

### 1. Customer Requests Available Slots

```
Customer                 WhatsApp          Webhook          Quick Booking      Slots         Interactive      WhatsApp
  │                       Cloud API        Controller       Service            Repo          Card Builder     Service
  │                          │                │                │                │                │               │
  │ "Show me times           │                │                │                │                │               │
  │  for Friday"             │                │                │                │                │               │
  ├─────────────────────────►│                │                │                │                │               │
  │                          │ Webhook        │                │                │                │               │
  │                          │ (text msg)     │                │                │                │               │
  │                          ├───────────────►│                │                │                │               │
  │                          │                │ Process        │                │                │               │
  │                          │                │ text msg       │                │                │               │
  │                          │                ├───────────────►│                │                │               │
  │                          │                │                │ Find slots     │                │               │
  │                          │                │                │ for Friday     │                │               │
  │                          │                │                ├───────────────►│                │               │
  │                          │                │                │                │ Query DB       │               │
  │                          │                │                │                │ (3 slots)      │               │
  │                          │                │                │◄───────────────┤                │               │
  │                          │                │                │                │                │               │
  │                          │                │                │ Build Reply    │                │               │
  │                          │                │                │ Buttons card   │                │               │
  │                          │                │                ├───────────────────────────────►│               │
  │                          │                │                │                │                │ Build card    │
  │                          │                │                │                │                │ (3 buttons)   │
  │                          │                │                │◄───────────────────────────────┤               │
  │                          │                │                │                │                │               │
  │                          │                │                │ Send message   │                │               │
  │                          │                │                ├───────────────────────────────────────────────►│
  │                          │                │                │                │                │               │ Send to
  │                          │◄──────────────────────────────────────────────────────────────────────────────────┤ WhatsApp
  │ Receives Reply Buttons   │                │                │                │                │               │ API
  │ [2PM] [3PM ⭐] [4PM]     │                │                │                │                │               │
  │◄─────────────────────────┤                │                │                │                │               │
```

### 2. Customer Clicks Button

```
Customer                 WhatsApp          Webhook          Quick Booking      Button         Bookings       Interactive      WhatsApp
  │                       Cloud API        Controller       Service            Parser         Repo           Card Builder     Service
  │                          │                │                │                │                │                │               │
  │ Clicks [3PM ⭐]          │                │                │                │                │                │               │
  ├─────────────────────────►│                │                │                │                │                │               │
  │                          │ Webhook        │                │                │                │                │               │
  │                          │ (button reply) │                │                │                │                │               │
  │                          │ ID: slot_...   │                │                │                │                │               │
  │                          ├───────────────►│                │                │                │                │               │
  │                          │                │ Process        │                │                │                │               │
  │                          │                │ button click   │                │                │                │               │
  │                          │                ├───────────────►│                │                │                │               │
  │                          │                │                │ Parse button   │                │                │               │
  │                          │                │                │ ID             │                │                │               │
  │                          │                │                ├───────────────►│                │                │               │
  │                          │                │                │                │ Parse ID       │                │               │
  │                          │                │                │                │ Extract date,  │                │               │
  │                          │                │                │                │ time, master   │                │               │
  │                          │                │                │◄───────────────┤                │                │               │
  │                          │                │                │                │                │                │               │
  │                          │                │                │ Create pending │                │                │               │
  │                          │                │                │ booking        │                │                │               │
  │                          │                │                ├───────────────────────────────►│                │               │
  │                          │                │                │                │                │ Insert DB      │               │
  │                          │                │                │                │                │ (PENDING)      │               │
  │                          │                │                │◄───────────────────────────────┤                │               │
  │                          │                │                │                │                │                │               │
  │                          │                │                │ Build          │                │                │               │
  │                          │                │                │ confirmation   │                │                │               │
  │                          │                │                │ card           │                │                │               │
  │                          │                │                ├───────────────────────────────────────────────►│               │
  │                          │                │                │                │                │                │ Build card    │
  │                          │                │                │                │                │                │ [Confirm]     │
  │                          │                │                │                │                │                │ [Change Time] │
  │                          │                │                │◄───────────────────────────────────────────────┤               │
  │                          │                │                │                │                │                │               │
  │                          │                │                │ Send message   │                │                │               │
  │                          │                │                ├───────────────────────────────────────────────────────────────►│
  │                          │                │                │                │                │                │               │
  │                          │◄──────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Receives Confirmation    │                │                │                │                │                │               │
  │ [Confirm] [Change Time]  │                │                │                │                │                │               │
  │◄─────────────────────────┤                │                │                │                │                │               │
```

### 3. Customer Confirms Booking

```
Customer                 WhatsApp          Webhook          Quick Booking      Button         Bookings       WhatsApp
  │                       Cloud API        Controller       Service            Parser         Repo           Service
  │                          │                │                │                │                │               │
  │ Clicks [Confirm]         │                │                │                │                │               │
  ├─────────────────────────►│                │                │                │                │               │
  │                          │ Webhook        │                │                │                │               │
  │                          │ (button reply) │                │                │                │               │
  │                          │ ID: confirm_.. │                │                │                │               │
  │                          ├───────────────►│                │                │                │               │
  │                          │                │ Process        │                │                │               │
  │                          │                │ confirm        │                │                │               │
  │                          │                ├───────────────►│                │                │               │
  │                          │                │                │ Parse button   │                │               │
  │                          │                │                ├───────────────►│                │               │
  │                          │                │                │                │ Extract        │               │
  │                          │                │                │                │ booking ID     │               │
  │                          │                │                │◄───────────────┤                │               │
  │                          │                │                │                │                │               │
  │                          │                │                │ Update booking │                │               │
  │                          │                │                │ to CONFIRMED   │                │               │
  │                          │                │                ├───────────────────────────────►│               │
  │                          │                │                │                │                │ Update DB     │
  │                          │                │                │                │                │ (CONFIRMED)   │
  │                          │                │                │◄───────────────────────────────┤               │
  │                          │                │                │                │                │               │
  │                          │                │                │ Send success   │                │               │
  │                          │                │                │ message        │                │               │
  │                          │                │                ├───────────────────────────────────────────────►│
  │                          │                │                │                │                │               │
  │                          │◄──────────────────────────────────────────────────────────────────────────────────┤
  │ "Booking confirmed! ✅"  │                │                │                │                │               │
  │◄─────────────────────────┤                │                │                │                │               │
```

## Service Dependencies

### InteractiveCardBuilder Dependencies

```typescript
// Internal Dependencies
import {
  InteractiveMessagePayload,
  InteractiveButtons,
  InteractiveList,
  // ... other types from whatsapp.types.ts
} from '../../../types/whatsapp.types';

import {
  SupportedLanguage,
  getTranslations,
  interpolate,
  formatDate,
  formatTime,
  // ... from translations.ts
} from './translations';

// External Dependencies
import { Injectable, Logger } from '@nestjs/common';

// No other dependencies - fully self-contained!
```

### Consumer Services

```typescript
// Quick Booking Service
import { InteractiveCardBuilder } from './interactive/interactive-message.builder';

// Button Parser Service (separate)
import { ButtonParserService } from './interactive/button-parser.service';

// WhatsApp Service (sends messages)
import { WhatsAppService } from './whatsapp.service';
```

## Data Flow

### Slot Selection Flow

```
1. Customer Request
   └─► AI Service (detect intent)
       └─► Quick Booking Service
           └─► Slots Repository
               └─► PostgreSQL (query available slots)
                   └─► Transform to TimeSlot[]
                       └─► InteractiveCardBuilder
                           └─► Build message (Reply Buttons or List)
                               └─► WhatsApp Service
                                   └─► WhatsApp Cloud API
                                       └─► Customer receives message

2. Customer Clicks Button
   └─► WhatsApp Cloud API (webhook)
       └─► Webhook Controller
           └─► Quick Booking Service
               └─► ButtonParserService (parse button ID)
                   └─► Bookings Repository
                       └─► PostgreSQL (create pending booking)
                           └─► InteractiveCardBuilder
                               └─► Build confirmation card
                                   └─► WhatsApp Service
                                       └─► WhatsApp Cloud API
                                           └─► Customer receives confirmation

3. Customer Confirms
   └─► WhatsApp Cloud API (webhook)
       └─► Webhook Controller
           └─► Quick Booking Service
               └─► ButtonParserService (parse confirm ID)
                   └─► Bookings Repository
                       └─► PostgreSQL (update to CONFIRMED)
                           └─► WhatsApp Service
                               └─► Send success message
                                   └─► Schedule reminder
```

## Message Format Decision Tree

```
Customer requests slots
        │
        ▼
Query available slots
        │
        ▼
Count slots
        │
        ├─► 0 slots ──────────► Send "No slots available"
        │
        ├─► 1-3 slots ────────► InteractiveCardBuilder.buildReplyButtonsCard()
        │                        │
        │                        ▼
        │                       Reply Buttons Message
        │                       [Button 1] [Button 2] [Button 3]
        │
        ├─► 4-10 slots ───────► InteractiveCardBuilder.buildListMessageCard()
        │                        │
        │                        ▼
        │                       List Message
        │                       [Select Time ▼]
        │                       • Saturday, Oct 26
        │                         - 10:00 AM
        │                         - 2:00 PM
        │                       • Sunday, Oct 27
        │                         - 11:00 AM
        │
        └─► >10 slots ────────► Paginate (show first 10)
                                 + "See More" button
```

## Button ID Structure

### Slot Button
```
slot_{date}_{time}_{masterId}
│    │     │     └─────────────► Master ID (e.g., "m123")
│    │     └───────────────────► Time in 24h format (e.g., "15:00")
│    └─────────────────────────► Date in ISO format (e.g., "2024-10-25")
└──────────────────────────────► Button type

Example: slot_2024-10-25_15:00_m123
```

### Confirm Button
```
confirm_{action}_{entityId}
│       │        └──────────────► Entity ID (e.g., "b456")
│       └───────────────────────► Action name (e.g., "booking")
└───────────────────────────────► Button type

Example: confirm_booking_b456
```

### Action Button
```
action_{actionName}
│      └────────────────────────► Action name (e.g., "change_time")
└───────────────────────────────► Button type

Example: action_change_time
```

### Navigation Button
```
nav_{direction}_{page}_{context}
│    │          │      └─────────► Optional context (e.g., "serviceId_date")
│    │          └────────────────► Page number (optional)
│    └───────────────────────────► Direction (e.g., "next", "prev")
└────────────────────────────────► Button type

Example: nav_next_2_s123_2024-10-25
```

## State Management

The system is **stateless** at the message building level. State is managed in the database:

```
Conversation State (DB Table)
├─ conversation_id
├─ customer_phone
├─ current_step: "awaiting_slot_selection" | "awaiting_confirmation" | "completed"
├─ context: JSON
│  ├─ service_id
│  ├─ target_date
│  ├─ pending_booking_id
│  └─ language
├─ created_at
└─ updated_at

Booking State (DB Table)
├─ booking_id
├─ status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED"
├─ customer_phone
├─ service_id
├─ master_id
├─ date
├─ time
└─ timestamps
```

## Error Handling Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                   Error Type                                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Validation Errors (400)                                    │
│  ├─ Empty slots array                                       │
│  ├─ Too many slots (>10)                                    │
│  ├─ Invalid phone number                                    │
│  └─ Invalid button format                                   │
│      └─► Throw error immediately                            │
│                                                              │
│  Business Logic Errors (409)                                │
│  ├─ Slot already booked                                     │
│  ├─ Slot no longer available                                │
│  └─ Double booking attempt                                  │
│      └─► Send "slot unavailable" message                    │
│                                                              │
│  External Service Errors (502/503)                          │
│  ├─ WhatsApp API timeout                                    │
│  ├─ WhatsApp API rate limit                                 │
│  └─ Database connection error                               │
│      └─► Retry with exponential backoff                     │
│          └─► If still fails: send generic error message     │
│                                                              │
│  Constraint Violations                                       │
│  ├─ Button title too long                                   │
│  ├─ Button ID too long                                      │
│  └─ Body text too long                                      │
│      └─► Auto-truncate with "..."                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Performance Optimization

### 1. Caching Strategy
```typescript
// Cache frequently accessed data
- Customer language preferences (Redis, 1 hour TTL)
- Service details (Redis, 5 minutes TTL)
- Master information (Redis, 5 minutes TTL)
- Translation bundles (In-memory, never expire)
```

### 2. Database Optimization
```sql
-- Indexes for fast slot queries
CREATE INDEX idx_slots_date_time ON slots(date, start_time);
CREATE INDEX idx_slots_master ON slots(master_id);
CREATE INDEX idx_slots_service ON slots(service_id);
CREATE INDEX idx_slots_available ON slots(is_available) WHERE is_available = true;

-- Composite index for common query
CREATE INDEX idx_slots_lookup ON slots(service_id, date, is_available);
```

### 3. Message Building
- **Build time**: < 1ms (pure TypeScript, no I/O)
- **Memory**: Minimal (no large data structures)
- **Concurrency**: Thread-safe (stateless service)

## Security Considerations

### 1. Input Validation
```typescript
// Validate phone numbers
if (!/^\+[1-9]\d{1,14}$/.test(customerPhone)) {
  throw new BadRequestException('Invalid phone number');
}

// Validate button IDs on webhook
const buttonIdPattern = /^(slot|confirm|waitlist|action|nav)_[a-zA-Z0-9_:-]+$/;
if (!buttonIdPattern.test(buttonId)) {
  throw new BadRequestException('Invalid button ID');
}
```

### 2. Webhook Signature Verification
```typescript
// Verify webhook signature (WhatsApp Cloud API)
const signature = request.headers['x-hub-signature-256'];
const expectedSignature = crypto
  .createHmac('sha256', process.env.WHATSAPP_WEBHOOK_SECRET)
  .update(JSON.stringify(request.body))
  .digest('hex');

if (signature !== `sha256=${expectedSignature}`) {
  throw new UnauthorizedException('Invalid webhook signature');
}
```

### 3. Rate Limiting
```typescript
// Rate limit per customer
@ThrottlerGuard({ ttl: 60, limit: 10 }) // 10 requests per minute
export class WhatsAppWebhookController {
  // ...
}
```

## Monitoring & Observability

### Metrics to Track
```typescript
// Message building metrics
- messages_built_total (counter, by type: reply_buttons/list)
- message_build_duration_ms (histogram)
- message_build_errors_total (counter, by error_type)

// Webhook metrics
- webhook_events_total (counter, by event_type)
- webhook_processing_duration_ms (histogram)
- button_clicks_total (counter, by button_type)

// Booking metrics
- bookings_created_total (counter, by status)
- bookings_confirmed_total (counter)
- booking_conversion_rate (gauge)
```

### Logging Strategy
```typescript
// Log message sends
logger.log(`Sent slot selection to ${customerPhone}: ${slots.length} slots`);

// Log button clicks
logger.log(`Button clicked: ${buttonId} by ${customerPhone}`);

// Log errors
logger.error(`Failed to build message: ${error.message}`, error.stack);
```

## Deployment Considerations

### Environment Variables
```env
# WhatsApp Cloud API
WHATSAPP_PHONE_NUMBER_ID=123456789
WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxxxxx
WHATSAPP_WEBHOOK_SECRET=your_webhook_secret

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Redis (for caching)
REDIS_HOST=localhost
REDIS_PORT=6379

# Monitoring
SENTRY_DSN=https://...
```

### Scalability
- **Horizontal scaling**: Stateless service, safe to scale
- **Load balancing**: Any LB works (round-robin, least-connections)
- **Database**: Connection pooling (max 20 connections per instance)
- **Redis**: Single instance sufficient for caching

## Testing Strategy

### Unit Tests (47 tests)
- ✅ Message building logic
- ✅ Constraint validation
- ✅ Multi-language support
- ✅ Edge cases

### Integration Tests
- Webhook to database flow
- Message send to WhatsApp API
- Button click to booking creation

### E2E Tests
- Complete booking flow
- Multi-language flow
- Error scenarios

## Future Enhancements

1. **Rich Media Support**: Add image/video headers to messages
2. **Quick Replies**: Text-based quick reply suggestions
3. **Message Templates**: Pre-approved template messages
4. **A/B Testing**: Test different message formats
5. **Analytics Dashboard**: Track conversion rates, popular times
6. **Smart Suggestions**: AI-powered slot recommendations
7. **Waitlist Management**: Join waitlist if no slots available
8. **Multi-Service Booking**: Book multiple services in one flow

---

**Last Updated**: 2025-10-25
**Status**: Production Ready ✅
