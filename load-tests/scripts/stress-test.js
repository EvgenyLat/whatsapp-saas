// =============================================================================
// STRESS LOAD TEST (BREAKING POINT)
// =============================================================================
// Tests system behavior beyond normal capacity to find breaking point
// Gradually increases load until system starts failing
// Pattern: 50 → 100 → 200 → 300 → 400 → 500 users
// =============================================================================

import http from 'k6/http';
import { sleep, check } from 'k6';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import { Counter, Rate, Trend } from 'k6/metrics';
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
// CUSTOM METRICS FOR BREAKING POINT ANALYSIS
// =============================================================================

const stageErrors = new Counter('stage_errors');
const stageRequests = new Counter('stage_requests');
const breakingPointReached = new Rate('breaking_point_reached');
const recoverySuccess = new Rate('recovery_success');

// Track performance by stage
const stage1Performance = new Trend('stage_1_performance'); // 50 users
const stage2Performance = new Trend('stage_2_performance'); // 100 users
const stage3Performance = new Trend('stage_3_performance'); // 200 users
const stage4Performance = new Trend('stage_4_performance'); // 300 users
const stage5Performance = new Trend('stage_5_performance'); // 400 users
const stage6Performance = new Trend('stage_6_performance'); // 500 users

// =============================================================================
// TEST CONFIGURATION
// =============================================================================

export const options = {
  stages: config.loadPatterns.stress.stages,

  thresholds: {
    // Relaxed thresholds - we EXPECT failures at high load
    http_req_duration: [
      'p(95)<5000', // P95 < 5s (very relaxed)
    ],
    http_req_failed: ['rate<0.50'], // < 50% error rate (we expect high errors at peak)

    // Track when system starts breaking
    breaking_point_reached: ['rate<1'], // Should reach breaking point

    // Health endpoint should still work (critical)
    'http_req_failed{endpoint:health}': ['rate<0.20'], // Health can fail up to 20%

    // At least some checks should pass
    checks: ['rate>0.50'], // 50% checks pass (very relaxed)
  },

  // Increase limits for stress testing
  noConnectionReuse: false,
  noVUConnectionReuse: false,

  tags: {
    test_type: 'stress_load_test',
  },
};

// =============================================================================
// SETUP
// =============================================================================

export function setup() {
  logTestStart('Stress Load Test (Breaking Point)');

  const baseUrl = config.baseUrl;

  // Verify system is healthy before stress
  const healthCheck = http.get(`${baseUrl}/healthz`);

  if (healthCheck.status !== 200) {
    console.warn(`⚠️  System not healthy before stress test: ${healthCheck.status}`);
  } else {
    console.log('✅ System healthy before stress test');
  }

  console.log(`📍 Base URL: ${baseUrl}`);
  console.log(`🎯 Goal: Find system breaking point`);
  console.log(`📈 Load pattern: ${JSON.stringify(config.loadPatterns.stress.stages)}`);
  console.log(`⚠️  Warning: Expecting high error rates at peak load`);

  return {
    baseUrl,
    adminToken: config.adminToken,
    testSalonId: config.testSalonId,
    startTime: Date.now(),
  };
}

// =============================================================================
// HELPER: Determine current stage
// =============================================================================

function getCurrentStage() {
  const elapsed = (__ENV.K6_SCENARIO_DURATION || 0) / 1000 / 60; // minutes

  if (elapsed < 2) return 1; // 0-2 min: 50 users
  if (elapsed < 7) return 2; // 2-7 min: 100 users
  if (elapsed < 12) return 3; // 7-12 min: 200 users
  if (elapsed < 17) return 4; // 12-17 min: 300 users
  if (elapsed < 22) return 5; // 17-22 min: 400 users
  if (elapsed < 32) return 6; // 22-32 min: 500 users
  return 7; // 32+ min: ramp down
}

// =============================================================================
// MAIN TEST SCENARIO
// =============================================================================

