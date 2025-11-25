/**
 * React Query Key Factory
 * WhatsApp SaaS Platform
 *
 * Centralized query key management using the factory pattern.
 * This ensures type-safe, consistent, and hierarchical query keys.
 *
 * Benefits:
 * - Type safety for all query keys
 * - Easy invalidation of related queries
 * - Autocomplete support in IDE
 * - Prevents typos and inconsistencies
 * - Hierarchical structure for granular cache control
 *
 * @see https://tkdodo.eu/blog/effective-react-query-keys
 */

import type {
  GetBookingsParams,
  GetMessagesParams,
  GetSalonsParams,
  GetTemplatesParams,
  GetConversationsParams,
  GetCustomersParams,
  GetDashboardStatsParams,
  GetAnalyticsParams,
  GetServicesParams,
  GetStaffParams,
} from '@/types';

/**
 * Query keys for authentication
 */
export const authKeys = {
  /** Base key for all auth queries */
  all: ['auth'] as const,

  /** Current user query key */
  user: () => [...authKeys.all, 'user'] as const,

  /** Session query key */
  session: () => [...authKeys.all, 'session'] as const,
} as const;

/**
 * Query keys for salons
 *
 * Hierarchy:
 * - salons.all - All salon queries
 * - salons.lists() - All salon list queries
 * - salons.list(filters) - Specific salon list with filters
 * - salons.details() - All salon detail queries
 * - salons.detail(id) - Specific salon detail
 */
export const salonKeys = {
  /** Base key for all salon queries */
  all: ['salons'] as const,

  /** All salon list queries */
  lists: () => [...salonKeys.all, 'list'] as const,

  /** Specific salon list with filters */
  list: (filters: GetSalonsParams = {}) => [...salonKeys.lists(), filters] as const,

  /** All salon detail queries */
  details: () => [...salonKeys.all, 'detail'] as const,

  /** Specific salon detail */
  detail: (id: string) => [...salonKeys.details(), id] as const,

  /** Salon settings */
  settings: (id: string) => [...salonKeys.detail(id), 'settings'] as const,
} as const;

/**
 * Query keys for bookings
 *
 * Hierarchy:
 * - bookings.all - All booking queries
 * - bookings.lists() - All booking list queries
 * - bookings.list(salonId, filters) - Specific booking list
 * - bookings.details() - All booking detail queries
 * - bookings.detail(id) - Specific booking detail
 * - bookings.stats(salonId) - Booking statistics
 */
export const bookingKeys = {
  /** Base key for all booking queries */
  all: ['bookings'] as const,

  /** All booking list queries */
  lists: () => [...bookingKeys.all, 'list'] as const,

  /** Specific booking list with filters */
  list: (salonId: string, filters: GetBookingsParams = {}) =>
    [...bookingKeys.lists(), salonId, filters] as const,

  /** All booking detail queries */
  details: () => [...bookingKeys.all, 'detail'] as const,

  /** Specific booking detail */
  detail: (id: string) => [...bookingKeys.details(), id] as const,

  /** Booking statistics for a salon */
  stats: (salonId: string) => [...bookingKeys.all, 'stats', salonId] as const,

  /** Upcoming bookings for a salon */
  upcoming: (salonId: string) => [...bookingKeys.all, 'upcoming', salonId] as const,

  /** Today's bookings for a salon */
  today: (salonId: string) => [...bookingKeys.all, 'today', salonId] as const,
} as const;

/**
 * Query keys for messages
 *
 * Hierarchy:
 * - messages.all - All message queries
 * - messages.lists() - All message list queries
 * - messages.list(salonId, filters) - Specific message list
 * - messages.details() - All message detail queries
 * - messages.detail(id) - Specific message detail
 */
export const messageKeys = {
  /** Base key for all message queries */
  all: ['messages'] as const,

  /** All message list queries */
  lists: () => [...messageKeys.all, 'list'] as const,

  /** Specific message list with filters */
  list: (salonId: string, filters: GetMessagesParams = {}) =>
    [...messageKeys.lists(), salonId, filters] as const,

  /** All message detail queries */
  details: () => [...messageKeys.all, 'detail'] as const,

  /** Specific message detail */
  detail: (id: string) => [...messageKeys.details(), id] as const,

  /** Unread message count */
  unreadCount: (salonId: string) => [...messageKeys.all, 'unread', salonId] as const,
} as const;

