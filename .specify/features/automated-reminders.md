# Feature Specification: Automated Reminder System

**Version**: 1.0.0
**Status**: In Development
**Priority**: P1 (High)
**Target**: Beta Testing Launch
**Estimated Effort**: 1 week (1 Backend Developer)

---

## Executive Summary

Implement a fully automated reminder system that sends WhatsApp messages 24 hours before scheduled appointments, processes customer responses (confirm/cancel/reschedule), and updates booking status accordingly.

**Current Status**: 15% (BullMQ configured, workers missing)
**Target Status**: 100% functional for beta testing

**Success Metric**: Reduce no-shows from ~30% to <15% (50% improvement)

---

## Business Context

### Problem Statement

Beauty salons lose significant revenue due to no-shows and last-minute cancellations. Current solutions:
- Manual phone calls (time-consuming, ~5-10 min per booking)
- No automated follow-up
- Clients forget appointments

**Impact**: 20-30% no-show rate industry average = 20-30% revenue loss

### Solution

Automated WhatsApp reminders 24h before appointments with:
- One-click confirmation/cancellation
- Automatic booking status updates
- Zero manual intervention required

**Expected ROI**:
- Save 2-3 hours/day on manual reminders
- Reduce no-shows by 40-50%
- Increase customer satisfaction

---

## User Stories

### Story 1: Automatic Reminder Scheduling (Priority: P0)

**As a** salon owner
**I want** reminders to be scheduled automatically when bookings are created
**So that** I don't have to manually set them up

**Acceptance Criteria**:
1. **Given** a new booking is created via WhatsApp or admin dashboard
   **When** the booking is saved to database
   **Then** a reminder job is scheduled for 24 hours before appointment time

2. **Given** a booking is updated (time changed)
   **When** the update is saved
   **Then** the existing reminder is cancelled and a new one is scheduled

3. **Given** a booking is cancelled
   **When** the cancellation is saved
   **Then** the reminder job is removed from the queue

**Technical Details**:
- Use BullMQ delayed jobs with exact timestamp
- Job ID: `reminder:${booking_id}` for easy lookup
- Store job ID in booking metadata for tracking

**Test Scenarios**:
```typescript
// Test 1: Create booking → verify job scheduled
const booking = await createBooking({
  start_ts: '2025-10-26 14:00',
  customer_phone: '+79991234567'
});
const job = await reminderQueue.getJob(`reminder:${booking.id}`);
expect(job.scheduledAt).toBe('2025-10-25 14:00'); // 24h before

// Test 2: Update booking time → verify job rescheduled
await updateBooking(booking.id, { start_ts: '2025-10-26 16:00' });
const updatedJob = await reminderQueue.getJob(`reminder:${booking.id}`);
expect(updatedJob.scheduledAt).toBe('2025-10-25 16:00');

// Test 3: Cancel booking → verify job removed
await cancelBooking(booking.id);
const cancelledJob = await reminderQueue.getJob(`reminder:${booking.id}`);
expect(cancelledJob).toBeNull();
```

---

### Story 2: Send WhatsApp Reminder (Priority: P0)

**As a** customer
**I want** to receive a WhatsApp reminder 24h before my appointment
**So that** I don't forget about it

**Acceptance Criteria**:
1. **Given** the scheduled time arrives (24h before appointment)
   **When** the reminder job is processed
   **Then** a WhatsApp message is sent with booking details

2. **Given** the message is sent successfully
   **When** delivery status is confirmed
   **Then** booking.reminder_sent is set to true and reminder record is created

3. **Given** the message fails to send (network error, invalid number)
   **When** the send fails
   **Then** retry is attempted (up to 3 times with exponential backoff)

**Message Template**:
```
🔔 Напоминание о визите

Здравствуйте, {customer_name}!

Напоминаем о вашей записи:
📅 {date} в {time}
💇 Услуга: {service_name}
👤 Мастер: {master_name}
📍 {salon_name}

Пожалуйста, подтвердите визит:
1️⃣ Подтверждаю
2️⃣ Отменяю запись
3️⃣ Хочу перенести

Ответьте номером нужного варианта.
```

