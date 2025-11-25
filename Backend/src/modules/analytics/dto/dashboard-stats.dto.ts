import { ApiProperty } from '@nestjs/swagger';

class BookingsByStatusDto {
  @ApiProperty() PENDING: number;
  @ApiProperty() CONFIRMED: number;
  @ApiProperty() CANCELLED: number;
  @ApiProperty() COMPLETED: number;
  @ApiProperty() NO_SHOW: number;
}

class RecentActivityDto {
  @ApiProperty() bookings: number;
  @ApiProperty() messages: number;
  @ApiProperty() newCustomers: number;
}

class TrendsDto {
  @ApiProperty() bookingsChange: number;
  @ApiProperty() messagesChange: number;
  @ApiProperty() responseRateChange: number;
}

export class DashboardStatsDto {
  @ApiProperty() totalBookings: number;
  @ApiProperty() todayBookings: number;
  @ApiProperty() activeChats: number;
  @ApiProperty() responseRate: number;
  @ApiProperty({ type: BookingsByStatusDto }) bookingsByStatus: BookingsByStatusDto;
  @ApiProperty({ type: RecentActivityDto }) recentActivity: RecentActivityDto;
  @ApiProperty({ type: TrendsDto }) trends: TrendsDto;
}
