/**
 * Main Analytics Dashboard
 * Overview analytics with key metrics, charts, and recent activity
 */

'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  DollarSign,
  Users,
  Calendar,
  MessageSquare,
  CheckCircle,
  Clock,
  XCircle,
  ArrowRight,
  BarChart3,
  PieChart,
  Activity,
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { useDashboardStats } from '@/hooks/api/useAnalytics';
import { useAuth } from '@/hooks/useAuth';
import {
  StatsCard,
  DateRangePicker,
  DateRange,
  RevenueChart,
  BookingStatusPieChart,
  BarChart,
  EmptyState,
} from '@/components/analytics';
import { Card, CardContent, Badge } from '@/components/ui';

export default function AnalyticsPage() {
  const { user } = useAuth();
  const salonId = user?.salon_id || '';

  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
  });

  const { data: stats, isLoading } = useDashboardStats(salonId, {
    startDate: format(dateRange.startDate, 'yyyy-MM-dd'),
    endDate: format(dateRange.endDate, 'yyyy-MM-dd'),
  });

  // Process data for charts
  const revenueData = useMemo(() => {
    // Generate mock revenue trend data for now
    const days = 30;
    const data = [];
    const endDate = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(endDate, i);
      data.push({
        date: format(date, 'MMM dd'),
        revenue: Math.floor(Math.random() * 1000) + 500,
      });
    }
    return data;
  }, []);

  const statusData = useMemo(() => {
    if (!stats?.bookingsByStatus) return [];
    return Object.entries(stats.bookingsByStatus).map(([status, count]) => ({
      name: status.replace('_', ' '),
      value: count as number,
    }));
  }, [stats]);

  const dayOfWeekData = useMemo(() => {
    // Generate mock day of week data for now
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return days.map((day) => ({
      day,
      bookings: Math.floor(Math.random() * 20) + 5,
    }));
  }, []);

  const getStatusColor = (status: string): 'success' | 'warning' | 'info' | 'error' | 'default' => {
    const colors: Record<string, 'success' | 'warning' | 'info' | 'error' | 'default'> = {
      CONFIRMED: 'success',
      PENDING: 'warning',
      COMPLETED: 'info',
      CANCELLED: 'error',
      NO_SHOW: 'default',
    };
    return colors[status] || 'default';
  };

  if (!salonId) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No salon selected"
        description="Please select a salon to view analytics"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Analytics</h1>
          <p className="mt-2 text-neutral-600">
            Comprehensive insights and performance metrics
          </p>
        </div>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {/* Quick Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Bookings"
          value={stats?.totalBookings || 0}
          icon={Calendar}
          trend={{
            value: stats?.trends?.bookingsChange || 0,
            label: 'vs previous period',
          }}
          loading={isLoading}
        />
        <StatsCard
          title="Today's Bookings"
          value={stats?.todayBookings || 0}
          icon={DollarSign}
          trend={{
            value: 12, // Mock trend for now
            label: 'vs yesterday',
          }}
          loading={isLoading}
        />
        <StatsCard
          title="Active Chats"
          value={stats?.activeChats || 0}
          icon={Users}
          trend={{
            value: stats?.trends?.messagesChange || 0,
            label: 'vs previous period',
          }}
          loading={isLoading}
        />
        <StatsCard
          title="Response Rate"
          value={`${(stats?.responseRate || 0).toFixed(0)}%`}
          icon={TrendingUp}
          trend={{
            value: stats?.trends?.responseRateChange || 0,
            label: 'vs previous period',
          }}
          loading={isLoading}
        />
      </div>

      {/* Conversion Metrics */}
      <div className="grid gap-6 sm:grid-cols-2">
        <StatsCard
          title="Conversion Rate"
          value={`${(85.3).toFixed(1)}%`}
          icon={MessageSquare}
          description="Messages to bookings"
          loading={isLoading}
        />
        <StatsCard
          title="Cancellation Rate"
          value={`${((stats?.bookingsByStatus?.CANCELLED || 0) / (stats?.totalBookings || 1) * 100).toFixed(1)}%`}
          icon={XCircle}
          description="Cancelled bookings"
          loading={isLoading}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RevenueChart
          data={revenueData}
          title="Revenue Trend (Last 30 Days)"
          height={300}
          loading={isLoading}
        />
        <BookingStatusPieChart
          data={statusData}
          title="Bookings by Status"
          height={300}
          loading={isLoading}
        />
      </div>

      {/* Day of Week Analysis */}
      <BarChart
        data={dayOfWeekData}
        dataKeys={[{ key: 'bookings', name: 'Bookings', color: '#3b82f6' }]}
        xAxisKey="day"
        title="Bookings by Day of Week"
        height={300}
        loading={isLoading}
      />

      {/* Recent Activity & Upcoming */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Bookings */}
        <Card>
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-900">
                Recent Bookings
              </h3>
              <Link
                href="/dashboard/bookings"
                className="text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                View all
              </Link>
            </div>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-16 rounded-lg bg-neutral-100" />
                  </div>
                ))}
              </div>
            ) : false ? (
              <div className="space-y-3">
                {[].map((booking: any) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between rounded-lg border border-neutral-200 p-3 transition-colors hover:bg-neutral-50"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-neutral-900">
                        {booking.customer_name}
                      </p>
                      <p className="text-sm text-neutral-600">{booking.service}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={getStatusColor(booking.status)}>
                        {booking.status}
                      </Badge>
                      <ArrowRight className="h-4 w-4 text-neutral-400" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-32 items-center justify-center text-neutral-500">
                No recent bookings
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Today */}
        <Card>
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-900">
                Upcoming Today
              </h3>
              <Link
                href="/dashboard/bookings"
                className="text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                View all
              </Link>
            </div>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-16 rounded-lg bg-neutral-100" />
                  </div>
                ))}
              </div>
            ) : false ? (
              <div className="space-y-3">
                {[].map((booking: any) => (
                  <div
                    key={booking.id}
                    className="flex items-center gap-3 rounded-lg border border-neutral-200 p-3"
                  >
                    <Clock className="h-5 w-5 text-primary-600" />
                    <div className="flex-1">
                      <p className="font-medium text-neutral-900">
                        {booking.customer_name}
                      </p>
                      <p className="text-sm text-neutral-600">
                        {booking.service} with {booking.master_name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-neutral-900">
                        {booking.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-32 items-center justify-center text-neutral-500">
                No upcoming appointments today
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Links to Detailed Analytics */}
      <Card>
        <CardContent className="p-6">
          <h3 className="mb-4 text-lg font-semibold text-neutral-900">
            Detailed Analytics
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              href="/dashboard/analytics/staff"
              className="flex items-center gap-3 rounded-lg border border-neutral-200 p-4 transition-colors hover:border-primary-300 hover:bg-primary-50"
            >
              <div className="rounded-lg bg-primary-100 p-2">
                <Users className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <p className="font-medium text-neutral-900">Staff Performance</p>
                <p className="text-sm text-neutral-600">
                  Individual metrics & leaderboard
                </p>
              </div>
            </Link>
            <Link
              href="/dashboard/analytics/services"
              className="flex items-center gap-3 rounded-lg border border-neutral-200 p-4 transition-colors hover:border-primary-300 hover:bg-primary-50"
            >
              <div className="rounded-lg bg-primary-100 p-2">
                <PieChart className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <p className="font-medium text-neutral-900">Service Performance</p>
                <p className="text-sm text-neutral-600">
                  Popularity & revenue analysis
                </p>
              </div>
            </Link>
            <Link
              href="/dashboard/analytics/revenue"
              className="flex items-center gap-3 rounded-lg border border-neutral-200 p-4 transition-colors hover:border-primary-300 hover:bg-primary-50"
            >
              <div className="rounded-lg bg-primary-100 p-2">
                <DollarSign className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <p className="font-medium text-neutral-900">Revenue Analytics</p>
                <p className="text-sm text-neutral-600">
                  Financial breakdown & forecasts
                </p>
              </div>
            </Link>
            <Link
              href="/dashboard/analytics/customers"
              className="flex items-center gap-3 rounded-lg border border-neutral-200 p-4 transition-colors hover:border-primary-300 hover:bg-primary-50"
            >
              <div className="rounded-lg bg-primary-100 p-2">
                <Users className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <p className="font-medium text-neutral-900">Customer Analytics</p>
                <p className="text-sm text-neutral-600">
                  Segmentation & retention
                </p>
              </div>
            </Link>
            <Link
              href="/dashboard/analytics/ai"
              className="flex items-center gap-3 rounded-lg border border-neutral-200 p-4 transition-colors hover:border-primary-300 hover:bg-primary-50"
            >
              <div className="rounded-lg bg-primary-100 p-2">
                <Activity className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <p className="font-medium text-neutral-900">AI Performance</p>
                <p className="text-sm text-neutral-600">
                  Conversation metrics & costs
                </p>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
