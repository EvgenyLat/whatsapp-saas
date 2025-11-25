#!/usr/bin/env node

/**
 * =============================================================================
 * LOAD TEST RESULTS ANALYZER
 * =============================================================================
 * Analyzes k6 test results and generates detailed reports
 * Usage: node analyze-results.js <results-directory>
 * =============================================================================
 */

const fs = require('fs');
const path = require('path');

// =============================================================================
// CONFIGURATION
// =============================================================================

const THRESHOLDS = {
  api: {
    p95: 200,
    p99: 500,
    errorRate: 0.01,
  },
  webhook: {
    p95: 1000,
    p99: 2000,
    errorRate: 0.02,
  },
  database: {
    p95: 100,
    p99: 200,
    errorRate: 0.005,
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Read and parse k6 JSON results file
 */
function readResults(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.trim().split('\n');

    // k6 JSON output is newline-delimited JSON
    const metrics = {};

    lines.forEach(line => {
      try {
        const data = JSON.parse(line);

        if (data.type === 'Metric' && data.data) {
          if (!metrics[data.data.name]) {
            metrics[data.data.name] = [];
          }
          metrics[data.data.name].push(data.data);
        } else if (data.type === 'Point' && data.data) {
          if (!metrics[data.metric]) {
            metrics[data.metric] = [];
          }
          metrics[data.metric].push(data.data.value);
        }
      } catch (e) {
        // Skip invalid JSON lines
      }
    });

    return metrics;
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Calculate percentile
 */
function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((sorted.length * p) / 100) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Calculate basic statistics
 */
function calculateStats(values) {
  if (!values || values.length === 0) {
    return {
      count: 0,
      min: 0,
      max: 0,
      avg: 0,
      p50: 0,
      p95: 0,
      p99: 0,
    };
  }

  const sum = values.reduce((a, b) => a + b, 0);
  const avg = sum / values.length;
  const sorted = [...values].sort((a, b) => a - b);

  return {
    count: values.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: avg,
    p50: percentile(values, 50),
    p95: percentile(values, 95),
    p99: percentile(values, 99),
  };
}

/**
 * Analyze test results
 */
function analyzeResults(metrics, testType) {
  const analysis = {
    testType,
    passed: true,
    warnings: [],
    errors: [],
    stats: {},
  };

  // Extract duration values (in milliseconds)
  const durations = metrics.http_req_duration || [];
  const failed = metrics.http_req_failed || [];
  const totalRequests = metrics.http_reqs || [];

  // Calculate stats
  const durationStats = calculateStats(durations);
  const errorCount = failed.filter(v => v === 1).length;
  const errorRate = totalRequests.length > 0 ? errorCount / totalRequests.length : 0;

  analysis.stats = {
    totalRequests: totalRequests.length,
    duration: durationStats,
    errorRate: errorRate,
    errorCount: errorCount,
  };

  // Check thresholds
  const thresholds = THRESHOLDS[testType] || THRESHOLDS.api;

  // Check P95
  if (durationStats.p95 > thresholds.p95) {
    analysis.passed = false;
    analysis.errors.push(
      `P95 latency (${durationStats.p95.toFixed(2)}ms) exceeds threshold (${thresholds.p95}ms)`
    );
  } else if (durationStats.p95 > thresholds.p95 * 0.9) {
    analysis.warnings.push(
      `P95 latency (${durationStats.p95.toFixed(2)}ms) is close to threshold (${thresholds.p95}ms)`
    );
  }

  // Check P99
  if (durationStats.p99 > thresholds.p99) {
    analysis.passed = false;
    analysis.errors.push(
      `P99 latency (${durationStats.p99.toFixed(2)}ms) exceeds threshold (${thresholds.p99}ms)`
    );
  }

  // Check error rate
  if (errorRate > thresholds.errorRate) {
    analysis.passed = false;
    analysis.errors.push(
      `Error rate (${(errorRate * 100).toFixed(3)}%) exceeds threshold (${(thresholds.errorRate * 100).toFixed(1)}%)`
    );
  } else if (errorRate > thresholds.errorRate * 0.8) {
    analysis.warnings.push(
      `Error rate (${(errorRate * 100).toFixed(3)}%) is close to threshold (${(thresholds.errorRate * 100).toFixed(1)}%)`
    );
  }

  return analysis;
}

/**
 * Generate text report
 */
function generateReport(analyses) {
  console.log('\n' + '═'.repeat(80));
  console.log('LOAD TEST RESULTS ANALYSIS');
  console.log('═'.repeat(80) + '\n');

  let allPassed = true;

  analyses.forEach(analysis => {
    const status = analysis.passed ? '✓ PASS' : '✗ FAIL';
    const color = analysis.passed ? '\x1b[32m' : '\x1b[31m';
    const reset = '\x1b[0m';

    console.log(`${color}${status}${reset} ${analysis.testType.toUpperCase()}`);
    console.log('─'.repeat(80));

    console.log(`Total Requests: ${analysis.stats.totalRequests}`);
    console.log(`Error Rate: ${(analysis.stats.errorRate * 100).toFixed(3)}%`);
    console.log(`Error Count: ${analysis.stats.errorCount}`);
    console.log('');

    console.log('Response Times:');
    console.log(`  Average: ${analysis.stats.duration.avg.toFixed(2)}ms`);
    console.log(`  Min: ${analysis.stats.duration.min.toFixed(2)}ms`);
    console.log(`  Max: ${analysis.stats.duration.max.toFixed(2)}ms`);
    console.log(`  P50: ${analysis.stats.duration.p50.toFixed(2)}ms`);
    console.log(`  P95: ${analysis.stats.duration.p95.toFixed(2)}ms`);
    console.log(`  P99: ${analysis.stats.duration.p99.toFixed(2)}ms`);
    console.log('');

    if (analysis.errors.length > 0) {
      console.log('\x1b[31mErrors:\x1b[0m');
      analysis.errors.forEach(err => console.log(`  ✗ ${err}`));
      console.log('');
      allPassed = false;
    }

    if (analysis.warnings.length > 0) {
      console.log('\x1b[33mWarnings:\x1b[0m');
      analysis.warnings.forEach(warn => console.log(`  ⚠ ${warn}`));
      console.log('');
    }

    if (analysis.passed && analysis.warnings.length === 0) {
      console.log('\x1b[32m✓ All metrics within acceptable ranges\x1b[0m');
      console.log('');
    }

    console.log('');
  });

  console.log('═'.repeat(80));
  if (allPassed) {
    console.log('\x1b[32m✓ ALL TESTS PASSED\x1b[0m');
  } else {
    console.log('\x1b[31m✗ SOME TESTS FAILED\x1b[0m');
  }
  console.log('═'.repeat(80) + '\n');

  return allPassed;
}

/**
 * Save JSON report
 */
function saveJsonReport(analyses, outputPath) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalTests: analyses.length,
      passed: analyses.filter(a => a.passed).length,
      failed: analyses.filter(a => !a.passed).length,
    },
    tests: analyses,
  };

  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`JSON report saved to: ${outputPath}`);
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: node analyze-results.js <results-directory>');
    process.exit(1);
  }

  const resultsDir = args[0];

  if (!fs.existsSync(resultsDir)) {
    console.error(`Error: Directory not found: ${resultsDir}`);
    process.exit(1);
  }

  // Find all raw JSON result files
  const files = fs.readdirSync(resultsDir)
    .filter(f => f.endsWith('-raw.json'));

  if (files.length === 0) {
    console.error(`No test result files found in ${resultsDir}`);
    process.exit(1);
  }

  const analyses = [];

  // Analyze each test
  files.forEach(file => {
    const filePath = path.join(resultsDir, file);
    const testType = file.replace('-test-raw.json', '');

    console.log(`Analyzing ${testType} test...`);

    const metrics = readResults(filePath);
    if (metrics) {
      const analysis = analyzeResults(metrics, testType);
      analyses.push(analysis);
    }
  });

  if (analyses.length === 0) {
    console.error('No test results could be analyzed');
    process.exit(1);
  }

  // Generate reports
  const allPassed = generateReport(analyses);

  // Save JSON report
  const jsonReportPath = path.join(resultsDir, 'analysis-report.json');
  saveJsonReport(analyses, jsonReportPath);

  // Exit with appropriate code
  process.exit(allPassed ? 0 : 1);
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = {
  readResults,
  analyzeResults,
  calculateStats,
};
