/**
 * Textarea Component
 * WhatsApp SaaS Platform
 *
 * Multi-line text input with auto-resize and character counting.
 *
 * Features:
 * - Auto-resize based on content
 * - Character counter
 * - Label, error, and helper text
 * - Accessible with ARIA attributes
 * - Controlled and uncontrolled modes
 */

'use client';

import React, { forwardRef, memo, useCallback, useEffect, useId, useRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import type { TextareaProps as BaseTextareaProps } from '@/types';

/**
 * Textarea variant styles using CVA
 */
const textareaVariants = cva(
  [
    'flex min-h-[80px] w-full rounded-md border px-3 py-2',
    'text-base transition-colors resize-vertical',
    'placeholder:text-neutral-400',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
    'disabled:cursor-not-allowed disabled:opacity-50',
    'bg-white',
  ],
  {
    variants: {
      variant: {
        default: 'border-neutral-300 hover:border-neutral-400',
        error: 'border-error-500 focus-visible:ring-error-500',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface TextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'>,
    VariantProps<typeof textareaVariants> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  showCount?: boolean;
  maxLength?: number;
  rows?: number;
  autoResize?: boolean;
}

/**
 * Textarea Component
 *
 * @example
 * // Basic textarea
 * <Textarea label="Description" placeholder="Enter description..." />
 *
 * @example
 * // With character counter
 * <Textarea
 *   label="Notes"
 *   showCount
 *   maxLength={500}
 *   placeholder="Add your notes..."
 * />
 *
 * @example
 * // Auto-resizing textarea
 * <Textarea
 *   label="Message"
 *   autoResize
 *   placeholder="Type your message..."
 * />
 */
export const Textarea = memo(
  forwardRef<HTMLTextAreaElement, TextareaProps>(
    (
      {
        label,
        error,
        helperText,
        required = false,
        showCount = false,
        maxLength,
        rows = 3,
        autoResize = false,
        variant,
        className,
        id,
        value,
        defaultValue,
        onChange,
        ...props
      },
      ref,
    ) => {
      const generatedId = useId();
      const textareaId = id || `textarea-${generatedId}`;
      const hasError = !!error;
      
      const internalRef = useRef<HTMLTextAreaElement>(null);
      const textareaRef = (ref as React.RefObject<HTMLTextAreaElement>) || internalRef;

      // Auto-resize functionality
      const adjustHeight = useCallback(() => {
        if (autoResize && textareaRef.current) {
          textareaRef.current.style.height = 'auto';
          textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
      }, [autoResize, textareaRef]);

      useEffect(() => {
        if (autoResize) {
          adjustHeight();
        }
      }, [autoResize, value, adjustHeight]);

      const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLTextAreaElement>) => {
          if (autoResize) {
            adjustHeight();
          }
          onChange?.(e);
        },
        [autoResize, adjustHeight, onChange],
      );

      const currentLength = typeof value === 'string' 
        ? value.length 
        : typeof defaultValue === 'string'
        ? defaultValue.length
        : 0;

      return (
        <div className="w-full">
          {label && (
            <label
              htmlFor={textareaId}
              className="mb-2 block text-sm font-medium text-neutral-700"
            >
              {label}
              {required && <span className="ml-1 text-error-500">*</span>}
            </label>
          )}

          <textarea
            ref={textareaRef}
            id={textareaId}
            rows={autoResize ? 1 : rows}
            maxLength={maxLength}
            value={value}
            defaultValue={defaultValue}
            onChange={handleChange}
            className={cn(
              textareaVariants({ variant: hasError ? 'error' : variant }),
              autoResize && 'resize-none overflow-hidden',
              className,
            )}
            aria-invalid={hasError}
            aria-describedby={
              error ? `${textareaId}-error` : helperText ? `${textareaId}-hint` : undefined
            }
            aria-required={required}
            {...props}
          />

          <div className="mt-1.5 flex items-center justify-between gap-2">
            <div className="flex-1">
              {error && (
                <p id={`${textareaId}-error`} className="text-xs text-error-500" role="alert">
                  {error}
                </p>
              )}

              {helperText && !error && (
                <p id={`${textareaId}-hint`} className="text-xs text-neutral-500">
                  {helperText}
                </p>
              )}
            </div>

            {showCount && maxLength && (
              <p
                className={cn(
                  'text-xs',
                  currentLength > maxLength * 0.9
                    ? 'text-warning-600'
                    : 'text-neutral-500',
                )}
                aria-live="polite"
              >
                {currentLength}/{maxLength}
              </p>
            )}
          </div>
        </div>
      );
    },
  ),
);

Textarea.displayName = 'Textarea';

export { textareaVariants };
