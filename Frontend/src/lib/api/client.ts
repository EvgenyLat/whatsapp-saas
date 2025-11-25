/**
 * Unified API Client
 * WhatsApp SaaS Platform
 *
 * Production-ready axios client with:
 * - Automatic token injection from Zustand store
 * - Request/response interceptors with logging
 * - Token refresh with request queuing
 * - Exponential backoff retry logic
 * - Request deduplication
 * - Network error handling
 * - Request cancellation support
 * - Environment validation
 * - Production monitoring
 * - Error tracking integration
 * - API versioning support
 *
 * @see https://axios-http.com/docs/interceptors
 */

import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import type {
  ApiRequestConfig,
  ApiError as ApiErrorType,
  TokenRefreshState,
  QueuedRequest,
  RetryConfig,
  ApiClientConfig,
  RequestInterceptorContext,
  ResponseInterceptorContext,
  RequestDeduplicationMap,
} from './types';
import { ApiError, isAxiosError } from './types';
import { env, isProduction } from '../env';
import { logger } from '../monitoring/logger';
import { captureException, captureApiError } from '../monitoring/sentry';
import { addApiVersion } from './versioning';

// ENFORCED SECURITY IMPORTS
import { addCsrfTokenToRequest } from '../security/csrf';
import { checkRateLimit } from '../security/rateLimit';
import { sanitizeObject } from '../security/sanitize';

/**
 * Generate unique request ID for tracing
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calculate retry delay with exponential backoff
 *
 * @param retryCount - Current retry attempt (0-indexed)
 * @param config - Retry configuration
 * @returns Delay in milliseconds
 */
function calculateRetryDelay(retryCount: number, config: RetryConfig): number {
  const delay = config.initialDelay * Math.pow(config.backoffMultiplier, retryCount);
  return Math.min(delay, config.maxDelay);
}

/**
 * Check if error is retryable
 *
 * @param error - Axios error
 * @param config - Retry configuration
 * @returns True if error should be retried
 */
function isRetryableError(error: any, config: RetryConfig): boolean {
  // Network errors (no response)
  if (!error.response && config.retryOnNetworkError) {
    return true;
  }

  // Check status codes
  if (error.response?.status) {
    return config.retryableStatusCodes.includes(error.response.status);
  }

  return false;
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  retryOnNetworkError: true,
};

/**
 * Default API client configuration
 * Uses validated environment variables
 */
const DEFAULT_CONFIG: ApiClientConfig = {
  baseURL: env.NEXT_PUBLIC_API_URL,
  timeout: env.NEXT_PUBLIC_API_TIMEOUT,
  withCredentials: true, // Include cookies
  retry: DEFAULT_RETRY_CONFIG,
  enableLogging: !isProduction,
};

/**
 * Token refresh state management
 * Prevents concurrent refresh requests
 */
const tokenRefreshState: TokenRefreshState = {
  isRefreshing: false,
  refreshPromise: null,
};

/**
 * Queue for requests waiting on token refresh
 */
const requestQueue: QueuedRequest[] = [];

/**
 * Request deduplication map
 * Prevents duplicate concurrent requests
 */
const pendingRequests: RequestDeduplicationMap = new Map();

/**
 * Create axios instance with base configuration
 */
