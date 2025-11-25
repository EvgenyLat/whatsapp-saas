/**
 * BookingCard Component
 * Displays a booking in the calendar view with drag-and-drop support
 */

'use client';

import * as React from 'react';
import { Booking, BookingStatus } from '@/types';
import { formatTime } from '@/lib/utils';
import { Clock, User, Phone, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BookingCardProps {
  booking: Booking;
  masterName?: string;
  serviceName?: string;
  onClick?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onDelete?: (booking: Booking) => void;
  isDragging?: boolean;
  style?: React.CSSProperties;
}

const statusColors = {
  [BookingStatus.PENDING]: 'bg-warning-100 border-warning-300 text-warning-900',
  [BookingStatus.CONFIRMED]: 'bg-success-100 border-success-300 text-success-900',
  [BookingStatus.COMPLETED]: 'bg-neutral-200 border-neutral-400 text-neutral-700',
  [BookingStatus.CANCELLED]: 'bg-error-100 border-error-300 text-error-900',
  [BookingStatus.NO_SHOW]: 'bg-error-50 border-error-200 text-error-700',
};

export function BookingCard({
  booking,
  masterName,
  serviceName,
  onClick,
  onDragStart,
  onDragEnd,
  onDelete,
  isDragging = false,
  style,
}: BookingCardProps) {
  const statusColor = statusColors[booking.status as BookingStatus] || 'bg-neutral-100 border-neutral-300';

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening booking details
    if (onDelete && window.confirm('Вы уверены, что хотите удалить эту запись?')) {
      onDelete(booking);
    }
  };

  return (
    <div
      className={cn(
        'rounded-lg border-2 p-3 cursor-pointer transition-all hover:shadow-md relative',
        statusColor,
        isDragging && 'opacity-50 cursor-grabbing',
        !isDragging && 'cursor-grab'
      )}
      style={style}
      onClick={onClick}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      {/* Delete Button */}
      {onDelete && (
        <button
          onClick={handleDelete}
          className="absolute top-1 right-1 p-1 rounded hover:bg-error-200 transition-colors z-10"
          title="Удалить запись"
        >
          <Trash2 className="h-3 w-3 text-error-600" />
        </button>
      )}

      {/* Time */}
      <div className="flex items-center gap-1 text-xs font-semibold mb-2">
        <Clock className="h-3 w-3" />
        <span>
          {formatTime(booking.start_ts)}
          {booking.end_ts && ` - ${formatTime(booking.end_ts)}`}
        </span>
      </div>

      {/* Customer Name */}
      <div className="flex items-center gap-1 text-sm font-medium mb-1">
        <User className="h-3 w-3" />
        <span className="truncate">{booking.customer_name}</span>
      </div>

      {/* Service */}
      <div className="text-xs truncate mb-1">
        {serviceName || booking.service}
      </div>

      {/* Phone */}
      <div className="flex items-center gap-1 text-xs opacity-75">
        <Phone className="h-3 w-3" />
        <span className="truncate">{booking.customer_phone}</span>
      </div>
    </div>
  );
}
