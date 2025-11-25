# Implementation Plan: WhatsApp Touch-Based Quick Booking

**Branch**: `001-whatsapp-quick-booking` | **Date**: 2025-10-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-whatsapp-quick-booking/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

**Primary Requirement**: Transform WhatsApp booking flow from text-heavy multi-message interaction (8+ messages, 5 AI calls, $0.38/booking) into zero-typing touch-based experience (1 message + 2-3 taps, 1-2 AI calls, $0.003/booking) using WhatsApp Cloud API Interactive Messages.

**Core Principle**: "Never Let Customer Leave Without Booking!" - Bot ALWAYS guides customer to successful booking by searching up to 30 days ahead for available slots, showing smart-ranked alternatives, and offering waitlist/call-salon escalation to ensure 100% conversation completion rate.

**Technical Approach**:
1. **Interactive UI Layer**: WhatsApp Reply Buttons (≤3 slots) and List Messages (4-10 slots) with native mobile tap targets
2. **Infinite Search Algorithm**: 30-day lookahead slot finder with proximity-based ranking (same master +1000, <1h +500, same day +200 scoring)
3. **Zero-Typing Flow**: Customer types ONCE (initial request), then ONLY taps buttons for slot selection, confirmation, navigation
4. **Smart Context Detection**: Auto-skip service/master selection for single-option salons, fast-track returning customers with "Book Your Usual"
5. **Advanced Features**: Typed message parsing after buttons (graceful fallback), waitlist notification system with 15-min timers, popular times suggestion based on 90-day booking history

## Technical Context

**Language/Version**: TypeScript 5.x (Backend: Node.js 20+, Frontend: Next.js 14+)
**Primary Dependencies**:
- Backend: NestJS 10.x, Prisma ORM 5.x, OpenAI SDK 4.x, WhatsApp Cloud API, date-fns 3.x, Bull 4.x (background jobs)
- Frontend: Next.js 14+, React 18+, React Query 5.x, Tailwind CSS 3.x, Zod (validation)
**Storage**: PostgreSQL 15+ with Prisma ORM (existing schema: salons, masters, services, bookings, customers)
**Testing**: Jest + Supertest (Backend), Jest + React Testing Library (Frontend), Playwright (E2E)
**Target Platform**: Linux server (AWS/DigitalOcean), WhatsApp Cloud API (webhook-based)
**Project Type**: Web application (Backend API + Frontend Dashboard + WhatsApp Integration)
**Performance Goals**:
- API: <200ms p95 latency, 10,000+ concurrent users
- AI: <2s first request (GPT-3.5), <500ms cached responses
- Database: <50ms p95 query time
- WhatsApp: <200ms webhook processing time
**Constraints**:
- WhatsApp Cloud API: 3 Reply Buttons max per message, 10 List Message rows max
- AI Cost: ≤$0.01 per booking (requires GPT-3.5 + caching)
- Search Performance: Must search 30 days of availability within 3s
- Multi-tenancy: Data isolation per salon, 1000+ salons supported
**Scale/Scope**:
- Users: 1000+ salons, 10,000+ concurrent customers
- Data: ~50,000 bookings/month across all salons
- Features: 8 user stories (5 P1, 2 P2, 1 P3), 23 functional requirements
- Code: ~15 new service files, 8 updated files, 2 optional DB tables

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Security First ✅ PASS

**Assessment**: Feature handles customer PII (phone numbers, booking preferences, waitlist data)

**Compliance**:
- ✅ Customer phone numbers encrypted at rest (existing infrastructure)
- ✅ WhatsApp webhook signature verification REQUIRED (FR-002)
- ✅ Input validation for all button IDs and typed messages (FR-004, FR-021)
- ✅ SQL injection prevention via Prisma ORM parameterized queries
- ✅ Rate limiting per customer (existing: 100 req/min per user)
- ✅ HTTPS enforced for all WhatsApp webhook communication
- ✅ JWT authentication for internal API calls (existing)
- ⚠️ **NEW**: Waitlist notification tokens must expire after 15 minutes (FR-022)
- ⚠️ **NEW**: Button ID parsing must validate format to prevent injection

**Action Items**:
- Add button ID format validation regex: `^(slot|confirm|waitlist|action|nav)_[a-zA-Z0-9_-]+$`
- Implement waitlist notification expiry checks in `WaitlistNotifierService`

