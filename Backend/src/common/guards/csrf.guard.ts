import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'crypto';

export const SKIP_CSRF_KEY = 'skipCsrf';

@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly logger = new Logger(CsrfGuard.name);
  private readonly csrfSecret: string;

  constructor(
    private reflector: Reflector,
    private configService: ConfigService,
  ) {
    // Use a dedicated CSRF secret or derive from JWT secret
    const csrfSecret =
      this.configService.get<string>('CSRF_SECRET') ||
      this.configService.get<string>('jwt.secret');

    if (!csrfSecret) {
      throw new Error(
        'SECURITY ERROR: CSRF_SECRET not configured. Either set CSRF_SECRET or ensure JWT_SECRET is set.'
      );
    }

    this.csrfSecret = csrfSecret;
  }

  canActivate(context: ExecutionContext): boolean {
    // Check if CSRF validation should be skipped for this route
    const skipCsrf = this.reflector.getAllAndOverride<boolean>(SKIP_CSRF_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipCsrf) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const method = request.method;

    // Only validate CSRF for state-changing methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return true;
    }

    // Get CSRF token from header
    const csrfTokenFromHeader = request.headers['x-csrf-token'];

    if (!csrfTokenFromHeader) {
      this.logger.warn('CSRF validation failed: Missing X-CSRF-Token header');
      throw new ForbiddenException('CSRF token missing');
    }

    // Get session identifier (use user ID from JWT or session)
    const user = request.user;
    const sessionId = user?.id || request.sessionID || 'anonymous';

    // Validate CSRF token
    if (!this.validateCsrfToken(csrfTokenFromHeader, sessionId)) {
      this.logger.warn(`CSRF validation failed for user: ${sessionId}`);
      throw new ForbiddenException('Invalid CSRF token');
    }

    return true;
  }

  /**
   * Generate CSRF token for a session
   */
  generateCsrfToken(sessionId: string): string {
    const timestamp = Date.now();
    const hash = createHash('sha256')
      .update(`${sessionId}:${timestamp}:${this.csrfSecret}`)
      .digest('hex');

    // Token format: timestamp:hash
    return Buffer.from(`${timestamp}:${hash}`).toString('base64');
  }

  /**
   * Validate CSRF token
   */
  private validateCsrfToken(token: string, sessionId: string): boolean {
    try {
      // Decode token
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const [timestampStr, hash] = decoded.split(':');

      if (!timestampStr || !hash) {
        return false;
      }

      const timestamp = parseInt(timestampStr, 10);

      // Check if token is not expired (valid for 24 hours)
      const tokenAge = Date.now() - timestamp;
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      if (tokenAge > maxAge || tokenAge < 0) {
        this.logger.warn('CSRF token expired or invalid timestamp');
        return false;
      }

      // Regenerate hash and compare
      const expectedHash = createHash('sha256')
        .update(`${sessionId}:${timestamp}:${this.csrfSecret}`)
        .digest('hex');

      // Use timing-safe comparison to prevent timing attacks
      const tokenBuffer = Buffer.from(hash, 'hex');
      const expectedBuffer = Buffer.from(expectedHash, 'hex');

      if (tokenBuffer.length !== expectedBuffer.length) {
        return false;
      }

      return timingSafeEqual(tokenBuffer, expectedBuffer);
    } catch (error) {
      this.logger.error('CSRF token validation error', error);
      return false;
    }
  }
}
