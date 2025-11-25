/**
 * TypeScript Contracts: Shared Component Props
 *
 * This file defines the prop interfaces for shared/reusable components
 * used across Staff and Services pages.
 *
 * Convention: All components are fully typed with strict prop interfaces.
 */

import type { ReactNode } from 'react';
import type { Specialization, ServiceCategory } from '@/types/models';

// ============================================================================
// PAGE LAYOUT COMPONENTS
// ============================================================================

/**
 * PageHeader Component
 *
 * Reusable page header with title and optional action button.
 *
 * Usage:
 * ```tsx
 * <PageHeader
 *   title="Staff Members"
 *   description="Manage your salon team"
 *   action={<Button href="/staff/new">Add Staff</Button>}
 * />
 * ```
 */
export interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode; // Usually a Button component
  breadcrumbs?: Breadcrumb[];
}

/**
 * Breadcrumbs Component
 *
 * Navigation breadcrumbs for hierarchical pages.
 *
 * Usage:
 * ```tsx
 * <Breadcrumbs
 *   items={[
 *     { label: 'Dashboard', href: '/dashboard' },
 *     { label: 'Staff', href: '/dashboard/staff' },
 *     { label: 'John Doe' }, // Current page (no href)
 *   ]}
 * />
 * ```
 */
export interface BreadcrumbsProps {
  items: Breadcrumb[];
}

export interface Breadcrumb {
  label: string;
  href?: string; // Omit for current page
  icon?: ReactNode;
}

// ============================================================================
// SEARCH & FILTER COMPONENTS
// ============================================================================

/**
 * SearchBar Component
 *
 * Debounced search input with icon and clear button.
 *
 * Usage:
 * ```tsx
 * <SearchBar
 *   value={search}
 *   onChange={setSearch}
 *   placeholder="Search staff members..."
 *   debounceMs={300}
 * />
 * ```
 */
export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number; // Default: 300ms
  className?: string;
  onClear?: () => void; // Optional custom clear handler
}

/**
 * FilterBar Component
 *
 * Container for multiple filter controls with active filter badges.
 *
 * Usage:
 * ```tsx
 * <FilterBar
 *   activeFilters={activeFilterCount}
 *   onClearAll={handleClearFilters}
 * >
 *   <Select ... />
 *   <Select ... />
 * </FilterBar>
 * ```
 */
export interface FilterBarProps {
  children: ReactNode; // Filter controls (Select, Input, etc.)
  activeFilters?: number; // Count of active filters
  onClearAll?: () => void; // Clear all filters handler
  className?: string;
}

/**
 * SpecializationFilter Component
 *
 * Dropdown select for filtering by staff specialization.
 *
 * Usage:
 * ```tsx
 * <SpecializationFilter
 *   value={specializationFilter}
 *   onChange={setSpecializationFilter}
 * />
 * ```
 */
export interface SpecializationFilterProps {
  value: Specialization | '';
  onChange: (value: Specialization | '') => void;
  placeholder?: string;
  className?: string;
}

/**
 * CategoryFilter Component
 *
 * Dropdown select for filtering by service category.
 *
 * Usage:
 * ```tsx
 * <CategoryFilter
 *   value={categoryFilter}
 *   onChange={setCategoryFilter}
 * />
 * ```
 */
export interface CategoryFilterProps {
  value: ServiceCategory | '';
  onChange: (value: ServiceCategory | '') => void;
  placeholder?: string;
  className?: string;
}

/**
 * StatusFilter Component
 *
 * Dropdown select for filtering by active/inactive status.
 *
 * Usage:
 * ```tsx
 * <StatusFilter
 *   value={statusFilter}
 *   onChange={setStatusFilter}
 * />
 * ```
 */
export interface StatusFilterProps {
  value: 'active' | 'inactive' | '';
  onChange: (value: 'active' | 'inactive' | '') => void;
  className?: string;
}

// ============================================================================
// PAGINATION COMPONENTS
// ============================================================================

