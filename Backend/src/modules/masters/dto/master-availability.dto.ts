import { IsDateString, IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class MasterAvailabilityQueryDto {
  @ApiProperty({
    description: 'Date to check availability (YYYY-MM-DD)',
    example: '2024-12-25',
  })
  @IsDateString()
  date: string;

  @ApiProperty({
    description: 'Duration in minutes',
    example: 30,
    minimum: 15,
    maximum: 480,
  })
  @Type(() => Number)
  @IsInt()
  @Min(15, { message: 'Duration must be at least 15 minutes' })
  @Max(480, { message: 'Duration must not exceed 480 minutes' })
  duration_minutes: number;
}

export class MasterAvailabilityDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  master_id: string;

  @ApiProperty({ example: 'John Smith' })
  master_name: string;

  @ApiProperty({ example: '2024-12-25' })
  date: string;

  @ApiProperty({ example: 30 })
  duration_minutes: number;

  @ApiProperty({
    example: [
      '2024-12-25T09:00:00.000Z',
      '2024-12-25T09:15:00.000Z',
      '2024-12-25T09:30:00.000Z',
      '2024-12-25T09:45:00.000Z',
    ],
    description: 'Array of available time slots in ISO 8601 format',
  })
  available_slots: string[];
}
