import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const apiDuration = new Trend('api_duration');
const cacheHits = new Counter('cache_hits');
const cacheMisses = new Counter('cache_misses');

export const options = {
  scenarios: {
    // Scenario 1: Constant load for baseline
    constant_load: {
      executor: 'constant-vus',
      vus: 50,
      duration: '5m',
      tags: { scenario: 'constant' },
    },
    // Scenario 2: Ramping load to find breaking point
    ramping_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 200 },
        { duration: '2m', target: 300 },
        { duration: '5m', target: 300 },
        { duration: '2m', target: 0 },
      ],
      tags: { scenario: 'ramping' },
      startTime: '5m',
    },
    // Scenario 3: Spike test
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 50,
      stages: [
        { duration: '10s', target: 500 },  // Spike to 500 users
        { duration: '1m', target: 500 },   // Hold spike
        { duration: '10s', target: 50 },   // Drop back
      ],
      tags: { scenario: 'spike' },
      startTime: '16m',
    },
  },
  thresholds: {
    // Overall thresholds
    'http_req_duration': ['p(95)<200', 'p(99)<500'],
    'http_req_failed': ['rate<0.01'],

    // Per-endpoint thresholds
    'http_req_duration{endpoint:stats}': ['p(95)<150'],
    'http_req_duration{endpoint:bookings}': ['p(95)<200'],
    'http_req_duration{endpoint:health}': ['p(95)<50'],

    // Scenario-specific thresholds
    'http_req_duration{scenario:constant}': ['p(95)<200'],
    'http_req_duration{scenario:ramping}': ['p(95)<300'],
    'http_req_duration{scenario:spike}': ['p(95)<500'],

    // Custom metrics
    'errors': ['rate<0.05'],
    'api_duration': ['p(95)<200'],
  },
};

const BASE_URL = __ENV.API_BASE || 'http://localhost:4000';
const ADMIN_TOKEN = __ENV.ADMIN_TOKEN || 'test-admin-token';

export function setup() {
  console.log(`Starting API load test against ${BASE_URL}`);

  // Verify API is healthy
  const health = http.get(`${BASE_URL}/healthz`);
  if (health.status !== 200) {
    throw new Error(`API not healthy: ${health.status}`);
  }

  console.log('API health check passed');
  return { startTime: new Date() };
}

export default function () {
  const salonId = `salon-${(__VU % 10) + 1}`; // Simulate 10 salons

  group('Health Check', function () {
    const res = http.get(`${BASE_URL}/healthz`, {
      tags: { endpoint: 'health' }
    });

    check(res, {
      'health check is 200': (r) => r.status === 200,
      'health check has uptime': (r) => r.json('uptime') !== undefined,
    });
  });

  sleep(0.5);

  group('Admin API - Stats', function () {
    const res = http.get(`${BASE_URL}/admin/stats?salonId=${salonId}`, {
      headers: { 'x-admin-token': ADMIN_TOKEN },
      tags: { endpoint: 'stats' }
    });

    const success = check(res, {
      'stats returns 200': (r) => r.status === 200,
      'stats has bookings count': (r) => {
        try {
          const data = JSON.parse(r.body);
          return data.bookings !== undefined;
        } catch (e) {
          return false;
        }
      },
      'stats response time < 200ms': (r) => r.timings.duration < 200,
    });

    if (!success) errorRate.add(1);
    else errorRate.add(0);

    apiDuration.add(res.timings.duration);

    // Check for cache hit
    if (res.headers['X-Cache-Hit']) {
      cacheHits.add(1);
    } else {
      cacheMisses.add(1);
    }
  });

  sleep(0.5);

  group('Admin API - Bookings List', function () {
    const page = Math.floor(Math.random() * 5) + 1;
    const res = http.get(
      `${BASE_URL}/admin/bookings?salonId=${salonId}&page=${page}&limit=20`,
      {
        headers: { 'x-admin-token': ADMIN_TOKEN },
        tags: { endpoint: 'bookings' }
      }
    );

    const success = check(res, {
      'bookings returns 200': (r) => r.status === 200,
      'bookings has data array': (r) => {
        try {
          const data = JSON.parse(r.body);
          return Array.isArray(data) || Array.isArray(data.data);
        } catch (e) {
          return false;
        }
      },
      'bookings response time < 250ms': (r) => r.timings.duration < 250,
    });

    if (!success) errorRate.add(1);
    else errorRate.add(0);
  });

  sleep(1);

  group('Admin API - AI Analytics', function () {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    const res = http.get(
      `${BASE_URL}/admin/ai/analytics/${salonId}?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
      {
        headers: { 'x-admin-token': ADMIN_TOKEN },
        tags: { endpoint: 'ai-analytics' }
      }
    );

    check(res, {
      'ai analytics returns 200': (r) => r.status === 200,
      'ai analytics response time < 500ms': (r) => r.timings.duration < 500,
    });
  });

  // Simulate realistic user behavior
  sleep(Math.random() * 2 + 1); // 1-3 seconds think time
}

export function teardown(data) {
  const endTime = new Date();
  const duration = (endTime - new Date(data.startTime)) / 1000;
  console.log(`Load test completed in ${duration.toFixed(2)} seconds`);
}
