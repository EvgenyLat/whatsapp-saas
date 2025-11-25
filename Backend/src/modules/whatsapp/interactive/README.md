# WhatsApp Interactive Message Builder

Comprehensive service for building WhatsApp interactive messages (Reply Buttons and List Messages) for the Quick Booking feature.

## Features

- **Automatic Format Selection**: Chooses Reply Buttons (1-3 slots) or List Message (4-10 slots) based on availability
- **Multi-Language Support**: English, Russian, Spanish, Portuguese, Hebrew
- **WhatsApp Constraint Validation**: Enforces all WhatsApp API limits (button titles, IDs, text lengths)
- **Date/Time Formatting**: Language-specific formatting (12h/24h, MM/DD vs DD/MM)
- **Preferred Slot Marking**: Star indicator for customer's preferred times
- **Type-Safe**: Full TypeScript support with strict type checking

## Architecture

```
interactive/
├── interactive-message.builder.ts      # Main service
├── interactive-message.builder.spec.ts # Unit tests
├── translations.ts                     # Multi-language translations
├── button-parser.service.ts            # Button ID parser (separate service)
└── README.md                           # This file
```

## Installation

The `InteractiveCardBuilder` service is a NestJS injectable service. Add it to your module:

```typescript
import { InteractiveCardBuilder } from './interactive/interactive-message.builder';

@Module({
  providers: [InteractiveCardBuilder],
  exports: [InteractiveCardBuilder],
})
export class WhatsAppModule {}
```

## Usage

### 1. Automatic Slot Selection (Recommended)

Let the service choose the best format based on slot count:

```typescript
import { InteractiveCardBuilder } from './interactive/interactive-message.builder';

@Injectable()
export class BookingService {
  constructor(private readonly cardBuilder: InteractiveCardBuilder) {}

  async sendAvailableSlots(
    customerPhone: string,
    availableSlots: TimeSlot[],
    language: string,
  ) {
    // Build message (auto-selects Reply Buttons vs List Message)
    const message = this.cardBuilder.buildSlotSelectionCard({
      slots: availableSlots,
      language: language as SupportedLanguage,
      customerPhone,
      serviceName: 'Women\'s Haircut',
    });

    // Send via WhatsApp API
    await this.whatsappService.sendMessage(message);
  }
}
```

### 2. Reply Buttons (1-3 Slots)

Manually build Reply Buttons message:

```typescript
const message = cardBuilder.buildReplyButtonsCard({
  slots: [
    {
      date: '2024-10-25',
      time: '14:00',
      masterId: 'm123',
      masterName: 'Sarah',
    },
    {
      date: '2024-10-25',
      time: '15:00',
      masterId: 'm123',
      masterName: 'Sarah',
      isPreferred: true, // Marked with ⭐
    },
    {
      date: '2024-10-25',
      time: '16:00',
      masterId: 'm123',
      masterName: 'Sarah',
    },
  ],
  language: 'en',
  customerPhone: '+1234567890',
  serviceName: 'Women\'s Haircut',
  duration: 60,
  price: '$50',
});
```

**Output Message:**
```
Available times on Friday:

Women's Haircut
⏱️  60 min
💰 $50

[2:00 PM - Sarah] [3:00 PM - Sarah ⭐] [4:00 PM - Sarah]

Tap to select your time
```

### 3. List Message (4-10 Slots)

Manually build List Message:

```typescript
const message = cardBuilder.buildListMessageCard({
  slots: [
    { date: '2024-10-26', time: '10:00', masterId: 'm123', masterName: 'Sarah' },
    { date: '2024-10-26', time: '14:00', masterId: 'm123', masterName: 'Sarah', isPreferred: true },
    { date: '2024-10-27', time: '11:00', masterId: 'm456', masterName: 'Alex' },
    { date: '2024-10-27', time: '15:00', masterId: 'm123', masterName: 'Sarah' },
  ],
  language: 'en',
  customerPhone: '+1234567890',
  serviceName: 'Women\'s Haircut',
  duration: 60,
  price: '$50',
});
```

**Output Message:**
```
Next available times

Women's Haircut
⏱️  60 min • 💰 $50

[Select Time ▼]

Saturday, Oct 26:
  • 10:00 AM - Sarah (60 min • $50)
  • 2:00 PM - Sarah ⭐ (60 min • $50)

Sunday, Oct 27:
  • 11:00 AM - Alex (60 min • $50)
  • 3:00 PM - Sarah (60 min • $50)

Tap to select your time
```

### 4. Booking Confirmation

Build confirmation card with [Confirm] and [Change Time] buttons:

