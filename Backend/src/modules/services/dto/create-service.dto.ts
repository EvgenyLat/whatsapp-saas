import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsEnum,
  IsNumber,
  Min,
  Max,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ServiceCategory } from '@prisma/client';

// Re-export Prisma enum for convenience
export { ServiceCategory };

export class CreateServiceDto {
  @ApiProperty({
    description: 'Salon ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  salon_id: string;

  @ApiProperty({
    description: 'Service name',
    example: 'Premium Haircut',
    minLength: 3,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'Name must be at least 3 characters long' })
  @MaxLength(100, { message: 'Name must not exceed 100 characters' })
  name: string;

  @ApiPropertyOptional({
    description: 'Service description',
    example: 'Professional haircut with styling and consultation',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Description must not exceed 1000 characters' })
  description?: string;

  @ApiProperty({
    description: 'Duration in minutes',
    example: 60,
    minimum: 15,
    maximum: 480,
  })
  @Type(() => Number)
  @IsInt()
  @Min(15, { message: 'Duration must be at least 15 minutes' })
  @Max(480, { message: 'Duration must not exceed 480 minutes (8 hours)' })
  duration_minutes: number;

  @ApiProperty({
    description: 'Price in decimal format',
    example: 50.0,
    minimum: 0,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Price must have at most 2 decimal places' })
  @Min(0, { message: 'Price must be greater than or equal to 0' })
  price: number;

  @ApiProperty({
    description: 'Service category',
    enum: ServiceCategory,
    example: ServiceCategory.HAIRCUT,
  })
  @IsEnum(ServiceCategory, { message: 'Invalid service category' })
  category: ServiceCategory;
}
