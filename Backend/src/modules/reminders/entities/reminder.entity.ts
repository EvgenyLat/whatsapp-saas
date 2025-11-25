import { ApiProperty } from '@nestjs/swagger';
import { Reminder as PrismaReminder } from '@prisma/client';

/**
 * Reminder status enum
 */
export enum ReminderStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

/**
 * Reminder action enum - customer response type
 */
export enum ReminderAction {
  CONFIRM = 'CONFIRM',
  CANCEL = 'CANCEL',
  RESCHEDULE = 'RESCHEDULE',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Reminder entity class
 * Matches Prisma Reminder model
 */
export class Reminder implements PrismaReminder {
  @ApiProperty({ description: 'Unique reminder ID' })
  id: string;

  @ApiProperty({ description: 'Associated booking ID' })
  booking_id: string;

  @ApiProperty({ description: 'Salon ID' })
  salon_id: string;

  @ApiProperty({ description: 'Scheduled reminder time' })
  scheduled_at: Date;

  @ApiProperty({ description: 'Time when reminder was sent', nullable: true })
  sent_at: Date | null;

  @ApiProperty({
    description: 'Current status',
    enum: ReminderStatus,
  })
  status: string;

  @ApiProperty({ description: 'WhatsApp delivery status', nullable: true })
  delivery_status: string | null;

  @ApiProperty({
    description: 'Time when customer response was received',
    nullable: true,
  })
  response_received_at: Date | null;

  @ApiProperty({
    description: 'Customer response action',
    enum: ReminderAction,
    nullable: true,
  })
  response_action: string | null;

  @ApiProperty({ description: 'Customer response text', nullable: true })
  response_text: string | null;

  @ApiProperty({ description: 'Number of send attempts', default: 0 })
  attempts: number;

  @ApiProperty({ description: 'Last error message', nullable: true })
  last_error: string | null;

  @ApiProperty({ description: 'WhatsApp message ID', nullable: true })
  whatsapp_message_id: string | null;

  @ApiProperty({ description: 'BullMQ job ID', nullable: true })
  job_id: string | null;

  @ApiProperty({ description: 'Creation timestamp' })
  created_at: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updated_at: Date;
}
