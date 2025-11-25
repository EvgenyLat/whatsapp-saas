import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Matches, IsOptional, IsUUID, IsObject, ValidateNested, IsEnum, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export enum InteractiveType {
  BUTTON = 'button',
  LIST = 'list',
}

export class InteractiveButtonDto {
  @ApiProperty({
    description: 'Button type',
    example: 'reply',
  })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({
    description: 'Button reply object',
    example: { id: 'button_1', title: 'Book Now' },
  })
  @IsObject()
  reply: {
    id: string;
    title: string;
  };
}

export class InteractiveActionDto {
  @ApiProperty({
    description: 'Buttons for reply button interactive message',
    example: [{ type: 'reply', reply: { id: 'button_1', title: 'Book Now' } }],
    required: false,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InteractiveButtonDto)
  @IsOptional()
  buttons?: InteractiveButtonDto[];

  @ApiProperty({
    description: 'Button text for list message',
    example: 'Select an option',
    required: false,
  })
  @IsString()
  @IsOptional()
  button?: string;

  @ApiProperty({
    description: 'Sections for list interactive message',
    example: [{ title: 'Available Slots', rows: [{ id: 'slot_1', title: '10:00 AM', description: 'Morning slot' }] }],
    required: false,
  })
  @IsArray()
  @IsOptional()
  sections?: Array<{
    title?: string;
    rows: Array<{
      id: string;
      title: string;
      description?: string;
    }>;
  }>;
}

export class InteractiveHeaderDto {
  @ApiProperty({
    description: 'Header type',
    example: 'text',
  })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({
    description: 'Header text',
    example: 'Choose your appointment',
    required: false,
  })
  @IsString()
  @IsOptional()
  text?: string;
}

export class InteractiveBodyDto {
  @ApiProperty({
    description: 'Body text',
    example: 'Please select a time slot for your appointment',
  })
  @IsString()
  @IsNotEmpty()
  text: string;
}

export class InteractiveFooterDto {
  @ApiProperty({
    description: 'Footer text',
    example: 'Powered by Salon Pro',
    required: false,
  })
  @IsString()
  @IsOptional()
  text?: string;
}

export class InteractivePayloadDto {
  @ApiProperty({
    description: 'Interactive message type',
    enum: InteractiveType,
    example: 'button',
  })
  @IsEnum(InteractiveType)
  @IsNotEmpty()
  type: InteractiveType;

  @ApiProperty({
    description: 'Header section',
    type: InteractiveHeaderDto,
    required: false,
  })
  @ValidateNested()
  @Type(() => InteractiveHeaderDto)
  @IsOptional()
  header?: InteractiveHeaderDto;

  @ApiProperty({
    description: 'Body section',
    type: InteractiveBodyDto,
  })
  @ValidateNested()
  @Type(() => InteractiveBodyDto)
  @IsNotEmpty()
  body: InteractiveBodyDto;

  @ApiProperty({
    description: 'Footer section',
    type: InteractiveFooterDto,
    required: false,
  })
  @ValidateNested()
  @Type(() => InteractiveFooterDto)
  @IsOptional()
  footer?: InteractiveFooterDto;

  @ApiProperty({
    description: 'Action section with buttons or list',
    type: InteractiveActionDto,
  })
  @ValidateNested()
  @Type(() => InteractiveActionDto)
  @IsNotEmpty()
  action: InteractiveActionDto;
}

export class SendInteractiveDto {
  @ApiProperty({
    description: 'Salon ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  salon_id: string;

  @ApiProperty({
    description: 'Recipient phone number in E.164 format',
    example: '+1234567890',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Phone number must be in E.164 format (e.g., +1234567890)',
  })
  to: string;

  @ApiProperty({
    description: 'Interactive message payload',
    type: InteractivePayloadDto,
  })
  @ValidateNested()
  @Type(() => InteractivePayloadDto)
  @IsNotEmpty()
  interactive: InteractivePayloadDto;

  @ApiProperty({
    description: 'Conversation ID (optional)',
    example: '123e4567-e89b-12d3-a456-426614174001',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  conversation_id?: string;
}
