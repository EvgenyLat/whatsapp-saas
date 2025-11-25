# Feature Specification: WhatsApp Touch-Based Quick Booking

**Feature Branch**: `001-whatsapp-quick-booking`
**Created**: 2025-10-25
**Status**: Draft
**Input**: Zero-typing WhatsApp interactive booking with infinite slot search and "Never Leave Without Booking" principle

---

## 🎯 CORE PRINCIPLE: "Never Let Customer Leave Without Booking!"

Bot ALWAYS guides customer to successful booking. If preferred slots unavailable → show alternatives. If day is busy → show next week. If week is busy → show 2 weeks ahead. **Dialog MUST NOT end without booking!**

---

## 📱 KEY FEATURE: Touch-Based Selection (Zero Typing)

**Customer DOES NOT TYPE - Customer TAPS buttons!**

```
❌ BAD (customer types):
Bot: "What time works for you?"
Customer: "15:00" ← types manually

✅ GOOD (customer taps):
Bot: [Interactive Card with buttons]
     [ 14:00 ] [ 15:00 ] [ 16:00 ]
Customer: *tap on 15:00* ← one touch!
```

**Benefits:**
- ⚡ 5-10x faster
- 🎯 No typos
- 📱 Mobile-friendly
- 🤖 Fewer AI calls (no text parsing needed)

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Zero-Typing Touch-Based Booking (Priority: P1)

Customer books appointment by TAPPING buttons (not typing), completing booking in <30 seconds with minimal effort.

**Why this priority**: ⭐⭐⭐⭐⭐ CRITICAL - This is the core UX differentiator. Competitors require typing, we have tap-and-go! This alone makes the product viable and delivers 10x better experience.

**Independent Test**: Customer sends "Haircut Friday 3pm" → Bot responds with WhatsApp Interactive Card showing 3-5 time slot buttons → Customer taps preferred slot → Customer taps "Confirm Booking" → Booking created. Total: 1 message + 2 taps = DONE. Testable end-to-end independently.

**Acceptance Scenarios**:

1. **Given** customer sends "Haircut Friday 3pm", **When** AI extracts full intent, **Then** bot responds with Interactive Card showing 3-5 time slot BUTTONS (not text list), each button shows time + master name, customer can tap to select without typing
2. **Given** customer taps time slot button, **When** system receives button click, **Then** bot immediately shows confirmation card with booking details and "✅ Confirm Booking" button (no additional typing required)
3. **Given** customer sees confirmation card, **When** customer taps "✅ Confirm Booking", **Then** booking is created instantly and confirmation message sent with booking code
4. **Given** customer completes booking, **When** measuring interaction, **Then** total typing = 1 initial message, total taps = 2-3 buttons, total time ≤30 seconds

**Success Metrics:**
- **SC-001**: 95%+ bookings completed with ZERO typing after initial message
- **SC-002**: Average 2-3 taps per booking (measured from card display to confirmation)
- **SC-003**: <30 seconds from first message to booking confirmation (measured via timestamps)

---

### User Story 2 - Never-Ending Alternative Suggestions (Priority: P1)

Bot ALWAYS finds available time even weeks ahead, ensuring customer never leaves without booking or waitlist signup.

**Why this priority**: ⭐⭐⭐⭐⭐ CRITICAL - Prevents customer loss to competitors. If bot says "sorry, no availability" and ends conversation, customer will book elsewhere. This feature ensures 100% conversion rate.

**Independent Test**: Configure test salon with Friday fully booked → Customer requests "Friday 3pm" → Bot shows "Friday fully booked" BUT immediately displays next 5 available slots from Saturday/Sunday with tap-to-book buttons → Customer can book alternative without leaving conversation. Testable independently.

**Acceptance Scenarios**:

**Scenario 1: Preferred time occupied**
1. **Given** customer wants "Tomorrow 3pm" and 3pm is booked, **When** bot searches alternatives, **Then** bot shows card with: "3pm tomorrow is booked. Close alternatives:" and displays 3 buttons for nearby times (2pm ⭐1h before, 4pm ⭐1h after, 3pm Sunday same time)

**Scenario 2: Entire day occupied**
2. **Given** customer wants "Tomorrow" and entire day is booked, **When** bot searches, **Then** bot shows card: "Tomorrow fully booked. Next available:" with 6 time slot buttons across next 2-3 days, plus [See More Options] button

**Scenario 3: Entire week occupied**
3. **Given** customer wants "This week" and all days booked, **When** bot searches, **Then** bot shows card: "This week fully booked! Next available:" with 6-10 slots from next week grouped by day, plus [See Next Week] button

**Scenario 4: Multiple weeks occupied (rare)**
4. **Given** 2+ weeks fully booked, **When** bot searches 30 days ahead, **Then** bot shows: "Wow, we're popular! 🎉 Earliest availability: Monday Nov 18" with 5 slots, PLUS [Join Waitlist] and [Call Salon] buttons to prevent dead-end

**Scenario 5: Never dead-end**
5. **Given** ANY booking request, **When** conversation ends, **Then** customer MUST have either: (a) confirmed booking, OR (b) joined waitlist, OR (c) received salon phone number to call - NEVER just "sorry, no availability"

**Success Metrics:**
- **SC-004**: 0% conversations end without booking, waitlist, or phone contact (100% conversion)
- **SC-005**: 95%+ customers find acceptable slot within first 3 cards shown
- **SC-006**: <2% customers need to call salon directly (most resolve via waitlist or alternative slots)

---

### User Story 3 - Smart Alternative Ranking Algorithm (Priority: P1)

Bot shows most relevant alternatives first based on proximity to requested time, customer preferences, and master availability.

**Why this priority**: ⭐⭐⭐⭐⭐ CRITICAL - Poor slot ranking frustrates customers. If customer wants Friday 3pm and bot shows Monday 10am first, they'll abandon. Smart ranking increases first-choice acceptance from 30% to 80%.

**Independent Test**: Customer requests "Friday 3pm with Sarah" when 3pm booked → Bot ranks alternatives: (1) Friday 2pm Sarah ⭐, (2) Friday 4pm Sarah ⭐, (3) Thursday 3pm Sarah, (4) Saturday 3pm Sarah, (5) Friday 3pm Alex (different master) → Verify ranking prioritizes same master + close time. Testable independently.

**Acceptance Scenarios**:

1. **Given** customer requests specific time unavailable, **When** bot generates alternatives, **Then** alternatives ranked by: Priority 1 = same day + same master ±1-2h, Priority 2 = same time next day + same master, Priority 3 = same day any master, Priority 4 = same time next week
2. **Given** returning customer with booking history, **When** bot generates alternatives, **Then** bot prioritizes customer's historically preferred times (e.g., if customer always books 3pm, prioritize 3pm slots even if requested 2pm)
3. **Given** alternatives displayed, **When** customer views card, **Then** first 3 slots have ⭐ marker indicating "closest match to your request"

**Success Metrics:**
- **SC-007**: 80%+ customers select from first 3 slots shown (indicates good ranking)
- **SC-008**: Average 1.2 cards viewed before booking (indicates quick match)
- **SC-009**: 70%+ exact or ±1h match acceptance rate (indicates preference accuracy)

---

### User Story 4 - Interactive Multi-Step Button Navigation (Priority: P1)

Customer navigates entire booking flow using ONLY button taps with zero typing after initial request.

**Why this priority**: ⭐⭐⭐⭐⭐ CRITICAL - This is the revolutionary UX. Traditional bots require 5-8 typed messages. We require 1 typed message + 2-3 taps. This 10x improvement makes the product standout.

**Independent Test**: Customer sends "Haircut" (1 typed message) → Bot shows card with 5 time slot buttons → Customer taps "Friday 3pm" button (tap 1) → Bot shows confirmation card → Customer taps "✅ Confirm" (tap 2) → Booking created. Total typing = 1 message. Total taps = 2. Verify no additional typing required. Testable independently.

**Acceptance Scenarios**:

1. **Given** customer sends initial request, **When** bot responds, **Then** ALL subsequent interactions use buttons: time slot buttons (tap to select), [Confirm Booking] button (finalize), [See More Times] button (pagination), [Different Day] button (show alternatives), [Next Week] button (jump ahead)
2. **Given** customer wants more options, **When** customer taps [See More Times], **Then** bot shows next 5-10 slots without requiring typed message
3. **Given** customer taps time slot button, **When** system processes selection, **Then** bot shows confirmation card with [✅ Confirm] and [Change Time] buttons (no "type yes to confirm" prompt)
4. **Given** customer navigates through multiple cards, **When** counting interactions, **Then** total typed messages = 1 (initial request), total button taps = 2-5 (depending on how many "See More" clicked)

