/**
 * AvailabilityChecker Component
 * Visual component showing master availability status
 *
 * Features:
 * - Green: Available
 * - Yellow: Partially available (close to another booking)
 * - Red: Not available
 * - Real-time updates as user changes selections
 * - Shows conflicting bookings
 */

'use client';

import * as React from 'react';
import { useMasterAvailability } from '@/hooks/api/useMasters';
import { CheckCircle, AlertTriangle, XCircle, Clock, Calendar } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui';

export interface AvailabilityCheckerProps {
  /** Salon ID */
  salonId: string;
  /** Master ID to check availability for */
  masterId: string;
  /** Date in YYYY-MM-DD format */
  date: string;
  /** Start time in HH:mm format */
  startTime: string;
  /** Service duration in minutes */
  duration?: number;
  /** Callback when availability status changes */
  onAvailabilityChange?: (isAvailable: boolean) => void;
}

export type AvailabilityStatus = 'available' | 'partial' | 'unavailable' | 'loading';

export function AvailabilityChecker({
  salonId,
  masterId,
  date,
  startTime,
  duration = 60,
  onAvailabilityChange,
}: AvailabilityCheckerProps) {
  const { data: availability, isLoading, error } = useMasterAvailability(
    salonId,
    masterId,
    { date, duration_minutes: duration },
    { enabled: !!salonId && !!masterId && !!date }
  );

  // Check if the selected time slot is available
  const availabilityStatus: AvailabilityStatus = React.useMemo(() => {
    if (isLoading) return 'loading';
    if (!availability || !startTime) return 'available';

    // Calculate end time based on duration
    const [hours, minutes] = startTime.split(':').map(Number);
    const startMinutes = (hours || 0) * 60 + (minutes || 0);
    const endMinutes = startMinutes + duration;

    // Check if slot is in available slots
    const isInAvailableSlots = availability.available_slots.some((slot) => {
      const [slotStartHours, slotStartMinutes] = slot.start.split(':').map(Number);
      const [slotEndHours, slotEndMinutes] = slot.end.split(':').map(Number);
      const slotStart = (slotStartHours || 0) * 60 + (slotStartMinutes || 0);
      const slotEnd = (slotEndHours || 0) * 60 + (slotEndMinutes || 0);

      return startMinutes >= slotStart && endMinutes <= slotEnd;
    });

    if (!isInAvailableSlots) return 'unavailable';

    // Check for conflicts with existing bookings
    const hasConflict = availability.booked_slots.some((booking) => {
      const [bookingStartHours, bookingStartMinutes] = booking.start.split(':').map(Number);
      const [bookingEndHours, bookingEndMinutes] = booking.end.split(':').map(Number);
      const bookingStart = (bookingStartHours || 0) * 60 + (bookingStartMinutes || 0);
      const bookingEnd = (bookingEndHours || 0) * 60 + (bookingEndMinutes || 0);

      // Check for overlap
      return (
        (startMinutes >= bookingStart && startMinutes < bookingEnd) ||
        (endMinutes > bookingStart && endMinutes <= bookingEnd) ||
        (startMinutes <= bookingStart && endMinutes >= bookingEnd)
      );
    });

    if (hasConflict) return 'unavailable';

    // Check if close to another booking (within 30 minutes)
    const isCloseToBooking = availability.booked_slots.some((booking) => {
      const [bookingStartHours, bookingStartMinutes] = booking.start.split(':').map(Number);
      const [bookingEndHours, bookingEndMinutes] = booking.end.split(':').map(Number);
      const bookingStart = (bookingStartHours || 0) * 60 + (bookingStartMinutes || 0);
      const bookingEnd = (bookingEndHours || 0) * 60 + (bookingEndMinutes || 0);

      const timeDiffStart = Math.abs(startMinutes - bookingEnd);
      const timeDiffEnd = Math.abs(endMinutes - bookingStart);

      return timeDiffStart <= 30 || timeDiffEnd <= 30;
    });

    return isCloseToBooking ? 'partial' : 'available';
  }, [availability, startTime, duration, isLoading]);

  // Notify parent component of availability changes
  React.useEffect(() => {
    if (onAvailabilityChange && availabilityStatus !== 'loading') {
      onAvailabilityChange(availabilityStatus === 'available' || availabilityStatus === 'partial');
    }
  }, [availabilityStatus, onAvailabilityChange]);

  // Find conflicting bookings
  const conflictingBookings = React.useMemo(() => {
    if (!availability || !startTime) return [];

    const [hours, minutes] = startTime.split(':').map(Number);
    const startMinutes = (hours || 0) * 60 + (minutes || 0);
    const endMinutes = startMinutes + duration;

    return availability.booked_slots.filter((booking) => {
      const [bookingStartHours, bookingStartMinutes] = booking.start.split(':').map(Number);
      const [bookingEndHours, bookingEndMinutes] = booking.end.split(':').map(Number);
      const bookingStart = (bookingStartHours || 0) * 60 + (bookingStartMinutes || 0);
      const bookingEnd = (bookingEndHours || 0) * 60 + (bookingEndMinutes || 0);

      return (
        (startMinutes >= bookingStart && startMinutes < bookingEnd) ||
        (endMinutes > bookingStart && endMinutes <= bookingEnd) ||
        (startMinutes <= bookingStart && endMinutes >= bookingEnd)
      );
    });
  }, [availability, startTime, duration]);

  if (error) {
    return (
      <div className="rounded-lg border border-error-200 bg-error-50 p-4">
        <div className="flex items-start gap-3">
          <XCircle className="h-5 w-5 text-error-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-error-900">Unable to check availability</p>
            <p className="text-sm text-error-700 mt-1">Please try selecting different options</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
        <div className="flex items-center gap-3">
          <LoadingSpinner size="sm" />
          <p className="text-sm text-neutral-600">Checking availability...</p>
        </div>
      </div>
    );
  }

  if (!startTime || !date || !masterId) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
        <div className="flex items-start gap-3">
          <Clock className="h-5 w-5 text-neutral-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-neutral-700">Select date, time, and staff</p>
            <p className="text-sm text-neutral-500 mt-1">We'll check availability once all fields are filled</p>
          </div>
        </div>
      </div>
    );
  }

  const statusConfig = {
    available: {
      color: 'success',
      icon: CheckCircle,
      title: 'Available',
      description: 'This time slot is available for booking',
      bgClass: 'bg-success-50 border-success-200',
      iconClass: 'text-success-600',
      titleClass: 'text-success-900',
      descClass: 'text-success-700',
    },
    partial: {
      color: 'warning',
      icon: AlertTriangle,
      title: 'Available (with caution)',
      description: 'This slot is available but close to another booking',
      bgClass: 'bg-warning-50 border-warning-200',
      iconClass: 'text-warning-600',
      titleClass: 'text-warning-900',
      descClass: 'text-warning-700',
    },
    unavailable: {
      color: 'error',
      icon: XCircle,
      title: 'Not Available',
      description: 'This time slot is already booked',
      bgClass: 'bg-error-50 border-error-200',
      iconClass: 'text-error-600',
      titleClass: 'text-error-900',
      descClass: 'text-error-700',
    },
    loading: {
      color: 'neutral',
      icon: Clock,
      title: 'Checking...',
      description: 'Loading availability information',
      bgClass: 'bg-neutral-50 border-neutral-200',
      iconClass: 'text-neutral-600',
      titleClass: 'text-neutral-900',
      descClass: 'text-neutral-700',
    },
  };

  const config = statusConfig[availabilityStatus];
  const Icon = config.icon;

  return (
    <div className={`rounded-lg border ${config.bgClass} p-4`}>
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 ${config.iconClass} flex-shrink-0 mt-0.5`} />
        <div className="flex-1">
          <p className={`text-sm font-medium ${config.titleClass}`}>{config.title}</p>
          <p className={`text-sm ${config.descClass} mt-1`}>{config.description}</p>

          {/* Show conflicting bookings */}
          {availabilityStatus === 'unavailable' && conflictingBookings.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-medium text-error-800">Conflicting bookings:</p>
              {conflictingBookings.map((booking, index) => (
                <div key={index} className="rounded bg-white border border-error-200 p-2 text-xs">
                  <p className="font-medium text-neutral-900">{booking.customer_name}</p>
                  <p className="text-neutral-600">
                    {booking.service} • {booking.start} - {booking.end}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Show suggested alternative times for unavailable slots */}
          {availabilityStatus === 'unavailable' && availability && availability.available_slots.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium text-error-800 mb-1">Suggested alternative times:</p>
              <div className="flex flex-wrap gap-2">
                {availability.available_slots.slice(0, 3).map((slot, index) => (
                  <div
                    key={index}
                    className="rounded bg-white border border-success-200 px-2 py-1 text-xs text-success-800"
                  >
                    {slot.start} - {slot.end}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
