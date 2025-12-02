import { Test, TestingModule } from '@nestjs/testing';
import { WebhookService } from './webhook.service';
import { PrismaService } from '@database/prisma.service';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppWebhookPayload, WhatsAppMessage, WhatsAppStatus } from './interfaces';
import { RemindersService } from '../reminders/reminders.service';
import { ButtonParserService } from './interactive/button-parser.service';
import { ButtonHandlerService } from './interactive/button-handler.service';
import { QuickBookingService } from '../ai/quick-booking.service';
import { LanguageDetectorService } from '../ai/services/language-detector.service';
import { AIIntentService } from '../ai/services/ai-intent.service';

describe('WebhookService - Enhanced', () => {
  let service: WebhookService;
  let prismaService: PrismaService;

  const mockSalon = {
    id: 'salon-123',
    name: 'Test Salon',
    phone_number_id: 'phone-number-id-123',
  };

  const mockConversation = {
    id: 'conv-123',
    salon_id: mockSalon.id,
    phone_number: '+1234567890',
    status: 'ACTIVE',
    message_count: 5,
    cost: 0,
  };

  const mockMessage = {
    id: 'msg-123',
    salon_id: mockSalon.id,
    conversation_id: mockConversation.id,
    direction: 'OUTBOUND',
    phone_number: '+1234567890',
    message_type: 'TEXT',
    content: 'Test message',
    whatsapp_id: 'wamid.123',
    status: 'SENT',
    cost: 0,
  };

  const mockPrismaService = {
    salon: {
      findUnique: jest.fn(),
    },
    message: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    conversation: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    webhookLog: {
      create: jest.fn(),
    },
  };

  const mockWhatsAppService = {
    sendTextMessage: jest.fn(),
  };

  const mockRemindersService = {
    createReminder: jest.fn(),
    cancelReminder: jest.fn(),
    updateReminder: jest.fn(),
  };

  const mockButtonParserService = {
    parseButtonReply: jest.fn(),
    parseListReply: jest.fn(),
  };

  const mockButtonHandlerService = {
    handleButtonReply: jest.fn(),
    handleListReply: jest.fn(),
  };

  const mockQuickBookingService = {
    handleBookingRequest: jest.fn(),
    handleChoice: jest.fn(),
  };

  const mockLanguageDetectorService = {
    detect: jest.fn().mockResolvedValue({ language: 'en', confidence: 0.99 }),
  };

  const mockAIIntentService = {
    detectIntent: jest
      .fn()
      .mockResolvedValue({ intent: 'UNKNOWN', confidence: 0.5, isReliable: false }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: WhatsAppService, useValue: mockWhatsAppService },
        { provide: RemindersService, useValue: mockRemindersService },
        { provide: ButtonParserService, useValue: mockButtonParserService },
        { provide: ButtonHandlerService, useValue: mockButtonHandlerService },
        { provide: QuickBookingService, useValue: mockQuickBookingService },
        { provide: LanguageDetectorService, useValue: mockLanguageDetectorService },
        { provide: AIIntentService, useValue: mockAIIntentService },
      ],
    }).compile();

    service = module.get<WebhookService>(WebhookService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processWebhook', () => {
    it('should process webhook with incoming message successfully', async () => {
      const incomingMessage: WhatsAppMessage = {
        from: '+1234567890',
        id: 'wamid.incoming123',
        timestamp: '1234567890',
        type: 'text',
        text: { body: 'Hello, I want to book an appointment' },
      };

      const payload: WhatsAppWebhookPayload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'entry-123',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '+1234567890',
                    phone_number_id: mockSalon.phone_number_id,
                  },
                  messages: [incomingMessage],
                },
                field: 'messages',
              },
            ],
          },
        ],
      };

      mockPrismaService.salon.findUnique.mockResolvedValue(mockSalon);
      mockPrismaService.message.findUnique.mockResolvedValue(null);
      mockPrismaService.conversation.findUnique.mockResolvedValue(mockConversation);
      mockPrismaService.message.create.mockResolvedValue({ ...mockMessage, id: 'new-msg-123' });
      mockPrismaService.conversation.update.mockResolvedValue(mockConversation);
      mockPrismaService.webhookLog.create.mockResolvedValue({});

      await service.processWebhook(payload);

      expect(prismaService.salon.findUnique).toHaveBeenCalledWith({
        where: { phone_number_id: mockSalon.phone_number_id },
      });
      expect(prismaService.message.create).toHaveBeenCalledWith({
        data: {
          salon_id: mockSalon.id,
          direction: 'INBOUND',
          conversation_id: mockConversation.id,
          phone_number: incomingMessage.from,
          message_type: 'TEXT',
          content: 'Hello, I want to book an appointment',
          whatsapp_id: incomingMessage.id,
          status: 'DELIVERED',
          cost: 0,
        },
      });
      expect(prismaService.conversation.update).toHaveBeenCalled();
      expect(prismaService.webhookLog.create).toHaveBeenCalledWith({
        data: {
          salon_id: mockSalon.id,
          event_type: 'messages',
          payload,
          status: 'SUCCESS',
          error: null,
        },
      });
    });

    it('should process webhook with status update successfully', async () => {
      const statusUpdate: WhatsAppStatus = {
        id: 'wamid.outgoing123',
        status: 'delivered',
        timestamp: '1234567890',
        recipient_id: '+1234567890',
      };

      const payload: WhatsAppWebhookPayload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'entry-123',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '+1234567890',
                    phone_number_id: mockSalon.phone_number_id,
                  },
                  statuses: [statusUpdate],
                },
                field: 'messages',
              },
            ],
          },
        ],
      };

      mockPrismaService.salon.findUnique.mockResolvedValue(mockSalon);
      mockPrismaService.message.findFirst.mockResolvedValue(mockMessage);
      mockPrismaService.message.update.mockResolvedValue({ ...mockMessage, status: 'DELIVERED' });
      mockPrismaService.webhookLog.create.mockResolvedValue({});

      await service.processWebhook(payload);

      expect(prismaService.message.findFirst).toHaveBeenCalledWith({
        where: {
          whatsapp_id: statusUpdate.id,
          salon_id: mockSalon.id,
        },
      });
      expect(prismaService.message.update).toHaveBeenCalledWith({
        where: { id: mockMessage.id },
        data: { status: 'DELIVERED' },
      });
    });

    it('should handle salon not found gracefully', async () => {
      const payload: WhatsAppWebhookPayload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'entry-123',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '+1234567890',
                    phone_number_id: 'unknown-phone-id',
                  },
                  messages: [],
                },
                field: 'messages',
              },
            ],
          },
        ],
      };

      mockPrismaService.salon.findUnique.mockResolvedValue(null);
      mockPrismaService.webhookLog.create.mockResolvedValue({});

      await service.processWebhook(payload);

      expect(prismaService.webhookLog.create).toHaveBeenCalledWith({
        data: {
          salon_id: null,
          event_type: 'messages',
          payload,
          status: 'FAILED',
          error: 'Salon not found',
        },
      });
    });

    it('should skip non-message events', async () => {
      const payload: WhatsAppWebhookPayload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'entry-123',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '+1234567890',
                    phone_number_id: mockSalon.phone_number_id,
                  },
                },
                field: 'account_update',
              },
            ],
          },
        ],
      };

      await service.processWebhook(payload);

      expect(prismaService.salon.findUnique).not.toHaveBeenCalled();
      expect(prismaService.message.create).not.toHaveBeenCalled();
    });

    it('should handle webhook processing errors', async () => {
      const payload: WhatsAppWebhookPayload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'entry-123',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '+1234567890',
                    phone_number_id: mockSalon.phone_number_id,
                  },
                  messages: [
                    {
                      from: '+1234567890',
                      id: 'wamid.test',
                      timestamp: '123',
                      type: 'text',
                      text: { body: 'Test' },
                    },
                  ],
                },
                field: 'messages',
              },
            ],
          },
        ],
      };

      // Note: findSalonByPhoneNumberId catches errors and returns null
      // So database errors result in 'Salon not found' behavior, not thrown errors
      mockPrismaService.salon.findUnique.mockRejectedValue(new Error('Database error'));
      mockPrismaService.webhookLog.create.mockResolvedValue({});

      // Service handles database errors gracefully - continues instead of throwing
      await service.processWebhook(payload);

      // Verify it logged as failed due to salon not found (error was caught)
      expect(prismaService.webhookLog.create).toHaveBeenCalledWith({
        data: {
          salon_id: null,
          event_type: 'messages',
          payload,
          status: 'FAILED',
          error: 'Salon not found',
        },
      });
    });
  });

  describe('processIncomingMessage', () => {
    it('should process text message', async () => {
      const textMessage: WhatsAppMessage = {
        from: '+1234567890',
        id: 'wamid.text123',
        timestamp: '1234567890',
        type: 'text',
        text: { body: 'Book me for tomorrow at 2pm' },
      };

      mockPrismaService.message.findUnique.mockResolvedValue(null);
      mockPrismaService.conversation.findUnique.mockResolvedValue(mockConversation);
      mockPrismaService.message.create.mockResolvedValue(mockMessage);
      mockPrismaService.conversation.update.mockResolvedValue(mockConversation);

      await service.processIncomingMessage(mockSalon.id, textMessage);

      expect(prismaService.message.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          message_type: 'TEXT',
          content: 'Book me for tomorrow at 2pm',
          direction: 'INBOUND',
        }),
      });
    });

    it('should process image message', async () => {
      const imageMessage: WhatsAppMessage = {
        from: '+1234567890',
        id: 'wamid.image123',
        timestamp: '1234567890',
        type: 'image',
        image: {
          id: 'img-123',
          mime_type: 'image/jpeg',
          sha256: 'abc123def456',
          caption: 'My hairstyle reference',
        },
      };

      mockPrismaService.message.findUnique.mockResolvedValue(null);
      mockPrismaService.conversation.findUnique.mockResolvedValue(mockConversation);
      mockPrismaService.message.create.mockResolvedValue(mockMessage);
      mockPrismaService.conversation.update.mockResolvedValue(mockConversation);

      await service.processIncomingMessage(mockSalon.id, imageMessage);

      expect(prismaService.message.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          message_type: 'IMAGE',
          content: 'IMAGE: img-123 My hairstyle reference',
        }),
      });
    });

    it('should process document message', async () => {
      const documentMessage: WhatsAppMessage = {
        from: '+1234567890',
        id: 'wamid.doc123',
        timestamp: '1234567890',
        type: 'document',
        document: {
          id: 'doc-123',
          mime_type: 'application/pdf',
          sha256: 'xyz789abc123',
          filename: 'prescription.pdf',
          caption: 'Medical document',
        },
      };

      mockPrismaService.message.findUnique.mockResolvedValue(null);
      mockPrismaService.conversation.findUnique.mockResolvedValue(mockConversation);
      mockPrismaService.message.create.mockResolvedValue(mockMessage);
      mockPrismaService.conversation.update.mockResolvedValue(mockConversation);

      await service.processIncomingMessage(mockSalon.id, documentMessage);

      expect(prismaService.message.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          message_type: 'DOCUMENT',
          content: 'DOCUMENT: prescription.pdf Medical document',
        }),
      });
    });

    it('should skip duplicate messages', async () => {
      const duplicateMessage: WhatsAppMessage = {
        from: '+1234567890',
        id: 'wamid.duplicate',
        timestamp: '1234567890',
        type: 'text',
        text: { body: 'Already processed' },
      };

      mockPrismaService.message.findUnique.mockResolvedValue(mockMessage);

      await service.processIncomingMessage(mockSalon.id, duplicateMessage);

      expect(prismaService.message.create).not.toHaveBeenCalled();
      expect(prismaService.conversation.update).not.toHaveBeenCalled();
    });

    it('should create new conversation if not exists', async () => {
      const newCustomerMessage: WhatsAppMessage = {
        from: '+9999999999',
        id: 'wamid.newcustomer',
        timestamp: '1234567890',
        type: 'text',
        text: { body: 'First message' },
      };

      const newConversation = {
        ...mockConversation,
        id: 'conv-new',
        phone_number: '+9999999999',
      };

      mockPrismaService.message.findUnique.mockResolvedValue(null);
      mockPrismaService.conversation.findUnique.mockResolvedValue(null);
      mockPrismaService.conversation.create.mockResolvedValue(newConversation);
      mockPrismaService.message.create.mockResolvedValue(mockMessage);
      mockPrismaService.conversation.update.mockResolvedValue(newConversation);

      await service.processIncomingMessage(mockSalon.id, newCustomerMessage);

      expect(prismaService.conversation.create).toHaveBeenCalledWith({
        data: {
          salon_id: mockSalon.id,
          phone_number: '+9999999999',
          status: 'ACTIVE',
          message_count: 0,
          cost: 0,
        },
      });
      expect(prismaService.message.create).toHaveBeenCalled();
    });

    it('should increment conversation message count', async () => {
      const message: WhatsAppMessage = {
        from: '+1234567890',
        id: 'wamid.test',
        timestamp: '1234567890',
        type: 'text',
        text: { body: 'Test' },
      };

      mockPrismaService.message.findUnique.mockResolvedValue(null);
      mockPrismaService.conversation.findUnique.mockResolvedValue(mockConversation);
      mockPrismaService.message.create.mockResolvedValue(mockMessage);
      mockPrismaService.conversation.update.mockResolvedValue(mockConversation);

      await service.processIncomingMessage(mockSalon.id, message);

      expect(prismaService.conversation.update).toHaveBeenCalledWith({
        where: { id: mockConversation.id },
        data: {
          last_message_at: expect.any(Date),
          message_count: { increment: 1 },
        },
      });
    });
  });

  describe('processStatusUpdate', () => {
    it('should update message status to DELIVERED', async () => {
      const status: WhatsAppStatus = {
        id: 'wamid.123',
        status: 'delivered',
        timestamp: '1234567890',
        recipient_id: '+1234567890',
      };

      mockPrismaService.message.findFirst.mockResolvedValue(mockMessage);
      mockPrismaService.message.update.mockResolvedValue({ ...mockMessage, status: 'DELIVERED' });

      await service.processStatusUpdate(mockSalon.id, status);

      expect(prismaService.message.update).toHaveBeenCalledWith({
        where: { id: mockMessage.id },
        data: { status: 'DELIVERED' },
      });
    });

    it('should update message status to READ', async () => {
      const status: WhatsAppStatus = {
        id: 'wamid.123',
        status: 'read',
        timestamp: '1234567890',
        recipient_id: '+1234567890',
      };

      mockPrismaService.message.findFirst.mockResolvedValue(mockMessage);
      mockPrismaService.message.update.mockResolvedValue({ ...mockMessage, status: 'READ' });

      await service.processStatusUpdate(mockSalon.id, status);

      expect(prismaService.message.update).toHaveBeenCalledWith({
        where: { id: mockMessage.id },
        data: { status: 'READ' },
      });
    });

    it('should update message status to FAILED', async () => {
      const status: WhatsAppStatus = {
        id: 'wamid.123',
        status: 'failed',
        timestamp: '1234567890',
        recipient_id: '+1234567890',
        errors: [{ code: 131047, title: 'Re-engagement message', message: '24h window passed' }],
      };

      mockPrismaService.message.findFirst.mockResolvedValue(mockMessage);
      mockPrismaService.message.update.mockResolvedValue({ ...mockMessage, status: 'FAILED' });

      await service.processStatusUpdate(mockSalon.id, status);

      expect(prismaService.message.update).toHaveBeenCalledWith({
        where: { id: mockMessage.id },
        data: { status: 'FAILED' },
      });
    });

    it('should not downgrade READ status to DELIVERED', async () => {
      const readMessage = { ...mockMessage, status: 'READ' };
      const status: WhatsAppStatus = {
        id: 'wamid.123',
        status: 'delivered',
        timestamp: '1234567890',
        recipient_id: '+1234567890',
      };

      mockPrismaService.message.findFirst.mockResolvedValue(readMessage);

      await service.processStatusUpdate(mockSalon.id, status);

      expect(prismaService.message.update).not.toHaveBeenCalled();
    });

    it('should update READ message to FAILED', async () => {
      const readMessage = { ...mockMessage, status: 'READ' };
      const status: WhatsAppStatus = {
        id: 'wamid.123',
        status: 'failed',
        timestamp: '1234567890',
        recipient_id: '+1234567890',
      };

      mockPrismaService.message.findFirst.mockResolvedValue(readMessage);
      mockPrismaService.message.update.mockResolvedValue({ ...readMessage, status: 'FAILED' });

      await service.processStatusUpdate(mockSalon.id, status);

      expect(prismaService.message.update).toHaveBeenCalled();
    });

    it('should handle message not found for status update', async () => {
      const status: WhatsAppStatus = {
        id: 'wamid.nonexistent',
        status: 'delivered',
        timestamp: '1234567890',
        recipient_id: '+1234567890',
      };

      mockPrismaService.message.findFirst.mockResolvedValue(null);

      await service.processStatusUpdate(mockSalon.id, status);

      expect(prismaService.message.update).not.toHaveBeenCalled();
    });
  });

  describe('logWebhook', () => {
    it('should log successful webhook', async () => {
      const payload = { test: 'data' };
      mockPrismaService.webhookLog.create.mockResolvedValue({});

      await service.logWebhook(mockSalon.id, 'messages', payload, 'SUCCESS', null);

      expect(prismaService.webhookLog.create).toHaveBeenCalledWith({
        data: {
          salon_id: mockSalon.id,
          event_type: 'messages',
          payload,
          status: 'SUCCESS',
          error: null,
        },
      });
    });

    it('should log failed webhook', async () => {
      const payload = { test: 'data' };
      const error = 'Processing failed';
      mockPrismaService.webhookLog.create.mockResolvedValue({});

      await service.logWebhook(mockSalon.id, 'messages', payload, 'FAILED', error);

      expect(prismaService.webhookLog.create).toHaveBeenCalledWith({
        data: {
          salon_id: mockSalon.id,
          event_type: 'messages',
          payload,
          status: 'FAILED',
          error,
        },
      });
    });

    it('should handle logging errors gracefully', async () => {
      const payload = { test: 'data' };
      mockPrismaService.webhookLog.create.mockRejectedValue(new Error('DB error'));

      // Should not throw
      await expect(
        service.logWebhook(mockSalon.id, 'messages', payload, 'SUCCESS', null),
      ).resolves.not.toThrow();
    });
  });
});
