/**
 * Badge Component
 * Status badges for bookings and other states
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'bg-neutral-100 text-neutral-800 border border-neutral-300',
        primary: 'bg-primary-100 text-primary-800 border border-primary-300',
        secondary: 'bg-secondary-100 text-secondary-800 border border-secondary-300',
        success: 'bg-success-100 text-success-800 border border-success-300',
        warning: 'bg-warning-100 text-warning-800 border border-warning-300',
        error: 'bg-error-100 text-error-800 border border-error-300',
        info: 'bg-info-100 text-info-800 border border-info-300',
        // Booking status variants
        pending: 'bg-warning-100 text-warning-800 border border-warning-300',
        confirmed: 'bg-success-100 text-success-800 border border-success-300',
        completed: 'bg-neutral-100 text-neutral-800 border border-neutral-300',
        cancelled: 'bg-error-100 text-error-800 border border-error-300',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

/**
 * Badge component
 *
 * @example
 * ```tsx
 * <Badge variant="success">Confirmed</Badge>
 * <Badge variant="pending">Pending</Badge>
 * <Badge variant="cancelled">Cancelled</Badge>
 * ```
 */
function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
