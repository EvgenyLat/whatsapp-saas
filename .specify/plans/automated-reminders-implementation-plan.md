# Implementation Plan: Automated Reminder System

**Feature**: Automated Reminder System
**Specification**: `.specify/features/automated-reminders.md`
**Status**: Ready for Implementation
**Estimated Duration**: 5 days (1 Backend Developer)
**Priority**: P1 (High - Critical for Beta Launch)

---

## Executive Summary

This plan breaks down the implementation of the Automated Reminder System into discrete, testable tasks. The system will automatically send WhatsApp reminders 24 hours before appointments and process customer responses to update booking status.

**Implementation Approach**: Bottom-up (database → services → workers → integration → frontend → testing)

**Key Milestones**:
- Day 1: Database migration + RemindersService foundation
- Day 2: ReminderWorker + queue integration
- Day 3: BookingsService + WebhookService integration
- Day 4: Frontend components + admin dashboard
- Day 5: Testing + bug fixes

---

## Phase 1: Database Foundation (Day 1, Morning - 4 hours)

### Task 1.1: Create Database Migration for Reminders Table

**Priority**: P0 (Blocking)
**Effort**: 1 hour
**Assignee**: Backend Developer

**Objective**: Create PostgreSQL migration for the new `reminders` table.

**Implementation Steps**:

```bash
# Generate migration file
cd Backend
npx prisma migrate dev --name add_reminders_table --create-only
```

**Migration File**: `Backend/prisma/migrations/YYYYMMDDHHMMSS_add_reminders_table/migration.sql`

```sql
-- Create reminders table
CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,

  -- Scheduling
  scheduled_at TIMESTAMP NOT NULL,
  sent_at TIMESTAMP,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  delivery_status VARCHAR(50),

  -- Response
  response_received_at TIMESTAMP,
  response_action VARCHAR(50),
  response_text TEXT,

  -- Error handling
  attempts INTEGER DEFAULT 0,
  last_error TEXT,

  -- Metadata
  whatsapp_message_id VARCHAR(255),
  job_id VARCHAR(255),

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_reminders_booking ON reminders(booking_id);
CREATE INDEX idx_reminders_salon_scheduled ON reminders(salon_id, scheduled_at);
CREATE INDEX idx_reminders_status ON reminders(status);
CREATE INDEX idx_reminders_job_id ON reminders(job_id);

-- Add reminder fields to bookings table
ALTER TABLE bookings ADD COLUMN reminder_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE bookings ADD COLUMN reminder_response VARCHAR(50);
ALTER TABLE bookings ADD COLUMN reminder_response_at TIMESTAMP;

-- Create index for reminder status on bookings
CREATE INDEX idx_bookings_reminder_status ON bookings(reminder_sent, reminder_response);

-- Add updated_at trigger for reminders
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_reminders_updated_at BEFORE UPDATE ON reminders
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**Validation**:
```bash
# Apply migration
npx prisma migrate dev

# Verify schema
npx prisma db pull
npx prisma generate

