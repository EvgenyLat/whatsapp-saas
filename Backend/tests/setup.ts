/**
 * T018: Supertest Integration Test Setup
 *
 * This module provides comprehensive test setup and teardown utilities for integration tests.
 * It configures the NestJS test application, database connections, and cleanup procedures.
 *
 * Usage:
 * ```typescript
 * import { setupTestApp, cleanupTestApp, getTestPrisma } from './setup';
 *
 * describe('Integration Tests', () => {
 *   let app: INestApplication;
 *   let prisma: PrismaClient;
 *
 *   beforeAll(async () => {
 *     app = await setupTestApp();
 *     prisma = getTestPrisma();
 *   });
 *
 *   afterAll(async () => {
 *     await cleanupTestApp(app);
 *   });
 *
 *   it('should work', async () => {
 *     return request(app.getHttpServer())
 *       .get('/api/v1/health')
 *       .expect(200);
 *   });
 * });
 * ```
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { createMockOpenAI } from './mocks/openai.mock';
import { createMockRedis } from './mocks/redis.mock';
import { createMockWhatsAppAPI, MockWhatsAppAPI } from './mocks/whatsapp-api.mock';

// Global test instances
let testPrisma: PrismaClient | null = null;
let testDatabaseUrl: string | null = null;
let mockOpenAI: any = null;
let mockRedis: any = null;
let mockWhatsApp: MockWhatsAppAPI | null = null;

/**
 * Get or create a test-specific database URL
 * Generates a unique database name based on the test process ID
 */
export function getTestDatabaseUrl(): string {
  if (testDatabaseUrl) {
    return testDatabaseUrl;
  }

  const baseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/whatsapp_test';
  const url = new URL(baseUrl);

  // Create unique database name for parallel test execution
  const testId = process.env.JEST_WORKER_ID || '1';
  const originalDbName = url.pathname.substring(1);
  url.pathname = `/${originalDbName}_${testId}`;

  testDatabaseUrl = url.toString();
  return testDatabaseUrl;
}

/**
 * Get or create the test Prisma client
 * Uses a dedicated test database to avoid conflicts with development data
 */
export function getTestPrisma(): PrismaClient {
  if (!testPrisma) {
    testPrisma = new PrismaClient({
      datasources: {
        db: {
          url: getTestDatabaseUrl(),
        },
      },
      log: process.env.DEBUG_TESTS ? ['query', 'error', 'warn'] : ['error'],
    });
  }
  return testPrisma;
}

/**
 * Get the mock OpenAI client instance
 * Returns the mock created during setupTestApp()
 */
export function getMockOpenAI(): any {
  if (!mockOpenAI) {
    throw new Error('Mock OpenAI not initialized. Call setupTestApp() first.');
  }
  return mockOpenAI;
}

/**
 * Get the mock Redis client instance
 * Returns the mock created during setupTestApp()
 */
export function getMockRedis(): any {
  if (!mockRedis) {
    throw new Error('Mock Redis not initialized. Call setupTestApp() first.');
  }
  return mockRedis;
}

/**
 * Get the mock WhatsApp API instance
 * Returns the mock created during setupTestApp()
 */
export function getMockWhatsApp(): MockWhatsAppAPI {
  if (!mockWhatsApp) {
    throw new Error('Mock WhatsApp not initialized. Call setupTestApp() first.');
  }
  return mockWhatsApp;
}

/**
 * Test configuration values
 * Maps configuration keys to test values
 */
const testConfig: Record<string, any> = {
  OPENAI_API_KEY: 'test-openai-key',
  REDIS_HOST: 'localhost',
  REDIS_PORT: 6379,
  WHATSAPP_API_URL: 'https://graph.facebook.com/v18.0',
  WHATSAPP_PHONE_NUMBER_ID: '123456789012345',
  WHATSAPP_ACCESS_TOKEN: 'test-access-token',
  JWT_SECRET: 'test-jwt-secret',
  NODE_ENV: 'test',
};

/**
 * Get test configuration value
 * @param key - Configuration key
 * @returns Configuration value or undefined
 */
function getTestConfigValue(key: string): any {
  return testConfig[key] || process.env[key];
}

/**
 * Initialize the test database schema
 * Runs Prisma migrations to set up the database structure
 */