**Technical Details**:
- Use WhatsApp Business API template (pre-approved)
- Include interactive buttons if supported
- Track message ID for delivery confirmation
- Log all send attempts

**Error Handling**:
```typescript
// Retry logic
const MAX_RETRIES = 3;
const BACKOFF_DELAYS = [60000, 300000, 900000]; // 1min, 5min, 15min

try {
  await sendWhatsAppReminder(booking);
} catch (error) {
  if (job.attemptsMade < MAX_RETRIES) {
    await job.retry({ delay: BACKOFF_DELAYS[job.attemptsMade] });
  } else {
    await logFailedReminder(booking, error);
    await notifyAdminOfFailure(booking);
  }
}
```

---

### Story 3: Process Customer Response (Priority: P0)

**As a** customer
**I want** to confirm or cancel my appointment via WhatsApp
**So that** I can manage my booking easily

**Acceptance Criteria**:
1. **Given** customer replies "1" or "Подтверждаю"
   **When** the message is received
   **Then** booking status is updated to "CONFIRMED" and confirmation message is sent

2. **Given** customer replies "2" or "Отменяю"
   **When** the message is received
   **Then** booking status is updated to "CANCELLED" and cancellation confirmation is sent

3. **Given** customer replies "3" or "Перенести"
   **When** the message is received
   **Then** reschedule instructions are sent

4. **Given** customer doesn't respond within 12 hours
   **When** 12 hours pass
   **Then** booking remains as-is (no automatic cancellation)

**Response Parsing Logic**:
```typescript
function parseReminderResponse(message: string): ReminderAction {
  const normalized = message.toLowerCase().trim();

  // Confirmation patterns
  if (/^1$|подтверж|да|ок|ok|yes/.test(normalized)) {
    return 'CONFIRM';
  }

  // Cancellation patterns
  if (/^2$|отмен|нет|no|cancel/.test(normalized)) {
    return 'CANCEL';
  }

  // Reschedule patterns
  if (/^3$|перенес|reschedule|change/.test(normalized)) {
    return 'RESCHEDULE';
  }

  return 'UNKNOWN';
}
```

**Confirmation Messages**:
```
// CONFIRM
✅ Спасибо! Ваш визит подтверждён.
Ждём вас {date} в {time}. До встречи!

// CANCEL
❌ Запись отменена.
Если передумаете, напишите нам. Всегда рады вам помочь!

// RESCHEDULE
📅 Для переноса записи, пожалуйста, напишите желаемую дату и время.
Например: "Хочу перенести на 28 октября в 15:00"

Наш администратор подтвердит доступность времени.
```

---

### Story 4: Admin Dashboard Visibility (Priority: P1)

**As a** salon owner
**I want** to see reminder status in the admin dashboard
**So that** I can track customer responses

**Acceptance Criteria**:
1. **Given** I'm viewing the bookings list
   **When** the page loads
   **Then** I see reminder status for each booking (Sent / Pending / Failed / Confirmed / No Response)

2. **Given** I open a booking details page
   **When** the page loads
   **Then** I see full reminder history (sent at, response received at, response text)

**UI Elements**:
```tsx
// Bookings list column
<Column field="reminder_status">
  {booking.reminder_sent && !booking.reminder_response && (
    <Badge color="yellow">Reminder Sent</Badge>
  )}
  {booking.reminder_response === 'CONFIRM' && (
    <Badge color="green">Confirmed</Badge>
  )}
  {booking.reminder_response === 'CANCEL' && (
    <Badge color="red">Cancelled</Badge>
  )}
  {!booking.reminder_sent && (
    <Badge color="gray">Pending</Badge>
  )}
</Column>

// Booking details page
<Card title="Reminder History">
  <Timeline>
    <Event time={booking.reminder_scheduled_at}>
      Reminder scheduled
    </Event>
    <Event time={booking.reminder_sent_at}>
      WhatsApp message sent
    </Event>
    <Event time={booking.reminder_response_at}>
      Customer response: {booking.reminder_response}
    </Event>
  </Timeline>
</Card>
```

