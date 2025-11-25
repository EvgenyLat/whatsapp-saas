/**
 * Booking React Query Hooks
 * WhatsApp SaaS Platform
 *
 * Provides hooks for booking-related operations:
 * - Fetching bookings (list, single, stats)
 * - Creating bookings with optimistic updates
 * - Updating bookings
 * - Deleting bookings
 * - Bulk operations
 *
 * @see https://tanstack.com/query/latest
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/queryKeys';
import { invalidateQueries } from '@/lib/query/mutations';
import { api } from '@/lib/api';
import type {
  Booking,
  GetBookingsParams,
  CreateBookingRequest,
  UpdateBookingRequest,
  BulkUpdateBookingsRequest,
  PaginatedResponse,
} from '@/types';
import type { UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';

/**
 * Fetch all bookings for a salon
 *
 * @param salonId - Salon ID
 * @param params - Optional filter parameters
 * @param options - React Query options
 * @returns Query result with paginated bookings
 *
 * @example
 * ```tsx
 * function BookingList({ salonId }: { salonId: string }) {
 *   const { data, isLoading, error } = useBookings(salonId, {
 *     status: 'CONFIRMED',
 *     page: 1,
 *     limit: 10
 *   });
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <Error message={error.message} />;
 *
 *   return <BookingTable data={data.data} pagination={data.pagination} />;
 * }
 * ```
 */
export function useBookings(
  salonId: string,
  params?: GetBookingsParams,
  options?: Omit<
    UseQueryOptions<PaginatedResponse<Booking>, Error>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: queryKeys.bookings.list(salonId, params || {}),
    queryFn: () => api.bookings.getAll(salonId, params),
    enabled: !!salonId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });
}

/**
 * Fetch a single booking by ID
 *
 * @param salonId - Salon ID
 * @param bookingId - Booking ID
 * @param options - React Query options
 * @returns Query result with booking details
 *
 * @example
 * ```tsx
 * function BookingDetail({ salonId, bookingId }: Props) {
 *   const { data: booking, isLoading } = useBooking(salonId, bookingId);
 *
 *   if (isLoading) return <Spinner />;
 *
 *   return <BookingCard booking={booking} />;
 * }
 * ```
 */
export function useBooking(
  salonId: string,
  bookingId: string,
  options?: Omit<UseQueryOptions<Booking, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.bookings.detail(bookingId),
    queryFn: () => api.bookings.getById(salonId, bookingId),
    enabled: !!salonId && !!bookingId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

/**
 * Fetch booking statistics for a salon
 *
 * @param salonId - Salon ID
 * @param options - React Query options
 * @returns Query result with booking stats
 *
 * @example
 * ```tsx
 * function BookingStats({ salonId }: Props) {
 *   const { data: stats } = useBookingStats(salonId);
 *
 *   return (
 *     <div>
 *       <Stat label="Confirmed" value={stats.CONFIRMED} />
 *       <Stat label="Cancelled" value={stats.CANCELLED} />
 *     </div>
 *   );
 * }
 * ```
 */
export function useBookingStats(
  salonId: string,
  options?: Omit<UseQueryOptions<Record<string, number>, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.bookings.stats(salonId),
    queryFn: () => api.bookings.getStats(salonId),
    enabled: !!salonId,
    staleTime: 1 * 60 * 1000, // 1 minute
    ...options,
  });
}

/**
 * Create a new booking with optimistic updates
 *
 * @param salonId - Salon ID
 * @param options - Mutation options
 * @returns Mutation result
 *
 * @example
 * ```tsx
 * function CreateBookingForm({ salonId }: Props) {
 *   const createBooking = useCreateBooking(salonId);
 *
 *   const handleSubmit = async (data: CreateBookingRequest) => {
 *     try {
 *       await createBooking.mutateAsync(data);
 *       toast.success('Booking created');
 *     } catch (error) {
 *       toast.error('Failed to create booking');
 *     }
 *   };
 *
 *   return <BookingForm onSubmit={handleSubmit} />;
 * }
 * ```
 */
