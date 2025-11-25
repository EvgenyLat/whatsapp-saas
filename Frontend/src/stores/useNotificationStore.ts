/**
 * Notification Queue Store (Zustand)
 * WhatsApp SaaS Platform
 *
 * Manages system notifications:
 * - In-app notification queue
 * - Unread notification count
 * - Notification history
 * - Notification preferences
 *
 * Integrates with Toast system from UI store for transient notifications
 *
 * @see https://docs.pmnd.rs/zustand/getting-started/introduction
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { Notification } from '@/types';

/**
 * Notification type extending base Notification model
 */
export interface AppNotification extends Notification {
  /** Whether the notification has been dismissed */
  dismissed: boolean;
}

/**
 * Notification preferences
 */
export interface NotificationPreferences {
  /** Enable desktop notifications (browser permission required) */
  desktopEnabled: boolean;

  /** Enable sound notifications */
  soundEnabled: boolean;

  /** Notification types to receive */
  enabledTypes: {
    /** Booking-related notifications */
    bookings: boolean;
    /** Message-related notifications */
    messages: boolean;
    /** System notifications */
    system: boolean;
    /** Marketing/promotional notifications */
    marketing: boolean;
  };
}

/**
 * Notification state interface
 */
export interface NotificationState {
  /** All notifications */
  notifications: AppNotification[];

  /** Notification preferences */
  preferences: NotificationPreferences;

  /** Whether notifications are loading */
  isLoading: boolean;

  /** Last fetch timestamp */
  lastFetch: number | null;
}

/**
 * Notification actions interface
 */
export interface NotificationActions {
  /**
   * Add a new notification
   *
   * @param notification - Notification to add
   *
   * @example
   * ```ts
   * const { addNotification } = useNotificationStore();
   * addNotification({
   *   id: '123',
   *   user_id: 'user-1',
   *   title: 'New Booking',
   *   message: 'You have a new booking',
   *   type: 'info',
   *   is_read: false,
   *   action_url: '/bookings/123',
   *   created_at: new Date().toISOString()
   * });
   * ```
   */
  addNotification: (notification: Notification) => void;

  /**
   * Add multiple notifications at once
   *
   * @param notifications - Array of notifications to add
   */
  addNotifications: (notifications: Notification[]) => void;

  /**
   * Mark notification as read
   *
   * @param notificationId - Notification ID to mark as read
   */
  markAsRead: (notificationId: string) => void;

  /**
   * Mark all notifications as read
   */
  markAllAsRead: () => void;

  /**
   * Dismiss a notification (remove from active list)
   *
   * @param notificationId - Notification ID to dismiss
   */
  dismissNotification: (notificationId: string) => void;

  /**
   * Dismiss all notifications
   */
  dismissAll: () => void;

  /**
   * Remove a notification permanently
   *
   * @param notificationId - Notification ID to remove
   */
  removeNotification: (notificationId: string) => void;

  /**
   * Clear all notifications
   */
  clearAll: () => void;

  /**
   * Clear old notifications (older than specified days)
   *
   * @param days - Number of days to keep
   */
  clearOld: (days: number) => void;

  /**
   * Update notification preferences
   *
   * @param preferences - Partial preferences to update
   */
  updatePreferences: (preferences: Partial<NotificationPreferences>) => void;

  /**
   * Set loading state
   *
   * @param loading - Loading state
   */
  setLoading: (loading: boolean) => void;

  /**
   * Update last fetch timestamp
   */
  updateLastFetch: () => void;

  /**
   * Get unread notification count
   *
   * @returns Number of unread notifications
   */
  getUnreadCount: () => number;

  /**
   * Get notifications by type
   *
   * @param type - Notification type filter
   * @returns Filtered notifications
   */
  getNotificationsByType: (
    type: 'info' | 'success' | 'warning' | 'error'
  ) => AppNotification[];

  /**
   * Get unread notifications
   *
   * @returns Unread notifications
   */
  getUnreadNotifications: () => AppNotification[];

  /**
   * Get active notifications (not dismissed)
   *
   * @returns Active notifications
   */
  getActiveNotifications: () => AppNotification[];
}

/**
 * Combined notification store type
 */
export type NotificationStore = NotificationState & NotificationActions;

/**
 * Default notification preferences
 */
const defaultPreferences: NotificationPreferences = {
  desktopEnabled: false,
  soundEnabled: true,
  enabledTypes: {
    bookings: true,
    messages: true,
    system: true,
    marketing: false,
  },
};

/**
 * Notification Zustand Store
 * Persists notifications and preferences to localStorage
 */
