/**
 * Enhanced Authentication Store (Zustand)
 * WhatsApp SaaS Platform
 *
 * Manages authentication state including:
 * - User session data with salon information
 * - JWT token storage
 * - Login/logout/register actions
 * - Auto-fetch user and salon data on app load
 * - Token refresh handling
 * - Persistent storage (localStorage)
 *
 * @see https://docs.pmnd.rs/zustand/getting-started/introduction
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { authApi, salonsApi } from '@/lib/api';
import type { User, Salon } from '@/types';

/**
 * Authentication state interface
 * Defines the shape of the auth store
 */
export interface AuthState {
  /** Currently authenticated user (null if not logged in) */
  user: User | null;

  /** User's salon data (null if no salon or not loaded) */
  salon: Salon | null;

  /** JWT access token - expires in 15min (null if not logged in) */
  accessToken: string | null;

  /** JWT refresh token - expires in 7 days (null if not logged in) */
  refreshToken: string | null;

  /** Whether user is authenticated */
  isAuthenticated: boolean;

  /** Whether the auth state has been hydrated from storage */
  isHydrated: boolean;

  /** Loading state for async auth operations */
  isLoading: boolean;

  /** Error message from last auth operation */
  error: string | null;
}

/**
 * Authentication actions interface
 * Defines all available auth operations
 */
export interface AuthActions {
  /**
   * Set tokens after login or refresh
   *
   * @param accessToken - JWT access token
   * @param refreshToken - JWT refresh token
   */
  setTokens: (accessToken: string, refreshToken: string) => void;

  /**
   * Set user data
   *
   * @param user - User data from authentication response
   */
  setUser: (user: User) => void;

  /**
   * Set salon data
   *
   * @param salon - Salon data
   */
  setSalon: (salon: Salon | null) => void;

  /**
   * Set loading state
   *
   * @param loading - Loading state
   */
  setLoading: (loading: boolean) => void;

  /**
   * Set error message
   *
   * @param error - Error message or null
   */
  setError: (error: string | null) => void;

  /**
   * Login with email and password
   * Automatically fetches user and salon data
   *
   * @param email - User email
   * @param password - User password
   * @throws Error if login fails
   */
  login: (email: string, password: string) => Promise<void>;

  /**
   * Register new user
   * Automatically logs in and fetches data
   *
   * @param data - Registration data
   * @throws Error if registration fails
   */
  register: (data: any) => Promise<void>;

  /**
   * Logout and clear all auth data
   * Clears localStorage and redirects to login
   */
  logout: () => Promise<void>;

  /**
   * Fetch user data from API
   * Updates user in store
   */
  fetchUserData: () => Promise<void>;

  /**
   * Fetch salon data from API
   * Updates salon in store based on user's salon_id
   */
  fetchSalonData: () => Promise<void>;

  /**
   * Clear all auth data (complete logout)
   */
  clearAuth: () => void;

  /**
   * Update user profile data
   *
   * @param updates - Partial user data to update
   */
  updateUser: (updates: Partial<User>) => void;

  /**
   * Set hydration state
   * Called by persist middleware after rehydration
   */
  setHydrated: () => void;
}

/**
 * Combined auth store type
 */
export type AuthStore = AuthState & AuthActions;

/**
 * Authentication Zustand Store
 * Persists to localStorage under 'auth-storage' key
 */
