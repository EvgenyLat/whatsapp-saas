# Task List: Automated Reminder System Implementation

**Feature**: Automated Reminder System
**Specification**: `.specify/features/automated-reminders.md`
**Implementation Plan**: `.specify/plans/automated-reminders-implementation-plan.md`
**Status**: Ready to Start
**Estimated Total Time**: 40 hours (5 days @ 8h/day)

---

## Task Organization

**Total Tasks**: 25
- **P0 (Critical)**: 15 tasks
- **P1 (High)**: 7 tasks
- **P2 (Medium)**: 3 tasks

**By Phase**:
- Phase 1 (Database): 4 tasks
- Phase 2 (Service): 2 tasks
- Phase 3 (Worker): 2 tasks
- Phase 4 (Integration): 3 tasks
- Phase 5 (Frontend): 3 tasks
- Phase 6 (Testing): 3 tasks
- Phase 7 (Docs): 1 task
- Phase 8 (Deployment): 7 tasks

---

## DAY 1: Database + Core Service (8 hours)

### Phase 1: Database Foundation (4 hours)

#### ✅ Task 1.1: Create Database Migration [P0]
**Time**: 1 hour
**Assignee**: Backend Developer
**Dependencies**: None

**Checklist**:
- [ ] Generate Prisma migration: `npx prisma migrate dev --name add_reminders_table --create-only`
- [ ] Write SQL for `reminders` table with all fields
- [ ] Add indexes: booking_id, salon_id+scheduled_at, status, job_id
- [ ] Add columns to `bookings` table: reminder_sent, reminder_response, reminder_response_at
- [ ] Add index on bookings: (reminder_sent, reminder_response)
- [ ] Create updated_at trigger for reminders table
- [ ] Apply migration: `npx prisma migrate dev`
- [ ] Verify tables created: `psql $DATABASE_URL -c "\d reminders"`
- [ ] Test migration rollback works
- [ ] Commit migration files

**Files**:
- `Backend/prisma/migrations/*/migration.sql` (new)

**Validation**:
```bash
cd Backend
npx prisma migrate dev
psql $DATABASE_URL -c "SELECT * FROM reminders LIMIT 1;"
```

---

#### ✅ Task 1.2: Update Prisma Schema [P0]
**Time**: 30 minutes
**Assignee**: Backend Developer
**Dependencies**: Task 1.1

**Checklist**:
- [ ] Add `Reminder` model to schema.prisma
- [ ] Add all fields matching migration
- [ ] Add relations to Booking and Salon
- [ ] Add indexes (4 indexes)
- [ ] Update `Booking` model with reminder fields
- [ ] Update `Booking` model with `reminders` relation
- [ ] Update `Salon` model with `reminders` relation
- [ ] Run `npx prisma format`
- [ ] Run `npx prisma validate`
- [ ] Run `npx prisma generate`
- [ ] Verify TypeScript types available

**Files**:
- `Backend/prisma/schema.prisma`

**Validation**:
```typescript
import { Reminder } from '@prisma/client';
// Should compile without errors
```

---

#### ✅ Task 1.3: Create Reminder Entity and DTOs [P0]
**Time**: 1 hour
**Assignee**: Backend Developer
**Dependencies**: Task 1.2

**Checklist**:
- [ ] Create `Backend/src/modules/reminders/entities/reminder.entity.ts`
- [ ] Define `Reminder` class implementing Prisma type
- [ ] Define `ReminderStatus` enum (PENDING, SENT, DELIVERED, FAILED, CANCELLED)
- [ ] Define `ReminderAction` enum (CONFIRM, CANCEL, RESCHEDULE, UNKNOWN)
- [ ] Create `Backend/src/modules/reminders/dto/reminder-response.dto.ts`
- [ ] Add Swagger decorators (@ApiProperty)
- [ ] Add class-validator decorators (@IsString, @IsDate, @IsEnum)
- [ ] Create `reminder-stats.dto.ts` with metrics fields
- [ ] Create `process-response.dto.ts` for webhook responses
- [ ] Create `dto/index.ts` barrel export
- [ ] Run `npm run build` to verify TypeScript compiles
- [ ] Check Swagger docs generate correctly

**Files**:
- `Backend/src/modules/reminders/entities/reminder.entity.ts` (new)
- `Backend/src/modules/reminders/dto/reminder-response.dto.ts` (new)
- `Backend/src/modules/reminders/dto/reminder-stats.dto.ts` (new)
- `Backend/src/modules/reminders/dto/process-response.dto.ts` (new)
- `Backend/src/modules/reminders/dto/index.ts` (new)

**Validation**:
```bash
cd Backend
npm run build
# Should compile without errors
```

---

#### ✅ Task 1.4: Create Reminders Module Structure [P0]
**Time**: 30 minutes
**Assignee**: Backend Developer
**Dependencies**: Task 1.3

**Checklist**:
- [ ] Run `nest g module reminders`
- [ ] Run `nest g service reminders`
- [ ] Run `nest g controller reminders`
- [ ] Update `RemindersModule` to import DatabaseModule
- [ ] Update `RemindersModule` to import WhatsAppModule
- [ ] Register BullMQ queue: `BullModule.registerQueue({ name: 'reminder' })`
- [ ] Export `RemindersService` from module
- [ ] Add `RemindersModule` to `AppModule` imports
- [ ] Run `npm run start:dev`
- [ ] Verify no compilation errors
- [ ] Check module loads in app startup logs

**Files**:
- `Backend/src/modules/reminders/reminders.module.ts` (new)
- `Backend/src/modules/reminders/reminders.service.ts` (skeleton)
- `Backend/src/modules/reminders/reminders.controller.ts` (skeleton)
- `Backend/src/app.module.ts` (modified)

**Validation**:
```bash
cd Backend
npm run start:dev
# Check logs: [NestApplication] Nest application successfully started
```

---

### Phase 2: Core Service Implementation (4 hours)