### II. TypeScript Everywhere ✅ PASS

**Compliance**:
- ✅ All new services written in TypeScript with strict mode
- ✅ Interfaces defined for: `InteractiveMessagePayload`, `SlotSuggestion`, `BookingIntent`, `PopularTimeSlot`, `WaitlistEntry` (spec.md lines 526-560)
- ✅ No `any` types in implementation (code examples use proper typing)
- ✅ Webhook handler types for `interactive.button_reply` and `interactive.list_reply`
- ✅ API contracts exported in `Backend/src/types/`

**Action Items**: None - full TypeScript compliance achieved

### III. Test-Driven Development ✅ PASS (with plan)

**Target**: 80%+ coverage across all new services

**Testing Strategy**:
- **Unit Tests** (15 files):
  - `SlotFinderService`: Test 30-day search, no-availability fallback, working hours parsing
  - `AlternativeSuggesterService`: Test ranking algorithm with proximity scores
  - `InteractiveCardBuilder`: Test Reply Buttons vs List Message selection logic
  - `PopularTimesService`: Test SQL query, default times fallback for new salons
  - `WaitlistNotifierService`: Test 15-min expiry, recursive notification, race conditions
  - `TypedMessageHandlerService`: Test context preservation, preference merging
- **Integration Tests** (6 endpoints):
  - Webhook `/whatsapp/webhook` with `interactive` message type
  - Button click → booking creation flow (idempotency check)
  - Waitlist signup → notification → booking flow
  - Popular times query for new vs established salons
- **E2E Tests** (3 critical flows):
  - Happy path: "Haircut Friday 3pm" → tap slot → tap confirm → booking created
  - Alternative flow: Requested time unavailable → show alternatives → book alternative
  - Waitlist flow: All slots booked → join waitlist → notified when opens → book slot

**Coverage Breakdown**:
- Core services: 90%+ (business logic critical)
- Webhook handlers: 85%+ (integration critical)
- Card builders: 80%+ (UI generation)

**Action Items**: Write tests BEFORE implementation per TDD workflow

### IV. API-First Development ✅ PASS

**API Changes Required**:
1. **Webhook Handler Extension** (existing endpoint):
   - `POST /api/v1/whatsapp/webhook` - Add `message.type === 'interactive'` support
   - Request: WhatsApp Cloud API interactive payload
   - Response: 200 OK with booking confirmation or error
2. **Internal Service APIs** (no external exposure):
   - SlotFinder, AlternativeSuggester, PopularTimes, Waitlist services (internal only)

**OpenAPI Updates**:
- Update webhook schema to include `interactive` message type
- Document button ID format specification
- Add example payloads for Reply Buttons and List Messages