---

## Technical Specification

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Booking Created/Updated                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│           BookingsService.scheduleReminder()                │
│  - Calculate reminder time (start_ts - 24h)                 │
│  - Add job to BullMQ reminder queue                         │
│  - Store job ID in booking.metadata                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  BullMQ Reminder Queue                      │
│  - Job waits until scheduled time                           │
│  - Retry logic: 3 attempts with exponential backoff         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼ (24h before appointment)
┌─────────────────────────────────────────────────────────────┐
│              ReminderWorker.processReminder()               │
│  - Fetch booking details from database                      │
│  - Generate reminder message with template                  │
│  - Send WhatsApp message via Business API                   │
│  - Create reminder record in database                       │
│  - Update booking.reminder_sent = true                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  WhatsApp Business API                      │
│  - Message delivered to customer                            │
│  - Delivery status webhook received                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Customer Responds via WhatsApp                 │
│  - "1" (confirm) / "2" (cancel) / "3" (reschedule)          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│        WhatsAppService.handleIncomingMessage()              │
│  - Check if message is reminder response                    │
│  - Parse response (confirm/cancel/reschedule)               │
│  - Update booking status accordingly                        │
│  - Send confirmation message to customer                    │
│  - Create reminder_response record                          │
└─────────────────────────────────────────────────────────────┘
```

### Database Schema

#### New Table: `reminders`

```sql
CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,

  -- Scheduling
  scheduled_at TIMESTAMP NOT NULL, -- When to send (24h before)
  sent_at TIMESTAMP, -- When actually sent

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, SENT, DELIVERED, FAILED
  delivery_status VARCHAR(50), -- WhatsApp delivery status

  -- Response
  response_received_at TIMESTAMP,
  response_action VARCHAR(50), -- CONFIRM, CANCEL, RESCHEDULE, UNKNOWN
  response_text TEXT, -- Original customer response

  -- Error handling
  attempts INTEGER DEFAULT 0,
  last_error TEXT,

  -- Metadata
  whatsapp_message_id VARCHAR(255),
  job_id VARCHAR(255), -- BullMQ job ID

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_reminders_booking ON reminders(booking_id);
CREATE INDEX idx_reminders_salon_scheduled ON reminders(salon_id, scheduled_at);
CREATE INDEX idx_reminders_status ON reminders(status);
```

#### Update Table: `bookings`

```sql
ALTER TABLE bookings ADD COLUMN reminder_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE bookings ADD COLUMN reminder_response VARCHAR(50); -- CONFIRM, CANCEL, RESCHEDULE
ALTER TABLE bookings ADD COLUMN reminder_response_at TIMESTAMP;

CREATE INDEX idx_bookings_reminder_status ON bookings(reminder_sent, reminder_response);
```

### Backend Implementation

#### File Structure

```
Backend/src/modules/
├── reminders/
│   ├── reminders.module.ts
│   ├── reminders.service.ts
│   ├── reminders.controller.ts (admin API)
│   ├── dto/
│   │   ├── reminder-response.dto.ts
│   │   └── reminder-stats.dto.ts
│   └── entities/
│       └── reminder.entity.ts
│
├── queue/
│   └── workers/
│       └── reminder.worker.ts (NEW)
│
├── bookings/
│   └── bookings.service.ts (UPDATE - add scheduleReminder)
│
└── whatsapp/
    └── webhook.service.ts (UPDATE - add response parsing)
