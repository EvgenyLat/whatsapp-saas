import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import {
  SlotSearchParams,
  SlotSuggestion,
  SlotSearchResult,
} from '../types/booking-intent.types';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * SlotFinderService
 *
 * Efficiently finds available booking slots by querying the database for:
 * - Available masters with the requested service
 * - Master working hours
 * - Existing bookings to avoid conflicts
 *
 * Performance targets:
 * - < 100ms for 7-day search
 * - Batch queries to avoid N+1 problems
 * - Single query for all bookings in date range
 *
 * Algorithm:
 * 1. Find relevant masters (by service and salon)
 * 2. Get all bookings for those masters in date range (single query)
 * 3. Generate time slots from working hours
 * 4. Exclude conflicting slots
 * 5. Rank and return top slots
 */
@Injectable()
export class SlotFinderService {
  private readonly logger = new Logger(SlotFinderService.name);

  // Default slot interval in minutes
  private readonly SLOT_INTERVAL_MINUTES = 30;

  // Day names mapping
  private readonly DAY_NAMES = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ];

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find available booking slots
   *
   * @param params - Slot search parameters
   * @returns Available slots ranked by preference
   *
   * @example
   * ```typescript
   * const result = await slotFinder.findAvailableSlots({
   *   salonId: 'salon-123',
   *   serviceId: 'service-456',
   *   preferredDate: '2025-10-26',
   *   preferredTime: '14:00',
   *   maxDaysAhead: 7,
   *   limit: 10
   * });
   * ```
   */
  async findAvailableSlots(
    params: SlotSearchParams,
  ): Promise<SlotSearchResult> {
    const startTime = Date.now();

    const {
      salonId,
      serviceId,
      masterId,
      preferredDate,
      preferredTime,
      maxDaysAhead = 7,
      limit = 10,
    } = params;

    try {
      // Step 1: Get salon details (working hours and slot duration)
      const salon = await this.prisma.salon.findUnique({
        where: { id: salonId },
        select: {
          id: true,
          working_hours_start: true,
          working_hours_end: true,
          slot_duration_minutes: true,
        },
      });

      if (!salon) {
        this.logger.warn(`Salon not found: ${salonId}`);
        return this.emptyResult();
      }

      // Use salon slot duration or default to 30 minutes
      const slotInterval = salon.slot_duration_minutes || this.SLOT_INTERVAL_MINUTES;

      // Step 2: Get service details
      const service = await this.prisma.service.findUnique({
        where: { id: serviceId },
        select: {
          id: true,
          name: true,
          duration_minutes: true,
          price: true,
          category: true,
        },
      });

      if (!service) {
        this.logger.warn(`Service not found: ${serviceId}`);
        return this.emptyResult();
      }

      // Step 2: Find relevant masters
      const masters = await this.findRelevantMasters(
        salonId,
        serviceId,
        masterId,
      );

      if (masters.length === 0) {
        this.logger.warn(
          `No masters found for service ${serviceId} in salon ${salonId}`,
        );
        return this.emptyResult();
      }

      const masterIds = masters.map((m) => m.id);

      // Step 3: Calculate date range
      const startDate = preferredDate
        ? new Date(preferredDate)
        : new Date();
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + maxDaysAhead);

      // Step 4: Batch query all bookings for all masters in date range
      const bookings = await this.prisma.booking.findMany({
        where: {
          master_id: { in: masterIds },
          start_ts: {
            gte: startDate,
            lt: endDate,
          },
          status: {
            in: ['CONFIRMED', 'PENDING', 'IN_PROGRESS'],
          },
        },
        select: {
          id: true,
          master_id: true,
          start_ts: true,
          end_ts: true,
        },
        orderBy: {
          start_ts: 'asc',
        },
      });

      // Step 5: Generate slots for each master and day
      const allSlots: SlotSuggestion[] = [];

      for (const master of masters) {
        const masterBookings = bookings.filter(
          (b) => b.master_id === master.id,
        );

        const slots = this.generateSlotsForMaster(
          master,
          service,
          masterBookings,
          startDate,
          maxDaysAhead,
          salon,
          slotInterval,
        );

        allSlots.push(...slots);
      }

      // Step 6: Rank and sort slots
      const rankedSlots = this.rankSlots(
        allSlots,
        masterId,
        preferredDate,
        preferredTime,
      );

      // Step 7: Apply limit
      const limitedSlots = rankedSlots.slice(0, limit);

      const elapsed = Date.now() - startTime;
      this.logger.log(
        `Found ${rankedSlots.length} slots in ${elapsed}ms (searched ${maxDaysAhead} days, ${masters.length} masters)`,
      );

      return {
        slots: limitedSlots,
        totalFound: rankedSlots.length,
        searchedDays: maxDaysAhead,
        hasMore: rankedSlots.length > limit,
      };
    } catch (error) {
      this.logger.error('Error finding slots', error);
      throw error;
    }
  }

  /**
   * Find masters that can perform the service
   *
   * @param salonId - Salon ID
   * @param serviceId - Service ID
   * @param preferredMasterId - Optional preferred master
   * @returns List of qualified masters
   */
  private async findRelevantMasters(
    salonId: string,
    serviceId: string,
    preferredMasterId?: string,
  ): Promise<any[]> {
    // If specific master requested, try to find them first
    if (preferredMasterId) {
      const master = await this.prisma.master.findFirst({
        where: {
          id: preferredMasterId,
          salon_id: salonId,
          is_active: true,
        },
        select: {
          id: true,
          name: true,
          specialization: true,
          working_hours: true,
        },
      });

      if (master) {
        return [master];
      }
    }

    // Get service category for matching
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      select: { category: true },
    });

    if (!service) {
      return [];
    }

    // Find all masters with this service category in their specialization
    const masters = await this.prisma.master.findMany({
      where: {
        salon_id: salonId,
        is_active: true,
        specialization: {
          has: service.category,
        },
      },
      select: {
        id: true,
        name: true,
        specialization: true,
        working_hours: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return masters;
  }

  /**
   * Generate available slots for a single master
   *
   * @param master - Master data
   * @param service - Service data
   * @param bookings - Existing bookings for this master
   * @param startDate - Start date for search
   * @param daysAhead - Number of days to search
   * @param salon - Salon data with working hours
   * @param slotInterval - Slot interval in minutes
   * @returns Available slots
   */
  private generateSlotsForMaster(
    master: any,
    service: any,
    bookings: any[],
    startDate: Date,
    daysAhead: number,
    salon: any,
    slotInterval: number,
  ): SlotSuggestion[] {
    const slots: SlotSuggestion[] = [];
    const workingHours = master.working_hours as Record<string, any>;

    // Generate slots for each day
    for (let dayOffset = 0; dayOffset < daysAhead; dayOffset++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + dayOffset);

      // Skip past dates
      if (currentDate < new Date()) {
        currentDate.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (currentDate < today) {
          continue;
        }
      }

      const dayName = this.DAY_NAMES[currentDate.getDay()];
      const daySchedule = workingHours[dayName];

      if (!daySchedule || !daySchedule.start || !daySchedule.end) {
        // Master doesn't work on this day
        continue;
      }

      const daySlots = this.generateDaySlots(
        master,
        service,
        currentDate,
        daySchedule,
        bookings,
        salon,
        slotInterval,
      );

      slots.push(...daySlots);
    }

    return slots;
  }

  /**
   * Generate slots for a single day
   *
   * @param master - Master data
   * @param service - Service data
   * @param date - Date to generate slots for
   * @param schedule - Working hours for this day
   * @param bookings - All bookings for this master
   * @param salon - Salon data with working hours
   * @param slotInterval - Slot interval in minutes
   * @returns Available slots for the day
   */
  private generateDaySlots(
    master: any,
    service: any,
    date: Date,
    schedule: { start: string; end: string },
    bookings: any[],
    salon: any,
    slotInterval: number,
  ): SlotSuggestion[] {
    const slots: SlotSuggestion[] = [];

    // Parse master's working hours
    const [masterStartHour, masterStartMinute] = schedule.start.split(':').map(Number);
    const [masterEndHour, masterEndMinute] = schedule.end.split(':').map(Number);

    // Parse salon's working hours (if available)
    let salonStartHour = 0;
    let salonStartMinute = 0;
    let salonEndHour = 23;
    let salonEndMinute = 59;

    if (salon.working_hours_start) {
      [salonStartHour, salonStartMinute] = salon.working_hours_start.split(':').map(Number);
    }
    if (salon.working_hours_end) {
      [salonEndHour, salonEndMinute] = salon.working_hours_end.split(':').map(Number);
    }

    // Use the more restrictive hours (later start, earlier end)
    const startHour = Math.max(masterStartHour, salonStartHour);
    const startMinute = masterStartHour === salonStartHour
      ? Math.max(masterStartMinute, salonStartMinute)
      : (masterStartHour > salonStartHour ? masterStartMinute : salonStartMinute);

    const endHour = Math.min(masterEndHour, salonEndHour);
    const endMinute = masterEndHour === salonEndHour
      ? Math.min(masterEndMinute, salonEndMinute)
      : (masterEndHour < salonEndHour ? masterEndMinute : salonEndMinute);

    // Create start and end timestamps for the day
    const workStart = new Date(date);
    workStart.setHours(startHour, startMinute, 0, 0);

    const workEnd = new Date(date);
    workEnd.setHours(endHour, endMinute, 0, 0);

    // If searching today, start from current time
    const now = new Date();
    let currentSlot = new Date(workStart);
    if (this.isSameDay(date, now) && now > workStart) {
      // Round up to next slot interval
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const nextSlotMinutes =
        Math.ceil(nowMinutes / slotInterval) * slotInterval;
      currentSlot.setHours(0, nextSlotMinutes, 0, 0);
    }

    // Generate slots at intervals
    while (currentSlot < workEnd) {
      const slotEnd = new Date(currentSlot);
      slotEnd.setMinutes(slotEnd.getMinutes() + service.duration_minutes);

      // Check if slot + service duration fits within working hours
      if (slotEnd > workEnd) {
        break;
      }

      // Additional safety check: skip slots in the past
      if (currentSlot < now) {
        // Move to next slot
        currentSlot = new Date(currentSlot);
        currentSlot.setMinutes(
          currentSlot.getMinutes() + slotInterval,
        );
        continue;
      }

      // Check for conflicts with existing bookings
      const hasConflict = this.hasBookingConflict(
        currentSlot,
        slotEnd,
        bookings,
      );

      if (!hasConflict) {
        slots.push({
          id: this.generateSlotId(master.id, currentSlot),
          date: this.formatDate(currentSlot),
          startTime: this.formatTime(currentSlot),
          endTime: this.formatTime(slotEnd),
          duration: service.duration_minutes,
          masterId: master.id,
          masterName: master.name,
          serviceId: service.id,
          serviceName: service.name,
          price: this.decimalToNumber(service.price),
          isPreferred: false, // Will be set during ranking
        });
      }

      // Move to next slot
      currentSlot = new Date(currentSlot);
      currentSlot.setMinutes(
        currentSlot.getMinutes() + slotInterval,
      );
    }

    return slots;
  }

  /**
   * Check if a time slot conflicts with existing bookings
   *
   * @param slotStart - Slot start time
   * @param slotEnd - Slot end time
   * @param bookings - Existing bookings
   * @returns True if there's a conflict
   */
  private hasBookingConflict(
    slotStart: Date,
    slotEnd: Date,
    bookings: any[],
  ): boolean {
    return bookings.some((booking) => {
      const bookingStart = new Date(booking.start_ts);
      const bookingEnd = booking.end_ts
        ? new Date(booking.end_ts)
        : new Date(bookingStart.getTime() + 60 * 60 * 1000); // Default 1 hour if no end

      // Check for overlap: slot starts before booking ends AND slot ends after booking starts
      return slotStart < bookingEnd && slotEnd > bookingStart;
    });
  }

  /**
   * Rank slots by preference and proximity
   *
   * @param slots - All available slots
   * @param preferredMasterId - Preferred master ID
   * @param preferredDate - Preferred date
   * @param preferredTime - Preferred time
   * @returns Ranked and sorted slots
   */
  private rankSlots(
    slots: SlotSuggestion[],
    preferredMasterId?: string,
    preferredDate?: string,
    preferredTime?: string,
  ): SlotSuggestion[] {
    return slots
      .map((slot) => {
        let score = 0;
        let proximityLabel:
          | 'exact'
          | 'close'
          | 'same-day'
          | 'same-week'
          | 'alternative' = 'alternative';

        const isMasterMatch = preferredMasterId
          ? slot.masterId === preferredMasterId
          : false;
        const isDateMatch = preferredDate ? slot.date === preferredDate : false;
        const isTimeMatch = preferredTime
          ? this.isTimeClose(slot.startTime, preferredTime)
          : false;

        // Exact match (master + date + time)
        if (isMasterMatch && isDateMatch && isTimeMatch) {
          score = 100;
          proximityLabel = 'exact';
          slot.isPreferred = true;
        }
        // Master + date match
        else if (isMasterMatch && isDateMatch) {
          score = 90;
          proximityLabel = 'close';
          slot.isPreferred = true;
        }
        // Master + time match
        else if (isMasterMatch && isTimeMatch) {
          score = 85;
          proximityLabel = 'close';
          slot.isPreferred = true;
        }
        // Master match only
        else if (isMasterMatch) {
          score = 75;
          proximityLabel = 'same-week';
          slot.isPreferred = true;
        }
        // Date + time match
        else if (isDateMatch && isTimeMatch) {
          score = 70;
          proximityLabel = 'close';
        }
        // Date match only
        else if (isDateMatch) {
          score = 60;
          proximityLabel = 'same-day';
        }
        // Time match only
        else if (isTimeMatch) {
          score = 50;
          proximityLabel = 'same-week';
        }
        // Calculate proximity by date
        else {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const slotDate = new Date(slot.date);
          const daysDiff = Math.floor(
            (slotDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
          );

          // Closer dates get higher scores
          score = Math.max(0, 40 - daysDiff * 2);

          if (daysDiff === 0) {
            proximityLabel = 'same-day';
          } else if (daysDiff <= 3) {
            proximityLabel = 'same-week';
          }
        }

        return {
          ...slot,
          proximityScore: score,
          proximityLabel,
        };
      })
      .sort((a, b) => {
        // Sort by score descending, then by date/time ascending
        if (b.proximityScore !== a.proximityScore) {
          return (b.proximityScore || 0) - (a.proximityScore || 0);
        }
        // If same score, prefer earlier slots
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.startTime.localeCompare(b.startTime);
      });
  }

  /**
   * Check if two times are close (within 1 hour)
   *
   * @param time1 - First time (HH:mm)
   * @param time2 - Second time (HH:mm)
   * @returns True if times are within 1 hour
   */
  private isTimeClose(time1: string, time2: string): boolean {
    const [h1, m1] = time1.split(':').map(Number);
    const [h2, m2] = time2.split(':').map(Number);

    const minutes1 = h1 * 60 + m1;
    const minutes2 = h2 * 60 + m2;

    const diff = Math.abs(minutes1 - minutes2);
    return diff <= 60; // Within 1 hour
  }

  /**
   * Check if two dates are the same day
   */
  private isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  /**
   * Generate unique slot ID
   */
  private generateSlotId(masterId: string, date: Date): string {
    return `${masterId}-${date.toISOString()}`;
  }

  /**
   * Format date as YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Format time as HH:mm
   */
  private formatTime(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /**
   * Convert Prisma Decimal to number (for price)
   */
  private decimalToNumber(decimal: Decimal): number {
    return parseFloat(decimal.toString());
  }

  /**
   * Return empty result
   */
  private emptyResult(): SlotSearchResult {
    return {
      slots: [],
      totalFound: 0,
      searchedDays: 0,
      hasMore: false,
    };
  }
}
