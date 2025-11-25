import { ApiProperty } from '@nestjs/swagger';

export class BookingSlot {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'BK-12345' })
  booking_code: string;

  @ApiProperty({ example: 'John Doe' })
  customer_name: string;

  @ApiProperty({ example: 'Haircut' })
  service: string;

  @ApiProperty({ example: '2024-12-25T10:00:00.000Z' })
  start_ts: Date;

  @ApiProperty({ example: '2024-12-25T11:00:00.000Z' })
  end_ts?: Date;

  @ApiProperty({ example: 'CONFIRMED' })
  status: string;
}

export class DaySchedule {
  @ApiProperty({ example: '2024-12-25' })
  date: string;

  @ApiProperty({ example: 'monday' })
  day_of_week: string;

  @ApiProperty({ example: true })
  is_working_day: boolean;

  @ApiProperty({ example: '09:00', required: false })
  work_start?: string;

  @ApiProperty({ example: '18:00', required: false })
  work_end?: string;

  @ApiProperty({
    type: [BookingSlot],
    example: [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        booking_code: 'BK-12345',
        customer_name: 'John Doe',
        service: 'Haircut',
        start_ts: '2024-12-25T10:00:00.000Z',
        end_ts: '2024-12-25T11:00:00.000Z',
        status: 'CONFIRMED',
      },
    ],
  })
  bookings: BookingSlot[];
}

export class MasterScheduleDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  master_id: string;

  @ApiProperty({ example: 'John Smith' })
  master_name: string;

  @ApiProperty({ example: '2024-12-23' })
  week_start: string;

  @ApiProperty({ example: '2024-12-29' })
  week_end: string;

  @ApiProperty({ type: [DaySchedule] })
  schedule: DaySchedule[];
}
