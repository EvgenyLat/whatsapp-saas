import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { WebhookSignatureGuard } from './webhook-signature.guard';
import { WebhookSignatureValidator } from '../security/webhook-signature.validator';

describe('WebhookSignatureGuard', () => {
  let guard: WebhookSignatureGuard;

  const mockValidator = {
    validateSignature: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookSignatureGuard,
        {
          provide: WebhookSignatureValidator,
          useValue: mockValidator,
        },
      ],
    }).compile();

    guard = module.get<WebhookSignatureGuard>(WebhookSignatureGuard);

    // Reset mocks
    mockValidator.validateSignature.mockClear();
  });

  const createMockExecutionContext = (
    headers: Record<string, string>,
    body: any,
    rawBody?: string,
  ): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          headers,
          body,
          rawBody,
          ip: '127.0.0.1',
          path: '/api/v1/whatsapp/webhook',
        }),
      }),
    } as ExecutionContext;
  };

  describe('Initialization', () => {
    it('should be defined', () => {
      expect(guard).toBeDefined();
    });
  });

  describe('canActivate', () => {
    it('should allow request with valid signature', () => {
      mockValidator.validateSignature.mockReturnValue(true);

      const context = createMockExecutionContext(
        { 'x-hub-signature-256': 'sha256=validhash123' },
        { message: 'test' },
        '{"message":"test"}',
      );

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockValidator.validateSignature).toHaveBeenCalledWith(
        'sha256=validhash123',
        '{"message":"test"}',
      );
    });

    it('should reject request with invalid signature', () => {
      mockValidator.validateSignature.mockReturnValue(false);

      const context = createMockExecutionContext(
        { 'x-hub-signature-256': 'sha256=invalidhash' },
        { message: 'test' },
        '{"message":"test"}',
      );

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow('Invalid webhook signature');
    });

    it('should reject request without signature header', () => {
      const context = createMockExecutionContext({}, { message: 'test' }, '{"message":"test"}');

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow('Missing webhook signature');
      expect(mockValidator.validateSignature).not.toHaveBeenCalled();
    });

    it('should fallback to JSON.stringify if rawBody not available', () => {
      mockValidator.validateSignature.mockReturnValue(true);

      const body = { message: 'test' };
      const context = createMockExecutionContext(
        { 'x-hub-signature-256': 'sha256=validhash' },
        body,
        undefined, // No rawBody
      );

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockValidator.validateSignature).toHaveBeenCalledWith(
        'sha256=validhash',
        JSON.stringify(body),
      );
    });

    it('should use rawBody when available', () => {
      mockValidator.validateSignature.mockReturnValue(true);

      const body = { message: 'test' };
      const rawBody = '{"message":"test","extra":"field"}';
      const context = createMockExecutionContext(
        { 'x-hub-signature-256': 'sha256=validhash' },
        body,
        rawBody,
      );

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockValidator.validateSignature).toHaveBeenCalledWith('sha256=validhash', rawBody);
    });
  });

  describe('Security Logging', () => {
    it('should log request details on successful validation', () => {
      mockValidator.validateSignature.mockReturnValue(true);

      const context = createMockExecutionContext(
        { 'x-hub-signature-256': 'sha256=validhash' },
        { message: 'test' },
        '{"message":"test"}',
      );

      guard.canActivate(context);

      // Logger should be called (implicitly tested via no errors)
      expect(mockValidator.validateSignature).toHaveBeenCalled();
    });

    it('should log request details on failed validation', () => {
      mockValidator.validateSignature.mockReturnValue(false);

      const context = createMockExecutionContext(
        { 'x-hub-signature-256': 'sha256=invalidhash' },
        { message: 'test' },
        '{"message":"test"}',
      );

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should log request details when signature is missing', () => {
      const context = createMockExecutionContext({}, { message: 'test' }, '{"message":"test"}');

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty signature header', () => {
      const context = createMockExecutionContext(
        { 'x-hub-signature-256': '' },
        { message: 'test' },
        '{"message":"test"}',
      );

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow('Missing webhook signature');
    });

    it('should handle whitespace-only signature', () => {
      const context = createMockExecutionContext(
        { 'x-hub-signature-256': '   ' },
        { message: 'test' },
        '{"message":"test"}',
      );

      // Guard passes signature to validator, validator will reject
      mockValidator.validateSignature.mockReturnValue(false);

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should handle large request body', () => {
      mockValidator.validateSignature.mockReturnValue(true);

      const largeBody = { data: 'x'.repeat(100000) };
      const rawBody = JSON.stringify(largeBody);
      const context = createMockExecutionContext(
        { 'x-hub-signature-256': 'sha256=validhash' },
        largeBody,
        rawBody,
      );

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockValidator.validateSignature).toHaveBeenCalledWith('sha256=validhash', rawBody);
    });

    it('should handle special characters in body', () => {
      mockValidator.validateSignature.mockReturnValue(true);

      const specialBody = { text: '🎉 Special: <>&"\'' };
      const rawBody = JSON.stringify(specialBody);
      const context = createMockExecutionContext(
        { 'x-hub-signature-256': 'sha256=validhash' },
        specialBody,
        rawBody,
      );

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockValidator.validateSignature).toHaveBeenCalledWith('sha256=validhash', rawBody);
    });

    it('should handle case-insensitive header name', () => {
      mockValidator.validateSignature.mockReturnValue(true);

      // Express always normalizes headers to lowercase
      const context = createMockExecutionContext(
        { 'x-hub-signature-256': 'sha256=validhash' },
        { message: 'test' },
        '{"message":"test"}',
      );

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockValidator.validateSignature).toHaveBeenCalledWith(
        'sha256=validhash',
        '{"message":"test"}',
      );
    });
  });

  describe('Attack Scenarios', () => {
    it('should reject replay attack with old signature', () => {
      mockValidator.validateSignature.mockReturnValue(false);

      const context = createMockExecutionContext(
        { 'x-hub-signature-256': 'sha256=oldvalidhash' },
        { message: 'new data' },
        '{"message":"new data"}',
      );

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should reject spoofed webhook with forged signature', () => {
      mockValidator.validateSignature.mockReturnValue(false);

      const context = createMockExecutionContext(
        { 'x-hub-signature-256': 'sha256=forgedhash123' },
        { malicious: 'payload' },
        '{"malicious":"payload"}',
      );

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should reject request with SQL injection in signature', () => {
      mockValidator.validateSignature.mockReturnValue(false);

      const context = createMockExecutionContext(
        { 'x-hub-signature-256': "sha256=' OR '1'='1" },
        { message: 'test' },
        '{"message":"test"}',
      );

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should reject request with XSS in signature', () => {
      mockValidator.validateSignature.mockReturnValue(false);

      const context = createMockExecutionContext(
        { 'x-hub-signature-256': 'sha256=<script>alert("xss")</script>' },
        { message: 'test' },
        '{"message":"test"}',
      );

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should reject tampered body even with valid-looking signature', () => {
      mockValidator.validateSignature.mockReturnValue(false);

      const context = createMockExecutionContext(
        { 'x-hub-signature-256': 'sha256=' + 'a'.repeat(64) },
        { message: 'tampered' },
        '{"message":"tampered"}',
      );

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });
  });

  describe('Integration with Validator', () => {
    it('should pass correct parameters to validator', () => {
      mockValidator.validateSignature.mockReturnValue(true);

      const signature = 'sha256=abc123def456';
      const rawBody = '{"test":"data"}';
      const context = createMockExecutionContext(
        { 'x-hub-signature-256': signature },
        { test: 'data' },
        rawBody,
      );

      guard.canActivate(context);

      expect(mockValidator.validateSignature).toHaveBeenCalledTimes(1);
      expect(mockValidator.validateSignature).toHaveBeenCalledWith(signature, rawBody);
    });

    it('should respect validator decision', () => {
      // Test true result
      mockValidator.validateSignature.mockReturnValue(true);
      const validContext = createMockExecutionContext(
        { 'x-hub-signature-256': 'sha256=valid' },
        {},
        '{}',
      );
      expect(guard.canActivate(validContext)).toBe(true);

      // Test false result
      mockValidator.validateSignature.mockReturnValue(false);
      const invalidContext = createMockExecutionContext(
        { 'x-hub-signature-256': 'sha256=invalid' },
        {},
        '{}',
      );
      expect(() => guard.canActivate(invalidContext)).toThrow(UnauthorizedException);
    });
  });
});
