/**
 * =============================================================================
 * PLAYWRIGHT CONFIGURATION
 * =============================================================================
 * Configuration for end-to-end tests with Playwright
 * =============================================================================
 */

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  // Test directory
  testDir: './specs',

  // Maximum time one test can run
  timeout: 60 * 1000,

  // Maximum time for the entire test run
  globalTimeout: 60 * 60 * 1000, // 1 hour

  // Expect timeout for assertions
  expect: {
    timeout: 10 * 1000,
  },

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Parallel execution
  workers: process.env.CI ? 2 : 4,

  // Reporter to use
  reporter: [
    ['html', { outputFolder: '../../../test-results/e2e-html-report' }],
    ['json', { outputFile: '../../../test-results/e2e-results.json' }],
    ['junit', { outputFile: '../../../test-results/e2e-junit.xml' }],
    ['list'],
  ],

  // Shared settings for all the projects below
  use: {
    // Base URL for navigation
    baseURL: process.env.BASE_URL || 'http://localhost:4000',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',

    // Maximum time for navigation
    navigationTimeout: 30 * 1000,

    // Maximum time for actions
    actionTimeout: 15 * 1000,

    // Ignore HTTPS errors
    ignoreHTTPSErrors: true,

    // Viewport size
    viewport: { width: 1280, height: 720 },

    // User agent
    userAgent: 'Playwright E2E Tests',
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // Mobile viewports
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },

    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  // Run your local dev server before starting the tests
  webServer: process.env.CI
    ? undefined
    : {
        command: 'npm start',
        port: 4000,
        timeout: 120 * 1000,
        reuseExistingServer: !process.env.CI,
        cwd: '../../', // Backend directory
        env: {
          NODE_ENV: 'test',
          PORT: '4000',
        },
      },

  // Global setup/teardown
  globalSetup: require.resolve('./global-setup.js'),
  globalTeardown: require.resolve('./global-teardown.js'),
});
