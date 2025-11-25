/**
 * Test Configuration
 *
 * Provides test-specific configuration values for integration tests.
 * These values override production configuration when running tests.
 */

import { getTestDatabaseUrl } from '../setup';

export const testConfig = {
  // OpenAI Configuration (mocked in tests)
  openai: {
    apiKey: 'test-api-key-mock',
    model: 'gpt-4',
    maxTokens: 1000,
    temperature: 0.7,
  },

  // WhatsApp Configuration (mocked in tests)
  whatsapp: {
    phoneNumberId: 'test-phone-123456789',
    accessToken: 'test-token-whatsapp',
    webhookVerifyToken: 'test-verify-token',
    apiUrl: 'https://graph.facebook.com/v18.0',
  },

  // Database Configuration (uses test database)
  database: {
    url: getTestDatabaseUrl(),
  },

  // Redis Configuration (optional mock)
  redis: {
    url: 'redis://localhost:6379/1', // Use DB 1 for tests
  },

  // App Configuration
  app: {
    environment: 'test',
    port: 3000,
    corsOrigin: '*',
    apiPrefix: 'api/v1',
    appName: 'WhatsApp SaaS API - Test',
    appUrl: 'http://localhost:3000',
  },

  // JWT Configuration
  jwt: {
    secret: 'test-jwt-secret-key',
    expiresIn: '1h',
    refreshExpiresIn: '7d',
  },

  // Cache Configuration
  cache: {
    ttl: 3600,
    salonTtl: 1800,
  },

  // Queue Configuration
  queue: {
    concurrency: 1,
    retryAttempts: 1,
  },
};

/**
 * Get nested config value using dot notation
 * Example: get('openai.apiKey') returns 'test-api-key-mock'
 */
export function getTestConfigValue(key: string): any {
  const keys = key.split('.');
  let value: any = testConfig;

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return undefined;
    }
  }

  return value;
}
