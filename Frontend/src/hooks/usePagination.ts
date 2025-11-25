/**
 * Pagination Hook
 * WhatsApp SaaS Platform
 *
 * Helper hook for managing pagination state
 */

import { useState, useMemo, useCallback } from 'react';

/**
 * Pagination state and helpers
 */
export interface UsePaginationReturn {
  /** Current page (1-indexed) */
  page: number;
  /** Items per page */
  limit: number;
  /** Total items */
  totalItems: number;
  /** Total pages */
  totalPages: number;
  /** Whether there is a next page */
  hasNext: boolean;
  /** Whether there is a previous page */
  hasPrev: boolean;
  /** Start index of current page items (0-indexed) */
  startIndex: number;
  /** End index of current page items (0-indexed) */
  endIndex: number;
  /** Go to specific page */
  goToPage: (page: number) => void;
  /** Go to next page */
  nextPage: () => void;
  /** Go to previous page */
  prevPage: () => void;
  /** Go to first page */
  firstPage: () => void;
  /** Go to last page */
  lastPage: () => void;
  /** Set items per page */
  setLimit: (limit: number) => void;
  /** Reset pagination */
  reset: () => void;
}

/**
 * Options for usePagination hook
 */
export interface UsePaginationOptions {
  /** Initial page (default: 1) */
  initialPage?: number;
  /** Initial items per page (default: 10) */
  initialLimit?: number;
  /** Callback when page changes */
  onPageChange?: (page: number) => void;
  /** Callback when limit changes */
  onLimitChange?: (limit: number) => void;
}

/**
 * Hook to manage pagination state
 *
 * @param totalItems - Total number of items
 * @param options - Pagination options
 * @returns Pagination state and helpers
 *
 * @example
 * ```tsx
 * function BookingList() {
 *   const { data } = useBookings(salonId);
 *   const pagination = usePagination(data?.pagination.total || 0, {
 *     initialLimit: 20,
 *     onPageChange: (page) => {
 *       console.log('Page changed to:', page);
 *     }
 *   });
 *
 *   return (
 *     <div>
 *       <BookingTable items={data?.data} />
 *       <Pagination
 *         page={pagination.page}
 *         totalPages={pagination.totalPages}
 *         onNext={pagination.nextPage}
 *         onPrev={pagination.prevPage}
 *       />
 *     </div>
 *   );
 * }
 * ```
 */
export function usePagination(
  totalItems: number,
  options: UsePaginationOptions = {}
): UsePaginationReturn {
  const {
    initialPage = 1,
    initialLimit = 10,
    onPageChange,
    onLimitChange,
  } = options;

  const [page, setPage] = useState<number>(initialPage);
  const [limit, setLimit] = useState<number>(initialLimit);

  // Calculate derived values
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(totalItems / limit));
  }, [totalItems, limit]);

  const hasNext = useMemo(() => {
    return page < totalPages;
  }, [page, totalPages]);

  const hasPrev = useMemo(() => {
    return page > 1;
  }, [page]);

  const startIndex = useMemo(() => {
    return (page - 1) * limit;
  }, [page, limit]);

  const endIndex = useMemo(() => {
    return Math.min(startIndex + limit - 1, totalItems - 1);
  }, [startIndex, limit, totalItems]);

  // Page navigation functions
  const goToPage = useCallback(
    (newPage: number) => {
      const validPage = Math.max(1, Math.min(newPage, totalPages));
      setPage(validPage);
      onPageChange?.(validPage);
    },
    [totalPages, onPageChange]
  );

  const nextPage = useCallback(() => {
    if (hasNext) {
      goToPage(page + 1);
    }
  }, [hasNext, page, goToPage]);

  const prevPage = useCallback(() => {
    if (hasPrev) {
      goToPage(page - 1);
    }
  }, [hasPrev, page, goToPage]);

  const firstPage = useCallback(() => {
    goToPage(1);
  }, [goToPage]);

  const lastPage = useCallback(() => {
    goToPage(totalPages);
  }, [totalPages, goToPage]);

  const handleSetLimit = useCallback(
    (newLimit: number) => {
      setLimit(newLimit);
      setPage(1); // Reset to first page when changing limit
      onLimitChange?.(newLimit);
      onPageChange?.(1);
    },
    [onLimitChange, onPageChange]
  );

  const reset = useCallback(() => {
    setPage(initialPage);
    setLimit(initialLimit);
  }, [initialPage, initialLimit]);

  return {
    page,
    limit,
    totalItems,
    totalPages,
    hasNext,
    hasPrev,
    startIndex,
    endIndex,
    goToPage,
    nextPage,
    prevPage,
    firstPage,
    lastPage,
    setLimit: handleSetLimit,
    reset,
  };
}

/**
 * Generate page numbers for pagination UI
 *
 * @param currentPage - Current page number
 * @param totalPages - Total number of pages
 * @param maxVisible - Maximum number of page buttons to show (default: 7)
 * @returns Array of page numbers (or null for ellipsis)
 *
 * @example
 * ```tsx
 * function PaginationButtons({ page, totalPages }: Props) {
 *   const pages = usePaginationRange(page, totalPages, 5);
 *
 *   return (
 *     <div>
 *       {pages.map((p, i) =>
 *         p === null ? (
 *           <span key={i}>...</span>
 *         ) : (
 *           <button key={p}>{p}</button>
 *         )
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function usePaginationRange(
  currentPage: number,
  totalPages: number,
  maxVisible: number = 7
): (number | null)[] {
  return useMemo(() => {
    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const halfVisible = Math.floor((maxVisible - 2) / 2);
    const pages: (number | null)[] = [];

    // Always show first page
    pages.push(1);

    if (currentPage <= halfVisible + 2) {
      // Near the start
      for (let i = 2; i <= maxVisible - 1; i++) {
        pages.push(i);
      }
      pages.push(null); // Ellipsis
    } else if (currentPage >= totalPages - halfVisible - 1) {
      // Near the end
      pages.push(null); // Ellipsis
      for (let i = totalPages - (maxVisible - 2); i < totalPages; i++) {
        pages.push(i);
      }
    } else {
      // In the middle
      pages.push(null); // Ellipsis
      for (let i = currentPage - halfVisible; i <= currentPage + halfVisible; i++) {
        pages.push(i);
      }
      pages.push(null); // Ellipsis
    }

    // Always show last page
    pages.push(totalPages);

    return pages;
  }, [currentPage, totalPages, maxVisible]);
}

export default usePagination;
