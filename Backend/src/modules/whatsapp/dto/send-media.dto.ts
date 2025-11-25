import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Matches, IsOptional, IsUrl, IsUUID, IsIn } from 'class-validator';

export class SendMediaDto {
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
    description: 'Media type',
    example: 'image',
    enum: ['image', 'document', 'audio', 'video'],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['image', 'document', 'audio', 'video'])
  media_type: string;

  @ApiProperty({
    description: 'Media URL or ID',
    example: 'https://example.com/image.jpg',
  })
  @IsString()
  @IsNotEmpty()
  media_url_or_id: string;

  @ApiProperty({
    description: 'Media caption (optional)',
    example: 'Here is your booking confirmation',
    required: false,
  })
  @IsString()
  @IsOptional()
  caption?: string;

  @ApiProperty({
    description: 'Filename (for documents)',
    example: 'booking_confirmation.pdf',
    required: false,
  })
  @IsString()
  @IsOptional()
  filename?: string;

  @ApiProperty({
    description: 'Conversation ID (optional)',
    example: '123e4567-e89b-12d3-a456-426614174001',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  conversation_id?: string;
}
