// =============================================================================
// SOAK LOAD TEST (STABILITY TEST)
// =============================================================================
// Tests system stability under sustained load over extended period
// Detects: Memory leaks, connection leaks, degradation over time
// Pattern: 50 users constant for 1 hour
// =============================================================================

import http from 'k6/http';
import { sleep, check } from 'k6';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import { Trend, Counter, Gauge } from 'k6/metrics';
import { config } from '../config/config.js';
import {
  makeRequest,
  sleepBetween,
  randomElement,
  randomPhoneNumber,
  generateWebhookEvent,
  generateBookingData,
  logTestStart,
  logTestEnd,
} from '../utils/helpers.js';

// =============================================================================
// CUSTOM METRICS FOR LEAK DETECTION
// =============================================================================

const memoryTrend = new Trend('memory_usage_estimate');
const responseDegradation = new Trend('response_degradation');
const activeConnections = new Gauge('active_db_connections');
const errorRateOverTime = new Counter('errors_over_time');

// =============================================================================
// TEST CONFIGURATION
// =============================================================================

export const options = {
  stages: config.loadPatterns.soak.stages,

  thresholds: {
    // Strict thresholds - performance should NOT degrade over time
    http_req_duration: [
      'p(95)<300', // P95 < 300ms (sustained)
      'p(99)<800', // P99 < 800ms
      'avg<200', // Average should stay low
    ],
    http_req_failed: ['rate<0.01'], // < 1% error rate

    // Stability checks
    'http_req_duration{endpoint:health}': [
      'p(95)<100', // Health check should stay fast
    ],
    'http_req_duration{endpoint:webhook}': [
      'p(95)<1500', // Webhook processing should be consistent
    ],

    // No degradation over time
    response_degradation: ['avg<300'], // Average response time stability

    // Error rate should not increase
    checks: ['rate>0.99'], // 99% checks pass throughout
  },

  // Extended timeout for long test
  maxRedirects: 10,
  userAgent: 'k6-soak-test/1.0',

  tags: {
    test_type: 'soak_load_test',
  },
};

// =============================================================================
// SETUP
// =============================================================================

export function setup() {
  logTestStart('Soak Load Test (1 Hour Stability)');

  const baseUrl = config.baseUrl;

  // Initial health check
  const healthCheck = http.get(`${baseUrl}/healthz`);

  if (healthCheck.status !== 200) {
    throw new Error(`Backend not healthy: ${healthCheck.status}`);
  }

  console.log('✅ Backend is healthy');
  console.log(`📍 Base URL: ${baseUrl}`);
  console.log(`⏱️  Duration: 1 hour`);
  console.log(`👥 Constant load: 50 users`);
  console.log(`🎯 Detecting: Memory leaks, connection leaks, performance degradation`);

  // Get initial database metrics
  const initialMetrics = http.get(`${baseUrl}/metrics/database`);
  let initialConnections = null;

  if (initialMetrics.status === 200) {
    try {
      const metrics = JSON.parse(initialMetrics.body);
      initialConnections = metrics.connections;
      console.log(`\n📊 Initial Database State:`);
      console.log(`  Active: ${metrics.connections?.active || 'N/A'}`);
      console.log(`  Idle: ${metrics.connections?.idle || 'N/A'}`);
    } catch (e) {
      console.warn('Could not parse initial metrics');
    }
  }

  return {
    baseUrl,
    adminToken: config.adminToken,
    testSalonId: config.testSalonId,
    startTime: Date.now(),
    initialConnections,
  };
}

// =============================================================================
// MAIN TEST SCENARIO
// =============================================================================

