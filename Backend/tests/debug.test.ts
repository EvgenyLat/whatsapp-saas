/**
 * Debug Test - Check if the app and tests are properly set up
 */

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  setupTestApp,
  cleanupTestApp,
  getTestPrisma,
  cleanTestDatabase,
  seedTestData,
} from './setup';
import {
  createTextMessageWebhook,
  MockWhatsAppAPI,
  createMockWhatsAppAPI,
} from './mocks/whatsapp-api.mock';

describe('Debug Tests', () => {
  let app: INestApplication;
  let mockWhatsAppAPI: MockWhatsAppAPI;
  const prisma = getTestPrisma();

  beforeAll(async () => {
    console.log('=== Starting debug test setup ===');
    try {
      app = await setupTestApp();
      console.log('App created successfully');
      mockWhatsAppAPI = createMockWhatsAppAPI();
      console.log('Mock WhatsApp API created');
    } catch (error) {
      console.error('Setup failed:', error);
      throw error;
    }
  });

  afterAll(async () => {
    console.log('=== Cleaning up debug test ===');
    await cleanupTestApp(app);
  });

  beforeEach(async () => {
    await cleanTestDatabase();
    await seedTestData();
    mockWhatsAppAPI.clearMessages();
    mockWhatsAppAPI.succeed();
  });

  it('should have a running application', () => {
    console.log('Testing if app is defined');
    expect(app).toBeDefined();
    expect(app.getHttpServer()).toBeDefined();
  });

  it('should respond to webhook endpoint', async () => {
    console.log('Testing webhook endpoint response');

    const webhook = createTextMessageWebhook({
      from: '+1234567890',
      text: 'Test message',
      name: 'Test User',
    });

    console.log('Webhook payload:', JSON.stringify(webhook, null, 2));

    try {
      const response = await request(app.getHttpServer())
        .post('/api/v1/whatsapp/webhook')
        .send(webhook);

      console.log('Response status:', response.status);
      console.log('Response body:', JSON.stringify(response.body, null, 2));

      // Just check that we get some response (might be 200, 400, etc.)
      expect(response.status).toBeDefined();
    } catch (error) {
      console.error('Request failed:', error);
      throw error;
    }
  });

  it('should have test data seeded', async () => {
    console.log('Checking seeded data');

    const users = await prisma.user.findMany();
    console.log('Users found:', users.length);

    const salons = await prisma.salon.findMany();
    console.log('Salons found:', salons.length);

    const services = await prisma.service.findMany();
    console.log('Services found:', services.length);

    const masters = await prisma.master.findMany();
    console.log('Masters found:', masters.length);

    expect(users.length).toBeGreaterThan(0);
    expect(salons.length).toBeGreaterThan(0);
    expect(services.length).toBeGreaterThan(0);
    expect(masters.length).toBeGreaterThan(0);
  });
});
