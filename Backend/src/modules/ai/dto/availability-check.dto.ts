import { IsString, IsNotEmpty, IsDateString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Availability Check DTO
 * Input for checking if a time slot is available
 */
export class AvailabilityCheckDto {
  @ApiProperty({
    description: 'Salon ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  salon_id: string;

  @ApiProperty({
    description: 'Master name',
    example: 'Аня',
  })
  @IsString()
  @IsNotEmpty()
  master_name: string;

  @ApiProperty({
    description: 'Requested date and time (ISO 8601)',
    example: '2025-10-25T15:00:00.000Z',
  })
  @IsDateString()
  @IsNotEmpty()
  date_time: string;
}

/**
 * Availability Check Result DTO
 */
export class AvailabilityResultDto {
  @ApiProperty({
    description: 'Whether the requested time slot is available',
    example: true,
  })
  available: boolean;

  @ApiProperty({
    description: 'Requested time (ISO 8601)',
    example: '2025-10-25T15:00:00.000Z',
  })
  requested_time: string;

  @ApiProperty({
    description: 'Master name',
    example: 'Аня',
  })
  master_name: string;

  @ApiProperty({
    description: 'Alternative time slots if requested time is unavailable',
    example: ['2025-10-25T14:00:00.000Z', '2025-10-25T16:00:00.000Z', '2025-10-25T17:00:00.000Z'],
    required: false,
  })
  alternatives?: string[];

  @ApiProperty({
    description: 'Human-readable message',
    example: 'Время свободно',
  })
  message: string;

  constructor(partial: Partial<AvailabilityResultDto>) {
    Object.assign(this, partial);
  }
}
