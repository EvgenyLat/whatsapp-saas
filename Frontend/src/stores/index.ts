/**
 * Zustand Stores
 * WhatsApp SaaS Platform
 *
 * Centralized exports for all Zustand stores
 */

// Auth store
export {
  useAuthStore,
  useCurrentUser,
  useCurrentSalon,
  useIsAuthenticated,
  useAccessToken,
  useCurrentSalonId as useAuthCurrentSalonId,
  useUserRole,
  useAuthLoading,
  useAuthError,
} from './auth.store';
export type { AuthState, AuthActions, AuthStore } from './auth.store';

// UI store
export {
  useUIStore,
  useSidebarOpen,
  useTheme,
  useResolvedTheme,
  useCurrentSalonId,
  useModal,
  useLoading,
  useToasts,
  useSuccessToast,
  useErrorToast,
  useInfoToast,
  useWarningToast,
  initializeTheme,
} from './useUIStore';
export type {
  UIState,
  UIActions,
  UIStore,
  Theme,
  ModalState,
  Toast,
  LoadingOverlay,
} from './useUIStore';

// Filter store
export {
  useFilterStore,
  useBookingFilters,
  useMessageFilters,
  useSalonFilters,
  useTemplateFilters,
  useCustomerFilters,
} from './useFilterStore';
export type {
  FilterState,
  FilterActions,
  FilterStore,
  BookingFilters,
  MessageFilters,
  SalonFilters,
  TemplateFilters,
  CustomerFilters,
} from './useFilterStore';

// Notification store
export {
  useNotificationStore,
  useActiveNotifications,
  useUnreadCount,
  useUnreadNotifications,
  useNotificationPreferences,
  useNotificationLoading,
  useAddNotification,
  requestNotificationPermission,
} from './useNotificationStore';
export type {
  NotificationState,
  NotificationActions,
  NotificationStore,
  AppNotification,
  NotificationPreferences,
} from './useNotificationStore';
