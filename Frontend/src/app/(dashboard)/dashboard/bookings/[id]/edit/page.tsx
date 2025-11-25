/**
 * Edit Booking Page
 * Update existing booking with service/master selection
 *
 * Features:
 * - Pre-populate with current booking data
 * - Smart service and master selection
 * - Recalculate end_time if service changes
 * - Validate availability for new master/time combination
 * - Show warning if changing causes conflicts
 */

'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, Button, LoadingSpinner, Badge } from '@/components/ui';
import { SmartBookingForm, type SmartBookingFormData } from '@/components/bookings/SmartBookingForm';
import { useBooking, useUpdateBooking } from '@/hooks/api/useBookings';
import { useSalonIdSafe } from '@/hooks/useSalonId';
import { formatPhoneNumber } from '@/lib/utils/formatters';
import type { UpdateBookingRequest } from '@/types';
import { BookingStatus } from '@/types';
import { ArrowLeft, AlertTriangle, User } from 'lucide-react';

export default function EditBookingPage() {
  const router = useRouter();
  const params = useParams();
  const bookingId = params.id as string;
  const salonId = useSalonIdSafe();

  const { data: booking, isLoading: loadingBooking } = useBooking(salonId || '', bookingId, { enabled: !!salonId });
  const updateBooking = useUpdateBooking(salonId || '');

  const [hasChanges, setHasChanges] = React.useState(false);

  // Prepare initial values from booking
  const initialValues = React.useMemo(() => {
    if (!booking) return undefined;

    const bookingDate = new Date(booking.start_ts);
    const date = bookingDate.toISOString().split('T')[0];
    const hours = bookingDate.getHours().toString().padStart(2, '0');
    const minutes = bookingDate.getMinutes().toString().padStart(2, '0');
    const time = `${hours}:${minutes}`;

    return {
      service_id: booking.service_id,
      master_id: booking.master_id,
      booking_date: date,
      start_time: time,
    };
  }, [booking]);

  const handleBookingUpdate = async (bookingData: SmartBookingFormData) => {
    try {
      // Combine date and time into ISO timestamp
      const appointmentDateTime = `${bookingData.booking_date}T${bookingData.start_time}:00.000Z`;

      // Check what changed
      const originalDateTime = new Date(booking!.start_ts).toISOString();
      const newDateTime = new Date(appointmentDateTime).toISOString();
      const isReschedule = originalDateTime !== newDateTime;
      const isServiceChange = bookingData.service_id !== booking?.service_id;
      const isMasterChange = bookingData.master_id !== booking?.master_id;

      // Show confirmation for significant changes
      if (isReschedule || isServiceChange || isMasterChange) {
        const changes = [];
        if (isReschedule) changes.push('date/time');
        if (isServiceChange) changes.push('service');
        if (isMasterChange) changes.push('staff member');

        const confirmed = confirm(
          `This will change the booking's ${changes.join(', ')}. The customer should be notified. Continue?`
        );

        if (!confirmed) return;
      }

      const data: UpdateBookingRequest = {
        service_id: bookingData.service_id,
        master_id: bookingData.master_id,
        start_ts: appointmentDateTime,
      };

      await updateBooking.mutateAsync({ bookingId, data });
      router.push(`/dashboard/bookings/${bookingId}`);
    } catch (error) {
      console.error('Failed to update booking:', error);
    }
  };

  if (loadingBooking) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner label="Loading booking..." />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <p className="text-error-600 font-medium">Booking not found</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Edit Booking</h1>
          <p className="mt-1 text-neutral-600">Booking #{booking.booking_code}</p>
        </div>
      </div>

      {/* Booking Status */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-500">Current Status</p>
              <div className="mt-2">
                <Badge
                  variant={
                    booking.status === BookingStatus.CONFIRMED
                      ? 'success'
                      : booking.status === BookingStatus.PENDING
                      ? 'warning'
                      : booking.status === BookingStatus.CANCELLED
                      ? 'error'
                      : ('neutral' as any)
                  }
                >
                  {booking.status}
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-neutral-500">Status Note</p>
              <p className="text-sm text-neutral-600 mt-1">
                Status will remain unchanged unless modified from the detail page
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Warning Banner */}
      <Card className="border-warning-200 bg-warning-50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 text-warning-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-warning-900">Important</p>
              <p className="text-sm text-warning-800 mt-1">
                Changing the service, staff member, or date/time will affect the booking. Make sure to
                notify the customer about any changes.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="max-w-4xl mx-auto">
        {/* Customer Info (Read-Only) */}
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-lg font-semibold text-neutral-900">Customer (Cannot be changed)</h2>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 p-4 rounded-lg bg-neutral-50">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100">
                <User className="h-6 w-6 text-primary-600" />
              </div>
              <div>
                <p className="font-semibold text-neutral-900">{booking.customer_name}</p>
                <p className="text-sm text-neutral-600">{formatPhoneNumber(booking.customer_phone)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Smart Booking Form */}
        <SmartBookingForm
          salonId={salonId || ''}
          initialValues={initialValues}
          onSubmit={handleBookingUpdate}
          isLoading={updateBooking.isPending}
          submitText="Save Changes"
          showCancel={true}
          onCancel={() => router.back()}
        />

        {/* Error Display */}
        {updateBooking.isError && (
          <Card className="mt-6 border-error-200 bg-error-50">
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-error-800">Failed to update booking</p>
              <p className="text-sm text-error-700 mt-1">
                {(updateBooking.error as any)?.message || 'Please try again'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Original Booking Info */}
        <Card className="mt-6">
          <CardHeader>
            <h2 className="text-lg font-semibold text-neutral-900">Original Booking Details</h2>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-neutral-500">Original Service</p>
                <p className="text-neutral-900 mt-1">{booking.service}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-500">Original Date & Time</p>
                <p className="text-neutral-900 mt-1">
                  {new Date(booking.start_ts).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-500">Created</p>
                <p className="text-neutral-900 mt-1">
                  {new Date(booking.created_at).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-500">Last Updated</p>
                <p className="text-neutral-900 mt-1">
                  {new Date(booking.updated_at).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
