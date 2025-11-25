# Agent Context: WhatsApp SaaS Platform

**Last Updated**: 2025-10-25
**Purpose**: Long-term memory for AI agents assisting with this codebase

---

## Project Overview

**Name**: WhatsApp SaaS Platform
**Type**: Multi-tenant salon booking system with WhatsApp integration
**Stack**: NestJS (Backend), Next.js (Frontend), PostgreSQL, Redis, WhatsApp Cloud API
**Scale**: 1000+ salons, 10,000+ concurrent customers

---

## Recent Features

### 001-whatsapp-quick-booking (2025-10-25)

**Status**: Phase 1 Design Complete

**Summary**: Revolutionary zero-typing touch-based booking with WhatsApp interactive messages. Reduces booking flow from 8 messages + 5 AI calls ($0.38/booking) to 1 message + 2-3 taps + 1-2 AI calls ($0.003/booking) - a 99%+ cost reduction and 10x speed improvement.

**Core Principle**: "Never Let Customer Leave Without Booking!" - Bot ALWAYS guides customer to successful booking through infinite slot search (30 days ahead), smart-ranked alternatives, and waitlist/call-salon escalation.

---

### 002-empathetic-ai-dialog (2025-10-31)

**Status**: Phase 1 Design Complete

**Summary**: Empathetic dialog enhancement for WhatsApp booking that transforms simple button lists into context-aware, empathetic conversations with smart categorical choices.

**Core Principle**: "Explain → Offer Choices → Get Answer via Buttons" - Bot ALWAYS explains the situation with empathy, provides context for choices, and guides users through smart navigation.

**Key Technical Decisions** (from research.md):
- **Message Templates**: Hardcoded with hot-reload capability for development
- **Session Context**: Redis strings with JSON serialization (30-min TTL)
- **Popular Times**: Linear decay with 3 time buckets (2x, 1.5x, 1x weighting)
- **Choice Flow**: Single-level choices only (cognitive load optimization)
- **Performance**: Lazy loading with background refresh for caching

**New Services**:
- AlternativeSuggesterService - Proximity-based ranking with visual indicators
- MessageBuilderService - Multi-language empathetic messages with emotion indicators
- SessionContextService - Redis-based conversation state management
- PopularTimesService - 90-day historical analysis with industry defaults

**Success Metrics**:
- <5% customers type clarifying questions after explanation
- 85%+ select from first choice card
- 95%+ successful context retrieval on button clicks

---

## Key Technical Decisions (from research.md)

### 1. WhatsApp Cloud API Interactive Messages

**Decision**: Use Reply Buttons (≤3 slots) and List Messages (4-10 slots) with button ID schema validation

**Implementation**:
- **Button ID Format**: `{type}_{context}` where type = `slot|confirm|waitlist|action|nav`
- **Validation Regex**: `^(slot|confirm|waitlist|action|nav)_[a-zA-Z0-9_:-]+$`
- **Example**: `slot_2024-10-25_15:00_m123` (date + time + master ID)
- **Fallback**: Old WhatsApp versions auto-convert to plain text "Reply 1, 2, or 3"
- **Rate Limits**: 80 MPS per phone number (auto-scales to 1,000 MPS), 10 messages/min per customer

**Payload Structure** (Button Click):
```json
{
  "interactive": {
    "type": "button_reply",
    "button_reply": {
      "id": "slot_2024-10-25_15:00_m123",
      "title": "3:00 PM - Sarah"
    }
  }
}
```

