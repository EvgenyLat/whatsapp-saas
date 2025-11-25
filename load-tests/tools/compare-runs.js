#!/usr/bin/env node

/**
 * =============================================================================
 * LOAD TEST RESULTS COMPARATOR
 * =============================================================================
 * Compares two load test runs to identify performance regressions or improvements
 * Usage: node compare-runs.js <baseline-dir> <current-dir>
 * =============================================================================
 */

const fs = require('fs');
const path = require('path');

// =============================================================================
// CONFIGURATION
// =============================================================================

const REGRESSION_THRESHOLD = 0.10; // 10% regression is significant
const IMPROVEMENT_THRESHOLD = 0.10; // 10% improvement is significant

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Read analysis report
 */
function readAnalysisReport(dir) {
  const reportPath = path.join(dir, 'analysis-report.json');

  if (!fs.existsSync(reportPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(reportPath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error reading ${reportPath}:`, error.message);
    return null;
  }
}

/**
 * Calculate percentage change
 */
function percentageChange(baseline, current) {
  if (baseline === 0) return current === 0 ? 0 : 100;
  return ((current - baseline) / baseline) * 100;
}

/**
 * Format percentage with color
 */
function formatPercentage(value, inverse = false) {
  const absValue = Math.abs(value);
  let color = '\x1b[0m'; // Default

  // For metrics where lower is better (latency, errors)
  if (!inverse) {
    if (value < -IMPROVEMENT_THRESHOLD * 100) {
      color = '\x1b[32m'; // Green - improved
    } else if (value > REGRESSION_THRESHOLD * 100) {
      color = '\x1b[31m'; // Red - regressed
    } else {
      color = '\x1b[33m'; // Yellow - neutral
    }
  } else {
    // For metrics where higher is better (throughput)
    if (value > IMPROVEMENT_THRESHOLD * 100) {
      color = '\x1b[32m'; // Green - improved
    } else if (value < -REGRESSION_THRESHOLD * 100) {
      color = '\x1b[31m'; // Red - regressed
    } else {
      color = '\x1b[33m'; // Yellow - neutral
    }
  }

  const sign = value > 0 ? '+' : '';
  return `${color}${sign}${value.toFixed(2)}%\x1b[0m`;
}

/**
 * Compare two test results
 */
function compareTests(baselineTest, currentTest) {
  const comparison = {
    testType: currentTest.testType,
    baseline: baselineTest,
    current: currentTest,
    changes: {},
    regressions: [],
    improvements: [],
    verdict: 'neutral',
  };

  // Compare key metrics
  const metrics = [
    { key: 'p50', name: 'P50 Latency', inverse: false },
    { key: 'p95', name: 'P95 Latency', inverse: false },
    { key: 'p99', name: 'P99 Latency', inverse: false },
    { key: 'avg', name: 'Avg Latency', inverse: false },
    { key: 'max', name: 'Max Latency', inverse: false },
  ];

  metrics.forEach(metric => {
    const baselineValue = baselineTest.stats.duration[metric.key];
    const currentValue = currentTest.stats.duration[metric.key];
    const change = percentageChange(baselineValue, currentValue);

    comparison.changes[metric.key] = {
      name: metric.name,
      baseline: baselineValue,
      current: currentValue,
      change: change,
      changeFormatted: formatPercentage(change, metric.inverse),
    };

    // Track regressions and improvements
    if (!metric.inverse && change > REGRESSION_THRESHOLD * 100) {
      comparison.regressions.push({
        metric: metric.name,
        change: change,
        baseline: baselineValue,
        current: currentValue,
      });
    } else if (!metric.inverse && change < -IMPROVEMENT_THRESHOLD * 100) {
      comparison.improvements.push({
        metric: metric.name,
        change: change,
        baseline: baselineValue,
        current: currentValue,
      });
    }
  });

  // Compare error rates
  const baselineErrorRate = baselineTest.stats.errorRate;
  const currentErrorRate = currentTest.stats.errorRate;
  const errorRateChange = percentageChange(baselineErrorRate, currentErrorRate);

  comparison.changes.errorRate = {
    name: 'Error Rate',
    baseline: baselineErrorRate,
    current: currentErrorRate,
    change: errorRateChange,
    changeFormatted: formatPercentage(errorRateChange, false),
  };

  if (errorRateChange > REGRESSION_THRESHOLD * 100) {
    comparison.regressions.push({
      metric: 'Error Rate',
      change: errorRateChange,
      baseline: baselineErrorRate,
      current: currentErrorRate,
    });
  }

  // Compare throughput
  const baselineThroughput = baselineTest.stats.totalRequests;
  const currentThroughput = currentTest.stats.totalRequests;
  const throughputChange = percentageChange(baselineThroughput, currentThroughput);

  comparison.changes.throughput = {
    name: 'Total Requests',
    baseline: baselineThroughput,
    current: currentThroughput,
    change: throughputChange,
    changeFormatted: formatPercentage(throughputChange, true),
  };

  // Determine overall verdict
  if (comparison.regressions.length > 0) {
    comparison.verdict = 'regressed';
  } else if (comparison.improvements.length > 0) {
    comparison.verdict = 'improved';
  } else {
    comparison.verdict = 'stable';
  }

  return comparison;
}

/**
 * Generate comparison report
 */
function generateComparisonReport(comparisons) {
  console.log('\n' + '═'.repeat(80));
  console.log('LOAD TEST COMPARISON REPORT');
  console.log('═'.repeat(80) + '\n');

  let totalRegressions = 0;
  let totalImprovements = 0;

  comparisons.forEach(comparison => {
    const verdictSymbol = {
      improved: '\x1b[32m↑ IMPROVED\x1b[0m',
      regressed: '\x1b[31m↓ REGRESSED\x1b[0m',
      stable: '\x1b[33m→ STABLE\x1b[0m',
    };

    console.log(`${verdictSymbol[comparison.verdict]} ${comparison.testType.toUpperCase()}`);
    console.log('─'.repeat(80));

    // Response time metrics
    console.log('\nResponse Times:');
    ['p50', 'p95', 'p99', 'avg', 'max'].forEach(key => {
      const metric = comparison.changes[key];
      console.log(
        `  ${metric.name.padEnd(15)} ${metric.baseline.toFixed(2)}ms → ${metric.current.toFixed(2)}ms  (${metric.changeFormatted})`
      );
    });

    // Error rate
    const errorMetric = comparison.changes.errorRate;
    console.log('\nError Rate:');
    console.log(
      `  ${errorMetric.name.padEnd(15)} ${(errorMetric.baseline * 100).toFixed(3)}% → ${(errorMetric.current * 100).toFixed(3)}%  (${errorMetric.changeFormatted})`
    );

    // Throughput
    const throughputMetric = comparison.changes.throughput;
    console.log('\nThroughput:');
    console.log(
      `  ${throughputMetric.name.padEnd(15)} ${throughputMetric.baseline} → ${throughputMetric.current}  (${throughputMetric.changeFormatted})`
    );

    // Regressions
    if (comparison.regressions.length > 0) {
      console.log('\n\x1b[31mRegressions:\x1b[0m');
      comparison.regressions.forEach(reg => {
        console.log(
          `  ✗ ${reg.metric}: ${reg.baseline.toFixed(2)} → ${reg.current.toFixed(2)} (${formatPercentage(reg.change)})`
        );
      });
      totalRegressions += comparison.regressions.length;
    }

    // Improvements
    if (comparison.improvements.length > 0) {
      console.log('\n\x1b[32mImprovements:\x1b[0m');
      comparison.improvements.forEach(imp => {
        console.log(
          `  ✓ ${imp.metric}: ${imp.baseline.toFixed(2)} → ${imp.current.toFixed(2)} (${formatPercentage(imp.change)})`
        );
      });
      totalImprovements += comparison.improvements.length;
    }

    console.log('\n');
  });

  // Overall summary
  console.log('═'.repeat(80));
  console.log('SUMMARY');
  console.log('─'.repeat(80));

  console.log(`Total Tests Compared: ${comparisons.length}`);
  console.log(`Improved: \x1b[32m${comparisons.filter(c => c.verdict === 'improved').length}\x1b[0m`);
  console.log(`Stable: \x1b[33m${comparisons.filter(c => c.verdict === 'stable').length}\x1b[0m`);
  console.log(`Regressed: \x1b[31m${comparisons.filter(c => c.verdict === 'regressed').length}\x1b[0m`);

  console.log(`\nTotal Improvements: \x1b[32m${totalImprovements}\x1b[0m`);
  console.log(`Total Regressions: \x1b[31m${totalRegressions}\x1b[0m`);

  console.log('═'.repeat(80) + '\n');

  return totalRegressions === 0;
}

/**
 * Save comparison report
 */
function saveComparisonReport(comparisons, outputPath) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalTests: comparisons.length,
      improved: comparisons.filter(c => c.verdict === 'improved').length,
      stable: comparisons.filter(c => c.verdict === 'stable').length,
      regressed: comparisons.filter(c => c.verdict === 'regressed').length,
    },
    comparisons: comparisons,
  };

  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`Comparison report saved to: ${outputPath}`);
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: node compare-runs.js <baseline-dir> <current-dir>');
    console.error('');
    console.error('Example:');
    console.error('  node compare-runs.js results/run_20250101_120000 results/run_20250101_140000');
    process.exit(1);
  }

  const baselineDir = args[0];
  const currentDir = args[1];

  // Validate directories
  if (!fs.existsSync(baselineDir)) {
    console.error(`Error: Baseline directory not found: ${baselineDir}`);
    process.exit(1);
  }

  if (!fs.existsSync(currentDir)) {
    console.error(`Error: Current directory not found: ${currentDir}`);
    process.exit(1);
  }

  // Read analysis reports
  const baselineReport = readAnalysisReport(baselineDir);
  const currentReport = readAnalysisReport(currentDir);

  if (!baselineReport) {
    console.error(`Error: No analysis report found in ${baselineDir}`);
    console.error('Run analyze-results.js first on the baseline directory');
    process.exit(1);
  }

  if (!currentReport) {
    console.error(`Error: No analysis report found in ${currentDir}`);
    console.error('Run analyze-results.js first on the current directory');
    process.exit(1);
  }

  console.log(`Baseline: ${baselineDir} (${baselineReport.timestamp})`);
  console.log(`Current:  ${currentDir} (${currentReport.timestamp})`);

  // Match and compare tests
  const comparisons = [];

  currentReport.tests.forEach(currentTest => {
    const baselineTest = baselineReport.tests.find(
      t => t.testType === currentTest.testType
    );

    if (baselineTest) {
      const comparison = compareTests(baselineTest, currentTest);
      comparisons.push(comparison);
    } else {
      console.warn(`Warning: No baseline found for ${currentTest.testType}`);
    }
  });

  if (comparisons.length === 0) {
    console.error('No matching tests found to compare');
    process.exit(1);
  }

  // Generate report
  const noRegressions = generateComparisonReport(comparisons);

  // Save comparison report
  const outputPath = path.join(currentDir, 'comparison-report.json');
  saveComparisonReport(comparisons, outputPath);

  // Exit with appropriate code
  process.exit(noRegressions ? 0 : 1);
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = {
  compareTests,
  percentageChange,
};
