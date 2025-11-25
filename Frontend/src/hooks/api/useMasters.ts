/**
 * Master React Query Hooks
 * WhatsApp SaaS Platform
 *
 * Provides hooks for master/staff-related operations:
 * - Fetching masters (list, single, availability, schedule)
 * - Creating masters with optimistic updates
 * - Updating masters
 * - Deleting masters
 *
 * @see https://tanstack.com/query/latest
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/queryKeys';
import { invalidateQueries } from '@/lib/query/mutations';
import { api } from '@/lib/api';
import type {
  Master,
  MasterListItem,
  MasterAvailability,
  MasterScheduleItem,
  GetMastersParams,
  CreateMasterRequest,
  UpdateMasterRequest,
  GetMasterAvailabilityParams,
  GetMasterScheduleParams,
  PaginatedResponse,
} from '@/types';
import type { UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';

/**
 * Fetch all masters for a salon
 *
 * @param salonId - Salon ID
 * @param params - Optional filter parameters
 * @param options - React Query options
 * @returns Query result with paginated masters
 *
 * @example
 * ```tsx
 * function MasterList({ salonId }: { salonId: string }) {
 *   const { data, isLoading, error } = useMasters(salonId, {
 *     specialization: 'HAIRSTYLIST',
 *     is_active: true,
 *     page: 1,
 *     limit: 10
 *   });
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <Error message={error.message} />;
 *
 *   return <MasterTable data={data.data} pagination={data.pagination} />;
 * }
 * ```
 */
export function useMasters(
  salonId: string,
  params?: GetMastersParams,
  options?: Omit<
    UseQueryOptions<PaginatedResponse<MasterListItem>, Error>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: queryKeys.masters.list(salonId, params || {}),
    queryFn: () => api.masters.list(salonId, params),
    enabled: !!salonId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });
}

/**
 * Fetch a single master by ID
 *
 * @param salonId - Salon ID
 * @param masterId - Master ID
 * @param options - React Query options
 * @returns Query result with master details
 *
 * @example
 * ```tsx
 * function MasterDetail({ salonId, masterId }: Props) {
 *   const { data: master, isLoading } = useMaster(salonId, masterId);
 *
 *   if (isLoading) return <Spinner />;
 *
 *   return <MasterCard master={master} />;
 * }
 * ```
 */
export function useMaster(
  salonId: string,
  masterId: string,
  options?: Omit<UseQueryOptions<Master, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.masters.detail(masterId),
    queryFn: () => api.masters.getById(salonId, masterId),
    enabled: !!salonId && !!masterId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

/**
 * Fetch master availability for a specific date
 *
 * @param salonId - Salon ID
 * @param masterId - Master ID
 * @param params - Availability parameters (date, duration)
 * @param options - React Query options
 * @returns Query result with availability slots
 *
 * @example
 * ```tsx
 * function MasterAvailabilityView({ salonId, masterId, date }: Props) {
 *   const { data } = useMasterAvailability(salonId, masterId, {
 *     date: '2024-01-15',
 *     duration: 60
 *   });
 *
 *   return (
 *     <div>
 *       <h3>Available Slots</h3>
 *       {data?.available_slots.map(slot => (
 *         <TimeSlot key={`${slot.start}-${slot.end}`} slot={slot} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useMasterAvailability(
  salonId: string,
  masterId: string,
  params: GetMasterAvailabilityParams,
  options?: Omit<UseQueryOptions<MasterAvailability, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.masters.availability(masterId, params),
    queryFn: () => api.masters.getAvailability(salonId, masterId, params),
    enabled: !!salonId && !!masterId && !!params.date,
    staleTime: 1 * 60 * 1000, // 1 minute
    ...options,
  });
}

/**
 * Fetch master schedule for a date range
 *
 * @param salonId - Salon ID
 * @param masterId - Master ID
 * @param params - Schedule parameters (date range, include bookings)
 * @param options - React Query options
 * @returns Query result with schedule items
 *
 * @example
 * ```tsx
 * function MasterScheduleView({ salonId, masterId }: Props) {
 *   const { data: schedule } = useMasterSchedule(salonId, masterId, {
 *     startDate: '2024-01-01',
 *     endDate: '2024-01-31',
 *     includeBookings: true
 *   });
 *
 *   return <ScheduleCalendar schedule={schedule} />;
 * }
 * ```
 */
export function useMasterSchedule(
  salonId: string,
  masterId: string,
  params?: GetMasterScheduleParams,
  options?: Omit<UseQueryOptions<MasterScheduleItem[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.masters.schedule(masterId, params || {}),
    queryFn: () => api.masters.getSchedule(salonId, masterId, params),
    enabled: !!salonId && !!masterId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });
}

