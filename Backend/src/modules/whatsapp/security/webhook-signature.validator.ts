import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * WebhookSignatureValidator
 *
 * Validates WhatsApp webhook signatures using HMAC SHA256.
 *
 * SECURITY:
 * - Uses constant-time comparison to prevent timing attacks
 * - Validates signature format before processing
 * - Mandatory validation in production (optional in dev with flag)
 * - Logs all validation failures for security monitoring
 */
@Injectable()
export class WebhookSignatureValidator {
  private readonly logger = new Logger(WebhookSignatureValidator.name);
  private readonly appSecret: string;
  private readonly validationDisabled: boolean;
  private readonly environment: string;

  constructor(private readonly configService: ConfigService) {
    this.appSecret = this.configService.get<string>('whatsapp.webhookSecret') || '';
    this.validationDisabled = this.configService.get<boolean>(
      'whatsapp.disableWebhookValidation',
      false,
    );
    this.environment = this.configService.get<string>('app.environment', 'development');

    // SECURITY: Log warning if validation is disabled
    if (this.validationDisabled) {
      this.logger.warn('⚠️  SECURITY WARNING: Webhook signature validation is DISABLED');
      this.logger.warn('⚠️  This should ONLY be used in development/testing environments');
      this.logger.warn('⚠️  NEVER disable validation in production!');
    }

    // SECURITY: Fail fast if app secret is not configured in production
    if (!this.appSecret && this.environment === 'production' && !this.validationDisabled) {
      this.logger.error(
        '❌ CRITICAL SECURITY ERROR: WHATSAPP_APP_SECRET not configured in production',
      );
      this.logger.error('❌ Webhook signature validation requires WHATSAPP_APP_SECRET');
      throw new Error('WHATSAPP_APP_SECRET must be configured in production');
    }

    if (!this.appSecret && !this.validationDisabled) {
      this.logger.error('❌ WHATSAPP_APP_SECRET not configured');
      this.logger.error(
        '❌ Set WHATSAPP_APP_SECRET environment variable or DISABLE_WEBHOOK_VALIDATION=true for dev/testing',
      );
    }
  }

  /**
   * Validates WhatsApp webhook signature
   *
   * @param signature - X-Hub-Signature-256 header value (format: "sha256=<hash>")
   * @param rawBody - Raw request body as string (MUST be raw, not parsed JSON)
   * @returns true if signature is valid, false otherwise
   *
   * SECURITY:
   * - Returns false immediately if signature format is invalid
   * - Uses constant-time comparison to prevent timing attacks
   * - Validates hex string format before comparison
   * - Logs all validation failures with details
   */
  validateSignature(signature: string, rawBody: string): boolean {
    // Allow bypass in development/testing ONLY if explicitly enabled
    if (this.validationDisabled) {
      this.logger.debug('⚠️  Signature validation bypassed (DISABLE_WEBHOOK_VALIDATION=true)');
      return true;
    }

    // SECURITY: Fail if no app secret configured
    if (!this.appSecret) {
      this.logger.error('❌ Signature validation failed: WHATSAPP_APP_SECRET not configured');
      return false;
    }

    // SECURITY: Fail if no signature provided
    if (!signature) {
      this.logger.error('❌ Signature validation failed: Missing X-Hub-Signature-256 header');
      return false;
    }

    try {
      // Extract signature from header (format: "sha256=<hash>")
      const signatureHash = this.extractSignatureHash(signature);
      if (!signatureHash) {
        this.logger.error(`❌ Signature validation failed: Invalid signature format: ${signature}`);
        return false;
      }

      // Calculate expected HMAC
      const expectedHash = crypto
        .createHmac('sha256', this.appSecret)
        .update(rawBody, 'utf8')
        .digest('hex');

      // SECURITY: Validate hex string format before comparison
      if (!this.isValidHex(signatureHash) || !this.isValidHex(expectedHash)) {
        this.logger.error('❌ Signature validation failed: Invalid hex format');
        return false;
      }

      // SECURITY: Constant-time comparison to prevent timing attacks
      const isValid = crypto.timingSafeEqual(
        Buffer.from(expectedHash, 'hex'),
        Buffer.from(signatureHash, 'hex'),
      );

      if (!isValid) {
        this.logger.error('❌ Signature validation failed: Signature mismatch');
        this.logger.error(`   Received signature: sha256=${signatureHash}`);
        this.logger.error(`   Expected signature: sha256=${expectedHash.substring(0, 16)}...`);
        this.logger.error(`   Body length: ${rawBody.length} bytes`);
        this.logger.error(`   Body preview: ${rawBody.substring(0, 100)}...`);
      } else {
        this.logger.log('✅ Webhook signature validation successful');
      }

      return isValid;
    } catch (error) {
      this.logger.error(
        `❌ Signature validation failed with exception: ${(error as Error).message}`,
        (error as Error).stack,
      );
      return false;
    }
  }

  /**
   * Extracts signature hash from X-Hub-Signature-256 header
   *
   * @param signature - Header value (format: "sha256=<hash>" or just "<hash>")
   * @returns Hex hash string or null if invalid format
   */
  private extractSignatureHash(signature: string): string | null {
    if (!signature) {
      return null;
    }

    // Handle both "sha256=<hash>" and "<hash>" formats
    const hash = signature.startsWith('sha256=') ? signature.substring(7) : signature;

    // Validate hash length (SHA256 produces 64 hex characters)
    if (hash.length !== 64) {
      this.logger.error(`Invalid signature hash length: ${hash.length} (expected 64)`);
      return null;
    }

    return hash;
  }

  /**
   * Validates hex string format
   *
   * @param str - String to validate
   * @returns true if valid hex string, false otherwise
   */
  private isValidHex(str: string): boolean {
    return /^[0-9a-f]+$/i.test(str);
  }

  /**
   * Get validation status for health checks
   */
  getValidationStatus(): {
    enabled: boolean;
    configured: boolean;
    environment: string;
  } {
    return {
      enabled: !this.validationDisabled,
      configured: !!this.appSecret,
      environment: this.environment,
    };
  }
}
