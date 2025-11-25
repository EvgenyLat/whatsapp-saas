/**
 * Queue Usage Examples
 *
 * This file demonstrates how to use the BullMQ queue system
 * in your application services and controllers.
 */

import { Injectable } from '@nestjs/common';
import { QueueService } from '../modules/queue/queue.service';

@Injectable()
export class QueueExamplesService {
  constructor(private readonly queueService: QueueService) {}

  /**
   * Example 1: Process WhatsApp Webhook Asynchronously
   *
   * Use this in your WhatsApp webhook controller to avoid timeouts
   */
  async handleWebhook(salonId: string, webhookPayload: any) {
    // Add webhook to queue for async processing
    await this.queueService.addWebhookJob(
      {
        salonId,
        payload: webhookPayload,
        receivedAt: new Date().toISOString(),
      },
      5, // normal priority
    );

    // Return immediately to WhatsApp
    return { success: true };
  }

  /**
   * Example 2: Update Message Status
   *
   * Call this when receiving message delivery receipts
   */
  async updateMessageStatus(messageId: string, status: string) {
    await this.queueService.addMessageStatusJob({
      messageId,
      status,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Example 3: Schedule Booking Reminders
   *
   * Call this when a new booking is created
   */
  async scheduleBookingReminders(booking: any) {
    const bookingDate = new Date(booking.service_date);

    // Schedule day-before reminder
    const dayBeforeDate = new Date(bookingDate);
    dayBeforeDate.setHours(10, 0, 0, 0); // 10 AM day before
    dayBeforeDate.setDate(dayBeforeDate.getDate() - 1);

    if (dayBeforeDate > new Date()) {
      await this.queueService.scheduleBookingReminder(
        {
          bookingId: booking.id,
          salonId: booking.salon_id,
          customerPhone: booking.customer_phone,
          serviceDate: booking.service_date,
          serviceName: booking.service_name,
          reminderType: 'day_before',
        },
        dayBeforeDate,
      );
    }

    // Schedule 1-hour-before reminder
    const hourBeforeDate = new Date(bookingDate);
    hourBeforeDate.setHours(hourBeforeDate.getHours() - 1);

    if (hourBeforeDate > new Date()) {
      await this.queueService.scheduleBookingReminder(
        {
          bookingId: booking.id,
          salonId: booking.salon_id,
          customerPhone: booking.customer_phone,
          serviceDate: booking.service_date,
          serviceName: booking.service_name,
          reminderType: 'hour_before',
        },
        hourBeforeDate,
      );
    }
  }

  /**
   * Example 4: Send Welcome Email
   *
   * Call this when a new salon is created
   */
  async sendWelcomeEmail(salon: any, owner: any) {
    await this.queueService.addEmailJob({
      to: owner.email,
      subject: `Welcome to ${salon.name}!`,
      template: 'salon_welcome',
      data: {
        salonName: salon.name,
        ownerName: owner.name,
        dashboardUrl: `${process.env.FRONTEND_URL}/dashboard`,
      },
      priority: 7, // high priority for welcome emails
    });
  }

  /**
   * Example 5: Send Booking Confirmation Email
   *
   * Call this after a booking is confirmed
   */
  async sendBookingConfirmation(booking: any) {
    await this.queueService.addEmailJob({
      to: booking.customer_email,
      subject: 'Booking Confirmation',
      template: 'booking_confirmation',
      data: {
        customerName: booking.customer_name,
        serviceName: booking.service_name,
        serviceDate: new Date(booking.service_date).toLocaleDateString(),
        serviceTime: new Date(booking.service_date).toLocaleTimeString(),
        salonName: booking.salon.name,
      },
      priority: 7,
    });
  }

  /**
   * Example 6: Batch Processing Multiple Jobs
   *
   * Use this when you need to process multiple items
   */
  async sendBulkNotifications(customers: any[], message: string) {
    const promises = customers.map((customer) =>
      this.queueService.addEmailJob({
        to: customer.email,
        subject: 'Important Notification',
        template: 'generic',
        data: {
          customerName: customer.name,
          message,
        },
        priority: 5,
      }),
    );

    await Promise.all(promises);

    return { sent: customers.length };
  }

  /**
   * Example 7: Priority Queue Usage
   *
   * Use different priorities based on urgency
   */
  async processUrgentWebhook(salonId: string, payload: any) {
    await this.queueService.addWebhookJob(
      {
        salonId,
        payload,
        receivedAt: new Date().toISOString(),
      },
      10, // highest priority - processes first
    );
  }

  /**
   * Example 8: Get Queue Statistics
   *
   * Monitor queue health
   */
  async getQueueHealth() {
    const [webhook, messageStatus, booking, email] = await Promise.all([
      this.queueService.getQueueStats('webhook'),
      this.queueService.getQueueStats('message-status'),
      this.queueService.getQueueStats('booking-reminder'),
      this.queueService.getQueueStats('email'),
    ]);

    return {
      webhook,
      messageStatus,
      booking,
      email,
      overall: {
        totalWaiting: webhook.waiting + messageStatus.waiting + booking.waiting + email.waiting,
        totalActive: webhook.active + messageStatus.active + booking.active + email.active,
        totalFailed: webhook.failed + messageStatus.failed + booking.failed + email.failed,
      },
    };
  }

  /**
   * Example 9: Pause Queue for Maintenance
   *
   * Temporarily stop processing jobs
   */
  async performMaintenance() {
    // Pause all queues
    await Promise.all([
      this.queueService.pauseQueue('webhook'),
      this.queueService.pauseQueue('message-status'),
      this.queueService.pauseQueue('booking-reminder'),
      this.queueService.pauseQueue('email'),
    ]);

    // Perform maintenance...

    // Resume queues
    await Promise.all([
      this.queueService.resumeQueue('webhook'),
      this.queueService.resumeQueue('message-status'),
      this.queueService.resumeQueue('booking-reminder'),
      this.queueService.resumeQueue('email'),
    ]);
  }

  /**
   * Example 10: Clean Old Jobs
   *
   * Remove completed jobs older than 24 hours
   */
  async cleanupOldJobs() {
    const oneDayMs = 24 * 60 * 60 * 1000;

    await Promise.all([
      this.queueService.cleanQueue('webhook', oneDayMs, 'completed'),
      this.queueService.cleanQueue('message-status', oneDayMs, 'completed'),
      this.queueService.cleanQueue('booking-reminder', oneDayMs, 'completed'),
      this.queueService.cleanQueue('email', oneDayMs, 'completed'),
    ]);
  }
}

/**
 * Integration Example: WhatsApp Webhook Controller
 */
@Injectable()
export class WhatsAppWebhookIntegration {
  constructor(private readonly queueService: QueueService) {}

  async handleIncomingWebhook(body: any, salonId: string) {
    // Validate webhook signature first...

    // Add to queue for async processing (prevents timeout)
    await this.queueService.addWebhookJob(
      {
        salonId,
        payload: body,
        receivedAt: new Date().toISOString(),
      },
      5,
    );

    // Return 200 immediately to WhatsApp
    return { status: 'queued' };
  }
}

/**
 * Integration Example: Bookings Service
 */
@Injectable()
export class BookingsServiceIntegration {
  constructor(private readonly queueService: QueueService) {}

  async createBooking(bookingData: any) {
    // Create booking in database...
    const booking = { id: 'booking-123', ...bookingData };

    // Schedule reminders
    const bookingDate = new Date(booking.service_date);

    // Day before reminder at 10 AM
    const dayBefore = new Date(bookingDate);
    dayBefore.setDate(dayBefore.getDate() - 1);
    dayBefore.setHours(10, 0, 0, 0);

    if (dayBefore > new Date()) {
      await this.queueService.scheduleBookingReminder(
        {
          bookingId: booking.id,
          salonId: booking.salon_id,
          customerPhone: booking.customer_phone,
          serviceDate: booking.service_date,
          serviceName: booking.service_name,
          reminderType: 'day_before',
        },
        dayBefore,
      );
    }

    // Send confirmation email
    await this.queueService.addEmailJob({
      to: booking.customer_email,
      subject: 'Booking Confirmed',
      template: 'booking_confirmation',
      data: {
        customerName: booking.customer_name,
        serviceName: booking.service_name,
        serviceDate: bookingDate.toLocaleDateString(),
      },
      priority: 7,
    });

    return booking;
  }
}
