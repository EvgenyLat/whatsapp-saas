/**
 * useBookings Hook
 * React Query hook for fetching bookings
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingsApi } from '@/lib/api';
import type { Booking, PaginatedResponse } from '@/types';
import { BookingStatus } from '@/types';

interface UseBookingsParams {
  salonId: string;
  page?: number;
  limit?: number;
  status?: BookingStatus;
  startDate?: string;
  endDate?: string;
}

export function useBookings(params: UseBookingsParams) {
  return useQuery<PaginatedResponse<Booking>>({
    queryKey: ['bookings', params],
    queryFn: () => bookingsApi.getAll(params.salonId, params),
    enabled: !!params.salonId,
  });
}

export function useBooking(salonId: string, bookingId: string) {
  return useQuery<Booking>({
    queryKey: ['booking', salonId, bookingId],
    queryFn: () => bookingsApi.getById(salonId, bookingId),
    enabled: !!salonId && !!bookingId,
  });
}

export function useUpdateBookingStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      salonId,
      bookingId,
      status,
    }: {
      salonId: string;
      bookingId: string;
      status: BookingStatus;
    }) => bookingsApi.update(salonId, bookingId, { status }),
    onSuccess: () => {
      // Invalidate bookings queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ salonId, bookingId }: { salonId: string; bookingId: string }) =>
      bookingsApi.update(salonId, bookingId, { status: BookingStatus.CANCELLED }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}