# Check tables exist
psql $DATABASE_URL -c "\d reminders"
psql $DATABASE_URL -c "\d bookings"
```

**Success Criteria**:
- ✅ Migration runs without errors
- ✅ `reminders` table created with all fields
- ✅ All indexes created
- ✅ `bookings` table updated with new columns
- ✅ Prisma client regenerated

**Files Changed**:
- `Backend/prisma/migrations/*/migration.sql` (new)
- `Backend/prisma/schema.prisma` (auto-updated)
- `Backend/node_modules/.prisma/client/` (regenerated)

---

### Task 1.2: Update Prisma Schema

**Priority**: P0 (Blocking)
**Effort**: 30 minutes
**Assignee**: Backend Developer

**Objective**: Manually update Prisma schema to match migration.

**Implementation Steps**:

Edit `Backend/prisma/schema.prisma`:

```prisma
// Add Reminder model
model Reminder {
  id                   String    @id @default(uuid())
  booking_id           String
  salon_id             String

  // Scheduling
  scheduled_at         DateTime
  sent_at              DateTime?

  // Status
  status               String    @default("PENDING") // PENDING, SENT, DELIVERED, FAILED, CANCELLED
  delivery_status      String?   // WhatsApp API delivery status

  // Response
  response_received_at DateTime?
  response_action      String?   // CONFIRM, CANCEL, RESCHEDULE, UNKNOWN
  response_text        String?

  // Error handling
  attempts             Int       @default(0)
  last_error           String?

  // Metadata
  whatsapp_message_id  String?
  job_id               String?   // BullMQ job ID

  created_at           DateTime  @default(now())
  updated_at           DateTime  @updatedAt

  // Relations
  booking              Booking   @relation(fields: [booking_id], references: [id], onDelete: Cascade)
  salon                Salon     @relation(fields: [salon_id], references: [id], onDelete: Cascade)

  @@index([booking_id])
  @@index([salon_id, scheduled_at])
  @@index([status])
  @@index([job_id])
  @@map("reminders")
}

// Update Booking model
model Booking {
  // ... existing fields ...

  // Reminder fields
  reminder_sent        Boolean   @default(false)
  reminder_response    String?   // CONFIRM, CANCEL, RESCHEDULE
  reminder_response_at DateTime?

  // Relations
  reminders            Reminder[] // NEW relation

  // ... existing relations ...

  @@index([reminder_sent, reminder_response])
  // ... existing indexes ...
}

// Update Salon model (add relation)
model Salon {
  // ... existing fields ...

  reminders            Reminder[] // NEW relation

  // ... existing relations ...
}
```

**Validation**:
```bash
# Format schema
npx prisma format

# Validate schema
npx prisma validate

# Regenerate client
npx prisma generate
```

**Success Criteria**:
- ✅ Schema validates without errors
- ✅ Relations correctly defined
- ✅ Indexes match migration
- ✅ Prisma client regenerated with new types

**Files Changed**:
- `Backend/prisma/schema.prisma`

---

### Task 1.3: Create Reminder Entity and DTOs

**Priority**: P0 (Blocking)
**Effort**: 1 hour
**Assignee**: Backend Developer

**Objective**: Create TypeScript types and DTOs for reminder operations.

**Implementation Steps**:

**1. Create Entity** (`Backend/src/modules/reminders/entities/reminder.entity.ts`):

```typescript
import { Reminder as PrismaReminder } from '@prisma/client';

export class Reminder implements PrismaReminder {
  id: string;
  booking_id: string;
  salon_id: string;

  scheduled_at: Date;
  sent_at: Date | null;

  status: string;
  delivery_status: string | null;

  response_received_at: Date | null;
  response_action: string | null;
  response_text: string | null;

  attempts: number;
  last_error: string | null;

  whatsapp_message_id: string | null;
  job_id: string | null;

  created_at: Date;
  updated_at: Date;
}

export enum ReminderStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum ReminderAction {
  CONFIRM = 'CONFIRM',
  CANCEL = 'CANCEL',
  RESCHEDULE = 'RESCHEDULE',
  UNKNOWN = 'UNKNOWN',
}
```

**2. Create DTOs** (`Backend/src/modules/reminders/dto/`):

```typescript
// reminder-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsDate, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { ReminderStatus, ReminderAction } from '../entities/reminder.entity';

export class ReminderResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  booking_id: string;

  @ApiProperty()
  scheduled_at: Date;

  @ApiProperty({ required: false })
  sent_at?: Date;

  @ApiProperty({ enum: ReminderStatus })
  status: ReminderStatus;

  @ApiProperty({ required: false, enum: ReminderAction })
  response_action?: ReminderAction;

  @ApiProperty({ required: false })
  response_text?: string;

  @ApiProperty()
  attempts: number;

  @ApiProperty()
  created_at: Date;
}

// reminder-stats.dto.ts
export class ReminderStatsDto {
  @ApiProperty()
  total: number;

  @ApiProperty()
  sent: number;

  @ApiProperty()
  confirmed: number;

  @ApiProperty()
  cancelled: number;

  @ApiProperty()
  failed: number;

  @ApiProperty({ description: 'Delivery rate percentage' })
  delivery_rate: string;

  @ApiProperty({ description: 'Response rate percentage' })
  response_rate: string;
}

// process-response.dto.ts
export class ProcessResponseDto {
  @ApiProperty()
  @IsString()
  booking_id: string;

  @ApiProperty()
  @IsString()
  response_text: string;
}
```

**Validation**:
```typescript
// Run TypeScript check
npm run build

// Verify types are available
import { Reminder, ReminderStatus } from '@modules/reminders/entities/reminder.entity';
```

**Success Criteria**:
- ✅ Entity matches Prisma schema
- ✅ DTOs have proper validation decorators
- ✅ Swagger decorators for API docs
- ✅ TypeScript compiles without errors
- ✅ Enums defined for status and action

**Files Created**:
- `Backend/src/modules/reminders/entities/reminder.entity.ts`
- `Backend/src/modules/reminders/dto/reminder-response.dto.ts`
- `Backend/src/modules/reminders/dto/reminder-stats.dto.ts`
- `Backend/src/modules/reminders/dto/process-response.dto.ts`
- `Backend/src/modules/reminders/dto/index.ts` (barrel export)

---

### Task 1.4: Create Reminders Module Structure

**Priority**: P0 (Blocking)
**Effort**: 30 minutes
**Assignee**: Backend Developer

**Objective**: Scaffold the reminders module with NestJS structure.

**Implementation Steps**:

```bash
cd Backend
nest g module reminders
nest g service reminders
nest g controller reminders
```

**Update Module** (`Backend/src/modules/reminders/reminders.module.ts`):

```typescript
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { RemindersService } from './reminders.service';
import { RemindersController } from './reminders.controller';
import { DatabaseModule } from '@database/database.module';
import { WhatsAppModule } from '@modules/whatsapp/whatsapp.module';

@Module({
  imports: [
    DatabaseModule,
    WhatsAppModule,
    BullModule.registerQueue({
      name: 'reminder',
    }),
  ],
  controllers: [RemindersController],
  providers: [RemindersService],
  exports: [RemindersService],
})
export class RemindersModule {}
```

**Update App Module** (`Backend/src/app.module.ts`):

```typescript
// Add to imports array
import { RemindersModule } from './modules/reminders/reminders.module';

@Module({
  imports: [
    // ... existing imports ...
    RemindersModule, // ADD THIS
  ],
  // ... rest of module ...
})
export class AppModule {}
```

**Success Criteria**:
- ✅ Module created and registered
- ✅ Service and controller scaffolded
- ✅ BullMQ queue registered for reminders
- ✅ Dependencies imported (Database, WhatsApp)
- ✅ Module exported for use in other modules

**Files Created**:
- `Backend/src/modules/reminders/reminders.module.ts`
- `Backend/src/modules/reminders/reminders.service.ts` (skeleton)
- `Backend/src/modules/reminders/reminders.controller.ts` (skeleton)

**Files Modified**:
- `Backend/src/app.module.ts`

---

## Phase 2: Core Service Implementation (Day 1, Afternoon - 4 hours)

### Task 2.1: Implement RemindersService (Part 1: Scheduling)

**Priority**: P0 (Blocking)
**Effort**: 2 hours
**Assignee**: Backend Developer

**Objective**: Implement reminder scheduling logic.

**Implementation**: See specification `.specify/features/automated-reminders.md` for complete `RemindersService` code.

**Key Methods to Implement**:

1. **scheduleReminder(bookingId: string)**
   - Fetch booking from database
   - Calculate reminder time (start_ts - 24h)
   - Validate time is in future
   - Cancel existing reminder if any
   - Create reminder record in database
   - Add job to BullMQ queue with delay
   - Update reminder with job_id

2. **cancelReminder(bookingId: string)**
   - Find active reminder for booking
   - Remove job from BullMQ queue
   - Update reminder status to CANCELLED

**Code Location**: `Backend/src/modules/reminders/reminders.service.ts`

**Testing During Development**:
```typescript
// Manual test in service
async testScheduling() {
  const testBooking = await this.prisma.booking.create({
    data: {
      salon_id: 'test-salon',
      customer_phone: '+79991234567',
      start_ts: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48h from now
      // ... other required fields
    },
  });

  await this.scheduleReminder(testBooking.id);

  const reminder = await this.prisma.reminder.findFirst({
    where: { booking_id: testBooking.id },
  });

  console.log('Reminder created:', reminder);
  console.log('Scheduled for:', reminder.scheduled_at);
}
```

**Success Criteria**:
- ✅ scheduleReminder calculates correct time (24h before)
- ✅ Reminder record created in database
- ✅ BullMQ job created with correct delay
- ✅ Job ID stored in reminder
- ✅ Existing reminders cancelled when rescheduling
- ✅ Error handling for invalid bookings
- ✅ Logging for all operations

**Files Modified**:
- `Backend/src/modules/reminders/reminders.service.ts`

---

### Task 2.2: Implement RemindersService (Part 2: Sending)

**Priority**: P0 (Blocking)
**Effort**: 2 hours
**Assignee**: Backend Developer

**Objective**: Implement WhatsApp message sending logic.

**Key Methods to Implement**:

1. **sendReminder(reminderId: string)**
   - Fetch reminder with booking and salon details
   - Generate message text using template
   - Call WhatsApp API to send message
   - Update reminder status to SENT
   - Store WhatsApp message ID
   - Update booking.reminder_sent = true
   - Handle errors and retry logic

2. **generateReminderMessage(booking: any): string**
   - Format date and time in Russian
   - Build message with booking details
   - Include confirmation options (1/2/3)
   - Return formatted string

**Message Template**:
```typescript
private generateReminderMessage(booking: any): string {
  const date = new Date(booking.start_ts);
  const dateStr = date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
  });
  const timeStr = date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return `🔔 Напоминание о визите

Здравствуйте${booking.customer_name ? `, ${booking.customer_name}` : ''}!

Напоминаем о вашей записи:
📅 ${dateStr} в ${timeStr}
💇 Услуга: ${booking.service || 'не указана'}
📍 ${booking.salon.name}

Пожалуйста, подтвердите визит:
1️⃣ Подтверждаю
2️⃣ Отменяю запись
3️⃣ Хочу перенести

Ответьте номером нужного варианта.`;
}
```

**Error Handling**:
```typescript
try {
  const result = await this.whatsappService.sendTextMessage(/* ... */);
  await this.updateReminderSuccess(reminderId, result.message_id);
} catch (error) {
  await this.updateReminderFailure(reminderId, error.message);
  throw error; // Re-throw for BullMQ retry
}
```

**Testing**:
```typescript
// Test message generation
const testBooking = {
  customer_name: 'Иван',
  start_ts: new Date('2025-10-26 14:00'),
  service: 'Стрижка мужская',
  salon: { name: 'Салон Красоты' },
};

const message = service.generateReminderMessage(testBooking);
console.log(message);
// Verify formatting is correct
```

**Success Criteria**:
- ✅ Message generated with correct formatting
- ✅ WhatsApp API called successfully
- ✅ Reminder status updated to SENT
- ✅ Message ID stored
- ✅ Booking updated (reminder_sent = true)
- ✅ Errors logged with details
- ✅ Retry mechanism works (will be tested with worker)

**Files Modified**:
- `Backend/src/modules/reminders/reminders.service.ts`

---

## Phase 3: Worker Implementation (Day 2, Morning - 3 hours)

### Task 3.1: Create Reminder Worker

**Priority**: P0 (Blocking)
**Effort**: 1.5 hours
**Assignee**: Backend Developer

**Objective**: Create BullMQ worker to process reminder jobs.

**Implementation**:

Create `Backend/src/modules/queue/workers/reminder.worker.ts`:

```typescript
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { RemindersService } from '@modules/reminders/reminders.service';

@Processor('reminder', {
  concurrency: 5, // Process up to 5 reminders concurrently
})
export class ReminderWorker extends WorkerHost {
  private readonly logger = new Logger(ReminderWorker.name);

  constructor(private remindersService: RemindersService) {
    super();
  }