export async function initializeTestDatabase(): Promise<void> {
  const databaseUrl = getTestDatabaseUrl();

  try {
    // Create the database if it doesn't exist (PostgreSQL)
    const url = new URL(databaseUrl);
    const dbName = url.pathname.substring(1);
    const baseUrl = `${url.protocol}//${url.username}:${url.password}@${url.host}/postgres`;

    const createDbClient = new PrismaClient({
      datasources: { db: { url: baseUrl } },
    });

    try {
      await createDbClient.$executeRawUnsafe(`CREATE DATABASE "${dbName}"`);
      console.log(`Created test database: ${dbName}`);
    } catch (error: any) {
      // Database might already exist, which is fine
      if (!error.message?.includes('already exists')) {
        console.warn(`Warning creating database: ${error.message}`);
      }
    } finally {
      await createDbClient.$disconnect();
    }

    // Run migrations to set up schema
    console.log('Running Prisma migrations for test database...');
    execSync('npx prisma migrate deploy', {
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
      },
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
    });

    console.log('Test database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize test database:', error);
    throw error;
  }
}

/**
 * Clean the test database
 * Removes all data from tables while preserving schema
 */
export async function cleanTestDatabase(): Promise<void> {
  const prisma = getTestPrisma();

  try {
    // Delete data in reverse order of dependencies to avoid foreign key violations
    await prisma.$transaction([
      prisma.reminder.deleteMany(),
      prisma.waitlist.deleteMany(),
      prisma.customerPreferences.deleteMany(),
      prisma.booking.deleteMany(),
      prisma.aIMessage.deleteMany(),
      prisma.aIConversation.deleteMany(),
      prisma.aIResponseCache.deleteMany(),
      prisma.message.deleteMany(),
      prisma.conversation.deleteMany(),
      prisma.webhookLog.deleteMany(),
      prisma.template.deleteMany(),
      prisma.service.deleteMany(),
      prisma.master.deleteMany(),
      prisma.refreshToken.deleteMany(),
      prisma.emailVerification.deleteMany(),
      prisma.passwordReset.deleteMany(),
      prisma.salon.deleteMany(),
      prisma.user.deleteMany(),
    ]);

    console.log('Test database cleaned successfully');
  } catch (error) {
    console.error('Failed to clean test database:', error);
    throw error;
  }
}

/**
 * Drop the test database completely
 * Used for complete cleanup after test suites
 */
export async function dropTestDatabase(): Promise<void> {
  const databaseUrl = getTestDatabaseUrl();

  try {
    // Disconnect from test database first
    if (testPrisma) {
      await testPrisma.$disconnect();
      testPrisma = null;
    }

    // Connect to postgres database to drop test database
    const url = new URL(databaseUrl);
    const dbName = url.pathname.substring(1);
    const baseUrl = `${url.protocol}//${url.username}:${url.password}@${url.host}/postgres`;

    const dropDbClient = new PrismaClient({
      datasources: { db: { url: baseUrl } },
    });

    try {
      // Terminate existing connections
      await dropDbClient.$executeRawUnsafe(`
        SELECT pg_terminate_backend(pg_stat_activity.pid)
        FROM pg_stat_activity
        WHERE pg_stat_activity.datname = '${dbName}'
          AND pid <> pg_backend_pid()
      `);

      // Drop database
      await dropDbClient.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${dbName}"`);
      console.log(`Dropped test database: ${dbName}`);
    } finally {
      await dropDbClient.$disconnect();
    }
  } catch (error) {
    console.error('Failed to drop test database:', error);
    // Don't throw - cleanup should be best-effort
  }
}

/**
 * Setup NestJS test application with all required modules
 * Configures the app with validation pipes and test configurations
 */
export async function setupTestApp(moduleClass?: any): Promise<INestApplication> {
  // Initialize test database first
  await initializeTestDatabase();

  // Import AppModule dynamically to avoid circular dependencies
  const { AppModule } = await import('../src/app.module');
  const ModuleToTest = moduleClass || AppModule;

  // Create mock instances
  mockOpenAI = createMockOpenAI();
  mockRedis = createMockRedis();
  mockWhatsApp = createMockWhatsAppAPI();

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: '.env.test',
      }),
      ModuleToTest,
    ],
  })
    // Override PrismaClient with test database
    .overrideProvider(PrismaClient)
    .useValue(getTestPrisma())
    // Override ConfigService with test configuration
    .overrideProvider(ConfigService)
    .useValue({
      get: (key: string, defaultValue?: any) => {
        const value = getTestConfigValue(key);
        return value !== undefined ? value : defaultValue;
      },
      getOrThrow: (key: string) => {
        const value = getTestConfigValue(key);
        if (value === undefined) {
          throw new Error(`Configuration key ${key} not found in test config`);
        }
        return value;
      },
    })
    .compile();

  const app = moduleFixture.createNestApplication();

  // Apply the same configuration as the main app
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Set API prefix
  app.setGlobalPrefix('api/v1');

  await app.init();

  console.log('Test application initialized');
  return app;
}

