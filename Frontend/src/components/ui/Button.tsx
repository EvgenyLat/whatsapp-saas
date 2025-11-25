/**
 * Button Component
 * WhatsApp SaaS Platform
 *
 * A versatile button component with multiple variants, sizes, and states.
 * Built with CVA for variant management and performance optimizations.
 *
 * Features:
 * - 6 variants: primary, secondary, outline, ghost, danger, success
 * - 3 sizes: sm, md, lg
 * - Loading state with spinner
 * - Icon support (left/right)
 * - Full width option
 * - Accessible with keyboard navigation
 */

'use client';

import React, { forwardRef, memo } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ButtonProps as BaseButtonProps } from '@/types';

/**
 * Button variant styles using CVA
 */
const buttonVariants = cva(
  // Base styles applied to all buttons
  [
    'inline-flex items-center justify-center gap-2',
    'font-medium transition-all duration-200',
    'rounded-lg border',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    'active:scale-[0.98]',
  ],
  {
    variants: {
      variant: {
        primary: [
          'bg-primary-500 text-white border-primary-500',
          'hover:bg-primary-600 hover:border-primary-600 hover:shadow-md hover:-translate-y-0.5',
          'focus-visible:ring-primary-500',
          'active:bg-primary-700 active:translate-y-0',
        ],
        secondary: [
          'bg-transparent text-primary-500 border-primary-500 border-2',
          'hover:bg-primary-50 hover:border-primary-600 hover:text-primary-600',
          'focus-visible:ring-primary-500',
          'active:bg-primary-100',
        ],
        outline: [
          'bg-transparent text-neutral-700 border-neutral-300',
          'hover:bg-neutral-50 hover:border-neutral-400',
          'focus-visible:ring-neutral-500',
          'active:bg-neutral-100',
        ],
        ghost: [
          'bg-transparent text-neutral-700 border-transparent',
          'hover:bg-neutral-100 hover:text-neutral-900',
          'focus-visible:ring-neutral-500',
          'active:bg-neutral-200',
        ],
        danger: [
          'bg-error-500 text-white border-error-500',
          'hover:bg-error-600 hover:border-error-600 hover:shadow-md hover:-translate-y-0.5',
          'focus-visible:ring-error-500',
          'active:bg-error-700 active:translate-y-0',
        ],
        success: [
          'bg-success-500 text-white border-success-500',
          'hover:bg-success-600 hover:border-success-600 hover:shadow-md hover:-translate-y-0.5',
          'focus-visible:ring-success-500',
          'active:bg-success-700 active:translate-y-0',
        ],
      },
      size: {
        sm: 'h-8 px-4 py-2 text-sm',
        md: 'h-10 px-6 py-3 text-base',
        lg: 'h-12 px-8 py-4 text-lg',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
    },
  },
);

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'color'>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

/**
 * Button Component
 *
 * @example
 * // Primary button with loading state
 * <Button variant="primary" loading>
 *   Save Changes
 * </Button>
 *
 * @example
 * // Secondary button with left icon
 * <Button variant="secondary" leftIcon={<Plus size={16} />}>
 *   Add Item
 * </Button>
 *
 * @example
 * // Danger button with full width
 * <Button variant="danger" fullWidth onClick={handleDelete}>
 *   Delete Account
 * </Button>
 */
export const Button = memo(
  forwardRef<HTMLButtonElement, ButtonProps>(
    (
      {
        variant = 'primary',
        size = 'md',
        loading = false,
        disabled = false,
        fullWidth = false,
        leftIcon,
        rightIcon,
        children,
        className,
        asChild = false,
        type = 'button',
        ...props
      },
      ref,
    ) => {
      const Comp = asChild ? Slot : 'button';

      // Determine icon size based on button size
      const iconSize = size === 'sm' ? 14 : size === 'lg' ? 20 : 16;

      return (
        <Comp
          ref={ref}
          type={asChild ? undefined : type}
          className={cn(buttonVariants({ variant, size, fullWidth }), className)}
          disabled={disabled || loading}
          aria-busy={loading}
          {...props}
        >
          {/* Loading spinner replaces left icon when loading */}
          {loading ? (
            <Loader2 size={iconSize} className="animate-spin" aria-hidden="true" />
          ) : (
            leftIcon && <span aria-hidden="true">{leftIcon}</span>
          )}

          {/* Button text content */}
          {children}

          {/* Right icon (not shown during loading) */}
          {!loading && rightIcon && <span aria-hidden="true">{rightIcon}</span>}
        </Comp>
      );
    },
  ),
);

Button.displayName = 'Button';

export { buttonVariants };
