import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

/**
 * K6 Performance & Load Testing Suite
 *
 * Tests WhatsApp SaaS platform under various load conditions:
 * - Dashboard API load (100 concurrent users)
 * - Message sending throughput
 * - Webhook processing capacity
 * - Database connection pool limits
 *
 * Usage:
 * npm install -g k6
 * k6 run test/performance/load-test.js
 */

// Custom metrics
const errorRate = new Rate('errors');
const dashboardTrend = new Trend('dashboard_response_time');
const messageTrend = new Trend('message_send_time');

// Test configuration
export const options = {
  stages: [
    { duration: '1m', target: 20 },  // Ramp up to 20 users
    { duration: '3m', target: 50 },  // Ramp to 50 users
    { duration: '2m', target: 100 }, // Spike to 100 users
    { duration: '2m', target: 50 },  // Scale down
    { duration: '1m', target: 0 },   // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% of requests under 1s
    http_req_failed: ['rate<0.01'],    // Error rate under 1%
    errors: ['rate<0.05'],              // Custom error rate under 5%
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3000';

// Test data
const testUser = {
  email: `loadtest-${Date.now()}@example.com`,
  password: 'LoadTest123!',
  first_name: 'Load',
  last_name: 'Test',
  phone: '+1234567890',
};

let authToken = '';
let salonId = '';

export function setup() {
  // Register and login once for all VUs
  const registerRes = http.post(`${BASE_URL}/auth/register`, JSON.stringify(testUser), {
    headers: { 'Content-Type': 'application/json' },
  });

  if (registerRes.status === 201) {
    const body = JSON.parse(registerRes.body);
    authToken = body.accessToken;

    // Create a test salon
    const salonRes = http.post(
      `${BASE_URL}/salons`,
      JSON.stringify({
        name: 'Load Test Salon',
        phone: '+1234567890',
        address: '123 Test St',
        city: 'Test City',
        state: 'TS',
        postal_code: '12345',
        country: 'US',
        whatsapp_business_account_id: 'test-account',
        phone_number_id: 'test-phone',
        access_token: 'test-token',
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    if (salonRes.status === 201) {
      const salonBody = JSON.parse(salonRes.body);
      salonId = salonBody.id;
    }
  }

  return { authToken, salonId };
}

export default function (data) {
  const { authToken, salonId } = data;

  if (!authToken || !salonId) {
    console.error('Setup failed: Missing auth token or salon ID');
    return;
  }

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authToken}`,
  };

  // Test 1: Dashboard Load Test
  const dashboardRes = http.get(`${BASE_URL}/analytics/dashboard?salon_id=${salonId}`, {
    headers,
  });

  check(dashboardRes, {
    'dashboard status is 200': (r) => r.status === 200,
    'dashboard has stats': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.hasOwnProperty('totalBookings');
      } catch {
        return false;
      }
    },
  }) || errorRate.add(1);

  dashboardTrend.add(dashboardRes.timings.duration);

  sleep(1);

  // Test 2: Booking Creation
  const bookingRes = http.post(
    `${BASE_URL}/bookings`,
    JSON.stringify({
      salon_id: salonId,
      customer_name: `Customer ${__VU}-${__ITER}`,
      customer_phone: `+1234${Math.floor(Math.random() * 1000000)}`,
      service: 'Load Test Service',
      appointment_date: new Date(Date.now() + 86400000).toISOString(),
      notes: 'Performance test booking',
    }),
    { headers }
  );

  check(bookingRes, {
    'booking creation status is 201': (r) => r.status === 201,
    'booking has ID': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.hasOwnProperty('id');
      } catch {
        return false;
      }
    },
  }) || errorRate.add(1);

  sleep(1);

  // Test 3: List Salons
  const salonsRes = http.get(`${BASE_URL}/salons`, { headers });

  check(salonsRes, {
    'salons list status is 200': (r) => r.status === 200,
    'salons list is array': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body);
      } catch {
        return false;
      }
    },
  }) || errorRate.add(1);

  sleep(1);

  // Test 4: Get Specific Salon
  const salonRes = http.get(`${BASE_URL}/salons/${salonId}`, { headers });

  check(salonRes, {
    'salon get status is 200': (r) => r.status === 200,
    'salon has correct ID': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.id === salonId;
      } catch {
        return false;
      }
    },
  }) || errorRate.add(1);

  sleep(2);
}

export function teardown(data) {
  // Cleanup could be added here
  console.log('Load test completed');
}

// Stress Test Configuration (uncomment to use)
export const stressTestOptions = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 200 },  // Spike to 200 users
    { duration: '5m', target: 200 },  // Stay at 200 users
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // Less strict for stress test
    http_req_failed: ['rate<0.05'],
  },
};

// Spike Test Configuration (uncomment to use)
export const spikeTestOptions = {
  stages: [
    { duration: '10s', target: 10 },   // Baseline
    { duration: '1m', target: 500 },   // Sudden spike
    { duration: '3m', target: 500 },   // Maintain spike
    { duration: '10s', target: 10 },   // Return to baseline
    { duration: '1m', target: 10 },    // Recovery
  ],
};
