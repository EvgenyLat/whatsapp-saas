import { IsString, IsNotEmpty, IsDateString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiProperty({
    description: 'Salon ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  salon_id: string;

  @ApiProperty({
    description: 'Customer phone number',
    example: '+1234567890',
  })
  @IsString()
  @IsNotEmpty()
  customer_phone: string;

  @ApiProperty({
    description: 'Customer name',
    example: 'John Doe',
  })
  @IsString()
  @IsNotEmpty()
  customer_name: string;

  @ApiProperty({
    description: 'Service name/description',
    example: 'Haircut and styling',
  })
  @IsString()
  @IsNotEmpty()
  service: string;

  @ApiProperty({
    description: 'Booking start time (ISO 8601)',
    example: '2024-12-25T10:00:00.000Z',
  })
  @IsDateString()
  @IsNotEmpty()
  start_ts: string;

  @ApiPropertyOptional({
    description: 'Booking end time (ISO 8601). Auto-calculated from service duration if service_id is provided',
    example: '2024-12-25T11:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  end_ts?: string;

  @ApiPropertyOptional({
    description: 'Master ID (optional)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString()
  master_id?: string;

  @ApiPropertyOptional({
    description: 'Service ID (optional). If provided, end_ts will be auto-calculated from duration',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString()
  service_id?: string;

  @ApiPropertyOptional({
    description: 'Booking code (auto-generated if not provided)',
    example: 'BK-12345',
  })
  @IsOptional()
  @IsString()
  booking_code?: string;
}
