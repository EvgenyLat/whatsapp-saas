import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MessageStatus } from './message-filter.dto';

export class UpdateMessageStatusDto {
  @ApiProperty({ enum: MessageStatus, example: MessageStatus.DELIVERED })
  @IsEnum(MessageStatus)
  @IsNotEmpty()
  status: MessageStatus;
}
