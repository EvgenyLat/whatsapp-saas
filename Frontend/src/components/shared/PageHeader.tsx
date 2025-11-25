/**
 * PageHeader Component
 *
 * Reusable page header with title, description, and optional action button.
 * Provides consistent styling across all dashboard pages.
 *
 * @example
 * ```tsx
 * <PageHeader
 *   title="Staff Members"
 *   description="Manage your salon team"
 *   action={<Button href="/staff/new">Add Staff</Button>}
 * />
 * ```
 */

import type { ReactNode } from 'react';

export interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  action,
  className = '',
}: PageHeaderProps) {
  return (
    <div className={`mb-6 ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-gray-600 sm:text-base">
              {description}
            </p>
          )}
        </div>
        {action && (
          <div className="flex-shrink-0">
            {action}
          </div>
        )}
      </div>
    </div>
  );
}