```

#### Core Components

**1. RemindersService** (`Backend/src/modules/reminders/reminders.service.ts`)

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '@database/prisma.service';
import { WhatsAppService } from '@modules/whatsapp/whatsapp.service';

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    @InjectQueue('reminder') private reminderQueue: Queue,
    private prisma: PrismaService,
    private whatsappService: WhatsAppService,
  ) {}

  /**
   * Schedule a reminder for a booking (24h before appointment)
   */
  async scheduleReminder(bookingId: string): Promise<void> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        salon: true,
      },
    });

    if (!booking) {
      throw new Error(`Booking ${bookingId} not found`);
    }

    // Calculate reminder time (24h before appointment)
    const reminderTime = new Date(booking.start_ts);
    reminderTime.setHours(reminderTime.getHours() - 24);

    // Don't schedule if appointment is less than 24h away
    if (reminderTime <= new Date()) {
      this.logger.warn(
        `Booking ${bookingId} is too soon, skipping reminder`,
      );
      return;
    }

    // Remove existing reminder if any
    await this.cancelReminder(bookingId);

    // Create reminder record
    const reminder = await this.prisma.reminder.create({
      data: {
        booking_id: bookingId,
        salon_id: booking.salon_id,
        scheduled_at: reminderTime,
        status: 'PENDING',
      },
    });

    // Schedule BullMQ job
    const job = await this.reminderQueue.add(
      'send-reminder',
      { bookingId, reminderId: reminder.id },
      {
        jobId: `reminder:${bookingId}`,
        delay: reminderTime.getTime() - Date.now(),
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 60000, // 1 minute initial delay
        },
      },
    );

    // Update reminder with job ID
    await this.prisma.reminder.update({
      where: { id: reminder.id },
      data: { job_id: job.id },
    });

    this.logger.log(
      `Reminder scheduled for booking ${bookingId} at ${reminderTime}`,
    );
  }

  /**
   * Cancel a scheduled reminder
   */
  async cancelReminder(bookingId: string): Promise<void> {
    const existingReminder = await this.prisma.reminder.findFirst({
      where: {
        booking_id: bookingId,
        status: { in: ['PENDING', 'SENT'] },
      },
    });

    if (existingReminder) {
      // Remove from queue
      const job = await this.reminderQueue.getJob(
        `reminder:${bookingId}`,
      );
      if (job) {
        await job.remove();
      }

      // Update database
      await this.prisma.reminder.update({
        where: { id: existingReminder.id },
        data: { status: 'CANCELLED' },
      });

      this.logger.log(`Reminder cancelled for booking ${bookingId}`);
    }
  }

  /**
   * Send reminder message via WhatsApp
   */
  async sendReminder(reminderId: string): Promise<void> {
    const reminder = await this.prisma.reminder.findUnique({
      where: { id: reminderId },
      include: {
        booking: {
          include: {
            salon: true,
          },
        },
      },
    });

    if (!reminder) {
      throw new Error(`Reminder ${reminderId} not found`);
    }

    const { booking } = reminder;

    // Generate reminder message
    const message = this.generateReminderMessage(booking);

    try {
      // Send WhatsApp message
      const result = await this.whatsappService.sendTextMessage(
        booking.salon.owner_id,
        {
          salon_id: booking.salon_id,
          to: booking.customer_phone,
          text: message,
        },
      );

      // Update reminder status
      await this.prisma.reminder.update({
        where: { id: reminderId },
        data: {
          status: 'SENT',
          sent_at: new Date(),
          whatsapp_message_id: result.message_id,
        },
      });

      // Update booking
      await this.prisma.booking.update({
        where: { id: booking.id },
        data: { reminder_sent: true },
      });

      this.logger.log(`Reminder sent for booking ${booking.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to send reminder ${reminderId}: ${error.message}`,
      );

      await this.prisma.reminder.update({
        where: { id: reminderId },
        data: {
          status: 'FAILED',
          last_error: error.message,
          attempts: { increment: 1 },
        },
      });

      throw error; // Re-throw for BullMQ retry
    }
  }

  /**
   * Generate reminder message text
   */
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

  /**
   * Process customer response to reminder
   */
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

    // Update booking based on response
    const { booking } = reminder;

    switch (action) {
      case 'CONFIRM':
        await this.prisma.booking.update({
          where: { id: bookingId },
          data: {
            status: 'CONFIRMED',
            reminder_response: 'CONFIRM',
            reminder_response_at: new Date(),
          },
        });

        await this.whatsappService.sendTextMessage(
          booking.salon.owner_id,
          {
            salon_id: booking.salon_id,
            to: booking.customer_phone,
            text: `✅ Спасибо! Ваш визит подтверждён.\nЖдём вас ${new Date(booking.start_ts).toLocaleDateString('ru-RU')} в ${new Date(booking.start_ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}. До встречи!`,
          },
        );
        break;

      case 'CANCEL':
        await this.prisma.booking.update({
          where: { id: bookingId },
          data: {
            status: 'CANCELLED',
            reminder_response: 'CANCEL',
            reminder_response_at: new Date(),
          },
        });

        await this.whatsappService.sendTextMessage(
          booking.salon.owner_id,
          {
            salon_id: booking.salon_id,
            to: booking.customer_phone,
            text: `❌ Запись отменена.\nЕсли передумаете, напишите нам. Всегда рады вам помочь!`,
          },
        );
        break;

      case 'RESCHEDULE':
        await this.prisma.booking.update({
          where: { id: bookingId },
          data: {
            reminder_response: 'RESCHEDULE',
            reminder_response_at: new Date(),
          },
        });

        await this.whatsappService.sendTextMessage(
          booking.salon.owner_id,
          {
            salon_id: booking.salon_id,
            to: booking.customer_phone,
            text: `📅 Для переноса записи, пожалуйста, напишите желаемую дату и время.\nНапример: "Хочу перенести на 28 октября в 15:00"\n\nНаш администратор подтвердит доступность времени.`,
          },
        );
        break;

      default:
        this.logger.warn(
          `Unknown response action: ${action} for booking ${bookingId}`,
        );
    }

    this.logger.log(
      `Processed reminder response for booking ${bookingId}: ${action}`,
    );
  }

  /**
   * Parse customer response
   */
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

  /**
   * Get reminder statistics for admin dashboard
   */
  async getStats(salonId: string): Promise<any> {
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

    return {
      total,
      sent,
      confirmed,
      cancelled,
      failed,
      delivery_rate: total > 0 ? ((sent / total) * 100).toFixed(1) : 0,
      response_rate:
        sent > 0 ? (((confirmed + cancelled) / sent) * 100).toFixed(1) : 0,
    };
  }
}
```

**2. ReminderWorker** (`Backend/src/modules/queue/workers/reminder.worker.ts`)

```typescript
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { RemindersService } from '@modules/reminders/reminders.service';

@Processor('reminder')
export class ReminderWorker extends WorkerHost {
  private readonly logger = new Logger(ReminderWorker.name);

  constructor(private remindersService: RemindersService) {
    super();
  }

  async process(job: Job<{ bookingId: string; reminderId: string }>) {
    this.logger.log(`Processing reminder job ${job.id}`);
    const { reminderId } = job.data;

    try {
      await this.remindersService.sendReminder(reminderId);
      return { success: true, reminderId };
    } catch (error) {
      this.logger.error(`Reminder job ${job.id} failed: ${error.message}`);
      throw error; // BullMQ will retry
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Reminder job ${job.id} completed successfully`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(
      `Reminder job ${job.id} failed after ${job.attemptsMade} attempts: ${error.message}`,
    );
  }
}
```

**3. Update BookingsService** (`Backend/src/modules/bookings/bookings.service.ts`)

```typescript
// Add to BookingsService class

