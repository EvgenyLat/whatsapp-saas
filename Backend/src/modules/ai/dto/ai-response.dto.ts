import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * AI Response DTO
 * Output after processing a message
 */
export class AIResponseDto {
  @ApiProperty({
    description: 'AI response text to send to customer',
    example:
      '✅ Записала вас на 25 октября в 15:00 к мастеру Аня. Услуга: Маникюр. Код брони: BK-ABC123',
  })
  response: string;

  @ApiProperty({
    description: 'Tokens used in this request',
    example: 450,
  })
  tokens_used: number;

  @ApiProperty({
    description: 'Cost of this request in USD',
    example: 0.0135,
  })
  cost: number;

  @ApiProperty({
    description: 'Response time in milliseconds',
    example: 1250,
  })
  response_time_ms: number;

  @ApiProperty({
    description: 'AI model used',
    example: 'gpt-4',
  })
  model: string;

  @ApiPropertyOptional({
    description: 'Booking code if booking was created',
    example: 'BK-ABC123',
  })
  booking_code?: string;

  @ApiPropertyOptional({
    description: 'Function calls made during processing',
    example: [
      {
        name: 'check_availability',
        arguments: { master_name: 'Аня', date_time: '2025-10-25T15:00:00Z' },
      },
    ],
  })
  function_calls?: Array<{
    name: string;
    arguments: any;
    result?: any;
  }>;

  constructor(partial: Partial<AIResponseDto>) {
    Object.assign(this, partial);
  }
}
