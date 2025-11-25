/**
 * Queue Configuration for Waitlist Notification System
 *
 * This configuration defines BullMQ queues for handling:
 * 1. Waitlist expiry timers (15-minute countdown)
 * 2. Waitlist notifications (real-time customer alerts)
 * 3. Preference calculation (background processing)
 *
 * Tech Stack:
 * - BullMQ 4.x for job queue management
 * - Redis 7+ for queue persistence
 * - NestJS 10.x integration via @nestjs/bullmq
 *
 * Based on: specs/001-whatsapp-quick-booking/research.md Section 3.1
 *
 * @module NotificationQueueConfig
 */

import { QueueOptions, WorkerOptions } from 'bullmq';
import { registerAs } from '@nestjs/config';

/**
 * Queue Names
 * Following the pattern: domain:action
 */
export const QUEUE_NAMES = {
  WAITLIST_EXPIRY: 'waitlist:expiry',
  WAITLIST_NOTIFICATION: 'waitlist:notification',
  PREFERENCE_CALCULATION: 'waitlist:preference-calculation',
} as const;

/**
 * Job Names within each queue
 */
export const JOB_NAMES = {
  // Waitlist expiry queue jobs
  CHECK_EXPIRY: 'check-expiry',
  HANDLE_EXPIRY: 'handle-expiry',

  // Waitlist notification queue jobs
  SEND_SLOT_AVAILABLE: 'send-slot-available',
  SEND_EXPIRY_WARNING: 'send-expiry-warning',
  SEND_BOOKING_CONFIRMATION: 'send-booking-confirmation',

  // Preference calculation queue jobs
  CALCULATE_PREFERENCES: 'calculate-preferences',
  UPDATE_POPULAR_TIMES: 'update-popular-times',
} as const;

/**
 * Redis connection configuration for queues
 * Uses separate database from cache (REDIS_QUEUE_DB)
 */
export const getRedisConnection = () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_QUEUE_DB || '1', 10),
  maxRetriesPerRequest: null, // Required for BullMQ
  enableReadyCheck: false,
  // Connection pool settings for high-load scenarios
  lazyConnect: false,
  keepAlive: 30000, // 30 seconds
  family: 4, // IPv4
});

/**
 * Waitlist Expiry Queue Configuration
 *
 * Purpose: Handles 15-minute countdown timers for waitlist notifications
 *
 * Key Features:
 * - Delayed job support for precise 15-minute timers
 * - Exponential backoff on retries (1s → 2s → 4s)
 * - High priority for time-sensitive operations
 *
 * Usage Example:
 * ```typescript
 * // When notifying customer of available slot
 * await waitlistExpiryQueue.add(
 *   'check-expiry',
 *   { waitlistId: 'wl_123', slotId: 'slot_456' },
 *   { delay: 15 * 60 * 1000 } // 15 minutes
 * );
 * ```
 */
export const waitlistExpiryQueueConfig: QueueOptions = {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000, // Start at 1 second, doubles each retry
    },
    removeOnComplete: {
      count: 100, // Keep last 100 completed for debugging
      age: 3600, // Remove after 1 hour
    },
    removeOnFail: {
      count: 1000, // Keep last 1000 failed for analysis
      age: 7 * 24 * 3600, // Remove after 7 days
    },
  },
};

/**
 * Waitlist Notification Queue Configuration
 *
 * Purpose: Sends WhatsApp notifications to customers on waitlist
 *
 * Key Features:
 * - High priority for real-time customer experience
 * - Retry logic for network failures
 * - Rate limiting to respect WhatsApp API limits (80 MPS)
 *
 * Usage Example:
 * ```typescript
 * // Send slot available notification
 * await waitlistNotificationQueue.add(
 *   'send-slot-available',
 *   {
 *     waitlistId: 'wl_123',
 *     customerId: 'cust_456',
 *     slotDetails: { date: '2025-10-25', time: '15:00' }
 *   },
 *   { priority: 10 } // High priority
 * );
 * ```
 */
export const waitlistNotificationQueueConfig: QueueOptions = {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: {
      count: 200,
      age: 24 * 3600, // 24 hours
    },
    removeOnFail: {
      count: 2000,
      age: 7 * 24 * 3600,
    },
  },
  // Rate limiting: Max 10 notifications/minute per salon (prevents storm)
  // Note: limiter is configured at queue level, not options level
  // limiter: {
  //   max: parseInt(process.env.WAITLIST_NOTIFICATION_RATE_LIMIT || '10', 10),
  //   duration: 60000, // 1 minute
  // },
};

