# Button Handler Service

Complete implementation of WhatsApp button click handlers for the Quick Booking feature.

## Overview

The `ButtonHandlerService` manages the entire booking flow for WhatsApp interactive messages:

1. **T031: Slot Selection** - Customer taps a time slot button
2. **T032: Booking Confirmation** - Customer confirms the selected slot

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     WhatsApp Cloud API                          │
│                   (Button Click Webhook)                        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Button Click Event
                         │ { id: "slot_2024-10-25_15:00_m123" }
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                  WebhookController                              │
│              (Receives webhook payload)                         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                  ButtonParserService                            │
│          Parses: "slot_2024-10-25_15:00_m123"                  │
│          Returns: { date, time, masterId }                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│               ButtonHandlerService (T031)                       │
│                                                                  │
│  1. Validate slot availability                                  │
│  2. Check for conflicts (existing bookings)                     │
│  3. Fetch master & service details                              │
│  4. Store slot in session context                               │
│  5. Build confirmation card                                      │
│  6. Track analytics                                              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Confirmation Card
                         │ [Confirm] [Change Time]
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│          Customer Taps [Confirm] Button                         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              ButtonHandlerService (T032)                        │
│                                                                  │
│  1. Retrieve slot from session                                  │
│  2. Final availability check (race condition protection)        │
│  3. Create booking in database (with transaction + locking)     │
│  4. Generate unique booking code (BK123456)                     │
│  5. Increment salon usage counter                               │
│  6. Send confirmation message                                    │
│  7. Clear session                                                │
│  8. Track analytics                                              │
└─────────────────────────────────────────────────────────────────┘
```

## Key Features

### 1. Slot Availability Validation

**Purpose**: Prevent double-booking by checking existing bookings.

**Implementation**:
```typescript
async validateSlotAvailability(
  masterId: string,
  date: string,
  time: string,
  salonId?: string
): Promise<AvailabilityCheckResult>
```

**Query Logic**:
- Checks `bookings` table for overlapping appointments
- Only considers `CONFIRMED` and `COMPLETED` bookings (excludes cancelled/no-show)
- Uses indexed query for fast lookup: `idx_bookings_salon_status_start`

**Returns**:
```typescript
{
  available: true | false,
  existingBooking?: Booking,
  reason?: string
}
```

### 2. Session Management

**Purpose**: Store selected slot temporarily between slot selection and confirmation.

**Storage**: In-memory Map (recommend Redis in production)

**Session Key**: `${customerPhone}_${salonId}`

**Session Data**:
```typescript
{
  selectedSlot: {
    date: "2024-10-25",
    time: "15:00",
    masterId: "m123",
    masterName: "Sarah Johnson",
    serviceId: "s456",
    serviceName: "Women's Haircut",
    duration: 60,
    price: 5000,
    timestamp: 1698247800000
  },
  customerPhone: "+1234567890",
  customerName: "John Doe",
  salonId: "salon-uuid",
  language: "en",
  timestamp: 1698247800000
}
```

**Expiration**: 15 minutes (configurable via `SESSION_EXPIRATION_MS`)

**Cleanup**: Automatic cleanup every 5 minutes (removes expired sessions)

### 3. Booking Creation with Row Locking

**Purpose**: Prevent race conditions when multiple customers book the same slot.

**Implementation**:
```typescript
private async createBooking(
  customerPhone: string,
  customerName: string,
  salonId: string,
  slot: SlotData
): Promise<Booking>
```

**Transaction Flow**:
```sql
BEGIN TRANSACTION;

-- Step 1: Lock conflicting rows
SELECT * FROM bookings
WHERE master_id = 'm123'
  AND start_ts = '2024-10-25 15:00:00'
  AND status IN ('CONFIRMED', 'COMPLETED')
FOR UPDATE;

-- Step 2: If no conflicts, insert booking
INSERT INTO bookings (...) VALUES (...);

-- Step 3: Increment salon usage counter
UPDATE salons
SET usage_current_bookings = usage_current_bookings + 1
WHERE id = 'salon-uuid';

