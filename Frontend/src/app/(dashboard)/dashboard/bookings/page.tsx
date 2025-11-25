/**
 * Bookings Page
 * Calendar view with multi-master weekly schedule
 */

'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, Badge, LoadingSpinner, Button } from '@/components/ui';
import { useBookings, useCreateBooking, useDeleteBooking } from '@/hooks/api/useBookings';
import { useMasters } from '@/hooks/api/useMasters';
import { useServices } from '@/hooks/api/useServices';
import { useUpdateBooking } from '@/hooks/api/useBookings';
import { useSalon } from '@/hooks/api/useSalons';
import { formatDateTime, formatPhoneNumber } from '@/lib/utils';
import { Booking, BookingStatus, Master, CreateBookingRequest } from '@/types';
import { Calendar, Filter } from 'lucide-react';
import { useSalonIdSafe } from '@/hooks/useSalonId';
import { WeekView } from '@/components/calendar';
import { QuickBookingModal } from '@/components/bookings/QuickBookingModal';
import { getWeekStart, getWeekDates, formatDateForAPI } from '@/lib/calendar-utils';

export default function BookingsPage() {
  const router = useRouter();
  const salonId = useSalonIdSafe();
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [statusFilter, setStatusFilter] = React.useState<BookingStatus | ''>('');
  const [masterFilter, setMasterFilter] = React.useState<string>('');
  const [serviceFilter, setServiceFilter] = React.useState<string>('');
  const [showFilters, setShowFilters] = React.useState(false);

  // Quick booking modal state
  const [isQuickBookingModalOpen, setIsQuickBookingModalOpen] = React.useState(false);
  const [selectedSlot, setSelectedSlot] = React.useState<{
    time: string;
    date: Date;
    masterId: string;
  } | null>(null);

  // Calculate date range for the current week
  const weekStart = React.useMemo(() => getWeekStart(currentDate), [currentDate]);
  const weekDates = React.useMemo(() => getWeekDates(weekStart), [weekStart]);

  // Format dates as ISO strings for API (YYYY-MM-DDTHH:mm:ss.sssZ)
  const startDate = React.useMemo(() => {
    const date = new Date(weekDates[0]);
    date.setHours(0, 0, 0, 0);
    return date.toISOString();
  }, [weekDates]);

  const endDate = React.useMemo(() => {
    const date = new Date(weekDates[6]);
    date.setHours(23, 59, 59, 999);
    return date.toISOString();
  }, [weekDates]);

  // Fetch salon details for working hours
  const { data: salon, isLoading: isSalonLoading } = useSalon(salonId || '');

  // Fetch bookings for the entire week (max 100 per request)
  const { data, isLoading, error } = useBookings(salonId || '', {
    start_date: startDate,
    end_date: endDate,
    limit: 100, // Backend max limit per request
    status: (statusFilter || undefined) as BookingStatus | undefined,
    master_id: masterFilter || undefined,
    service_id: serviceFilter || undefined,
  });

  // Fetch masters and services for filters
  const { data: mastersData } = useMasters(salonId || '', { is_active: true });
  const { data: servicesData } = useServices({ is_active: true });

  const updateBooking = useUpdateBooking(salonId || '');
  const createBooking = useCreateBooking(salonId || '');
  const deleteBooking = useDeleteBooking(salonId || '');

  // Handle booking move via drag-and-drop
  const handleBookingMove = async (
    booking: Booking,
    newTime: string,
    newDate: Date,
    newMasterId: string
  ) => {
    try {
      // Create new start time by combining date and time
      const [hours, minutes] = newTime.split(':').map(Number);
      const newStartDate = new Date(newDate);
      newStartDate.setHours(hours, minutes, 0, 0);

      // Calculate duration if we have end time
      let duration = 30; // default 30 minutes
      if (booking.end_ts && booking.start_ts) {
        const oldStart = new Date(booking.start_ts);
        const oldEnd = new Date(booking.end_ts);
        duration = (oldEnd.getTime() - oldStart.getTime()) / (1000 * 60);
      }

      // Calculate new end time
      const newEndDate = new Date(newStartDate);
      newEndDate.setMinutes(newEndDate.getMinutes() + duration);

      await updateBooking.mutateAsync({
        bookingId: booking.id,
        data: {
          start_ts: newStartDate.toISOString(),
          end_ts: newEndDate.toISOString(),
          master_id: newMasterId,
        },
      });
    } catch (error) {
      console.error('Failed to move booking:', error);
    }
  };

  // Handle slot click to open quick booking modal
  const handleSlotClick = (time: string, date: Date, masterId: string) => {
    setSelectedSlot({ time, date, masterId });
    setIsQuickBookingModalOpen(true);
  };

  // Handle quick booking submission
  const handleQuickBookingSubmit = async (data: {
    customer_name: string;
    customer_phone: string;
    service_id: string;
    master_id: string;
    date: Date;
    time: string;
  }) => {
    if (!salonId) return;

    try {
      // Get the selected service to get its name and duration
      const selectedService = servicesData?.data?.find((s) => s.id === data.service_id);
      if (!selectedService) {
        console.error('Service not found');
        return;
      }

      // Combine date and time into ISO timestamp
      const [hours, minutes] = data.time.split(':').map(Number);
      const appointmentDateTime = new Date(data.date);
      appointmentDateTime.setHours(hours, minutes, 0, 0);

      const requestData: CreateBookingRequest = {
        salon_id: salonId,
        customer_phone: data.customer_phone,
        customer_name: data.customer_name,
        service_id: data.service_id,
        master_id: data.master_id,
        start_ts: appointmentDateTime.toISOString(),
        service: selectedService.name,
      };

      await createBooking.mutateAsync(requestData);
      setIsQuickBookingModalOpen(false);
      setSelectedSlot(null);
    } catch (error) {
      console.error('Failed to create booking:', error);
    }
  };

  // Handle booking deletion
  const handleBookingDelete = async (booking: Booking) => {
    try {
      await deleteBooking.mutateAsync(booking.id);
    } catch (error) {
      console.error('Failed to delete booking:', error);
    }
  };

  // Create lookup maps for master and service names
  const masterLookup = React.useMemo(() => {
    if (!mastersData?.data) return new Map();
    return new Map(mastersData.data.map((m) => [m.id, m.name]));
  }, [mastersData]);

  const serviceLookup = React.useMemo(() => {
    if (!servicesData?.data) return new Map();
    return new Map(servicesData.data.map((s) => [s.id, s.name]));
  }, [servicesData]);

  const activeFiltersCount = [statusFilter, masterFilter, serviceFilter].filter(
    (f) => f !== ''
  ).length;

  const clearAllFilters = () => {
    setStatusFilter('');
    setMasterFilter('');
    setServiceFilter('');
  };

  const bookings = data?.data || [];
  const masters = mastersData?.data || [];

  // Show loading spinner while fetching salon or bookings
  if (isLoading || isSalonLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner label="Loading calendar..." />
      </div>
    );
  }

  // Show error if bookings failed to load
  if (error) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <p className="text-error-600 font-medium">Failed to load bookings</p>
            <p className="mt-2 text-sm text-neutral-500">Please try refreshing the page</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If no salon data or missing working hours, show message
  if (!salon || !salon.working_hours_start || !salon.working_hours_end) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <p className="text-warning-600 font-medium">Salon working hours not configured</p>
            <p className="mt-2 text-sm text-neutral-500">
              Please configure working hours in salon settings to use the calendar view
            </p>
            <Button
              variant="primary"
              className="mt-4"
              onClick={() => router.push('/dashboard/salon')}
            >
              Go to Salon Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Schedule</h1>
          <p className="mt-2 text-neutral-600">Weekly calendar view of all appointments</p>
        </div>
        <Button variant="primary" onClick={() => router.push('/dashboard/bookings/new')}>
          <Calendar className="h-4 w-4" />
          New Booking
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Filter Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-neutral-600" />
                <span className="text-sm font-medium text-neutral-700">Filters</span>
                {activeFiltersCount > 0 && (
                  <Badge variant="primary" className="text-xs">
                    {activeFiltersCount}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {activeFiltersCount > 0 && (
                  <Button variant="ghost" onClick={clearAllFilters}>
                    Clear All
                  </Button>
                )}
                <Button variant="ghost" onClick={() => setShowFilters(!showFilters)}>
                  {showFilters ? 'Hide Filters' : 'Show Filters'}
                </Button>
              </div>
            </div>

            {/* Quick Status Filters (Always Visible) */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setStatusFilter('')}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  statusFilter === ''
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter(BookingStatus.PENDING)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  statusFilter === BookingStatus.PENDING
                    ? 'bg-warning-100 text-warning-700'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setStatusFilter(BookingStatus.CONFIRMED)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  statusFilter === BookingStatus.CONFIRMED
                    ? 'bg-success-100 text-success-700'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                Confirmed
              </button>
              <button
                onClick={() => setStatusFilter(BookingStatus.COMPLETED)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  statusFilter === BookingStatus.COMPLETED
                    ? 'bg-neutral-200 text-neutral-800'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                Completed
              </button>
              <button
                onClick={() => setStatusFilter(BookingStatus.CANCELLED)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  statusFilter === BookingStatus.CANCELLED
                    ? 'bg-error-100 text-error-700'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                Cancelled
              </button>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="grid gap-4 sm:grid-cols-2 pt-4 border-t border-neutral-200">
                {/* Master Filter */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Filter by Staff Member
                  </label>
                  <select
                    value={masterFilter}
                    onChange={(e) => setMasterFilter(e.target.value)}
                    className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  >
                    <option value="">All Staff</option>
                    {mastersData?.data?.map((master) => (
                      <option key={master.id} value={master.id}>
                        {master.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Service Filter */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Filter by Service
                  </label>
                  <select
                    value={serviceFilter}
                    onChange={(e) => setServiceFilter(e.target.value)}
                    className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  >
                    <option value="">All Services</option>
                    {servicesData?.data?.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Calendar View */}
      <Card className="h-[calc(100vh-280px)]">
        <WeekView
          salon={salon}
          masters={masters}
          bookings={bookings}
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          onBookingMove={handleBookingMove}
          onBookingClick={(booking) => router.push(`/dashboard/bookings/${booking.id}`)}
          onSlotClick={handleSlotClick}
          onBookingDelete={handleBookingDelete}
          serviceLookup={serviceLookup}
          masterLookup={masterLookup}
        />
      </Card>

      {/* Quick Booking Modal */}
      {selectedSlot && (
        <QuickBookingModal
          isOpen={isQuickBookingModalOpen}
          onClose={() => {
            setIsQuickBookingModalOpen(false);
            setSelectedSlot(null);
          }}
          salonId={salonId || ''}
          master={masters.find((m) => m.id === selectedSlot.masterId)!}
          date={selectedSlot.date}
          time={selectedSlot.time}
          onSubmit={handleQuickBookingSubmit}
          isLoading={createBooking.isPending}
        />
      )}
    </div>
  );
}
