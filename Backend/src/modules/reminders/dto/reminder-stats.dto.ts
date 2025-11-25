import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

/**
 * Reminder statistics DTO
 * Used for analytics/dashboard
 */
export class ReminderStatsDto {
  @ApiProperty({ description: 'Total reminders created' })
  @IsNumber()
  total: number;

  @ApiProperty({ description: 'Reminders successfully sent' })
  @IsNumber()
  sent: number;

  @ApiProperty({ description: 'Confirmed appointments' })
  @IsNumber()
  confirmed: number;

  @ApiProperty({ description: 'Cancelled appointments' })
  @IsNumber()
  cancelled: number;

  @ApiProperty({ description: 'Failed deliveries' })
  @IsNumber()
  failed: number;

  @ApiProperty({ description: 'Delivery rate as percentage string (e.g., "95.5")' })
  @IsString()
  delivery_rate: string;

  @ApiProperty({
    description: 'Response rate as percentage string (e.g., "72.0")',
  })
  @IsString()
  response_rate: string;
}
