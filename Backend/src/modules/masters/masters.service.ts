import {
  Injectable,
  NotFoundException,
  BadRequestException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { SalonsService } from '../salons/salons.service';
import { MastersRepository } from './masters.repository';
import {
  CreateMasterDto,
  UpdateMasterDto,
  MasterResponseDto,
  MasterFilterDto,
  MasterScheduleDto,
  DaySchedule,
  BookingSlot,
  MasterAvailabilityDto,
} from './dto';
import { PaginatedResult } from '@common/dto/pagination.dto';

interface WorkingHours {
  [key: string]: {
    enabled: boolean;
    start?: string;
    end?: string;
    breaks?: Array<{ start: string; end: string }>;
  };
}

@Injectable()
export class MastersService {
  constructor(
    private readonly mastersRepository: MastersRepository,
    @Inject(forwardRef(() => SalonsService))
    private readonly salonsService: SalonsService,
  ) {}

  async create(userId: string, createMasterDto: CreateMasterDto): Promise<MasterResponseDto> {
    // Verify user owns the salon
    await this.salonsService.verifySalonOwnership(createMasterDto.salon_id, userId);

    // Validate working hours has at least one enabled day
    this.validateWorkingHours(createMasterDto.working_hours);

    // Create master
    const master = await this.mastersRepository.create({
      salon: {
        connect: { id: createMasterDto.salon_id },
      },
      user: createMasterDto.user_id ? { connect: { id: createMasterDto.user_id } } : undefined,
      name: createMasterDto.name,
      phone: createMasterDto.phone,
      email: createMasterDto.email,
      specialization: createMasterDto.specialization,
      working_hours: createMasterDto.working_hours as any,
    });

    return new MasterResponseDto(master);
  }

  async findAll(
    userId: string,
    userRole: string,
    filters: MasterFilterDto,
  ): Promise<PaginatedResult<MasterResponseDto>> {
    let salonIds: string | string[];

    // Get user's salons
    if (userRole !== 'SUPER_ADMIN') {
      const userSalons = await this.salonsService.findAll(userId, userRole);
      salonIds = userSalons.map((s) => s.id);

      if (salonIds.length === 0) {
        return {
          data: [],
          meta: {
            total: 0,
            page: filters.page || 1,
            limit: filters.limit || 10,
            totalPages: 0,
          },
        };
      }
    } else {
      // Super admin can see all masters
      salonIds = [];
    }

    const result = await this.mastersRepository.findPaginatedWithFilters(
      salonIds,
      {
        search: filters.search,
        is_active: filters.is_active,
        specialization: filters.specialization,
      },
      filters.page || 1,
      filters.limit || 10,
    );

    return {
      data: result.data.map((m) => new MasterResponseDto(m)),
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    };
  }

  async findOne(id: string, userId: string, userRole: string): Promise<MasterResponseDto> {
    const master = await this.mastersRepository.findByIdWithStats(id);

    if (!master) {
      throw new NotFoundException('Master not found');
    }

    // Verify user has access to this master's salon
    if (userRole !== 'SUPER_ADMIN') {
      await this.salonsService.verifySalonOwnership(master.salon_id, userId);
    }

    return new MasterResponseDto(master);
  }

  async update(
    id: string,
    userId: string,
    userRole: string,
    updateMasterDto: UpdateMasterDto,
  ): Promise<MasterResponseDto> {
    // Verify master exists and user has access
    const existingMaster = await this.findOne(id, userId, userRole);

    // Validate working hours if provided
    if (updateMasterDto.working_hours) {
      this.validateWorkingHours(updateMasterDto.working_hours);
    }

    // Update master
    const updated = await this.mastersRepository.update(id, {
      ...(updateMasterDto.user_id !== undefined && {
        user: updateMasterDto.user_id
          ? { connect: { id: updateMasterDto.user_id } }
          : { disconnect: true },
      }),
      ...(updateMasterDto.name && { name: updateMasterDto.name }),
      ...(updateMasterDto.phone !== undefined && { phone: updateMasterDto.phone }),
      ...(updateMasterDto.email !== undefined && { email: updateMasterDto.email }),
      ...(updateMasterDto.specialization && { specialization: updateMasterDto.specialization }),
      ...(updateMasterDto.working_hours && { working_hours: updateMasterDto.working_hours as any }),
    });

    return new MasterResponseDto(updated);
  }

  async remove(id: string, userId: string, userRole: string): Promise<{ message: string }> {
    // Verify master exists and user has access
    await this.findOne(id, userId, userRole);

    // Soft delete
    await this.mastersRepository.softDelete(id);

    return { message: 'Master deactivated successfully' };
  }

  async getSchedule(
    id: string,
    userId: string,
    userRole: string,
    weekStart: string,
  ): Promise<MasterScheduleDto> {
    // Verify master exists and user has access
    const master = await this.findOne(id, userId, userRole);

    // Parse week start date
    const startDate = new Date(weekStart);
    if (isNaN(startDate.getTime())) {
      throw new BadRequestException('Invalid week_start date format. Use YYYY-MM-DD');
    }

    // Calculate week end (7 days from start)
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);

    // Get all bookings for the week
    const bookings = await this.mastersRepository.getBookingsForDateRange(id, startDate, endDate);

    // Build schedule for each day
    const workingHours = master.working_hours as WorkingHours;
    const schedule: DaySchedule[] = [];

    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + i);

      const dayOfWeek = this.getDayOfWeek(currentDate);
      const daySchedule = workingHours[dayOfWeek];

      const dayBookings = bookings.filter((b) => {
        const bookingDate = new Date(b.start_ts);
        return (
          bookingDate.getFullYear() === currentDate.getFullYear() &&
          bookingDate.getMonth() === currentDate.getMonth() &&
          bookingDate.getDate() === currentDate.getDate()
        );
      });

      schedule.push({
        date: this.formatDate(currentDate),
        day_of_week: dayOfWeek,
        is_working_day: daySchedule?.enabled || false,
        work_start: daySchedule?.start,
        work_end: daySchedule?.end,
        bookings: dayBookings.map((b) => ({
          id: b.id,
          booking_code: b.booking_code,
          customer_name: b.customer_name,
          service: b.service,
          start_ts: b.start_ts,
          end_ts: b.end_ts || undefined,
          status: b.status,
        })),
      });
    }

    return {
      master_id: master.id,
      master_name: master.name,
      week_start: this.formatDate(startDate),
      week_end: this.formatDate(endDate),
      schedule,
    };
  }

  async getAvailability(
    id: string,
    userId: string,
    userRole: string,
    date: string,
    durationMinutes: number,
  ): Promise<MasterAvailabilityDto> {
    // Verify master exists and user has access
    const master = await this.findOne(id, userId, userRole);

    // Parse date
    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
      throw new BadRequestException('Invalid date format. Use YYYY-MM-DD');
    }

    // Get day of week and working hours
    const dayOfWeek = this.getDayOfWeek(targetDate);
    const workingHours = master.working_hours as WorkingHours;
    const daySchedule = workingHours[dayOfWeek];

    // Check if master works on this day
    if (!daySchedule?.enabled || !daySchedule.start || !daySchedule.end) {
      return {
        master_id: master.id,
        master_name: master.name,
        date,
        duration_minutes: durationMinutes,
        available_slots: [],
      };
    }

    // Get all bookings for this date
    const bookings = await this.mastersRepository.getBookingsForDate(id, targetDate);

    // Generate available slots
    const availableSlots = this.calculateAvailableSlots(
      targetDate,
      daySchedule.start,
      daySchedule.end,
      daySchedule.breaks || [],
      bookings,
      durationMinutes,
    );

    return {
      master_id: master.id,
      master_name: master.name,
      date,
      duration_minutes: durationMinutes,
      available_slots: availableSlots,
    };
  }

  private validateWorkingHours(workingHours: any): void {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    let hasEnabledDay = false;

    for (const day of days) {
      if (workingHours[day]?.enabled) {
        hasEnabledDay = true;
        break;
      }
    }

    if (!hasEnabledDay) {
      throw new BadRequestException('At least one working day must be enabled');
    }
  }

  private getDayOfWeek(date: Date): string {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[date.getDay()];
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private calculateAvailableSlots(
    date: Date,
    workStart: string,
    workEnd: string,
    breaks: Array<{ start: string; end: string }>,
    bookings: Array<{ start_ts: Date; end_ts: Date | null }>,
    durationMinutes: number,
  ): string[] {
    const availableSlots: string[] = [];
    const slotInterval = 15; // 15-minute intervals

    // Parse work hours
    const [startHour, startMinute] = workStart.split(':').map(Number);
    const [endHour, endMinute] = workEnd.split(':').map(Number);

    // Create start and end times for the day
    const dayStart = new Date(date);
    dayStart.setHours(startHour, startMinute, 0, 0);

    const dayEnd = new Date(date);
    dayEnd.setHours(endHour, endMinute, 0, 0);

    // Generate all possible time slots
    let currentSlot = new Date(dayStart);

    while (currentSlot < dayEnd) {
      const slotEnd = new Date(currentSlot);
      slotEnd.setMinutes(slotEnd.getMinutes() + durationMinutes);

      // Check if slot end exceeds work hours
      if (slotEnd > dayEnd) {
        break;
      }

      // Check if slot overlaps with break time
      const isDuringBreak = breaks.some((breakTime) => {
        const [breakStartHour, breakStartMinute] = breakTime.start.split(':').map(Number);
        const [breakEndHour, breakEndMinute] = breakTime.end.split(':').map(Number);

        const breakStart = new Date(date);
        breakStart.setHours(breakStartHour, breakStartMinute, 0, 0);

        const breakEnd = new Date(date);
        breakEnd.setHours(breakEndHour, breakEndMinute, 0, 0);

        // Check if slot overlaps with break
        return currentSlot < breakEnd && slotEnd > breakStart;
      });

      if (isDuringBreak) {
        currentSlot.setMinutes(currentSlot.getMinutes() + slotInterval);
        continue;
      }

      // Check if slot overlaps with existing bookings
      const hasConflict = bookings.some((booking) => {
        const bookingStart = new Date(booking.start_ts);
        const bookingEnd = booking.end_ts
          ? new Date(booking.end_ts)
          : new Date(bookingStart.getTime() + 60 * 60 * 1000); // Default 1 hour if no end_ts

        // Check if slot overlaps with booking
        return currentSlot < bookingEnd && slotEnd > bookingStart;
      });

      if (!hasConflict) {
        availableSlots.push(currentSlot.toISOString());
      }

      currentSlot.setMinutes(currentSlot.getMinutes() + slotInterval);
    }

    return availableSlots;
  }
}