COMMIT;
```

**Row Locking Benefits**:
- **Prevents double-booking**: `FOR UPDATE` locks matching rows
- **Serializes concurrent requests**: Second request waits until first completes
- **Atomic operation**: Either all steps succeed or all rollback

### 4. Retry Logic with Exponential Backoff

**Purpose**: Handle transient database errors (connection loss, deadlocks).

**Configuration**:
- `MAX_RETRY_ATTEMPTS`: 3
- `RETRY_BASE_DELAY_MS`: 100ms

**Backoff Schedule**:
- Attempt 1: Immediate
- Attempt 2: Wait 100ms (100 × 2^0)
- Attempt 3: Wait 200ms (100 × 2^1)

**Error Handling**:
- **Retryable errors**: Database connection errors, timeouts
- **Non-retryable errors**: `BadRequestException`, `ConflictException`

**Implementation**:
```typescript
private async createBookingWithRetry(...): Promise<Booking> {
  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      return await this.createBooking(...);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error; // Don't retry validation errors
      }

      if (attempt < MAX_RETRY_ATTEMPTS) {
        const delayMs = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
        await this.sleep(delayMs);
      }
    }
  }

  throw new Error('Max retries exceeded');
}
```

### 5. Booking Code Generation

**Format**: `BK{6-digit-random-number}`

**Example**: `BK847392`, `BK123456`

**Uniqueness**: Checks database for collisions, retries up to 10 times

**Implementation**:
```typescript
private async generateBookingCode(tx: any): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = `BK${Math.floor(100000 + Math.random() * 900000)}`;

    const existing = await tx.booking.findFirst({
      where: { booking_code: code }
    });

    if (!existing) return code;
  }

  throw new Error('Failed to generate unique code');
}
```

### 6. Alternative Slots on Conflict

**Scenario**: Customer selects a slot that was just booked by another customer.

**Flow**:
1. Detect slot conflict
2. Fetch next 3 available slots for same master
3. Build interactive card with alternatives
4. Return to customer

**Implementation**:
```typescript
private async handleSlotUnavailable(
  masterId: string,
  date: string,
  time: string,
  salonId: string,
  customerPhone: string,
  language: string
): Promise<SlotSelectionResponse>
```

**Response**:
```
Sorry, this time slot is no longer available.

Here are alternative times:

[4:00 PM - Sarah]
[5:00 PM - Sarah]
[6:00 PM - Sarah]
```

## API Usage

### Slot Selection (T031)

```typescript
import { ButtonHandlerService } from './button-handler.service';

@Controller('webhooks/whatsapp')
export class WhatsAppWebhookController {
  constructor(private readonly buttonHandler: ButtonHandlerService) {}

