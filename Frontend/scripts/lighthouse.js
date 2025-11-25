/**
 * Lighthouse Performance Testing Script
 *
 * Runs Lighthouse audits on key pages and generates reports
 *
 * Prerequisites:
 * - npm install -D lighthouse chrome-launcher
 *
 * Usage:
 * - npm run lighthouse
 */

const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = process.env.LIGHTHOUSE_URL || 'http://localhost:3001';
const PAGES_TO_TEST = [
  { name: 'Homepage', url: '/' },
  { name: 'Dashboard', url: '/dashboard', requiresAuth: true },
  { name: 'Bookings', url: '/dashboard/bookings', requiresAuth: true },
  { name: 'Messages', url: '/dashboard/messages', requiresAuth: true },
];

const THRESHOLDS = {
  performance: 85,
  accessibility: 90,
  'best-practices': 90,
  seo: 90,
  pwa: 80,
};

// Lighthouse options
const lighthouseOptions = {
  extends: 'lighthouse:default',
  settings: {
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo', 'pwa'],
    skipAudits: ['uses-http2'], // Skip HTTP/2 check for local testing
    throttling: {
      rttMs: 40,
      throughputKbps: 10 * 1024,
      cpuSlowdownMultiplier: 1,
    },
  },
};

// Mobile configuration
const mobileConfig = {
  ...lighthouseOptions,
  settings: {
    ...lighthouseOptions.settings,
    formFactor: 'mobile',
    throttling: {
      rttMs: 150,
      throughputKbps: 1.6 * 1024,
      cpuSlowdownMultiplier: 4,
    },
  },
};

/**
 * Launch Chrome and run Lighthouse
 */
async function runLighthouse(url, config) {
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
  const options = {
    ...config,
    port: chrome.port,
  };

  try {
    const runnerResult = await lighthouse(url, options);
    await chrome.kill();
    return runnerResult;
  } catch (error) {
    await chrome.kill();
    throw error;
  }
}

/**
 * Generate HTML report
 */
function generateReport(results, outputDir) {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  results.forEach((result) => {
    const filename = `${result.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.html`;
    const filepath = path.join(outputDir, filename);
    fs.writeFileSync(filepath, result.report);
    console.log(`Report saved: ${filepath}`);
  });
}

/**
 * Generate JSON summary
 */
function generateSummary(results, outputDir) {
  const summary = {
    timestamp: new Date().toISOString(),
    results: results.map((result) => ({
      name: result.name,
      url: result.url,
      scores: result.scores,
      metrics: result.metrics,
      passed: result.passed,
    })),
    overall: {
      passed: results.every((r) => r.passed),
      totalTests: results.length,
      passedTests: results.filter((r) => r.passed).length,
    },
  };

  const filepath = path.join(outputDir, `summary-${Date.now()}.json`);
  fs.writeFileSync(filepath, JSON.stringify(summary, null, 2));
  console.log(`Summary saved: ${filepath}`);

  return summary;
}

/**
 * Format score with color
 */
function formatScore(score, threshold) {
  const percentage = Math.round(score * 100);
  const passed = percentage >= threshold;
  const icon = passed ? '✅' : '❌';
  return `${icon} ${percentage}`;
}

/**
 * Main test function
 */
