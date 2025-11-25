// =============================================================================
// DATABASE LOAD TEST
// =============================================================================
// Tests database query performance under load
// Focus: Complex queries, aggregations, concurrent access
// Pattern: 50 → 200 queries concurrent
// =============================================================================

import http from 'k6/http';
import { sleep, check } from 'k6';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import { config } from '../config/config.js';
import {
  makeRequest,
  sleepBetween,
  randomElement,
  logTestStart,
  logTestEnd,
} from '../utils/helpers.js';

// =============================================================================
// TEST CONFIGURATION
// =============================================================================

export const options = {
  stages: config.loadPatterns.database.stages,

  thresholds: {
    http_req_duration: [
      `p(95)<${config.thresholds.database.p95}`, // P95 < 100ms
      `p(99)<${config.thresholds.database.p99}`, // P99 < 200ms
    ],
    http_req_failed: [`rate<${config.thresholds.database.errorRate}`], // < 0.5%

    // Per-endpoint thresholds
    'http_req_duration{endpoint:bookings_list}': ['p(95)<150'],
    'http_req_duration{endpoint:messages_list}': ['p(95)<150'],
    'http_req_duration{endpoint:stats}': ['p(95)<500'],
    'http_req_duration{endpoint:ai_analytics}': ['p(95)<800'],

    // Check connection pool isn't exhausted
    'http_req_failed{endpoint:bookings_list}': ['rate<0.001'],

    checks: ['rate>0.995'], // 99.5% checks pass
  },

  tags: {
    test_type: 'database_load_test',
  },
};

// =============================================================================
// SETUP
// =============================================================================

export function setup() {
  logTestStart('Database Load Test');

  const baseUrl = config.baseUrl;
  const adminToken = config.adminToken;

  console.log(`📍 Base URL: ${baseUrl}`);
  console.log(`🗄️  Testing database query performance`);
  console.log(`👥 Load pattern: ${JSON.stringify(config.loadPatterns.database.stages)}`);

  return {
    baseUrl,
    adminToken,
    testSalonId: config.testSalonId,
  };
}

// =============================================================================
// MAIN TEST SCENARIO
// =============================================================================

