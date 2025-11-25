/**
 * System Debug Page
 * Comprehensive system health check and backend connectivity testing
 * Tests all API endpoints and displays results in a table
 */

'use client';

import * as React from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  LoadingSpinner,
} from '@/components/ui';
import { useSalonIdSafe } from '@/hooks/useSalonId';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';
import apiClient from '@/lib/api/client';
import {
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Server,
  Activity,
  AlertCircle,
} from 'lucide-react';

/**
 * API endpoint test result
 */
interface EndpointTest {
  id: string;
  name: string;
  url: string;
  method: string;
  status: 'pending' | 'success' | 'error' | 'not_tested';
  responseTime?: number;
  statusCode?: number;
  error?: string;
}

/**
 * All endpoints to test
 */
const getEndpointsToTest = (salonId: string | null): EndpointTest[] => [
  {
    id: 'health',
    name: 'Health Check',
    url: '/health',
    method: 'GET',
    status: 'not_tested',
  },
  {
    id: 'auth-profile',
    name: 'Current User Profile',
    url: '/auth/me',
    method: 'GET',
    status: 'not_tested',
  },
  ...(salonId
    ? [
        {
          id: 'salon',
          name: 'User Salon',
          url: `/salons`,
          method: 'GET',
          status: 'not_tested' as const,
        },
        {
          id: 'services',
          name: 'List Services',
          url: `/services?salon_id=${salonId}`,
          method: 'GET',
          status: 'not_tested' as const,
        },
        {
          id: 'masters',
          name: 'List Masters',
          url: `/masters?salon_id=${salonId}`,
          method: 'GET',
          status: 'not_tested' as const,
        },
        {
          id: 'bookings',
          name: 'List Bookings',
          url: `/bookings?salon_id=${salonId}`,
          method: 'GET',
          status: 'not_tested' as const,
        },
        {
          id: 'messages',
          name: 'List Messages',
          url: `/messages?salon_id=${salonId}`,
          method: 'GET',
          status: 'not_tested' as const,
        },
        {
          id: 'templates',
          name: 'List Templates',
          url: `/templates?salon_id=${salonId}`,
          method: 'GET',
          status: 'not_tested' as const,
        },
        {
          id: 'analytics',
          name: 'Dashboard Analytics',
          url: `/analytics/dashboard?salon_id=${salonId}`,
          method: 'GET',
          status: 'not_tested' as const,
        },
      ]
    : []),
];

/**
 * Test a single endpoint
 */
async function testEndpoint(endpoint: EndpointTest): Promise<EndpointTest> {
  const startTime = Date.now();

  try {
    const response = await apiClient({
      method: endpoint.method.toLowerCase() as any,
      url: endpoint.url,
    });

    const responseTime = Date.now() - startTime;

    return {
      ...endpoint,
      status: 'success',
      responseTime,
      statusCode: response.status,
    };
  } catch (error: any) {
    const responseTime = Date.now() - startTime;

    return {
      ...endpoint,
      status: 'error',
      responseTime,
      statusCode: error.response?.status,
      error: error.response?.data?.message || error.message || 'Unknown error',
    };
  }
}

/**
 * Endpoint test row component
 */
function EndpointTestRow({ test }: { test: EndpointTest }) {
  const getStatusIcon = () => {
    switch (test.status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-success-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-error-600" />;
      case 'pending':
        return <LoadingSpinner className="h-5 w-5" />;
      default:
        return <Clock className="h-5 w-5 text-neutral-400" />;
    }
  };

  const getStatusBadge = () => {
    switch (test.status) {
      case 'success':
        return <Badge variant="success">Working</Badge>;
      case 'error':
        return <Badge variant="error">Failed</Badge>;
      case 'pending':
        return <Badge variant="default">Testing...</Badge>;
      default:
        return <Badge variant="default">Not Tested</Badge>;
    }
  };

  return (
    <tr className="border-b border-neutral-200 hover:bg-neutral-50">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="font-medium text-neutral-900">{test.name}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <code className="text-xs bg-neutral-100 px-2 py-1 rounded text-neutral-700">
          {test.method}
        </code>
      </td>
      <td className="px-4 py-3">
        <code className="text-xs text-neutral-600">{test.url}</code>
      </td>
      <td className="px-4 py-3">{getStatusBadge()}</td>
      <td className="px-4 py-3">
        {test.responseTime !== undefined ? (
          <span className="text-sm text-neutral-700">{test.responseTime}ms</span>
        ) : (
          <span className="text-sm text-neutral-400">-</span>
        )}
      </td>
      <td className="px-4 py-3">
        {test.statusCode ? (
          <Badge
            variant={
              test.statusCode >= 200 && test.statusCode < 300
                ? 'success'
                : test.statusCode >= 400
                ? 'error'
                : 'default'
            }
          >
            {test.statusCode}
          </Badge>
        ) : (
          <span className="text-sm text-neutral-400">-</span>
        )}
      </td>
      <td className="px-4 py-3">
        {test.error ? (
          <span className="text-xs text-error-600">{test.error}</span>
        ) : test.status === 'success' ? (
          <span className="text-xs text-success-600">OK</span>
        ) : (
          <span className="text-xs text-neutral-400">-</span>
        )}
      </td>
    </tr>
  );
}

/**
 * System Information Component
 */
