/**
 * useAuth Hook
 * Provides authentication functionality using enhanced Zustand store
 *
 * Features:
 * - Login with email/password (auto-fetches salon data)
 * - Register new users
 * - Logout
 * - Refresh user and salon profile
 * - Loading and error states
 * - Redirect logic based on salon existence
 */

'use client';

import { useAuthStore } from '@/stores/auth.store';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import type { LoginRequest, RegisterRequest } from '@/types/api';

export function useAuth() {
  const router = useRouter();

  const {
    user,
    salon,
    isAuthenticated,
    isLoading,
    error,
    login: storeLogin,
    register: storeRegister,
    logout: storeLogout,
    fetchUserData,
    fetchSalonData,
  } = useAuthStore();

  /**
   * Login with email and password
   * Note: Redirect logic is handled by login page component
   */
  const login = useCallback(
    async (data: LoginRequest) => {
      await storeLogin(data.email, data.password);
      // No redirect here - let the login page handle routing
    },
    [storeLogin]
  );

  /**
   * Register new user
   * Note: Redirect logic is handled by register page component
   */
  const register = useCallback(
    async (data: RegisterRequest) => {
      await storeRegister(data);
      // No redirect here - let the register page handle routing
    },
    [storeRegister]
  );

  /**
   * Logout user and redirect to login
   */
  const logout = useCallback(async () => {
    await storeLogout();
    router.push('/login');
  }, [storeLogout, router]);

  /**
   * Refresh user profile from server
   */
  const refreshProfile = useCallback(async () => {
    await fetchUserData();
  }, [fetchUserData]);

  /**
   * Refresh salon data from server
   */
  const refreshSalon = useCallback(async () => {
    await fetchSalonData();
  }, [fetchSalonData]);

  return {
    user,
    salon,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    refreshProfile,
    refreshSalon,
  };
}
