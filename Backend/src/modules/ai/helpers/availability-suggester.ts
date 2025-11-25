import { Master } from '@prisma/client';

/**
 * Availability Suggester Helper
 *
 * Provides intelligent time slot suggestions and alternative options
 * when preferred times are unavailable
 */

export interface TimeSlot {
  datetime: Date;
  master_id: string;
  master_name: string;
  reason?: string;
}

export interface AvailabilitySuggestion {
  available: boolean;
  requestedSlot?: TimeSlot;
  alternativeSlots: TimeSlot[];
  message: string;
}

export class AvailabilitySuggester {
  /**
   * Find next N available slots for a service
   */
  static findNextAvailableSlots(
    requestedDate: Date,
    durationMinutes: number,
    masters: Master[],
    existingBookings: Map<string, Date[]>, // master_id -> occupied times
    count: number = 3
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const workingHours = { start: 10, end: 20 }; // Default 10:00 - 20:00
    const slotInterval = 15; // 15-minute intervals

    // Search up to 7 days ahead
    for (let dayOffset = 0; dayOffset < 7 && slots.length < count; dayOffset++) {
      const currentDate = new Date(requestedDate);
      currentDate.setDate(currentDate.getDate() + dayOffset);

      // Try each hour in working hours
      for (let hour = workingHours.start; hour < workingHours.end && slots.length < count; hour++) {
        for (let minute = 0; minute < 60 && slots.length < count; minute += slotInterval) {
          const candidate = new Date(currentDate);
          candidate.setHours(hour, minute, 0, 0);

          // Skip if in the past
          if (candidate < new Date()) {
            continue;
          }

          // Find available master for this slot
          const availableMaster = this.findAvailableMaster(
            candidate,
            durationMinutes,
            masters,
            existingBookings
          );

          if (availableMaster) {
            slots.push({
              datetime: candidate,
              master_id: availableMaster.id,
              master_name: availableMaster.name,
              reason: dayOffset === 0 ? 'Today' : dayOffset === 1 ? 'Tomorrow' : undefined,
            });
          }
        }
      }
    }

    return slots;
  }

  /**
   * Find masters available at specific time
   */
  static findAvailableMaster(
    datetime: Date,
    durationMinutes: number,
    masters: Master[],
    existingBookings: Map<string, Date[]>
  ): Master | null {
    const slotEnd = new Date(datetime.getTime() + durationMinutes * 60 * 1000);

    for (const master of masters) {
      // Check if master works on this day
      const dayOfWeek = this.getDayOfWeek(datetime);
      const workingHours = (master.working_hours as any)?.[dayOfWeek];

      if (!workingHours?.enabled) {
        continue;
      }

      // Check if slot is within working hours
      const [workStartHour, workStartMinute] = workingHours.start.split(':').map(Number);
      const [workEndHour, workEndMinute] = workingHours.end.split(':').map(Number);

      const workStart = new Date(datetime);
      workStart.setHours(workStartHour, workStartMinute, 0, 0);

      const workEnd = new Date(datetime);
      workEnd.setHours(workEndHour, workEndMinute, 0, 0);

      if (datetime < workStart || slotEnd > workEnd) {
        continue;
      }

      // Check for booking conflicts
      const masterBookings = existingBookings.get(master.id) || [];
      const hasConflict = masterBookings.some(bookingTime => {
        const bookingEnd = new Date(bookingTime.getTime() + 60 * 60 * 1000); // Assume 1hr default
        return datetime < bookingEnd && slotEnd > bookingTime;
      });

      if (!hasConflict) {
        return master;
      }
    }

    return null;
  }

