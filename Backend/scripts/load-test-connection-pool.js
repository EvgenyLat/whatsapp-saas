#!/usr/bin/env node

/**
 * Connection Pool Load Testing Script
 *
 * This script tests the database connection pool under various load conditions
 * to verify proper configuration and identify potential issues.
 *
 * Usage: node load-test-connection-pool.js [OPTIONS]
 *
 * Options:
 *   --concurrent <number>  Number of concurrent connections (default: 100)
 *   --duration <seconds>   Test duration in seconds (default: 60)
 *   --ramp-up <seconds>    Ramp-up time in seconds (default: 10)
 *   --query-type <type>    Query type: simple, complex, mixed (default: mixed)
 *   --report-file <path>   Save report to file
 */

'use strict';

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG = {
  concurrentConnections: 100,
  durationSeconds: 60,
  rampUpSeconds: 10,
  queryType: 'mixed', // simple, complex, mixed
  reportFile: null
};

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const config = { ...DEFAULT_CONFIG };

  for (let i = 0; i < args.length; i += 2) {
    const flag = args[i];
    const value = args[i + 1];

    switch (flag) {
      case '--concurrent':
        config.concurrentConnections = parseInt(value);
        break;
      case '--duration':
        config.durationSeconds = parseInt(value);
        break;
      case '--ramp-up':
        config.rampUpSeconds = parseInt(value);
        break;
      case '--query-type':
        config.queryType = value;
        break;
      case '--report-file':
        config.reportFile = value;
        break;
    }
  }

  return config;
}

// ============================================================================
// TEST METRICS
// ============================================================================

class LoadTestMetrics {
  constructor() {
    this.startTime = Date.now();
    this.connectionAcquisitionTimes = [];
    this.queryExecutionTimes = [];
    this.errors = [];
    this.successfulQueries = 0;
    this.failedQueries = 0;
    this.connectionErrors = 0;
    this.timeouts = 0;
    this.slowQueries = 0; // > 1 second
    this.peakConcurrency = 0;
    this.currentConcurrency = 0;
  }

  recordConnectionAcquisition(duration) {
    this.connectionAcquisitionTimes.push(duration);
  }

  recordQueryExecution(duration) {
    this.queryExecutionTimes.push(duration);
    this.successfulQueries++;

    if (duration > 1000) {
      this.slowQueries++;
    }
  }

  recordError(error) {
    this.errors.push({
      message: error.message,
      timestamp: Date.now()
    });
    this.failedQueries++;

    if (error.message.includes('timeout')) {
      this.timeouts++;
    }
    if (error.message.includes('connection')) {
      this.connectionErrors++;
    }
  }

  updateConcurrency(delta) {
    this.currentConcurrency += delta;
    if (this.currentConcurrency > this.peakConcurrency) {
      this.peakConcurrency = this.currentConcurrency;
    }
  }

  calculateStats() {
    const totalQueries = this.successfulQueries + this.failedQueries;
    const duration = (Date.now() - this.startTime) / 1000;

    // Connection acquisition stats
    const avgConnectionTime = this.connectionAcquisitionTimes.length > 0
      ? this.connectionAcquisitionTimes.reduce((a, b) => a + b, 0) / this.connectionAcquisitionTimes.length
      : 0;

    const maxConnectionTime = this.connectionAcquisitionTimes.length > 0
      ? Math.max(...this.connectionAcquisitionTimes)
      : 0;

    const p95ConnectionTime = this.calculatePercentile(this.connectionAcquisitionTimes, 95);
    const p99ConnectionTime = this.calculatePercentile(this.connectionAcquisitionTimes, 99);

    // Query execution stats
    const avgQueryTime = this.queryExecutionTimes.length > 0
      ? this.queryExecutionTimes.reduce((a, b) => a + b, 0) / this.queryExecutionTimes.length
      : 0;

    const maxQueryTime = this.queryExecutionTimes.length > 0
      ? Math.max(...this.queryExecutionTimes)
      : 0;

    const p95QueryTime = this.calculatePercentile(this.queryExecutionTimes, 95);
    const p99QueryTime = this.calculatePercentile(this.queryExecutionTimes, 99);

    return {
      duration: duration.toFixed(2),
      totalQueries,
      successfulQueries: this.successfulQueries,
      failedQueries: this.failedQueries,
      successRate: ((this.successfulQueries / totalQueries) * 100).toFixed(2),
      queriesPerSecond: (totalQueries / duration).toFixed(2),
      errors: {
        total: this.errors.length,
        connectionErrors: this.connectionErrors,
        timeouts: this.timeouts,
        slowQueries: this.slowQueries
      },
      connectionAcquisition: {
        avgMs: avgConnectionTime.toFixed(2),
        maxMs: maxConnectionTime.toFixed(2),
        p95Ms: p95ConnectionTime.toFixed(2),
        p99Ms: p99ConnectionTime.toFixed(2)
      },
      queryExecution: {
        avgMs: avgQueryTime.toFixed(2),
        maxMs: maxQueryTime.toFixed(2),
        p95Ms: p95QueryTime.toFixed(2),
        p99Ms: p99QueryTime.toFixed(2)
      },
      concurrency: {
        peak: this.peakConcurrency,
        final: this.currentConcurrency
      }
    };
  }

