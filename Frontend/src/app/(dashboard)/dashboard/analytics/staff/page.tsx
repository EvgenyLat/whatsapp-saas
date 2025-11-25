/**
 * Staff Performance Analytics Dashboard
 * Individual staff metrics, leaderboards, and utilization tracking
 */

'use client';

import { useState, useMemo } from 'react';
import { format, subDays } from 'date-fns';
import {
  Users,
  DollarSign,
  Calendar,
  TrendingUp,
  Award,
  Clock,
  Download,
} from 'lucide-react';
import { useStaffPerformance } from '@/hooks/api/useAnalytics';
import { useAuth } from '@/hooks/useAuth';
import {
  StatsCard,
  DateRangePicker,
  DateRange,
  BarChart,
  EmptyState,
  TrendIndicator,
} from '@/components/analytics';
import { Card, CardContent, Button, Badge } from '@/components/ui';
import { exportAnalyticsData } from '@/hooks/api/useAnalytics';

export default function StaffPerformancePage() {
  const { user } = useAuth();
  const salonId = user?.salon_id || '';

  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
  });

  const { data: performance, isLoading } = useStaffPerformance({
    salon_id: salonId,
    start_date: format(dateRange.startDate, 'yyyy-MM-dd'),
    end_date: format(dateRange.endDate, 'yyyy-MM-dd'),
  });

  const staffComparisonData = useMemo(() => {
    if (!performance?.staff) return [];
    return performance.staff.map((staff) => ({
      name: staff.name,
      bookings: staff.total_bookings,
      revenue: staff.revenue / 100,
    }));
  }, [performance]);

  const handleExport = async () => {
    try {
      const blob = await exportAnalyticsData(
        'staff',
        {
          salon_id: salonId,
          start_date: format(dateRange.startDate, 'yyyy-MM-dd'),
          end_date: format(dateRange.endDate, 'yyyy-MM-dd'),
        },
        'csv'
      );
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `staff-performance-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  if (!salonId) {
    return (
      <EmptyState
        icon={Users}
        title="No salon selected"
        description="Please select a salon to view staff performance"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Staff Performance</h1>
          <p className="mt-2 text-neutral-600">
            Individual metrics, leaderboard, and utilization tracking
          </p>
        </div>
        <div className="flex gap-3">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Staff"
          value={performance?.staff?.length || 0}
          icon={Users}
          loading={isLoading}
        />
        <StatsCard
          title="Total Bookings"
          value={performance?.summary?.total_bookings || 0}
          icon={Calendar}
          loading={isLoading}
        />
        <StatsCard
          title="Total Revenue"
          value={`$${((performance?.summary?.total_revenue || 0) / 100).toLocaleString()}`}
          icon={DollarSign}
          loading={isLoading}
        />
        <StatsCard
          title="Avg Utilization"
          value={`${(performance?.summary?.average_utilization || 0).toFixed(1)}%`}
          icon={Clock}
          loading={isLoading}
        />
      </div>

      {/* Leaderboards */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Performers by Revenue */}
        <Card>
          <CardContent className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <Award className="h-5 w-5 text-warning-600" />
              <h3 className="text-lg font-semibold text-neutral-900">
                Top Performers by Revenue
              </h3>
            </div>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-16 rounded-lg bg-neutral-100" />
                  </div>
                ))}
              </div>
            ) : performance?.staff && performance.staff.length > 0 ? (
              <div className="space-y-3">
                {[...performance.staff]
                  .sort((a, b) => b.revenue - a.revenue)
                  .slice(0, 5)
                  .map((staff, index) => (
                    <div
                      key={staff.master_id}
                      className="flex items-center gap-3 rounded-lg border border-neutral-200 p-3"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-600">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-neutral-900">{staff.name}</p>
                        <p className="text-sm text-neutral-600">
                          ${(staff.revenue / 100).toLocaleString()} revenue
                        </p>
                      </div>
                      <TrendIndicator value={staff.trend === 'up' ? 10 : staff.trend === 'down' ? -5 : 0} size="sm" />
                    </div>
                  ))}
              </div>
            ) : (
              <div className="flex h-32 items-center justify-center text-neutral-500">
                No staff data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Performers by Bookings */}
        <Card>
          <CardContent className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-success-600" />
              <h3 className="text-lg font-semibold text-neutral-900">
                Top Performers by Bookings
              </h3>
            </div>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-16 rounded-lg bg-neutral-100" />
                  </div>
                ))}
              </div>
            ) : performance?.staff && performance.staff.length > 0 ? (
              <div className="space-y-3">
                {[...performance.staff]
                  .sort((a, b) => b.total_bookings - a.total_bookings)
                  .slice(0, 5)
                  .map((staff, index) => (
                    <div
                      key={staff.master_id}
                      className="flex items-center gap-3 rounded-lg border border-neutral-200 p-3"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success-100 text-sm font-bold text-success-600">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-neutral-900">{staff.name}</p>
                        <p className="text-sm text-neutral-600">
                          {staff.total_bookings} bookings
                        </p>
                      </div>
                      <Badge variant="info">{staff.utilization_rate.toFixed(0)}%</Badge>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="flex h-32 items-center justify-center text-neutral-500">
                No staff data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Comparison Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <BarChart
          data={staffComparisonData}
          dataKeys={[{ key: 'bookings', name: 'Bookings', color: '#10b981' }]}
          xAxisKey="name"
          title="Bookings by Staff Member"
          height={300}
          loading={isLoading}
        />
        <BarChart
          data={staffComparisonData}
          dataKeys={[{ key: 'revenue', name: 'Revenue', color: '#3b82f6' }]}
          xAxisKey="name"
          title="Revenue by Staff Member"
          height={300}
          loading={isLoading}
          formatValue={(value) => `$${value.toLocaleString()}`}
        />
      </div>

      {/* Individual Staff Details */}
      <Card>
        <CardContent className="p-6">
          <h3 className="mb-4 text-lg font-semibold text-neutral-900">
            Individual Staff Metrics
          </h3>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-32 rounded-lg bg-neutral-100" />
                </div>
              ))}
            </div>
          ) : performance?.staff && performance.staff.length > 0 ? (
            <div className="space-y-4">
              {performance.staff.map((staff) => (
                <div
                  key={staff.master_id}
                  className="rounded-lg border border-neutral-200 p-4"
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <h4 className="text-lg font-semibold text-neutral-900">
                        {staff.name}
                      </h4>
                      <div className="mt-1 flex gap-2">
                        <TrendIndicator value={staff.trend === 'up' ? 15 : staff.trend === 'down' ? -8 : 0} size="sm" />
                        <span className="text-sm text-neutral-600">
                          {staff.cancellation_rate.toFixed(1)}% cancellation rate
                        </span>
                      </div>
                    </div>
                    {staff.average_rating && (
                      <Badge variant="warning">
                        {staff.average_rating.toFixed(1)} ★
                      </Badge>
                    )}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-4">
                    <div>
                      <p className="text-sm text-neutral-600">Bookings</p>
                      <p className="text-xl font-semibold text-neutral-900">
                        {staff.total_bookings}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-600">Revenue</p>
                      <p className="text-xl font-semibold text-neutral-900">
                        ${(staff.revenue / 100).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-600">Utilization</p>
                      <p className="text-xl font-semibold text-neutral-900">
                        {staff.utilization_rate.toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-600">Popular Service</p>
                      <p className="text-sm font-medium text-neutral-900">
                        {staff.popular_services[0]?.service_name || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center text-neutral-500">
              No staff data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