#### ✅ Task 2.1: Implement Reminder Scheduling Logic [P0]
**Time**: 2 hours
**Assignee**: Backend Developer
**Dependencies**: Task 1.4

**Checklist**:
- [ ] Inject PrismaService, Queue, WhatsAppService in constructor
- [ ] Implement `scheduleReminder(bookingId: string)` method
- [ ] Fetch booking from database with salon relation
- [ ] Calculate reminder time (start_ts - 24 hours)
- [ ] Validate reminder time is in future
- [ ] Call `cancelReminder()` to remove existing reminder
- [ ] Create reminder record in database with PENDING status
- [ ] Add job to BullMQ queue with calculated delay
- [ ] Store job ID in reminder record
- [ ] Add error handling with try/catch
- [ ] Add logging for all operations
- [ ] Implement `cancelReminder(bookingId: string)` method
- [ ] Find active reminder for booking
- [ ] Remove job from BullMQ queue using job ID
- [ ] Update reminder status to CANCELLED
- [ ] Test scheduling manually with test booking
- [ ] Verify job appears in Redis queue

**Files**:
- `Backend/src/modules/reminders/reminders.service.ts` (implement methods)

**Validation**:
```typescript
// Manual test in service
const testBooking = await prisma.booking.create({
  data: {
    salon_id: 'test-salon',
    start_ts: new Date(Date.now() + 48 * 60 * 60 * 1000),
    // ... other fields
  },
});

await remindersService.scheduleReminder(testBooking.id);

// Check database
const reminder = await prisma.reminder.findFirst({
  where: { booking_id: testBooking.id },
});
console.log('Reminder scheduled for:', reminder.scheduled_at);

// Check queue
const job = await reminderQueue.getJob(`reminder:${testBooking.id}`);
console.log('Job in queue:', job.id);
```

---

#### ✅ Task 2.2: Implement Reminder Sending Logic [P0]
**Time**: 2 hours
**Assignee**: Backend Developer
**Dependencies**: Task 2.1

**Checklist**:
- [ ] Implement `sendReminder(reminderId: string)` method
- [ ] Fetch reminder with booking and salon details
- [ ] Call `generateReminderMessage(booking)` to get message text
- [ ] Send WhatsApp message via WhatsAppService
- [ ] Update reminder status to SENT
- [ ] Store WhatsApp message ID
- [ ] Update sent_at timestamp
- [ ] Update booking.reminder_sent = true
- [ ] Handle errors and update failure status
- [ ] Implement `generateReminderMessage(booking)` private method
- [ ] Format date in Russian locale (toLocaleDateString)
- [ ] Format time in Russian locale (toLocaleTimeString)
- [ ] Build message template with booking details
- [ ] Include confirmation options (1/2/3)
- [ ] Test message generation with sample data
- [ ] Verify emoji rendering (🔔 📅 💇 📍)
- [ ] Test error handling (invalid phone, API failure)

**Files**:
- `Backend/src/modules/reminders/reminders.service.ts` (add methods)

**Validation**:
```typescript
// Test message generation
const testBooking = {
  customer_name: 'Иван Иванов',
  start_ts: new Date('2025-10-26T14:00:00Z'),
  service: 'Стрижка мужская',
  salon: { name: 'Салон Красоты', owner_id: 'owner-1' },
  salon_id: 'salon-1',
};

const message = service.generateReminderMessage(testBooking);
console.log(message);

// Expected output:
// 🔔 Напоминание о визите
//
// Здравствуйте, Иван Иванов!
//
// Напоминаем о вашей записи:
// 📅 26 октября в 14:00
// 💇 Услуга: Стрижка мужская
// 📍 Салон Красоты
//
// Пожалуйста, подтвердите визит:
// 1️⃣ Подтверждаю
// 2️⃣ Отменяю запись
// 3️⃣ Хочу перенести
//
// Ответьте номером нужного варианта.
```

---

## DAY 2: Worker + Integration (8 hours)

### Phase 3: Worker Implementation (3 hours)

#### ✅ Task 3.1: Create Reminder Worker [P0]
**Time**: 1.5 hours
**Assignee**: Backend Developer
**Dependencies**: Task 2.2

**Checklist**:
- [ ] Create `Backend/src/modules/queue/workers/reminder.worker.ts`
- [ ] Create class extending WorkerHost with @Processor decorator
- [ ] Set concurrency to 5 in decorator options
- [ ] Inject RemindersService in constructor
- [ ] Implement `process(job: Job)` method
- [ ] Extract bookingId and reminderId from job data
- [ ] Call `remindersService.sendReminder(reminderId)`
- [ ] Return success result object
- [ ] Re-throw errors for BullMQ retry
- [ ] Implement @OnWorkerEvent('completed') handler
- [ ] Implement @OnWorkerEvent('failed') handler
- [ ] Implement @OnWorkerEvent('active') handler
- [ ] Add logging for all events
- [ ] Update QueueModule to import RemindersModule
- [ ] Register ReminderWorker as provider
- [ ] Test worker starts without errors
- [ ] Test worker processes jobs correctly

**Files**:
- `Backend/src/modules/queue/workers/reminder.worker.ts` (new)
- `Backend/src/modules/queue/queue.module.ts` (modified)

**Validation**:
```bash
cd Backend
npm run start:dev

# Check logs for:
# [ReminderWorker] Worker registered and listening

# Create test reminder and trigger immediately
# Check logs for:
# [ReminderWorker] Processing reminder job...
# [ReminderWorker] Reminder job completed successfully
```

---

#### ✅ Task 3.2: Implement Response Processing [P0]
**Time**: 1.5 hours
**Assignee**: Backend Developer
**Dependencies**: Task 3.1

