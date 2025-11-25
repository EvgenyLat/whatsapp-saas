#!/usr/bin/env node

/**
 * =============================================================================
 * API PERFORMANCE BENCHMARK
 * =============================================================================
 * Measures individual endpoint performance with detailed metrics
 * =============================================================================
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// =============================================================================
// CONFIGURATION
// =============================================================================

const config = {
  baseUrl: process.env.BASE_URL || 'http://localhost:4000',
  adminToken: process.env.ADMIN_TOKEN || 'your-admin-token',
  testSalonId: process.env.TEST_SALON_ID || 'test-salon-123',
  iterations: 100, // Requests per endpoint
  warmupRequests: 10, // Warmup iterations
};

// =============================================================================
// ENDPOINTS TO BENCHMARK
// =============================================================================

const endpoints = [
  {
    name: 'Health Check',
    method: 'GET',
    path: '/healthz',
    requiresAuth: false,
  },
  {
    name: 'Root Endpoint',
    method: 'GET',
    path: '/',
    requiresAuth: false,
  },
  {
    name: 'Database Metrics',
    method: 'GET',
    path: '/metrics/database',
    requiresAuth: false,
  },
  {
    name: 'Prometheus Metrics',
    method: 'GET',
    path: '/metrics',
    requiresAuth: false,
  },
  {
    name: 'List Bookings (Page 1)',
    method: 'GET',
    path: `/admin/bookings/${config.testSalonId}?page=1&limit=10`,
    requiresAuth: true,
  },
  {
    name: 'List Bookings (Page 1, 50 items)',
    method: 'GET',
    path: `/admin/bookings/${config.testSalonId}?page=1&limit=50`,
    requiresAuth: true,
  },
  {
    name: 'List Messages (Page 1)',
    method: 'GET',
    path: `/admin/messages/${config.testSalonId}?page=1&limit=10`,
    requiresAuth: true,
  },
  {
    name: 'Stats (7 days)',
    method: 'GET',
    path: `/admin/stats/${config.testSalonId}?startDate=${getDateDaysAgo(7)}&endDate=${new Date().toISOString()}`,
    requiresAuth: true,
  },
  {
    name: 'Stats (30 days)',
    method: 'GET',
    path: `/admin/stats/${config.testSalonId}?startDate=${getDateDaysAgo(30)}&endDate=${new Date().toISOString()}`,
    requiresAuth: true,
  },
  {
    name: 'AI Analytics (30 days)',
    method: 'GET',
    path: `/admin/ai/analytics/${config.testSalonId}?startDate=${getDateDaysAgo(30)}&endDate=${new Date().toISOString()}`,
    requiresAuth: true,
  },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getDateDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function makeRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint.path, config.baseUrl);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;

    const options = {
      method: endpoint.method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (endpoint.requiresAuth) {
      options.headers['x-admin-token'] = config.adminToken;
    }

    const startTime = process.hrtime.bigint();
    let responseSize = 0;

    const req = lib.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
        responseSize += chunk.length;
      });

      res.on('end', () => {
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000; // Convert to ms

        resolve({
          statusCode: res.statusCode,
          duration: duration,
          responseSize: responseSize,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on('error', (error) => {
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000;

      reject({
        error: error.message,
        duration: duration,
      });
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject({ error: 'Timeout', duration: 10000 });
    });

    if (endpoint.body) {
      req.write(JSON.stringify(endpoint.body));
    }

    req.end();
  });
}

function calculateStats(values) {
  if (values.length === 0) {
    return {
      min: 0,
      max: 0,
      avg: 0,
      p50: 0,
      p95: 0,
      p99: 0,
      stdDev: 0,
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const avg = sum / sorted.length;

  // Standard deviation
  const squareDiffs = sorted.map((value) => Math.pow(value - avg, 2));
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / sorted.length;
  const stdDev = Math.sqrt(avgSquareDiff);

  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: avg,
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    stdDev: stdDev,
  };
}

function percentile(sortedArray, p) {
  const index = Math.ceil((sortedArray.length * p) / 100) - 1;
  return sortedArray[Math.max(0, index)];
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// =============================================================================
// BENCHMARK RUNNER
// =============================================================================

async function benchmarkEndpoint(endpoint) {
  console.log(`\nBenchmarking: ${endpoint.name}`);
  console.log(`  ${endpoint.method} ${endpoint.path}`);

  const durations = [];
  const responseSizes = [];
  let errors = 0;
  let statusCodes = {};

  // Warmup
  console.log(`  Warmup: ${config.warmupRequests} requests...`);
  for (let i = 0; i < config.warmupRequests; i++) {
    try {
      await makeRequest(endpoint);
    } catch (e) {
      // Ignore warmup errors
    }
  }

  // Actual benchmark
  console.log(`  Running: ${config.iterations} requests...`);
  const startTime = Date.now();

  for (let i = 0; i < config.iterations; i++) {
    try {
      const result = await makeRequest(endpoint);
      durations.push(result.duration);
      responseSizes.push(result.responseSize);

      statusCodes[result.statusCode] = (statusCodes[result.statusCode] || 0) + 1;

      // Progress indicator
      if ((i + 1) % 20 === 0) {
        process.stdout.write(`\r  Progress: ${i + 1}/${config.iterations}`);
      }
    } catch (error) {
      errors++;
      durations.push(error.duration || 10000);
    }
  }

  const totalTime = Date.now() - startTime;
  process.stdout.write(`\r  Progress: ${config.iterations}/${config.iterations}\n`);

  // Calculate statistics
  const durationStats = calculateStats(durations);
  const sizeStats = calculateStats(responseSizes);

  const result = {
    endpoint: {
      name: endpoint.name,
      method: endpoint.method,
      path: endpoint.path,
      requiresAuth: endpoint.requiresAuth,
    },
    metrics: {
      requests: config.iterations,
      errors: errors,
      errorRate: (errors / config.iterations) * 100,
      totalTime: totalTime,
      requestsPerSecond: (config.iterations / totalTime) * 1000,
    },
    latency: {
      min: durationStats.min,
      max: durationStats.max,
      avg: durationStats.avg,
      p50: durationStats.p50,
      p95: durationStats.p95,
      p99: durationStats.p99,
      stdDev: durationStats.stdDev,
    },
    responseSize: {
      min: sizeStats.min,
      max: sizeStats.max,
      avg: sizeStats.avg,
    },
    statusCodes: statusCodes,
  };

  // Print summary
  console.log(`  Results:`);
  console.log(`    Requests: ${result.metrics.requests}`);
  console.log(`    Errors: ${result.metrics.errors} (${result.metrics.errorRate.toFixed(2)}%)`);
  console.log(`    RPS: ${result.metrics.requestsPerSecond.toFixed(2)}`);
  console.log(`    Latency:`);
  console.log(`      Min: ${result.latency.min.toFixed(2)}ms`);
  console.log(`      Avg: ${result.latency.avg.toFixed(2)}ms`);
  console.log(`      P50: ${result.latency.p50.toFixed(2)}ms`);
  console.log(`      P95: ${result.latency.p95.toFixed(2)}ms`);
  console.log(`      P99: ${result.latency.p99.toFixed(2)}ms`);
  console.log(`      Max: ${result.latency.max.toFixed(2)}ms`);
  console.log(`    Response Size: ${formatBytes(result.responseSize.avg)}`);

  return result;
}

async function runBenchmarks() {
  console.log('═'.repeat(80));
  console.log('API PERFORMANCE BENCHMARK');
  console.log('═'.repeat(80));
  console.log(`Base URL: ${config.baseUrl}`);
  console.log(`Iterations per endpoint: ${config.iterations}`);
  console.log(`Warmup requests: ${config.warmupRequests}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);

  const results = [];

  for (const endpoint of endpoints) {
    const result = await benchmarkEndpoint(endpoint);
    results.push(result);
  }

  // Summary
  console.log('\n' + '═'.repeat(80));
  console.log('SUMMARY');
  console.log('═'.repeat(80));

  const allLatencies = results.flatMap((r) =>
    Array(r.metrics.requests - r.metrics.errors).fill(r.latency.avg)
  );
  const overallStats = calculateStats(allLatencies);

  console.log(`Total Endpoints: ${results.length}`);
  console.log(`Total Requests: ${results.reduce((sum, r) => sum + r.metrics.requests, 0)}`);
  console.log(`Total Errors: ${results.reduce((sum, r) => sum + r.metrics.errors, 0)}`);
  console.log(`\nOverall Latency:`);
  console.log(`  P50: ${overallStats.p50.toFixed(2)}ms`);
  console.log(`  P95: ${overallStats.p95.toFixed(2)}ms`);
  console.log(`  P99: ${overallStats.p99.toFixed(2)}ms`);

  // Identify slowest endpoints
  console.log(`\nSlowest Endpoints (P95):`);
  const sortedByP95 = [...results].sort((a, b) => b.latency.p95 - a.latency.p95);
  sortedByP95.slice(0, 5).forEach((r, i) => {
    console.log(`  ${i + 1}. ${r.endpoint.name}: ${r.latency.p95.toFixed(2)}ms`);
  });

  // Save results
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputPath = path.join(__dirname, '..', 'results', `api-benchmark-${timestamp}.json`);

  const report = {
    timestamp: new Date().toISOString(),
    config: config,
    results: results,
    summary: {
      totalEndpoints: results.length,
      totalRequests: results.reduce((sum, r) => sum + r.metrics.requests, 0),
      totalErrors: results.reduce((sum, r) => sum + r.metrics.errors, 0),
      overallLatency: overallStats,
    },
  };

  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`\nResults saved to: ${outputPath}`);

  console.log('═'.repeat(80));

  return report;
}

// =============================================================================
// MAIN
// =============================================================================

if (require.main === module) {
  runBenchmarks()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error running benchmarks:', error);
      process.exit(1);
    });
}

module.exports = { runBenchmarks, benchmarkEndpoint };
