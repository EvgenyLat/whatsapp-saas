/**
 * Customer Analytics Dashboard
 * Customer segmentation, retention, and lifetime value analysis
 */

'use client';

import { useState, useMemo } from 'react';
import { format, subDays } from 'date-fns';
import { Users, TrendingUp, Heart, Download } from 'lucide-react';
import { useCustomerAnalytics } from '@/hooks/api/useAnalytics';
import { useAuth } from '@/hooks/useAuth';
import {
  StatsCard,
  DateRangePicker,
  DateRange,
  BarChart,
  BookingStatusPieChart,
  RevenueChart,
  EmptyState,
} from '@/components/analytics';
import { Card, CardContent, Button } from '@/components/ui';
import { exportAnalyticsData } from '@/hooks/api/useAnalytics';

export default function CustomerAnalyticsPage() {
  const { user } = useAuth();
  const salonId = user?.salon_id || '';

  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
  });

  const { data: customers, isLoading } = useCustomerAnalytics({
    salon_id: salonId,
    start_date: format(dateRange.startDate, 'yyyy-MM-dd'),
    end_date: format(dateRange.endDate, 'yyyy-MM-dd'),
  });

  const growthData = useMemo(() => {
    if (!customers?.growth_data) return [];
    return customers.growth_data.map((item) => ({
      date: item.date,
      revenue: item.total_customers,
    }));
  }, [customers]);

  const frequencyData = useMemo(() => {
    if (!customers?.segmentation?.by_frequency) return [];
    return customers.segmentation.by_frequency.map((seg) => ({
      name: seg.segment,
      value: seg.count,
    }));
  }, [customers]);

  const spendingData = useMemo(() => {
    if (!customers?.segmentation?.by_spending) return [];
    return customers.segmentation.by_spending.map((tier) => ({
      tier: tier.tier,
      count: tier.count,
      avgSpend: tier.avg_spend / 100,
    }));
  }, [customers]);

  const handleExport = async () => {
    const blob = await exportAnalyticsData('customer', {
      salon_id: salonId,
      start_date: format(dateRange.startDate, 'yyyy-MM-dd'),
      end_date: format(dateRange.endDate, 'yyyy-MM-dd'),
    }, 'csv');
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customer-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  if (!salonId) {
    return <EmptyState icon={Users} title="No salon selected" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Customer Analytics</h1>
          <p className="mt-2 text-neutral-600">Segmentation, retention, and lifetime value</p>
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
          title="Total Customers"
          value={customers?.total_customers || 0}
          icon={Users}
          loading={isLoading}
        />
        <StatsCard
          title="New Customers"
          value={customers?.new_customers || 0}
          icon={TrendingUp}
          description="This period"
          loading={isLoading}
        />
        <StatsCard
          title="Returning Rate"
          value={`${((customers?.returning_customers || 0) / (customers?.total_customers || 1) * 100).toFixed(1)}%`}
          icon={Heart}
          loading={isLoading}
        />
        <StatsCard
          title="Lifetime Value"
          value={`$${((customers?.customer_lifetime_value || 0) / 100).toFixed(2)}`}
          icon={TrendingUp}
          loading={isLoading}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <StatsCard
          title="Avg Bookings per Customer"
          value={(customers?.average_bookings_per_customer || 0).toFixed(1)}
          icon={TrendingUp}
          loading={isLoading}
        />
        <StatsCard
          title="Churn Rate"
          value={`${(customers?.churn_rate || 0).toFixed(1)}%`}
          icon={Users}
          loading={isLoading}
        />
      </div>

      <RevenueChart
        data={growthData}
        title="Customer Growth Over Time"
        height={300}
        loading={isLoading}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <BookingStatusPieChart
          data={frequencyData}
          title="Customers by Booking Frequency"
          height={300}
          loading={isLoading}
        />
        <BarChart
          data={spendingData}
          dataKeys={[
            { key: 'count', name: 'Customers', color: '#3b82f6' },
            { key: 'avgSpend', name: 'Avg Spend', color: '#10b981' },
          ]}
          xAxisKey="tier"
          title="Customer Spending Tiers"
          height={300}
          loading={isLoading}
        />
      </div>

      <Card>
        <CardContent className="p-6">
          <h3 className="mb-4 text-lg font-semibold text-neutral-900">Service Preferences</h3>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse h-12 bg-neutral-100 rounded-lg" />
              ))}
            </div>
          ) : customers?.segmentation?.by_service_preference && customers.segmentation.by_service_preference.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {customers.segmentation.by_service_preference.map((pref) => (
                <div key={pref.category} className="rounded-lg border border-neutral-200 p-4">
                  <p className="font-medium text-neutral-900">{pref.category}</p>
                  <p className="text-2xl font-bold text-primary-600">{pref.count}</p>
                  <p className="text-sm text-neutral-600">customers</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center text-neutral-500">
              No preference data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
