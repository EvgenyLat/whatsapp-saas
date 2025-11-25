/**
 * API Utilities
 * WhatsApp SaaS Platform
 *
 * Utility functions for:
 * - Request building (query strings, form data)
 * - Response handling (pagination, unwrapping)
 * - Error handling
 * - Caching utilities
 * - URL building
 */

import type {
  PaginatedResponse,
  PaginationParams,
  DateRangeParams,
  ApiError as ApiErrorResponse,
} from '@/types';
import { ApiError } from './types';

/**
 * Pagination information extracted from paginated response
 */
export interface PaginationInfo {
  /** Current page number */
  page: number;
  /** Number of items per page */
  limit: number;
  /** Total number of items */
  total: number;
  /** Total number of pages */
  totalPages: number;
  /** Whether there is a next page */
  hasNext: boolean;
  /** Whether there is a previous page */
  hasPrev: boolean;
}

/**
 * Build query string from parameters
 * Handles arrays, nested objects, and null/undefined values
 *
 * @param params - Parameters to convert to query string
 * @returns Query string (without leading '?')
 *
 * @example
 * ```ts
 * buildQueryString({ page: 1, status: 'active', tags: ['a', 'b'] })
 * // Returns: "page=1&status=active&tags=a&tags=b"
 * ```
 */
export function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined) {
      // Skip null/undefined values
      return;
    }

    if (Array.isArray(value)) {
      // Handle arrays
      value.forEach((item) => {
        if (item !== null && item !== undefined) {
          searchParams.append(key, String(item));
        }
      });
    } else if (value instanceof Date) {
      // Handle dates
      searchParams.append(key, value.toISOString());
    } else if (typeof value === 'object') {
      // Handle nested objects (flatten)
      Object.entries(value).forEach(([nestedKey, nestedValue]) => {
        if (nestedValue !== null && nestedValue !== undefined) {
          searchParams.append(`${key}[${nestedKey}]`, String(nestedValue));
        }
      });
    } else {
      // Handle primitives
      searchParams.append(key, String(value));
    }
  });

  return searchParams.toString();
}

/**
 * Build FormData from object
 * Handles nested objects, arrays, and files
 *
 * @param data - Data to convert to FormData
 * @param formData - Existing FormData instance (optional)
 * @param parentKey - Parent key for nested objects (internal use)
 * @returns FormData instance
 *
 * @example
 * ```ts
 * buildFormData({
 *   name: 'John',
 *   avatar: fileBlob,
 *   metadata: { age: 25 }
 * })
 * ```
 */
export function buildFormData(
  data: Record<string, any>,
  formData: FormData = new FormData(),
  parentKey?: string
): FormData {
  Object.entries(data).forEach(([key, value]) => {
    const formKey = parentKey ? `${parentKey}[${key}]` : key;

    if (value === null || value === undefined) {
      // Skip null/undefined values
      return;
    }

    if (value instanceof File || value instanceof Blob) {
      // Handle files and blobs
      formData.append(formKey, value);
    } else if (Array.isArray(value)) {
      // Handle arrays
      value.forEach((item, index) => {
        if (item instanceof File || item instanceof Blob) {
          formData.append(`${formKey}[]`, item);
        } else if (typeof item === 'object' && item !== null) {
          buildFormData({ [index]: item }, formData, `${formKey}[]`);
        } else {
          formData.append(`${formKey}[]`, String(item));
        }
      });
    } else if (value instanceof Date) {
      // Handle dates
      formData.append(formKey, value.toISOString());
    } else if (typeof value === 'object') {
      // Handle nested objects (recurse)
      buildFormData(value, formData, formKey);
    } else {
      // Handle primitives
      formData.append(formKey, String(value));
    }
  });

  return formData;
}

/**
 * Extract pagination information from paginated response
 *
 * @param response - Paginated response
 * @returns Pagination information
 *
 * @example
 * ```ts
 * const paginationInfo = extractPaginationInfo(response);
 * console.log(`Page ${paginationInfo.page} of ${paginationInfo.totalPages}`);
 * ```
 */
