# API Testing Strategy
## WhatsApp SaaS Platform

> **Purpose**: Comprehensive testing strategy for API integration
> **Version**: 1.0.0
> **Last Updated**: 2025-10-20

---

## Table of Contents

1. [Testing Pyramid](#testing-pyramid)
2. [Unit Tests](#unit-tests)
3. [Integration Tests](#integration-tests)
4. [E2E Tests](#e2e-tests)
5. [Mock Strategy](#mock-strategy)
6. [Test Coverage](#test-coverage)
7. [Performance Tests](#performance-tests)
8. [Security Tests](#security-tests)

---

## Testing Pyramid

```
                    E2E Tests (10%)
                  ┌─────────────┐
                 /               \
                /  Integration    \
               /    Tests (30%)    \
              /_____________________\
             /                       \
            /     Unit Tests (60%)    \
           /_________________________\
```

### Testing Priorities

1. **Unit Tests (60%)**: Test individual functions and utilities
2. **Integration Tests (30%)**: Test API client with mocked backend
3. **E2E Tests (10%)**: Test complete user flows with real backend

---

## Unit Tests

### API Client Utilities

#### File: `src/lib/api/__tests__/utils.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { generateRequestId, calculateBackoff } from '../utils';

describe('API Utils', () => {
  describe('generateRequestId', () => {
    it('should generate unique request IDs', () => {
      const id1 = generateRequestId();
      const id2 = generateRequestId();

      expect(id1).toMatch(/^req_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^req_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('calculateBackoff', () => {
    it('should calculate exponential backoff', () => {
      const config = {
        baseDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
      };

      expect(calculateBackoff(1, config)).toBe(1000);
      expect(calculateBackoff(2, config)).toBe(2000);
      expect(calculateBackoff(3, config)).toBe(4000);
    });

    it('should not exceed max delay', () => {
      const config = {
        baseDelay: 1000,
        maxDelay: 5000,
        backoffMultiplier: 2,
      };

      expect(calculateBackoff(10, config)).toBe(5000);
    });
  });
});
```

### Error Handling

#### File: `src/lib/api/__tests__/errors.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import {
  ApiError,
  NetworkError,
  TimeoutError,
  ValidationError,
  transformApiError,
  getUserFriendlyErrorMessage,
} from '../errors';
import { AxiosError } from 'axios';

describe('Error Handling', () => {
  describe('ApiError', () => {
    it('should create ApiError with message and code', () => {
      const error = new ApiError('Test error', 'TEST_ERROR', 400);

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.statusCode).toBe(400);
    });
  });

  describe('NetworkError', () => {
    it('should create NetworkError', () => {
      const error = new NetworkError('Connection failed');

      expect(error).toBeInstanceOf(ApiError);
      expect(error.code).toBe('NETWORK_ERROR');
    });
  });

  describe('ValidationError', () => {
    it('should create ValidationError with field errors', () => {
      const fieldErrors = {
        email: ['Invalid email format'],
        password: ['Password too short'],
      };

      const error = new ValidationError('Validation failed', fieldErrors);

      expect(error).toBeInstanceOf(ApiError);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.statusCode).toBe(422);
      expect(error.fieldErrors).toEqual(fieldErrors);
    });
  });

  describe('transformApiError', () => {
    it('should transform 401 error', () => {
      const axiosError = {
        response: {
          status: 401,
          data: { message: 'Unauthorized' },
        },
      } as AxiosError;

      const error = transformApiError(axiosError);

      expect(error).toBeInstanceOf(UnauthorizedError);
      expect(error.statusCode).toBe(401);
    });

    it('should transform 422 validation error', () => {
      const axiosError = {
        response: {
          status: 422,
          data: {
            error: {
              message: 'Validation failed',
              details: {
                email: ['Invalid format'],
              },
            },
          },
        },
      } as AxiosError;

      const error = transformApiError(axiosError);

      expect(error).toBeInstanceOf(ValidationError);
      expect(error.fieldErrors).toHaveProperty('email');
    });

    it('should transform network error', () => {
      const axiosError = {
        code: 'ERR_NETWORK',
        message: 'Network error',
      } as AxiosError;

      const error = transformApiError(axiosError);

      expect(error).toBeInstanceOf(NetworkError);
    });
  });

  describe('getUserFriendlyErrorMessage', () => {
    it('should return user-friendly message for ValidationError', () => {
      const error = new ValidationError('Validation failed', {
        email: ['Invalid email'],
      });

      const message = getUserFriendlyErrorMessage(error);

      expect(message).toBe('Invalid email');
    });

    it('should return generic message for unknown error', () => {
      const message = getUserFriendlyErrorMessage(new Error('Unknown'));

      expect(message).toBe('Unknown');
    });
  });
});
```

### Token Management

#### File: `src/lib/security/__tests__/token.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest';
import {
  isTokenExpired,
  shouldRefreshToken,
  parseJwt,
  isValidTokenFormat,
} from '../token';

describe('Token Management', () => {
  describe('isTokenExpired', () => {
    it('should return true for expired token', () => {
      const pastTimestamp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      expect(isTokenExpired(pastTimestamp)).toBe(true);
    });

    it('should return false for valid token', () => {
      const futureTimestamp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      expect(isTokenExpired(futureTimestamp)).toBe(false);
    });
  });

  describe('shouldRefreshToken', () => {
    it('should return true when token expires soon', () => {
      const expiresAt = Math.floor(Date.now() / 1000) + 200; // 200 seconds
      expect(shouldRefreshToken(expiresAt, 300)).toBe(true); // 5 min threshold
    });

    it('should return false when token has time', () => {
      const expiresAt = Math.floor(Date.now() / 1000) + 3600; // 1 hour
      expect(shouldRefreshToken(expiresAt, 300)).toBe(false);
    });
  });

  describe('parseJwt', () => {
    it('should parse valid JWT', () => {
      // Mock JWT: header.payload.signature
      const mockJwt =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJleHAiOjE2MDk0NTkyMDB9.signature';

      const payload = parseJwt(mockJwt);

      expect(payload).toHaveProperty('userId', '123');
      expect(payload).toHaveProperty('exp');
    });

    it('should return null for invalid JWT', () => {
      const payload = parseJwt('invalid-jwt');

      expect(payload).toBeNull();
    });
  });

  describe('isValidTokenFormat', () => {
    it('should validate correct JWT format', () => {
      const validToken = 'header.payload.signature';
      expect(isValidTokenFormat(validToken)).toBe(true);
    });

    it('should reject invalid JWT format', () => {
      expect(isValidTokenFormat('invalid')).toBe(false);
      expect(isValidTokenFormat('only.two')).toBe(false);
    });
  });
});
```

### Retry Logic

#### File: `src/lib/api/__tests__/retry.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { retryWithBackoff, isRetryableError } from '../retry';
import { NetworkError, ServerError, ValidationError } from '../errors';

describe('Retry Logic', () => {
  describe('retryWithBackoff', () => {
    it('should retry on retryable error', async () => {
      const mockFn = vi
        .fn()
        .mockRejectedValueOnce(new NetworkError('Network error'))
        .mockRejectedValueOnce(new NetworkError('Network error'))
        .mockResolvedValueOnce({ data: 'success' });

      const result = await retryWithBackoff(mockFn);

      expect(mockFn).toHaveBeenCalledTimes(3);
      expect(result).toEqual({ data: 'success' });
    });

    it('should not retry on non-retryable error', async () => {
      const mockFn = vi
        .fn()
        .mockRejectedValue(new ValidationError('Validation failed', {}));

      await expect(retryWithBackoff(mockFn)).rejects.toThrow(ValidationError);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should throw after max retries', async () => {
      const mockFn = vi.fn().mockRejectedValue(new NetworkError('Network error'));

      await expect(
        retryWithBackoff(mockFn, { maxAttempts: 3 })
      ).rejects.toThrow(NetworkError);

      expect(mockFn).toHaveBeenCalledTimes(3);
    });
  });

  describe('isRetryableError', () => {
    it('should return true for network errors', () => {
      expect(isRetryableError(new NetworkError('Network error'))).toBe(true);
    });

    it('should return true for 502/503/504 errors', () => {
      expect(isRetryableError(new ServerError('Bad Gateway', 502))).toBe(true);
      expect(isRetryableError(new ServerError('Service Unavailable', 503))).toBe(true);
      expect(isRetryableError(new ServerError('Gateway Timeout', 504))).toBe(true);
    });

    it('should return false for 500 errors', () => {
      expect(isRetryableError(new ServerError('Internal Server Error', 500))).toBe(false);
    });

    it('should return false for validation errors', () => {
      expect(isRetryableError(new ValidationError('Invalid', {}))).toBe(false);
    });
  });
});
```

---

## Integration Tests

### API Client Integration

#### File: `src/lib/api/__tests__/integration/client.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import { apiClient } from '../client';
import { useAuthStore } from '@/store/useAuthStore';

const server = setupServer();

beforeEach(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  server.close();
});

describe('API Client Integration', () => {
  describe('Authentication', () => {
    it('should inject auth token in requests', async () => {
      const token = 'test-token';
      useAuthStore.getState().login(
        { id: '1', email: 'test@example.com' } as User,
        token
      );

      server.use(
        rest.get('http://localhost:4000/test', (req, res, ctx) => {
          const authHeader = req.headers.get('Authorization');
          expect(authHeader).toBe(`Bearer ${token}`);

          return res(ctx.json({ success: true }));
        })
      );

      const response = await apiClient.get('/test');

      expect(response.status).toBe(200);
    });

    it('should refresh token on 401 error', async () => {
      const oldToken = 'old-token';
      const newToken = 'new-token';

      useAuthStore.getState().login(
        { id: '1', email: 'test@example.com' } as User,
        oldToken
      );

      let callCount = 0;

      server.use(
        rest.get('http://localhost:4000/protected', (req, res, ctx) => {
          callCount++;

          if (callCount === 1) {
            return res(ctx.status(401), ctx.json({ message: 'Unauthorized' }));
          }

          const authHeader = req.headers.get('Authorization');
          expect(authHeader).toBe(`Bearer ${newToken}`);

          return res(ctx.json({ success: true }));
        }),
        rest.post('http://localhost:4000/auth/refresh', (req, res, ctx) => {
          return res(
            ctx.json({
              token: newToken,
              refreshToken: 'new-refresh-token',
              expiresIn: 3600,
            })
          );
        })
      );

      const response = await apiClient.get('/protected');

      expect(response.status).toBe(200);
      expect(useAuthStore.getState().token).toBe(newToken);
    });
  });

  describe('Error Handling', () => {
    it('should handle 500 server error', async () => {
      server.use(
        rest.get('http://localhost:4000/error', (req, res, ctx) => {
          return res(
            ctx.status(500),
            ctx.json({ message: 'Internal server error' })
          );
        })
      );

      await expect(apiClient.get('/error')).rejects.toThrow(ServerError);
    });

    it('should handle network error', async () => {
      server.use(
        rest.get('http://localhost:4000/network-error', (req, res) => {
          return res.networkError('Network error');
        })
      );

      await expect(apiClient.get('/network-error')).rejects.toThrow(NetworkError);
    });
  });

  describe('Retry Logic', () => {
    it('should retry on network error', async () => {
      let attempts = 0;

      server.use(
        rest.get('http://localhost:4000/retry', (req, res, ctx) => {
          attempts++;

          if (attempts < 3) {
            return res.networkError('Network error');
          }

          return res(ctx.json({ success: true, attempts }));
        })
      );

      const response = await apiClient.get('/retry');

      expect(response.data.attempts).toBe(3);
    });
  });
});
```

### React Query Integration

#### File: `src/hooks/api/__tests__/integration/useBookings.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import { useBookings, useCreateBooking } from '../../useBookings';

const server = setupServer();

beforeEach(() => server.listen());
afterEach(() => server.close());

describe('useBookings Integration', () => {
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

  it('should fetch bookings', async () => {
    server.use(
      rest.get('http://localhost:4000/admin/bookings/salon-1', (req, res, ctx) => {
        return res(
          ctx.json({
            success: true,
            data: [
              {
                id: '1',
                customer_name: 'John Doe',
                service: 'Haircut',
                status: 'CONFIRMED',
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
      })
    );

    const { result } = renderHook(() => useBookings('salon-1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.data).toHaveLength(1);
    expect(result.current.data?.data[0].customer_name).toBe('John Doe');
  });

  it('should create booking with optimistic update', async () => {
    server.use(
      rest.get('http://localhost:4000/admin/bookings/salon-1', (req, res, ctx) => {
        return res(
          ctx.json({
            success: true,
            data: [],
            pagination: {
              page: 1,
              limit: 10,
              total: 0,
              totalPages: 0,
              hasNext: false,
              hasPrev: false,
            },
          })
        );
      }),
      rest.post('http://localhost:4000/admin/bookings/salon-1', (req, res, ctx) => {
        return res(
          ctx.json({
            success: true,
            data: {
              id: '1',
              ...req.body,
              status: 'PENDING',
              created_at: new Date().toISOString(),
            },
          })
        );
      })
    );

    const { result: listResult } = renderHook(
      () => useBookings('salon-1'),
      { wrapper }
    );

    const { result: mutationResult } = renderHook(
      () => useCreateBooking('salon-1'),
      { wrapper }
    );

    await waitFor(() => expect(listResult.current.isSuccess).toBe(true));

    mutationResult.current.mutate({
      customer_name: 'John Doe',
      customer_phone: '+1234567890',
      service: 'Haircut',
      start_ts: new Date().toISOString(),
    });

    await waitFor(() => expect(mutationResult.current.isSuccess).toBe(true));

    // Verify booking was added
    await waitFor(() => {
      expect(listResult.current.data?.data).toHaveLength(1);
    });
  });

  it('should handle error', async () => {
    server.use(
      rest.get('http://localhost:4000/admin/bookings/salon-1', (req, res, ctx) => {
        return res(
          ctx.status(500),
          ctx.json({ message: 'Internal server error' })
        );
      })
    );

    const { result } = renderHook(() => useBookings('salon-1'), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeDefined();
  });
});
```

---

## E2E Tests

### Complete User Flow

#### File: `e2e/bookings.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Bookings Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('http://localhost:3000/login');
    await page.fill('[name="email"]', 'admin@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForURL('http://localhost:3000/dashboard');
  });

  test('should display bookings list', async ({ page }) => {
    await page.goto('http://localhost:3000/bookings');

    // Wait for bookings to load
    await page.waitForSelector('[data-testid="bookings-table"]');

    // Verify bookings are displayed
    const rows = await page.$$('[data-testid="booking-row"]');
    expect(rows.length).toBeGreaterThan(0);
  });

  test('should create new booking', async ({ page }) => {
    await page.goto('http://localhost:3000/bookings');

    // Click create button
    await page.click('[data-testid="create-booking-btn"]');

    // Fill form
    await page.fill('[name="customer_name"]', 'John Doe');
    await page.fill('[name="customer_phone"]', '+1234567890');
    await page.fill('[name="service"]', 'Haircut');
    await page.fill('[name="start_ts"]', '2025-10-21T10:00');

    // Submit
    await page.click('button[type="submit"]');

    // Verify success message
    await expect(page.locator('.toast-success')).toBeVisible();

    // Verify booking appears in list
    await expect(
      page.locator('[data-testid="booking-row"]', { hasText: 'John Doe' })
    ).toBeVisible();
  });

  test('should update booking status', async ({ page }) => {
    await page.goto('http://localhost:3000/bookings');

    // Find first booking
    const firstBooking = page.locator('[data-testid="booking-row"]').first();

    // Click status dropdown
    await firstBooking.locator('[data-testid="status-dropdown"]').click();

    // Select "Completed"
    await page.click('[data-testid="status-completed"]');

    // Verify success message
    await expect(page.locator('.toast-success')).toBeVisible();

    // Verify status updated
    await expect(firstBooking).toContainText('Completed');
  });

  test('should handle network error gracefully', async ({ page, context }) => {
    // Simulate offline
    await context.setOffline(true);

    await page.goto('http://localhost:3000/bookings');

    // Attempt to create booking
    await page.click('[data-testid="create-booking-btn"]');
    await page.fill('[name="customer_name"]', 'Jane Doe');
    await page.click('button[type="submit"]');

    // Verify error message
    await expect(page.locator('.toast-error')).toBeVisible();
    await expect(page.locator('.toast-error')).toContainText(
      'Network error'
    );

    // Go back online
    await context.setOffline(false);

    // Retry
    await page.click('[data-testid="retry-btn"]');

    // Verify success
    await expect(page.locator('.toast-success')).toBeVisible();
  });
});
```

---

## Mock Strategy

### Mock Service Worker Setup

#### File: `src/mocks/handlers.ts`

```typescript
import { rest } from 'msw';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const handlers = [
  // Auth
  rest.post(`${API_URL}/auth/login`, (req, res, ctx) => {
    const { email, password } = req.body as any;

    if (email === 'admin@example.com' && password === 'password123') {
      return res(
        ctx.status(200),
        ctx.json({
          success: true,
          data: {
            token: 'mock-jwt-token',
            user: {
              id: '1',
              email,
              name: 'Admin User',
              role: 'SALON_ADMIN',
              salon_id: 'salon-1',
            },
            expiresIn: 3600,
          },
        })
      );
    }

    return res(
      ctx.status(401),
      ctx.json({ message: 'Invalid credentials' })
    );
  }),

  // Bookings
  rest.get(`${API_URL}/admin/bookings/:salonId`, (req, res, ctx) => {
    const { salonId } = req.params;
    const page = Number(req.url.searchParams.get('page') || '1');
    const limit = Number(req.url.searchParams.get('limit') || '10');

    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: Array.from({ length: 5 }, (_, i) => ({
          id: `${i + 1}`,
          salon_id: salonId,
          customer_name: `Customer ${i + 1}`,
          customer_phone: `+123456789${i}`,
          service: 'Haircut',
          status: 'CONFIRMED',
          start_ts: new Date().toISOString(),
          created_at: new Date().toISOString(),
        })),
        pagination: {
          page,
          limit,
          total: 5,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      })
    );
  }),

  rest.post(`${API_URL}/admin/bookings/:salonId`, async (req, res, ctx) => {
    const body = await req.json();
    const { salonId } = req.params;

    return res(
      ctx.status(201),
      ctx.json({
        success: true,
        data: {
          id: `${Date.now()}`,
          salon_id: salonId,
          ...body,
          status: 'PENDING',
          created_at: new Date().toISOString(),
        },
      })
    );
  }),

  // Error scenarios
  rest.get(`${API_URL}/admin/bookings/:salonId/error`, (req, res, ctx) => {
    return res(
      ctx.status(500),
      ctx.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      })
    );
  }),
];
```

#### File: `src/mocks/server.ts`

```typescript
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);

// Setup
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

---

## Test Coverage

### Coverage Requirements

- **Overall**: 80% minimum
- **API Client**: 90% minimum
- **Error Handling**: 95% minimum
- **Security**: 100% minimum

### Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# View coverage report
open coverage/index.html
```

### Critical Paths

1. Authentication flow
2. Token refresh
3. Error handling
4. Retry logic
5. Request cancellation

---

## Performance Tests

### Load Testing

#### File: `src/lib/api/__tests__/performance/load.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { apiClient } from '../../client';

describe('Performance Tests', () => {
  it('should handle concurrent requests', async () => {
    const requests = Array.from({ length: 100 }, (_, i) =>
      apiClient.get(`/test/${i}`)
    );

    const start = performance.now();
    const results = await Promise.all(requests);
    const duration = performance.now() - start;

    expect(results).toHaveLength(100);
    expect(duration).toBeLessThan(5000); // 5 seconds max
  });

  it('should deduplicate identical requests', async () => {
    const requests = Array.from({ length: 10 }, () =>
      apiClient.get('/test')
    );

    const start = performance.now();
    await Promise.all(requests);
    const duration = performance.now() - start;

    // Should be much faster than 10 separate requests
    expect(duration).toBeLessThan(1000);
  });
});
```

---

## Security Tests

### Authentication Tests

#### File: `src/lib/api/__tests__/security/auth.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { apiClient } from '../../client';
import { useAuthStore } from '@/store/useAuthStore';

describe('Security Tests', () => {
  describe('Token Injection', () => {
    it('should not send token for public endpoints', async () => {
      server.use(
        rest.get('http://localhost:4000/public', (req, res, ctx) => {
          const authHeader = req.headers.get('Authorization');
          expect(authHeader).toBeNull();

          return res(ctx.json({ success: true }));
        })
      );

      await apiClient.get('/public', { skipAuth: true } as any);
    });

    it('should send token for protected endpoints', async () => {
      const token = 'test-token';
      useAuthStore.getState().login(
        { id: '1', email: 'test@example.com' } as User,
        token
      );

      server.use(
        rest.get('http://localhost:4000/protected', (req, res, ctx) => {
          const authHeader = req.headers.get('Authorization');
          expect(authHeader).toBe(`Bearer ${token}`);

          return res(ctx.json({ success: true }));
        })
      );

      await apiClient.get('/protected');
    });
  });

  describe('CSRF Protection', () => {
    it('should include CSRF token in state-changing requests', async () => {
      storeCsrfToken('test-csrf-token');

      server.use(
        rest.post('http://localhost:4000/test', (req, res, ctx) => {
          const csrfHeader = req.headers.get('X-CSRF-Token');
          expect(csrfHeader).toBe('test-csrf-token');

          return res(ctx.json({ success: true }));
        })
      );

      await apiClient.post('/test', { data: 'test' });
    });
  });

  describe('XSS Prevention', () => {
    it('should sanitize HTML in responses', async () => {
      server.use(
        rest.get('http://localhost:4000/xss', (req, res, ctx) => {
          return res(
            ctx.json({
              data: {
                message: '<script>alert("XSS")</script>Hello',
              },
            })
          );
        })
      );

      const response = await apiClient.get('/xss');
      const sanitized = sanitizeHtml(response.data.data.message);

      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('Hello');
    });
  });
});
```

---

## Running Tests

### Commands

```bash
# Run all tests
npm test

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run specific file
npm test src/lib/api/__tests__/client.test.ts
```

### CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2

      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit

      - name: Run integration tests
        run: npm run test:integration

      - name: Generate coverage
        run: npm run test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v2
        with:
          files: ./coverage/coverage-final.json

      - name: Run E2E tests
        run: npm run test:e2e
```

---

## Summary

This testing strategy ensures:

1. **Comprehensive Coverage**: Unit, integration, and E2E tests
2. **Mock Strategy**: MSW for realistic API mocking
3. **Performance**: Load testing for concurrent requests
4. **Security**: Authentication, CSRF, and XSS testing
5. **CI/CD**: Automated testing in pipelines

**Next Steps:**

1. Set up testing infrastructure
2. Write unit tests for utilities
3. Create MSW handlers
4. Implement integration tests
5. Add E2E test suite

---

**Document End**
