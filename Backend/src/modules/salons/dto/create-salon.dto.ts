import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateSalonDto {
  @ApiProperty({
    description: 'Name of the salon',
    example: 'Elite Beauty Salon',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Physical address of the salon',
    example: '123 Main Street, New York, NY 10001',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({
    description: 'WhatsApp Phone Number ID from Meta Business',
    example: '102951292676262',
  })
  @IsString()
  @IsNotEmpty()
  phone_number_id: string;

  @ApiProperty({
    description: 'WhatsApp Access Token from Meta Business',
    example: 'EAAx1234567890...',
  })
  @IsString()
  @IsNotEmpty()
  access_token: string;

  @ApiPropertyOptional({
    description: 'Whether the salon is active',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({
    description: 'Working hours start time (HH:MM format)',
    example: '09:00',
    default: '09:00',
  })
  @IsOptional()
  @IsString()
  working_hours_start?: string;

  @ApiPropertyOptional({
    description: 'Working hours end time (HH:MM format)',
    example: '20:00',
    default: '20:00',
  })
  @IsOptional()
  @IsString()
  working_hours_end?: string;

  @ApiPropertyOptional({
    description: 'Slot duration in minutes for bookings',
    example: 30,
    default: 30,
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
