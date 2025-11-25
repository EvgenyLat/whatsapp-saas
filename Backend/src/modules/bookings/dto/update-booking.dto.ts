import { IsString, IsOptional, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateBookingDto {
  @ApiPropertyOptional({
    description: 'Customer phone number',
    example: '+1234567890',
  })
  @IsOptional()
  @IsString()
  customer_phone?: string;

  @ApiPropertyOptional({
    description: 'Customer name',
    example: 'John Doe',
  })
  @IsOptional()
  @IsString()
  customer_name?: string;

  @ApiPropertyOptional({
    description: 'Service name/description',
    example: 'Haircut and styling',
  })
  @IsOptional()
  @IsString()
  service?: string;

  @ApiPropertyOptional({
    description: 'Booking start time (ISO 8601)',
    example: '2024-12-25T10:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  start_ts?: string;

  @ApiPropertyOptional({
    description: 'Booking end time (ISO 8601)',
    example: '2024-12-25T11:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  end_ts?: string;

  @ApiPropertyOptional({
    description: 'Master ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString()
  master_id?: string;

  @ApiPropertyOptional({
    description: 'Service ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString()
  service_id?: string;
}
