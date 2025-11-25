/**
 * =============================================================================
 * JEST CONFIGURATION FOR INTEGRATION TESTS
 * =============================================================================
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Test match patterns
  testMatch: [
    '**/tests/integration/suites/**/*.test.js',
  ],

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/setup.js'],

  // Global setup/teardown
  globalSetup: '<rootDir>/global-setup.js',
  globalTeardown: '<rootDir>/global-teardown.js',

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/**/*.test.{js,jsx}',
    '!src/**/__tests__/**',
    '!src/**/index.js',
  ],

  coverageThresholds: {
    global: {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  coverageDirectory: '<rootDir>/../../coverage/integration',

  coverageReporters: ['text', 'lcov', 'html', 'json'],

  // Timeout
  testTimeout: 30000, // 30 seconds

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks between tests
  restoreMocks: true,

  // Reset mocks between tests
  resetMocks: true,

  // Detect open handles
  detectOpenHandles: true,

  // Force exit after tests
  forceExit: true,

  // Max workers (parallel execution)
  maxWorkers: 4,

  // Module paths
  moduleDirectories: ['node_modules', 'src'],

  // Transform files
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
};
