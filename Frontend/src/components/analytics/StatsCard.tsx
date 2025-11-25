/**
 * StatsCard Component
 * Displays a metric with trend indicator and optional comparison
 */

'use client';

import { ArrowUp, ArrowDown, Minus, LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: {
    value: number;
    label?: string;
  };
  description?: string;
  loading?: boolean;
  className?: string;
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  description,
  loading = false,
  className = '',
}: StatsCardProps) {
  const trendDirection = trend ? (trend.value > 0 ? 'up' : trend.value < 0 ? 'down' : 'neutral') : null;

  const trendColor = trendDirection === 'up'
    ? 'text-success-600'
    : trendDirection === 'down'
    ? 'text-error-600'
    : 'text-neutral-500';

  const TrendIcon = trendDirection === 'up'
    ? ArrowUp
    : trendDirection === 'down'
    ? ArrowDown
    : Minus;

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 w-24 bg-neutral-200 rounded" />
            <div className="h-8 w-32 bg-neutral-200 rounded" />
            <div className="h-3 w-16 bg-neutral-200 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-neutral-600">{title}</p>
            <div className="mt-2 flex items-baseline gap-2">
              <p className="text-3xl font-bold text-neutral-900">{value}</p>
              {trend && (
                <div className={`flex items-center gap-1 text-sm font-medium ${trendColor}`}>
                  <TrendIcon className="h-4 w-4" />
                  <span>{Math.abs(trend.value)}%</span>
                </div>
              )}
            </div>
            {(description || trend?.label) && (
              <p className="mt-1 text-xs text-neutral-500">
                {trend?.label || description}
              </p>
            )}
          </div>
          {Icon && (
            <div className="rounded-lg bg-primary-50 p-3">
              <Icon className="h-6 w-6 text-primary-600" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