/**
 * Cleanup test application and database connections
 * Should be called in afterAll() hooks
 */
export async function cleanupTestApp(app: INestApplication): Promise<void> {
  if (app) {
    await app.close();
    console.log('Test application closed');
  }

  if (testPrisma) {
    await testPrisma.$disconnect();
    testPrisma = null;
    console.log('Test Prisma client disconnected');
  }
}

/**
 * Complete test environment teardown
 * Drops the test database and cleans up all resources
 */
export async function teardownTestEnvironment(): Promise<void> {
  await dropTestDatabase();
  testDatabaseUrl = null;
}

/**
 * Seed test data into the database
 * Useful for creating baseline data for tests
 */
export async function seedTestData(): Promise<void> {
  const prisma = getTestPrisma();
  const bcrypt = await import('bcryptjs');

  // Create test user (owner)
  const hashedPassword = await bcrypt.hash('TestPassword123!', 10);
  const testUser = await prisma.user.create({
    data: {
      id: 'test-user-1',
      email: 'test@example.com',
      password: hashedPassword,
      first_name: 'Test',
      last_name: 'User',
      phone: '+1234567890',
      role: 'SALON_OWNER',
      is_email_verified: true,
      is_active: true,
    },
  });

  // Create test salon
  const testSalon = await prisma.salon.create({
    data: {
      id: 'test-salon-1',
      name: 'Test Beauty Salon',
      phone_number_id: '123456789',
      access_token: 'test_access_token',
      owner_id: testUser.id,
      is_active: true,
      trial_status: 'ACTIVE',
    },
  });

  // Create test services with proper categories
  const haircutService = await prisma.service.create({
    data: {
      name: 'Haircut',
      description: 'Professional haircut service',
      price: 50.0,
      duration_minutes: 60,
      category: 'HAIRCUT',
      is_active: true,
      salon_id: testSalon.id,
    },
  });

  const manicureService = await prisma.service.create({
    data: {
      name: 'Manicure',
      description: 'Professional manicure service',
      price: 40.0,
      duration_minutes: 45,
      category: 'MANICURE',
      is_active: true,
      salon_id: testSalon.id,
    },
  });

  const facialService = await prisma.service.create({
    data: {
      name: 'Facial',
      description: 'Relaxing facial treatment',
      price: 80.0,
      duration_minutes: 60,
      category: 'FACIAL',
      is_active: true,
      salon_id: testSalon.id,
    },
  });

  const coloringService = await prisma.service.create({
    data: {
      name: 'Hair Coloring',
      description: 'Professional hair coloring',
      price: 120.0,
      duration_minutes: 90,
      category: 'COLORING',
      is_active: true,
      salon_id: testSalon.id,
    },
  });

  const pedicureService = await prisma.service.create({
    data: {
      name: 'Pedicure',
      description: 'Relaxing pedicure service',
      price: 45.0,
      duration_minutes: 50,
      category: 'PEDICURE',
      is_active: true,
      salon_id: testSalon.id,
    },
  });

  const massageService = await prisma.service.create({
    data: {
      name: 'Massage',
      description: 'Therapeutic massage',
      price: 90.0,
      duration_minutes: 60,
      category: 'MASSAGE',
      is_active: true,
      salon_id: testSalon.id,
    },
  });

  // Create test masters with working hours
  const workingHours = {
    monday: { start: '09:00', end: '18:00', enabled: true },
    tuesday: { start: '09:00', end: '18:00', enabled: true },
    wednesday: { start: '09:00', end: '18:00', enabled: true },
    thursday: { start: '09:00', end: '18:00', enabled: true },
    friday: { start: '09:00', end: '18:00', enabled: true },
    saturday: { start: '10:00', end: '16:00', enabled: true },
    sunday: { start: '00:00', end: '00:00', enabled: false },
  };

  // Sarah - Haircut & Coloring specialist
  const sarah = await prisma.master.create({
    data: {
      id: 'm123',
      name: 'Sarah Johnson',
      phone: '+1234567891',
      email: 'sarah@testsalon.com',
      specialization: ['HAIRCUT', 'COLORING'],
      is_active: true,
      salon_id: testSalon.id,
      working_hours: workingHours,
    },
  });

  // Emily - Manicure & Pedicure specialist
  const emily = await prisma.master.create({
    data: {
      name: 'Emily Davis',
      phone: '+1234567892',
      email: 'emily@testsalon.com',
      specialization: ['MANICURE', 'PEDICURE'],
      is_active: true,
      salon_id: testSalon.id,
      working_hours: workingHours,
    },
  });

  // Jessica - Facial & Massage specialist
  const jessica = await prisma.master.create({
    data: {
      name: 'Jessica Martinez',
      phone: '+1234567893',
      email: 'jessica@testsalon.com',
      specialization: ['FACIAL', 'MASSAGE'],
      is_active: true,
      salon_id: testSalon.id,
      working_hours: workingHours,
    },
  });

  console.log('Test data seeded successfully');
  console.log('- Test User:', testUser.email);
  console.log('- Test Salon:', testSalon.name);
  console.log('- Services: Haircut, Manicure, Facial, Coloring, Pedicure, Massage');
  console.log('- Masters: Sarah Johnson, Emily Davis, Jessica Martinez');
}

