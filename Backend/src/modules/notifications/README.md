# Notification Queue Module

## Overview

This module provides BullMQ queue infrastructure for the waitlist notification system. It implements delayed job support for 15-minute expiry timers, real-time WhatsApp notifications, and background preference calculation.

## Architecture

### Queue Design

```
┌─────────────────────────────────────────────────────────────────┐
│                    Notification Queue System                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌───────────────────┐  ┌──────────────────┐  ┌───────────────┐│
│  │ Waitlist Expiry   │  │ Waitlist         │  │ Preference    ││
│  │ Queue             │  │ Notification     │  │ Calculation   ││
│  │                   │  │ Queue            │  │ Queue         ││
│  │ - 15-min timers   │  │ - Real-time msgs │  │ - Analytics   ││
│  │ - Delayed jobs    │  │ - High priority  │  │ - Background  ││
│  │ - Concurrency: 5  │  │ - Concurrency: 10│  │ - Low priority││
│  └─────────┬─────────┘  └─────────┬────────┘  └───────┬───────┘│
│            │                      │                    │        │
│            └──────────────────────┴────────────────────┘        │
│                                   │                             │
│                              ┌────▼────┐                        │
│                              │  Redis  │                        │
│                              │  Queue  │                        │
│                              │  DB #1  │                        │
│                              └─────────┘                        │
└─────────────────────────────────────────────────────────────────┘
```

### Three Specialized Queues

1. **waitlist:expiry** - Handles 15-minute countdown timers
2. **waitlist:notification** - Sends WhatsApp notifications to customers
3. **waitlist:preference-calculation** - Background preference analytics

## Installation

### 1. Import the Module

```typescript
import { NotificationQueueModule } from '@modules/notifications';

@Module({
  imports: [NotificationQueueModule],
  // ...
})
export class YourModule {}
```

### 2. Environment Variables

Add to your `.env` file:

```bash
# Redis connection
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_QUEUE_DB=1

# Waitlist queue concurrency
WAITLIST_EXPIRY_CONCURRENCY=5
WAITLIST_NOTIFICATION_CONCURRENCY=10
PREFERENCE_CALCULATION_CONCURRENCY=2

# Rate limiting
WAITLIST_NOTIFICATION_RATE_LIMIT=10

# Monitoring
QUEUE_MONITORING_ENABLED=true
QUEUE_LOG_LEVEL=info
```

## Usage Examples

### 1. Schedule Waitlist Expiry Timer

```typescript
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES, JOB_NAMES } from '@modules/notifications';

@Injectable()
export class WaitlistService {
  constructor(
    @InjectQueue(QUEUE_NAMES.WAITLIST_EXPIRY)
    private expiryQueue: Queue,
  ) {}

  async notifyWaitlistCustomer(waitlistEntry: any, slot: any) {
    // Send notification to customer
    await this.sendNotification(waitlistEntry, slot);

    // Schedule expiry check in 15 minutes
    const job = await this.expiryQueue.add(
      JOB_NAMES.CHECK_EXPIRY,
      {
        waitlistId: waitlistEntry.id,
        slotId: slot.id,
        customerId: waitlistEntry.customerId,
        salonId: waitlistEntry.salonId,
        notifiedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      },
      {
        delay: 15 * 60 * 1000, // 15 minutes
        jobId: `expiry_${waitlistEntry.id}`, // Unique ID for idempotency
      }
    );

    return job.id;
  }
}
```

### 2. Send WhatsApp Notification

```typescript
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES, JOB_NAMES } from '@modules/notifications';

@Injectable()
export class WaitlistNotifierService {
  constructor(
    @InjectQueue(QUEUE_NAMES.WAITLIST_NOTIFICATION)
    private notificationQueue: Queue,
  ) {}

  async sendSlotAvailableNotification(waitlistEntry: any, slot: any) {
    await this.notificationQueue.add(
      JOB_NAMES.SEND_SLOT_AVAILABLE,
      {
        waitlistId: waitlistEntry.id,
        customerId: waitlistEntry.customerId,
        customerPhone: waitlistEntry.customer.phone,
        salonId: waitlistEntry.salonId,
        slotDetails: {
          date: slot.date,
          time: slot.startTime,
          masterId: slot.masterId,
          masterName: slot.master.name,
          serviceId: slot.serviceId,
          serviceName: slot.service.name,
          duration: slot.duration,
          price: slot.price,
        },
        notificationType: 'slot_available',
      },
      {
        priority: 10, // High priority for real-time notifications
        attempts: 3,
      }
    );
  }
}
```

### 3. Calculate Customer Preferences (Background)

