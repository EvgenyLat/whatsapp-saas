import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class WebhookVerifyDto {
  @ApiProperty({
    description: 'Hub mode (should be "subscribe")',
    example: 'subscribe',
    name: 'hub.mode',
  })
  @IsString()
  @IsNotEmpty()
  'hub.mode': string;

  @ApiProperty({
    description: 'Verification token',
    example: 'my-verify-token',
    name: 'hub.verify_token',
  })
  @IsString()
  @IsNotEmpty()
  'hub.verify_token': string;

  @ApiProperty({
    description: 'Challenge string to echo back',
    example: 'challenge-string-1234567890',
    name: 'hub.challenge',
  })
  @IsString()
  @IsNotEmpty()
  'hub.challenge': string;
}
