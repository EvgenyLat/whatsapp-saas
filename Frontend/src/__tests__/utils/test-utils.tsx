/**
 * Test Utilities
 * WhatsApp SaaS Platform - API Integration Tests
 *
 * Shared utilities and helpers for testing
 */

import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { UserRole } from '@/types/enums';
import type { User } from '@/types/models';

/**
 * Mock user data for testing
 */
export const mockUser: User = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  role: UserRole.SALON_ADMIN,
  salon_id: 'salon-123',
  avatar: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

/**
 * Mock token for testing
 */
export const mockToken = 'mock-jwt-token-12345';

/**
 * Setup authentication state for tests
 */
export function setupAuth(authenticated = true) {
  const store = useAuthStore.getState();

  if (authenticated) {
    store.login(mockUser, mockToken);
  } else {
    store.logout();
  }
}

/**
 * Clear authentication state after tests
 */
export function clearAuth() {
  const store = useAuthStore.getState();
  store.logout();
}

/**
 * Create a fresh QueryClient for each test
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Disable retries in tests
        gcTime: 0, // Disable caching
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * Wrapper component with providers
 */
interface AllProvidersProps {
  children: React.ReactNode;
  queryClient?: QueryClient;
}

export function AllProviders({ children, queryClient }: AllProvidersProps) {
  const client = queryClient || createTestQueryClient();

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

/**
 * Custom render with providers
 */
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
  authenticated?: boolean;
}

export function renderWithProviders(
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) {
  const { queryClient, authenticated = true, ...renderOptions } = options;

  // Setup auth if needed
  if (authenticated) {
    setupAuth(true);
  } else {
    clearAuth();
  }

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <AllProviders queryClient={queryClient}>{children}</AllProviders>
  );

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient: queryClient || createTestQueryClient(),
  };
}

/**
 * Wait for async operations
 */
export function waitFor(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mock fetch response
 */
export function mockFetchResponse(data: any, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
    headers: new Headers(),
  } as Response);
}

/**
 * Mock fetch error
 */
export function mockFetchError(message = 'Network error') {
  return Promise.reject(new Error(message));
}

/**
 * Create mock booking
 */
export function createMockBooking(overrides = {}) {
  return {
    id: 'booking-123',
    customer_id: 'customer-123',
    salon_id: 'salon-123',
    service_id: 'service-123',
    staff_id: 'staff-123',
    scheduled_at: new Date().toISOString(),
    status: 'CONFIRMED' as const,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create mock paginated response
 */
export function createMockPaginatedResponse<T>(
  data: T[],
  page = 1,
  limit = 10,
  total?: number
) {
  const totalItems = total || data.length;
  const totalPages = Math.ceil(totalItems / limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total: totalItems,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

/**
 * Create mock API error
 */
export function createMockApiError(
  message = 'API Error',
  code = 'API_ERROR',
  status = 400
) {
  return {
    error: {
      message,
      code,
    },
    status,
  };
}

/**
 * Suppress console errors in tests
 */
export function suppressConsoleErrors() {
  const originalError = console.error;
  beforeAll(() => {
    console.error = (...args: any[]) => {
      // Suppress React error boundary errors
      if (
        typeof args[0] === 'string' &&
        (args[0].includes('Error: Uncaught') ||
          args[0].includes('The above error occurred'))
      ) {
        return;
      }
      originalError.call(console, ...args);
    };
  });

  afterAll(() => {
    console.error = originalError;
  });
}

/**
 * Mock localStorage
 */
export function mockLocalStorage() {
  const store: Record<string, string> = {};

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach((key) => delete store[key]);
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: jest.fn((index: number) => Object.keys(store)[index] || null),
  };
}

/**
 * Setup global test environment
 */
export function setupTestEnvironment() {
  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });

  // Mock IntersectionObserver
  global.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    takeRecords() {
      return [];
    }
    unobserve() {}
  } as any;

  // Mock ResizeObserver
  global.ResizeObserver = class ResizeObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    unobserve() {}
  } as any;
}