export const useNotificationStore = create<NotificationStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        notifications: [],
        preferences: defaultPreferences,
        isLoading: false,
        lastFetch: null,

        // Actions
        addNotification: (notification) => {
          set(
            (state) => {
              // Check if notification already exists
              const exists = state.notifications.some((n) => n.id === notification.id);
              if (exists) return state;

              return {
                notifications: [
                  {
                    ...notification,
                    dismissed: false,
                  },
                  ...state.notifications,
                ],
              };
            },
            false,
            'notifications/addNotification'
          );
        },

        addNotifications: (notifications) => {
          set(
            (state) => {
              // Filter out duplicates
              const existingIds = new Set(state.notifications.map((n) => n.id));
              const newNotifications = notifications
                .filter((n) => !existingIds.has(n.id))
                .map((n) => ({
                  ...n,
                  dismissed: false,
                }));

              return {
                notifications: [...newNotifications, ...state.notifications],
              };
            },
            false,
            'notifications/addNotifications'
          );
        },

        markAsRead: (notificationId) => {
          set(
            (state) => ({
              notifications: state.notifications.map((n) =>
                n.id === notificationId ? { ...n, is_read: true } : n
              ),
            }),
            false,
            'notifications/markAsRead'
          );
        },

        markAllAsRead: () => {
          set(
            (state) => ({
              notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
            }),
            false,
            'notifications/markAllAsRead'
          );
        },

        dismissNotification: (notificationId) => {
          set(
            (state) => ({
              notifications: state.notifications.map((n) =>
                n.id === notificationId ? { ...n, dismissed: true } : n
              ),
            }),
            false,
            'notifications/dismissNotification'
          );
        },

        dismissAll: () => {
          set(
            (state) => ({
              notifications: state.notifications.map((n) => ({ ...n, dismissed: true })),
            }),
            false,
            'notifications/dismissAll'
          );
        },

        removeNotification: (notificationId) => {
          set(
            (state) => ({
              notifications: state.notifications.filter((n) => n.id !== notificationId),
            }),
            false,
            'notifications/removeNotification'
          );
        },

        clearAll: () => {
          set({ notifications: [] }, false, 'notifications/clearAll');
        },

        clearOld: (days) => {
          const cutoffDate = Date.now() - days * 24 * 60 * 60 * 1000;

          set(
            (state) => ({
              notifications: state.notifications.filter((n) => {
                const createdAt =
                  typeof n.created_at === 'string'
                    ? new Date(n.created_at).getTime()
                    : n.created_at.getTime();
                return createdAt > cutoffDate;
              }),
            }),
            false,
            'notifications/clearOld'
          );
        },

        updatePreferences: (preferences) => {
          set(
            (state) => ({
              preferences: { ...state.preferences, ...preferences },
            }),
            false,
            'notifications/updatePreferences'
          );
        },

        setLoading: (loading) => {
          set({ isLoading: loading }, false, 'notifications/setLoading');
        },

        updateLastFetch: () => {
          set({ lastFetch: Date.now() }, false, 'notifications/updateLastFetch');
        },

        getUnreadCount: () => {
          const { notifications } = get();
          return notifications.filter((n) => !n.is_read && !n.dismissed).length;
        },

        getNotificationsByType: (type) => {
          const { notifications } = get();
          return notifications.filter((n) => n.type === type);
        },

        getUnreadNotifications: () => {
          const { notifications } = get();
          return notifications.filter((n) => !n.is_read && !n.dismissed);
        },

        getActiveNotifications: () => {
          const { notifications } = get();
          return notifications.filter((n) => !n.dismissed);
        },
      }),
      {
        name: 'notifications-storage',
        version: 1,
        // Persist all notification data
        partialize: (state) => ({
          notifications: state.notifications,
          preferences: state.preferences,
          lastFetch: state.lastFetch,
        }),
      }
    ),
    {
      name: 'NotificationStore',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);

/**
 * Selector hooks for common notification patterns
 */

/**
 * Get all active notifications
 */
export const useActiveNotifications = () =>
  useNotificationStore((state) => state.getActiveNotifications());

/**
 * Get unread notification count
 */
export const useUnreadCount = () => useNotificationStore((state) => state.getUnreadCount());

/**
 * Get unread notifications
 */
export const useUnreadNotifications = () =>
  useNotificationStore((state) => state.getUnreadNotifications());

/**
 * Get notification preferences
 */
export const useNotificationPreferences = () =>
  useNotificationStore((state) => state.preferences);

/**
 * Get notification loading state
 */
export const useNotificationLoading = () => useNotificationStore((state) => state.isLoading);

/**
 * Hook to add notification with automatic toast
 * Integrates with UI store toast system
 *
 * @returns Function to add notification
 *
 * @example
 * ```ts
 * const addNotification = useAddNotification();
 * addNotification({
 *   id: '123',
 *   user_id: 'user-1',
 *   title: 'New Booking',
 *   message: 'You have a new booking',
 *   type: 'info',
 *   is_read: false,
 *   action_url: '/bookings/123',
 *   created_at: new Date().toISOString()
 * });
 * ```
 */
export function useAddNotification() {
  const addNotification = useNotificationStore((state) => state.addNotification);

  return (notification: Notification) => {
    // Add to notification store
    addNotification(notification);

    // Optionally show desktop notification if enabled
    const { preferences } = useNotificationStore.getState();
    if (preferences.desktopEnabled && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: notification.id,
      });
    }

    // Play sound if enabled
    if (preferences.soundEnabled && typeof window !== 'undefined') {
      // You can add a notification sound here
      // const audio = new Audio('/sounds/notification.mp3');
      // audio.play().catch(() => {});
    }
  };
}

/**
 * Request desktop notification permission
 * Should be called on user interaction (button click)
 *
 * @returns Promise resolving to permission state
 *
 * @example
 * ```ts
 * const requestPermission = useRequestNotificationPermission();
 * await requestPermission();
 * ```
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      useNotificationStore.getState().updatePreferences({ desktopEnabled: true });
    }
    return permission;
  }

  return Notification.permission;
}