async create(userId: string, dto: CreateBookingDto): Promise<BookingResponseDto> {
  // ... existing creation logic ...

  const booking = await this.prisma.booking.create({ ... });

  // NEW: Schedule reminder
  await this.remindersService.scheduleReminder(booking.id);

  return booking;
}

async update(id: string, userId: string, userRole: string, dto: UpdateBookingDto): Promise<BookingResponseDto> {
  // ... existing update logic ...

  const booking = await this.prisma.booking.update({ ... });

  // NEW: Reschedule reminder if time changed
  if (dto.start_ts) {
    await this.remindersService.scheduleReminder(booking.id);
  }

  return booking;
}

async cancel(id: string, userId: string, userRole: string): Promise<{ message: string }> {
  // ... existing cancel logic ...

  // NEW: Cancel reminder
  await this.remindersService.cancelReminder(id);

  return { message: 'Booking cancelled successfully' };
}
```

**4. Update WebhookService** (`Backend/src/modules/whatsapp/webhook.service.ts`)

```typescript
// Add to WebhookService class

async processIncomingMessage(message: any): Promise<void> {
  // ... existing message processing ...

  // NEW: Check if this is a reminder response
  const recentBooking = await this.findRecentBookingForCustomer(
    message.from,
    salonId,
  );

  if (recentBooking && recentBooking.reminder_sent && !recentBooking.reminder_response) {
    // This might be a reminder response
    await this.remindersService.processResponse(
      recentBooking.id,
      message.text.body,
    );
    return; // Don't process as regular message
  }

  // ... continue with regular AI processing ...
}

