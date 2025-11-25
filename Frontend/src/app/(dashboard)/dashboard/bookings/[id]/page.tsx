/**
 * Booking Detail Page
 * View booking details with customer, service, and master information
 *
 * Features:
 * - Booking header with status badge
 * - Customer section with avatar and contact info
 * - Service details (name, category, duration, price)
 * - Master/staff details (name, specialization, phone)
 * - Appointment details (date, time, location)
 * - Timeline (created → confirmed → completed/cancelled)
 * - Action buttons based on status
 * - Links to master schedule and service details
 */

'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, Badge, LoadingSpinner, Button } from '@/components/ui';
import { useBooking, useUpdateBooking, useDeleteBooking } from '@/hooks/api/useBookings';
import { useMaster } from '@/hooks/api/useMasters';
import { useService } from '@/hooks/api/useServices';
import { useSalonIdSafe } from '@/hooks/useSalonId';
import { formatDateTime, formatPhoneNumber } from '@/lib/utils/formatters';
import { BookingStatus } from '@/types';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  Calendar,
  Clock,
  MapPin,
  CheckCircle,
  XCircle,
  Edit2,
  MessageSquare,
  Trash2,
  DollarSign,
  Users,
  ExternalLink,
  Scissors,
  Briefcase,
} from 'lucide-react';

