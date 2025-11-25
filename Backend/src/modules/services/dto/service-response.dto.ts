import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceCategory } from './create-service.dto';

export class ServiceResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  salon_id: string;

  @ApiProperty({ example: 'Premium Haircut' })
  name: string;

  @ApiPropertyOptional({ example: 'Professional haircut with styling and consultation' })
  description?: string;

  @ApiProperty({ example: 60 })
  duration_minutes: number;

  @ApiProperty({ example: '50.00' })
  price: string;

  @ApiProperty({ enum: ServiceCategory, example: ServiceCategory.HAIRCUT })
  category: ServiceCategory;

  @ApiProperty({ example: true })
  is_active: boolean;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  created_at: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updated_at: Date;

  // Optional stats fields
  @ApiPropertyOptional({ example: 45 })
  total_bookings?: number;

  @ApiPropertyOptional({ example: '2250.00' })
  total_revenue?: string;

  constructor(partial: any) {
    Object.assign(this, partial);
    // Convert Decimal to string for JSON serialization
    if (partial.price && typeof partial.price !== 'string') {
      this.price = partial.price.toString();
    }
    // Convert null to undefined for optional fields (Prisma compatibility)
    if (partial.description === null) this.description = undefined;
  }
}