/**
 * Create a new master with optimistic updates
 *
 * @param salonId - Salon ID
 * @param options - Mutation options
 * @returns Mutation result
 *
 * @example
 * ```tsx
 * function CreateMasterForm({ salonId }: Props) {
 *   const createMaster = useCreateMaster(salonId);
 *
 *   const handleSubmit = async (data: CreateMasterRequest) => {
 *     try {
 *       await createMaster.mutateAsync(data);
 *       toast.success('Master created');
 *     } catch (error) {
 *       toast.error('Failed to create master');
 *     }
 *   };
 *
 *   return <MasterForm onSubmit={handleSubmit} />;
 * }
 * ```
 */
export function useCreateMaster(
  salonId: string,
  options?: UseMutationOptions<Master, Error, CreateMasterRequest>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMasterRequest) => api.masters.create(salonId, data),
    onSuccess: async (data, variables, context) => {
      // Invalidate related queries
      await invalidateQueries(queryClient, [
        queryKeys.masters.lists(),
        queryKeys.analytics.dashboard(salonId),
      ]);

      // Call user-provided onSuccess
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
}

/**
 * Update a master with optimistic updates
 *
 * @param salonId - Salon ID
 * @param options - Mutation options
 * @returns Mutation result
 *
 * @example
 * ```tsx
 * function UpdateMasterButton({ salonId, masterId }: Props) {
 *   const updateMaster = useUpdateMaster(salonId);
 *
 *   const handleUpdate = () => {
 *     updateMaster.mutate({
 *       masterId,
 *       data: { is_active: true }
 *     });
 *   };
 *
 *   return <Button onClick={handleUpdate}>Activate</Button>;
 * }
 * ```
 */
export function useUpdateMaster(
  salonId: string,
  options?: UseMutationOptions<
    Master,
    Error,
    { masterId: string; data: UpdateMasterRequest }
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ masterId, data }) => api.masters.update(salonId, masterId, data),
    onSuccess: async (data, variables, context) => {
      // Invalidate related queries
      await invalidateQueries(queryClient, [
        queryKeys.masters.lists(),
        queryKeys.masters.detail(variables.masterId),
        queryKeys.analytics.dashboard(salonId),
      ]);

      // Call user-provided onSuccess
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
}

/**
 * Delete a master with optimistic updates
 *
 * @param salonId - Salon ID
 * @param options - Mutation options
 * @returns Mutation result
 *
 * @example
 * ```tsx
 * function DeleteMasterButton({ salonId, masterId }: Props) {
 *   const deleteMaster = useDeleteMaster(salonId);
 *
 *   const handleDelete = () => {
 *     if (confirm('Delete this master?')) {
 *       deleteMaster.mutate(masterId);
 *     }
 *   };
 *
 *   return <Button onClick={handleDelete} variant="danger">Delete</Button>;
 * }
 * ```
 */
export function useDeleteMaster(
  salonId: string,
  options?: UseMutationOptions<any, Error, string>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (masterId: string) => api.masters.delete(salonId, masterId),
    onSuccess: async (data, variables, context) => {
      // Invalidate related queries
      await invalidateQueries(queryClient, [
        queryKeys.masters.lists(),
        queryKeys.masters.detail(variables),
        queryKeys.analytics.dashboard(salonId),
      ]);

      // Call user-provided onSuccess
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
}

/**
 * Update booking status mutation (shorthand)
 *
 * @param salonId - Salon ID
 * @param options - Mutation options
 * @returns Mutation result
 */
export function useUpdateMasterStatus(salonId: string) {
  return useUpdateMaster(salonId);
}
