/**
 * Alert Component
 * WhatsApp SaaS Platform
 *
 * Feedback component for displaying important messages with different severity levels.
 *
 * Features:
 * - 4 types: info, success, warning, error
 * - Optional icon (auto or custom)
 * - Dismissible with close button
 * - Title and description support
 * - Accessible with ARIA attributes
 */

'use client';

import React, { forwardRef, memo, useCallback, useState } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { AlertCircle, CheckCircle, Info, X, AlertTriangle, XCircle, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AlertProps as BaseAlertProps, AlertType } from '@/types';

/**
 * Alert variant styles using CVA
 */
const alertVariants = cva(
  [
    'relative w-full rounded-lg border p-4',
    'transition-all duration-200',
    '[&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-current',
    '[&>svg~*]:pl-7',
  ],
  {
    variants: {
      type: {
        info: [
          'border-info-300 bg-info-50 text-info-800',
          '[&>svg]:text-info-600',
        ],
        success: [
          'border-success-300 bg-success-50 text-success-800',
          '[&>svg]:text-success-600',
        ],
        warning: [
          'border-warning-300 bg-warning-50 text-warning-800',
          '[&>svg]:text-warning-600',
        ],
        error: [
          'border-error-300 bg-error-50 text-error-800',
          '[&>svg]:text-error-600',
        ],
      },
    },
    defaultVariants: {
      type: 'info',
    },
  },
);

/**
 * Icon mapping for each alert type
 */
const alertIcons: Record<AlertType, LucideIcon> = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
};

export interface AlertProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'>,
    VariantProps<typeof alertVariants> {
  type: AlertType;
  title?: React.ReactNode;
  message: React.ReactNode;
  closable?: boolean;
  onClose?: () => void;
  showIcon?: boolean;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}

/**
 * Alert Component
 *
 * @example
 * // Success alert
 * <Alert type="success" title="Success!" message="Your changes have been saved." />
 *
 * @example
 * // Dismissible error alert
 * <Alert
 *   type="error"
 *   title="Error"
 *   message="An error occurred while processing your request."
 *   closable
 *   onClose={() => console.log('Closed')}
 * />
 *
 * @example
 * // Alert with actions
 * <Alert
 *   type="warning"
 *   message="Your session will expire soon."
 *   actions={<Button size="sm">Extend Session</Button>}
 * />
 */
export const Alert = memo(
  forwardRef<HTMLDivElement, AlertProps>(
    (
      {
        type = 'info',
        title,
        message,
        closable = false,
        onClose,
        showIcon = true,
        icon,
        actions,
        className,
        ...props
      },
      ref,
    ) => {
      const [isVisible, setIsVisible] = useState(true);

      const handleClose = useCallback(() => {
        setIsVisible(false);
        onClose?.();
      }, [onClose]);

      if (!isVisible) return null;

      const Icon = alertIcons[type];

      return (
        <div
          ref={ref}
          role="alert"
          aria-live="polite"
          className={cn(alertVariants({ type }), className)}
          {...props}
        >
          {showIcon && (
            <span aria-hidden="true">
              {icon || <Icon size={20} />}
            </span>
          )}

          <div className="flex-1">
            {title && (
              <h5 className="mb-1 font-semibold leading-none tracking-tight">
                {title}
              </h5>
            )}
            <div className={cn('text-sm', title && 'opacity-90')}>
              {message}
            </div>
            {actions && (
              <div className="mt-3 flex gap-2">
                {actions}
              </div>
            )}
          </div>

          {closable && (
            <button
              type="button"
              onClick={handleClose}
              className={cn(
                'absolute right-3 top-3 rounded-md p-1',
                'opacity-70 transition-opacity hover:opacity-100',
                'focus:outline-none focus:ring-2 focus:ring-offset-2',
                type === 'info' && 'focus:ring-info-500',
                type === 'success' && 'focus:ring-success-500',
                type === 'warning' && 'focus:ring-warning-500',
                type === 'error' && 'focus:ring-error-500',
              )}
              aria-label="Dismiss alert"
            >
              <X size={16} />
            </button>
          )}
        </div>
      );
    },
  ),
);

Alert.displayName = 'Alert';

export { alertVariants };
