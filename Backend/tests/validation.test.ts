/**
 * Phase 2 Testing Infrastructure Validation
 *
 * This test suite validates that all Phase 2 testing components are working correctly:
 * - T018: Supertest setup
 * - T019: Database seeding
 * - T020: WhatsApp mocks
 *
 * Run with: npm run test:integration -- tests/validation.test.ts
 */

import { INestApplication } from '@nestjs/common';
import {
  setupTestApp,
  cleanupTestApp,
  getTestPrisma,
  cleanTestDatabase,
  seedTestData,
  waitFor,
  generateTestId,
  delay,
} from './setup';
import {
  createTextMessageWebhook,
  createButtonClickWebhook,
  createListReplyWebhook,
  createImageMessageWebhook,
  createMessageStatusWebhook,
  mockSendMessageResponse,
  mockSendMessageError,
  createMockWhatsAppAPI,
  validateWebhookPayload,
  extractMessageFromWebhook,
  getBookingFlowMocks,
  MockWhatsAppAPI,
} from './mocks/whatsapp-api.mock';

describe('Phase 2 Testing Infrastructure Validation', () => {
  let app: INestApplication;
  let mockAPI: MockWhatsAppAPI;
  const prisma = getTestPrisma();

  beforeAll(async () => {
    console.log('Initializing test infrastructure...');
    app = await setupTestApp();
    mockAPI = createMockWhatsAppAPI();
    console.log('Test infrastructure ready');
  });

  afterAll(async () => {
    console.log('Cleaning up test infrastructure...');
    await cleanupTestApp(app);
    console.log('Cleanup complete');
  });

  beforeEach(async () => {
    await cleanTestDatabase();
    mockAPI.clearMessages();
  });

  describe('T018: Supertest Setup Validation', () => {
    it('should initialize test application', () => {
      expect(app).toBeDefined();
      expect(app.getHttpServer()).toBeDefined();
    });

    it('should provide test database client', async () => {
      expect(prisma).toBeDefined();
      await expect(prisma.$queryRaw`SELECT 1 as result`).resolves.toBeDefined();
    });

    it('should clean database successfully', async () => {
      // Create test data
      await prisma.user.create({
        data: {
          email: 'test@example.com',
          password: 'hashed_password',
          first_name: 'Test',
          last_name: 'User',
        },
      });

      const usersBeforeClean = await prisma.user.count();
      expect(usersBeforeClean).toBeGreaterThan(0);

      // Clean database
      await cleanTestDatabase();

      const usersAfterClean = await prisma.user.count();
      expect(usersAfterClean).toBe(0);
    });

    it('should seed test data successfully', async () => {
      await seedTestData();

      const users = await prisma.user.findMany();
      const salons = await prisma.salon.findMany();

      expect(users.length).toBeGreaterThan(0);
      expect(salons.length).toBeGreaterThan(0);

      const testUser = users.find(u => u.email === 'test@example.com');
      expect(testUser).toBeDefined();
      expect(testUser?.first_name).toBe('Test');
    });

    it('should generate unique test IDs', () => {
      const id1 = generateTestId('test');
      const id2 = generateTestId('test');

      expect(id1).not.toBe(id2);
      expect(id1).toContain('test-');
      expect(id2).toContain('test-');
    });

    it('should wait for async conditions', async () => {
      let condition = false;

      setTimeout(() => {
        condition = true;
      }, 100);

      await waitFor(() => condition, { timeout: 1000, interval: 10 });

      expect(condition).toBe(true);
    });

    it('should timeout when condition is not met', async () => {
      await expect(
        waitFor(() => false, { timeout: 100, interval: 10 })
      ).rejects.toThrow('Timeout');
    });

    it('should support delay utility', async () => {
      const start = Date.now();
      await delay(100);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(95); // Allow for timing variance
    });
  });

  describe('T019: Database Seed Validation', () => {
    beforeEach(async () => {
      await seedTestData();
    });

    it('should seed test user with correct credentials', async () => {
      const user = await prisma.user.findUnique({
        where: { email: 'test@example.com' },
      });

      expect(user).toBeDefined();
      expect(user?.email).toBe('test@example.com');
      expect(user?.first_name).toBe('Test');
      expect(user?.last_name).toBe('User');
      expect(user?.role).toBe('SALON_OWNER');
      expect(user?.is_email_verified).toBe(true);
      expect(user?.is_active).toBe(true);
    });

    it('should seed test salon with correct configuration', async () => {
      const salon = await prisma.salon.findFirst();

      expect(salon).toBeDefined();
      expect(salon?.name).toBe('Test Salon');
      expect(salon?.is_active).toBe(true);
      expect(salon?.trial_status).toBe('ACTIVE');
    });

    it('should be idempotent (safe to run multiple times)', async () => {
      // Run seed twice
      await seedTestData();
      await seedTestData();

      // Should still have only one user and salon
      const userCount = await prisma.user.count();
      const salonCount = await prisma.salon.count();

      expect(userCount).toBe(1);
      expect(salonCount).toBe(1);
    });
  });

  describe('T020: WhatsApp Mock Validation', () => {
    describe('Webhook Payload Generation', () => {
      it('should create valid text message webhook', () => {
        const webhook = createTextMessageWebhook({
          from: '+1234567890',
          text: 'Test message',
        });

        expect(validateWebhookPayload(webhook)).toBe(true);
        expect(webhook.object).toBe('whatsapp_business_account');

        const message = extractMessageFromWebhook(webhook);
        expect(message).toBeDefined();
        expect(message?.type).toBe('text');
        expect(message?.text?.body).toBe('Test message');
        expect(message?.from).toBe('+1234567890');
      });

      it('should create valid button click webhook', () => {
        const webhook = createButtonClickWebhook({
          from: '+1234567890',
          buttonId: 'btn_test',
          buttonText: 'Test Button',
        });

        expect(validateWebhookPayload(webhook)).toBe(true);

        const message = extractMessageFromWebhook(webhook);
        expect(message?.type).toBe('interactive');
        expect(message?.interactive?.type).toBe('button_reply');
        expect(message?.interactive?.button_reply?.id).toBe('btn_test');
        expect(message?.interactive?.button_reply?.title).toBe('Test Button');
      });

      it('should create valid list reply webhook', () => {
        const webhook = createListReplyWebhook({
          from: '+1234567890',
          listId: 'list_item_1',
          listTitle: 'Option 1',
          listDescription: 'First option',
        });

        expect(validateWebhookPayload(webhook)).toBe(true);

        const message = extractMessageFromWebhook(webhook);
        expect(message?.type).toBe('interactive');
        expect(message?.interactive?.type).toBe('list_reply');
        expect(message?.interactive?.list_reply?.id).toBe('list_item_1');
      });

      it('should create valid image message webhook', () => {
        const webhook = createImageMessageWebhook({
          from: '+1234567890',
          imageId: 'img_123',
          caption: 'Test image',
        });

        expect(validateWebhookPayload(webhook)).toBe(true);

        const message = extractMessageFromWebhook(webhook);
        expect(message?.type).toBe('image');
        expect(message?.image?.id).toBe('img_123');
        expect(message?.image?.caption).toBe('Test image');
      });

      it('should create valid status webhook', () => {
        const webhook = createMessageStatusWebhook({
          messageId: 'msg_123',
          status: 'delivered',
          recipientId: '1234567890',
        });

        expect(validateWebhookPayload(webhook)).toBe(true);
      });
    });

    describe('Mock API Client', () => {
      it('should send and track messages', async () => {
        const response = await mockAPI.sendMessage('+1234567890', {
          type: 'text',
          text: { body: 'Test message' },
        });

        expect(response).toBeDefined();
        expect(response.messages).toHaveLength(1);
        expect(response.messages[0].id).toBeDefined();

        const sentMessages = mockAPI.getSentMessages();
        expect(sentMessages).toHaveLength(1);
        expect(sentMessages[0].to).toBe('+1234567890');
      });

      it('should track multiple messages', async () => {
        await mockAPI.sendMessage('+1111111111', { type: 'text', text: { body: 'Message 1' } });
        await mockAPI.sendMessage('+2222222222', { type: 'text', text: { body: 'Message 2' } });
        await mockAPI.sendMessage('+3333333333', { type: 'text', text: { body: 'Message 3' } });

        const sentMessages = mockAPI.getSentMessages();
        expect(sentMessages).toHaveLength(3);

        const lastMessage = mockAPI.getLastMessage();
        expect(lastMessage.to).toBe('+3333333333');
      });

      it('should support success/failure modes', async () => {
        // Success mode (default)
        await expect(
          mockAPI.sendMessage('+1234567890', { type: 'text', text: { body: 'Test' } })
        ).resolves.toBeDefined();

        // Failure mode
        mockAPI.fail();
        await expect(
          mockAPI.sendMessage('+1234567890', { type: 'text', text: { body: 'Test' } })
        ).rejects.toBeDefined();

        // Back to success
        mockAPI.succeed();
        await expect(
          mockAPI.sendMessage('+1234567890', { type: 'text', text: { body: 'Test' } })
        ).resolves.toBeDefined();
      });

      it('should clear message history', async () => {
        await mockAPI.sendMessage('+1234567890', { type: 'text', text: { body: 'Test' } });
        expect(mockAPI.getSentMessages()).toHaveLength(1);

        mockAPI.clearMessages();
        expect(mockAPI.getSentMessages()).toHaveLength(0);
      });

      it('should detect sent messages', async () => {
        await mockAPI.sendMessage('+1234567890', {
          type: 'text',
          text: { body: 'Hello' },
        });

        const wasHelloSent = mockAPI.hasMessageBeenSent(
          msg => msg.message.text.body === 'Hello'
        );

        const wasGoodbyeSent = mockAPI.hasMessageBeenSent(
          msg => msg.message.text.body === 'Goodbye'
        );

        expect(wasHelloSent).toBe(true);
        expect(wasGoodbyeSent).toBe(false);
      });
    });

    describe('API Response Mocks', () => {
      it('should generate valid send message response', () => {
        const response = mockSendMessageResponse('msg_123');

        expect(response.status).toBe(200);
        expect(response.data.messaging_product).toBe('whatsapp');
        expect(response.data.messages[0].id).toBe('msg_123');
      });

      it('should generate valid error response', () => {
        const error = mockSendMessageError(131047, 'Test error');

        expect(error.status).toBe(400);
        expect(error.data.error.code).toBe(131047);
        expect(error.data.error.message).toBe('Test error');
      });
    });

    describe('Booking Flow Mocks', () => {
      it('should provide complete booking flow mocks', () => {
        const mocks = getBookingFlowMocks();

        expect(mocks.userStartsBooking).toBeDefined();
        expect(mocks.userSelectsService).toBeDefined();
        expect(mocks.userSelectsDate).toBeDefined();
        expect(mocks.userSelectsTime).toBeDefined();
        expect(mocks.confirmationDelivered).toBeDefined();

        // Validate all webhooks are valid
        expect(validateWebhookPayload(mocks.userStartsBooking)).toBe(true);
        expect(validateWebhookPayload(mocks.userSelectsService)).toBe(true);
        expect(validateWebhookPayload(mocks.userSelectsDate)).toBe(true);
        expect(validateWebhookPayload(mocks.userSelectsTime)).toBe(true);
        expect(validateWebhookPayload(mocks.confirmationDelivered)).toBe(true);
      });
    });
  });

  describe('Integration: All Components Together', () => {
    beforeEach(async () => {
      await seedTestData();
    });

    it('should support complete test workflow', async () => {
      // 1. Verify test data exists
      const salon = await prisma.salon.findFirst();
      expect(salon).toBeDefined();

      // 2. Create webhook payload
      const webhook = createTextMessageWebhook({
        from: '+1555000999',
        text: 'Test integration',
      });

      expect(validateWebhookPayload(webhook)).toBe(true);

      // 3. Mock API response
      const messageId = await mockAPI.sendMessage('+1555000999', {
        type: 'text',
        text: { body: 'Response message' },
      });

      expect(messageId).toBeDefined();

      // 4. Verify mock tracking
      expect(mockAPI.getSentMessages()).toHaveLength(1);

      // 5. Database operations work
      const booking = await prisma.booking.create({
        data: {
          booking_code: generateTestId('BOOK'),
          salon_id: salon!.id,
          customer_phone: '+1555000999',
          customer_name: 'Test Customer',
          service: 'Test Service',
          start_ts: new Date(),
          status: 'CONFIRMED',
        },
      });

      expect(booking).toBeDefined();
      expect(booking.status).toBe('CONFIRMED');
    });

    it('should maintain test isolation', async () => {
      // This test should have clean state even though previous test ran
      const bookings = await prisma.booking.findMany();
      expect(bookings).toHaveLength(0); // cleanTestDatabase was called in beforeEach

      const sentMessages = mockAPI.getSentMessages();
      expect(sentMessages).toHaveLength(0); // clearMessages was called in beforeEach
    });
  });
});