export function useCreateBooking(
  salonId: string,
  options?: UseMutationOptions<Booking, Error, CreateBookingRequest>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBookingRequest) => api.bookings.create(salonId, data),
    onSuccess: async (data, variables, context) => {
      // Invalidate related queries
      await invalidateQueries(queryClient, [
        queryKeys.bookings.lists(),
        queryKeys.bookings.stats(salonId),
        queryKeys.analytics.dashboard(salonId),
      ]);

      // Call user-provided onSuccess
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
}

/**
 * Update a booking with optimistic updates
 *
 * @param salonId - Salon ID
 * @param options - Mutation options
 * @returns Mutation result
 *
 * @example
 * ```tsx
 * function UpdateBookingButton({ salonId, bookingId }: Props) {
 *   const updateBooking = useUpdateBooking(salonId);
 *
 *   const handleUpdate = () => {
 *     updateBooking.mutate({
 *       bookingId,
 *       data: { status: 'COMPLETED' }
 *     });
 *   };
 *
 *   return <Button onClick={handleUpdate}>Complete</Button>;
 * }
 * ```
 */
export function useUpdateBooking(
  salonId: string,
  options?: UseMutationOptions<
    Booking,
    Error,
    { bookingId: string; data: UpdateBookingRequest }
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ bookingId, data }) => api.bookings.update(salonId, bookingId, data),
    onSuccess: async (data, variables, context) => {
      // Invalidate related queries
      await invalidateQueries(queryClient, [
        queryKeys.bookings.lists(),
        queryKeys.bookings.detail(variables.bookingId),
        queryKeys.bookings.stats(salonId),
        queryKeys.analytics.dashboard(salonId),
      ]);

      // Call user-provided onSuccess
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
}

/**
 * Delete a booking with optimistic updates
 *
 * @param salonId - Salon ID
 * @param options - Mutation options
 * @returns Mutation result
 *
 * @example
 * ```tsx
 * function DeleteBookingButton({ salonId, bookingId }: Props) {
 *   const deleteBooking = useDeleteBooking(salonId);
 *
 *   const handleDelete = () => {
 *     if (confirm('Delete this booking?')) {
 *       deleteBooking.mutate(bookingId);
 *     }
 *   };
 *
 *   return <Button onClick={handleDelete} variant="danger">Delete</Button>;
 * }
 * ```
 */
export function useDeleteBooking(
  salonId: string,
  options?: UseMutationOptions<any, Error, string>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bookingId: string) => api.bookings.delete(salonId, bookingId),
    onSuccess: async (data, variables, context) => {
      // Invalidate related queries
      await invalidateQueries(queryClient, [
        queryKeys.bookings.lists(),
        queryKeys.bookings.detail(variables),
        queryKeys.bookings.stats(salonId),
        queryKeys.analytics.dashboard(salonId),
      ]);

      // Call user-provided onSuccess
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
}

/**
 * Bulk update bookings
 *
 * @param salonId - Salon ID
 * @param options - Mutation options
 * @returns Mutation result
 *
 * @example
 * ```tsx
 * function BulkUpdateButton({ salonId, selectedIds }: Props) {
 *   const bulkUpdate = useBulkUpdateBookings(salonId);
 *
 *   const handleBulkUpdate = () => {
 *     bulkUpdate.mutate({
 *       bookingIds: selectedIds,
 *       status: 'COMPLETED'
 *     });
 *   };
 *
 *   return <Button onClick={handleBulkUpdate}>Mark as Completed</Button>;
 * }
 * ```
 */
export function useBulkUpdateBookings(
  salonId: string,
  options?: UseMutationOptions<Booking[], Error, BulkUpdateBookingsRequest>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BulkUpdateBookingsRequest) => api.bookings.bulkUpdate(salonId, data),
    onSuccess: async (data, variables, context) => {
      // Invalidate all booking-related queries
      await invalidateQueries(queryClient, [
        queryKeys.bookings.all,
        queryKeys.analytics.dashboard(salonId),
      ]);

      // Call user-provided onSuccess
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
}
