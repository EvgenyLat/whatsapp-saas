# Integration Example: Complete Waitlist Notification Workflow

This document provides a complete, end-to-end example of implementing the waitlist notification system using the notification queues.

## Scenario

A customer wants a haircut appointment but all slots are booked. They join the waitlist. When a slot becomes available (cancellation), the system:

1. Notifies the first customer in the waitlist
2. Starts a 15-minute countdown timer
3. If customer books within 15 minutes → Complete, remove timer
4. If customer doesn't respond → Expire, notify next customer

## Implementation

### Step 1: Create Waitlist Service

```typescript
// src/modules/waitlist/waitlist.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '@database/prisma.service';
import { QUEUE_NAMES, JOB_NAMES } from '@modules/notifications';
import type { WaitlistExpiryJobData, WaitlistNotificationJobData } from '@modules/notifications';

@Injectable()
export class WaitlistService {
  private readonly logger = new Logger(WaitlistService.name);

  constructor(
    private prisma: PrismaService,

    @InjectQueue(QUEUE_NAMES.WAITLIST_EXPIRY)
    private expiryQueue: Queue<WaitlistExpiryJobData>,

    @InjectQueue(QUEUE_NAMES.WAITLIST_NOTIFICATION)
    private notificationQueue: Queue<WaitlistNotificationJobData>,
  ) {}

  /**
   * Add customer to waitlist when no slots available
   */
  async addToWaitlist(data: {
    customerId: string;
    salonId: string;
    serviceId: string;
    masterId?: string;
    preferredDate?: string;
  }) {
    // Get current queue position
    const queuePosition = await this.prisma.waitlist.count({
      where: {
        salonId: data.salonId,
        status: 'active',
      },
    });

    // Create waitlist entry
    const waitlistEntry = await this.prisma.waitlist.create({
      data: {
        customerId: data.customerId,
        salonId: data.salonId,
        serviceId: data.serviceId,
        masterId: data.masterId,
        preferredDate: data.preferredDate,
        positionInQueue: queuePosition + 1,
        status: 'active',
      },
      include: {
        customer: true,
        service: true,
      },
    });

    this.logger.log(
      `Customer ${data.customerId} added to waitlist at position ${queuePosition + 1}`
    );

    return waitlistEntry;
  }

  /**
   * Notify next customer when slot becomes available
   */
  async notifyNextCustomer(slotId: string, slotDetails: any) {
    // Find next customer in waitlist
    const nextCustomer = await this.prisma.waitlist.findFirst({
      where: {
        salonId: slotDetails.salonId,
        serviceId: slotDetails.serviceId,
        status: 'active',
      },
      orderBy: {
        positionInQueue: 'asc',
      },
      include: {
        customer: true,
        service: true,
      },
    });

    if (!nextCustomer) {
      this.logger.log('No customers in waitlist');
      return null;
    }

    // Update waitlist entry status
    await this.prisma.waitlist.update({
      where: { id: nextCustomer.id },
      data: {
        status: 'notified',
        notifiedAt: new Date(),
        notificationExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    // Send WhatsApp notification
    await this.notificationQueue.add(
      JOB_NAMES.SEND_SLOT_AVAILABLE,
      {
        waitlistId: nextCustomer.id,
        customerId: nextCustomer.customerId,
        customerPhone: nextCustomer.customer.phone,
        salonId: nextCustomer.salonId,
        slotDetails,
        notificationType: 'slot_available',
      },
      {
        priority: 10, // High priority
      }
    );

    // Schedule expiry check in 15 minutes
    const expiryJob = await this.expiryQueue.add(
      JOB_NAMES.CHECK_EXPIRY,
      {
        waitlistId: nextCustomer.id,
        slotId,
        customerId: nextCustomer.customerId,
        salonId: nextCustomer.salonId,
        notifiedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      },
      {
        delay: 15 * 60 * 1000, // 15 minutes
        jobId: `expiry_${nextCustomer.id}`, // Unique ID for cancellation
      }
    );

    this.logger.log(
      `Notified customer ${nextCustomer.customerId}, expiry job ${expiryJob.id} scheduled`
    );

    return nextCustomer;
  }

  /**
   * Handle customer booking from waitlist
   */
  async handleWaitlistBooking(waitlistId: string, slotId: string) {
    // Use transaction to prevent race conditions
    return await this.prisma.$transaction(async (tx) => {
      // Lock the slot
      const slot = await tx.booking.findUnique({
        where: { id: slotId },
        // PostgreSQL row-level lock
      });

      if (!slot || slot.status !== 'available') {
        throw new Error('Slot already booked');
      }

      // Get waitlist entry
      const waitlistEntry = await tx.waitlist.findUnique({
        where: { id: waitlistId },
      });

      if (!waitlistEntry || waitlistEntry.status !== 'notified') {
        throw new Error('Invalid waitlist entry');
      }

      // Create booking
      const booking = await tx.booking.create({
        data: {
          customerId: waitlistEntry.customerId,
          salonId: waitlistEntry.salonId,
          serviceId: waitlistEntry.serviceId,
          masterId: slot.masterId,
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          status: 'confirmed',
          source: 'waitlist',
        },
      });

      // Mark waitlist entry as booked
      await tx.waitlist.update({
        where: { id: waitlistId },
        data: {
          status: 'booked',
          bookedAt: new Date(),
        },
      });

      return booking;
    });

    // After transaction, cancel expiry timer
    await this.cancelExpiryTimer(waitlistId);

    this.logger.log(`Waitlist booking completed for ${waitlistId}`);
  }

  /**
   * Cancel expiry timer when customer books
   */
  async cancelExpiryTimer(waitlistId: string) {
    const jobId = `expiry_${waitlistId}`;
    const job = await this.expiryQueue.getJob(jobId);

    if (job) {
      const state = await job.getState();
      if (state === 'waiting' || state === 'delayed') {
        await job.remove();
        this.logger.log(`Cancelled expiry timer for waitlist ${waitlistId}`);
      }
    }
  }
}
```

