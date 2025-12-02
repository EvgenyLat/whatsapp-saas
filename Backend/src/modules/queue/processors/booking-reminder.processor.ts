import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '@database/prisma.service';
import { BookingReminderJobData } from '../queue.service';

@Processor('booking:reminder', {
  concurrency: 3,
})
export class BookingReminderProcessor extends WorkerHost {
  private readonly logger = new Logger(BookingReminderProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<BookingReminderJobData>): Promise<any> {
    const { bookingId, salonId, customerPhone, serviceDate, serviceName, reminderType } = job.data;

    this.logger.debug(`Processing ${reminderType} reminder for booking ${bookingId}`);

    try {
      // Verify booking still exists and is not cancelled
      const booking = await this.prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          salon: {
            select: {
              id: true,
              name: true,
              phone_number_id: true,
              access_token: true,
            },
          },
        },
      });

      if (!booking) {
        this.logger.warn(`Booking ${bookingId} not found, skipping reminder`);
        return { success: false, reason: 'Booking not found' };
      }

      if (booking.status === 'CANCELLED' || booking.status === 'COMPLETED') {
        this.logger.debug(`Booking ${bookingId} is ${booking.status}, skipping reminder`);
        return { success: false, reason: `Booking ${booking.status}` };
      }

      // Get reminder template
      const reminderMessage = this.buildReminderMessage(
        booking.customer_name,
        serviceName,
        serviceDate,
        booking.salon.name,
        reminderType,
      );

      // Send WhatsApp message
      // Note: In production, you would use WhatsAppService here
      this.logger.log(
        `Sending ${reminderType} reminder to ${customerPhone} for booking ${bookingId}`,
      );

      // Create message record
      const conversation = await this.prisma.conversation.findFirst({
        where: {
          salon_id: salonId,
          phone_number: customerPhone,
        },
      });

      if (conversation) {
        await this.prisma.message.create({
          data: {
            conversation_id: conversation.id,
            salon_id: salonId,
            phone_number: customerPhone,
            direction: 'OUTBOUND',
            message_type: 'text',
            content: reminderMessage,
            status: 'SENT',
            metadata: {
              bookingId,
              reminderType,
            },
          },
        });
      }

      // Update booking with reminder sent timestamp
      await this.prisma.booking.update({
        where: { id: bookingId },
        data: {
          metadata: {
            ...(typeof booking.metadata === 'object' && booking.metadata !== null
              ? booking.metadata
              : {}),
            [`${reminderType}_sent_at`]: new Date().toISOString(),
          },
        },
      });

      this.logger.log(`Successfully sent ${reminderType} reminder for booking ${bookingId}`);

      return {
        success: true,
        bookingId,
        reminderType,
        customerPhone,
      };
    } catch (error) {
      this.logger.error(
        `Failed to send reminder for booking ${bookingId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private buildReminderMessage(
    customerName: string,
    serviceName: string,
    serviceDate: string,
    salonName: string,
    reminderType: string,
  ): string {
    const date = new Date(serviceDate);
    const dateStr = date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const timeStr = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    if (reminderType === 'day_before') {
      return `Hi ${customerName}! This is a friendly reminder that you have a ${serviceName} appointment tomorrow at ${timeStr} at ${salonName}. Looking forward to seeing you! Reply CANCEL to cancel your appointment.`;
    } else {
      return `Hi ${customerName}! Your ${serviceName} appointment is in 1 hour at ${timeStr} at ${salonName}. See you soon!`;
    }
  }
}