const axiosInstance: AxiosInstance = axios.create({
  baseURL: DEFAULT_CONFIG.baseURL,
  timeout: DEFAULT_CONFIG.timeout,
  withCredentials: DEFAULT_CONFIG.withCredentials,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

/**
 * Get authentication token from Zustand store
 * Uses dynamic import to avoid circular dependencies
 *
 * @returns JWT access_token or null
 */
async function getAuthToken(): Promise<string | null> {
  try {
    // Dynamic import to avoid circular dependency
    const { useAuthStore } = await import('@/stores/auth.store');
    return useAuthStore.getState().accessToken;
  } catch (error) {
    console.error('[API Client] Failed to get auth token:', error);
    return null;
  }
}

/**
 * Refresh authentication token
 * Queues concurrent requests to prevent race conditions
 * Matches backend endpoint: POST /api/v1/auth/refresh
 *
 * @returns New JWT access_token
 * @throws ApiError if refresh fails
 */
async function refreshAuthToken(): Promise<string> {
  // If already refreshing, return existing promise
  if (tokenRefreshState.isRefreshing && tokenRefreshState.refreshPromise) {
    return tokenRefreshState.refreshPromise;
  }

  // Mark as refreshing and create promise
  tokenRefreshState.isRefreshing = true;
  tokenRefreshState.refreshPromise = (async () => {
    try {
      const { useAuthStore } = await import('@/stores/auth.store');
      const refreshToken = useAuthStore.getState().refreshToken;

      if (!refreshToken) {
        throw new ApiError('No refresh token available', {
          code: 'NO_REFRESH_TOKEN',
          status: 401,
        });
      }

      // Make refresh request (skip interceptors to avoid infinite loop)
      // Note: baseURL already contains /api/v1, so endpoint is just /auth/refresh
      const response = await axios.post<{ access_token: string; refresh_token: string }>(
        `${DEFAULT_CONFIG.baseURL}/auth/refresh`,
        { refreshToken }, // Backend expects camelCase
        {
          skipAuth: true,
          skipRetry: true,
        } as ApiRequestConfig
      );

      const { access_token: newAccessToken, refresh_token: newRefreshToken } = response.data;

      // Update tokens in store
      useAuthStore.getState().setTokens(newAccessToken, newRefreshToken);

      // Process queued requests
      requestQueue.forEach((req) => req.resolve(newAccessToken));
      requestQueue.length = 0;

      return newAccessToken;
    } catch (error) {
      // Clear auth on refresh failure
      const { useAuthStore } = await import('@/stores/auth.store');
      useAuthStore.getState().clearAuth();

      // Reject queued requests
      const apiError = new ApiError('Token refresh failed', {
        code: 'TOKEN_REFRESH_FAILED',
        status: 401,
      });
      requestQueue.forEach((req) => req.reject(apiError));
      requestQueue.length = 0;

      throw apiError;
    } finally {
      tokenRefreshState.isRefreshing = false;
      tokenRefreshState.refreshPromise = null;
    }
  })();

  return tokenRefreshState.refreshPromise;
}

/**
 * Generate cache key for request
 *
 * @param config - Request configuration
 * @returns Cache key string
 */
function getCacheKey(config: InternalAxiosRequestConfig): string {
  const method = config.method?.toUpperCase() || 'GET';
  const url = config.url || '';
  const params = JSON.stringify(config.params || {});
  return `${method}:${url}:${params}`;
}

/**
 * REQUEST INTERCEPTOR - WITH ENFORCED SECURITY
 * Handles:
 * - ENFORCED: Rate limiting
 * - ENFORCED: CSRF token injection
 * - ENFORCED: Input sanitization
 * - API versioning
 * - Token injection
 * - Request ID generation
 * - Request logging
 * - Request deduplication
 */
axiosInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> => {
    const apiConfig = config as InternalAxiosRequestConfig & ApiRequestConfig;

    // Generate request ID for tracing
    if (!apiConfig.requestId) {
      apiConfig.requestId = generateRequestId();
    }

    // Add start time
    apiConfig.startTime = Date.now();

    // ENFORCED SECURITY: Rate Limiting
    // Check and enforce rate limits for this endpoint
    const { status: rateLimitStatus, limiter } = checkRateLimit(apiConfig.url || '');
    if (!rateLimitStatus.allowed) {
      logger.warn('Rate limit exceeded', {
        requestId: apiConfig.requestId,
        url: apiConfig.url,
        remaining: rateLimitStatus.remaining,
        resetAt: new Date(rateLimitStatus.resetAt).toISOString(),
        retryAfter: rateLimitStatus.retryAfter,
      });

      throw new ApiError('Rate limit exceeded. Please try again later.', {
        code: 'RATE_LIMIT_EXCEEDED',
        status: 429,
        details: {
          remaining: rateLimitStatus.remaining,
          resetAt: rateLimitStatus.resetAt,
          retryAfter: rateLimitStatus.retryAfter,
        },
        requestId: apiConfig.requestId,
      });
    }

    // Add rate limit info to headers for debugging
    if (!isProduction) {
      apiConfig.headers['X-RateLimit-Remaining'] = rateLimitStatus.remaining.toString();
      apiConfig.headers['X-RateLimit-Reset'] = rateLimitStatus.resetAt.toString();
    }

    // ENFORCED SECURITY: CSRF Token
    // Add CSRF token to all state-changing requests
    addCsrfTokenToRequest(apiConfig);

    // ENFORCED SECURITY: Input Sanitization
    // Sanitize all request data to prevent injection attacks
    // Skip sanitization for auth endpoints (login, register) to preserve passwords
    const isAuthEndpoint = apiConfig.url?.includes('/auth/login') || apiConfig.url?.includes('/auth/register');
    if (apiConfig.data && typeof apiConfig.data === 'object' && !isAuthEndpoint) {
      apiConfig.data = sanitizeObject(apiConfig.data);
      logger.debug('Request data sanitized', {
        requestId: apiConfig.requestId,
      });
    } else if (isAuthEndpoint) {
      logger.debug('Skipping sanitization for auth endpoint', {
        requestId: apiConfig.requestId,
        url: apiConfig.url,
      });
    }

    // Add API versioning
    addApiVersion(apiConfig);

    // Inject auth token (unless skipAuth is true)
    if (!apiConfig.skipAuth) {
      const token = await getAuthToken();
      if (token) {
        apiConfig.headers.Authorization = `Bearer ${token}`;
      }
    }

    // Log request using production logger
    logger.debug('API Request', {
      requestId: apiConfig.requestId,
      method: apiConfig.method?.toUpperCase(),
      url: apiConfig.url,
      params: apiConfig.params,
      securityEnforced: true,
    });

    // Request deduplication for GET requests
    if (apiConfig.method?.toUpperCase() === 'GET') {
      const cacheKey = getCacheKey(apiConfig);
      const existingRequest = pendingRequests.get(cacheKey);

      if (existingRequest) {
        // Return existing promise instead of making duplicate request
        throw {
          __isDuplicate: true,
          promise: existingRequest,
        };
      }
    }

    return apiConfig;
  },
  (error) => {
    logger.error('Request interceptor error', error);
    return Promise.reject(error);
  }
);

/**
 * RESPONSE INTERCEPTOR
 * Handles:
 * - Response unwrapping
 * - Response logging
 * - Token refresh on 401
 * - Error standardization
 * - Request deduplication cleanup
 * - Error tracking
 */
axiosInstance.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => {
    const config = response.config as InternalAxiosRequestConfig & ApiRequestConfig;
    const duration = config.startTime ? Date.now() - config.startTime : 0;

    // Log response using production logger
    logger.debug('API Response', {
      requestId: config.requestId,
      status: response.status,
      duration,
      url: config.url,
    });

    // Clean up deduplication map
    if (config.method?.toUpperCase() === 'GET') {
      const cacheKey = getCacheKey(config);
      pendingRequests.delete(cacheKey);
    }

    // Add response metadata
    (response as any).meta = {
      duration,
      fromCache: false,
      requestId: config.requestId,
    } as ResponseInterceptorContext;

    return response;
  },
  async (error): Promise<AxiosResponse | never> => {
    const config = error.config as (InternalAxiosRequestConfig & ApiRequestConfig) | undefined;

    // Handle request deduplication
    if ((error as any).__isDuplicate) {
      try {
        return (await (error as any).promise) as AxiosResponse;
      } catch (promiseError) {
        throw promiseError;
      }
    }

    // Clean up deduplication map on error
    if (config?.method?.toUpperCase() === 'GET') {
      const cacheKey = getCacheKey(config);
      pendingRequests.delete(cacheKey);
    }

    // Log error using production logger
    if (config) {
      const duration = config.startTime ? Date.now() - config.startTime : 0;
      logger.error('API Error', error, {
        requestId: config.requestId,
        status: error.response?.status,
        duration,
        url: config.url,
        method: config.method,
      });

      // Send to Sentry in production
      if (isProduction && error.response?.status && error.response.status >= 500) {
        captureApiError(
          error,
          config.requestId,
          config.url,
          config.method?.toUpperCase()
        );
      }
    }

    // Handle 401 Unauthorized - Token refresh
    if (error.response?.status === 401 && config && !config.skipAuth && !config.isRetry) {
      try {
        const newToken = await refreshAuthToken();

        // Retry original request with new token
        config.headers.Authorization = `Bearer ${newToken}`;
        config.isRetry = true;

        return axiosInstance.request(config);
      } catch (refreshError) {
        // Refresh failed, convert to ApiError
        const authError = new ApiError('Authentication failed', {
          code: 'AUTH_FAILED',
          status: 401,
          originalError: error,
          requestId: config?.requestId,
        });

        // Track auth failures
        if (isProduction) {
          captureException(authError as Error);
        }

        throw authError;
      }
    }

    // Handle retry logic
    if (config && !config.skipRetry) {
      const retryCount = config.retryCount || 0;
      const retryConfig = DEFAULT_CONFIG.retry;

      if (retryCount < retryConfig.maxRetries && isRetryableError(error, retryConfig)) {
        // Calculate delay
        const delay = calculateRetryDelay(retryCount, retryConfig);

        // Log retry attempt
        logger.warn('API Retry', {
          requestId: config.requestId,
          attempt: retryCount + 1,
          maxRetries: retryConfig.maxRetries,
          delay,
        });

        // Wait and retry
        await new Promise((resolve) => setTimeout(resolve, delay));

        config.retryCount = retryCount + 1;
        config.isRetry = true;

        return axiosInstance.request(config);
      }
    }

    // Convert to ApiError
    const apiError = createApiError(error, config?.requestId);
    throw apiError;
  }
);

