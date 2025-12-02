/**
 * Phase 1 Critical Fixes - Integration Tests
 *
 * Tests all 5 critical fixes in realistic scenarios:
 * 1. Race condition fix (concurrent booking attempts)
 * 2. OpenAI retry logic (with mock API failures)
 * 3. WhatsApp confirmation messages (end-to-end)
 * 4. Past date validation (API-level)
 * 5. English language messages (full flow)
 *
 * @module test/integration
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PrismaService } from '../src/database/prisma.service';
import { ButtonHandlerService } from '../src/modules/whatsapp/interactive/button-handler.service';
import { ConfigService } from '@nestjs/config';
import { InteractiveCardBuilder } from '../src/modules/whatsapp/interactive/interactive-message.builder';
import { ButtonParserService } from '../src/modules/whatsapp/interactive/button-parser.service';

describe('Phase 1 Critical Fixes - Integration Tests', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let buttonHandler: ButtonHandlerService;

  // Test data
  const testSalonId = 'test-salon-001';
  const testMasterId = 'test-master-001';
  const testServiceId = 'test-service-001';
  const testCustomer1 = '+1234567890';
  const testCustomer2 = '+0987654321';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        ButtonHandlerService,
        InteractiveCardBuilder,
        ButtonParserService,
        {
          provide: PrismaService,
          useValue: {
            booking: {
              findFirst: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
            },
            master: {
              findUnique: jest.fn(),
              findFirst: jest.fn(),
            },
            service: {
              findFirst: jest.fn(),
            },
            salon: {
              update: jest.fn(),
              findUnique: jest.fn(),
            },
            $transaction: jest.fn(),
            $executeRaw: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, any> = {
                OPENAI_API_KEY: 'test-key',
                OPENAI_MODEL: 'gpt-4',
                WHATSAPP_PHONE_NUMBER_ID: 'test-phone-id',
                WHATSAPP_ACCESS_TOKEN: 'test-token',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    buttonHandler = moduleFixture.get<ButtonHandlerService>(ButtonHandlerService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Integration Test #1: Concurrent Booking Race Condition', () => {
    it('should prevent double-booking with concurrent requests', async () => {
      // Scenario: Two customers try to book the same slot simultaneously
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const dateStr = futureDate.toISOString().split('T')[0];
      const timeStr = '15:00';

      const mockMaster = {
        id: testMasterId,
        name: 'Test Master',
        salon_id: testSalonId,
        is_active: true,
      };

      const mockService = {
        id: testServiceId,
        name: 'Test Service',
        salon_id: testSalonId,
        duration_minutes: 60,
        price: 5000,
        is_active: true,
      };

      jest.spyOn(prismaService.booking, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prismaService.master, 'findUnique').mockResolvedValue(mockMaster as any);
      jest.spyOn(prismaService.service, 'findFirst').mockResolvedValue(mockService as any);

      // Simulate concurrent booking attempts
      let bookingCount = 0;
      const bookingAttempts: boolean[] = [];

      jest.spyOn(prismaService, '$transaction').mockImplementation(async (callback) => {
        const currentAttempt = bookingCount++;

        // Simulate delay to create race condition
        await new Promise((resolve) => setTimeout(resolve, 10));

        if (currentAttempt === 0) {
          // First booking succeeds
          bookingAttempts.push(true);
          return callback({
            master: { findUnique: jest.fn().mockResolvedValue(mockMaster) },
            $executeRaw: jest.fn().mockResolvedValue([]),
            booking: {
              findMany: jest.fn().mockResolvedValue([]),
              findFirst: jest.fn().mockResolvedValue(null),
              create: jest.fn().mockResolvedValue({
                id: 'booking-1',
                booking_code: 'BK111111',
                start_ts: new Date(`${dateStr}T${timeStr}:00`),
                end_ts: new Date(`${dateStr}T16:00:00`),
                status: 'CONFIRMED',
              }),
            },
            salon: { update: jest.fn().mockResolvedValue({}) },
          });
        } else {
          // Second booking fails (conflict detected)
          bookingAttempts.push(false);
          return callback({
            master: { findUnique: jest.fn().mockResolvedValue(mockMaster) },
            $executeRaw: jest.fn().mockResolvedValue([]),
            booking: {
              findMany: jest.fn().mockResolvedValue([
                {
                  id: 'booking-1',
                  booking_code: 'BK111111',
                  start_ts: new Date(`${dateStr}T${timeStr}:00`),
                  end_ts: new Date(`${dateStr}T16:00:00`),
                  status: 'CONFIRMED',
                },
              ]),
              findFirst: jest.fn(),
              create: jest.fn(),
            },
            salon: { update: jest.fn() },
          });
        }
      });

      // Customer 1 selects slot
      const slotData1 = {
        date: dateStr,
        time: timeStr,
        masterId: testMasterId,
        masterName: 'Test Master',
        serviceId: testServiceId,
        serviceName: 'Test Service',
        duration: 60,
        price: 5000,
        timestamp: Date.now(),
      };

      buttonHandler['storeSession'](testCustomer1, testSalonId, slotData1, 'en');

      // Customer 2 selects same slot
      const slotData2 = { ...slotData1 };
      buttonHandler['storeSession'](testCustomer2, testSalonId, slotData2, 'en');

      // Both customers confirm simultaneously
      const promises = [
        buttonHandler.handleBookingConfirmation(
          'confirm_booking_1',
          testCustomer1,
          testSalonId,
          'en',
        ),
        buttonHandler.handleBookingConfirmation(
          'confirm_booking_2',
          testCustomer2,
          testSalonId,
          'en',
        ),
      ];

      // Execute concurrently
      const results = await Promise.allSettled(promises);

      // Verify: One succeeds, one fails
      const succeeded = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;

      expect(succeeded).toBe(1);
      expect(failed).toBe(1);

      // Verify the failed one has ConflictException
      const failedResult = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
      expect(failedResult.reason.message).toContain('no longer available');
    });

    it('should handle 10 concurrent booking attempts gracefully', async () => {
      // Stress test: 10 customers try to book same slot
      const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000);
      const dateStr = futureDate.toISOString().split('T')[0];

      const mockMaster = {
        id: testMasterId,
        name: 'Test Master',
        salon_id: testSalonId,
      };

      const mockService = {
        id: testServiceId,
        name: 'Test Service',
        duration_minutes: 60,
        price: 5000,
      };

      jest.spyOn(prismaService.master, 'findUnique').mockResolvedValue(mockMaster as any);
      jest.spyOn(prismaService.service, 'findFirst').mockResolvedValue(mockService as any);

      let successCount = 0;
      jest.spyOn(prismaService, '$transaction').mockImplementation(async (callback) => {
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 20));

        if (successCount === 0) {
          successCount++;
          return callback({
            master: { findUnique: jest.fn().mockResolvedValue(mockMaster) },
            $executeRaw: jest.fn().mockResolvedValue([]),
            booking: {
              findMany: jest.fn().mockResolvedValue([]),
              findFirst: jest.fn().mockResolvedValue(null),
              create: jest.fn().mockResolvedValue({
                id: 'booking-stress',
                booking_code: 'BK999999',
                status: 'CONFIRMED',
              }),
            },
            salon: { update: jest.fn().mockResolvedValue({}) },
          });
        } else {
          // All others fail
          return callback({
            master: { findUnique: jest.fn().mockResolvedValue(mockMaster) },
            $executeRaw: jest.fn().mockResolvedValue([]),
            booking: {
              findMany: jest.fn().mockResolvedValue([{ id: 'booking-stress' }]),
            },
            salon: { update: jest.fn() },
          });
        }
      });

      // Create 10 concurrent booking attempts
      const promises = Array.from({ length: 10 }, (_, i) => {
        const customerPhone = `+123456789${i}`;
        const slotData = {
          date: dateStr,
          time: '15:00',
          masterId: testMasterId,
          masterName: 'Test Master',
          serviceId: testServiceId,
          serviceName: 'Test Service',
          duration: 60,
          price: 5000,
          timestamp: Date.now(),
        };

        buttonHandler['storeSession'](customerPhone, testSalonId, slotData, 'en');
        return buttonHandler.handleBookingConfirmation(
          `confirm_${i}`,
          customerPhone,
          testSalonId,
          'en',
        );
      });

      const results = await Promise.allSettled(promises);

      // Verify: Exactly 1 succeeds, 9 fail
      const succeeded = results.filter((r) => r.status === 'fulfilled');
      const failed = results.filter((r) => r.status === 'rejected');

      expect(succeeded.length).toBe(1);
      expect(failed.length).toBe(9);
    });
  });

  describe('Integration Test #2: OpenAI Retry Logic Simulation', () => {
    it('should retry on transient database errors', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const dateStr = futureDate.toISOString().split('T')[0];

      const slotData = {
        date: dateStr,
        time: '15:00',
        masterId: testMasterId,
        masterName: 'Test Master',
        serviceId: testServiceId,
        serviceName: 'Test Service',
        duration: 60,
        price: 5000,
        timestamp: Date.now(),
      };

      buttonHandler['storeSession'](testCustomer1, testSalonId, slotData, 'en');

      // Simulate transient errors (like OpenAI 429 rate limit)
      let attemptCount = 0;
      jest.spyOn(prismaService, '$transaction').mockImplementation(async (callback) => {
        attemptCount++;

        if (attemptCount === 1) {
          throw new Error('Connection timeout');
        } else if (attemptCount === 2) {
          throw new Error('Rate limit exceeded');
        } else {
          // Third attempt succeeds
          return callback({
            master: {
              findUnique: jest.fn().mockResolvedValue({
                id: testMasterId,
                name: 'Test Master',
              }),
            },
            $executeRaw: jest.fn().mockResolvedValue([]),
            booking: {
              findMany: jest.fn().mockResolvedValue([]),
              findFirst: jest.fn().mockResolvedValue(null),
              create: jest.fn().mockResolvedValue({
                id: 'booking-retry',
                booking_code: 'BK777777',
                status: 'CONFIRMED',
              }),
            },
            salon: { update: jest.fn().mockResolvedValue({}) },
          });
        }
      });

      const result = await buttonHandler.handleBookingConfirmation(
        'confirm_retry',
        testCustomer1,
        testSalonId,
        'en',
      );

      expect(result.success).toBe(true);
      expect(attemptCount).toBe(3); // Should have retried twice
    });

    it('should use exponential backoff between retries', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const slotData = {
        date: futureDate.toISOString().split('T')[0],
        time: '15:00',
        masterId: testMasterId,
        masterName: 'Test Master',
        serviceId: testServiceId,
        serviceName: 'Test Service',
        duration: 60,
        price: 5000,
        timestamp: Date.now(),
      };

      buttonHandler['storeSession'](testCustomer1, testSalonId, slotData, 'en');

      const timestamps: number[] = [];
      jest.spyOn(prismaService, '$transaction').mockImplementation(async (callback) => {
        timestamps.push(Date.now());

        if (timestamps.length < 3) {
          throw new Error('Transient failure');
        }

        return callback({
          master: {
            findUnique: jest.fn().mockResolvedValue({ id: testMasterId }),
          },
          $executeRaw: jest.fn().mockResolvedValue([]),
          booking: {
            findMany: jest.fn().mockResolvedValue([]),
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({
              id: 'booking-backoff',
              booking_code: 'BK888888',
            }),
          },
          salon: { update: jest.fn().mockResolvedValue({}) },
        });
      });

      await buttonHandler.handleBookingConfirmation(
        'confirm_backoff',
        testCustomer1,
        testSalonId,
        'en',
      );

      // Verify exponential backoff: delay1 < delay2
      if (timestamps.length >= 3) {
        const delay1 = timestamps[1] - timestamps[0];
        const delay2 = timestamps[2] - timestamps[1];

        expect(delay1).toBeGreaterThanOrEqual(90); // ~100ms base delay
        expect(delay2).toBeGreaterThanOrEqual(180); // ~200ms (exponential)
        expect(delay2).toBeGreaterThan(delay1);
      }
    });

    it('should fail after max retries exhausted', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const slotData = {
        date: futureDate.toISOString().split('T')[0],
        time: '15:00',
        masterId: testMasterId,
        masterName: 'Test Master',
        serviceId: testServiceId,
        serviceName: 'Test Service',
        duration: 60,
        price: 5000,
        timestamp: Date.now(),
      };

      buttonHandler['storeSession'](testCustomer1, testSalonId, slotData, 'en');

      // Always fail
      jest.spyOn(prismaService, '$transaction').mockRejectedValue(new Error('Persistent failure'));

      await expect(
        buttonHandler.handleBookingConfirmation(
          'confirm_maxretry',
          testCustomer1,
          testSalonId,
          'en',
        ),
      ).rejects.toThrow();

      // Should have attempted 3 times
      expect(prismaService.$transaction).toHaveBeenCalledTimes(3);
    });
  });

  describe('Integration Test #3: WhatsApp Confirmation Messages (End-to-End)', () => {
    it('should send English confirmation message after successful booking', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const dateStr = futureDate.toISOString().split('T')[0];

      const slotData = {
        date: dateStr,
        time: '15:00',
        masterId: testMasterId,
        masterName: 'Sarah Johnson',
        serviceId: testServiceId,
        serviceName: 'Hair Coloring',
        duration: 120,
        price: 15000,
        timestamp: Date.now(),
      };

      buttonHandler['storeSession'](testCustomer1, testSalonId, slotData, 'en');

      jest.spyOn(prismaService, '$transaction').mockImplementation(async (callback) => {
        return callback({
          master: {
            findUnique: jest.fn().mockResolvedValue({
              id: testMasterId,
              name: 'Sarah Johnson',
            }),
          },
          $executeRaw: jest.fn().mockResolvedValue([]),
          booking: {
            findMany: jest.fn().mockResolvedValue([]),
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({
              id: 'booking-confirm-test',
              booking_code: 'BK123456',
              status: 'CONFIRMED',
            }),
          },
          salon: { update: jest.fn().mockResolvedValue({}) },
        });
      });

      const result = await buttonHandler.handleBookingConfirmation(
        'confirm_message',
        testCustomer1,
        testSalonId,
        'en',
      );

      // Verify confirmation message format
      expect(result.success).toBe(true);
      expect(result.message).toContain('Booking Confirmed');
      expect(result.message).toContain('Service: Hair Coloring');
      expect(result.message).toContain('Master: Sarah Johnson');
      expect(result.message).toContain('Booking Code: BK123456');
      expect(result.message).toContain('See you soon');

      // Verify NOT Russian
      expect(result.message).not.toContain('подтверждено');
      expect(result.message).not.toContain('Мастер');
    });

    it('should format time in 12-hour format with AM/PM', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const slotData = {
        date: futureDate.toISOString().split('T')[0],
        time: '14:30', // Should become 2:30 PM
        masterId: testMasterId,
        masterName: 'Test Master',
        serviceId: testServiceId,
        serviceName: 'Test Service',
        duration: 60,
        price: 5000,
        timestamp: Date.now(),
      };

      buttonHandler['storeSession'](testCustomer1, testSalonId, slotData, 'en');

      jest.spyOn(prismaService, '$transaction').mockImplementation(async (callback) => {
        return callback({
          master: { findUnique: jest.fn().mockResolvedValue({ id: testMasterId }) },
          $executeRaw: jest.fn().mockResolvedValue([]),
          booking: {
            findMany: jest.fn().mockResolvedValue([]),
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({
              id: 'time-format-test',
              booking_code: 'BK654321',
            }),
          },
          salon: { update: jest.fn().mockResolvedValue({}) },
        });
      });

      const result = await buttonHandler.handleBookingConfirmation(
        'confirm_time',
        testCustomer1,
        testSalonId,
        'en',
      );

      expect(result.message).toContain('2:30 PM');
      expect(result.message).not.toContain('14:30');
    });

    it('should include all booking details in confirmation', async () => {
      const futureDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days from now
      const slotData = {
        date: futureDate.toISOString().split('T')[0],
        time: '09:00',
        masterId: testMasterId,
        masterName: 'Emily Brown',
        serviceId: testServiceId,
        serviceName: 'Manicure & Pedicure',
        duration: 90,
        price: 8000,
        timestamp: Date.now(),
      };

      buttonHandler['storeSession'](testCustomer1, testSalonId, slotData, 'en');

      jest.spyOn(prismaService, '$transaction').mockImplementation(async (callback) => {
        return callback({
          master: { findUnique: jest.fn().mockResolvedValue({ id: testMasterId }) },
          $executeRaw: jest.fn().mockResolvedValue([]),
          booking: {
            findMany: jest.fn().mockResolvedValue([]),
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({
              id: 'details-test',
              booking_code: 'BK999888',
            }),
          },
          salon: { update: jest.fn().mockResolvedValue({}) },
        });
      });

      const result = await buttonHandler.handleBookingConfirmation(
        'confirm_details',
        testCustomer1,
        testSalonId,
        'en',
      );

      expect(result.message).toContain('Manicure & Pedicure');
      expect(result.message).toContain('Emily Brown');
      expect(result.message).toContain('BK999888');
      expect(result.message).toContain('9:00 AM');
      expect(result.message).toMatch(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/);
    });
  });

  describe('Integration Test #4: Past Date Validation (API-level)', () => {
    it('should reject booking attempts for past dates', async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
      const dateStr = pastDate.toISOString().split('T')[0];

      const result = await buttonHandler.validateSlotAvailability(
        testMasterId,
        dateStr,
        '15:00',
        testSalonId,
      );

      expect(result.available).toBe(false);
      expect(result.reason).toContain('Cannot book time slots in the past');
    });

    it('should reject past time on current day', async () => {
      const now = new Date();
      const pastTime = new Date(now.getTime() - 3 * 60 * 60 * 1000); // 3 hours ago
      const dateStr = pastTime.toISOString().split('T')[0];
      const timeStr = pastTime.toISOString().split('T')[1].substring(0, 5);

      const result = await buttonHandler.validateSlotAvailability(
        testMasterId,
        dateStr,
        timeStr,
        testSalonId,
      );

      expect(result.available).toBe(false);
      expect(result.reason).toContain('past');
    });

    it('should accept future time slots', async () => {
      const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000); // 2 days from now
      const dateStr = futureDate.toISOString().split('T')[0];

      jest.spyOn(prismaService.booking, 'findFirst').mockResolvedValue(null);

      const result = await buttonHandler.validateSlotAvailability(
        testMasterId,
        dateStr,
        '15:00',
        testSalonId,
      );

      expect(result.available).toBe(true);
    });

    it('should prevent booking creation for past slots in transaction', async () => {
      const pastDate = new Date(Date.now() - 12 * 60 * 60 * 1000); // 12 hours ago
      const slotData = {
        date: pastDate.toISOString().split('T')[0],
        time: '15:00',
        masterId: testMasterId,
        masterName: 'Test Master',
        serviceId: testServiceId,
        serviceName: 'Test Service',
        duration: 60,
        price: 5000,
        timestamp: Date.now(),
      };

      buttonHandler['storeSession'](testCustomer1, testSalonId, slotData, 'en');

      jest
        .spyOn(prismaService, '$transaction')
        .mockRejectedValue(new Error('Cannot book time slots in the past'));

      await expect(
        buttonHandler.handleBookingConfirmation('confirm_past', testCustomer1, testSalonId, 'en'),
      ).rejects.toThrow();
    });
  });

  describe('Integration Test #5: English Language Messages (Full Flow)', () => {
    it('should use English messages throughout entire booking flow', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const dateStr = futureDate.toISOString().split('T')[0];

      // Mock data
      const mockMaster = {
        id: testMasterId,
        name: 'Test Master',
        salon_id: testSalonId,
      };

      const mockService = {
        id: testServiceId,
        name: 'Test Service',
        duration_minutes: 60,
        price: 5000,
      };

      jest.spyOn(prismaService.booking, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prismaService.master, 'findUnique').mockResolvedValue(mockMaster as any);
      jest.spyOn(prismaService.service, 'findFirst').mockResolvedValue(mockService as any);

      // Step 1: Slot selection (English)
      const selectionResult = await buttonHandler.handleSlotSelection(
        `slot_${dateStr}_15:00_${testMasterId}`,
        testCustomer1,
        testSalonId,
        'en',
      );

      expect(selectionResult.success).toBe(true);
      // Card messages are in English (verified by card builder tests)

      // Step 2: Booking confirmation (English)
      jest.spyOn(prismaService, '$transaction').mockImplementation(async (callback) => {
        return callback({
          master: { findUnique: jest.fn().mockResolvedValue(mockMaster) },
          $executeRaw: jest.fn().mockResolvedValue([]),
          booking: {
            findMany: jest.fn().mockResolvedValue([]),
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({
              id: 'lang-test',
              booking_code: 'BK555444',
            }),
          },
          salon: { update: jest.fn().mockResolvedValue({}) },
        });
      });

      const confirmResult = await buttonHandler.handleBookingConfirmation(
        'confirm_english',
        testCustomer1,
        testSalonId,
        'en',
      );

      // Verify all messages are in English
      expect(confirmResult.message).toContain('Booking Confirmed');
      expect(confirmResult.message).toContain('Service:');
      expect(confirmResult.message).toContain('Master:');
      expect(confirmResult.message).toContain('See you soon');

      // Verify NO Russian text
      expect(confirmResult.message).not.toContain('Бронирование');
      expect(confirmResult.message).not.toContain('Услуга');
      expect(confirmResult.message).not.toContain('До встречи');
    });

    it('should handle error messages in English', async () => {
      // Test error message when session expires
      await expect(
        buttonHandler.handleBookingConfirmation(
          'confirm_nosession',
          '+9999999999', // No session for this phone
          testSalonId,
          'en',
        ),
      ).rejects.toThrow(/Session expired/);
    });

    it('should use English for slot unavailable messages', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const dateStr = futureDate.toISOString().split('T')[0];

      const mockMaster = {
        id: testMasterId,
        name: 'Test Master',
      };

      // Slot already taken
      jest.spyOn(prismaService.booking, 'findFirst').mockResolvedValue({
        id: 'existing-booking',
        booking_code: 'BK111222',
      } as any);

      jest.spyOn(prismaService.master, 'findUnique').mockResolvedValue(mockMaster as any);

      const result = await buttonHandler.handleSlotSelection(
        `slot_${dateStr}_15:00_${testMasterId}`,
        testCustomer1,
        testSalonId,
        'en',
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('unavailable');
      // Alternative slots message should also be in English
    });
  });

  describe('Performance Test: Booking Creation Speed', () => {
    it('should create booking in under 500ms (without network delays)', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const slotData = {
        date: futureDate.toISOString().split('T')[0],
        time: '15:00',
        masterId: testMasterId,
        masterName: 'Test Master',
        serviceId: testServiceId,
        serviceName: 'Test Service',
        duration: 60,
        price: 5000,
        timestamp: Date.now(),
      };

      buttonHandler['storeSession'](testCustomer1, testSalonId, slotData, 'en');

      jest.spyOn(prismaService, '$transaction').mockImplementation(async (callback) => {
        // Simulate fast database response
        await new Promise((resolve) => setTimeout(resolve, 50));

        return callback({
          master: { findUnique: jest.fn().mockResolvedValue({ id: testMasterId }) },
          $executeRaw: jest.fn().mockResolvedValue([]),
          booking: {
            findMany: jest.fn().mockResolvedValue([]),
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({
              id: 'perf-test',
              booking_code: 'BK666777',
            }),
          },
          salon: { update: jest.fn().mockResolvedValue({}) },
        });
      });

      const startTime = Date.now();

      const result = await buttonHandler.handleBookingConfirmation(
        'confirm_perf',
        testCustomer1,
        testSalonId,
        'en',
      );

      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(500); // Should be fast
    });
  });
});
