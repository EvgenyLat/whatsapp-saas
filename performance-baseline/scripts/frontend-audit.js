#!/usr/bin/env node

/**
 * =============================================================================
 * FRONTEND PERFORMANCE AUDIT
 * =============================================================================
 * Runs Lighthouse audits and analyzes frontend performance
 * =============================================================================
 */

const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs');
const path = require('path');

// =============================================================================
// CONFIGURATION
// =============================================================================

const config = {
  baseUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  pages: [
    { name: 'Home', path: '/' },
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Bookings', path: '/bookings' },
    { name: 'Messages', path: '/messages' },
    { name: 'Analytics', path: '/analytics' },
  ],
  lighthouseConfig: {
    extends: 'lighthouse:default',
    settings: {
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      throttling: {
        rttMs: 40,
        throughputKbps: 10240,
        cpuSlowdownMultiplier: 1,
      },
    },
  },
};

// =============================================================================
// LIGHTHOUSE AUDIT
// =============================================================================

async function runLighthouse(url) {
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
  const options = {
    logLevel: 'error',
    output: 'json',
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    port: chrome.port,
  };

  try {
    const runnerResult = await lighthouse(url, options);
    await chrome.kill();

    const report = runnerResult.lhr;

    return {
      url: url,
      scores: {
        performance: report.categories.performance.score * 100,
        accessibility: report.categories.accessibility.score * 100,
        bestPractices: report.categories['best-practices'].score * 100,
        seo: report.categories.seo.score * 100,
      },
      metrics: {
        firstContentfulPaint: report.audits['first-contentful-paint'].numericValue,
        speedIndex: report.audits['speed-index'].numericValue,
        largestContentfulPaint: report.audits['largest-contentful-paint'].numericValue,
        timeToInteractive: report.audits['interactive'].numericValue,
        totalBlockingTime: report.audits['total-blocking-time'].numericValue,
        cumulativeLayoutShift: report.audits['cumulative-layout-shift'].numericValue,
      },
      diagnostics: {
        mainThreadWork: report.audits['mainthread-work-breakdown']?.details?.items || [],
        networkRequests: report.audits['network-requests']?.details?.items?.length || 0,
        totalByteWeight: report.audits['total-byte-weight']?.numericValue || 0,
        domSize: report.audits['dom-size']?.numericValue || 0,
      },
      opportunities: report.categories.performance.auditRefs
        .filter((ref) => ref.weight > 0 && report.audits[ref.id].score < 1)
        .map((ref) => ({
          id: ref.id,
          title: report.audits[ref.id].title,
          description: report.audits[ref.id].description,
          score: report.audits[ref.id].score,
          numericValue: report.audits[ref.id].numericValue,
          displayValue: report.audits[ref.id].displayValue,
        }))
        .slice(0, 5),
    };
  } catch (error) {
    await chrome.kill();
    throw error;
  }
}

// =============================================================================
// CORE WEB VITALS ANALYSIS
// =============================================================================

function analyzeCoreWebVitals(metrics) {
  const vitals = {
    lcp: {
      value: metrics.largestContentfulPaint,
      threshold: { good: 2500, needsImprovement: 4000 },
      rating: 'good',
    },
    fid: {
      value: metrics.totalBlockingTime, // Proxy for FID
      threshold: { good: 100, needsImprovement: 300 },
      rating: 'good',
    },
    cls: {
      value: metrics.cumulativeLayoutShift,
      threshold: { good: 0.1, needsImprovement: 0.25 },
      rating: 'good',
    },
  };

  // Rate LCP
  if (vitals.lcp.value > vitals.lcp.threshold.needsImprovement) {
    vitals.lcp.rating = 'poor';
  } else if (vitals.lcp.value > vitals.lcp.threshold.good) {
    vitals.lcp.rating = 'needs-improvement';
  }

  // Rate FID (using TBT as proxy)
  if (vitals.fid.value > vitals.fid.threshold.needsImprovement) {
    vitals.fid.rating = 'poor';
  } else if (vitals.fid.value > vitals.fid.threshold.good) {
    vitals.fid.rating = 'needs-improvement';
  }

  // Rate CLS
  if (vitals.cls.value > vitals.cls.threshold.needsImprovement) {
    vitals.cls.rating = 'poor';
  } else if (vitals.cls.value > vitals.cls.threshold.good) {
    vitals.cls.rating = 'needs-improvement';
  }

  return vitals;
}