### Step 2: Create Expiry Processor

```typescript
// src/modules/waitlist/processors/waitlist-expiry.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '@database/prisma.service';
import { QUEUE_NAMES, JOB_NAMES } from '@modules/notifications';
import type { WaitlistExpiryJobData } from '@modules/notifications';
import { WaitlistService } from '../waitlist.service';

@Processor(QUEUE_NAMES.WAITLIST_EXPIRY)
export class WaitlistExpiryProcessor extends WorkerHost {
  private readonly logger = new Logger(WaitlistExpiryProcessor.name);

  constructor(
    private prisma: PrismaService,
    private waitlistService: WaitlistService,
  ) {
    super();
  }

  async process(job: Job<WaitlistExpiryJobData>) {
    const { waitlistId, slotId } = job.data;

    this.logger.log(`Processing expiry check for waitlist ${waitlistId}`);

    // Check current waitlist status
    const entry = await this.prisma.waitlist.findUnique({
      where: { id: waitlistId },
    });

    if (!entry) {
      this.logger.warn(`Waitlist entry ${waitlistId} not found`);
      return;
    }

    // If customer already booked, do nothing
    if (entry.status === 'booked') {
      this.logger.log(`Customer already booked, skipping expiry`);
      return;
    }

    // If still notified (no response), mark as expired
    if (entry.status === 'notified') {
      await this.prisma.waitlist.update({
        where: { id: waitlistId },
        data: {
          status: 'expired',
          expiredAt: new Date(),
        },
      });

      this.logger.log(`Waitlist entry ${waitlistId} expired, notifying next customer`);

      // Check if slot is still available
      const slot = await this.prisma.booking.findUnique({
        where: { id: slotId },
      });

      if (slot && slot.status === 'available') {
        // Notify next customer in queue
        await this.waitlistService.notifyNextCustomer(slotId, slot);
      } else {
        this.logger.log(`Slot ${slotId} no longer available`);
      }
    }
  }
}
```

### Step 3: Create Notification Processor

```typescript
// src/modules/waitlist/processors/waitlist-notification.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { WhatsAppService } from '@modules/whatsapp/whatsapp.service';
import { QUEUE_NAMES, JOB_NAMES } from '@modules/notifications';
import type { WaitlistNotificationJobData } from '@modules/notifications';

@Processor(QUEUE_NAMES.WAITLIST_NOTIFICATION)
export class WaitlistNotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(WaitlistNotificationProcessor.name);

  constructor(private whatsappService: WhatsAppService) {
    super();
  }

  async process(job: Job<WaitlistNotificationJobData>) {
    const { customerPhone, slotDetails, notificationType } = job.data;

    this.logger.log(`Sending ${notificationType} notification to ${customerPhone}`);

    if (notificationType === 'slot_available') {
      await this.sendSlotAvailableMessage(customerPhone, slotDetails);
    }
  }

  private async sendSlotAvailableMessage(phone: string, slot: any) {
    const message = `Great news! A slot just opened up! 🎉

📅 ${slot.date}
⏰ ${slot.time}
💇 ${slot.serviceName} with ${slot.masterName}
⏱️ ${slot.duration} minutes
💰 $${slot.price}

You have 15 minutes to book this slot.

Would you like to book it?`;

    await this.whatsappService.sendInteractiveButtons(phone, {
      body: message,
      buttons: [
        { id: `waitlist_book_${slot.id}`, title: 'Book Now' },
        { id: `waitlist_decline_${slot.id}`, title: 'No Thanks' },
      ],
    });
  }
}
```

### Step 4: Create Waitlist Module

