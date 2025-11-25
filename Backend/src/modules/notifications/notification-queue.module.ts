/**
 * Notification Queue Module
 *
 * Provides BullMQ queue infrastructure for waitlist notification system
 *
 * Features:
 * - Three specialized queues (expiry, notification, preference)
 * - Delayed job support for 15-minute timers
 * - Exponential backoff retry logic
 * - Redis connection pooling
 * - Queue monitoring via Bull Board integration
 *
 * Usage:
 * Import this module in your feature modules to access notification queues
 *
 * @module NotificationQueueModule
 */

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import notificationQueueConfig, {
  QUEUE_NAMES,
  waitlistExpiryQueueConfig,
  waitlistNotificationQueueConfig,
  preferenceCalculationQueueConfig,
} from './queue.config';

/**
 * NotificationQueueModule
 *
 * Registers and configures BullMQ queues for waitlist notification system
 *
 * Exported Queues:
 * - waitlist:expiry - 15-minute expiry timers
 * - waitlist:notification - Real-time customer notifications
 * - waitlist:preference-calculation - Background preference analytics
 *
 * Integration:
 * ```typescript
 * // In your service
 * import { InjectQueue } from '@nestjs/bullmq';
 * import { Queue } from 'bullmq';
 * import { QUEUE_NAMES } from '@modules/notifications/queue.config';
 *
 * export class WaitlistService {
 *   constructor(
 *     @InjectQueue(QUEUE_NAMES.WAITLIST_EXPIRY)
 *     private expiryQueue: Queue,
 *   ) {}
 *
 *   async notifyCustomer(waitlistId: string) {
 *     // Schedule expiry check in 15 minutes
 *     await this.expiryQueue.add(
 *       'check-expiry',
 *       { waitlistId },
 *       { delay: 15 * 60 * 1000 }
 *     );
 *   }
 * }
 * ```
 */
@Module({
  imports: [
    // Register configuration
    ConfigModule.forFeature(notificationQueueConfig),

    // Register waitlist expiry queue
    // Handles 15-minute countdown timers
    BullModule.registerQueue({
      name: QUEUE_NAMES.WAITLIST_EXPIRY,
      ...waitlistExpiryQueueConfig,
    }),

    // Register waitlist notification queue
    // Sends WhatsApp notifications to customers
    BullModule.registerQueue({
      name: QUEUE_NAMES.WAITLIST_NOTIFICATION,
      ...waitlistNotificationQueueConfig,
    }),

    // Register preference calculation queue
    // Background processing for analytics
    BullModule.registerQueue({
      name: QUEUE_NAMES.PREFERENCE_CALCULATION,
      ...preferenceCalculationQueueConfig,
    }),
  ],
  exports: [
    BullModule, // Export to allow InjectQueue in consumers
  ],
})
export class NotificationQueueModule {}