function SystemInfo() {
  const user = useAuthStore((state) => state.user);
  const salonId = useSalonIdSafe();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="p-4 bg-neutral-50 rounded-lg">
            <p className="text-sm font-medium text-neutral-600 mb-1">API Base URL</p>
            <code className="text-sm text-neutral-900 break-all">
              {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'}
            </code>
          </div>

          <div className="p-4 bg-neutral-50 rounded-lg">
            <p className="text-sm font-medium text-neutral-600 mb-1">Authentication Status</p>
            <div className="flex items-center gap-2">
              {isAuthenticated ? (
                <>
                  <CheckCircle className="h-4 w-4 text-success-600" />
                  <span className="text-sm text-success-700 font-medium">Authenticated</span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-error-600" />
                  <span className="text-sm text-error-700 font-medium">Not Authenticated</span>
                </>
              )}
            </div>
          </div>

          <div className="p-4 bg-neutral-50 rounded-lg">
            <p className="text-sm font-medium text-neutral-600 mb-1">User ID</p>
            <code className="text-sm text-neutral-900">{user?.id || 'N/A'}</code>
          </div>

          <div className="p-4 bg-neutral-50 rounded-lg">
            <p className="text-sm font-medium text-neutral-600 mb-1">Salon ID</p>
            <code className="text-sm text-neutral-900">{salonId || 'N/A'}</code>
          </div>

          <div className="p-4 bg-neutral-50 rounded-lg">
            <p className="text-sm font-medium text-neutral-600 mb-1">User Role</p>
            <Badge variant="primary">{user?.role || 'N/A'}</Badge>
          </div>

          <div className="p-4 bg-neutral-50 rounded-lg">
            <p className="text-sm font-medium text-neutral-600 mb-1">Environment</p>
            <Badge variant="default">
              {process.env.NODE_ENV === 'production' ? 'Production' : 'Development'}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * System Debug Page
 */
export default function SystemPage() {
  const salonId = useSalonIdSafe();
  const [endpoints, setEndpoints] = React.useState<EndpointTest[]>([]);
  const [isRunning, setIsRunning] = React.useState(false);

  React.useEffect(() => {
    setEndpoints(getEndpointsToTest(salonId));
  }, [salonId]);

  const runAllTests = async () => {
    setIsRunning(true);
    const endpointsToTest = getEndpointsToTest(salonId);

    // Set all to pending
    setEndpoints(endpointsToTest.map((e) => ({ ...e, status: 'pending' })));

    // Test each endpoint sequentially
    for (let i = 0; i < endpointsToTest.length; i++) {
      const endpoint = endpointsToTest[i];
      if (!endpoint) continue;

      const result = await testEndpoint(endpoint);

      setEndpoints((prev) => {
        const updated = [...prev];
        updated[i] = result;
        return updated;
      });
    }

    setIsRunning(false);
  };

  const totalTests = endpoints.length;
  const successfulTests = endpoints.filter((e) => e.status === 'success').length;
  const failedTests = endpoints.filter((e) => e.status === 'error').length;
  const avgResponseTime =
    endpoints.filter((e) => e.responseTime).length > 0
      ? Math.round(
          endpoints.reduce((acc, e) => acc + (e.responseTime || 0), 0) /
            endpoints.filter((e) => e.responseTime).length
        )
      : 0;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold text-neutral-900">System Diagnostics</h1>
        <p className="mt-2 text-neutral-600">
          Test backend connectivity and verify all API endpoints are functioning correctly
        </p>
      </div>

      {/* System info */}
      <SystemInfo />

      {/* Test summary */}
      {endpoints.some((e) => e.status !== 'not_tested') && (
        <div className="grid gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100">
                  <Server className="h-6 w-6 text-primary-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-neutral-900">{totalTests}</p>
                  <p className="text-sm text-neutral-600">Total Tests</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success-100">
                  <CheckCircle className="h-6 w-6 text-success-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-success-900">{successfulTests}</p>
                  <p className="text-sm text-success-600">Successful</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-error-100">
                  <XCircle className="h-6 w-6 text-error-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-error-900">{failedTests}</p>
                  <p className="text-sm text-error-600">Failed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-info-100">
                  <Activity className="h-6 w-6 text-info-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-info-900">{avgResponseTime}ms</p>
                  <p className="text-sm text-info-600">Avg Response</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Test controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>API Endpoint Tests</CardTitle>
            <Button
              variant="primary"
              onClick={runAllTests}
              disabled={isRunning}
            >
              {isRunning ? (
                <>
                  <LoadingSpinner className="mr-2 h-4 w-4" />
                  Running Tests...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Run All Tests
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!salonId && (
            <div className="p-6">
              <div className="flex items-center gap-2 p-4 bg-warning-50 border border-warning-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-warning-600" />
                <p className="text-sm text-warning-700">
                  No salon ID found. Some tests will be skipped. Please ensure you are logged in
                  with a salon account.
                </p>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 border-y border-neutral-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-700">
                    Endpoint
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-700">
                    Method
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-700">
                    URL
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-700">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-700">
                    Response Time
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-700">
                    Status Code
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-700">
                    Error
                  </th>
                </tr>
              </thead>
              <tbody>
                {endpoints.map((endpoint) => (
                  <EndpointTestRow key={endpoint.id} test={endpoint} />
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
