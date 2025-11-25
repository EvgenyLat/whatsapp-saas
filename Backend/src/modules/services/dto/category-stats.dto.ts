import { ApiProperty } from '@nestjs/swagger';
import { ServiceCategory } from './create-service.dto';

export class CategoryStatsDto {
  @ApiProperty({ enum: ServiceCategory, example: ServiceCategory.HAIRCUT })
  category: ServiceCategory;

  @ApiProperty({ example: 5 })
  total_services: number;

  @ApiProperty({ example: 120 })
  total_bookings: number;

  @ApiProperty({ example: '6000.00' })
  total_revenue: string;

  @ApiProperty({ example: '50.00' })
  average_price: string;
}

export class CategoryStatsResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  salon_id: string;

  @ApiProperty({ type: [CategoryStatsDto] })
  categories: CategoryStatsDto[];

  @ApiProperty({ example: 25 })
  total_services: number;

  @ApiProperty({ example: 500 })
  total_bookings: number;

  @ApiProperty({ example: '25000.00' })
  total_revenue: string;
}
