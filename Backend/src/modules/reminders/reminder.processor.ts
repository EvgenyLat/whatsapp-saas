import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { RemindersService } from './reminders.service';

/**
 * Job data interface for reminder processing
 */
interface ReminderJobData {
  bookingId: string;
  reminderId: string;
}

/**
 * Reminder Queue Processor
 * Processes scheduled reminder jobs from the BullMQ queue
 */
@Processor('reminder', {
  concurrency: 5, // Process up to 5 reminders simultaneously
})
export class ReminderProcessor extends WorkerHost {
  private readonly logger = new Logger(ReminderProcessor.name);

  constructor(private readonly remindersService: RemindersService) {
    super();
  }

  /**
   * Process a reminder job
   * Called by BullMQ when a scheduled reminder is ready to send
   *
   * @param job - The BullMQ job containing reminder data
   * @returns Job result with success status
   */
  async process(job: Job<ReminderJobData>): Promise<any> {
    const { bookingId, reminderId } = job.data;

    this.logger.log(
      `Processing reminder job ${job.id} for booking ${bookingId} (reminder: ${reminderId})`,
    );

    try {
      // Call the service method to send the reminder
      await this.remindersService.sendReminder(reminderId);

      this.logger.log(`Successfully processed reminder ${reminderId} for booking ${bookingId}`);

      return {
        success: true,
        reminderId,
        bookingId,
        processedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `Failed to process reminder ${reminderId} for booking ${bookingId}: ${error.message}`,
        error.stack,
      );

      // Re-throw to let BullMQ handle retries
      throw error;
    }
  }

  /**
   * Called when a job completes successfully
   */
  onCompleted(job: Job<ReminderJobData>, result: any) {
    this.logger.debug(`Job ${job.id} completed successfully: ${JSON.stringify(result)}`);
  }

  /**
   * Called when a job fails after all retries
   */
  onFailed(job: Job<ReminderJobData>, error: Error) {
    this.logger.error(
      `Job ${job.id} failed permanently after all retries: ${error.message}`,
      error.stack,
    );
  }

  /**
   * Called when a job is about to be retried
   */
  onActive(job: Job<ReminderJobData>) {
    this.logger.debug(`Job ${job.id} is now active (attempt ${job.attemptsMade + 1})`);
  }
}
