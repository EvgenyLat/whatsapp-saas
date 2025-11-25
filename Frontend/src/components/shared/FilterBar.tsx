/**
 * FilterBar Component
 *
 * Container for filter controls with active filter count badge and clear all button.
 * Provides consistent filter layout across list pages.
 *
 * @example
 * ```tsx
 * <FilterBar
 *   activeFilters={2}
 *   onClearAll={handleClearFilters}
 * >
 *   <Select ... />
 *   <Select ... />
 * </FilterBar>
 * ```
 */

'use client';

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { X } from 'lucide-react';

export interface FilterBarProps {
  children: ReactNode;
  activeFilters?: number;
  onClearAll?: () => void;
  className?: string;
}

export function FilterBar({
  children,
  activeFilters = 0,
  onClearAll,
  className = '',
}: FilterBarProps) {
  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      {children}
      {activeFilters > 0 && onClearAll && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="text-gray-600 hover:text-gray-900"
        >
          <X className="mr-1 h-4 w-4" />
          Clear {activeFilters} {activeFilters === 1 ? 'filter' : 'filters'}
        </Button>
      )}
    </div>
  );
}
