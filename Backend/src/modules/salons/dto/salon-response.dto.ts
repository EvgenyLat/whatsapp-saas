import { ApiProperty } from '@nestjs/swagger';
import { Salon } from '@prisma/client';

export class SalonResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'Elite Beauty Salon' })
  name: string;

  @ApiProperty({ example: '123 Main Street, New York, NY 10001', required: false })
  address?: string | null;

  @ApiProperty({ example: '102951292676262' })
  phone_number_id: string;

  @ApiProperty({ example: true })
  is_active: boolean;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  owner_id: string;

  @ApiProperty({ example: '09:00' })
  working_hours_start: string;

  @ApiProperty({ example: '20:00' })
  working_hours_end: string;

  @ApiProperty({ example: 30 })
  slot_duration_minutes: number;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  created_at: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updated_at: Date;

  constructor(salon: Salon) {
    this.id = salon.id;
    this.name = salon.name;
    this.address = salon.address;
    this.phone_number_id = salon.phone_number_id;
    this.is_active = salon.is_active;
    this.owner_id = salon.owner_id;
    this.working_hours_start = salon.working_hours_start;
    this.working_hours_end = salon.working_hours_end;
    this.slot_duration_minutes = salon.slot_duration_minutes;
    this.created_at = salon.created_at;
    this.updated_at = salon.updated_at;
    // Note: access_token is intentionally excluded from response for security
  }
}
