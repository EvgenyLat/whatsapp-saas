import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Booking } from '@prisma/client';

export class BookingResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'BK-12345' })
  booking_code: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  salon_id: string;

  @ApiProperty({ example: '+1234567890' })
  customer_phone: string;

  @ApiProperty({ example: 'John Doe' })
  customer_name: string;

  @ApiProperty({ example: 'Haircut and styling' })
  service: string;

  @ApiProperty({ example: '2024-12-25T10:00:00.000Z' })
  start_ts: Date;

  @ApiPropertyOptional({ example: '2024-12-25T11:00:00.000Z' })
  end_ts?: Date;

  @ApiProperty({ example: 'CONFIRMED' })
  status: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  master_id?: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  service_id?: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  created_at: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updated_at: Date;

  // Optional relation data
  @ApiPropertyOptional({
    example: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'John Smith',
      specialization: ['haircut', 'coloring'],
    },
  })
  master?: {
    id: string;
    name: string;
    specialization: string[];
  };

  @ApiPropertyOptional({
    example: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Premium Haircut',
      duration_minutes: 60,
      price: '50.00',
      category: 'HAIRCUT',
    },
  })
  serviceRelation?: {
    id: string;
    name: string;
    duration_minutes: number;
    price: string;
    category: string;
  };

  constructor(booking: any) {
    this.id = booking.id;
    this.booking_code = booking.booking_code;
    this.salon_id = booking.salon_id;
    this.customer_phone = booking.customer_phone;
    this.customer_name = booking.customer_name;
    this.service = booking.service;
    this.start_ts = booking.start_ts;
    this.end_ts = booking.end_ts;
    this.status = booking.status;
    this.master_id = booking.master_id;
    this.service_id = booking.service_id;
    this.created_at = booking.created_at;
    this.updated_at = booking.updated_at;

    // Include master relation if present
    if (booking.master) {
      this.master = {
        id: booking.master.id,
        name: booking.master.name,
        specialization: booking.master.specialization,
      };
    }

    // Include service relation if present
    if (booking.serviceRelation) {
      this.serviceRelation = {
        id: booking.serviceRelation.id,
        name: booking.serviceRelation.name,
        duration_minutes: booking.serviceRelation.duration_minutes,
        price: booking.serviceRelation.price.toString(),
        category: booking.serviceRelation.category,
      };
    }
  }
}
