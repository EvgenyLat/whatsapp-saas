/**
 * UI State Management Store (Zustand)
 * WhatsApp SaaS Platform
 *
 * Manages global UI state including:
 * - Sidebar visibility
 * - Theme preferences (light/dark/system)
 * - Modal states
 * - Loading overlays
 * - Current salon selection
 * - Toast notifications queue
 *
 * Persists user preferences to localStorage
 *
 * @see https://docs.pmnd.rs/zustand/getting-started/introduction
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

/**
 * Theme options
 */
export type Theme = 'light' | 'dark' | 'system';

/**
 * Modal state
 * Tracks which modal is currently open and its data
 */
export interface ModalState {
  /** Modal identifier */
  id: string | null;
  /** Data passed to the modal */
  data?: unknown;
}

/**
 * Toast notification
 */
export interface Toast {
  /** Unique toast ID */
  id: string;
  /** Toast title */
  title: string;
  /** Toast message */
  message?: string;
  /** Toast type */
  type: 'info' | 'success' | 'warning' | 'error';
  /** Duration in milliseconds (0 = no auto-dismiss) */
  duration?: number;
  /** Timestamp when toast was created */
  timestamp: number;
}

/**
 * Loading overlay state
 */
export interface LoadingOverlay {
  /** Whether overlay is visible */
  isVisible: boolean;
  /** Loading message */
  message?: string;
}

/**
 * UI state interface
 */
export interface UIState {
  // Sidebar state
  /** Whether sidebar is open */
  sidebarOpen: boolean;

  /** Whether sidebar is collapsed (mobile) */
  sidebarCollapsed: boolean;

  // Theme state
  /** Current theme setting */
  theme: Theme;

  /** Resolved theme (computed from system preference if theme is 'system') */
  resolvedTheme: 'light' | 'dark';

  // Current salon
  /** Currently selected salon ID */
  currentSalonId: string | null;

  // Modal state
  /** Currently open modal */
  modal: ModalState;

  // Loading state
  /** Global loading overlay */
  loading: LoadingOverlay;

  // Toast notifications
  /** Active toast notifications */
  toasts: Toast[];

  // Misc UI state
  /** Whether mobile menu is open */
  mobileMenuOpen: boolean;

  /** Whether search dialog is open */
  searchOpen: boolean;
}

/**
 * UI actions interface
 */
export interface UIActions {
  // Sidebar actions
  /**
   * Toggle sidebar open/closed
   */
  toggleSidebar: () => void;

  /**
   * Set sidebar open state
   */
  setSidebarOpen: (open: boolean) => void;

  /**
   * Toggle sidebar collapsed state
   */
  toggleSidebarCollapsed: () => void;

  /**
   * Set sidebar collapsed state
   */
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Theme actions
  /**
   * Set theme preference
   * Automatically applies theme to document
   */
  setTheme: (theme: Theme) => void;

  /**
   * Update resolved theme
   * Called when system theme changes
   */
  updateResolvedTheme: (theme: 'light' | 'dark') => void;

  // Salon actions
  /**
   * Set current salon ID
   */
  setCurrentSalonId: (salonId: string | null) => void;

  // Modal actions
  /**
   * Open a modal
   *
   * @param id - Modal identifier
   * @param data - Optional data to pass to modal
   */
  openModal: (id: string, data?: unknown) => void;

  /**
   * Close current modal
   */
  closeModal: () => void;

  // Loading actions
  /**
   * Show loading overlay
   *
   * @param message - Optional loading message
   */
  showLoading: (message?: string) => void;

  /**
   * Hide loading overlay
   */
  hideLoading: () => void;

  // Toast actions
  /**
   * Add a toast notification
   *
   * @param toast - Toast configuration
   * @returns Toast ID
   */
  addToast: (toast: Omit<Toast, 'id' | 'timestamp'>) => string;