**Button Types Supported:**
- **Time Slot Buttons**: `[ 2:00 PM - Sarah ]` (tap to select slot)
- **Action Buttons**: `[Confirm Booking]` `[See More Times]` `[Different Day]` `[Next Week]`
- **Navigation Buttons**: `[◀ Previous Day]` `[Next Day ▶]` `[◀ This Week]` `[Next Week ▶]`
- **Contact Buttons**: `[Call Salon]` `[Join Waitlist]`

**Success Metrics:**
- **SC-010**: 100% bookings use interactive buttons after initial message (zero additional typing)
- **SC-011**: Average 2.5 button taps per booking
- **SC-012**: <1% customers revert to typing (indicates good button UX)

---

### User Story 5 - WhatsApp Native Interactive Messages (Priority: P1)

System uses WhatsApp Cloud API Interactive Message types (Reply Buttons, List Messages) for native mobile-optimized UI.

**Why this priority**: ⭐⭐⭐⭐⭐ CRITICAL - This is HOW we achieve zero-typing. WhatsApp Interactive Messages render as native UI components with tap targets optimized for mobile. Without this, we'd have to parse typed responses which defeats the purpose.

**Independent Test**: Send booking request → Verify webhook receives WhatsApp Interactive Message payload → Verify bot sends Reply Buttons for ≤3 slots → Verify bot sends List Message for 4-10 slots → Customer taps button → Verify webhook receives `button_reply` event with button ID → System processes booking. Testable independently.

**Acceptance Scenarios**:

**A) Reply Buttons (1-3 slots)**
1. **Given** bot has 1-3 available slots, **When** sending to customer, **Then** bot uses WhatsApp Reply Buttons format with max 3 buttons, each button shows time + master name (e.g., "2:00 PM - Sarah"), customer taps to select

**B) List Messages (4-10 slots)**
2. **Given** bot has 4-10 available slots, **When** sending to customer, **Then** bot uses WhatsApp List Message format grouped by day, customer taps "Select Time" → menu opens → customer taps slot from list

**C) Webhook Button Click Handling**
3. **Given** customer taps any button, **When** webhook receives event, **Then** webhook handler parses `message.interactive.button_reply.id` OR `message.interactive.list_reply.id` to extract slot information and process booking

**D) Fallback for Old WhatsApp Versions**
4. **Given** customer has old WhatsApp version not supporting interactive messages, **When** bot sends interactive card, **Then** WhatsApp API automatically converts to plain text: "Reply 1, 2, or 3: \n1. 2pm - Sarah\n2. 3pm - Sarah\n3. 4pm - Alex"

**Success Metrics:**
- **SC-013**: 99%+ interactive cards render correctly (measured via delivery receipts)
- **SC-014**: 85%+ customers use interactive buttons vs plain text fallback
- **SC-015**: <200ms webhook processing time for button click → booking creation

---

### User Story 6 - Single Master/Service Auto-Skip (Priority: P2)

Small salons with 1 master or 1 service automatically skip unnecessary questions, reducing booking to 1 tap.

**Why this priority**: ⭐⭐⭐ HIGH - Common scenario for 60% of salons with ≤2 masters. Reduces friction by 50%. Not P1 because it's optimization on top of working flow, but high value for target market.

**Independent Test**: Configure test salon with 1 master (Sarah) and 1 service (Haircut $50) → Customer sends "I want to book" → Bot skips "Which service?" and "Which master?" → Bot immediately shows: "When would you like your haircut with Sarah?" + 6 time slot buttons → Customer taps slot → Booking created in 1 tap. Testable independently.

**Acceptance Scenarios**:

1. **Given** salon has only 1 service, **When** customer sends booking request, **Then** bot skips service selection and proceeds directly to time selection
2. **Given** salon has only 1 master, **When** customer requests service, **Then** bot skips master selection and proceeds to time selection
3. **Given** salon has 1 master + 1 service, **When** customer sends "I want to book", **Then** bot shows: "When would you like [SERVICE] with [MASTER]?" + time slot buttons → booking completed in 1 tap total

**Auto-Detection Rules:**
- If 1 master → auto-assign to that master, skip master selection
- If 1 service → auto-assign to that service, skip service selection
- If 1 master + 1 service → show slots immediately with pre-filled context

**Success Metrics:**
- **SC-016**: Single-master salons: 1 tap to book vs 3-4 taps (75% reduction)
- **SC-017**: 50% reduction in messages for small salons (measured: multi-master salons 3 msgs avg vs single-master 1.5 msgs avg)

---

### User Story 7 - Returning Customer Fast-Track (Priority: P2)

Bot remembers customer preferences (favorite master, service, time) and suggests "Book Your Usual" for one-tap rebooking.

**Why this priority**: ⭐⭐⭐ HIGH - Returning customers = 70% of revenue for salons. Making rebooking instant (1 tap) increases retention. Not P1 because new customer flow must work first, but critical for retention.

**Independent Test**: Create customer with 3 past bookings (all Friday 3pm, Haircut, Sarah) → Customer sends "I want haircut" → Bot responds: "Welcome back! Book your usual? 💇 Haircut with Sarah, Friday 3pm [Book Now ⭐]" → Customer taps [Book Now] → Booking created in 1 tap. Testable independently.

**Acceptance Scenarios**:

1. **Given** customer has 3+ past bookings, **When** customer sends booking request, **Then** bot analyzes history and identifies: favorite master (most booked), favorite service (most booked), preferred day/time pattern
2. **Given** returning customer detected, **When** bot responds, **Then** bot shows: "Welcome back, [NAME]! Book your usual?" + [Book Now ⭐] button for usual time/master + [See All Times] button for alternatives
3. **Given** customer last booked 4-6 weeks ago (average rebooking interval), **When** 4 weeks elapsed, **Then** bot proactively sends: "Hi [NAME]! Time for your [SERVICE]? Your usual: Friday 3pm with Sarah [Book Now]" (proactive rebooking)

**Preference Tracking:**
- Favorite master = most frequently booked
- Favorite service = most frequently booked
- Preferred day of week = pattern detection from past bookings
- Preferred time = average booking time
- Rebooking frequency = average days between bookings

**Success Metrics:**
- **SC-018**: 60%+ returning customers book in 1 tap using "usual" suggestion
- **SC-019**: 40%+ accept proactive rebooking offer

---

### User Story 8 - Multi-Language Interactive Support (Priority: P3)

All interactive messages (buttons, lists, cards) render in customer's language (EN, RU, ES, PT, HE) with localized formatting.

**Why this priority**: ⭐⭐ MEDIUM - Required for international salons but not critical for MVP. Can launch with English-only and add languages incrementally. Lower priority because translation doesn't change core functionality.

**Independent Test**: Send Russian message "Стрижка завтра" → Bot detects Russian → Bot responds with Russian interactive card: "Доступное время:" + buttons showing "14:00 - Сара" + [Подтвердить] button → Verify all labels in Russian, time format 24h, date format DD.MM.YYYY. Testable per-language independently.

**Acceptance Scenarios**:

1. **Given** customer sends message in Russian, **When** bot generates interactive card, **Then** ALL text (button labels, card titles, descriptions) in Russian, times use 24h format (15:00 not 3pm), dates use DD.MM.YYYY
2. **Given** customer speaks Hebrew, **When** bot sends card, **Then** text is right-to-left aligned, buttons show Hebrew labels ("אישור", "ביטול")
3. **Given** customer speaks Spanish, **When** bot sends dates, **Then** day names in Spanish (Viernes, Sábado), date format DD/MM/YYYY

**Supported Languages:**
- English (en): 12h time, MM/DD/YYYY dates, "Confirm" / "Cancel"
- Russian (ru): 24h time, DD.MM.YYYY dates, "Подтвердить" / "Отменить"
- Spanish (es): 24h time, DD/MM/YYYY dates, "Confirmar" / "Cancelar"
- Portuguese (pt): 24h time, DD/MM/YYYY dates, "Confirmar" / "Cancelar"
- Hebrew (he): 24h time, DD/MM/YYYY dates, RTL layout, "אישור" / "ביטול"

**Success Metrics:**
- **SC-020**: Multi-language cards render correctly in all 5 languages (manual QA test)

---

### Edge Cases

**EC-001: Slot occupied between display and confirmation**
- **What happens:** Bot shows "3pm Friday available", another customer books 3pm, this customer clicks "3pm"
- **System behavior:** Webhook detects slot no longer available (check before creating booking), returns: "Sorry, 3pm just booked! Try these instead:" + 3 new alternative buttons (2pm, 4pm, Saturday 3pm)

**EC-002: Customer clicks "Confirm" button twice (double-click)**
- **What happens:** Customer double-taps confirm button within 2 seconds
- **System behavior:** Webhook handler uses idempotency key from button ID (`confirm_book_{bookingId}`), second click returns: "Already confirmed! Booking code: BK-XYZ" (prevents duplicate bookings)