  calculatePercentile(arr, percentile) {
    if (arr.length === 0) return 0;

    const sorted = arr.slice().sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }
}

// ============================================================================
// QUERY GENERATORS
// ============================================================================

class QueryGenerator {
  static simple(prisma) {
    return prisma.$queryRaw`SELECT 1`;
  }

  static async complex(prisma) {
    // Simulate complex query with joins and aggregations
    return prisma.$queryRaw`
      SELECT
        COUNT(*) as total,
        AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_duration
      FROM bookings
      WHERE created_at > NOW() - INTERVAL '30 days'
    `;
  }

  static async crud(prisma, salonId) {
    // Test CRUD operations
    const operations = [
      // Read
      () => prisma.booking.findMany({ where: { salon_id: salonId }, take: 10 }),

      // Count
      () => prisma.booking.count({ where: { salon_id: salonId } }),

      // Aggregation
      () => prisma.message.aggregate({
        where: { salon_id: salonId },
        _count: true,
        _sum: { cost: true }
      }),

      // Complex read
      () => prisma.salon.findUnique({
        where: { id: salonId },
        include: {
          bookings: { take: 5, orderBy: { created_at: 'desc' } },
          messages: { take: 5, orderBy: { created_at: 'desc' } }
        }
      })
    ];

    const op = operations[Math.floor(Math.random() * operations.length)];
    return op();
  }

  static async mixed(prisma, salonId) {
    const rand = Math.random();

    if (rand < 0.3) {
      return this.simple(prisma);
    } else if (rand < 0.6) {
      return this.complex(prisma);
    } else {
      return this.crud(prisma, salonId);
    }
  }
}

// ============================================================================
// LOAD TEST RUNNER
// ============================================================================

class LoadTestRunner {
  constructor(config) {
    this.config = config;
    this.metrics = new LoadTestMetrics();
    this.prisma = null;
    this.isRunning = false;
    this.workers = [];
    this.testSalonId = 'test-salon-' + Date.now();
  }

  async initialize() {
    console.log('Initializing load test...');
    console.log('Configuration:', JSON.stringify(this.config, null, 2));

    this.prisma = new PrismaClient({
      log: ['error', 'warn']
    });

    await this.prisma.$connect();
    console.log('✓ Connected to database');

    // Create test salon
    try {
      await this.prisma.salon.create({
        data: {
          id: this.testSalonId,
          name: 'Load Test Salon',
          phone_number_id: 'load-test-' + Date.now(),
          access_token: 'test-token'
        }
      });
      console.log('✓ Created test salon:', this.testSalonId);
    } catch (error) {
      // Salon might already exist
      console.log('Note: Using existing test data');
    }
  }

  async cleanup() {
    console.log('\nCleaning up...');

    try {
      // Delete test salon and related data
      await this.prisma.salon.delete({
        where: { id: this.testSalonId }
      }).catch(() => {}); // Ignore if doesn't exist

      await this.prisma.$disconnect();
      console.log('✓ Cleanup complete');
    } catch (error) {
      console.error('Cleanup error:', error.message);
    }
  }