  async process(job: Job<{ bookingId: string; reminderId: string }>) {
    const { bookingId, reminderId } = job.data;

    this.logger.log(
      `Processing reminder job ${job.id} for booking ${bookingId}`,
    );

    try {
      await this.remindersService.sendReminder(reminderId);

      this.logger.log(
        `Reminder sent successfully for booking ${bookingId}`,
      );

      return {
        success: true,
        reminderId,
        bookingId,
        sentAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `Failed to send reminder for booking ${bookingId}: ${error.message}`,
        error.stack,
      );

      // Re-throw to trigger BullMQ retry mechanism
      throw error;
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job, result: any) {
    this.logger.log(
      `Reminder job ${job.id} completed successfully. Result: ${JSON.stringify(result)}`,
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(
      `Reminder job ${job.id} failed after ${job.attemptsMade} attempts: ${error.message}`,
    );

    // If max retries exceeded, we could notify admin here
    if (job.attemptsMade >= 3) {
      this.logger.error(
        `Max retries exceeded for reminder job ${job.id}. Manual intervention required.`,
      );
      // TODO: Send notification to salon owner
    }
  }

  @OnWorkerEvent('active')
  onActive(job: Job) {
    this.logger.debug(`Processing reminder job ${job.id} (attempt ${job.attemptsMade + 1}/3)`);
  }

  @OnWorkerEvent('progress')
  onProgress(job: Job, progress: number) {
    this.logger.debug(`Job ${job.id} progress: ${progress}%`);
  }
}
```

**Update Queue Module** (`Backend/src/modules/queue/queue.module.ts`):

```typescript
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { ReminderWorker } from './workers/reminder.worker';
import { RemindersModule } from '@modules/reminders/reminders.module';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get('queue.redis.host'),
          port: config.get('queue.redis.port'),
        },
      }),
    }),
    BullModule.registerQueue({
      name: 'reminder',
    }),
    RemindersModule, // Import to access RemindersService
  ],
  providers: [ReminderWorker],
  exports: [BullModule],
})
export class QueueModule {}
```

**Testing**:
```bash
# Start backend in dev mode
cd Backend
npm run start:dev

# In another terminal, trigger a test reminder
curl -X POST http://localhost:3000/api/reminders/test-schedule \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"bookingId": "test-booking-id"}'

# Watch logs for worker processing
# Should see: "Processing reminder job..." followed by "Reminder sent successfully"
```

**Success Criteria**:
- ✅ Worker registered and listening to queue
- ✅ Jobs processed successfully
- ✅ Retry logic works (3 attempts with backoff)
- ✅ Event handlers log appropriately
- ✅ Errors properly logged with context
- ✅ Worker can process multiple jobs concurrently

**Files Created**:
- `Backend/src/modules/queue/workers/reminder.worker.ts`

**Files Modified**:
- `Backend/src/modules/queue/queue.module.ts`

---

### Task 3.2: Implement Response Processing

**Priority**: P0 (Blocking)
**Effort**: 1.5 hours
**Assignee**: Backend Developer

**Objective**: Implement logic to process customer responses to reminders.

**Key Methods to Implement** (in RemindersService):

1. **processResponse(bookingId: string, responseText: string)**
   - Parse response text to determine action
   - Update reminder record with response
   - Update booking status based on action
   - Send confirmation message to customer
   - Log all actions

2. **parseResponse(text: string): ReminderAction**
   - Normalize input (lowercase, trim)
   - Match against patterns for CONFIRM/CANCEL/RESCHEDULE
   - Return action enum or UNKNOWN

**Implementation**:

```typescript
async processResponse(
  bookingId: string,
  responseText: string,
): Promise<void> {
  const action = this.parseResponse(responseText);

  const reminder = await this.prisma.reminder.findFirst({
    where: {
      booking_id: bookingId,
      status: 'SENT',
    },
    include: {
      booking: {
        include: { salon: true },
      },
    },
  });

  if (!reminder) {
    this.logger.warn(
      `No active reminder found for booking ${bookingId}`,
    );
    return;
  }

  // Update reminder record
  await this.prisma.reminder.update({
    where: { id: reminder.id },
    data: {
      response_received_at: new Date(),
      response_action: action,
      response_text: responseText,
    },
  });

  const { booking } = reminder;

  // Handle each action type
  switch (action) {
    case 'CONFIRM':
      await this.handleConfirmation(booking);
      break;
    case 'CANCEL':
      await this.handleCancellation(booking);
      break;
    case 'RESCHEDULE':
      await this.handleReschedule(booking);
      break;
    default:
      this.logger.warn(
        `Unknown response action: ${action} for booking ${bookingId}`,
      );
  }
}

private parseResponse(text: string): string {
  const normalized = text.toLowerCase().trim();

  if (/^1$|подтверж|да|ок|ok|yes|приду/.test(normalized)) {
    return 'CONFIRM';
  }

  if (/^2$|отмен|нет|no|cancel/.test(normalized)) {
    return 'CANCEL';
  }

  if (/^3$|перенес|reschedule|change|другое время/.test(normalized)) {
    return 'RESCHEDULE';
  }

  return 'UNKNOWN';
}

private async handleConfirmation(booking: any) {
  await this.prisma.booking.update({
    where: { id: booking.id },
    data: {
      status: 'CONFIRMED',
      reminder_response: 'CONFIRM',
      reminder_response_at: new Date(),
    },
  });

  const confirmMessage = `✅ Спасибо! Ваш визит подтверждён.\nЖдём вас ${new Date(booking.start_ts).toLocaleDateString('ru-RU')} в ${new Date(booking.start_ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}. До встречи!`;

  await this.whatsappService.sendTextMessage(
    booking.salon.owner_id,
    {
      salon_id: booking.salon_id,
      to: booking.customer_phone,
      text: confirmMessage,
    },
  );

  this.logger.log(`Booking ${booking.id} confirmed by customer`);
}

private async handleCancellation(booking: any) {
  await this.prisma.booking.update({
    where: { id: booking.id },
    data: {
      status: 'CANCELLED',
      reminder_response: 'CANCEL',
      reminder_response_at: new Date(),
    },
  });

  const cancelMessage = `❌ Запись отменена.\nЕсли передумаете, напишите нам. Всегда рады вам помочь!`;

  await this.whatsappService.sendTextMessage(
    booking.salon.owner_id,
    {
      salon_id: booking.salon_id,
      to: booking.customer_phone,
      text: cancelMessage,
    },
  );

  this.logger.log(`Booking ${booking.id} cancelled by customer`);
}

private async handleReschedule(booking: any) {
  await this.prisma.booking.update({
    where: { id: booking.id },
    data: {
      reminder_response: 'RESCHEDULE',
      reminder_response_at: new Date(),
    },
  });

  const rescheduleMessage = `📅 Для переноса записи, пожалуйста, напишите желаемую дату и время.\nНапример: "Хочу перенести на 28 октября в 15:00"\n\nНаш администратор подтвердит доступность времени.`;

  await this.whatsappService.sendTextMessage(
    booking.salon.owner_id,
    {
      salon_id: booking.salon_id,
      to: booking.customer_phone,
      text: rescheduleMessage,
    },
  );

  this.logger.log(`Booking ${booking.id} reschedule requested by customer`);
}
```

**Testing**:
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
  { input: 'что-то другое', expected: 'UNKNOWN' },
];

testCases.forEach(({ input, expected }) => {
  const result = service.parseResponse(input);
  console.assert(result === expected, `Failed for "${input}": got ${result}, expected ${expected}`);
});
```

**Success Criteria**:
- ✅ Response parsing works for all patterns
- ✅ Booking status updated correctly
- ✅ Confirmation messages sent
- ✅ Reminder record updated with response
- ✅ Unknown responses logged but don't crash
- ✅ All database updates in transactions

**Files Modified**:
- `Backend/src/modules/reminders/reminders.service.ts`

---

## Phase 4: Service Integration (Day 2, Afternoon + Day 3 - 6 hours)

### Task 4.1: Integrate with BookingsService

**Priority**: P0 (Blocking)
**Effort**: 2 hours
**Assignee**: Backend Developer

**Objective**: Trigger reminder scheduling when bookings are created/updated.

**Implementation Steps**:

1. **Update BookingsModule** to import RemindersModule:

```typescript
// Backend/src/modules/bookings/bookings.module.ts
import { RemindersModule } from '@modules/reminders/reminders.module';

@Module({
  imports: [
    DatabaseModule,
    RemindersModule, // ADD THIS
  ],
  // ... rest
})
export class BookingsModule {}
```

2. **Inject RemindersService** into BookingsService:

```typescript
// Backend/src/modules/bookings/bookings.service.ts
import { RemindersService } from '@modules/reminders/reminders.service';

export class BookingsService {
  constructor(
    private prisma: PrismaService,
    private remindersService: RemindersService, // ADD THIS
  ) {}
}
```

3. **Schedule reminder on booking creation**:

```typescript
async create(userId: string, dto: CreateBookingDto): Promise<BookingResponseDto> {
  // ... existing validation ...

  const booking = await this.prisma.booking.create({
    data: {
      // ... booking data ...
    },
  });

  // NEW: Schedule reminder for new booking
  try {
    await this.remindersService.scheduleReminder(booking.id);
    this.logger.log(`Reminder scheduled for booking ${booking.id}`);
  } catch (error) {
    // Don't fail booking creation if reminder scheduling fails
    this.logger.error(
      `Failed to schedule reminder for booking ${booking.id}: ${error.message}`,
    );
  }

  return this.mapToResponseDto(booking);
}
```

4. **Reschedule reminder on booking update**:

```typescript
async update(
  id: string,
  userId: string,
  userRole: string,
  dto: UpdateBookingDto,
): Promise<BookingResponseDto> {
  // ... existing validation and update ...

  const booking = await this.prisma.booking.update({
    where: { id },
    data: dto,
  });

  // NEW: Reschedule reminder if time changed
  if (dto.start_ts) {
    try {
      await this.remindersService.scheduleReminder(booking.id);
      this.logger.log(`Reminder rescheduled for booking ${booking.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to reschedule reminder for booking ${booking.id}: ${error.message}`,
      );
    }
  }

  return this.mapToResponseDto(booking);
}
```

5. **Cancel reminder on booking cancellation**:

```typescript
async cancel(
  id: string,
  userId: string,
  userRole: string,
): Promise<{ message: string }> {
  // ... existing validation ...

  await this.prisma.booking.update({
    where: { id },
    data: { status: 'CANCELLED' },
  });

  // NEW: Cancel reminder for cancelled booking
  try {
    await this.remindersService.cancelReminder(id);
    this.logger.log(`Reminder cancelled for booking ${id}`);
  } catch (error) {
    this.logger.error(
      `Failed to cancel reminder for booking ${id}: ${error.message}`,
    );
  }

  return { message: 'Booking cancelled successfully' };
}
```

**Testing**:
```bash
# Test booking creation triggers reminder
curl -X POST http://localhost:3000/api/bookings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "salon_id": "salon-123",
    "customer_phone": "+79991234567",
    "customer_name": "Test Customer",
    "service": "Haircut",
    "start_ts": "2025-10-28T14:00:00Z"
  }'

# Check database for reminder
SELECT * FROM reminders WHERE booking_id = 'newly-created-booking-id';

# Test booking update reschedules reminder
curl -X PATCH http://localhost:3000/api/bookings/{id} \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"start_ts": "2025-10-28T16:00:00Z"}'

# Verify reminder rescheduled
SELECT scheduled_at FROM reminders WHERE booking_id = 'booking-id';
```

**Success Criteria**:
- ✅ Creating booking schedules reminder
- ✅ Updating booking time reschedules reminder
- ✅ Cancelling booking cancels reminder
- ✅ Errors don't block booking operations
- ✅ All operations logged
- ✅ Database consistency maintained

**Files Modified**:
- `Backend/src/modules/bookings/bookings.module.ts`
- `Backend/src/modules/bookings/bookings.service.ts`

---

### Task 4.2: Integrate with WebhookService

**Priority**: P0 (Blocking)
**Effort**: 2 hours
**Assignee**: Backend Developer

**Objective**: Detect and process reminder responses from WhatsApp webhook.

**Implementation Steps**:

1. **Update WhatsAppModule** to import RemindersModule:

```typescript
// Backend/src/modules/whatsapp/whatsapp.module.ts
import { RemindersModule } from '@modules/reminders/reminders.module';

@Module({
  imports: [
    DatabaseModule,
    RemindersModule, // ADD THIS
    // ... other imports
  ],
  // ... rest
})
export class WhatsAppModule {}
```

2. **Inject RemindersService** into WebhookService:

```typescript
// Backend/src/modules/whatsapp/webhook.service.ts
import { RemindersService } from '@modules/reminders/reminders.service';

export class WebhookService {
  constructor(
    private prisma: PrismaService,
    private aiService: AIService,
    private remindersService: RemindersService, // ADD THIS
  ) {}
}
```

3. **Add helper method** to find recent booking for customer:

```typescript
private async findRecentBookingForCustomer(
  phone: string,
  salonId: string,
): Promise<any | null> {
  // Find booking with reminder sent in last 48 hours
  const twoDaysAgo = new Date();
  twoDaysAgo.setHours(twoDaysAgo.getHours() - 48);

  return this.prisma.booking.findFirst({
    where: {
      salon_id: salonId,
      customer_phone: phone,
      reminder_sent: true,
      reminder_response: null, // No response yet
      start_ts: { gte: new Date() }, // Future booking
      created_at: { gte: twoDaysAgo },
    },
    orderBy: { created_at: 'desc' },
  });
}
```

4. **Update message processing** to check for reminder responses:

```typescript
async processIncomingMessage(webhookData: any): Promise<void> {
  // ... existing webhook parsing ...

  const message = webhookData.entry[0].changes[0].value.messages[0];
  const salonId = this.extractSalonId(webhookData);

  // NEW: Check if this might be a reminder response
  const recentBooking = await this.findRecentBookingForCustomer(
    message.from,
    salonId,
  );

  if (recentBooking) {
    this.logger.log(
      `Checking if message is reminder response for booking ${recentBooking.id}`,
    );

    // Try to process as reminder response
    try {
      await this.remindersService.processResponse(
        recentBooking.id,
        message.text.body,
      );

      // If successfully processed, don't continue with AI processing
      this.logger.log(
        `Message processed as reminder response for booking ${recentBooking.id}`,
      );
      return;
    } catch (error) {
      // If processing failed, continue with normal AI flow
      this.logger.warn(
        `Failed to process as reminder response: ${error.message}. Continuing with AI processing.`,
      );
    }
  }

  // ... continue with existing AI message processing ...
}
```

**Testing**:
```bash
# Create test booking with reminder sent
# (Use API or database)

# Simulate WhatsApp webhook with customer response
curl -X POST http://localhost:3000/api/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "entry": [{
      "changes": [{
        "value": {
          "messages": [{
            "from": "+79991234567",
            "text": {
              "body": "Подтверждаю"
            }
          }]
        }
      }]
    }]
  }'

# Check database for updated booking status
SELECT status, reminder_response FROM bookings WHERE id = 'test-booking-id';
```

**Success Criteria**:
- ✅ Reminder responses detected correctly
- ✅ Responses processed before AI flow
- ✅ Booking status updated
- ✅ Confirmation message sent
- ✅ Non-reminder messages pass through to AI
- ✅ Errors logged appropriately
- ✅ No webhook processing failures

**Files Modified**:
- `Backend/src/modules/whatsapp/whatsapp.module.ts`
- `Backend/src/modules/whatsapp/webhook.service.ts`

---

### Task 4.3: Add Admin API Endpoints

**Priority**: P1 (High)
**Effort**: 2 hours
**Assignee**: Backend Developer

**Objective**: Create API endpoints for admin to view reminder stats and history.

**Implementation**:

Update `Backend/src/modules/reminders/reminders.controller.ts`:

```typescript
import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { RemindersService } from './reminders.service';
import { ReminderStatsDto, ReminderResponseDto } from './dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';

@ApiTags('reminders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reminders')
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Get('stats')
  @ApiOperation({
    summary: 'Get reminder statistics for salon',
    description: 'Returns delivery rate, response rate, and counts',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    type: ReminderStatsDto,
  })
  async getStats(
    @Query('salon_id') salonId: string,
  ): Promise<ReminderStatsDto> {
    return this.remindersService.getStats(salonId);
  }

  @Get('booking/:bookingId')
  @ApiOperation({
    summary: 'Get reminder history for a booking',
    description: 'Returns all reminders associated with a booking',
  })
  @ApiParam({ name: 'bookingId', description: 'Booking ID' })
  @ApiResponse({
    status: 200,
    description: 'Reminder history retrieved',
    type: [ReminderResponseDto],
  })
  async getBookingReminders(
    @Param('bookingId') bookingId: string,
  ): Promise<ReminderResponseDto[]> {
    return this.remindersService.getBookingReminders(bookingId);
  }
}
```

**Implement Service Methods**:

```typescript
// In RemindersService

async getStats(salonId: string): Promise<ReminderStatsDto> {
  const [total, sent, confirmed, cancelled, failed] = await Promise.all([
    this.prisma.reminder.count({ where: { salon_id: salonId } }),
    this.prisma.reminder.count({
      where: { salon_id: salonId, status: 'SENT' },
    }),
    this.prisma.reminder.count({
      where: { salon_id: salonId, response_action: 'CONFIRM' },
    }),
    this.prisma.reminder.count({
      where: { salon_id: salonId, response_action: 'CANCEL' },
    }),
    this.prisma.reminder.count({
      where: { salon_id: salonId, status: 'FAILED' },
    }),
  ]);

  const deliveryRate = total > 0 ? ((sent / total) * 100).toFixed(1) : '0';
  const responseRate = sent > 0 ? (((confirmed + cancelled) / sent) * 100).toFixed(1) : '0';

  return {
    total,
    sent,
    confirmed,
    cancelled,
    failed,
    delivery_rate: deliveryRate,
    response_rate: responseRate,
  };
}

async getBookingReminders(bookingId: string): Promise<ReminderResponseDto[]> {
  const reminders = await this.prisma.reminder.findMany({
    where: { booking_id: bookingId },
    orderBy: { created_at: 'desc' },
  });

  return reminders.map((r) => ({
    id: r.id,
    booking_id: r.booking_id,
    scheduled_at: r.scheduled_at,
    sent_at: r.sent_at,
    status: r.status as ReminderStatus,
    response_action: r.response_action as ReminderAction,
    response_text: r.response_text,
    attempts: r.attempts,
    created_at: r.created_at,
  }));
}
```

**Testing**:
```bash
# Get stats for salon
curl http://localhost:3000/api/reminders/stats?salon_id=salon-123 \
  -H "Authorization: Bearer $TOKEN"

# Expected response:
# {
#   "total": 100,
#   "sent": 95,
#   "confirmed": 60,
#   "cancelled": 10,
#   "failed": 5,
#   "delivery_rate": "95.0",
#   "response_rate": "73.7"
# }

# Get reminder history for booking
curl http://localhost:3000/api/reminders/booking/booking-123 \
  -H "Authorization: Bearer $TOKEN"
```

**Success Criteria**:
- ✅ Stats endpoint returns correct calculations
- ✅ Booking reminders endpoint returns full history
- ✅ All endpoints protected by JWT auth
- ✅ Swagger documentation generated
- ✅ Proper error handling for invalid IDs

**Files Modified**:
- `Backend/src/modules/reminders/reminders.controller.ts`
- `Backend/src/modules/reminders/reminders.service.ts`

---

## Phase 5: Frontend Implementation (Day 4 - 4 hours)

### Task 5.1: Create Reminder Status Components

**Priority**: P1 (High)
**Effort**: 1.5 hours
**Assignee**: Frontend Developer

**Objective**: Create UI components to display reminder status.

**Implementation**:

**1. ReminderStatusBadge Component**:

Create `Frontend/src/components/features/bookings/ReminderStatusBadge.tsx`:

```typescript
import { Badge } from '@/components/ui/Badge';

interface ReminderStatusBadgeProps {
  reminderSent: boolean;
  reminderResponse: string | null;
}

export function ReminderStatusBadge({
  reminderSent,
  reminderResponse,
}: ReminderStatusBadgeProps) {
  if (!reminderSent) {
    return <Badge variant="secondary">⏳ Pending</Badge>;
  }

  if (!reminderResponse) {
    return <Badge variant="warning">📤 Sent - Awaiting Response</Badge>;
  }

  switch (reminderResponse) {
    case 'CONFIRM':
      return <Badge variant="success">✅ Confirmed</Badge>;
    case 'CANCEL':
      return <Badge variant="danger">❌ Cancelled</Badge>;
    case 'RESCHEDULE':
      return <Badge variant="info">📅 Reschedule Requested</Badge>;
    default:
      return <Badge variant="secondary">❓ Unknown Response</Badge>;
  }
}
```

**2. Update Bookings List Page**:

Update `Frontend/src/app/(dashboard)/dashboard/bookings/page.tsx`:

```typescript
import { ReminderStatusBadge } from '@/components/features/bookings/ReminderStatusBadge';

// In the table columns definition
const columns = [
  // ... existing columns ...
  {
    header: 'Reminder Status',
    accessorKey: 'reminder_sent',
    cell: ({ row }) => (
      <ReminderStatusBadge
        reminderSent={row.original.reminder_sent}
        reminderResponse={row.original.reminder_response}
      />
    ),
  },
  // ... existing columns ...
];
```

**Testing**:
- Visit http://localhost:3001/dashboard/bookings
- Verify reminder status column appears
- Check badges display correctly for different states
- Verify colors and icons match specification

**Success Criteria**:
- ✅ Badge component renders for all states
- ✅ Correct colors for each status
- ✅ Icons display properly (emoji or SVG)
- ✅ Responsive on mobile
- ✅ Accessible (proper ARIA labels)

**Files Created**:
- `Frontend/src/components/features/bookings/ReminderStatusBadge.tsx`

**Files Modified**:
- `Frontend/src/app/(dashboard)/dashboard/bookings/page.tsx`

---

### Task 5.2: Create Reminder History Timeline

**Priority**: P1 (High)
**Effort**: 2 hours
**Assignee**: Frontend Developer

**Objective**: Create timeline component to show reminder history.

**Implementation**:

Create `Frontend/src/components/features/bookings/ReminderHistoryTimeline.tsx`:

```typescript
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { useEffect, useState } from 'react';

interface Reminder {
  id: string;
  scheduled_at: string;
  sent_at: string | null;
  response_action: string | null;
  response_text: string | null;
  status: string;
  attempts: number;
}

interface ReminderHistoryTimelineProps {
  bookingId: string;
}

export function ReminderHistoryTimeline({
  bookingId,
}: ReminderHistoryTimelineProps) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReminders() {
      try {
        const response = await fetch(
          `/api/reminders/booking/${bookingId}`,
          {
            headers: {
              Authorization: `Bearer ${getToken()}`,
            },
          },
        );

        if (response.ok) {
          const data = await response.json();
          setReminders(data);
        }
      } catch (error) {
        console.error('Failed to fetch reminders:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchReminders();
  }, [bookingId]);

  if (loading) {
    return <div className="text-center p-4">Loading reminder history...</div>;
  }

  if (reminders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reminder History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">No reminders scheduled for this booking</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reminder History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {reminders.map((reminder) => (
            <div key={reminder.id} className="border-l-2 border-gray-200 pl-4 space-y-4">
              {/* Scheduled */}
              <TimelineEvent
                timestamp={reminder.scheduled_at}
                icon="📅"
                title="Reminder Scheduled"
                description="24 hours before appointment"
              />

              {/* Sent */}
              {reminder.sent_at && (
                <TimelineEvent
                  timestamp={reminder.sent_at}
                  icon="📤"
                  title="WhatsApp Message Sent"
                  description={`Delivered to customer (Attempt ${reminder.attempts})`}
                />
              )}

              {/* Failed */}
              {reminder.status === 'FAILED' && (
                <TimelineEvent
                  timestamp={reminder.sent_at || reminder.scheduled_at}
                  icon="❌"
                  title="Delivery Failed"
                  description={`Failed after ${reminder.attempts} attempts`}
                  variant="error"
                />
              )}

              {/* Response */}
              {reminder.response_action && (
                <TimelineEvent
                  timestamp={reminder.sent_at} // Assuming response came after send
                  icon={getResponseIcon(reminder.response_action)}
                  title="Customer Response Received"
                  description={
                    <>
                      <div>Action: <strong>{reminder.response_action}</strong></div>
                      {reminder.response_text && (
                        <div className="mt-2 p-2 bg-gray-50 rounded text-sm italic">
                          "{reminder.response_text}"
                        </div>
                      )}
                    </>
                  }
                  variant="success"
                />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface TimelineEventProps {
  timestamp: string;
  icon: string;
  title: string;
  description: React.ReactNode;
  variant?: 'default' | 'success' | 'error';
}

function TimelineEvent({
  timestamp,
  icon,
  title,
  description,
  variant = 'default',
}: TimelineEventProps) {
  const variantStyles = {
    default: 'text-gray-700',
    success: 'text-green-700',
    error: 'text-red-700',
  };

  return (
    <div className="flex gap-4">
      <div className="text-2xl">{icon}</div>
      <div className="flex-1">
        <div className="flex justify-between items-start">
          <div className={`font-medium ${variantStyles[variant]}`}>
            {title}
          </div>
          <div className="text-xs text-gray-500">
            {new Date(timestamp).toLocaleString('ru-RU', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>
        <div className="text-sm text-gray-600 mt-1">{description}</div>
      </div>
    </div>
  );
}

function getResponseIcon(action: string): string {
  switch (action) {
    case 'CONFIRM':
      return '✅';
    case 'CANCEL':
      return '❌';
    case 'RESCHEDULE':
      return '📅';
    default:
      return '❓';
  }
}

function getToken(): string {
  // Implement token retrieval from your auth context
  return localStorage.getItem('auth_token') || '';
}
```

**Update Booking Details Page**:

Update `Frontend/src/app/(dashboard)/dashboard/bookings/[id]/page.tsx`:

```typescript
import { ReminderHistoryTimeline } from '@/components/features/bookings/ReminderHistoryTimeline';

// In the page component
export default function BookingDetailsPage({ params }: { params: { id: string } }) {
  // ... existing code ...

  return (
    <div className="space-y-6">
      {/* ... existing booking details ... */}

      {/* NEW: Reminder History Section */}
      <ReminderHistoryTimeline bookingId={params.id} />
    </div>
  );
}
```

**Testing**:
- Create booking with reminder
- Wait for reminder to be sent (or manually update database)
- Visit booking details page
- Verify timeline displays all events
- Test with different reminder states (sent, confirmed, cancelled, failed)

**Success Criteria**:
- ✅ Timeline fetches reminder data from API
- ✅ All reminder events displayed chronologically
- ✅ Icons and styling match design
- ✅ Loading state shows while fetching
- ✅ Empty state shows if no reminders
- ✅ Timestamps formatted in Russian locale
- ✅ Responsive on mobile

**Files Created**:
- `Frontend/src/components/features/bookings/ReminderHistoryTimeline.tsx`

**Files Modified**:
- `Frontend/src/app/(dashboard)/dashboard/bookings/[id]/page.tsx`

---

### Task 5.3: Add Reminder Stats Widget to Dashboard

**Priority**: P2 (Medium)
**Effort**: 30 minutes
**Assignee**: Frontend Developer

**Objective**: Display reminder statistics on the main dashboard.

**Implementation**:

Create `Frontend/src/components/features/dashboard/ReminderStatsWidget.tsx`:

```typescript
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { useEffect, useState } from 'react';

interface ReminderStats {
  total: number;
  sent: number;
  confirmed: number;
  cancelled: number;
  failed: number;
  delivery_rate: string;
  response_rate: string;
}

interface ReminderStatsWidgetProps {
  salonId: string;
}

export function ReminderStatsWidget({ salonId }: ReminderStatsWidgetProps) {
  const [stats, setStats] = useState<ReminderStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch(
          `/api/reminders/stats?salon_id=${salonId}`,
          {
            headers: {
              Authorization: `Bearer ${getToken()}`,
            },
          },
        );

        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch reminder stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [salonId]);

  if (loading) {
    return <Card><CardContent className="p-4">Loading stats...</CardContent></Card>;
  }

  if (!stats) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>📲 Reminder Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <StatItem label="Delivery Rate" value={`${stats.delivery_rate}%`} />
          <StatItem label="Response Rate" value={`${stats.response_rate}%`} />
          <StatItem label="Confirmed" value={stats.confirmed} variant="success" />
          <StatItem label="Cancelled" value={stats.cancelled} variant="warning" />
        </div>

        <div className="mt-4 pt-4 border-t text-sm text-gray-600">
          {stats.sent} of {stats.total} reminders sent • {stats.failed} failed
        </div>
      </CardContent>
    </Card>
  );
}

interface StatItemProps {
  label: string;
  value: string | number;
  variant?: 'default' | 'success' | 'warning';
}

function StatItem({ label, value, variant = 'default' }: StatItemProps) {
  const variantStyles = {
    default: 'text-gray-900',
    success: 'text-green-600',
    warning: 'text-orange-600',
  };

  return (
    <div>
      <div className="text-xs text-gray-500 uppercase">{label}</div>
      <div className={`text-2xl font-bold ${variantStyles[variant]}`}>
        {value}
      </div>
    </div>
  );
}

function getToken(): string {
  return localStorage.getItem('auth_token') || '';
}
```

**Add to Dashboard**:

Update `Frontend/src/app/(dashboard)/dashboard/page.tsx`:

```typescript
import { ReminderStatsWidget } from '@/components/features/dashboard/ReminderStatsWidget';

export default function DashboardPage() {
  const { user } = useAuth(); // Get current user context
  const salonId = user.salon_id; // Assuming user has salon_id

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* ... existing dashboard widgets ... */}

      {/* NEW: Reminder Stats Widget */}
      <ReminderStatsWidget salonId={salonId} />
    </div>
  );
}
```

**Success Criteria**:
- ✅ Widget displays on dashboard
- ✅ Stats update in real-time
- ✅ Responsive grid layout
- ✅ Visual hierarchy clear
- ✅ Loading state shows while fetching

**Files Created**:
- `Frontend/src/components/features/dashboard/ReminderStatsWidget.tsx`

**Files Modified**:
- `Frontend/src/app/(dashboard)/dashboard/page.tsx`

---

## Phase 6: Testing (Day 5 - 8 hours)

### Task 6.1: Write Unit Tests

**Priority**: P0 (Blocking)
**Effort**: 3 hours
**Assignee**: Backend Developer

**Objective**: Achieve 80%+ test coverage for reminder service.

**Test Files to Create**:

**1. RemindersService Unit Tests**:

Create `Backend/src/modules/reminders/__tests__/reminders.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { RemindersService } from '../reminders.service';
import { PrismaService } from '@database/prisma.service';
import { WhatsAppService } from '@modules/whatsapp/whatsapp.service';

describe('RemindersService', () => {
  let service: RemindersService;
  let prisma: jest.Mocked<PrismaService>;
  let reminderQueue: any;
  let whatsappService: jest.Mocked<WhatsAppService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RemindersService,
        {
          provide: PrismaService,
          useValue: {
            booking: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            reminder: {
              create: jest.fn(),
              update: jest.fn(),
              findFirst: jest.fn(),
              count: jest.fn(),
            },
          },
        },
        {
          provide: WhatsAppService,
          useValue: {
            sendTextMessage: jest.fn(),
          },
        },
        {
          provide: getQueueToken('reminder'),
          useValue: {
            add: jest.fn(),
            getJob: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RemindersService>(RemindersService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
    reminderQueue = module.get(getQueueToken('reminder'));
    whatsappService = module.get(WhatsAppService) as jest.Mocked<WhatsAppService>;
  });

  describe('scheduleReminder', () => {
    it('should schedule reminder 24h before appointment', async () => {
      const booking = {
        id: 'booking-1',
        start_ts: new Date('2025-10-26T14:00:00Z'),
        salon_id: 'salon-1',
        salon: { owner_id: 'owner-1' },
      };

      prisma.booking.findUnique.mockResolvedValue(booking as any);
      prisma.reminder.findFirst.mockResolvedValue(null);
      prisma.reminder.create.mockResolvedValue({
        id: 'reminder-1',
        booking_id: booking.id,
        salon_id: booking.salon_id,
        scheduled_at: new Date('2025-10-25T14:00:00Z'),
        status: 'PENDING',
      } as any);

      reminderQueue.add.mockResolvedValue({ id: 'job-1' });

      await service.scheduleReminder(booking.id);

      expect(prisma.reminder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            booking_id: booking.id,
            salon_id: booking.salon_id,
          }),
        }),
      );

      expect(reminderQueue.add).toHaveBeenCalledWith(
        'send-reminder',
        expect.objectContaining({ bookingId: booking.id }),
        expect.objectContaining({
          delay: expect.any(Number),
          attempts: 3,
        }),
      );
    });

    it('should not schedule if appointment is <24h away', async () => {
      const booking = {
        id: 'booking-2',
        start_ts: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12h from now
        salon_id: 'salon-1',
      };

      prisma.booking.findUnique.mockResolvedValue(booking as any);

      await service.scheduleReminder(booking.id);

      expect(prisma.reminder.create).not.toHaveBeenCalled();
      expect(reminderQueue.add).not.toHaveBeenCalled();
    });
  });

  describe('parseResponse', () => {
    it('should recognize confirmation patterns', () => {
      expect(service['parseResponse']('1')).toBe('CONFIRM');
      expect(service['parseResponse']('Подтверждаю')).toBe('CONFIRM');
      expect(service['parseResponse']('да')).toBe('CONFIRM');
      expect(service['parseResponse']('ок')).toBe('CONFIRM');
      expect(service['parseResponse']('OK')).toBe('CONFIRM');
      expect(service['parseResponse']('yes')).toBe('CONFIRM');
    });

    it('should recognize cancellation patterns', () => {
      expect(service['parseResponse']('2')).toBe('CANCEL');
      expect(service['parseResponse']('Отменяю')).toBe('CANCEL');
      expect(service['parseResponse']('нет')).toBe('CANCEL');
      expect(service['parseResponse']('cancel')).toBe('CANCEL');
    });

    it('should recognize reschedule patterns', () => {
      expect(service['parseResponse']('3')).toBe('RESCHEDULE');
      expect(service['parseResponse']('Хочу перенести')).toBe('RESCHEDULE');
      expect(service['parseResponse']('reschedule')).toBe('RESCHEDULE');
    });

    it('should return UNKNOWN for unrecognized patterns', () => {
      expect(service['parseResponse']('что-то другое')).toBe('UNKNOWN');
      expect(service['parseResponse']('random text')).toBe('UNKNOWN');
    });
  });

  describe('sendReminder', () => {
    it('should send WhatsApp message and update reminder', async () => {
      const reminder = {
        id: 'reminder-1',
        booking: {
          id: 'booking-1',
          customer_phone: '+79991234567',
          customer_name: 'Test Customer',
          start_ts: new Date('2025-10-26T14:00:00Z'),
          service: 'Haircut',
          salon: {
            name: 'Test Salon',
            owner_id: 'owner-1',
          },
          salon_id: 'salon-1',
        },
      };

      prisma.reminder.findUnique.mockResolvedValue(reminder as any);
      whatsappService.sendTextMessage.mockResolvedValue({
        message_id: 'whatsapp-msg-1',
      } as any);

      await service.sendReminder(reminder.id);

      expect(whatsappService.sendTextMessage).toHaveBeenCalledWith(
        'owner-1',
        expect.objectContaining({
          to: '+79991234567',
          text: expect.stringContaining('Напоминание о визите'),
        }),
      );

      expect(prisma.reminder.update).toHaveBeenCalledWith({
        where: { id: reminder.id },
        data: expect.objectContaining({
          status: 'SENT',
          sent_at: expect.any(Date),
          whatsapp_message_id: 'whatsapp-msg-1',
        }),
      });
    });
  });
});
```

**Run Tests**:
```bash
cd Backend
npm run test -- reminders.service.spec.ts

# Check coverage
npm run test:cov -- reminders.service.spec.ts
```

**Success Criteria**:
- ✅ All tests pass
- ✅ Coverage ≥80% for RemindersService
- ✅ Edge cases tested (past appointments, invalid inputs)
- ✅ Error scenarios tested
- ✅ All public methods tested

**Files Created**:
- `Backend/src/modules/reminders/__tests__/reminders.service.spec.ts`

---

### Task 6.2: Write Integration Tests

**Priority**: P0 (Blocking)
**Effort**: 3 hours
**Assignee**: Backend Developer

**Objective**: Test full reminder flow end-to-end.

**Test File**:

Create `Backend/test/reminders.e2e-spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('Reminders (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let testSalon: any;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);

    // Create test user and salon
    const user = await prisma.user.create({
      data: {
        email: 'test-reminder@example.com',
        password: 'hashedpassword',
        role: 'SALON_OWNER',
      },
    });

    testSalon = await prisma.salon.create({
      data: {
        name: 'Test Salon',
        phone_number_id: 'test-phone',
        access_token: 'test-token',
        owner_id: user.id,
      },
    });

    // Get auth token
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'test-reminder@example.com',
        password: 'testpassword',
      });

    authToken = loginResponse.body.access_token;
  });

  afterAll(async () => {
    await prisma.reminder.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.salon.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  });

  it('should schedule reminder when booking is created', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2); // 2 days from now

    const response = await request(app.getHttpServer())
      .post('/api/bookings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        salon_id: testSalon.id,
        customer_phone: '+79991234567',
        customer_name: 'Test Customer',
        service: 'Haircut',
        start_ts: tomorrow.toISOString(),
      })
      .expect(201);

    const booking = response.body;

    // Check reminder was created
    const reminder = await prisma.reminder.findFirst({
      where: { booking_id: booking.id },
    });

    expect(reminder).toBeDefined();
    expect(reminder.status).toBe('PENDING');
    expect(reminder.scheduled_at).toBeDefined();

    // Scheduled time should be 24h before appointment
    const expected24hBefore = new Date(booking.start_ts);
    expected24hBefore.setHours(expected24hBefore.getHours() - 24);

    expect(reminder.scheduled_at.getTime()).toBeCloseTo(
      expected24hBefore.getTime(),
      -3, // Within 1000ms tolerance
    );
  });

  it('should cancel reminder when booking is cancelled', async () => {
    // Create booking with reminder
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);

    const booking = await prisma.booking.create({
      data: {
        salon_id: testSalon.id,
        booking_code: 'TEST-002',
        customer_phone: '+79991234568',
        customer_name: 'Test Customer 2',
        service: 'Manicure',
        start_ts: tomorrow,
        status: 'CONFIRMED',
      },
    });

    const reminder = await prisma.reminder.create({
      data: {
        booking_id: booking.id,
        salon_id: testSalon.id,
        scheduled_at: new Date(tomorrow.getTime() - 24 * 60 * 60 * 1000),
        status: 'PENDING',
      },
    });

    // Cancel booking
    await request(app.getHttpServer())
      .delete(`/api/bookings/${booking.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    // Check reminder was cancelled
    const updatedReminder = await prisma.reminder.findUnique({
      where: { id: reminder.id },
    });

    expect(updatedReminder.status).toBe('CANCELLED');
  });

  it('should get reminder stats for salon', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/reminders/stats?salon_id=${testSalon.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('total');
    expect(response.body).toHaveProperty('sent');
    expect(response.body).toHaveProperty('delivery_rate');
    expect(response.body).toHaveProperty('response_rate');
  });
});
```

**Run Tests**:
```bash
cd Backend
npm run test:e2e -- reminders.e2e-spec.ts
```

**Success Criteria**:
- ✅ All integration tests pass
- ✅ Database operations work correctly
- ✅ API endpoints return expected responses
- ✅ Reminder scheduling integrates with bookings
- ✅ Stats API works correctly

**Files Created**:
- `Backend/test/reminders.e2e-spec.ts`

---

### Task 6.3: Manual Testing and Bug Fixes

**Priority**: P0 (Blocking)
**Effort**: 2 hours
**Assignee**: QA / Developer

**Objective**: Manual end-to-end testing and bug fixes.

**Test Scenarios**:

**1. Happy Path - Full Reminder Flow**:
```
1. Create booking for tomorrow 2pm
2. Verify reminder scheduled in database
3. Manually trigger reminder (or wait if testing time allows)
4. Check WhatsApp message sent
5. Reply with "Подтверждаю"
6. Verify booking status changed to CONFIRMED
7. Check confirmation message received
```

**2. Cancellation Flow**:
```
1. Create booking with reminder
2. Reply with "Отменяю"
3. Verify booking status changed to CANCELLED
4. Check cancellation confirmation message
```

**3. Reschedule Flow**:
```
1. Create booking with reminder
2. Reply with "Перенести"
3. Verify reschedule instructions sent
4. Check booking status unchanged (awaiting new time)
```

**4. Error Handling**:
```
1. Create booking with invalid phone number
2. Verify reminder fails gracefully
3. Check retry attempts logged
4. Verify error notification (if implemented)
```

**5. Admin Dashboard**:
```
1. Open bookings list
2. Verify reminder status column visible
3. Check badges display correctly
4. Open booking details
5. Verify reminder timeline shows events
6. Check dashboard stats widget
```

**Test Checklist**:
- [ ] Reminder scheduled on booking creation
- [ ] Reminder rescheduled on booking update
- [ ] Reminder cancelled on booking cancellation
- [ ] WhatsApp message sent at scheduled time
- [ ] Confirmation response processed correctly
- [ ] Cancellation response processed correctly
- [ ] Reschedule response processed correctly
- [ ] Unknown response logged but doesn't crash
- [ ] Retry logic works for failed sends
- [ ] Admin dashboard shows reminder status
- [ ] Reminder history timeline displays correctly
- [ ] Stats widget shows accurate data
- [ ] All error scenarios logged appropriately

**Bug Tracking**:
Create issues for any bugs found and fix before completion.

**Success Criteria**:
- ✅ All test scenarios pass
- ✅ No critical bugs found
- ✅ Performance acceptable (<5s for reminder processing)
- ✅ User experience smooth
- ✅ All edge cases handled

---

## Phase 7: Documentation and Deployment (Final Steps)

### Task 7.1: Update Documentation

**Priority**: P1 (High)
**Effort**: 1 hour
**Assignee**: Developer

**Documentation to Create/Update**:

**1. README for Reminders Module**:

Create `Backend/src/modules/reminders/README.md`:

```markdown
# Reminders Module