export default function (data) {
  const { baseUrl, adminToken, testSalonId } = data;

  const headers = {
    'Content-Type': 'application/json',
    'x-admin-token': adminToken,
  };

  // Random test parameters
  const page = Math.floor(Math.random() * 10) + 1;
  const limit = randomElement([10, 20, 50, 100]);
  const status = randomElement(['pending', 'confirmed', 'completed', 'cancelled', null]);

  // ==========================================================================
  // Test 1: List Bookings (Paginated)
  // ==========================================================================

  let bookingsUrl = `${baseUrl}/admin/bookings/${testSalonId}?page=${page}&limit=${limit}`;
  if (status) {
    bookingsUrl += `&status=${status}`;
  }

  const bookingsRes = http.get(bookingsUrl, {
    headers,
    tags: { endpoint: 'bookings_list' },
  });

  makeRequest('List Bookings', bookingsRes, {
    'status is 200 or 404': (r) => r.status === 200 || r.status === 404,
    'response time < 300ms': (r) => r.timings.duration < 300,
    'has pagination': (r) => {
      if (r.status !== 200) return true;
      try {
        const body = JSON.parse(r.body);
        return body.hasOwnProperty('data') || body.hasOwnProperty('bookings');
      } catch (e) {
        return false;
      }
    },
  });

  sleep(sleepBetween(0.1, 0.5));

  // ==========================================================================
  // Test 2: List Messages (Paginated)
  // ==========================================================================

  const direction = randomElement(['inbound', 'outbound', null]);
  let messagesUrl = `${baseUrl}/admin/messages/${testSalonId}?page=${page}&limit=${limit}`;
  if (direction) {
    messagesUrl += `&direction=${direction}`;
  }

  const messagesRes = http.get(messagesUrl, {
    headers,
    tags: { endpoint: 'messages_list' },
  });

  makeRequest('List Messages', messagesRes, {
    'status is 200 or 404': (r) => r.status === 200 || r.status === 404,
    'response time < 300ms': (r) => r.timings.duration < 300,
  });

  sleep(sleepBetween(0.1, 0.5));

  // ==========================================================================
  // Test 3: Stats Query (Complex Aggregation)
  // ==========================================================================

  const daysBack = randomElement([7, 14, 30, 60, 90]);
  const now = new Date();
  const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000).toISOString();
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
    'is valid JSON': (r) => {
      try {
        JSON.parse(r.body);
        return true;
      } catch (e) {
        return false;
      }
    },
  });

  sleep(sleepBetween(0.2, 0.8));

  // ==========================================================================
  // Test 4: AI Analytics (Complex Query)
  // ==========================================================================

  if (Math.random() < 0.3) {
    // 30% of requests
    const aiStartDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const aiAnalyticsRes = http.get(
      `${baseUrl}/admin/ai/analytics/${testSalonId}?startDate=${aiStartDate}&endDate=${endDate}`,
      {
        headers,
        tags: { endpoint: 'ai_analytics' },
      }
    );

    makeRequest('AI Analytics', aiAnalyticsRes, {
      'status is 200 or 404': (r) => r.status === 200 || r.status === 404,
      'response time < 1500ms': (r) => r.timings.duration < 1500,
    });

    sleep(sleepBetween(0.3, 1));
  }

  // ==========================================================================
  // Test 5: Database Metrics Endpoint
  // ==========================================================================

  const dbMetricsRes = http.get(`${baseUrl}/metrics/database`, {
    tags: { endpoint: 'db_metrics' },
  });

  makeRequest('Database Metrics', dbMetricsRes, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
    'has metrics': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.hasOwnProperty('connections') || body.hasOwnProperty('pool');
      } catch (e) {
        return false;
      }
    },
  });

  sleep(sleepBetween(0.1, 0.3));

  // ==========================================================================
  // Test 6: Concurrent Query Burst (Stress Connection Pool)
  // ==========================================================================

  if (Math.random() < 0.2) {
    // 20% of VUs do burst queries
    const batchRequests = http.batch([
      ['GET', `${baseUrl}/admin/bookings/${testSalonId}?page=1&limit=10`, null, { headers }],
      ['GET', `${baseUrl}/admin/messages/${testSalonId}?page=1&limit=10`, null, { headers }],
      ['GET', `${baseUrl}/admin/stats/${testSalonId}?startDate=${startDate}&endDate=${endDate}`, null, { headers }],
    ]);

    batchRequests.forEach((res, index) => {
      check(res, {
        [`Batch request ${index} success`]: (r) => r.status === 200 || r.status === 404,
      });
    });
  }

  sleep(sleepBetween(0.5, 1.5));
}

// =============================================================================
// TEARDOWN
// =============================================================================

export function teardown(data) {
  logTestEnd('Database Load Test');

  // Check database health after test
  const healthRes = http.get(`${data.baseUrl}/metrics/database`);

  if (healthRes.status === 200) {
    console.log('✅ Database still healthy after load test');
  } else {
    console.warn(`⚠️  Database health check failed: ${healthRes.status}`);
  }
}

// =============================================================================
// RESULTS HANDLING
// =============================================================================

export function handleSummary(data) {
  console.log('\n📊 Generating reports...');

  // Calculate query statistics
  const stats = data.metrics.http_reqs?.values;
  if (stats) {
    console.log(`\n🗄️  Database Query Performance:`);
    console.log(`Total Queries: ${stats.count}`);
    console.log(`Queries/sec: ${stats.rate.toFixed(2)}`);

    const duration = data.metrics.http_req_duration?.values;
    if (duration) {
      console.log(`P50: ${duration.med.toFixed(2)}ms`);
      console.log(`P95: ${duration['p(95)'].toFixed(2)}ms`);
      console.log(`P99: ${duration['p(99)'].toFixed(2)}ms`);
    }

    const failures = data.metrics.http_req_failed?.values;
    if (failures) {
      console.log(`Error Rate: ${(failures.rate * 100).toFixed(3)}%`);
    }
  }

  return {
    './results/database-test-summary.html': htmlReport(data),
    './results/database-test-summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}
