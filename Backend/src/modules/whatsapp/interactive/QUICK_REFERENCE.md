# Button Handler Service - Quick Reference

## 🚀 Quick Start

### Installation

No additional dependencies required. Service is ready to use.

### Import Service

```typescript
import { ButtonHandlerService } from './button-handler.service';

constructor(private readonly buttonHandler: ButtonHandlerService) {}
```

---

## 📝 Basic Usage

### Slot Selection (T031)

```typescript
const result = await buttonHandler.handleSlotSelection(
  'slot_2024-10-25_15:00_m123',  // Button ID
  '+1234567890',                  // Customer phone
  'salon-uuid-123',               // Salon ID
  'en'                            // Language
);

if (result.success) {
  // Send confirmation card
  await whatsappService.sendMessage(result.card);
}
```

### Booking Confirmation (T032)

```typescript
try {
  const result = await buttonHandler.handleBookingConfirmation(
    'confirm_booking_temp',
    '+1234567890',
    'salon-uuid-123',
    'en'
  );

  // Send success message
  await whatsappService.sendTextMessage(
    '+1234567890',
    result.message  // "✅ Booking confirmed! ..."
  );

  console.log(`Booking created: ${result.bookingCode}`);
} catch (error) {
  // Handle errors (see Error Handling section)
}
```

---

## 🔧 Error Handling

### Error Types

| Error | When it occurs | How to handle |
|-------|----------------|---------------|
| `BadRequestException` | Invalid button ID, session expired, master not found | Send error message to customer |
| `ConflictException` | Slot booked by another customer | Show alternative slots |
| `Error` | Database failure after retries | Log error, notify support |

### Error Handling Pattern

```typescript
try {
  const result = await buttonHandler.handleBookingConfirmation(...);
} catch (error) {
  if (error instanceof BadRequestException) {
    // Session expired or invalid input
    await whatsappService.sendTextMessage(
      customerPhone,
      'Session expired. Please select a time slot again.'
    );
  } else if (error instanceof ConflictException) {
    // Slot was just booked
    await whatsappService.sendTextMessage(
      customerPhone,
      'Sorry, this slot was just booked. Please select another time.'
    );
  } else {
    // Unexpected error
    this.logger.error('Booking failed:', error);
    await whatsappService.sendTextMessage(
      customerPhone,
      'Failed to create booking. Please try again or contact support.'
    );
  }
}
```

---

## 📊 Response Formats

### Slot Selection Response

```typescript
{
  success: boolean;
  card: InteractiveMessagePayload;
  message?: string;
}
```

**Example (Available)**:
```typescript
{
  success: true,
  card: {
    messaging_product: 'whatsapp',
    to: '+1234567890',
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: 'Confirm booking:\n\nWomen\'s Haircut\n...' },
      action: {
        buttons: [
          { type: 'reply', reply: { id: 'confirm_booking_...', title: 'Confirm' } },
          { type: 'reply', reply: { id: 'action_change_time', title: 'Change Time' } }
        ]
      }
    }
  },
  message: 'Slot selected: 2024-10-25 15:00 with Sarah Johnson'
}
```

**Example (Unavailable)**:
```typescript
{
  success: false,
  card: {
    // Alternative slots card
  },
  message: 'Slot unavailable. Showing 3 alternatives.'
}
```

### Booking Confirmation Response

```typescript
{
  success: boolean;
  message: string;
  bookingId?: string;
  bookingCode?: string;
}
```

**Example (Success)**:
```typescript
{
  success: true,
  message: '✅ Booking confirmed!\n\n💇 Women\'s Haircut with Sarah Johnson\n📅 Friday, Oct 25 at 3:00 PM\n\nBooking ID: #BK123456',
  bookingId: 'uuid-123',
  bookingCode: 'BK123456'
}
```

---

## 🔐 Session Management

### Session Lifecycle

```
1. Customer selects slot
   ↓
2. Session created (15-min expiration)
   ↓
3. Customer taps [Confirm]
   ↓
4. Booking created
   ↓
5. Session cleared
```

### Session Data

```typescript
{
  selectedSlot: {
    date: "2024-10-25",
    time: "15:00",
    masterId: "uuid-123",
    masterName: "Sarah Johnson",
    serviceId: "uuid-456",
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

### Manual Session Access (Advanced)

```typescript
// Get session
const session = buttonHandler['getSession'](customerPhone, salonId);

// Clear session
buttonHandler['clearSession'](customerPhone, salonId);
```

---

## 🗄️ Database Operations

### Availability Check

**Query**:
```sql
SELECT * FROM bookings
WHERE master_id = ?
  AND start_ts = ?
  AND status IN ('CONFIRMED', 'COMPLETED')
  AND salon_id = ?
```

**Index Used**: `idx_bookings_salon_status_start`

### Booking Creation

**Transaction**:
```sql
BEGIN;

-- Lock rows
SELECT * FROM bookings
WHERE master_id = ? AND start_ts = ?
FOR UPDATE;

-- Insert booking
INSERT INTO bookings (...) VALUES (?);

-- Update usage counter
UPDATE salons SET usage_current_bookings = usage_current_bookings + 1
WHERE id = ?;

COMMIT;
```

---

## 📈 Performance Tips

### Optimize Database Queries

```sql
-- Add composite indexes
CREATE INDEX idx_bookings_availability
  ON bookings(master_id, start_ts, status);

-- Use connection pooling
DATABASE_URL="postgresql://...?connection_limit=20"
```

### Cache Master/Service Data

```typescript
// Cache master data for 5 minutes
const cachedMaster = await cacheService.get(
  `master:${masterId}`,
  async () => prisma.master.findUnique({ where: { id: masterId } }),
  300 // TTL: 5 minutes
);
```

### Batch Analytics Events

```typescript
// Instead of logging each event immediately
await analytics.track('slot_selection', data);