  /**
   * Suggest alternative staff with same specialization
   */
  static suggestAlternativeStaff(
    preferredMasterId: string,
    masters: Master[],
    datetime: Date,
    durationMinutes: number,
    existingBookings: Map<string, Date[]>
  ): Master[] {
    const preferredMaster = masters.find(m => m.id === preferredMasterId);
    if (!preferredMaster) {
      return [];
    }

    const alternatives: Master[] = [];

    for (const master of masters) {
      // Skip the preferred master
      if (master.id === preferredMasterId) {
        continue;
      }

      // Check if has overlapping specialization
      const hasOverlap = master.specialization.some(spec =>
        preferredMaster.specialization.includes(spec)
      );

      if (!hasOverlap) {
        continue;
      }

      // Check availability
      const isAvailable = this.findAvailableMaster(
        datetime,
        durationMinutes,
        [master],
        existingBookings
      );

      if (isAvailable) {
        alternatives.push(master);
      }
    }

    return alternatives.slice(0, 3); // Return top 3
  }

  /**
   * Format time slot for display
   */
  static formatTimeSlot(
    slot: TimeSlot,
    language: string = 'ru',
    timezone: string = 'UTC'
  ): string {
    const date = slot.datetime;

    if (language === 'ru') {
      const months = [
        'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
        'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
      ];
      const day = date.getDate();
      const month = months[date.getMonth()];
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');

      return `${day} ${month} в ${hours}:${minutes} (мастер: ${slot.master_name})`;
    } else if (language === 'en') {
      const options: Intl.DateTimeFormatOptions = {
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      };
      const formatted = date.toLocaleString('en-US', options);
      return `${formatted} (with ${slot.master_name})`;
    } else if (language === 'es') {
      const options: Intl.DateTimeFormatOptions = {
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      };
      const formatted = date.toLocaleString('es-ES', options);
      return `${formatted} (con ${slot.master_name})`;
    } else if (language === 'pt') {
      const options: Intl.DateTimeFormatOptions = {
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      };
      const formatted = date.toLocaleString('pt-BR', options);
      return `${formatted} (com ${slot.master_name})`;
    } else if (language === 'he') {
      const months = [
        'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
        'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
      ];
      const day = date.getDate();
      const month = months[date.getMonth()];
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');

      return `${day} ב${month} בשעה ${hours}:${minutes} (עם ${slot.master_name})`;
    }

    return slot.datetime.toISOString();
  }

  /**
   * Check if time is during working hours
   */
  static isWithinWorkingHours(
    datetime: Date,
    master: Master
  ): boolean {
    const dayOfWeek = this.getDayOfWeek(datetime);
    const workingHours = (master.working_hours as any)?.[dayOfWeek];

    if (!workingHours?.enabled || !workingHours.start || !workingHours.end) {
      return false;
    }

    const [startHour, startMinute] = workingHours.start.split(':').map(Number);
    const [endHour, endMinute] = workingHours.end.split(':').map(Number);

    const timeMinutes = datetime.getHours() * 60 + datetime.getMinutes();
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    return timeMinutes >= startMinutes && timeMinutes < endMinutes;
  }

  /**
   * Check if time is during break
   */
  static isDuringBreak(
    datetime: Date,
    master: Master
  ): boolean {
    const dayOfWeek = this.getDayOfWeek(datetime);
    const workingHours = (master.working_hours as any)?.[dayOfWeek];

    if (!workingHours?.breaks || workingHours.breaks.length === 0) {
      return false;
    }

    const timeMinutes = datetime.getHours() * 60 + datetime.getMinutes();

    for (const breakTime of workingHours.breaks) {
      const [breakStartHour, breakStartMinute] = breakTime.start.split(':').map(Number);
      const [breakEndHour, breakEndMinute] = breakTime.end.split(':').map(Number);

      const breakStartMinutes = breakStartHour * 60 + breakStartMinute;
      const breakEndMinutes = breakEndHour * 60 + breakEndMinute;

      if (timeMinutes >= breakStartMinutes && timeMinutes < breakEndMinutes) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get day of week from date
   */
  private static getDayOfWeek(date: Date): string {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[date.getDay()];
  }
}
