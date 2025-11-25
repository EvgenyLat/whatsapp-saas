# Tasks: WhatsApp Touch-Based Quick Booking

**Input**: Design documents from `/specs/001-whatsapp-quick-booking/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Feature Branch**: `001-whatsapp-quick-booking`
**Tech Stack**: TypeScript 5.x, NestJS 10.x, Next.js 14+, Prisma ORM 5.x, PostgreSQL 15+, Redis 7+, Bull 4.x
**Tests**: TDD workflow mandated - tests MUST be written BEFORE implementation

**Organization**: Tasks grouped by user story for independent implementation and testing.

---

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story label (US1, US2, etc.) for traceability
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and dependency setup

- [ ] T001 Create project structure per plan.md (Backend/src/modules structure)
- [ ] T002 Install dependencies: OpenAI SDK 4.x, date-fns 3.x, Bull 4.x to Backend/package.json
- [ ] T003 [P] Configure TypeScript strict mode and linting rules in Backend/tsconfig.json
- [ ] T004 [P] Setup Jest test configuration in Backend/jest.config.js
- [ ] T005 [P] Configure environment variables in Backend/.env.example (add WHATSAPP_INTERACTIVE_ENABLED, MAX_SLOT_SEARCH_DAYS, WAITLIST_ENABLED)

**Checkpoint**: Project structure and dependencies ready

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story implementation

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Database & Schema

- [ ] T006 Create database migration for customer_preferences table in Backend/prisma/migrations/
- [ ] T007 Create database migration for waitlist table in Backend/prisma/migrations/
- [ ] T008 Add 4 performance indexes (idx_bookings_availability, idx_bookings_popular_times, idx_waitlist_expiry, idx_waitlist_queue) in Backend/prisma/migrations/
- [ ] T009 Update Prisma schema with customer_preferences and waitlist models in Backend/prisma/schema.prisma
- [ ] T010 [P] Generate Prisma client types by running npx prisma generate

### WhatsApp Core Integration

- [ ] T011 Create WhatsApp types file Backend/src/types/whatsapp.types.ts with InteractiveMessagePayload, ButtonClickPayload, ListReplyPayload interfaces
- [ ] T012 Update webhook handler in Backend/src/modules/whatsapp/webhook.service.ts to add interactive message type support (case 'interactive')
- [ ] T013 [P] Add button ID validation regex utility function in Backend/src/utils/button-id-validator.ts

### Shared Services & Infrastructure

- [ ] T014 Create InteractiveCardBuilder service in Backend/src/modules/whatsapp/interactive/interactive-message.builder.ts
- [ ] T015 Create button ID parsing utility in Backend/src/modules/whatsapp/interactive/button-parser.service.ts
- [ ] T016 [P] Setup Bull queue configuration for waitlist notifications in Backend/src/modules/notifications/queue.config.ts
- [ ] T017 [P] Create translation constants file Backend/src/modules/whatsapp/interactive/translations.ts for 5 languages (EN, RU, ES, PT, HE)

### Testing Infrastructure

- [ ] T018 Setup Supertest for integration tests in Backend/tests/setup.ts
- [ ] T019 Create test database seed script in Backend/prisma/seed.ts with salon, masters, services test data
- [ ] T020 [P] Setup WhatsApp webhook mock server for testing in Backend/tests/mocks/whatsapp-api.mock.ts

**Checkpoint**: Foundation complete - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Zero-Typing Touch-Based Booking (Priority: P1) 🎯 MVP

**Goal**: Customer books appointment by TAPPING buttons (not typing), completing booking in <30 seconds with 1 message + 2-3 taps

**Independent Test**: Customer sends "Haircut Friday 3pm" → Bot responds with Interactive Card (3-5 time slot buttons) → Customer taps slot → Customer taps "Confirm" → Booking created. Verify: 1 typed message + 2 button taps = booking confirmed.

**Success Criteria**: SC-001 (95%+ zero typing), SC-002 (avg 2-3 taps), SC-003 (<30s booking time)

### Tests for User Story 1 (Write FIRST, ensure FAIL before implementation)

- [ ] T021 [P] [US1] Contract test for interactive webhook payload in Backend/tests/contract/whatsapp-interactive-webhook.spec.ts
- [ ] T022 [P] [US1] Integration test for zero-typing booking flow in Backend/tests/integration/zero-typing-booking.spec.ts
- [ ] T023 [P] [US1] E2E test for "Haircut Friday 3pm" → button taps → booking confirmed in Backend/tests/e2e/zero-typing-booking.e2e.spec.ts

### Implementation for User Story 1

- [ ] T024 [P] [US1] Create IntentParserService in Backend/src/modules/ai/intent-parser.service.ts
- [ ] T025 [P] [US1] Create QuickBookingService (main orchestrator) in Backend/src/modules/ai/quick-booking.service.ts
- [ ] T026 [US1] Implement handleBookingRequest() method in QuickBookingService (parse intent → find slots → build card → send)
- [ ] T027 [US1] Add buildSlotSelectionCard() method in InteractiveCardBuilder (decide Reply Buttons vs List Message based on slot count)
- [ ] T028 [US1] Create slot selection card template in Backend/src/modules/whatsapp/interactive/card-templates/slot-selection.template.ts
- [ ] T029 [US1] Create confirmation card template in Backend/src/modules/whatsapp/interactive/card-templates/confirmation.template.ts
- [ ] T030 [US1] Implement handleButtonClick() in QuickBookingService (parse button ID → route to handler)
- [ ] T031 [US1] Add button click handler for slot selection in Backend/src/modules/whatsapp/interactive/button-handler.service.ts
- [ ] T032 [US1] Add button click handler for booking confirmation in Backend/src/modules/whatsapp/interactive/button-handler.service.ts
- [ ] T033 [US1] Update WhatsApp service to send interactive messages in Backend/src/modules/whatsapp/whatsapp.service.ts
- [ ] T034 [US1] Add logging for US1 operations (track typing count, tap count, booking time) in QuickBookingService

**Checkpoint**: User Story 1 complete - zero-typing booking flow functional and testable independently

---

## Phase 4: User Story 2 - Never-Ending Alternative Suggestions (Priority: P1)

**Goal**: Bot ALWAYS finds available time even weeks ahead, ensuring 100% conversation completion rate (booking, waitlist, or call-salon)

**Independent Test**: Configure test salon with Friday fully booked → Customer requests "Friday 3pm" → Bot shows "Friday booked" + next 5 available slots from Sat/Sun with buttons → Customer can book alternative. Verify: No dead-end conversations.

**Success Criteria**: SC-004 (0% dead-ends), SC-005 (80%+ accept first 3 cards), SC-006 (<2% need call salon)

### Tests for User Story 2

- [ ] T035 [P] [US2] Contract test for slot search with 30-day lookahead in Backend/tests/contract/slot-finder.spec.ts
- [ ] T036 [P] [US2] Integration test for "no availability" → waitlist/call-salon escalation in Backend/tests/integration/never-ending-alternatives.spec.ts
- [ ] T037 [P] [US2] Unit test for infinite slot search algorithm in Backend/tests/unit/slot-finder.service.spec.ts

### Implementation for User Story 2

- [ ] T038 [P] [US2] Create SlotFinderService in Backend/src/modules/bookings/slot-finder.service.ts
- [ ] T039 [US2] Implement findSlots() method with 30-day infinite search in SlotFinderService
- [ ] T040 [US2] Implement getWorkingHours() method (parse master.working_hours field) in SlotFinderService
- [ ] T041 [US2] Implement calculateFreeSlots() method (working hours - booked slots) in SlotFinderService
- [ ] T042 [US2] Add checkSlotAvailable() method for single-slot fast check in SlotFinderService
- [ ] T043 [US2] Create NoAvailabilityError exception in Backend/src/modules/bookings/exceptions/no-availability.error.ts
- [ ] T044 [US2] Create alternatives card template in Backend/src/modules/whatsapp/interactive/card-templates/alternatives.template.ts
- [ ] T045 [US2] Create waitlist/escalation card template in Backend/src/modules/whatsapp/interactive/card-templates/waitlist.template.ts
- [ ] T046 [US2] Add [See More Times] button pagination logic in QuickBookingService
- [ ] T047 [US2] Add [Call Salon] and [Join Waitlist] escalation buttons in QuickBookingService
- [ ] T048 [US2] Integrate SlotFinderService with QuickBookingService handleBookingRequest()

**Checkpoint**: User Story 2 complete - infinite slot search ensures 100% conversation completion

---

## Phase 5: User Story 3 - Smart Alternative Ranking Algorithm (Priority: P1)

**Goal**: Bot ranks alternatives by proximity to requested time (same master +1000, <1h +500, same day +200 scoring)

**Independent Test**: Customer requests "Friday 3pm with Sarah" when 3pm booked → Verify ranking: (1) Fri 2pm Sarah, (2) Fri 4pm Sarah, (3) Thu 3pm Sarah, (4) Sat 3pm Sarah, (5) Fri 3pm Alex

**Success Criteria**: SC-007 (80%+ select from first 3 slots), SC-008 (avg 1.2 cards viewed), SC-009 (70%+ ±1h match)

### Tests for User Story 3

- [ ] T049 [P] [US3] Unit test for proximity scoring algorithm in Backend/tests/unit/alternative-suggester.service.spec.ts
- [ ] T050 [P] [US3] Integration test for alternative ranking accuracy in Backend/tests/integration/alternative-ranking.spec.ts

### Implementation for User Story 3

- [ ] T051 [P] [US3] Create AlternativeSuggesterService in Backend/src/modules/bookings/alternative-suggester.service.ts
- [ ] T052 [US3] Implement rankSlots() method with proximity scoring algorithm in AlternativeSuggesterService
- [ ] T053 [US3] Implement calculateProximityScore() method (master match, time proximity, day match) in AlternativeSuggesterService
- [ ] T054 [US3] Implement labelProximity() method ('exact', 'close', 'same-day', 'same-week', 'alternative') in AlternativeSuggesterService
- [ ] T055 [US3] Add ⭐ marker for top 3 ranked slots in slot selection card template
- [ ] T056 [US3] Integrate AlternativeSuggesterService with QuickBookingService (rank slots before showing card)

**Checkpoint**: User Story 3 complete - smart ranking prioritizes best matches first

---

## Phase 6: User Story 4 - Interactive Multi-Step Button Navigation (Priority: P1)

**Goal**: Customer navigates entire flow using ONLY button taps (time slots, confirmation, See More, Different Day, Next Week buttons)

**Independent Test**: Customer sends "Haircut" (1 typed message) → Tap time slot → Tap "Confirm" → Booking created. Verify: Total typing = 1 message, total taps = 2.

**Success Criteria**: SC-010 (100% use buttons after initial message), SC-011 (avg 2.5 taps), SC-012 (<1% revert to typing)

### Tests for User Story 4

- [ ] T057 [P] [US4] Integration test for navigation buttons ([See More], [Different Day], [Next Week]) in Backend/tests/integration/button-navigation.spec.ts
- [ ] T058 [P] [US4] E2E test for multi-page slot browsing via buttons in Backend/tests/e2e/button-navigation.e2e.spec.ts

### Implementation for User Story 4

- [ ] T059 [P] [US4] Add navigation button types to button ID schema (nav_see_more, nav_different_day, nav_next_week) in button-parser.service.ts
- [ ] T060 [US4] Implement [See More Times] button handler in button-handler.service.ts
- [ ] T061 [US4] Implement [Different Day] button handler (show different day's slots) in button-handler.service.ts
- [ ] T062 [US4] Implement [Next Week] button handler (jump 7 days ahead) in button-handler.service.ts
- [ ] T063 [US4] Add [Change Time] button to confirmation card template
- [ ] T064 [US4] Implement [Change Time] button handler (return to slot selection) in button-handler.service.ts
- [ ] T065 [US4] Add button interaction tracking (count taps per booking) in QuickBookingService

**Checkpoint**: User Story 4 complete - full navigation via buttons without typing

---

## Phase 7: User Story 5 - WhatsApp Native Interactive Messages (Priority: P1)

**Goal**: Use WhatsApp Cloud API Interactive Messages (Reply Buttons for ≤3 slots, List Messages for 4-10 slots) with native mobile UI

**Independent Test**: Send booking request → Verify webhook receives Interactive Message → Bot sends Reply Buttons for ≤3 slots → Bot sends List Message for 4-10 slots → Customer taps → Verify webhook receives button_reply event → Booking processed.

**Success Criteria**: SC-013 (99%+ render correctly), SC-014 (85%+ use interactive vs fallback), SC-015 (<200ms webhook processing)

### Tests for User Story 5

- [ ] T066 [P] [US5] Contract test for Reply Buttons format in Backend/tests/contract/reply-buttons.spec.ts
- [ ] T067 [P] [US5] Contract test for List Message format in Backend/tests/contract/list-message.spec.ts
- [ ] T068 [P] [US5] Integration test for webhook button_reply event handling in Backend/tests/integration/webhook-button-click.spec.ts
- [ ] T069 [P] [US5] Integration test for fallback to plain text (numeric replies) in Backend/tests/integration/fallback-numeric-reply.spec.ts

### Implementation for User Story 5

- [ ] T070 [P] [US5] Implement buildReplyButtonsCard() method (≤3 slots) in InteractiveCardBuilder
- [ ] T071 [P] [US5] Implement buildListMessageCard() method (4-10 slots, grouped by day) in InteractiveCardBuilder
- [ ] T072 [US5] Add card type selection logic (slot count → Reply Buttons vs List Message) in buildSlotSelectionCard()
- [ ] T073 [US5] Implement groupByDay() helper method for List Message sections in InteractiveCardBuilder
- [ ] T074 [US5] Add webhook signature verification in Backend/src/modules/whatsapp/webhook.service.ts
- [ ] T075 [US5] Implement handleInteractiveMessage() in webhook.service.ts (parse button_reply and list_reply)
- [ ] T076 [US5] Add fallback parser for numeric replies ("1", "2", "3") in webhook.service.ts
- [ ] T077 [US5] Store pending button context in Redis (5-min TTL) for fallback handling in Backend/src/modules/whatsapp/interactive/context-store.service.ts
- [ ] T078 [US5] Add WhatsApp API retry logic with exponential backoff for 429 errors in whatsapp.service.ts

**Checkpoint**: User Story 5 complete - WhatsApp interactive messages with native UI and fallback

---

## Phase 8: User Story 6 - Single Master/Service Auto-Skip (Priority: P2)

**Goal**: Salons with 1 master or 1 service skip unnecessary questions, reducing booking to 1 tap

**Independent Test**: Configure test salon with 1 master (Sarah) and 1 service (Haircut $50) → Customer sends "I want to book" → Bot skips service/master selection → Shows "When would you like haircut with Sarah?" + 6 time buttons → Customer taps → Booking created in 1 tap.

**Success Criteria**: SC-016 (single-master = 1 tap vs 3-4 taps), SC-017 (50% message reduction for small salons)

### Tests for User Story 6

- [ ] T079 [P] [US6] Unit test for single master detection in Backend/tests/unit/context-detector.service.spec.ts
- [ ] T080 [P] [US6] Integration test for auto-skip flow (1 master + 1 service) in Backend/tests/integration/single-master-auto-skip.spec.ts

### Implementation for User Story 6

- [ ] T081 [P] [US6] Create ContextDetectorService in Backend/src/modules/ai/context-detector.service.ts
- [ ] T082 [US6] Implement detectSingleMaster() method (check salon masters count) in ContextDetectorService
- [ ] T083 [US6] Implement detectSingleService() method (check salon services count) in ContextDetectorService
- [ ] T084 [US6] Add auto-detection logic in QuickBookingService handleBookingRequest() (call ContextDetectorService before AI parse)
- [ ] T085 [US6] Update intent parsing to pre-fill masterId if single master detected
- [ ] T086 [US6] Update intent parsing to pre-fill serviceId if single service detected
- [ ] T087 [US6] Add contextual message "When would you like [SERVICE] with [MASTER]?" for auto-skip scenarios

**Checkpoint**: User Story 6 complete - single master/service salons achieve 1-tap bookings

---

## Phase 9: User Story 7 - Returning Customer Fast-Track (Priority: P2)

**Goal**: Bot remembers customer preferences (favorite master, service, time) and suggests "Book Your Usual" for 1-tap rebooking

**Independent Test**: Create customer with 3 past bookings (all Friday 3pm, Haircut, Sarah) → Customer sends "I want haircut" → Bot responds "Welcome back! Book your usual? Haircut with Sarah, Friday 3pm [Book Now ⭐]" → Customer taps [Book Now] → Booking created in 1 tap.

**Success Criteria**: SC-018 (60%+ returning customers use "usual"), SC-019 (40%+ accept proactive rebooking)

### Tests for User Story 7

- [ ] T088 [P] [US7] Unit test for preference tracking algorithm in Backend/tests/unit/preference-tracker.service.spec.ts
- [ ] T089 [P] [US7] Integration test for "Book Your Usual" fast-track in Backend/tests/integration/returning-customer-fast-track.spec.ts

### Implementation for User Story 7

- [ ] T090 [P] [US7] Create PreferenceTrackerService in Backend/src/modules/bookings/preference-tracker.service.ts
- [ ] T091 [US7] Implement trackBookingPreferences() method (analyze past bookings → extract patterns) in PreferenceTrackerService
- [ ] T092 [US7] Implement calculateFavoriteMaster() method (most frequently booked) in PreferenceTrackerService
- [ ] T093 [US7] Implement calculateFavoriteService() method (most frequently booked) in PreferenceTrackerService
- [ ] T094 [US7] Implement calculatePreferredDayTime() method (day of week, hour patterns) in PreferenceTrackerService
- [ ] T095 [US7] Implement calculateRebookingFrequency() method (avg days between bookings) in PreferenceTrackerService
- [ ] T096 [US7] Add isReturningCustomer() check (≥3 past bookings) in QuickBookingService
- [ ] T097 [US7] Add getUsualPreferences() method in QuickBookingService (retrieve customer_preferences record)
- [ ] T098 [US7] Create "Book Your Usual" card template with pre-filled booking info in Backend/src/modules/whatsapp/interactive/card-templates/book-usual.template.ts
- [ ] T099 [US7] Add returning customer fast-track logic in handleBookingRequest() (check returning → show usual vs parse intent)
- [ ] T100 [US7] Implement [Book Now ⭐] button handler for "usual" booking in button-handler.service.ts
- [ ] T101 [US7] Create proactive rebooking cron job in Backend/src/modules/notifications/proactive-rebooking.job.ts
- [ ] T102 [US7] Schedule proactive rebooking job with Bull (run daily, check avgRebookingDays - 3) in Backend/src/modules/notifications/queue.config.ts

**Checkpoint**: User Story 7 complete - returning customers can book in 1 tap via "usual" suggestion

---

## Phase 10: User Story 8 - Multi-Language Interactive Support (Priority: P3)

**Goal**: Interactive messages render in customer's language (EN, RU, ES, PT, HE) with localized formatting (24h time, DD.MM.YYYY dates, RTL for Hebrew)

**Independent Test**: Send Russian message "Стрижка завтра" → Bot detects Russian → Bot responds with Russian interactive card "Доступное время:" + buttons "14:00 - Сара" + [Подтвердить] → Verify all labels in Russian, 24h time, DD.MM.YYYY dates.

**Success Criteria**: SC-020 (multi-language cards render correctly in all 5 languages)

### Tests for User Story 8

- [ ] T103 [P] [US8] Integration test for Russian language interactive card in Backend/tests/integration/multi-language-russian.spec.ts
- [ ] T104 [P] [US8] Integration test for Hebrew RTL layout in Backend/tests/integration/multi-language-hebrew.spec.ts
- [ ] T105 [P] [US8] Integration test for Spanish date formatting in Backend/tests/integration/multi-language-spanish.spec.ts

### Implementation for User Story 8

- [ ] T106 [P] [US8] Add translation constants for button labels in all 5 languages in translations.ts
- [ ] T107 [P] [US8] Create date/time formatting utility with language-specific formats in Backend/src/utils/datetime-formatter.ts
- [ ] T108 [US8] Implement formatTime() method (12h for EN, 24h for RU/ES/PT/HE) in datetime-formatter.ts
- [ ] T109 [US8] Implement formatDate() method (MM/DD/YYYY for EN, DD.MM.YYYY for RU, DD/MM/YYYY for ES/PT/HE) in datetime-formatter.ts
- [ ] T110 [US8] Add language detection in IntentParserService (detect from first message text)
- [ ] T111 [US8] Update all card templates to use translations[language] lookups
- [ ] T112 [US8] Add RTL layout flag for Hebrew in InteractiveCardBuilder
- [ ] T113 [US8] Test rendering for all 5 languages with native speaker review

**Checkpoint**: User Story 8 complete - multi-language support for interactive cards

---

## Phase 11: Advanced Features - Waitlist Notification System

**Purpose**: Implement waitlist with 15-minute expiry timers for full "never dead-end" experience

**Note**: This is cross-cutting functionality supporting User Story 2 (Never-Ending Alternatives)

### Tests for Waitlist System

- [ ] T114 [P] Unit test for 15-minute expiry timer in Backend/tests/unit/waitlist-notifier.service.spec.ts
- [ ] T115 [P] Integration test for race condition handling (2 customers, 1 slot) in Backend/tests/integration/waitlist-race-condition.spec.ts
- [ ] T116 [P] E2E test for full waitlist flow (join → notify → book) in Backend/tests/e2e/waitlist-notification.e2e.spec.ts

### Implementation for Waitlist System

- [ ] T117 [P] Create WaitlistService in Backend/src/modules/bookings/waitlist.service.ts
- [ ] T118 [P] Create WaitlistNotifierService in Backend/src/modules/notifications/waitlist-notifier.service.ts
- [ ] T119 [P] Create NotificationSchedulerService in Backend/src/modules/notifications/notification-scheduler.service.ts
- [ ] T120 [US2] Implement add() method (customer joins waitlist) in WaitlistService
- [ ] T121 [US2] Implement notifyWaitlistOfOpening() method (send WhatsApp notification) in WaitlistNotifierService
- [ ] T122 [US2] Implement handleWaitlistBooking() with PostgreSQL FOR UPDATE row locking in WaitlistNotifierService
- [ ] T123 [US2] Implement handleWaitlistPass() method (customer clicks [Pass]) in WaitlistNotifierService
- [ ] T124 [US2] Implement handleWaitlistExpiry() method (15-min timer callback) in WaitlistNotifierService
- [ ] T125 [US2] Add waitlist expiry processor in Backend/src/modules/notifications/processors/waitlist-expiry.processor.ts
- [ ] T126 [US2] Schedule 15-minute expiry job with Bull delayed jobs in NotificationSchedulerService
- [ ] T127 [US2] Add waitlist notification buttons ([Book Now], [Pass]) to waitlist card template
- [ ] T128 [US2] Implement [Book Now] button handler for waitlist in button-handler.service.ts
- [ ] T129 [US2] Implement [Pass] button handler for waitlist in button-handler.service.ts
- [ ] T130 [US2] Add slot conflict error handling (show alternatives if slot already booked) in WaitlistNotifierService

**Checkpoint**: Waitlist system complete with 15-min expiry and race condition handling

---

## Phase 12: Advanced Features - Popular Times Suggestion

**Purpose**: Implement "anytime" → popular times suggestion based on 90-day booking history

**Note**: This enhances User Story 3 (Smart Alternative Ranking)

### Tests for Popular Times

- [ ] T131 [P] Unit test for 90-day recency-weighted query in Backend/tests/unit/popular-times.service.spec.ts
- [ ] T132 [P] Integration test for new salon fallback (default times) in Backend/tests/integration/popular-times-default.spec.ts

### Implementation for Popular Times

- [ ] T133 [P] Create PopularTimesService in Backend/src/modules/bookings/popular-times.service.ts
- [ ] T134 [US3] Implement getPopularTimes() method with 90-day SQL query in PopularTimesService
- [ ] T135 [US3] Add recency weighting (2x for last 30 days, 1.5x for 31-60, 1x for 61-90) in SQL query
- [ ] T136 [US3] Implement getDefaultPopularTimes() method (Friday 2pm/3pm, Saturday 10am/2pm) in PopularTimesService
- [ ] T137 [US3] Add Redis caching for popular times (1-hour TTL) in PopularTimesService
- [ ] T138 [US3] Implement clearCache() method (called after new bookings) in PopularTimesService
- [ ] T139 [US3] Add "anytime" pattern detection in IntentParserService
- [ ] T140 [US3] Create popular times card template showing weighted scores in Backend/src/modules/whatsapp/interactive/card-templates/popular-times.template.ts
- [ ] T141 [US3] Integrate PopularTimesService with QuickBookingService (if "anytime" → show popular times)

**Checkpoint**: Popular times suggestion complete with historical data analysis

---

## Phase 13: Advanced Features - Typed Message Handling After Buttons

**Purpose**: Gracefully handle typed messages after buttons shown (e.g., "Actually Saturday" when Friday slots displayed)

**Note**: This enhances User Story 4 (Interactive Multi-Step Navigation) with flexibility

### Tests for Typed Message Handling

- [ ] T142 [P] Unit test for preference change detection in Backend/tests/unit/typed-message-handler.service.spec.ts
- [ ] T143 [P] Integration test for context preservation (service/master remembered) in Backend/tests/integration/typed-message-after-buttons.spec.ts

### Implementation for Typed Message Handling

- [ ] T144 [P] Create TypedMessageHandlerService in Backend/src/modules/ai/typed-message-handler.service.ts
- [ ] T145 [US4] Implement handleTypedMessageAfterButtons() method in TypedMessageHandlerService
- [ ] T146 [US4] Implement parseIntentUpdate() method (extract only changed fields) in TypedMessageHandlerService
- [ ] T147 [US4] Implement isPreferenceChange() pattern detection ("Actually", "Different", "Instead") in TypedMessageHandlerService
- [ ] T148 [US4] Add typed message detection in webhook.service.ts (if buttons pending + text message → route to TypedMessageHandlerService)
- [ ] T149 [US4] Merge updated context with existing intent (preserve service, master if not changed) in QuickBookingService
- [ ] T150 [US4] Update slot search with new preferences without restarting entire flow

**Checkpoint**: Typed message handling complete - customers can type updates without breaking button flow

---

## Phase 14: Frontend Analytics Dashboard (Optional - for monitoring success criteria)

**Purpose**: Visualize zero-typing metrics (SC-001 through UX-009) for salon owners

**Note**: This is optional for MVP but recommended for tracking success criteria

### Frontend Implementation

- [ ] T151 [P] Create analytics API endpoint GET /api/v1/analytics/zero-typing-metrics in Backend/src/modules/analytics/analytics.controller.ts
- [ ] T152 [P] Create analytics page in Frontend/src/app/(dashboard)/analytics/page.tsx
- [ ] T153 [P] Create ZeroTypingMetrics component in Frontend/src/app/(dashboard)/analytics/components/ZeroTypingMetrics.tsx
- [ ] T154 [P] Create AlternativeAcceptanceChart component in Frontend/src/app/(dashboard)/analytics/components/AlternativeAcceptanceChart.tsx
- [ ] T155 [P] Create WaitlistConversionChart component in Frontend/src/app/(dashboard)/analytics/components/WaitlistConversionChart.tsx
- [ ] T156 [P] Create useAnalytics hook in Frontend/src/hooks/useAnalytics.ts
- [ ] T157 Fetch and display SC-001 through UX-009 metrics in analytics dashboard

**Checkpoint**: Analytics dashboard complete for monitoring success criteria

---

## Phase 15: Polish & Cross-Cutting Concerns

**Purpose**: Final improvements, documentation, and production readiness

- [ ] T158 [P] Add JSDoc comments to all new service files
- [ ] T159 [P] Create README in Backend/src/modules/whatsapp/interactive/ explaining card builder usage
- [ ] T160 [P] Update OpenAPI spec at Backend/swagger.yaml with interactive webhook schema
- [ ] T161 [P] Add button ID schema documentation to OpenAPI spec
- [ ] T162 [P] Create sequence diagram for waitlist notification flow in docs/
- [ ] T163 Code review: Check all files for TypeScript strict compliance (no `any` types)
- [ ] T164 Security review: Verify button ID validation prevents injection
- [ ] T165 Performance review: Run EXPLAIN ANALYZE on slot search queries, verify <3s target
- [ ] T166 Load test: 100 concurrent slot searches with 1000 bookings in database
- [ ] T167 [P] Run quickstart.md validation (follow setup steps, verify works)
- [ ] T168 Verify all success criteria testable (SC-001 through UX-009 metrics tracked)

**Checkpoint**: Feature production-ready with complete documentation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-10)**: All depend on Foundational phase completion
  - Can proceed in parallel if team capacity allows
  - Recommended: Sequential in priority order (US1 → US2 → US3 → US4 → US5 → US6 → US7 → US8)
- **Advanced Features (Phase 11-13)**: Depend on related user stories
  - Waitlist (Phase 11) depends on US2 foundation
  - Popular Times (Phase 12) depends on US3 foundation
  - Typed Message Handling (Phase 13) depends on US4 foundation
- **Frontend (Phase 14)**: Can start after Backend API endpoints created
- **Polish (Phase 15)**: Depends on all implemented features

### User Story Dependencies

All user stories are independently implementable after Foundational phase:

- **User Story 1 (P1)**: No dependencies on other stories
- **User Story 2 (P1)**: No dependencies on other stories
- **User Story 3 (P1)**: Integrates with US1/US2 but independently testable
- **User Story 4 (P1)**: Integrates with US1 but independently testable
- **User Story 5 (P1)**: Integrates with US1 but independently testable
- **User Story 6 (P2)**: Enhances US1 but independently testable
- **User Story 7 (P2)**: Enhances US1 but independently testable
- **User Story 8 (P3)**: Cross-cutting (all stories) but independently testable

### Within Each User Story

1. Tests FIRST (write → verify FAIL before implementation)
2. Models/entities before services
3. Services before endpoints/controllers
4. Core implementation before integration
5. Story complete before moving to next priority

### Parallel Opportunities

**Within Foundational Phase:**
- T006-T010 (database migrations) can run in sequence
- T011-T013 (WhatsApp types) can run in parallel
- T014-T017 (shared services) can run in parallel
- T018-T020 (testing infrastructure) can run in parallel

**Within Each User Story:**
- All tests marked [P] can run in parallel
- All models marked [P] can run in parallel
- Implementation tasks follow sequential dependency

**Across User Stories (with team capacity):**
- After Foundational phase, different developers can work on US1, US2, US3 simultaneously
- Waitlist (Phase 11) + Popular Times (Phase 12) + Typed Messages (Phase 13) can run in parallel

---

## Parallel Example: User Story 1

```bash
# After Foundational phase complete, launch all User Story 1 tests together:
Task: "Contract test for interactive webhook payload in Backend/tests/contract/whatsapp-interactive-webhook.spec.ts"
Task: "Integration test for zero-typing booking flow in Backend/tests/integration/zero-typing-booking.spec.ts"
Task: "E2E test for 'Haircut Friday 3pm' → button taps → booking in Backend/tests/e2e/zero-typing-booking.e2e.spec.ts"