// Batch events and flush every 10 seconds
analyticsBuffer.push({ event: 'slot_selection', data });
```

---

## 🧪 Testing

### Unit Test Example

```typescript
it('should handle slot selection successfully', async () => {
  // Mock dependencies
  buttonParser.parseSlotButton.mockReturnValue({
    date: '2024-10-25',
    time: '15:00',
    masterId: 'm123'
  });
  prismaService.booking.findFirst.mockResolvedValue(null);

  // Execute
  const result = await buttonHandler.handleSlotSelection(
    'slot_2024-10-25_15:00_m123',
    '+1234567890',
    'salon-uuid',
    'en'
  );

  // Assert
  expect(result.success).toBe(true);
  expect(result.card).toBeDefined();
});
```

### Integration Test Example

```typescript
it('should complete full booking flow', async () => {
  // 1. Select slot
  const slotResult = await buttonHandler.handleSlotSelection(...);
  expect(slotResult.success).toBe(true);

  // 2. Confirm booking
  const confirmResult = await buttonHandler.handleBookingConfirmation(...);
  expect(confirmResult.success).toBe(true);

  // 3. Verify in database
  const booking = await prisma.booking.findFirst({
    where: { booking_code: confirmResult.bookingCode }
  });
  expect(booking).toBeDefined();
});
```

---

## 📊 Monitoring

### Key Metrics

```typescript
// Success rate
const successRate = successful_bookings / total_attempts;
// Target: > 95%

// Average latency
const avgLatency = sum(latencies) / count(latencies);
// Target: < 500ms (p95)

// Session expiration rate
const expirationRate = expired_sessions / total_sessions;
// Target: < 5%
```

### Logging

```typescript
// Enable debug logging
this.logger.debug(`Session stored: ${JSON.stringify(slotData)}`);

// Track operations
this.logger.log(`Booking created: ${bookingCode}`);

// Log errors with context
this.logger.error('Booking failed', {
  error: error.message,
  customerPhone,
  salonId,
  slot: slotData
});
```

---

## 🔄 Migration to Redis (Production)

### Setup Redis

```bash
npm install ioredis
```

### Replace Session Storage

```typescript
import { Redis } from 'ioredis';

@Injectable()
export class ButtonHandlerService {
  constructor(
    private readonly redis: Redis,
    // ...
  ) {}

  private async storeSession(
    customerPhone: string,
    salonId: string,
    slotData: SlotData,
    language: string
  ): Promise<void> {
    const key = `session:${customerPhone}_${salonId}`;
    const sessionContext: SessionContext = {
      selectedSlot: slotData,
      customerPhone,
      salonId,
      language,
      timestamp: Date.now()
    };

    await this.redis.setex(
      key,
      SESSION_EXPIRATION_MS / 1000, // Convert to seconds
      JSON.stringify(sessionContext)
    );
  }

  private async getSession(
    customerPhone: string,
    salonId: string
  ): Promise<SessionContext | null> {
    const key = `session:${customerPhone}_${salonId}`;
    const data = await this.redis.get(key);

    return data ? JSON.parse(data) : null;
  }

  private async clearSession(
    customerPhone: string,
    salonId: string
  ): Promise<void> {
    const key = `session:${customerPhone}_${salonId}`;
    await this.redis.del(key);
  }
}
```

---

## 🚨 Troubleshooting

### Issue: "Session expired" error

**Cause**: Customer took > 15 minutes to confirm

**Fix**:
```typescript
// Increase session timeout
const SESSION_EXPIRATION_MS = 30 * 60 * 1000; // 30 minutes
```

### Issue: "Slot already booked" error

**Cause**: Race condition or high concurrency

**Fix**: Already handled via row locking. Check database indexes.

### Issue: Database connection timeout

**Cause**: Connection pool exhausted

**Fix**:
```bash
# Increase connection pool size
DATABASE_URL="postgresql://...?connection_limit=50"
```

### Issue: Booking code collision

**Cause**: High booking volume

**Fix**: Switch to UUID-based codes
```typescript
import { v4 as uuidv4 } from 'uuid';

const bookingCode = `BK${uuidv4().slice(0, 8).toUpperCase()}`;
// Example: BK4A3F2E1D
```

---

## 📚 Additional Resources

- **Full Documentation**: `BUTTON_HANDLER_README.md`
- **Implementation Summary**: `IMPLEMENTATION_SUMMARY.md`
- **Architecture**: `ARCHITECTURE.md`
- **Usage Examples**: `USAGE_EXAMPLES.md`
- **Test Suite**: `button-handler.service.spec.ts`

---

## 💡 Pro Tips

1. **Always use try-catch blocks** when calling confirmation handler
2. **Monitor session expiration rate** - high rate indicates UX issues
3. **Use Redis in production** - in-memory sessions don't scale
4. **Add composite database indexes** - critical for performance
5. **Track analytics events** - essential for optimization
6. **Test with high concurrency** - simulate 100+ concurrent bookings
7. **Implement rate limiting** - prevent abuse
8. **Use structured logging** - easier to debug issues

---

## ✅ Checklist for Production

- [ ] Migrate session storage to Redis
- [ ] Add composite database indexes
- [ ] Configure connection pooling (20+ connections)
- [ ] Set up monitoring and alerts
- [ ] Load test with 100+ concurrent bookings
- [ ] Implement rate limiting (per customer)
- [ ] Add structured logging (JSON format)
- [ ] Security audit (input validation)
- [ ] Document runbook for common issues
- [ ] Set up automatic database backups

---

**Version**: 1.0.0
**Last Updated**: 2024-10-25
**Status**: Production Ready (pending Redis migration)
