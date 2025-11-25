/**
 * Test Utilities and Helpers
 * Provides common testing setup and utility functions
 */

import React, { ReactElement, ReactNode } from 'react';
import { render as rtlRender, RenderOptions, RenderResult } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock user for testing
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'admin',
  isEmailVerified: true,
};

// Create a custom QueryClient for testing
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Disable retries in tests
        gcTime: Infinity, // Prevent garbage collection during tests
        staleTime: Infinity, // Data is always fresh in tests
      },
      mutations: {
        retry: false,
      },
    },
  });
}

interface AllProvidersProps {
  children: ReactNode;
  queryClient?: QueryClient;
}

// Wrapper component with all providers
export function AllProviders({ children, queryClient }: AllProvidersProps) {
  const testQueryClient = queryClient || createTestQueryClient();

  return (
    <QueryClientProvider client={testQueryClient}>
      {children}
    </QueryClientProvider>
  );
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
}

// Custom render function that includes all providers
export function render(
  ui: ReactElement,
  options?: CustomRenderOptions
): RenderResult {
  const { queryClient, ...renderOptions } = options || {};

  return rtlRender(ui, {
    wrapper: ({ children }) => (
      <AllProviders queryClient={queryClient}>
        {children}
      </AllProviders>
    ),
    ...renderOptions,
  });
}

// Mock Next.js router
export const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  pathname: '/',
  query: {},
  asPath: '/',
  route: '/',
  basePath: '',
  forward: jest.fn(),
  refresh: jest.fn(),
};

// Mock Next.js navigation
export const mockNavigation = {
  useRouter: () => mockRouter,
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
};

// Wait for loading states to complete
export async function waitForLoadingToFinish() {
  const { waitFor } = await import('@testing-library/react');
  await waitFor(
    () => {
      const loadingElements = document.querySelectorAll('[aria-busy="true"]');
      const spinners = document.querySelectorAll('[role="progressbar"]');
      if (loadingElements.length > 0 || spinners.length > 0) {
        throw new Error('Still loading');
      }
    },
    { timeout: 3000 }
  );
}

// Utility to fill form fields
export async function fillFormField(
  fieldLabel: string,
  value: string,
  userEvent: any
) {
  const { screen } = await import('@testing-library/react');
  const field = screen.getByLabelText(new RegExp(fieldLabel, 'i'));
  await userEvent.clear(field);
  await userEvent.type(field, value);
}

// Utility to submit form
export async function submitForm(buttonText: string, userEvent: any) {
  const { screen } = await import('@testing-library/react');
  const submitButton = screen.getByRole('button', { name: new RegExp(buttonText, 'i') });
  await userEvent.click(submitButton);
}

// Utility to check for error message
export async function expectErrorMessage(message: string) {
  const { screen } = await import('@testing-library/react');
  const errorElement = await screen.findByText(new RegExp(message, 'i'));
  expect(errorElement).toBeInTheDocument();
}

// Utility to check for success message
export async function expectSuccessMessage(message: string) {
  const { screen } = await import('@testing-library/react');
  const successElement = await screen.findByText(new RegExp(message, 'i'));
  expect(successElement).toBeInTheDocument();
}

// Mock window.matchMedia for responsive tests
export function mockMatchMedia(matches: boolean = false) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

// Mock window.confirm
export function mockWindowConfirm(returnValue: boolean = true) {
  window.confirm = jest.fn(() => returnValue);
}

// Mock window.alert
export function mockWindowAlert() {
  window.alert = jest.fn();
}

// Export everything from testing library
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