export default function (data) {
  const { baseUrl, adminToken, testSalonId } = data;
  const iterationStart = Date.now();
  const currentStage = getCurrentStage();

  const headers = {
    'Content-Type': 'application/json',
    'x-admin-token': adminToken,
  };

  stageRequests.add(1);

  // ==========================================================================
  // Test 1: Health Check (System heartbeat)
  // ==========================================================================

  const healthRes = http.get(`${baseUrl}/healthz`, {
    tags: { endpoint: 'health' },
    timeout: '5s',
  });

  const healthOk = check(healthRes, {
    'health status 200': (r) => r.status === 200,
    'health response < 1s': (r) => r.timings.duration < 1000,
  });

  if (!healthOk) {
    stageErrors.add(1);

    // Track if we've reached breaking point (health checks failing)
    if (healthRes.status !== 200) {
      breakingPointReached.add(1);
      console.warn(`⚠️  Breaking point detected at stage ${currentStage}: Health check failed`);
    }
  }

  // Track stage performance
  const stageTrends = [
    null,
    stage1Performance,
    stage2Performance,
    stage3Performance,
    stage4Performance,
    stage5Performance,
    stage6Performance,
  ];

  if (currentStage >= 1 && currentStage <= 6) {
    stageTrends[currentStage].add(healthRes.timings.duration);
  }

  sleep(sleepBetween(0.2, 0.5));

  // ==========================================================================
  // Test 2: Mixed Workload (Realistic traffic)
  // ==========================================================================

  const workloadType = Math.random();

  if (workloadType < 0.3) {
    // 30% - Webhook processing (heavy load)
    const phoneNumber = randomPhoneNumber();
    const message = randomElement([
      'I want to book an appointment',
      'What are your services?',
      'Cancel my booking',
      'Are you open today?',
    ]);

    const webhookPayload = generateWebhookEvent(phoneNumber, message);

    const webhookRes = http.post(`${baseUrl}/webhook`, JSON.stringify(webhookPayload), {
      headers,
      tags: { endpoint: 'webhook' },
      timeout: '10s',
    });

    const webhookOk = check(webhookRes, {
      'webhook status 200': (r) => r.status === 200,
      'webhook response < 5s': (r) => r.timings.duration < 5000,
    });

    if (!webhookOk) {
      stageErrors.add(1);
    }

    if (currentStage >= 1 && currentStage <= 6) {
      stageTrends[currentStage].add(webhookRes.timings.duration);
    }
  } else if (workloadType < 0.6) {
    // 30% - Database queries
    const endpoint = randomElement([
      `/admin/bookings/${testSalonId}?page=1&limit=20`,
      `/admin/messages/${testSalonId}?page=1&limit=20`,
    ]);

    const queryRes = http.get(`${baseUrl}${endpoint}`, {
      headers,
      tags: { endpoint: 'database_query' },
      timeout: '5s',
    });

    const queryOk = check(queryRes, {
      'query status ok': (r) => r.status === 200 || r.status === 404,
      'query response < 3s': (r) => r.timings.duration < 3000,
    });

    if (!queryOk) {
      stageErrors.add(1);
    }

    if (currentStage >= 1 && currentStage <= 6) {
      stageTrends[currentStage].add(queryRes.timings.duration);
    }
  } else if (workloadType < 0.8) {
    // 20% - Stats queries (complex)
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

    const statsOk = check(statsRes, {
      'stats status ok': (r) => r.status === 200 || r.status === 404,
      'stats response < 5s': (r) => r.timings.duration < 5000,
    });

    if (!statsOk) {
      stageErrors.add(1);
    }

    if (currentStage >= 1 && currentStage <= 6) {
      stageTrends[currentStage].add(statsRes.timings.duration);
    }
  } else {
    // 20% - Batch requests (stress test)
    const batchRes = http.batch([
      ['GET', `${baseUrl}/healthz`, null, { timeout: '3s' }],
      ['GET', `${baseUrl}/metrics/database`, null, { timeout: '3s' }],
      ['GET', `${baseUrl}/admin/bookings/${testSalonId}?page=1&limit=10`, null, { headers, timeout: '5s' }],
    ]);

    batchRes.forEach((res) => {
      if (res.status !== 200 && res.status !== 404) {
        stageErrors.add(1);
      }
      if (currentStage >= 1 && currentStage <= 6) {
        stageTrends[currentStage].add(res.timings.duration);
      }
    });
  }

  // ==========================================================================
  // Test 3: Database Health Monitoring
  // ==========================================================================

  if (__ITER % 10 === 0) {
    const dbMetricsRes = http.get(`${baseUrl}/metrics/database`, {
      tags: { endpoint: 'db_metrics' },
      timeout: '3s',
    });

    if (dbMetricsRes.status === 200) {
      try {
        const metrics = JSON.parse(dbMetricsRes.body);

        // Warn on high connection usage
        if (metrics.connections?.waiting > 0) {
          console.warn(
            `⚠️  Stage ${currentStage}: ${metrics.connections.waiting} connections waiting`
          );
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
  }

  // Minimal sleep - stress test
  sleep(sleepBetween(0.3, 0.8));

  // Track extremely slow iterations
  const iterationDuration = Date.now() - iterationStart;
  if (iterationDuration > 15000) {
    console.warn(`⚠️  Stage ${currentStage}: Very slow iteration (${iterationDuration}ms)`);
  }
}

// =============================================================================
// TEARDOWN
// =============================================================================

export function teardown(data) {
  logTestEnd('Stress Load Test');

  const duration = (Date.now() - data.startTime) / 1000 / 60; // minutes
  console.log(`\n⏱️  Total test duration: ${duration.toFixed(2)} minutes`);

  // Check system recovery
  console.log(`\n🔄 Testing system recovery...`);

  // Wait for system to stabilize
  sleep(5);

  const recoveryChecks = [];
  for (let i = 0; i < 3; i++) {
    const healthRes = http.get(`${data.baseUrl}/healthz`, { timeout: '5s' });
    recoveryChecks.push(healthRes.status === 200);

    if (healthRes.status === 200) {
      recoverySuccess.add(1);
    } else {
      recoverySuccess.add(0);
    }

    sleep(2);
  }

  const recovered = recoveryChecks.filter(Boolean).length >= 2;

  if (recovered) {
    console.log('✅ System recovered successfully after stress test');
  } else {
    console.warn('❌ System did not fully recover - manual intervention may be needed');
  }

  // Final database check
  const dbMetricsRes = http.get(`${data.baseUrl}/metrics/database`, { timeout: '5s' });

  if (dbMetricsRes.status === 200) {
    try {
      const metrics = JSON.parse(dbMetricsRes.body);
      console.log(`\n📊 Final Database State:`);
      console.log(`  Active Connections: ${metrics.connections?.active || 'N/A'}`);
      console.log(`  Idle Connections: ${metrics.connections?.idle || 'N/A'}`);
      console.log(`  Waiting: ${metrics.connections?.waiting || 'N/A'}`);
    } catch (e) {
      console.warn('Could not parse database metrics');
    }
  }
}

// =============================================================================
// RESULTS HANDLING
// =============================================================================

export function handleSummary(data) {
  console.log('\n📊 Generating stress test reports...');

  const duration = data.metrics.http_req_duration?.values;
  const failures = data.metrics.http_req_failed?.values;
  const totalRequests = data.metrics.http_reqs?.values?.count || 0;

  console.log('\n💪 Stress Test Analysis:');
  console.log('═'.repeat(60));
  console.log(`Total Requests: ${totalRequests}`);

  if (duration) {
    console.log(`\nOverall Response Times:`);
    console.log(`  P50: ${duration.med.toFixed(2)}ms`);
    console.log(`  P95: ${duration['p(95)'].toFixed(2)}ms`);
    console.log(`  P99: ${duration['p(99)'].toFixed(2)}ms`);
    console.log(`  Max: ${duration.max.toFixed(2)}ms`);
  }

  if (failures) {
    const errorRate = failures.rate * 100;
    console.log(`\nError Analysis:`);
    console.log(`  Overall Error Rate: ${errorRate.toFixed(2)}%`);
  }

  // Analyze performance by stage
  console.log(`\n📈 Performance by Load Stage:`);
  console.log('─'.repeat(60));

  const stages = [
    { name: 'Stage 1 (50 users)', metric: data.metrics.stage_1_performance },
    { name: 'Stage 2 (100 users)', metric: data.metrics.stage_2_performance },
    { name: 'Stage 3 (200 users)', metric: data.metrics.stage_3_performance },
    { name: 'Stage 4 (300 users)', metric: data.metrics.stage_4_performance },
    { name: 'Stage 5 (400 users)', metric: data.metrics.stage_5_performance },
    { name: 'Stage 6 (500 users)', metric: data.metrics.stage_6_performance },
  ];

  let breakingPoint = null;
  let lastGoodStage = null;

  stages.forEach((stage, index) => {
    if (stage.metric?.values) {
      const avg = stage.metric.values.avg;
      const p95 = stage.metric.values['p(95)'];

      console.log(`\n${stage.name}:`);
      console.log(`  Average: ${avg.toFixed(2)}ms`);
      console.log(`  P95: ${p95.toFixed(2)}ms`);

      // Detect breaking point (P95 > 3s)
      if (p95 > 3000 && !breakingPoint) {
        breakingPoint = index + 1;
        console.log(`  ⚠️  BREAKING POINT DETECTED`);
      } else if (p95 < 1000) {
        lastGoodStage = index + 1;
        console.log(`  ✅ Good performance`);
      } else if (p95 < 2000) {
        console.log(`  ⚠️  Degraded performance`);
      } else {
        console.log(`  ❌ Poor performance`);
      }
    }
  });

  // Breaking point summary
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🎯 CAPACITY ANALYSIS:`);
  console.log(`${'─'.repeat(60)}`);

  if (lastGoodStage) {
    const users = [50, 100, 200, 300, 400, 500][lastGoodStage - 1];
    console.log(`✅ Recommended Maximum Load: ~${users} concurrent users`);
  }

  if (breakingPoint) {
    const users = [50, 100, 200, 300, 400, 500][breakingPoint - 1];
    console.log(`⚠️  Breaking Point: ~${users} concurrent users`);
    console.log(`📝 Recommendation: Scale infrastructure or optimize before reaching ${users} users`);
  } else {
    console.log(`✅ System handled all load stages successfully!`);
    console.log(`📝 Recommendation: System can handle 500+ concurrent users`);
  }

  // Recovery analysis
  const recoveryRate = data.metrics.recovery_success?.values;
  if (recoveryRate) {
    console.log(`\n🔄 Recovery: ${(recoveryRate.rate * 100).toFixed(0)}% successful`);
  }

  console.log(`${'═'.repeat(60)}\n`);

  return {
    './results/stress-test-summary.html': htmlReport(data),
    './results/stress-test-summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}