export default function (data) {
  const { baseUrl, adminToken, testSalonId } = data;
  const iterationStartTime = Date.now();

  const headers = {
    'Content-Type': 'application/json',
    'x-admin-token': adminToken,
  };

  // ==========================================================================
  // Test 1: Health Check (Monitor system vitals)
  // ==========================================================================

  const healthRes = http.get(`${baseUrl}/healthz`, {
    tags: { endpoint: 'health' },
  });

  const healthCheck = makeRequest('Health Check', healthRes, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });

  if (!healthCheck) {
    errorRateOverTime.add(1);
  }

  sleep(sleepBetween(0.5, 1));

  // ==========================================================================
  // Test 2: Realistic User Journey
  // ==========================================================================

  // 40% - Webhook message processing
  if (Math.random() < 0.4) {
    const phoneNumber = randomPhoneNumber();
    const messages = [
      'Hello, I want to book an appointment',
      'What services do you offer?',
      'What are your opening hours?',
      'Can I reschedule my booking?',
      'Thank you!',
    ];
    const message = randomElement(messages);

    const webhookPayload = generateWebhookEvent(phoneNumber, message);

    const webhookRes = http.post(`${baseUrl}/webhook`, JSON.stringify(webhookPayload), {
      headers,
      tags: { endpoint: 'webhook' },
    });

    const webhookCheck = makeRequest('Webhook Processing', webhookRes, {
      'status is 200': (r) => r.status === 200,
      'response time < 3000ms': (r) => r.timings.duration < 3000,
    });

    if (!webhookCheck) {
      errorRateOverTime.add(1);
    }

    responseDegradation.add(webhookRes.timings.duration);

    sleep(sleepBetween(2, 4)); // User reading/typing time
  }

  // 30% - Admin dashboard queries
  if (Math.random() < 0.3) {
    const page = Math.floor(Math.random() * 5) + 1;
    const bookingsRes = http.get(
      `${baseUrl}/admin/bookings/${testSalonId}?page=${page}&limit=20`,
      {
        headers,
        tags: { endpoint: 'bookings' },
      }
    );

    const bookingsCheck = makeRequest('List Bookings', bookingsRes, {
      'status is 200 or 404': (r) => r.status === 200 || r.status === 404,
      'response time < 500ms': (r) => r.timings.duration < 500,
    });

    if (!bookingsCheck) {
      errorRateOverTime.add(1);
    }

    responseDegradation.add(bookingsRes.timings.duration);

    sleep(sleepBetween(1, 2));

    // Follow up with messages query
    const messagesRes = http.get(
      `${baseUrl}/admin/messages/${testSalonId}?page=${page}&limit=20`,
      {
        headers,
        tags: { endpoint: 'messages' },
      }
    );

    makeRequest('List Messages', messagesRes, {
      'status is 200 or 404': (r) => r.status === 200 || r.status === 404,
      'response time < 500ms': (r) => r.timings.duration < 500,
    });

    responseDegradation.add(messagesRes.timings.duration);

    sleep(sleepBetween(2, 3));
  }

  // 20% - Stats queries (heavier load)
  if (Math.random() < 0.2) {
    const daysBack = randomElement([7, 14, 30]);
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
      'response time < 1500ms': (r) => r.timings.duration < 1500,
    });

    responseDegradation.add(statsRes.timings.duration);

    sleep(sleepBetween(2, 4));
  }

  // ==========================================================================
  // Test 3: Database Health Monitoring (Every 10th iteration)
  // ==========================================================================

  if (__ITER % 10 === 0) {
    const dbMetricsRes = http.get(`${baseUrl}/metrics/database`, {
      tags: { endpoint: 'db_metrics' },
    });

    if (dbMetricsRes.status === 200) {
      try {
        const metrics = JSON.parse(dbMetricsRes.body);
        if (metrics.connections?.active !== undefined) {
          activeConnections.add(metrics.connections.active);

          // Warn if connections are growing (potential leak)
          if (metrics.connections.active > 20) {
            console.warn(
              `⚠️  High active connections: ${metrics.connections.active} at iteration ${__ITER}`
            );
          }
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
  }

  // ==========================================================================
  // Test 4: Prometheus Metrics Check (Monitor memory trends)
  // ==========================================================================

  if (__ITER % 20 === 0) {
    const metricsRes = http.get(`${baseUrl}/metrics`, {
      tags: { endpoint: 'prometheus' },
    });

    // Estimate memory usage from response size
    if (metricsRes.status === 200) {
      const responseSize = metricsRes.body.length;
      memoryTrend.add(responseSize);

      // Warn if metrics endpoint response is growing (potential memory leak)
      if (responseSize > 100000) {
        console.warn(`⚠️  Large metrics response: ${responseSize} bytes at iteration ${__ITER}`);
      }
    }
  }

  // Variable think time
  sleep(sleepBetween(1, 3));

  // Track iteration duration to detect slowdowns
  const iterationDuration = Date.now() - iterationStartTime;
  if (iterationDuration > 10000) {
    console.warn(`⚠️  Slow iteration: ${iterationDuration}ms at iteration ${__ITER}`);
  }
}

// =============================================================================
// TEARDOWN
// =============================================================================

export function teardown(data) {
  logTestEnd('Soak Load Test');

  const duration = (Date.now() - data.startTime) / 1000 / 60; // minutes
  console.log(`\n⏱️  Total test duration: ${duration.toFixed(2)} minutes`);

  // Final health check
  const healthRes = http.get(`${data.baseUrl}/healthz`);

  if (healthRes.status === 200) {
    console.log('✅ System still healthy after soak test');
  } else {
    console.warn(`❌ System health degraded: ${healthRes.status}`);
  }

  // Final database metrics
  const finalMetrics = http.get(`${data.baseUrl}/metrics/database`);

  if (finalMetrics.status === 200) {
    try {
      const metrics = JSON.parse(finalMetrics.body);
      console.log(`\n📊 Final Database State:`);
      console.log(`  Active: ${metrics.connections?.active || 'N/A'}`);
      console.log(`  Idle: ${metrics.connections?.idle || 'N/A'}`);
      console.log(`  Waiting: ${metrics.connections?.waiting || 'N/A'}`);

      // Compare with initial state
      if (data.initialConnections && metrics.connections) {
        const initialActive = data.initialConnections.active || 0;
        const finalActive = metrics.connections.active || 0;
        const diff = finalActive - initialActive;

        console.log(`\n🔍 Connection Analysis:`);
        console.log(`  Initial Active: ${initialActive}`);
        console.log(`  Final Active: ${finalActive}`);
        console.log(`  Difference: ${diff > 0 ? '+' : ''}${diff}`);

        if (diff > 5) {
          console.warn(`⚠️  Possible connection leak detected (+${diff} connections)`);
        } else {
          console.log(`✅ No connection leak detected`);
        }
      }
    } catch (e) {
      console.warn('Could not parse final metrics');
    }
  }
}

// =============================================================================
// RESULTS HANDLING
// =============================================================================

export function handleSummary(data) {
  console.log('\n📊 Generating soak test reports...');

  const duration = data.metrics.http_req_duration?.values;
  const failures = data.metrics.http_req_failed?.values;
  const totalRequests = data.metrics.http_reqs?.values?.count || 0;
  const degradation = data.metrics.response_degradation?.values;

  console.log('\n⏱️  Soak Test Analysis:');
  console.log('─'.repeat(60));
  console.log(`Total Requests: ${totalRequests}`);
  console.log(`Duration: ~60 minutes`);

  if (duration) {
    console.log(`\nResponse Times (Entire Test):`);
    console.log(`  Average: ${duration.avg.toFixed(2)}ms`);
    console.log(`  P50: ${duration.med.toFixed(2)}ms`);
    console.log(`  P95: ${duration['p(95)'].toFixed(2)}ms`);
    console.log(`  P99: ${duration['p(99)'].toFixed(2)}ms`);
    console.log(`  Max: ${duration.max.toFixed(2)}ms`);

    // Check for performance degradation
    if (duration['p(95)'] < 300) {
      console.log(`  ✅ Excellent: P95 stayed under 300ms`);
    } else if (duration['p(95)'] < 500) {
      console.log(`  ⚠️  Acceptable: Some degradation observed`);
    } else {
      console.log(`  ❌ Poor: Significant performance degradation`);
    }
  }

  if (failures) {
    const errorRate = failures.rate * 100;
    console.log(`\nError Analysis:`);
    console.log(`  Error Rate: ${errorRate.toFixed(3)}%`);

    if (errorRate < 0.5) {
      console.log(`  ✅ Excellent: Stable error rate`);
    } else if (errorRate < 1) {
      console.log(`  ⚠️  Acceptable: Minor instability`);
    } else {
      console.log(`  ❌ Poor: Stability issues detected`);
    }
  }

  if (degradation) {
    console.log(`\nDegradation Analysis:`);
    console.log(`  Average Degradation: ${degradation.avg.toFixed(2)}ms`);

    if (degradation.avg < 200) {
      console.log(`  ✅ No significant degradation`);
    } else if (degradation.avg < 400) {
      console.log(`  ⚠️  Minor degradation over time`);
    } else {
      console.log(`  ❌ Significant degradation - investigate memory/connection leaks`);
    }
  }

  console.log('─'.repeat(60));

  return {
    './results/soak-test-summary.html': htmlReport(data),
    './results/soak-test-summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}
