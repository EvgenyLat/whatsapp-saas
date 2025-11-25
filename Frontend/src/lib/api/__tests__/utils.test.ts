/**
 * API Utilities Tests
 * WhatsApp SaaS Platform - API Integration Tests
 *
 * Tests for utility functions:
 * - Request building (buildQueryString, buildFormData, buildUrl)
 * - Response handling (extractPaginationInfo, isPaginatedResponse)
 * - Error handling (handleApiError, getErrorMessage)
 * - Caching (getCacheKey, invalidateCache)
 * - Performance (debounce, throttle, retryWithBackoff, delay)
 */

import {
  buildQueryString,
  buildFormData,
  buildUrl,
  extractPaginationInfo,
  isPaginatedResponse,
  handleApiError,
  getErrorMessage,
  getCacheKey,
  invalidateCache,
  buildPaginationParams,
  buildDateRangeParams,
  mergeParams,
  delay,
  retryWithBackoff,
  debounce,
  throttle,
  formatFileSize,
  safeJsonParse,
  createAbortControllerWithTimeout,
  isApiError,
} from '../utils';
import { ApiError } from '../types';
import type { PaginatedResponse } from '@/types';

describe('API Utilities', () => {
  // ===== REQUEST BUILDING =====

  describe('buildQueryString', () => {
    test('builds query string from simple object', () => {
      const params = {
        page: 1,
        limit: 10,
        status: 'active',
      };

      const result = buildQueryString(params);

      expect(result).toBe('page=1&limit=10&status=active');
    });

    test('handles arrays correctly', () => {
      const params = {
        ids: ['1', '2', '3'],
      };

      const result = buildQueryString(params);

      expect(result).toBe('ids=1&ids=2&ids=3');
    });

    test('skips null and undefined values', () => {
      const params = {
        page: 1,
        status: null,
        filter: undefined,
      };

      const result = buildQueryString(params);

      expect(result).toBe('page=1');
      expect(result).not.toContain('status');
      expect(result).not.toContain('filter');
    });

    test('handles Date objects', () => {
      const date = new Date('2024-01-01T00:00:00Z');
      const params = {
        startDate: date,
      };

      const result = buildQueryString(params);

      expect(result).toContain('startDate=2024-01-01T00:00:00.000Z');
    });

    test('flattens nested objects', () => {
      const params = {
        filter: {
          status: 'active',
          type: 'booking',
        },
      };

      const result = buildQueryString(params);

      expect(result).toContain('filter[status]=active');
      expect(result).toContain('filter[type]=booking');
    });

    test('handles empty object', () => {
      const result = buildQueryString({});

      expect(result).toBe('');
    });
  });

  describe('buildFormData', () => {
    test('builds FormData from simple object', () => {
      const data = {
        name: 'John Doe',
        age: 30,
      };

      const formData = buildFormData(data);

      expect(formData.get('name')).toBe('John Doe');
      expect(formData.get('age')).toBe('30');
    });

    test('handles File and Blob objects', () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const data = {
        avatar: file,
      };

      const formData = buildFormData(data);

      expect(formData.get('avatar')).toBe(file);
    });

    test('handles arrays', () => {
      const data = {
        tags: ['tag1', 'tag2', 'tag3'],
      };

      const formData = buildFormData(data);

      expect(formData.getAll('tags[]')).toHaveLength(3);
    });

    test('handles Date objects', () => {
      const date = new Date('2024-01-01T00:00:00Z');
      const data = {
        createdAt: date,
      };

      const formData = buildFormData(data);

      expect(formData.get('createdAt')).toBe(date.toISOString());
    });

    test('handles nested objects', () => {
      const data = {
        user: {
          name: 'John',
          email: 'john@example.com',
        },
      };

      const formData = buildFormData(data);

      expect(formData.get('user[name]')).toBe('John');
      expect(formData.get('user[email]')).toBe('john@example.com');
    });

    test('skips null and undefined values', () => {
      const data = {
        name: 'John',
        age: null,
        email: undefined,
      };

      const formData = buildFormData(data);

      expect(formData.has('name')).toBe(true);
      expect(formData.has('age')).toBe(false);
      expect(formData.has('email')).toBe(false);
    });
  });

  describe('buildUrl', () => {
    test('builds URL with query parameters', () => {
      const baseUrl = '/api/bookings';
      const params = {
        page: 1,
        limit: 10,
      };

      const result = buildUrl(baseUrl, params);

      expect(result).toBe('/api/bookings?page=1&limit=10');
    });

    test('returns base URL when no params', () => {
      const baseUrl = '/api/bookings';

      const result = buildUrl(baseUrl);

      expect(result).toBe(baseUrl);
    });

    test('returns base URL when params is empty', () => {
      const baseUrl = '/api/bookings';

      const result = buildUrl(baseUrl, {});

      expect(result).toBe(baseUrl);
    });
  });

  // ===== RESPONSE HANDLING =====

  describe('extractPaginationInfo', () => {
    test('extracts pagination info from response', () => {
      const response: PaginatedResponse<any> = {
        success: true,
        data: [],
        pagination: {
          page: 2,
          limit: 20,
          total: 100,
          totalPages: 5,
          hasNext: true,
          hasPrev: true,
        },
        timestamp: new Date().toISOString(),
      };

      const info = extractPaginationInfo(response);

      expect(info.page).toBe(2);
      expect(info.limit).toBe(20);
      expect(info.total).toBe(100);
      expect(info.totalPages).toBe(5);
      expect(info.hasNext).toBe(true);
      expect(info.hasPrev).toBe(true);
    });
  });

  describe('isPaginatedResponse', () => {
    test('returns true for paginated response', () => {
      const response = {
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
        timestamp: new Date().toISOString(),
      };

      expect(isPaginatedResponse(response)).toBe(true);
    });

    test('returns false for non-paginated response', () => {
      const response = {
        data: {},
      };

      expect(isPaginatedResponse(response)).toBe(false);
    });

    test('returns false for null', () => {
      expect(isPaginatedResponse(null)).toBe(false);
    });

    test('returns false for undefined', () => {
      expect(isPaginatedResponse(undefined)).toBe(false);
    });
  });

  // ===== ERROR HANDLING =====

  describe('handleApiError', () => {
    test('returns ApiError instance unchanged', () => {
      const originalError = new ApiError('Test error', { code: 'TEST' });

      const result = handleApiError(originalError);

      expect(result).toBe(originalError);
    });

    test('converts Error to ApiError', () => {
      const error = new Error('Test error');

      const result = handleApiError(error);

      expect(result).toBeInstanceOf(ApiError);
      expect(result.message).toBe('Test error');
      expect(result.code).toBe('UNKNOWN_ERROR');
    });

    test('converts unknown to ApiError', () => {
      const result = handleApiError('string error');

      expect(result).toBeInstanceOf(ApiError);
      expect(result.message).toBe('An unknown error occurred');
    });
  });

  describe('getErrorMessage', () => {
    test('returns custom message for network error', () => {
      const error = new ApiError('Network error', { code: 'NETWORK_ERROR' });

      const message = getErrorMessage(error);

      expect(message).toContain('internet connection');
    });

    test('returns custom message for auth error', () => {
      const error = new ApiError('Unauthorized', { code: 'AUTH_FAILED' });

      const message = getErrorMessage(error);

      expect(message).toContain('session has expired');
    });

    test('returns custom message for validation error', () => {
      const error = new ApiError('Validation failed', { code: 'VALIDATION_ERROR' });

      const message = getErrorMessage(error);

      expect(message).toContain('check your input');
    });

    test('returns custom message for not found', () => {
      const error = new ApiError('Not found', { code: 'NOT_FOUND' });

      const message = getErrorMessage(error);

      expect(message).toContain('not found');
    });

    test('returns custom message for forbidden', () => {
      const error = new ApiError('Forbidden', { code: 'FORBIDDEN' });

      const message = getErrorMessage(error);

      expect(message).toContain('do not have permission');
    });

    test('returns custom message for rate limit', () => {
      const error = new ApiError('Rate limited', { code: 'RATE_LIMIT_EXCEEDED' });

      const message = getErrorMessage(error);

      expect(message).toContain('Too many requests');
    });

    test('returns error message for unknown code', () => {
      const error = new ApiError('Custom error', { code: 'CUSTOM' });

      const message = getErrorMessage(error);

      expect(message).toBe('Custom error');
    });

    test('handles plain Error objects', () => {
      const error = new Error('Plain error');

      const message = getErrorMessage(error);

      expect(message).toBe('Plain error');
    });

    test('handles unknown errors', () => {
      const message = getErrorMessage('unknown');

      expect(message).toContain('unexpected error');
    });
  });

  describe('isApiError', () => {
    test('returns true for ApiError', () => {
      const error = new ApiError('Test');

      expect(isApiError(error)).toBe(true);
    });

    test('returns false for plain Error', () => {
      const error = new Error('Test');

      expect(isApiError(error)).toBe(false);
    });

    test('returns false for null', () => {
      expect(isApiError(null)).toBe(false);
    });
  });

  // ===== CACHING =====

  describe('getCacheKey', () => {
    test('generates cache key from endpoint', () => {
      const key = getCacheKey('/api/bookings');

      expect(key).toBe('/api/bookings');
    });

    test('generates cache key with params', () => {
      const key = getCacheKey('/api/bookings', { page: 1, status: 'active' });

      expect(key).toContain('/api/bookings:');
      expect(key).toContain('page=1');
      expect(key).toContain('status=active');
    });

    test('returns endpoint when params is empty', () => {
      const key = getCacheKey('/api/bookings', {});

      expect(key).toBe('/api/bookings');
    });
  });

  describe('invalidateCache', () => {
    test('returns array with pattern', () => {
      const result = invalidateCache('bookings');

      expect(result).toEqual(['bookings']);
    });
  });

  // ===== PAGINATION & DATE RANGE =====

  describe('buildPaginationParams', () => {
    test('builds pagination params', () => {
      const params = buildPaginationParams(2, 20);

      expect(params.page).toBe(2);
      expect(params.limit).toBe(20);
    });

    test('ensures minimum page is 1', () => {
      const params = buildPaginationParams(0, 10);

      expect(params.page).toBe(1);
    });

    test('clamps limit between 1 and 100', () => {
      const params1 = buildPaginationParams(1, 0);
      const params2 = buildPaginationParams(1, 200);

      expect(params1.limit).toBe(1);
      expect(params2.limit).toBe(100);
    });

    test('uses defaults when no args', () => {
      const params = buildPaginationParams();

      expect(params.page).toBe(1);
      expect(params.limit).toBe(10);
    });
  });

  describe('buildDateRangeParams', () => {
    test('builds date range from Date objects', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-31');

      const params = buildDateRangeParams(start, end);

      expect(params.startDate).toBe(start.toISOString());
      expect(params.endDate).toBe(end.toISOString());
    });

    test('builds date range from strings', () => {
      const params = buildDateRangeParams('2024-01-01', '2024-01-31');

      expect(params.startDate).toBe('2024-01-01');
      expect(params.endDate).toBe('2024-01-31');
    });

    test('handles partial ranges', () => {
      const params1 = buildDateRangeParams('2024-01-01');
      const params2 = buildDateRangeParams(undefined, '2024-01-31');

      expect(params1.startDate).toBe('2024-01-01');
      expect(params1.endDate).toBeUndefined();
      expect(params2.startDate).toBeUndefined();
      expect(params2.endDate).toBe('2024-01-31');
    });
  });

  describe('mergeParams', () => {
    test('merges pagination and date range params', () => {
      const pagination = { page: 1, limit: 10 };
      const dateRange = { startDate: '2024-01-01', endDate: '2024-01-31' };

      const result = mergeParams(pagination, dateRange);

      expect(result).toEqual({ ...pagination, ...dateRange });
    });

    test('handles undefined values', () => {
      const result = mergeParams(undefined, undefined);

      expect(result).toEqual({});
    });
  });

  // ===== PERFORMANCE UTILITIES =====

  describe('delay', () => {
    test('delays execution', async () => {
      const start = Date.now();
      await delay(100);
      const duration = Date.now() - start;

      expect(duration).toBeGreaterThanOrEqual(95);
    });
  });

  describe('retryWithBackoff', () => {
    test('retries function on failure', async () => {
      let attempts = 0;
      const fn = jest.fn(async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Failed');
        }
        return 'success';
      });

      const result = await retryWithBackoff(fn, 3, 10);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    }, 10000);

    test('throws error after max retries', async () => {
      const fn = jest.fn(async () => {
        throw new Error('Failed');
      });

      await expect(retryWithBackoff(fn, 2, 10)).rejects.toThrow('Failed');
      expect(fn).toHaveBeenCalledTimes(2);
    }, 10000);

    test('succeeds on first try', async () => {
      const fn = jest.fn(async () => 'success');

      const result = await retryWithBackoff(fn, 3, 10);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('debounce', () => {
    jest.useFakeTimers();

    test('debounces function calls', () => {
      const fn = jest.fn();
      const debounced = debounce(fn, 100);

      debounced();
      debounced();
      debounced();

      expect(fn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledTimes(1);
    });

    test('resets timer on new call', () => {
      const fn = jest.fn();
      const debounced = debounce(fn, 100);

      debounced();
      jest.advanceTimersByTime(50);
      debounced();
      jest.advanceTimersByTime(50);

      expect(fn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(50);

      expect(fn).toHaveBeenCalledTimes(1);
    });

    jest.useRealTimers();
  });

  describe('throttle', () => {
    jest.useFakeTimers();

    test('throttles function calls', () => {
      const fn = jest.fn();
      const throttled = throttle(fn, 100);

      throttled();
      throttled();
      throttled();

      expect(fn).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(100);

      throttled();

      expect(fn).toHaveBeenCalledTimes(2);
    });

    jest.useRealTimers();
  });

  // ===== HELPER UTILITIES =====

  describe('formatFileSize', () => {
    test('formats bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
      expect(formatFileSize(1024)).toBe('1.00 KB');
      expect(formatFileSize(1048576)).toBe('1.00 MB');
      expect(formatFileSize(1073741824)).toBe('1.00 GB');
    });
  });

  describe('safeJsonParse', () => {
    test('parses valid JSON', () => {
      const result = safeJsonParse('{"name":"John"}', {});

      expect(result).toEqual({ name: 'John' });
    });

    test('returns fallback on invalid JSON', () => {
      const fallback = { default: true };
      const result = safeJsonParse('invalid json', fallback);

      expect(result).toBe(fallback);
    });
  });

  describe('createAbortControllerWithTimeout', () => {
    jest.useFakeTimers();

    test('creates abort controller that aborts after timeout', () => {
      const controller = createAbortControllerWithTimeout(1000);
      const abortHandler = jest.fn();

      controller.signal.addEventListener('abort', abortHandler);

      expect(abortHandler).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1000);

      expect(abortHandler).toHaveBeenCalled();
    });

    jest.useRealTimers();
  });
});
