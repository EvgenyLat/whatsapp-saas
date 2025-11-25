/**
 * ErrorState Component
 *
 * Displays error message with optional retry button.
 * Provides consistent error handling UX across all pages.
 *
 * @example
 * ```tsx
 * <ErrorState
 *   error={error}
 *   onRetry={refetch}
 * />
 * ```
 */

'use client';

import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface ErrorStateProps {
  error: Error | string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ error, onRetry, className = '' }: ErrorStateProps) {
  const errorMessage = typeof error === 'string' ? error : error.message;

  return (
    <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 mb-4">
        <AlertCircle className="h-8 w-8 text-red-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Something went wrong
      </h3>
      <p className="text-sm text-gray-600 text-center max-w-md mb-6">
        {errorMessage || 'An unexpected error occurred. Please try again.'}
      </p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline">
          Try Again
        </Button>
      )}
    </div>
  );
}