/**
 * Pagination Component
 *
 * Simple Previous/Next pagination with item count display.
 *
 * Usage:
 * ```tsx
 * <Pagination
 *   currentPage={page}
 *   totalPages={totalPages}
 *   totalItems={total}
 *   itemsPerPage={limit}
 *   onPageChange={setPage}
 * />
 * ```
 */
export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  className?: string;
  showItemCount?: boolean; // Show "Showing X to Y of Z" text (default: true)
}

/**
 * PerPageSelector Component
 *
 * Dropdown to change number of items per page.
 *
 * Usage:
 * ```tsx
 * <PerPageSelector
 *   value={limit}
 *   onChange={setLimit}
 *   options={[10, 20, 50, 100]}
 * />
 * ```
 */
export interface PerPageSelectorProps {
  value: number;
  onChange: (value: number) => void;
  options?: number[]; // Default: [10, 20, 50, 100]
  className?: string;
}

// ============================================================================
// FEEDBACK & STATE COMPONENTS
// ============================================================================

/**
 * EmptyState Component (Already Exists)
 *
 * Displays when no data is available.
 *
 * Usage:
 * ```tsx
 * <EmptyState
 *   icon={<UsersIcon />}
 *   title="No staff members yet"
 *   description="Add your first staff member to get started"
 *   action={<Button href="/staff/new">Add Staff</Button>}
 * />
 * ```
 */
export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * ErrorState Component
 *
 * Displays error message with retry button.
 *
 * Usage:
 * ```tsx
 * <ErrorState
 *   error={error}
 *   onRetry={refetch}
 * />
 * ```
 */
export interface ErrorStateProps {
  error: Error | string;
  onRetry?: () => void;
  className?: string;
}

/**
 * LoadingState Component
 *
 * Full-page loading spinner with label.
 *
 * Usage:
 * ```tsx
 * <LoadingState label="Loading staff members..." />
 * ```
 */
export interface LoadingStateProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

/**
 * SkeletonGrid Component
 *
 * Skeleton loading state for card grids.
 *
 * Usage:
 * ```tsx
 * <SkeletonGrid count={20} columns={3} />
 * ```
 */
export interface SkeletonGridProps {
  count: number; // Number of skeleton cards
  columns?: 1 | 2 | 3 | 4; // Responsive columns (default: 3)
  className?: string;
}

// ============================================================================
// MODAL & DIALOG COMPONENTS
// ============================================================================

/**
 * ConfirmDialog Component
 *
 * Confirmation modal for destructive actions (better UX than window.confirm).
 *
 * Usage:
 * ```tsx
 * <ConfirmDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   title="Delete Staff Member"
 *   description="Are you sure? This action cannot be undone."
 *   confirmText="Delete"
 *   cancelText="Cancel"
 *   variant="danger"
 *   onConfirm={handleDelete}
 * />
 * ```
 */
export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmText?: string; // Default: "Confirm"
  cancelText?: string; // Default: "Cancel"
  variant?: 'default' | 'danger'; // Default: 'default'
  onConfirm: () => void | Promise<void>;
  isLoading?: boolean; // Show loading state during async confirm
}

/**
 * DeleteConfirmDialog Component
 *
 * Pre-configured ConfirmDialog for delete actions.
 *
 * Usage:
 * ```tsx
 * <DeleteConfirmDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   itemName="John Doe"
 *   itemType="staff member"
 *   onConfirm={handleDelete}
 * />
 * ```
 */
export interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string; // Name of item being deleted
  itemType: 'staff member' | 'service';
  onConfirm: () => void | Promise<void>;
  isLoading?: boolean;
}

// ============================================================================
// DATA DISPLAY COMPONENTS
// ============================================================================

/**
 * StatsCard Component
 *
 * Display statistic with label, value, and optional trend.
 *
 * Usage:
 * ```tsx
 * <StatsCard
 *   label="Total Bookings"
 *   value={125}
 *   trend={{ value: 12, direction: 'up' }}
 *   icon={<CalendarIcon />}
 * />
 * ```
 */
export interface StatsCardProps {
  label: string;
  value: string | number;
  trend?: {
    value: number; // Percentage
    direction: 'up' | 'down' | 'neutral';
  };
  icon?: ReactNode;
  className?: string;
}

