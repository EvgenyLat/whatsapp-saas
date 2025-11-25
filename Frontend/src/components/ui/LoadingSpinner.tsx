/**
 * LoadingSpinner Component
 * Animated loading indicator
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const spinnerVariants = cva('animate-spin rounded-full border-2 border-current', {
  variants: {
    size: {
      sm: 'h-4 w-4 border-2',
      md: 'h-8 w-8 border-2',
      lg: 'h-12 w-12 border-3',
      xl: 'h-16 w-16 border-4',
    },
    variant: {
      primary: 'text-primary-500 border-t-transparent',
      secondary: 'text-secondary-500 border-t-transparent',
      white: 'text-white border-t-transparent',
      neutral: 'text-neutral-500 border-t-transparent',
    },
  },
  defaultVariants: {
    size: 'md',
    variant: 'primary',
  },
});

export interface LoadingSpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {
  label?: string;
}

/**
 * LoadingSpinner component
 *
 * @example
 * ```tsx
 * <LoadingSpinner size="lg" />
 * <LoadingSpinner variant="white" label="Loading..." />
 * ```
 */
const LoadingSpinner = React.forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ className, size, variant, label, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="status"
        className={cn('flex items-center justify-center', className)}
        {...props}
      >
        <div className={cn(spinnerVariants({ size, variant }))} aria-hidden="true" />
        {label && <span className="ml-3 text-sm text-neutral-600">{label}</span>}
        <span className="sr-only">{label || 'Loading...'}</span>
      </div>
    );
  }
);

LoadingSpinner.displayName = 'LoadingSpinner';

export { LoadingSpinner, spinnerVariants };
