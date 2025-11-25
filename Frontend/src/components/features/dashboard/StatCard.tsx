/**
 * StatCard Component
 * WhatsApp SaaS Platform
 *
 * Dashboard statistics card showing metrics with trends.
 */

'use client';

import React, { memo } from 'react';
import { TrendingUp, TrendingDown, LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { cn } from '@/lib/utils';

export interface StatCardProps {
  /** Metric label */
  label: string;
  /** Metric value */
  value: string | number;
  /** Icon component */
  icon?: LucideIcon;
  /** Trend direction */
  trend?: 'up' | 'down' | 'neutral';
  /** Percentage change */
  change?: string | number;
  /** Loading state */
  loading?: boolean;
  /** Additional className */
  className?: string;
}

/**
 * StatCard Component
 *
 * @example
 * <StatCard
 *   label="Total Bookings"
 *   value={1247}
 *   icon={Calendar}
 *   trend="up"
 *   change="+12%"
 * />
 */
export const StatCard = memo<StatCardProps>(
  ({ label, value, icon: Icon, trend, change, loading, className }) => {
    return (
      <Card
        className={cn(
          'transition-all hover:shadow-md',
          className,
        )}
      >
        <CardContent className="p-6">
          {loading ? (
            <div className="flex h-24 items-center justify-center">
              <LoadingSpinner size="md" />
            </div>
          ) : (
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-neutral-600">{label}</p>
                {Icon && (
                  <div className="rounded-lg bg-primary-50 p-2">
                    <Icon className="h-5 w-5 text-primary-600" />
                  </div>
                )}
              </div>

              {/* Value */}
              <p className="text-3xl font-bold text-neutral-900">{value}</p>

              {/* Trend */}
              {trend && change && (
                <div className="flex items-center gap-1">
                  {trend === 'up' && (
                    <TrendingUp className="h-4 w-4 text-success-600" />
                  )}
                  {trend === 'down' && (
                    <TrendingDown className="h-4 w-4 text-error-600" />
                  )}
                  <span
                    className={cn(
                      'text-sm font-medium',
                      trend === 'up' && 'text-success-600',
                      trend === 'down' && 'text-error-600',
                      trend === 'neutral' && 'text-neutral-600',
                    )}
                  >
                    {change}
                  </span>
                  <span className="text-sm text-neutral-500">from last month</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  },
);

StatCard.displayName = 'StatCard';
