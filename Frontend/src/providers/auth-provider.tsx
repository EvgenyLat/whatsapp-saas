/**
 * Auth Provider Component
 * Wraps app with authentication state initialization
 *
 * Responsibilities:
 * - Rehydrate auth state from localStorage on app load
 * - Fetch fresh user and salon data if tokens exist
 * - Handle token validation and refresh
 * - Show loading state while checking authentication
 */

'use client';

import * as React from 'react';
import { useAuthStore } from '@/store/auth.store';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isInitialized, setIsInitialized] = React.useState(false);
  const { isHydrated, isAuthenticated, accessToken, fetchUserData } = useAuthStore();

  React.useEffect(() => {
    // Wait for hydration to complete
    if (!isHydrated) {
      return;
    }

    // If not authenticated, we're done initializing
    if (!isAuthenticated || !accessToken) {
      setIsInitialized(true);
      return;
    }

    // If authenticated, fetch fresh user and salon data
    const initializeAuth = async () => {
      try {
        await fetchUserData();
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        // Don't block UI on error - user will see auth error on next request
      } finally {
        setIsInitialized(true);
      }
    };

    initializeAuth();
  }, [isHydrated, isAuthenticated, accessToken, fetchUserData]);

  // Show loading spinner while initializing
  if (!isInitialized) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-50">
        <div className="text-center">
          <LoadingSpinner variant="primary" size="lg" />
          <p className="mt-4 text-sm text-neutral-600">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
