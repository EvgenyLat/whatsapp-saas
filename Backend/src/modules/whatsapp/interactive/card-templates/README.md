# WhatsApp Interactive Card Templates

Production-ready card templates for User Story 1 (Quick Booking). These templates generate WhatsApp interactive messages with full multi-language support and automatic format selection.

## Files

- **`slot-selection.template.ts`** (T028) - Time slot selection cards
- **`confirmation.template.ts`** (T029) - Booking confirmation cards
- **`index.ts`** - Exports for easy importing

## Quick Start

```typescript
import { buildSlotSelectionTemplate, buildConfirmationTemplate } from './card-templates';

// Build slot selection (auto-selects Reply Buttons vs List Message)
const slotMessage = buildSlotSelectionTemplate(
  [
    {
      date: '2024-10-25',
      time: '14:00',
      masterId: 'master-sarah',
      masterName: 'Sarah',
      serviceName: 'Haircut',
      duration: 60,
      price: '50.00',
      isPreferred: true,
    },
    // ... more slots
  ],
  'en', // language
);

// Set recipient and send
slotMessage.to = '+1234567890';
await whatsappService.sendMessage(slotMessage);

// Build confirmation
const confirmMessage = buildConfirmationTemplate(selectedSlot, 'booking123', 'en');
confirmMessage.to = '+1234567890';
await whatsappService.sendMessage(confirmMessage);
```

## Slot Selection Template (T028)

### Features

- **Automatic Format Selection**: Reply Buttons (1-3 slots) or List Message (4-10 slots)
- **Multi-language**: EN, RU, ES, PT, HE
- **Localized Formatting**: Dates, times, and prices
- **Preferred Slots**: ⭐ marker for top-ranked slots
- **WhatsApp Constraints**: Auto-truncation and validation

### Format Selection

| Slot Count | Format          | Structure                     |
| ---------- | --------------- | ----------------------------- |
| 1-3        | Reply Buttons   | 3 buttons max                 |
| 4-10       | List Message    | Grouped by day                |

### Reply Buttons (1-3 slots)

```typescript
{
  type: 'button',
  header: { type: 'text', text: 'Available times 📅' },
  body: {
    text: '💇 Haircut\n⏱️  60 min\n💰 $50.00\n\nTap to select:'
  },
  action: {
    buttons: [
      {
        type: 'reply',
        reply: {
          id: 'slot_2024-10-25_14:00_master-sarah',
          title: '2:00 PM - Sarah ⭐'
        }
      }
    ]
  },
  footer: { text: 'Tap a time slot to book' }
}
```

### List Message (4-10 slots)

```typescript
{
  type: 'list',
  header: { type: 'text', text: 'Available times 📅' },
  body: { text: 'Select your preferred time:' },
  action: {
    button: 'Select Time',
    sections: [
      {
        title: 'Friday, Oct 25',
        rows: [
          {
            id: 'slot_2024-10-25_14:00_master-sarah',
            title: '2:00 PM - Sarah',
            description: '60 min • $50.00'
          }
        ]
      }
    ]
  }
}
```

### Usage

```typescript
import { buildSlotSelectionTemplate } from './card-templates';

const slots = [
  {
    date: '2024-10-25', // ISO format: YYYY-MM-DD
    time: '14:00', // 24-hour format: HH:MM
    masterId: 'master-sarah',
    masterName: 'Sarah',
    serviceName: 'Haircut',
    duration: 60, // minutes
    price: '50.00', // string (will be formatted per language)
    isPreferred: true, // adds ⭐ marker
  },
  // ... more slots
];

const message = buildSlotSelectionTemplate(slots, 'en');
message.to = customerPhone;
```

## Confirmation Template (T029)

### Features

- **Booking Summary**: Service, master, date, time, duration, price
- **Action Buttons**: Confirm and Change Time
- **Time Range**: Shows start and end time
- **Multi-language**: All text localized

### Structure

```typescript
{
  type: 'button',
  header: { type: 'text', text: 'Confirm booking? ✅' },
  body: {
    text: '💇 Haircut\n👤 Sarah Johnson\n📅 Friday, Oct 25\n🕐 2:00 PM - 3:00 PM\n⏱️  60 min\n💰 $50.00\n\nConfirm this booking?'
  },
  action: {
    buttons: [
      {
        type: 'reply',
        reply: { id: 'confirm_booking123', title: '✅ Confirm' }
      },
      {
        type: 'reply',
        reply: { id: 'nav_change_time', title: '⏰ Change Time' }
      }
    ]
  },
  footer: { text: 'Tap to confirm or change' }
}
```

### Usage

```typescript
import { buildConfirmationTemplate } from './card-templates';

const selectedSlot = {
  date: '2024-10-25',
  time: '14:00',
  masterId: 'master-sarah',
  masterName: 'Sarah Johnson',
  serviceName: 'Haircut',
  duration: 60,
  price: '50.00',
  isPreferred: true,
};

const message = buildConfirmationTemplate(
  selectedSlot,
  'booking123', // temporary booking ID
  'en', // language
);

message.to = customerPhone;
```

## Language Support

### Supported Languages

| Code | Language   | Date Format | Time Format | Currency |
| ---- | ---------- | ----------- | ----------- | -------- |
| en   | English    | MM/DD/YYYY  | 12h         | $XX.XX   |
| ru   | Russian    | DD/MM/YYYY  | 24h         | XX,XX ₽  |
| es   | Spanish    | DD/MM/YYYY  | 24h         | €XX,XX   |
| pt   | Portuguese | DD/MM/YYYY  | 24h         | €XX,XX   |
| he   | Hebrew     | DD/MM/YYYY  | 24h         | ₪XX.XX   |

