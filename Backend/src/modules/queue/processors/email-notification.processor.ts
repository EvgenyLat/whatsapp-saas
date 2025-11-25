import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EmailNotificationJobData } from '../queue.service';

@Processor('notification:email', {
  concurrency: 5,
})
export class EmailNotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailNotificationProcessor.name);

  async process(job: Job<EmailNotificationJobData>): Promise<any> {
    const { to, subject, template, data, priority } = job.data;

    this.logger.debug(
      `Processing email notification to ${to} (Job ${job.id}, Priority: ${priority || 5})`,
    );

    try {
      await job.updateProgress(20);

      // Build email content from template
      const emailContent = this.buildEmailContent(template, data);

      await job.updateProgress(50);

      // Send email
      // Note: In production, integrate with SendGrid, AWS SES, or similar service
      // For now, we'll just log it
      this.logger.log(
        `Sending email to ${to} with subject: ${subject}`,
      );

      // Simulate email sending
      await this.simulateEmailSending(to, subject, emailContent);

      await job.updateProgress(100);

      this.logger.log(`Successfully sent email to ${to}`);

      return {
        success: true,
        to,
        subject,
        sentAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${to}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private buildEmailContent(template: string, data: Record<string, any>): string {
    let content = '';

    switch (template) {
      case 'booking_confirmation':
        content = this.buildBookingConfirmationEmail(data);
        break;
      case 'booking_cancelled':
        content = this.buildBookingCancelledEmail(data);
        break;
      case 'salon_welcome':
        content = this.buildSalonWelcomeEmail(data);
        break;
      case 'password_reset':
        content = this.buildPasswordResetEmail(data);
        break;
      default:
        content = JSON.stringify(data);
    }

    return content;
  }

  private buildBookingConfirmationEmail(data: Record<string, any>): string {
    return `
      <h2>Booking Confirmation</h2>
      <p>Dear ${data.customerName},</p>
      <p>Your booking has been confirmed:</p>
      <ul>
        <li>Service: ${data.serviceName}</li>
        <li>Date: ${data.serviceDate}</li>
        <li>Time: ${data.serviceTime}</li>
        <li>Location: ${data.salonName}</li>
      </ul>
      <p>We look forward to seeing you!</p>
    `;
  }

  private buildBookingCancelledEmail(data: Record<string, any>): string {
    return `
      <h2>Booking Cancelled</h2>
      <p>Dear ${data.customerName},</p>
      <p>Your booking has been cancelled:</p>
      <ul>
        <li>Service: ${data.serviceName}</li>
        <li>Date: ${data.serviceDate}</li>
      </ul>
      <p>If you'd like to reschedule, please contact us.</p>
    `;
  }

  private buildSalonWelcomeEmail(data: Record<string, any>): string {
    return `
      <h2>Welcome to ${data.salonName}!</h2>
      <p>Dear ${data.ownerName},</p>
      <p>Your salon has been successfully set up on our WhatsApp booking platform.</p>
      <p>Next steps:</p>
      <ul>
        <li>Configure your services and pricing</li>
        <li>Set up your availability</li>
        <li>Customize your WhatsApp templates</li>
      </ul>
      <p>Get started: <a href="${data.dashboardUrl}">Go to Dashboard</a></p>
    `;
  }

  private buildPasswordResetEmail(data: Record<string, any>): string {
    return `
      <h2>Password Reset Request</h2>
      <p>Dear ${data.userName},</p>
      <p>You requested to reset your password. Click the link below to proceed:</p>
      <p><a href="${data.resetUrl}">Reset Password</a></p>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `;
  }

  private async simulateEmailSending(
    to: string,
    subject: string,
    content: string,
  ): Promise<void> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // In production, replace with actual email service:
    // await this.emailService.send({
    //   to,
    //   subject,
    //   html: content,
    // });

    this.logger.debug(
      `Email simulated: ${to} - ${subject} (${content.length} chars)`,
    );
  }
}
