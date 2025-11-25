/**
 * TrendIndicator Component
 * Shows trend direction with percentage and optional label
 */

'use client';

import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface TrendIndicatorProps {
  value: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export function TrendIndicator({
  value,
  label,
  size = 'md',
  showIcon = true,
  className = '',
}: TrendIndicatorProps) {
  const direction = value > 0 ? 'up' : value < 0 ? 'down' : 'neutral';

  const colorClass = direction === 'up'
    ? 'text-success-600 bg-success-50'
    : direction === 'down'
    ? 'text-error-600 bg-error-50'
    : 'text-neutral-500 bg-neutral-50';

  const Icon = direction === 'up' ? ArrowUp : direction === 'down' ? ArrowDown : Minus;

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium ${colorClass} ${sizeClasses[size]} ${className}`}>
      {showIcon && <Icon className={iconSizes[size]} />}
      <span>{Math.abs(value)}%</span>
      {label && <span className="ml-1 font-normal opacity-75">{label}</span>}
    </span>
  );
}