# Verify all tests FAIL (red) before proceeding

# Then launch parallel implementation tasks:
Task: "Create IntentParserService in Backend/src/modules/ai/intent-parser.service.ts"
Task: "Create QuickBookingService in Backend/src/modules/ai/quick-booking.service.ts"
```

---

## Implementation Strategy

### MVP First (Recommended)

**Minimum Viable Product** = User Story 1 ONLY + Foundational infrastructure

1. Complete **Phase 1: Setup** (T001-T005)
2. Complete **Phase 2: Foundational** (T006-T020) ← CRITICAL BLOCKER
3. Complete **Phase 3: User Story 1** (T021-T034) ← MVP COMPLETE!
4. **STOP and VALIDATE**: Test zero-typing booking flow end-to-end
5. Deploy to staging, demo to stakeholders
6. Proceed to User Story 2-5 (all P1 stories)

**Why this works:**
- User Story 1 alone delivers core value proposition (zero-typing bookings)
- Can validate hypothesis before building full feature set
- Early feedback on WhatsApp interactive UX

### Incremental Delivery (Recommended for Production)

1. **Phase 1 + Phase 2** → Foundation ready
2. **+ User Story 1** → Deploy MVP (zero-typing bookings) ✅
3. **+ User Story 2** → Deploy with infinite search (no dead-ends) ✅
4. **+ User Story 3** → Deploy with smart ranking ✅
5. **+ User Story 4** → Deploy with full navigation ✅
6. **+ User Story 5** → Deploy with native WhatsApp UI ✅
7. **+ User Story 6** → Deploy with single-master optimization ✅
8. **+ User Story 7** → Deploy with returning customer fast-track ✅
9. **+ User Story 8** → Deploy with multi-language support ✅

Each increment adds value without breaking previous functionality.

### Parallel Team Strategy

With 3 developers after Foundational phase:

- **Developer A**: User Story 1 (P1) + User Story 6 (P2)
- **Developer B**: User Story 2 (P1) + Waitlist System (Phase 11)
- **Developer C**: User Story 3 (P1) + Popular Times (Phase 12)

Then convergence: User Story 4, 5, 7, 8 + Polish

---

## Success Criteria Validation

After implementation, verify all success criteria are measurable:

**Zero-Typing Achievement:**
- [ ] SC-001: Track bookings with 0 typing after initial message (target: 95%+)
- [ ] SC-002: Track average taps per booking (target: 2-3)
- [ ] SC-003: Track time from first message to confirmation (target: <30s)

**Never-Ending Alternatives:**
- [ ] SC-004: Track conversation completion rate (target: 100%)
- [ ] SC-005: Track acceptance within first 3 cards (target: 80%+)
- [ ] SC-006: Track call-salon escalation rate (target: <2%)

**Smart Ranking:**
- [ ] SC-007: Track selection from first 3 slots (target: 80%+)
- [ ] SC-008: Track average cards viewed (target: 1.2)
- [ ] SC-009: Track ±1h match acceptance (target: 70%+)

**Interactive Messages:**
- [ ] SC-010: Track button usage after initial message (target: 100%)
- [ ] SC-011: Track average button taps (target: 2.5)
- [ ] SC-012: Track reversion to typing (target: <1%)
- [ ] SC-013: Track interactive card delivery success (target: 99%+)
- [ ] SC-014: Track interactive vs fallback usage (target: 85%+ interactive)
- [ ] SC-015: Track webhook processing time (target: <200ms)

**Optimization:**
- [ ] SC-016: Track single-master tap reduction (target: 1 vs 3-4)
- [ ] SC-017: Track message reduction for small salons (target: 50%)
- [ ] SC-018: Track "usual" booking usage (target: 60%+)
- [ ] SC-019: Track proactive rebooking acceptance (target: 40%+)

**Multi-Language:**
- [ ] SC-020: Manual QA test for all 5 languages (EN, RU, ES, PT, HE)

---

## Notes

- **[P] tasks** = Different files, no dependencies, can run in parallel
- **[Story] label** = Maps task to specific user story for traceability
- **Tests FIRST** = TDD mandated - write tests, verify FAIL, then implement
- **Independent stories** = Each user story should be completable and testable on its own
- **Commit frequently** = After each task or logical group
- **Stop at checkpoints** = Validate story independently before proceeding
- **Avoid** = Vague tasks, same file conflicts, cross-story dependencies that break independence

---

## Total Task Count

- **Phase 1 (Setup)**: 5 tasks
- **Phase 2 (Foundational)**: 15 tasks
- **Phase 3 (US1)**: 14 tasks
- **Phase 4 (US2)**: 14 tasks
- **Phase 5 (US3)**: 8 tasks
- **Phase 6 (US4)**: 9 tasks
- **Phase 7 (US5)**: 13 tasks
- **Phase 8 (US6)**: 9 tasks
- **Phase 9 (US7)**: 15 tasks
- **Phase 10 (US8)**: 11 tasks
- **Phase 11 (Waitlist)**: 17 tasks
- **Phase 12 (Popular Times)**: 11 tasks
- **Phase 13 (Typed Messages)**: 9 tasks
- **Phase 14 (Frontend)**: 7 tasks
- **Phase 15 (Polish)**: 11 tasks

**TOTAL**: 168 tasks

**Estimated Duration**:
- MVP (Phases 1-3): 1-2 weeks
- All P1 Stories (Phases 1-7): 2-3 weeks
- Full Feature (All Phases): 3-4 weeks

---

**READY FOR IMPLEMENTATION** ✅

All tasks are specific, independently executable, and organized by user story for maximum flexibility and testability.
