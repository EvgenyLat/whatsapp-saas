/**
 * React Query Library
 * WhatsApp SaaS Platform
 *
 * Centralized exports for all React Query utilities
 */

// Query client and configuration
export {
  queryClient,
  retryOnServerError,
  isAxiosError,
  getErrorMessage,
  clearAllQueries,
  invalidateSalonQueries,
  prefetchQuery,
} from './queryClient';

// Query keys factory
export { queryKeys, createQueryKey } from './queryKeys';
export type { QueryKeys, ExtractQueryKey } from './queryKeys';

// Mutation helpers
export {
  createOptimisticUpdate,
  createOptimisticPaginatedUpdate,
  createOptimisticAdd,
  createOptimisticUpdateItem,
  createOptimisticDelete,
  invalidateQueries,
  refetchQueries,
  updateQueryData,
  removeQuery,
  setQueryData,
} from './mutations';
export type { OptimisticContext, OptimisticUpdateOptions } from './mutations';
