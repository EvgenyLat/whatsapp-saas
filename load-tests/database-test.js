import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

// Metrics for database query performance
const dbQueryTime = new Trend('db_query_time');
const dbConnectionTime = new Trend('db_connection_time');

export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp to 50 concurrent DB users
    { duration: '5m', target: 100 },  // Sustain 100 concurrent queries
    { duration: '2m', target: 200 },  // Stress test with 200
    { duration: '1m', target: 0 },    // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<300'], // Database queries under 300ms
    'db_query_time': ['p(95)<100'],     // Actual DB query time under 100ms
    'db_connection_time': ['p(50)<20'], // Connection pooling efficient
  },
};

const BASE_URL = __ENV.API_BASE || 'http://localhost:4000';
const ADMIN_TOKEN = __ENV.ADMIN_TOKEN || 'test-admin-token';

export default function () {
  const salonId = `salon-${(__VU % 10) + 1}`;

  // Test 1: Simple query (should hit index)
  const bookingsRes = http.get(
    `${BASE_URL}/admin/bookings?salonId=${salonId}&status=CONFIRMED`,
    {
      headers: { 'x-admin-token': ADMIN_TOKEN },
      tags: { query_type: 'simple' }
    }
  );

  check(bookingsRes, {
    'simple query successful': (r) => r.status === 200,
    'simple query fast': (r) => r.timings.duration < 100,
  });

  // Extract query time from response headers (if instrumented)
  if (bookingsRes.headers['X-DB-Query-Time']) {
    dbQueryTime.add(parseFloat(bookingsRes.headers['X-DB-Query-Time']));
  }

  sleep(0.5);

  // Test 2: Complex aggregation query
  const statsRes = http.get(
    `${BASE_URL}/admin/stats?salonId=${salonId}`,
    {
      headers: { 'x-admin-token': ADMIN_TOKEN },
      tags: { query_type: 'aggregation' }
    }
  );

  check(statsRes, {
    'aggregation query successful': (r) => r.status === 200,
    'aggregation query acceptable': (r) => r.timings.duration < 300,
  });

  sleep(0.5);

  // Test 3: Join query (conversation with messages)
  const analyticsRes = http.get(
    `${BASE_URL}/admin/ai/conversations/${salonId}`,
    {
      headers: { 'x-admin-token': ADMIN_TOKEN },
      tags: { query_type: 'join' }
    }
  );

  check(analyticsRes, {
    'join query successful': (r) => r.status === 200,
    'join query acceptable': (r) => r.timings.duration < 500,
  });

  sleep(1);

  // Test 4: Write operation (simulate booking creation)
  // Note: This is read-only test, but you could add POST tests here

  sleep(Math.random() * 2);
}

export function handleSummary(data) {
  return {
    'database-test-results.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';
  const enableColors = options.enableColors || false;

  let summary = '\n' + indent + 'Database Load Test Summary\n';
  summary += indent + '========================\n\n';

  // Extract key metrics
  const metrics = data.metrics;

  if (metrics.http_req_duration) {
    summary += indent + 'HTTP Request Duration:\n';
    summary += indent + `  p(50): ${metrics.http_req_duration.values.p50.toFixed(2)}ms\n`;
    summary += indent + `  p(95): ${metrics.http_req_duration.values.p95.toFixed(2)}ms\n`;
    summary += indent + `  p(99): ${metrics.http_req_duration.values.p99.toFixed(2)}ms\n\n`;
  }

  if (metrics.db_query_time) {
    summary += indent + 'Database Query Time:\n';
    summary += indent + `  p(50): ${metrics.db_query_time.values.p50.toFixed(2)}ms\n`;
    summary += indent + `  p(95): ${metrics.db_query_time.values.p95.toFixed(2)}ms\n\n`;
  }

  // Check thresholds
  const thresholds = data.thresholds || {};
  let passedCount = 0;
  let failedCount = 0;

  for (const [name, threshold] of Object.entries(thresholds)) {
    if (threshold.ok) passedCount++;
    else failedCount++;
  }

  summary += indent + `Thresholds: ${passedCount} passed, ${failedCount} failed\n`;

  return summary;
}
