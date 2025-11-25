import { Test, TestingModule } from '@nestjs/testing';
import { WebhookService } from './webhook.service';
import { WhatsAppService } from './whatsapp.service';
import { PrismaService } from '@database/prisma.service';
import { WhatsAppWebhookPayload, WhatsAppMessage, WhatsAppStatus } from './interfaces';

describe('WebhookService', () => {
  let service: WebhookService;
  let prismaService: PrismaService;

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
    verifyWebhookSignature: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: WhatsAppService, useValue: mockWhatsAppService },
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
    const mockSalon = {
      id: 'salon-123',
      phone_number_id: 'phone-123',
      owner_id: 'user-123',
      is_active: true,
    };

    it('should process webhook with incoming message', async () => {
      const webhookPayload: WhatsAppWebhookPayload = {
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
                    phone_number_id: 'phone-123',
                  },
                  messages: [
                    {
                      from: '+9876543210',
                      id: 'wamid.xxx',
                      timestamp: '1234567890',
                      type: 'text',
                      text: {
                        body: 'Hello',
                      },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      mockPrismaService.salon.findUnique.mockResolvedValue(mockSalon);
      mockPrismaService.message.findUnique.mockResolvedValue(null);
      mockPrismaService.conversation.findUnique.mockResolvedValue({
        id: 'conv-123',
      });
      mockPrismaService.conversation.update.mockResolvedValue({});
      mockPrismaService.message.create.mockResolvedValue({
        id: 'msg-123',
      });
      mockPrismaService.webhookLog.create.mockResolvedValue({});

      await service.processWebhook(webhookPayload);

      expect(mockPrismaService.salon.findUnique).toHaveBeenCalledWith({
        where: { phone_number_id: 'phone-123' },
      });

      expect(mockPrismaService.message.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          salon_id: 'salon-123',
          direction: 'INBOUND',
          phone_number: '+9876543210',
          message_type: 'TEXT',
          content: 'Hello',
          whatsapp_id: 'wamid.xxx',
          status: 'DELIVERED',
        }),
      });

      expect(mockPrismaService.webhookLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          salon_id: 'salon-123',
          event_type: 'messages',
          status: 'SUCCESS',
        }),
      });
    });

    it('should process webhook with status update', async () => {
      const webhookPayload: WhatsAppWebhookPayload = {
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
                    phone_number_id: 'phone-123',
                  },
                  statuses: [
                    {
                      id: 'wamid.yyy',
                      status: 'delivered',
                      timestamp: '1234567890',
                      recipient_id: '+9876543210',
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      mockPrismaService.salon.findUnique.mockResolvedValue(mockSalon);
      mockPrismaService.message.findFirst.mockResolvedValue({
        id: 'msg-456',
        whatsapp_id: 'wamid.yyy',
        status: 'SENT',
      });
      mockPrismaService.message.update.mockResolvedValue({});
      mockPrismaService.webhookLog.create.mockResolvedValue({});

      await service.processWebhook(webhookPayload);

      expect(mockPrismaService.message.update).toHaveBeenCalledWith({
        where: { id: 'msg-456' },
        data: { status: 'DELIVERED' },
      });
    });

    it('should log webhook when salon not found', async () => {
      const webhookPayload: WhatsAppWebhookPayload = {
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
                    phone_number_id: 'phone-unknown',
                  },
                  messages: [],
                },
              },
            ],
          },
        ],
      };

      mockPrismaService.salon.findUnique.mockResolvedValue(null);
      mockPrismaService.webhookLog.create.mockResolvedValue({});

      await service.processWebhook(webhookPayload);

      expect(mockPrismaService.webhookLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          salon_id: null,
          status: 'FAILED',
          error: 'Salon not found',
        }),
      });
    });

    it('should skip non-message events', async () => {
      const webhookPayload: WhatsAppWebhookPayload = {
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
                    phone_number_id: 'phone-123',
                  },
                },
              },
            ],
          },
        ],
      };

      await service.processWebhook(webhookPayload);

      expect(mockPrismaService.salon.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('processIncomingMessage', () => {
    const salonId = 'salon-123';

    it('should process text message', async () => {
      const message: WhatsAppMessage = {
        from: '+9876543210',
        id: 'wamid.xxx',
        timestamp: '1234567890',
        type: 'text',
        text: {
          body: 'Hello World',
        },
      };

      mockPrismaService.message.findUnique.mockResolvedValue(null);
      mockPrismaService.conversation.findUnique.mockResolvedValue({
        id: 'conv-123',
      });
      mockPrismaService.message.create.mockResolvedValue({ id: 'msg-123' });
      mockPrismaService.conversation.update.mockResolvedValue({});

      await service.processIncomingMessage(salonId, message);

      expect(mockPrismaService.message.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          salon_id: salonId,
          direction: 'INBOUND',
          phone_number: '+9876543210',
          message_type: 'TEXT',
          content: 'Hello World',
          whatsapp_id: 'wamid.xxx',
          status: 'DELIVERED',
          cost: 0,
        }),
      });
    });

    it('should process image message', async () => {
      const message: WhatsAppMessage = {
        from: '+9876543210',
        id: 'wamid.yyy',
        timestamp: '1234567890',
        type: 'image',
        image: {
          id: 'image-123',
          mime_type: 'image/jpeg',
          sha256: 'xxx',
          caption: 'Test image',
        },
      };

      mockPrismaService.message.findUnique.mockResolvedValue(null);
      mockPrismaService.conversation.findUnique.mockResolvedValue({
        id: 'conv-123',
      });
      mockPrismaService.message.create.mockResolvedValue({ id: 'msg-456' });
      mockPrismaService.conversation.update.mockResolvedValue({});

      await service.processIncomingMessage(salonId, message);

      expect(mockPrismaService.message.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          message_type: 'IMAGE',
          content: expect.stringContaining('IMAGE: image-123'),
        }),
      });
    });

    it('should process document message', async () => {
      const message: WhatsAppMessage = {
        from: '+9876543210',
        id: 'wamid.zzz',
        timestamp: '1234567890',
        type: 'document',
        document: {
          id: 'doc-123',
          mime_type: 'application/pdf',
          sha256: 'xxx',
          filename: 'test.pdf',
          caption: 'Test document',
        },
      };

      mockPrismaService.message.findUnique.mockResolvedValue(null);
      mockPrismaService.conversation.findUnique.mockResolvedValue({
        id: 'conv-123',
      });
      mockPrismaService.message.create.mockResolvedValue({ id: 'msg-789' });
      mockPrismaService.conversation.update.mockResolvedValue({});

      await service.processIncomingMessage(salonId, message);

      expect(mockPrismaService.message.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          message_type: 'DOCUMENT',
          content: expect.stringContaining('DOCUMENT: test.pdf'),
        }),
      });
    });

    it('should skip duplicate messages', async () => {
      const message: WhatsAppMessage = {
        from: '+9876543210',
        id: 'wamid.duplicate',
        timestamp: '1234567890',
        type: 'text',
        text: { body: 'Duplicate' },
      };

      mockPrismaService.message.findUnique.mockResolvedValue({
        id: 'existing-msg',
      });

      await service.processIncomingMessage(salonId, message);

      expect(mockPrismaService.message.create).not.toHaveBeenCalled();
    });

    it('should create conversation if not exists', async () => {
      const message: WhatsAppMessage = {
        from: '+9876543210',
        id: 'wamid.new',
        timestamp: '1234567890',
        type: 'text',
        text: { body: 'New conversation' },
      };

      mockPrismaService.message.findUnique.mockResolvedValue(null);
      mockPrismaService.conversation.findUnique.mockResolvedValue(null);
      mockPrismaService.conversation.create.mockResolvedValue({
        id: 'conv-new',
      });
      mockPrismaService.message.create.mockResolvedValue({ id: 'msg-new' });
      mockPrismaService.conversation.update.mockResolvedValue({});

      await service.processIncomingMessage(salonId, message);

      expect(mockPrismaService.conversation.create).toHaveBeenCalledWith({
        data: {
          salon_id: salonId,
          phone_number: '+9876543210',
          status: 'ACTIVE',
          message_count: 0,
          cost: 0,
        },
      });
    });
  });

  describe('processStatusUpdate', () => {
    const salonId = 'salon-123';

    it('should update message status to DELIVERED', async () => {
      const status: WhatsAppStatus = {
        id: 'wamid.xxx',
        status: 'delivered',
        timestamp: '1234567890',
        recipient_id: '+9876543210',
      };

      mockPrismaService.message.findFirst.mockResolvedValue({
        id: 'msg-123',
        whatsapp_id: 'wamid.xxx',
        status: 'SENT',
      });
      mockPrismaService.message.update.mockResolvedValue({});

      await service.processStatusUpdate(salonId, status);

      expect(mockPrismaService.message.update).toHaveBeenCalledWith({
        where: { id: 'msg-123' },
        data: { status: 'DELIVERED' },
      });
    });

    it('should update message status to READ', async () => {
      const status: WhatsAppStatus = {
        id: 'wamid.xxx',
        status: 'read',
        timestamp: '1234567890',
        recipient_id: '+9876543210',
      };

      mockPrismaService.message.findFirst.mockResolvedValue({
        id: 'msg-123',
        whatsapp_id: 'wamid.xxx',
        status: 'DELIVERED',
      });
      mockPrismaService.message.update.mockResolvedValue({});

      await service.processStatusUpdate(salonId, status);

      expect(mockPrismaService.message.update).toHaveBeenCalledWith({
        where: { id: 'msg-123' },
        data: { status: 'READ' },
      });
    });

    it('should update message status to FAILED', async () => {
      const status: WhatsAppStatus = {
        id: 'wamid.xxx',
        status: 'failed',
        timestamp: '1234567890',
        recipient_id: '+9876543210',
        errors: [
          {
            code: 131047,
            title: 'Re-engagement message',
            message: 'Re-engagement message',
            error_data: {
              details: 'Message failed to send because more than 24 hours have passed',
            },
          },
        ],
      };

      mockPrismaService.message.findFirst.mockResolvedValue({
        id: 'msg-123',
        whatsapp_id: 'wamid.xxx',
        status: 'SENT',
      });
      mockPrismaService.message.update.mockResolvedValue({});

      await service.processStatusUpdate(salonId, status);

      expect(mockPrismaService.message.update).toHaveBeenCalledWith({
        where: { id: 'msg-123' },
        data: { status: 'FAILED' },
      });
    });

    it('should not update already READ messages', async () => {
      const status: WhatsAppStatus = {
        id: 'wamid.xxx',
        status: 'delivered',
        timestamp: '1234567890',
        recipient_id: '+9876543210',
      };

      mockPrismaService.message.findFirst.mockResolvedValue({
        id: 'msg-123',
        whatsapp_id: 'wamid.xxx',
        status: 'READ',
      });

      await service.processStatusUpdate(salonId, status);

      expect(mockPrismaService.message.update).not.toHaveBeenCalled();
    });

    it('should handle message not found', async () => {
      const status: WhatsAppStatus = {
        id: 'wamid.unknown',
        status: 'delivered',
        timestamp: '1234567890',
        recipient_id: '+9876543210',
      };

      mockPrismaService.message.findFirst.mockResolvedValue(null);

      await service.processStatusUpdate(salonId, status);

      expect(mockPrismaService.message.update).not.toHaveBeenCalled();
    });
  });

  describe('logWebhook', () => {
    it('should log webhook successfully', async () => {
      mockPrismaService.webhookLog.create.mockResolvedValue({});

      await service.logWebhook('salon-123', 'messages', { test: 'data' }, 'SUCCESS', null);

      expect(mockPrismaService.webhookLog.create).toHaveBeenCalledWith({
        data: {
          salon_id: 'salon-123',
          event_type: 'messages',
          payload: { test: 'data' }, // PostgreSQL Json type - Prisma handles serialization
          status: 'SUCCESS',
          error: null,
        },
      });
    });

    it('should handle logging errors gracefully', async () => {
      mockPrismaService.webhookLog.create.mockRejectedValue(new Error('DB error'));

      await expect(
        service.logWebhook('salon-123', 'messages', { test: 'data' }, 'SUCCESS', null),
      ).resolves.not.toThrow();
    });
  });
});
