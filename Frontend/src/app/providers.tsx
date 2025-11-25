/**
 * Providers Component
 * Wraps the app with necessary providers
 * Uses Zustand for auth state (no SessionProvider needed)
 */

'use client';

import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { I18nProvider } from '@/lib/i18n';

interface ProvidersProps {
  children: React.ReactNode;
}

/**
 * Create React Query client with optimized default options
 * PRODUCTION FIX: Create client inside React component to prevent:
 * - Multiple instances during Fast Refresh
 * - Server/client mismatches
 * - Memory leaks from module-level singletons
 */
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // PERFORMANCE: Keep data fresh for 5 minutes before refetch
        staleTime: 5 * 60 * 1000, // 5 minutes

        // PERFORMANCE: Cache data for 10 minutes even when inactive
        gcTime: 10 * 60 * 1000, // 10 minutes (previously cacheTime)

        // Disable refetch on window focus to reduce unnecessary requests
        refetchOnWindowFocus: false,

        // Disable refetch on reconnect for better performance
        refetchOnReconnect: false,

        // Retry failed requests only once
        retry: 1,

        // PERFORMANCE: Retry delay with exponential backoff
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

        // PERFORMANCE: Network mode optimized for online-first
        networkMode: 'online',
      },
      mutations: {
        // Retry mutations once in case of transient failures
        retry: 1,

        // Network mode for mutations
        networkMode: 'online',
      },
    },
  });
}

// PRODUCTION FIX: Browser-only singleton with proper scoping
let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return makeQueryClient();
  } else {
    // Browser: make a new query client if we don't already have one
    // This is CRITICAL for avoiding multiple instances during Fast Refresh
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

export function Providers({ children }: ProvidersProps) {
  // PRODUCTION FIX: Use React state to ensure stability across renders
  const [queryClient] = React.useState(() => getQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        {children}
        {/* Show DevTools only in development */}
        {process.env.NODE_ENV === 'development' && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
      </I18nProvider>
    </QueryClientProvider>
  );
}
