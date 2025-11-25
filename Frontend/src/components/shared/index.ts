/**
 * Shared Components Barrel Export
 *
 * Centralized exports for all shared/reusable components.
 * Import from this file for cleaner imports.
 *
 * @example
 * ```tsx
 * import { PageHeader, SearchBar, Pagination } from '@/components/shared';
 * ```
 */

export { PageHeader } from './PageHeader';
export type { PageHeaderProps } from './PageHeader';

export { SearchBar } from './SearchBar';
export type { SearchBarProps } from './SearchBar';

export { FilterBar } from './FilterBar';
export type { FilterBarProps } from './FilterBar';

export { Pagination } from './Pagination';
export type { PaginationProps } from './Pagination';

export { ErrorState } from './ErrorState';
export type { ErrorStateProps } from './ErrorState';

export { LoadingState } from './LoadingState';
export type { LoadingStateProps } from './LoadingState';
