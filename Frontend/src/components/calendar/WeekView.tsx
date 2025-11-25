/**
 * WeekView Component
 * Multi-master weekly calendar view with drag-and-drop support
 */

'use client';

import * as React from 'react';
import { Booking, Master, Salon } from '@/types';
import { TimeSlot } from './TimeSlot';
import {
  getWeekStart,
  getWeekDates,
  formatDayName,
  formatMonthDay,
  generateTimeSlots,
  isToday,
  isPast,
  formatDateForAPI,
} from '@/lib/calendar-utils';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, User } from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';

export interface WeekViewProps {
  /** Salon configuration with working hours */
  salon: Salon;
  /** Masters to display */
  masters: Master[];
  /** Bookings for the week */
  bookings: Booking[];
  /** Currently selected date */
  currentDate: Date;
  /** Callback when date changes */
  onDateChange: (date: Date) => void;
  /** Callback when booking is moved */
  onBookingMove?: (
    booking: Booking,
    newTime: string,
    newDate: Date,
    newMasterId: string
  ) => void;
  /** Callback when booking is clicked */
  onBookingClick?: (booking: Booking) => void;
  /** Callback when empty slot is clicked to create booking */
  onSlotClick?: (time: string, date: Date, masterId: string) => void;
  /** Callback when booking is deleted */
  onBookingDelete?: (booking: Booking) => void;
  /** Service name lookup */
  serviceLookup?: Map<string, string>;
  /** Master name lookup */
  masterLookup?: Map<string, string>;
}

export function WeekView({
  salon,
  masters,
  bookings,
  currentDate,
  onDateChange,
  onBookingMove,
  onBookingClick,
  onSlotClick,
  onBookingDelete,
  serviceLookup,
  masterLookup,
}: WeekViewProps) {
  const weekStart = getWeekStart(currentDate);
  const weekDates = getWeekDates(weekStart);

  // Generate time slots based on salon working hours
  const timeSlots = React.useMemo(() => {
    return generateTimeSlots(
      salon.working_hours_start,
      salon.working_hours_end,
      salon.slot_duration_minutes
    );
  }, [salon.working_hours_start, salon.working_hours_end, salon.slot_duration_minutes]);

  // Group bookings by date, time, and master
  const bookingsBySlot = React.useMemo(() => {
    const map = new Map<string, Booking[]>();

    bookings.forEach((booking) => {
      const bookingDate = new Date(booking.start_ts);
      const dateKey = formatDateForAPI(bookingDate);
      const timeKey = `${bookingDate.getHours().toString().padStart(2, '0')}:${bookingDate.getMinutes().toString().padStart(2, '0')}`;
      const masterId = booking.master_id?.toString() || 'unassigned';

      const slotKey = `${dateKey}-${timeKey}-${masterId}`;

      if (!map.has(slotKey)) {
        map.set(slotKey, []);
      }
      map.get(slotKey)!.push(booking);
    });

    return map;
  }, [bookings]);

  const handlePreviousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    onDateChange(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    onDateChange(newDate);
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with navigation */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-200">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-neutral-900">
            {formatMonthDay(weekStart)} - {formatMonthDay(weekDates[6])}
          </h2>
          <Button variant="ghost" onClick={handleToday}>
            <CalendarIcon className="h-4 w-4 mr-2" />
            Today
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={handlePreviousWeek}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button variant="ghost" onClick={handleNextWeek}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-full">
          {/* Header row with master names */}
          <div className="sticky top-0 z-10 bg-white border-b-2 border-neutral-300">
            <div className="grid" style={{ gridTemplateColumns: `80px repeat(${weekDates.length}, 1fr)` }}>
              {/* Empty corner cell */}
              <div className="border-r border-neutral-200 bg-neutral-50" />

              {/* Date headers */}
              {weekDates.map((date, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'text-center p-3 border-r border-neutral-200',
                    isToday(date) && 'bg-primary-100',
                    isPast(date) && !isToday(date) && 'bg-neutral-50'
                  )}
                >
                  <div className="text-sm font-semibold text-neutral-900">
                    {formatDayName(date)}
                  </div>
                  <div className={cn(
                    'text-lg font-bold mt-1',
                    isToday(date) && 'text-primary-600',
                    !isToday(date) && 'text-neutral-700'
                  )}>
                    {date.getDate()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Master rows */}
          {masters.map((master) => (
            <div key={master.id}>
              {/* Master name row */}
              <div className="sticky left-0 z-5 bg-neutral-50 border-b border-neutral-300">
                <div className="grid" style={{ gridTemplateColumns: `80px repeat(${weekDates.length}, 1fr)` }}>
                  <div className="p-3 border-r border-neutral-300 bg-neutral-100">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-neutral-600" />
                      <span className="text-sm font-semibold text-neutral-900 truncate">
                        {master.name}
                      </span>
                    </div>
                  </div>
                  {weekDates.map((_, idx) => (
                    <div key={idx} className="border-r border-neutral-300" />
                  ))}
                </div>
              </div>

              {/* Time slots for this master */}
              {timeSlots.map((time) => (
                <div key={time} className="grid" style={{ gridTemplateColumns: `80px repeat(${weekDates.length}, 1fr)` }}>
                  {/* Time label */}
                  <div className="sticky left-0 z-5 p-2 border-r border-b border-neutral-200 bg-neutral-50 text-xs text-neutral-600 font-medium">
                    {time}
                  </div>

                  {/* Slots for each day */}
                  {weekDates.map((date, idx) => {
                    const dateKey = formatDateForAPI(date);
                    const slotKey = `${dateKey}-${time}-${master.id}`;
                    const slotBookings = bookingsBySlot.get(slotKey) || [];
                    const isPastSlot = isPast(date);

                    return (
                      <TimeSlot
                        key={idx}
                        time={time}
                        date={date}
                        masterId={master.id}
                        bookings={slotBookings}
                        isPast={isPastSlot}
                        onDrop={onBookingMove}
                        onBookingClick={onBookingClick}
                        onSlotClick={onSlotClick}
                        onBookingDelete={onBookingDelete}
                        serviceLookup={serviceLookup}
                        masterLookup={masterLookup}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          ))}

          {/* Empty state when no masters */}
          {masters.length === 0 && (
            <div className="flex items-center justify-center p-12">
              <div className="text-center">
                <User className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
                <p className="text-neutral-600 font-medium">No staff members found</p>
                <p className="text-sm text-neutral-500 mt-2">
                  Add staff members to see them in the calendar
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
