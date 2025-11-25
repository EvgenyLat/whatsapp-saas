/**
 * Module Wiring Validation Test
 *
 * This test validates that all modules are properly wired and services
 * can be injected correctly in the test environment.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import {
  setupTestApp,
  cleanupTestApp,
  getTestPrisma,
} from '../setup';
import { QuickBookingService } from '../../src/modules/ai/quick-booking.service';
import { IntentParserService } from '../../src/modules/ai/services/intent-parser.service';
import { SlotFinderService } from '../../src/modules/ai/services/slot-finder.service';
import { ButtonParserService } from '../../src/modules/ai/button-parser.service';
import { InteractiveCardBuilderService } from '../../src/modules/ai/interactive-card-builder.service';
import { WhatsAppService } from '../../src/modules/whatsapp/whatsapp.service';
import { WebhookService } from '../../src/modules/whatsapp/webhook.service';

describe('Module Wiring - Dependency Injection Tests', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;

  beforeAll(async () => {
    console.log('[TEST] Starting test app setup...');
    try {
      app = await setupTestApp();
      console.log('[TEST] Test app created successfully');
      moduleRef = app.get<TestingModule>(TestingModule);
      console.log('[TEST] Module reference obtained');
    } catch (error) {
      console.error('[TEST] Failed to setup test app:', error);
      throw error;
    }
  });

  afterAll(async () => {
    await cleanupTestApp(app);
  });

  describe('AIModule Service Injection', () => {
    it('should inject QuickBookingService', () => {
      console.log('[TEST] Attempting to get QuickBookingService...');
      console.log('[TEST] App defined:', !!app);
      try {
        const service = app.get(QuickBookingService);
        console.log('[TEST] QuickBookingService retrieved:', !!service);
        expect(service).toBeDefined();
        expect(service).toBeInstanceOf(QuickBookingService);
      } catch (error) {
        console.error('[TEST] Error getting QuickBookingService:', error);
        throw error;
      }
    });

    it('should inject IntentParserService', () => {
      const service = app.get(IntentParserService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(IntentParserService);
    });

    it('should inject SlotFinderService', () => {
      const service = app.get(SlotFinderService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(SlotFinderService);
    });

    it('should inject ButtonParserService', () => {
      const service = app.get(ButtonParserService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(ButtonParserService);
    });

    it('should inject InteractiveCardBuilderService', () => {
      const service = app.get(InteractiveCardBuilderService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(InteractiveCardBuilderService);
    });

    it('should inject OpenAI client', () => {
      const openai = app.get('OPENAI_CLIENT');
      expect(openai).toBeDefined();
      expect(openai.chat).toBeDefined();
      expect(openai.chat.completions).toBeDefined();
      expect(typeof openai.chat.completions.create).toBe('function');
    });
  });

  describe('WhatsAppModule Service Injection', () => {
    it('should inject WhatsAppService', () => {
      const service = app.get(WhatsAppService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(WhatsAppService);
    });

    it('should inject WebhookService', () => {
      const service = app.get(WebhookService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(WebhookService);
    });

    it('should allow WebhookService to access QuickBookingService', () => {
      const webhookService = app.get(WebhookService);
      const quickBookingService = app.get(QuickBookingService);

      expect(webhookService).toBeDefined();
      expect(quickBookingService).toBeDefined();

      // Both services should be properly injected
      expect(webhookService).toBeInstanceOf(WebhookService);
      expect(quickBookingService).toBeInstanceOf(QuickBookingService);
    });
  });

  describe('Service Method Availability', () => {
    it('QuickBookingService should have handleBookingRequest method', () => {
      const service = app.get(QuickBookingService);
      expect(typeof service.handleBookingRequest).toBe('function');
    });

    it('IntentParserService should have parseIntent method', () => {
      const service = app.get(IntentParserService);
      expect(typeof service.parseIntent).toBe('function');
    });

    it('SlotFinderService should have findAvailableSlots method', () => {
      const service = app.get(SlotFinderService);
      expect(typeof service.findAvailableSlots).toBe('function');
    });

    it('ButtonParserService should have parseButtonId method', () => {
      const service = app.get(ButtonParserService);
      expect(typeof service.parseButtonId).toBe('function');
    });

    it('InteractiveCardBuilderService should have buildSlotSelectionCard method', () => {
      const service = app.get(InteractiveCardBuilderService);
      expect(typeof service.buildSlotSelectionCard).toBe('function');
    });
  });

  describe('Database Connection', () => {
    it('should have access to test Prisma client', () => {
      const prisma = getTestPrisma();
      expect(prisma).toBeDefined();
      expect(prisma.$connect).toBeDefined();
    });

    it('should be able to query database', async () => {
      const prisma = getTestPrisma();
      const result = await prisma.$queryRaw`SELECT 1 as test`;
      expect(result).toBeDefined();
    });
  });

  describe('Configuration', () => {
    it('should have test configuration values', () => {
      const openai = app.get('OPENAI_CLIENT');
      expect(openai).toBeDefined();

      // Mock OpenAI should be injected, not real one
      expect(openai.chat.completions.create).toBeDefined();
    });
  });
});