/**
 * Get test salon from database
 * Returns the first active salon (should be the test salon)
 */
export async function getTestSalon() {
  const prisma = getTestPrisma();
  const salon = await prisma.salon.findFirst({
    where: { is_active: true },
  });

  if (!salon) {
    throw new Error('Test salon not found. Did you run seedTestData()?');
  }

  return salon;
}

/**
 * Get all test services from database
 * Returns all active services for the test salon
 */
export async function getTestServices() {
  const prisma = getTestPrisma();
  const salon = await getTestSalon();

  const services = await prisma.service.findMany({
    where: {
      salon_id: salon.id,
      is_active: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  return services;
}

/**
 * Get all test masters from database
 * Returns all active masters for the test salon
 */
export async function getTestMasters() {
  const prisma = getTestPrisma();
  const salon = await getTestSalon();

  const masters = await prisma.master.findMany({
    where: {
      salon_id: salon.id,
      is_active: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  return masters;
}

/**
 * Get test user (salon owner) from database
 */
export async function getTestUser() {
  const prisma = getTestPrisma();
  const user = await prisma.user.findFirst({
    where: { email: 'test@example.com' },
  });

  if (!user) {
    throw new Error('Test user not found. Did you run seedTestData()?');
  }

  return user;
}

/**
 * Wait for a condition to be true
 * Useful for waiting for async operations to complete
 */
export async function waitFor(
  conditionFn: () => Promise<boolean> | boolean,
  options: { timeout?: number; interval?: number } = {},
): Promise<void> {
  const { timeout = 5000, interval = 100 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await conditionFn()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error('Timeout waiting for condition');
}

// ============================================================================
// Global Test Hooks
// ============================================================================

/**
 * Global test setup
 * Called once before all test suites
 */
export async function globalTestSetup(): Promise<void> {
  console.log('='.repeat(60));
  console.log('Setting up test environment...');
  console.log('='.repeat(60));

  await initializeTestDatabase();

  console.log('='.repeat(60));
  console.log('Test environment ready');
  console.log('='.repeat(60));
}

/**
 * Global test teardown
 * Called once after all test suites
 */
export async function globalTestTeardown(): Promise<void> {
  console.log('='.repeat(60));
  console.log('Tearing down test environment...');
  console.log('='.repeat(60));

  await teardownTestEnvironment();

  console.log('='.repeat(60));
  console.log('Test environment cleaned up');
  console.log('='.repeat(60));
}

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Create a mock request context for testing
 */
export function createMockRequest(overrides: any = {}) {
  return {
    headers: {},
    body: {},
    query: {},
    params: {},
    user: null,
    ...overrides,
  };
}

/**
 * Create a mock response context for testing
 */
export function createMockResponse() {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    header: jest.fn().mockReturnThis(),
  };
  return res;
}

/**
 * Generate a unique test ID
 */
export function generateTestId(prefix: string = 'test'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Delay execution for testing timing-dependent code
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Export commonly used test utilities
export { PrismaClient } from '@prisma/client';
export type { INestApplication } from '@nestjs/common';