export function extractPaginationInfo<T>(
  response: PaginatedResponse<T>
): PaginationInfo {
  return {
    page: response.pagination.page,
    limit: response.pagination.limit,
    total: response.pagination.total,
    totalPages: response.pagination.totalPages,
    hasNext: response.pagination.hasNext,
    hasPrev: response.pagination.hasPrev,
  };
}

/**
 * Handle API error and convert to standardized ApiError
 *
 * @param error - Error from API call
 * @returns ApiError instance
 *
 * @example
 * ```ts
 * try {
 *   await api.bookings.getAll();
 * } catch (error) {
 *   const apiError = handleApiError(error);
 *   console.error(apiError.message);
 * }
 * ```
 */
export function handleApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof Error) {
    return new ApiError(error.message, {
      code: 'UNKNOWN_ERROR',
    });
  }

  return new ApiError('An unknown error occurred', {
    code: 'UNKNOWN_ERROR',
  });
}

/**
 * Get user-friendly error message from API error
 *
 * @param error - API error
 * @returns User-friendly error message
 *
 * @example
 * ```ts
 * const errorMessage = getErrorMessage(apiError);
 * toast.error(errorMessage);
 * ```
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    // Use custom messages for common error codes
    switch (error.code) {
      case 'NETWORK_ERROR':
        return 'Unable to connect to the server. Please check your internet connection.';
      case 'AUTH_FAILED':
      case 'TOKEN_REFRESH_FAILED':
        return 'Your session has expired. Please log in again.';
      case 'VALIDATION_ERROR':
        return 'Please check your input and try again.';
      case 'NOT_FOUND':
        return 'The requested resource was not found.';
      case 'FORBIDDEN':
        return 'You do not have permission to perform this action.';
      case 'RATE_LIMIT_EXCEEDED':
        return 'Too many requests. Please try again later.';
      default:
        return error.message || 'An error occurred. Please try again.';
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
}

/**
 * Generate cache key for API request
 * Used for caching and request deduplication
 *
 * @param endpoint - API endpoint
 * @param params - Request parameters
 * @returns Cache key string
 *
 * @example
 * ```ts
 * const key = getCacheKey('/bookings', { page: 1, status: 'active' });
 * // Returns: "/bookings:page=1&status=active"
 * ```
 */
export function getCacheKey(endpoint: string, params?: object): string {
  if (!params) {
    return endpoint;
  }

  const queryString = buildQueryString(params as Record<string, any>);
  return queryString ? `${endpoint}:${queryString}` : endpoint;
}

/**
 * Invalidate cache entries matching pattern
 * Works with React Query's invalidateQueries
 *
 * @param pattern - Pattern to match (regex string or exact match)
 * @returns Array of matching cache keys
 *
 * @example
 * ```ts
 * // Invalidate all booking queries
 * invalidateCache('bookings');
 *
 * // Invalidate specific salon's bookings
 * invalidateCache('bookings/salon-123');
 * ```
 */
export function invalidateCache(pattern: string): string[] {
  // This is a helper that returns the pattern
  // Actual invalidation is done by React Query
  // Usage: queryClient.invalidateQueries({ queryKey: [pattern] })
  return [pattern];
}

/**
 * Build pagination params from page and limit
 *
 * @param page - Page number (1-indexed)
 * @param limit - Items per page
 * @returns Pagination params object
 *
 * @example
 * ```ts
 * const params = buildPaginationParams(2, 20);
 * // Returns: { page: 2, limit: 20 }
 * ```
 */
export function buildPaginationParams(
  page: number = 1,
  limit: number = 10
): PaginationParams {
  return {
    page: Math.max(1, page), // Ensure page is at least 1
    limit: Math.max(1, Math.min(100, limit)), // Clamp between 1 and 100
  };
}

/**
 * Build date range params from dates
 *
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Date range params object
 *
 * @example
 * ```ts
 * const params = buildDateRangeParams(
 *   new Date('2024-01-01'),
 *   new Date('2024-01-31')
 * );
 * ```
 */
export function buildDateRangeParams(
  startDate?: string | Date,
  endDate?: string | Date
): DateRangeParams {
  const params: DateRangeParams = {};

  if (startDate) {
    params.startDate = startDate instanceof Date ? startDate.toISOString() : startDate;
  }

  if (endDate) {
    params.endDate = endDate instanceof Date ? endDate.toISOString() : endDate;
  }

  return params;
}

