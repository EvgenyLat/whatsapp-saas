import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { SalonsService } from '../salons/salons.service';
import { UsageTrackingService } from '../salons/services/usage-tracking.service';
import { RemindersService } from '../reminders/reminders.service';
import {
  CreateBookingDto,
  UpdateBookingDto,
  UpdateBookingStatusDto,
  BookingFilterDto,
  BookingResponseDto,
  BookingStatus,
} from './dto';
import { PaginatedResult } from '@common/dto/pagination.dto';
import { BookingsRepository } from './bookings.repository';

@Injectable()
export class BookingsService {
  constructor(
    private readonly bookingsRepository: BookingsRepository,
    @Inject(forwardRef(() => SalonsService))
    private readonly salonsService: SalonsService,
    private readonly usageTracking: UsageTrackingService,
    @Inject(forwardRef(() => RemindersService))
    private readonly remindersService: RemindersService,
  ) {}

  /**
   * Generate unique booking code
   */
  private generateBookingCode(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 7);
    return `BK-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Create a new booking
   */
  async create(
    userId: string,
    createBookingDto: CreateBookingDto,
  ): Promise<BookingResponseDto> {
    // Verify user owns the salon
    await this.salonsService.verifySalonOwnership(createBookingDto.salon_id, userId);

    // 🔒 USAGE LIMIT CHECK - Check if salon has reached booking limit
    const usageCheck = await this.usageTracking.checkBookingLimit(createBookingDto.salon_id);

    if (!usageCheck.allowed) {
      throw new BadRequestException(
        usageCheck.message || 'Достигнут лимит бронирований. Счетчики обнулятся в начале следующего месяца.',
      );
    }

    // Generate booking code if not provided
    const bookingCode = createBookingDto.booking_code || this.generateBookingCode();

    // Ensure booking code is unique for this salon
    const existingBooking = await this.bookingsRepository.findByBookingCodeAndSalonId(
      bookingCode,
      createBookingDto.salon_id,
    );

    if (existingBooking) {
      throw new BadRequestException('Booking code already exists for this salon');
    }

    // Calculate end_ts if service_id is provided and end_ts is not
    let endTs: Date | undefined;
    if (createBookingDto.service_id && !createBookingDto.end_ts) {
      // Fetch service to get duration
      const service = await this.bookingsRepository.findServiceById(createBookingDto.service_id);
      if (service) {
        const startTime = new Date(createBookingDto.start_ts);
        endTs = new Date(startTime.getTime() + service.duration_minutes * 60000);
      }
    } else if (createBookingDto.end_ts) {
      endTs = new Date(createBookingDto.end_ts);
    }

    // Create booking
    const booking = await this.bookingsRepository.create({
      booking_code: bookingCode,
      salon_id: createBookingDto.salon_id,
      customer_phone: createBookingDto.customer_phone,
      customer_name: createBookingDto.customer_name,
      service: createBookingDto.service,
      start_ts: new Date(createBookingDto.start_ts),
      end_ts: endTs,
      master_id: createBookingDto.master_id,
      service_id: createBookingDto.service_id,
      status: BookingStatus.CONFIRMED,
    });

    // 📊 Increment booking usage counter
    await this.usageTracking.incrementBookingUsage(createBookingDto.salon_id);

    // 🔔 Schedule reminder for the booking
    try {
      await this.remindersService.scheduleReminder(booking.id);
    } catch (error) {
      // Log error but don't fail booking creation
      console.error(`Failed to schedule reminder for booking ${booking.id}:`, error);
    }

    return new BookingResponseDto(booking);
  }

  /**
   * Get all bookings with filters and pagination
   */
  async findAll(
    userId: string,
    userRole: string,
    filters: BookingFilterDto,
  ): Promise<PaginatedResult<BookingResponseDto>> {
    let salonId: string | string[] | null = null;

    // If salon_id is provided, verify ownership
    if (filters.salon_id) {
      if (userRole !== 'SUPER_ADMIN') {
        await this.salonsService.verifySalonOwnership(filters.salon_id, userId);
      }
      salonId = filters.salon_id;
    } else if (userRole !== 'SUPER_ADMIN') {
      // Non-admin users can only see bookings from their salons
      const userSalons = await this.salonsService.findAll(userId, userRole);
      salonId = userSalons.map((s) => s.id);
    }

    // Build filter object
    const bookingFilters = {
      status: filters.status,
      customer_phone: filters.customer_phone,
      start_date: filters.start_date,
      end_date: filters.end_date,
      master_id: filters.master_id,
      service_id: filters.service_id,
    };

    // Get paginated bookings
    const result = await this.bookingsRepository.findPaginatedWithFilters(
      salonId,
      bookingFilters,
      filters.page || 1,
      filters.limit || 10,
    );

    return {
      data: result.data.map((b) => new BookingResponseDto(b)),
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    };
  }

  /**
   * Get a single booking by ID
   */
  async findOne(id: string, userId: string, userRole: string): Promise<BookingResponseDto> {
    const booking = await this.bookingsRepository.findById(id);

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Verify user has access to this booking's salon
    if (userRole !== 'SUPER_ADMIN') {
      await this.salonsService.verifySalonOwnership(booking.salon_id, userId);
    }

    return new BookingResponseDto(booking);
  }

  /**
   * Update booking by ID
   */
  async update(
    id: string,
    userId: string,
    userRole: string,
    updateBookingDto: UpdateBookingDto,
  ): Promise<BookingResponseDto> {
    // Verify booking exists and user has access
    await this.findOne(id, userId, userRole);

    // Calculate end_ts if service_id is changed
    let endTs: Date | undefined;
    if (updateBookingDto.service_id && !updateBookingDto.end_ts) {
      const service = await this.bookingsRepository.findServiceById(updateBookingDto.service_id);
      if (service) {
        const startTime = updateBookingDto.start_ts
          ? new Date(updateBookingDto.start_ts)
          : new Date((await this.bookingsRepository.findById(id))!.start_ts);
        endTs = new Date(startTime.getTime() + service.duration_minutes * 60000);
      }
    } else if (updateBookingDto.end_ts) {
      endTs = new Date(updateBookingDto.end_ts);
    }

    // Update booking
    const updatedBooking = await this.bookingsRepository.update(id, {
      ...(updateBookingDto.customer_phone && { customer_phone: updateBookingDto.customer_phone }),
      ...(updateBookingDto.customer_name && { customer_name: updateBookingDto.customer_name }),
      ...(updateBookingDto.service && { service: updateBookingDto.service }),
      ...(updateBookingDto.start_ts && { start_ts: new Date(updateBookingDto.start_ts) }),
      ...(endTs && { end_ts: endTs }),
      ...(updateBookingDto.master_id !== undefined && { master_id: updateBookingDto.master_id }),
      ...(updateBookingDto.service_id !== undefined && { service_id: updateBookingDto.service_id }),
    });

    // 🔔 Reschedule reminder if start time changed
    if (updateBookingDto.start_ts) {
      try {
        await this.remindersService.scheduleReminder(id);
      } catch (error) {
        // Log error but don't fail booking update
        console.error(`Failed to reschedule reminder for booking ${id}:`, error);
      }
    }

    return new BookingResponseDto(updatedBooking);
  }

  /**
   * Update booking status
   */
  async updateStatus(
    id: string,
    userId: string,
    userRole: string,
    updateStatusDto: UpdateBookingStatusDto,
  ): Promise<BookingResponseDto> {
    // Verify booking exists and user has access
    const booking = await this.findOne(id, userId, userRole);

    // Validate status transitions
    this.validateStatusTransition(booking.status, updateStatusDto.status);

    // Update booking status
    const updatedBooking = await this.bookingsRepository.updateStatus(id, updateStatusDto.status);

    return new BookingResponseDto(updatedBooking);
  }

  /**
   * Cancel booking (soft delete)
   */
  async cancel(id: string, userId: string, userRole: string): Promise<{ deleted: boolean; id: string }> {
    // Verify booking exists and user has access
    await this.findOne(id, userId, userRole);

    // Update status to CANCELLED
    await this.bookingsRepository.updateStatus(id, BookingStatus.CANCELLED);

    // 🔔 Cancel any pending reminders
    try {
      await this.remindersService.cancelReminder(id);
    } catch (error) {
      // Log error but don't fail booking cancellation
      console.error(`Failed to cancel reminder for booking ${id}:`, error);
    }

    return { deleted: true, id };
  }

  /**
   * Validate status transitions
   */
  private validateStatusTransition(currentStatus: string, newStatus: string): void {
    const validTransitions: Record<string, string[]> = {
      CONFIRMED: [BookingStatus.IN_PROGRESS, BookingStatus.CANCELLED, BookingStatus.NO_SHOW],
      IN_PROGRESS: [BookingStatus.COMPLETED, BookingStatus.CANCELLED],
      COMPLETED: [], // Cannot transition from completed
      CANCELLED: [], // Cannot transition from cancelled
      NO_SHOW: [], // Cannot transition from no-show
    };

    const allowedTransitions = validTransitions[currentStatus] || [];

    if (!allowedTransitions.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
      );
    }
  }
}
