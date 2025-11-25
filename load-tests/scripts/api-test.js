// =============================================================================
// API LOAD TEST
// =============================================================================
// General API load test with gradual ramp-up
// Tests: Health, root, bookings, messages, stats endpoints
// Pattern: 10 → 50 → 100 users over 10 minutes
// =============================================================================

import http from 'k6/http';
import { sleep, check } from 'k6';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import { config } from '../config/config.js';
import {
  makeRequest,
  checkStatus,
  sleepBetween,
  logTestStart,
  logTestEnd,
  randomPhoneNumber,
  randomElement,
  generateBookingData,
} from '../utils/helpers.js';

// =============================================================================
// TEST CONFIGURATION
// =============================================================================

export const options = {
  stages: config.loadPatterns.gradual.stages,

  thresholds: {
    // HTTP metrics
    http_req_duration: [
      `p(95)<${config.thresholds.api.p95}`, // P95 < 200ms
      `p(99)<${config.thresholds.api.p99}`, // P99 < 500ms
    ],
    http_req_failed: [`rate<${config.thresholds.api.errorRate}`], // Error rate < 1%

    // Custom metrics
    'http_req_duration{endpoint:health}': ['p(95)<100'],
    'http_req_duration{endpoint:root}': ['p(95)<100'],
    'http_req_duration{endpoint:bookings}': ['p(95)<300'],
    'http_req_duration{endpoint:stats}': ['p(95)<500'],

    // Success rate
    checks: ['rate>0.99'], // 99% of checks should pass
  },

  // HTTP configuration
  http Debug: 'full',
  insecureSkipTLSVerify: true,
  noConnectionReuse: false,

  // Tags for filtering
  tags: {
    test_type: 'api_load_test',
  },
};

// =============================================================================
// SETUP
// =============================================================================

export function setup() {
  logTestStart('API Load Test');

  // Verify backend is accessible
  const healthCheck = http.get(`${config.baseUrl}/healthz`);

  if (healthCheck.status !== 200) {
    throw new Error(`Backend not accessible: ${healthCheck.status}`);
  }

  console.log('✅ Backend is accessible');
  console.log(`📍 Base URL: ${config.baseUrl}`);
  console.log(`👥 Load pattern: ${JSON.stringify(config.loadPatterns.gradual.stages)}`);

  return {
    baseUrl: config.baseUrl,
    adminToken: config.adminToken,
    testSalonId: config.testSalonId,
  };
}

// =============================================================================
// MAIN TEST SCENARIO
// =============================================================================

export default function (data) {
  const { baseUrl, adminToken, testSalonId } = data;

  // Headers
  const headers = {
    'Content-Type': 'application/json',
    'x-admin-token': adminToken,
  };

  // ==========================================================================
  // Test 1: Health Check (Public)
  // ==========================================================================

  const healthRes = http.get(`${baseUrl}/healthz`, {
    tags: { endpoint: 'health' },
  });

  makeRequest('Health Check', healthRes, {
    'status is 200': (r) => r.status === 200,
    'has status field': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.status === 'ok';
      } catch (e) {
        return false;
      }
    },
  });

  sleep(sleepBetween(0.5, 1));

  // ==========================================================================
  // Test 2: Root Endpoint (Public)
  // ==========================================================================

  const rootRes = http.get(`${baseUrl}/`, {
    tags: { endpoint: 'root' },
  });

  makeRequest('Root Endpoint', rootRes, {
    'status is 200': (r) => r.status === 200,
    'has message': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.hasOwnProperty('message');
      } catch (e) {
        return false;
      }
    },
  });

  sleep(sleepBetween(0.5, 1));

  // ==========================================================================
  // Test 3: Get Bookings (Admin)
  // ==========================================================================

  const bookingsRes = http.get(
    `${baseUrl}/admin/bookings/${testSalonId}?page=1&limit=10`,
    {
      headers,
      tags: { endpoint: 'bookings' },
    }
  );

  makeRequest('Get Bookings', bookingsRes, {
    'status is 200 or 404': (r) => r.status === 200 || r.status === 404,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(sleepBetween(1, 2));

  // ==========================================================================
  // Test 4: Get Messages (Admin)
  // ==========================================================================

  const messagesRes = http.get(
    `${baseUrl}/admin/messages/${testSalonId}?page=1&limit=10`,
    {
      headers,
      tags: { endpoint: 'messages' },
    }
  );

  makeRequest('Get Messages', messagesRes, {
    'status is 200 or 404': (r) => r.status === 200 || r.status === 404,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(sleepBetween(1, 2));

  // ==========================================================================
  // Test 5: Get Stats (Admin)
  // ==========================================================================

  const now = new Date();
  const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const endDate = now.toISOString();

  const statsRes = http.get(
    `${baseUrl}/admin/stats/${testSalonId}?startDate=${startDate}&endDate=${endDate}`,
    {
      headers,
      tags: { endpoint: 'stats' },
    }
  );

  makeRequest('Get Stats', statsRes, {
    'status is 200 or 404': (r) => r.status === 200 || r.status === 404,
    'response time < 1000ms': (r) => r.timings.duration < 1000,
  });

  sleep(sleepBetween(1, 2));

  // ==========================================================================
  // Test 6: Database Metrics (Public)
  // ==========================================================================

  const dbMetricsRes = http.get(`${baseUrl}/metrics/database`, {
    tags: { endpoint: 'db_metrics' },
  });

  makeRequest('Database Metrics', dbMetricsRes, {
    'status is 200': (r) => r.status === 200,
    'response time < 300ms': (r) => r.timings.duration < 300,
  });

  sleep(sleepBetween(1, 3));

  // ==========================================================================
  // Test 7: Prometheus Metrics (Public)
  // ==========================================================================

  const metricsRes = http.get(`${baseUrl}/metrics`, {
    tags: { endpoint: 'prometheus_metrics' },
  });

  makeRequest('Prometheus Metrics', metricsRes, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(sleepBetween(2, 4));
}

// =============================================================================
// TEARDOWN
// =============================================================================

export function teardown(data) {
  logTestEnd('API Load Test');
}

// =============================================================================
// RESULTS HANDLING
// =============================================================================

export function handleSummary(data) {
  console.log('\n📊 Generating reports...');

  return {
    './results/api-test-summary.html': htmlReport(data),
    './results/api-test-summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}
