# API Integration Architecture
## WhatsApp SaaS Platform - AAA++ Grade

> **Status**: Architecture Blueprint for Implementation
> **Version**: 1.0.0
> **Last Updated**: 2025-10-20
> **Target Backend**: http://localhost:4000

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture Overview](#system-architecture-overview)
3. [API Client Architecture](#api-client-architecture)
4. [Authentication Flow](#authentication-flow)
5. [Error Handling Strategy](#error-handling-strategy)
6. [Performance Optimization](#performance-optimization)
7. [Integration Patterns](#integration-patterns)
8. [Security Considerations](#security-considerations)
9. [Testing Strategy](#testing-strategy)
10. [Implementation Roadmap](#implementation-roadmap)
11. [Code Examples](#code-examples)

---

## Executive Summary

### Current State Analysis

**Completed Components:**
- Type system: 100% complete with comprehensive API types
- React Query setup: Configured with optimal defaults
- Zustand stores: Auth and UI state management
- API endpoint definitions: Full CRUD operations defined
- Component architecture: Complete with hooks integration

**Missing Components:**
- Enhanced authentication flow with token refresh
- Comprehensive error handling with retry strategies
- Request interceptor improvements (deduplication, cancellation)
- Offline support and request queuing
- Advanced caching strategies
- Integration testing suite

### Architecture Goals

1. **Reliability**: 99.9% uptime with automatic retry and fallback mechanisms
2. **Performance**: < 100ms API client overhead, aggressive caching
3. **Security**: Zero-trust architecture with token rotation and XSS protection
4. **Developer Experience**: Type-safe, intuitive APIs with excellent error messages
5. **Testability**: 100% test coverage with comprehensive mocks

---

## System Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend Application                      │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Next.js    │  │   React      │  │    Zustand   │          │
│  │   Pages      │─▶│  Components  │─▶│    Stores    │          │
│  └──────────────┘  └──────────────┘  └──────┬───────┘          │
│                                              │                    │
│                    ┌─────────────────────────▼──────────┐        │
│                    │   React Query Layer                │        │
│                    │  - Query management                │        │
│                    │  - Cache control                   │        │
│                    │  - Optimistic updates              │        │
│                    └─────────────────────────┬──────────┘        │
│                                              │                    │
│                    ┌─────────────────────────▼──────────┐        │
│                    │   API Client Layer                 │        │
│                    │  - Request interceptors            │        │
│                    │  - Response transformation         │        │
│                    │  - Error handling                  │        │
│                    │  - Token management                │        │
│                    └─────────────────────────┬──────────┘        │
│                                              │                    │
│                    ┌─────────────────────────▼──────────┐        │
│                    │   Axios HTTP Client                │        │
│                    │  - Request execution               │        │
│                    │  - Retry logic                     │        │
│                    │  - Timeout management              │        │
│                    └─────────────────────────┬──────────┘        │
│                                              │                    │
└──────────────────────────────────────────────┼────────────────────┘
                                               │
                                               │ HTTP/HTTPS
                                               │
                                               ▼
                     ┌──────────────────────────────────┐
                     │   Backend API (Port 4000)        │
                     │   - RESTful endpoints            │
                     │   - JWT authentication           │
                     │   - Rate limiting                │
                     └──────────────────────────────────┘
```

### Data Flow

```
User Action → Component → Hook → React Query → API Client → Axios → Backend
                  ▲                                                     │
                  │                                                     │
                  └─────────────── Response + Cache ◄──────────────────┘
```

---

## API Client Architecture

### 1. Client Configuration

#### Base Configuration

```typescript
// File: src/lib/api/config.ts

export interface ApiClientConfig {
  /** Base URL for all API requests */
  baseURL: string;

  /** Request timeout in milliseconds */
  timeout: number;

  /** Enable request/response logging */
  debug: boolean;

  /** Enable automatic token refresh */
  autoRefreshToken: boolean;

  /** Token refresh threshold (seconds before expiry) */
  refreshThreshold: number;

  /** Maximum concurrent requests */
  maxConcurrentRequests: number;

  /** Enable request deduplication */
  deduplicateRequests: boolean;
}

export const defaultConfig: ApiClientConfig = {
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
  timeout: 30000, // 30 seconds
  debug: process.env.NODE_ENV === 'development',
  autoRefreshToken: true,
  refreshThreshold: 300, // 5 minutes
  maxConcurrentRequests: 6,
  deduplicateRequests: true,
};
```

#### Environment Configuration

```typescript
// File: src/lib/api/environment.ts

export interface ApiEnvironment {
  name: 'development' | 'staging' | 'production';
  apiUrl: string;
  timeout: number;
  retryAttempts: number;
}

export const environments: Record<string, ApiEnvironment> = {
  development: {
    name: 'development',
    apiUrl: 'http://localhost:4000',
    timeout: 30000,
    retryAttempts: 3,
  },
  staging: {
    name: 'staging',
    apiUrl: process.env.NEXT_PUBLIC_STAGING_API_URL || '',
    timeout: 20000,
    retryAttempts: 3,
  },
  production: {
    name: 'production',
    apiUrl: process.env.NEXT_PUBLIC_API_URL || '',
    timeout: 15000,
    retryAttempts: 2,
  },
};
```

### 2. Request Interceptors

#### Enhanced Request Interceptor Pipeline

```typescript
// File: src/lib/api/interceptors/request.ts

/**
 * Request Interceptor Pipeline
 * Executes in order: Auth → SalonContext → Retry → Deduplication → Logging
 */

// 1. Authentication Interceptor
export function authInterceptor(config: InternalAxiosRequestConfig) {
  const { token, isAuthenticated } = useAuthStore.getState();

  if (isAuthenticated && token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
}

// 2. Salon Context Interceptor
export function salonContextInterceptor(config: InternalAxiosRequestConfig) {
  const { currentSalonId } = useAuthStore.getState();

  // Inject salon ID into headers for multi-tenant support
  if (currentSalonId && config.headers) {
    config.headers['X-Salon-ID'] = currentSalonId;
  }

  return config;
}

// 3. Request ID Interceptor (for tracing)
export function requestIdInterceptor(config: InternalAxiosRequestConfig) {
  const requestId = generateRequestId();

  if (config.headers) {
    config.headers['X-Request-ID'] = requestId;
  }

  // Store for request deduplication
  config.metadata = { ...config.metadata, requestId };

  return config;
}

// 4. Request Deduplication Interceptor
const pendingRequests = new Map<string, AbortController>();

export function deduplicationInterceptor(config: InternalAxiosRequestConfig) {
  if (!config.deduplicateRequests) return config;

  const requestKey = generateRequestKey(config);

  // Check if identical request is already in flight
  if (pendingRequests.has(requestKey)) {
    const controller = pendingRequests.get(requestKey)!;
    config.signal = controller.signal;
    throw new RequestDuplicateError('Duplicate request detected', requestKey);
  }

  // Create abort controller for this request
  const controller = new AbortController();
  config.signal = controller.signal;
  pendingRequests.set(requestKey, controller);

  return config;
}

// 5. Request Timeout Interceptor
export function timeoutInterceptor(config: InternalAxiosRequestConfig) {
  // Set per-request timeout based on endpoint
  const timeouts: Record<string, number> = {
    '/auth/login': 10000,      // 10s for auth
    '/admin/analytics': 60000,  // 60s for analytics
    default: 30000,             // 30s default
  };

  const endpoint = config.url || '';
  config.timeout = timeouts[endpoint] || timeouts.default;

  return config;
}

// 6. Logging Interceptor
export function loggingInterceptor(config: InternalAxiosRequestConfig) {
  if (process.env.NODE_ENV === 'development') {
    console.log('[API Request]', {
      method: config.method?.toUpperCase(),
      url: config.url,
      headers: config.headers,
      data: config.data,
    });
  }

  return config;
}
```

### 3. Response Interceptors

#### Enhanced Response Interceptor Pipeline

```typescript
// File: src/lib/api/interceptors/response.ts

/**
 * Response Interceptor Pipeline
 * Success: Transform → Cache → Logging
 * Error: Retry → Refresh → Transform → Logging
 */

// Success Interceptor
export function responseTransformInterceptor(response: AxiosResponse) {
  // Clean up pending requests map
  const requestKey = generateRequestKey(response.config);
  pendingRequests.delete(requestKey);

  // Log response
  if (process.env.NODE_ENV === 'development') {
    console.log('[API Response]', {
      status: response.status,
      url: response.config.url,
      data: response.data,
    });
  }

  // Unwrap API response structure if needed
  if (response.data?.data !== undefined) {
    response.data = response.data.data;
  }

  return response;
}

// Error Interceptor with Token Refresh
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

export async function responseErrorInterceptor(error: AxiosError) {
  const config = error.config as InternalAxiosRequestConfig;

  // Clean up pending requests
  const requestKey = generateRequestKey(config);
  pendingRequests.delete(requestKey);

  // 1. Handle 401 Unauthorized - Token Refresh
  if (error.response?.status === 401 && !config._retry) {
    if (!isRefreshing) {
      isRefreshing = true;

      try {
        const { token } = useAuthStore.getState();
        const newToken = await refreshAccessToken(token);

        // Update token in store
        useAuthStore.getState().updateToken(newToken);

        // Notify all pending requests
        refreshSubscribers.forEach((callback) => callback(newToken));
        refreshSubscribers = [];

        isRefreshing = false;

        // Retry original request with new token
        config._retry = true;
        config.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(config);
      } catch (refreshError) {
        isRefreshing = false;
        refreshSubscribers = [];

        // Logout user if refresh fails
        useAuthStore.getState().logout();
        window.location.href = '/login';

        return Promise.reject(refreshError);
      }
    } else {
      // Queue request until token is refreshed
      return new Promise((resolve) => {
        refreshSubscribers.push((token: string) => {
          config.headers.Authorization = `Bearer ${token}`;
          resolve(apiClient(config));
        });
      });
    }
  }

  // 2. Handle Network Errors - Retry with Exponential Backoff
  if (!error.response && config._retryCount < 3) {
    config._retryCount = (config._retryCount || 0) + 1;

    const delay = calculateBackoff(config._retryCount);
    await sleep(delay);

    return apiClient(config);
  }

  // 3. Transform Error
  const transformedError = transformApiError(error);

  // 4. Log Error
  if (process.env.NODE_ENV === 'development') {
    console.error('[API Error]', {
      status: error.response?.status,
      url: config.url,
      message: transformedError.message,
      data: error.response?.data,
    });
  }

  return Promise.reject(transformedError);
}
```

### 4. Request Cancellation

```typescript
// File: src/lib/api/cancellation.ts

/**
 * Request Cancellation Manager
 * Automatically cancels requests on component unmount
 */

export class RequestCancellationManager {
  private controllers: Map<string, AbortController> = new Map();

  /**
   * Create abort controller for a request
   */
  createController(key: string): AbortController {
    // Cancel existing request with same key
    this.cancel(key);

    const controller = new AbortController();
    this.controllers.set(key, controller);

    return controller;
  }

  /**
   * Cancel request by key
   */
  cancel(key: string): void {
    const controller = this.controllers.get(key);

    if (controller) {
      controller.abort();
      this.controllers.delete(key);
    }
  }

  /**
   * Cancel all requests
   */
  cancelAll(): void {
    this.controllers.forEach((controller) => controller.abort());
    this.controllers.clear();
  }

  /**
   * Get signal for a request
   */
  getSignal(key: string): AbortSignal | undefined {
    return this.controllers.get(key)?.signal;
  }
}

// Global instance
export const cancellationManager = new RequestCancellationManager();

// React Hook
export function useCancellableRequest(key: string) {
  useEffect(() => {
    return () => {
      cancellationManager.cancel(key);
    };
  }, [key]);

  return cancellationManager.getSignal(key);
}
```

---

## Authentication Flow

### Complete Authentication Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     Authentication Flow                       │
└──────────────────────────────────────────────────────────────┘

1. LOGIN
┌─────────┐      ┌─────────┐      ┌─────────┐      ┌─────────┐
│  User   │─────▶│Component│─────▶│ API     │─────▶│ Backend │
│ Action  │      │         │      │ Client  │      │         │
└─────────┘      └─────────┘      └─────────┘      └────┬────┘
                                                         │
                 ┌───────────────────────────────────────┘
                 │
                 ▼
     ┌─────────────────────┐
     │  Token + User Data  │
     └──────────┬──────────┘
                │
                ▼
     ┌─────────────────────┐
     │  Zustand Store      │
     │  - user             │
     │  - token            │
     │  - isAuthenticated  │
     └──────────┬──────────┘
                │
                ▼
     ┌─────────────────────┐
     │  localStorage       │
     │  'auth-storage'     │
     └─────────────────────┘

2. AUTHENTICATED REQUEST
┌─────────┐      ┌─────────┐      ┌─────────┐
│Component│─────▶│ Query   │─────▶│ API     │
│         │      │         │      │ Client  │
└─────────┘      └─────────┘      └────┬────┘
                                       │
                  ┌────────────────────┘
                  │ Inject Token
                  ▼
     ┌──────────────────────┐
     │ Authorization Header │
     │ Bearer <token>       │
     └──────────┬───────────┘
                │
                ▼
     ┌─────────────────────┐
     │ Backend Validates   │
     │ Token               │
     └─────────────────────┘

3. TOKEN REFRESH (401 Response)
┌─────────┐      ┌─────────┐      ┌─────────┐
│ Request │─────▶│ 401     │─────▶│ Refresh │
│         │      │ Error   │      │ Handler │
└─────────┘      └─────────┘      └────┬────┘
                                       │
                  ┌────────────────────┘
                  │
                  ▼
     ┌──────────────────────┐
     │ Queue Other Requests │
     │ (Prevent Race)       │
     └──────────┬───────────┘
                │
                ▼
     ┌──────────────────────┐
     │ Call Refresh API     │
     │ POST /auth/refresh   │
     └──────────┬───────────┘
                │
         ┌──────┴──────┐
         │             │
    SUCCESS         FAILURE
         │             │
         ▼             ▼
  ┌──────────┐   ┌──────────┐
  │New Token │   │ Logout   │
  │Update    │   │ Redirect │
  │Store     │   │ to Login │
  └────┬─────┘   └──────────┘
       │
       ▼
  ┌──────────┐
  │ Retry    │
  │ Queued   │
  │ Requests │
  └──────────┘

4. LOGOUT
┌─────────┐      ┌─────────┐      ┌─────────┐
│ Logout  │─────▶│ Clear   │─────▶│ Clear   │
│ Action  │      │ Store   │      │ Cache   │
└─────────┘      └─────────┘      └────┬────┘
                                       │
                  ┌────────────────────┘
                  │
                  ▼
     ┌──────────────────────┐
     │ Call Backend Logout  │
     │ (Optional)           │
     └──────────┬───────────┘
                │
                ▼
     ┌──────────────────────┐
     │ Redirect to Login    │
     └──────────────────────┘
```

### Implementation

```typescript
// File: src/lib/api/auth.ts

/**
 * Authentication API Client
 */

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  user: User;
  expiresIn: number; // seconds
}

export interface RefreshTokenResponse {
  token: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Login user and store credentials
 */
export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  const response = await apiClient.post<ApiResponse<LoginResponse>>(
    '/auth/login',
    credentials
  );

  const data = response.data.data;

  // Store in Zustand
  useAuthStore.getState().login(data.user, data.token);

  // Store refresh token securely
  if (data.refreshToken) {
    storeRefreshToken(data.refreshToken);
  }

  // Set token expiry timer
  scheduleTokenRefresh(data.expiresIn);

  return data;
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(currentToken: string | null): Promise<string> {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const response = await apiClient.post<ApiResponse<RefreshTokenResponse>>(
    '/auth/refresh',
    { refreshToken },
    {
      headers: {
        Authorization: currentToken ? `Bearer ${currentToken}` : undefined,
      },
    }
  );

  const data = response.data.data;

  // Update token in store
  useAuthStore.getState().updateToken(data.token);

  // Update refresh token
  storeRefreshToken(data.refreshToken);

  // Schedule next refresh
  scheduleTokenRefresh(data.expiresIn);

  return data.token;
}

/**
 * Logout user and clear all data
 */
export async function logout(): Promise<void> {
  try {
    // Call backend logout (best effort)
    await apiClient.post('/auth/logout');
  } catch (error) {
    // Ignore errors, logout anyway
    console.warn('Logout API call failed:', error);
  } finally {
    // Clear Zustand store
    useAuthStore.getState().logout();

    // Clear refresh token
    clearRefreshToken();

    // Clear React Query cache
    queryClient.clear();

    // Cancel pending requests
    cancellationManager.cancelAll();
  }
}

/**
 * Get current user profile
 */
export async function getCurrentUser(): Promise<User> {
  const response = await apiClient.get<ApiResponse<User>>('/auth/me');
  return response.data.data;
}

/**
 * Schedule automatic token refresh before expiry
 */
let refreshTimer: NodeJS.Timeout | null = null;

function scheduleTokenRefresh(expiresIn: number): void {
  // Clear existing timer
  if (refreshTimer) {
    clearTimeout(refreshTimer);
  }

  // Refresh 5 minutes before expiry
  const refreshThreshold = 5 * 60; // 5 minutes
  const delay = (expiresIn - refreshThreshold) * 1000;

  if (delay > 0) {
    refreshTimer = setTimeout(async () => {
      try {
        const { token } = useAuthStore.getState();
        await refreshAccessToken(token);
      } catch (error) {
        console.error('Auto token refresh failed:', error);
        // Logout on refresh failure
        await logout();
      }
    }, delay);
  }
}

/**
 * Secure token storage
 */
const REFRESH_TOKEN_KEY = 'refresh_token';

function storeRefreshToken(token: string): void {
  // In production, consider using httpOnly cookies
  if (typeof window !== 'undefined') {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  }
}

function getRefreshToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }
  return null;
}

function clearRefreshToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem('auth_token');
  }
}
```

---

## Error Handling Strategy

### Error Classification

```
┌────────────────────────────────────────────────────────────┐
│                    Error Hierarchy                          │
└────────────────────────────────────────────────────────────┘

ApiError
├── NetworkError (No internet, timeout)
│   ├── TimeoutError
│   ├── ConnectionError
│   └── OfflineError
│
├── ClientError (4xx)
│   ├── ValidationError (422)
│   ├── UnauthorizedError (401)
│   ├── ForbiddenError (403)
│   └── NotFoundError (404)
│
├── ServerError (5xx)
│   ├── InternalServerError (500)
│   ├── ServiceUnavailableError (503)
│   └── GatewayError (502, 504)
│
└── ApplicationError (Custom)
    ├── RequestCancelledError
    ├── RequestDuplicateError
    └── InvalidResponseError
```

### Error Handling Implementation

```typescript
// File: src/lib/api/errors.ts

/**
 * Custom Error Classes
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NetworkError extends ApiError {
  constructor(message: string, public originalError?: Error) {
    super(message, 'NETWORK_ERROR');
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends NetworkError {
  constructor(timeout: number) {
    super(`Request timeout after ${timeout}ms`);
    this.code = 'TIMEOUT_ERROR';
    this.name = 'TimeoutError';
  }
}

export class ValidationError extends ApiError {
  constructor(
    message: string,
    public fieldErrors: Record<string, string[]>
  ) {
    super(message, 'VALIDATION_ERROR', 422, fieldErrors);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string = 'Forbidden') {
    super(message, 'FORBIDDEN', 403);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends ApiError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class ServerError extends ApiError {
  constructor(message: string, statusCode: number) {
    super(message, 'SERVER_ERROR', statusCode);
    this.name = 'ServerError';
  }
}

export class RequestCancelledError extends ApiError {
  constructor(message: string = 'Request cancelled') {
    super(message, 'REQUEST_CANCELLED');
    this.name = 'RequestCancelledError';
  }
}

export class RequestDuplicateError extends ApiError {
  constructor(message: string, public requestKey: string) {
    super(message, 'REQUEST_DUPLICATE');
    this.name = 'RequestDuplicateError';
  }
}

/**
 * Transform Axios error to custom error
 */
export function transformApiError(error: AxiosError): ApiError {
  // Request cancelled
  if (axios.isCancel(error)) {
    return new RequestCancelledError();
  }

  // Timeout
  if (error.code === 'ECONNABORTED') {
    return new TimeoutError(error.config?.timeout || 0);
  }

  // Network error (no response)
  if (!error.response) {
    if (error.code === 'ERR_NETWORK') {
      return new NetworkError('Network error. Please check your connection.', error);
    }
    return new NetworkError('An unknown network error occurred.', error);
  }

  const { status, data } = error.response;
  const apiErrorData = data as ApiError | undefined;

  // Extract error message
  const message = apiErrorData?.error?.message ||
                  apiErrorData?.message ||
                  error.message ||
                  'An error occurred';

  // Handle by status code
  switch (status) {
    case 400:
      return new ApiError(message, 'BAD_REQUEST', 400, apiErrorData?.error?.details);

    case 401:
      return new UnauthorizedError(message);

    case 403:
      return new ForbiddenError(message);

    case 404:
      return new NotFoundError(message);

    case 422:
      const fieldErrors = apiErrorData?.error?.details || {};
      return new ValidationError(message, fieldErrors);

    case 429:
      return new ApiError('Too many requests. Please try again later.', 'RATE_LIMIT', 429);

    case 500:
    case 502:
    case 503:
    case 504:
      return new ServerError(message, status);

    default:
      return new ApiError(message, 'UNKNOWN_ERROR', status);
  }
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyErrorMessage(error: unknown): string {
  if (error instanceof ValidationError) {
    const firstFieldError = Object.values(error.fieldErrors)[0]?.[0];
    return firstFieldError || 'Validation failed';
  }

  if (error instanceof UnauthorizedError) {
    return 'Your session has expired. Please login again.';
  }

  if (error instanceof ForbiddenError) {
    return 'You do not have permission to perform this action.';
  }

  if (error instanceof NotFoundError) {
    return 'The requested resource was not found.';
  }

  if (error instanceof TimeoutError) {
    return 'Request timed out. Please try again.';
  }

  if (error instanceof NetworkError) {
    return 'Network error. Please check your internet connection.';
  }

  if (error instanceof ServerError) {
    return 'A server error occurred. Please try again later.';
  }

  if (error instanceof RequestCancelledError) {
    return 'Request was cancelled.';
  }

  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred.';
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof NetworkError) return true;
  if (error instanceof TimeoutError) return true;
  if (error instanceof ServerError) {
    // Retry on 502, 503, 504 (temporary server issues)
    return error.statusCode !== 500;
  }
  return false;
}
```

### Error Retry Strategy

```typescript
// File: src/lib/api/retry.ts

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
  retryableErrors: string[];
}

export const defaultRetryConfig: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
  retryableErrors: ['NETWORK_ERROR', 'TIMEOUT_ERROR', 'SERVER_ERROR'],
};

/**
 * Calculate exponential backoff delay
 */
export function calculateBackoff(attempt: number, config: RetryConfig = defaultRetryConfig): number {
  const delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);

  // Add jitter to prevent thundering herd
  const jitter = Math.random() * 0.3 * delay; // ±30% jitter

  return Math.min(delay + jitter, config.maxDelay);
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig = defaultRetryConfig
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Check if error is retryable
      if (!isRetryableError(error) || attempt === config.maxAttempts) {
        throw error;
      }

      // Calculate delay
      const delay = calculateBackoff(attempt, config);

      console.log(`[Retry] Attempt ${attempt} failed. Retrying in ${delay}ms...`);

      // Wait before retrying
      await sleep(delay);
    }
  }

  throw lastError;
}
```

---

## Performance Optimization

### 1. Request Batching

```typescript
// File: src/lib/api/batching.ts

/**
 * Request Batching
 * Combines multiple requests into a single batch request
 */

export interface BatchRequest {
  id: string;
  method: string;
  url: string;
  data?: any;
}

export interface BatchResponse {
  id: string;
  status: number;
  data: any;
  error?: any;
}

class RequestBatcher {
  private queue: BatchRequest[] = [];
  private timer: NodeJS.Timeout | null = null;
  private readonly batchDelay = 50; // ms
  private readonly maxBatchSize = 10;

  /**
   * Add request to batch queue
   */
  add(request: BatchRequest): Promise<BatchResponse> {
    return new Promise((resolve, reject) => {
      this.queue.push({ ...request, resolve, reject } as any);

      // Schedule batch execution
      if (!this.timer) {
        this.timer = setTimeout(() => this.flush(), this.batchDelay);
      }

      // Flush immediately if batch is full
      if (this.queue.length >= this.maxBatchSize) {
        this.flush();
      }
    });
  }

  /**
   * Execute batch request
   */
  private async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.queue.length === 0) return;

    const batch = this.queue.splice(0, this.maxBatchSize);

    try {
      const response = await apiClient.post<BatchResponse[]>('/batch', {
        requests: batch.map(({ id, method, url, data }) => ({
          id,
          method,
          url,
          data,
        })),
      });

      // Resolve individual requests
      response.data.forEach((result) => {
        const request = batch.find((r) => r.id === result.id);
        if (request) {
          if (result.error) {
            (request as any).reject(result.error);
          } else {
            (request as any).resolve(result);
          }
        }
      });
    } catch (error) {
      // Reject all requests in batch
      batch.forEach((request) => {
        (request as any).reject(error);
      });
    }
  }
}

export const requestBatcher = new RequestBatcher();
```

### 2. Response Caching Strategy

```typescript
// File: src/lib/api/cache.ts

/**
 * Cache Strategy Configuration
 */

export interface CacheStrategy {
  staleTime: number; // Time before data is considered stale
  cacheTime: number; // Time before data is garbage collected
  refetchOnMount: boolean;
  refetchOnWindowFocus: boolean;
  refetchOnReconnect: boolean;
}

/**
 * Cache strategies by endpoint type
 */
export const cacheStrategies: Record<string, CacheStrategy> = {
  // Static data - rarely changes
  static: {
    staleTime: 60 * 60 * 1000, // 1 hour
    cacheTime: 24 * 60 * 60 * 1000, // 24 hours
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  },

  // Semi-static data - changes occasionally
  semiStatic: {
    staleTime: 10 * 60 * 1000, // 10 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  },

  // Dynamic data - changes frequently
  dynamic: {
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  },

  // Real-time data - always fresh
  realtime: {
    staleTime: 0, // Always stale
    cacheTime: 1 * 60 * 1000, // 1 minute
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  },
};

/**
 * Endpoint cache configuration
 */
export const endpointCacheConfig: Record<string, keyof typeof cacheStrategies> = {
  // Static
  '/admin/templates': 'static',
  '/admin/salons/:id/settings': 'static',

  // Semi-static
  '/admin/salons': 'semiStatic',
  '/admin/customers': 'semiStatic',

  // Dynamic
  '/admin/bookings': 'dynamic',
  '/admin/analytics': 'dynamic',

  // Real-time
  '/admin/messages': 'realtime',
  '/admin/conversations': 'realtime',
};

/**
 * Get cache strategy for endpoint
 */
export function getCacheStrategy(endpoint: string): CacheStrategy {
  const strategyKey = endpointCacheConfig[endpoint] || 'dynamic';
  return cacheStrategies[strategyKey];
}
```

### 3. Request Deduplication

```typescript
// File: src/lib/api/deduplication.ts

/**
 * Request Deduplication
 * Prevents duplicate identical requests in flight
 */

/**
 * Generate unique key for request
 */
export function generateRequestKey(config: InternalAxiosRequestConfig): string {
  const { method, url, params, data } = config;

  return JSON.stringify({
    method,
    url,
    params: params ? JSON.stringify(params) : undefined,
    data: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * Generate unique request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
```

### 4. Lazy Loading & Code Splitting

```typescript
// File: src/lib/api/lazy.ts

/**
 * Lazy-loaded API modules
 */

export const lazyApiModules = {
  analytics: () => import('./modules/analytics'),
  reports: () => import('./modules/reports'),
  exports: () => import('./modules/exports'),
};

/**
 * Load API module on demand
 */
export async function loadApiModule<T>(
  module: keyof typeof lazyApiModules
): Promise<T> {
  const loaded = await lazyApiModules[module]();
  return loaded.default as T;
}
```

### 5. Pagination Strategy

```typescript
// File: src/lib/api/pagination.ts

/**
 * Pagination Utilities
 */

export interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Infinite scroll pagination hook
 */
export function useInfiniteScroll<T>(
  queryKey: unknown[],
  queryFn: (page: number) => Promise<PaginatedResponse<T>>
) {
  return useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam = 1 }) => queryFn(pageParam),
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.hasNext) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
  });
}

/**
 * Cursor-based pagination hook
 */
export function useCursorPagination<T>(
  queryKey: unknown[],
  queryFn: (cursor?: string) => Promise<{ data: T[]; nextCursor?: string }>
) {
  return useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => queryFn(pageParam),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined,
  });
}
```

---

## Integration Patterns

### 1. Optimistic Updates

```typescript
// File: src/lib/query/optimistic.ts

/**
 * Optimistic Update Pattern
 * Update UI immediately, rollback on error
 */

export function useOptimisticUpdate<TData, TVariables>(
  queryKey: unknown[],
  mutationFn: (variables: TVariables) => Promise<TData>,
  updater: (oldData: TData | undefined, variables: TVariables) => TData
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,

    // Before mutation - optimistically update cache
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous value
      const previousData = queryClient.getQueryData<TData>(queryKey);

      // Optimistically update cache
      queryClient.setQueryData<TData>(queryKey, (old) => updater(old, variables));

      // Return context for rollback
      return { previousData };
    },

    // On error - rollback optimistic update
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },

    // Always refetch after mutation
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

/**
 * Example: Optimistic booking creation
 */
export function useCreateBookingOptimistic(salonId: string) {
  return useOptimisticUpdate(
    queryKeys.bookings.list(salonId),
    (data: CreateBookingRequest) => api.bookings.create(salonId, data),
    (oldData, newBooking) => {
      if (!oldData) return { data: [], pagination: {} } as any;

      // Add new booking to list
      return {
        ...oldData,
        data: [
          {
            ...newBooking,
            id: `temp-${Date.now()}`, // Temporary ID
            created_at: new Date().toISOString(),
          },
          ...oldData.data,
        ],
      };
    }
  );
}
```

### 2. Real-time Sync (Polling)

```typescript
// File: src/lib/query/realtime.ts

/**
 * Real-time Sync with Polling
 */

export function useRealtimeQuery<TData>(
  queryKey: unknown[],
  queryFn: () => Promise<TData>,
  options?: {
    interval?: number;
    enabled?: boolean;
  }
) {
  return useQuery({
    queryKey,
    queryFn,
    refetchInterval: options?.interval || 5000, // 5 seconds default
    refetchIntervalInBackground: false,
    enabled: options?.enabled ?? true,
  });
}

/**
 * Example: Real-time message polling
 */
export function useRealtimeMessages(salonId: string, conversationId: string) {
  return useRealtimeQuery(
    queryKeys.messages.list(salonId, { conversation_id: conversationId }),
    () => api.messages.getAll(salonId, { conversation_id: conversationId }),
    {
      interval: 3000, // Poll every 3 seconds
    }
  );
}

/**
 * WebSocket integration (future)
 */
export function useWebSocketQuery<TData>(
  queryKey: unknown[],
  queryFn: () => Promise<TData>,
  wsUrl: string
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      // Update query cache with WebSocket data
      queryClient.setQueryData(queryKey, data);
    };

    return () => {
      ws.close();
    };
  }, [queryKey, wsUrl, queryClient]);

  return useQuery({
    queryKey,
    queryFn,
    staleTime: Infinity, // Data updated via WebSocket
  });
}
```

### 3. Offline Support

```typescript
// File: src/lib/api/offline.ts

/**
 * Offline Request Queue
 */

interface QueuedRequest {
  id: string;
  method: string;
  url: string;
  data?: any;
  timestamp: number;
  retries: number;
}

class OfflineRequestQueue {
  private queue: QueuedRequest[] = [];
  private readonly STORAGE_KEY = 'offline_request_queue';
  private readonly MAX_RETRIES = 3;

  constructor() {
    this.loadQueue();
    this.setupOnlineListener();
  }

  /**
   * Add request to queue
   */
  add(method: string, url: string, data?: any): string {
    const request: QueuedRequest = {
      id: generateRequestId(),
      method,
      url,
      data,
      timestamp: Date.now(),
      retries: 0,
    };

    this.queue.push(request);
    this.saveQueue();

    return request.id;
  }

  /**
   * Process queue when online
   */
  async processQueue(): Promise<void> {
    if (!navigator.onLine || this.queue.length === 0) return;

    const requests = [...this.queue];
    this.queue = [];

    for (const request of requests) {
      try {
        await apiClient.request({
          method: request.method,
          url: request.url,
          data: request.data,
        });

        console.log(`[Offline Queue] Request ${request.id} processed`);
      } catch (error) {
        request.retries++;

        if (request.retries < this.MAX_RETRIES) {
          // Re-queue failed request
          this.queue.push(request);
        } else {
          console.error(`[Offline Queue] Request ${request.id} failed after ${this.MAX_RETRIES} retries`);
        }
      }
    }

    this.saveQueue();
  }

  /**
   * Load queue from storage
   */
  private loadQueue(): void {
    if (typeof window === 'undefined') return;

    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      this.queue = JSON.parse(stored);
    }
  }

  /**
   * Save queue to storage
   */
  private saveQueue(): void {
    if (typeof window === 'undefined') return;

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.queue));
  }

  /**
   * Setup online/offline listeners
   */
  private setupOnlineListener(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      console.log('[Offline Queue] Back online, processing queue');
      this.processQueue();
    });
  }

  /**
   * Get queue status
   */
  getStatus(): { count: number; requests: QueuedRequest[] } {
    return {
      count: this.queue.length,
      requests: [...this.queue],
    };
  }

  /**
   * Clear queue
   */
  clear(): void {
    this.queue = [];
    this.saveQueue();
  }
}

export const offlineQueue = new OfflineRequestQueue();

/**
 * Offline-aware mutation hook
 */
export function useOfflineMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>
) {
  return useMutation({
    mutationFn: async (variables) => {
      if (!navigator.onLine) {
        // Queue request for later
        const requestId = offlineQueue.add('POST', '/queued', variables);
        throw new Error(`Request queued: ${requestId}`);
      }

      return mutationFn(variables);
    },
  });
}
```

### 4. Multi-tenant Support

```typescript
// File: src/lib/api/multiTenant.ts

/**
 * Multi-tenant Request Context
 */

export interface TenantContext {
  salonId: string;
  userId: string;
  role: UserRole;
}

/**
 * Get current tenant context
 */
export function getTenantContext(): TenantContext | null {
  const { user, isAuthenticated } = useAuthStore.getState();

  if (!isAuthenticated || !user) return null;

  return {
    salonId: user.salon_id || '',
    userId: user.id,
    role: user.role,
  };
}

/**
 * Tenant-aware query key
 */
export function createTenantQueryKey(
  baseKey: unknown[],
  salonId?: string
): unknown[] {
  const context = getTenantContext();
  const tenant = salonId || context?.salonId;

  return tenant ? [...baseKey, { tenant }] : baseKey;
}

/**
 * Switch tenant and invalidate queries
 */
export async function switchTenant(newSalonId: string): Promise<void> {
  // Invalidate all queries for current tenant
  await queryClient.invalidateQueries({
    predicate: (query) => {
      const queryKey = query.queryKey;
      return Array.isArray(queryKey) && queryKey.some((key) =>
        typeof key === 'object' && key !== null && 'tenant' in key
      );
    },
  });

  // Update current salon in store
  const { user, updateUser } = useAuthStore.getState();
  if (user) {
    updateUser({ salon_id: newSalonId });
  }
}
```

---

## Security Considerations

### 1. Token Management

```typescript
// File: src/lib/security/token.ts

/**
 * Secure Token Management
 */

export interface TokenMetadata {
  token: string;
  expiresAt: number; // Unix timestamp
  refreshToken?: string;
}

/**
 * Token expiry check
 */
export function isTokenExpired(expiresAt: number): boolean {
  return Date.now() >= expiresAt * 1000;
}

/**
 * Check if token needs refresh
 */
export function shouldRefreshToken(expiresAt: number, threshold: number = 300): boolean {
  const secondsUntilExpiry = expiresAt - Math.floor(Date.now() / 1000);
  return secondsUntilExpiry <= threshold;
}

/**
 * Parse JWT token (without verification)
 */
export function parseJwt(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * Validate token format
 */
export function isValidTokenFormat(token: string): boolean {
  return /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/.test(token);
}
```

### 2. XSS Protection

```typescript
// File: src/lib/security/xss.ts

/**
 * XSS Protection Utilities
 */

/**
 * Sanitize HTML content
 */
export function sanitizeHtml(html: string): string {
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
}

/**
 * Escape special characters
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };

  return text.replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * Safe JSON parse
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}
```

### 3. CSRF Protection

```typescript
// File: src/lib/security/csrf.ts

/**
 * CSRF Protection
 */

/**
 * Generate CSRF token
 */
export function generateCsrfToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Store CSRF token
 */
export function storeCsrfToken(token: string): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('csrf_token', token);
  }
}

/**
 * Get CSRF token
 */
export function getCsrfToken(): string | null {
  if (typeof window !== 'undefined') {
    return sessionStorage.getItem('csrf_token');
  }
  return null;
}

/**
 * CSRF interceptor
 */
export function csrfInterceptor(config: InternalAxiosRequestConfig) {
  // Add CSRF token to state-changing requests
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(config.method?.toUpperCase() || '')) {
    const csrfToken = getCsrfToken();
    if (csrfToken && config.headers) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
  }

  return config;
}
```

### 4. Rate Limiting (Client-side)

```typescript
// File: src/lib/security/rateLimit.ts

/**
 * Client-side Rate Limiting
 */

class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 60) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  /**
   * Check if request is allowed
   */
  isAllowed(key: string): boolean {
    const now = Date.now();
    const timestamps = this.requests.get(key) || [];

    // Remove old timestamps outside window
    const validTimestamps = timestamps.filter((ts) => now - ts < this.windowMs);

    // Check if limit exceeded
    if (validTimestamps.length >= this.maxRequests) {
      return false;
    }

    // Add new timestamp
    validTimestamps.push(now);
    this.requests.set(key, validTimestamps);

    return true;
  }

  /**
   * Get remaining requests
   */
  getRemaining(key: string): number {
    const now = Date.now();
    const timestamps = this.requests.get(key) || [];
    const validTimestamps = timestamps.filter((ts) => now - ts < this.windowMs);

    return Math.max(0, this.maxRequests - validTimestamps.length);
  }

  /**
   * Reset limit for key
   */
  reset(key: string): void {
    this.requests.delete(key);
  }
}

export const rateLimiter = new RateLimiter();

/**
 * Rate limit interceptor
 */
export function rateLimitInterceptor(config: InternalAxiosRequestConfig) {
  const key = `${config.method}:${config.url}`;

  if (!rateLimiter.isAllowed(key)) {
    throw new ApiError(
      'Rate limit exceeded. Please try again later.',
      'RATE_LIMIT_EXCEEDED',
      429
    );
  }

  return config;
}
```

---

## Testing Strategy

### 1. Unit Tests

```typescript
// File: src/lib/api/__tests__/client.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../client';
import { useAuthStore } from '@/store/useAuthStore';

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should inject auth token in request headers', async () => {
      const token = 'test-token';
      useAuthStore.getState().login({ id: '1', email: 'test@example.com' } as User, token);

      const request = await apiClient.get('/test');

      expect(request.config.headers.Authorization).toBe(`Bearer ${token}`);
    });

    it('should not inject token if not authenticated', async () => {
      useAuthStore.getState().logout();

      const request = await apiClient.get('/test');

      expect(request.config.headers.Authorization).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should transform 401 error to UnauthorizedError', async () => {
      const error = {
        response: {
          status: 401,
          data: { message: 'Unauthorized' },
        },
      };

      const transformed = transformApiError(error as AxiosError);

      expect(transformed).toBeInstanceOf(UnauthorizedError);
      expect(transformed.statusCode).toBe(401);
    });

    it('should handle network errors', async () => {
      const error = {
        code: 'ERR_NETWORK',
        message: 'Network error',
      };

      const transformed = transformApiError(error as AxiosError);

      expect(transformed).toBeInstanceOf(NetworkError);
    });
  });

  describe('Retry Logic', () => {
    it('should retry on network error', async () => {
      const mockFn = vi.fn()
        .mockRejectedValueOnce(new NetworkError('Network error'))
        .mockResolvedValueOnce({ data: 'success' });

      const result = await retryWithBackoff(mockFn);

      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ data: 'success' });
    });

    it('should not retry on client errors', async () => {
      const mockFn = vi.fn()
        .mockRejectedValue(new ValidationError('Validation failed', {}));

      await expect(retryWithBackoff(mockFn)).rejects.toThrow(ValidationError);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });
});
```

### 2. Integration Tests

```typescript
// File: src/lib/api/__tests__/integration.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useBookings, useCreateBooking } from '@/hooks/api/useBookings';
import { server } from '@/mocks/server';

describe('API Integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  describe('Bookings API', () => {
    it('should fetch bookings', async () => {
      const { result } = renderHook(
        () => useBookings('salon-1'),
        { wrapper }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.data).toHaveLength(3);
    });

    it('should create booking with optimistic update', async () => {
      const { result: listResult } = renderHook(
        () => useBookings('salon-1'),
        { wrapper }
      );

      const { result: mutationResult } = renderHook(
        () => useCreateBooking('salon-1'),
        { wrapper }
      );

      // Wait for initial data
      await waitFor(() => expect(listResult.current.isSuccess).toBe(true));

      const initialCount = listResult.current.data?.data.length || 0;

      // Create booking
      mutationResult.current.mutate({
        customer_name: 'John Doe',
        customer_phone: '+1234567890',
        service: 'Haircut',
        start_ts: new Date().toISOString(),
      });

      // Check optimistic update
      await waitFor(() => {
        const newCount = listResult.current.data?.data.length || 0;
        expect(newCount).toBe(initialCount + 1);
      });
    });
  });
});
```

### 3. Mock Service Worker Setup

```typescript
// File: src/mocks/handlers.ts

import { rest } from 'msw';
import { setupServer } from 'msw/node';

const API_URL = 'http://localhost:4000';

export const handlers = [
  // Auth endpoints
  rest.post(`${API_URL}/auth/login`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          token: 'mock-token',
          user: {
            id: '1',
            email: 'test@example.com',
            name: 'Test User',
            role: 'SALON_ADMIN',
            salon_id: 'salon-1',
          },
          expiresIn: 3600,
        },
      })
    );
  }),

  // Bookings endpoints
  rest.get(`${API_URL}/admin/bookings/:salonId`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: [
          {
            id: '1',
            customer_name: 'John Doe',
            customer_phone: '+1234567890',
            service: 'Haircut',
            status: 'CONFIRMED',
            start_ts: '2025-10-20T10:00:00Z',
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      })
    );
  }),

  rest.post(`${API_URL}/admin/bookings/:salonId`, (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({
        success: true,
        data: {
          id: '2',
          ...req.body,
          status: 'PENDING',
          created_at: new Date().toISOString(),
        },
      })
    );
  }),
];

export const server = setupServer(...handlers);
```

### 4. Error Scenario Testing

```typescript
// File: src/lib/api/__tests__/error-scenarios.test.ts

import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { server } from '@/mocks/server';
import { rest } from 'msw';
import { useBookings } from '@/hooks/api/useBookings';

describe('Error Scenarios', () => {
  it('should handle 500 server error', async () => {
    server.use(
      rest.get('/admin/bookings/:salonId', (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ message: 'Internal server error' }));
      })
    );

    const { result } = renderHook(() => useBookings('salon-1'));

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(ServerError);
  });

  it('should handle network timeout', async () => {
    server.use(
      rest.get('/admin/bookings/:salonId', (req, res, ctx) => {
        return res(ctx.delay(31000)); // Exceed timeout
      })
    );

    const { result } = renderHook(() => useBookings('salon-1'));

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(TimeoutError);
  });

  it('should handle validation errors', async () => {
    server.use(
      rest.post('/admin/bookings/:salonId', (req, res, ctx) => {
        return res(
          ctx.status(422),
          ctx.json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Validation failed',
              details: {
                customer_phone: ['Invalid phone number format'],
              },
            },
          })
        );
      })
    );

    const { result } = renderHook(() => useCreateBooking('salon-1'));

    result.current.mutate({
      customer_name: 'John',
      customer_phone: 'invalid',
      service: 'Haircut',
      start_ts: new Date().toISOString(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(ValidationError);
  });
});
```

---

## Implementation Roadmap

### Phase 1: Core Improvements (Week 1)

**Priority: Critical**

1. **Enhanced Request Interceptors**
   - Implement salon context injection
   - Add request ID tracking
   - Implement request deduplication
   - Add comprehensive logging

2. **Enhanced Response Interceptors**
   - Implement token refresh logic
   - Add retry with exponential backoff
   - Improve error transformation
   - Add response caching hints

3. **Error Handling**
   - Create custom error classes
   - Implement error transformation
   - Add user-friendly error messages
   - Create error boundary integration

**Deliverables:**
- `src/lib/api/interceptors/request.ts`
- `src/lib/api/interceptors/response.ts`
- `src/lib/api/errors.ts`
- `src/lib/api/retry.ts`

### Phase 2: Performance Optimization (Week 2)

**Priority: High**

1. **Request Management**
   - Implement request cancellation
   - Add request batching
   - Implement deduplication
   - Add timeout configuration

2. **Caching Strategy**
   - Define cache strategies by endpoint
   - Implement prefetching
   - Add cache invalidation rules
   - Implement stale-while-revalidate

3. **Code Splitting**
   - Lazy load API modules
   - Implement dynamic imports
   - Add route-based code splitting

**Deliverables:**
- `src/lib/api/cancellation.ts`
- `src/lib/api/batching.ts`
- `src/lib/api/cache.ts`
- `src/lib/api/lazy.ts`

### Phase 3: Advanced Patterns (Week 3)

**Priority: Medium**

1. **Optimistic Updates**
   - Implement optimistic update helpers
   - Add rollback mechanisms
   - Implement conflict resolution
   - Add optimistic UI feedback

2. **Real-time Sync**
   - Implement polling strategy
   - Add WebSocket support
   - Implement event-driven updates
   - Add real-time indicators

3. **Offline Support**
   - Implement request queue
   - Add offline detection
   - Implement sync on reconnect
   - Add offline indicators

**Deliverables:**
- `src/lib/query/optimistic.ts`
- `src/lib/query/realtime.ts`
- `src/lib/api/offline.ts`

### Phase 4: Security & Testing (Week 4)

**Priority: Critical**

1. **Security Enhancements**
   - Implement token validation
   - Add XSS protection
   - Implement CSRF protection
   - Add rate limiting

2. **Testing Suite**
   - Write unit tests for API client
   - Write integration tests
   - Set up MSW for mocking
   - Add error scenario tests
   - Implement E2E tests

3. **Documentation**
   - API client usage guide
   - Error handling guide
   - Testing guide
   - Security best practices

**Deliverables:**
- `src/lib/security/*`
- `src/lib/api/__tests__/*`
- `src/mocks/*`
- Testing documentation

---

## Code Examples

### Complete API Client Setup

```typescript
// File: src/lib/api/client.ts

import axios, { AxiosInstance } from 'axios';
import { defaultConfig } from './config';
import {
  authInterceptor,
  salonContextInterceptor,
  requestIdInterceptor,
  deduplicationInterceptor,
  timeoutInterceptor,
  loggingInterceptor,
} from './interceptors/request';
import {
  responseTransformInterceptor,
  responseErrorInterceptor,
} from './interceptors/response';

/**
 * Create configured API client
 */
export function createApiClient(config = defaultConfig): AxiosInstance {
  const client = axios.create({
    baseURL: config.baseURL,
    timeout: config.timeout,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptors (executed in order)
  client.interceptors.request.use(authInterceptor);
  client.interceptors.request.use(salonContextInterceptor);
  client.interceptors.request.use(requestIdInterceptor);
  client.interceptors.request.use(deduplicationInterceptor);
  client.interceptors.request.use(timeoutInterceptor);
  client.interceptors.request.use(loggingInterceptor);

  // Response interceptors
  client.interceptors.response.use(
    responseTransformInterceptor,
    responseErrorInterceptor
  );

  return client;
}

export const apiClient = createApiClient();
export default apiClient;
```

### Usage in Components

```typescript
// File: src/app/bookings/page.tsx

'use client';

import { useBookings, useCreateBooking } from '@/hooks/api/useBookings';
import { useAuthStore } from '@/store/useAuthStore';
import { useState } from 'react';

export default function BookingsPage() {
  const currentSalonId = useAuthStore((state) => state.user?.salon_id);
  const [page, setPage] = useState(1);

  // Fetch bookings with automatic caching and refetch
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useBookings(currentSalonId!, { page, limit: 10, status: 'CONFIRMED' });

  // Create booking with optimistic updates
  const createBooking = useCreateBooking(currentSalonId!, {
    onSuccess: () => {
      toast.success('Booking created successfully');
    },
    onError: (error) => {
      toast.error(getUserFriendlyErrorMessage(error));
    },
  });

  if (isLoading) return <Spinner />;
  if (isError) return <ErrorDisplay error={error} onRetry={refetch} />;

  return (
    <div>
      <BookingList data={data.data} />
      <Pagination
        current={page}
        total={data.pagination.totalPages}
        onChange={setPage}
      />

      <CreateBookingForm
        onSubmit={(values) => createBooking.mutate(values)}
        isLoading={createBooking.isPending}
      />
    </div>
  );
}
```

---

## Summary

This API Integration Architecture provides:

1. **Reliability**: Automatic retry, token refresh, and error recovery
2. **Performance**: Request deduplication, caching, and code splitting
3. **Security**: Token management, XSS protection, and rate limiting
4. **Developer Experience**: Type-safe, intuitive APIs with excellent error messages
5. **Testability**: Comprehensive testing strategy with mocks and integration tests

### Next Steps

1. Review this architecture document
2. Begin Phase 1 implementation (Core Improvements)
3. Set up testing infrastructure
4. Implement security measures
5. Document patterns and best practices

### Key Files to Create

```
src/lib/api/
├── client.ts                    ✅ (Existing, needs enhancement)
├── config.ts                    ⭕ (New)
├── environment.ts               ⭕ (New)
├── auth.ts                      ⭕ (New)
├── errors.ts                    ⭕ (New)
├── retry.ts                     ⭕ (New)
├── interceptors/
│   ├── request.ts               ⭕ (New)
│   └── response.ts              ⭕ (New)
├── cancellation.ts              ⭕ (New)
├── batching.ts                  ⭕ (New)
├── cache.ts                     ⭕ (New)
├── deduplication.ts             ⭕ (New)
├── lazy.ts                      ⭕ (New)
├── pagination.ts                ⭕ (New)
├── offline.ts                   ⭕ (New)
├── multiTenant.ts               ⭕ (New)
└── __tests__/
    ├── client.test.ts           ⭕ (New)
    ├── integration.test.ts      ⭕ (New)
    └── error-scenarios.test.ts  ⭕ (New)

src/lib/query/
├── optimistic.ts                ⭕ (New)
└── realtime.ts                  ⭕ (New)

src/lib/security/
├── token.ts                     ⭕ (New)
├── xss.ts                       ⭕ (New)
├── csrf.ts                      ⭕ (New)
└── rateLimit.ts                 ⭕ (New)

src/mocks/
├── handlers.ts                  ⭕ (New)
└── server.ts                    ⭕ (New)
```

**Status Legend:**
- ✅ Exists, needs enhancement
- ⭕ New file required

---

**Document End**
