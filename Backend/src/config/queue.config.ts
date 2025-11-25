import { registerAs } from '@nestjs/config';

export default registerAs('queue', () => ({
  // Redis connection for BullMQ
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_QUEUE_DB || '1', 10), // Use separate DB for queues
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: false,
  },

  // Queue configurations
  defaultJobOptions: {
    attempts: parseInt(process.env.QUEUE_RETRY_ATTEMPTS || '3', 10),
    backoff: {
      type: 'exponential',
      delay: 2000, // Start with 2 seconds
    },
    removeOnComplete: {
      count: 1000, // Keep last 1000 completed jobs
      age: 24 * 3600, // Remove after 24 hours
    },
    removeOnFail: {
      count: 5000, // Keep last 5000 failed jobs for debugging
      age: 7 * 24 * 3600, // Remove after 7 days
    },
  },

  // Queue names
  queues: {
    whatsappWebhook: 'whatsapp:webhook',
    messageStatus: 'whatsapp:message-status',
    bookingReminder: 'booking:reminder',
    emailNotification: 'notification:email',
    // Waitlist notification queues
    waitlistExpiry: 'waitlist:expiry',
    waitlistNotification: 'waitlist:notification',
    preferenceCalculation: 'waitlist:preference-calculation',
  },

  // Concurrency settings
  concurrency: {
    whatsappWebhook: parseInt(process.env.WEBHOOK_QUEUE_CONCURRENCY || '5', 10),
    messageStatus: parseInt(process.env.MESSAGE_QUEUE_CONCURRENCY || '10', 10),
    bookingReminder: parseInt(process.env.BOOKING_QUEUE_CONCURRENCY || '3', 10),
    emailNotification: parseInt(process.env.EMAIL_QUEUE_CONCURRENCY || '5', 10),
    // Waitlist notification queue concurrency
    waitlistExpiry: parseInt(process.env.WAITLIST_EXPIRY_CONCURRENCY || '5', 10),
    waitlistNotification: parseInt(process.env.WAITLIST_NOTIFICATION_CONCURRENCY || '10', 10),
    preferenceCalculation: parseInt(process.env.PREFERENCE_CALCULATION_CONCURRENCY || '2', 10),
  },

  // Bull Board settings
  bullBoard: {
    enabled: process.env.BULL_BOARD_ENABLED !== 'false',
    path: process.env.BULL_BOARD_PATH || '/admin/queues',
    port: parseInt(process.env.BULL_BOARD_PORT || '3001', 10),
  },

  // Rate limiting per queue
  limiter: {
    whatsappWebhook: {
      max: 100, // Max jobs to process
      duration: 1000, // Per duration in ms
    },
    messageStatus: {
      max: 50,
      duration: 1000,
    },
  },
}));