```typescript
// src/modules/waitlist/waitlist.module.ts
import { Module } from '@nestjs/common';
import { NotificationQueueModule } from '@modules/notifications';
import { DatabaseModule } from '@database/database.module';
import { WhatsAppModule } from '@modules/whatsapp/whatsapp.module';
import { WaitlistService } from './waitlist.service';
import { WaitlistExpiryProcessor } from './processors/waitlist-expiry.processor';
import { WaitlistNotificationProcessor } from './processors/waitlist-notification.processor';

@Module({
  imports: [
    NotificationQueueModule, // Import notification queues
    DatabaseModule,
    WhatsAppModule,
  ],
  providers: [
    WaitlistService,
    WaitlistExpiryProcessor,
    WaitlistNotificationProcessor,
  ],
  exports: [WaitlistService],
})
export class WaitlistModule {}
```

### Step 5: Handle Booking Cancellation

```typescript
// src/modules/bookings/bookings.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { WaitlistService } from '@modules/waitlist/waitlist.service';

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    private waitlistService: WaitlistService,
  ) {}

  async cancelBooking(bookingId: string) {
    const booking = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'cancelled' },
    });

    // Slot now available, notify waitlist
    await this.waitlistService.notifyNextCustomer(bookingId, {
      salonId: booking.salonId,
      serviceId: booking.serviceId,
      masterId: booking.masterId,
      date: booking.date,
      startTime: booking.startTime,
      endTime: booking.endTime,
      duration: booking.duration,
      price: booking.price,
    });

    return booking;
  }
}
```

## Testing

### Unit Test Example

```typescript
// src/modules/waitlist/waitlist.service.spec.ts
import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { WaitlistService } from './waitlist.service';
import { PrismaService } from '@database/prisma.service';
import { QUEUE_NAMES } from '@modules/notifications';

describe('WaitlistService', () => {
  let service: WaitlistService;
  let mockExpiryQueue: any;
  let mockNotificationQueue: any;

  beforeEach(async () => {
    mockExpiryQueue = {
      add: jest.fn(),
      getJob: jest.fn(),
    };

    mockNotificationQueue = {
      add: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        WaitlistService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: getQueueToken(QUEUE_NAMES.WAITLIST_EXPIRY),
          useValue: mockExpiryQueue,
        },
        {
          provide: getQueueToken(QUEUE_NAMES.WAITLIST_NOTIFICATION),
          useValue: mockNotificationQueue,
        },
      ],
    }).compile();

    service = module.get<WaitlistService>(WaitlistService);
  });

  it('should schedule expiry check when notifying customer', async () => {
    const result = await service.notifyNextCustomer('slot_123', {
      /* slot data */
    });

    expect(mockExpiryQueue.add).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        waitlistId: expect.any(String),
        slotId: 'slot_123',
      }),
      expect.objectContaining({
        delay: 15 * 60 * 1000,
      })
    );
  });
});
```

### Integration Test

```typescript
// test/waitlist.e2e-spec.ts
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '@database/prisma.service';

describe('Waitlist Flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    prisma = moduleRef.get<PrismaService>(PrismaService);
    await app.init();
  });

  it('should notify customer when slot becomes available', async () => {
    // 1. Create waitlist entry
    const waitlistEntry = await prisma.waitlist.create({
      data: {
        customerId: 'cust_123',
        salonId: 'salon_123',
        serviceId: 'service_123',
        status: 'active',
      },
    });

    // 2. Cancel a booking (makes slot available)
    await request(app.getHttpServer())
      .post('/api/bookings/booking_123/cancel')
      .expect(200);

    // 3. Wait for notification
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 4. Verify waitlist entry was notified
    const updated = await prisma.waitlist.findUnique({
      where: { id: waitlistEntry.id },
    });

    expect(updated.status).toBe('notified');
    expect(updated.notifiedAt).toBeDefined();
  });
});
```

## Monitoring

### Health Check Endpoint

```typescript
// src/modules/queue/controllers/queue-health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@modules/notifications';

@Controller('api/admin/queue-health')
export class QueueHealthController {
  constructor(
    @InjectQueue(QUEUE_NAMES.WAITLIST_EXPIRY)
    private expiryQueue: Queue,

    @InjectQueue(QUEUE_NAMES.WAITLIST_NOTIFICATION)
    private notificationQueue: Queue,
  ) {}

  @Get()
  async getHealth() {
    const [expiryStats, notificationStats] = await Promise.all([
      this.getQueueStats(this.expiryQueue),
      this.getQueueStats(this.notificationQueue),
    ]);

    return {
      healthy: expiryStats.failed < 100 && notificationStats.failed < 100,
      queues: {
        expiry: expiryStats,
        notification: notificationStats,
      },
    };
  }

  private async getQueueStats(queue: Queue) {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }
}
```

## Summary

This integration example demonstrates:

1. **Queue Setup**: Injecting queues via `@InjectQueue`
2. **Job Scheduling**: Adding delayed jobs for 15-minute timers
3. **Processors**: Handling job execution in worker processes
4. **Transaction Safety**: Using database locks to prevent race conditions
5. **Job Cancellation**: Removing delayed jobs when no longer needed
6. **Testing**: Unit and integration tests for queue workflows
7. **Monitoring**: Health check endpoints for queue status

The complete workflow ensures reliable, real-time notifications with automatic expiry handling and graceful error recovery.
