/**
 * React Query Mutation Helpers
 * WhatsApp SaaS Platform
 *
 * Provides reusable mutation patterns for:
 * - Optimistic updates
 * - Cache invalidation
 * - Error rollback
 * - Success handling
 *
 * @see https://tanstack.com/query/latest/docs/guides/optimistic-updates
 */

import { QueryClient } from '@tanstack/react-query';
import type { QueryKey, InfiniteData } from '@tanstack/react-query';
import type { PaginatedResponse } from '@/types';

/**
 * Context for optimistic updates
 * Stores previous data for rollback on error
 */
export interface OptimisticContext<T = unknown> {
  /** Previous data before the optimistic update */
  previousData?: T;
  /** Snapshot timestamp */
  timestamp: number;
}

/**
 * Options for optimistic update mutations
 */
export interface OptimisticUpdateOptions<TData, TVariables> {
  /** Query client instance */
  queryClient: QueryClient;
  /** Query key to update */
  queryKey: QueryKey;
  /** Function to update the cached data */
  updateFn: (oldData: TData | undefined, variables: TVariables) => TData;
}

/**
 * Create optimistic update handlers for mutations
 * Handles the full lifecycle: update, error rollback, success invalidation
 *
 * @param options - Configuration for optimistic updates
 * @returns Mutation callbacks (onMutate, onError, onSettled)
 *
 * @example
 * ```ts
 * const mutation = useMutation({
 *   mutationFn: createBooking,
 *   ...createOptimisticUpdate({
 *     queryClient,
 *     queryKey: queryKeys.bookings.list(salonId),
 *     updateFn: (old, newBooking) => ({
 *       ...old,
 *       data: [...(old?.data || []), newBooking]
 *     })
 *   })
 * })
 * ```
 */
export function createOptimisticUpdate<TData, TVariables>({
  queryClient,
  queryKey,
  updateFn,
}: OptimisticUpdateOptions<TData, TVariables>) {
  return {
    /**
     * Before mutation - apply optimistic update
     */
    onMutate: async (variables: TVariables): Promise<OptimisticContext<TData>> => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData<TData>(queryKey);

      // Optimistically update the cache
      if (previousData !== undefined) {
        queryClient.setQueryData<TData>(queryKey, updateFn(previousData, variables));
      }

      // Return context with previous data for rollback
      return {
        previousData,
        timestamp: Date.now(),
      };
    },

    /**
     * On error - rollback to previous data
     */
    onError: (
      _error: unknown,
      _variables: TVariables,
      context: OptimisticContext<TData> | undefined
    ) => {
      if (context?.previousData !== undefined) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },

    /**
     * On settled (success or error) - refetch to ensure data consistency
     */
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey });
    },
  };
}

/**
 * Create optimistic update for paginated data
 * Handles PaginatedResponse structure
 *
 * @param options - Configuration for optimistic updates
 * @returns Mutation callbacks
 *
 * @example
 * ```ts
 * const mutation = useMutation({
 *   mutationFn: createBooking,
 *   ...createOptimisticPaginatedUpdate({
 *     queryClient,
 *     queryKey: queryKeys.bookings.list(salonId),
 *     updateFn: (old, newBooking) => ({
 *       ...old,
 *       data: [newBooking, ...old.data],
 *       pagination: {
 *         ...old.pagination,
 *         total: old.pagination.total + 1
 *       }
 *     })
 *   })
 * })
 * ```
 */
export function createOptimisticPaginatedUpdate<TItem, TVariables>({
  queryClient,
  queryKey,
  updateFn,
}: OptimisticUpdateOptions<PaginatedResponse<TItem>, TVariables>) {
  return createOptimisticUpdate<PaginatedResponse<TItem>, TVariables>({
    queryClient,
    queryKey,
    updateFn,
  });
}

/**
 * Create optimistic add item to list
 * Adds a new item to the beginning of a paginated list
 *
 * @param options - Configuration
 * @returns Mutation callbacks
 *
 * @example
 * ```ts
 * const createMutation = useMutation({
 *   mutationFn: api.bookings.create,
 *   ...createOptimisticAdd({
 *     queryClient,
 *     queryKey: queryKeys.bookings.list(salonId)
 *   })
 * })
 * ```
 */
export function createOptimisticAdd<TItem>({
  queryClient,
  queryKey,
}: {
  queryClient: QueryClient;
  queryKey: QueryKey;
}) {
  return createOptimisticPaginatedUpdate<TItem, TItem>({
    queryClient,
    queryKey,
    updateFn: (oldData, newItem) => {
      if (!oldData) {
        return {
          success: true,
          data: [newItem],
          pagination: {
            page: 1,
            limit: 10,
            total: 1,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          },
          timestamp: new Date().toISOString(),
        };
      }

      return {
        ...oldData,
        data: [newItem, ...oldData.data],
        pagination: {
          ...oldData.pagination,
          total: oldData.pagination.total + 1,
        },
      };
    },
  });
}

/**
 * Create optimistic update for a single item in a list
 * Updates an existing item by matching its ID
 *
 * @param options - Configuration
 * @returns Mutation callbacks
 *
 * @example
 * ```ts
 * const updateMutation = useMutation({
 *   mutationFn: api.bookings.update,
 *   ...createOptimisticUpdate({
 *     queryClient,
 *     queryKey: queryKeys.bookings.list(salonId)
 *   })
 * })
 * ```
 */