export const useAuthStore = create<AuthStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        user: null,
        salon: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isHydrated: false, // Will be set to true after persist rehydration
        isLoading: false,
        error: null,

        // Actions
        setTokens: (accessToken, refreshToken) => {
          set(
            {
              accessToken,
              refreshToken,
              isAuthenticated: true,
            },
            false,
            'auth/setTokens'
          );
        },

        setUser: (user) => {
          set(
            {
              user,
            },
            false,
            'auth/setUser'
          );
        },

        setSalon: (salon) => {
          set(
            {
              salon,
            },
            false,
            'auth/setSalon'
          );
        },

        setLoading: (isLoading) => {
          set({ isLoading }, false, 'auth/setLoading');
        },

        setError: (error) => {
          set({ error }, false, 'auth/setError');
        },

        login: async (email, password) => {
          set({ isLoading: true, error: null }, false, 'auth/login:start');

          try {
            // Call login API
            const response = await authApi.login({ email, password });

            // Store tokens and user
            set(
              {
                accessToken: response.accessToken,
                refreshToken: response.refreshToken,
                user: response.user,
                isAuthenticated: true,
                isLoading: false,
                error: null,
              },
              false,
              'auth/login:success'
            );

            // Fetch salon data if user has salon_id
            if (response.user.salon_id) {
              try {
                await get().fetchSalonData();
              } catch (salonError) {
                // Log salon fetch error but don't fail login
                console.error('[AUTH STORE] Login succeeded but salon fetch failed:', salonError);
                // Login is still successful, just salon data couldn't be loaded
                // Dashboard will handle this case
              }
            }
          } catch (error: any) {
            const errorMessage = error.message || 'Login failed';
            set(
              {
                isLoading: false,
                error: errorMessage,
              },
              false,
              'auth/login:error'
            );
            throw error;
          }
        },

        register: async (data) => {
          set({ isLoading: true, error: null }, false, 'auth/register:start');

          try {
            // Call register API
            const response = await authApi.register(data);

            // Store tokens and user
            set(
              {
                accessToken: response.accessToken,
                refreshToken: response.refreshToken,
                user: response.user,
                isAuthenticated: true,
                isLoading: false,
                error: null,
              },
              false,
              'auth/register:success'
            );

            // Fetch salon data if user has salon_id
            if (response.user.salon_id) {
              await get().fetchSalonData();
            }
          } catch (error: any) {
            const errorMessage = error.message || 'Registration failed';
            set(
              {
                isLoading: false,
                error: errorMessage,
              },
              false,
              'auth/register:error'
            );
            throw error;
          }
        },

        logout: async () => {
          try {
            // Call logout API (client-side only, backend uses stateless JWT)
            await authApi.logout();
          } catch (error) {
            console.error('Logout error:', error);
          } finally {
            // Always clear auth state
            get().clearAuth();
          }
        },

        fetchUserData: async () => {
          try {
            const user = await authApi.getProfile();
            set({ user }, false, 'auth/fetchUserData:success');

            // Fetch salon data if user has salon_id
            if (user.salon_id) {
              await get().fetchSalonData();
            }
          } catch (error: any) {
            console.error('Failed to fetch user data:', error);
            // On 401, clear auth (token expired)
            if (error.status === 401) {
              get().clearAuth();
            }
            throw error;
          }
        },

        fetchSalonData: async () => {
          const { user } = get();
          console.log('[AUTH STORE] fetchSalonData START', { salon_id: user?.salon_id });

          if (!user?.salon_id) {
            console.log('[AUTH STORE] No salon_id, setting salon to null');
            set({ salon: null }, false, 'auth/fetchSalonData:no-salon');
            return;
          }

          try {
            console.log('[AUTH STORE] Fetching salon from API...', user.salon_id);
            const salon = await salonsApi.getById(user.salon_id);
            console.log('[AUTH STORE] Salon fetched successfully', { id: salon.id, name: salon.name });
            set({ salon }, false, 'auth/fetchSalonData:success');
          } catch (error: any) {
            console.error('[AUTH STORE] FAILED to fetch salon data:', error);
            console.error('[AUTH STORE] Error details:', {
              message: error.message,
              status: error.status,
              code: error.code,
              response_status: error.response?.status,
              response_data: error.response?.data,
              salon_id: user.salon_id,
              has_access_token: !!get().accessToken,
              access_token_preview: get().accessToken?.substring(0, 20) + '...',
            });
            // Don't clear auth on salon fetch failure, just log error
            set({ salon: null }, false, 'auth/fetchSalonData:error');
            throw error; // Re-throw so caller knows fetch failed
          }
        },

        clearAuth: () => {
          set(
            {
              user: null,
              salon: null,
              accessToken: null,
              refreshToken: null,
              isAuthenticated: false,
              isLoading: false,
              error: null,
            },
            false,
            'auth/clearAuth'
          );
        },

        updateUser: (updates) => {
          const { user } = get();
          if (!user) return;

          const updatedUser = { ...user, ...updates };

          set(
            {
              user: updatedUser,
            },
            false,
            'auth/updateUser'
          );

          // Force immediate persistence to localStorage to prevent race conditions
          // This ensures user updates are persisted immediately
          if (typeof window !== 'undefined' && updates.salon_id) {
            try {
              const storage = localStorage.getItem('auth-storage');
              if (storage) {
                const parsed = JSON.parse(storage);
                parsed.state.user = updatedUser;
                localStorage.setItem('auth-storage', JSON.stringify(parsed));
              }
            } catch (error) {
              console.error('Failed to force persist user update:', error);
            }
          }
        },

        setHydrated: () => {
          set({ isHydrated: true }, false, 'auth/setHydrated');
        },
      }),
      {
        name: 'auth-storage',
        version: 3,
        // Only persist essential auth data
        partialize: (state) => ({
          user: state.user,
          salon: state.salon,
          accessToken: state.accessToken,
          refreshToken: state.refreshToken,
          isAuthenticated: state.isAuthenticated,
        }),
        // Called after rehydration completes
        onRehydrateStorage: (state) => {
          // Return a function that will be called after rehydration
          return (rehydratedState, error) => {
            if (error) {
              console.error('Failed to rehydrate auth state:', error);
            }
            // CRITICAL: Always set hydrated to true, even if rehydratedState is undefined
            // (which happens when there's no data in localStorage on first load)
            // We must use the store's set function directly via the state parameter
            state.setHydrated();
          };
        },
      }
    ),
    {
      name: 'AuthStore',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);

/**
 * Selector hooks for common auth patterns
 * These prevent unnecessary re-renders by selecting only needed data
 */

/**
 * Get current user
 */
export const useCurrentUser = () => useAuthStore((state) => state.user);

/**
 * Get current salon
 */
export const useCurrentSalon = () => useAuthStore((state) => state.salon);

/**
 * Get authentication status
 */
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);

/**
 * Get access token
 */
export const useAccessToken = () => useAuthStore((state) => state.accessToken);

/**
 * Get current salon ID
 */
export const useCurrentSalonId = () => useAuthStore((state) => state.user?.salon_id || null);

/**
 * Get user role
 */
export const useUserRole = () => useAuthStore((state) => state.user?.role);

/**
 * Get loading state
 */
export const useAuthLoading = () => useAuthStore((state) => state.isLoading);

/**
 * Get error state
 */
export const useAuthError = () => useAuthStore((state) => state.error);
