import { IsString, IsNotEmpty, IsDateString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Booking Extraction DTO
 * Data extracted from AI for creating a booking
 */
export class BookingExtractionDto {
  @ApiProperty({
    description: 'Salon ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  salon_id: string;

  @ApiProperty({
    description: 'Customer name',
    example: 'Анна Иванова',
  })
  @IsString()
  @IsNotEmpty()
  customer_name: string;

  @ApiProperty({
    description: 'Customer phone number',
    example: '+79001234567',
  })
  @IsString()
  @IsNotEmpty()
  customer_phone: string;

  @ApiPropertyOptional({
    description: 'Master name (optional, can be auto-assigned)',
    example: 'Аня',
  })
  @IsOptional()
  @IsString()
  master_name?: string;

  @ApiProperty({
    description: 'Service name',
    example: 'Маникюр',
  })
  @IsString()
  @IsNotEmpty()
  service: string;

  @ApiProperty({
    description: 'Booking date and time (ISO 8601)',
    example: '2025-10-25T15:00:00.000Z',
  })
  @IsDateString()
  @IsNotEmpty()
  date_time: string;
}
