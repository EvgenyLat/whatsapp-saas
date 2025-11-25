/**
 * Revenue Analytics Dashboard
 * Financial metrics, breakdowns, and forecasting
 */

'use client';

import { useState, useMemo } from 'react';
import { format, subDays } from 'date-fns';
import { DollarSign, TrendingUp, PieChart, Download } from 'lucide-react';
import { useDetailedRevenueAnalytics } from '@/hooks/api/useAnalytics';
import { useAuth } from '@/hooks/useAuth';
import {
  StatsCard,
  DateRangePicker,
  DateRange,
  RevenueChart,
  BarChart,
  BookingStatusPieChart,
  EmptyState,
} from '@/components/analytics';
import { Card, CardContent, Button } from '@/components/ui';
import { exportAnalyticsData } from '@/hooks/api/useAnalytics';

export default function RevenueAnalyticsPage() {
  const { user } = useAuth();
  const salonId = user?.salon_id || '';

  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
  });

  const { data: revenue, isLoading } = useDetailedRevenueAnalytics({
    salon_id: salonId,
    start_date: format(dateRange.startDate, 'yyyy-MM-dd'),
    end_date: format(dateRange.endDate, 'yyyy-MM-dd'),
  });

  const trendData = useMemo(() => {
    if (!revenue?.trend_data) return [];
    return revenue.trend_data.map((item) => ({
      date: item.date,
      revenue: item.revenue / 100,
    }));
  }, [revenue]);

  const categoryData = useMemo(() => {
    if (!revenue?.by_category) return [];
    return revenue.by_category.map((cat) => ({
      name: cat.category,
      value: cat.revenue / 100,
    }));
  }, [revenue]);

  const dayOfWeekData = useMemo(() => {
    if (!revenue?.by_day_of_week) return [];
    return revenue.by_day_of_week.map((day) => ({
      day: day.day,
      revenue: day.revenue / 100,
    }));
  }, [revenue]);

  const handleExport = async () => {
    const blob = await exportAnalyticsData('revenue', {
      salon_id: salonId,
      start_date: format(dateRange.startDate, 'yyyy-MM-dd'),
      end_date: format(dateRange.endDate, 'yyyy-MM-dd'),
    }, 'csv');
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revenue-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  if (!salonId) {
    return <EmptyState icon={DollarSign} title="No salon selected" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Revenue Analytics</h1>
          <p className="mt-2 text-neutral-600">Financial breakdown and forecasting</p>
        </div>
        <div className="flex gap-3">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Revenue"
          value={`$${((revenue?.total_revenue || 0) / 100).toLocaleString()}`}
          icon={DollarSign}
          trend={{ value: revenue?.period_comparison || 0, label: 'vs previous period' }}
          loading={isLoading}
        />
        <StatsCard
          title="Avg Transaction"
          value={`$${((revenue?.metrics?.average_transaction_value || 0) / 100).toFixed(2)}`}
          icon={TrendingUp}
          loading={isLoading}
        />
        <StatsCard
          title="Revenue per Customer"
          value={`$${((revenue?.metrics?.revenue_per_customer || 0) / 100).toFixed(2)}`}
          icon={PieChart}
          loading={isLoading}
        />
        <StatsCard
          title="Revenue per Booking"
          value={`$${((revenue?.metrics?.revenue_per_booking || 0) / 100).toFixed(2)}`}
          icon={DollarSign}
          loading={isLoading}
        />
      </div>

      <RevenueChart
        data={trendData}
        title="Revenue Trend"
        height={350}
        loading={isLoading}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <BookingStatusPieChart
          data={categoryData}
          title="Revenue by Category"
          height={300}
          loading={isLoading}
        />
        <BarChart
          data={dayOfWeekData}
          dataKeys={[{ key: 'revenue', name: 'Revenue', color: '#10b981' }]}
          xAxisKey="day"
          title="Revenue by Day of Week"
          height={300}
          loading={isLoading}
          formatValue={(value) => `$${value.toLocaleString()}`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 text-lg font-semibold text-neutral-900">Payment Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-neutral-200 p-4">
                <span className="text-neutral-600">Paid</span>
                <span className="text-lg font-semibold text-success-600">
                  ${((revenue?.payment_status?.paid || 0) / 100).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-neutral-200 p-4">
                <span className="text-neutral-600">Pending</span>
                <span className="text-lg font-semibold text-warning-600">
                  ${((revenue?.payment_status?.pending || 0) / 100).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-neutral-200 p-4">
                <span className="text-neutral-600">Failed</span>
                <span className="text-lg font-semibold text-error-600">
                  ${((revenue?.payment_status?.failed || 0) / 100).toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 text-lg font-semibold text-neutral-900">Top Revenue Staff</h3>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse h-12 bg-neutral-100 rounded-lg" />
                ))}
              </div>
            ) : revenue?.by_staff && revenue.by_staff.length > 0 ? (
              <div className="space-y-3">
                {revenue.by_staff.slice(0, 5).map((staff) => (
                  <div key={staff.master_id} className="flex items-center justify-between rounded-lg border border-neutral-200 p-3">
                    <span className="font-medium text-neutral-900">{staff.name}</span>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-neutral-900">
                        ${(staff.revenue / 100).toLocaleString()}
                      </p>
                      <p className="text-xs text-neutral-600">{staff.percentage.toFixed(1)}%</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-32 items-center justify-center text-neutral-500">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
