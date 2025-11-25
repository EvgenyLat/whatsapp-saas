# Feature Specification: Empathetic AI Dialog Enhancement

**Feature Branch**: `002-empathetic-ai-dialog`
**Created**: 2025-10-31
**Status**: Draft
**Parent Feature**: 001-whatsapp-quick-booking
**Input**: Enhance zero-typing WhatsApp booking with empathetic, context-aware dialog and smart choice navigation

---

## 🎯 CORE PRINCIPLE: "Explain → Offer Choices → Get Answer via Buttons"

Bot ALWAYS explains the situation, provides context for choices, and guides users with empathy. Never just show buttons without explanation.

---

## 📱 KEY ENHANCEMENT: Empathetic Context + Smart Choices

**Before (poor UX):**
```
Bot: [ 14:00 ] [ 16:00 ] [ Saturday ]
User: 🤔 Why not 15:00? What's happening?
```

**After (empathetic UX):**
```
Bot: "Unfortunately, 15:00 is already booked 😔

     But I found great options for you! 🎯

     What works better?

     [ ✅ Same day, different time ]
     [ 📅 Different day, but 15:00 ]"

User: [taps button] → understands situation → happy!
```

---

## User Scenarios & Testing

### User Story 1 - Empathetic Time Conflict Resolution (Priority: P1)

When requested time is unavailable, bot explains the situation with empathy and offers smart categorized choices instead of raw time slots.

**Acceptance Scenarios:**

1. **Given** customer requests unavailable time, **When** bot responds, **Then** bot explains unavailability with empathy emoji, offers categorized choices (same day vs same time), and provides clear context
2. **Given** customer selects "Same day, different time", **When** bot shows alternatives, **Then** slots are ranked by time proximity with visual indicators (⭐ for closest)
3. **Given** customer selects "Different day, same time", **When** bot shows alternatives, **Then** slots are grouped by day with proximity to original date

**Success Metrics:**
- 95%+ customers understand why time unavailable
- 85%+ select from first choice card (no confusion)
- <5% type clarifying questions after explanation

---

### User Story 2 - Context-Aware Popular Times (Priority: P1)

When customer provides incomplete information, bot proactively suggests popular times based on historical data with social proof.

**Acceptance Scenarios:**

1. **Given** customer says "I want haircut" without time/date, **When** bot responds, **Then** shows empathetic prompt for more info with popular times option
2. **Given** customer selects "Popular times", **When** bot shows options, **Then** displays top 5 times with booking counts as social proof
3. **Given** salon has <10 bookings total, **When** requesting popular times, **Then** shows industry-standard defaults with explanation

**Success Metrics:**
- 70%+ customers who see popular times select from them
- 60%+ incomplete requests resolved via popular times

---

### User Story 3 - Multi-Language Empathetic Messages (Priority: P1)

All empathetic messages, explanations, and choice descriptions render in customer's detected language with culturally appropriate expressions.

**Acceptance Scenarios:**

1. **Given** customer writes in Russian, **When** bot explains unavailability, **Then** uses Russian empathetic phrases like "К сожалению 😔" and appropriate emojis
2. **Given** Spanish-speaking customer, **When** showing choices, **Then** buttons labeled in Spanish with proper formality level
3. **Given** any language, **When** confirming action, **Then** uses action confirmation phrases like "Записываю вас 📝" (RU) or "Booking for you 📝" (EN)

---

## Requirements

### Functional Requirements

#### Empathetic Dialog System

**FR-001: Message Builder Service**
- System MUST implement multi-language empathetic message templates
- Templates MUST include emotion indicators (emojis) appropriate for context
- Messages MUST be concise (max 3 lines before buttons)
- MUST support parameter interpolation for dynamic content

**FR-002: Context-Aware Choice Flow**
- System MUST provide categorical choices when exact match unavailable
- Choices MUST be mutually exclusive and comprehensive
- Each choice MUST lead to relevant filtered results
- Context from original request MUST be preserved through choice flow

**FR-003: Alternative Ranking Algorithm**
- System MUST rank alternatives by proximity (time or date)
- MUST show visual indicators (⭐) for closest matches
- MUST limit initial display to top 5 options
- MUST provide "See more" option if >5 alternatives exist

**FR-004: Popular Times Analysis**
- System MUST analyze 90-day booking history
- MUST weight recent bookings higher (2x last 30 days, 1.5x 31-60 days)
- MUST show booking count as social proof
- MUST fallback to industry defaults for new salons

**FR-005: Session Context Management**
- System MUST maintain conversation context across button clicks
- Context MUST include: original intent, language, selected choices
- Context MUST expire after 30 minutes of inactivity
- MUST handle context gracefully if expired

