/**
 * TypeScript Contracts: Page Component Props
 *
 * This file defines the prop interfaces for all page components in the
 * Staff and Services management feature.
 *
 * Convention: Page components typically don't receive props (they're route handlers),
 * but we document their internal state structure and hook dependencies here.
 */

import type { Master, Service, Booking, Specialization, ServiceCategory } from '@/types/models';
import type { GetMastersParams, GetServicesParams } from '@/types/api';

// ============================================================================
// STAFF PAGES
// ============================================================================

/**
 * Staff List Page (`/dashboard/staff/page.tsx`)
 *
 * Displays paginated list of staff members with search and filter capabilities.
 *
 * State Management:
 * - Pagination: page, limit
 * - Filters: search, specializationFilter, statusFilter
 * - UI: isLoading, error
 *
 * Dependencies:
 * - useMasters(salonId, params) - Fetch staff list
 * - useDeleteMaster(salonId) - Delete staff mutation
 * - useRouter() - Navigation
 */
export interface StaffListPageState {
  // Pagination
  page: number;
  limit: number; // Default: 20

  // Filters
  search: string;
  specializationFilter: Specialization | '';
  statusFilter: 'active' | 'inactive' | '';

  // UI State (from React Query)
  isLoading: boolean;
  error: Error | null;
}

/**
 * Create Staff Page (`/dashboard/staff/new/page.tsx`)
 *
 * Form page for creating new staff members.
 *
 * Dependencies:
 * - useCreateMaster(salonId) - Create staff mutation
 * - useRouter() - Navigation after success
 * - StaffForm component - Reusable form
 */
export interface CreateStaffPageProps {
  // No props - page component
}

/**
 * Staff Details Page (`/dashboard/staff/[id]/page.tsx`)
 *
 * Displays detailed information about a staff member including schedule,
 * upcoming bookings, and performance statistics.
 *
 * Route Params:
 * - id: number (from URL)
 *
 * Dependencies:
 * - useMasterById(id) - Fetch staff details
 * - useMasterSchedule(id, dateRange) - Fetch weekly schedule
 * - useMasterStats(id) - Fetch performance statistics
 * - useBookings(salonId, { master_id: id, limit: 5 }) - Upcoming bookings
 * - useDeleteMaster(salonId) - Delete mutation
 */
export interface StaffDetailsPageParams {
  id: string; // From URL params (will be converted to number)
}

export interface StaffDetailsPageState {
  staffId: number;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Edit Staff Page (`/dashboard/staff/[id]/edit/page.tsx`)
 *
 * Form page for editing existing staff members.
 *
 * Route Params:
 * - id: number (from URL)
 *
 * Dependencies:
 * - useMasterById(id) - Fetch current data for form
 * - useUpdateMaster(id) - Update staff mutation
 * - useRouter() - Navigation after success
 * - StaffForm component - Reusable form with defaultValues
 */
export interface EditStaffPageParams {
  id: string; // From URL params
}

// ============================================================================
// SERVICE PAGES
// ============================================================================

/**
 * Services List Page (`/dashboard/services/page.tsx`)
 *
 * Displays paginated list of services with search, filter, and sort capabilities.
 *
 * State Management:
 * - Pagination: page, limit
 * - Filters: search, categoryFilter, statusFilter
 * - Sorting: sortBy, sortOrder
 * - UI: isLoading, error
 *
 * Dependencies:
 * - useServices(params) - Fetch services list
 * - useDeleteService(salonId) - Delete service mutation
 * - useRouter() - Navigation
 */
export interface ServicesListPageState {
  // Pagination
  page: number;
  limit: number; // Default: 24

  // Filters
  search: string;
  categoryFilter: ServiceCategory | '';
  statusFilter: 'active' | 'inactive' | '';

  // Sorting
  sortBy: 'name' | 'price' | 'duration' | 'category';
  sortOrder: 'asc' | 'desc';

  // UI State
  isLoading: boolean;
  error: Error | null;
}

/**
 * Create Service Page (`/dashboard/services/new/page.tsx`)
 *
 * Form page for creating new services.
 *
 * Dependencies:
 * - useCreateService(salonId) - Create service mutation
 * - useRouter() - Navigation after success
 * - ServiceForm component - Reusable form
 */
export interface CreateServicePageProps {
  // No props - page component
}

/**
 * Service Details Page (`/dashboard/services/[id]/page.tsx`)
 *
 * Displays detailed information about a service including booking statistics,
 * revenue data, and recent bookings.
 *
 * Route Params:
 * - id: number (from URL)
 *
 * Dependencies:
 * - useServiceById(id) - Fetch service details
 * - useServiceStats(id) - Fetch booking/revenue statistics
 * - useBookings(salonId, { service_id: id, limit: 10 }) - Recent bookings
 * - useDeleteService(salonId) - Delete mutation
 */
export interface ServiceDetailsPageParams {
  id: string; // From URL params
}

export interface ServiceDetailsPageState {
  serviceId: number;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Edit Service Page (`/dashboard/services/[id]/edit/page.tsx`)
 *
 * Form page for editing existing services.
 *
 * Route Params:
 * - id: number (from URL)
 *
 * Dependencies:
 * - useServiceById(id) - Fetch current data
 * - useUpdateService(id) - Update service mutation
 * - useRouter() - Navigation after success
 * - ServiceForm component - Reusable form with defaultValues
 */
export interface EditServicePageParams {
  id: string; // From URL params
}

// ============================================================================
// STATISTICS & ANALYTICS INTERFACES
// ============================================================================

/**
 * Staff Performance Statistics
 *
 * Used in Staff Details page to display performance metrics.
 */
export interface StaffStatistics {
  totalBookings: number;
  totalRevenue: number; // In cents
  averageRating: number | null; // 0-5 scale, null if no ratings
  utilizationRate: number; // Percentage (0-100)
  cancellationRate: number; // Percentage (0-100)
  popularServices: Array<{
    serviceId: number;
    serviceName: string;
    count: number;
  }>;
  peakHours: string[]; // ["14:00", "15:00", "16:00"]
}

/**
 * Service Performance Statistics
 *
 * Used in Service Details page to display booking/revenue analytics.
 */
export interface ServiceStatistics {
  totalBookings: number;
  totalRevenue: number; // In cents
  averageFrequency: number; // Bookings per day
  averagePrice: number; // In cents
  growthRate: number; // Percentage change from previous period
  popularTimeSlots: Array<{
    time: string; // "14:00"
    count: number;
  }>;
  mostRequestedBy: 'new_customers' | 'returning_customers' | 'equal';
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Pagination Info
 *
 * Calculated from API response to display pagination controls.
 */
export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  startIndex: number; // First item on current page (1-indexed)
  endIndex: number; // Last item on current page
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Filter State
 *
 * Common filter state pattern used across list pages.
 */
export interface FilterState {
  search: string;
  categoryOrSpecialization: string; // Generic filter
  status: 'active' | 'inactive' | '';
  activeFilterCount: number; // Computed count of active filters
}

/**
 * Sort State
 *
 * Sorting configuration for list pages.
 */
export interface SortState {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}
