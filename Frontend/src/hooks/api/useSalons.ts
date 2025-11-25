/**
 * Salon React Query Hooks
 * WhatsApp SaaS Platform
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/queryKeys';
import { invalidateQueries } from '@/lib/query/mutations';
import { api } from '@/lib/api';
import { useCurrentSalonId as useUICurrentSalonId } from '@/stores';
import type {
  Salon,
  GetSalonsParams,
  CreateSalonRequest,
  UpdateSalonRequest,
  PaginatedResponse,
} from '@/types';
import type { UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';

/**
 * Fetch all salons
 * Note: Backend returns array, not paginated response
 */
export function useSalons(
  params?: GetSalonsParams,
  options?: Omit<UseQueryOptions<Salon[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.salons.list(params || {}),
    queryFn: () => api.salons.getAll(params),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * Fetch a single salon by ID
 */
export function useSalon(
  salonId: string,
  options?: Omit<UseQueryOptions<Salon, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.salons.detail(salonId),
    queryFn: () => api.salons.getById(salonId),
    enabled: !!salonId,
    staleTime: 10 * 60 * 1000,
    ...options,
  });
}

/**
 * Get current salon from UI store
 */
export function useCurrentSalon(
  options?: Omit<UseQueryOptions<Salon, Error>, 'queryKey' | 'queryFn'>
) {
  const currentSalonId = useUICurrentSalonId();

  return useQuery({
    queryKey: queryKeys.salons.detail(currentSalonId || ''),
    queryFn: () => api.salons.getById(currentSalonId!),
    enabled: !!currentSalonId,
    staleTime: 10 * 60 * 1000,
    ...options,
  });
}

/**
 * Create a new salon
 */
export function useCreateSalon(
  options?: UseMutationOptions<Salon, Error, CreateSalonRequest>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSalonRequest) => api.salons.create(data),
    onSuccess: async (data, variables, context) => {
      await invalidateQueries(queryClient, [queryKeys.salons.all]);
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
}

/**
 * Update a salon
 */
export function useUpdateSalon(
  salonId: string,
  options?: UseMutationOptions<Salon, Error, UpdateSalonRequest>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateSalonRequest) => api.salons.update(salonId, data),
    onSuccess: async (data, variables, context) => {
      await invalidateQueries(queryClient, [
        queryKeys.salons.lists(),
        queryKeys.salons.detail(salonId),
      ]);
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
}

/**
 * Delete a salon
 */
export function useDeleteSalon(
  options?: UseMutationOptions<any, Error, string>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (salonId: string) => api.salons.delete(salonId),
    onSuccess: async (data, variables, context) => {
      await invalidateQueries(queryClient, [queryKeys.salons.all]);
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
}
