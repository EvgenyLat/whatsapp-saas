/**
 * React Query Client Configuration
 * WhatsApp SaaS Platform
 *
 * Configures the global QueryClient instance with optimal settings for:
 * - Retry logic with exponential backoff
 * - Cache management (stale time, cache time)
 * - Error and success handling
 * - DevTools integration
 *
 * @see https://tanstack.com/query/latest/docs/reference/QueryClient
 */

import { QueryClient, DefaultOptions, MutationCache, QueryCache } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import type { ApiError } from '@/types';

/**
 * Default query options for all queries
 * These can be overridden on a per-query basis
 */
const queryConfig: DefaultOptions = {
  queries: {
    /**
     * Time in milliseconds before data is considered stale
     * Stale data is still served but triggers a background refetch
     */
    staleTime: 5 * 60 * 1000, // 5 minutes

    /**
     * Time in milliseconds before inactive queries are garbage collected
     */
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)

    /**
     * Number of retry attempts for failed queries
     */
    retry: 3,

    /**
     * Retry delay with exponential backoff
     * 1st retry: 1s, 2nd: 2s, 3rd: 4s
     */
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

    /**
     * Refetch on window focus for real-time data
     */
    refetchOnWindowFocus: true,

    /**
     * Refetch on reconnect after network loss
     */
    refetchOnReconnect: true,

    /**
     * Don't refetch on mount if data is fresh
     */
    refetchOnMount: true,

    /**
     * Network mode - how to handle queries when offline
     */
    networkMode: 'online',

    /**
     * Custom retry logic - don't retry on 4xx errors (client errors)
     */
    retryOnMount: true,
  },

  mutations: {
    /**
     * Number of retry attempts for failed mutations
     * Lower than queries since mutations often can't be safely retried
     */
    retry: 1,

    /**
     * Retry delay for mutations
     */
    retryDelay: 1000,

    /**
     * Network mode for mutations
     */
    networkMode: 'online',
  },
};

/**
 * Global error handler for all queries
 * Logs errors and can trigger notifications/redirects
 *
 * @param error - The error that occurred
 */
function handleQueryError(error: unknown): void {
  const axiosError = error as AxiosError<ApiError>;

  // Log error for debugging
  if (process.env.NODE_ENV === 'development') {
    console.error('[Query Error]', {
      message: axiosError.message,
      status: axiosError.response?.status,
      data: axiosError.response?.data,
    });
  }

  // Handle specific error codes
  if (axiosError.response?.status === 401) {
    // Unauthorized - handled by axios interceptor
    // Could trigger a toast notification here if needed
  } else if (axiosError.response?.status === 403) {
    // Forbidden - user doesn't have permission
    console.warn('[Query] Access forbidden:', axiosError.response.data);
  } else if (axiosError.response?.status === 404) {
    // Not found - resource doesn't exist
    console.warn('[Query] Resource not found:', axiosError.response.data);
  } else if (axiosError.response?.status && axiosError.response.status >= 500) {
    // Server error - could trigger error reporting
    console.error('[Query] Server error:', axiosError.response.data);
  }
}

/**
 * Global error handler for all mutations
 * Similar to query errors but may have different handling logic
 *
 * @param error - The error that occurred
 */
function handleMutationError(error: unknown): void {
  const axiosError = error as AxiosError<ApiError>;

  // Log error for debugging
  if (process.env.NODE_ENV === 'development') {
    console.error('[Mutation Error]', {
      message: axiosError.message,
      status: axiosError.response?.status,
      data: axiosError.response?.data,
    });
  }

  // Could trigger toast notifications here
  // Could integrate with error tracking service (Sentry, etc.)
}

/**
 * Global success handler for mutations
 * Can trigger success notifications or analytics events
 */
function handleMutationSuccess(): void {
  // Could trigger success toast notifications here
  // Could track analytics events here
  if (process.env.NODE_ENV === 'development') {
    console.log('[Mutation] Success');
  }
}