private async findRecentBookingForCustomer(
  phone: string,
  salonId: string,
): Promise<any> {
  // Find booking with reminder sent in last 48h
  const twoDaysAgo = new Date();
  twoDaysAgo.setHours(twoDaysAgo.getHours() - 48);

  return this.prisma.booking.findFirst({
    where: {
      salon_id: salonId,
      customer_phone: phone,
      reminder_sent: true,
      reminder_response: null,
      start_ts: { gte: new Date() }, // Future booking
      created_at: { gte: twoDaysAgo },
    },
    orderBy: { created_at: 'desc' },
  });
}
```

---

### Frontend Implementation

#### File Structure

```
Frontend/src/
├── app/(dashboard)/dashboard/bookings/
│   └── page.tsx (UPDATE - add reminder status column)
│
├── app/(dashboard)/dashboard/bookings/[id]/
│   └── page.tsx (UPDATE - add reminder history section)
│
└── components/features/bookings/
    ├── ReminderStatusBadge.tsx (NEW)
    └── ReminderHistoryTimeline.tsx (NEW)
```

#### Components

**1. ReminderStatusBadge.tsx**

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
    return <Badge variant="secondary">Pending</Badge>;
  }

  if (!reminderResponse) {
    return <Badge variant="warning">Sent - No Response</Badge>;
  }

  switch (reminderResponse) {
    case 'CONFIRM':
      return <Badge variant="success">✅ Confirmed</Badge>;
    case 'CANCEL':
      return <Badge variant="danger">❌ Cancelled</Badge>;
    case 'RESCHEDULE':
      return <Badge variant="info">📅 Reschedule Requested</Badge>;
    default:
      return <Badge variant="secondary">Unknown Response</Badge>;
  }
}
```

**2. ReminderHistoryTimeline.tsx**

```typescript
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

interface ReminderHistoryTimelineProps {
  booking: {
    id: string;
    reminder_sent: boolean;
    reminder_response: string | null;
    reminder_response_at: string | null;
    // Include reminder record if available
    reminder?: {
      scheduled_at: string;
      sent_at: string | null;
      response_text: string | null;
    };
  };
}

export function ReminderHistoryTimeline({
  booking,
}: ReminderHistoryTimelineProps) {
  if (!booking.reminder) {
    return <p className="text-gray-500">No reminder scheduled</p>;
  }

  const { reminder } = booking;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reminder History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Scheduled */}
          <div className="flex gap-4">
            <div className="w-24 text-sm text-gray-500">
              {new Date(reminder.scheduled_at).toLocaleString('ru-RU')}
            </div>
            <div className="flex-1">
              <div className="font-medium">Reminder Scheduled</div>
              <div className="text-sm text-gray-600">
                24 hours before appointment
              </div>
            </div>
          </div>

          {/* Sent */}
          {reminder.sent_at && (
            <div className="flex gap-4">
              <div className="w-24 text-sm text-gray-500">
                {new Date(reminder.sent_at).toLocaleString('ru-RU')}
              </div>
              <div className="flex-1">
                <div className="font-medium">WhatsApp Message Sent</div>
                <div className="text-sm text-gray-600">
                  Reminder delivered to customer
                </div>
              </div>
            </div>
          )}

          {/* Response */}
          {booking.reminder_response_at && (
            <div className="flex gap-4">
              <div className="w-24 text-sm text-gray-500">
                {new Date(booking.reminder_response_at).toLocaleString('ru-RU')}
              </div>
              <div className="flex-1">
                <div className="font-medium">Customer Response Received</div>
                <div className="text-sm text-gray-600">
                  Action: {booking.reminder_response}
                </div>
                {reminder.response_text && (
                  <div className="mt-1 p-2 bg-gray-50 rounded text-sm">
                    "{reminder.response_text}"
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## Testing Strategy

### Unit Tests

```typescript
// Backend/src/modules/reminders/__tests__/reminders.service.spec.ts

