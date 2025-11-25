import { ApiProperty } from '@nestjs/swagger';
import { Conversation } from '@prisma/client';

export class ConversationResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() salon_id: string;
  @ApiProperty() phone_number: string;
  @ApiProperty() status: string;
  @ApiProperty() started_at: Date;
  @ApiProperty() last_message_at: Date;
  @ApiProperty() message_count: number;
  @ApiProperty() cost: number;

  constructor(conversation: Conversation) {
    this.id = conversation.id;
    this.salon_id = conversation.salon_id;
    this.phone_number = conversation.phone_number;
    this.status = conversation.status;
    this.started_at = conversation.started_at;
    this.last_message_at = conversation.last_message_at;
    this.message_count = conversation.message_count;
    this.cost = conversation.cost;
  }
}
