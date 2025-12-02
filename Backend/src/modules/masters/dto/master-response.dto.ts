import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MasterResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  salon_id: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  user_id?: string;

  @ApiProperty({ example: 'John Smith' })
  name: string;

  @ApiPropertyOptional({ example: '+1234567890' })
  phone?: string;

  @ApiPropertyOptional({ example: 'master@example.com' })
  email?: string;

  @ApiProperty({ example: ['haircut', 'coloring'] })
  specialization: string[];

  @ApiProperty({
    example: {
      monday: {
        enabled: true,
        start: '09:00',
        end: '18:00',
        breaks: [{ start: '13:00', end: '14:00' }],
      },
      tuesday: { enabled: true, start: '09:00', end: '18:00', breaks: [] },
      wednesday: { enabled: true, start: '09:00', end: '18:00', breaks: [] },
      thursday: { enabled: true, start: '09:00', end: '18:00', breaks: [] },
      friday: { enabled: true, start: '09:00', end: '18:00', breaks: [] },
      saturday: { enabled: true, start: '10:00', end: '16:00', breaks: [] },
      sunday: { enabled: false },
    },
  })
  working_hours: Record<string, any>;

  @ApiProperty({ example: true })
  is_active: boolean;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  created_at: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updated_at: Date;

  // Optional stats fields
  @ApiPropertyOptional({ example: 5 })
  upcoming_bookings_count?: number;

  @ApiPropertyOptional({ example: 120 })
  total_completed_bookings?: number;

  @ApiPropertyOptional({ example: '12500.00' })
  total_revenue?: string;

  constructor(partial: any) {
    Object.assign(this, partial);
    // Convert null to undefined for optional fields (Prisma compatibility)
    if (partial.user_id === null) this.user_id = undefined;
    if (partial.phone === null) this.phone = undefined;
    if (partial.email === null) this.email = undefined;
  }
}
