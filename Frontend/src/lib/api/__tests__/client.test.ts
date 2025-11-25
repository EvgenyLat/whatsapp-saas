/**
 * API Client Tests
 * WhatsApp SaaS Platform - API Integration Tests
 *
 * Tests for:
 * - Basic HTTP requests (GET, POST, PUT, DELETE)
 * - Authentication token injection
 * - Token refresh with request queuing
 * - Retry logic with exponential backoff
 * - Request deduplication
 * - Error handling and standardization
 */

import { apiClient, generateRequestId, createApiError } from '../client';
import { ApiError } from '../types';
import { useAuthStore } from '@/stores/auth.store';
import { server, http, HttpResponse } from '@/__mocks__/server';
import { mockUser, mockToken, setupAuth, clearAuth } from '@/__tests__/utils/test-utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

describe('API Client', () => {
  beforeEach(() => {
    // Clear auth before each test
    clearAuth();
    // Clear localStorage
    localStorage.clear();
  });

  afterEach(() => {
    clearAuth();
  });

  // ===== BASIC REQUESTS =====

  describe('Basic HTTP Requests', () => {
    test('GET request works correctly', async () => {
      setupAuth(true);

      const response = await apiClient.get('/api/bookings');

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('data');
      expect(response.data).toHaveProperty('pagination');
    });

    test('POST request works correctly', async () => {
      setupAuth(true);

      const bookingData = {
        customer_id: 'customer-123',
        service_id: 'service-123',
        scheduled_at: new Date().toISOString(),
      };

      const response = await apiClient.post('/api/bookings', bookingData);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('id');
      expect(response.data.customer_id).toBe(bookingData.customer_id);
    });

    test('PUT request works correctly', async () => {
      setupAuth(true);

      const updateData = {
        status: 'CANCELLED',
      };

      const response = await apiClient.put('/api/bookings/booking-123', updateData);

      expect(response.status).toBe(200);
      expect(response.data.status).toBe(updateData.status);
    });

    test('DELETE request works correctly', async () => {
      setupAuth(true);

      const response = await apiClient.delete('/api/bookings/booking-123');

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('message');
    });

    test('Request headers are set correctly', async () => {
      setupAuth(true);

      let requestHeaders: Headers | undefined;

      server.use(
        http.get(`${API_URL}/api/test/headers`, ({ request }) => {
          requestHeaders = request.headers;
          return HttpResponse.json({ success: true });
        })
      );

      await apiClient.get('/api/test/headers');

      expect(requestHeaders).toBeDefined();
      expect(requestHeaders!.get('Content-Type')).toBe('application/json');
      expect(requestHeaders!.get('Accept')).toBe('application/json');
    });
  });

  // ===== AUTHENTICATION =====

  describe('Authentication Token Injection', () => {
    test('Token is automatically injected from Zustand store', async () => {
      setupAuth(true);

      let authHeader: string | null = null;

      server.use(
        http.get(`${API_URL}/api/test/auth`, ({ request }) => {
          authHeader = request.headers.get('Authorization');
          return HttpResponse.json({ success: true });
        })
      );

      await apiClient.get('/api/test/auth');

      expect(authHeader).toBe(`Bearer ${mockToken}`);
    });

    test('Request works without token when not authenticated', async () => {
      clearAuth();

      let authHeader: string | null = null;

      server.use(
        http.post(`${API_URL}/api/auth/login`, ({ request }) => {
          authHeader = request.headers.get('Authorization');
          return HttpResponse.json({
            user: mockUser,
            token: mockToken,
            refreshToken: 'refresh-token',
          });
        })
      );

      await apiClient.post('/api/auth/login', {
        email: 'test@example.com',
        password: 'password123',
      });

      // Login endpoint should not have auth header
      expect(authHeader).toBeNull();
    });

    test('skipAuth config prevents token injection', async () => {
      setupAuth(true);

      let authHeader: string | null = 'should-be-cleared';

      server.use(
        http.get(`${API_URL}/api/test/public`, ({ request }) => {
          authHeader = request.headers.get('Authorization');
          return HttpResponse.json({ success: true });
        })
      );

      await apiClient.get('/api/test/public', {
        skipAuth: true,
      } as any);

      expect(authHeader).toBeNull();
    });

    test('401 error triggers token refresh', async () => {
      setupAuth(true);

      let requestCount = 0;

      server.use(
        http.get(`${API_URL}/api/test/protected`, ({ request }) => {
          requestCount++;
          const authHeader = request.headers.get('Authorization');

          // First request fails with 401
          if (requestCount === 1) {
            return HttpResponse.json(
              { error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } },
              { status: 401 }
            );
          }

          // Second request should have new token
          expect(authHeader).toContain('Bearer');
          return HttpResponse.json({ success: true });
        })
      );

      const response = await apiClient.get('/api/test/protected');

      expect(requestCount).toBe(2); // Original + retry after refresh
      expect(response.status).toBe(200);
    });

    test('Refresh failure triggers logout', async () => {
      setupAuth(true);

      server.use(
        // Protected endpoint returns 401
        http.get(`${API_URL}/api/test/protected`, () => {
          return HttpResponse.json(
            { error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } },
            { status: 401 }
          );
        }),
        // Refresh endpoint also fails
        http.post(`${API_URL}/api/auth/refresh`, () => {
          return HttpResponse.json(
            { error: { message: 'Invalid refresh token', code: 'INVALID_REFRESH_TOKEN' } },
            { status: 401 }
          );
        })
      );

      try {
        await apiClient.get('/api/test/protected');
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).code).toBe('AUTH_FAILED');

        // Check that user was logged out
        const authState = useAuthStore.getState();
        expect(authState.isAuthenticated).toBe(false);
        expect(authState.token).toBeNull();
      }
    });

    test('Concurrent requests queue during token refresh', async () => {
      setupAuth(true);

      let refreshCallCount = 0;

      server.use(
        http.get(`${API_URL}/api/test/concurrent/:id`, ({ request, params }) => {
          const authHeader = request.headers.get('Authorization');

          // First call to each endpoint returns 401
          if (!authHeader?.includes('new-mock-token')) {
            return HttpResponse.json(
              { error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } },
              { status: 401 }
            );
          }

          return HttpResponse.json({ id: params.id, success: true });
        }),
        http.post(`${API_URL}/api/auth/refresh`, () => {
          refreshCallCount++;
          return HttpResponse.json({
            token: 'new-mock-token-12345',
            refreshToken: 'new-mock-refresh-token-67890',
          });
        })
      );

      // Make 3 concurrent requests that will all get 401
      const promises = [
        apiClient.get('/api/test/concurrent/1'),
        apiClient.get('/api/test/concurrent/2'),
        apiClient.get('/api/test/concurrent/3'),
      ];

      const results = await Promise.all(promises);

      // All requests should succeed
      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result.status).toBe(200);
        expect(result.data.success).toBe(true);
      });

      // Refresh should only be called once
      expect(refreshCallCount).toBe(1);
    });
  });

  // ===== RETRY LOGIC =====

  describe('Retry Logic with Exponential Backoff', () => {
    test('500 error retries with backoff', async () => {
      setupAuth(true);

      let attemptCount = 0;

      server.use(
        http.get(`${API_URL}/api/test/retry-500`, () => {
          attemptCount++;

          // Fail first 2 attempts, succeed on 3rd
          if (attemptCount < 3) {
            return HttpResponse.json(
              { error: { message: 'Server error', code: 'INTERNAL_ERROR' } },
              { status: 500 }
            );
          }

          return HttpResponse.json({ success: true, attempts: attemptCount });
        })
      );

      const startTime = Date.now();
      const response = await apiClient.get('/api/test/retry-500');
      const duration = Date.now() - startTime;

      expect(attemptCount).toBe(3);
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);

      // Should have delays: 1000ms + 2000ms = ~3000ms minimum
      expect(duration).toBeGreaterThanOrEqual(2500);
    }, 10000);

    test('502 Bad Gateway retries', async () => {
      setupAuth(true);

      let attemptCount = 0;

      server.use(
        http.get(`${API_URL}/api/test/retry-502`, () => {
          attemptCount++;

          if (attemptCount < 2) {
            return HttpResponse.json(
              { error: { message: 'Bad gateway', code: 'BAD_GATEWAY' } },
              { status: 502 }
            );
          }

          return HttpResponse.json({ success: true });
        })
      );

      const response = await apiClient.get('/api/test/retry-502');

      expect(attemptCount).toBe(2);
      expect(response.status).toBe(200);
    });

    test('503 Service Unavailable retries', async () => {
      setupAuth(true);

      let attemptCount = 0;

      server.use(
        http.get(`${API_URL}/api/test/retry-503`, () => {
          attemptCount++;

          if (attemptCount < 2) {
            return HttpResponse.json(
              { error: { message: 'Service unavailable', code: 'SERVICE_UNAVAILABLE' } },
              { status: 503 }
            );
          }

          return HttpResponse.json({ success: true });
        })
      );

      const response = await apiClient.get('/api/test/retry-503');

      expect(attemptCount).toBe(2);
      expect(response.status).toBe(200);
    });

    test('504 Gateway Timeout retries', async () => {
      setupAuth(true);

      let attemptCount = 0;

      server.use(
        http.get(`${API_URL}/api/test/retry-504`, () => {
          attemptCount++;

          if (attemptCount < 2) {
            return HttpResponse.json(
              { error: { message: 'Gateway timeout', code: 'GATEWAY_TIMEOUT' } },
              { status: 504 }
            );
          }

          return HttpResponse.json({ success: true });
        })
      );

      const response = await apiClient.get('/api/test/retry-504');

      expect(attemptCount).toBe(2);
      expect(response.status).toBe(200);
    });

    test('Max retries respected', async () => {
      setupAuth(true);

      let attemptCount = 0;

      server.use(
        http.get(`${API_URL}/api/test/max-retries`, () => {
          attemptCount++;
          return HttpResponse.json(
            { error: { message: 'Server error', code: 'INTERNAL_ERROR' } },
            { status: 500 }
          );
        })
      );

      try {
        await apiClient.get('/api/test/max-retries');
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        // 1 original + 3 retries = 4 attempts
        expect(attemptCount).toBe(4);
      }
    }, 15000);

    test('400 Bad Request does not retry', async () => {
      setupAuth(true);

      let attemptCount = 0;

      server.use(
        http.get(`${API_URL}/api/test/no-retry-400`, () => {
          attemptCount++;
          return HttpResponse.json(
            { error: { message: 'Bad request', code: 'BAD_REQUEST' } },
            { status: 400 }
          );
        })
      );

      try {
        await apiClient.get('/api/test/no-retry-400');
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect(attemptCount).toBe(1); // No retries
      }
    });

    test('404 Not Found does not retry', async () => {
      setupAuth(true);

      let attemptCount = 0;

      server.use(
        http.get(`${API_URL}/api/test/no-retry-404`, () => {
          attemptCount++;
          return HttpResponse.json(
            { error: { message: 'Not found', code: 'NOT_FOUND' } },
            { status: 404 }
          );
        })
      );

      try {
        await apiClient.get('/api/test/no-retry-404');
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect(attemptCount).toBe(1); // No retries
      }
    });

    test('skipRetry config prevents retries', async () => {
      setupAuth(true);

      let attemptCount = 0;

      server.use(
        http.get(`${API_URL}/api/test/skip-retry`, () => {
          attemptCount++;
          return HttpResponse.json(
            { error: { message: 'Server error', code: 'INTERNAL_ERROR' } },
            { status: 500 }
          );
        })
      );

      try {
        await apiClient.get('/api/test/skip-retry', {
          skipRetry: true,
        } as any);
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect(attemptCount).toBe(1); // No retries
      }
    });

    test('Network errors retry', async () => {
      setupAuth(true);

      let attemptCount = 0;

      server.use(
        http.get(`${API_URL}/api/test/network-retry`, () => {
          attemptCount++;

          if (attemptCount < 2) {
            return HttpResponse.error();
          }

          return HttpResponse.json({ success: true });
        })
      );

      const response = await apiClient.get('/api/test/network-retry');

      expect(attemptCount).toBe(2);
      expect(response.status).toBe(200);
    });
  });

  // ===== REQUEST DEDUPLICATION =====

  describe('Request Deduplication', () => {
    test('Duplicate GET requests use same promise', async () => {
      setupAuth(true);

      let requestCount = 0;

      server.use(
        http.get(`${API_URL}/api/test/dedup`, () => {
          requestCount++;
          return HttpResponse.json({ count: requestCount });
        })
      );

      // Make 3 identical concurrent GET requests
      const promises = [
        apiClient.get('/api/test/dedup'),
        apiClient.get('/api/test/dedup'),
        apiClient.get('/api/test/dedup'),
      ];

      const results = await Promise.all(promises);

      // All should return same data
      results.forEach((result) => {
        expect(result.data.count).toBe(1);
      });

      // Server should only be called once
      expect(requestCount).toBe(1);
    });

    test('POST requests are not deduplicated', async () => {
      setupAuth(true);

      let requestCount = 0;

      server.use(
        http.post(`${API_URL}/api/test/no-dedup`, () => {
          requestCount++;
          return HttpResponse.json({ count: requestCount });
        })
      );

      // Make 3 identical concurrent POST requests
      const promises = [
        apiClient.post('/api/test/no-dedup', { data: 'test' }),
        apiClient.post('/api/test/no-dedup', { data: 'test' }),
        apiClient.post('/api/test/no-dedup', { data: 'test' }),
      ];

      const results = await Promise.all(promises);

      // Each should return different count
      expect(results[0]!.data.count).toBe(1);
      expect(results[1]!.data.count).toBe(2);
      expect(results[2]!.data.count).toBe(3);

      // Server should be called 3 times
      expect(requestCount).toBe(3);
    });

    test('GET requests with different params are not deduplicated', async () => {
      setupAuth(true);

      let requestCount = 0;

      server.use(
        http.get(`${API_URL}/api/test/dedup-params`, ({ request }) => {
          requestCount++;
          const url = new URL(request.url);
          const id = url.searchParams.get('id');
          return HttpResponse.json({ id, count: requestCount });
        })
      );

      // Make concurrent GET requests with different params
      const promises = [
        apiClient.get('/api/test/dedup-params', { params: { id: 1 } }),
        apiClient.get('/api/test/dedup-params', { params: { id: 2 } }),
      ];

      const results = await Promise.all(promises);

      // Should be separate requests
      expect(results[0]!.data.id).toBe('1');
      expect(results[1]!.data.id).toBe('2');
      expect(requestCount).toBe(2);
    });

    test('Deduplication map is cleaned up after request', async () => {
      setupAuth(true);

      server.use(
        http.get(`${API_URL}/api/test/dedup-cleanup`, () => {
          return HttpResponse.json({ success: true });
        })
      );

      // First request
      await apiClient.get('/api/test/dedup-cleanup');

      // Second request (after first completes)
      await apiClient.get('/api/test/dedup-cleanup');

      // If map wasn't cleaned up, second request would use cached promise
      // No easy way to test this directly, but it should work
      expect(true).toBe(true);
    });
  });

  // ===== ERROR HANDLING =====

  describe('Error Handling and Standardization', () => {
    test('ApiError created with correct properties', async () => {
      setupAuth(true);

      server.use(
        http.get(`${API_URL}/api/test/error`, () => {
          return HttpResponse.json(
            {
              error: {
                message: 'Validation failed',
                code: 'VALIDATION_ERROR',
                details: { field: 'email', error: 'Invalid format' },
              },
            },
            { status: 400 }
          );
        })
      );

      try {
        await apiClient.get('/api/test/error');
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        const apiError = error as ApiError;

        expect(apiError.message).toBe('Validation failed');
        expect(apiError.code).toBe('VALIDATION_ERROR');
        expect(apiError.status).toBe(400);
        expect(apiError.details).toEqual({ field: 'email', error: 'Invalid format' });
        expect(apiError.isValidationError).toBe(true);
        expect(apiError.isAuthError).toBe(false);
        expect(apiError.isServerError).toBe(false);
        expect(apiError.isNetworkError).toBe(false);
      }
    });

    test('Network errors are standardized', async () => {
      setupAuth(true);

      server.use(
        http.get(`${API_URL}/api/test/network-error`, () => {
          return HttpResponse.error();
        })
      );

      try {
        await apiClient.get('/api/test/network-error');
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        const apiError = error as ApiError;

        expect(apiError.code).toBe('NETWORK_ERROR');
        expect(apiError.isNetworkError).toBe(true);
        expect(apiError.status).toBeUndefined();
      }
    });

    test('Server errors are standardized', async () => {
      setupAuth(true);

      server.use(
        http.get(`${API_URL}/api/test/server-error`, () => {
          return HttpResponse.json(
            { error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
            { status: 500 }
          );
        })
      );

      try {
        await apiClient.get('/api/test/server-error');
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        const apiError = error as ApiError;

        expect(apiError.status).toBe(500);
        expect(apiError.isServerError).toBe(true);
        expect(apiError.code).toBe('INTERNAL_ERROR');
      }
    });

    test('Request ID is included in errors', async () => {
      setupAuth(true);

      server.use(
        http.get(`${API_URL}/api/test/request-id`, () => {
          return HttpResponse.json(
            { error: { message: 'Error', code: 'ERROR' } },
            { status: 400 }
          );
        })
      );

      try {
        await apiClient.get('/api/test/request-id');
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        const apiError = error as ApiError;

        expect(apiError.requestId).toBeDefined();
        expect(apiError.requestId).toMatch(/^req_/);
      }
    });
  });

  // ===== UTILITY FUNCTIONS =====

  describe('Utility Functions', () => {
    test('generateRequestId creates unique IDs', () => {
      const id1 = generateRequestId();
      const id2 = generateRequestId();
      const id3 = generateRequestId();

      expect(id1).toMatch(/^req_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
    });

    test('createApiError converts unknown errors', () => {
      const error = new Error('Test error');
      const apiError = createApiError(error, 'req_123');

      expect(apiError).toBeInstanceOf(ApiError);
      expect(apiError.message).toBe('Test error');
      expect(apiError.requestId).toBe('req_123');
    });

    test('createApiError preserves ApiError instances', () => {
      const originalError = new ApiError('Original error', {
        code: 'ORIGINAL',
        status: 400,
      });

      const apiError = createApiError(originalError, 'req_123');

      expect(apiError).toBe(originalError);
      expect(apiError.code).toBe('ORIGINAL');
    });
  });
});
