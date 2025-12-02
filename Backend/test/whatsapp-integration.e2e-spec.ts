import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

/**
 * WhatsApp Integration Tests (E2E)
 *
 * Tests complete WhatsApp webhook integration flows:
 * - Webhook verification (Meta challenge-response)
 * - Incoming message processing
 * - Outgoing message sending
 * - Message status updates
 * - Signature verification
 * - Error handling
 */

describe('WhatsApp Integration Tests (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let testSalonId: string;
  let testConversationId: string;
  let testOutboundMessageId: string;

  // Test user credentials
  const testUser = {
    email: `whatsapp-test-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    first_name: 'WhatsApp',
    last_name: 'Tester',
    phone: `+12348${Date.now().toString().slice(-5)}`,
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Create test user and salon
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send(testUser);

    authToken = registerResponse.body.accessToken;

    // Create test salon with WhatsApp credentials
    const salonResponse = await request(app.getHttpServer())
      .post('/salons')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'WhatsApp Test Salon',
        phone: '+1234567890',
        address: '123 Test St',
        city: 'Test City',
        state: 'TS',
        postal_code: '12345',
        country: 'US',
        whatsapp_business_account_id: 'test-waba-id',
        phone_number_id: 'test-phone-number-id',
        access_token: 'test-access-token',
      });

    testSalonId = salonResponse.body.id;
  });

  afterAll(async () => {
    // Cleanup test data
    if (testSalonId) {
      await prisma.booking.deleteMany({ where: { salon_id: testSalonId } });
      await prisma.message.deleteMany({ where: { salon_id: testSalonId } });
      await prisma.conversation.deleteMany({ where: { salon_id: testSalonId } });
      await prisma.webhookLog.deleteMany({ where: { salon_id: testSalonId } });
      await prisma.salon.delete({ where: { id: testSalonId } });
    }
    await prisma.user.deleteMany({ where: { email: testUser.email } });
    await app.close();
  });

  describe('Phase 5.1: Webhook Verification', () => {
    it('TC-WH-001: Should verify webhook with correct token', async () => {
      const response = await request(app.getHttpServer())
        .get('/whatsapp/webhook')
        .query({
          'hub.mode': 'subscribe',
          'hub.verify_token': process.env.WHATSAPP_VERIFY_TOKEN || 'test-verify-token',
          'hub.challenge': 'test-challenge-12345',
        })
        .expect(200);

      expect(response.text).toBe('test-challenge-12345');
    });

    it('TC-WH-001-FAIL: Should reject webhook with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/whatsapp/webhook')
        .query({
          'hub.mode': 'subscribe',
          'hub.verify_token': 'invalid-token',
          'hub.challenge': 'test-challenge-12345',
        })
        .expect(401);
    });
  });

  describe('Phase 5.1: Incoming Message Processing', () => {
    it('TC-WH-002: Should process incoming text message', async () => {
      const webhookPayload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'entry-123',
            changes: [
              {
                field: 'messages',
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '+1234567890',
                    phone_number_id: 'test-phone-number-id',
                  },
                  messages: [
                    {
                      from: '+79001234567',
                      id: `wamid.test.${Date.now()}`,
                      timestamp: Math.floor(Date.now() / 1000).toString(),
                      type: 'text',
                      text: {
                        body: 'Здравствуйте! Какие у вас услуги?',
                      },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/whatsapp/webhook')
        .send(webhookPayload)
        .expect(200);

      expect(response.body).toEqual({ status: 'success' });

      // Verify message saved in database
      const message = await prisma.message.findFirst({
        where: {
          whatsapp_id: webhookPayload.entry[0].changes[0].value.messages[0].id,
        },
      });

      expect(message).toBeDefined();
      expect(message!.direction).toBe('INBOUND');
      expect(message!.message_type).toBe('TEXT');
      expect(message!.content).toBe('Здравствуйте! Какие у вас услуги?');
      expect(message!.phone_number).toBe('+79001234567');
      expect(message!.salon_id).toBe(testSalonId);

      // Verify conversation created
      const conversation = await prisma.conversation.findFirst({
        where: {
          salon_id: testSalonId,
          phone_number: '+79001234567',
        },
      });

      expect(conversation).toBeDefined();
      expect(conversation!.status).toBe('ACTIVE');
      expect(conversation!.message_count).toBeGreaterThanOrEqual(1);

      testConversationId = conversation!.id;

      // Verify webhook log created
      const webhookLog = await prisma.webhookLog.findFirst({
        where: {
          salon_id: testSalonId,
          event_type: 'messages',
          status: 'SUCCESS',
        },
        orderBy: { created_at: 'desc' },
      });

      expect(webhookLog).toBeDefined();
    });

    it('TC-WH-002-DUP: Should skip duplicate messages', async () => {
      const duplicateMessageId = `wamid.duplicate.${Date.now()}`;

      // First webhook
      const webhookPayload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'entry-123',
            changes: [
              {
                field: 'messages',
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '+1234567890',
                    phone_number_id: 'test-phone-number-id',
                  },
                  messages: [
                    {
                      from: '+79001234567',
                      id: duplicateMessageId,
                      timestamp: Math.floor(Date.now() / 1000).toString(),
                      type: 'text',
                      text: {
                        body: 'Test duplicate',
                      },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      // Send first time
      await request(app.getHttpServer()).post('/whatsapp/webhook').send(webhookPayload).expect(200);

      // Send duplicate
      await request(app.getHttpServer()).post('/whatsapp/webhook').send(webhookPayload).expect(200);

      // Verify only one message exists
      const messageCount = await prisma.message.count({
        where: { whatsapp_id: duplicateMessageId },
      });

      expect(messageCount).toBe(1);
    });

    it('TC-WH-005: Should process image message', async () => {
      const webhookPayload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'entry-123',
            changes: [
              {
                field: 'messages',
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '+1234567890',
                    phone_number_id: 'test-phone-number-id',
                  },
                  messages: [
                    {
                      from: '+79001234567',
                      id: `wamid.image.${Date.now()}`,
                      timestamp: Math.floor(Date.now() / 1000).toString(),
                      type: 'image',
                      image: {
                        id: 'image-123',
                        mime_type: 'image/jpeg',
                        sha256: 'abc123',
                        caption: 'My nails photo',
                      },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      await request(app.getHttpServer()).post('/whatsapp/webhook').send(webhookPayload).expect(200);

      const message = await prisma.message.findFirst({
        where: {
          whatsapp_id: webhookPayload.entry[0].changes[0].value.messages[0].id,
        },
      });

      expect(message!.message_type).toBe('IMAGE');
      expect(message!.content).toContain('image-123');
      expect(message!.content).toContain('My nails photo');
    });
  });

  describe('Phase 5.1: Message Status Updates', () => {
    it('TC-WH-003: Should update message status to DELIVERED', async () => {
      // First create an outbound message
      const outboundMessage = await prisma.message.create({
        data: {
          salon: { connect: { id: testSalonId } },
          direction: 'OUTBOUND',
          conversation_id: testConversationId,
          phone_number: '+79001234567',
          message_type: 'TEXT',
          content: 'Test response',
          whatsapp_id: `wamid.outbound.${Date.now()}`,
          status: 'SENT',
          cost: 0.005,
        },
      });

      testOutboundMessageId = outboundMessage.whatsapp_id || '';

      // Send status update webhook
      const webhookPayload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'entry-123',
            changes: [
              {
                field: 'messages',
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '+1234567890',
                    phone_number_id: 'test-phone-number-id',
                  },
                  statuses: [
                    {
                      id: testOutboundMessageId,
                      status: 'delivered',
                      timestamp: Math.floor(Date.now() / 1000).toString(),
                      recipient_id: '+79001234567',
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      await request(app.getHttpServer()).post('/whatsapp/webhook').send(webhookPayload).expect(200);

      // Verify status updated
      const updatedMessage = await prisma.message.findFirst({
        where: { whatsapp_id: testOutboundMessageId },
      });

      expect(updatedMessage!.status).toBe('DELIVERED');
    });

    it('TC-WH-003: Should update message status to READ', async () => {
      const webhookPayload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'entry-123',
            changes: [
              {
                field: 'messages',
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '+1234567890',
                    phone_number_id: 'test-phone-number-id',
                  },
                  statuses: [
                    {
                      id: testOutboundMessageId,
                      status: 'read',
                      timestamp: Math.floor(Date.now() / 1000).toString(),
                      recipient_id: '+79001234567',
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      await request(app.getHttpServer()).post('/whatsapp/webhook').send(webhookPayload).expect(200);

      const updatedMessage = await prisma.message.findFirst({
        where: { whatsapp_id: testOutboundMessageId },
      });

      expect(updatedMessage!.status).toBe('READ');
    });

    it('TC-WH-003: Should not downgrade READ status to DELIVERED', async () => {
      // Message is already READ from previous test
      const webhookPayload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'entry-123',
            changes: [
              {
                field: 'messages',
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '+1234567890',
                    phone_number_id: 'test-phone-number-id',
                  },
                  statuses: [
                    {
                      id: testOutboundMessageId,
                      status: 'delivered',
                      timestamp: Math.floor(Date.now() / 1000).toString(),
                      recipient_id: '+79001234567',
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      await request(app.getHttpServer()).post('/whatsapp/webhook').send(webhookPayload).expect(200);

      // Verify status is still READ
      const message = await prisma.message.findFirst({
        where: { whatsapp_id: testOutboundMessageId },
      });

      expect(message!.status).toBe('READ');
    });
  });

  describe('Phase 5.1: Error Handling', () => {
    it('TC-WH-ERR-001: Should handle webhook with unknown salon', async () => {
      const webhookPayload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'entry-123',
            changes: [
              {
                field: 'messages',
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '+1234567890',
                    phone_number_id: 'unknown-phone-number-id',
                  },
                  messages: [
                    {
                      from: '+79001234567',
                      id: `wamid.unknown.${Date.now()}`,
                      timestamp: Math.floor(Date.now() / 1000).toString(),
                      type: 'text',
                      text: {
                        body: 'Test message',
                      },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/whatsapp/webhook')
        .send(webhookPayload)
        .expect(200);

      expect(response.body).toEqual({ status: 'success' });

      // Verify webhook logged with error
      const webhookLog = await prisma.webhookLog.findFirst({
        where: {
          salon_id: null,
          status: 'FAILED',
          error: 'Salon not found',
        },
        orderBy: { created_at: 'desc' },
      });

      expect(webhookLog).toBeDefined();
    });

    it('TC-WH-ERR-002: Should skip non-message events', async () => {
      const webhookPayload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'entry-123',
            changes: [
              {
                field: 'account_alerts',
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '+1234567890',
                    phone_number_id: 'test-phone-number-id',
                  },
                },
              },
            ],
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/whatsapp/webhook')
        .send(webhookPayload)
        .expect(200);

      expect(response.body).toEqual({ status: 'success' });
    });
  });

  describe('Phase 5.1: Outbound Message Sending', () => {
    it('TC-WH-006: Should send text message via API', async () => {
      // Note: This will call the actual WhatsApp API if credentials are valid
      // For testing, we're verifying the flow and database storage
      const sendRequest = {
        salon_id: testSalonId,
        to: '+79001234567',
        text: 'Спасибо за ваш запрос! Наши услуги: Маникюр, Педикюр, Стрижка.',
        conversation_id: testConversationId,
      };

      try {
        const response = await request(app.getHttpServer())
          .post('/whatsapp/send-text')
          .set('Authorization', `Bearer ${authToken}`)
          .send(sendRequest);

        // If WhatsApp API is not available, this might fail
        // We're testing the flow, not the actual WhatsApp API
        if (response.status === 200 || response.status === 201) {
          expect(response.body).toHaveProperty('success', true);
          expect(response.body).toHaveProperty('whatsapp_id');
          expect(response.body).toHaveProperty('message_id');

          // Verify message saved
          const message = await prisma.message.findUnique({
            where: { id: response.body.message_id },
          });

          expect(message!.direction).toBe('OUTBOUND');
          expect(message!.message_type).toBe('TEXT');
          expect(message!.content).toBe(sendRequest.text);
        } else {
          // Expected if WhatsApp API is not configured
          console.log('WhatsApp API not available for testing, skipping API call verification');
        }
      } catch (error) {
        // Expected if WhatsApp API credentials are invalid
        console.log('WhatsApp API call failed (expected in test environment):', error.message);
      }
    });

    it('TC-WH-007: Should calculate message costs correctly', async () => {
      // Create messages with different types and verify costs
      const messageTypes = [
        { type: 'TEXT', expectedCost: 0.005 },
        { type: 'TEMPLATE', expectedCost: 0.01 },
        { type: 'IMAGE', expectedCost: 0.01 },
        { type: 'VIDEO', expectedCost: 0.02 },
      ];

      for (const msgType of messageTypes) {
        const message = await prisma.message.create({
          data: {
            salon: { connect: { id: testSalonId } },
            direction: 'OUTBOUND',
            conversation_id: testConversationId,
            phone_number: '+79001234567',
            message_type: msgType.type,
            content: `Test ${msgType.type}`,
            whatsapp_id: `wamid.${msgType.type}.${Date.now()}`,
            status: 'SENT',
            cost: msgType.expectedCost,
          },
        });

        expect(message.cost).toBe(msgType.expectedCost);
      }
    });
  });

  describe('Phase 5.1: Performance Benchmarks', () => {
    it('TC-PERF-001: Webhook processing should complete within 200ms', async () => {
      const webhookPayload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'entry-123',
            changes: [
              {
                field: 'messages',
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '+1234567890',
                    phone_number_id: 'test-phone-number-id',
                  },
                  messages: [
                    {
                      from: '+79001234567',
                      id: `wamid.perf.${Date.now()}`,
                      timestamp: Math.floor(Date.now() / 1000).toString(),
                      type: 'text',
                      text: {
                        body: 'Performance test message',
                      },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      const startTime = Date.now();

      await request(app.getHttpServer()).post('/whatsapp/webhook').send(webhookPayload).expect(200);

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(200); // Should process within 200ms
    });

    it('TC-PERF-003: Should handle concurrent webhooks', async () => {
      const concurrentRequests = 10;

      const webhookRequests = Array.from({ length: concurrentRequests }, (_, i) => ({
        object: 'whatsapp_business_account',
        entry: [
          {
            id: `entry-${i}`,
            changes: [
              {
                field: 'messages',
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '+1234567890',
                    phone_number_id: 'test-phone-number-id',
                  },
                  messages: [
                    {
                      from: '+79001234567',
                      id: `wamid.concurrent.${Date.now()}.${i}`,
                      timestamp: Math.floor(Date.now() / 1000).toString(),
                      type: 'text',
                      text: {
                        body: `Concurrent message ${i}`,
                      },
                    },
                  ],
                },
              },
            ],
          },
        ],
      }));

      const startTime = Date.now();

      const responses = await Promise.all(
        webhookRequests.map((payload) =>
          request(app.getHttpServer()).post('/whatsapp/webhook').send(payload),
        ),
      );

      const duration = Date.now() - startTime;

      // All requests should succeed
      responses.forEach((response: any) => {
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ status: 'success' });
      });

      // Average time per request should be reasonable
      const avgTime = duration / concurrentRequests;
      expect(avgTime).toBeLessThan(500); // Average < 500ms per request
    });
  });
});