```typescript
const message = cardBuilder.buildConfirmationCard({
  booking: {
    bookingId: 'b456',
    serviceName: 'Women\'s Haircut',
    date: '2024-10-25',
    time: '15:00',
    masterName: 'Sarah',
    masterId: 'm123',
    duration: 60,
    price: '$50',
  },
  language: 'en',
  customerPhone: '+1234567890',
});
```

**Output Message:**
```
Your appointment is on 10/25/2024 at 3:00 PM
With Sarah

Women's Haircut • 60 min • $50

[Confirm] [Change Time]
```

## Data Types

### TimeSlot

Represents an available booking slot:

```typescript
interface TimeSlot {
  date: string;          // ISO format: "2024-10-25"
  time: string;          // 24-hour format: "15:00"
  masterId: string;      // Master ID: "m123"
  masterName: string;    // Display name: "Sarah"
  isPreferred?: boolean; // Mark with star ⭐
  duration?: number;     // Optional: 60 (minutes)
  price?: string;        // Optional: "$50"
}
```

### BookingDetails

Booking information for confirmation:

```typescript
interface BookingDetails {
  bookingId: string;     // "b456"
  serviceName: string;   // "Women's Haircut"
  date: string;          // ISO format: "2024-10-25"
  time: string;          // 24-hour format: "15:00"
  masterName: string;    // "Sarah"
  masterId: string;      // "m123"
  duration: number;      // 60 (minutes)
  price: string;         // "$50"
}
```

## Multi-Language Support

Supported languages: `en`, `ru`, `es`, `pt`, `he`

### English (en)
- Date format: MM/DD/YYYY (10/25/2024)
- Time format: 12-hour (3:00 PM)
- Direction: LTR

### Russian (ru)
- Date format: DD/MM/YYYY (25/10/2024)
- Time format: 24-hour (15:00)
- Direction: LTR

### Spanish (es)
- Date format: DD/MM/YYYY (25/10/2024)
- Time format: 24-hour (15:00)
- Direction: LTR

### Portuguese (pt)
- Date format: DD/MM/YYYY (25/10/2024)
- Time format: 24-hour (15:00)
- Direction: LTR

### Hebrew (he)
- Date format: DD/MM/YYYY (25/10/2024)
- Time format: 24-hour (15:00)
- Direction: RTL

### Example: Russian Message

```typescript
const message = cardBuilder.buildReplyButtonsCard({
  slots: [...],
  language: 'ru',
  customerPhone: '+79001234567',
});
```

**Output:**
```
Доступное время на Пятница:

Женская стрижка
⏱️  60 мин
💰 3000₽

[14:00 - Сара] [15:00 - Сара ⭐] [16:00 - Сара]

Нажмите, чтобы выбрать время
```

## WhatsApp Constraints

The service enforces all WhatsApp API constraints:

| Constraint | Limit | Enforced |
|------------|-------|----------|
| Button ID | 256 chars | ✅ Truncated |
| Button Title | 20 chars | ✅ Truncated |
| Row ID | 200 chars | ✅ Truncated |
| Row Title | 24 chars | ✅ Truncated |
| Row Description | 72 chars | ✅ Truncated |
| Section Title | 24 chars | ✅ Truncated |
| Body Text | 1024 chars | ✅ Truncated |
| Header Text | 60 chars | ✅ Truncated |
| Footer Text | 60 chars | ✅ Truncated |
| List Button Text | 20 chars | ✅ Enforced |
| Max Reply Buttons | 3 | ✅ Validated |
| Max List Rows | 10 per section | ✅ Validated |

## Button ID Format

Button IDs follow a structured format for easy parsing:

### Slot Buttons
Format: `slot_{date}_{time}_{masterId}`

Example: `slot_2024-10-25_15:00_m123`

### Confirm Buttons
Format: `confirm_{action}_{entityId}`

Example: `confirm_booking_b456`

### Action Buttons
Format: `action_{actionName}`

Example: `action_change_time`

## Helper Methods

### formatTime(time, language)

Formats time according to language preferences:

```typescript
cardBuilder.formatTime('15:30', 'en'); // "3:30 PM"
cardBuilder.formatTime('15:30', 'ru'); // "15:30"
```

### formatDate(date, language)

Formats date according to language preferences:

```typescript
const date = new Date(2024, 9, 25); // October 25, 2024
cardBuilder.formatDate(date, 'en'); // "10/25/2024"
cardBuilder.formatDate(date, 'ru'); // "25/10/2024"
```

### groupByDay(slots, language)

Groups slots by date with formatted headers:

```typescript
const slots = [
  { date: '2024-10-25', time: '14:00', ... },
  { date: '2024-10-25', time: '15:00', ... },
  { date: '2024-10-26', time: '10:00', ... },
];

const grouped = cardBuilder.groupByDay(slots, 'en');
// [
//   { date: '2024-10-25', formattedDate: 'Friday, Oct 25', slots: [...] },
//   { date: '2024-10-26', formattedDate: 'Saturday, Oct 26', slots: [...] },
// ]
```