  /**
   * Remove a toast by ID
   *
   * @param id - Toast ID to remove
   */
  removeToast: (id: string) => void;

  /**
   * Clear all toasts
   */
  clearToasts: () => void;

  // Mobile menu actions
  /**
   * Toggle mobile menu
   */
  toggleMobileMenu: () => void;

  /**
   * Set mobile menu open state
   */
  setMobileMenuOpen: (open: boolean) => void;

  // Search actions
  /**
   * Toggle search dialog
   */
  toggleSearch: () => void;

  /**
   * Set search dialog open state
   */
  setSearchOpen: (open: boolean) => void;
}

/**
 * Combined UI store type
 */
export type UIStore = UIState & UIActions;

/**
 * Get resolved theme based on theme preference and system preference
 */
function getResolvedTheme(theme: Theme): 'light' | 'dark' {
  if (theme !== 'system') {
    return theme;
  }

  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  return 'light';
}

/**
 * Apply theme to document
 */
function applyTheme(theme: 'light' | 'dark'): void {
  if (typeof window === 'undefined') return;

  const root = window.document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(theme);
}

/**
 * UI Zustand Store
 * Persists to localStorage under 'ui-storage' key
 */
export const useUIStore = create<UIStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        sidebarOpen: true,
        sidebarCollapsed: false,
        theme: 'system',
        resolvedTheme: 'light',
        currentSalonId: null,
        modal: { id: null },
        loading: { isVisible: false },
        toasts: [],
        mobileMenuOpen: false,
        searchOpen: false,

        // Sidebar actions
        toggleSidebar: () => {
          set((state) => ({ sidebarOpen: !state.sidebarOpen }), false, 'ui/toggleSidebar');
        },

        setSidebarOpen: (open) => {
          set({ sidebarOpen: open }, false, 'ui/setSidebarOpen');
        },

        toggleSidebarCollapsed: () => {
          set(
            (state) => ({ sidebarCollapsed: !state.sidebarCollapsed }),
            false,
            'ui/toggleSidebarCollapsed'
          );
        },

        setSidebarCollapsed: (collapsed) => {
          set({ sidebarCollapsed: collapsed }, false, 'ui/setSidebarCollapsed');
        },

        // Theme actions
        setTheme: (theme) => {
          const resolvedTheme = getResolvedTheme(theme);
          applyTheme(resolvedTheme);

          set({ theme, resolvedTheme }, false, 'ui/setTheme');
        },

        updateResolvedTheme: (theme) => {
          const { theme: currentTheme } = get();
          if (currentTheme === 'system') {
            applyTheme(theme);
            set({ resolvedTheme: theme }, false, 'ui/updateResolvedTheme');
          }
        },

        // Salon actions
        setCurrentSalonId: (salonId) => {
          set({ currentSalonId: salonId }, false, 'ui/setCurrentSalonId');
        },

        // Modal actions
        openModal: (id, data) => {
          set({ modal: { id, data } }, false, 'ui/openModal');
        },

        closeModal: () => {
          set({ modal: { id: null } }, false, 'ui/closeModal');
        },

        // Loading actions
        showLoading: (message) => {
          set({ loading: { isVisible: true, message } }, false, 'ui/showLoading');
        },

        hideLoading: () => {
          set({ loading: { isVisible: false } }, false, 'ui/hideLoading');
        },

        // Toast actions
        addToast: (toast) => {
          const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
          const newToast: Toast = {
            ...toast,
            id,
            timestamp: Date.now(),
            duration: toast.duration ?? 5000, // Default 5 seconds
          };

          set((state) => ({ toasts: [...state.toasts, newToast] }), false, 'ui/addToast');

          // Auto-dismiss if duration is set
          if (newToast.duration && newToast.duration > 0) {
            setTimeout(() => {
              get().removeToast(id);
            }, newToast.duration);
          }

          return id;
        },

        removeToast: (id) => {
          set(
            (state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }),
            false,
            'ui/removeToast'
          );
        },

        clearToasts: () => {
          set({ toasts: [] }, false, 'ui/clearToasts');
        },

        // Mobile menu actions
        toggleMobileMenu: () => {
          set(
            (state) => ({ mobileMenuOpen: !state.mobileMenuOpen }),
            false,
            'ui/toggleMobileMenu'
          );
        },

        setMobileMenuOpen: (open) => {
          set({ mobileMenuOpen: open }, false, 'ui/setMobileMenuOpen');
        },

        // Search actions
        toggleSearch: () => {
          set((state) => ({ searchOpen: !state.searchOpen }), false, 'ui/toggleSearch');
        },

        setSearchOpen: (open) => {
          set({ searchOpen: open }, false, 'ui/setSearchOpen');
        },
      }),
      {
        name: 'ui-storage',
        version: 1,
        // Only persist user preferences, not transient UI state
        partialize: (state) => ({
          sidebarOpen: state.sidebarOpen,
          sidebarCollapsed: state.sidebarCollapsed,
          theme: state.theme,
          currentSalonId: state.currentSalonId,
        }),
        // Rehydrate theme on load
        onRehydrateStorage: () => (state) => {
          if (state) {
            const resolvedTheme = getResolvedTheme(state.theme);
            applyTheme(resolvedTheme);
            state.resolvedTheme = resolvedTheme;
          }
        },
      }
    ),
    {
      name: 'UIStore',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);