**EC-003: All 3 suggested slots rejected, customer keeps clicking "See More"**
- **What happens:** Customer views 15+ slots without selecting any
- **System behavior:** After 3 "See More" clicks (15 slots shown), bot adds: [Call Salon] and [Different Day] buttons to prevent infinite loop

**EC-004: Customer sends new message while waiting for interactive card**
- **What happens:** Bot is preparing card with slots, customer sends "Actually Saturday"
- **System behavior:** Cancel pending card generation, parse new message as updated preference, restart search with Saturday

**EC-005: Webhook receives interactive message but handler doesn't support type**
- **What happens:** Future WhatsApp adds new interactive type (e.g., "carousel")
- **System behavior:** Default case logs `message.type` and sends: "Please send your request as a text message" (graceful degradation)

**EC-006: Network timeout during card display (30+ seconds)**
- **What happens:** WhatsApp API fails to deliver interactive card due to network issue
- **System behavior:** After 30s timeout, fallback to plain text message with phone number: "Slots available! Call us to book: +123456789"

**EC-007: Customer's message ambiguous ("Haircut and coloring Friday")**
- **What happens:** Customer wants 2 services in one message
- **System behavior:** Bot sends List Message: "Which service first?" with 2 rows (Haircut, Coloring), then proceeds with selected service (multi-service booking = future feature)

**EC-008: Entire next 30 days fully booked (extremely rare)**
- **What happens:** Infinite search reaches 30-day limit with 0 slots
- **System behavior:** Bot MUST NOT end with "sorry, no availability" → Shows: "Fully booked for 30 days! 🎉 Options:" + [Join Waitlist] + [Call Salon +123456789] buttons

