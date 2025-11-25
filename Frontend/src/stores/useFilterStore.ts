/**
 * Filter State Management Store (Zustand)
 * WhatsApp SaaS Platform
 *
 * Manages filter state for list views:
 * - Booking filters (status, date range, search)
 * - Message filters (direction, type, search)
 * - Salon filters (status, search)
 * - Customer filters (search, sort)
 *
 * Optionally persists to URL params for shareable filtered views
 *
 * @see https://docs.pmnd.rs/zustand/getting-started/introduction
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  BookingStatus,
  MessageDirection,
  MessageType,
  TemplateStatus,
} from '@/types';

/**
 * Booking filters
 */
export interface BookingFilters {
  /** Filter by booking status */
  status?: BookingStatus;
  /** Search by customer name or booking code */
  search?: string;
  /** Start date for date range filter */
  startDate?: string;
  /** End date for date range filter */
  endDate?: string;
  /** Customer phone number filter */
  customerPhone?: string;
  /** Page number */
  page?: number;
  /** Items per page */
  limit?: number;
  /** Sort field */
  sortBy?: string;
  /** Sort order */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Message filters
 */
export interface MessageFilters {
  /** Filter by conversation ID */
  conversationId?: string;
  /** Filter by phone number */
  phoneNumber?: string;
  /** Filter by message direction */
  direction?: MessageDirection;
  /** Filter by message type */
  messageType?: MessageType;
  /** Search in message content */
  search?: string;
  /** Start date for date range filter */
  startDate?: string;
  /** End date for date range filter */
  endDate?: string;
  /** Page number */
  page?: number;
  /** Items per page */
  limit?: number;
}

/**
 * Salon filters
 */
export interface SalonFilters {
  /** Filter by active status */
  isActive?: boolean;
  /** Search by salon name */
  search?: string;
  /** Page number */
  page?: number;
  /** Items per page */
  limit?: number;
}

/**
 * Template filters
 */
export interface TemplateFilters {
  /** Filter by template status */
  status?: TemplateStatus;
  /** Filter by language */
  language?: string;
  /** Filter by category */
  category?: string;
  /** Search by template name */
  search?: string;
  /** Page number */
  page?: number;
  /** Items per page */
  limit?: number;
}

/**
 * Customer filters
 */
export interface CustomerFilters {
  /** Search by name or phone */
  search?: string;
  /** Sort by field */
  sortBy?: 'name' | 'total_bookings' | 'last_seen' | 'first_seen';
  /** Sort order */
  sortOrder?: 'asc' | 'desc';
  /** Page number */
  page?: number;
  /** Items per page */
  limit?: number;
}

/**
 * Filter state interface
 */
export interface FilterState {
  /** Booking filters */
  bookingFilters: BookingFilters;

  /** Message filters */
  messageFilters: MessageFilters;

  /** Salon filters */
  salonFilters: SalonFilters;

  /** Template filters */
  templateFilters: TemplateFilters;

  /** Customer filters */
  customerFilters: CustomerFilters;
}

/**
 * Filter actions interface
 */
export interface FilterActions {
  // Booking filter actions
  /**
   * Set booking filters
   *
   * @param filters - Partial booking filters to update
   */
  setBookingFilters: (filters: Partial<BookingFilters>) => void;

  /**
   * Reset booking filters to default
   */
  resetBookingFilters: () => void;

  /**
   * Update single booking filter field
   *
   * @param key - Filter field key
   * @param value - New value
   */
  updateBookingFilter: <K extends keyof BookingFilters>(
    key: K,
    value: BookingFilters[K]
  ) => void;

  // Message filter actions
  /**
   * Set message filters
   *
   * @param filters - Partial message filters to update
   */
  setMessageFilters: (filters: Partial<MessageFilters>) => void;

  /**
   * Reset message filters to default
   */
  resetMessageFilters: () => void;

  /**
   * Update single message filter field
   *
   * @param key - Filter field key
   * @param value - New value
   */
  updateMessageFilter: <K extends keyof MessageFilters>(
    key: K,
    value: MessageFilters[K]
  ) => void;

  // Salon filter actions
  /**
   * Set salon filters
   *
   * @param filters - Partial salon filters to update
   */
  setSalonFilters: (filters: Partial<SalonFilters>) => void;

  /**
   * Reset salon filters to default
   */
  resetSalonFilters: () => void;

  /**
   * Update single salon filter field
   *
   * @param key - Filter field key
   * @param value - New value
   */
  updateSalonFilter: <K extends keyof SalonFilters>(key: K, value: SalonFilters[K]) => void;

  // Template filter actions
  /**
   * Set template filters
   *
   * @param filters - Partial template filters to update
   */
  setTemplateFilters: (filters: Partial<TemplateFilters>) => void;

  /**
   * Reset template filters to default
   */
  resetTemplateFilters: () => void;

  /**
   * Update single template filter field
   *
   * @param key - Filter field key
   * @param value - New value
   */
  updateTemplateFilter: <K extends keyof TemplateFilters>(
    key: K,
    value: TemplateFilters[K]
  ) => void;

  // Customer filter actions
  /**
   * Set customer filters
   *
   * @param filters - Partial customer filters to update
   */
  setCustomerFilters: (filters: Partial<CustomerFilters>) => void;

  /**
   * Reset customer filters to default
   */
  resetCustomerFilters: () => void;

