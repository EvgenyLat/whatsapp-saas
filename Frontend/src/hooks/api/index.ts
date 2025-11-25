/**
 * React Query API Hooks
 * WhatsApp SaaS Platform
 *
 * Centralized exports for all API hooks
 */

// Booking hooks
export {
  useBookings,
  useBooking,
  useBookingStats,
  useCreateBooking,
  useUpdateBooking,
  useDeleteBooking,
  useBulkUpdateBookings,
} from './useBookings';

// Message hooks
export {
  useMessages,
  useMessage,
  useSendMessage,
  useSendTemplateMessage,
  useMarkAsRead,
} from './useMessages';

// Salon hooks
export {
  useSalons,
  useSalon,
  useCurrentSalon,
  useCreateSalon,
  useUpdateSalon,
  useDeleteSalon,
} from './useSalons';

// Analytics hooks
export {
  useDashboardStats,
  useBookingAnalytics,
  useMessageAnalytics,
  useRevenueAnalytics,
} from './useAnalytics';

// Template hooks
export {
  useTemplates,
  useTemplate,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
} from './useTemplates';

// Service hooks
export {
  useServices,
  useService,
  // useServiceCategories, // TODO: Implement getCategoryStats API endpoint
  useServiceStats,
  useCreateService,
  useUpdateService,
  useDeleteService,
  useToggleServiceStatus,
} from './useServices';

// Master hooks
export {
  useMasters,
  useMaster,
  useMasterAvailability,
  useMasterSchedule,
  useCreateMaster,
  useUpdateMaster,
  useDeleteMaster,
  useUpdateMasterStatus,
} from './useMasters';
