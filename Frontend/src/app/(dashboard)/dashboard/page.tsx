/**
 * Dashboard Home Page
 * Overview with statistics cards
 */

'use client';

import * as React from 'react';
import { Calendar, MessageSquare, TrendingUp, Users } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, LoadingSpinner } from '@/components/ui';
import { useStats } from '@/hooks';
import { formatNumber, formatPercentage } from '@/lib/utils';
import { useSalonIdSafe } from '@/hooks/useSalonId';
import Link from 'next/link';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: number;
  trendLabel?: string;
}

function StatCard({ title, value, icon: Icon, trend, trendLabel }: StatCardProps) {
  const isPositive = trend !== undefined && trend > 0;
  const isNegative = trend !== undefined && trend < 0;

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
                  className={`h-4 w-4 ${
                    isPositive
                      ? 'text-success-600'
                      : isNegative
                      ? 'text-error-600 rotate-180'
                      : 'text-neutral-400'
                  }`}
                />
                <span
                  className={`text-sm font-medium ${
                    isPositive
                      ? 'text-success-600'
                      : isNegative
                      ? 'text-error-600'
                      : 'text-neutral-600'
                  }`}
                >
                  {formatPercentage(Math.abs(trend), 1)}
                </span>
                {trendLabel && (
                  <span className="text-sm text-neutral-500">{trendLabel}</span>
                )}
              </div>
            )}
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100">
            <Icon className="h-6 w-6 text-primary-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const salonId = useSalonIdSafe();
  const { data: stats, isLoading, error } = useStats(salonId || '');

  // No salon setup yet - show welcome message
  if (!salonId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Welcome to WhatsApp SaaS!</h1>
          <p className="mt-2 text-neutral-600">
            Get started by creating your first salon.
          </p>
        </div>

        <Card>
          <CardContent className="py-12">
            <div className="text-center max-w-md mx-auto">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 mx-auto mb-4">
                <Calendar className="h-8 w-8 text-primary-600" />
              </div>
              <h2 className="text-xl font-semibold text-neutral-900 mb-2">No Salon Set Up</h2>
              <p className="text-neutral-600 mb-6">
                You haven't created a salon yet. Create your first salon to start managing bookings, staff, and services.
              </p>
              <Link href="/dashboard/settings">
                <button className="inline-flex items-center justify-center rounded-md bg-primary-600 px-6 py-3 text-sm font-medium text-white hover:bg-primary-700 transition-colors">
                  Go to Settings
                </button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner  label="Loading dashboard..." />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <p className="text-error-600 font-medium">Failed to load dashboard statistics</p>
            <p className="mt-2 text-sm text-neutral-500">
              Please try refreshing the page
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold text-neutral-900">Dashboard</h1>
        <p className="mt-2 text-neutral-600">
          Welcome back! Here's an overview of your salon's performance.
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Bookings"
          value={formatNumber(stats?.totalBookings || 0)}
          icon={Calendar}
          trend={stats?.trends?.bookingsChange}
          trendLabel="vs last month"
        />
        <StatCard
          title="Today's Bookings"
          value={formatNumber(stats?.todayBookings || 0)}
          icon={Users}
        />
        <StatCard
          title="Active Chats"
          value={formatNumber(stats?.activeChats || 0)}
          icon={MessageSquare}
          trend={stats?.trends?.messagesChange}
          trendLabel="vs last week"
        />
        <StatCard
          title="Response Rate"
          value={formatPercentage(stats?.responseRate || 0)}
          icon={TrendingUp}
          trend={stats?.trends?.responseRateChange}
          trendLabel="vs last week"
        />
      </div>

      {/* Bookings by status */}
      <Card>
        <CardHeader>
          <CardTitle>Bookings by Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-neutral-200 p-4">
              <p className="text-sm font-medium text-neutral-600">Pending</p>
              <p className="mt-2 text-2xl font-bold text-warning-600">
                {formatNumber(stats?.bookingsByStatus?.PENDING || 0)}
              </p>
            </div>
            <div className="rounded-lg border border-neutral-200 p-4">
              <p className="text-sm font-medium text-neutral-600">Confirmed</p>
              <p className="mt-2 text-2xl font-bold text-success-600">
                {formatNumber(stats?.bookingsByStatus?.CONFIRMED || 0)}
              </p>
            </div>
            <div className="rounded-lg border border-neutral-200 p-4">
              <p className="text-sm font-medium text-neutral-600">Completed</p>
              <p className="mt-2 text-2xl font-bold text-neutral-600">
                {formatNumber(stats?.bookingsByStatus?.COMPLETED || 0)}
              </p>
            </div>
            <div className="rounded-lg border border-neutral-200 p-4">
              <p className="text-sm font-medium text-neutral-600">Cancelled</p>
              <p className="mt-2 text-2xl font-bold text-error-600">
                {formatNumber(stats?.bookingsByStatus?.CANCELLED || 0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-neutral-200 p-4">
              <div>
                <p className="font-medium text-neutral-900">New Bookings</p>
                <p className="text-sm text-neutral-500">In the last 24 hours</p>
              </div>
              <span className="text-2xl font-bold text-primary-600">
                {formatNumber(stats?.recentActivity?.bookings || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-neutral-200 p-4">
              <div>
                <p className="font-medium text-neutral-900">Messages Sent</p>
                <p className="text-sm text-neutral-500">In the last 24 hours</p>
              </div>
              <span className="text-2xl font-bold text-secondary-600">
                {formatNumber(stats?.recentActivity?.messages || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-neutral-200 p-4">
              <div>
                <p className="font-medium text-neutral-900">New Customers</p>
                <p className="text-sm text-neutral-500">In the last 7 days</p>
              </div>
              <span className="text-2xl font-bold text-info-600">
                {formatNumber(stats?.recentActivity?.newCustomers || 0)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