/**
 * Create and configure the React Query client
 * This is a singleton instance used throughout the application
 */
export const queryClient = new QueryClient({
  defaultOptions: queryConfig,

  /**
   * Query cache configuration
   * Handles global query events
   */
  queryCache: new QueryCache({
    onError: handleQueryError,
    onSuccess: (data, query) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Query] Success:', query.queryKey);
      }
    },
  }),

  /**
   * Mutation cache configuration
   * Handles global mutation events
   */
  mutationCache: new MutationCache({
    onError: handleMutationError,
    onSuccess: handleMutationSuccess,
  }),
});

/**
 * Custom retry function that doesn't retry on 4xx errors
 * Use this for queries where client errors shouldn't be retried
 *
 * @param failureCount - Number of times the query has failed
 * @param error - The error that occurred
 * @returns Whether to retry the query
 *
 * @example
 * ```ts
 * useQuery({
 *   queryKey: ['user', id],
 *   queryFn: () => fetchUser(id),
 *   retry: retryOnServerError,
 * })
 * ```
 */
export function retryOnServerError(failureCount: number, error: unknown): boolean {
  const axiosError = error as AxiosError;

  // Don't retry on 4xx errors (client errors)
  if (axiosError.response?.status && axiosError.response.status >= 400 && axiosError.response.status < 500) {
    return false;
  }

  // Retry up to 3 times for other errors
  return failureCount < 3;
}

/**
 * Type guard to check if an error is an Axios error
 *
 * @param error - The error to check
 * @returns True if the error is an AxiosError
 */
export function isAxiosError(error: unknown): error is AxiosError<ApiError> {
  return (error as AxiosError).isAxiosError === true;
}

/**
 * Extract error message from API error response
 * Provides a user-friendly error message
 *
 * @param error - The error to extract the message from
 * @returns User-friendly error message
 *
 * @example
 * ```ts
 * const mutation = useMutation({
 *   onError: (error) => {
 *     const message = getErrorMessage(error);
 *     toast.error(message);
 *   }
 * })
 * ```
 */
export function getErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    // Check for API error response
    if (error.response?.data?.error?.message) {
      return error.response.data.error.message;
    }

    // Check for generic error message
    if (error.response?.data?.message) {
      return error.response.data.message as string;
    }

    // Fallback to status text
    if (error.response?.statusText) {
      return error.response.statusText;
    }
  }

  // Fallback to generic error message
  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred';
}

/**
 * Clear all queries from the cache
 * Useful for logout or when switching tenants
 *
 * @example
 * ```ts
 * function logout() {
 *   clearAllQueries();
 *   // ... other logout logic
 * }
 * ```
 */
export function clearAllQueries(): void {
  queryClient.clear();
}

/**
 * Invalidate all queries for a specific salon
 * Useful when switching between salons
 *
 * @param salonId - The salon ID to invalidate queries for
 *
 * @example
 * ```ts
 * function switchSalon(salonId: string) {
 *   invalidateSalonQueries(salonId);
 *   // ... other logic
 * }
 * ```
 */
export async function invalidateSalonQueries(salonId: string): Promise<void> {
  await queryClient.invalidateQueries({
    predicate: (query) => {
      const queryKey = query.queryKey;
      return Array.isArray(queryKey) && queryKey.some((key) => key === salonId);
    },
  });
}

/**
 * Prefetch query data
 * Useful for prefetching data before navigation
 *
 * @param queryKey - The query key to prefetch
 * @param queryFn - The query function to execute
 *
 * @example
 * ```ts
 * // Prefetch booking details on hover
 * function onBookingHover(bookingId: string) {
 *   prefetchQuery(
 *     queryKeys.bookings.detail(bookingId),
 *     () => api.bookings.getById(bookingId)
 *   );
 * }
 * ```
 */
export async function prefetchQuery<T>(
  queryKey: unknown[],
  queryFn: () => Promise<T>
): Promise<void> {
  await queryClient.prefetchQuery({
    queryKey,
    queryFn,
  });
}
