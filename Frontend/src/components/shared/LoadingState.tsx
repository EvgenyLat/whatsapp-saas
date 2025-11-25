/**
 * LoadingState Component
 *
 * Full-page loading spinner with optional label.
 * Provides consistent loading UX across all pages.
 *
 * @example
 * ```tsx
 * <LoadingState label="Loading staff members..." />
 * ```
 */

'use client';

import { Loader2 } from 'lucide-react';

export interface LoadingStateProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16',
};

export function LoadingState({
  label,
  size = 'lg',
  className = '',
}: LoadingStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
      <Loader2 className={`${sizeClasses[size]} animate-spin text-primary mb-4`} />
      {label && (
        <p className="text-sm text-gray-600">
          {label}
        </p>
      )}
    </div>
  );
}
