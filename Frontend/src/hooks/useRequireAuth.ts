/**
 * useRequireAuth Hook
 * Ensures user is authenticated before accessing protected routes
 *
 * Usage:
 * Add to the top of any protected page component
 * Automatically redirects to /login if not authenticated
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';

export function useRequireAuth() {
  const router = useRouter();
  const { isAuthenticated, isHydrated, isLoading } = useAuthStore();

  useEffect(() => {
    // Wait for hydration to complete
    if (!isHydrated) {
      return;
    }

    // Don't redirect while loading
    if (isLoading) {
      return;
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isHydrated, isLoading, router]);

  return {
    isAuthenticated,
    isLoading: !isHydrated || isLoading,
  };
}
