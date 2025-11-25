# SlotFinderService Usage Guide

## Overview

The `SlotFinderService` efficiently finds available booking slots by querying the database for masters, services, and existing bookings. It implements smart ranking based on customer preferences.

## Location

```
Backend/src/modules/ai/services/slot-finder.service.ts
```

## Features

- **Batch Queries**: Single query for all bookings to avoid N+1 problems
- **Smart Ranking**: Prioritizes preferred masters and times
- **Conflict Detection**: Excludes slots that overlap with existing bookings
- **Working Hours**: Respects master schedules and days off
- **Performance**: < 100ms for 7-day search with multiple masters

## Usage

### Basic Usage

```typescript
import { SlotFinderService } from './services/slot-finder.service';

// Inject in your service
constructor(private readonly slotFinder: SlotFinderService) {}

// Find slots
async findSlots() {
  const result = await this.slotFinder.findAvailableSlots({
    salonId: 'salon-123',
    serviceId: 'service-456',
    maxDaysAhead: 7,
    limit: 10,
  });

  console.log(`Found ${result.totalFound} slots`);
  console.log(`Returning ${result.slots.length} slots`);
  console.log(`Has more: ${result.hasMore}`);
}
```

### With Customer Preferences

```typescript
async findPreferredSlots() {
  const result = await this.slotFinder.findAvailableSlots({
    salonId: 'salon-123',
    serviceId: 'service-456',
    masterId: 'master-789',        // Customer's preferred master
    preferredDate: '2025-10-26',   // Customer's preferred date
    preferredTime: '14:00',        // Customer's preferred time
    maxDaysAhead: 7,
    limit: 10,
  });

  // Slots are ranked by proximity to preferences
  // Higher proximityScore = better match
  const bestSlot = result.slots[0];
  console.log(`Best slot score: ${bestSlot.proximityScore}`);
  console.log(`Is preferred: ${bestSlot.isPreferred}`);
  console.log(`Proximity: ${bestSlot.proximityLabel}`);
}
```

### Flexible Search

```typescript
async findFlexibleSlots() {
  // Search up to 14 days ahead, return up to 20 slots
  const result = await this.slotFinder.findAvailableSlots({
    salonId: 'salon-123',
    serviceId: 'service-456',
    maxDaysAhead: 14,
    limit: 20,
  });

  // Group by date
  const slotsByDate = result.slots.reduce((acc, slot) => {
    if (!acc[slot.date]) acc[slot.date] = [];
    acc[slot.date].push(slot);
    return acc;
  }, {} as Record<string, typeof result.slots>);

  console.log(`Available on ${Object.keys(slotsByDate).length} days`);
}
```

## Input Parameters

```typescript
interface SlotSearchParams {
  salonId: string;           // Required: Salon ID
  serviceId: string;         // Required: Service ID
  masterId?: string;         // Optional: Preferred master
  preferredDate?: string;    // Optional: Preferred date (YYYY-MM-DD)
  preferredTime?: string;    // Optional: Preferred time (HH:mm)
  maxDaysAhead?: number;     // Optional: Days to search (default: 7)
  limit?: number;            // Optional: Max slots to return (default: 10)
}
```

## Output Format

```typescript
interface SlotSearchResult {
  slots: SlotSuggestion[];   // Available slots (ranked)
  totalFound: number;        // Total slots found
  searchedDays: number;      // Days searched
  hasMore: boolean;          // More slots available beyond limit
}

interface SlotSuggestion {
  id: string;                // Unique slot ID
  date: string;              // YYYY-MM-DD
  startTime: string;         // HH:mm
  endTime: string;           // HH:mm
  duration: number;          // Minutes
  masterId: string;          // Master ID
  masterName: string;        // Master name
  serviceId: string;         // Service ID
  serviceName: string;       // Service name
  price: number;             // Price (number, not Decimal)
  isPreferred: boolean;      // Matches customer preference
  proximityScore: number;    // Ranking score (0-100)
  proximityLabel: string;    // 'exact' | 'close' | 'same-day' | 'same-week' | 'alternative'
}
```

## Ranking Algorithm

Slots are ranked by proximity to customer preferences:

| Match Type | Score | Proximity Label |
|------------|-------|-----------------|
| Master + Date + Time | 100 | exact |
| Master + Date | 90 | close |
| Master + Time | 85 | close |
| Master only | 75 | same-week |
| Date + Time | 70 | close |
| Date only | 60 | same-day |
| Time only | 50 | same-week |
| By date proximity | 0-40 | same-day / same-week / alternative |

## Performance Considerations

### Optimized Queries

The service uses batch queries to minimize database round trips:

1. **Single Service Query**: Gets service details
2. **Single Masters Query**: Gets all relevant masters at once
3. **Single Bookings Query**: Gets all bookings for all masters in date range

Total: 3 database queries regardless of number of masters or days searched.

### Performance Targets

- **< 100ms**: 7-day search with 2-3 masters
- **< 200ms**: 14-day search with 5+ masters
- **< 300ms**: 30-day search with 10+ masters

### Query Efficiency

```typescript
// GOOD: Batch query all bookings
const bookings = await prisma.booking.findMany({
  where: {
    master_id: { in: [master1, master2, master3] },  // Multiple masters
    start_ts: { gte: startDate, lt: endDate },       // Date range
  }
});

// BAD: N+1 query anti-pattern (DO NOT DO THIS)
for (const master of masters) {
  const bookings = await prisma.booking.findMany({
    where: { master_id: master.id }  // Separate query per master
  });
}
```

## Working Hours Format

Masters must have a `working_hours` JSON field:

```json
{
  "monday": { "start": "09:00", "end": "18:00" },
  "tuesday": { "start": "09:00", "end": "18:00" },
  "wednesday": { "start": "09:00", "end": "18:00" },
  "thursday": { "start": "09:00", "end": "18:00" },
  "friday": { "start": "09:00", "end": "18:00" },
  "saturday": { "start": "10:00", "end": "16:00" },
  "sunday": { "start": null, "end": null }
}
```

Days with `null` start/end are considered days off.

## Example Integration with Quick Booking Flow

```typescript
@Injectable()
export class QuickBookingService {
  constructor(
    private readonly slotFinder: SlotFinderService,
    private readonly cardBuilder: InteractiveCardBuilderService,
  ) {}

  async handleSlotRequest(salonId: string, intent: BookingIntent) {
    // Find available slots based on customer intent
    const result = await this.slotFinder.findAvailableSlots({
      salonId,
      serviceId: intent.serviceId!,
      masterId: intent.masterId,
      preferredDate: intent.preferredDate,
      preferredTime: intent.preferredTime,
      maxDaysAhead: intent.isFlexible ? 14 : 7,
      limit: 10,
    });

    if (result.slots.length === 0) {
      return {
        message: 'Sorry, no slots available in the next 7 days.',
        suggestWaitlist: true,
      };
    }

    // Build interactive card with slot buttons
    const card = this.cardBuilder.buildSlotSelectionCard(result.slots);

    return {
      message: `Found ${result.totalFound} available slots:`,
      interactive: card,
      hasMore: result.hasMore,
    };
  }
}
```

## Error Handling

```typescript
try {
  const result = await this.slotFinder.findAvailableSlots(params);

  if (result.slots.length === 0) {
    // No slots available
    console.log('No available slots found');
  }

} catch (error) {
  // Database or query errors
  console.error('Error finding slots:', error);
  throw error;
}
```

## Testing

Unit tests are available in:
```
Backend/src/modules/ai/services/slot-finder.service.spec.ts
```

Run tests:
```bash
npm test -- slot-finder.service.spec.ts
```

## Database Schema Requirements

The service expects these Prisma models:

- **Service**: id, name, duration_minutes, price, category
- **Master**: id, name, specialization[], working_hours (Json), salon_id, is_active
- **Booking**: id, master_id, start_ts, end_ts, status

See `prisma/schema.prisma` for full schema.

## Module Registration

The service is registered in `ai.module.ts`:

```typescript
@Module({
  providers: [
    SlotFinderService,
    // ... other providers
  ],
  exports: [
    SlotFinderService,
  ],
})
export class AIModule {}
```

## Future Enhancements

- [ ] Cache frequently requested time ranges
- [ ] Support for master breaks (lunch, etc.)
- [ ] Support for buffer time between appointments
- [ ] Support for recurring availability patterns
- [ ] Slot availability predictions based on historical data
- [ ] Multi-service booking (e.g., haircut + coloring)