export default function BookingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const bookingId = params.id as string;
  const salonId = useSalonIdSafe();

  const { data: booking, isLoading, error } = useBooking(salonId || '', bookingId, { enabled: !!salonId });
  const updateBooking = useUpdateBooking(salonId || '');
  const deleteBooking = useDeleteBooking(salonId || '');

  // Fetch master and service details if IDs are available
  const { data: master } = useMaster(
    salonId || '',
    booking?.master_id?.toString() || '',
    { enabled: !!salonId && !!booking?.master_id }
  );

  const { data: service } = useService(
    booking?.service_id?.toString() || '',
    { enabled: !!booking?.service_id }
  );

  const handleStatusUpdate = async (status: BookingStatus) => {
    if (confirm(`Are you sure you want to mark this booking as ${status}?`)) {
      try {
        await updateBooking.mutateAsync({ bookingId, data: { status } });
      } catch (error) {
        console.error('Failed to update booking:', error);
      }
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this booking? This action cannot be undone.')) {
      try {
        await deleteBooking.mutateAsync(bookingId);
        router.push('/dashboard/bookings');
      } catch (error) {
        console.error('Failed to delete booking:', error);
      }
    }
  };

  const handleSendMessage = () => {
    router.push(`/dashboard/messages?phone=${booking?.customer_phone}`);
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner label="Loading booking..." />
      </div>
    );
  }

  if (error || !booking) {
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
              <p className="mt-2 text-sm text-neutral-500">
                The booking you're looking for doesn't exist or has been deleted
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusVariant = (status: string): any => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'success';
      case 'pending':
        return 'warning';
      case 'cancelled':
        return 'error';
      case 'completed':
        return 'neutral';
      default:
        return 'neutral';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-neutral-900">
                Booking #{booking.booking_code}
              </h1>
              <Badge variant={getStatusVariant(booking.status)}>{booking.status}</Badge>
            </div>
            <p className="mt-1 text-neutral-600">Created {formatDateTime(booking.created_at)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => router.push(`/dashboard/bookings/${bookingId}/edit`)}
          >
            <Edit2 className="h-4 w-4" />
            Edit
          </Button>
          <Button variant="danger" onClick={handleDelete} disabled={deleteBooking.isPending}>
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Section */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-neutral-900">Customer Information</h2>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100">
                  <User className="h-8 w-8 text-primary-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-neutral-900">{booking.customer_name}</h3>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center gap-2 text-neutral-600">
                      <Phone className="h-4 w-4" />
                      <span className="font-medium">{formatPhoneNumber(booking.customer_phone)}</span>
                      <button
                        onClick={handleSendMessage}
                        className="ml-2 text-xs text-primary-600 hover:text-primary-700 underline"
                      >
                        Send Message
                      </button>
                    </div>
                    <button
                      onClick={() =>
                        router.push(`/dashboard/customers?search=${booking.customer_phone}`)
                      }
                      className="text-sm text-primary-600 hover:text-primary-700"
                    >
                      View customer profile →
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Service Details */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-neutral-900">Service Details</h2>
                {service && (
                  <Button
                    variant="ghost"
                    onClick={() => router.push(`/dashboard/services/${service.id}`)}
                  >
                    <ExternalLink className="h-4 w-4" />
                    View Service
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {service ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100">
                      <Scissors className="h-6 w-6 text-primary-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-neutral-900">{service.name}</h3>
                      <p className="text-sm text-neutral-600 mt-1">{service.category}</p>
                      {service.description && (
                        <p className="text-sm text-neutral-500 mt-2">{service.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-neutral-200">
                    <div>
                      <label className="text-sm font-medium text-neutral-500">Duration</label>
                      <div className="mt-1 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-neutral-400" />
                        <span className="text-neutral-900 font-medium">
                          {service.duration_minutes} minutes
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-neutral-500">Price</label>
                      <div className="mt-1 flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-neutral-400" />
                        <span className="text-neutral-900 font-medium">
                          ${(service.price / 100).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-neutral-500">Service</label>
                    <p className="mt-1 text-lg font-semibold text-neutral-900">{booking.service}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-neutral-500">Duration</label>
                    <div className="mt-1 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-neutral-400" />
                      <span className="text-neutral-900">Estimated 60 min</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Master/Staff Details */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-neutral-900">Staff Member</h2>
                {master && (
                  <Button
                    variant="ghost"
                    onClick={() => router.push(`/dashboard/masters/${master.id}/schedule`)}
                  >
                    <Calendar className="h-4 w-4" />
                    View Schedule
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {master ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100">
                      <User className="h-6 w-6 text-primary-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-neutral-900">{master.name}</h3>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {master.specialization?.map((spec, index) => (
                          <span
                            key={index}
                            className="text-xs px-2 py-1 rounded-full bg-primary-50 text-primary-700 border border-primary-200"
                          >
                            {spec}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-neutral-200">
                    {master.phone && (
                      <div>
                        <label className="text-sm font-medium text-neutral-500">Phone</label>
                        <div className="mt-1 flex items-center gap-2">
                          <Phone className="h-4 w-4 text-neutral-400" />
                          <span className="text-neutral-900">{master.phone}</span>
                        </div>
                      </div>
                    )}
                    {master.email && (
                      <div>
                        <label className="text-sm font-medium text-neutral-500">Email</label>
                        <div className="mt-1 flex items-center gap-2">
                          <Mail className="h-4 w-4 text-neutral-400" />
                          <span className="text-neutral-900">{master.email}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 text-neutral-600">
                  <Users className="h-5 w-5 text-neutral-400" />
                  <span>No specific staff member assigned</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Appointment Details */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-neutral-900">Appointment Details</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100">
                    <Calendar className="h-5 w-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-500">Date & Time</p>
                    <p className="text-lg font-semibold text-neutral-900">
                      {formatDateTime(booking.start_ts)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100">
                    <MapPin className="h-5 w-5 text-neutral-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-500">Location</p>
                    <p className="text-neutral-900">Salon Location</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-neutral-900">Booking Timeline</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100">
                    <CheckCircle className="h-4 w-4 text-neutral-600" />
                  </div>
                  <div>
                    <p className="font-medium text-neutral-900">Booking Created</p>
                    <p className="text-sm text-neutral-600">{formatDateTime(booking.created_at)}</p>
                  </div>
                </div>
                {booking.status !== BookingStatus.PENDING && (
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full ${
                        booking.status === BookingStatus.CONFIRMED ||
                        booking.status === BookingStatus.COMPLETED
                          ? 'bg-success-100'
                          : 'bg-error-100'
                      }`}
                    >
                      {booking.status === BookingStatus.CANCELLED ? (
                        <XCircle className="h-4 w-4 text-error-600" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-success-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-neutral-900">
                        {booking.status === BookingStatus.CONFIRMED && 'Booking Confirmed'}
                        {booking.status === BookingStatus.COMPLETED && 'Booking Completed'}
                        {booking.status === BookingStatus.CANCELLED && 'Booking Cancelled'}
                      </p>
                      <p className="text-sm text-neutral-600">
                        {formatDateTime(booking.updated_at)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Revenue Card */}
          {service && (
            <Card className="border-primary-200 bg-primary-50">
              <CardHeader>
                <h2 className="text-lg font-semibold text-primary-900">Revenue</h2>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-primary-700">Booking Value</p>
                    <p className="text-2xl font-bold text-primary-900 mt-1">
                      ${(service.price / 100).toFixed(2)}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-primary-600" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-neutral-900">Actions</h2>
            </CardHeader>
            <CardContent className="space-y-2">
              {booking.status === BookingStatus.PENDING && (
                <>
                  <Button
                    variant="primary"
                    className="w-full justify-start"
                    onClick={() => handleStatusUpdate(BookingStatus.CONFIRMED)}
                    disabled={updateBooking.isPending}
                  >
                    <CheckCircle className="h-4 w-4" />
                    Confirm Booking
                  </Button>
                  <Button
                    variant="danger"
                    className="w-full justify-start"
                    onClick={() => handleStatusUpdate(BookingStatus.CANCELLED)}
                    disabled={updateBooking.isPending}
                  >
                    <XCircle className="h-4 w-4" />
                    Cancel Booking
                  </Button>
                </>
              )}
              {booking.status === BookingStatus.CONFIRMED && (
                <>
                  <Button
                    variant="primary"
                    className="w-full justify-start"
                    onClick={() => handleStatusUpdate(BookingStatus.COMPLETED)}
                    disabled={updateBooking.isPending}
                  >
                    <CheckCircle className="h-4 w-4" />
                    Mark as Completed
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => router.push(`/dashboard/bookings/${bookingId}/edit`)}
                  >
                    <Edit2 className="h-4 w-4" />
                    Reschedule
                  </Button>
                  <Button
                    variant="danger"
                    className="w-full justify-start"
                    onClick={() => handleStatusUpdate(BookingStatus.CANCELLED)}
                    disabled={updateBooking.isPending}
                  >
                    <XCircle className="h-4 w-4" />
                    Cancel Booking
                  </Button>
                </>
              )}
              <Button
                variant="secondary"
                className="w-full justify-start"
                onClick={handleSendMessage}
              >
                <MessageSquare className="h-4 w-4" />
                Send WhatsApp Message
              </Button>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-neutral-900">Notes</h2>
            </CardHeader>
            <CardContent>
              <textarea
                placeholder="Add internal notes about this booking..."
                rows={4}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <Button variant="secondary" className="mt-2">
                Save Notes
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
