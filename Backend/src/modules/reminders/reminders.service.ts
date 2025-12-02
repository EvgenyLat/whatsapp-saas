import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '@database/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { ReminderResponseDto, ReminderStatsDto } from './dto';
import { ReminderAction } from './entities/reminder.entity';

/**
 * Reminders Service
 * Manages automated booking reminders via WhatsApp
 */
@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappService: WhatsAppService,
    @InjectQueue('reminder') private readonly reminderQueue: Queue,
  ) {}

  /**
   * Schedule a reminder for a booking
   * Creates a reminder record and queues it for delivery
   *
   * @param bookingId - The booking ID to schedule reminder for
   * @throws NotFoundException if booking not found
   */
  async scheduleReminder(bookingId: string): Promise<void> {
    this.logger.log(`Scheduling reminder for booking: ${bookingId}`);

    // Fetch booking with salon details
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { salon: true },
    });

    if (!booking) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }

    // Calculate reminder time (24 hours before appointment)
    const reminderTime = new Date(booking.start_ts);
    reminderTime.setHours(reminderTime.getHours() - 24);

    // Don't schedule if appointment is less than 24h away
    if (reminderTime <= new Date()) {
      this.logger.warn(`Booking ${bookingId} is too soon (${booking.start_ts}), skipping reminder`);
      return;
    }

    // Cancel existing reminder if any
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

    this.logger.debug(`Created reminder ${reminder.id} for booking ${bookingId}`);

    // Calculate delay in milliseconds
    const delay = reminderTime.getTime() - Date.now();

    // Add job to BullMQ queue
    const job = await this.reminderQueue.add(
      'send-reminder',
      {
        bookingId,
        reminderId: reminder.id,
      },
      {
        jobId: `reminder:${bookingId}`,
        delay: Math.max(0, delay), // Ensure non-negative delay
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 60000, // Start with 1 minute
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    // Update reminder with job ID
    await this.prisma.reminder.update({
      where: { id: reminder.id },
      data: { job_id: job.id },
    });

    this.logger.log(
      `Scheduled reminder ${reminder.id} for ${reminderTime.toISOString()} (job: ${job.id})`,
    );
  }

  /**
   * Cancel a scheduled reminder for a booking
   * Removes the reminder from queue and marks as cancelled
   *
   * @param bookingId - The booking ID to cancel reminder for
   * @throws NotFoundException if reminder not found
   */
  async cancelReminder(bookingId: string): Promise<void> {
    this.logger.log(`Cancelling reminder for booking: ${bookingId}`);

    // Find active reminder (PENDING or SENT status)
    const reminder = await this.prisma.reminder.findFirst({
      where: {
        booking_id: bookingId,
        status: {
          in: ['PENDING', 'SENT'],
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    if (!reminder) {
      this.logger.debug(`No active reminder found for booking ${bookingId}`);
      return; // Not an error - just no reminder to cancel
    }

    // Remove job from queue if exists
    if (reminder.job_id) {
      try {
        const job = await this.reminderQueue.getJob(reminder.job_id);
        if (job) {
          await job.remove();
          this.logger.debug(`Removed job ${reminder.job_id} from queue`);
        }
      } catch (error) {
        this.logger.warn(`Failed to remove job ${reminder.job_id}: ${error.message}`);
        // Continue with cancellation even if job removal fails
      }
    }

    // Update reminder status
    await this.prisma.reminder.update({
      where: { id: reminder.id },
      data: {
        status: 'CANCELLED',
        updated_at: new Date(),
      },
    });

    this.logger.log(`Cancelled reminder ${reminder.id} for booking ${bookingId}`);
  }

  /**
   * Send a reminder message via WhatsApp
   * Called by the queue processor when it's time to send
   *
   * @param reminderId - The reminder ID to send
   * @throws NotFoundException if reminder not found
   */
  async sendReminder(reminderId: string): Promise<void> {
    this.logger.log(`Sending reminder: ${reminderId}`);

    try {
      // Fetch reminder with booking and salon details
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
        throw new NotFoundException(`Reminder ${reminderId} not found`);
      }

      // Generate personalized message
      const message = this.generateReminderMessage(reminder.booking);

      // Send WhatsApp message
      const result = await this.whatsappService.sendTextMessage(reminder.booking.salon.owner_id, {
        salon_id: reminder.salon_id,
        to: reminder.booking.customer_phone,
        text: message,
      });

      // Update reminder as sent
      await this.prisma.reminder.update({
        where: { id: reminderId },
        data: {
          sent_at: new Date(),
          status: 'SENT',
          whatsapp_message_id: result?.messageId || null,
          attempts: reminder.attempts + 1,
        },
      });

      // Update booking
      await this.prisma.booking.update({
        where: { id: reminder.booking_id },
        data: {
          reminder_sent: true,
        },
      });

      this.logger.log(
        `Reminder ${reminderId} sent successfully to ${reminder.booking.customer_phone}`,
      );
    } catch (error) {
      this.logger.error(`Failed to send reminder ${reminderId}: ${error.message}`, error.stack);

      // Update reminder as failed
      await this.prisma.reminder.update({
        where: { id: reminderId },
        data: {
          status: 'FAILED',
          last_error: error.message,
          attempts: { increment: 1 },
        },
      });

      throw error; // Re-throw for BullMQ retry logic
    }
  }

  /**
   * Process customer response to a reminder
   * Parses response and updates booking status accordingly
   *
   * @param bookingId - The booking ID the response is for
   * @param responseText - The customer's response text
   * @throws NotFoundException if booking or reminder not found
   */
  async processResponse(bookingId: string, responseText: string): Promise<void> {
    this.logger.log(`Processing response for booking: ${bookingId}`);

    // Find reminder that was sent
    const reminder = await this.prisma.reminder.findFirst({
      where: {
        booking_id: bookingId,
        status: 'SENT',
      },
      include: {
        booking: {
          include: {
            salon: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    if (!reminder) {
      this.logger.warn(`No sent reminder found for booking ${bookingId}`);
      return;
    }

    // Parse customer response
    const action = this.parseResponse(responseText);

    // Update reminder with response details
    await this.prisma.reminder.update({
      where: { id: reminder.id },
      data: {
        response_received_at: new Date(),
        response_action: action,
        response_text: responseText,
      },
    });

    // Update booking with response
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        reminder_response: action,
        reminder_response_at: new Date(),
      },
    });

    const phone = reminder.booking.customer_phone;
    let confirmationMessage: string;

    // Handle based on action
    switch (action) {
      case ReminderAction.CONFIRM:
        // Update booking status to confirmed
        await this.prisma.booking.update({
          where: { id: bookingId },
          data: { status: 'CONFIRMED' },
        });
        confirmationMessage = '✅ Thank you! Your visit is confirmed. See you soon!';
        this.logger.log(`Booking ${bookingId} confirmed by customer`);
        break;

      case ReminderAction.CANCEL:
        // Update booking status to cancelled
        await this.prisma.booking.update({
          where: { id: bookingId },
          data: { status: 'CANCELLED' },
        });
        confirmationMessage =
          '❌ Your appointment has been cancelled. We hope to see you another time!';
        this.logger.log(`Booking ${bookingId} cancelled by customer`);
        break;

      case ReminderAction.RESCHEDULE:
        confirmationMessage =
          '📅 To reschedule your appointment, please call us or message us with your preferred time.';
        this.logger.log(`Booking ${bookingId} reschedule requested`);
        break;

      case ReminderAction.UNKNOWN:
      default:
        confirmationMessage =
          "Sorry, we didn't understand your response. Please reply:\n1 - Confirm\n2 - Cancel\n3 - Reschedule";
        this.logger.warn(`Unknown response for booking ${bookingId}: "${responseText}"`);
        break;
    }

    // Send confirmation to customer
    try {
      await this.whatsappService.sendTextMessage(reminder.booking.salon.owner_id, {
        salon_id: reminder.salon_id,
        to: phone,
        text: confirmationMessage,
      });
      this.logger.debug(`Sent confirmation message to ${phone}`);
    } catch (error) {
      this.logger.error(`Failed to send confirmation to ${phone}: ${error.message}`);
      // Don't throw - response was processed successfully
    }
  }

  /**
   * Get reminder statistics for a salon
   * Used for analytics dashboard
   *
   * @param salonId - The salon ID to get stats for
   * @returns ReminderStatsDto with aggregated statistics
   */
  async getStats(salonId: string): Promise<ReminderStatsDto> {
    this.logger.log(`Getting reminder stats for salon: ${salonId}`);

    // Get all reminders for salon
    const reminders = await this.prisma.reminder.findMany({
      where: { salon_id: salonId },
    });

    const total = reminders.length;
    const sent = reminders.filter((r) => r.status === 'SENT' || r.status === 'DELIVERED').length;
    const confirmed = reminders.filter((r) => r.response_action === 'CONFIRM').length;
    const cancelled = reminders.filter((r) => r.response_action === 'CANCEL').length;
    const failed = reminders.filter((r) => r.status === 'FAILED').length;

    // Calculate rates
    const delivery_rate = total > 0 ? ((sent / total) * 100).toFixed(1) : '0.0';
    const response_rate = sent > 0 ? (((confirmed + cancelled) / sent) * 100).toFixed(1) : '0.0';

    return {
      total,
      sent,
      confirmed,
      cancelled,
      failed,
      delivery_rate,
      response_rate,
    };
  }

  /**
   * Get all reminders for a specific booking
   * Returns full reminder history including retries
   *
   * @param bookingId - The booking ID to get reminders for
   * @returns Array of ReminderResponseDto
   */
  async getBookingReminders(bookingId: string): Promise<ReminderResponseDto[]> {
    this.logger.log(`Getting reminders for booking: ${bookingId}`);

    const reminders = await this.prisma.reminder.findMany({
      where: { booking_id: bookingId },
      orderBy: { created_at: 'desc' },
    });

    // Prisma types should match ReminderResponseDto
    return reminders as any as ReminderResponseDto[];
  }

  /**
   * Generate reminder message text for a booking
   * Creates personalized WhatsApp message with booking details
   *
   * @param booking - The booking object with customer and service details
   * @returns Formatted reminder message string
   * @private
   */
  private generateReminderMessage(booking: any): string {
    this.logger.debug(`Generating reminder message for booking: ${booking.id}`);

    // Format date and time in user-friendly English format
    const appointmentDate = new Date(booking.start_ts);
    const dateOptions: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    };
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
    };

    const formattedDate = appointmentDate.toLocaleDateString('en-US', dateOptions);
    const formattedTime = appointmentDate.toLocaleTimeString('en-US', timeOptions);

    // Build personalized message with emoji
    const message = `🔔 Appointment Reminder

Hello, ${booking.customer_name}!

This is a reminder about your appointment:
📅 ${formattedDate} at ${formattedTime}
💇 Service: ${booking.service}
📍 ${booking.salon?.name || 'Salon'}

Please confirm your visit:
1️⃣ Confirm
2️⃣ Cancel appointment
3️⃣ Reschedule

Reply with the number of your choice.`;

    this.logger.debug(`Generated message for ${booking.customer_name}`);
    return message;
  }

  /**
   * Parse customer response text to determine action
   * Uses keyword matching and NLP to identify intent
   *
   * @param text - The customer's response text
   * @returns ReminderAction enum value
   * @private
   */
  private parseResponse(text: string): ReminderAction {
    this.logger.debug(`Parsing response text: ${text}`);

    // Normalize text: lowercase, trim, remove extra whitespace
    const normalized = text.toLowerCase().trim().replace(/\s+/g, ' ');

    // Check for confirmation keywords (Russian and English)
    const confirmPattern = /^1$|подтверж|да|ок|ok|yes|приду|буду|confirm/i;
    if (confirmPattern.test(normalized)) {
      this.logger.debug(`Matched CONFIRM action`);
      return ReminderAction.CONFIRM;
    }

    // Check for cancellation keywords (Russian and English)
    const cancelPattern = /^2$|отмен|нет|no|cancel|не приду|не буду/i;
    if (cancelPattern.test(normalized)) {
      this.logger.debug(`Matched CANCEL action`);
      return ReminderAction.CANCEL;
    }

    // Check for reschedule keywords (Russian and English)
    const reschedulePattern = /^3$|перенес|reschedule|change|другое время|измен|позже|раньше/i;
    if (reschedulePattern.test(normalized)) {
      this.logger.debug(`Matched RESCHEDULE action`);
      return ReminderAction.RESCHEDULE;
    }

    // No match found
    this.logger.debug(`No pattern matched, returning UNKNOWN`);
    return ReminderAction.UNKNOWN;
  }
}
