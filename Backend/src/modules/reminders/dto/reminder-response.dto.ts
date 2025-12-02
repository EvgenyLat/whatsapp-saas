import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsDate, IsEnum, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ReminderStatus, ReminderAction } from '../entities/reminder.entity';

/**
 * Reminder response DTO
 * Used for API responses
 */
export class ReminderResponseDto {
  @ApiProperty({ description: 'Unique reminder ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Associated booking ID' })
  @IsString()
  booking_id: string;

  @ApiProperty({ description: 'Salon ID' })
  @IsString()
  salon_id: string;

  @ApiProperty({ description: 'Scheduled reminder time' })
  @IsDate()
  @Type(() => Date)
  scheduled_at: Date;

  @ApiProperty({ description: 'Time when reminder was sent', required: false })
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  sent_at?: Date;

  @ApiProperty({
    description: 'Current status',
    enum: ReminderStatus,
  })
  @IsEnum(ReminderStatus)
  status: ReminderStatus;

  @ApiProperty({
    description: 'WhatsApp delivery status',
    required: false,
  })
  @IsString()
  @IsOptional()
  delivery_status?: string;

  @ApiProperty({
    description: 'Time when customer response was received',
    required: false,
  })
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  response_received_at?: Date;

  @ApiProperty({
    description: 'Customer response action',
    enum: ReminderAction,
    required: false,
  })
  @IsEnum(ReminderAction)
  @IsOptional()
  response_action?: ReminderAction;

  @ApiProperty({ description: 'Customer response text', required: false })
  @IsString()
  @IsOptional()
  response_text?: string;

  @ApiProperty({ description: 'Number of send attempts' })
  @IsNumber()
  attempts: number;

  @ApiProperty({ description: 'Last error message', required: false })
  @IsString()
  @IsOptional()
  last_error?: string;

  @ApiProperty({ description: 'WhatsApp message ID', required: false })
  @IsString()
  @IsOptional()
  whatsapp_message_id?: string;

  @ApiProperty({ description: 'BullMQ job ID', required: false })
  @IsString()
  @IsOptional()
  job_id?: string;

  @ApiProperty({ description: 'Creation timestamp' })
  @IsDate()
  @Type(() => Date)
  created_at: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @IsDate()
  @Type(() => Date)
  updated_at: Date;
}
