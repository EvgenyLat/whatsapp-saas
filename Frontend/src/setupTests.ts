/**
 * Jest Test Setup Configuration
 * WhatsApp SaaS Platform
 *
 * This file runs before each test and configures the test environment.
 * It imports testing-library/jest-dom for custom matchers and sets up MSW.
 */

import '@testing-library/jest-dom';
import { server } from './mocks/server';

// Establish API mocking before all tests
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' });
});

// Reset any request handlers that we may add during the tests,
// so they don't affect other tests
afterEach(() => {
  server.resetHandlers();
});

// Clean up after the tests are finished
afterAll(() => {
  server.close();
});

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    refresh: jest.fn(),
    forward: jest.fn(),
  })),
  usePathname: jest.fn(() => '/'),
  useSearchParams: jest.fn(() => new URLSearchParams()),
  useParams: jest.fn(() => ({})),
}));

// Mock Zustand auth store
jest.mock('@/store/auth.store', () => ({
  useAuthStore: jest.fn((selector) => {
    const mockState = {
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'SALON_ADMIN',
        isEmailVerified: true,
      },
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      isAuthenticated: true,
      isHydrated: true,
      isLoading: false,
      setTokens: jest.fn(),
      setUser: jest.fn(),
      logout: jest.fn(),
      clearAuth: jest.fn(),
      updateUser: jest.fn(),
      setLoading: jest.fn(),
      setHydrated: jest.fn(),
      hasRole: jest.fn((role) => role === 'SALON_ADMIN'),
      hasAnyRole: jest.fn(() => true),
      belongsToSalon: jest.fn(() => true),
      isSuperAdmin: jest.fn(() => false),
      isSalonAdmin: jest.fn(() => true),
      getCurrentSalonId: jest.fn(() => 'test-salon-id'),
    };
    return selector ? selector(mockState) : mockState;
  }),
  useCurrentUser: jest.fn(() => ({
    id: 'test-user-id',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'SALON_ADMIN',
    isEmailVerified: true,
  })),
  useIsAuthenticated: jest.fn(() => true),
  useAuthToken: jest.fn(() => 'mock-access-token'),
  useCurrentSalonId: jest.fn(() => 'test-salon-id'),
  useUserRole: jest.fn(() => 'SALON_ADMIN'),
  usePermission: jest.fn(() => true),
}));
