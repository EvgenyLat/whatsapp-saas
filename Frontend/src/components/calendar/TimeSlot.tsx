/**
 * TimeSlot Component
 * Represents a time slot in the calendar that can accept bookings via drag-and-drop
 */

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Booking } from '@/types';
import { BookingCard } from './BookingCard';

export interface TimeSlotProps {
  /** Time label (e.g., "09:00") */
  time: string;
  /** Date for this slot */
  date: Date;
  /** Master ID this slot belongs to */
  masterId: string;
  /** Bookings in this time slot */
  bookings: Booking[];
  /** Whether this slot is in the past */
  isPast?: boolean;
  /** Whether this slot is being dragged over */
  isDragOver?: boolean;
  /** Callback when a booking is dropped */
  onDrop?: (booking: Booking, newTime: string, newDate: Date, masterId: string) => void;
  /** Callback when booking card is clicked */
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

export function TimeSlot({
  time,
  date,
  masterId,
  bookings,
  isPast = false,
  isDragOver = false,
  onDrop,
  onBookingClick,
  onSlotClick,
  onBookingDelete,
  serviceLookup,
  masterLookup,
}: TimeSlotProps) {
  const [dragOver, setDragOver] = React.useState(false);
  const [draggingBooking, setDraggingBooking] = React.useState<Booking | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isPast) {
      setDragOver(true);
    }
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    if (isPast) return;

    try {
      const bookingData = e.dataTransfer.getData('application/json');
      if (bookingData && onDrop) {
        const booking = JSON.parse(bookingData) as Booking;
        onDrop(booking, time, date, masterId);
      }
    } catch (error) {
      console.error('Failed to parse booking data:', error);
    }
  };

  const handleBookingDragStart = (e: React.DragEvent, booking: Booking) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify(booking));
    setDraggingBooking(booking);
  };

  const handleBookingDragEnd = () => {
    setDraggingBooking(null);
  };

  const handleSlotClick = () => {
    if (bookings.length === 0 && !isPast && onSlotClick) {
      onSlotClick(time, date, masterId);
    }
  };

  return (
    <div
      className={cn(
        'min-h-[80px] border-b border-r border-neutral-200 p-2 transition-colors',
        isPast && 'bg-neutral-50',
        !isPast && 'hover:bg-primary-50',
        (dragOver || isDragOver) && !isPast && 'bg-primary-100 border-primary-300',
        bookings.length === 0 && !isPast && 'cursor-pointer'
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleSlotClick}
    >
      {bookings.map((booking) => (
        <BookingCard
          key={booking.id}
          booking={booking}
          serviceName={booking.service_id ? serviceLookup?.get(booking.service_id) : undefined}
          masterName={booking.master_id ? masterLookup?.get(booking.master_id) : undefined}
          onClick={() => onBookingClick?.(booking)}
          onDragStart={(e) => handleBookingDragStart(e, booking)}
          onDragEnd={handleBookingDragEnd}
          onDelete={onBookingDelete}
          isDragging={draggingBooking?.id === booking.id}
        />
      ))}

      {bookings.length === 0 && !isPast && (
        <div className="h-full flex items-center justify-center text-neutral-400 text-xs">
          Available
        </div>
      )}
    </div>
  );
}
