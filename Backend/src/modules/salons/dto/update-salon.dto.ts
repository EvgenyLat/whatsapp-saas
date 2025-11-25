import { IsString, IsOptional, IsBoolean, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateSalonDto {
  @ApiPropertyOptional({
    description: 'Name of the salon',
    example: 'Elite Beauty Salon',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Physical address of the salon',
    example: '123 Main Street, New York, NY 10001',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    description: 'WhatsApp Phone Number ID from Meta Business',
    example: '102951292676262',
  })
  @IsOptional()
  @IsString()
  phone_number_id?: string;

  @ApiPropertyOptional({
    description: 'WhatsApp Access Token from Meta Business',
    example: 'EAAx1234567890...',
  })
  @IsOptional()
  @IsString()
  access_token?: string;

  @ApiPropertyOptional({
    description: 'Whether the salon is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({
    description: 'Working hours start time (HH:MM format)',
    example: '09:00',
  })
  @IsOptional()
  @IsString()
  working_hours_start?: string;

  @ApiPropertyOptional({
    description: 'Working hours end time (HH:MM format)',
    example: '20:00',
  })
  @IsOptional()
  @IsString()
  working_hours_end?: string;

  @ApiPropertyOptional({
    description: 'Slot duration in minutes for bookings',
    example: 30,
    minimum: 5,
    maximum: 240,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(240)
  slot_duration_minutes?: number;
}