```typescript
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES, JOB_NAMES } from '@modules/notifications';

@Injectable()
export class PreferenceService {
  constructor(
    @InjectQueue(QUEUE_NAMES.PREFERENCE_CALCULATION)
    private preferenceQueue: Queue,
  ) {}

  async calculatePreferencesAfterBooking(customerId: string, booking: any) {
    await this.preferenceQueue.add(
      JOB_NAMES.CALCULATE_PREFERENCES,
      {
        customerId,
        bookingId: booking.id,
        salonId: booking.salonId,
        action: 'calculate',
        data: {
          serviceId: booking.serviceId,
          masterId: booking.masterId,
          dayOfWeek: new Date(booking.date).getDay(),
          hour: parseInt(booking.startTime.split(':')[0]),
        },
      },
      {
        priority: 1, // Low priority for background processing
      }
    );
  }
}
```

### 4. Cancel Scheduled Job

```typescript
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@modules/notifications';

@Injectable()
export class WaitlistService {
  constructor(
    @InjectQueue(QUEUE_NAMES.WAITLIST_EXPIRY)
    private expiryQueue: Queue,
  ) {}

  async cancelExpiryTimer(waitlistId: string) {
    const jobId = `expiry_${waitlistId}`;
    const job = await this.expiryQueue.getJob(jobId);

    if (job) {
      const state = await job.getState();
      if (state === 'waiting' || state === 'delayed') {
        await job.remove();
        console.log(`Cancelled expiry timer for waitlist ${waitlistId}`);
      }
    }
  }
}
```

### 5. Monitor Queue Health

```typescript
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@modules/notifications';

@Injectable()
export class QueueHealthService {
  constructor(
    @InjectQueue(QUEUE_NAMES.WAITLIST_EXPIRY)
    private expiryQueue: Queue,

    @InjectQueue(QUEUE_NAMES.WAITLIST_NOTIFICATION)
    private notificationQueue: Queue,

    @InjectQueue(QUEUE_NAMES.PREFERENCE_CALCULATION)
    private preferenceQueue: Queue,
  ) {}

  async getQueueStats() {
    const queues = [
      { name: 'expiry', queue: this.expiryQueue },
      { name: 'notification', queue: this.notificationQueue },
      { name: 'preference', queue: this.preferenceQueue },
    ];

    const stats = await Promise.all(
      queues.map(async ({ name, queue }) => {
        const [waiting, active, completed, failed, delayed] = await Promise.all([
          queue.getWaitingCount(),
          queue.getActiveCount(),
          queue.getCompletedCount(),
          queue.getFailedCount(),
          queue.getDelayedCount(),
        ]);

        return { name, waiting, active, completed, failed, delayed };
      })
    );

    return stats;
  }
}
```

## Queue Configuration

### Waitlist Expiry Queue

- **Purpose**: 15-minute countdown timers
- **Concurrency**: 5 workers
- **Retry**: 3 attempts with exponential backoff (1s → 2s → 4s)
- **Job Retention**: 100 completed (1 hour), 1000 failed (7 days)

### Waitlist Notification Queue

- **Purpose**: Real-time WhatsApp notifications
- **Concurrency**: 10 workers
- **Retry**: 3 attempts with exponential backoff
- **Rate Limit**: 10 notifications/minute per salon
- **Job Retention**: 200 completed (24 hours), 2000 failed (7 days)

### Preference Calculation Queue

- **Purpose**: Background analytics
- **Concurrency**: 2 workers
- **Retry**: 3 attempts with exponential backoff (5s → 10s → 20s)
- **Job Retention**: 50 completed (1 hour), 500 failed (7 days)

## Job Lifecycle

```
┌─────────────┐
│   Created   │
└──────┬──────┘
       │
       ▼
┌─────────────┐     Delayed jobs wait here
│   Delayed   │     (e.g., 15-minute timer)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Waiting   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Active    │ ──────┐ Failure
└──────┬──────┘       │
       │              ▼
       │        ┌─────────────┐
       │        │   Retry     │
       │        │  (3 times)  │
       │        └──────┬──────┘
       │               │
       │               ▼
       │        ┌─────────────┐
       │        │   Failed    │
       │        └─────────────┘
       │
       ▼
┌─────────────┐
│  Completed  │
└─────────────┘
```

## Performance Characteristics

### Delayed Jobs
- Redis sorted sets: O(log n) complexity
- Precision: ±100ms for 15-minute timers
- Capacity: 10,000+ concurrent delayed jobs

### Throughput
- Expiry checks: <10ms processing time
- Notifications: 80 msgs/sec (WhatsApp API limit)
- Preference calculation: Variable (database queries)

### Memory Usage
- Per job: ~1KB overhead
- 10,000 jobs: ~10MB RAM
- Redis memory: Depends on job data payload

## Monitoring

### Bull Board UI

Access the queue monitoring dashboard:
```
http://localhost:3001/admin/queues
```

