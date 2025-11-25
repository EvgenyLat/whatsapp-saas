/**
 * =============================================================================
 * JEST CONFIGURATION FOR SECURITY TESTS
 * =============================================================================
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Test match patterns
  testMatch: [
    '**/tests/security/suites/**/*.test.js',
  ],

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/setup.js'],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/**/*.test.{js,jsx}',
    '!src/**/__tests__/**',
    '!src/**/index.js',
  ],

  coverageThresholds: {
    global: {
      branches: 70,
      functions: 75,
      lines: 75,
      statements: 75,
    },
  },

  coverageDirectory: '<rootDir>/../../coverage/security',

  coverageReporters: ['text', 'lcov', 'html', 'json'],

  // Timeout for security tests
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

  // Max workers (security tests can be resource intensive)
  maxWorkers: 2,

  // Module paths
  moduleDirectories: ['node_modules', 'src'],

  // Transform files
  transform: {
    '^.+\\.js$': 'babel-jest',
  },

  // Test name pattern (for running specific security test categories)
  // Can be overridden with --testNamePattern flag
  testNamePattern: process.env.TEST_PATTERN || undefined,
};