export function createOptimisticUpdateItem<TItem extends { id: string }>({
  queryClient,
  queryKey,
}: {
  queryClient: QueryClient;
  queryKey: QueryKey;
}) {
  return createOptimisticPaginatedUpdate<TItem, TItem>({
    queryClient,
    queryKey,
    updateFn: (oldData, updatedItem) => {
      if (!oldData) return oldData as unknown as PaginatedResponse<TItem>;

      return {
        ...oldData,
        data: oldData.data.map((item) =>
          item.id === updatedItem.id ? updatedItem : item
        ),
      };
    },
  });
}

/**
 * Create optimistic delete from list
 * Removes an item from a paginated list
 *
 * @param options - Configuration
 * @returns Mutation callbacks
 *
 * @example
 * ```ts
 * const deleteMutation = useMutation({
 *   mutationFn: api.bookings.delete,
 *   ...createOptimisticDelete({
 *     queryClient,
 *     queryKey: queryKeys.bookings.list(salonId)
 *   })
 * })
 * ```
 */
export function createOptimisticDelete<TItem extends { id: string }>({
  queryClient,
  queryKey,
}: {
  queryClient: QueryClient;
  queryKey: QueryKey;
}) {
  return createOptimisticPaginatedUpdate<TItem, string>({
    queryClient,
    queryKey,
    updateFn: (oldData, itemId) => {
      if (!oldData) return oldData as unknown as PaginatedResponse<TItem>;

      return {
        ...oldData,
        data: oldData.data.filter((item) => item.id !== itemId),
        pagination: {
          ...oldData.pagination,
          total: oldData.pagination.total - 1,
        },
      };
    },
  });
}

/**
 * Invalidate related queries after a mutation
 * Helper to invalidate multiple query keys at once
 *
 * @param queryClient - Query client instance
 * @param queryKeys - Array of query keys to invalidate
 *
 * @example
 * ```ts
 * const mutation = useMutation({
 *   mutationFn: createBooking,
 *   onSuccess: () => {
 *     invalidateQueries(queryClient, [
 *       queryKeys.bookings.lists(),
 *       queryKeys.analytics.dashboard(salonId)
 *     ])
 *   }
 * })
 * ```
 */
export async function invalidateQueries(
  queryClient: QueryClient,
  queryKeys: QueryKey[]
): Promise<void> {
  await Promise.all(
    queryKeys.map((queryKey) =>
      queryClient.invalidateQueries({ queryKey })
    )
  );
}

/**
 * Refetch specific queries after a mutation
 * More aggressive than invalidation - forces immediate refetch
 *
 * @param queryClient - Query client instance
 * @param queryKeys - Array of query keys to refetch
 *
 * @example
 * ```ts
 * const mutation = useMutation({
 *   mutationFn: updateSalonSettings,
 *   onSuccess: () => {
 *     refetchQueries(queryClient, [
 *       queryKeys.salons.detail(salonId)
 *     ])
 *   }
 * })
 * ```
 */
export async function refetchQueries(
  queryClient: QueryClient,
  queryKeys: QueryKey[]
): Promise<void> {
  await Promise.all(
    queryKeys.map((queryKey) =>
      queryClient.refetchQueries({ queryKey })
    )
  );
}

/**
 * Update query data imperatively
 * Useful for updating cache after a mutation without refetching
 *
 * @param queryClient - Query client instance
 * @param queryKey - Query key to update
 * @param updater - Function to update the data
 *
 * @example
 * ```ts
 * const mutation = useMutation({
 *   mutationFn: updateBookingStatus,
 *   onSuccess: (data) => {
 *     updateQueryData(
 *       queryClient,
 *       queryKeys.bookings.detail(bookingId),
 *       (old) => ({ ...old, status: data.status })
 *     )
 *   }
 * })
 * ```
 */
export function updateQueryData<TData>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  updater: (oldData: TData | undefined) => TData
): void {
  queryClient.setQueryData<TData>(queryKey, (oldData) => {
    return updater(oldData);
  });
}

/**
 * Remove query from cache
 * Useful for cleanup after delete operations
 *
 * @param queryClient - Query client instance
 * @param queryKey - Query key to remove
 *
 * @example
 * ```ts
 * const deleteMutation = useMutation({
 *   mutationFn: deleteBooking,
 *   onSuccess: () => {
 *     removeQuery(queryClient, queryKeys.bookings.detail(bookingId))
 *   }
 * })
 * ```
 */
export function removeQuery(queryClient: QueryClient, queryKey: QueryKey): void {
  queryClient.removeQueries({ queryKey });
}

/**
 * Set query data imperatively
 * Useful for seeding cache with data from a mutation
 *
 * @param queryClient - Query client instance
 * @param queryKey - Query key to set
 * @param data - Data to set
 *
 * @example
 * ```ts
 * const createMutation = useMutation({
 *   mutationFn: createBooking,
 *   onSuccess: (data) => {
 *     // Seed detail cache with created booking
 *     setQueryData(
 *       queryClient,
 *       queryKeys.bookings.detail(data.id),
 *       data
 *     )
 *   }
 * })
 * ```
 */
export function setQueryData<TData>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  data: TData
): void {
  queryClient.setQueryData(queryKey, data);
}
