/**
 * Jest Configuration for Integration Tests
 *
 * This configuration is specifically designed for integration tests that:
 * - Use a real database connection
 * - Test multiple modules together
 * - Use Supertest for HTTP testing
 * - May take longer to execute
 */

module.exports = {
  // Use ts-jest for TypeScript support
  preset: 'ts-jest',

  // Node environment for backend tests
  testEnvironment: 'node',

  // Root directory for tests
  rootDir: '.',

  // Test match patterns - only integration tests
  testMatch: [
    '<rootDir>/tests/**/*.test.ts',
    '<rootDir>/tests/**/*.spec.ts',
  ],

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/tests/e2e/',
    '/tests/security/',
    '/tests/integration/suites/',
  ],

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],

  // Module name mapper for path aliases
  moduleNameMapper: {
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@common/(.*)$': '<rootDir>/src/common/$1',
    '^@database/(.*)$': '<rootDir>/src/database/$1',
    '^@modules/(.*)$': '<rootDir>/src/modules/$1',
  },

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.test.ts',
    '!src/main.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.dto.ts',
    '!src/**/*.entity.ts',
  ],

  coverageDirectory: '<rootDir>/coverage/integration',

  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],

  // Coverage thresholds
  coverageThresholds: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  // Globals for ts-jest
  globals: {
    'ts-jest': {
      tsconfig: {
        // Compiler options for tests
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    },
  },

  // Transform configuration
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Verbose output
  verbose: true,

  // Timeouts
  testTimeout: 30000, // 30 seconds for integration tests

  // Run tests in band (sequentially) to avoid database conflicts
  maxWorkers: 1,

  // Detect open handles (useful for finding database connection leaks)
  detectOpenHandles: false,

  // Force exit after tests complete
  forceExit: true,

  // Clear mocks between tests
  clearMocks: true,

  // Reset mocks between tests
  resetMocks: true,

  // Restore mocks between tests
  restoreMocks: true,
};
