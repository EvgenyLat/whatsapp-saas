import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

/**
 * Process customer response DTO
 * Used when processing customer replies to reminders
 */
export class ProcessResponseDto {
  @ApiProperty({ description: 'Booking ID' })
  @IsString()
  booking_id: string;

  @ApiProperty({ description: 'Customer response text' })
  @IsString()
  response_text: string;
}
