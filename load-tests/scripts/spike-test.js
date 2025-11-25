// =============================================================================
// SPIKE LOAD TEST
// =============================================================================
// Tests system behavior under sudden traffic spike
// Simulates: Product launch, viral content, marketing campaign spike
// Pattern: 10 → 500 users in 1 minute, hold for 2 minutes
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
  randomPhoneNumber,
  generateWebhookEvent,
  logTestStart,
  logTestEnd,
} from '../utils/helpers.js';

// =============================================================================
// TEST CONFIGURATION
// =============================================================================

export const options = {
  stages: config.loadPatterns.spike.stages,

  thresholds: {
    // During spike, we accept higher latency but no errors
    http_req_duration: [
      'p(95)<3000', // P95 < 3s (relaxed during spike)
      'p(99)<5000', // P99 < 5s
    ],
    http_req_failed: ['rate<0.05'], // < 5% error rate (critical: system stays up)

    // Per-endpoint thresholds
    'http_req_duration{endpoint:health}': ['p(95)<500'],
    'http_req_duration{endpoint:webhook}': ['p(95)<3000'],

    // System stability checks
    'http_req_failed{endpoint:health}': ['rate<0.01'], // Health check should always work
    checks: ['rate>0.90'], // 90% checks pass (relaxed for spike)
  },

  // Increase timeout for spike conditions
  httpDebug: 'full',
  insecureSkipTLSVerify: true,

  tags: {
    test_type: 'spike_load_test',
  },
};

// =============================================================================
// SETUP
// =============================================================================

export function setup() {
  logTestStart('Spike Load Test');

  const baseUrl = config.baseUrl;

  // Verify system is healthy before spike
  const healthCheck = http.get(`${baseUrl}/healthz`);

  if (healthCheck.status !== 200) {
    console.warn(`⚠️  System not healthy before spike: ${healthCheck.status}`);
  } else {
    console.log('✅ System healthy before spike test');
  }

  console.log(`📍 Base URL: ${baseUrl}`);
  console.log(`⚡ Spike pattern: ${JSON.stringify(config.loadPatterns.spike.stages)}`);
  console.log(`🎯 Target: 500 concurrent users`);

  return {
    baseUrl,
    adminToken: config.adminToken,
    testSalonId: config.testSalonId,
    startTime: Date.now(),
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

  // ==========================================================================
  // Test 1: Health Check (Fast endpoint)
  // ==========================================================================

  const healthRes = http.get(`${baseUrl}/healthz`, {
    tags: { endpoint: 'health' },
    timeout: '5s',
  });

  makeRequest('Health Check', healthRes, {
    'status is 200': (r) => r.status === 200,
    'response time < 1000ms': (r) => r.timings.duration < 1000,
  });

  sleep(sleepBetween(0.2, 0.5));

  // ==========================================================================
  // Test 2: Mixed Endpoint Access (Realistic traffic)
  // ==========================================================================

  const endpointChoice = Math.random();

  if (endpointChoice < 0.4) {
    // 40% - Webhook traffic (most common during spike)
    const phoneNumber = randomPhoneNumber();
    const messages = [
      'Hi, I want to book an appointment',
      'What services do you offer?',
      'What are your prices?',
      'Are you open today?',
      'Can I cancel my booking?',
    ];
    const message = randomElement(messages);

    const webhookPayload = generateWebhookEvent(phoneNumber, message);

    const webhookRes = http.post(`${baseUrl}/webhook`, JSON.stringify(webhookPayload), {
      headers,
      tags: { endpoint: 'webhook' },
      timeout: '10s',
    });

    makeRequest('Webhook Message', webhookRes, {
      'status is 200': (r) => r.status === 200,
      'response time < 5000ms': (r) => r.timings.duration < 5000,
    });
  } else if (endpointChoice < 0.7) {
    // 30% - Read operations (bookings, messages)
    const readEndpoint = randomElement([
      `/admin/bookings/${testSalonId}?page=1&limit=10`,
      `/admin/messages/${testSalonId}?page=1&limit=10`,
    ]);

    const readRes = http.get(`${baseUrl}${readEndpoint}`, {
      headers,
      tags: { endpoint: 'read' },
      timeout: '5s',
    });

    makeRequest('Read Operation', readRes, {
      'status is 200 or 404': (r) => r.status === 200 || r.status === 404,
      'response time < 3000ms': (r) => r.timings.duration < 3000,
    });
  } else {
    // 30% - Stats/Analytics (heavier queries)
    const now = new Date();
    const startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = now.toISOString();

    const statsRes = http.get(
      `${baseUrl}/admin/stats/${testSalonId}?startDate=${startDate}&endDate=${endDate}`,
      {
        headers,
        tags: { endpoint: 'stats' },
        timeout: '10s',
      }
    );

    makeRequest('Stats Query', statsRes, {
      'status is 200 or 404': (r) => r.status === 200 || r.status === 404,
      'response time < 5000ms': (r) => r.timings.duration < 5000,
    });
  }

  sleep(sleepBetween(0.5, 1.5));

  // ==========================================================================
  // Test 3: Database Metrics Check (Monitor system health)
  // ==========================================================================

  if (Math.random() < 0.1) {
    // 10% check database metrics
    const dbMetricsRes = http.get(`${baseUrl}/metrics/database`, {
      tags: { endpoint: 'db_metrics' },
      timeout: '3s',
    });

    makeRequest('Database Metrics', dbMetricsRes, {
      'status is 200': (r) => r.status === 200,
      'has pool info': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.hasOwnProperty('connections') || body.hasOwnProperty('pool');
        } catch (e) {
          return false;
        }
      },
    });
  }

  // Minimal think time during spike
  sleep(sleepBetween(0.3, 0.8));
}

