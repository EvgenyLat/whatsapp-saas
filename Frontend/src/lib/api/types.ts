/**
 * API Client Internal Types
 * WhatsApp SaaS Platform
 *
 * These types are used internally by the API client for:
 * - Request configuration
 * - Response handling
 * - Error handling
 * - Retry logic
 * - Request cancellation
 *
 * @internal
 */

import type { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';

/**
 * Extended Axios request configuration
 * Adds custom properties for our API client
 */
export interface ApiRequestConfig extends AxiosRequestConfig {
  /** Skip authentication header for this request */
  skipAuth?: boolean;

  /** Skip retry logic for this request */
  skipRetry?: boolean;

  /** Custom retry count for this request */
  retryCount?: number;

  /** Request ID for tracing and logging */
  requestId?: string;

  /** Whether this is a retry attempt */
  isRetry?: boolean;

  /** Original request timestamp */
  startTime?: number;
}

/**
 * API client error class
 * Extends native Error with additional API-specific properties
 */
export class ApiError extends Error {
  /**
   * HTTP status code (undefined for network errors)
   */
  public readonly status?: number;

  /**
   * Error code from API (e.g., 'VALIDATION_ERROR', 'NOT_FOUND')
   */
  public readonly code?: string;

  /**
   * Additional error details (field-specific errors, etc.)
   */
  public readonly details?: unknown;

  /**
   * Whether this is a network error (no response received)
   */
  public readonly isNetworkError: boolean;

  /**
   * Whether this is an authentication error (401/403)
   */
  public readonly isAuthError: boolean;

  /**
   * Whether this is a validation error (400)
   */
  public readonly isValidationError: boolean;

  /**
   * Whether this is a server error (5xx)
   */
  public readonly isServerError: boolean;

  /**
   * Original axios error (if available)
   */
  public readonly originalError?: AxiosError;

  /**
   * Request ID for tracing
   */
  public readonly requestId?: string;

  constructor(
    message: string,
    options: {
      status?: number;
      code?: string;
      details?: unknown;
      originalError?: AxiosError;
      requestId?: string;
    } = {}
  ) {
    super(message);
    this.name = 'ApiError';

    this.status = options.status;
    this.code = options.code;
    this.details = options.details;
    this.originalError = options.originalError;
    this.requestId = options.requestId;

    // Determine error types
    this.isNetworkError = !options.status;
    this.isAuthError = options.status === 401 || options.status === 403;
    this.isValidationError = options.status === 400;
    this.isServerError = !!options.status && options.status >= 500;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  /**
   * Convert to JSON for logging
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      status: this.status,
      code: this.code,
      details: this.details,
      isNetworkError: this.isNetworkError,
      isAuthError: this.isAuthError,
      isValidationError: this.isValidationError,
      isServerError: this.isServerError,
      requestId: this.requestId,
    };
  }
}

/**
 * Token refresh state
 * Manages token refresh to prevent race conditions
 */
export interface TokenRefreshState {
  /** Whether a token refresh is in progress */
  isRefreshing: boolean;

  /** Promise that resolves when refresh completes */
  refreshPromise: Promise<string> | null;
}

/**
 * Request queue item
 * Used for queuing requests during token refresh
 */
export interface QueuedRequest {
  /** Resolve function for the queued promise */
  resolve: (token: string) => void;

  /** Reject function for the queued promise */
  reject: (error: Error) => void;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;

  /** Initial delay in milliseconds */
  initialDelay: number;

  /** Maximum delay in milliseconds */
  maxDelay: number;

  /** Backoff multiplier */
  backoffMultiplier: number;

  /** Status codes to retry on */
  retryableStatusCodes: number[];

  /** Whether to retry on network errors */
  retryOnNetworkError: boolean;
}

/**
 * API client configuration
 */
export interface ApiClientConfig {
  /** Base URL for API requests */
  baseURL: string;

  /** Request timeout in milliseconds */
  timeout: number;

  /** Whether to include credentials (cookies) */
  withCredentials: boolean;

  /** Retry configuration */
  retry: RetryConfig;

  /** Whether to log requests in development */
  enableLogging: boolean;
}

/**
 * Request interceptor context
 * Data added by request interceptor
 */
export interface RequestInterceptorContext {
  /** Request ID for tracing */
  requestId: string;

  /** Request start timestamp */
  startTime: number;

  /** Retry attempt number (0 for initial request) */
  retryAttempt: number;
}

/**
 * Response interceptor context
 * Data added by response interceptor
 */
export interface ResponseInterceptorContext {
  /** Request duration in milliseconds */
  duration: number;

  /** Whether response was from cache */
  fromCache: boolean;

  /** Request ID (from request context) */
  requestId?: string;
}

/**
 * API response with metadata
 * Internal response structure with additional context
 */
export interface ApiResponseWithMeta<T = any> extends AxiosResponse<T> {
  /** Response metadata */
  meta?: ResponseInterceptorContext;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  /** Whether caching is enabled */
  enabled: boolean;

  /** Default TTL in milliseconds */
  ttl: number;

  /** Maximum cache size */
  maxSize: number;
}

/**
 * Cache entry
 */
export interface CacheEntry<T = any> {
  /** Cached data */
  data: T;

  /** Cache timestamp */
  timestamp: number;

  /** TTL in milliseconds */
  ttl: number;

  /** Whether entry has expired */
  isExpired: () => boolean;
}

/**
 * Request cancellation token
 */
export interface CancellationToken {
  /** Abort controller for cancellation */
  controller: AbortController;

  /** Reason for cancellation */
  reason?: string;

  /** Cancel the request */
  cancel: (reason?: string) => void;
}

/**
 * Request deduplication map
 * Prevents duplicate concurrent requests
 */
export type RequestDeduplicationMap = Map<string, Promise<any>>;

/**
 * Environment variables type
 */
export interface ApiEnvironmentVariables {
  /** API base URL */
  NEXT_PUBLIC_API_URL?: string;

  /** Node environment */
  NODE_ENV?: string;

  /** Whether to enable API logging */
  NEXT_PUBLIC_ENABLE_API_LOGGING?: string;
}

/**
 * Type guard to check if error is an API error
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * Type guard to check if error is an axios error
 */
export function isAxiosError(error: unknown): error is AxiosError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'isAxiosError' in error &&
    (error as any).isAxiosError === true
  );
}

/**
 * Type guard to check if response has data property
 */
export function hasDataProperty<T>(
  response: any
): response is { data: T } {
  return typeof response === 'object' && response !== null && 'data' in response;
}

/**
 * Extract data from response
 * Handles both direct data and wrapped responses
 */
export type UnwrapResponse<T> = T extends { data: infer U } ? U : T;
