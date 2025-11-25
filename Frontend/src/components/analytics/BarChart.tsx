/**
 * BarChart Component
 * Versatile bar chart for various analytics
 */

'use client';

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent } from '@/components/ui';

interface BarChartProps {
  data: Array<Record<string, any>>;
  dataKeys: Array<{
    key: string;
    name: string;
    color?: string;
  }>;
  xAxisKey: string;
  title?: string;
  height?: number;
  loading?: boolean;
  horizontal?: boolean;
  stacked?: boolean;
  formatValue?: (value: number) => string;
  className?: string;
}

const DEFAULT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function BarChart({
  data,
  dataKeys,
  xAxisKey,
  title,
  height = 300,
  loading = false,
  horizontal = false,
  stacked = false,
  formatValue = (value: number) => value.toString(),
  className = '',
}: BarChartProps) {
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

  const bars = dataKeys.map((key, index) => ({
    ...key,
    color: key.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
  }));

  return (
    <Card className={className}>
      <CardContent className="p-6">
        {title && <h3 className="mb-4 text-lg font-semibold text-neutral-900">{title}</h3>}
        <ResponsiveContainer width="100%" height={height}>
          <RechartsBarChart
            data={data}
            layout={horizontal ? 'vertical' : 'horizontal'}
            margin={{ top: 5, right: 10, left: horizontal ? 100 : 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            {horizontal ? (
              <>
                <XAxis type="number" tickFormatter={formatValue} stroke="#6b7280" style={{ fontSize: '12px' }} />
                <YAxis type="category" dataKey={xAxisKey} stroke="#6b7280" style={{ fontSize: '12px' }} />
              </>
            ) : (
              <>
                <XAxis dataKey={xAxisKey} stroke="#6b7280" style={{ fontSize: '12px' }} />
                <YAxis tickFormatter={formatValue} stroke="#6b7280" style={{ fontSize: '12px' }} />
              </>
            )}
            <Tooltip
              formatter={formatValue}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '8px 12px',
              }}
            />
            {dataKeys.length > 1 && <Legend />}
            {bars.map((bar) => (
              <Bar
                key={bar.key}
                dataKey={bar.key}
                name={bar.name}
                fill={bar.color}
                stackId={stacked ? 'stack' : undefined}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </RechartsBarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
