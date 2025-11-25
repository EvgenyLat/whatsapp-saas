import { ApiProperty } from '@nestjs/swagger';

export class WhatsAppContactDto {
  @ApiProperty({
    description: 'Input phone number',
    example: '+1234567890',
  })
  input: string;

  @ApiProperty({
    description: 'WhatsApp ID',
    example: '1234567890',
  })
  wa_id: string;
}

export class WhatsAppMessageDto {
  @ApiProperty({
    description: 'WhatsApp message ID',
    example: 'wamid.HBgNMTIzNDU2Nzg5MAA=',
  })
  id: string;
}

export class WhatsAppResponseDto {
  @ApiProperty({
    description: 'Messaging product',
    example: 'whatsapp',
  })
  messaging_product: string;

  @ApiProperty({
    description: 'Contacts',
    type: [WhatsAppContactDto],
  })
  contacts: WhatsAppContactDto[];

  @ApiProperty({
    description: 'Messages',
    type: [WhatsAppMessageDto],
  })
  messages: WhatsAppMessageDto[];
}

export class SendMessageResponseDto {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'WhatsApp message ID',
    example: 'wamid.HBgNMTIzNDU2Nzg5MAA=',
  })
  whatsapp_id: string;

  @ApiProperty({
    description: 'Message ID in database',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  message_id: string;

  @ApiProperty({
    description: 'Message status',
    example: 'SENT',
  })
  status: string;
}
