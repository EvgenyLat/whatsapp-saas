import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsArray,
  ArrayMinSize,
  IsObject,
  Matches,
  MinLength,
  MaxLength,
  ValidateNested,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// Working hours types
class TimeSlot {
  @ApiProperty({ example: '09:00' })
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Invalid time format. Use HH:MM' })
  start: string;

  @ApiProperty({ example: '14:00' })
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Invalid time format. Use HH:MM' })
  end: string;
}

class DaySchedule {
  @ApiProperty({ example: true })
  @IsBoolean()
  enabled: boolean;

  @ApiPropertyOptional({ example: '09:00' })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Invalid time format. Use HH:MM' })
  start?: string;

  @ApiPropertyOptional({ example: '18:00' })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Invalid time format. Use HH:MM' })
  end?: string;

  @ApiPropertyOptional({ type: [TimeSlot], example: [{ start: '13:00', end: '14:00' }] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeSlot)
  breaks?: TimeSlot[];
}

export class WorkingHours {
  @ApiProperty({ type: DaySchedule })
  @ValidateNested()
  @Type(() => DaySchedule)
  monday: DaySchedule;

  @ApiProperty({ type: DaySchedule })
  @ValidateNested()
  @Type(() => DaySchedule)
  tuesday: DaySchedule;

  @ApiProperty({ type: DaySchedule })
  @ValidateNested()
  @Type(() => DaySchedule)
  wednesday: DaySchedule;

  @ApiProperty({ type: DaySchedule })
  @ValidateNested()
  @Type(() => DaySchedule)
  thursday: DaySchedule;

  @ApiProperty({ type: DaySchedule })
  @ValidateNested()
  @Type(() => DaySchedule)
  friday: DaySchedule;

  @ApiProperty({ type: DaySchedule })
  @ValidateNested()
  @Type(() => DaySchedule)
  saturday: DaySchedule;

  @ApiProperty({ type: DaySchedule })
  @ValidateNested()
  @Type(() => DaySchedule)
  sunday: DaySchedule;
}

export class CreateMasterDto {
  @ApiProperty({
    description: 'Salon ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  salon_id: string;

  @ApiPropertyOptional({
    description: 'User ID (optional link to existing user)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString()
  user_id?: string;

  @ApiProperty({
    description: 'Master name',
    example: 'John Smith',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Name must not exceed 100 characters' })
  name: string;

  @ApiPropertyOptional({
    description: 'Phone number in E.164 format',
    example: '+1234567890',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, { message: 'Invalid phone number format. Use E.164 format' })
  phone?: string;

  @ApiPropertyOptional({
    description: 'Email address',
    example: 'master@example.com',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Invalid email format' })
  email?: string;

  @ApiProperty({
    description: 'Array of specializations',
    example: ['haircut', 'coloring', 'styling'],
    isArray: true,
    type: String,
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one specialization is required' })
  @IsString({ each: true })
  specialization: string[];

  @ApiProperty({
    description: 'Weekly working hours schedule',
    type: WorkingHours,
    example: {
      monday: { enabled: true, start: '09:00', end: '18:00', breaks: [{ start: '13:00', end: '14:00' }] },
      tuesday: { enabled: true, start: '09:00', end: '18:00', breaks: [] },
      wednesday: { enabled: true, start: '09:00', end: '18:00', breaks: [] },
      thursday: { enabled: true, start: '09:00', end: '18:00', breaks: [] },
      friday: { enabled: true, start: '09:00', end: '18:00', breaks: [] },
      saturday: { enabled: true, start: '10:00', end: '16:00', breaks: [] },
      sunday: { enabled: false },
    },
  })
  @IsObject()
  @ValidateNested()
  @Type(() => WorkingHours)
  working_hours: WorkingHours;
}
