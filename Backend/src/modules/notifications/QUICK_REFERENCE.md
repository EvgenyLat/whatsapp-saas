# Notification Queue - Quick Reference

## Quick Start

### 1. Import Module

```typescript
import { NotificationQueueModule } from '@modules/notifications';

@Module({
  imports: [NotificationQueueModule],
})
export class YourModule {}
```

### 2. Inject Queue

```typescript
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@modules/notifications';

export class YourService {
  constructor(
    @InjectQueue(QUEUE_NAMES.WAITLIST_EXPIRY)
    private expiryQueue: Queue,
  ) {}
}
```

### 3. Add Job

```typescript
await this.expiryQueue.add('job-name', data, { delay: 900000 });
```

## Queue Names

```typescript
import { QUEUE_NAMES } from '@modules/notifications';

QUEUE_NAMES.WAITLIST_EXPIRY           // 'waitlist:expiry'
QUEUE_NAMES.WAITLIST_NOTIFICATION     // 'waitlist:notification'
QUEUE_NAMES.PREFERENCE_CALCULATION    // 'waitlist:preference-calculation'
```

## Job Names

```typescript
import { JOB_NAMES } from '@modules/notifications';

// Expiry queue
JOB_NAMES.CHECK_EXPIRY                // 'check-expiry'
JOB_NAMES.HANDLE_EXPIRY               // 'handle-expiry'

// Notification queue
JOB_NAMES.SEND_SLOT_AVAILABLE         // 'send-slot-available'
JOB_NAMES.SEND_EXPIRY_WARNING         // 'send-expiry-warning'
JOB_NAMES.SEND_BOOKING_CONFIRMATION   // 'send-booking-confirmation'

// Preference queue
JOB_NAMES.CALCULATE_PREFERENCES       // 'calculate-preferences'
JOB_NAMES.UPDATE_POPULAR_TIMES        // 'update-popular-times'
```

## Common Operations

### Schedule Delayed Job

```typescript
await queue.add('job-name', data, {
  delay: 15 * 60 * 1000,  // 15 minutes
  jobId: 'unique-id',      // Optional: for idempotency
});
```

### Send High Priority Notification

```typescript
await queue.add('job-name', data, {
  priority: 10,  // Higher = more priority
});
```

### Cancel Scheduled Job

```typescript
const job = await queue.getJob(jobId);
if (job && (await job.isDelayed())) {
  await job.remove();
}
```

### Get Queue Stats

```typescript
const waiting = await queue.getWaitingCount();
const active = await queue.getActiveCount();
const failed = await queue.getFailedCount();
```

## Type Definitions

### Expiry Job Data

```typescript
import type { WaitlistExpiryJobData } from '@modules/notifications';

const data: WaitlistExpiryJobData = {
  waitlistId: string,
  slotId: string,
  customerId: string,
  salonId: string,
  notifiedAt: string,  // ISO timestamp
  expiresAt: string,   // ISO timestamp
};
```

### Notification Job Data

```typescript
import type { WaitlistNotificationJobData } from '@modules/notifications';

const data: WaitlistNotificationJobData = {
  waitlistId: string,
  customerId: string,
  customerPhone: string,
  salonId: string,
  slotDetails: {
    date: string,
    time: string,
    masterId: string,
    masterName: string,
    serviceId: string,
    serviceName: string,
    duration: number,
    price: number,
  },
  notificationType: 'slot_available' | 'expiry_warning' | 'booking_confirmation',
};
```

### Preference Calculation Job Data

```typescript
import type { PreferenceCalculationJobData } from '@modules/notifications';

const data: PreferenceCalculationJobData = {
  customerId: string,
  bookingId?: string,
  salonId: string,
  action: 'calculate' | 'update_popular_times',
  data?: Record<string, any>,
};
```

## Environment Variables

```bash
# Redis connection
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_QUEUE_DB=1

# Concurrency
WAITLIST_EXPIRY_CONCURRENCY=5
WAITLIST_NOTIFICATION_CONCURRENCY=10
PREFERENCE_CALCULATION_CONCURRENCY=2

# Rate limiting
WAITLIST_NOTIFICATION_RATE_LIMIT=10

# Monitoring
QUEUE_MONITORING_ENABLED=true
QUEUE_LOG_LEVEL=info
```

## Monitoring URLs

- **Bull Board**: http://localhost:3001/admin/queues
- **Prometheus**: http://localhost:9090/metrics

## Common Patterns

### Pattern 1: Schedule & Cancel

```typescript
// Schedule
const jobId = `expiry_${waitlistId}`;
await queue.add('check-expiry', data, { delay: 900000, jobId });

// Cancel later
const job = await queue.getJob(jobId);
if (job) await job.remove();
```

### Pattern 2: Retry Failed Jobs

```typescript
const failed = await queue.getFailed();
for (const job of failed) {
  await job.retry();
}
```

### Pattern 3: Clean Old Jobs

```typescript
const grace = 24 * 3600 * 1000; // 24 hours
await queue.clean(grace, 1000, 'completed');
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Jobs not processing | Check Redis connection, verify worker is running |
| High memory usage | Run `queue.clean()` to remove old jobs |
| Delayed jobs not executing | Check system time, verify Redis is running |
| Rate limit errors | Increase `WAITLIST_NOTIFICATION_RATE_LIMIT` |

## Best Practices

1. ✅ Use unique job IDs for idempotency
2. ✅ Set appropriate priorities (1-10)
3. ✅ Cancel jobs when no longer needed
4. ✅ Monitor queue health regularly
5. ✅ Clean old jobs periodically

## Complete Example

```typescript
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES, JOB_NAMES } from '@modules/notifications';
import type { WaitlistExpiryJobData } from '@modules/notifications';

@Injectable()
export class WaitlistService {
  constructor(
    @InjectQueue(QUEUE_NAMES.WAITLIST_EXPIRY)
    private expiryQueue: Queue<WaitlistExpiryJobData>,
  ) {}

  async scheduleExpiryTimer(waitlistId: string, slotId: string) {
    const jobId = `expiry_${waitlistId}`;

    const job = await this.expiryQueue.add(
      JOB_NAMES.CHECK_EXPIRY,
      {
        waitlistId,
        slotId,
        customerId: 'cust_123',
        salonId: 'salon_456',
        notifiedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      },
      {
        delay: 15 * 60 * 1000,
        jobId,
      }
    );

    return job.id;
  }

  async cancelExpiryTimer(waitlistId: string) {
    const jobId = `expiry_${waitlistId}`;
    const job = await this.expiryQueue.getJob(jobId);

    if (job && (await job.isDelayed())) {
      await job.remove();
    }
  }
}
```

## Next Steps

1. Create processor classes (see `INTEGRATION_EXAMPLE.md`)
2. Set up environment variables
3. Test with Bull Board UI
4. Monitor queue health

## Documentation

- **Full Documentation**: `README.md`
- **Integration Guide**: `INTEGRATION_EXAMPLE.md`
- **Task Summary**: `TASK_COMPLETION_SUMMARY.md`

---

**Quick Reference Version**: 1.0.0
**Last Updated**: 2025-10-25
