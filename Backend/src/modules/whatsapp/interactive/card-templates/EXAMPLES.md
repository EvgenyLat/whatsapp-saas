# WhatsApp Card Templates - Usage Examples

Complete examples demonstrating all features of the card templates.

## Table of Contents

1. [Slot Selection Examples](#slot-selection-examples)
2. [Confirmation Examples](#confirmation-examples)
3. [Multi-Language Examples](#multi-language-examples)
4. [Edge Cases](#edge-cases)

---

## Slot Selection Examples

### Example 1: Reply Buttons (3 slots, same day)

```typescript
import { buildSlotSelectionTemplate } from './card-templates';

const slots = [
  {
    date: '2024-10-25',
    time: '14:00',
    masterId: 'master-sarah',
    masterName: 'Sarah',
    serviceName: 'Haircut',
    duration: 60,
    price: '50.00',
    isPreferred: true, // Top-ranked slot
  },
  {
    date: '2024-10-25',
    time: '15:00',
    masterId: 'master-sarah',
    masterName: 'Sarah',
    serviceName: 'Haircut',
    duration: 60,
    price: '50.00',
    isPreferred: false,
  },
  {
    date: '2024-10-25',
    time: '16:00',
    masterId: 'master-john',
    masterName: 'John',
    serviceName: 'Haircut',
    duration: 60,
    price: '50.00',
    isPreferred: false,
  },
];

const message = buildSlotSelectionTemplate(slots, 'en');
message.to = '+1234567890';

// Result (English):
// {
//   messaging_product: 'whatsapp',
//   to: '+1234567890',
//   type: 'interactive',
//   interactive: {
//     type: 'button',
//     header: { type: 'text', text: 'Available times 📅' },
//     body: {
//       text: '💇 Haircut\n⏱️  60 min\n💰 $50.00\n\nTap to select:'
//     },
//     footer: { text: 'Tap a time slot to book' },
//     action: {
//       buttons: [
//         {
//           type: 'reply',
//           reply: {
//             id: 'slot_2024-10-25_14:00_master-sarah',
//             title: '2:00 PM - Sarah ⭐'
//           }
//         },
//         {
//           type: 'reply',
//           reply: {
//             id: 'slot_2024-10-25_15:00_master-sarah',
//             title: '3:00 PM - Sarah'
//           }
//         },
//         {
//           type: 'reply',
//           reply: {
//             id: 'slot_2024-10-25_16:00_master-john',
//             title: '4:00 PM - John'
//           }
//         }
//       ]
//     }
//   }
// }
```

### Example 2: List Message (5 slots, multiple days)

```typescript
import { buildSlotSelectionTemplate } from './card-templates';

const slots = [
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
  {
    date: '2024-10-25',
    time: '15:00',
    masterId: 'master-john',
    masterName: 'John',
    serviceName: 'Haircut',
    duration: 60,
    price: '45.00',
    isPreferred: false,
  },
  {
    date: '2024-10-26',
    time: '10:00',
    masterId: 'master-sarah',
    masterName: 'Sarah',
    serviceName: 'Haircut',
    duration: 60,
    price: '50.00',
    isPreferred: false,
  },
  {
    date: '2024-10-26',
    time: '11:00',
    masterId: 'master-alex',
    masterName: 'Alex',
    serviceName: 'Haircut',
    duration: 60,
    price: '55.00',
    isPreferred: false,
  },
  {
    date: '2024-10-27',
    time: '09:00',
    masterId: 'master-sarah',
    masterName: 'Sarah',
    serviceName: 'Haircut',
    duration: 60,
    price: '50.00',
    isPreferred: false,
  },
];

const message = buildSlotSelectionTemplate(slots, 'en');
message.to = '+1234567890';

// Result (English):
// {
//   messaging_product: 'whatsapp',
//   to: '+1234567890',
//   type: 'interactive',
//   interactive: {
//     type: 'list',
//     header: { type: 'text', text: 'Available times 📅' },
//     body: { text: 'Select your preferred time:' },
//     action: {
//       button: 'Select Time',
//       sections: [
//         {
//           title: 'Friday, Oct 25',
//           rows: [
//             {
//               id: 'slot_2024-10-25_14:00_master-sarah',
//               title: '2:00 PM - Sarah ⭐',
//               description: '60 min • $50.00'
//             },
//             {
//               id: 'slot_2024-10-25_15:00_master-john',
//               title: '3:00 PM - John',
//               description: '60 min • $45.00'
//             }
//           ]
//         },
//         {
//           title: 'Saturday, Oct 26',
//           rows: [
//             {
//               id: 'slot_2024-10-26_10:00_master-sarah',
//               title: '10:00 AM - Sarah',
//               description: '60 min • $50.00'
//             },
//             {
//               id: 'slot_2024-10-26_11:00_master-alex',
//               title: '11:00 AM - Alex',
//               description: '60 min • $55.00'
//             }
//           ]
//         },
//         {
//           title: 'Sunday, Oct 27',
//           rows: [
//             {
//               id: 'slot_2024-10-27_09:00_master-sarah',
//               title: '9:00 AM - Sarah',
//               description: '60 min • $50.00'
//             }
//           ]
//         }
//       ]
//     }
//   }
// }
```

---

## Confirmation Examples

### Example 3: Booking Confirmation (English)

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

const message = buildConfirmationTemplate(selectedSlot, 'booking123', 'en');
message.to = '+1234567890';

// Result (English):
// {
//   messaging_product: 'whatsapp',
//   to: '+1234567890',
//   type: 'interactive',
//   interactive: {
//     type: 'button',
//     header: { type: 'text', text: 'Confirm booking? ✅' },
//     body: {
//       text: '💇 Haircut\n👤 Sarah Johnson\n📅 Friday, Oct 25\n🕐 2:00 PM - 3:00 PM\n⏱️  60 min\n💰 $50.00\n\nConfirm this booking?'
//     },
//     footer: { text: 'Tap to confirm or change' },
//     action: {
//       buttons: [
//         {
//           type: 'reply',
//           reply: {
//             id: 'confirm_booking123',
//             title: '✅ Confirm'
//           }
//         },
//         {
//           type: 'reply',
//           reply: {
//             id: 'nav_change_time',
//             title: '⏰ Change Time'
//           }
//         }
//       ]
//     }
//   }
// }
```

### Example 4: 90-Minute Service Confirmation

```typescript
import { buildConfirmationTemplate } from './card-templates';

const selectedSlot = {
  date: '2024-10-25',
  time: '14:30',
  masterId: 'master-sarah',
  masterName: 'Sarah Johnson',
  serviceName: 'Color Treatment',
  duration: 90,
  price: '120.00',
  isPreferred: false,
};

const message = buildConfirmationTemplate(selectedSlot, 'booking456', 'en');
message.to = '+1234567890';

// Body text will show:
// 💇 Color Treatment
// 👤 Sarah Johnson
// 📅 Friday, Oct 25
// 🕐 2:30 PM - 4:00 PM  ← Calculated end time (14:30 + 90 min = 16:00)
// ⏱️  90 min
// 💰 $120.00
//
// Confirm this booking?
```

---

## Multi-Language Examples

### Example 5: Russian (RU)

```typescript
import { buildSlotSelectionTemplate, buildConfirmationTemplate } from './card-templates';

// Slot selection
const slots = [
  {
    date: '2024-10-25',
    time: '14:00',
    masterId: 'master-sarah',
    masterName: 'Сара',
    serviceName: 'Стрижка',
    duration: 60,
    price: '3500.00',
    isPreferred: true,
  },
];

const slotMessage = buildSlotSelectionTemplate(slots, 'ru');
slotMessage.to = '+79001234567';

// Result (Russian):
// Body: '💇 Стрижка\n⏱️  60 мин\n💰 3500,00 ₽\n\nTap to select:'
// Button: '14:00 - Сара ⭐'

// Confirmation
const confirmMessage = buildConfirmationTemplate(slots[0], 'booking789', 'ru');
confirmMessage.to = '+79001234567';

// Result (Russian):
// Header: 'Подтвердить? ✅'
// Body: '💇 Стрижка\n👤 Сара\n📅 Пятница, Окт 25\n🕐 14:00 - 15:00\n⏱️  60 мин\n💰 3500,00 ₽\n\nПодтвердить запись?'
// Buttons: ['✅ Подтвердить', '⏰ Изменить']
// Footer: 'Нажмите для подтверждения'
```

### Example 6: Spanish (ES)

```typescript
import { buildSlotSelectionTemplate, buildConfirmationTemplate } from './card-templates';

const slots = [
  {
    date: '2024-10-25',
    time: '14:00',
    masterId: 'master-maria',
    masterName: 'María',
    serviceName: 'Corte de pelo',
    duration: 45,
    price: '35.00',
    isPreferred: true,
  },
];

const slotMessage = buildSlotSelectionTemplate(slots, 'es');
slotMessage.to = '+34612345678';

// Result (Spanish):
// Body: '💇 Corte de pelo\n⏱️  45 min\n💰 €35,00\n\nTap to select:'
// Button: '14:00 - María ⭐'

const confirmMessage = buildConfirmationTemplate(slots[0], 'booking999', 'es');
confirmMessage.to = '+34612345678';

// Result (Spanish):
// Header: '¿Confirmar? ✅'
// Body: '💇 Corte de pelo\n👤 María\n📅 Viernes, Oct 25\n🕐 14:00 - 14:45\n⏱️  45 min\n💰 €35,00\n\n¿Confirmar esta reserva?'
// Buttons: ['✅ Confirmar', '⏰ Cambiar']
```

### Example 7: Hebrew (HE) - RTL Support

```typescript
import { buildSlotSelectionTemplate, buildConfirmationTemplate } from './card-templates';

const slots = [
  {
    date: '2024-10-25',
    time: '14:00',
    masterId: 'master-yael',
    masterName: 'יעל',
    serviceName: 'תספורת',
    duration: 60,
    price: '180.00',
    isPreferred: true,
  },
];

const slotMessage = buildSlotSelectionTemplate(slots, 'he');
slotMessage.to = '+972501234567';

// Result (Hebrew - RTL):
// Body: '💇 תספורת\n⏱️  60 דקות\n💰 ₪180.00\n\nTap to select:'
// Button: '14:00 - יעל ⭐'

const confirmMessage = buildConfirmationTemplate(slots[0], 'booking111', 'he');
confirmMessage.to = '+972501234567';

// Result (Hebrew - RTL):
// Header: 'לאשר? ✅'
// Body: '💇 תספורת\n👤 יעל\n📅 יום שישי, Oct 25\n🕐 14:00 - 15:00\n⏱️  60 דקות\n💰 ₪180.00\n\nלאשר את התור?'
// Buttons: ['✅ אישור', '⏰ שינוי']
// Footer: 'לחץ לאישור או שינוי'
```

---

## Edge Cases

### Example 8: Long Master Names (Auto-Truncation)

```typescript
import { buildSlotSelectionTemplate } from './card-templates';

const slots = [
  {
    date: '2024-10-25',
    time: '14:00',
    masterId: 'master-123',
    masterName: 'Sarah Elizabeth Johnson-Williams', // Very long name
    serviceName: 'Haircut',
    duration: 60,
    price: '50.00',
    isPreferred: true,
  },
];

const message = buildSlotSelectionTemplate(slots, 'en');

// Button title auto-truncates to 20 chars:
// Original: "2:00 PM - Sarah Elizabeth Johnson-Williams ⭐"
// Result: "2:00 PM ⭐" (name dropped to fit star)
```

### Example 9: Very Long Service Names

```typescript
import { buildConfirmationTemplate } from './card-templates';

const slot = {
  date: '2024-10-25',
  time: '14:00',
  masterId: 'master-sarah',
  masterName: 'Sarah',
  serviceName: 'Premium Deluxe Hair Coloring with Highlights and Special Treatment Package',
  duration: 180,
  price: '250.00',
  isPreferred: false,
};

const message = buildConfirmationTemplate(slot, 'booking999', 'en');

// Service name appears in full in body text (up to 1024 chars)
// If body exceeds 1024 chars, it's truncated with "..."
```

### Example 10: Maximum Slots (10)

```typescript
import { buildSlotSelectionTemplate } from './card-templates';

const slots = [
  { date: '2024-10-25', time: '09:00', masterId: 'm1', masterName: 'Sarah', ... },
  { date: '2024-10-25', time: '10:00', masterId: 'm1', masterName: 'Sarah', ... },
  { date: '2024-10-25', time: '11:00', masterId: 'm2', masterName: 'John', ... },
  { date: '2024-10-25', time: '14:00', masterId: 'm1', masterName: 'Sarah', ... },
  { date: '2024-10-26', time: '09:00', masterId: 'm1', masterName: 'Sarah', ... },
  { date: '2024-10-26', time: '10:00', masterId: 'm3', masterName: 'Alex', ... },
  { date: '2024-10-26', time: '15:00', masterId: 'm1', masterName: 'Sarah', ... },
  { date: '2024-10-27', time: '09:00', masterId: 'm1', masterName: 'Sarah', ... },
  { date: '2024-10-27', time: '11:00', masterId: 'm2', masterName: 'John', ... },
  { date: '2024-10-27', time: '14:00', masterId: 'm1', masterName: 'Sarah', ... },
];

const message = buildSlotSelectionTemplate(slots, 'en');

// Result: List Message with 3 sections (grouped by day)
// - Friday, Oct 25: 4 rows
// - Saturday, Oct 26: 3 rows
// - Sunday, Oct 27: 3 rows
```

### Example 11: Midnight Crossing (Time Calculation)

```typescript
import { buildConfirmationTemplate } from './card-templates';

const slot = {
  date: '2024-10-25',
  time: '23:30', // 11:30 PM
  masterId: 'master-sarah',
  masterName: 'Sarah',
  serviceName: 'Evening Special',
  duration: 90, // Service ends at 01:00 next day
  price: '75.00',
  isPreferred: false,
};

const message = buildConfirmationTemplate(slot, 'booking888', 'en');

// Time range correctly handles midnight crossing:
// 🕐 11:30 PM - 1:00 AM
// (Note: Date doesn't change in display, only time wraps)
```

### Example 12: Error Handling

```typescript
import { buildSlotSelectionTemplate } from './card-templates';

// Too many slots
try {
  const elevenSlots = [...Array(11)].map((_, i) => ({
    date: '2024-10-25',
    time: `${9 + i}:00`,
    masterId: 'master-sarah',
    masterName: 'Sarah',
    serviceName: 'Haircut',
    duration: 60,
    price: '50.00',
  }));

  buildSlotSelectionTemplate(elevenSlots, 'en');
} catch (error) {
  console.error(error.message);
  // Output: "Too many slots: 11 (max 10)"
}

// No slots
try {
  buildSlotSelectionTemplate([], 'en');
} catch (error) {
  console.error(error.message);
  // Output: "Cannot build slot selection: no slots provided"
}
```

---

## Complete Integration Example

```typescript
import { Injectable } from '@nestjs/common';
import { buildSlotSelectionTemplate, buildConfirmationTemplate } from './card-templates';
import { WhatsAppService } from '../../../services/whatsapp.service';
import { SupportedLanguage } from '../translations';

@Injectable()
export class QuickBookingService {
  constructor(private whatsappService: WhatsAppService) {}

  async sendAvailableSlots(
    customerPhone: string,
    slots: SlotSuggestion[],
    language: SupportedLanguage,
  ) {
    // Build message
    const message = buildSlotSelectionTemplate(slots, language);
    message.to = customerPhone;

    // Send to customer
    const result = await this.whatsappService.sendMessage(message);

    // Log for tracking
    console.log(`Sent ${slots.length} slots to ${customerPhone} in ${language}`);

    return result;
  }

  async sendBookingConfirmation(
    customerPhone: string,
    slot: SlotSuggestion,
    bookingId: string,
    language: SupportedLanguage,
  ) {
    // Build message
    const message = buildConfirmationTemplate(slot, bookingId, language);
    message.to = customerPhone;

    // Send to customer
    const result = await this.whatsappService.sendMessage(message);

    // Log for tracking
    console.log(
      `Sent confirmation for booking ${bookingId} to ${customerPhone} in ${language}`,
    );

    return result;
  }
}
```

---

## See Also

- **README.md**: Full documentation and API reference
- **slot-selection.template.ts**: Slot selection implementation
- **confirmation.template.ts**: Confirmation implementation
- **translations.ts**: Translation constants and formatting utilities

---

Copyright © 2024. All rights reserved.