### Key Entities

**Choice Option**
```typescript
interface ChoiceOption {
  id: 'same_day_diff_time' | 'diff_day_same_time' | 'popular_times';
  label: string;        // Localized label
  emoji: string;        // Visual indicator
  description?: string; // Optional explanation
}
```

**Booking Context**
```typescript
interface BookingContext {
  originalIntent: BookingIntent;
  sessionId: string;
  language: string;
  salonId: string;
  customerId: string;
  choices: ChoiceOption[];  // Selected choices history
  createdAt: Date;
  expiresAt: Date;
}
```

**Empathetic Message**
```typescript
interface EmpathyMessage {
  key: string;           // Message identifier
  language: string;      // Language code
  template: string;      // Message template with {params}
  emotion: 'happy' | 'sad' | 'neutral' | 'excited';
  emoji: string;         // Associated emoji
}
```

**Popular Time Slot**
```typescript
interface PopularTimeSlot {
  dayOfWeek: number;     // 0-6
  hour: number;          // 0-23
  bookingCount: number;  // Historical count
  recencyScore: number;  // Weighted by recency
  displayText: string;   // Formatted for display
  isAvailable: boolean;  // Current availability
}
```

---

## Success Criteria

### User Experience Metrics

**UX-001: Message Clarity**
- Target: <5% customers type "what?" or "I don't understand"
- Measurement: Analyze messages after bot explanations

**UX-002: Choice Effectiveness**
- Target: 85%+ customers select from first choice card
- Measurement: Track button clicks vs additional text messages

**UX-003: Emotional Satisfaction**
- Target: 80%+ positive sentiment in conversation
- Measurement: Sentiment analysis of customer responses

**UX-004: Context Preservation**
- Target: 95%+ successful context retrieval on button clicks
- Measurement: Track context hit rate in Redis

### Performance Metrics

**PM-001: Message Generation**
- Target: <100ms to generate empathetic message
- Includes: Template selection, parameter interpolation, translation

**PM-002: Popular Times Query**
- Target: <200ms with caching
- Includes: 90-day SQL query with grouping and sorting

**PM-003: Context Storage/Retrieval**
- Target: <50ms Redis operations
- Includes: Set with TTL, Get with deserialization

---

## Technical Architecture

### New Services to Create

```
Backend/src/modules/ai/services/
  ├── alternative-suggester.service.ts    # Rank alternatives by proximity
  ├── popular-times.service.ts            # Analyze booking history
  ├── message-builder.service.ts          # Generate empathetic messages
  └── session-context.service.ts          # Manage conversation state
```

### Files to Update

```
Backend/src/modules/ai/
  ├── quick-booking.service.ts            # Add choice flow logic
  └── types/
      └── choice.types.ts                 # New type definitions

Backend/src/modules/whatsapp/interactive/
  └── interactive-card-builder.service.ts # Add choice & popular cards
```

### Integration Points

1. **QuickBookingService** enhancement:
   - Add `handleChoice()` method for choice navigation
   - Integrate MessageBuilderService for all responses
   - Add context preservation between interactions

2. **InteractiveCardBuilder** enhancement:
   - Add `buildChoiceCard()` for categorical choices
   - Add `buildPopularTimesCard()` for social proof display

3. **Database queries**:
   - Popular times SQL with 90-day window
   - Recency weighting calculation

---

## Implementation Phases

### Phase 1: Core Services (Week 1)
- AlternativeSuggesterService
- MessageBuilderService
- Update QuickBookingService with choice flow
- Update InteractiveCardBuilder

### Phase 2: Advanced Features (Week 1-2)
- PopularTimesService with caching
- SessionContextService with Redis
- Multi-language message templates

### Phase 3: Testing & Polish (Week 2)
- Integration tests for all scenarios
- Performance optimization
- Documentation

**Total Estimated Time**: 2 weeks

---

## Open Questions

1. Should we use GPT for dynamic empathetic message generation or stick with templates?
2. How many choice levels deep should we support? (Currently 1 level proposed)
3. Should popular times be cached per-salon or globally?
4. What's the optimal context expiry time? (30 minutes proposed)

---

## Success Formula

```
Minimum:   2 messages + 1 click = Happy Path
Optimum:   3-4 messages + 2-3 clicks = Standard case
Maximum:   5-6 messages + 4-5 clicks = Complex case
```

**Never:** Leave customer without explanation or action
**Always:** Explain → Offer Choices → Get Answer → Confirm

---

## ✅ SPECIFICATION READY FOR PLANNING

This enhancement will transform the WhatsApp booking experience from functional to delightful through empathetic communication and intelligent choice architecture.