  @Post()
  async handleWebhook(@Body() payload: WhatsAppWebhookPayload) {
    const message = payload.entry[0].changes[0].value.messages[0];

    if (message.type === 'interactive' && message.interactive.type === 'button_reply') {
      const buttonId = message.interactive.button_reply.id;

      // Check if it's a slot selection
      if (buttonId.startsWith('slot_')) {
        const result = await this.buttonHandler.handleSlotSelection(
          buttonId,
          message.from, // Customer phone: "+1234567890"
          'salon-uuid', // Extract from webhook metadata
          'en'          // Extract from customer preferences
        );

        if (result.success) {
          // Send confirmation card
          await this.whatsappService.sendInteractiveMessage(result.card);
        }
      }
    }
  }
}
```

### Booking Confirmation (T032)

```typescript
// Check if it's a confirmation button
if (buttonId.startsWith('confirm_booking_')) {
  try {
    const result = await this.buttonHandler.handleBookingConfirmation(
      buttonId,
      message.from,
      'salon-uuid',
      'en'
    );

    if (result.success) {
      // Send confirmation message
      await this.whatsappService.sendTextMessage(
        message.from,
        result.message
      );

      console.log(`Booking created: ${result.bookingCode}`);
    }
  } catch (error) {
    if (error instanceof BadRequestException) {
      // Session expired
      await this.whatsappService.sendTextMessage(
        message.from,
        'Session expired. Please select a time slot again.'
      );
    } else if (error instanceof ConflictException) {
      // Slot was booked by another customer
      await this.whatsappService.sendTextMessage(
        message.from,
        error.message
      );
    }
  }
}
```

## Error Handling

### Error Types

| Error | Scenario | HTTP Code | User Message |
|-------|----------|-----------|--------------|
| `BadRequestException` | Invalid button ID | 400 | "Invalid button format. Please try again." |
| `BadRequestException` | Session expired | 400 | "Session expired. Please select a time slot again." |
| `BadRequestException` | Master not found | 400 | "Service provider not found." |
| `ConflictException` | Slot taken during confirmation | 409 | "Sorry, this slot was just booked. Please select another time." |
| `Error` | Database failure after retries | 500 | "Failed to create booking. Please try again." |

### Error Recovery Strategies

**1. Session Expiration**
- **Detection**: Session not found in `getSession()`
- **Recovery**: Send message asking customer to restart booking flow
- **Prevention**: Extend session timeout to 15 minutes

**2. Slot Conflict**
- **Detection**: `validateSlotAvailability()` returns `false`
- **Recovery**: Show alternative slots via `handleSlotUnavailable()`
- **Prevention**: Implement optimistic locking with versioning

**3. Database Errors**
- **Detection**: Prisma transaction throws error
- **Recovery**: Retry with exponential backoff (up to 3 attempts)
- **Prevention**: Use connection pooling, health checks

**4. Race Conditions**
- **Detection**: `FOR UPDATE` query returns conflicting booking
- **Recovery**: Throw `ConflictException`, clear session
- **Prevention**: Always use row locking for critical operations

## Analytics Tracking

### Events Tracked

```typescript
// Slot selection
trackButtonClick('slot_selection', buttonId, customerPhone, salonId);

// Booking confirmation
trackButtonClick('booking_confirmation', buttonId, customerPhone, salonId);
```

### Metrics to Monitor

1. **Slot Selection Success Rate**
   - Formula: `successful_selections / total_selections`
   - Target: > 95%

2. **Confirmation Success Rate**
   - Formula: `successful_confirmations / total_confirmations`
   - Target: > 98%

3. **Session Expiration Rate**
   - Formula: `expired_sessions / total_sessions`
   - Target: < 5%

4. **Slot Conflict Rate**
   - Formula: `conflicts / total_selections`
   - Target: < 2%

5. **Average Time to Confirm**
   - Formula: `confirmation_timestamp - selection_timestamp`
   - Target: < 30 seconds

## Database Schema

### Bookings Table

```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY,
  booking_code VARCHAR(10) UNIQUE NOT NULL,
  salon_id UUID NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,
  customer_name VARCHAR(100) NOT NULL,
  service VARCHAR(100) NOT NULL,
  start_ts TIMESTAMP NOT NULL,
  end_ts TIMESTAMP,
  status VARCHAR(20) DEFAULT 'CONFIRMED',
  master_id UUID,
  service_id UUID,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX idx_bookings_salon_status_start
  ON bookings(salon_id, status, start_ts);

CREATE INDEX idx_bookings_master_start
  ON bookings(master_id, start_ts);
```

## Performance Considerations

### Database Query Optimization

**1. Use Composite Indexes**
```sql
CREATE INDEX idx_bookings_availability
  ON bookings(master_id, start_ts, status);
```

**2. Avoid N+1 Queries**
```typescript
// ❌ Bad: N+1 queries
for (const booking of bookings) {
  const master = await prisma.master.findUnique({ where: { id: booking.master_id } });
}

