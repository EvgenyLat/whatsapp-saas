import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { AxiosError, AxiosResponse } from 'axios';
import { WhatsAppService } from './whatsapp.service';
import { PrismaService } from '@database/prisma.service';
import { MessagesService } from '../messages/messages.service';
import { ConversationsService } from '../conversations/conversations.service';

describe('WhatsAppService', () => {
  let service: WhatsAppService;
  let httpService: HttpService;
  let prismaService: PrismaService;
  let configService: ConfigService;

  const mockHttpService = {
    post: jest.fn(),
    get: jest.fn(),
  };

  const mockPrismaService = {
    salon: {
      findUnique: jest.fn(),
    },
    message: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    conversation: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, any> = {
        'whatsapp.apiUrl': 'https://graph.facebook.com',
        'whatsapp.apiVersion': 'v18.0',
        'whatsapp.webhookSecret': 'test-secret',
        'whatsapp.timeout': 30000,
        'whatsapp.retryAttempts': 3,
        'whatsapp.retryDelay': 1000,
      };
      return config[key];
    }),
  };

  const mockMessagesService = {};
  const mockConversationsService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsAppService,
        { provide: HttpService, useValue: mockHttpService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: MessagesService, useValue: mockMessagesService },
        { provide: ConversationsService, useValue: mockConversationsService },
      ],
    }).compile();

    service = module.get<WhatsAppService>(WhatsAppService);
    httpService = module.get<HttpService>(HttpService);
    prismaService = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendTextMessage', () => {
    const userId = 'user-123';
    const sendTextDto = {
      salon_id: 'salon-123',
      to: '+1234567890',
      text: 'Hello World',
      conversation_id: 'conv-123',
    };

    const mockSalon = {
      id: 'salon-123',
      owner_id: 'user-123',
      phone_number_id: 'phone-123',
      access_token: 'token-123',
      is_active: true,
    };

    const mockWhatsAppResponse = {
      messaging_product: 'whatsapp',
      contacts: [{ input: '+1234567890', wa_id: '1234567890' }],
      messages: [{ id: 'wamid.xxx' }],
    };

    const mockAxiosResponse: AxiosResponse = {
      data: mockWhatsAppResponse,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    };

    it('should send text message successfully', async () => {
      mockPrismaService.salon.findUnique.mockResolvedValue(mockSalon);
      mockHttpService.post.mockReturnValue(of(mockAxiosResponse));
      mockPrismaService.message.create.mockResolvedValue({
        id: 'msg-123',
        whatsapp_id: 'wamid.xxx',
      });
      mockPrismaService.conversation.findUnique.mockResolvedValue({
        id: 'conv-123',
      });
      mockPrismaService.conversation.update.mockResolvedValue({});

      const result = await service.sendTextMessage(userId, sendTextDto);

      expect(result).toEqual({
        success: true,
        whatsapp_id: 'wamid.xxx',
        message_id: 'msg-123',
        status: 'SENT',
      });

      expect(mockPrismaService.salon.findUnique).toHaveBeenCalledWith({
        where: { id: sendTextDto.salon_id },
      });

      expect(mockHttpService.post).toHaveBeenCalledWith(
        'https://graph.facebook.com/v18.0/phone-123/messages',
        expect.objectContaining({
          messaging_product: 'whatsapp',
          to: '+1234567890',
          type: 'text',
          text: { body: 'Hello World' },
        }),
        expect.any(Object),
      );

      expect(mockPrismaService.message.create).toHaveBeenCalled();
    });

    it('should throw error if salon not found', async () => {
      mockPrismaService.salon.findUnique.mockResolvedValue(null);

      await expect(service.sendTextMessage(userId, sendTextDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error if user does not own salon', async () => {
      const wrongOwnerSalon = { ...mockSalon, owner_id: 'other-user' };
      mockPrismaService.salon.findUnique.mockResolvedValue(wrongOwnerSalon);

      await expect(service.sendTextMessage(userId, sendTextDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error if salon is not active', async () => {
      const inactiveSalon = { ...mockSalon, is_active: false };
      mockPrismaService.salon.findUnique.mockResolvedValue(inactiveSalon);

      await expect(service.sendTextMessage(userId, sendTextDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error if salon credentials not configured', async () => {
      const salonWithoutCreds = {
        ...mockSalon,
        phone_number_id: null,
        access_token: null,
      };
      mockPrismaService.salon.findUnique.mockResolvedValue(salonWithoutCreds);

      await expect(service.sendTextMessage(userId, sendTextDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle WhatsApp API errors', async () => {
      mockPrismaService.salon.findUnique.mockResolvedValue(mockSalon);

      const axiosError: AxiosError = {
        response: {
          status: 400,
          data: {
            error: {
              message: 'Invalid phone number',
              type: 'invalid_parameter',
              code: 100,
              fbtrace_id: 'xxx',
            },
          },
          statusText: 'Bad Request',
          headers: {},
          config: {} as any,
        },
        isAxiosError: true,
        toJSON: () => ({}),
        name: 'AxiosError',
        message: 'Request failed',
      };

      mockHttpService.post.mockReturnValue(throwError(() => axiosError));

      await expect(service.sendTextMessage(userId, sendTextDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle rate limit errors', async () => {
      mockPrismaService.salon.findUnique.mockResolvedValue(mockSalon);

      const axiosError: AxiosError = {
        response: {
          status: 429,
          data: {
            error: {
              message: 'Rate limit exceeded',
              type: 'rate_limit',
              code: 429,
              fbtrace_id: 'xxx',
            },
          },
          statusText: 'Too Many Requests',
          headers: {},
          config: {} as any,
        },
        isAxiosError: true,
        toJSON: () => ({}),
        name: 'AxiosError',
        message: 'Request failed',
      };

      mockHttpService.post.mockReturnValue(throwError(() => axiosError));

      await expect(service.sendTextMessage(userId, sendTextDto)).rejects.toThrow(HttpException);
    });
  });

  describe('sendTemplateMessage', () => {
    const userId = 'user-123';
    const sendTemplateDto = {
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

    const mockSalon = {
      id: 'salon-123',
      owner_id: 'user-123',
      phone_number_id: 'phone-123',
      access_token: 'token-123',
      is_active: true,
    };

    const mockWhatsAppResponse = {
      messaging_product: 'whatsapp',
      contacts: [{ input: '+1234567890', wa_id: '1234567890' }],
      messages: [{ id: 'wamid.yyy' }],
    };

    const mockAxiosResponse: AxiosResponse = {
      data: mockWhatsAppResponse,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    };

    it('should send template message successfully', async () => {
      mockPrismaService.salon.findUnique.mockResolvedValue(mockSalon);
      mockHttpService.post.mockReturnValue(of(mockAxiosResponse));
      mockPrismaService.message.create.mockResolvedValue({
        id: 'msg-456',
        whatsapp_id: 'wamid.yyy',
      });
      mockPrismaService.conversation.findUnique.mockResolvedValue({
        id: 'conv-123',
      });
      mockPrismaService.conversation.update.mockResolvedValue({});

      const result = await service.sendTemplateMessage(userId, sendTemplateDto);

      expect(result).toEqual({
        success: true,
        whatsapp_id: 'wamid.yyy',
        message_id: 'msg-456',
        status: 'SENT',
      });

      expect(mockHttpService.post).toHaveBeenCalledWith(
        'https://graph.facebook.com/v18.0/phone-123/messages',
        expect.objectContaining({
          messaging_product: 'whatsapp',
          to: '+1234567890',
          type: 'template',
          template: expect.objectContaining({
            name: 'booking_confirmation',
            language: { code: 'en' },
          }),
        }),
        expect.any(Object),
      );
    });

    it('should send template without parameters', async () => {
      const dtoWithoutParams = { ...sendTemplateDto, parameters: [] };

      mockPrismaService.salon.findUnique.mockResolvedValue(mockSalon);
      mockHttpService.post.mockReturnValue(of(mockAxiosResponse));
      mockPrismaService.message.create.mockResolvedValue({
        id: 'msg-456',
        whatsapp_id: 'wamid.yyy',
      });
      mockPrismaService.conversation.findUnique.mockResolvedValue({
        id: 'conv-123',
      });
      mockPrismaService.conversation.update.mockResolvedValue({});

      const result = await service.sendTemplateMessage(userId, dtoWithoutParams);

      expect(result.success).toBe(true);
    });
  });

  describe('sendMediaMessage', () => {
    const userId = 'user-123';
    const sendMediaDto = {
      salon_id: 'salon-123',
      to: '+1234567890',
      media_type: 'image',
      media_url_or_id: 'https://example.com/image.jpg',
      caption: 'Test image',
      conversation_id: 'conv-123',
    };

    const mockSalon = {
      id: 'salon-123',
      owner_id: 'user-123',
      phone_number_id: 'phone-123',
      access_token: 'token-123',
      is_active: true,
    };

    const mockWhatsAppResponse = {
      messaging_product: 'whatsapp',
      contacts: [{ input: '+1234567890', wa_id: '1234567890' }],
      messages: [{ id: 'wamid.zzz' }],
    };

    const mockAxiosResponse: AxiosResponse = {
      data: mockWhatsAppResponse,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    };

    it('should send media message with URL successfully', async () => {
      mockPrismaService.salon.findUnique.mockResolvedValue(mockSalon);
      mockHttpService.post.mockReturnValue(of(mockAxiosResponse));
      mockPrismaService.message.create.mockResolvedValue({
        id: 'msg-789',
        whatsapp_id: 'wamid.zzz',
      });
      mockPrismaService.conversation.findUnique.mockResolvedValue({
        id: 'conv-123',
      });
      mockPrismaService.conversation.update.mockResolvedValue({});

      const result = await service.sendMediaMessage(userId, sendMediaDto);

      expect(result).toEqual({
        success: true,
        whatsapp_id: 'wamid.zzz',
        message_id: 'msg-789',
        status: 'SENT',
      });

      expect(mockHttpService.post).toHaveBeenCalledWith(
        'https://graph.facebook.com/v18.0/phone-123/messages',
        expect.objectContaining({
          messaging_product: 'whatsapp',
          to: '+1234567890',
          type: 'image',
          image: {
            link: 'https://example.com/image.jpg',
            caption: 'Test image',
          },
        }),
        expect.any(Object),
      );
    });

    it('should send media message with media ID', async () => {
      const dtoWithMediaId = {
        ...sendMediaDto,
        media_url_or_id: 'media-id-123',
      };

      mockPrismaService.salon.findUnique.mockResolvedValue(mockSalon);
      mockHttpService.post.mockReturnValue(of(mockAxiosResponse));
      mockPrismaService.message.create.mockResolvedValue({
        id: 'msg-789',
        whatsapp_id: 'wamid.zzz',
      });
      mockPrismaService.conversation.findUnique.mockResolvedValue({
        id: 'conv-123',
      });
      mockPrismaService.conversation.update.mockResolvedValue({});

      const result = await service.sendMediaMessage(userId, dtoWithMediaId);

      expect(result.success).toBe(true);
      expect(mockHttpService.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          image: expect.objectContaining({
            id: 'media-id-123',
          }),
        }),
        expect.any(Object),
      );
    });
  });

  describe('markAsRead', () => {
    const userId = 'user-123';
    const salonId = 'salon-123';
    const messageId = 'wamid.xxx';

    const mockSalon = {
      id: 'salon-123',
      owner_id: 'user-123',
      phone_number_id: 'phone-123',
      access_token: 'token-123',
      is_active: true,
    };

    const mockAxiosResponse: AxiosResponse = {
      data: { success: true },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    };

    it('should mark message as read successfully', async () => {
      mockPrismaService.salon.findUnique.mockResolvedValue(mockSalon);
      mockHttpService.post.mockReturnValue(of(mockAxiosResponse));

      await service.markAsRead(salonId, userId, messageId);

      expect(mockHttpService.post).toHaveBeenCalledWith(
        'https://graph.facebook.com/v18.0/phone-123/messages',
        {
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId,
        },
        expect.any(Object),
      );
    });
  });

  describe('getMediaUrl', () => {
    const mediaId = 'media-123';
    const accessToken = 'token-123';

    const mockMediaResponse = {
      url: 'https://example.com/media/file.jpg',
      mime_type: 'image/jpeg',
      sha256: 'xxx',
      file_size: 12345,
      id: 'media-123',
      messaging_product: 'whatsapp',
    };

    const mockAxiosResponse: AxiosResponse = {
      data: mockMediaResponse,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    };

    it('should get media URL successfully', async () => {
      mockHttpService.get.mockReturnValue(of(mockAxiosResponse));

      const result = await service.getMediaUrl(mediaId, accessToken);

      expect(result).toBe('https://example.com/media/file.jpg');
      expect(mockHttpService.get).toHaveBeenCalledWith(
        'https://graph.facebook.com/v18.0/media-123',
        expect.objectContaining({
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }),
      );
    });
  });

  describe('verifyWebhookSignature', () => {
    it('should verify valid signature', () => {
      const payload = JSON.stringify({ test: 'data' });
      const crypto = require('crypto');
      const signature = crypto.createHmac('sha256', 'test-secret').update(payload).digest('hex');

      const result = service.verifyWebhookSignature(payload, `sha256=${signature}`);

      expect(result).toBe(true);
    });

    it('should reject invalid signature', () => {
      const payload = JSON.stringify({ test: 'data' });
      const crypto = require('crypto');
      const validSignature = crypto
        .createHmac('sha256', 'test-secret')
        .update(payload)
        .digest('hex');
      const invalidSignature = validSignature.split('').reverse().join('');

      const result = service.verifyWebhookSignature(payload, `sha256=${invalidSignature}`);

      expect(result).toBe(false);
    });

    it('should handle signature without sha256 prefix', () => {
      const payload = JSON.stringify({ test: 'data' });
      const crypto = require('crypto');
      const signature = crypto.createHmac('sha256', 'test-secret').update(payload).digest('hex');

      const result = service.verifyWebhookSignature(payload, signature);

      expect(result).toBe(true);
    });
  });
});