### Examples by Language

#### English (en)

```
Available times 📅

💇 Haircut
⏱️  60 min
💰 $50.00

Tap to select:

[2:00 PM - Sarah ⭐]
[3:00 PM - John]
```

#### Russian (ru)

```
Available times 📅

💇 Стрижка
⏱️  60 мин
💰 50,00 ₽

Tap to select:

[14:00 - Sarah ⭐]
[15:00 - John]
```

#### Spanish (es)

```
Available times 📅

💇 Corte de pelo
⏱️  60 min
💰 €50,00

Tap to select:

[14:00 - Sarah ⭐]
[15:00 - John]
```

## Button ID Format

All button IDs follow a consistent pattern for parsing:

### Slot Button

```
Format: slot_{date}_{time}_{masterId}
Example: slot_2024-10-25_14:00_master-sarah
Max length: 256 chars
```

### Confirm Button

```
Format: confirm_{bookingId}
Example: confirm_booking123
Max length: 256 chars
```

### Navigation Button

```
Format: nav_{action}
Example: nav_change_time
Max length: 256 chars
```

## WhatsApp API Constraints

All templates automatically enforce WhatsApp API limits:

| Element              | Max Length | Auto-truncation |
| -------------------- | ---------- | --------------- |
| Button ID            | 256 chars  | ✅              |
| Button Title         | 20 chars   | ✅              |
| Row ID               | 200 chars  | ✅              |
| Row Title            | 24 chars   | ✅              |
| Row Description      | 72 chars   | ✅              |
| Section Title        | 24 chars   | ✅              |
| Body Text            | 1024 chars | ✅              |
| Header Text          | 60 chars   | ✅              |
| Footer Text          | 60 chars   | ✅              |
| Max Reply Buttons    | 3          | ❌ (throws)     |
| Max List Rows        | 10         | ❌ (throws)     |

## Error Handling

Templates throw descriptive errors for invalid inputs:

```typescript
// Too many slots
buildSlotSelectionTemplate(elevenSlots, 'en');
// Error: Too many slots: 11 (max 10)

// No slots
buildSlotSelectionTemplate([], 'en');
// Error: Cannot build slot selection: no slots provided

// Wrong count for Reply Buttons
buildReplyButtonsTemplate(fourSlots, 'en');
// Error: Invalid slot count for Reply Buttons: 4 (must be 1-3)
```

## Integration Example

Complete example with WhatsApp service:

```typescript
import { buildSlotSelectionTemplate, buildConfirmationTemplate } from './card-templates';
import { WhatsAppService } from '../../../services/whatsapp.service';

class BookingFlowHandler {
  constructor(private whatsappService: WhatsAppService) {}

  async sendSlotSelection(
    customerPhone: string,
    slots: SlotSuggestion[],
    language: SupportedLanguage,
  ) {
    // Build message
    const message = buildSlotSelectionTemplate(slots, language);
    message.to = customerPhone;

    // Send via WhatsApp
    await this.whatsappService.sendMessage(message);
  }

  async sendConfirmation(
    customerPhone: string,
    slot: SlotSuggestion,
    bookingId: string,
    language: SupportedLanguage,
  ) {
    // Build message
    const message = buildConfirmationTemplate(slot, bookingId, language);
    message.to = customerPhone;

    // Send via WhatsApp
    await this.whatsappService.sendMessage(message);
  }
}
```

## Testing

Unit tests should cover:

1. **Format selection**: 1-3 slots → Reply Buttons, 4-10 slots → List Message
2. **Language support**: All 5 languages
3. **Date formatting**: MM/DD/YYYY (EN), DD/MM/YYYY (others)
4. **Time formatting**: 12h (EN), 24h (others)
5. **Price formatting**: All currency symbols and decimal separators
6. **Preferred markers**: ⭐ appears correctly
7. **Truncation**: All fields respect max lengths
8. **Error handling**: Invalid slot counts throw errors

Example test:

```typescript
describe('buildSlotSelectionTemplate', () => {
  it('should use Reply Buttons for 3 slots', () => {
    const slots = [slot1, slot2, slot3];
    const message = buildSlotSelectionTemplate(slots, 'en');

    expect(message.interactive.type).toBe('button');
    expect(message.interactive.action.buttons).toHaveLength(3);
  });

  it('should use List Message for 5 slots', () => {
    const slots = [slot1, slot2, slot3, slot4, slot5];
    const message = buildSlotSelectionTemplate(slots, 'en');

    expect(message.interactive.type).toBe('list');
  });

  it('should format prices correctly for Russian', () => {
    const slot = { ...baseSlot, price: '50.00' };
    const message = buildConfirmationTemplate(slot, 'b123', 'ru');

    expect(message.interactive.body.text).toContain('50,00 ₽');
  });
});
```

## Migration from InteractiveCardBuilder

If migrating from `interactive-message.builder.ts`:

```typescript
// Old way
const builder = new InteractiveCardBuilder();
const message = builder.buildSlotSelectionCard({
  slots,
  language,
  customerPhone,
  serviceName: slots[0].serviceName,
});

// New way (templates)
const message = buildSlotSelectionTemplate(slots, language);
message.to = customerPhone;
```

Key differences:

- Templates are **pure functions** (no service/class instantiation)
- `to` field must be set separately by caller
- Slot data structure includes `serviceName`, `duration`, `price` per slot
- Automatic format selection (no manual choice needed)

## See Also

- **translations.ts**: Translation constants and formatting functions
- **interactive-message.builder.ts**: Legacy builder service (still in use)
- **whatsapp.types.ts**: TypeScript type definitions
- **User Story 1 Spec**: Full feature specification

## License

Copyright © 2024. All rights reserved.
