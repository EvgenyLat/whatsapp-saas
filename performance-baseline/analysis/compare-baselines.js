#!/usr/bin/env node

/**
 * =============================================================================
 * BASELINE COMPARISON TOOL
 * =============================================================================
 * Compares two performance baselines to measure improvement or regression
 * =============================================================================
 */

const fs = require('fs');
const path = require('path');

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function readJsonFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}

function percentageChange(before, after) {
  if (before === 0) return after === 0 ? 0 : 100;
  return ((after - before) / before) * 100;
}

function formatChange(change, inverse = false) {
  const symbol = change > 0 ? '+' : '';
  const color = inverse
    ? change > 0
      ? '\x1b[32m'
      : '\x1b[31m' // Higher is better
    : change < 0
      ? '\x1b[32m'
      : '\x1b[31m'; // Lower is better
  const reset = '\x1b[0m';

  return `${color}${symbol}${change.toFixed(2)}%${reset}`;
}

// =============================================================================
// COMPARISON FUNCTIONS
// =============================================================================

function compareApi(before, after) {
  if (!before || !after) return null;

  const comparison = {
    overall: {
      before: before.summary.overallLatency,
      after: after.summary.overallLatency,
      changes: {},
    },
    endpoints: [],
  };

  // Overall changes
  ['p50', 'p95', 'p99'].forEach((metric) => {
    const change = percentageChange(
      before.summary.overallLatency[metric],
      after.summary.overallLatency[metric]
    );
    comparison.overall.changes[metric] = {
      value: change,
      improved: change < 0,
    };
  });

  // Endpoint changes
  after.results.forEach((afterEndpoint) => {
    const beforeEndpoint = before.results.find(
      (e) => e.endpoint.name === afterEndpoint.endpoint.name
    );

    if (beforeEndpoint) {
      const p95Change = percentageChange(
        beforeEndpoint.latency.p95,
        afterEndpoint.latency.p95
      );

      comparison.endpoints.push({
        name: afterEndpoint.endpoint.name,
        before: beforeEndpoint.latency.p95,
        after: afterEndpoint.latency.p95,
        change: p95Change,
        improved: p95Change < 0,
      });
    }
  });

  return comparison;
}

function compareDatabase(before, after) {
  if (!before || !after) return null;

  const comparison = {
    overall: {
      avgBefore: before.summary.avgQueryTime,
      avgAfter: after.summary.avgQueryTime,
      change: percentageChange(before.summary.avgQueryTime, after.summary.avgQueryTime),
      slowQueriesBefore: before.summary.slowQueries,
      slowQueriesAfter: after.summary.slowQueries,
    },
    queries: [],
  };

  // Query changes
  after.results.forEach((afterQuery) => {
    const beforeQuery = before.results.find((q) => q.query.name === afterQuery.query.name);

    if (beforeQuery) {
      const avgChange = percentageChange(
        beforeQuery.performance.avg,
        afterQuery.performance.avg
      );

      comparison.queries.push({
        name: afterQuery.query.name,
        before: beforeQuery.performance.avg,
        after: afterQuery.performance.avg,
        change: avgChange,
        improved: avgChange < 0,
      });
    }
  });

  return comparison;
}

function compareSystem(before, after) {
  if (!before || !after) return null;

  const comparison = {
    cpu: {
      before: before.stats.cpu.avg,
      after: after.stats.cpu.avg,
      change: percentageChange(before.stats.cpu.avg, after.stats.cpu.avg),
    },
    memory: {
      before: before.stats.memory.avg,
      after: after.stats.memory.avg,
      change: percentageChange(before.stats.memory.avg, after.stats.memory.avg),
    },
    loadAverage: {
      before: before.stats.loadAverage.avg,
      after: after.stats.loadAverage.avg,
      change: percentageChange(before.stats.loadAverage.avg, after.stats.loadAverage.avg),
    },
  };

  return comparison;
}

// =============================================================================
// REPORT GENERATION
// =============================================================================