/**
 * Merge pagination and date range params
 *
 * @param pagination - Pagination params
 * @param dateRange - Date range params
 * @returns Combined params object
 *
 * @example
 * ```ts
 * const params = mergeParams(
 *   { page: 1, limit: 20 },
 *   { startDate: '2024-01-01', endDate: '2024-01-31' }
 * );
 * ```
 */
export function mergeParams(
  pagination?: PaginationParams,
  dateRange?: DateRangeParams
): PaginationParams & DateRangeParams {
  return {
    ...pagination,
    ...dateRange,
  };
}

/**
 * Check if response is paginated
 *
 * @param response - API response
 * @returns True if response is paginated
 */
export function isPaginatedResponse<T>(
  response: any
): response is PaginatedResponse<T> {
  return (
    response &&
    typeof response === 'object' &&
    'data' in response &&
    'pagination' in response &&
    Array.isArray(response.data)
  );
}

/**
 * Check if error is API error
 *
 * @param error - Error object
 * @returns True if error is ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * Format file size for display
 *
 * @param bytes - File size in bytes
 * @returns Formatted file size string
 *
 * @example
 * ```ts
 * formatFileSize(1024); // "1.00 KB"
 * formatFileSize(1048576); // "1.00 MB"
 * ```
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Build URL with query parameters
 *
 * @param baseUrl - Base URL
 * @param params - Query parameters
 * @returns Complete URL with query string
 *
 * @example
 * ```ts
 * buildUrl('/api/bookings', { page: 1, status: 'active' });
 * // Returns: "/api/bookings?page=1&status=active"
 * ```
 */
export function buildUrl(baseUrl: string, params?: Record<string, any>): string {
  if (!params || Object.keys(params).length === 0) {
    return baseUrl;
  }

  const queryString = buildQueryString(params);
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

/**
 * Delay execution for specified milliseconds
 * Useful for retry logic and debouncing
 *
 * @param ms - Milliseconds to delay
 * @returns Promise that resolves after delay
 *
 * @example
 * ```ts
 * await delay(1000); // Wait 1 second
 * ```
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 *
 * @param fn - Function to retry
 * @param maxRetries - Maximum number of retries
 * @param initialDelay - Initial delay in milliseconds
 * @returns Result of the function
 *
 * @example
 * ```ts
 * const data = await retryWithBackoff(
 *   () => fetchData(),
 *   3,
 *   1000
 * );
 * ```
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (i < maxRetries - 1) {
        const delayMs = initialDelay * Math.pow(2, i);
        await delay(delayMs);
      }
    }
  }

  throw lastError || new Error('Retry failed');
}

/**
 * Create abort controller with timeout
 *
 * @param timeoutMs - Timeout in milliseconds
 * @returns Abort controller that will abort after timeout
 *
 * @example
 * ```ts
 * const controller = createAbortControllerWithTimeout(5000);
 * fetch('/api/data', { signal: controller.signal });
 * ```
 */
export function createAbortControllerWithTimeout(timeoutMs: number): AbortController {
  const controller = new AbortController();

  setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  return controller;
}

/**
 * Safe JSON parse with fallback
 *
 * @param json - JSON string to parse
 * @param fallback - Fallback value if parse fails
 * @returns Parsed object or fallback
 *
 * @example
 * ```ts
 * const data = safeJsonParse('{"name":"John"}', {});
 * ```
 */
export function safeJsonParse<T = any>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * Debounce function execution
 *
 * @param fn - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 *
 * @example
 * ```ts
 * const debouncedSearch = debounce((query) => {
 *   searchApi(query);
 * }, 300);
 * ```
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      fn(...args);
    }, wait);
  };
}

/**
 * Throttle function execution
 *
 * @param fn - Function to throttle
 * @param limit - Minimum time between executions in milliseconds
 * @returns Throttled function
 *
 * @example
 * ```ts
 * const throttledScroll = throttle(() => {
 *   handleScroll();
 * }, 100);
 * ```
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}
