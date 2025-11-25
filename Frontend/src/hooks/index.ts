/**
 * Custom Hooks
 * WhatsApp SaaS Platform
 *
 * Centralized exports for all custom hooks
 */

// API hooks
export * from './api';

// Utility hooks
export { useDebounce, useDebounceCallback } from './useDebounce';
export { useLocalStorage, useLocalStorageExists } from './useLocalStorage';
export {
  useMediaQuery,
  useIsMobile,
  useIsTablet,
  useIsDesktop,
  useIsSmallScreen,
  useIsMediumScreen,
  useIsLargeScreen,
  useIsExtraLargeScreen,
  usePrefersDarkMode,
  usePrefersReducedMotion,
  useBreakpoint,
} from './useMediaQuery';
export { usePagination, usePaginationRange } from './usePagination';
export {
  useIntersectionObserver,
  useInfiniteScroll,
  useLazyLoad,
  useIsInViewport,
} from './useIntersectionObserver';
export type { UseIntersectionObserverOptions } from './useIntersectionObserver';
export type { UsePaginationReturn, UsePaginationOptions } from './usePagination';

// Authentication and authorization hooks
export { useAuth } from './useAuth';
export { useSalonId } from './useSalonId';

// Debounced value hook
export { useDebouncedValue } from './useDebouncedValue';

// Legacy hooks (kept for compatibility)
export {
  useBookings as useLegacyBookings,
  useBooking as useLegacyBooking,
  useUpdateBookingStatus,
  useCancelBooking,
} from './useBookings';
export { useStats } from './useStats';
