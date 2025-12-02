import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiHeader,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { WhatsAppService } from './whatsapp.service';
import { WebhookService } from './webhook.service';
import {
  SendTextDto,
  SendTemplateDto,
  SendMediaDto,
  WebhookVerifyDto,
  SendMessageResponseDto,
} from './dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { WebhookSignatureGuard } from './guards/webhook-signature.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';

@ApiTags('whatsapp')
@Controller('whatsapp')
export class WhatsAppController {
  private readonly logger = new Logger(WhatsAppController.name);
  private readonly webhookVerifyToken: string;

  constructor(
    private readonly whatsappService: WhatsAppService,
    private readonly webhookService: WebhookService,
    private readonly configService: ConfigService,
  ) {
    this.webhookVerifyToken = this.configService.get<string>('whatsapp.webhookVerifyToken') || '';
  }

  @Get('webhook')
  @ApiOperation({
    summary: 'Verify WhatsApp webhook',
    description:
      'WhatsApp webhook verification endpoint. Called by WhatsApp to verify the webhook URL during setup.',
  })
  @ApiQuery({ name: 'hub.mode', description: 'Webhook mode', example: 'subscribe' })
  @ApiQuery({
    name: 'hub.verify_token',
    description: 'Verification token',
    example: 'your-verify-token',
  })
  @ApiQuery({
    name: 'hub.challenge',
    description: 'Challenge string',
    example: 'challenge-string-1234567890',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Webhook verified successfully',
    type: String,
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Invalid verification token' })
  verifyWebhook(@Query() query: WebhookVerifyDto): string {
    this.logger.log('Webhook verification request received');

    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];

    if (mode === 'subscribe' && token === this.webhookVerifyToken) {
      this.logger.log('Webhook verified successfully');
      return challenge;
    }

    this.logger.error('Webhook verification failed: Invalid token');
    throw new UnauthorizedException('Invalid verification token');
  }

  @Post('webhook')
  @UseGuards(WebhookSignatureGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Receive WhatsApp webhook events',
    description:
      'Receives webhook events from WhatsApp including incoming messages and status updates. SECURITY: All requests MUST include valid X-Hub-Signature-256 header for HMAC verification.',
  })
  @ApiHeader({
    name: 'X-Hub-Signature-256',
    description: 'HMAC SHA256 signature (format: sha256=<hash>). REQUIRED for security.',
    required: true,
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Webhook processed successfully' })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing webhook signature',
  })
  async handleWebhook(@Body() body: any): Promise<{ status: string }> {
    this.logger.log('Webhook event received (signature validated by guard)');

    // SECURITY: WebhookSignatureGuard validates signature BEFORE this handler executes
    // If execution reaches here, signature is already verified

    try {
      await this.webhookService.processWebhook(body);
      this.logger.log('Webhook processed successfully');
      return { status: 'success' };
    } catch (error) {
      this.logger.error(`Failed to process webhook: ${error.message}`, error.stack);
      // Always return success to WhatsApp to prevent retries for application errors
      return { status: 'success' };
    }
  }

  @Post('send-text')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Send text message',
    description: 'Sends a text message via WhatsApp Business API.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Message sent successfully',
    type: SendMessageResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid request data' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  async sendText(
    @CurrentUser('id') userId: string,
    @Body() sendTextDto: SendTextDto,
  ): Promise<SendMessageResponseDto> {
    this.logger.log(`Sending text message for user ${userId}`);
    return await this.whatsappService.sendTextMessage(userId, sendTextDto);
  }

  @Post('send-template')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Send template message',
    description: 'Sends a pre-approved template message via WhatsApp Business API.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Template message sent successfully',
    type: SendMessageResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid request data' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  async sendTemplate(
    @CurrentUser('id') userId: string,
    @Body() sendTemplateDto: SendTemplateDto,
  ): Promise<SendMessageResponseDto> {
    this.logger.log(`Sending template message for user ${userId}`);
    return await this.whatsappService.sendTemplateMessage(userId, sendTemplateDto);
  }

  @Post('send-media')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Send media message',
    description: 'Sends a media message (image, document, audio, video) via WhatsApp Business API.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Media message sent successfully',
    type: SendMessageResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid request data' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  async sendMedia(
    @CurrentUser('id') userId: string,
    @Body() sendMediaDto: SendMediaDto,
  ): Promise<SendMessageResponseDto> {
    this.logger.log(`Sending media message for user ${userId}`);
    return await this.whatsappService.sendMediaMessage(userId, sendMediaDto);
  }

  @Get('health')
  @ApiOperation({
    summary: 'WhatsApp module health check',
    description: 'Check if WhatsApp module is running properly.',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'WhatsApp module is healthy' })
  healthCheck(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
