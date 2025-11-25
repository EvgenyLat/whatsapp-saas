/**
 * Service Performance Analytics Dashboard
 * Service metrics, category analysis, and popularity trends
 */

'use client';

import { useState, useMemo } from 'react';
import { format, subDays } from 'date-fns';
import { Scissors, TrendingUp, DollarSign, Calendar, Download } from 'lucide-react';
import { useServicePerformance } from '@/hooks/api/useAnalytics';
import { useAuth } from '@/hooks/useAuth';
import {
  StatsCard,
  DateRangePicker,
  DateRange,
  BarChart,
  BookingStatusPieChart,
  EmptyState,
} from '@/components/analytics';
import { Card, CardContent, Button, Badge } from '@/components/ui';
import { exportAnalyticsData } from '@/hooks/api/useAnalytics';

export default function ServicePerformancePage() {
  const { user } = useAuth();
  const salonId = user?.salon_id || '';

  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
  });

  const { data: performance, isLoading } = useServicePerformance({
    salon_id: salonId,
    start_date: format(dateRange.startDate, 'yyyy-MM-dd'),
    end_date: format(dateRange.endDate, 'yyyy-MM-dd'),
  });

  const serviceData = useMemo(() => {
    if (!performance?.services) return [];
    return performance.services.map((service) => ({
      name: service.name,
      bookings: service.total_bookings,
      revenue: service.revenue / 100,
    }));
  }, [performance]);

  const categoryData = useMemo(() => {
    if (!performance?.by_category) return [];
    return performance.by_category.map((cat) => ({
      name: cat.category,
      value: cat.total_bookings,
    }));
  }, [performance]);

  const handleExport = async () => {
    const blob = await exportAnalyticsData('service', {
      salon_id: salonId,
      start_date: format(dateRange.startDate, 'yyyy-MM-dd'),
      end_date: format(dateRange.endDate, 'yyyy-MM-dd'),
    }, 'csv');
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `service-performance-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  if (!salonId) {
    return <EmptyState icon={Scissors} title="No salon selected" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Service Performance</h1>
          <p className="mt-2 text-neutral-600">Popularity trends and revenue analysis</p>
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
          title="Total Services"
          value={performance?.services?.length || 0}
          icon={Scissors}
          loading={isLoading}
        />
        <StatsCard
          title="Total Bookings"
          value={performance?.services?.reduce((sum, s) => sum + s.total_bookings, 0) || 0}
          icon={Calendar}
          loading={isLoading}
        />
        <StatsCard
          title="Total Revenue"
          value={`$${((performance?.services?.reduce((sum, s) => sum + s.revenue, 0) || 0) / 100).toLocaleString()}`}
          icon={DollarSign}
          loading={isLoading}
        />
        <StatsCard
          title="Categories"
          value={performance?.by_category?.length || 0}
          icon={TrendingUp}
          loading={isLoading}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <BarChart
          data={serviceData.slice(0, 10)}
          dataKeys={[{ key: 'bookings', name: 'Bookings', color: '#3b82f6' }]}
          xAxisKey="name"
          title="Top 10 Services by Bookings"
          height={300}
          loading={isLoading}
        />
        <BookingStatusPieChart
          data={categoryData}
          title="Bookings by Category"
          height={300}
          loading={isLoading}
        />
      </div>

      <BarChart
        data={serviceData.slice(0, 10)}
        dataKeys={[{ key: 'revenue', name: 'Revenue', color: '#10b981' }]}
        xAxisKey="name"
        title="Top 10 Services by Revenue"
        height={300}
        loading={isLoading}
        formatValue={(value) => `$${value.toLocaleString()}`}
      />

      <Card>
        <CardContent className="p-6">
          <h3 className="mb-4 text-lg font-semibold text-neutral-900">Service Details</h3>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse h-20 bg-neutral-100 rounded-lg" />
              ))}
            </div>
          ) : performance?.services && performance.services.length > 0 ? (
            <div className="space-y-3">
              {performance.services.map((service) => (
                <div key={service.service_id} className="flex items-center justify-between rounded-lg border border-neutral-200 p-4">
                  <div className="flex-1">
                    <h4 className="font-semibold text-neutral-900">{service.name}</h4>
                    <p className="text-sm text-neutral-600">{service.category}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-6 text-right">
                    <div>
                      <p className="text-sm text-neutral-600">Bookings</p>
                      <p className="text-lg font-semibold text-neutral-900">{service.total_bookings}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-600">Revenue</p>
                      <p className="text-lg font-semibold text-neutral-900">${(service.revenue / 100).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-600">Growth</p>
                      <Badge variant={service.growth_rate > 0 ? 'success' : 'error'}>
                        {service.growth_rate > 0 ? '+' : ''}{service.growth_rate.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center text-neutral-500">
              No service data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