function generateComparisonReport(beforeDir, afterDir) {
  console.log('Comparing performance baselines...\n');
  console.log(`Before: ${beforeDir}`);
  console.log(`After:  ${afterDir}\n`);

  // Find files
  const beforeFiles = fs.readdirSync(beforeDir);
  const afterFiles = fs.readdirSync(afterDir);

  // Load data
  const beforeApi = readJsonFile(
    path.join(beforeDir, beforeFiles.find((f) => f.startsWith('api-benchmark')) || '')
  );
  const afterApi = readJsonFile(
    path.join(afterDir, afterFiles.find((f) => f.startsWith('api-benchmark')) || '')
  );

  const beforeDb = readJsonFile(
    path.join(beforeDir, beforeFiles.find((f) => f.startsWith('database-benchmark')) || '')
  );
  const afterDb = readJsonFile(
    path.join(afterDir, afterFiles.find((f) => f.startsWith('database-benchmark')) || '')
  );

  const beforeSystem = readJsonFile(
    path.join(beforeDir, beforeFiles.find((f) => f.startsWith('system-monitor')) || '')
  );
  const afterSystem = readJsonFile(
    path.join(afterDir, afterFiles.find((f) => f.startsWith('system-monitor')) || '')
  );

  // Compare
  const apiComparison = compareApi(beforeApi, afterApi);
  const dbComparison = compareDatabase(beforeDb, afterDb);
  const systemComparison = compareSystem(beforeSystem, afterSystem);

  // Print results
  console.log('═'.repeat(80));
  console.log('PERFORMANCE COMPARISON');
  console.log('═'.repeat(80));
  console.log('');

  // API comparison
  if (apiComparison) {
    console.log('API PERFORMANCE');
    console.log('─'.repeat(80));
    console.log('Overall Latency:');
    console.log(
      `  P50: ${apiComparison.overall.before.p50.toFixed(2)}ms → ${apiComparison.overall.after.p50.toFixed(2)}ms (${formatChange(apiComparison.overall.changes.p50.value)})`
    );
    console.log(
      `  P95: ${apiComparison.overall.before.p95.toFixed(2)}ms → ${apiComparison.overall.after.p95.toFixed(2)}ms (${formatChange(apiComparison.overall.changes.p95.value)})`
    );
    console.log(
      `  P99: ${apiComparison.overall.before.p99.toFixed(2)}ms → ${apiComparison.overall.after.p99.toFixed(2)}ms (${formatChange(apiComparison.overall.changes.p99.value)})`
    );

    // Biggest improvements/regressions
    const sorted = [...apiComparison.endpoints].sort((a, b) => a.change - b.change);
    const improvements = sorted.filter((e) => e.improved).slice(0, 3);
    const regressions = sorted.filter((e) => !e.improved).slice(-3).reverse();

    if (improvements.length > 0) {
      console.log('\nTop Improvements:');
      improvements.forEach((e, i) => {
        console.log(`  ${i + 1}. ${e.name}: ${e.before.toFixed(2)}ms → ${e.after.toFixed(2)}ms (${formatChange(e.change)})`);
      });
    }

    if (regressions.length > 0) {
      console.log('\nRegressions:');
      regressions.forEach((e, i) => {
        console.log(`  ${i + 1}. ${e.name}: ${e.before.toFixed(2)}ms → ${e.after.toFixed(2)}ms (${formatChange(e.change)})`);
      });
    }

    console.log('');
  }

  // Database comparison
  if (dbComparison) {
    console.log('DATABASE PERFORMANCE');
    console.log('─'.repeat(80));
    console.log(
      `Average Query Time: ${dbComparison.overall.avgBefore.toFixed(2)}ms → ${dbComparison.overall.avgAfter.toFixed(2)}ms (${formatChange(dbComparison.overall.change)})`
    );
    console.log(
      `Slow Queries: ${dbComparison.overall.slowQueriesBefore} → ${dbComparison.overall.slowQueriesAfter}`
    );

    const sorted = [...dbComparison.queries].sort((a, b) => a.change - b.change);
    const improvements = sorted.filter((q) => q.improved).slice(0, 3);
    const regressions = sorted.filter((q) => !q.improved).slice(-3).reverse();

    if (improvements.length > 0) {
      console.log('\nTop Query Improvements:');
      improvements.forEach((q, i) => {
        console.log(`  ${i + 1}. ${q.name}: ${q.before.toFixed(2)}ms → ${q.after.toFixed(2)}ms (${formatChange(q.change)})`);
      });
    }

    if (regressions.length > 0) {
      console.log('\nQuery Regressions:');
      regressions.forEach((q, i) => {
        console.log(`  ${i + 1}. ${q.name}: ${q.before.toFixed(2)}ms → ${q.after.toFixed(2)}ms (${formatChange(q.change)})`);
      });
    }

    console.log('');
  }

  // System comparison
  if (systemComparison) {
    console.log('SYSTEM RESOURCES');
    console.log('─'.repeat(80));
    console.log(
      `CPU Usage: ${systemComparison.cpu.before.toFixed(2)}% → ${systemComparison.cpu.after.toFixed(2)}% (${formatChange(systemComparison.cpu.change)})`
    );
    console.log(
      `Memory Usage: ${systemComparison.memory.before.toFixed(2)}% → ${systemComparison.memory.after.toFixed(2)}% (${formatChange(systemComparison.memory.change)})`
    );
    console.log(
      `Load Average: ${systemComparison.loadAverage.before.toFixed(2)} → ${systemComparison.loadAverage.after.toFixed(2)} (${formatChange(systemComparison.loadAverage.change)})`
    );
    console.log('');
  }

  // Overall verdict
  console.log('═'.repeat(80));
  console.log('OVERALL VERDICT');
  console.log('═'.repeat(80));

  const improvements = [];
  const regressions = [];

  if (apiComparison && apiComparison.overall.changes.p95.improved) {
    improvements.push('API P95 latency improved');
  } else if (apiComparison && !apiComparison.overall.changes.p95.improved) {
    regressions.push('API P95 latency regressed');
  }

  if (dbComparison && dbComparison.overall.change < 0) {
    improvements.push('Database query performance improved');
  } else if (dbComparison && dbComparison.overall.change > 0) {
    regressions.push('Database query performance regressed');
  }

  if (systemComparison && systemComparison.cpu.change < 0) {
    improvements.push('CPU usage reduced');
  } else if (systemComparison && systemComparison.cpu.change > 0) {
    regressions.push('CPU usage increased');
  }

  if (improvements.length > 0) {
    console.log('\n✓ Improvements:');
    improvements.forEach((imp) => console.log(`  - ${imp}`));
  }

  if (regressions.length > 0) {
    console.log('\n✗ Regressions:');
    regressions.forEach((reg) => console.log(`  - ${reg}`));
  }

  if (improvements.length === 0 && regressions.length === 0) {
    console.log('\nNo significant changes detected.');
  }

  console.log('');
  console.log('═'.repeat(80));

  // Save comparison report
  const reportPath = path.join(afterDir, 'COMPARISON_REPORT.md');
  saveComparisonReport(reportPath, beforeDir, afterDir, {
    api: apiComparison,
    database: dbComparison,
    system: systemComparison,
  });

  console.log(`\nComparison report saved to: ${reportPath}`);
}

function saveComparisonReport(filePath, beforeDir, afterDir, comparisons) {
  let report = '# Performance Baseline Comparison\n\n';
  report += `**Before**: ${beforeDir}\n`;
  report += `**After**: ${afterDir}\n`;
  report += `**Generated**: ${new Date().toISOString()}\n\n`;

  report += '## Summary\n\n';

  // Add comparison data...
  // (Implementation similar to console output but in markdown)

  fs.writeFileSync(filePath, report);
}

// =============================================================================
// MAIN
// =============================================================================

if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: node compare-baselines.js <before-dir> <after-dir>');
    process.exit(1);
  }

  const beforeDir = args[0];
  const afterDir = args[1];

  if (!fs.existsSync(beforeDir)) {
    console.error(`Error: Before directory not found: ${beforeDir}`);
    process.exit(1);
  }

  if (!fs.existsSync(afterDir)) {
    console.error(`Error: After directory not found: ${afterDir}`);
    process.exit(1);
  }

  try {
    generateComparisonReport(beforeDir, afterDir);
    process.exit(0);
  } catch (error) {
    console.error('Error comparing baselines:', error);
    process.exit(1);
  }
}

module.exports = { generateComparisonReport };
