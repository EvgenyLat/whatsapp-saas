#!/usr/bin/env node

/**
 * =============================================================================
 * BASELINE REPORT GENERATOR
 * =============================================================================
 * Generates comprehensive performance baseline report
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
    console.error(`Error reading ${filePath}:`, error.message);
    return null;
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDuration(ms) {
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function getRating(value, thresholds) {
  if (value <= thresholds.good) return 'Good';
  if (value <= thresholds.acceptable) return 'Acceptable';
  return 'Needs Improvement';
}

// =============================================================================
// REPORT SECTIONS
// =============================================================================

function generateApiSection(apiData) {
  if (!apiData) return 'API benchmark data not available.\n\n';

  let section = '## API Performance\n\n';
  section += `**Timestamp**: ${apiData.timestamp}\n\n`;
  section += `**Configuration**:\n`;
  section += `- Base URL: ${apiData.config.baseUrl}\n`;
  section += `- Iterations: ${apiData.config.iterations}\n`;
  section += `- Warmup Requests: ${apiData.config.warmupRequests}\n\n`;

  section += '### Overall Metrics\n\n';
  section += `- Total Endpoints Tested: ${apiData.summary.totalEndpoints}\n`;
  section += `- Total Requests: ${apiData.summary.totalRequests}\n`;
  section += `- Total Errors: ${apiData.summary.totalErrors}\n`;
  section += `- Overall P50: ${apiData.summary.overallLatency.p50.toFixed(2)}ms\n`;
  section += `- Overall P95: ${apiData.summary.overallLatency.p95.toFixed(2)}ms\n`;
  section += `- Overall P99: ${apiData.summary.overallLatency.p99.toFixed(2)}ms\n\n`;

  section += '### Endpoint Performance\n\n';
  section += '| Endpoint | P50 | P95 | P99 | Max | Error Rate | Response Size |\n';
  section += '|----------|-----|-----|-----|-----|------------|---------------|\n';

  apiData.results.forEach((result) => {
    const p95Rating = getRating(result.latency.p95, { good: 100, acceptable: 200 });
    const p95Symbol = p95Rating === 'Good' ? '✓' : p95Rating === 'Acceptable' ? '⚠' : '✗';

    section += `| ${result.endpoint.name} `;
    section += `| ${result.latency.p50.toFixed(0)}ms `;
    section += `| ${result.latency.p95.toFixed(0)}ms ${p95Symbol} `;
    section += `| ${result.latency.p99.toFixed(0)}ms `;
    section += `| ${result.latency.max.toFixed(0)}ms `;
    section += `| ${result.metrics.errorRate.toFixed(2)}% `;
    section += `| ${formatBytes(result.responseSize.avg)} |\n`;
  });

  section += '\n### Performance Analysis\n\n';

  // Identify slow endpoints
  const slowEndpoints = apiData.results.filter((r) => r.latency.p95 > 200);
  if (slowEndpoints.length > 0) {
    section += '**Slow Endpoints (P95 > 200ms)**:\n';
    slowEndpoints.forEach((endpoint) => {
      section += `- ${endpoint.endpoint.name}: ${endpoint.latency.p95.toFixed(2)}ms\n`;
    });
    section += '\n';
  }

  // Identify endpoints with errors
  const errorEndpoints = apiData.results.filter((r) => r.metrics.errorRate > 0);
  if (errorEndpoints.length > 0) {
    section += '**Endpoints with Errors**:\n';
    errorEndpoints.forEach((endpoint) => {
      section += `- ${endpoint.endpoint.name}: ${endpoint.metrics.errorRate.toFixed(2)}%\n`;
    });
    section += '\n';
  }

  return section;
}

function generateDatabaseSection(dbData) {
  if (!dbData) return 'Database benchmark data not available.\n\n';

  let section = '## Database Performance\n\n';
  section += `**Timestamp**: ${dbData.timestamp}\n\n`;

  section += '### Table Statistics\n\n';
  section += '| Table | Row Count | Total Size | Table Size | Index Size |\n';
  section += '|-------|-----------|------------|------------|------------|\n';

  dbData.tableStats.forEach((stat) => {
    if (!stat.error) {
      section += `| ${stat.table} | ${stat.rowCount.toLocaleString()} | ${stat.totalSize} | ${stat.tableSize} | ${stat.indexesSize} |\n`;
    }
  });

  section += '\n### Query Performance\n\n';
  section += '| Query | Avg | P95 | P99 | Max | Status |\n';
  section += '|-------|-----|-----|-----|-----|--------|\n';

  dbData.results.forEach((result) => {
    const status = result.isSlow ? '⚠ Slow' : '✓ Fast';

    section += `| ${result.query.name} `;
    section += `| ${result.performance.avg.toFixed(2)}ms `;
    section += `| ${result.performance.p95.toFixed(2)}ms `;
    section += `| ${result.performance.p99.toFixed(2)}ms `;
    section += `| ${result.performance.max.toFixed(2)}ms `;
    section += `| ${status} |\n`;
  });

  section += '\n### Performance Analysis\n\n';
  section += `- Total Queries: ${dbData.summary.totalQueries}\n`;
  section += `- Slow Queries (>100ms): ${dbData.summary.slowQueries}\n`;
  section += `- Average Query Time: ${dbData.summary.avgQueryTime.toFixed(2)}ms\n\n`;

  if (dbData.summary.slowQueries > 0) {
    section += '**Slow Queries**:\n';
    const slowQueries = dbData.results.filter((r) => r.isSlow);
    slowQueries.forEach((query) => {
      section += `- ${query.query.name}: ${query.performance.avg.toFixed(2)}ms\n`;
      if (query.executionPlan && query.executionPlan['Execution Time']) {
        section += `  - Planning: ${query.executionPlan['Planning Time'].toFixed(2)}ms\n`;
        section += `  - Execution: ${query.executionPlan['Execution Time'].toFixed(2)}ms\n`;
      }
    });
    section += '\n';
  }

  // Index usage
  if (dbData.indexUsage && dbData.indexUsage.length > 0) {
    section += '### Index Usage\n\n';
    section += 'Top 5 most used indexes:\n';
    const topIndexes = dbData.indexUsage.slice(0, 5);
    topIndexes.forEach((idx) => {
      section += `- ${idx.indexname} (${idx.tablename}): ${idx.index_scans} scans\n`;
    });
    section += '\n';
  }

  return section;
}

function generateFrontendSection(frontendData) {
  if (!frontendData) return 'Frontend audit data not available.\n\n';

  let section = '## Frontend Performance\n\n';
  section += `**Timestamp**: ${frontendData.timestamp}\n\n`;

  section += '### Lighthouse Scores\n\n';

  if (frontendData.results && frontendData.results.length > 0) {
    section += '| Page | Performance | Accessibility | Best Practices | SEO |\n';
    section += '|------|-------------|---------------|----------------|-----|\n';

    frontendData.results.forEach((result) => {
      section += `| ${result.page.name} `;
      section += `| ${result.scores.performance.toFixed(0)} `;
      section += `| ${result.scores.accessibility.toFixed(0)} `;
      section += `| ${result.scores.bestPractices.toFixed(0)} `;
      section += `| ${result.scores.seo.toFixed(0)} |\n`;
    });

    section += '\n### Core Web Vitals\n\n';
    section += '| Page | LCP | TBT | CLS |\n';
    section += '|------|-----|-----|-----|\n';

    frontendData.results.forEach((result) => {
      const lcp = (result.metrics.largestContentfulPaint / 1000).toFixed(2);
      const tbt = result.metrics.totalBlockingTime.toFixed(0);
      const cls = result.metrics.cumulativeLayoutShift.toFixed(3);

      const lcpRating = result.coreWebVitals.lcp.rating;
      const tbtRating = result.coreWebVitals.fid.rating;
      const clsRating = result.coreWebVitals.cls.rating;

      const lcpSymbol = lcpRating === 'good' ? '✓' : lcpRating === 'needs-improvement' ? '⚠' : '✗';
      const tbtSymbol = tbtRating === 'good' ? '✓' : tbtRating === 'needs-improvement' ? '⚠' : '✗';
      const clsSymbol = clsRating === 'good' ? '✓' : clsRating === 'needs-improvement' ? '⚠' : '✗';

      section += `| ${result.page.name} `;
      section += `| ${lcp}s ${lcpSymbol} `;
      section += `| ${tbt}ms ${tbtSymbol} `;
      section += `| ${cls} ${clsSymbol} |\n`;
    });

    section += '\n**Thresholds**:\n';
    section += '- LCP: Good < 2.5s, Needs Improvement < 4s\n';
    section += '- TBT: Good < 100ms, Needs Improvement < 300ms\n';
    section += '- CLS: Good < 0.1, Needs Improvement < 0.25\n\n';

    // Optimization opportunities
    section += '### Optimization Opportunities\n\n';
    frontendData.results.forEach((result) => {
      if (result.opportunities && result.opportunities.length > 0) {
        section += `**${result.page.name}**:\n`;
        result.opportunities.slice(0, 3).forEach((opp, i) => {
          section += `${i + 1}. ${opp.title}\n`;
          if (opp.displayValue) {
            section += `   - Potential savings: ${opp.displayValue}\n`;
          }
        });
        section += '\n';
      }
    });
  }

  return section;
}

function generateSystemSection(systemData) {
  if (!systemData) return 'System monitoring data not available.\n\n';

  let section = '## System Resources\n\n';
  section += `**Timestamp**: ${systemData.timestamp}\n`;
  section += `**Duration**: ${systemData.config.duration} seconds\n`;
  section += `**Interval**: ${systemData.config.interval} second(s)\n\n`;

  section += '### System Metrics\n\n';
  section += `**CPU Usage**:\n`;
  section += `- Average: ${systemData.stats.cpu.avg.toFixed(2)}%\n`;
  section += `- Min: ${systemData.stats.cpu.min.toFixed(2)}%\n`;
  section += `- Max: ${systemData.stats.cpu.max.toFixed(2)}%\n`;
  section += `- P95: ${systemData.stats.cpu.p95.toFixed(2)}%\n\n`;

  section += `**Memory Usage**:\n`;
  section += `- Average: ${systemData.stats.memory.avg.toFixed(2)}%\n`;
  section += `- Min: ${systemData.stats.memory.min.toFixed(2)}%\n`;
  section += `- Max: ${systemData.stats.memory.max.toFixed(2)}%\n`;
  section += `- P95: ${systemData.stats.memory.p95.toFixed(2)}%\n\n`;

  section += `**Load Average**:\n`;
  section += `- Average: ${systemData.stats.loadAverage.avg.toFixed(2)}\n`;
  section += `- Min: ${systemData.stats.loadAverage.min.toFixed(2)}\n`;
  section += `- Max: ${systemData.stats.loadAverage.max.toFixed(2)}\n\n`;

  if (systemData.stats.process) {
    section += `**Process (${systemData.config.processName})**:\n`;
    section += `- CPU Average: ${systemData.stats.process.cpu.avg.toFixed(2)}%\n`;
    section += `- CPU Max: ${systemData.stats.process.cpu.max.toFixed(2)}%\n`;
    section += `- Memory Average: ${systemData.stats.process.memory.avg.toFixed(2)} MB\n`;
    section += `- Memory Max: ${systemData.stats.process.memory.max.toFixed(2)} MB\n\n`;
  }

  return section;
}

// =============================================================================
// MAIN REPORT GENERATOR
// =============================================================================

function generateReport(baselineDir) {
  console.log('Generating baseline report...');

  // Find result files
  const files = fs.readdirSync(baselineDir);

  const apiFile = files.find((f) => f.startsWith('api-benchmark'));
  const dbFile = files.find((f) => f.startsWith('database-benchmark'));
  const frontendFile = files.find((f) => f.startsWith('frontend-audit'));
  const systemFile = files.find((f) => f.startsWith('system-monitor'));

  // Load data
  const apiData = apiFile ? readJsonFile(path.join(baselineDir, apiFile)) : null;
  const dbData = dbFile ? readJsonFile(path.join(baselineDir, dbFile)) : null;
  const frontendData = frontendFile ? readJsonFile(path.join(baselineDir, frontendFile)) : null;
  const systemData = systemFile ? readJsonFile(path.join(baselineDir, systemFile)) : null;

  // Generate report
  let report = '# Performance Baseline Report\n\n';
  report += `**Generated**: ${new Date().toISOString()}\n\n`;
  report += `**Baseline Directory**: ${baselineDir}\n\n`;

  report += '## Executive Summary\n\n';

  // Summary metrics
  if (apiData) {
    report += `- **API P95 Latency**: ${apiData.summary.overallLatency.p95.toFixed(2)}ms\n`;
  }
  if (dbData) {
    report += `- **Database Avg Query Time**: ${dbData.summary.avgQueryTime.toFixed(2)}ms\n`;
    report += `- **Slow Queries**: ${dbData.summary.slowQueries}\n`;
  }
  if (systemData) {
    report += `- **System CPU Usage (avg)**: ${systemData.stats.cpu.avg.toFixed(2)}%\n`;
    report += `- **System Memory Usage (avg)**: ${systemData.stats.memory.avg.toFixed(2)}%\n`;
  }
  report += '\n---\n\n';

  // Individual sections
  report += generateApiSection(apiData);
  report += generateDatabaseSection(dbData);
  report += generateFrontendSection(frontendData);
  report += generateSystemSection(systemData);

  // Recommendations
  report += '## Recommendations\n\n';

  const recommendations = [];

  if (apiData) {
    const slowEndpoints = apiData.results.filter((r) => r.latency.p95 > 200);
    if (slowEndpoints.length > 0) {
      recommendations.push(
        `Optimize ${slowEndpoints.length} slow API endpoints (P95 > 200ms)`
      );
    }
  }

  if (dbData && dbData.summary.slowQueries > 0) {
    recommendations.push(`Optimize ${dbData.summary.slowQueries} slow database queries (>100ms)`);
    recommendations.push('Consider adding database indexes for frequently queried fields');
  }

  if (frontendData && frontendData.results) {
    const poorPerf = frontendData.results.filter((r) => r.scores.performance < 50);
    if (poorPerf.length > 0) {
      recommendations.push(`Improve frontend performance for ${poorPerf.length} pages (score < 50)`);
    }
  }

  if (systemData) {
    if (systemData.stats.cpu.avg > 70) {
      recommendations.push('High CPU usage detected - consider scaling or optimizing');
    }
    if (systemData.stats.memory.avg > 80) {
      recommendations.push('High memory usage detected - check for memory leaks');
    }
  }

  if (recommendations.length > 0) {
    recommendations.forEach((rec, i) => {
      report += `${i + 1}. ${rec}\n`;
    });
  } else {
    report += 'No critical performance issues detected.\n';
  }

  report += '\n---\n\n';
  report += '## Next Steps\n\n';
  report += '1. Review detailed metrics in individual benchmark files\n';
  report += '2. Implement recommended optimizations\n';
  report += '3. Re-run baseline to measure improvements\n';
  report += '4. Compare baselines using: `node analysis/compare-baselines.js`\n';

  // Save report
  const reportPath = path.join(baselineDir, 'BASELINE_REPORT.md');
  fs.writeFileSync(reportPath, report);

  console.log(`Report generated: ${reportPath}`);

  return report;
}

// =============================================================================
// MAIN
// =============================================================================

if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: node generate-report.js <baseline-directory>');
    process.exit(1);
  }

  const baselineDir = args[0];

  if (!fs.existsSync(baselineDir)) {
    console.error(`Error: Directory not found: ${baselineDir}`);
    process.exit(1);
  }

  try {
    generateReport(baselineDir);
    process.exit(0);
  } catch (error) {
    console.error('Error generating report:', error);
    process.exit(1);
  }
}

module.exports = { generateReport };