/**
 * Query keys for conversations
 *
 * Hierarchy:
 * - conversations.all - All conversation queries
 * - conversations.lists() - All conversation list queries
 * - conversations.list(salonId, filters) - Specific conversation list
 * - conversations.details() - All conversation detail queries
 * - conversations.detail(id) - Specific conversation detail
 */
export const conversationKeys = {
  /** Base key for all conversation queries */
  all: ['conversations'] as const,

  /** All conversation list queries */
  lists: () => [...conversationKeys.all, 'list'] as const,

  /** Specific conversation list with filters */
  list: (salonId: string, filters: GetConversationsParams = {}) =>
    [...conversationKeys.lists(), salonId, filters] as const,

  /** All conversation detail queries */
  details: () => [...conversationKeys.all, 'detail'] as const,

  /** Specific conversation detail */
  detail: (id: string) => [...conversationKeys.details(), id] as const,

  /** Active conversations */
  active: (salonId: string) => [...conversationKeys.all, 'active', salonId] as const,
} as const;

/**
 * Query keys for templates
 *
 * Hierarchy:
 * - templates.all - All template queries
 * - templates.lists() - All template list queries
 * - templates.list(salonId, filters) - Specific template list
 * - templates.details() - All template detail queries
 * - templates.detail(id) - Specific template detail
 */
export const templateKeys = {
  /** Base key for all template queries */
  all: ['templates'] as const,

  /** All template list queries */
  lists: () => [...templateKeys.all, 'list'] as const,

  /** Specific template list with filters */
  list: (salonId: string, filters: GetTemplatesParams = {}) =>
    [...templateKeys.lists(), salonId, filters] as const,

  /** All template detail queries */
  details: () => [...templateKeys.all, 'detail'] as const,

  /** Specific template detail */
  detail: (id: string) => [...templateKeys.details(), id] as const,

  /** Approved templates only */
  approved: (salonId: string) => [...templateKeys.all, 'approved', salonId] as const,
} as const;

/**
 * Query keys for customers
 *
 * Hierarchy:
 * - customers.all - All customer queries
 * - customers.lists() - All customer list queries
 * - customers.list(salonId, filters) - Specific customer list
 * - customers.details() - All customer detail queries
 * - customers.detail(phoneNumber) - Specific customer detail
 */
export const customerKeys = {
  /** Base key for all customer queries */
  all: ['customers'] as const,

  /** All customer list queries */
  lists: () => [...customerKeys.all, 'list'] as const,

  /** Specific customer list with filters */
  list: (salonId: string, filters: GetCustomersParams = {}) =>
    [...customerKeys.lists(), salonId, filters] as const,

  /** All customer detail queries */
  details: () => [...customerKeys.all, 'detail'] as const,

  /** Specific customer detail by phone number */
  detail: (salonId: string, phoneNumber: string) =>
    [...customerKeys.details(), salonId, phoneNumber] as const,

  /** Customer profile */
  profile: (salonId: string, phoneNumber: string) =>
    [...customerKeys.detail(salonId, phoneNumber), 'profile'] as const,
} as const;

/**
 * Query keys for analytics
 *
 * Hierarchy:
 * - analytics.all - All analytics queries
 * - analytics.dashboard(salonId) - Dashboard statistics
 * - analytics.bookings(salonId, params) - Booking analytics
 * - analytics.messages(salonId, params) - Message analytics
 * - analytics.revenue(salonId, params) - Revenue analytics
 */
export const analyticsKeys = {
  /** Base key for all analytics queries */
  all: ['analytics'] as const,

  /** Dashboard statistics */
  dashboard: (salonId: string, params: GetDashboardStatsParams = {}) =>
    [...analyticsKeys.all, 'dashboard', salonId, params] as const,

  /** Booking analytics */
  bookings: (salonId: string, params: GetAnalyticsParams = {}) =>
    [...analyticsKeys.all, 'bookings', salonId, params] as const,

  /** Message analytics */
  messages: (salonId: string, params: GetAnalyticsParams = {}) =>
    [...analyticsKeys.all, 'messages', salonId, params] as const,

  /** Revenue analytics */
  revenue: (salonId: string, params: GetAnalyticsParams = {}) =>
    [...analyticsKeys.all, 'revenue', salonId, params] as const,

  /** Peak hours analytics */
  peakHours: (salonId: string) => [...analyticsKeys.all, 'peakHours', salonId] as const,

  /** Top services analytics */
  topServices: (salonId: string) => [...analyticsKeys.all, 'topServices', salonId] as const,
} as const;

