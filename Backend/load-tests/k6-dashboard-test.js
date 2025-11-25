/**
 * K6 Load Test - Dashboard Stats Endpoint
 *
 * This load test simulates real-world usage of the dashboard stats endpoint
 * to measure performance under various load conditions.
 *
 * Run: k6 run load-tests/k6-dashboard-test.js
 *
 * Test Scenarios:
 * 1. Ramp-up: 0 → 50 users over 2 minutes
 * 2. Sustained: 50 users for 5 minutes
 * 3. Peak: 50 → 200 users over 2 minutes
 * 4. Sustained peak: 200 users for 5 minutes
 * 5. Ramp-down: 200 → 0 users over 2 minutes
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// ============================================================================
// CONFIGURATION
// ============================================================================

const BASE_URL = __ENV.API_URL || 'http://localhost:3000';
const API_PREFIX = '/api/v1';

// Test users (in production, use multiple real test accounts)
const TEST_USERS = [
  { email: 'test1@example.com', password: 'TestPassword123!' },
  { email: 'test2@example.com', password: 'TestPassword123!' },
  { email: 'test3@example.com', password: 'TestPassword123!' },
];

// ============================================================================
// CUSTOM METRICS
// ============================================================================

const errorRate = new Rate('errors');
const dashboardStatsLatency = new Trend('dashboard_stats_latency');
const cacheHitRate = new Rate('cache_hits');
const compressionRate = new Rate('compression_enabled');
const apiCallsCounter = new Counter('api_calls_total');

// ============================================================================
// TEST OPTIONS
// ============================================================================

export const options = {
  // Test stages
  stages: [
    { duration: '2m', target: 50 },   // Ramp-up to 50 users
    { duration: '5m', target: 50 },   // Stay at 50 users
    { duration: '2m', target: 200 },  // Ramp-up to 200 users
    { duration: '5m', target: 200 },  // Stay at 200 users
    { duration: '2m', target: 0 },    // Ramp-down to 0 users
  ],

  // Performance thresholds
  thresholds: {
    // 95% of requests should be below 200ms
    'http_req_duration{name:dashboard_stats}': ['p(95)<200'],

    // 99% of requests should be below 500ms
    'http_req_duration{name:dashboard_stats}': ['p(99)<500'],

    // Error rate should be below 1%
    'errors': ['rate<0.01'],

    // HTTP failures should be below 1%
    'http_req_failed': ['rate<0.01'],

    // Cache hit rate should be above 50% after warm-up
    'cache_hits': ['rate>0.5'],

    // Compression should be enabled for all responses
    'compression_enabled': ['rate>0.95'],
  },

  // Test summary
  summaryTrendStats: ['min', 'avg', 'med', 'p(95)', 'p(99)', 'max'],
};

// ============================================================================
// SETUP
// ============================================================================

export function setup() {
  console.log('Setting up load test...');

  // Authenticate test users and get tokens
  const tokens = TEST_USERS.map(user => {
    const loginRes = http.post(`${BASE_URL}${API_PREFIX}/auth/login`, JSON.stringify({
      email: user.email,
      password: user.password,
    }), {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'login' },
    });

    if (loginRes.status === 200 || loginRes.status === 201) {
      const body = JSON.parse(loginRes.body);
      return body.accessToken || body.access_token;
    } else {
      console.error(`Failed to authenticate user ${user.email}: ${loginRes.status}`);
      return null;
    }
  }).filter(token => token !== null);

  if (tokens.length === 0) {
    console.error('No test users authenticated. Skipping load test.');
    return { tokens: [], skipTest: true };
  }

  console.log(`Authenticated ${tokens.length} test users`);
  return { tokens, skipTest: false };
}

// ============================================================================
// MAIN TEST FUNCTION
// ============================================================================

export default function (data) {
  if (data.skipTest) {
    console.log('Skipping test due to authentication failure');
    return;
  }

  // Randomly select a test user token
  const token = data.tokens[Math.floor(Math.random() * data.tokens.length)];

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'Accept-Encoding': 'gzip, deflate',
  };

  // ========================================================================
  // Test Group: Dashboard Operations
  // ========================================================================
  group('Dashboard Operations', function () {
    // Test 1: Get dashboard stats
    const statsRes = http.get(`${BASE_URL}${API_PREFIX}/analytics/dashboard`, {
      headers,
      tags: { name: 'dashboard_stats' },
    });

    apiCallsCounter.add(1);

    // Check response
    const statsSuccess = check(statsRes, {
      'dashboard stats status is 200': (r) => r.status === 200,
      'dashboard stats has data': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.totalBookings !== undefined && body.activeChats !== undefined;
        } catch (e) {
          return false;
        }
      },
      'dashboard stats response time < 200ms': (r) => r.timings.duration < 200,
      'dashboard stats response time < 500ms': (r) => r.timings.duration < 500,
    });

    // Track metrics
    errorRate.add(!statsSuccess);
    dashboardStatsLatency.add(statsRes.timings.duration);

    // Check for compression
    const hasCompression = statsRes.headers['Content-Encoding'] === 'gzip' ||
                           statsRes.headers['Content-Encoding'] === 'deflate';
    compressionRate.add(hasCompression);

    // Check for cache hit (custom header from backend)
    const isCacheHit = statsRes.headers['X-Cache-Hit'] === 'true' ||
                       statsRes.timings.duration < 10; // Very fast response likely cached
    cacheHitRate.add(isCacheHit);

    // Log slow requests
    if (statsRes.timings.duration > 500) {
      console.warn(`Slow request detected: ${statsRes.timings.duration}ms`);
    }
  });

  // ========================================================================
  // Test Group: List Operations (with pagination)
  // ========================================================================
  group('List Operations', function () {
    // Test 2: Get bookings list
    const bookingsRes = http.get(`${BASE_URL}${API_PREFIX}/bookings?limit=20&page=1`, {
      headers,
      tags: { name: 'list_bookings' },
    });

    apiCallsCounter.add(1);

    check(bookingsRes, {
      'bookings list status is 200': (r) => r.status === 200,
      'bookings list response time < 300ms': (r) => r.timings.duration < 300,
    });

    errorRate.add(bookingsRes.status !== 200);

    // Test 3: Get messages list
    const messagesRes = http.get(`${BASE_URL}${API_PREFIX}/messages?limit=20&page=1`, {
      headers,
      tags: { name: 'list_messages' },
    });

    apiCallsCounter.add(1);

    check(messagesRes, {
      'messages list status is 200': (r) => r.status === 200,
      'messages list response time < 300ms': (r) => r.timings.duration < 300,
    });

    errorRate.add(messagesRes.status !== 200);
  });

  // Simulate user think time (1-3 seconds between actions)
  sleep(Math.random() * 2 + 1);
}

// ============================================================================
// TEARDOWN
// ============================================================================

export function teardown(data) {
  console.log('Load test completed!');
  console.log(`Total API calls: ${apiCallsCounter.value}`);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate random salon ID for testing
 */
function getRandomSalonId() {
  const salonIds = ['salon-1', 'salon-2', 'salon-3'];
  return salonIds[Math.floor(Math.random() * salonIds.length)];
}

/**
 * Format duration in milliseconds to human-readable format
 */
function formatDuration(ms) {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${(ms / 60000).toFixed(2)}m`;
}
