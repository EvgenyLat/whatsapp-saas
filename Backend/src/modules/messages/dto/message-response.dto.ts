import { ApiProperty } from '@nestjs/swagger';
import { Message } from '@prisma/client';

export class MessageResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  salon_id: string;

  @ApiProperty({ example: 'OUTBOUND' })
  direction: string;

  @ApiProperty({ example: 'conv-123', nullable: true })
  conversation_id: string | null;

  @ApiProperty({ example: '+1234567890' })
  phone_number: string;

  @ApiProperty({ example: 'TEXT' })
  message_type: string;

  @ApiProperty({ example: 'Hello, your booking is confirmed!' })
  content: string;

  @ApiProperty({ example: 'wamid.xyz...', nullable: true })
  whatsapp_id: string | null;

  @ApiProperty({ example: 'SENT' })
  status: string;

  @ApiProperty({ example: 0.005, nullable: true })
  cost: number | null;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  created_at: Date;

  constructor(message: Message) {
    this.id = message.id;
    this.salon_id = message.salon_id;
    this.direction = message.direction;
    this.conversation_id = message.conversation_id;
    this.phone_number = message.phone_number;
    this.message_type = message.message_type;
    this.content = message.content;
    this.whatsapp_id = message.whatsapp_id;
    this.status = message.status;
    this.cost = message.cost;
    this.created_at = message.created_at;
  }
}