// =============================================================================
// MAIN AUDIT
// =============================================================================

async function runAudits() {
  console.log('═'.repeat(80));
  console.log('FRONTEND PERFORMANCE AUDIT');
  console.log('═'.repeat(80));
  console.log(`Base URL: ${config.baseUrl}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('');

  const results = [];

  for (const page of config.pages) {
    const url = `${config.baseUrl}${page.path}`;
    console.log(`Auditing: ${page.name} (${url})`);

    try {
      const result = await runLighthouse(url);
      result.page = page;

      // Analyze Core Web Vitals
      result.coreWebVitals = analyzeCoreWebVitals(result.metrics);

      results.push(result);

      // Print summary
      console.log(`  Performance: ${result.scores.performance.toFixed(0)}`);
      console.log(`  LCP: ${(result.metrics.largestContentfulPaint / 1000).toFixed(2)}s (${result.coreWebVitals.lcp.rating})`);
      console.log(`  TBT: ${result.metrics.totalBlockingTime.toFixed(0)}ms (${result.coreWebVitals.fid.rating})`);
      console.log(`  CLS: ${result.metrics.cumulativeLayoutShift.toFixed(3)} (${result.coreWebVitals.cls.rating})`);

      if (result.opportunities.length > 0) {
        console.log(`  Top Opportunity: ${result.opportunities[0].title}`);
      }

      console.log('');
    } catch (error) {
      console.error(`  Error: ${error.message}`);
      console.log('');
    }
  }

  // Overall summary
  console.log('═'.repeat(80));
  console.log('SUMMARY');
  console.log('═'.repeat(80));

  if (results.length > 0) {
    const avgScores = {
      performance: results.reduce((sum, r) => sum + r.scores.performance, 0) / results.length,
      accessibility: results.reduce((sum, r) => sum + r.scores.accessibility, 0) / results.length,
      bestPractices: results.reduce((sum, r) => sum + r.scores.bestPractices, 0) / results.length,
      seo: results.reduce((sum, r) => sum + r.scores.seo, 0) / results.length,
    };

    console.log('Average Scores:');
    console.log(`  Performance: ${avgScores.performance.toFixed(0)}`);
    console.log(`  Accessibility: ${avgScores.accessibility.toFixed(0)}`);
    console.log(`  Best Practices: ${avgScores.bestPractices.toFixed(0)}`);
    console.log(`  SEO: ${avgScores.seo.toFixed(0)}`);

    console.log('\nCore Web Vitals:');
    const poorVitals = results.filter(
      (r) =>
        r.coreWebVitals.lcp.rating === 'poor' ||
        r.coreWebVitals.fid.rating === 'poor' ||
        r.coreWebVitals.cls.rating === 'poor'
    );
    console.log(`  Pages with Poor Vitals: ${poorVitals.length}/${results.length}`);

    // Common opportunities
    const allOpportunities = results.flatMap((r) => r.opportunities);
    const opportunityCounts = {};
    allOpportunities.forEach((opp) => {
      opportunityCounts[opp.title] = (opportunityCounts[opp.title] || 0) + 1;
    });

    const topOpportunities = Object.entries(opportunityCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    if (topOpportunities.length > 0) {
      console.log('\nMost Common Optimization Opportunities:');
      topOpportunities.forEach(([title, count], i) => {
        console.log(`  ${i + 1}. ${title} (${count} pages)`);
      });
    }
  }

  // Save results
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputPath = path.join(__dirname, '..', 'results', `frontend-audit-${timestamp}.json`);

  const report = {
    timestamp: new Date().toISOString(),
    config: config,
    results: results,
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
  // Check if lighthouse is installed
  try {
    require.resolve('lighthouse');
    require.resolve('chrome-launcher');
  } catch (e) {
    console.error('Error: lighthouse and chrome-launcher are required');
    console.error('Install with: npm install -g lighthouse chrome-launcher');
    process.exit(1);
  }

  runAudits()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error running audits:', error);
      process.exit(1);
    });
}

module.exports = { runAudits };
