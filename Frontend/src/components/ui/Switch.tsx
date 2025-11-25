/**
 * Switch Component
 * WhatsApp SaaS Platform - Built with Radix UI Switch
 */

'use client';

import React, { forwardRef, memo, useId } from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { cn } from '@/lib/utils';

const SwitchRoot = memo(
  forwardRef<
    React.ElementRef<typeof SwitchPrimitive.Root>,
    React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
  >(({ className, ...props }, ref) => (
    <SwitchPrimitive.Root
      ref={ref}
      className={cn(
        'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent',
        'transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'data-[state=checked]:bg-primary-500 data-[state=unchecked]:bg-neutral-300',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          'pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0',
          'transition-transform',
          'data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0',
        )}
      />
    </SwitchPrimitive.Root>
  )),
);
SwitchRoot.displayName = SwitchPrimitive.Root.displayName;

export interface SwitchProps
  extends React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root> {
  label?: React.ReactNode;
  helperText?: string;
  showLabels?: boolean;
  onLabel?: string;
  offLabel?: string;
}

/**
 * Switch Component with Label
 *
 * @example
 * <Switch label="Enable notifications" />
 */
export const Switch = memo(
  forwardRef<React.ElementRef<typeof SwitchPrimitive.Root>, SwitchProps>(
    (
      {
        label,
        helperText,
        showLabels = false,
        onLabel = 'On',
        offLabel = 'Off',
        className,
        id,
        checked,
        ...props
      },
      ref,
    ) => {
      const generatedId = useId();
      const switchId = id || `switch-${generatedId}`;

      return (
        <div className={cn('flex flex-col gap-1.5', className)}>
          <div className="flex items-center justify-between gap-3">
            {label && (
              <label
                htmlFor={switchId}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {label}
              </label>
            )}
            <div className="flex items-center gap-2">
              {showLabels && (
                <span className="text-xs text-neutral-600">
                  {checked ? onLabel : offLabel}
                </span>
              )}
              <SwitchRoot
                ref={ref}
                id={switchId}
                checked={checked}
                aria-describedby={helperText ? `${switchId}-hint` : undefined}
                {...props}
              />
            </div>
          </div>

          {helperText && (
            <p id={`${switchId}-hint`} className="text-xs text-neutral-500">
              {helperText}
            </p>
          )}
        </div>
      );
    },
  ),
);

Switch.displayName = 'Switch';

export { SwitchRoot };