/**
 * Preference Calculation Queue Configuration
 *
 * Purpose: Background processing for customer preference analytics
 *
 * Key Features:
 * - Low priority (runs when system is idle)
 * - Long retry window for non-critical operations
 * - Batch processing support
 *
 * Usage Example:
 * ```typescript
 * // Calculate preferences after booking
 * await preferenceCalculationQueue.add(
 *   'calculate-preferences',
 *   { customerId: 'cust_123', bookingId: 'bk_456' },
 *   { priority: 1 } // Low priority
 * );
 * ```
 */
export const preferenceCalculationQueueConfig: QueueOptions = {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000, // Slower retry for background jobs
    },
    removeOnComplete: {
      count: 50,
      age: 3600,
    },
    removeOnFail: {
      count: 500,
      age: 7 * 24 * 3600,
    },
  },
};

/**
 * Worker Configuration for Queue Processors
 *
 * Concurrency Settings:
 * - waitlist-expiry: 5 concurrent (moderate load)
 * - waitlist-notification: 10 concurrent (high throughput)
 * - preference-calculation: 2 concurrent (background, low priority)
 */
export const workerConfigs = {
  waitlistExpiry: {
    concurrency: parseInt(process.env.WAITLIST_EXPIRY_CONCURRENCY || '5', 10),
    limiter: {
      max: 100,
      duration: 1000, // 100 jobs/second max
    },
  } as WorkerOptions,

  waitlistNotification: {
    concurrency: parseInt(process.env.WAITLIST_NOTIFICATION_CONCURRENCY || '10', 10),
    limiter: {
      max: 80, // Respect WhatsApp's 80 MPS limit
      duration: 1000,
    },
  } as WorkerOptions,

  preferenceCalculation: {
    concurrency: parseInt(process.env.PREFERENCE_CALCULATION_CONCURRENCY || '2', 10),
    limiter: {
      max: 20,
      duration: 1000,
    },
  } as WorkerOptions,
};

/**
 * NestJS Configuration Provider
 *
 * Exports configuration for use in ConfigModule.forFeature()
 */
export default registerAs('notificationQueue', () => ({
  queues: QUEUE_NAMES,
  jobs: JOB_NAMES,
  connection: getRedisConnection(),

  // Queue-specific configurations
  waitlistExpiry: waitlistExpiryQueueConfig,
  waitlistNotification: waitlistNotificationQueueConfig,
  preferenceCalculation: preferenceCalculationQueueConfig,

  // Worker configurations
  workers: workerConfigs,

  // Monitoring and logging
  monitoring: {
    enabled: process.env.QUEUE_MONITORING_ENABLED !== 'false',
    logLevel: process.env.QUEUE_LOG_LEVEL || 'info',
  },

  // Job lifecycle settings
  lifecycle: {
    // Log job start/complete/fail events
    logJobStart: true,
    logJobComplete: true,
    logJobFail: true,

    // Metrics collection
    collectMetrics: process.env.ENABLE_METRICS !== 'false',
  },
}));

/**
 * Type Definitions for Queue Job Data
 */

export interface WaitlistExpiryJobData {
  waitlistId: string;
  slotId: string;
  customerId: string;
  salonId: string;
  notifiedAt: string; // ISO timestamp
  expiresAt: string; // ISO timestamp
}

export interface WaitlistNotificationJobData {
  waitlistId: string;
  customerId: string;
  customerPhone: string;
  salonId: string;
  slotDetails: {
    date: string;
    time: string;
    masterId: string;
    masterName: string;
    serviceId: string;
    serviceName: string;
    duration: number;
    price: number;
  };
  notificationType: 'slot_available' | 'expiry_warning' | 'booking_confirmation';
}

export interface PreferenceCalculationJobData {
  customerId: string;
  bookingId?: string;
  salonId: string;
  action: 'calculate' | 'update_popular_times';
  data?: Record<string, any>;
}

/**
 * Queue Statistics Interface
 */
export interface QueueStats {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}

/**
 * Queue Health Check Response
 */
export interface QueueHealth {
  healthy: boolean;
  queues: {
    [key: string]: {
      connected: boolean;
      stats: QueueStats;
    };
  };
  redis: {
    connected: boolean;
    latency: number;
  };
}
