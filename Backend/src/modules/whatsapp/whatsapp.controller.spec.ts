import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppService } from './whatsapp.service';
import { WebhookService } from './webhook.service';
import { SendTextDto, SendTemplateDto, SendMediaDto, WebhookVerifyDto } from './dto';

describe('WhatsAppController', () => {
  let controller: WhatsAppController;
  let whatsappService: WhatsAppService;
  let webhookService: WebhookService;

  const mockWhatsAppService = {
    sendTextMessage: jest.fn(),
    sendTemplateMessage: jest.fn(),
    sendMediaMessage: jest.fn(),
    verifyWebhookSignature: jest.fn(),
  };

  const mockWebhookService = {
    processWebhook: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'whatsapp.webhookVerifyToken') {
        return 'test-verify-token';
      }
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WhatsAppController],
      providers: [
        { provide: WhatsAppService, useValue: mockWhatsAppService },
        { provide: WebhookService, useValue: mockWebhookService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get<WhatsAppController>(WhatsAppController);
    whatsappService = module.get<WhatsAppService>(WhatsAppService);
    webhookService = module.get<WebhookService>(WebhookService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('verifyWebhook', () => {
    it('should verify webhook with correct token', () => {
      const query: WebhookVerifyDto = {
        'hub.mode': 'subscribe',
        'hub.verify_token': 'test-verify-token',
        'hub.challenge': 'challenge-string-12345',
      };

      const result = controller.verifyWebhook(query);

      expect(result).toBe('challenge-string-12345');
    });

    it('should reject webhook with incorrect token', () => {
      const query: WebhookVerifyDto = {
        'hub.mode': 'subscribe',
        'hub.verify_token': 'wrong-token',
        'hub.challenge': 'challenge-string-12345',
      };

      expect(() => controller.verifyWebhook(query)).toThrow(UnauthorizedException);
    });

    it('should reject webhook with wrong mode', () => {
      const query: WebhookVerifyDto = {
        'hub.mode': 'unsubscribe',
        'hub.verify_token': 'test-verify-token',
        'hub.challenge': 'challenge-string-12345',
      };

      expect(() => controller.verifyWebhook(query)).toThrow(UnauthorizedException);
    });
  });

  describe('handleWebhook', () => {
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
                  phone_number_id: 'phone-123',
                },
                messages: [
                  {
                    from: '+9876543210',
                    id: 'wamid.xxx',
                    timestamp: '1234567890',
                    type: 'text',
                    text: { body: 'Hello' },
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    it('should handle webhook without signature', async () => {
      mockWebhookService.processWebhook.mockResolvedValue(undefined);

      const result = await controller.handleWebhook(webhookPayload);

      expect(result).toEqual({ status: 'success' });
      expect(mockWebhookService.processWebhook).toHaveBeenCalledWith(webhookPayload);
    });

    it('should handle webhook with valid signature', async () => {
      mockWhatsAppService.verifyWebhookSignature.mockReturnValue(true);
      mockWebhookService.processWebhook.mockResolvedValue(undefined);

      // Note: signature validation is handled by WebhookSignatureGuard, not the controller
      const result = await controller.handleWebhook(webhookPayload);

      expect(result).toEqual({ status: 'success' });
      expect(mockWebhookService.processWebhook).toHaveBeenCalledWith(webhookPayload);
    });

    // Note: Invalid signature rejection is handled by WebhookSignatureGuard
    // This test has been removed as it's testing guard functionality, not controller
    // Guard tests are in webhook-signature.guard.spec.ts

    it('should return success even if processing fails', async () => {
      mockWebhookService.processWebhook.mockRejectedValue(new Error('Processing error'));

      const result = await controller.handleWebhook(webhookPayload);

      expect(result).toEqual({ status: 'success' });
    });
  });

  describe('sendText', () => {
    const userId = 'user-123';
    const sendTextDto: SendTextDto = {
      salon_id: 'salon-123',
      to: '+1234567890',
      text: 'Hello World',
      conversation_id: 'conv-123',
    };

    it('should send text message successfully', async () => {
      const expectedResponse = {
        success: true,
        whatsapp_id: 'wamid.xxx',
        message_id: 'msg-123',
        status: 'SENT',
      };

      mockWhatsAppService.sendTextMessage.mockResolvedValue(expectedResponse);

      const result = await controller.sendText(userId, sendTextDto);

      expect(result).toEqual(expectedResponse);
      expect(mockWhatsAppService.sendTextMessage).toHaveBeenCalledWith(userId, sendTextDto);
    });

    it('should handle errors from service', async () => {
      mockWhatsAppService.sendTextMessage.mockRejectedValue(new Error('Failed to send message'));

      await expect(controller.sendText(userId, sendTextDto)).rejects.toThrow(
        'Failed to send message',
      );
    });
  });

  describe('sendTemplate', () => {
    const userId = 'user-123';
    const sendTemplateDto: SendTemplateDto = {
      salon_id: 'salon-123',
      to: '+1234567890',
      template_name: 'booking_confirmation',
      language_code: 'en',
      parameters: [
        { type: 'text', text: 'John Doe' },
        { type: 'text', text: 'Dec 25, 2024 10:00 AM' },
      ],
      conversation_id: 'conv-123',
    };

    it('should send template message successfully', async () => {
      const expectedResponse = {
        success: true,
        whatsapp_id: 'wamid.yyy',
        message_id: 'msg-456',
        status: 'SENT',
      };

      mockWhatsAppService.sendTemplateMessage.mockResolvedValue(expectedResponse);

      const result = await controller.sendTemplate(userId, sendTemplateDto);

      expect(result).toEqual(expectedResponse);
      expect(mockWhatsAppService.sendTemplateMessage).toHaveBeenCalledWith(userId, sendTemplateDto);
    });

    it('should handle errors from service', async () => {
      mockWhatsAppService.sendTemplateMessage.mockRejectedValue(new Error('Template not found'));

      await expect(controller.sendTemplate(userId, sendTemplateDto)).rejects.toThrow(
        'Template not found',
      );
    });
  });

  describe('sendMedia', () => {
    const userId = 'user-123';
    const sendMediaDto: SendMediaDto = {
      salon_id: 'salon-123',
      to: '+1234567890',
      media_type: 'image',
      media_url_or_id: 'https://example.com/image.jpg',
      caption: 'Test image',
      conversation_id: 'conv-123',
    };

    it('should send media message successfully', async () => {
      const expectedResponse = {
        success: true,
        whatsapp_id: 'wamid.zzz',
        message_id: 'msg-789',
        status: 'SENT',
      };

      mockWhatsAppService.sendMediaMessage.mockResolvedValue(expectedResponse);

      const result = await controller.sendMedia(userId, sendMediaDto);

      expect(result).toEqual(expectedResponse);
      expect(mockWhatsAppService.sendMediaMessage).toHaveBeenCalledWith(userId, sendMediaDto);
    });

    it('should handle errors from service', async () => {
      mockWhatsAppService.sendMediaMessage.mockRejectedValue(new Error('Invalid media URL'));

      await expect(controller.sendMedia(userId, sendMediaDto)).rejects.toThrow('Invalid media URL');
    });
  });

  describe('healthCheck', () => {
    it('should return health status', () => {
      const result = controller.healthCheck();

      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty('timestamp');
      expect(typeof result.timestamp).toBe('string');
    });
  });
});
