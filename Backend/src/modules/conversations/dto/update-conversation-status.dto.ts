import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ConversationStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  BLOCKED = 'BLOCKED',
}

export class UpdateConversationStatusDto {
  @ApiProperty({ enum: ConversationStatus })
  @IsEnum(ConversationStatus)
  @IsNotEmpty()
  status: ConversationStatus;
}
