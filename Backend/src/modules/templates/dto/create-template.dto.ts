import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TemplateStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export class CreateTemplateDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  @IsNotEmpty()
  salon_id: string;

  @ApiProperty({ example: 'booking_reminder' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'ru', default: 'ru' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiProperty({ example: 'MARKETING' })
  @IsString()
  @IsNotEmpty()
  category: string;
}