async function main() {
  console.log('🚀 Starting Lighthouse Performance Tests\n');
  console.log(`Testing URL: ${BASE_URL}`);
  console.log(`Pages to test: ${PAGES_TO_TEST.length}\n`);

  const results = [];
  const outputDir = path.join(__dirname, '..', 'lighthouse-reports');

  for (const page of PAGES_TO_TEST) {
    const url = `${BASE_URL}${page.url}`;
    console.log(`\n📊 Testing: ${page.name} (${url})`);

    try {
      // Run desktop test
      console.log('  Running desktop audit...');
      const desktopResult = await runLighthouse(url, lighthouseOptions);

      // Run mobile test
      console.log('  Running mobile audit...');
      const mobileResult = await runLighthouse(url, mobileConfig);

      // Extract scores
      const desktopScores = {
        performance: desktopResult.lhr.categories.performance.score,
        accessibility: desktopResult.lhr.categories.accessibility.score,
        'best-practices': desktopResult.lhr.categories['best-practices'].score,
        seo: desktopResult.lhr.categories.seo.score,
        pwa: desktopResult.lhr.categories.pwa.score,
      };

      const mobileScores = {
        performance: mobileResult.lhr.categories.performance.score,
        accessibility: mobileResult.lhr.categories.accessibility.score,
        'best-practices': mobileResult.lhr.categories['best-practices'].score,
        seo: mobileResult.lhr.categories.seo.score,
        pwa: mobileResult.lhr.categories.pwa.score,
      };

      // Extract metrics
      const metrics = {
        desktop: {
          FCP: desktopResult.lhr.audits['first-contentful-paint'].numericValue,
          LCP: desktopResult.lhr.audits['largest-contentful-paint'].numericValue,
          TBT: desktopResult.lhr.audits['total-blocking-time'].numericValue,
          CLS: desktopResult.lhr.audits['cumulative-layout-shift'].numericValue,
          SI: desktopResult.lhr.audits['speed-index'].numericValue,
        },
        mobile: {
          FCP: mobileResult.lhr.audits['first-contentful-paint'].numericValue,
          LCP: mobileResult.lhr.audits['largest-contentful-paint'].numericValue,
          TBT: mobileResult.lhr.audits['total-blocking-time'].numericValue,
          CLS: mobileResult.lhr.audits['cumulative-layout-shift'].numericValue,
          SI: mobileResult.lhr.audits['speed-index'].numericValue,
        },
      };

      // Check if passed
      const desktopPassed = Object.entries(desktopScores).every(
        ([key, score]) => Math.round(score * 100) >= THRESHOLDS[key]
      );
      const mobilePassed = Object.entries(mobileScores).every(
        ([key, score]) => Math.round(score * 100) >= THRESHOLDS[key]
      );

      // Print results
      console.log('\n  Desktop Scores:');
      Object.entries(desktopScores).forEach(([key, score]) => {
        console.log(`    ${key}: ${formatScore(score, THRESHOLDS[key])}`);
      });

      console.log('\n  Mobile Scores:');
      Object.entries(mobileScores).forEach(([key, score]) => {
        console.log(`    ${key}: ${formatScore(score, THRESHOLDS[key])}`);
      });

      console.log('\n  Core Web Vitals (Desktop):');
      console.log(`    FCP: ${Math.round(metrics.desktop.FCP)}ms`);
      console.log(`    LCP: ${Math.round(metrics.desktop.LCP)}ms`);
      console.log(`    TBT: ${Math.round(metrics.desktop.TBT)}ms`);
      console.log(`    CLS: ${metrics.desktop.CLS.toFixed(3)}`);

      console.log('\n  Core Web Vitals (Mobile):');
      console.log(`    FCP: ${Math.round(metrics.mobile.FCP)}ms`);
      console.log(`    LCP: ${Math.round(metrics.mobile.LCP)}ms`);
      console.log(`    TBT: ${Math.round(metrics.mobile.TBT)}ms`);
      console.log(`    CLS: ${metrics.mobile.CLS.toFixed(3)}`);

      results.push({
        name: page.name,
        url: url,
        scores: { desktop: desktopScores, mobile: mobileScores },
        metrics: metrics,
        passed: desktopPassed && mobilePassed,
        report: desktopResult.report,
      });
    } catch (error) {
      console.error(`  ❌ Error testing ${page.name}:`, error.message);
      results.push({
        name: page.name,
        url: url,
        scores: null,
        metrics: null,
        passed: false,
        error: error.message,
      });
    }
  }

  // Generate reports
  console.log('\n📝 Generating reports...');
  generateReport(results, outputDir);
  const summary = generateSummary(results, outputDir);

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 LIGHTHOUSE TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${summary.overall.totalTests}`);
  console.log(`Passed: ${summary.overall.passedTests}`);
  console.log(`Failed: ${summary.overall.totalTests - summary.overall.passedTests}`);
  console.log(`Overall: ${summary.overall.passed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('='.repeat(60) + '\n');

  // Exit with appropriate code
  process.exit(summary.overall.passed ? 0 : 1);
}

// Run tests
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
