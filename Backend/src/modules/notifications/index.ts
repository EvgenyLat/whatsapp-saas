/**
 * Notifications Module - Barrel Export
 *
 * Centralized exports for notification queue configuration and module
 */

// Queue configuration
export {
  default as notificationQueueConfig,
  QUEUE_NAMES,
  JOB_NAMES,
  getRedisConnection,
  waitlistExpiryQueueConfig,
  waitlistNotificationQueueConfig,
  preferenceCalculationQueueConfig,
  workerConfigs,
} from './queue.config';

// Type definitions
export type {
  WaitlistExpiryJobData,
  WaitlistNotificationJobData,
  PreferenceCalculationJobData,
  QueueStats,
  QueueHealth,
} from './queue.config';

// Module
export { NotificationQueueModule } from './notification-queue.module';