  async runWorker(workerId) {
    const connectionStartTime = Date.now();

    try {
      // Create worker-specific Prisma client
      const workerPrisma = new PrismaClient({
        log: []
      });

      await workerPrisma.$connect();

      const connectionTime = Date.now() - connectionStartTime;
      this.metrics.recordConnectionAcquisition(connectionTime);
      this.metrics.updateConcurrency(1);

      // Run queries while test is active
      while (this.isRunning) {
        const queryStartTime = Date.now();

        try {
          // Execute query based on type
          switch (this.config.queryType) {
            case 'simple':
              await QueryGenerator.simple(workerPrisma);
              break;
            case 'complex':
              await QueryGenerator.complex(workerPrisma);
              break;
            case 'mixed':
              await QueryGenerator.mixed(workerPrisma, this.testSalonId);
              break;
          }

          const queryTime = Date.now() - queryStartTime;
          this.metrics.recordQueryExecution(queryTime);
        } catch (error) {
          this.metrics.recordError(error);
        }

        // Small delay between queries
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      await workerPrisma.$disconnect();
      this.metrics.updateConcurrency(-1);
    } catch (error) {
      this.metrics.recordError(error);
      this.metrics.updateConcurrency(-1);
    }
  }

  async run() {
    console.log('\n' + '='.repeat(60));
    console.log('Starting Load Test');
    console.log('='.repeat(60));

    this.isRunning = true;

    // Ramp up workers
    const rampUpDelay = (this.config.rampUpSeconds * 1000) / this.config.concurrentConnections;

    console.log(`\nRamping up ${this.config.concurrentConnections} workers over ${this.config.rampUpSeconds}s...`);

    for (let i = 0; i < this.config.concurrentConnections; i++) {
      this.workers.push(this.runWorker(i));
      await new Promise(resolve => setTimeout(resolve, rampUpDelay));

      // Progress indicator
      if ((i + 1) % 10 === 0 || i === this.config.concurrentConnections - 1) {
        process.stdout.write(`\r  Workers started: ${i + 1}/${this.config.concurrentConnections}`);
      }
    }

    console.log('\n\n✓ All workers started');

    // Run for duration
    console.log(`\nRunning test for ${this.config.durationSeconds}s...`);

    const progressInterval = setInterval(() => {
      const elapsed = ((Date.now() - this.metrics.startTime) / 1000).toFixed(0);
      const remaining = this.config.durationSeconds - elapsed;
      const stats = this.metrics.calculateStats();

      process.stdout.write(
        `\r  Time: ${elapsed}s/${this.config.durationSeconds}s | ` +
        `Queries: ${stats.totalQueries} (${stats.queriesPerSecond} qps) | ` +
        `Errors: ${stats.errors.total} | ` +
        `Avg Query: ${stats.queryExecution.avgMs}ms`
      );
    }, 1000);

    // Wait for test duration
    await new Promise(resolve => setTimeout(resolve, this.config.durationSeconds * 1000));

    clearInterval(progressInterval);

    // Stop workers
    console.log('\n\nStopping workers...');
    this.isRunning = false;
    await Promise.all(this.workers);
    console.log('✓ All workers stopped');
  }

  generateReport() {
    const stats = this.metrics.calculateStats();

    const report = {
      timestamp: new Date().toISOString(),
      configuration: this.config,
      results: stats,
      errors: this.metrics.errors.slice(0, 10), // First 10 errors
      assessment: this.assessPerformance(stats)
    };

    return report;
  }

  assessPerformance(stats) {
    const issues = [];
    const recommendations = [];

    // Check success rate
    if (stats.successRate < 95) {
      issues.push(`Low success rate: ${stats.successRate}%`);
      recommendations.push('Investigate connection errors and increase pool size');
    }

    // Check connection acquisition time
    if (stats.connectionAcquisition.p95Ms > 1000) {
      issues.push(`Slow connection acquisition: P95 ${stats.connectionAcquisition.p95Ms}ms`);
      recommendations.push('Increase DB_CONNECTION_LIMIT or reduce concurrent load');
    }

    // Check query performance
    if (stats.queryExecution.p95Ms > 500) {
      issues.push(`Slow query execution: P95 ${stats.queryExecution.p95Ms}ms`);
      recommendations.push('Add database indexes or optimize queries');
    }

    // Check error rate
    if (stats.errors.total > stats.totalQueries * 0.05) {
      issues.push(`High error rate: ${((stats.errors.total / stats.totalQueries) * 100).toFixed(2)}%`);
      recommendations.push('Review database logs and connection pool configuration');
    }

    // Check for connection errors
    if (stats.errors.connectionErrors > 0) {
      issues.push(`Connection errors detected: ${stats.errors.connectionErrors}`);
      recommendations.push('Increase DB_POOL_TIMEOUT or reduce concurrent connections');
    }

    const status = issues.length === 0 ? 'PASS' : 'FAIL';

    return {
      status,
      issues,
      recommendations
    };
  }

  printReport(report) {
    console.log('\n' + '='.repeat(60));
    console.log('Load Test Results');
    console.log('='.repeat(60));

    console.log('\nConfiguration:');
    console.log(`  Concurrent Connections: ${report.configuration.concurrentConnections}`);
    console.log(`  Test Duration: ${report.configuration.durationSeconds}s`);
    console.log(`  Query Type: ${report.configuration.queryType}`);

    console.log('\nPerformance:');
    console.log(`  Total Queries: ${report.results.totalQueries}`);
    console.log(`  Successful: ${report.results.successfulQueries} (${report.results.successRate}%)`);
    console.log(`  Failed: ${report.results.failedQueries}`);
    console.log(`  Throughput: ${report.results.queriesPerSecond} queries/second`);

    console.log('\nConnection Acquisition:');
    console.log(`  Average: ${report.results.connectionAcquisition.avgMs}ms`);
    console.log(`  P95: ${report.results.connectionAcquisition.p95Ms}ms`);
    console.log(`  P99: ${report.results.connectionAcquisition.p99Ms}ms`);
    console.log(`  Max: ${report.results.connectionAcquisition.maxMs}ms`);

    console.log('\nQuery Execution:');
    console.log(`  Average: ${report.results.queryExecution.avgMs}ms`);
    console.log(`  P95: ${report.results.queryExecution.p95Ms}ms`);
    console.log(`  P99: ${report.results.queryExecution.p99Ms}ms`);
    console.log(`  Max: ${report.results.queryExecution.maxMs}ms`);

    console.log('\nErrors:');
    console.log(`  Total: ${report.results.errors.total}`);
    console.log(`  Connection Errors: ${report.results.errors.connectionErrors}`);
    console.log(`  Timeouts: ${report.results.errors.timeouts}`);
    console.log(`  Slow Queries (>1s): ${report.results.errors.slowQueries}`);

    console.log('\nConcurrency:');
    console.log(`  Peak: ${report.results.concurrency.peak}`);
    console.log(`  Final: ${report.results.concurrency.final}`);

    console.log('\nAssessment:');
    console.log(`  Status: ${report.assessment.status === 'PASS' ? '✓ PASS' : '✗ FAIL'}`);

    if (report.assessment.issues.length > 0) {
      console.log('\n  Issues Found:');
      report.assessment.issues.forEach(issue => {
        console.log(`    - ${issue}`);
      });
    }

    if (report.assessment.recommendations.length > 0) {
      console.log('\n  Recommendations:');
      report.assessment.recommendations.forEach(rec => {
        console.log(`    - ${rec}`);
      });
    }

    console.log('\n' + '='.repeat(60));
  }

  saveReport(report) {
    if (!this.config.reportFile) return;

    const reportPath = path.resolve(this.config.reportFile);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n✓ Report saved to: ${reportPath}`);
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const config = parseArgs();
  const runner = new LoadTestRunner(config);

  try {
    await runner.initialize();
    await runner.run();

    const report = runner.generateReport();
    runner.printReport(report);
    runner.saveReport(report);

    await runner.cleanup();

    // Exit with error code if test failed
    process.exit(report.assessment.status === 'PASS' ? 0 : 1);
  } catch (error) {
    console.error('\n✗ Load test failed:', error);
    await runner.cleanup();
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\nReceived SIGINT, shutting down...');
  process.exit(1);
});

main();