/**
 * Selector hooks for common UI patterns
 */

/**
 * Get sidebar open state
 */
export const useSidebarOpen = () => useUIStore((state) => state.sidebarOpen);

/**
 * Get current theme
 */
export const useTheme = () => useUIStore((state) => state.theme);

/**
 * Get resolved theme
 */
export const useResolvedTheme = () => useUIStore((state) => state.resolvedTheme);

/**
 * Get current salon ID
 */
export const useCurrentSalonId = () => useUIStore((state) => state.currentSalonId);

/**
 * Get modal state
 */
export const useModal = () => useUIStore((state) => state.modal);

/**
 * Get loading state
 */
export const useLoading = () => useUIStore((state) => state.loading);

/**
 * Get toasts
 */
export const useToasts = () => useUIStore((state) => state.toasts);

/**
 * Hook to show success toast
 */
export const useSuccessToast = () => {
  const addToast = useUIStore((state) => state.addToast);
  return (title: string, message?: string) =>
    addToast({ title, message, type: 'success' });
};

/**
 * Hook to show error toast
 */
export const useErrorToast = () => {
  const addToast = useUIStore((state) => state.addToast);
  return (title: string, message?: string) =>
    addToast({ title, message, type: 'error' });
};

/**
 * Hook to show info toast
 */
export const useInfoToast = () => {
  const addToast = useUIStore((state) => state.addToast);
  return (title: string, message?: string) =>
    addToast({ title, message, type: 'info' });
};

/**
 * Hook to show warning toast
 */
export const useWarningToast = () => {
  const addToast = useUIStore((state) => state.addToast);
  return (title: string, message?: string) =>
    addToast({ title, message, type: 'warning' });
};

/**
 * Initialize theme system
 * Should be called in _app.tsx or layout.tsx
 *
 * @returns Cleanup function to remove event listeners
 *
 * @example
 * ```ts
 * useEffect(() => {
 *   const cleanup = initializeTheme();
 *   return cleanup;
 * }, []);
 * ```
 */
export function initializeTheme(): (() => void) | undefined {
  if (typeof window === 'undefined') return;

  // Listen for system theme changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handleChange = (e: MediaQueryListEvent) => {
    useUIStore.getState().updateResolvedTheme(e.matches ? 'dark' : 'light');
  };

  mediaQuery.addEventListener('change', handleChange);

  // Cleanup
  return () => {
    mediaQuery.removeEventListener('change', handleChange);
  };
}