describe('RemindersService', () => {
  let service: RemindersService;
  let prisma: PrismaService;
  let reminderQueue: Queue;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        RemindersService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: getQueueToken('reminder'),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<RemindersService>(RemindersService);
  });

  describe('scheduleReminder', () => {
    it('should schedule reminder 24h before appointment', async () => {
      const booking = {
        id: 'booking-1',
        start_ts: new Date('2025-10-26 14:00'),
        salon_id: 'salon-1',
      };

      await service.scheduleReminder(booking.id);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'send-reminder',
        expect.objectContaining({ bookingId: booking.id }),
        expect.objectContaining({
          delay: expect.any(Number),
        }),
      );
    });

    it('should not schedule if appointment is <24h away', async () => {
      const booking = {
        id: 'booking-2',
        start_ts: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12h from now
        salon_id: 'salon-1',
      };

      await service.scheduleReminder(booking.id);

      expect(mockQueue.add).not.toHaveBeenCalled();
    });
  });

  describe('parseResponse', () => {
    it('should recognize confirmation patterns', () => {
      expect(service['parseResponse']('1')).toBe('CONFIRM');
      expect(service['parseResponse']('Подтверждаю')).toBe('CONFIRM');
      expect(service['parseResponse']('да')).toBe('CONFIRM');
      expect(service['parseResponse']('ок')).toBe('CONFIRM');
    });

    it('should recognize cancellation patterns', () => {
      expect(service['parseResponse']('2')).toBe('CANCEL');
      expect(service['parseResponse']('Отменяю')).toBe('CANCEL');
      expect(service['parseResponse']('нет')).toBe('CANCEL');
    });

    it('should recognize reschedule patterns', () => {
      expect(service['parseResponse']('3')).toBe('RESCHEDULE');
      expect(service['parseResponse']('Хочу перенести')).toBe('RESCHEDULE');
    });
  });
});
```

### Integration Tests

```typescript
// Backend/test/reminders.e2e-spec.ts