/**
 * DetailRow Component
 *
 * Key-value pair display for detail pages.
 *
 * Usage:
 * ```tsx
 * <DetailRow label="Email" value="john@example.com" icon={<MailIcon />} />
 * ```
 */
export interface DetailRowProps {
  label: string;
  value: string | ReactNode;
  icon?: ReactNode;
  className?: string;
}

/**
 * WorkingHoursDisplay Component
 *
 * Display weekly working hours in table or list format.
 *
 * Usage:
 * ```tsx
 * <WorkingHoursDisplay hours={staff.working_hours} format="table" />
 * ```
 */
export interface WorkingHoursDisplayProps {
  hours: Record<string, { start: string; end: string } | null>;
  format?: 'table' | 'list'; // Default: 'table'
  className?: string;
}

// ============================================================================
// UTILITY COMPONENTS
// ============================================================================

/**
 * CopyButton Component
 *
 * Button to copy text to clipboard with feedback.
 *
 * Usage:
 * ```tsx
 * <CopyButton text="+79991234567" label="Copy phone" />
 * ```
 */
export interface CopyButtonProps {
  text: string;
  label?: string;
  successMessage?: string; // Default: "Copied!"
  className?: string;
}

/**
 * ActionMenu Component
 *
 * Dropdown menu with actions (Edit, Delete, etc.).
 *
 * Usage:
 * ```tsx
 * <ActionMenu
 *   actions={[
 *     { label: 'Edit', onClick: handleEdit, icon: <EditIcon /> },
 *     { label: 'Delete', onClick: handleDelete, icon: <TrashIcon />, variant: 'danger' },
 *   ]}
 * />
 * ```
 */
export interface ActionMenuProps {
  actions: Action[];
  trigger?: ReactNode; // Custom trigger button (default: three dots icon)
  className?: string;
}

export interface Action {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  variant?: 'default' | 'danger';
  disabled?: boolean;
}

/**
 * BackButton Component
 *
 * Navigation button to go back to previous page.
 *
 * Usage:
 * ```tsx
 * <BackButton href="/dashboard/staff" label="Back to Staff" />
 * ```
 */
export interface BackButtonProps {
  href?: string; // If provided, uses Link. Otherwise uses router.back()
  label?: string; // Default: "Back"
  className?: string;
}

// ============================================================================
// SORT COMPONENTS
// ============================================================================

/**
 * SortSelect Component
 *
 * Dropdown for selecting sort field and order.
 *
 * Usage:
 * ```tsx
 * <SortSelect
 *   value={sortBy}
 *   onChange={setSortBy}
 *   options={[
 *     { value: 'name', label: 'Name' },
 *     { value: 'created_at', label: 'Date Created' },
 *   ]}
 *   order={sortOrder}
 *   onOrderChange={setSortOrder}
 * />
 * ```
 */
export interface SortSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SortOption[];
  order: 'asc' | 'desc';
  onOrderChange: (order: 'asc' | 'desc') => void;
  className?: string;
}

export interface SortOption {
  value: string;
  label: string;
}

// ============================================================================
// EXPORTS
// ============================================================================

// Export all interfaces for use in components
export type {
  // Layout
  PageHeaderProps,
  BreadcrumbsProps,
  Breadcrumb,

  // Search & Filter
  SearchBarProps,
  FilterBarProps,
  SpecializationFilterProps,
  CategoryFilterProps,
  StatusFilterProps,

  // Pagination
  PaginationProps,
  PerPageSelectorProps,

  // Feedback & State
  EmptyStateProps,
  ErrorStateProps,
  LoadingStateProps,
  SkeletonGridProps,

  // Modals & Dialogs
  ConfirmDialogProps,
  DeleteConfirmDialogProps,

  // Data Display
  StatsCardProps,
  DetailRowProps,
  WorkingHoursDisplayProps,

  // Utility
  CopyButtonProps,
  ActionMenuProps,
  Action,
  BackButtonProps,

  // Sort
  SortSelectProps,
  SortOption,
};
