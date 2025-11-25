# Zero-Typing Tests - Quick Reference Card

## Run Tests

```bash
# Run all 17 zero-typing tests
npm run test:integration -- zero-typing --verbose

# Run specific test
npm run test:integration -- zero-typing -t "should parse Haircut"

# Run with debug output
DEBUG_TESTS=true npm run test:integration -- zero-typing
```

## Test Data Quick Access

```typescript
import { getTestSalon, getTestServices, getTestMasters } from '../setup';

// In your test
const salon = await getTestSalon();        // 'Test Beauty Salon'
const services = await getTestServices();  // 6 services
const masters = await getTestMasters();    // 3 masters (Sarah, Emily, Jessica)
```

## Available Test Services

| Service | Category | Price | Duration | Master |
|---------|----------|-------|----------|--------|
| Haircut | HAIRCUT | $50 | 60min | Sarah Johnson |
| Hair Coloring | COLORING | $120 | 90min | Sarah Johnson |
| Manicure | MANICURE | $40 | 45min | Emily Davis |
| Pedicure | PEDICURE | $45 | 50min | Emily Davis |
| Facial | FACIAL | $80 | 60min | Jessica Martinez |
| Massage | MASSAGE | $90 | 60min | Jessica Martinez |

## Master IDs

- **Sarah Johnson**: ID = `m123` (HAIRCUT, COLORING)
- **Emily Davis**: Auto-generated UUID (MANICURE, PEDICURE)
- **Jessica Martinez**: Auto-generated UUID (FACIAL, MASSAGE)

## Working Hours (All Masters)

```
Monday-Friday: 09:00-18:00
Saturday: 10:00-16:00
Sunday: Closed
```

## Test User Credentials

```
Email: test@example.com
Password: TestPassword123!
Role: SALON_OWNER
```

## WhatsApp Mock API

```typescript
import { createMockWhatsAppAPI } from '../mocks/whatsapp-api.mock';

const mockAPI = createMockWhatsAppAPI();
mockAPI.getSentMessages();  // Get all sent messages
mockAPI.getLastMessage();   // Get last sent message
mockAPI.clearMessages();    // Clear message queue
mockAPI.fail();             // Simulate API failure
mockAPI.succeed();          // Return to success mode
```

## Webhook Payload Creation

```typescript
import {
  createTextMessageWebhook,
  createButtonClickWebhook
} from '../mocks/whatsapp-api.mock';

// Text message
const textWebhook = createTextMessageWebhook({
  from: '+1234567890',
  text: 'Haircut Friday 3pm',
  name: 'Test Customer'
});

// Button click
const buttonWebhook = createButtonClickWebhook({
  from: '+1234567890',
  buttonId: 'slot_2024-10-25_15:00_m123',
  buttonText: '3:00 PM - Sarah'
});
```

## Expected Button ID Format

```
Slot Button:    slot_YYYY-MM-DD_HH:MM_m{masterId}
Confirm Button: confirm_{bookingCode}
Cancel Button:  action_cancel_{bookingCode}

Examples:
slot_2024-10-25_15:00_m123
confirm_BOOK-ABC123
action_cancel_BOOK-ABC123
```

## Test Scenarios

### 1. Complete Flow
1. Customer sends: "Haircut Friday 3pm"
2. Bot sends: Interactive card with 3 slot buttons
3. Customer taps: slot_2024-10-25_15:00_m123
4. Bot sends: Confirmation card with [Confirm] button
5. Customer taps: confirm_BOOK-123
6. Result: Booking created in DB, success message sent

### 2. Intent Parsing
```
"Haircut Friday 3pm"         → service=Haircut, day=Friday, time=15:00
"Manicure tomorrow 2pm"      → service=Manicure, day=tomorrow, time=14:00
"Facial next Monday morning" → service=Facial, day=next Monday, time=09:00-12:00
```

### 3. Error Handling
- Invalid button ID → Error message
- API failure → Graceful retry
- Concurrent bookings → Conflict detection

## Database Schema Quick Reference

```sql
-- Booking
{
  id: uuid,
  booking_code: string,
  salon_id: uuid,
  customer_phone: string,
  customer_name: string,
  service: string,
  start_ts: timestamp,
  end_ts: timestamp,
  status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED',
  master_id: uuid,
  service_id: uuid
}

-- Conversation
{
  id: uuid,
  salon_id: uuid,
  phone_number: string,
  status: 'ACTIVE',
  message_count: int
}
```

## Assertions Cheat Sheet

```typescript
// Test response
expect(response.status).toBe(200);
expect(response.body.status).toBe('ok');

// Test message sent
const sentMessage = mockWhatsAppAPI.getLastMessage();
expect(sentMessage.message.type).toBe('interactive');
expect(sentMessage.message.interactive.type).toBe('button');

// Test buttons
const buttons = sentMessage.message.interactive.action.buttons;
expect(buttons).toHaveLength(3);
expect(buttons[0].reply.id).toMatch(/^slot_\d{4}-\d{2}-\d{2}_\d{2}:\d{2}_m\d+$/);

// Test booking created
const booking = await prisma.booking.findFirst({
  where: { customer_phone: '+1234567890' }
});
expect(booking).toBeDefined();
expect(booking.status).toBe('CONFIRMED');
```

## Test Status

Current: 0/17 passing (Red Phase - Expected)

**Phase 1 Target**: 7/17 passing
**Phase 2 Target**: 12/17 passing
**Phase 3 Target**: 17/17 passing

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Database not found | Run migrations: `npx prisma migrate deploy` |
| Test data missing | Check `seedTestData()` executed in beforeEach |
| Mock not working | Call `mockWhatsAppAPI.succeed()` |
| Error truncated | Add `--verbose` flag to test command |

## Files to Check

| File | Purpose |
|------|---------|
| `tests/setup.ts` | Test data seeding & helper functions |
| `tests/integration/zero-typing-booking.spec.ts` | All 17 tests |
| `tests/mocks/whatsapp-api.mock.ts` | WhatsApp API mocking |
| `TEST_RESULTS.md` | Detailed test documentation |
| `ZERO_TYPING_TEST_SUMMARY.md` | Task completion report |

---

Quick Links:
- [Full Test Results](./TEST_RESULTS.md)
- [Task Summary](./ZERO_TYPING_TEST_SUMMARY.md)
- [Test Seeding Code](./tests/setup.ts#L290)
