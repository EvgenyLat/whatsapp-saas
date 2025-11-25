/**
 * BookingCard Component
 * WhatsApp SaaS Platform
 *
 * Displays booking information in a card format:
 * - Customer name and phone
 * - Service name
 * - Date and time (formatted with date-fns)
 * - Status badge
 * - Actions menu (Edit, Cancel, Complete)
 */

'use client';

import React, { memo, useCallback } from 'react';
import { format } from 'date-fns';
import { Phone, Calendar, Clock, MoreVertical, Edit2, XCircle, CheckCircle } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { BookingStatus } from '@/types';
import type { Booking } from '@/types';

export interface BookingCardProps {
  booking: Booking;
  onEdit?: (booking: Booking) => void;
  onCancel?: (booking: Booking) => void;
  onComplete?: (booking: Booking) => void;
  className?: string;
}

/**
 * BookingCard Component
 *
 * @example
 * ```tsx
 * <BookingCard
 *   booking={booking}
 *   onEdit={(booking) => console.log('Edit:', booking)}
 *   onCancel={(booking) => console.log('Cancel:', booking)}
 *   onComplete={(booking) => console.log('Complete:', booking)}
 * />
 * ```
 */
export const BookingCard = memo<BookingCardProps>(
  ({ booking, onEdit, onCancel, onComplete, className }) => {
    const formattedDate = format(
      typeof booking.start_ts === 'string' ? new Date(booking.start_ts) : booking.start_ts,
      'MMM dd, yyyy',
    );
    const formattedTime = format(
      typeof booking.start_ts === 'string' ? new Date(booking.start_ts) : booking.start_ts,
      'h:mm a',
    );

    const handleEdit = useCallback(() => {
      onEdit?.(booking);
    }, [booking, onEdit]);

    const handleCancel = useCallback(() => {
      onCancel?.(booking);
    }, [booking, onCancel]);

    const handleComplete = useCallback(() => {
      onComplete?.(booking);
    }, [booking, onComplete]);

    const getStatusVariant = (status: BookingStatus) => {
      switch (status) {
        case BookingStatus.CONFIRMED:
          return 'confirmed';
        case BookingStatus.COMPLETED:
          return 'completed';
        case BookingStatus.CANCELLED:
          return 'cancelled';
        case BookingStatus.NO_SHOW:
          return 'warning';
        default:
          return 'default';
      }
    };

    return (
      <Card className={cn('p-4 hover:shadow-md transition-shadow', className)}>
        <div className="flex items-start justify-between">
          {/* Main Content */}
          <div className="flex-1 space-y-3">
            {/* Customer Info */}
            <div>
              <h3 className="text-lg font-semibold text-neutral-900">
                {booking.customer_name}
              </h3>
              <div className="flex items-center gap-1 text-sm text-neutral-600 mt-1">
                <Phone size={14} />
                <span>{booking.customer_phone}</span>
              </div>
            </div>

            {/* Service */}
            <div>
              <p className="text-sm font-medium text-neutral-700">{booking.service}</p>
            </div>

            {/* Date and Time */}
            <div className="flex items-center gap-4 text-sm text-neutral-600">
              <div className="flex items-center gap-1">
                <Calendar size={14} />
                <span>{formattedDate}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock size={14} />
                <span>{formattedTime}</span>
              </div>
            </div>

            {/* Status Badge */}
            <div>
              <Badge variant={getStatusVariant(booking.status)}>
                {booking.status}
              </Badge>
            </div>
          </div>

          {/* Actions Menu */}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                className={cn(
                  'p-2 rounded-lg text-neutral-600 hover:bg-neutral-100 transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
                )}
                aria-label="More actions"
              >
                <MoreVertical size={20} />
              </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className={cn(
                  'min-w-[180px] bg-white rounded-lg shadow-lg border border-neutral-200 p-1',
                  'animate-in fade-in-0 zoom-in-95',
                )}
                sideOffset={5}
                align="end"
              >
                {/* Edit */}
                <DropdownMenu.Item
                  onClick={handleEdit}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 text-sm text-neutral-700',
                    'rounded-md cursor-pointer outline-none',
                    'hover:bg-primary-50 hover:text-primary-700',
                    'focus:bg-primary-50 focus:text-primary-700',
                  )}
                >
                  <Edit2 size={16} />
                  <span>Edit</span>
                </DropdownMenu.Item>

                {/* Complete */}
                {booking.status !== BookingStatus.COMPLETED && booking.status !== BookingStatus.CANCELLED && (
                  <DropdownMenu.Item
                    onClick={handleComplete}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 text-sm text-neutral-700',
                      'rounded-md cursor-pointer outline-none',
                      'hover:bg-success-50 hover:text-success-700',
                      'focus:bg-success-50 focus:text-success-700',
                    )}
                  >
                    <CheckCircle size={16} />
                    <span>Mark Complete</span>
                  </DropdownMenu.Item>
                )}

                {/* Cancel */}
                {booking.status !== BookingStatus.CANCELLED && booking.status !== BookingStatus.COMPLETED && (
                  <DropdownMenu.Item
                    onClick={handleCancel}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 text-sm text-neutral-700',
                      'rounded-md cursor-pointer outline-none',
                      'hover:bg-error-50 hover:text-error-700',
                      'focus:bg-error-50 focus:text-error-700',
                    )}
                  >
                    <XCircle size={16} />
                    <span>Cancel</span>
                  </DropdownMenu.Item>
                )}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </Card>
    );
  },
);

BookingCard.displayName = 'BookingCard';
