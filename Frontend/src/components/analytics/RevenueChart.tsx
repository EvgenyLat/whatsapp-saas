/**
 * RevenueChart Component
 * Line chart for revenue trends over time
 */

'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent } from '@/components/ui';

interface RevenueChartProps {
  data: Array<{
    date: string;
    revenue: number;
    previousRevenue?: number;
  }>;
  title?: string;
  height?: number;
  showComparison?: boolean;
  loading?: boolean;
  className?: string;
}

export function RevenueChart({
  data,
  title = 'Revenue Trend',
  height = 300,
  showComparison = false,
  loading = false,
  className = '',
}: RevenueChartProps) {
  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          {title && <h3 className="mb-4 text-lg font-semibold text-neutral-900">{title}</h3>}
          <div className="animate-pulse space-y-3" style={{ height }}>
            <div className="h-full w-full bg-neutral-200 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          {title && <h3 className="mb-4 text-lg font-semibold text-neutral-900">{title}</h3>}
          <div className="flex items-center justify-center text-neutral-500" style={{ height }}>
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Card className={className}>
      <CardContent className="p-6">
        {title && <h3 className="mb-4 text-lg font-semibold text-neutral-900">{title}</h3>}
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              tickFormatter={formatCurrency}
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              labelFormatter={(label: string) => formatDate(label)}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '8px 12px',
              }}
            />
            {showComparison && <Legend />}
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', r: 4 }}
              activeDot={{ r: 6 }}
              name="Current Period"
            />
            {showComparison && (
              <Line
                type="monotone"
                dataKey="previousRevenue"
                stroke="#9ca3af"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: '#9ca3af', r: 3 }}
                name="Previous Period"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