  /**
   * Update single customer filter field
   *
   * @param key - Filter field key
   * @param value - New value
   */
  updateCustomerFilter: <K extends keyof CustomerFilters>(
    key: K,
    value: CustomerFilters[K]
  ) => void;

  // Global actions
  /**
   * Reset all filters to default
   */
  resetAllFilters: () => void;
}

/**
 * Combined filter store type
 */
export type FilterStore = FilterState & FilterActions;

/**
 * Default filter values
 */
const defaultBookingFilters: BookingFilters = {
  page: 1,
  limit: 10,
  sortBy: 'start_ts',
  sortOrder: 'desc',
};

const defaultMessageFilters: MessageFilters = {
  page: 1,
  limit: 20,
};

const defaultSalonFilters: SalonFilters = {
  page: 1,
  limit: 10,
};

const defaultTemplateFilters: TemplateFilters = {
  page: 1,
  limit: 10,
};

const defaultCustomerFilters: CustomerFilters = {
  page: 1,
  limit: 10,
  sortBy: 'last_seen',
  sortOrder: 'desc',
};

/**
 * Filter Zustand Store
 * Does not persist - filters are transient and can be derived from URL params
 */
export const useFilterStore = create<FilterStore>()(
  devtools(
    (set) => ({
      // Initial state
      bookingFilters: defaultBookingFilters,
      messageFilters: defaultMessageFilters,
      salonFilters: defaultSalonFilters,
      templateFilters: defaultTemplateFilters,
      customerFilters: defaultCustomerFilters,

      // Booking filter actions
      setBookingFilters: (filters) => {
        set(
          (state) => ({
            bookingFilters: { ...state.bookingFilters, ...filters },
          }),
          false,
          'filters/setBookingFilters'
        );
      },

      resetBookingFilters: () => {
        set({ bookingFilters: defaultBookingFilters }, false, 'filters/resetBookingFilters');
      },

      updateBookingFilter: (key, value) => {
        set(
          (state) => ({
            bookingFilters: { ...state.bookingFilters, [key]: value },
          }),
          false,
          'filters/updateBookingFilter'
        );
      },

      // Message filter actions
      setMessageFilters: (filters) => {
        set(
          (state) => ({
            messageFilters: { ...state.messageFilters, ...filters },
          }),
          false,
          'filters/setMessageFilters'
        );
      },

      resetMessageFilters: () => {
        set({ messageFilters: defaultMessageFilters }, false, 'filters/resetMessageFilters');
      },

      updateMessageFilter: (key, value) => {
        set(
          (state) => ({
            messageFilters: { ...state.messageFilters, [key]: value },
          }),
          false,
          'filters/updateMessageFilter'
        );
      },

      // Salon filter actions
      setSalonFilters: (filters) => {
        set(
          (state) => ({
            salonFilters: { ...state.salonFilters, ...filters },
          }),
          false,
          'filters/setSalonFilters'
        );
      },

      resetSalonFilters: () => {
        set({ salonFilters: defaultSalonFilters }, false, 'filters/resetSalonFilters');
      },

      updateSalonFilter: (key, value) => {
        set(
          (state) => ({
            salonFilters: { ...state.salonFilters, [key]: value },
          }),
          false,
          'filters/updateSalonFilter'
        );
      },

      // Template filter actions
      setTemplateFilters: (filters) => {
        set(
          (state) => ({
            templateFilters: { ...state.templateFilters, ...filters },
          }),
          false,
          'filters/setTemplateFilters'
        );
      },

      resetTemplateFilters: () => {
        set({ templateFilters: defaultTemplateFilters }, false, 'filters/resetTemplateFilters');
      },

      updateTemplateFilter: (key, value) => {
        set(
          (state) => ({
            templateFilters: { ...state.templateFilters, [key]: value },
          }),
          false,
          'filters/updateTemplateFilter'
        );
      },

      // Customer filter actions
      setCustomerFilters: (filters) => {
        set(
          (state) => ({
            customerFilters: { ...state.customerFilters, ...filters },
          }),
          false,
          'filters/setCustomerFilters'
        );
      },

      resetCustomerFilters: () => {
        set({ customerFilters: defaultCustomerFilters }, false, 'filters/resetCustomerFilters');
      },

      updateCustomerFilter: (key, value) => {
        set(
          (state) => ({
            customerFilters: { ...state.customerFilters, [key]: value },
          }),
          false,
          'filters/updateCustomerFilter'
        );
      },

      // Global actions
      resetAllFilters: () => {
        set(
          {
            bookingFilters: defaultBookingFilters,
            messageFilters: defaultMessageFilters,
            salonFilters: defaultSalonFilters,
            templateFilters: defaultTemplateFilters,
            customerFilters: defaultCustomerFilters,
          },
          false,
          'filters/resetAllFilters'
        );
      },
    }),
    {
      name: 'FilterStore',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);

/**
 * Selector hooks for common filter patterns
 */

/**
 * Get booking filters
 */
export const useBookingFilters = () => useFilterStore((state) => state.bookingFilters);

/**
 * Get message filters
 */
export const useMessageFilters = () => useFilterStore((state) => state.messageFilters);

/**
 * Get salon filters
 */
export const useSalonFilters = () => useFilterStore((state) => state.salonFilters);

/**
 * Get template filters
 */
export const useTemplateFilters = () => useFilterStore((state) => state.templateFilters);

/**
 * Get customer filters
 */
export const useCustomerFilters = () => useFilterStore((state) => state.customerFilters);
