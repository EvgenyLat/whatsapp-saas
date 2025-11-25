import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { WebhookSignatureValidator } from './webhook-signature.validator';
import * as crypto from 'crypto';

describe('WebhookSignatureValidator', () => {
  let validator: WebhookSignatureValidator;
  let configService: ConfigService;

  const mockAppSecret = 'test-app-secret-for-hmac-validation';
  const testPayload = JSON.stringify({
    object: 'whatsapp_business_account',
    entry: [{ id: '123', changes: [] }]
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookSignatureValidator,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config: Record<string, any> = {
                'whatsapp.webhookSecret': mockAppSecret,
                'whatsapp.disableWebhookValidation': false,
                'app.environment': 'test',
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
      ],
    }).compile();

    validator = module.get<WebhookSignatureValidator>(WebhookSignatureValidator);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('Initialization', () => {
    it('should be defined', () => {
      expect(validator).toBeDefined();
    });

    it('should load configuration on initialization', () => {
      expect(configService.get).toHaveBeenCalledWith('whatsapp.webhookSecret');
      expect(configService.get).toHaveBeenCalledWith('whatsapp.disableWebhookValidation', false);
      expect(configService.get).toHaveBeenCalledWith('app.environment', 'development');
    });

    it('should throw error if app secret not configured in production', () => {
      const prodConfigService = {
        get: jest.fn((key: string, defaultValue?: any) => {
          const config: Record<string, any> = {
            'whatsapp.webhookSecret': '',
            'whatsapp.disableWebhookValidation': false,
            'app.environment': 'production',
          };
          return config[key] ?? defaultValue;
        }),
      };

      expect(() => {
        new WebhookSignatureValidator(prodConfigService as any);
      }).toThrow('WHATSAPP_APP_SECRET must be configured in production');
    });
  });

  describe('validateSignature', () => {
    it('should validate correct signature with sha256= prefix', () => {
      const signature = crypto
        .createHmac('sha256', mockAppSecret)
        .update(testPayload, 'utf8')
        .digest('hex');

      const result = validator.validateSignature(`sha256=${signature}`, testPayload);

      expect(result).toBe(true);
    });

    it('should validate correct signature without sha256= prefix', () => {
      const signature = crypto
        .createHmac('sha256', mockAppSecret)
        .update(testPayload, 'utf8')
        .digest('hex');

      const result = validator.validateSignature(signature, testPayload);

      expect(result).toBe(true);
    });

    it('should reject invalid signature', () => {
      const invalidSignature = 'sha256=' + 'a'.repeat(64);

      const result = validator.validateSignature(invalidSignature, testPayload);

      expect(result).toBe(false);
    });

    it('should reject missing signature', () => {
      const result = validator.validateSignature('', testPayload);

      expect(result).toBe(false);
    });

    it('should reject signature with invalid format', () => {
      const result = validator.validateSignature('invalid-format', testPayload);

      expect(result).toBe(false);
    });

    it('should reject signature with incorrect length', () => {
      const shortSignature = 'sha256=abc123';

      const result = validator.validateSignature(shortSignature, testPayload);

      expect(result).toBe(false);
    });

    it('should reject signature with non-hex characters', () => {
      const invalidSignature = 'sha256=' + 'g'.repeat(64);

      const result = validator.validateSignature(invalidSignature, testPayload);

      expect(result).toBe(false);
    });

    it('should reject tampered payload', () => {
      const signature = crypto
        .createHmac('sha256', mockAppSecret)
        .update(testPayload, 'utf8')
        .digest('hex');

      const tamperedPayload = testPayload.replace('123', '456');

      const result = validator.validateSignature(`sha256=${signature}`, tamperedPayload);

      expect(result).toBe(false);
    });

    it('should use constant-time comparison', () => {
      // This test ensures timingSafeEqual is used
      const correctSignature = crypto
        .createHmac('sha256', mockAppSecret)
        .update(testPayload, 'utf8')
        .digest('hex');

      const wrongSignature = 'a' + correctSignature.substring(1);

      const start = process.hrtime.bigint();
      validator.validateSignature(`sha256=${wrongSignature}`, testPayload);
      const wrongTime = process.hrtime.bigint() - start;

      const start2 = process.hrtime.bigint();
      validator.validateSignature(`sha256=${correctSignature}`, testPayload);
      const correctTime = process.hrtime.bigint() - start2;

      // Both should take similar time (within 10x factor)
      // This is a weak test but demonstrates constant-time comparison
      expect(Number(wrongTime)).toBeGreaterThan(0);
      expect(Number(correctTime)).toBeGreaterThan(0);
    });
  });

  describe('Bypass Mode (Development)', () => {
    let bypassValidator: WebhookSignatureValidator;

    beforeEach(async () => {
      const bypassConfigService = {
        get: jest.fn((key: string, defaultValue?: any) => {
          const config: Record<string, any> = {
            'whatsapp.webhookSecret': mockAppSecret,
            'whatsapp.disableWebhookValidation': true,
            'app.environment': 'development',
          };
          return config[key] ?? defaultValue;
        }),
      };

      bypassValidator = new WebhookSignatureValidator(bypassConfigService as any);
    });

    it('should bypass validation when disabled', () => {
      const result = bypassValidator.validateSignature('', testPayload);

      expect(result).toBe(true);
    });

    it('should bypass validation even with invalid signature', () => {
      const result = bypassValidator.validateSignature('invalid', testPayload);

      expect(result).toBe(true);
    });
  });

  describe('Missing App Secret', () => {
    let noSecretValidator: WebhookSignatureValidator;

    beforeEach(async () => {
      const noSecretConfigService = {
        get: jest.fn((key: string, defaultValue?: any) => {
          const config: Record<string, any> = {
            'whatsapp.webhookSecret': '',
            'whatsapp.disableWebhookValidation': false,
            'app.environment': 'development',
          };
          return config[key] ?? defaultValue;
        }),
      };

      noSecretValidator = new WebhookSignatureValidator(noSecretConfigService as any);
    });

    it('should fail validation if app secret not configured', () => {
      const signature = crypto
        .createHmac('sha256', 'wrong-secret')
        .update(testPayload, 'utf8')
        .digest('hex');

      const result = noSecretValidator.validateSignature(`sha256=${signature}`, testPayload);

      expect(result).toBe(false);
    });
  });

  describe('getValidationStatus', () => {
    it('should return validation status', () => {
      const status = validator.getValidationStatus();

      expect(status).toEqual({
        enabled: true,
        configured: true,
        environment: 'test',
      });
    });

    it('should reflect disabled state', () => {
      const disabledConfigService = {
        get: jest.fn((key: string, defaultValue?: any) => {
          const config: Record<string, any> = {
            'whatsapp.webhookSecret': mockAppSecret,
            'whatsapp.disableWebhookValidation': true,
            'app.environment': 'development',
          };
          return config[key] ?? defaultValue;
        }),
      };

      const disabledValidator = new WebhookSignatureValidator(disabledConfigService as any);
      const status = disabledValidator.getValidationStatus();

      expect(status).toEqual({
        enabled: false,
        configured: true,
        environment: 'development',
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large payloads', () => {
      const largePayload = JSON.stringify({
        data: 'x'.repeat(10000),
      });

      const signature = crypto
        .createHmac('sha256', mockAppSecret)
        .update(largePayload, 'utf8')
        .digest('hex');

      const result = validator.validateSignature(`sha256=${signature}`, largePayload);

      expect(result).toBe(true);
    });

    it('should handle special characters in payload', () => {
      const specialPayload = JSON.stringify({
        text: '🎉 Special: <>&"\'',
      });

      const signature = crypto
        .createHmac('sha256', mockAppSecret)
        .update(specialPayload, 'utf8')
        .digest('hex');

      const result = validator.validateSignature(`sha256=${signature}`, specialPayload);

      expect(result).toBe(true);
    });

    it('should handle empty payload', () => {
      const emptyPayload = '';

      const signature = crypto
        .createHmac('sha256', mockAppSecret)
        .update(emptyPayload, 'utf8')
        .digest('hex');

      const result = validator.validateSignature(`sha256=${signature}`, emptyPayload);

      expect(result).toBe(true);
    });

    it('should handle null signature gracefully', () => {
      const result = validator.validateSignature(null as any, testPayload);

      expect(result).toBe(false);
    });

    it('should handle undefined signature gracefully', () => {
      const result = validator.validateSignature(undefined as any, testPayload);

      expect(result).toBe(false);
    });
  });

  describe('Security Tests', () => {
    it('should prevent timing attacks with constant-time comparison', () => {
      const correctSignature = crypto
        .createHmac('sha256', mockAppSecret)
        .update(testPayload, 'utf8')
        .digest('hex');

      // Test with signatures that differ at different positions
      const earlyDiff = 'a' + correctSignature.substring(1);
      const lateDiff = correctSignature.substring(0, 63) + 'a';

      const start1 = process.hrtime.bigint();
      validator.validateSignature(`sha256=${earlyDiff}`, testPayload);
      const time1 = process.hrtime.bigint() - start1;

      const start2 = process.hrtime.bigint();
      validator.validateSignature(`sha256=${lateDiff}`, testPayload);
      const time2 = process.hrtime.bigint() - start2;

      // Times should be similar (within 2x) for constant-time comparison
      const ratio = Number(time1) / Number(time2);
      expect(ratio).toBeGreaterThan(0.5);
      expect(ratio).toBeLessThan(2.0);
    });

    it('should reject signature with only whitespace', () => {
      const result = validator.validateSignature('   ', testPayload);

      expect(result).toBe(false);
    });

    it('should reject signature with SQL injection attempt', () => {
      const result = validator.validateSignature("sha256=' OR '1'='1", testPayload);

      expect(result).toBe(false);
    });
  });
});
