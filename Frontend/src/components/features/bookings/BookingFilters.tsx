/**
 * BookingFilters Component
 * WhatsApp SaaS Platform
 *
 * Provides filtering controls for the bookings list:
 * - Status filter tabs (All, Pending, Confirmed, Completed, Cancelled)
 * - Date range picker (start and end date)
 * - Search input for customer name or phone
 * - Reset button to clear all filters
 */

'use client';

import React, { memo, useState, useCallback } from 'react';
import { Search, X, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import type { BookingStatus } from '@/types';

export interface BookingFiltersProps {
  onFilterChange?: (filters: BookingFilterState) => void;
  onSearch?: (query: string) => void;
  onReset?: () => void;
  initialFilters?: Partial<BookingFilterState>;
  className?: string;
}

export interface BookingFilterState {
  status: BookingStatus | 'all';
  startDate: string | null;
  endDate: string | null;
  searchQuery: string;
}

const STATUS_FILTERS = [
  { value: 'all' as const, label: 'All', variant: 'default' as const },
  { value: 'CONFIRMED' as BookingStatus, label: 'Confirmed', variant: 'confirmed' as const },
  { value: 'COMPLETED' as BookingStatus, label: 'Completed', variant: 'completed' as const },
  { value: 'CANCELLED' as BookingStatus, label: 'Cancelled', variant: 'cancelled' as const },
  { value: 'NO_SHOW' as BookingStatus, label: 'No Show', variant: 'warning' as const },
] as const;

/**
 * BookingFilters Component
 * WhatsApp SaaS Platform
 *
 * Provides comprehensive filtering controls for the bookings list including
 * status filters, date range selection, and text search.
 *
 * @example
 * ```tsx
 * const [filters, setFilters] = useState<BookingFilterState>({
 *   status: 'all',
 *   startDate: null,
 *   endDate: null,
 *   searchQuery: '',
 * });
 *
 * <BookingFilters
 *   onFilterChange={(newFilters) => {
 *     setFilters(newFilters);
 *     fetchBookings(newFilters);
 *   }}
 *   onSearch={(query) => {
 *     console.log('Searching for:', query);
 *   }}
 *   onReset={() => {
 *     fetchAllBookings();
 *   }}
 *   initialFilters={filters}
 * />
 * ```
 *
 * @param {BookingFiltersProps} props - Component props
 * @returns {JSX.Element} Rendered component
 */
export const BookingFilters = memo<BookingFiltersProps>(
  ({ onFilterChange, onSearch, onReset, initialFilters, className }) => {
    const [filters, setFilters] = useState<BookingFilterState>({
      status: initialFilters?.status ?? 'all',
      startDate: initialFilters?.startDate ?? null,
      endDate: initialFilters?.endDate ?? null,
      searchQuery: initialFilters?.searchQuery ?? '',
    });

    const handleStatusChange = useCallback(
      (status: BookingStatus | 'all') => {
        const newFilters = { ...filters, status };
        setFilters(newFilters);
        onFilterChange?.(newFilters);
      },
      [filters, onFilterChange],
    );

    const handleDateChange = useCallback(
      (field: 'startDate' | 'endDate', value: string) => {
        const newFilters = { ...filters, [field]: value || null };
        setFilters(newFilters);
        onFilterChange?.(newFilters);
      },
      [filters, onFilterChange],
    );

    const handleSearchChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setFilters((prev) => ({ ...prev, searchQuery: query }));
        onSearch?.(query);
      },
      [onSearch],
    );

    const handleReset = useCallback(() => {
      const resetFilters: BookingFilterState = {
        status: 'all',
        startDate: null,
        endDate: null,
        searchQuery: '',
      };
      setFilters(resetFilters);
      onFilterChange?.(resetFilters);
      onReset?.();
    }, [onFilterChange, onReset]);

    const hasActiveFilters =
      filters.status !== 'all' ||
      filters.startDate !== null ||
      filters.endDate !== null ||
      filters.searchQuery.trim() !== '';

    return (
      <div className={cn('space-y-4', className)}>
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          <span className="flex items-center text-sm font-medium text-neutral-700 mr-2">
            Status:
          </span>
          {STATUS_FILTERS.map((statusFilter) => (
            <button
              key={statusFilter.value}
              onClick={() => handleStatusChange(statusFilter.value)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
                filters.status === statusFilter.value
                  ? 'bg-primary-500 text-white shadow-md'
                  : 'bg-white text-neutral-700 border border-neutral-300 hover:bg-neutral-50',
              )}
              aria-pressed={filters.status === statusFilter.value}
            >
              {statusFilter.label}
            </button>
          ))}
        </div>

        {/* Search and Date Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1">
            <Input
              type="text"
              placeholder="Search by name or phone..."
              value={filters.searchQuery}
              onChange={handleSearchChange}
              leftIcon={<Search size={16} />}
              rightIcon={
                filters.searchQuery && (
                  <button
                    onClick={() => {
                      setFilters((prev) => ({ ...prev, searchQuery: '' }));
                      onSearch?.('');
                    }}
                    className="text-neutral-400 hover:text-neutral-600 transition-colors"
                    aria-label="Clear search"
                  >
                    <X size={16} />
                  </button>
                )
              }
            />
          </div>

          <div className="md:col-span-1">
            <Input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => handleDateChange('startDate', e.target.value)}
              leftIcon={<Calendar size={16} />}
              placeholder="Start date"
            />
          </div>

          <div className="md:col-span-1">
            <Input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => handleDateChange('endDate', e.target.value)}
              leftIcon={<Calendar size={16} />}
              placeholder="End date"
            />
          </div>
        </div>

        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between gap-4 p-3 bg-primary-50 rounded-lg border border-primary-200">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-primary-700">Active filters:</span>
              {filters.status !== 'all' && (
                <Badge variant={STATUS_FILTERS.find((s) => s.value === filters.status)?.variant}>
                  {STATUS_FILTERS.find((s) => s.value === filters.status)?.label}
                </Badge>
              )}
              {filters.startDate && (
                <Badge variant="info">
                  From: {format(new Date(filters.startDate), 'MMM dd, yyyy')}
                </Badge>
              )}
              {filters.endDate && (
                <Badge variant="info">
                  To: {format(new Date(filters.endDate), 'MMM dd, yyyy')}
                </Badge>
              )}
              {filters.searchQuery && (
                <Badge variant="primary">Search: "{filters.searchQuery}"</Badge>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={handleReset} leftIcon={<X size={14} />}>
              Reset
            </Button>
          </div>
        )}
      </div>
    );
  },
);

BookingFilters.displayName = 'BookingFilters';