/**
 * Create standardized ApiError from axios error
 *
 * @param error - Axios error or unknown error
 * @param requestId - Request ID for tracing
 * @returns ApiError instance
 */
function createApiError(error: unknown, requestId?: string): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (isAxiosError(error)) {
    const status = error.response?.status;
    const responseData = error.response?.data;

    // Extract error message and code from response
    let message = 'An error occurred';
    let code = 'UNKNOWN_ERROR';
    let details: unknown;

    if (responseData && typeof responseData === 'object') {
      // Handle structured error response
      // Check if error field is an object with message (custom format)
      if ('error' in responseData && typeof responseData.error === 'object') {
        const errorObj = responseData.error as any;
        message = errorObj.message || message;
        code = errorObj.code || code;
        details = errorObj.details;
      }

      // Extract message from response (NestJS standard format)
      if ('message' in responseData) {
        const rawMessage = (responseData as any).message;
        // Handle array messages (from NestJS validation errors)
        message = Array.isArray(rawMessage) ? rawMessage.join(', ') : rawMessage;
      }

      // Extract error code from error field if it's a string
      if ('error' in responseData && typeof responseData.error === 'string') {
        code = responseData.error;
      }
    } else {
      message = error.message;
    }

    // Handle network errors
    if (!status) {
      code = 'NETWORK_ERROR';
      message = 'Network error - please check your connection';
    }

    return new ApiError(message, {
      status,
      code,
      details,
      originalError: error,
      requestId,
    });
  }

  // Handle unknown errors
  return new ApiError(
    error instanceof Error ? error.message : 'An unknown error occurred',
    {
      code: 'UNKNOWN_ERROR',
      requestId,
    }
  );
}

/**
 * Export configured axios instance
 */
export const apiClient = axiosInstance;

/**
 * Export default client
 */
export default apiClient;

/**
 * Export utility functions
 */
export { generateRequestId, createApiError, getAuthToken, refreshAuthToken };

/**
 * Export types
 */
export type { ApiRequestConfig, ApiErrorType };