Automated WhatsApp reminder system for beauty salon appointments.

## Features

- Automatic scheduling (24h before appointment)
- WhatsApp message sending
- Customer response processing (confirm/cancel/reschedule)
- Retry logic (3 attempts with exponential backoff)
- Admin statistics and history

## Usage

### Schedule Reminder

Reminders are automatically scheduled when bookings are created:

\`\`\`typescript
// In BookingsService
await this.remindersService.scheduleReminder(booking.id);
\`\`\`

### Manual Scheduling

\`\`\`typescript
await this.remindersService.scheduleReminder('booking-id');
\`\`\`

### Process Customer Response

\`\`\`typescript
await this.remindersService.processResponse('booking-id', 'Подтверждаю');
\`\`\`

### Get Statistics

\`\`\`typescript
const stats = await this.remindersService.getStats('salon-id');
// { total: 100, sent: 95, confirmed: 60, ... }
\`\`\`

## API Endpoints

- `GET /api/reminders/stats?salon_id={id}` - Get statistics
- `GET /api/reminders/booking/{id}` - Get reminder history

## Configuration

Environment variables (in `.env`):

\`\`\`
REDIS_HOST=localhost
REDIS_PORT=6379
WHATSAPP_ACCESS_TOKEN=...
\`\`\`

## Testing

\`\`\`bash
npm run test -- reminders.service.spec.ts
npm run test:e2e -- reminders.e2e-spec.ts
\`\`\`

## Monitoring

Check BullMQ dashboard for queue status:

\`\`\`
http://localhost:3000/admin/queues
\`\`\`

## Troubleshooting

**Problem**: Reminders not being sent

**Solution**: Check worker is running and queue is processing:
\`\`\`bash
# Check logs
tail -f logs/app.log | grep "ReminderWorker"

# Check queue
redis-cli
> LLEN bull:reminder:wait
\`\`\`

**Problem**: Messages failing to send

**Solution**: Verify WhatsApp API credentials and phone number status.
```