// ✅ Good: Single query with join
const bookings = await prisma.booking.findMany({
  include: { master: true }
});
```

**3. Use Connection Pooling**
```typescript
// DATABASE_URL="postgresql://user:pass@host:5432/db?pool_timeout=0&connection_limit=10"
```

### Session Storage Scaling

**Current**: In-memory Map (single server)

**Production**: Redis cluster (distributed)

```typescript
import { Redis } from 'ioredis';

class RedisSessionStore {
  constructor(private redis: Redis) {}

  async setSession(key: string, data: SessionContext): Promise<void> {
    await this.redis.setex(
      key,
      SESSION_EXPIRATION_MS / 1000, // Convert to seconds
      JSON.stringify(data)
    );
  }

  async getSession(key: string): Promise<SessionContext | null> {
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }
}
```

## Testing

### Run Tests

```bash
# Unit tests
npm test button-handler.service.spec.ts

# Coverage report
npm test -- --coverage button-handler.service.spec.ts
```

### Test Coverage

- ✅ Slot selection (available slot)
- ✅ Slot selection (unavailable slot)
- ✅ Slot selection (invalid button ID)
- ✅ Slot selection (master not found)
- ✅ Booking confirmation (success)
- ✅ Booking confirmation (session expired)
- ✅ Booking confirmation (slot conflict)
- ✅ Retry logic on transient errors
- ✅ Session management (store, retrieve, expire)
- ✅ Booking code generation (uniqueness)

### Integration Test Example

```typescript
describe('Button Handler Integration', () => {
  it('should complete full booking flow', async () => {
    // 1. Customer selects slot
    const slotResult = await buttonHandler.handleSlotSelection(
      'slot_2024-10-25_15:00_m123',
      '+1234567890',
      'salon-uuid',
      'en'
    );

    expect(slotResult.success).toBe(true);

    // 2. Customer confirms booking
    const confirmResult = await buttonHandler.handleBookingConfirmation(
      'confirm_booking_temp',
      '+1234567890',
      'salon-uuid',
      'en'
    );

    expect(confirmResult.success).toBe(true);
    expect(confirmResult.bookingCode).toMatch(/^BK\d{6}$/);

    // 3. Verify booking in database
    const booking = await prisma.booking.findFirst({
      where: { booking_code: confirmResult.bookingCode }
    });

    expect(booking).toBeDefined();
    expect(booking.status).toBe('CONFIRMED');
  });
});
```

## Production Deployment

### Environment Variables

```bash
# Session configuration
SESSION_EXPIRATION_MS=900000  # 15 minutes

# Retry configuration
MAX_RETRY_ATTEMPTS=3
RETRY_BASE_DELAY_MS=100

# Database connection pooling
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=20"

# Redis (for session storage)
REDIS_URL="redis://localhost:6379"
```

### Monitoring

**Key Metrics**:
- Button click latency (p50, p95, p99)
- Booking creation success rate
- Session expiration rate
- Database transaction duration
- Retry attempt distribution

**Alerts**:
- Booking success rate < 95%
- Database error rate > 1%
- Average latency > 2 seconds
- Session expiration rate > 10%

### Scaling Recommendations

**Horizontal Scaling**:
- Use Redis for distributed session storage
- Enable database read replicas for availability checks
- Implement rate limiting per customer

**Vertical Scaling**:
- Increase database connection pool size
- Add database indexes for common queries
- Use caching for master/service data

## Future Enhancements

1. **Waitlist Integration**: Auto-notify when slot becomes available
2. **Payment Integration**: Collect deposit during confirmation
3. **Smart Rescheduling**: AI-powered conflict resolution
4. **Multi-Service Booking**: Book multiple services in one transaction
5. **Cancellation Handling**: Allow customers to cancel via button
6. **Calendar Sync**: Export booking to Google/Apple Calendar

## Support

For questions or issues, contact the backend team or create an issue in the repository.

**Related Files**:
- `button-handler.service.ts` - Main implementation
- `button-handler.service.spec.ts` - Unit tests
- `button-parser.service.ts` - Button ID parsing
- `interactive-message.builder.ts` - Card building
- `prisma/schema.prisma` - Database schema