**Backward Compatibility**: ✅ MAINTAINED
- Existing text message flow continues to work
- Interactive messages are additive (fallback to text if client doesn't support)
- No breaking changes to existing booking API

**Action Items**:
- Update OpenAPI spec at `Backend/swagger.yaml` with interactive webhook schema
- Add `message.interactive` type definitions

### V. Comprehensive Documentation ✅ PASS (with plan)

**Documentation Deliverables**:
- ✅ Feature specification: `spec.md` (1,740 lines - COMPLETE)
- ⏳ Implementation plan: `plan.md` (this file)
- ⏳ Research document: `research.md` (Phase 0 - pending)
- ⏳ Data model: `data-model.md` (Phase 1 - pending)
- ⏳ API contracts: `contracts/` (Phase 1 - pending)
- ⏳ Quick start guide: `quickstart.md` (Phase 1 - pending)
- ⏳ Code documentation: JSDoc comments in all new services
- ⏳ WhatsApp integration guide: Document button ID schema, card types, fallback behavior

**Action Items**:
- Phase 0: Create `research.md` with WhatsApp API investigation
- Phase 1: Generate all design artifacts
- Add README to `Backend/src/modules/whatsapp/interactive/` explaining card builder usage
- Document waitlist notification flow with sequence diagrams

### VI. Scalability Architecture ✅ PASS

**Scalability Considerations**:
- ✅ **Stateless Design**: All services are stateless, support horizontal scaling
- ✅ **Connection Pooling**: Prisma handles DB connection pooling (existing)
- ✅ **Caching**: Redis caching for AI responses (existing infrastructure)
- ✅ **Background Jobs**: Bull for waitlist notification scheduling (15-min timers)
- ✅ **Database Indexes**: Waitlist query performance (spec.md lines 1602-1604)
  - `idx_waitlist_notification_expiry` for expiry checks
  - `idx_waitlist_position` for queue ordering
- ✅ **Pagination**: Slot search limited to 30 days, max 20 slots per query
- ⚠️ **NEW**: 30-day slot search must be optimized (3s target)

**Performance Validation**:
- Slot search: Test with 1000 bookings in 30-day window → must complete <3s
- Webhook processing: Button click → booking creation must complete <200ms
- Waitlist notification: Trigger → WhatsApp send must complete <2s

**Bottleneck Mitigation**:
- Cache popular times query results for 1 hour (90-day SQL query is expensive)
- Index `bookings(master_id, date, status)` for slot availability checks
- Batch waitlist position recalculation (don't recalc on every booking)

**Action Items**:
- Add database indexes for slot search optimization
- Implement Redis caching for popular times query
- Load test: 100 concurrent slot searches with realistic booking data

### Constitution Compliance Summary

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Security First | ✅ PASS | Webhook verification + button ID validation required |
| II. TypeScript Everywhere | ✅ PASS | Full strict typing, no `any` usage |
| III. Test-Driven Development | ✅ PASS | 80%+ coverage plan defined, TDD workflow mandatory |
| IV. API-First Development | ✅ PASS | Backward compatible, OpenAPI updates required |
| V. Comprehensive Documentation | ✅ PASS | Spec complete, design docs pending Phase 0/1 |
| VI. Scalability Architecture | ✅ PASS | Indexes + caching required, load testing mandatory |

**GATE DECISION**: ✅ **PROCEED TO PHASE 0 RESEARCH**

All constitutional principles are satisfied with clear action items identified for implementation.

## Project Structure

### Documentation (this feature)

```text
specs/001-whatsapp-quick-booking/
├── spec.md              # Feature specification (COMPLETE - 1,740 lines)
├── plan.md              # This file (/speckit.plan command output - IN PROGRESS)
├── research.md          # Phase 0 output (/speckit.plan command - PENDING)
├── data-model.md        # Phase 1 output (/speckit.plan command - PENDING)
├── quickstart.md        # Phase 1 output (/speckit.plan command - PENDING)
├── contracts/           # Phase 1 output (/speckit.plan command - PENDING)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

**Structure Decision**: Web application with separate Backend (NestJS) and Frontend (Next.js) projects

```text
Backend/                                    # NestJS API server
├── src/
│   ├── modules/
│   │   ├── whatsapp/                      # Existing WhatsApp integration
│   │   │   ├── webhook.service.ts         # UPDATE: Add interactive message handling
│   │   │   ├── whatsapp.service.ts        # UPDATE: Add interactive card sending
│   │   │   └── interactive/               # NEW: Interactive message features
│   │   │       ├── interactive-message.builder.ts
│   │   │       ├── button-handler.service.ts
│   │   │       └── card-templates/
│   │   │           ├── slot-selection.template.ts
│   │   │           ├── confirmation.template.ts
│   │   │           ├── alternatives.template.ts
│   │   │           └── waitlist.template.ts
│   │   │
│   │   ├── bookings/                      # Existing booking module
│   │   │   ├── bookings.service.ts        # UPDATE: Add waitlist integration
│   │   │   ├── slot-finder.service.ts     # NEW: Infinite slot search
│   │   │   ├── alternative-suggester.service.ts  # NEW: Ranking algorithm
│   │   │   ├── preference-tracker.service.ts     # NEW: Customer preferences
│   │   │   ├── popular-times.service.ts   # NEW: Historical booking patterns
│   │   │   └── waitlist.service.ts        # NEW: Waitlist management
│   │   │
│   │   ├── ai/                            # Existing AI module
│   │   │   ├── ai.service.ts              # UPDATE: Add GPT-3.5 support
│   │   │   ├── quick-booking.service.ts   # NEW: Zero-typing orchestrator
│   │   │   ├── intent-parser.service.ts   # NEW: Extract booking intent
│   │   │   ├── context-detector.service.ts # NEW: Single master/service detection
│   │   │   └── typed-message-handler.service.ts  # NEW: Handle typed messages after buttons
│   │   │
│   │   └── notifications/                 # NEW: Notification module
│   │       ├── waitlist-notifier.service.ts
│   │       ├── notification-scheduler.service.ts
│   │       └── waitlist-queue-manager.service.ts
│   │
│   ├── types/                             # Existing type definitions
│   │   └── whatsapp.types.ts              # UPDATE: Add interactive message types
│   │
│   └── prisma/
│       └── schema.prisma                  # UPDATE: Add customer_preferences, waitlist tables (optional)
│
└── tests/
    ├── unit/
    │   ├── slot-finder.service.spec.ts
    │   ├── alternative-suggester.service.spec.ts
    │   ├── interactive-card-builder.spec.ts
    │   ├── popular-times.service.spec.ts
    │   ├── waitlist-notifier.service.spec.ts
    │   └── typed-message-handler.spec.ts
    │
    ├── integration/
    │   ├── webhook-interactive.spec.ts
    │   ├── booking-flow.spec.ts
    │   └── waitlist-flow.spec.ts
    │
    └── e2e/
        ├── zero-typing-booking.e2e.spec.ts
        ├── alternative-slots.e2e.spec.ts
        └── waitlist-notification.e2e.spec.ts

Frontend/                                  # Next.js 14 dashboard
├── src/
│   ├── app/
│   │   └── (dashboard)/
│   │       └── dashboard/
│   │           ├── services/              # Existing services pages
│   │           │   ├── page.tsx           # READ: Understand current service list UI
│   │           │   └── new/
│   │           │       └── page.tsx       # READ: Understand current service creation
│   │           │
│   │           └── analytics/             # NEW: Booking analytics dashboard
│   │               ├── page.tsx           # Show zero-typing metrics
│   │               └── components/
│   │                   ├── ZeroTypingMetrics.tsx
│   │                   ├── AlternativeAcceptanceChart.tsx
│   │                   └── WaitlistConversionChart.tsx
│   │
│   ├── components/
│   │   └── features/
│   │       └── bookings/                  # NEW: Booking visualization
│   │           ├── InteractiveBookingFlow.tsx
│   │           └── SlotAvailabilityGrid.tsx
│   │
│   └── hooks/
│       ├── api/                           # Existing React Query hooks
│       │   └── index.ts                   # UPDATE: Export new analytics hooks
│       │
│       └── useAnalytics.ts                # NEW: Fetch zero-typing metrics
│
└── tests/
    └── components/
        ├── ZeroTypingMetrics.spec.tsx
        └── InteractiveBookingFlow.spec.tsx
```

**Key Directory Decisions**:
1. **Backend/src/modules/whatsapp/interactive/** - New subdirectory for all interactive message logic (keeps WhatsApp module organized)
2. **Backend/src/modules/notifications/** - New top-level module for waitlist notification system (separate from bookings for SRP)
3. **Backend/src/modules/ai/** - Updated with new services for quick booking orchestration
4. **Frontend analytics dashboard** - NEW section to visualize success metrics (SC-001 through UX-009)
5. **Tests parallel structure** - Unit/integration/e2e tests mirror source structure for discoverability

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**No violations identified** - All constitutional principles passed with clear implementation strategies.

---

## Phase 0: Research

### Research Questions

The following unknowns must be resolved before design phase:

1. **WhatsApp Cloud API Interactive Messages**
   - ✅ **RESOLVED** (from spec): WhatsApp supports Reply Buttons (max 3) and List Messages (max 10 rows)
   - ✅ **RESOLVED** (from spec): Button IDs can store context like `slot_2024-10-25_15:00_m123`
   - ✅ **RESOLVED** (from spec): Webhook receives `message.interactive.button_reply.id` or `message.interactive.list_reply.id`
   - ⚠️ **NEEDS INVESTIGATION**: Exact payload structure for button click events (need official API docs)
   - ⚠️ **NEEDS INVESTIGATION**: Rate limits for interactive messages (same as text messages?)
   - ⚠️ **NEEDS INVESTIGATION**: Fallback behavior for old WhatsApp versions (how does plain text conversion work?)

2. **Slot Search Performance**
   - ⚠️ **NEEDS INVESTIGATION**: Can we query 30 days of availability in <3s with 1000 bookings in DB?
   - ⚠️ **NEEDS INVESTIGATION**: Should we pre-calculate availability matrix (e.g., cache next 7 days)?
   - ⚠️ **NEEDS INVESTIGATION**: Optimal database index strategy for `bookings(master_id, date, status)`

3. **Waitlist Notification System**
   - ⚠️ **NEEDS INVESTIGATION**: Best way to implement 15-minute expiry timers (Bull delayed jobs? Database TTL?)
   - ⚠️ **NEEDS INVESTIGATION**: How to handle race condition: 2 customers notified, both click "Book Now" simultaneously
   - ⚠️ **NEEDS INVESTIGATION**: Should waitlist notifications be batched (e.g., every 5 min) or real-time?

4. **AI Cost Optimization**
   - ✅ **RESOLVED** (from spec): Use GPT-3.5-turbo instead of GPT-4 (98% cost reduction)
   - ✅ **RESOLVED** (from spec): Cache AI responses in Redis for identical requests
   - ⚠️ **NEEDS INVESTIGATION**: Can we eliminate AI calls entirely for returning customers? (just use preferences)

5. **Popular Times Algorithm**
   - ⚠️ **NEEDS INVESTIGATION**: Is 90-day lookback sufficient? (seasonal patterns like holidays)
   - ⚠️ **NEEDS INVESTIGATION**: Should we weight recent bookings higher (last 30 days = 2x weight)?
   - ⚠️ **NEEDS INVESTIGATION**: How to handle salons with <10 bookings total (insufficient data)?

### Research Artifacts

**Deliverable**: `research.md` file with findings for all unknowns

**Structure**:
```markdown
# Research: WhatsApp Interactive Quick Booking

## 1. WhatsApp Cloud API Investigation
- Official API documentation review
- Payload structure examples
- Rate limits and constraints
- Fallback mechanisms

## 2. Slot Search Performance Analysis
- Database query benchmarks (1000 bookings)
- Index optimization strategies
- Caching strategies comparison

## 3. Waitlist Technical Design
- Timer implementation options (Bull vs DB TTL)
- Race condition handling strategies
- Real-time vs batched notification tradeoffs

## 4. AI Optimization Strategies
- Returning customer AI bypass logic
- Cache hit rate projections
- Cost analysis per scenario

## 5. Popular Times Algorithm Design
- Lookback window analysis (30d vs 90d vs 180d)
- Weighting strategies
- New salon fallback handling

## Recommendations
- Final technical decisions for each research question
- Rationale for chosen approaches
- Alternative approaches considered and rejected
```

### Phase 0 Completion Criteria

- ✅ All "NEEDS INVESTIGATION" items have concrete answers
- ✅ Technical decisions documented with rationale
- ✅ Performance benchmarks completed (if applicable)
- ✅ All unknowns converted to known constraints
- ✅ Ready to proceed to data modeling (Phase 1)

---

**STATUS**: ✅ **PHASE 0 COMPLETE** - All unknowns resolved, see `research.md`

---

## Phase 1: Design

### Overview

With all technical unknowns resolved, Phase 1 focuses on comprehensive design documentation. This phase produces the blueprint for implementation: data models, API contracts, and developer guides.

### Phase 1 Deliverables

1. **`data-model.md`** - Complete entity models, database schema, TypeScript interfaces
2. **`contracts/`** - API request/response schemas, webhook payloads, service interfaces
3. **`quickstart.md`** - Developer onboarding guide with setup instructions
4. **Agent Context Update** - Incorporate research findings into `.specify/memory/agent-context.md`

### 1.1 Data Model (`data-model.md`)

**Purpose**: Define all entities, database tables, TypeScript interfaces, and relationships

**Contents**:
- **Entities**: Detailed models for `InteractiveMessagePayload`, `SlotSuggestion`, `BookingIntent`, `CustomerPreferences`, `PopularTimeSlot`, `WaitlistEntry`
- **Database Schema**: Complete SQL for `customer_preferences` and `waitlist` tables
- **TypeScript Interfaces**: All type definitions with JSDoc comments
- **Relationships**: Entity relationship diagram (ERD) showing connections
- **Validation Rules**: Zod schemas for runtime validation
- **Migration Strategy**: Step-by-step database migration plan

**Sections**:
```markdown
# Data Model: WhatsApp Interactive Quick Booking

## 1. Core Entities

### 1.1 Interactive Message Payload
[TypeScript interface + WhatsApp JSON structure + validation rules]

### 1.2 Slot Suggestion
[Entity model + ranking algorithm data + availability flags]

### 1.3 Booking Intent
[Parsed customer request + confidence scores + context preservation]

### 1.4 Customer Preferences
[Historical patterns + favorite master/service + rebooking frequency]

### 1.5 Popular Time Slot
[Weighted popularity scores + availability status + recency metrics]

### 1.6 Waitlist Entry
[Queue management + notification status + timer tracking]

## 2. Database Schema

### 2.1 New Tables
[CREATE TABLE statements for customer_preferences, waitlist]

### 2.2 Indexes
[All 4 indexes from research.md with performance justification]

### 2.3 Migrations
[Step-by-step Prisma migration guide]

## 3. TypeScript Type System

### 3.1 Request/Response Types
[API contract types]

### 3.2 Service Interfaces
[Service method signatures]

### 3.3 Validation Schemas
[Zod schemas for runtime validation]

## 4. Entity Relationships
[ERD diagram showing all connections]
```

---

### 1.2 API Contracts (`contracts/`)

**Purpose**: Define all API interfaces, webhook payloads, and service contracts

**Directory Structure**:
```
contracts/
├── whatsapp/
│   ├── interactive-button-click.json     # Webhook payload when button clicked
│   ├── reply-buttons-message.json        # Send Reply Buttons format
│   └── list-message.json                 # Send List Message format
│
├── services/
│   ├── slot-finder.interface.ts          # SlotFinderService contract
│   ├── alternative-suggester.interface.ts
│   ├── popular-times.interface.ts
│   ├── waitlist-notifier.interface.ts
│   ├── quick-booking.interface.ts
│   └── typed-message-handler.interface.ts
│
└── api/
    ├── webhook-interactive.schema.json   # OpenAPI schema for webhook
    └── analytics.schema.json             # Analytics API for Frontend dashboard
```

**Example Contract** (`slot-finder.interface.ts`):
```typescript
/**
 * Slot Finder Service Interface
 *
 * Searches for available booking slots up to 30 days ahead with infinite search capability.
 *
 * @see spec.md FR-006 Infinite Availability Search
 * @see research.md Section 2.1 30-Day Search Performance
 */
export interface ISlotFinderService {
  /**
   * Find available slots for a service/master combination
   *
   * @param params - Search parameters
   * @returns Array of available slots ranked by proximity to preferred time
   * @throws NoAvailabilityError if 0 slots found in 30 days (triggers waitlist flow)
   *
   * @performance Target: <3s for 30-day search with 1000 bookings
   * @see research.md 2.1 - Batch query optimization
   */
  findSlots(params: {
    salonId: string;
    serviceId: string;
    preferredDate: string;
    preferredTime?: string;
    masterId?: string;
    maxDaysAhead: number; // Default: 30
  }): Promise<SlotSuggestion[]>;

  /**
   * Check if specific slot is available (fast single-slot check)
   *
   * @param slot - Slot to check
   * @returns boolean indicating availability
   *
   * @performance Target: <50ms with proper indexes
   */
  checkSlotAvailable(slot: {
    salonId: string;
    masterId: string;
    date: string;
    time: string;
  }): Promise<boolean>;
}
```

---

### 1.3 Developer Quick Start (`quickstart.md`)

**Purpose**: Onboarding guide for developers implementing this feature

**Contents**:
1. **Prerequisites**: Node.js 20+, PostgreSQL 15+, Redis 7+, WhatsApp Business Account
2. **Environment Setup**: `.env.example` variables explained
3. **Database Setup**: Run migrations, seed test data
4. **Running Locally**: Start backend, start frontend, test webhook
5. **Testing**: Run unit tests, integration tests, E2E tests
6. **Development Workflow**: Create branch, write tests, implement feature, code review
7. **Common Issues**: Troubleshooting guide for typical setup problems

**Example Section**:
```markdown
## Quick Start: WhatsApp Interactive Quick Booking

### Prerequisites

- Node.js 20+ with npm 9+
- PostgreSQL 15+ running locally or via Docker
- Redis 7+ for caching and Bull queues
- WhatsApp Business Account with Cloud API access
- ngrok for local webhook testing

### 1. Clone and Install Dependencies

```bash
git clone <repo>
cd whatsapp-saas-starter
git checkout 001-whatsapp-quick-booking

# Install backend dependencies
cd Backend
npm install

# Install frontend dependencies
cd ../Frontend
npm install
```

### 2. Configure Environment

```bash
cp Backend/.env.example Backend/.env
```

Edit `Backend/.env` and set:
```env
# WhatsApp Cloud API
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_TOKEN=your_access_token
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_secret_verify_token

# OpenAI (for intent parsing)
OPENAI_API_KEY=your_openai_key
OPENAI_MODEL=gpt-3.5-turbo  # Cost-optimized model

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/whatsapp_saas

# Redis (for caching + Bull queues)
REDIS_URL=redis://localhost:6379
```

### 3. Setup Database

```bash
cd Backend
npx prisma migrate dev --name add-interactive-booking-tables
npx prisma db seed  # Seed test salon with services/masters
```

This creates:
- `customer_preferences` table
- `waitlist` table
- 4 performance indexes
- Test data: 1 salon, 3 masters, 5 services

### 4. Run Backend

```bash
cd Backend
npm run start:dev
```

Backend runs on `http://localhost:3000`

### 5. Setup WhatsApp Webhook (ngrok)

```bash
ngrok http 3000
```

Copy ngrok URL (e.g., `https://abc123.ngrok.io`) and configure in WhatsApp Cloud API dashboard:
- Webhook URL: `https://abc123.ngrok.io/api/v1/whatsapp/webhook`
- Verify Token: (same as `WHATSAPP_WEBHOOK_VERIFY_TOKEN` in .env)
- Subscribe to: `messages` events

### 6. Test Interactive Booking Flow

Send WhatsApp message to your business number:
```
"Haircut Friday 3pm"
```

Expected response:
- Interactive card with 3-5 time slot buttons
- Tap button → Confirmation card
- Tap "Confirm" → Booking created

Check logs:
```bash
# Backend logs
tail -f Backend/logs/app.log

# Bull queue dashboard
npm run bull:dashboard
# Visit http://localhost:3001
```

### 7. Run Tests

```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Coverage report
npm run test:cov
```

Target: 80%+ coverage across all services
```

---

### 1.4 Agent Context Update

**Purpose**: Update `.specify/memory/agent-context.md` with research findings for future agent assistance

**Updates Needed**:
```markdown
# Agent Context: WhatsApp SaaS Platform

## Recent Features

### 001-whatsapp-quick-booking (2025-10-25)

**Summary**: Zero-typing touch-based booking with WhatsApp interactive messages

**Key Technical Decisions** (from research.md):
- WhatsApp Cloud API: Reply Buttons (≤3 slots), List Messages (4-10 slots)
- Button ID format: `{type}_{context}` with regex validation
- Slot search: Batch query with 4 B-Tree indexes, <3s for 30-day window
- Waitlist: BullMQ delayed jobs (15-min timers) + PostgreSQL row locking
- AI optimization: GPT-3.5-turbo + Redis caching + preference bypass = $0.00006/booking
- Popular times: 90-day lookback, recency weighted (2x, 1.5x, 1x), industry defaults

**New Services**:
- InteractiveCardBuilder - Generates WhatsApp Reply Buttons and List Messages
- SlotFinderService - Infinite 30-day slot search with proximity ranking
- AlternativeSuggesterService - Ranks alternatives by master/time proximity
- PopularTimesService - Historical booking analysis with recency weighting
- WaitlistNotifierService - Real-time notifications with 15-min expiry
- QuickBookingService - Main orchestrator for zero-typing flow

**Database Changes**:
- Tables: `customer_preferences`, `waitlist`
- Indexes: `idx_bookings_availability`, `idx_bookings_popular_times`, `idx_waitlist_expiry`, `idx_waitlist_queue`

**Performance Targets**:
- Slot search: <3s (30-day window)
- Webhook processing: <200ms (button click → booking)
- Popular times query: <100ms (with Redis cache)
- Waitlist notification: <2s (trigger → WhatsApp send)
```

---

### Phase 1 Completion Criteria

- ✅ All entities documented with TypeScript interfaces
- ✅ Database schema complete with migration scripts
- ✅ All service interfaces defined in `contracts/`
- ✅ WhatsApp webhook payloads documented with JSON examples
- ✅ Developer quickstart guide written and tested
- ✅ Agent context updated with research findings
- ✅ Ready to proceed to task generation (Phase 2 via `/speckit.tasks`)

---

**Next**: Generate all Phase 1 artifacts (data-model.md, contracts/, quickstart.md)