**2. Update Main README**:

Update `README.md` section on reminders:

```markdown
## Features

...

### Automated Reminders 📲

- Automatic WhatsApp reminders 24h before appointments
- One-click confirmation/cancellation
- Smart response parsing (Russian and English)
- 95%+ delivery rate
- 40-50% reduction in no-shows

[Learn more about reminders](Backend/src/modules/reminders/README.md)

...
```

**Success Criteria**:
- ✅ All documentation updated
- ✅ Examples included
- ✅ API documentation complete
- ✅ Troubleshooting guide helpful

---

## Rollout Checklist

### Pre-Deployment

- [ ] All code reviewed and approved
- [ ] All tests passing (unit + integration + e2e)
- [ ] Test coverage ≥80%
- [ ] No console.log statements
- [ ] Environment variables documented
- [ ] Database migrations tested
- [ ] Rollback plan documented

### Deployment

- [ ] Deploy database migrations first
- [ ] Deploy backend code
- [ ] Deploy frontend code
- [ ] Restart worker processes
- [ ] Verify health check endpoints
- [ ] Monitor logs for errors

### Post-Deployment

- [ ] Create test booking and verify reminder scheduled
- [ ] Wait for reminder to be sent (or manually trigger)
- [ ] Test customer response processing
- [ ] Check admin dashboard displays correctly
- [ ] Verify stats API returns data
- [ ] Monitor for 24h for issues

