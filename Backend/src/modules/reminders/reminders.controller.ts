import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { RemindersService } from './reminders.service';
import { ReminderResponseDto, ReminderStatsDto } from './dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';

/**
 * Reminders Controller
 * REST API endpoints for reminder management and analytics
 */
@ApiTags('reminders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reminders')
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  /**
   * Get reminder statistics for a salon
   * Provides aggregated analytics for dashboard display
   */
  @Get('stats')
  @ApiOperation({
    summary: 'Get reminder statistics for a salon',
    description:
      'Returns aggregated statistics including total reminders sent, delivery rate, response rate, confirmations, and cancellations',
  })
  @ApiQuery({
    name: 'salon_id',
    description: 'Salon ID to get statistics for',
    required: true,
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Statistics retrieved successfully',
    type: ReminderStatsDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - invalid or missing authentication token',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - user does not have access to this salon',
  })
  async getStats(
    @Query('salon_id') salonId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
  ): Promise<ReminderStatsDto> {
    // TODO: Add salon ownership verification
    // - Check if user owns the salon or is SUPER_ADMIN
    // - Throw UnauthorizedException if no access
    return this.remindersService.getStats(salonId);
  }

  /**
   * Get all reminders for a specific booking
   * Returns complete reminder history including retries and responses
   */
  @Get('booking/:bookingId')
  @ApiOperation({
    summary: 'Get all reminders for a booking',
    description:
      'Returns the complete reminder history for a booking, including all send attempts, delivery status, and customer responses',
  })
  @ApiParam({
    name: 'bookingId',
    description: 'Booking ID to get reminders for',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Reminders retrieved successfully',
    type: [ReminderResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Booking not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - invalid or missing authentication token',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - user does not have access to this booking',
  })
  async getBookingReminders(
    @Param('bookingId') bookingId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
  ): Promise<ReminderResponseDto[]> {
    // TODO: Add booking ownership verification
    // - Fetch booking and verify user owns the salon or is SUPER_ADMIN
    // - Throw NotFoundException if booking not found
    // - Throw UnauthorizedException if no access
    return this.remindersService.getBookingReminders(bookingId);
  }
}