**Checklist**:
- [ ] Implement `processResponse(bookingId, responseText)` method
- [ ] Call `parseResponse(responseText)` to get action
- [ ] Find active reminder for booking (status = SENT)
- [ ] Update reminder with response details
- [ ] Implement switch statement for actions (CONFIRM/CANCEL/RESCHEDULE)
- [ ] Implement `parseResponse(text: string): ReminderAction` private method
- [ ] Normalize input (toLowerCase, trim)
- [ ] Match confirmation patterns: /^1$|подтверж|да|ок|ok|yes|приду/
- [ ] Match cancellation patterns: /^2$|отмен|нет|no|cancel/
- [ ] Match reschedule patterns: /^3$|перенес|reschedule|change|другое время/
- [ ] Return UNKNOWN for unrecognized input
- [ ] Implement `handleConfirmation(booking)` private method
- [ ] Update booking status to CONFIRMED
- [ ] Set reminder_response and reminder_response_at
- [ ] Send confirmation message to customer
- [ ] Implement `handleCancellation(booking)` private method
- [ ] Update booking status to CANCELLED
- [ ] Send cancellation confirmation message
- [ ] Implement `handleReschedule(booking)` private method
- [ ] Set reminder_response to RESCHEDULE
- [ ] Send reschedule instructions message
- [ ] Test all response patterns
- [ ] Test unknown responses don't crash

**Files**:
- `Backend/src/modules/reminders/reminders.service.ts` (add methods)

**Validation**:
```typescript
// Test response parsing
const testCases = [
  { input: '1', expected: 'CONFIRM' },
  { input: 'Подтверждаю', expected: 'CONFIRM' },
  { input: 'да', expected: 'CONFIRM' },
  { input: '2', expected: 'CANCEL' },
  { input: 'Отменяю', expected: 'CANCEL' },
  { input: '3', expected: 'RESCHEDULE' },
  { input: 'перенести', expected: 'RESCHEDULE' },
  { input: 'random text', expected: 'UNKNOWN' },
];

testCases.forEach(({ input, expected }) => {
  const result = service.parseResponse(input);
  console.assert(result === expected, `Failed for "${input}"`);
});
```

---

### Phase 4: Service Integration (5 hours)

#### ✅ Task 4.1: Integrate with BookingsService [P0]
**Time**: 2 hours
**Assignee**: Backend Developer
**Dependencies**: Task 3.2

