/**
 * AI Performance Analytics Dashboard
 * Conversation metrics, intent analysis, and cost tracking
 */

'use client';

import { useState, useMemo } from 'react';
import { format, subDays } from 'date-fns';
import { Bot, MessageSquare, Zap, DollarSign, Download } from 'lucide-react';
import { useAIPerformance } from '@/hooks/api/useAnalytics';
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
import { Card, CardContent, Button, Badge } from '@/components/ui';
import { exportAnalyticsData } from '@/hooks/api/useAnalytics';

export default function AIPerformancePage() {
  const { user } = useAuth();
  const salonId = user?.salon_id || '';

  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
  });

  const { data: aiPerf, isLoading } = useAIPerformance({
    salon_id: salonId,
    start_date: format(dateRange.startDate, 'yyyy-MM-dd'),
    end_date: format(dateRange.endDate, 'yyyy-MM-dd'),
  });

  const usageData = useMemo(() => {
    if (!aiPerf?.usage_over_time) return [];
    return aiPerf.usage_over_time.map((item) => ({
      date: item.date,
      revenue: item.conversations,
    }));
  }, [aiPerf]);

  const intentData = useMemo(() => {
    if (!aiPerf?.intent_analysis?.intents) return [];
    return aiPerf.intent_analysis.intents.map((intent) => ({
      name: intent.intent,
      value: intent.count,
    }));
  }, [aiPerf]);

  const languageData = useMemo(() => {
    if (!aiPerf?.language_distribution) return [];
    return aiPerf.language_distribution.map((lang) => ({
      name: lang.language,
      value: lang.count,
    }));
  }, [aiPerf]);

  const handleExport = async () => {
    const blob = await exportAnalyticsData('ai', {
      salon_id: salonId,
      start_date: format(dateRange.startDate, 'yyyy-MM-dd'),
      end_date: format(dateRange.endDate, 'yyyy-MM-dd'),
    }, 'csv');
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-performance-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  if (!salonId) {
    return <EmptyState icon={Bot} title="No salon selected" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">AI Performance</h1>
          <p className="mt-2 text-neutral-600">Conversation metrics and cost analysis</p>
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
          title="Total Conversations"
          value={aiPerf?.total_conversations || 0}
          icon={Bot}
          loading={isLoading}
        />
        <StatsCard
          title="Messages Processed"
          value={aiPerf?.messages_processed || 0}
          icon={MessageSquare}
          loading={isLoading}
        />
        <StatsCard
          title="Success Rate"
          value={`${(aiPerf?.success_rate || 0).toFixed(1)}%`}
          icon={Zap}
          loading={isLoading}
        />
        <StatsCard
          title="Total Cost"
          value={`$${(aiPerf?.token_usage?.total_cost || 0).toFixed(2)}`}
          icon={DollarSign}
          loading={isLoading}
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <StatsCard
          title="Successful Bookings"
          value={aiPerf?.successful_bookings || 0}
          icon={Zap}
          loading={isLoading}
        />
        <StatsCard
          title="Avg Response Time"
          value={`${(aiPerf?.average_response_time || 0).toFixed(0)}ms`}
          icon={Zap}
          loading={isLoading}
        />
        <StatsCard
          title="Cost per Conversation"
          value={`$${(aiPerf?.token_usage?.average_per_conversation || 0).toFixed(4)}`}
          icon={DollarSign}
          loading={isLoading}
        />
      </div>

      <RevenueChart
        data={usageData}
        title="AI Usage Over Time"
        height={300}
        loading={isLoading}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <BookingStatusPieChart
          data={intentData}
          title="Intent Distribution"
          height={300}
          loading={isLoading}
        />
        <BookingStatusPieChart
          data={languageData}
          title="Language Distribution"
          height={300}
          loading={isLoading}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 text-lg font-semibold text-neutral-900">Performance Metrics</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-neutral-200 p-4">
                <span className="text-neutral-600">Avg Conversation Length</span>
                <span className="text-lg font-semibold text-neutral-900">
                  {aiPerf?.performance_metrics?.avg_conversation_length?.toFixed(1) || 0} messages
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-neutral-200 p-4">
                <span className="text-neutral-600">Avg Resolution Time</span>
                <span className="text-lg font-semibold text-neutral-900">
                  {aiPerf?.performance_metrics?.avg_resolution_time?.toFixed(0) || 0}s
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-neutral-200 p-4">
                <span className="text-neutral-600">Escalation Rate</span>
                <span className="text-lg font-semibold text-neutral-900">
                  {aiPerf?.performance_metrics?.escalation_rate?.toFixed(1) || 0}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 text-lg font-semibold text-neutral-900">Top Intents</h3>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse h-12 bg-neutral-100 rounded-lg" />
                ))}
              </div>
            ) : aiPerf?.intent_analysis?.intents && aiPerf.intent_analysis.intents.length > 0 ? (
              <div className="space-y-3">
                {aiPerf.intent_analysis.intents.slice(0, 5).map((intent) => (
                  <div key={intent.intent} className="flex items-center justify-between rounded-lg border border-neutral-200 p-3">
                    <div className="flex-1">
                      <p className="font-medium text-neutral-900">{intent.intent}</p>
                      <p className="text-sm text-neutral-600">{intent.count} occurrences</p>
                    </div>
                    <Badge variant={intent.conversion_rate > 50 ? 'success' : 'warning'}>
                      {intent.conversion_rate.toFixed(1)}% conversion
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-32 items-center justify-center text-neutral-500">
                No intent data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <h3 className="mb-4 text-lg font-semibold text-neutral-900">Token Usage</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-neutral-200 p-4">
              <p className="text-sm text-neutral-600">Total Tokens</p>
              <p className="text-2xl font-bold text-neutral-900">
                {(aiPerf?.token_usage?.total_tokens || 0).toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg border border-neutral-200 p-4">
              <p className="text-sm text-neutral-600">Total Cost</p>
              <p className="text-2xl font-bold text-neutral-900">
                ${(aiPerf?.token_usage?.total_cost || 0).toFixed(2)}
              </p>
            </div>
            <div className="rounded-lg border border-neutral-200 p-4">
              <p className="text-sm text-neutral-600">Avg per Conversation</p>
              <p className="text-2xl font-bold text-neutral-900">
                {(aiPerf?.token_usage?.average_per_conversation || 0).toFixed(0)} tokens
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
