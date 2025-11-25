/**
 * Admin Analytics Page
 * Platform-wide analytics and insights
 */

'use client';

import * as React from 'react';
import { Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { cn } from '@/lib/utils';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export default function AdminAnalyticsPage() {
  const [timeRange, setTimeRange] = React.useState<'7d' | '30d' | '90d' | '1y'>('30d');

  // TODO: Replace with actual API data
  const messageVolumeData = [
    { date: 'Jan 1', messages: 1200, sent: 800, received: 400 },
    { date: 'Jan 8', messages: 1500, sent: 1000, received: 500 },
    { date: 'Jan 15', messages: 1800, sent: 1200, received: 600 },
    { date: 'Jan 22', messages: 2200, sent: 1500, received: 700 },
    { date: 'Jan 29', messages: 2000, sent: 1300, received: 700 },
    { date: 'Feb 5', messages: 2400, sent: 1600, received: 800 },
    { date: 'Feb 12', messages: 2800, sent: 1900, received: 900 },
  ];

  const revenueData = [
    { month: 'Jan', revenue: 4500, growth: 12 },
    { month: 'Feb', revenue: 5200, growth: 15.5 },
    { month: 'Mar', revenue: 4800, growth: -7.7 },
    { month: 'Apr', revenue: 5600, growth: 16.7 },
    { month: 'May', revenue: 6200, growth: 10.7 },
    { month: 'Jun', revenue: 7100, growth: 14.5 },
  ];

  const userGrowthData = [
    { month: 'Jan', users: 180, salons: 35 },
    { month: 'Feb', users: 205, salons: 39 },
    { month: 'Mar', users: 225, salons: 42 },
    { month: 'Apr', users: 234, salons: 45 },
  ];

  const apiUsageData = [
    { name: 'Send Message', value: 45, color: '#3b82f6' },
    { name: 'Get Messages', value: 25, color: '#10b981' },
    { name: 'Create Booking', value: 15, color: '#f59e0b' },
    { name: 'Update Booking', value: 10, color: '#ef4444' },
    { name: 'Other', value: 5, color: '#6b7280' },
  ];

  const stats = [
    {
      title: 'Total Messages',
      value: '145.2K',
      change: 12.5,
      trend: 'up',
    },
    {
      title: 'Total Revenue',
      value: '$38.5K',
      change: 8.2,
      trend: 'up',
    },
    {
      title: 'Avg Response Time',
      value: '2.3 min',
      change: -15.3,
      trend: 'down',
    },
    {
      title: 'API Success Rate',
      value: '99.2%',
      change: 0.5,
      trend: 'up',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Platform Analytics</h1>
          <p className="mt-2 text-neutral-600">
            Comprehensive insights and performance metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-neutral-400" />
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as typeof timeRange)}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-neutral-600">{stat.title}</p>
              <p className="mt-2 text-3xl font-bold text-neutral-900">{stat.value}</p>
              <div className="mt-2 flex items-center gap-1">
                {stat.trend === 'up' ? (
                  <TrendingUp className="h-4 w-4 text-success-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-success-600" />
                )}
                <span className="text-sm font-medium text-success-600">
                  {Math.abs(stat.change)}%
                </span>
                <span className="text-sm text-neutral-500">vs last period</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Message Volume Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Message Volume Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={messageVolumeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                stroke="#6b7280"
                fontSize={12}
              />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="sent"
                stackId="1"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.6}
                name="Sent"
              />
              <Area
                type="monotone"
                dataKey="received"
                stackId="1"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.6}
                name="Received"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue Analytics */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                  }}
                />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* User Growth */}
        <Card>
          <CardHeader>
            <CardTitle>User & Salon Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={userGrowthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="users"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Users"
                />
                <Line
                  type="monotone"
                  dataKey="salons"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Salons"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* API Usage Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>API Usage Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={apiUsageData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {apiUsageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Performing Salons */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Salons</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: 'Bella Beauty Spa', messages: 4523, revenue: 8900 },
                { name: 'Glamour Studio', messages: 3821, revenue: 7200 },
                { name: 'Elite Hair Salon', messages: 2945, revenue: 5800 },
                { name: 'Prestige Salon', messages: 2341, revenue: 4600 },
              ].map((salon, index) => (
                <div key={index} className="flex items-center justify-between border-b border-neutral-100 pb-3 last:border-0">
                  <div>
                    <p className="font-medium text-neutral-900">{salon.name}</p>
                    <p className="text-sm text-neutral-500">{salon.messages.toLocaleString()} messages</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-success-600">${(salon.revenue / 100).toLocaleString()}</p>
                    <p className="text-xs text-neutral-500">revenue</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