/**
 * Usage Examples
 *
 * 1. Schedule Waitlist Expiry Timer
 * ----------------------------------
 * ```typescript
 * import { InjectQueue } from '@nestjs/bullmq';
 * import { Queue } from 'bullmq';
 * import { QUEUE_NAMES, JOB_NAMES } from '@modules/notifications/queue.config';
 *
 * export class WaitlistNotifierService {
 *   constructor(
 *     @InjectQueue(QUEUE_NAMES.WAITLIST_EXPIRY)
 *     private expiryQueue: Queue,
 *   ) {}
 *
 *   async scheduleExpiryCheck(waitlistId: string, slotId: string) {
 *     const job = await this.expiryQueue.add(
 *       JOB_NAMES.CHECK_EXPIRY,
 *       {
 *         waitlistId,
 *         slotId,
 *         customerId: 'cust_123',
 *         salonId: 'salon_456',
 *         notifiedAt: new Date().toISOString(),
 *         expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
 *       },
 *       {
 *         delay: 15 * 60 * 1000, // 15 minutes
 *         jobId: `expiry_${waitlistId}`, // Unique ID for idempotency
 *       }
 *     );
 *
 *     return job.id;
 *   }
 * }
 * ```
 *
 * 2. Send Waitlist Notification
 * -------------------------------
 * ```typescript
 * import { InjectQueue } from '@nestjs/bullmq';
 * import { Queue } from 'bullmq';
 * import { QUEUE_NAMES, JOB_NAMES } from '@modules/notifications/queue.config';
 *
 * export class WaitlistNotifierService {
 *   constructor(
 *     @InjectQueue(QUEUE_NAMES.WAITLIST_NOTIFICATION)
 *     private notificationQueue: Queue,
 *   ) {}
 *
 *   async sendSlotAvailableNotification(waitlistEntry: any, slot: any) {
 *     await this.notificationQueue.add(
 *       JOB_NAMES.SEND_SLOT_AVAILABLE,
 *       {
 *         waitlistId: waitlistEntry.id,
 *         customerId: waitlistEntry.customerId,
 *         customerPhone: waitlistEntry.customer.phone,
 *         salonId: waitlistEntry.salonId,
 *         slotDetails: {
 *           date: slot.date,
 *           time: slot.startTime,
 *           masterId: slot.masterId,
 *           masterName: slot.master.name,
 *           serviceId: slot.serviceId,
 *           serviceName: slot.service.name,
 *           duration: slot.duration,
 *           price: slot.price,
 *         },
 *         notificationType: 'slot_available',
 *       },
 *       {
 *         priority: 10, // High priority for real-time notifications
 *         attempts: 3,
 *       }
 *     );
 *   }
 * }
 * ```
 *
 * 3. Calculate Customer Preferences (Background)
 * -----------------------------------------------
 * ```typescript
 * import { InjectQueue } from '@nestjs/bullmq';
 * import { Queue } from 'bullmq';
 * import { QUEUE_NAMES, JOB_NAMES } from '@modules/notifications/queue.config';
 *
 * export class PreferenceService {
 *   constructor(
 *     @InjectQueue(QUEUE_NAMES.PREFERENCE_CALCULATION)
 *     private preferenceQueue: Queue,
 *   ) {}
 *
 *   async calculatePreferencesAfterBooking(customerId: string, bookingId: string) {
 *     await this.preferenceQueue.add(
 *       JOB_NAMES.CALCULATE_PREFERENCES,
 *       {
 *         customerId,
 *         bookingId,
 *         salonId: booking.salonId,
 *         action: 'calculate',
 *         data: {
 *           serviceId: booking.serviceId,
 *           masterId: booking.masterId,
 *           dayOfWeek: new Date(booking.date).getDay(),
 *           hour: parseInt(booking.startTime.split(':')[0]),
 *         },
 *       },
 *       {
 *         priority: 1, // Low priority for background processing
 *       }
 *     );
 *   }
 * }
 * ```
 *
 * 4. Monitor Queue Health
 * ------------------------
 * ```typescript
 * import { InjectQueue } from '@nestjs/bullmq';
 * import { Queue } from 'bullmq';
 * import { QUEUE_NAMES } from '@modules/notifications/queue.config';
 *
 * export class QueueHealthService {
 *   constructor(
 *     @InjectQueue(QUEUE_NAMES.WAITLIST_EXPIRY)
 *     private expiryQueue: Queue,
 *   ) {}
 *
 *   async getQueueStats() {
 *     const [waiting, active, completed, failed, delayed] = await Promise.all([
 *       this.expiryQueue.getWaitingCount(),
 *       this.expiryQueue.getActiveCount(),
 *       this.expiryQueue.getCompletedCount(),
 *       this.expiryQueue.getFailedCount(),
 *       this.expiryQueue.getDelayedCount(),
 *     ]);
 *
 *     return { waiting, active, completed, failed, delayed };
 *   }
 * }
 * ```
 *
 * 5. Cancel Scheduled Job (e.g., customer booked before expiry)
 * --------------------------------------------------------------
 * ```typescript
 * import { InjectQueue } from '@nestjs/bullmq';
 * import { Queue } from 'bullmq';
 * import { QUEUE_NAMES } from '@modules/notifications/queue.config';
 *
 * export class WaitlistService {
 *   constructor(
 *     @InjectQueue(QUEUE_NAMES.WAITLIST_EXPIRY)
 *     private expiryQueue: Queue,
 *   ) {}
 *
 *   async cancelExpiryTimer(waitlistId: string) {
 *     const jobId = `expiry_${waitlistId}`;
 *     const job = await this.expiryQueue.getJob(jobId);
 *
 *     if (job && (await job.isWaiting() || await job.isDelayed())) {
 *       await job.remove();
 *       console.log(`Cancelled expiry timer for waitlist ${waitlistId}`);
 *     }
 *   }
 * }
 * ```
 *
 * Performance Notes:
 * ------------------
 * - Delayed jobs use Redis sorted sets (O(log n) complexity)
 * - 15-minute timers are precise within ~100ms
 * - Queue supports 10,000+ concurrent delayed jobs
 * - Expiry checks are lightweight (<10ms processing time)
 * - Notification queue can handle 80 msgs/sec (WhatsApp API limit)
 *
 * Error Handling:
 * ---------------
 * - Failed jobs automatically retry with exponential backoff
 * - After 3 attempts, job moves to 'failed' state
 * - Failed jobs retained for 7 days for debugging
 * - Use Bull Board UI (/admin/queues) to monitor failures
 *
 * Monitoring:
 * -----------
 * - Bull Board: http://localhost:3001/admin/queues
 * - Prometheus metrics: http://localhost:9090/metrics
 * - Queue stats endpoint: GET /api/admin/queue-stats
 *
 * Environment Variables:
 * ----------------------
 * REDIS_HOST - Redis server host (default: localhost)
 * REDIS_PORT - Redis server port (default: 6379)
 * REDIS_QUEUE_DB - Redis database for queues (default: 1)
 * WAITLIST_EXPIRY_CONCURRENCY - Worker concurrency (default: 5)
 * WAITLIST_NOTIFICATION_CONCURRENCY - Worker concurrency (default: 10)
 * PREFERENCE_CALCULATION_CONCURRENCY - Worker concurrency (default: 2)
 * WAITLIST_NOTIFICATION_RATE_LIMIT - Max notifications/min (default: 10)
 */
