/**
 * Admin Overview Dashboard Page
 * Platform-wide statistics and recent activity
 */

'use client';

import * as React from 'react';
import { Building2, Users, MessageSquare, DollarSign, Activity, TrendingUp, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: number;
  trendLabel?: string;
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info';
}

function StatCard({ title, value, icon: Icon, trend, trendLabel, color = 'primary' }: StatCardProps) {
  const isPositive = trend !== undefined && trend > 0;
  const isNegative = trend !== undefined && trend < 0;

  const colorClasses = {
    primary: 'bg-primary-100 text-primary-600',
    success: 'bg-success-100 text-success-600',
    warning: 'bg-warning-100 text-warning-600',
    error: 'bg-error-100 text-error-600',
    info: 'bg-info-100 text-info-600',
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-neutral-600">{title}</p>
            <p className="mt-2 text-3xl font-bold text-neutral-900">{value}</p>
            {trend !== undefined && (
              <div className="mt-2 flex items-center gap-1">
                <TrendingUp
                  className={cn(
                    'h-4 w-4',
                    isPositive && 'text-success-600',
                    isNegative && 'text-error-600 rotate-180',
                    !isPositive && !isNegative && 'text-neutral-400'
                  )}
                />
                <span
                  className={cn(
                    'text-sm font-medium',
                    isPositive && 'text-success-600',
                    isNegative && 'text-error-600',
                    !isPositive && !isNegative && 'text-neutral-600'
                  )}
                >
                  {Math.abs(trend)}%
                </span>
                {trendLabel && (
                  <span className="text-sm text-neutral-500">{trendLabel}</span>
                )}
              </div>
            )}
          </div>
          <div className={cn('flex h-12 w-12 items-center justify-center rounded-full', colorClasses[color])}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboardPage() {
  // TODO: Replace with actual API calls
  const stats = {
    totalSalons: 45,
    totalUsers: 234,
    totalMessages: 12543,
    monthlyRevenue: 45678,
    activeSalons: 42,
    newSalonsThisMonth: 7,
  };

  const recentActivity = [
    { id: '1', type: 'salon', message: 'New salon registered: "Bella Beauty Spa"', time: '5 min ago' },
    { id: '2', type: 'user', message: 'New user created: john@example.com', time: '12 min ago' },
    { id: '3', type: 'message', message: 'Message spike detected on Salon #23', time: '1 hour ago' },
    { id: '4', type: 'error', message: 'API error rate increased by 5%', time: '2 hours ago' },
  ];

  const systemHealth = [
    { name: 'API Server', status: 'healthy', uptime: '99.9%' },
    { name: 'Database', status: 'healthy', uptime: '99.8%' },
    { name: 'WhatsApp API', status: 'healthy', uptime: '98.5%' },
    { name: 'Background Jobs', status: 'warning', uptime: '95.2%' },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold text-neutral-900">Admin Overview</h1>
        <p className="mt-2 text-neutral-600">
          Platform-wide statistics and system health monitoring
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Salons"
          value={stats.totalSalons}
          icon={Building2}
          trend={15.3}
          trendLabel="vs last month"
          color="primary"
        />
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          icon={Users}
          trend={8.2}
          trendLabel="vs last month"
          color="success"
        />
        <StatCard
          title="Messages (24h)"
          value={stats.totalMessages.toLocaleString()}
          icon={MessageSquare}
          trend={-2.4}
          trendLabel="vs yesterday"
          color="info"
        />
        <StatCard
          title="Monthly Revenue"
          value={`$${(stats.monthlyRevenue / 100).toLocaleString()}`}
          icon={DollarSign}
          trend={12.5}
          trendLabel="vs last month"
          color="success"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* System Health */}
        <Card>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {systemHealth.map((service) => (
                <div key={service.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'h-3 w-3 rounded-full',
                        service.status === 'healthy' && 'bg-success-500',
                        service.status === 'warning' && 'bg-warning-500',
                        service.status === 'error' && 'bg-error-500'
                      )}
                    />
                    <div>
                      <p className="font-medium text-neutral-900">{service.name}</p>
                      <p className="text-sm text-neutral-500">Uptime: {service.uptime}</p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-0.5 text-xs font-medium',
                      service.status === 'healthy' && 'bg-success-100 text-success-700',
                      service.status === 'warning' && 'bg-warning-100 text-warning-700',
                      service.status === 'error' && 'bg-error-100 text-error-700'
                    )}
                  >
                    {service.status === 'healthy' ? 'Healthy' : service.status === 'warning' ? 'Warning' : 'Error'}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full',
                      activity.type === 'salon' && 'bg-primary-100 text-primary-600',
                      activity.type === 'user' && 'bg-success-100 text-success-600',
                      activity.type === 'message' && 'bg-info-100 text-info-600',
                      activity.type === 'error' && 'bg-error-100 text-error-600'
                    )}
                  >
                    {activity.type === 'salon' && <Building2 className="h-4 w-4" />}
                    {activity.type === 'user' && <Users className="h-4 w-4" />}
                    {activity.type === 'message' && <MessageSquare className="h-4 w-4" />}
                    {activity.type === 'error' && <AlertCircle className="h-4 w-4" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-neutral-900">{activity.message}</p>
                    <p className="text-xs text-neutral-500">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick stats */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="rounded-lg border border-neutral-200 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success-100">
                  <Activity className="h-5 w-5 text-success-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-600">Active Salons</p>
                  <p className="text-2xl font-bold text-neutral-900">{stats.activeSalons}</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-neutral-200 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100">
                  <Building2 className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-600">New This Month</p>
                  <p className="text-2xl font-bold text-neutral-900">{stats.newSalonsThisMonth}</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-neutral-200 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-info-100">
                  <MessageSquare className="h-5 w-5 text-info-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-600">Avg Messages/Day</p>
                  <p className="text-2xl font-bold text-neutral-900">
                    {(stats.totalMessages / 30).toFixed(0)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
