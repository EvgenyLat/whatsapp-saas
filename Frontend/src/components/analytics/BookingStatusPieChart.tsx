/**
 * BookingStatusPieChart Component
 * Pie chart for booking status distribution
 */

'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent } from '@/components/ui';

interface BookingStatusPieChartProps {
  data: Array<{
    name: string;
    value: number;
    color?: string;
  }>;
  title?: string;
  height?: number;
  loading?: boolean;
  className?: string;
}

const DEFAULT_COLORS = {
  CONFIRMED: '#10b981',
  PENDING: '#f59e0b',
  COMPLETED: '#3b82f6',
  CANCELLED: '#ef4444',
  NO_SHOW: '#6b7280',
};

export function BookingStatusPieChart({
  data,
  title = 'Bookings by Status',
  height = 300,
  loading = false,
  className = '',
}: BookingStatusPieChartProps) {
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

  const chartData = data.map((item) => ({
    ...item,
    color: item.color || DEFAULT_COLORS[item.name as keyof typeof DEFAULT_COLORS] || '#6b7280',
  }));

  const renderCustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
    const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));

    if (percent < 0.05) return null;

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-sm font-medium"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <Card className={className}>
      <CardContent className="p-6">
        {title && <h3 className="mb-4 text-lg font-semibold text-neutral-900">{title}</h3>}
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomLabel}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string) => [value, name]}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '8px 12px',
              }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value, entry: any) => (
                <span className="text-sm text-neutral-600">
                  {value} ({entry.payload.value})
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
