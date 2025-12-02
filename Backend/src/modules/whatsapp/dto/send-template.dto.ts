import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  Matches,
  IsOptional,
  IsArray,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TemplateParameterDto {
  @ApiProperty({
    description: 'Parameter type',
    example: 'text',
    enum: ['text', 'currency', 'date_time', 'image', 'document', 'video'],
  })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({
    description: 'Parameter text value',
    example: 'John Doe',
    required: false,
  })
  @IsString()
  @IsOptional()
  text?: string;
}

export class SendTemplateDto {
  @ApiProperty({
    description: 'Salon ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  salon_id: string;

  @ApiProperty({
    description: 'Recipient phone number in international format',
    example: '+1234567890',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Phone number must be in international format (e.g., +1234567890)',
  })
  to: string;

  @ApiProperty({
    description: 'Template name',
    example: 'booking_confirmation',
  })
  @IsString()
  @IsNotEmpty()
  template_name: string;

  @ApiProperty({
    description: 'Language code',
    example: 'en',
    default: 'en',
  })
  @IsString()
  @IsNotEmpty()
  language_code: string = 'en';

  @ApiProperty({
    description: 'Template parameters',
    type: [TemplateParameterDto],
    required: false,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateParameterDto)
  @IsOptional()
  parameters?: TemplateParameterDto[];

  @ApiProperty({
    description: 'Conversation ID (optional)',
    example: '123e4567-e89b-12d3-a456-426614174001',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  conversation_id?: string;
}
