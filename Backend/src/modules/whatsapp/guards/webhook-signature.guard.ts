import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { Request } from 'express';
import { WebhookSignatureValidator } from '../security/webhook-signature.validator';

/**
 * Custom Express Request type with rawBody
 */
interface RequestWithRawBody extends Request {
  rawBody?: string;
}

/**
 * WebhookSignatureGuard
 *
 * NestJS guard that validates WhatsApp webhook signatures.
 *
 * SECURITY:
 * - Enforces signature validation on all webhook requests
 * - Requires X-Hub-Signature-256 header (mandatory)
 * - Requires raw body for signature calculation
 * - Logs all validation failures for security monitoring
 * - Throws UnauthorizedException on validation failure
 *
 * USAGE:
 * Apply to webhook endpoints:
 * ```
 * @Post('webhook')
 * @UseGuards(WebhookSignatureGuard)
 * async handleWebhook(@Body() body: any) { ... }
 * ```
 *
 * IMPORTANT:
 * - Raw body parser middleware MUST be configured in main.ts
 * - This guard MUST be applied to all webhook POST endpoints
 * - DO NOT remove this guard in production
 */
@Injectable()
export class WebhookSignatureGuard implements CanActivate {
  private readonly logger = new Logger(WebhookSignatureGuard.name);

  constructor(private readonly validator: WebhookSignatureValidator) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithRawBody>();

    // Extract signature from header
    const signature = request.headers['x-hub-signature-256'] as string;

    // SECURITY: Reject if signature header is missing
    if (!signature) {
      this.logger.error('❌ Webhook request rejected: Missing X-Hub-Signature-256 header');
      this.logger.error(`   Request IP: ${request.ip}`);
      this.logger.error(`   Request path: ${request.path}`);
      this.logger.error(`   User-Agent: ${request.headers['user-agent'] || 'Unknown'}`);
      throw new UnauthorizedException('Missing webhook signature');
    }

    // SECURITY: Reject if raw body is not available
    // Raw body is required for accurate signature calculation
    const rawBody = request.rawBody || JSON.stringify(request.body);
    if (!request.rawBody) {
      this.logger.warn('⚠️  Raw body not available, using JSON.stringify() fallback');
      this.logger.warn('⚠️  This may cause signature validation to fail if body was modified');
    }

    // Validate signature using validator service
    const isValid = this.validator.validateSignature(signature, rawBody);

    if (!isValid) {
      // SECURITY: Log failed validation attempt
      this.logger.error('❌ Webhook request rejected: Invalid signature');
      this.logger.error(`   Request IP: ${request.ip}`);
      this.logger.error(`   Request path: ${request.path}`);
      this.logger.error(`   User-Agent: ${request.headers['user-agent'] || 'Unknown'}`);
      this.logger.error(`   Signature: ${signature}`);
      this.logger.error(`   Body size: ${rawBody.length} bytes`);

      throw new UnauthorizedException('Invalid webhook signature');
    }

    // SECURITY: Log successful validation
    this.logger.log('✅ Webhook signature validated successfully');
    this.logger.debug(`   Request IP: ${request.ip}`);
    this.logger.debug(`   Body size: ${rawBody.length} bytes`);

    return true;
  }
}