/**
 * Query keys for services
 *
 * Hierarchy:
 * - services.all - All service queries
 * - services.lists() - All service list queries
 * - services.list(filters) - Specific service list with filters
 * - services.details() - All service detail queries
 * - services.detail(id) - Specific service detail
 * - services.stats(id) - Service statistics
 * - services.categories() - Category statistics
 */
export const serviceKeys = {
  /** Base key for all service queries */
  all: ['services'] as const,

  /** All service list queries */
  lists: () => [...serviceKeys.all, 'list'] as const,

  /** Specific service list with filters */
  list: (filters: GetServicesParams = {}) => [...serviceKeys.lists(), filters] as const,

  /** All service detail queries */
  details: () => [...serviceKeys.all, 'detail'] as const,

  /** Specific service detail */
  detail: (id: string) => [...serviceKeys.details(), id] as const,

  /** Service statistics */
  stats: (id: string) => [...serviceKeys.detail(id), 'stats'] as const,

  /** Category statistics */
  categories: (salonId?: string) => [...serviceKeys.all, 'categories', salonId || 'default'] as const,
} as const;

/**
 * Query keys for staff/masters
 *
 * Hierarchy:
 * - staff.all - All staff queries
 * - staff.lists() - All staff list queries
 * - staff.list(salonId, filters) - Specific staff list
 * - staff.details() - All staff detail queries
 * - staff.detail(id) - Specific staff detail
 */
export const staffKeys = {
  /** Base key for all staff queries */
  all: ['staff'] as const,

  /** All staff list queries */
  lists: () => [...staffKeys.all, 'list'] as const,

  /** Specific staff list with filters */
  list: (salonId: string, filters: GetStaffParams = {}) =>
    [...staffKeys.lists(), salonId, filters] as const,

  /** All staff detail queries */
  details: () => [...staffKeys.all, 'detail'] as const,

  /** Specific staff detail */
  detail: (id: string) => [...staffKeys.details(), id] as const,

  /** Staff/Master availability */
  availability: (masterId: string, params: any) =>
    [...staffKeys.all, 'availability', masterId, params] as const,

  /** Staff/Master schedule */
  schedule: (masterId: string, params: any) =>
    [...staffKeys.all, 'schedule', masterId, params] as const,
} as const;

/**
 * Alias for masters (same as staff)
 */
export const masterKeys = staffKeys;

/**
 * Query keys for user profile
 *
 * Hierarchy:
 * - user.all - All user queries
 * - user.profile() - Current user profile
 * - user.settings() - User settings
 */
export const userKeys = {
  /** Base key for all user queries */
  all: ['user'] as const,

  /** Current user profile */
  profile: () => [...userKeys.all, 'profile'] as const,

  /** User settings */
  settings: () => [...userKeys.all, 'settings'] as const,

  /** User notifications */
  notifications: () => [...userKeys.all, 'notifications'] as const,
} as const;

/**
 * Combined query keys object
 * Export as a single object for convenience
 *
 * @example
 * ```ts
 * import { queryKeys } from '@/lib/query/queryKeys';
 *
 * useQuery({
 *   queryKey: queryKeys.bookings.list(salonId, { status: 'CONFIRMED' }),
 *   queryFn: () => api.bookings.getAll(salonId, { status: 'CONFIRMED' })
 * })
 * ```
 */
export const queryKeys = {
  auth: authKeys,
  user: userKeys,
  salons: salonKeys,
  bookings: bookingKeys,
  messages: messageKeys,
  conversations: conversationKeys,
  templates: templateKeys,
  customers: customerKeys,
  analytics: analyticsKeys,
  services: serviceKeys,
  staff: staffKeys,
  masters: masterKeys,
} as const;

/**
 * Type-safe query key helper
 * Ensures query keys match the expected structure
 */
export type QueryKeys = typeof queryKeys;

/**
 * Extract query key type from a query key function
 * Useful for typing custom hooks
 *
 * @example
 * ```ts
 * type BookingListKey = ReturnType<typeof queryKeys.bookings.list>;
 * ```
 */
export type ExtractQueryKey<T extends (...args: any[]) => readonly unknown[]> = ReturnType<T>;

/**
 * Utility function to create a query key with strict typing
 * Prevents accidental query key mutations
 *
 * @param key - The query key array
 * @returns Readonly query key
 */
export function createQueryKey<T extends readonly unknown[]>(key: T): Readonly<T> {
  return Object.freeze(key);
}
