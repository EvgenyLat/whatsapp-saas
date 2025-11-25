/**
 * EmptyState Component
 * Shows when there's no data to display
 */

'use client';

import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <Card className={className}>
      <CardContent className="py-16">
        <div className="text-center">
          {Icon && (
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100">
              <Icon className="h-8 w-8 text-neutral-400" />
            </div>
          )}
          <h3 className="mt-4 text-lg font-semibold text-neutral-900">
            {title}
          </h3>
          {description && (
            <p className="mt-2 text-sm text-neutral-600">{description}</p>
          )}
          {action && (
            <button
              onClick={action.onClick}
              className="mt-6 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
            >
              {action.label}
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
