import {
  Injectable,
  BadRequestException,
  HttpException,
  HttpStatus,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '@database/prisma.service';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import * as crypto from 'crypto';
import { MessagesService } from '../messages/messages.service';
import { ConversationsService } from '../conversations/conversations.service';
import {
  MessageResponse,
  MediaUrlResponse,
  WhatsAppApiError,
  InteractiveMessagePayload,
} from './interfaces';
import {
  SendTextDto,
  SendTemplateDto,
  SendMediaDto,
  SendInteractiveDto,
  TemplateParameterDto,
} from './dto';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly apiUrl: string;
  private readonly apiVersion: string;
  private readonly webhookSecret: string;
  private readonly timeout: number;
  private readonly retryAttempts: number;
  private readonly retryDelay: number;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => MessagesService))
    private readonly messagesService: MessagesService,
    @Inject(forwardRef(() => ConversationsService))
    private readonly conversationsService: ConversationsService,
  ) {
    this.apiUrl = this.configService.get<string>('whatsapp.apiUrl') || 'https://graph.facebook.com';
    this.apiVersion = this.configService.get<string>('whatsapp.apiVersion') || 'v18.0';
    this.webhookSecret = this.configService.get<string>('whatsapp.webhookSecret') || '';
    this.timeout = this.configService.get<number>('whatsapp.timeout') || 30000;
    this.retryAttempts = this.configService.get<number>('whatsapp.retryAttempts') || 3;
    this.retryDelay = this.configService.get<number>('whatsapp.retryDelay') || 1000;
  }

  async sendTextMessage(userId: string, sendTextDto: SendTextDto): Promise<any> {
    this.logger.log(`Sending text message to ${sendTextDto.to} from salon ${sendTextDto.salon_id}`);

    // Allow 'system' userId for AI bot (skip ownership verification)
    const salon =
      userId === 'system'
        ? await this.getSalonById(sendTextDto.salon_id)
        : await this.getSalonWithVerification(sendTextDto.salon_id, userId);

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: sendTextDto.to,
      type: 'text',
      text: {
        body: sendTextDto.text,
      },
    };

    try {
      const response = await this.sendWhatsAppMessage(
        salon.phone_number_id,
        salon.access_token,
        payload,
      );

      const message = await this.prisma.message.create({
        data: {
          salon_id: salon.id,
          direction: 'OUTBOUND',
          conversation_id: sendTextDto.conversation_id || null,
          phone_number: sendTextDto.to,
          message_type: 'TEXT',
          content: sendTextDto.text,
          whatsapp_id: response.messages[0].id,
          status: 'SENT',
          cost: this.calculateMessageCost('TEXT'),
        },
      });

      await this.updateOrCreateConversation(
        salon.id,
        sendTextDto.to,
        this.calculateMessageCost('TEXT'),
      );

      return {
        success: true,
        whatsapp_id: response.messages[0].id,
        message_id: message.id,
        status: 'SENT',
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to send text message: ${err.message}`, err.stack);
      throw this.handleWhatsAppError(error);
    }
  }

  async sendTemplateMessage(userId: string, sendTemplateDto: SendTemplateDto): Promise<any> {
    this.logger.log(
      `Sending template message to ${sendTemplateDto.to} from salon ${sendTemplateDto.salon_id}`,
    );

    const salon = await this.getSalonWithVerification(sendTemplateDto.salon_id, userId);

    const components = [];
    if (sendTemplateDto.parameters && sendTemplateDto.parameters.length > 0) {
      components.push({
        type: 'body',
        parameters: sendTemplateDto.parameters.map((param: TemplateParameterDto) => ({
          type: param.type,
          text: param.text,
        })),
      });
    }

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: sendTemplateDto.to,
      type: 'template',
      template: {
        name: sendTemplateDto.template_name,
        language: {
          code: sendTemplateDto.language_code,
        },
        components: components.length > 0 ? components : undefined,
      },
    };

    try {
      const response = await this.sendWhatsAppMessage(
        salon.phone_number_id,
        salon.access_token,
        payload,
      );

      const contentPreview = `Template: ${sendTemplateDto.template_name} (${sendTemplateDto.language_code})`;
      const message = await this.prisma.message.create({
        data: {
          salon_id: salon.id,
          direction: 'OUTBOUND',
          conversation_id: sendTemplateDto.conversation_id || null,
          phone_number: sendTemplateDto.to,
          message_type: 'TEMPLATE',
          content: contentPreview,
          whatsapp_id: response.messages[0].id,
          status: 'SENT',
          cost: this.calculateMessageCost('TEMPLATE'),
        },
      });

      await this.updateOrCreateConversation(
        salon.id,
        sendTemplateDto.to,
        this.calculateMessageCost('TEMPLATE'),
      );

      return {
        success: true,
        whatsapp_id: response.messages[0].id,
        message_id: message.id,
        status: 'SENT',
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to send template message: ${err.message}`, err.stack);
      throw this.handleWhatsAppError(error);
    }
  }

  async sendMediaMessage(userId: string, sendMediaDto: SendMediaDto): Promise<any> {
    this.logger.log(
      `Sending ${sendMediaDto.media_type} message to ${sendMediaDto.to} from salon ${sendMediaDto.salon_id}`,
    );

    const salon = await this.getSalonWithVerification(sendMediaDto.salon_id, userId);

    const isUrl =
      sendMediaDto.media_url_or_id.startsWith('http://') ||
      sendMediaDto.media_url_or_id.startsWith('https://');

    const mediaObject: any = {};
    if (isUrl) {
      mediaObject.link = sendMediaDto.media_url_or_id;
    } else {
      mediaObject.id = sendMediaDto.media_url_or_id;
    }

    if (
      sendMediaDto.caption &&
      (sendMediaDto.media_type === 'image' ||
        sendMediaDto.media_type === 'video' ||
        sendMediaDto.media_type === 'document')
    ) {
      mediaObject.caption = sendMediaDto.caption;
    }

    if (sendMediaDto.filename && sendMediaDto.media_type === 'document') {
      mediaObject.filename = sendMediaDto.filename;
    }

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: sendMediaDto.to,
      type: sendMediaDto.media_type,
      [sendMediaDto.media_type]: mediaObject,
    };

    try {
      const response = await this.sendWhatsAppMessage(
        salon.phone_number_id,
        salon.access_token,
        payload,
      );

      const contentPreview =
        sendMediaDto.caption ||
        `${sendMediaDto.media_type.toUpperCase()}: ${sendMediaDto.media_url_or_id.substring(0, 100)}`;
      const message = await this.prisma.message.create({
        data: {
          salon_id: salon.id,
          direction: 'OUTBOUND',
          conversation_id: sendMediaDto.conversation_id || null,
          phone_number: sendMediaDto.to,
          message_type: sendMediaDto.media_type.toUpperCase(),
          content: contentPreview,
          whatsapp_id: response.messages[0].id,
          status: 'SENT',
          cost: this.calculateMessageCost(sendMediaDto.media_type.toUpperCase()),
        },
      });

      await this.updateOrCreateConversation(
        salon.id,
        sendMediaDto.to,
        this.calculateMessageCost(sendMediaDto.media_type.toUpperCase()),
      );

      return {
        success: true,
        whatsapp_id: response.messages[0].id,
        message_id: message.id,
        status: 'SENT',
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to send media message: ${err.message}`, err.stack);
      throw this.handleWhatsAppError(error);
    }
  }

  /**
   * Sends interactive message (Reply Buttons or List Message)
   * @param userId - User ID or 'system' for AI bot
   * @param sendInteractiveDto - Interactive message DTO
   * @returns Message ID and database record
   */
  async sendInteractiveMessage(
    userId: string,
    sendInteractiveDto: SendInteractiveDto,
  ): Promise<any> {
    this.logger.log(
      `Sending interactive message to ${sendInteractiveDto.to} from salon ${sendInteractiveDto.salon_id}`,
    );

    // Validate and normalize phone number
    const validatedPhone = this.validatePhoneNumber(sendInteractiveDto.to);

    // Allow 'system' userId for AI bot (skip ownership verification)
    const salon =
      userId === 'system'
        ? await this.getSalonById(sendInteractiveDto.salon_id)
        : await this.getSalonWithVerification(sendInteractiveDto.salon_id, userId);

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: validatedPhone,
      type: 'interactive',
      interactive: sendInteractiveDto.interactive,
    };

    try {
      const response = await this.retryRequest(
        () => this.sendWhatsAppMessage(salon.phone_number_id, salon.access_token, payload),
        3,
      );

      // Determine item count for logging
      const itemCount =
        sendInteractiveDto.interactive.action.buttons?.length ||
        sendInteractiveDto.interactive.action.sections?.reduce(
          (sum, section) => sum + section.rows.length,
          0,
        ) ||
        0;

      this.logger.log(
        `Sent interactive message to ${validatedPhone}: ${sendInteractiveDto.interactive.type} (${itemCount} items)`,
      );

      // Create content preview for database
      const contentPreview = `Interactive ${sendInteractiveDto.interactive.type}: ${sendInteractiveDto.interactive.body.text.substring(0, 100)}`;

      const message = await this.prisma.message.create({
        data: {
          salon_id: salon.id,
          direction: 'OUTBOUND',
          conversation_id: sendInteractiveDto.conversation_id || null,
          phone_number: validatedPhone,
          message_type: 'INTERACTIVE',
          content: contentPreview,
          whatsapp_id: response.messages[0].id,
          status: 'SENT',
          cost: this.calculateMessageCost('INTERACTIVE'),
        },
      });

      await this.updateOrCreateConversation(
        salon.id,
        validatedPhone,
        this.calculateMessageCost('INTERACTIVE'),
      );

      return {
        success: true,
        whatsapp_id: response.messages[0].id,
        message_id: message.id,
        status: 'SENT',
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to send interactive message: ${err.message}`, err.stack);
      throw this.handleWhatsAppError(error);
    }
  }

  async markAsRead(salonId: string, userId: string, messageId: string): Promise<void> {
    this.logger.log(`Marking message ${messageId} as read for salon ${salonId}`);

    const salon = await this.getSalonWithVerification(salonId, userId);

    const payload = {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    };

    try {
      await this.sendWhatsAppMessage(salon.phone_number_id, salon.access_token, payload);
      this.logger.log(`Message ${messageId} marked as read successfully`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to mark message as read: ${err.message}`, err.stack);
      throw this.handleWhatsAppError(error);
    }
  }

  async getMediaUrl(mediaId: string, accessToken: string): Promise<string> {
    this.logger.log(`Fetching media URL for media ID: ${mediaId}`);

    const url = `${this.apiUrl}/${this.apiVersion}/${mediaId}`;

    try {
      const response = await firstValueFrom(
        this.httpService.get<MediaUrlResponse>(url, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          timeout: this.timeout,
        }),
      );

      return response.data.url;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to get media URL: ${err.message}`, err.stack);
      throw this.handleWhatsAppError(error);
    }
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.webhookSecret) {
      this.logger.warn('Webhook secret not configured, skipping signature verification');
      return true;
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(payload)
      .digest('hex');

    const signatureToVerify = signature.startsWith('sha256=') ? signature.substring(7) : signature;

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(signatureToVerify, 'hex'),
    );
  }

  private async sendWhatsAppMessage(
    phoneNumberId: string,
    accessToken: string,
    payload: any,
    attempt: number = 1,
  ): Promise<MessageResponse> {
    const url = `${this.apiUrl}/${this.apiVersion}/${phoneNumberId}/messages`;

    try {
      const response = await firstValueFrom(
        this.httpService.post<MessageResponse>(url, payload, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          timeout: this.timeout,
        }),
      );

      return response.data;
    } catch (error) {
      if (attempt < this.retryAttempts && this.shouldRetry(error)) {
        this.logger.warn(
          `Retrying WhatsApp API call (attempt ${attempt + 1}/${this.retryAttempts})`,
        );
        await this.sleep(this.retryDelay * attempt);
        return this.sendWhatsAppMessage(phoneNumberId, accessToken, payload, attempt + 1);
      }

      throw error;
    }
  }

  /**
   * Get salon by ID without ownership verification
   * Used for system/AI bot context
   */
  private async getSalonById(salonId: string): Promise<any> {
    const salon = await this.prisma.salon.findUnique({
      where: { id: salonId },
    });

    if (!salon) {
      throw new BadRequestException('Salon not found');
    }

    if (!salon.is_active) {
      throw new BadRequestException('Salon is not active');
    }

    if (!salon.phone_number_id || !salon.access_token) {
      throw new BadRequestException('Salon WhatsApp credentials not configured');
    }

    return salon;
  }

  private async getSalonWithVerification(salonId: string, userId: string): Promise<any> {
    const salon = await this.prisma.salon.findUnique({
      where: { id: salonId },
    });

    if (!salon) {
      throw new BadRequestException('Salon not found');
    }

    if (salon.owner_id !== userId) {
      throw new BadRequestException('You do not have permission to send messages for this salon');
    }

    if (!salon.is_active) {
      throw new BadRequestException('Salon is not active');
    }

    if (!salon.phone_number_id || !salon.access_token) {
      throw new BadRequestException('Salon WhatsApp credentials not configured');
    }

    return salon;
  }

  private async updateOrCreateConversation(
    salonId: string,
    phoneNumber: string,
    cost: number,
  ): Promise<void> {
    try {
      const existingConversation = await this.prisma.conversation.findUnique({
        where: {
          salon_id_phone_number: {
            salon_id: salonId,
            phone_number: phoneNumber,
          },
        },
      });

      if (existingConversation) {
        await this.prisma.conversation.update({
          where: { id: existingConversation.id },
          data: {
            last_message_at: new Date(),
            message_count: { increment: 1 },
            cost: { increment: cost },
          },
        });
      } else {
        await this.prisma.conversation.create({
          data: {
            salon_id: salonId,
            phone_number: phoneNumber,
            status: 'ACTIVE',
            message_count: 1,
            cost: cost,
          },
        });
      }
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to update conversation: ${err.message}`, err.stack);
    }
  }

  private calculateMessageCost(messageType: string): number {
    const costs: Record<string, number> = {
      TEXT: 0.005,
      TEMPLATE: 0.01,
      IMAGE: 0.01,
      DOCUMENT: 0.01,
      AUDIO: 0.01,
      VIDEO: 0.02,
      INTERACTIVE: 0.01,
    };

    return costs[messageType] || 0.005;
  }

  private shouldRetry(error: any): boolean {
    if (!error.response) {
      return true;
    }

    const status = error.response.status;
    return status === 429 || status >= 500;
  }

  private handleWhatsAppError(error: any): HttpException {
    if (error instanceof HttpException) {
      return error;
    }

    const axiosError = error as AxiosError<WhatsAppApiError>;

    if (axiosError.response) {
      const status = axiosError.response.status;
      const errorData = axiosError.response.data;

      if (errorData?.error) {
        const message = errorData.error.message || 'WhatsApp API error';
        const code = errorData.error.code;

        switch (status) {
          case 400:
            return new BadRequestException(`WhatsApp API error: ${message}`);
          case 401:
            return new HttpException('Invalid WhatsApp access token', HttpStatus.UNAUTHORIZED);
          case 403:
            return new HttpException('Insufficient WhatsApp API permissions', HttpStatus.FORBIDDEN);
          case 429:
            return new HttpException(
              'WhatsApp API rate limit exceeded',
              HttpStatus.TOO_MANY_REQUESTS,
            );
          case 500:
          case 502:
          case 503:
            return new HttpException(
              'WhatsApp API service unavailable',
              HttpStatus.SERVICE_UNAVAILABLE,
            );
          default:
            return new HttpException(`WhatsApp API error (${code}): ${message}`, status);
        }
      }
    }

    return new HttpException(
      'Failed to communicate with WhatsApp API',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  /**
   * Validates phone number format and normalizes to E.164
   * @param phone - Phone number to validate
   * @returns Validated phone number in E.164 format
   * @throws BadRequestException if phone number is invalid
   */
  private validatePhoneNumber(phone: string): string {
    // Remove all non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');

    // Ensure it starts with +
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }

    // Validate E.164 format: +[1-9][0-9]{1,14}
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    if (!e164Regex.test(cleaned)) {
      throw new BadRequestException(
        `Invalid phone number format. Must be in E.164 format (e.g., +1234567890). Received: ${phone}`,
      );
    }

    return cleaned;
  }

  /**
   * Retry logic with exponential backoff
   * @param fn - Function to retry
   * @param maxRetries - Maximum number of retries (default: 3)
   * @returns Promise with function result
   */
  private async retryRequest<T>(fn: () => Promise<T>, maxRetries: number = 3): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        const axiosError = error as AxiosError<WhatsAppApiError>;
        const status = axiosError.response?.status;

        // Don't retry on client errors (except rate limit)
        if (status && status >= 400 && status < 500 && status !== 429) {
          this.logger.error(`Non-retryable error (${status}): ${axiosError.message}`);
          throw error;
        }

        // Don't retry on last attempt
        if (attempt === maxRetries) {
          this.logger.error(`Max retries (${maxRetries}) reached. Giving up.`);
          throw error;
        }

        // Calculate exponential backoff: 1s, 2s, 4s
        const delayMs = Math.pow(2, attempt - 1) * 1000;
        this.logger.warn(
          `Request failed (attempt ${attempt}/${maxRetries}). Retrying in ${delayMs}ms... Error: ${axiosError.message}`,
        );

        await this.sleep(delayMs);
      }
    }

    throw lastError;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
