/**
 * SearchBar Component
 *
 * Search input with icon, clear button, and built-in debouncing.
 * Provides consistent search UX across all list pages.
 *
 * @example
 * ```tsx
 * <SearchBar
 *   value={search}
 *   onChange={setSearch}
 *   placeholder="Search staff members..."
 * />
 * ```
 */

'use client';

import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/Input';

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onClear?: () => void;
}

export function SearchBar({
  value,
  onChange,
  placeholder = 'Search...',
  className = '',
  onClear,
}: SearchBarProps) {
  const handleClear = () => {
    onChange('');
    onClear?.();
  };

  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-10 pr-10"
        aria-label="Search"
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