**References**:
- Spec: spec.md FR-001 to FR-005
- Research: research.md Section 1 (WhatsApp Cloud API Investigation)
- Contracts: contracts/whatsapp/*.json

---

### 2. Slot Search Performance Optimization

**Decision**: Batch query with 4 B-Tree indexes (no pre-calculation caching initially)

**Implementation**:
- **Single batch query** for all 30 days (vs 30 separate queries)
- **Performance**: <3s for 30-day window with 1000 bookings
- **Algorithm**: Query all bookings ONCE, calculate free slots in-memory

**Database Indexes** (CRITICAL):
```sql
-- 1. Availability check (most frequent query)
CREATE INDEX idx_bookings_availability
ON bookings(master_id, date, status)
WHERE status != 'CANCELLED';

-- 2. Popular times historical query
CREATE INDEX idx_bookings_popular_times
ON bookings(salon_id, created_at, start_ts)
WHERE status != 'CANCELLED';

-- 3. Waitlist notification expiry
CREATE INDEX idx_waitlist_expiry
ON waitlist(notification_expires_at)
WHERE status = 'notified';

-- 4. Waitlist queue ordering
CREATE INDEX idx_waitlist_queue
ON waitlist(salon_id, service_id, position_in_queue, created_at)
WHERE status = 'active';
```

**Performance Targets**:
- Slot search: <3s (30-day window)
- Single slot check: <50ms
- Popular times query: <100ms (with Redis cache, 1-hour TTL)

**References**:
- Spec: spec.md FR-006 to FR-009
- Research: research.md Section 2 (Slot Search Performance Analysis)
- Data Model: data-model.md Section 2.2 (Performance Indexes)

---

### 3. Waitlist Notification System

**Decision**: BullMQ delayed jobs (15-min timers) + PostgreSQL row locking (race condition handling)

**Implementation**:
- **BullMQ Queue**: `waitlist-expiry` with 15-minute delayed jobs
- **Race Condition Protection**: PostgreSQL `FOR UPDATE` row locking in transaction
- **Notification Trigger**: Real-time (not batched) when slot opens
- **Recursive Notification**: If expired/passed, automatically notify next person

**Waitlist Status Transitions**:
```
active → notified → booked    (customer clicked [Book Now])
                 → passed     (customer clicked [Pass])
                 → expired    (15 min elapsed, no response)
```

**Code Example** (15-min timer):
```typescript
// Add expiry job
await waitlistQueue.add(
  'check-expiry',
  { waitlistId },
  { delay: 15 * 60 * 1000 } // 15 minutes
);

// Handle expiry
async handleExpiry(waitlistId: string) {
  const entry = await this.waitlist.findById(waitlistId);
  if (entry.status === 'notified') {
    // Still waiting → mark expired, notify next person
    await this.waitlist.update(waitlistId, { status: 'expired' });
    await this.notifyNextInQueue(entry.slotOfferedId);
  }
}
```

**Performance Targets**:
- Notification speed: ≤2 min from slot opening to first customer notified
- Conversion rate: 60%+ waitlist customers book when notified

**References**:
- Spec: spec.md FR-022 (Waitlist Notification System)
- Research: research.md Section 3 (Waitlist Technical Design)
- Data Model: data-model.md Section 1.6 (Waitlist Entry entity)

---

### 4. AI Cost Optimization

**Decision**: Hybrid approach with preference-based bypass for returning customers + GPT-3.5-turbo + Redis caching

**Implementation**:
- **Returning Customers** (70% of bookings): Bypass AI entirely, use `customer_preferences` table
- **New Customers** (30% of bookings): GPT-3.5-turbo intent parsing
- **Redis Caching**: 24-hour TTL for identical messages

**Preference-Based Bypass Logic**:
```typescript
if (message.text === "Book my usual" || message.text === "Same as last time") {
  // Skip AI, use preferences
  const prefs = await this.preferences.get(customerId);
  return this.slotFinder.find({
    serviceId: prefs.favoriteServiceId,
    masterId: prefs.favoriteMasterId,
    preferredDate: this.getNextPreferredDay(prefs),
    preferredTime: prefs.preferredHour + ':00'
  });
} else {
  // Use AI for flexible requests
  const intent = await this.ai.parse(message.text); // GPT-3.5-turbo
  return this.slotFinder.find(intent);
}
```

**Cost Breakdown**:
- **Original**: $0.38 per booking (8 messages × 5 AI calls × GPT-4)
- **Optimized**: $0.00006 per booking
  - New customers: $0.002 (GPT-3.5) × 10% cache miss × 30% = $0.00006
  - Returning customers: $0 AI cost × 70% = $0
- **Savings**: 99.98% reduction

**Performance Targets**:
- Returning customer flow: <500ms (no AI call)
- New customer flow: <2s (AI parse)

**References**:
- Spec: spec.md FR-015 to FR-017 (Returning Customer Fast-Track)
- Research: research.md Section 4 (AI Optimization Strategies)
- Data Model: data-model.md Section 1.4 (Customer Preferences entity)

---

### 5. Popular Times Algorithm

**Decision**: 90-day lookback with recency weighting (2x, 1.5x, 1x) + industry defaults for new salons

**Implementation**:
- **Historical Query** (salons with ≥10 bookings):
  ```sql
  SELECT
    EXTRACT(DOW FROM start_ts) as day_of_week,
    EXTRACT(HOUR FROM start_ts) as hour,
    SUM(
      CASE
        WHEN created_at > NOW() - INTERVAL '30 days' THEN 2.0  -- Recent: 2x weight
        WHEN created_at > NOW() - INTERVAL '60 days' THEN 1.5  -- Medium: 1.5x
        ELSE 1.0                                                -- Old: 1x
      END
    ) as weighted_score
  FROM bookings
  WHERE salon_id = ? AND created_at > NOW() - INTERVAL '90 days'
    AND status != 'CANCELLED'
  GROUP BY day_of_week, hour
  ORDER BY weighted_score DESC
  LIMIT 6;
  ```

- **Industry Defaults** (salons with <10 bookings):
  ```typescript
  const DEFAULT_POPULAR_TIMES = [
    { dayOfWeek: 5, hour: 14, label: "Friday 2pm" },   // End-of-week popular
    { dayOfWeek: 5, hour: 15, label: "Friday 3pm" },
    { dayOfWeek: 6, hour: 10, label: "Saturday 10am" }, // Weekend morning
    { dayOfWeek: 6, hour: 14, label: "Saturday 2pm" },  // Weekend afternoon
  ];
  ```

**Performance Targets**:
- Query time: <100ms (with Redis cache, 1-hour TTL)
- Accuracy: 70%+ customers select from suggested times

**References**:
- Spec: spec.md FR-023 (Popular Times Suggestion)
- Research: research.md Section 5 (Popular Times Algorithm Design)
- Data Model: data-model.md Section 1.5 (Popular Time Slot entity)

---

## New Services

### 1. InteractiveCardBuilder

**Location**: `Backend/src/modules/whatsapp/interactive/interactive-message.builder.ts`

**Purpose**: Generates WhatsApp Reply Buttons and List Messages from slot suggestions

**Key Methods**:
- `buildSlotSelectionCard(slots, language)` - Decides between Reply Buttons (≤3) or List Message (4-10)
- `buildReplyButtonsCard(slots)` - Creates WhatsApp Reply Buttons payload
- `buildListMessageCard(slots)` - Creates WhatsApp List Message payload (grouped by day)
- `buildConfirmationCard(booking, language)` - Creates [Confirm] / [Change Time] card

**Performance**: <50ms to generate card

**References**: contracts/whatsapp/*.json for payload formats

---

### 2. SlotFinderService

**Location**: `Backend/src/modules/bookings/slot-finder.service.ts`

**Purpose**: Infinite slot search up to 30 days ahead with batch query optimization

**Key Methods**:
- `findSlots(params)` - Main slot search (returns up to 20 slots or throws NoAvailabilityError)
- `checkSlotAvailable(masterId, date, time)` - Fast single-slot check (<50ms)
- `getWorkingHours(masterId, date)` - Parse master's working_hours JSON
- `calculateFreeSlots(masterId, date, duration)` - Compute free slots (working hours - booked)

**Algorithm**:
1. Query all bookings for next 30 days (single batch query)
2. For each day: Get master's working hours
3. Calculate free slots: working_hours - booked_times
4. Stop when found 20 slots OR reached 30 days
5. If 0 slots → throw NoAvailabilityError (triggers waitlist flow)

**Performance**: <3s for 30-day search with 1000 bookings

**References**: contracts/services/all-services.interface.ts ISlotFinderService

---

### 3. AlternativeSuggesterService

**Location**: `Backend/src/modules/bookings/alternative-suggester.service.ts`

**Purpose**: Ranks slot alternatives by proximity to customer's preferred time

**Key Methods**:
- `rankSlots(slots, intent)` - Returns slots sorted by proximity score (highest first)
- `calculateProximityScore(slot, intent)` - Calculates score (0-2000 range typical)
- `labelProximity(score)` - Categorizes as 'exact' | 'close' | 'same-day' | 'same-week' | 'alternative'

**Ranking Algorithm**:
```typescript
score = 0;
if (slot.masterId === intent.masterId) score += 1000;  // Same master
if (timeDiff <= 60 min) score += 500;                  // Within 1 hour
if (timeDiff <= 120 min) score += 300;                 // Within 2 hours
if (slot.date === intent.date) score += 200;           // Same day
score -= (timeDiff / 10);                              // Time penalty
```

**Performance**: <100ms to rank 20 slots

**References**: spec.md FR-007, research.md Section 2.1

---

### 4. PopularTimesService

**Location**: `Backend/src/modules/bookings/popular-times.service.ts`

**Purpose**: Analyzes last 90 days of bookings to suggest popular times when customer says "anytime"

**Key Methods**:
- `getPopularTimes(salonId, lookbackDays=90, limit=6)` - Returns popular times with availability
- `getDefaultPopularTimes()` - Returns industry defaults for new salons (<10 bookings)
- `clearCache(salonId)` - Invalidates Redis cache (call after new bookings)

**Caching**: Redis 1-hour TTL (expensive SQL query)

**Performance**: <100ms with cache, <500ms cache miss

**References**: contracts/services/all-services.interface.ts IPopularTimesService

---

### 5. WaitlistNotifierService

**Location**: `Backend/src/modules/notifications/waitlist-notifier.service.ts`

**Purpose**: Manages waitlist notifications with 15-minute expiry timers

**Key Methods**:
- `notifyWaitlistOfOpening(slotId)` - Notify first customer in queue, start 15-min timer
- `handleWaitlistBooking(waitlistId, slotId)` - Handle [Book Now] click (with race condition protection)
- `handleWaitlistPass(waitlistId)` - Handle [Pass] click
- `handleWaitlistExpiry(waitlistId)` - Handle 15-min timeout (called by BullMQ job)
- `getQueuePosition(waitlistId)` - Get customer's position in queue

**BullMQ Integration**:
- Queue: `waitlist-expiry`
- Job type: `check-expiry`
- Delay: 15 minutes (900,000ms)

**Performance**: <2s from slot opening to notification sent

**References**: spec.md FR-022, research.md Section 3

---

### 6. QuickBookingService (Main Orchestrator)

**Location**: `Backend/src/modules/ai/quick-booking.service.ts`

**Purpose**: Main orchestrator for zero-typing booking flow

**Key Methods**:
- `handleBookingRequest(text, customerPhone, salonId)` - Main entry point for booking requests
- `handleButtonClick(buttonId, customerPhone)` - Route button clicks to appropriate handler
- `isReturningCustomer(customerId)` - Check if ≥3 past bookings
- `getUsualPreferences(customerId)` - Get favorite master/service/time

**Flow**:
1. Check if returning customer + "book usual" → bypass AI
2. Otherwise, parse intent with GPT-3.5-turbo
3. Find available slots (SlotFinderService)
4. Rank alternatives (AlternativeSuggesterService)
5. Build interactive card (InteractiveCardBuilder)
6. Send to customer via WhatsApp

**Performance**:
- Returning customers: <500ms
- New customers: <2s

**References**: contracts/services/all-services.interface.ts IQuickBookingService

---

### 7. TypedMessageHandlerService

**Location**: `Backend/src/modules/ai/typed-message-handler.service.ts`

**Purpose**: Handles typed messages after interactive buttons shown (graceful fallback)

**Key Methods**:
- `handleTypedMessageAfterButtons(text, conversationContext)` - Parse typed message, merge with context
- `parseIntentUpdate(text, currentContext)` - Extract only changed fields
- `isPreferenceChange(text)` - Detect if message is preference update vs new request

**Example Flow**:
```
Bot: [Shows Friday slots]
Customer: "Actually Saturday" ← types instead of clicking
Bot: [Shows Saturday slots] ← instant update, preserves service/master
```

**Performance**: <500ms to parse and update context

**References**: spec.md FR-021

---

## Database Changes

### New Tables

**1. customer_preferences**
- Stores learned customer booking patterns for fast-track rebooking
- Created after customer makes 3+ bookings
- Fields: `favoriteMasterId`, `favoriteServiceId`, `preferredDayOfWeek`, `preferredHour`, `avgRebookingDays`

**2. waitlist**
- Manages customers waiting for slot availability
- Fields: `status` (active/notified/booked/passed/expired), `positionInQueue`, `notifiedAt`, `notificationExpiresAt`
- Critical for "Never Leave Without Booking" principle

### New Indexes (CRITICAL for Performance)

**1. idx_bookings_availability** - Most frequent query (slot availability check)
**2. idx_bookings_popular_times** - Historical booking analysis (90-day query)
**3. idx_waitlist_expiry** - BullMQ expiry job queries this
**4. idx_waitlist_queue** - Queue ordering (FIFO)

**Migration Command**:
```bash
npx prisma migrate dev --name add-interactive-booking-tables
```

**References**: data-model.md Section 2 (Database Schema)

---

## Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Slot search (30-day window) | <3s | `findSlots()` execution time |
| Single slot check | <50ms | `checkSlotAvailable()` execution time |
| Webhook processing (button click) | <200ms | Button click → booking creation start |
| Popular times query | <100ms | With Redis cache (1-hour TTL) |
| Waitlist notification | <2s | Slot opening → WhatsApp send |
| AI cost per booking | ≤$0.01 | OpenAI API costs ÷ total bookings |
| Returning customer flow | <500ms | No AI call |
| New customer flow | <2s | With AI parse |

---

## Success Criteria

From spec.md (25 total):

**SC-001**: 95%+ bookings with 0 typing after initial message ✅
**SC-002**: Average 2-3 taps per booking ✅
**SC-003**: <30 seconds from first message to confirmation ✅
**SC-004**: 100% conversation completion rate (no dead-ends) ✅
**UX-006**: 60%+ waitlist conversion rate ✅
**UX-008**: 70%+ select from popular times suggestions ✅

**References**: spec.md Section "Success Criteria"

---

## Common Patterns

### 1. Button ID Parsing

**Pattern**:
```typescript
// Parse button ID from webhook
const buttonId = message.interactive.button_reply.id;
// Example: "slot_2024-10-25_15:00_m123"

const [action, ...contextParts] = buttonId.split('_');
// action = "slot"
// contextParts = ["2024-10-25", "15:00", "m123"]

switch (action) {
  case 'slot':
    const [date, time, masterId] = contextParts;
    return this.handleSlotSelection(date, time, masterId);

  case 'confirm':
    const [bookingId] = contextParts;
    return this.confirmBooking(bookingId);

  case 'waitlist':
    const [action2, waitlistId, slotId] = contextParts;
    if (action2 === 'book') return this.handleWaitlistBooking(waitlistId, slotId);
    if (action2 === 'pass') return this.handleWaitlistPass(waitlistId);

  default:
    throw new InvalidButtonIdError(buttonId);
}
```

### 2. Conversation Context Preservation

**Pattern**:
```typescript
// Customer types new preference after buttons shown
const existingContext = {
  serviceId: '456',
  masterId: 'm123',
  preferredDate: '2024-10-25',
  preferredTime: '15:00'
};

// Customer types: "Actually Saturday"
const updatedIntent = await this.intentParser.parseUpdate(
  'Actually Saturday',
  existingContext
);

// Merge: Only update changed field (date)
const mergedContext = {
  ...existingContext,
  ...(updatedIntent.date && { preferredDate: updatedIntent.date }) // Only date changes
};
// Result: { serviceId: '456', masterId: 'm123', preferredDate: '2024-10-26', preferredTime: '15:00' }
```

### 3. Race Condition Protection

**Pattern**:
```typescript
// Use PostgreSQL transaction with row locking
async handleWaitlistBooking(waitlistId: string, slotId: string) {
  return await this.prisma.$transaction(async (tx) => {
    // Step 1: Lock the slot row
    const slot = await tx.booking.findUnique({
      where: { id: slotId },
      lock: 'FOR UPDATE' // Prevents concurrent booking
    });

    if (slot.status !== 'available') {
      throw new SlotConflictError(slotId);
    }

    // Step 2: Create booking
    const booking = await tx.booking.create({ data: {...} });

    // Step 3: Update waitlist
    await tx.waitlist.update({
      where: { id: waitlistId },
      data: { status: 'booked', booked_at: new Date() }
    });

    return booking;
  });
}
```

---

## Testing Strategy

### Unit Tests (80%+ coverage required)

**Test all services independently**:
- SlotFinderService: Mock Prisma, test 30-day search logic
- AlternativeSuggesterService: Test ranking algorithm with various proximity scenarios
- PopularTimesService: Test SQL query, recency weighting, default times fallback
- WaitlistNotifierService: Test 15-min expiry, recursive notification, race conditions

**Example**:
```typescript
describe('SlotFinderService', () => {
  it('should find slots within 30-day window', async () => {
    const service = new SlotFinderService(mockPrisma);
    const result = await service.findSlots({
      salonId: '123',
      serviceId: '456',
      preferredDate: '2024-10-25',
      maxDaysAhead: 30
    });
    expect(result.slots).toBeDefined();
    expect(result.searchedDays).toBeLessThanOrEqual(30);
  });
});
```

### Integration Tests (85%+ coverage on webhooks)

**Test complete API flows**:
- Webhook receives interactive message → parses → creates booking
- Button click → booking confirmation flow
- Waitlist signup → slot opens → notification → booking

### E2E Tests (100% coverage on critical user stories)

**Test complete user journeys**:
- US1: Zero-typing booking (1 message + 2 taps)
- US2: Alternative slots (preferred time unavailable)
- US4: Waitlist notification (all slots booked)

---

## Known Issues & Limitations

### Current Limitations

**1. Single Service Per Booking**
- **Issue**: Customer can't book "Haircut AND Coloring" in one conversation
- **Workaround**: Book separately (two conversations)
- **Future**: Multi-service booking (Phase 3)

**2. Same-Day Booking Time Constraints**
- **Issue**: Can't book slot that starts in <30 minutes (master may not be ready)
- **Workaround**: Show "Call Salon for urgent bookings" message
- **Future**: Configurable minimum booking lead time

**3. Multi-Language Partial Support**
- **Status**: Infrastructure ready (translation constants defined), but only English tested
- **Future**: Test with native speakers in RU, ES, PT, HE

### Known Edge Cases

**EC-009**: Customer types conflicting preference after buttons
**Resolution**: Parse as preference update, maintain context, show new slots

**EC-011**: Waitlist customer doesn't respond within 15 min
**Resolution**: Auto-expire, notify next person, send original customer "still in queue" message

**EC-013**: New salon with zero booking history
**Resolution**: Use industry default popular times (Friday 2-3pm, Saturday 10am/2pm)

**References**: spec.md Section "Edge Cases"

---

## Development Guidelines

### When to Use Which Service

**Booking Request Flow**:
1. Customer sends message → `QuickBookingService.handleBookingRequest()`
2. Parse intent → `IntentParserService.parse()` (if not returning customer)
3. Find slots → `SlotFinderService.findSlots()`
4. Rank alternatives → `AlternativeSuggesterService.rankSlots()`
5. Build card → `InteractiveCardBuilder.buildSlotSelectionCard()`
6. Send → `WhatsAppService.sendInteractiveMessage()`

**Button Click Flow**:
1. Webhook receives button click → `QuickBookingService.handleButtonClick()`
2. Parse button ID → Extract action + context
3. Route to handler → `handleSlotSelection()` or `handleConfirmation()` etc.

**Waitlist Flow**:
1. No slots found → `NoAvailabilityError` thrown
2. Show waitlist option → Customer clicks [Join Waitlist]
3. Add to queue → `WaitlistService.add()`
4. Slot opens → `WaitlistNotifierService.notifyWaitlistOfOpening()`
5. Customer books → `WaitlistNotifierService.handleWaitlistBooking()`

### Code Review Checklist

Before merging:
- [ ] All tests passing (`npm run test`)
- [ ] Coverage ≥80% (`npm run test:cov`)
- [ ] TypeScript strict mode (no `any` types)
- [ ] Button ID format validated (regex)
- [ ] Database indexes created (if schema changed)
- [ ] JSDoc comments on public methods
- [ ] Performance tested (<3s slot search, <200ms webhook)

---

## External Dependencies

### WhatsApp Cloud API
- **Rate Limits**: 80 MPS per phone number (scales to 1,000 MPS)
- **Pair Limit**: 10 messages/min per customer
- **Interactive Message Constraints**: Max 3 Reply Buttons, Max 10 List rows
- **Fallback**: Old WhatsApp versions auto-convert to plain text

### OpenAI
- **Model**: gpt-3.5-turbo (NOT gpt-4) for cost optimization
- **Caching**: Redis 24-hour TTL for identical messages
- **Bypass**: Returning customers (70% of bookings) skip AI entirely

### BullMQ
- **Queue**: `waitlist-expiry` for 15-minute timers
- **Redis**: Required for Bull queue storage
- **Monitoring**: Bull Dashboard at http://localhost:3001

---

## File Locations

### Specification Documents
- `specs/001-whatsapp-quick-booking/spec.md` - Complete feature specification (1,740 lines)
- `specs/001-whatsapp-quick-booking/research.md` - Technical research findings (580+ lines)
- `specs/001-whatsapp-quick-booking/data-model.md` - Entity models and database schema
- `specs/001-whatsapp-quick-booking/quickstart.md` - Developer onboarding guide
- `specs/001-whatsapp-quick-booking/contracts/` - API schemas and service interfaces

### Implementation (Pending)
- `Backend/src/modules/whatsapp/interactive/` - Interactive message builders
- `Backend/src/modules/bookings/slot-finder.service.ts` - Slot search logic
- `Backend/src/modules/ai/quick-booking.service.ts` - Main orchestrator
- `Backend/src/modules/notifications/waitlist-notifier.service.ts` - Waitlist notifications

---

## Next Steps

**Current Status**: Phase 1 Design Complete

**Phase 2**: Task Generation
- Run `/speckit.tasks` to generate `tasks.md` from spec + plan + research + design
- Break down implementation into 50-100 granular tasks
- Assign to developers for implementation

**Phase 3**: Implementation
- Follow TDD workflow (tests first!)
- Implement services in dependency order:
  1. SlotFinderService (foundation)
  2. AlternativeSuggesterService
  3. InteractiveCardBuilder
  4. QuickBookingService (orchestrator)
  5. WaitlistNotifierService
  6. PopularTimesService
  7. TypedMessageHandlerService

**Phase 4**: Testing & Deployment
- E2E tests for all 8 user stories
- Load testing (100 concurrent users)
- Production deployment

---

**Last Updated**: 2025-10-25
**Next Review**: After Phase 2 task generation
