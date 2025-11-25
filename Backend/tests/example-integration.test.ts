/**
 * Example Integration Test
 *
 * This file demonstrates how to use the test setup, seed data, and WhatsApp mocks
 * together to create comprehensive integration tests.
 *
 * Run with: npm test
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
  createButtonClickWebhook,
  mockSendMessageResponse,
  MockWhatsAppAPI,
  createMockWhatsAppAPI,
  validateWebhookPayload,
  extractMessageFromWebhook,
} from './mocks/whatsapp-api.mock';

describe('Example Integration Tests', () => {
  let app: INestApplication;
  let mockWhatsApp: MockWhatsAppAPI;
  const prisma = getTestPrisma();

  // Setup before all tests
  beforeAll(async () => {
    app = await setupTestApp();
    mockWhatsApp = createMockWhatsAppAPI();
  });

  // Cleanup after all tests
  afterAll(async () => {
    await cleanupTestApp(app);
  });

  // Clean database before each test
  beforeEach(async () => {
    await cleanTestDatabase();
    mockWhatsApp.clearMessages();
  });

  describe('Test Setup Validation', () => {
    it('should have a running application', () => {
      expect(app).toBeDefined();
      expect(app.getHttpServer()).toBeDefined();
    });

    it('should have a database connection', async () => {
      await expect(prisma.$queryRaw`SELECT 1`).resolves.toBeDefined();
    });

    it('should seed test data successfully', async () => {
      await seedTestData();

      const users = await prisma.user.findMany();
      const salons = await prisma.salon.findMany();

      expect(users.length).toBeGreaterThan(0);
      expect(salons.length).toBeGreaterThan(0);
    });
  });

  describe('WhatsApp Webhook Mocks', () => {
    it('should create valid text message webhook', () => {
      const webhook = createTextMessageWebhook({
        from: '+1234567890',
        text: 'Hello, world!',
      });

      expect(validateWebhookPayload(webhook)).toBe(true);
      expect(webhook.object).toBe('whatsapp_business_account');

      const message = extractMessageFromWebhook(webhook);
      expect(message).toBeDefined();
      expect(message.type).toBe('text');
      expect(message.text.body).toBe('Hello, world!');
    });

    it('should create valid button click webhook', () => {
      const webhook = createButtonClickWebhook({
        from: '+1234567890',
        buttonId: 'btn_confirm',
        buttonText: 'Yes, confirm',
      });

      expect(validateWebhookPayload(webhook)).toBe(true);

      const message = extractMessageFromWebhook(webhook);
      expect(message).toBeDefined();
      expect(message.type).toBe('interactive');
      expect(message.interactive.type).toBe('button_reply');
      expect(message.interactive.button_reply.id).toBe('btn_confirm');
    });

    it('should track sent messages', async () => {
      const response = await mockWhatsApp.sendMessage('+1234567890', {
        type: 'text',
        text: { body: 'Test message' },
      });

      expect(response).toBeDefined();
      expect(response.messages).toHaveLength(1);

      const sentMessages = mockWhatsApp.getSentMessages();
      expect(sentMessages).toHaveLength(1);
      expect(sentMessages[0].to).toBe('+1234567890');
    });

    it('should simulate API failures', async () => {
      mockWhatsApp.fail();

      await expect(
        mockWhatsApp.sendMessage('+1234567890', {
          type: 'text',
          text: { body: 'Test' },
        }),
      ).rejects.toBeDefined();

      mockWhatsApp.succeed();

      await expect(
        mockWhatsApp.sendMessage('+1234567890', {
          type: 'text',
          text: { body: 'Test' },
        }),
      ).resolves.toBeDefined();
    });
  });

  describe('API Integration Tests', () => {
    beforeEach(async () => {
      await seedTestData();
    });

    it('should respond to health check', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200);

      expect(response.body).toBeDefined();
    });

    // Example: Test webhook endpoint (if implemented)
    it.skip('should process WhatsApp text message webhook', async () => {
      const webhook = createTextMessageWebhook({
        from: '+1234567890',
        text: 'I want to book an appointment',
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/webhooks/whatsapp')
        .send(webhook)
        .expect(200);

      // Verify webhook was processed
      const messages = await prisma.message.findMany({
        where: {
          phone_number: '+1234567890',
        },
      });

      expect(messages.length).toBeGreaterThan(0);
    });

    // Example: Test button interaction
    it.skip('should handle button click interaction', async () => {
      const webhook = createButtonClickWebhook({
        from: '+1234567890',
        buttonId: 'service_haircut',
        buttonText: 'Haircut',
      });

      await request(app.getHttpServer())
        .post('/api/v1/webhooks/whatsapp')
        .send(webhook)
        .expect(200);

      // Verify interaction was handled
      const messages = await prisma.message.findMany({
        where: {
          phone_number: '+1234567890',
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      expect(messages.length).toBeGreaterThan(0);
    });
  });

  describe('Database Operations', () => {
    beforeEach(async () => {
      await seedTestData();
    });

    it('should create a booking', async () => {
      const salon = await prisma.salon.findFirst();
      expect(salon).toBeDefined();

      const booking = await prisma.booking.create({
        data: {
          booking_code: 'TEST001',
          salon_id: salon!.id,
          customer_phone: '+1234567890',
          customer_name: 'Test Customer',
          service: 'Haircut',
          start_ts: new Date(),
          status: 'CONFIRMED',
        },
      });

      expect(booking).toBeDefined();
      expect(booking.booking_code).toBe('TEST001');
      expect(booking.status).toBe('CONFIRMED');
    });

    it('should query bookings by customer', async () => {
      const salon = await prisma.salon.findFirst();

      // Create multiple bookings
      await prisma.booking.createMany({
        data: [
          {
            booking_code: 'B001',
            salon_id: salon!.id,
            customer_phone: '+1111111111',
            customer_name: 'Customer A',
            service: 'Haircut',
            start_ts: new Date(),
            status: 'CONFIRMED',
          },
          {
            booking_code: 'B002',
            salon_id: salon!.id,
            customer_phone: '+1111111111',
            customer_name: 'Customer A',
            service: 'Coloring',
            start_ts: new Date(),
            status: 'CONFIRMED',
          },
          {
            booking_code: 'B003',
            salon_id: salon!.id,
            customer_phone: '+2222222222',
            customer_name: 'Customer B',
            service: 'Manicure',
            start_ts: new Date(),
            status: 'CONFIRMED',
          },
        ],
      });

      const customerABookings = await prisma.booking.findMany({
        where: {
          customer_phone: '+1111111111',
        },
      });

      expect(customerABookings).toHaveLength(2);
    });

    it('should update booking status', async () => {
      const salon = await prisma.salon.findFirst();

      const booking = await prisma.booking.create({
        data: {
          booking_code: 'UPDATE001',
          salon_id: salon!.id,
          customer_phone: '+1234567890',
          customer_name: 'Test Customer',
          service: 'Haircut',
          start_ts: new Date(),
          status: 'CONFIRMED',
        },
      });

      const updated = await prisma.booking.update({
        where: { id: booking.id },
        data: { status: 'COMPLETED' },
      });

      expect(updated.status).toBe('COMPLETED');
    });
  });

  describe('End-to-End Booking Flow', () => {
    beforeEach(async () => {
      await seedTestData();
    });

    it.skip('should complete full booking flow', async () => {
      const customerPhone = '+1555123456';

      // Step 1: User initiates booking
      const initiateWebhook = createTextMessageWebhook({
        from: customerPhone,
        text: 'Book appointment',
      });

      await request(app.getHttpServer())
        .post('/api/v1/webhooks/whatsapp')
        .send(initiateWebhook)
        .expect(200);

      // Step 2: User selects service
      const serviceWebhook = createButtonClickWebhook({
        from: customerPhone,
        buttonId: 'service_haircut',
        buttonText: 'Haircut',
      });

      await request(app.getHttpServer())
        .post('/api/v1/webhooks/whatsapp')
        .send(serviceWebhook)
        .expect(200);

      // Step 3: Verify booking was created
      const bookings = await prisma.booking.findMany({
        where: {
          customer_phone: customerPhone,
        },
      });

      expect(bookings.length).toBeGreaterThan(0);
      expect(bookings[0].service).toBe('Haircut');
      expect(bookings[0].status).toBe('CONFIRMED');
    });
  });
});
