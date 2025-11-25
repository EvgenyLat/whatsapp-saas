import { IsString, IsNotEmpty, IsUUID, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Process Message DTO
 * Input for processing a WhatsApp message through AI
 */
export class ProcessMessageDto {
  @ApiProperty({
    description: 'Salon ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  salon_id: string;

  @ApiProperty({
    description: 'Customer phone number (E.164 format)',
    example: '+79001234567',
  })
  @IsString()
  @IsNotEmpty()
  phone_number: string;

  @ApiProperty({
    description: 'Message content from customer',
    example: 'Хочу к Ане на маникюр завтра в 3',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({
    description: 'Conversation ID (unique for this phone-salon pair)',
    example: 'conv_123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  conversation_id: string;

  @ApiPropertyOptional({
    description: 'Customer name if known',
    example: 'Анна Иванова',
  })
  @IsOptional()
  @IsString()
  customer_name?: string;
}