// =============================================================================
// TEARDOWN
// =============================================================================

export function teardown(data) {
  logTestEnd('Spike Load Test');

  // Check system health after spike
  const healthRes = http.get(`${data.baseUrl}/healthz`);

  if (healthRes.status === 200) {
    console.log('✅ System recovered successfully after spike');
  } else {
    console.warn(`⚠️  System health degraded after spike: ${healthRes.status}`);
  }

  // Check database health
  const dbMetricsRes = http.get(`${data.baseUrl}/metrics/database`);

  if (dbMetricsRes.status === 200) {
    try {
      const metrics = JSON.parse(dbMetricsRes.body);
      console.log('\n🗄️  Database State After Spike:');
      if (metrics.connections) {
        console.log(`  Active Connections: ${metrics.connections.active || 'N/A'}`);
        console.log(`  Idle Connections: ${metrics.connections.idle || 'N/A'}`);
        console.log(`  Waiting Connections: ${metrics.connections.waiting || 'N/A'}`);
      }
    } catch (e) {
      console.warn('Could not parse database metrics');
    }
  }

  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`\n⏱️  Total test duration: ${duration.toFixed(2)}s`);
}

// =============================================================================
// RESULTS HANDLING
// =============================================================================

export function handleSummary(data) {
  console.log('\n📊 Generating spike test reports...');

  // Analyze spike performance
  const duration = data.metrics.http_req_duration?.values;
  const failures = data.metrics.http_req_failed?.values;
  const totalRequests = data.metrics.http_reqs?.values?.count || 0;

  console.log('\n⚡ Spike Test Analysis:');
  console.log('─'.repeat(60));
  console.log(`Total Requests: ${totalRequests}`);

  if (duration) {
    console.log(`\nResponse Times During Spike:`);
    console.log(`  P50: ${duration.med.toFixed(2)}ms`);
    console.log(`  P95: ${duration['p(95)'].toFixed(2)}ms`);
    console.log(`  P99: ${duration['p(99)'].toFixed(2)}ms`);
    console.log(`  Max: ${duration.max.toFixed(2)}ms`);
  }

  if (failures) {
    const errorRate = failures.rate * 100;
    const errorCount = failures.passes || 0;
    console.log(`\nError Analysis:`);
    console.log(`  Error Rate: ${errorRate.toFixed(3)}%`);
    console.log(`  Failed Requests: ${errorCount}`);

    if (errorRate < 1) {
      console.log('  ✅ Excellent: System handled spike with <1% errors');
    } else if (errorRate < 5) {
      console.log('  ⚠️  Acceptable: System survived spike with some degradation');
    } else {
      console.log('  ❌ Poor: System struggled under spike load');
    }
  }

  console.log('─'.repeat(60));

  return {
    './results/spike-test-summary.html': htmlReport(data),
    './results/spike-test-summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}
