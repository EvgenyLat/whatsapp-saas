import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';

export interface WebhookJobData {
  salonId: string;
  payload: any;
  receivedAt: string;
}

export interface MessageStatusJobData {
  messageId: string;
  status: string;
  timestamp: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface BookingReminderJobData {
  bookingId: string;
  salonId: string;
  customerPhone: string;
  serviceDate: string;
  serviceName: string;
  reminderType: 'day_before' | 'hour_before';
}

export interface EmailNotificationJobData {
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
  priority?: number;
}

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);
  private readonly queues: Record<string, string>;

  constructor(
    @InjectQueue('whatsapp:webhook')
    private webhookQueue: Queue<WebhookJobData>,

    @InjectQueue('whatsapp:message-status')
    private messageStatusQueue: Queue<MessageStatusJobData>,

    @InjectQueue('booking:reminder')
    private bookingReminderQueue: Queue<BookingReminderJobData>,

    @InjectQueue('notification:email')
    private emailQueue: Queue<EmailNotificationJobData>,

    private configService: ConfigService,
  ) {
    const queueConfig = this.configService.get('queue');
    this.queues = queueConfig?.queues || {};
  }

  /**
   * Add WhatsApp webhook to processing queue
   */
  async addWebhookJob(data: WebhookJobData, priority: number = 5): Promise<void> {
    try {
      await this.webhookQueue.add('process-webhook', data, {
        priority,
        removeOnComplete: true,
        removeOnFail: false,
      });
      this.logger.debug(`Webhook job added for salon ${data.salonId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to add webhook job: ${message}`, stack);
      throw error;
    }
  }

  /**
   * Add message status update to queue
   */
  async addMessageStatusJob(data: MessageStatusJobData): Promise<void> {
    try {
      await this.messageStatusQueue.add('update-status', data, {
        priority: 8, // Higher priority for status updates
        attempts: 5, // More attempts for critical updates
      });
      this.logger.debug(`Message status job added for message ${data.messageId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to add message status job: ${message}`, stack);
    }
  }

  /**
   * Schedule booking reminder
   */
  async scheduleBookingReminder(data: BookingReminderJobData, sendAt: Date): Promise<void> {
    try {
      const delay = sendAt.getTime() - Date.now();

      if (delay < 0) {
        this.logger.warn(
          `Booking reminder for ${data.bookingId} is in the past, sending immediately`,
        );
      }

      await this.bookingReminderQueue.add('send-reminder', data, {
        delay: Math.max(0, delay),
        priority: 7,
        attempts: 3,
        removeOnComplete: true,
      });

      this.logger.debug(
        `Booking reminder scheduled for ${data.bookingId} at ${sendAt.toISOString()}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to schedule booking reminder: ${message}`, stack);
    }
  }

  /**
   * Add email notification to queue
   */
  async addEmailJob(data: EmailNotificationJobData): Promise<void> {
    try {
      await this.emailQueue.add('send-email', data, {
        priority: data.priority || 5,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      });
      this.logger.debug(`Email job added for ${data.to}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to add email job: ${message}`, stack);
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(queueName: string): Promise<any> {
    try {
      let queue: Queue;
      switch (queueName) {
        case 'webhook':
          queue = this.webhookQueue;
          break;
        case 'message-status':
          queue = this.messageStatusQueue;
          break;
        case 'booking-reminder':
          queue = this.bookingReminderQueue;
          break;
        case 'email':
          queue = this.emailQueue;
          break;
        default:
          throw new Error(`Unknown queue: ${queueName}`);
      }

      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
      ]);

      return {
        queueName,
        waiting,
        active,
        completed,
        failed,
        delayed,
        total: waiting + active + completed + failed + delayed,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to get queue stats: ${message}`, stack);
      throw error;
    }
  }

  /**
   * Pause a queue
   */
  async pauseQueue(queueName: string): Promise<void> {
    const queue = this.getQueueByName(queueName);
    await queue.pause();
    this.logger.warn(`Queue ${queueName} paused`);
  }

  /**
   * Resume a queue
   */
  async resumeQueue(queueName: string): Promise<void> {
    const queue = this.getQueueByName(queueName);
    await queue.resume();
    this.logger.log(`Queue ${queueName} resumed`);
  }

  /**
   * Clean old jobs from queue
   */
  async cleanQueue(
    queueName: string,
    grace: number = 3600000,
    status: 'completed' | 'failed' = 'completed',
  ): Promise<string[]> {
    const queue = this.getQueueByName(queueName);
    const jobs = await queue.clean(grace, 1000, status);
    this.logger.log(`Cleaned ${jobs.length} ${status} jobs from ${queueName}`);
    return jobs;
  }

  private getQueueByName(queueName: string): Queue {
    switch (queueName) {
      case 'webhook':
        return this.webhookQueue;
      case 'message-status':
        return this.messageStatusQueue;
      case 'booking-reminder':
        return this.bookingReminderQueue;
      case 'email':
        return this.emailQueue;
      default:
        throw new Error(`Unknown queue: ${queueName}`);
    }
  }
}
