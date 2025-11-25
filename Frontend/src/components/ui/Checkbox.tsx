/**
 * Checkbox Component
 * WhatsApp SaaS Platform - Built with Radix UI Checkbox
 */

'use client';

import React, { forwardRef, memo, useId } from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const CheckboxRoot = memo(
  forwardRef<
    React.ElementRef<typeof CheckboxPrimitive.Root>,
    React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
  >(({ className, ...props }, ref) => (
    <CheckboxPrimitive.Root
      ref={ref}
      className={cn(
        'peer h-5 w-5 shrink-0 rounded border-2 border-neutral-300',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'data-[state=checked]:bg-primary-500 data-[state=checked]:border-primary-500 data-[state=checked]:text-white',
        'hover:border-neutral-400 data-[state=checked]:hover:bg-primary-600',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
        <Check className="h-4 w-4" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )),
);
CheckboxRoot.displayName = CheckboxPrimitive.Root.displayName;

export interface CheckboxProps
  extends React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> {
  label?: React.ReactNode;
  error?: string;
  helperText?: string;
}

/**
 * Checkbox Component with Label
 *
 * @example
 * <Checkbox label="Accept terms and conditions" />
 */
export const Checkbox = memo(
  forwardRef<React.ElementRef<typeof CheckboxPrimitive.Root>, CheckboxProps>(
    ({ label, error, helperText, className, id, ...props }, ref) => {
      const generatedId = useId();
      const checkboxId = id || `checkbox-${generatedId}`;
      const hasError = !!error;

      return (
        <div className={cn('flex flex-col gap-1.5', className)}>
          <div className="flex items-center gap-2">
            <CheckboxRoot
              ref={ref}
              id={checkboxId}
              aria-invalid={hasError}
              aria-describedby={
                error
                  ? `${checkboxId}-error`
                  : helperText
                  ? `${checkboxId}-hint`
                  : undefined
              }
              {...props}
            />
            {label && (
              <label
                htmlFor={checkboxId}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {label}
              </label>
            )}
          </div>

          {error && (
            <p id={`${checkboxId}-error`} className="text-xs text-error-500" role="alert">
              {error}
            </p>
          )}

          {helperText && !error && (
            <p id={`${checkboxId}-hint`} className="text-xs text-neutral-500">
              {helperText}
            </p>
          )}
        </div>
      );
    },
  ),
);

Checkbox.displayName = 'Checkbox';

export { CheckboxRoot };