Features:
- Real-time queue statistics
- Job details and logs
- Retry failed jobs
- Clean completed jobs
- Pause/resume queues

### Prometheus Metrics

Metrics endpoint:
```
http://localhost:9090/metrics
```

Available metrics:
- `bullmq_jobs_total{queue,status}` - Total jobs by status
- `bullmq_jobs_duration_seconds{queue}` - Job processing duration
- `bullmq_jobs_waiting{queue}` - Waiting jobs count
- `bullmq_jobs_active{queue}` - Active jobs count
- `bullmq_jobs_delayed{queue}` - Delayed jobs count

### Logging

Queue events are logged with structured data:

```typescript
// Job started
{ level: 'info', queue: 'waitlist:expiry', job: 'check-expiry', jobId: '123' }

// Job completed
{ level: 'info', queue: 'waitlist:expiry', job: 'check-expiry', jobId: '123', duration: '45ms' }

// Job failed
{ level: 'error', queue: 'waitlist:expiry', job: 'check-expiry', jobId: '123', error: 'Connection timeout' }
```

## Error Handling

### Automatic Retries

Failed jobs automatically retry with exponential backoff:

1. **First retry**: 1 second delay
2. **Second retry**: 2 seconds delay
3. **Third retry**: 4 seconds delay
4. **Failed**: Moved to failed queue

### Failed Job Management

Access failed jobs via Bull Board:
1. Navigate to `/admin/queues`
2. Select queue
3. Click "Failed" tab
4. View error details
5. Retry or remove job

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Connection timeout` | Redis unavailable | Check Redis connection |
| `Job stalled` | Worker crashed | Worker will auto-restart |
| `Rate limit exceeded` | WhatsApp API limit | Increase delay between jobs |
| `Invalid job data` | Missing required fields | Validate data before adding job |

## Best Practices

### 1. Use Unique Job IDs

```typescript
await queue.add('job-name', data, {
  jobId: `unique_${entityId}`, // Prevents duplicate jobs
});
```

### 2. Set Appropriate Priorities

```typescript
// High priority (real-time notifications)
await notificationQueue.add(data, { priority: 10 });

// Low priority (background tasks)
await preferenceQueue.add(data, { priority: 1 });
```

### 3. Handle Job Cancellation

```typescript
// Always check job state before removal
const job = await queue.getJob(jobId);
if (job && (await job.isWaiting() || await job.isDelayed())) {
  await job.remove();
}
```

### 4. Monitor Queue Health

```typescript
// Set up health check endpoint
@Get('/health/queues')
async getQueueHealth() {
  const stats = await this.queueHealthService.getQueueStats();
  return {
    healthy: stats.every(s => s.failed < 100),
    queues: stats,
  };
}
```

### 5. Clean Old Jobs

```typescript
// Periodically clean old completed jobs
async cleanCompletedJobs() {
  const grace = 24 * 3600 * 1000; // 24 hours
  await this.expiryQueue.clean(grace, 1000, 'completed');
}
```

## Troubleshooting

### Queue Not Processing Jobs

1. Check Redis connection:
   ```bash
   redis-cli -h localhost -p 6379 ping
   ```

2. Verify worker is running:
   ```typescript
   const workers = await queue.getWorkers();
   console.log('Active workers:', workers.length);
   ```

3. Check queue pause state:
   ```typescript
   const isPaused = await queue.isPaused();
   if (isPaused) await queue.resume();
   ```

### High Memory Usage

1. Clean old jobs:
   ```typescript
   await queue.clean(3600000, 1000, 'completed');
   await queue.clean(3600000, 1000, 'failed');
   ```

2. Reduce job retention:
   ```typescript
   defaultJobOptions: {
     removeOnComplete: { count: 50 }, // Reduce from 100
   }
   ```

### Delayed Jobs Not Executing

1. Check delayed jobs count:
   ```typescript
   const count = await queue.getDelayedCount();
   console.log('Delayed jobs:', count);
   ```

2. Verify system time is correct:
   ```bash
   date
   ```

3. Check for stalled jobs:
   ```typescript
   const stalled = await queue.getStalled();
   console.log('Stalled jobs:', stalled.length);
   ```

## Related Documentation

- [BullMQ Documentation](https://docs.bullmq.io/)
- [Redis Documentation](https://redis.io/docs/)
- [NestJS Queues Guide](https://docs.nestjs.com/techniques/queues)
- [Research Document](../../../specs/001-whatsapp-quick-booking/research.md) - Section 3.1

## Support

For issues or questions:
1. Check Bull Board UI for job status
2. Review application logs
3. Verify environment variables
4. Test Redis connection
5. Contact development team

---

**Module Version**: 1.0.0
**Last Updated**: 2025-10-25
**Tech Stack**: BullMQ 4.x, Redis 7+, NestJS 10.x
