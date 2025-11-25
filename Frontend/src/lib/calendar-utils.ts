/**
 * Calendar Utility Functions
 * Helper functions for calendar view calculations
 */

/**
 * Get the start of the week (Monday) for a given date
 */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(d.setDate(diff));
}

/**
 * Get array of dates for the current week
 */
export function getWeekDates(weekStart: Date): Date[] {
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    dates.push(date);
  }
  return dates;
}

/**
 * Format date as day name (e.g., "Mon", "Tue")
 */
export function formatDayName(date: Date, short: boolean = true): string {
  return date.toLocaleDateString('en-US', {
    weekday: short ? 'short' : 'long'
  });
}

/**
 * Format date as "Jan 1"
 */
export function formatMonthDay(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Generate time slots for a day based on working hours
 */
export function generateTimeSlots(
  workingHoursStart: string, // "09:00"
  workingHoursEnd: string,   // "20:00"
  slotDuration: number        // 30 minutes
): string[] {
  const slots: string[] = [];

  const [startHour, startMinute] = workingHoursStart.split(':').map(Number);
  const [endHour, endMinute] = workingHoursEnd.split(':').map(Number);

  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;

  for (let minutes = startMinutes; minutes < endMinutes; minutes += slotDuration) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    slots.push(`${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`);
  }

  return slots;
}

/**
 * Convert time string to minutes since midnight
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert minutes since midnight to time string
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Check if two date ranges overlap
 */
export function doTimesOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  return start1 < end2 && end1 > start2;
}

/**
 * Get position percentage for a time within working hours
 */
export function getTimePosition(
  time: string,
  workingHoursStart: string,
  workingHoursEnd: string
): number {
  const timeMinutes = timeToMinutes(time);
  const startMinutes = timeToMinutes(workingHoursStart);
  const endMinutes = timeToMinutes(workingHoursEnd);

  const totalMinutes = endMinutes - startMinutes;
  const offsetMinutes = timeMinutes - startMinutes;

  return (offsetMinutes / totalMinutes) * 100;
}

/**
 * Calculate height percentage for a duration
 */
export function getDurationHeight(
  durationMinutes: number,
  workingHoursStart: string,
  workingHoursEnd: string
): number {
  const startMinutes = timeToMinutes(workingHoursStart);
  const endMinutes = timeToMinutes(workingHoursEnd);
  const totalMinutes = endMinutes - startMinutes;

  return (durationMinutes / totalMinutes) * 100;
}

/**
 * Check if a date is today
 */
export function isToday(date: Date): boolean {
  const today = new Date();
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear();
}

/**
 * Check if a date is in the past
 */
export function isPast(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  return checkDate < today;
}

/**
 * Format date as YYYY-MM-DD for API
 */
export function formatDateForAPI(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Parse booking time to get start and end minutes
 */
export function getBookingTimeRange(
  startTime: Date | string,
  endTime?: Date | string
): { startMinutes: number; endMinutes: number } {
  const start = typeof startTime === 'string' ? new Date(startTime) : startTime;
  const startMinutes = start.getHours() * 60 + start.getMinutes();

  let endMinutes = startMinutes + 30; // Default 30 min if no end time
  if (endTime) {
    const end = typeof endTime === 'string' ? new Date(endTime) : endTime;
    endMinutes = end.getHours() * 60 + end.getMinutes();
  }

  return { startMinutes, endMinutes };
}