**Checklist**:
- [ ] Update `BookingsModule` to import RemindersModule
- [ ] Inject RemindersService into BookingsService constructor
- [ ] In `create()` method: add reminder scheduling after booking creation
- [ ] Wrap scheduling in try/catch (don't fail booking if scheduling fails)
- [ ] Log success/failure of reminder scheduling
- [ ] In `update()` method: check if start_ts changed
- [ ] If time changed, reschedule reminder
- [ ] In `cancel()` method: cancel reminder after booking cancellation
- [ ] Test creating booking schedules reminder
- [ ] Test updating booking time reschedules reminder
- [ ] Test cancelling booking cancels reminder
- [ ] Verify database consistency (bookings + reminders)
- [ ] Test error scenarios (scheduling fails, booking still created)

**Files**:
- `Backend/src/modules/bookings/bookings.module.ts` (modified)
- `Backend/src/modules/bookings/bookings.service.ts` (modified)

**Validation**:
```bash
# Create booking via API
curl -X POST http://localhost:3000/api/bookings \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "salon_id": "salon-123",
    "customer_phone": "+79991234567",
    "start_ts": "2025-10-28T14:00:00Z",
    "service": "Haircut"
  }'

# Check database
SELECT * FROM reminders WHERE booking_id = 'newly-created-booking-id';
# Should have status = PENDING, scheduled_at = 24h before start_ts

# Update booking time
curl -X PATCH http://localhost:3000/api/bookings/{id} \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"start_ts": "2025-10-28T16:00:00Z"}'

# Check reminder rescheduled
SELECT scheduled_at FROM reminders WHERE booking_id = '{id}';
```

---

#### ✅ Task 4.2: Integrate with WebhookService [P0]
**Time**: 2 hours
**Assignee**: Backend Developer
**Dependencies**: Task 4.1

**Checklist**:
- [ ] Update `WhatsAppModule` to import RemindersModule
- [ ] Inject RemindersService into WebhookService constructor
- [ ] Implement `findRecentBookingForCustomer(phone, salonId)` helper
- [ ] Query bookings with reminder_sent = true, reminder_response = null
- [ ] Filter by start_ts >= now (future bookings only)
- [ ] Filter by created_at >= 48h ago
- [ ] Order by created_at DESC
- [ ] In `processIncomingMessage()`: call helper before AI processing
- [ ] If recent booking found, try processing as reminder response
- [ ] Call `remindersService.processResponse(bookingId, messageText)`
- [ ] If successful, return early (don't continue to AI)
- [ ] If failed, log warning and continue with AI processing
- [ ] Test with simulated webhook payload
- [ ] Test confirmation response updates booking
- [ ] Test cancellation response updates booking
- [ ] Test non-reminder messages pass through to AI
- [ ] Test multiple bookings scenario (should match most recent)

**Files**:
- `Backend/src/modules/whatsapp/whatsapp.module.ts` (modified)
- `Backend/src/modules/whatsapp/webhook.service.ts` (modified)

**Validation**:
```bash
# Create test booking with reminder_sent = true
# (Use API or database)

# Simulate WhatsApp webhook
curl -X POST http://localhost:3000/api/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "entry": [{
      "changes": [{
        "value": {
          "messages": [{
            "from": "+79991234567",
            "text": { "body": "Подтверждаю" }
          }]
        }
      }]
    }]
  }'

# Check database
SELECT status, reminder_response FROM bookings WHERE customer_phone = '+79991234567';
# Should show: status = CONFIRMED, reminder_response = CONFIRM
```

---

#### ✅ Task 4.3: Add Admin API Endpoints [P1]
**Time**: 1 hour
**Assignee**: Backend Developer
**Dependencies**: Task 4.2

**Checklist**:
- [ ] Update RemindersController with GET /stats endpoint
- [ ] Add @ApiOperation and @ApiResponse decorators
- [ ] Add @Query('salon_id') parameter
- [ ] Implement `getStats(salonId)` in RemindersService
- [ ] Query counts: total, sent, confirmed, cancelled, failed
- [ ] Calculate delivery_rate and response_rate percentages
- [ ] Return ReminderStatsDto
- [ ] Add GET /booking/:bookingId endpoint to controller
- [ ] Implement `getBookingReminders(bookingId)` in service
- [ ] Query all reminders for booking, order by created_at DESC
- [ ] Map to ReminderResponseDto array
- [ ] Test stats endpoint returns correct data
- [ ] Test booking reminders endpoint returns history
- [ ] Verify Swagger docs generated correctly
- [ ] Test with Postman or curl

**Files**:
- `Backend/src/modules/reminders/reminders.controller.ts` (add endpoints)
- `Backend/src/modules/reminders/reminders.service.ts` (add methods)

**Validation**:
```bash
# Get stats
curl http://localhost:3000/api/reminders/stats?salon_id=salon-123 \
  -H "Authorization: Bearer $TOKEN"

# Expected response:
# {
#   "total": 50,
#   "sent": 48,
#   "confirmed": 30,
#   "cancelled": 5,
#   "failed": 2,
#   "delivery_rate": "96.0",
#   "response_rate": "72.9"
# }

# Get booking reminders
curl http://localhost:3000/api/reminders/booking/booking-123 \
  -H "Authorization: Bearer $TOKEN"

# Expected: Array of reminder objects
```

---

## DAY 3: Frontend Prep (4 hours)

#### ✅ Task 4.4: Create API Client for Reminders [P1]
**Time**: 30 minutes
**Assignee**: Frontend Developer
**Dependencies**: Task 4.3

**Checklist**:
- [ ] Create `Frontend/src/lib/api/reminders.ts`
- [ ] Implement `fetchReminderStats(salonId: string)` function
- [ ] Implement `fetchBookingReminders(bookingId: string)` function
- [ ] Add proper error handling with try/catch
- [ ] Add TypeScript types for responses
- [ ] Test API calls return expected data
- [ ] Handle 401 unauthorized errors

**Files**:
- `Frontend/src/lib/api/reminders.ts` (new)
- `Frontend/src/types/reminder.ts` (new - TypeScript types)

**Validation**:
```typescript
import { fetchReminderStats } from '@/lib/api/reminders';

const stats = await fetchReminderStats('salon-123');
console.log(stats.delivery_rate); // Should be string like "95.0"
```

---

#### ✅ Task 4.5: Update Booking Types [P2]
**Time**: 15 minutes
**Assignee**: Frontend Developer
**Dependencies**: Task 4.4

**Checklist**:
- [ ] Update `Frontend/src/types/booking.ts` to include reminder fields
- [ ] Add `reminder_sent: boolean` field
- [ ] Add `reminder_response: string | null` field
- [ ] Add `reminder_response_at: string | null` field
- [ ] Add `reminders?: Reminder[]` optional relation
- [ ] Update API response types
- [ ] Test TypeScript compilation

**Files**:
- `Frontend/src/types/booking.ts` (modified)
- `Frontend/src/types/reminder.ts` (new if not created in 4.4)

---

## DAY 4: Frontend Implementation (8 hours)

### Phase 5: Frontend Components (8 hours)

#### ✅ Task 5.1: Create ReminderStatusBadge Component [P1]
**Time**: 1.5 hours
**Assignee**: Frontend Developer
**Dependencies**: Task 4.5

**Checklist**:
- [ ] Create `Frontend/src/components/features/bookings/ReminderStatusBadge.tsx`
- [ ] Define ReminderStatusBadgeProps interface
- [ ] Implement component with if/else logic
- [ ] Use Badge component from UI library
- [ ] Add variant prop (success, warning, danger, secondary, info)
- [ ] Add emoji icons (⏳ 📤 ✅ ❌ 📅 ❓)
- [ ] Handle all status cases: pending, sent, confirmed, cancelled, reschedule, unknown
- [ ] Add proper TypeScript types
- [ ] Test component renders for all states
- [ ] Check colors match design (green, yellow, red, gray, blue)
- [ ] Verify emoji display correctly
- [ ] Test responsive behavior on mobile
- [ ] Add ARIA labels for accessibility

**Files**:
- `Frontend/src/components/features/bookings/ReminderStatusBadge.tsx` (new)

**Validation**:
```tsx
// Test rendering
<ReminderStatusBadge reminderSent={false} reminderResponse={null} />
// Should show: ⏳ Pending (gray)

<ReminderStatusBadge reminderSent={true} reminderResponse={null} />
// Should show: 📤 Sent - Awaiting Response (yellow)

<ReminderStatusBadge reminderSent={true} reminderResponse="CONFIRM" />
// Should show: ✅ Confirmed (green)
```

---

#### ✅ Task 5.2: Update Bookings List Page [P1]
**Time**: 1 hour
**Assignee**: Frontend Developer
**Dependencies**: Task 5.1

**Checklist**:
- [ ] Open `Frontend/src/app/(dashboard)/dashboard/bookings/page.tsx`
- [ ] Import ReminderStatusBadge component
- [ ] Add "Reminder Status" column to table definition
- [ ] Use ReminderStatusBadge in cell renderer
- [ ] Pass reminderSent and reminderResponse props
- [ ] Adjust column widths for new column
- [ ] Test table layout on desktop
- [ ] Test table layout on mobile (should scroll or wrap)
- [ ] Verify sorting works (if applicable)
- [ ] Test filtering by reminder status (if applicable)
- [ ] Check performance with 100+ rows

**Files**:
- `Frontend/src/app/(dashboard)/dashboard/bookings/page.tsx` (modified)

**Validation**:
- Visit http://localhost:3001/dashboard/bookings
- Verify "Reminder Status" column appears
- Check badges render for each booking
- Test responsive layout on mobile browser

---

#### ✅ Task 5.3: Create ReminderHistoryTimeline Component [P1]
**Time**: 2.5 hours
**Assignee**: Frontend Developer
**Dependencies**: Task 5.2

**Checklist**:
- [ ] Create `Frontend/src/components/features/bookings/ReminderHistoryTimeline.tsx`
- [ ] Define ReminderHistoryTimelineProps interface
- [ ] Implement useEffect to fetch reminders from API
- [ ] Implement loading state
- [ ] Implement empty state (no reminders)
- [ ] Implement timeline rendering with map()
- [ ] Create TimelineEvent sub-component
- [ ] Add props: timestamp, icon, title, description, variant
- [ ] Format timestamps in Russian locale
- [ ] Add emoji icons for each event type
- [ ] Render scheduled event
- [ ] Render sent event (with attempt count)
- [ ] Render failed event (if applicable)
- [ ] Render response event (with customer text)
- [ ] Style timeline with border-left
- [ ] Add spacing and padding
- [ ] Implement getResponseIcon() helper function
- [ ] Test with different reminder states
- [ ] Test loading state shows spinner
- [ ] Test empty state shows message
- [ ] Verify timestamps format correctly
- [ ] Check responsive layout on mobile

**Files**:
- `Frontend/src/components/features/bookings/ReminderHistoryTimeline.tsx` (new)

**Validation**:
```tsx
// Test component
<ReminderHistoryTimeline bookingId="booking-123" />

// Should show:
// - Loading spinner initially
// - Timeline with events after data loads
// - All events in chronological order
// - Correct icons and colors
```

---

#### ✅ Task 5.4: Update Booking Details Page [P1]
**Time**: 30 minutes
**Assignee**: Frontend Developer
**Dependencies**: Task 5.3

**Checklist**:
- [ ] Open `Frontend/src/app/(dashboard)/dashboard/bookings/[id]/page.tsx`
- [ ] Import ReminderHistoryTimeline component
- [ ] Add new section for reminder history
- [ ] Place component after existing booking details
- [ ] Pass bookingId from page params
- [ ] Test page loads correctly
- [ ] Verify timeline displays for bookings with reminders
- [ ] Check empty state for bookings without reminders
- [ ] Test responsive layout
- [ ] Verify no console errors

**Files**:
- `Frontend/src/app/(dashboard)/dashboard/bookings/[id]/page.tsx` (modified)

**Validation**:
- Visit http://localhost:3001/dashboard/bookings/{id}
- Scroll to reminder history section
- Verify timeline displays correctly
- Test with bookings that have reminders and without

---

#### ✅ Task 5.5: Create ReminderStatsWidget Component [P2]
**Time**: 1.5 hours
**Assignee**: Frontend Developer
**Dependencies**: Task 5.4

**Checklist**:
- [ ] Create `Frontend/src/components/features/dashboard/ReminderStatsWidget.tsx`
- [ ] Define ReminderStatsWidgetProps interface (salonId)
- [ ] Implement useEffect to fetch stats from API
- [ ] Implement loading state
- [ ] Implement null state (if fetch fails)
- [ ] Create grid layout (2 columns)
- [ ] Create StatItem sub-component
- [ ] Add props: label, value, variant
- [ ] Display delivery rate and response rate
- [ ] Display confirmed and cancelled counts
- [ ] Add color coding (green for success, orange for warning)
- [ ] Add summary text at bottom (sent/total, failed)
- [ ] Style with Card component
- [ ] Add title with emoji (📲 Reminder Performance)
- [ ] Test widget with real data
- [ ] Test loading state
- [ ] Verify colors and layout
- [ ] Check responsive on mobile

**Files**:
- `Frontend/src/components/features/dashboard/ReminderStatsWidget.tsx` (new)

**Validation**:
```tsx
<ReminderStatsWidget salonId="salon-123" />

// Should display:
// - Delivery Rate: 95.0%
// - Response Rate: 72.0%
// - Confirmed: 30
// - Cancelled: 5
// - Footer: 48 of 50 reminders sent • 2 failed
```

---

#### ✅ Task 5.6: Add Widget to Dashboard [P2]
**Time**: 30 minutes
**Assignee**: Frontend Developer
**Dependencies**: Task 5.5

**Checklist**:
- [ ] Open `Frontend/src/app/(dashboard)/dashboard/page.tsx`
- [ ] Import ReminderStatsWidget component
- [ ] Add widget to dashboard grid
- [ ] Get salonId from user context or auth
- [ ] Pass salonId to widget
- [ ] Adjust grid layout if needed
- [ ] Test dashboard loads correctly
- [ ] Verify widget displays in correct position
- [ ] Test grid responsive behavior
- [ ] Check all widgets align properly

**Files**:
- `Frontend/src/app/(dashboard)/dashboard/page.tsx` (modified)

**Validation**:
- Visit http://localhost:3001/dashboard
- Verify reminder stats widget appears
- Check data displays correctly
- Test responsive layout on mobile

---

## DAY 5: Testing + Documentation (8 hours)

### Phase 6: Testing (7 hours)

#### ✅ Task 6.1: Write Unit Tests for RemindersService [P0]
**Time**: 3 hours
**Assignee**: Backend Developer
**Dependencies**: Task 4.3

**Checklist**:
- [ ] Create `Backend/src/modules/reminders/__tests__/reminders.service.spec.ts`
- [ ] Set up test module with mocked dependencies
- [ ] Mock PrismaService
- [ ] Mock WhatsAppService
- [ ] Mock BullMQ Queue
- [ ] Write test suite for `scheduleReminder()`
- [ ] Test: schedules reminder 24h before appointment
- [ ] Test: doesn't schedule if appointment <24h away
- [ ] Test: throws error if booking not found
- [ ] Test: cancels existing reminder before creating new one
- [ ] Write test suite for `parseResponse()`
- [ ] Test: recognizes all confirmation patterns (1, да, ок, yes, etc.)
- [ ] Test: recognizes all cancellation patterns (2, нет, отмен, etc.)
- [ ] Test: recognizes all reschedule patterns (3, перенести, etc.)
- [ ] Test: returns UNKNOWN for unrecognized text
- [ ] Write test suite for `sendReminder()`
- [ ] Test: sends WhatsApp message with correct content
- [ ] Test: updates reminder status to SENT
- [ ] Test: stores WhatsApp message ID
- [ ] Test: handles send failures correctly
- [ ] Write test suite for `processResponse()`
- [ ] Test: confirmation updates booking to CONFIRMED
- [ ] Test: cancellation updates booking to CANCELLED
- [ ] Test: reschedule sends instructions
- [ ] Run tests: `npm run test -- reminders.service.spec.ts`
- [ ] Verify all tests pass
- [ ] Check coverage: `npm run test:cov -- reminders.service.spec.ts`
- [ ] Ensure coverage ≥80%

**Files**:
- `Backend/src/modules/reminders/__tests__/reminders.service.spec.ts` (new)

**Validation**:
```bash
cd Backend
npm run test -- reminders.service.spec.ts

# Should output:
# PASS src/modules/reminders/__tests__/reminders.service.spec.ts
#   RemindersService
#     ✓ schedules reminder 24h before appointment
#     ✓ doesn't schedule if <24h away
#     ✓ recognizes confirmation patterns
#     ... (all tests passing)
#
# Coverage: 85% (target: ≥80%)
```

---

#### ✅ Task 6.2: Write Integration/E2E Tests [P0]
**Time**: 3 hours
**Assignee**: Backend Developer
**Dependencies**: Task 6.1

**Checklist**:
- [ ] Create `Backend/test/reminders.e2e-spec.ts`
- [ ] Set up test app with AppModule
- [ ] Create test user and salon in beforeAll()
- [ ] Get auth token for API requests
- [ ] Clean up test data in afterAll()
- [ ] Write test: "should schedule reminder when booking is created"
- [ ] POST to /api/bookings with future appointment
- [ ] Verify reminder created in database
- [ ] Check scheduled_at is 24h before start_ts
- [ ] Write test: "should reschedule reminder when booking time updated"
- [ ] PATCH booking with new start_ts
- [ ] Verify reminder scheduled_at updated
- [ ] Write test: "should cancel reminder when booking cancelled"
- [ ] DELETE booking
- [ ] Verify reminder status = CANCELLED
- [ ] Write test: "should process customer confirmation"
- [ ] Create booking with reminder_sent = true
- [ ] Simulate WhatsApp webhook with "Подтверждаю"
- [ ] Verify booking status = CONFIRMED
- [ ] Verify reminder_response = CONFIRM
- [ ] Write test: "should get stats for salon"
- [ ] GET /api/reminders/stats?salon_id={id}
- [ ] Verify response has all required fields
- [ ] Write test: "should get booking reminder history"
- [ ] GET /api/reminders/booking/{id}
- [ ] Verify returns array of reminders
- [ ] Run tests: `npm run test:e2e -- reminders.e2e-spec.ts`
- [ ] Verify all tests pass
- [ ] Check for database consistency issues

**Files**:
- `Backend/test/reminders.e2e-spec.ts` (new)

**Validation**:
```bash
cd Backend
npm run test:e2e -- reminders.e2e-spec.ts

# Should output:
# PASS test/reminders.e2e-spec.ts
#   Reminders (e2e)
#     ✓ should schedule reminder when booking is created
#     ✓ should reschedule reminder when booking time updated
#     ✓ should cancel reminder when booking cancelled
#     ✓ should process customer confirmation
#     ✓ should get stats for salon
#     ✓ should get booking reminder history
```

---

#### ✅ Task 6.3: Manual Testing + Bug Fixes [P0]
**Time**: 2 hours
**Assignee**: QA / Developer
**Dependencies**: Task 6.2

**Test Scenarios Checklist**:

**Scenario 1: Happy Path - Full Flow**
- [ ] Create booking for tomorrow 2pm via admin dashboard
- [ ] Check database: reminder created with scheduled_at = today 2pm
- [ ] Check Redis queue: job scheduled with correct delay
- [ ] Manually trigger reminder or wait (if time allows)
- [ ] Verify WhatsApp message sent to customer
- [ ] Reply with "Подтверждаю" via WhatsApp (or simulate webhook)
- [ ] Check booking status changed to CONFIRMED
- [ ] Verify confirmation message received
- [ ] Check admin dashboard shows "✅ Confirmed" badge
- [ ] Open booking details, verify timeline shows all events

**Scenario 2: Cancellation Flow**
- [ ] Create booking with reminder
- [ ] Reply with "2" or "Отменяю"
- [ ] Verify booking status = CANCELLED
- [ ] Check cancellation confirmation message sent
- [ ] Verify admin dashboard shows "❌ Cancelled"
- [ ] Check timeline shows cancellation event

**Scenario 3: Reschedule Flow**
- [ ] Create booking with reminder
- [ ] Reply with "3" or "Перенести"
- [ ] Verify reschedule instructions sent
- [ ] Check booking status unchanged
- [ ] Verify reminder_response = RESCHEDULE
- [ ] Check admin dashboard shows "📅 Reschedule Requested"

**Scenario 4: Error Handling**
- [ ] Create booking with invalid phone number (if possible)
- [ ] Trigger reminder send
- [ ] Verify error logged
- [ ] Check retry attempts in database
- [ ] Verify reminder status = FAILED after 3 attempts

**Scenario 5: Edge Cases**
- [ ] Create booking <24h in future → should not schedule reminder
- [ ] Update booking time to tomorrow → should reschedule
- [ ] Cancel booking before reminder sent → should cancel reminder
- [ ] Send unknown response text → should log as UNKNOWN, not crash

**Bug Tracking**:
- [ ] Create GitHub issues for any bugs found
- [ ] Fix critical bugs before completion
- [ ] Document known issues (if any)

**Performance Testing**:
- [ ] Create 10 bookings simultaneously
- [ ] Verify all reminders scheduled correctly
- [ ] Check queue processing time <5s per reminder
- [ ] Monitor memory usage during processing

**Files**:
- `docs/TESTING_REPORT_REMINDERS.md` (create summary)

**Validation**:
All test scenarios pass without critical bugs

---

### Phase 7: Documentation (1 hour)

#### ✅ Task 7.1: Update All Documentation [P1]
**Time**: 1 hour
**Assignee**: Developer
**Dependencies**: Task 6.3

**Checklist**:
- [ ] Create `Backend/src/modules/reminders/README.md`
- [ ] Document module purpose and features
- [ ] Add usage examples (schedule, process response, get stats)
- [ ] Document API endpoints with examples
- [ ] Add configuration section (env vars)
- [ ] Add testing instructions
- [ ] Add troubleshooting section
- [ ] Update main project `README.md`
- [ ] Add "Automated Reminders" to features list
- [ ] Link to reminders module README
- [ ] Update `DEVELOPMENT_ROADMAP.md` if exists
- [ ] Mark "Automated Reminders" as complete
- [ ] Update `CHANGELOG.md` (if exists)
- [ ] Add entry for reminder system implementation
- [ ] Create `docs/REMINDERS_USER_GUIDE.md` for salon owners
- [ ] Explain how reminders work from user perspective
- [ ] Add FAQ section
- [ ] Review all docs for clarity and completeness

**Files**:
- `Backend/src/modules/reminders/README.md` (new)
- `README.md` (modified)
- `DEVELOPMENT_ROADMAP.md` (modified)
- `CHANGELOG.md` (modified)
- `docs/REMINDERS_USER_GUIDE.md` (new)

**Validation**:
- All documentation files render correctly in GitHub
- No broken links
- Examples are copy-paste ready
- Screenshots/diagrams included (if applicable)

---

## DEPLOYMENT PHASE (Post-Development)

### Phase 8: Deployment Preparation (Variable timing)

#### ✅ Task 8.1: Environment Variable Setup [P0]
**Time**: 30 minutes
**Assignee**: DevOps / Developer
**Dependencies**: Task 7.1

**Checklist**:
- [ ] Update `.env.example` with reminder-related variables
- [ ] Add `REDIS_HOST` and `REDIS_PORT` (if not already there)
- [ ] Document all environment variables in README
- [ ] Verify `.env` file has correct values for development
- [ ] Create `.env.production` template
- [ ] Update deployment docs with env var requirements

**Files**:
- `.env.example` (modified)
- `README.md` or `docs/DEPLOYMENT.md` (modified)

---

#### ✅ Task 8.2: Database Migration for Production [P0]
**Time**: 30 minutes
**Assignee**: DevOps / Developer
**Dependencies**: Task 8.1

**Checklist**:
- [ ] Review migration file for production safety
- [ ] Test migration on staging database first
- [ ] Create rollback script (if not auto-generated)
- [ ] Backup production database
- [ ] Apply migration to production: `npx prisma migrate deploy`
- [ ] Verify tables created correctly
- [ ] Run `SELECT COUNT(*) FROM reminders` to verify table exists
- [ ] Monitor for any errors in logs

**Files**:
- `Backend/prisma/migrations/*/migration.sql` (deployed)

**Validation**:
```bash
# On production server
cd Backend
npx prisma migrate deploy
psql $DATABASE_URL -c "\d reminders"
# Should show table structure
```

---

#### ✅ Task 8.3: Worker Deployment [P0]
**Time**: 1 hour
**Assignee**: DevOps / Developer
**Dependencies**: Task 8.2

**Checklist**:
- [ ] Ensure Redis is running in production
- [ ] Update worker startup command in production scripts
- [ ] If using PM2, update ecosystem.config.js
- [ ] If using Docker, update docker-compose.production.yml
- [ ] Start worker process separately from API server
- [ ] Verify worker connects to Redis queue
- [ ] Check worker logs for "Worker registered" message
- [ ] Test worker processes jobs correctly
- [ ] Set up worker restart on crash (PM2 or systemd)
- [ ] Monitor worker health

**Files**:
- `ecosystem.config.js` (if using PM2) (modified)
- `docker-compose.production.yml` (if using Docker) (modified)
- `docs/DEPLOYMENT.md` (add worker deployment section)

**Validation**:
```bash
# Check worker is running
pm2 list
# or
docker ps | grep worker

# Check logs
pm2 logs reminder-worker
# or
docker logs <container-id>

# Should see: [ReminderWorker] Worker registered and listening
```

---

#### ✅ Task 8.4: Monitoring Setup [P1]
**Time**: 1 hour
**Assignee**: DevOps / Developer
**Dependencies**: Task 8.3

**Checklist**:
- [ ] Add reminder metrics to monitoring dashboard
- [ ] Track: reminders scheduled, sent, failed, response rate
- [ ] Set up alerts for high failure rate (>10%)
- [ ] Set up alerts for queue backlog (>100 jobs)
- [ ] Add BullMQ dashboard (bull-board) to admin panel
- [ ] Configure CloudWatch (if on AWS) or equivalent
- [ ] Create Grafana dashboard for reminder metrics
- [ ] Test alerts trigger correctly

**Files**:
- Monitoring configuration files (varies by setup)
- `Backend/src/modules/queue/bull-board.module.ts` (if adding dashboard)

---

#### ✅ Task 8.5: Beta Testing Rollout [P0]
**Time**: 2 hours
**Assignee**: Product / QA
**Dependencies**: Task 8.4

**Checklist**:
- [ ] Select 5-10 test salons for beta
- [ ] Enable reminders for beta salons only (if feature flag exists)
- [ ] Send instructions to beta testers
- [ ] Create feedback form/survey
- [ ] Monitor reminder delivery rate for beta salons
- [ ] Track response rate and customer feedback
- [ ] Monitor error logs for issues
- [ ] Fix any critical bugs found
- [ ] Collect qualitative feedback from salon owners
- [ ] Analyze metrics after 1 week

**Files**:
- `docs/BETA_TESTING_PLAN.md` (create)
- Feedback survey (Google Forms or similar)

**Success Criteria**:
- Delivery rate ≥90% for beta salons
- No critical bugs reported
- Positive feedback from salon owners
- Response rate ≥30%

---

#### ✅ Task 8.6: Full Production Rollout [P0]
**Time**: 1 hour
**Assignee**: Product / DevOps
**Dependencies**: Task 8.5

**Checklist**:
- [ ] Analyze beta testing results
- [ ] Fix any remaining bugs from beta
- [ ] Update reminder message templates if needed
- [ ] Enable reminders for all salons
- [ ] Send announcement to all salon owners
- [ ] Create user guide/tutorial
- [ ] Monitor metrics closely for first 24h
- [ ] Track delivery rate, response rate, error rate
- [ ] Be ready to rollback if critical issues found
- [ ] Collect feedback via support channels

**Files**:
- `docs/REMINDERS_ANNOUNCEMENT.md` (email to salon owners)
- `docs/REMINDERS_USER_GUIDE.md` (update if needed)

**Success Criteria**:
- Delivery rate ≥95% across all salons
- Response rate ≥40%
- Error rate <5%
- No critical bugs in production
- Positive feedback from salon owners

---

#### ✅ Task 8.7: Post-Launch Monitoring [P1]
**Time**: Ongoing
**Assignee**: DevOps / Support
**Dependencies**: Task 8.6

**Checklist**:
- [ ] Monitor metrics daily for first week
- [ ] Review error logs daily
- [ ] Check delivery rates by salon
- [ ] Identify salons with high failure rates
- [ ] Investigate and fix issues
- [ ] Track no-show rate reduction (requires 2-4 weeks data)
- [ ] Collect customer feedback
- [ ] Plan improvements for v2.0
- [ ] Document lessons learned

**Weekly Metrics to Track**:
- Total reminders sent
- Delivery rate (%)
- Response rate (%)
- Confirmation rate (%)
- Cancellation rate (%)
- Error rate (%)
- Average response time
- No-show rate (before vs after)

**Files**:
- `docs/REMINDERS_METRICS_REPORT.md` (weekly updates)

---

## Summary Statistics

### Time Breakdown by Phase

| Phase | Tasks | Hours | % of Total |
|-------|-------|-------|------------|
| Phase 1: Database | 4 | 3.0h | 7.5% |
| Phase 2: Service | 2 | 4.0h | 10% |
| Phase 3: Worker | 2 | 3.0h | 7.5% |
| Phase 4: Integration | 4 | 6.5h | 16.25% |
| Phase 5: Frontend | 6 | 8.0h | 20% |
| Phase 6: Testing | 3 | 8.0h | 20% |
| Phase 7: Docs | 1 | 1.0h | 2.5% |
| Phase 8: Deployment | 7 | 6.5h | 16.25% |
| **TOTAL** | **29** | **40h** | **100%** |

### Priority Breakdown

| Priority | Tasks | Hours | % of Total |
|----------|-------|-------|------------|
| P0 (Critical) | 17 | 28.5h | 71.25% |
| P1 (High) | 9 | 9.5h | 23.75% |
| P2 (Medium) | 3 | 2.0h | 5% |

### By Team Member

| Role | Tasks | Hours | % of Total |
|------|-------|-------|------------|
| Backend Developer | 16 | 25.0h | 62.5% |
| Frontend Developer | 7 | 8.5h | 21.25% |
| QA / Tester | 1 | 2.0h | 5% |
| DevOps | 4 | 3.5h | 8.75% |
| Product | 1 | 1.0h | 2.5% |

---

## Quick Start Checklist

To start implementation immediately:

**Day 1 Morning** (Start Here):
1. [ ] Run Task 1.1: Create database migration
2. [ ] Run Task 1.2: Update Prisma schema
3. [ ] Run Task 1.3: Create entities and DTOs
4. [ ] Run Task 1.4: Create module structure

**First Milestone** (After 4 hours):
- Database ready
- Module scaffolded
- Types defined
- Ready for service implementation

**Critical Path** (Must complete in order):
```
Task 1.1 → 1.2 → 1.3 → 1.4 → 2.1 → 2.2 → 3.1 → 3.2 → 4.1 → 4.2 → 6.1 → 6.2 → 6.3
```

**Can Work in Parallel**:
- After Task 4.3: Frontend tasks (5.1-5.6) can start
- After Task 6.3: Documentation (7.1) and deployment prep (8.1-8.2)

---

## Risk Assessment

### High Risk Tasks (Monitor Closely)

1. **Task 3.2: Response Processing** - Complex parsing logic, many edge cases
2. **Task 4.2: Webhook Integration** - Must not break existing AI flow
3. **Task 6.3: Manual Testing** - Real WhatsApp testing may reveal issues
4. **Task 8.3: Worker Deployment** - Production worker must be reliable
5. **Task 8.6: Full Rollout** - Risk of high-volume issues

### Mitigation Strategies

- Extensive unit testing for parsing (Task 6.1)
- Integration testing for webhook (Task 6.2)
- Beta testing before full rollout (Task 8.5)
- Monitoring and alerting (Task 8.4)
- Rollback plan ready

---

## Next Steps

**Ready to Start?**

1. **Review this task list** with team
2. **Assign tasks** to team members
3. **Set up project board** (GitHub Projects, Jira, etc.)
4. **Start with Task 1.1** (Database migration)
5. **Track progress** daily
6. **Hold daily standups** to identify blockers
7. **Update checklist** as tasks complete

**When Done**:

Run `/speckit.implement` to get AI assistance with specific code implementation!

---

**Task List Version**: 1.0.0
**Created**: 2025-10-24
**Status**: Ready for Implementation
**Estimated Completion**: 5 days (with 1-2 developers)

✅ **All tasks defined, estimated, and ready to execute!**