### Beta Testing

- [ ] Enable for 5-10 test salons
- [ ] Monitor delivery rates
- [ ] Collect feedback
- [ ] Fix any issues found
- [ ] Gradually roll out to all salons

---

## Success Metrics

### Week 1 (Beta Testing)

- Delivery rate: ≥90%
- Response rate: ≥30%
- Error rate: <5%
- Average processing time: <5s

### Week 4 (Full Rollout)

- Delivery rate: ≥95%
- Response rate: ≥40%
- No-show rate reduction: 40-50%
- Customer satisfaction: Monitor feedback

---

## Risk Mitigation

### Risk: WhatsApp API Rate Limiting

**Mitigation**: Implemented exponential backoff and retry logic

### Risk: Customer Confusion

**Mitigation**: Clear message templates with numbered options

### Risk: Failed Message Delivery

**Mitigation**: 3 retry attempts, admin notification after failures

### Risk: Wrong Response Interpretation

**Mitigation**: Conservative parsing, log unknown responses

---

## Next Steps After Completion

1. **Monitor Performance**: Track delivery and response rates
2. **Collect Feedback**: Survey salon owners on effectiveness
3. **Iterate**: Improve message templates based on feedback
4. **Version 2.0**: Plan features like multiple reminders, customizable timing

---

**Plan Version**: 1.0.0
**Created**: 2025-10-24
**Estimated Completion**: 5 days (1 developer)
**Status**: Ready for Implementation

---

## Daily Breakdown

**Day 1**: Database + Core Service
- Tasks 1.1 - 2.2 (Database migration, RemindersService implementation)
- Deliverable: Reminder scheduling works

**Day 2**: Worker + Integration
- Tasks 3.1 - 4.2 (ReminderWorker, BookingsService, WebhookService integration)
- Deliverable: End-to-end flow works

**Day 3**: Admin API + Frontend Prep
- Task 4.3 + Frontend setup
- Deliverable: API endpoints ready

**Day 4**: Frontend Implementation
- Tasks 5.1 - 5.3 (Components, pages, widgets)
- Deliverable: Admin dashboard shows reminders

**Day 5**: Testing + Documentation
- Tasks 6.1 - 7.1 (All testing, docs, bug fixes)
- Deliverable: Feature complete and tested

---

Ready to start implementation! Run `/speckit.tasks` to break this down into specific coding tasks.