**EC-009: Customer types conflicting preference after button shown**
- **What happens:** Bot shows Friday slots, customer types "I want Monday instead"
- **System behavior:** Parse "Monday" as preference update, maintain service/master context, show Monday slots immediately (don't ask "which service?" again)

**EC-010: Multiple waitlist customers notified simultaneously**
- **What happens:** 2 slots open at same time, system notifies 2 waitlist customers
- **System behavior:** First customer to click [Book Now] gets the slot, second customer receives: "Sorry, just booked! Here are other times:" + alternative slots

**EC-011: Waitlist customer doesn't respond within 15 minutes**
- **What happens:** Customer notified of slot opening but doesn't click [Book Now] or [Pass]
- **System behavior:** After 15 min, system auto-marks as `expired`, notifies next waitlist customer, sends original customer: "Slot offer expired. You're still #2 in waitlist. We'll notify you if another opens."

**EC-012: Customer says "anytime" but all popular times are booked**
- **What happens:** Bot queries popular times (Friday 3pm has 50 past bookings) but Friday 3pm currently unavailable
- **System behavior:** Skip unavailable popular times, show next-most-popular available times, if all popular times booked → show next available slots with note: "Popular times (Fri 3pm, Sat 2pm) booked. Next available:"

**EC-013: New salon with zero booking history (no popular times data)**
- **What happens:** Customer says "anytime" but salon just opened (0 bookings in database)
- **System behavior:** Use default popular times: Friday 2pm, Friday 3pm, Saturday 10am, Saturday 2pm (industry standard), check availability for each, show available ones

**EC-014: Customer types "anytime" then types specific time**
- **What happens:** Bot shows popular times card, customer types "Actually Friday 5pm"
- **System behavior:** Parse "Friday 5pm" as specific preference override, cancel popular times suggestion, search for Friday 5pm slots

---

## Requirements *(mandatory)*

### Functional Requirements

#### Phase 1: WhatsApp Interactive Message Infrastructure

**FR-001: WhatsApp Cloud API Integration**
- System MUST integrate WhatsApp Cloud API Interactive Messages endpoint
- System MUST support Reply Buttons format (1-3 buttons max per message)
- System MUST support List Messages format (4-10 items max per message)
- System MUST support button click responses in webhook handler

**FR-002: Webhook Button Click Handler**
- Webhook MUST process `message.type === 'interactive'` events
- Webhook MUST parse `message.interactive.button_reply.id` for Reply Buttons
- Webhook MUST parse `message.interactive.list_reply.id` for List Messages
- Webhook MUST extract slot information from button ID (format: `slot_{date}_{time}_{masterId}`)
- Webhook MUST process button clicks within 200ms (measured via logging)

**FR-003: Interactive Card Builder Service**
- System MUST implement `InteractiveCardBuilder` service
- Service MUST decide card type based on slot count: ≤3 slots → Reply Buttons, 4-10 slots → List Message, >10 slots → paginated List Message
- Service MUST format buttons with time + master name (e.g., "2:00 PM - Sarah")
- Service MUST include footer text: "Tap to select your time"

**FR-004: Button ID Schema Standardization**
- System MUST use standardized button ID format: `{action}_{context}`
- Examples: `slot_2024-10-25_15:00_m123` (time slot), `action_see_more` (pagination), `confirm_book_789` (finalize), `nav_next_week` (navigation)
- Button IDs MUST be parseable by webhook to extract action and context

**FR-005: Fallback for Unsupported Clients**
- System MUST detect when customer's WhatsApp version doesn't support interactive messages
- System MUST provide plain text fallback: "Reply 1, 2, or 3:\n1. 2pm - Sarah\n2. 3pm - Sarah\n3. 4pm - Alex"
- System MUST parse numeric replies (1, 2, 3) as slot selections

---

#### Phase 2: Never-Ending Slot Search Algorithm

**FR-006: Infinite Availability Search**
- System MUST implement `SlotFinderService` that searches up to 30 days ahead
- Service MUST search day-by-day until finding ≥3 available slots OR reaching 30-day limit
- Service MUST query master availability from `master.working_hours` field (not hardcoded hours)
- Service MUST check existing bookings to avoid conflicts
- Service MUST return slots OR empty array + waitlist/call-salon actions (never dead-end)

**FR-007: Alternative Slot Ranking Algorithm**
- System MUST rank alternatives by proximity to requested time/date
- Ranking priority order:
  1. Same day + same master + ±1-2h time
  2. Same time + next day + same master
  3. Same day + any time + same master
  4. Same time + any day ±3 days + any master
  5. Next week + same day/time
- System MUST mark top 3 alternatives with ⭐ indicator

**FR-008: "See More" Pagination**
- System MUST implement pagination for >5 slots
- Initial card MUST show first 5 slots + [See More Times] button
- [See More Times] click MUST show next 5-10 slots + [See Even More] button
- System MUST limit to 3 pages (15 slots total), then show [Call Salon] button

**FR-009: Escalation Path (No Dead-Ends)**
- System MUST NEVER end conversation without action
- If 0 slots in 30 days → MUST show [Join Waitlist] + [Call Salon] buttons
- If customer clicks [See More] 3x without booking → MUST add [Different Day] + [Call Salon] buttons
- System MUST track escalation attempts in database for analytics

**FR-010: Waitlist Integration**
- System MUST implement `WaitlistService.add()` method
- Method MUST accept: `customerId`, `preferredDate`, `preferredTime`, `serviceId`, `masterId`, `notifyVia='whatsapp'`
- When customer joins waitlist, system MUST send: "✅ You're on the waitlist! We'll notify you if a slot opens."
- System MUST include [Call Salon] button as additional option

---

#### Phase 3: Zero-Typing Button-Only Flow

**FR-011: Minimal Typing Detection**
- System MUST accept customer's first message as text (e.g., "Haircut Friday 3pm")
- System MUST respond to ALL subsequent interactions via buttons ONLY
- If customer types additional message → MUST parse as preference change and restart flow

**FR-012: Tap-to-Confirm Flow**
- When customer taps time slot button → MUST show confirmation card with booking details
- Confirmation card MUST include [✅ Confirm Booking] and [Change Time] buttons
- When customer taps [✅ Confirm Booking] → MUST create booking immediately (no additional confirmation)
- System MUST send booking confirmation: "✅ Booked! [SERVICE] with [MASTER] on [DATE] at [TIME]. Code: [BOOKING_CODE]"

**FR-013: Navigation Button Set**
- System MUST provide navigation buttons: [See More Times], [Different Day], [Next Week], [Previous Week]
- System MUST provide action buttons: [Confirm Booking], [Change Time], [Call Salon], [Join Waitlist]
- Buttons MUST be contextual (only show relevant buttons per state)

---

#### Phase 4: Smart Context Detection

**FR-014: Single Master/Service Auto-Detection**
- On receiving booking request, system MUST query salon's active masters and services
- If `masters.length === 1` → auto-assign `masterId` and skip master selection
- If `services.length === 1` → auto-assign `serviceId` and skip service selection
- If both single → proceed directly to slot display with pre-filled context

**FR-015: Returning Customer Preference Tracking**
- System MUST query customer's past bookings (by phone number)
- If `pastBookings.length >= 3` → analyze preferences:
  - `favoriteMaster` = most frequently booked master
  - `favoriteService` = most frequently booked service
  - `preferredDay` = most common day of week
  - `preferredTime` = average booking time
  - `rebookingFrequency` = average days between bookings
- System MUST store preferences in `customer_preferences` table

**FR-016: "Book Your Usual" Fast-Track**
- For returning customers, system MUST show: "Welcome back, [NAME]! Book your usual?" + [Book Now ⭐] button
- [Book Now ⭐] button MUST pre-fill: usual service + usual master + next available slot matching preferred day/time
- System MUST include [See All Times] button for manual selection

**FR-017: Proactive Rebooking**
- System MUST implement background job to identify customers due for rebooking
- If `daysSinceLastBooking >= avgRebookingFrequency - 3` → send proactive message
- Message format: "Hi [NAME]! Time for your [SERVICE]? Your usual: [DAY] [TIME] with [MASTER] [Book Now]"

---

#### Phase 5: Multi-Language Support

**FR-018: Language Detection**
- System MUST detect customer language from first message text (existing AI language detection)
- System MUST store detected language in conversation context

**FR-019: Localized Interactive Messages**
- System MUST translate ALL button labels based on detected language
- System MUST use language-specific time formats: EN=12h (3:00 PM), RU/ES/PT/HE=24h (15:00)
- System MUST use language-specific date formats: EN=MM/DD/YYYY, RU=DD.MM.YYYY, ES/PT=DD/MM/YYYY, HE=DD/MM/YYYY
- System MUST apply RTL layout for Hebrew messages

**FR-020: Translation Constants**
- System MUST define `INTERACTIVE_MESSAGE_TRANSLATIONS` constant with labels for all 5 languages
- Example keys: `confirmButton`, `cancelButton`, `selectTimeButton`, `seeMoreButton`, `callSalonButton`, `joinWaitlistButton`
- System MUST use translations when building cards: `translations[languageCode].confirmButton`

---

#### Phase 6: Advanced Interaction Handling

**FR-021: Handle Typed Messages After Buttons**
- If customer types text message instead of clicking button → MUST parse as new preference update
- System MUST extract updated intent (new date, time, or service mentioned)
- System MUST immediately show updated button card with new slot options
- Customer MUST NOT be required to click previous button before typing
- Example flow:
  ```
  Bot: [Shows Friday slots: 2pm, 3pm, 4pm]
  Customer: "Actually, Saturday" ← types instead of clicking
  Bot: [Shows Saturday slots: 10am, 2pm, 4pm] ← instant update
  ```
- System MUST maintain conversation context (service, master still remembered)
- System MUST NOT restart entire flow, only update changed preference

**FR-022: Waitlist Notification System**
- When slot becomes available (due to cancellation or new opening) → MUST trigger waitlist notification
- System MUST query `waitlist` table ordered by `created_at ASC` (first in, first served)
- System MUST send WhatsApp message to first waitlist customer:
  ```
  "Good news! A slot just opened:
  📅 [DATE] at [TIME]
  💇 [SERVICE] with [MASTER]

  [Book Now] [Pass]

  ⏱️ Reserved for you for 15 minutes"
  ```
- System MUST set 15-minute timer for response
- If customer clicks [Book Now] within 15 min → create booking, remove from waitlist
- If customer clicks [Pass] OR no response after 15 min → mark as `notified`, move to next waitlist customer
- System MUST recursively notify next person until slot is booked OR waitlist exhausted
- System MUST update waitlist status: `active` → `notified` → `booked` OR `expired`

**FR-023: Popular Times Suggestion**
- If customer says "anytime", "whenever", "I'm flexible", "any day" → MUST show popular times
- System MUST query booking history for salon to find most common booking times
- System MUST calculate popularity score:
  ```sql
  SELECT
    EXTRACT(DOW FROM start_ts) as day_of_week,
    EXTRACT(HOUR FROM start_ts) as hour,
    COUNT(*) as booking_count
  FROM bookings
  WHERE salon_id = ? AND created_at > NOW() - INTERVAL '90 days'
  GROUP BY day_of_week, hour
  ORDER BY booking_count DESC
  LIMIT 6
  ```
- System MUST format as interactive card:
  ```
  "Most customers book:

  📊 Popular Times
  [ Friday 2pm ] ⭐ 23 bookings
  [ Friday 3pm ] ⭐ 19 bookings
  [ Saturday 10am ] ⭐ 17 bookings
  [ Saturday 2pm ] ⭐ 15 bookings

  [Select Time] [See All Times]"
  ```
- If no booking history (new salon) → show default popular times: Friday 3pm, Saturday 2pm, Saturday 3pm
- Each button MUST link to actual available slot at that time (check availability first)

---

### Key Entities

**Interactive Message Payload**
- WhatsApp Cloud API message object
- Fields: `type: "interactive"`, `interactive.type: "button" | "list"`, `interactive.action.buttons[]` OR `interactive.action.sections[]`
- Button fields: `id` (string for webhook parsing), `title` (display text ≤20 chars)

**Slot Suggestion**
- Available time slot object
- Fields: `{ slotId: string, date: Date, startTime: string, endTime: string, masterId: string, masterName: string, serviceId: string, serviceName: string, duration: number, price: number, available: boolean, rank: number }`
- Used for: slot search results, alternative suggestions, card generation

**Booking Intent**
- Extracted customer request
- Fields: `{ service: string?, master: string?, preferredDate: string?, preferredTime: string?, language: string, confidence: 0-1, isReturningCustomer: boolean }`
- Used for: initial parsing, preference matching, slot ranking

**Customer Preferences**
- Stored customer history patterns
- Fields: `{ customerId: string, favoriteMasterId: string, favoriteServiceId: string, preferredDayOfWeek: string, preferredTimeOfDay: string, avgRebookingDays: number, totalBookings: number }`
- Used for: fast-track booking, proactive rebooking

**Button Action**
- Parsed webhook button click
- Fields: `{ type: 'slot' | 'see_more' | 'confirm' | 'nav' | 'contact', context: object }`
- Examples: `{ type: 'slot', context: { slotId: '123', date: '2024-10-25', time: '15:00' } }`

**Popular Time Slot**
- Historical booking pattern data
- Fields: `{ dayOfWeek: 0-6, hour: 0-23, bookingCount: number, popularityScore: number, isAvailable: boolean, nextAvailableSlot: Date? }`
- Used for: "anytime" suggestions, showing most popular booking times
- Example: `{ dayOfWeek: 5 (Friday), hour: 15, bookingCount: 23, popularityScore: 0.85, isAvailable: true }`

**Waitlist Entry**
- Customer waiting for slot availability
- Fields: `{ waitlistId: string, customerId: string, serviceId: string, masterId: string?, preferredDate: Date?, preferredTime: string?, status: 'active' | 'notified' | 'booked' | 'passed' | 'expired', positionInQueue: number, notifiedAt: Date?, expiresAt: Date? }`
- Used for: slot opening notifications, queue management

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

**SC-001: Zero-Typing Achievement**
- **Target:** 95%+ bookings completed with 0 typing after initial message
- **Measurement:** `(bookings with only button interactions after first message) / (total bookings) × 100%`
- **Threshold:** Must achieve 95% to validate zero-typing UX hypothesis

**SC-002: Tap Efficiency**
- **Target:** Average 2-3 taps per booking
- **Measurement:** `sum(button taps per booking) / total bookings`
- **Breakdown:** 2 taps = perfect flow (select slot + confirm), 3 taps = with "See More", 4+ taps = navigation required

**SC-003: Booking Speed**
- **Target:** <30 seconds from first message to booking confirmation
- **Measurement:** `avg(timestamp_confirmation - timestamp_first_message)`
- **P50:** ≤20 seconds, **P95:** ≤30 seconds, **P99:** ≤45 seconds

**SC-004: Conversation Completion Rate (No Dead-Ends)**
- **Target:** 0% conversations end without action (booking, waitlist, or phone contact)
- **Measurement:** `(bookings created + waitlist signups + call button clicks) / (conversations initiated) × 100%`
- **Requirement:** MUST be 100% - every conversation ends with customer taking action

**SC-005: Alternative Acceptance Rate**
- **Target:** 80%+ customers accept slot within first 3 cards shown
- **Measurement:** `(bookings from first 15 slots) / (total bookings) × 100%`
- **Indicates:** Good alternative ranking algorithm

**SC-006: First-Choice Match Rate**
- **Target:** 70%+ customers get exact requested time or ±30min alternative
- **Measurement:** `(exact matches + ±30min matches) / (total bookings) × 100%`
- **Indicates:** High slot availability and good ranking

**SC-007: Escalation Rate (Call Salon Needed)**
- **Target:** <5% customers need to call salon directly
- **Measurement:** `(clicked "Call Salon") / (total conversations) × 100%`
- **Indicates:** Bot successfully handles 95%+ scenarios

**SC-008: Interactive Message Delivery Success**
- **Target:** 99%+ interactive cards render successfully
- **Measurement:** `(WhatsApp delivery receipts with status=delivered) / (cards sent) × 100%`
- **Monitor:** Delivery failures, fallback usage rate

**SC-009: Multi-Week Search Success**
- **Target:** 98%+ customers find slots within 14 days
- **Measurement:** `(bookings with date ≤ today+14) / (total searches) × 100%`
- **Indicates:** Sufficient master capacity

**SC-010: Cost Per Booking (After All Optimizations)**
- **Target:** ≤$0.01 per booking
- **Measurement:** `(total AI API costs) / (total bookings created)`
- **Breakdown:** GPT-3.5 cost + WhatsApp message costs

---

### Performance Metrics

**PM-001: Slot Search Performance**
- **Target:** P95 latency ≤3 seconds for finding 5 available slots
- **Includes:** Database query + availability check + ranking algorithm
- **Measurement:** Server-side timing logs

**PM-002: Webhook Button Click Processing**
- **Target:** ≤200ms from button click to booking creation start
- **Measurement:** `timestamp(booking_creation_start) - timestamp(webhook_received)`
- **Critical:** Fast response prevents customer abandonment

**PM-003: AI Intent Extraction Accuracy**
- **Target:** ≥90% correctly extract all provided details (service, date, time) without hallucination
- **Measurement:** Manual review of 100 sample conversations, count accurate extractions
- **Failure:** Extracting "Friday" when customer said "Saturday"

**PM-004: Card Generation Performance**
- **Target:** ≤500ms to generate interactive card with 5 slots
- **Includes:** Slot ranking + translation + WhatsApp API formatting
- **Measurement:** Server-side timing logs

---

### User Experience Metrics

**UX-001: Customer Satisfaction (Post-Booking Survey)**
- **Target:** ≥80% customers report "bot feels fast and professional"
- **Measurement:** Optional post-booking message: "Rate your booking experience: ⭐⭐⭐⭐⭐"
- **Threshold:** 4-5 stars = satisfied, 1-3 stars = dissatisfied

**UX-002: Ambiguous Intent Error Rate**
- **Target:** ≤5% error rate for unclear messages (e.g., "I want haircut" without date)
- **Measurement:** `(conversations where bot asks clarifying question) / (total conversations) × 100%`
- **Good:** Bot asks "What day works for you?" vs **Bad:** Bot hallucinates date

**UX-003: Interactive Button Click-Through Rate**
- **Target:** ≥85% customers use interactive buttons vs typing responses
- **Measurement:** `(button clicks after first message) / (total interactions after first message) × 100%`
- **Indicates:** Customers prefer buttons over typing

**UX-004: Small Salon Fast-Track Success**
- **Target:** Single-master salons achieve ≤2 messages per booking (vs 3-4 for multi-master)
- **Measurement:** `avg(messages per booking WHERE salon has 1 master)`
- **Comparison:** Compare to multi-master salon average

**UX-005: Typed Message Handling Flexibility**
- **Target:** 100% of typed messages after buttons are handled gracefully (no errors or "please click button" messages)
- **Measurement:** `(typed messages successfully parsed as preference updates) / (total typed messages after buttons) × 100%`
- **Indicates:** System adapts to customer's preferred interaction style

**UX-006: Waitlist Conversion Rate**
- **Target:** 60%+ waitlist customers book when notified of opening
- **Measurement:** `(waitlist customers who clicked "Book Now") / (waitlist customers notified) × 100%`
- **Breakdown:** Booked within 15 min / Clicked "Pass" / No response (expired)

**UX-007: Waitlist Notification Speed**
- **Target:** ≤2 minutes from slot opening to first waitlist customer notified
- **Measurement:** `avg(timestamp_notification_sent - timestamp_slot_opened)`
- **Critical:** Fast notification prevents slot from being booked by walk-in before waitlist customer responds

**UX-008: Popular Times Suggestion Accuracy**
- **Target:** 70%+ customers who see popular times select from suggested options
- **Measurement:** `(bookings from popular time slots) / (customers shown popular times) × 100%`
- **Indicates:** Popular times algorithm correctly identifies customer preferences

**UX-009: Popular Times Availability Rate**
- **Target:** ≥50% of popular times have available slots when suggested
- **Measurement:** `(popular time slots with availability) / (total popular time queries) × 100%`
- **Indicates:** Salon capacity aligned with demand patterns

---

## Technical Architecture *(implementation guidance)*

### New Files to Create

```
Backend/src/modules/whatsapp/interactive/
  ├── interactive-message.builder.ts        # Build WhatsApp Reply Buttons & List Messages
  ├── button-handler.service.ts             # Process button clicks from webhook
  └── card-templates/
      ├── slot-selection.template.ts        # Time slot button card
      ├── confirmation.template.ts          # Booking confirmation card
      ├── alternatives.template.ts          # Alternative days card
      └── waitlist.template.ts              # Waitlist/call-salon card

Backend/src/modules/bookings/
  ├── slot-finder.service.ts                # Infinite 30-day slot search
  ├── alternative-suggester.service.ts      # Rank alternatives by proximity
  ├── preference-tracker.service.ts         # Track customer booking patterns
  ├── popular-times.service.ts              # Query historical booking patterns
  └── waitlist.service.ts                   # Manage waitlist signups & notifications

Backend/src/modules/ai/
  ├── quick-booking.service.ts              # Main orchestrator for zero-typing flow
  ├── intent-parser.service.ts              # Parse customer's first message
  ├── context-detector.service.ts           # Detect single master/service scenarios
  └── typed-message-handler.service.ts      # Handle typed messages after buttons

Backend/src/modules/notifications/
  ├── waitlist-notifier.service.ts          # Notify waitlist customers of openings
  ├── notification-scheduler.service.ts     # Schedule 15-min expiry timers
  └── waitlist-queue-manager.service.ts     # Manage waitlist queue positions
```

### Files to Update

**1. Webhook Handler (`Backend/src/modules/whatsapp/webhook.service.ts`)**

Current code (lines 78-96):
```typescript
switch (message.type) {
  case 'text':
    content = message.text?.body || '';
    break;
  // ... other types but NO 'interactive' support
}
```

**Required changes:**
```typescript
switch (message.type) {
  case 'text':
    content = message.text?.body || '';
    break;

  // NEW: Handle interactive button clicks
  case 'interactive':
    return this.buttonHandler.handleClick(message.interactive);

  // ... rest of cases
}
```

Add new method:
```typescript
// Backend/src/modules/whatsapp/webhook.service.ts (new method ~line 200)

async handleInteractiveMessage(interactive: InteractivePayload) {
  const { type, button_reply, list_reply } = interactive;

  if (type === 'button_reply') {
    // Customer clicked a Reply Button
    const buttonId = button_reply.id; // e.g., "slot_2024-10-25_15:00_m123"
    return this.buttonHandler.processSlotSelection(buttonId);
  }

  if (type === 'list_reply') {
    // Customer selected from List Message
    const itemId = list_reply.id;
    return this.buttonHandler.processSlotSelection(itemId);
  }
}
```

---

**2. Quick Booking Service (`Backend/src/modules/ai/quick-booking.service.ts` - NEW FILE)**

```typescript
import { Injectable } from '@nestjs/common';
import { IntentParserService } from './intent-parser.service';
import { SlotFinderService } from '../bookings/slot-finder.service';
import { AlternativeSuggesterService } from '../bookings/alternative-suggester.service';
import { InteractiveCardBuilder } from '../whatsapp/interactive/interactive-message.builder';

@Injectable()
export class QuickBookingService {
  constructor(
    private intentParser: IntentParserService,
    private slotFinder: SlotFinderService,
    private suggester: AlternativeSuggesterService,
    private cardBuilder: InteractiveCardBuilder,
  ) {}

  async handleBookingRequest(request: {
    text: string;
    customerPhone: string;
    salonId: string;
  }) {
    // Step 1: Parse customer's initial message
    const intent = await this.intentParser.parse(request.text);
    // Output: { service: 'haircut', date: 'Friday', time: '3pm', master: 'Sarah' }

    // Step 2: Search for available slots (infinite search up to 30 days!)
    const slots = await this.slotFinder.findSlots({
      salonId: request.salonId,
      serviceId: intent.serviceId,
      preferredDate: intent.date,
      preferredTime: intent.time,
      masterId: intent.masterId,
      maxDaysAhead: 30,
    });

    // Step 3: Rank alternatives by proximity to request
    const ranked = await this.suggester.rankSlots(slots, intent);

    // Step 4: Build interactive card
    const card = await this.cardBuilder.buildSlotSelectionCard({
      slots: ranked.slice(0, 5), // Show top 5
      language: intent.language,
      customerPhone: request.customerPhone,
    });

    // Step 5: Send to customer via WhatsApp
    return card;
  }
}
```

---

**3. Slot Finder Service (`Backend/src/modules/bookings/slot-finder.service.ts` - NEW FILE)**

```typescript
import { Injectable } from '@nestjs/common';
import { addDays, parseISO, format } from 'date-fns';

@Injectable()
export class SlotFinderService {
  async findSlots(params: {
    salonId: string;
    serviceId: string;
    preferredDate: string;
    preferredTime?: string;
    masterId?: string;
    maxDaysAhead: number;
  }) {
    let currentDate = parseISO(params.preferredDate);
    let allSlots = [];
    let daysSearched = 0;

    // Search day-by-day up to 30 days
    while (daysSearched < params.maxDaysAhead && allSlots.length < 20) {
      // Get masters available for this service
      const masters = await this.getMastersForService(params.serviceId, params.masterId);

      for (const master of masters) {
        // Check if master works this day
        const workingHours = this.getWorkingHours(master, currentDate);
        if (!workingHours) continue;

        // Get existing bookings for this master on this day
        const bookings = await this.getBookingsForMaster(master.id, currentDate);

        // Calculate free time slots
        const freeSlots = this.calculateFreeSlots(
          workingHours,
          bookings,
          params.serviceId, // to get duration
        );

        allSlots.push(...freeSlots.map(slot => ({
          slotId: `${master.id}_${format(currentDate, 'yyyy-MM-dd')}_${slot.startTime}`,
          date: currentDate,
          startTime: slot.startTime,
          endTime: slot.endTime,
          masterId: master.id,
          masterName: master.name,
          serviceId: params.serviceId,
          duration: slot.duration,
          available: true,
        })));
      }

      currentDate = addDays(currentDate, 1);
      daysSearched++;
    }

    if (allSlots.length === 0) {
      // Even after 30 days, no slots!
      throw new NoAvailabilityError({
        message: 'Fully booked for next 30 days',
        actions: ['join_waitlist', 'call_salon'],
      });
    }

    return allSlots;
  }

  private getWorkingHours(master: Master, date: Date) {
    const dayName = format(date, 'EEEE').toLowerCase(); // 'monday', 'tuesday', etc.
    const hours = master.working_hours[dayName]; // e.g., "10:00-18:00"

    if (!hours || hours === 'closed') return null;

    const [start, end] = hours.split('-');
    return { start, end };
  }

  private async getBookingsForMaster(masterId: string, date: Date) {
    return this.bookingsRepository.findAll({
      master_id: masterId,
      date: format(date, 'yyyy-MM-dd'),
      status: { not: 'CANCELLED' },
    });
  }

  private calculateFreeSlots(workingHours, existingBookings, serviceId) {
    // Implementation: split working hours into slots, exclude booked times
    // Return array of { startTime: '10:00', endTime: '11:00', duration: 60 }
  }
}
```

---

**4. Interactive Card Builder (`Backend/src/modules/whatsapp/interactive/interactive-message.builder.ts` - NEW FILE)**

```typescript
import { Injectable } from '@nestjs/common';

@Injectable()
export class InteractiveCardBuilder {
  buildSlotSelectionCard(params: {
    slots: Slot[];
    language: string;
    customerPhone: string;
  }) {
    // Decide card type based on slot count
    if (params.slots.length <= 3) {
      return this.buildReplyButtonsCard(params);
    } else {
      return this.buildListMessageCard(params);
    }
  }

  private buildReplyButtonsCard(params) {
    const { slots, language, customerPhone } = params;
    const translations = TRANSLATIONS[language];

    return {
      messaging_product: 'whatsapp',
      to: customerPhone,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: {
          text: `${translations.availableTimes}:\n\n` +
                `💇 ${slots[0].serviceName}\n` +
                `⏱️  ${slots[0].duration} min\n` +
                `💰 $${slots[0].price}`,
        },
        action: {
          buttons: slots.slice(0, 3).map((slot, index) => ({
            type: 'reply',
            reply: {
              id: `slot_${slot.slotId}`,
              title: `${this.formatTime(slot.startTime, language)} - ${slot.masterName}`,
            },
          })),
        },
        footer: {
          text: translations.tapToSelect,
        },
      },
    };
  }

  private buildListMessageCard(params) {
    const { slots, language, customerPhone } = params;
    const translations = TRANSLATIONS[language];

    // Group slots by day
    const grouped = this.groupByDay(slots);

    return {
      messaging_product: 'whatsapp',
      to: customerPhone,
      type: 'interactive',
      interactive: {
        type: 'list',
        header: {
          type: 'text',
          text: translations.availableTimes,
        },
        body: {
          text: `${translations.selectTime}:`,
        },
        action: {
          button: translations.selectButton,
          sections: Object.entries(grouped).map(([date, daySlots]) => ({
            title: this.formatDate(date, language),
            rows: daySlots.map(slot => ({
              id: `slot_${slot.slotId}`,
              title: `${this.formatTime(slot.startTime, language)} - ${slot.masterName}`,
              description: `${slot.duration} min • $${slot.price}`,
            })),
          })),
        },
      },
    };
  }

  buildConfirmationCard(booking: Booking, language: string) {
    const translations = TRANSLATIONS[language];

    return {
      messaging_product: 'whatsapp',
      to: booking.customerPhone,
      type: 'interactive',
      interactive: {
        type: 'button',
        header: {
          type: 'text',
          text: translations.confirmBooking,
        },
        body: {
          text: `${translations.youSelected}:\n\n` +
                `📅 ${this.formatDate(booking.date, language)}\n` +
                `🕐 ${this.formatTime(booking.startTime, language)} - ${this.formatTime(booking.endTime, language)}\n` +
                `💇 ${booking.serviceName}\n` +
                `👤 ${booking.masterName}\n` +
                `💰 $${booking.price}`,
        },
        action: {
          buttons: [
            {
              type: 'reply',
              reply: {
                id: `confirm_book_${booking.id}`,
                title: translations.confirmButton,
              },
            },
            {
              type: 'reply',
              reply: {
                id: 'action_change_time',
                title: translations.changeTimeButton,
              },
            },
          ],
        },
      },
    };
  }
}
```

---

**5. Alternative Suggester (`Backend/src/modules/bookings/alternative-suggester.service.ts` - NEW FILE)**

```typescript
import { Injectable } from '@nestjs/common';
import { differenceInMinutes, parseISO } from 'date-fns';

@Injectable()
export class AlternativeSuggesterService {
  rankSlots(slots: Slot[], intent: BookingIntent) {
    const preferredDateTime = parseISO(`${intent.date} ${intent.time}`);

    return slots
      .map(slot => {
        const slotDateTime = parseISO(`${slot.date} ${slot.startTime}`);
        const timeDiff = Math.abs(differenceInMinutes(slotDateTime, preferredDateTime));

        // Calculate ranking score
        let score = 0;

        // Priority 1: Same master (if customer specified)
        if (intent.masterId && slot.masterId === intent.masterId) {
          score += 1000;
        }

        // Priority 2: Close time (within 1-2 hours)
        if (timeDiff <= 60) score += 500; // Within 1h
        if (timeDiff <= 120) score += 300; // Within 2h

        // Priority 3: Same day
        if (slot.date === intent.date) {
          score += 200;
        }

        // Priority 4: Proximity penalty (farther = lower score)
        score -= timeDiff / 10;

        return { ...slot, rank: score };
      })
      .sort((a, b) => b.rank - a.rank); // Highest score first
  }
}
```

---

**6. Typed Message Handler (`Backend/src/modules/ai/typed-message-handler.service.ts` - NEW FILE)**

```typescript
import { Injectable } from '@nestjs/common';
import { IntentParserService } from './intent-parser.service';

@Injectable()
export class TypedMessageHandlerService {
  constructor(private intentParser: IntentParserService) {}

  async handleTypedMessageAfterButtons(params: {
    text: string;
    conversationContext: ConversationContext;
  }) {
    // Customer typed instead of clicking button
    // Examples: "Actually Saturday", "I prefer 2pm", "Different master please"

    // Parse new preference from text
    const updatedIntent = await this.intentParser.parseUpdate(
      params.text,
      params.conversationContext
    );

    // Merge with existing context (preserve service, master if not changed)
    const mergedContext = {
      ...params.conversationContext,
      // Only update fields that customer mentioned
      ...(updatedIntent.date && { preferredDate: updatedIntent.date }),
      ...(updatedIntent.time && { preferredTime: updatedIntent.time }),
      ...(updatedIntent.service && { serviceId: updatedIntent.service }),
      ...(updatedIntent.master && { masterId: updatedIntent.master }),
    };

    // Return updated context WITHOUT restarting entire flow
    return {
      updatedContext: mergedContext,
      shouldShowNewSlots: true,
      message: 'Searching for slots with updated preferences...',
    };
  }
}
```

---

**7. Popular Times Service (`Backend/src/modules/bookings/popular-times.service.ts` - NEW FILE)**

```typescript
import { Injectable } from '@nestjs/common';

@Injectable()
export class PopularTimesService {
  async getPopularTimes(salonId: string): Promise<PopularTimeSlot[]> {
    // Query last 90 days of booking data
    const popularSlots = await this.db.query(`
      SELECT
        EXTRACT(DOW FROM start_ts) as day_of_week,
        EXTRACT(HOUR FROM start_ts) as hour,
        COUNT(*) as booking_count
      FROM bookings
      WHERE
        salon_id = $1
        AND created_at > NOW() - INTERVAL '90 days'
        AND status != 'CANCELLED'
      GROUP BY day_of_week, hour
      ORDER BY booking_count DESC
      LIMIT 6
    `, [salonId]);

    // Check current availability for each popular time
    const popularTimesWithAvailability = await Promise.all(
      popularSlots.map(async (slot) => {
        const nextDate = this.getNextDateForDayOfWeek(slot.day_of_week);
        const timeSlot = `${slot.hour}:00`;

        const isAvailable = await this.slotFinder.checkSlotAvailable({
          salonId,
          date: nextDate,
          time: timeSlot,
        });

        return {
          dayOfWeek: slot.day_of_week,
          hour: slot.hour,
          bookingCount: slot.booking_count,
          popularityScore: slot.booking_count / this.getMaxBookings(popularSlots),
          isAvailable,
          nextAvailableSlot: isAvailable ? nextDate : null,
        };
      })
    );

    // If no history (new salon), return default popular times
    if (popularTimesWithAvailability.length === 0) {
      return this.getDefaultPopularTimes();
    }

    return popularTimesWithAvailability;
  }

  private getDefaultPopularTimes(): PopularTimeSlot[] {
    // Industry standard popular times for salons
    return [
      { dayOfWeek: 5, hour: 14, bookingCount: 0, popularityScore: 1.0 }, // Friday 2pm
      { dayOfWeek: 5, hour: 15, bookingCount: 0, popularityScore: 0.9 }, // Friday 3pm
      { dayOfWeek: 6, hour: 10, bookingCount: 0, popularityScore: 0.8 }, // Saturday 10am
      { dayOfWeek: 6, hour: 14, bookingCount: 0, popularityScore: 0.7 }, // Saturday 2pm
    ];
  }
}
```

---

**8. Waitlist Notifier Service (`Backend/src/modules/notifications/waitlist-notifier.service.ts` - NEW FILE)**

```typescript
import { Injectable } from '@nestjs/common';
import { addMinutes } from 'date-fns';

@Injectable()
export class WaitlistNotifierService {
  async notifyWaitlistOfOpening(slotId: string) {
    // Called when slot becomes available (cancellation or new opening)

    // Get first person in waitlist for this slot's service/date/time
    const nextCustomer = await this.waitlistRepository.findFirst({
      service_id: slot.serviceId,
      status: 'active',
      orderBy: { position_in_queue: 'asc' }, // First in queue
    });

    if (!nextCustomer) {
      // No one waiting
      return;
    }

    // Send WhatsApp notification
    const expiresAt = addMinutes(new Date(), 15);

    await this.whatsappService.sendInteractiveMessage({
      to: nextCustomer.customerPhone,
      type: 'button',
      body: {
        text: `Good news! A slot just opened:\n\n` +
              `📅 ${formatDate(slot.date)}\n` +
              `🕐 ${formatTime(slot.startTime)}\n` +
              `💇 ${slot.serviceName}\n` +
              `👤 ${slot.masterName}\n\n` +
              `⏱️ Reserved for you for 15 minutes`,
      },
      buttons: [
        {
          id: `waitlist_book_${nextCustomer.id}_${slotId}`,
          title: '✅ Book Now',
        },
        {
          id: `waitlist_pass_${nextCustomer.id}`,
          title: '❌ Pass',
        },
      ],
    });

    // Update waitlist status
    await this.waitlistRepository.update(nextCustomer.id, {
      status: 'notified',
      notified_at: new Date(),
      notification_expires_at: expiresAt,
      slot_offered_id: slotId,
    });

    // Schedule expiry check in 15 minutes
    await this.notificationScheduler.scheduleExpiryCheck(
      nextCustomer.id,
      expiresAt
    );
  }

  async handleWaitlistBookNow(waitlistId: string, slotId: string) {
    // Customer clicked [Book Now] button

    // Check if still within 15-min window
    const waitlistEntry = await this.waitlistRepository.findById(waitlistId);

    if (waitlistEntry.notification_expires_at < new Date()) {
      // Expired!
      return {
        success: false,
        message: 'Sorry, time expired. Notifying next person...',
      };
    }

    // Check if slot still available
    const slotAvailable = await this.slotFinder.checkSlotAvailable(slotId);

    if (!slotAvailable) {
      // Slot already taken by someone else
      return {
        success: false,
        message: 'Sorry, just booked! Here are other times:',
        alternatives: await this.slotFinder.findAlternatives(slotId),
      };
    }

    // Create booking
    const booking = await this.bookingService.create({
      slotId,
      customerId: waitlistEntry.customer_id,
      serviceId: waitlistEntry.service_id,
      masterId: waitlistEntry.master_id,
    });

    // Update waitlist status
    await this.waitlistRepository.update(waitlistId, {
      status: 'booked',
      booked_at: new Date(),
    });

    return {
      success: true,
      booking,
      message: '✅ Booked! Confirmation sent.',
    };
  }

  async handleWaitlistExpiry(waitlistId: string) {
    // Called by scheduler after 15 minutes

    const waitlistEntry = await this.waitlistRepository.findById(waitlistId);

    if (waitlistEntry.status !== 'notified') {
      // Customer already responded
      return;
    }

    // Mark as expired
    await this.waitlistRepository.update(waitlistId, {
      status: 'expired',
    });

    // Notify customer they're still in queue
    await this.whatsappService.sendMessage({
      to: waitlistEntry.customerPhone,
      text: `Slot offer expired. You're still in the waitlist (position ${waitlistEntry.position_in_queue}). We'll notify you if another opens!`,
    });

    // Notify next person in queue
    await this.notifyNextInQueue(waitlistEntry.slot_offered_id);
  }

  private async notifyNextInQueue(slotId: string) {
    // Recursively notify next person
    await this.notifyWaitlistOfOpening(slotId);
  }
}
```

---

### WhatsApp Interactive Message Examples

**Example 1: Reply Buttons (≤3 slots)**

```json
{
  "messaging_product": "whatsapp",
  "to": "1234567890",
  "type": "interactive",
  "interactive": {
    "type": "button",
    "body": {
      "text": "Available times on Friday:\n\n💇 Women's Haircut\n⏱️  60 min\n💰 $50\n👤 Sarah Johnson"
    },
    "action": {
      "buttons": [
        {
          "type": "reply",
          "reply": {
            "id": "slot_m123_2024-10-25_14:00",
            "title": "2:00 PM - Sarah"
          }
        },
        {
          "type": "reply",
          "reply": {
            "id": "slot_m123_2024-10-25_15:00",
            "title": "3:00 PM - Sarah ⭐"
          }
        },
        {
          "type": "reply",
          "reply": {
            "id": "slot_m123_2024-10-25_16:00",
            "title": "4:00 PM - Sarah"
          }
        }
      ]
    },
    "footer": {
      "text": "⭐ Your preferred time | Tap to select"
    }
  }
}
```

**Example 2: List Message (4-10 slots)**

```json
{
  "messaging_product": "whatsapp",
  "to": "1234567890",
  "type": "interactive",
  "interactive": {
    "type": "list",
    "header": {
      "type": "text",
      "text": "Next Available Times"
    },
    "body": {
      "text": "Friday is fully booked. Here are alternatives:"
    },
    "footer": {
      "text": "Tap to select your time"
    },
    "action": {
      "button": "Select Time",
      "sections": [
        {
          "title": "Saturday, Oct 26",
          "rows": [
            {
              "id": "slot_m123_2024-10-26_10:00",
              "title": "10:00 AM - Sarah",
              "description": "60 min • $50"
            },
            {
              "id": "slot_m123_2024-10-26_14:00",
              "title": "2:00 PM - Sarah ⭐",
              "description": "60 min • $50"
            }
          ]
        },
        {
          "title": "Sunday, Oct 27",
          "rows": [
            {
              "id": "slot_m456_2024-10-27_11:00",
              "title": "11:00 AM - Alex",
              "description": "60 min • $50"
            },
            {
              "id": "slot_m123_2024-10-27_15:00",
              "title": "3:00 PM - Sarah",
              "description": "60 min • $50"
            }
          ]
        }
      ]
    }
  }
}
```

**Example 3: Confirmation Card**

```json
{
  "messaging_product": "whatsapp",
  "to": "1234567890",
  "type": "interactive",
  "interactive": {
    "type": "button",
    "header": {
      "type": "text",
      "text": "Confirm Your Booking"
    },
    "body": {
      "text": "You selected:\n\n📅 Friday, October 25, 2025\n🕐 3:00 PM - 4:00 PM\n💇 Women's Haircut\n👤 Sarah Johnson\n💰 $50.00"
    },
    "footer": {
      "text": "You'll receive a reminder 24h before"
    },
    "action": {
      "buttons": [
        {
          "type": "reply",
          "reply": {
            "id": "confirm_book_123",
            "title": "✅ Confirm"
          }
        },
        {
          "type": "reply",
          "reply": {
            "id": "action_change_time",
            "title": "Change Time"
          }
        }
      ]
    }
  }
}
```

**Example 4: Waitlist/Escalation Card**

```json
{
  "messaging_product": "whatsapp",
  "to": "1234567890",
  "type": "interactive",
  "interactive": {
    "type": "button",
    "header": {
      "type": "text",
      "text": "We're Very Busy! 🎉"
    },
    "body": {
      "text": "Fully booked for 3 weeks!\n\nEarliest availability:\n📅 Monday, Nov 18 at 2:00 PM\n👤 Sarah Johnson\n\nWant earlier? Join waitlist!"
    },
    "action": {
      "buttons": [
        {
          "type": "reply",
          "reply": {
            "id": "action_join_waitlist",
            "title": "Join Waitlist"
          }
        },
        {
          "type": "reply",
          "reply": {
            "id": "slot_m123_2024-11-18_14:00",
            "title": "Book Nov 18"
          }
        },
        {
          "type": "reply",
          "reply": {
            "id": "action_call_salon",
            "title": "Call Salon"
          }
        }
      ]
    }
  }
}
```

---

### Database Schema

**No schema changes required** - existing `bookings`, `masters`, `services` tables sufficient.

**Optional new table for customer preferences:**

```sql
CREATE TABLE customer_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  favorite_master_id UUID REFERENCES masters(id),
  favorite_service_id UUID REFERENCES services(id),
  preferred_day_of_week VARCHAR(10), -- 'monday', 'friday', etc.
  preferred_time_of_day VARCHAR(10), -- 'morning', 'afternoon', 'evening'
  avg_rebooking_days INT, -- 28 for monthly, 42 for 6-week, etc.
  total_bookings INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_customer_prefs ON customer_preferences(customer_id);
```

**Optional new table for waitlist:**

```sql
CREATE TABLE waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salons(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  service_id UUID NOT NULL REFERENCES services(id),
  master_id UUID REFERENCES masters(id), -- NULL = any master
  preferred_date DATE,
  preferred_time TIME,
  notify_via VARCHAR(20) DEFAULT 'whatsapp', -- 'whatsapp', 'email', 'sms'
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'notified', 'booked', 'expired', 'passed'
  notified_at TIMESTAMP, -- When customer was notified of opening
  notification_expires_at TIMESTAMP, -- notified_at + 15 minutes
  booked_at TIMESTAMP, -- When customer successfully booked from waitlist
  slot_offered_id UUID, -- The slot that was offered to customer
  position_in_queue INT, -- Current position (1 = next to be notified)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_waitlist_salon ON waitlist(salon_id, status);
CREATE INDEX idx_waitlist_notification_expiry ON waitlist(notification_expires_at) WHERE status = 'notified';
CREATE INDEX idx_waitlist_position ON waitlist(salon_id, position_in_queue) WHERE status = 'active';
```

**Waitlist status transitions:**
- `active` → Customer waiting in queue
- `notified` → Customer was notified, 15-min timer running
- `booked` → Customer clicked [Book Now] and booking created
- `passed` → Customer clicked [Pass] button
- `expired` → 15 minutes elapsed with no response

---

### Environment Variables

**Existing:**
- `OPENAI_MODEL` - Change to `gpt-3.5-turbo` (from `gpt-4`)

**New:**
- `WHATSAPP_INTERACTIVE_ENABLED` - Boolean flag to enable/disable interactive messages (allows rollback)
- `MAX_SLOT_SEARCH_DAYS` - Max days to search ahead (default: 30)
- `WAITLIST_ENABLED` - Boolean flag to enable waitlist feature

---

## Open Questions *(to be resolved during planning)*

1. **Interactive message analytics**: Track button click-through rates? If yes, add `button_analytics` table with fields: `button_id`, `clicked_at`, `conversation_id`.

2. **Slot caching**: Cache generated time slots for 60 seconds to handle button click delays? Prevents race conditions but adds Redis dependency.

3. **Multi-service booking**: Current spec focuses on single service per booking. Should we support "Haircut AND Coloring" in one conversation? Defer to v2.

4. **Master preference learning algorithm**: Should we use ML model to predict preferred master or simple frequency counting? Start with frequency, add ML later.

5. **Proactive rebooking timing**: Send proactive "time for haircut" message at `avgRebookingDays - 3` or `avgRebookingDays - 7`? Needs A/B testing.

6. **Call Salon button**: Show actual phone number as button text or just "Call Salon"? (WhatsApp allows click-to-call links)

7. **Waitlist notification trigger**: Notify waitlist customers immediately when slot opens or batch every 30 min? Immediate = better UX but more WhatsApp costs.

---

## Related Documents

- **AI_CONVERSATION_FLOW_ANALYSIS.md**: Comprehensive analysis of current flow, token usage, and improvement phases
- **Backend/src/modules/ai/ai.service.ts**: Current AI service implementation (1,052 lines) - needs updates for GPT-3.5 and interactive card generation
- **Backend/src/modules/ai/prompts/system-prompts.ts**: Multi-language system prompts (647 lines) - needs updates for intent extraction optimization
- **Backend/src/modules/whatsapp/webhook.service.ts**: Webhook handler (275 lines) - needs `interactive` message type support
- **WhatsApp Cloud API Docs**: https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages#interactive-messages

---

## Implementation Phases

### Phase 1: Interactive Message Infrastructure (Week 1) ⭐⭐⭐⭐⭐

**Deliverable:** Working WhatsApp interactive cards (Reply Buttons & List Messages) with button click handling

**Tasks:**
- Integrate WhatsApp Cloud API interactive endpoint
- Build `InteractiveCardBuilder` service
- Update webhook handler to process `interactive` message type
- Create button ID parsing logic
- Test with 3-button card and 10-item list

**Success:** Can send interactive card → customer taps button → webhook receives button ID

---

### Phase 2: Never-Ending Slot Search (Week 1) ⭐⭐⭐⭐⭐

**Deliverable:** Infinite slot finder that ALWAYS finds slots or shows waitlist

**Tasks:**
- Build `SlotFinderService` with 30-day lookahead
- Implement alternative ranking algorithm
- Add "See More" pagination logic
- Create waitlist escalation flow
- Test with fully-booked salon

**Success:** 0% dead-end conversations (all end with booking, waitlist, or call button)

---

### Phase 3: Zero-Typing Button Flow (Week 2) ⭐⭐⭐⭐

**Deliverable:** Complete booking via taps only (no typing after first message)

**Tasks:**
- Build first-message intent parser
- Create confirmation card with [Confirm] button
- Implement tap-to-book flow
- Add navigation buttons (See More, Different Day, Next Week)
- Test end-to-end: 1 message + 2 taps = booking

**Success:** 95%+ bookings completed with 0 typing after initial message

---

### Phase 4: Smart Context (Week 2) ⭐⭐⭐

**Deliverable:** Auto-skip for single master/service, returning customer fast-track

**Tasks:**
- Build single master/service detection
- Create customer preference tracking
- Implement "Book Your Usual" card
- Add proactive rebooking cron job
- Test with returning customer

**Success:** Single-master salons achieve 1-tap bookings, returning customers see "usual" option

---

### Phase 5: Multi-Language (Week 3) ⭐⭐

**Deliverable:** Interactive cards in 5 languages (EN, RU, ES, PT, HE)

**Tasks:**
- Create translation constants for button labels
- Implement language-specific date/time formatting
- Add RTL support for Hebrew
- Test with native speakers in each language

**Success:** Russian customer sees "Подтвердить" button, Hebrew shows RTL layout

---

**Total Estimated Time:** 2-3 weeks for complete implementation

**Complexity:** Medium-High (WhatsApp API integration + infinite search algorithm + multi-language)

---

## ✅ SPECIFICATION READY FOR PLANNING

This specification is now complete and ready for `/speckit.plan` to generate implementation tasks! 🚀
