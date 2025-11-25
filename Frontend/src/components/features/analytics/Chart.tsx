/**
 * Chart Component
 * WhatsApp SaaS Platform
 *
 * Wrapper for Recharts with support for:
 * - LineChart for trends over time
 * - BarChart for comparisons
 * - Loading state with skeleton
 * - Empty state with message
 * - Responsive container
 */

'use client';

import React, { memo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { cn } from '@/lib/utils';

export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}

export interface ChartProps {
  data: ChartDataPoint[];
  type: 'line' | 'bar';
  loading?: boolean;
  height?: number;
  xAxisKey?: string;
  yAxisKey?: string;
  lineColor?: string;
  barColor?: string;
  title?: string;
  emptyMessage?: string;
  className?: string;
}

/**
 * Chart Component
 *
 * @example
 * ```tsx
 * // Line chart for trends
 * <Chart
 *   type="line"
 *   data={[
 *     { name: 'Jan', value: 30 },
 *     { name: 'Feb', value: 45 },
 *     { name: 'Mar', value: 60 },
 *   ]}
 *   title="Bookings Over Time"
 * />
 *
 * // Bar chart for comparisons
 * <Chart
 *   type="bar"
 *   data={[
 *     { name: 'Haircut', value: 120 },
 *     { name: 'Coloring', value: 80 },
 *     { name: 'Styling', value: 50 },
 *   ]}
 *   title="Services Comparison"
 * />
 * ```
 */
export const Chart = memo<ChartProps>(
  ({
    data,
    type,
    loading = false,
    height = 300,
    xAxisKey = 'name',
    yAxisKey = 'value',
    lineColor = '#25D366',
    barColor = '#25D366',
    title,
    emptyMessage = 'No data available',
    className,
  }) => {
    // Loading state
    if (loading) {
      return (
        <div
          className={cn('flex items-center justify-center bg-white rounded-lg border border-neutral-200 p-8', className)}
          style={{ height }}
        >
          <LoadingSpinner size="lg" />
        </div>
      );
    }

    // Empty state
    if (!data || data.length === 0) {
      return (
        <div
          className={cn('flex flex-col items-center justify-center bg-white rounded-lg border border-neutral-200 p-8', className)}
          style={{ height }}
        >
          <svg
            className="w-16 h-16 text-neutral-300 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <p className="text-sm text-neutral-500">{emptyMessage}</p>
        </div>
      );
    }

    const ChartComponent = type === 'line' ? LineChart : BarChart;
    const chartDescription = title || `${type} chart showing data visualization`;

    return (
      <div className={cn('bg-white rounded-lg border border-neutral-200 p-4', className)}>
        {title && (
          <h3 id="chart-title" className="text-lg font-semibold text-neutral-900 mb-4">{title}</h3>
        )}
        <ResponsiveContainer
          width="100%"
          height={height}
          aria-label={chartDescription}
        >
          <ChartComponent
            data={data}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
            accessibilityLayer
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey={xAxisKey}
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
              }}
              labelStyle={{
                color: '#111827',
                fontWeight: 600,
              }}
              itemStyle={{
                color: '#6b7280',
              }}
            />
            <Legend
              wrapperStyle={{
                paddingTop: '20px',
              }}
            />
            {type === 'line' ? (
              <Line
                type="monotone"
                dataKey={yAxisKey}
                stroke={lineColor}
                strokeWidth={2}
                dot={{ fill: lineColor, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
            ) : (
              <Bar
                dataKey={yAxisKey}
                fill={barColor}
                radius={[8, 8, 0, 0]}
              />
            )}
          </ChartComponent>
        </ResponsiveContainer>
        {/* Add screen reader description */}
        <div className="sr-only">
          {`${chartDescription}. Data points: ${data.map(d => `${d[xAxisKey]}: ${d[yAxisKey]}`).join(', ')}`}
        </div>
      </div>
    );
  },
);

Chart.displayName = 'Chart';