## Integration with Webhook Handler

When customers click buttons, the webhook receives button IDs:

```typescript
// Webhook receives button click
{
  type: "interactive",
  interactive: {
    type: "button_reply",
    button_reply: {
      id: "slot_2024-10-25_15:00_m123",
      title: "3:00 PM - Sarah"
    }
  }
}

// Parse button ID using ButtonParserService
import { ButtonParserService } from './button-parser.service';

const parser = new ButtonParserService();
const parsed = parser.parseButtonId("slot_2024-10-25_15:00_m123");
// { type: "slot", context: "2024-10-25_15:00_m123" }

const slotData = parser.parseSlotButton(parsed.context);
// { date: "2024-10-25", time: "15:00", masterId: "m123" }
```

## Error Handling

The service throws errors for invalid inputs:

```typescript
try {
  const message = cardBuilder.buildSlotSelectionCard({
    slots: [], // Empty array
    language: 'en',
    customerPhone: '+1234567890',
  });
} catch (error) {
  console.error(error.message);
  // "Cannot build slot selection card: no slots provided"
}

try {
  const message = cardBuilder.buildReplyButtonsCard({
    slots: fourSlots, // More than 3 slots
    language: 'en',
    customerPhone: '+1234567890',
  });
} catch (error) {
  console.error(error.message);
  // "Too many slots for Reply Buttons: 4 (max 3)"
}

try {
  const message = cardBuilder.buildListMessageCard({
    slots: twoSlots, // Less than 4 slots
    language: 'en',
    customerPhone: '+1234567890',
  });
} catch (error) {
  console.error(error.message);
  // "Too few slots for List Message: 2 (min 4)"
}
```

## Testing

Run unit tests:

```bash
npm test -- interactive-message.builder.spec.ts
```

Run tests with coverage:

```bash
npm test -- --coverage interactive-message.builder.spec.ts
```

## Best Practices

### 1. Use Automatic Format Selection

Let the service choose the best format:

```typescript
// Good
const message = cardBuilder.buildSlotSelectionCard({ slots, ... });

// Avoid manually choosing format
if (slots.length <= 3) {
  const message = cardBuilder.buildReplyButtonsCard({ slots, ... });
} else {
  const message = cardBuilder.buildListMessageCard({ slots, ... });
}
```

### 2. Mark Preferred Slots

Use `isPreferred: true` to highlight customer's preferred times:

```typescript
const slots: TimeSlot[] = [
  { date: '2024-10-25', time: '14:00', masterId: 'm123', masterName: 'Sarah' },
  { date: '2024-10-25', time: '15:00', masterId: 'm123', masterName: 'Sarah', isPreferred: true }, // ⭐
  { date: '2024-10-25', time: '16:00', masterId: 'm123', masterName: 'Sarah' },
];
```

### 3. Include Service Details

Always provide service name, duration, and price for context:

```typescript
const message = cardBuilder.buildSlotSelectionCard({
  slots,
  language: 'en',
  customerPhone: '+1234567890',
  serviceName: 'Women\'s Haircut', // Include service name
});
```

### 4. Handle Edge Cases

Validate slot count before building:

```typescript
if (slots.length === 0) {
  // No slots available - send different message
  await sendNoSlotsMessage(customerPhone);
  return;
}

if (slots.length > 10) {
  // Too many slots - show pagination or first 10
  const firstTen = slots.slice(0, 10);
  const message = cardBuilder.buildSlotSelectionCard({
    slots: firstTen,
    ...params,
  });
}
```

### 5. Log Interactions

Track message sends for debugging:

```typescript
try {
  const message = cardBuilder.buildSlotSelectionCard({ ... });
  await whatsappService.sendMessage(message);

  logger.log(`Sent slot selection to ${customerPhone}: ${slots.length} slots`);
} catch (error) {
  logger.error(`Failed to build/send message: ${error.message}`);
}
```

## Performance

- **Build time**: < 1ms per message
- **Memory**: Minimal (no large data structures)
- **Thread-safe**: Stateless service (safe for concurrent requests)

## References

- [WhatsApp Cloud API Documentation](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [specs/001-whatsapp-quick-booking/contracts/whatsapp/reply-buttons-message.json](../../../specs/001-whatsapp-quick-booking/contracts/whatsapp/reply-buttons-message.json)
- [specs/001-whatsapp-quick-booking/contracts/whatsapp/list-message.json](../../../specs/001-whatsapp-quick-booking/contracts/whatsapp/list-message.json)
- [types/whatsapp.types.ts](../../../types/whatsapp.types.ts)

## Support

For issues or questions, contact the backend team or open an issue in the project repository.
