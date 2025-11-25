/**
 * Container Component
 * WhatsApp SaaS Platform
 *
 * Responsive container wrapper for consistent page layouts.
 */

'use client';

import React, { forwardRef, memo } from 'react';
import { cn } from '@/lib/utils';

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Maximum width variant */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  /** Whether to center the container */
  center?: boolean;
  /** Padding size */
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

/**
 * Container Component
 *
 * @example
 * <Container maxWidth="lg">
 *   <h1>Page Content</h1>
 * </Container>
 */
export const Container = memo(
  forwardRef<HTMLDivElement, ContainerProps>(
    (
      {
        maxWidth = 'xl',
        center = true,
        padding = 'md',
        className,
        children,
        ...props
      },
      ref,
    ) => {
      return (
        <div
          ref={ref}
          className={cn(
            'w-full',
            center && 'mx-auto',
            // Max width variants
            maxWidth === 'sm' && 'max-w-screen-sm',
            maxWidth === 'md' && 'max-w-screen-md',
            maxWidth === 'lg' && 'max-w-screen-lg',
            maxWidth === 'xl' && 'max-w-screen-xl',
            maxWidth === '2xl' && 'max-w-screen-2xl',
            maxWidth === 'full' && 'max-w-full',
            // Padding variants
            padding === 'sm' && 'px-4 sm:px-6',
            padding === 'md' && 'px-6 sm:px-8',
            padding === 'lg' && 'px-8 sm:px-12',
            className,
          )}
          {...props}
        >
          {children}
        </div>
      );
    },
  ),
);

Container.displayName = 'Container';