describe('Reminders (e2e)', () => {
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
  });

  it('should process customer confirmation', async () => {
    // Create booking with sent reminder
    const booking = await createTestBookingWithReminder();

    // Simulate customer response via WhatsApp webhook
    await request(app.getHttpServer())
      .post('/api/whatsapp/webhook')
      .send({
        entry: [
          {
            changes: [
              {
                value: {
                  messages: [
                    {
                      from: booking.customer_phone,
                      text: { body: 'Подтверждаю' },
                    },
                  ],
                },
              },
            ],
          },
        ],
      })
      .expect(200);

    // Check booking status updated
    const updatedBooking = await prisma.booking.findUnique({
      where: { id: booking.id },
    });

    expect(updatedBooking.status).toBe('CONFIRMED');
    expect(updatedBooking.reminder_response).toBe('CONFIRM');
  });
});
```

---

## Success Criteria

### Functional Requirements

- [x] ✅ Reminder automatically scheduled when booking created
- [x] ✅ WhatsApp message sent 24h before appointment
- [x] ✅ Customer can confirm via WhatsApp
- [x] ✅ Customer can cancel via WhatsApp
- [x] ✅ Customer can request reschedule via WhatsApp
- [x] ✅ Booking status updates automatically
- [x] ✅ Retry logic for failed sends (3 attempts)
- [x] ✅ Admin can see reminder status in dashboard
- [x] ✅ Admin can see reminder history for each booking

### Performance Metrics

- **Delivery Rate**: ≥95% (reminders successfully sent)
- **Response Rate**: ≥40% (customers respond to reminders)
- **No-Show Reduction**: 40-50% (from ~30% to ~15%)
- **Processing Time**: <5 seconds (from schedule to send)

### Testing Coverage

- Unit tests: ≥80% coverage for reminder service
- Integration tests: All critical flows tested
- E2E tests: Full user journey tested

---

## Out of Scope (Future Versions)

### Version 2.0

- Multiple reminders (48h + 24h + 2h before)
- Customizable reminder timing per salon
- Reminder templates customization via admin UI
- SMS fallback for non-WhatsApp users

### Version 3.0

- Reminders to masters/staff
- Customer preference management (opt-out)
- A/B testing of reminder messages
- Advanced analytics (best reminder times, response patterns)

---

## Dependencies

### Backend

- ✅ BullMQ configured (already exists)
- ✅ Redis running (already exists)
- ✅ WhatsApp Business API integration (already exists)
- ✅ Prisma ORM (already exists)
- ❌ NEW: Reminder worker implementation
- ❌ NEW: Database migration for reminders table

### Frontend

- ✅ Next.js 14 App Router (already exists)
- ✅ Bookings pages (already exist)
- ❌ NEW: Reminder status components
- ❌ NEW: Reminder history timeline

### Infrastructure

- ✅ PostgreSQL database (already exists)
- ✅ Redis for queue (already exists)
- ⚠️ Production deployment (needed for real WhatsApp testing)

---

## Rollout Plan

### Phase 1: Development (Week 1, Days 1-3)

- Day 1: Database migration + RemindersService implementation
- Day 2: ReminderWorker + BookingsService integration
- Day 3: WebhookService update + response parsing

### Phase 2: Testing (Week 1, Days 4-5)

- Day 4: Unit tests + integration tests
- Day 5: E2E tests + bug fixes

### Phase 3: Beta Testing (Week 2)

- Deploy to staging environment
- Test with 5-10 real salons
- Monitor delivery rates and response rates
- Fix any issues discovered

### Phase 4: Production Launch

- Deploy to production
- Enable for all salons
- Monitor metrics
- Collect feedback

---

## Risk Mitigation

### Risk 1: WhatsApp API Rate Limiting

**Mitigation**:
- Implement exponential backoff in retry logic
- Monitor rate limit headers
- Queue reminders to spread load

### Risk 2: Customer Confusion (Multiple Bookings)

**Mitigation**:
- Include booking code in reminder message
- Match responses to most recent booking first
- Add fallback to human support if ambiguous

### Risk 3: Failed Message Delivery

**Mitigation**:
- 3 retry attempts with exponential backoff
- Admin notification after all retries fail
- Manual fallback option in admin dashboard

### Risk 4: Wrong Response Interpretation

**Mitigation**:
- Conservative parsing (only act on clear responses)
- Log all unknown responses for improvement
- Allow admin manual override

---

## Monitoring & Analytics

### Key Metrics to Track

```typescript
// Daily dashboard metrics
interface ReminderMetrics {
  total_reminders_sent: number;
  delivery_rate: number; // % successfully delivered
  response_rate: number; // % customers responded
  confirm_rate: number; // % confirmed
  cancel_rate: number; // % cancelled
  reschedule_rate: number; // % requested reschedule
  no_show_rate: number; // % didn't show up (for comparison)
  avg_response_time: number; // minutes from send to response
}
```

### Alerts

- Delivery rate drops below 90%
- Response rate drops below 30%
- Any reminder fails 3 times
- Queue backlog exceeds 100 jobs

---

**Document Version**: 1.0.0
**Last Updated**: 2025-10-24
**Author**: Product Specification Team
**Approver**: [To be assigned]
**Status**: Ready for Implementation

---

## Changelog

- **1.0.0** (2025-10-24): Initial specification created
  - Complete technical architecture
  - Database schema design
  - Backend service implementation plan
  - Frontend components specification
  - Testing strategy
  - Success criteria defined
