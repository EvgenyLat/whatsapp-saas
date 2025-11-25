/**
 * Admin System Settings Page
 * Configuration, audit logs, and error monitoring
 */

'use client';

import * as React from 'react';
import { Settings, FileText, AlertTriangle, Activity, Database, Download } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface AuditLog {
  id: string;
  action: string;
  user_email: string;
  resource_type: string;
  resource_id: string;
  timestamp: string;
  ip_address: string;
  details?: string;
}

interface ErrorLog {
  id: string;
  level: 'error' | 'warning' | 'info';
  message: string;
  source: string;
  timestamp: string;
  count: number;
}

export default function AdminSystemPage() {
  const [activeTab, setActiveTab] = React.useState<'config' | 'audit' | 'errors'>('config');
  const [auditPage, setAuditPage] = React.useState(1);
  const [errorPage, setErrorPage] = React.useState(1);

  // TODO: Replace with actual API calls
  const auditLogs: AuditLog[] = [
    {
      id: '1',
      action: 'CREATE_SALON',
      user_email: 'admin@platform.com',
      resource_type: 'Salon',
      resource_id: 'salon-123',
      timestamp: '2024-03-21T10:30:00Z',
      ip_address: '192.168.1.1',
      details: 'Created salon: Bella Beauty Spa',
    },
    {
      id: '2',
      action: 'UPDATE_USER',
      user_email: 'admin@platform.com',
      resource_type: 'User',
      resource_id: 'user-456',
      timestamp: '2024-03-21T09:15:00Z',
      ip_address: '192.168.1.1',
      details: 'Changed role from SALON_STAFF to SALON_ADMIN',
    },
    {
      id: '3',
      action: 'DELETE_BOOKING',
      user_email: 'john@bellaspa.com',
      resource_type: 'Booking',
      resource_id: 'booking-789',
      timestamp: '2024-03-20T16:45:00Z',
      ip_address: '10.0.0.5',
      details: 'Deleted cancelled booking',
    },
  ];

  const errorLogs: ErrorLog[] = [
    {
      id: '1',
      level: 'error',
      message: 'Failed to send WhatsApp message: Rate limit exceeded',
      source: 'whatsapp-service',
      timestamp: '2024-03-21T11:00:00Z',
      count: 3,
    },
    {
      id: '2',
      level: 'warning',
      message: 'Database connection pool nearing capacity (85%)',
      source: 'database',
      timestamp: '2024-03-21T10:30:00Z',
      count: 1,
    },
    {
      id: '3',
      level: 'error',
      message: 'Authentication token validation failed',
      source: 'auth-service',
      timestamp: '2024-03-21T09:45:00Z',
      count: 2,
    },
  ];

  const auditColumns: Column<AuditLog>[] = [
    {
      key: 'action',
      label: 'Action',
      sortable: true,
      render: (log) => (
        <span className="font-mono text-sm text-neutral-900">{log.action}</span>
      ),
    },
    {
      key: 'user_email',
      label: 'User',
      sortable: true,
    },
    {
      key: 'resource_type',
      label: 'Resource',
      sortable: true,
      render: (log) => (
        <div>
          <p className="text-sm text-neutral-900">{log.resource_type}</p>
          <p className="text-xs text-neutral-500">{log.resource_id.substring(0, 12)}...</p>
        </div>
      ),
    },
    {
      key: 'ip_address',
      label: 'IP Address',
      sortable: false,
      render: (log) => (
        <span className="font-mono text-sm text-neutral-600">{log.ip_address}</span>
      ),
    },
    {
      key: 'timestamp',
      label: 'Timestamp',
      sortable: true,
      render: (log) => (
        <span className="text-sm text-neutral-600">
          {format(new Date(log.timestamp), 'MMM d, yyyy HH:mm:ss')}
        </span>
      ),
    },
  ];

  const errorColumns: Column<ErrorLog>[] = [
    {
      key: 'level',
      label: 'Level',
      sortable: true,
      render: (log) => (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
            log.level === 'error' && 'bg-error-100 text-error-700',
            log.level === 'warning' && 'bg-warning-100 text-warning-700',
            log.level === 'info' && 'bg-info-100 text-info-700'
          )}
        >
          <AlertTriangle className="h-3 w-3" />
          {log.level.toUpperCase()}
        </span>
      ),
    },
    {
      key: 'message',
      label: 'Message',
      sortable: false,
      render: (log) => (
        <p className="text-sm text-neutral-900 max-w-md truncate">{log.message}</p>
      ),
    },
    {
      key: 'source',
      label: 'Source',
      sortable: true,
      render: (log) => (
        <span className="font-mono text-sm text-neutral-600">{log.source}</span>
      ),
    },
    {
      key: 'count',
      label: 'Count',
      sortable: true,
      render: (log) => (
        <span className="text-sm font-medium text-neutral-900">{log.count}</span>
      ),
    },
    {
      key: 'timestamp',
      label: 'Last Occurrence',
      sortable: true,
      render: (log) => (
        <span className="text-sm text-neutral-600">
          {format(new Date(log.timestamp), 'MMM d, HH:mm:ss')}
        </span>
      ),
    },
  ];

  const configSettings = [
    { key: 'Platform Name', value: 'WhatsApp SaaS Platform', category: 'General' },
    { key: 'Max Salons', value: 'Unlimited', category: 'Limits' },
    { key: 'Max Users per Salon', value: '50', category: 'Limits' },
    { key: 'Message Rate Limit', value: '1000/hour', category: 'API' },
    { key: 'Session Timeout', value: '15 minutes', category: 'Security' },
    { key: 'Backup Frequency', value: 'Daily at 2:00 AM', category: 'Maintenance' },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold text-neutral-900">System Settings</h1>
        <p className="mt-2 text-neutral-600">
          Configuration, monitoring, and audit logs
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-neutral-200">
        <nav className="-mb-px flex gap-6">
          <button
            onClick={() => setActiveTab('config')}
            className={cn(
              'border-b-2 px-1 py-4 text-sm font-medium transition-colors',
              activeTab === 'config'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-700'
            )}
          >
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configuration
            </div>
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={cn(
              'border-b-2 px-1 py-4 text-sm font-medium transition-colors',
              activeTab === 'audit'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-700'
            )}
          >
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Audit Logs
            </div>
          </button>
          <button
            onClick={() => setActiveTab('errors')}
            className={cn(
              'border-b-2 px-1 py-4 text-sm font-medium transition-colors',
              activeTab === 'errors'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-700'
            )}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Error Logs
            </div>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'config' && (
        <div className="space-y-6">
          {/* System Status */}
          <div className="grid gap-6 lg:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success-100">
                    <Activity className="h-5 w-5 text-success-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-600">System Status</p>
                    <p className="text-lg font-semibold text-success-600">Healthy</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-info-100">
                    <Database className="h-5 w-5 text-info-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-600">Database Size</p>
                    <p className="text-lg font-semibold text-neutral-900">2.4 GB</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100">
                    <Settings className="h-5 w-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-600">API Version</p>
                    <p className="text-lg font-semibold text-neutral-900">v1.0.0</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Configuration Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Platform Configuration</CardTitle>
                <button className="flex items-center gap-2 rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
                  <Download className="h-4 w-4" />
                  Export Config
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {configSettings.map((setting, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between border-b border-neutral-100 py-3 last:border-0"
                  >
                    <div>
                      <p className="font-medium text-neutral-900">{setting.key}</p>
                      <p className="text-xs text-neutral-500">{setting.category}</p>
                    </div>
                    <span className="font-mono text-sm text-neutral-600">{setting.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'audit' && (
        <div>
          <DataTable
            data={auditLogs}
            columns={auditColumns}
            searchable
            searchPlaceholder="Search audit logs..."
            pagination={{
              page: auditPage,
              limit: 10,
              total: auditLogs.length,
              onPageChange: setAuditPage,
            }}
            emptyMessage="No audit logs found"
          />
        </div>
      )}

      {activeTab === 'errors' && (
        <div>
          <DataTable
            data={errorLogs}
            columns={errorColumns}
            searchable
            searchPlaceholder="Search error logs..."
            pagination={{
              page: errorPage,
              limit: 10,
              total: errorLogs.length,
              onPageChange: setErrorPage,
            }}
            emptyMessage="No error logs found"
          />
        </div>
      )}
    </div>
  );
}
