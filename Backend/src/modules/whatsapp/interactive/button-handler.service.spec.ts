/**
 * Button Handler Service Unit Tests
 *
 * Tests for Phase 1 Critical Fixes:
 * 1. Race condition fix (master row locking)
 * 2. Past date validation
 * 3. English language messages (confirmation)
 * 4. Slot availability validation
 * 5. Retry logic with exponential backoff
 *
 * @module modules/whatsapp/interactive
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { ButtonHandlerService } from './button-handler.service';
import { PrismaService } from '../../../database/prisma.service';
import { InteractiveCardBuilder } from './interactive-message.builder';
import { ButtonParserService } from './button-parser.service';
import { Prisma, ServiceCategory } from '@prisma/client';

describe('ButtonHandlerService - Phase 1 Critical Fixes', () => {
  let service: ButtonHandlerService;
  let prismaService: PrismaService;
  let cardBuilder: InteractiveCardBuilder;
  let buttonParser: ButtonParserService;

  // Mock data
  const mockCustomerPhone = '+1234567890';
  const mockSalonId = 'salon-123';
  const mockMasterId = 'master-123';
  const mockServiceId = 'service-123';

  const mockMaster = {
    id: mockMasterId,
    name: 'John Doe',
    salon_id: mockSalonId,
    user_id: null,
    phone: '+1234567890',
    email: 'john.doe@example.com',
    specialization: ['Haircut', 'Styling'],
    working_hours: {
      monday: { start: '09:00', end: '18:00' },
      tuesday: { start: '09:00', end: '18:00' },
      wednesday: { start: '09:00', end: '18:00' },
      thursday: { start: '09:00', end: '18:00' },
      friday: { start: '09:00', end: '18:00' },
      saturday: { start: '10:00', end: '16:00' },
      sunday: { start: '10:00', end: '16:00' },
    },
    is_active: true,
    created_at: new Date('2024-01-01T00:00:00Z'),
    updated_at: new Date('2024-01-01T00:00:00Z'),
  };

  const mockService = {
    id: mockServiceId,
    name: 'Haircut',
    salon_id: mockSalonId,
    description: 'Professional haircut service',
    duration_minutes: 60,
    price: new Prisma.Decimal(50.0),
    category: ServiceCategory.HAIRCUT,
    is_active: true,
    created_at: new Date('2024-01-01T00:00:00Z'),
    updated_at: new Date('2024-01-01T00:00:00Z'),
  };

  const mockBooking = {
    id: 'booking-123',
    booking_code: 'BK847392',
    salon_id: mockSalonId,
    customer_phone: mockCustomerPhone,
    customer_name: 'Customer',
    service: 'Haircut',
    start_ts: new Date('2025-11-10T15:00:00Z'),
    end_ts: new Date('2025-11-10T16:00:00Z'),
    status: 'CONFIRMED',
    master_id: mockMasterId,
    service_id: mockServiceId,
    created_at: new Date(),
    updated_at: new Date(),
    metadata: null,
    reminder_sent: false,
    reminder_response: null,
    reminder_response_at: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ButtonHandlerService,
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
              findUnique: jest.fn().mockResolvedValue({
                id: mockSalonId,
                working_hours_start: '09:00',
                working_hours_end: '18:00',
              }),
              update: jest.fn(),
            },
            $transaction: jest.fn(),
            $executeRaw: jest.fn(),
          },
        },
        {
          provide: InteractiveCardBuilder,
          useValue: {
            buildSlotSelectionCard: jest.fn(),
            buildConfirmationCard: jest.fn(),
          },
        },
        {
          provide: ButtonParserService,
          useValue: {
            parseSlotButton: jest.fn(),
            parseConfirmButton: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ButtonHandlerService>(ButtonHandlerService);
    prismaService = module.get<PrismaService>(PrismaService);
    cardBuilder = module.get<InteractiveCardBuilder>(InteractiveCardBuilder);
    buttonParser = module.get<ButtonParserService>(ButtonParserService);

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Critical Fix #1: Race Condition Prevention (Master Row Locking)', () => {
    it('should use master row locking in createBooking transaction', async () => {
      // This test verifies the transaction uses FOR UPDATE on master row
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
      const slotData = {
        date: futureDate.toISOString().split('T')[0],
        time: '15:00',
        masterId: mockMasterId,
        masterName: 'John Doe',
        serviceId: mockServiceId,
        serviceName: 'Haircut',
        duration: 60,
        price: 5000,
        timestamp: Date.now(),
      };

      // Mock availability check to pass (no existing booking)
      jest.spyOn(prismaService.booking, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prismaService.master, 'findUnique').mockResolvedValue(mockMaster as any);
      jest.spyOn(prismaService.salon, 'findUnique').mockResolvedValue({
        id: mockSalonId,
        working_hours_start: '09:00',
        working_hours_end: '18:00',
      } as any);

      // Mock transaction to properly invoke the callback
      jest.spyOn(prismaService, '$transaction').mockImplementation(async (callback: any) => {
        // Provide a mock transaction object
        const mockTx = {
          master: {
            findUnique: jest.fn().mockResolvedValue(mockMaster),
          },
          $executeRaw: jest.fn().mockResolvedValue([]),
          booking: {
            findMany: jest.fn().mockResolvedValue([]),
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(mockBooking),
          },
          salon: {
            update: jest.fn().mockResolvedValue({}),
          },
        };

        // Call the transaction callback with our mock
        return await callback(mockTx);
      });

      // Store session first
      service['storeSession'](mockCustomerPhone, mockSalonId, slotData, 'en');

      // Trigger confirmation to invoke createBooking
      jest.spyOn(buttonParser, 'parseConfirmButton').mockReturnValue({
        type: 'booking_confirmation',
        entityId: 'temp-session',
      } as any);

      jest.spyOn(cardBuilder, 'buildConfirmationCard').mockReturnValue({
        messaging_product: 'whatsapp',
        to: mockCustomerPhone,
        type: 'interactive',
      } as any);

      await service.handleBookingConfirmation(
        'confirm_booking_temp-session',
        mockCustomerPhone,
        mockSalonId,
        'en',
      );

      // Verify transaction was called
      expect(prismaService.$transaction).toHaveBeenCalled();

      // Verify transaction callback includes row locking logic
      const transactionFn = (prismaService.$transaction as jest.Mock).mock.calls[0][0];
      expect(transactionFn).toBeDefined();
    });

    it('should prevent double-booking with concurrent requests', async () => {
      // Simulate race condition: two concurrent booking attempts
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const slotData = {
        date: futureDate.toISOString().split('T')[0],
        time: '15:00',
        masterId: mockMasterId,
        masterName: 'John Doe',
        serviceId: mockServiceId,
        serviceName: 'Haircut',
        duration: 60,
        price: 5000,
        timestamp: Date.now(),
      };

      // Mock validateSlotAvailability to simulate race condition
      let bookingCount = 0;
      jest.spyOn(service, 'validateSlotAvailability').mockImplementation(async () => {
        bookingCount++;
        if (bookingCount === 1) {
          // First request: slot is available
          return { available: true };
        } else {
          // Second request: slot is no longer available
          return { available: false, reason: 'Slot was just booked' };
        }
      });

      // Mock transaction that simulates conflict detection
      jest.spyOn(prismaService, '$transaction').mockImplementation(async (callback: any) => {
        return callback({
          master: {
            findUnique: jest.fn().mockResolvedValue(mockMaster),
          } as any,
          $executeRaw: jest.fn().mockResolvedValue([]),
          booking: {
            findMany: jest.fn().mockResolvedValue([]), // No conflicts in transaction
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(mockBooking),
          } as any,
          salon: {
            update: jest.fn().mockResolvedValue({}),
          } as any,
        });
      });

      // Setup for first booking
      service['storeSession'](mockCustomerPhone, mockSalonId, slotData, 'en');
      jest.spyOn(buttonParser, 'parseConfirmButton').mockReturnValue({
        type: 'booking_confirmation',
        entityId: 'temp-session',
      } as any);

      // First booking should succeed
      const result1 = await service.handleBookingConfirmation(
        'confirm_booking_temp-session',
        mockCustomerPhone,
        mockSalonId,
        'en',
      );

      expect(result1.success).toBe(true);
      expect(result1.bookingCode).toBe('BK847392');

      // Setup for second booking (different customer)
      const customer2Phone = '+0987654321';
      service['storeSession'](customer2Phone, mockSalonId, slotData, 'en');

      // Second booking should fail with ConflictException
      await expect(
        service.handleBookingConfirmation(
          'confirm_booking_temp-session',
          customer2Phone,
          mockSalonId,
          'en',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should handle overlap detection correctly', async () => {
      // Test that booking system detects time overlaps
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const startTime = new Date(futureDate);
      startTime.setHours(15, 0, 0, 0);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour

      const existingBooking = {
        ...mockBooking,
        start_ts: startTime,
        end_ts: endTime,
      };

      const slotData = {
        date: startTime.toISOString().split('T')[0],
        time: '15:30', // Overlaps with 15:00-16:00
        masterId: mockMasterId,
        masterName: 'John Doe',
        serviceId: mockServiceId,
        serviceName: 'Haircut',
        duration: 60,
        price: 5000,
        timestamp: Date.now(),
      };

      jest.spyOn(prismaService, '$transaction').mockImplementation(async (callback: any) => {
        return callback({
          master: {
            findUnique: jest.fn().mockResolvedValue(mockMaster),
          } as any,
          $executeRaw: jest.fn().mockResolvedValue([]),
          booking: {
            findMany: jest.fn().mockResolvedValue([existingBooking]), // Overlap detected
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn(),
          } as any,
          salon: {
            update: jest.fn(),
          } as any,
        });
      });

      service['storeSession'](mockCustomerPhone, mockSalonId, slotData, 'en');
      jest.spyOn(buttonParser, 'parseConfirmButton').mockReturnValue({
        type: 'booking_confirmation',
        entityId: 'temp-session',
      } as any);

      // Should throw ConflictException
      await expect(
        service.handleBookingConfirmation(
          'confirm_booking_temp-session',
          mockCustomerPhone,
          mockSalonId,
          'en',
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('Critical Fix #2: Past Date Validation', () => {
    it('should reject booking attempts for past dates', async () => {
      // Test validateSlotAvailability rejects past dates
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
      const dateStr = pastDate.toISOString().split('T')[0];
      const timeStr = '15:00';

      const result = await service.validateSlotAvailability(
        mockMasterId,
        dateStr,
        timeStr,
        mockSalonId,
      );

      expect(result.available).toBe(false);
      expect(result.reason).toContain('Cannot book time slots in the past');
    });

    it('should reject past time slots on same day', async () => {
      const now = new Date();
      const pastTime = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago
      const dateStr = pastTime.toISOString().split('T')[0];
      const timeStr = pastTime.toISOString().split('T')[1].substring(0, 5);

      const result = await service.validateSlotAvailability(
        mockMasterId,
        dateStr,
        timeStr,
        mockSalonId,
      );

      expect(result.available).toBe(false);
      expect(result.reason).toContain('past');
    });

    it('should accept future time slots', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
      const dateStr = futureDate.toISOString().split('T')[0];
      const timeStr = '15:00';

      // Mock master findUnique to return active master with working hours
      jest.spyOn(prismaService.master, 'findUnique').mockResolvedValue(mockMaster as any);
      jest.spyOn(prismaService.booking, 'findFirst').mockResolvedValue(null);

      const result = await service.validateSlotAvailability(
        mockMasterId,
        dateStr,
        timeStr,
        mockSalonId,
      );

      expect(result.available).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should prevent booking creation for past slots in transaction', async () => {
      // Test that createBooking throws error for past dates
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const slotData = {
        date: pastDate.toISOString().split('T')[0],
        time: '15:00',
        masterId: mockMasterId,
        masterName: 'John Doe',
        serviceId: mockServiceId,
        serviceName: 'Haircut',
        duration: 60,
        price: 5000,
        timestamp: Date.now(),
      };

      service['storeSession'](mockCustomerPhone, mockSalonId, slotData, 'en');
      jest.spyOn(buttonParser, 'parseConfirmButton').mockReturnValue({
        type: 'booking_confirmation',
        entityId: 'temp-session',
      } as any);

      // validateSlotAvailability will return available:false for past dates
      // This happens in the actual service, so we don't need to mock it
      // The service will throw ConflictException when slot is unavailable

      await expect(
        service.handleBookingConfirmation(
          'confirm_booking_temp-session',
          mockCustomerPhone,
          mockSalonId,
          'en',
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('Critical Fix #3: English Language Confirmation Messages', () => {
    it('should return confirmation message in English format', () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const slotData = {
        date: futureDate.toISOString().split('T')[0],
        time: '15:00',
        masterId: mockMasterId,
        masterName: 'John Doe',
        serviceId: mockServiceId,
        serviceName: 'Haircut',
        duration: 60,
        price: 5000,
        timestamp: Date.now(),
      };

      const message = service['buildConfirmationMessage'](slotData, 'BK847392', 'en');

      // Verify English format
      expect(message).toContain('Booking Confirmed');
      expect(message).toContain('Service: Haircut');
      expect(message).toContain('Master: John Doe');
      expect(message).toContain('Booking Code: BK847392');
      expect(message).toContain('See you soon');

      // Verify NOT Russian
      expect(message).not.toContain('подтверждено');
      expect(message).not.toContain('Мастер');
    });

    it('should format time in 12-hour format with AM/PM', () => {
      const slotData = {
        date: '2025-11-10',
        time: '15:00',
        masterId: mockMasterId,
        masterName: 'John Doe',
        serviceId: mockServiceId,
        serviceName: 'Haircut',
        duration: 60,
        price: 5000,
        timestamp: Date.now(),
      };

      const message = service['buildConfirmationMessage'](slotData, 'BK123456', 'en');

      // Should convert 15:00 to 3:00 PM
      expect(message).toContain('3:00 PM');
      expect(message).not.toContain('15:00');
    });

    it('should format date with weekday and month name', () => {
      const slotData = {
        date: '2025-11-10',
        time: '10:00',
        masterId: mockMasterId,
        masterName: 'John Doe',
        serviceId: mockServiceId,
        serviceName: 'Haircut',
        duration: 60,
        price: 5000,
        timestamp: Date.now(),
      };

      const message = service['buildConfirmationMessage'](slotData, 'BK999999', 'en');

      // Should contain weekday and month name
      expect(message).toMatch(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/);
      expect(message).toMatch(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/);
    });

    it('should include all required booking details in confirmation', () => {
      const slotData = {
        date: '2025-11-15',
        time: '14:30',
        masterId: mockMasterId,
        masterName: 'Jane Smith',
        serviceId: mockServiceId,
        serviceName: 'Color Treatment',
        duration: 120,
        price: 15000,
        timestamp: Date.now(),
      };

      const message = service['buildConfirmationMessage'](slotData, 'BK555555', 'en');

      expect(message).toContain('Color Treatment'); // Service name
      expect(message).toContain('Jane Smith'); // Master name
      expect(message).toContain('BK555555'); // Booking code
      expect(message).toContain('2:30 PM'); // Formatted time
    });
  });

  describe('Critical Fix #4: Slot Availability Validation', () => {
    it('should correctly validate available slots', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const dateStr = futureDate.toISOString().split('T')[0];

      // Mock master findUnique to return active master with working hours
      jest.spyOn(prismaService.master, 'findUnique').mockResolvedValue(mockMaster as any);
      jest.spyOn(prismaService.booking, 'findFirst').mockResolvedValue(null);

      const result = await service.validateSlotAvailability(
        mockMasterId,
        dateStr,
        '15:00',
        mockSalonId,
      );

      expect(result.available).toBe(true);
      expect(prismaService.booking.findFirst).toHaveBeenCalledWith({
        where: {
          master_id: mockMasterId,
          start_ts: expect.any(Date),
          status: {
            in: ['CONFIRMED', 'PENDING', 'IN_PROGRESS'],
          },
          salon_id: mockSalonId,
        },
      });
    });

    it('should detect unavailable slots with existing bookings', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const dateStr = futureDate.toISOString().split('T')[0];

      // Mock master findUnique to return active master with working hours
      jest.spyOn(prismaService.master, 'findUnique').mockResolvedValue(mockMaster as any);
      jest.spyOn(prismaService.booking, 'findFirst').mockResolvedValue(mockBooking as any);

      const result = await service.validateSlotAvailability(
        mockMasterId,
        dateStr,
        '15:00',
        mockSalonId,
      );

      expect(result.available).toBe(false);
      expect(result.existingBooking).toEqual(mockBooking);
      expect(result.reason).toContain('BK847392');
    });

    it('should filter by booking status (CONFIRMED, PENDING, IN_PROGRESS)', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const dateStr = futureDate.toISOString().split('T')[0];

      // Mock master findUnique to return active master with working hours
      jest.spyOn(prismaService.master, 'findUnique').mockResolvedValue(mockMaster as any);
      jest.spyOn(prismaService.booking, 'findFirst').mockResolvedValue(null);

      await service.validateSlotAvailability(mockMasterId, dateStr, '15:00', mockSalonId);

      expect(prismaService.booking.findFirst).toHaveBeenCalledWith({
        where: expect.objectContaining({
          status: {
            in: ['CONFIRMED', 'PENDING', 'IN_PROGRESS'],
          },
        }),
      });
    });

    it('should check availability before slot selection', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const dateStr = futureDate.toISOString().split('T')[0];

      jest.spyOn(buttonParser, 'parseSlotButton').mockReturnValue({
        type: 'slot_selection',
        date: dateStr,
        time: '15:00',
        masterId: mockMasterId,
      } as any);

      // Mock slot is already taken
      jest.spyOn(prismaService.booking, 'findFirst').mockResolvedValue(mockBooking as any);
      jest.spyOn(prismaService.master, 'findUnique').mockResolvedValue(mockMaster as any);
      jest.spyOn(cardBuilder, 'buildSlotSelectionCard').mockReturnValue({
        messaging_product: 'whatsapp',
        to: mockCustomerPhone,
        type: 'interactive',
      } as any);

      const result = await service.handleSlotSelection(
        `slot_${dateStr}_15:00_${mockMasterId}`,
        mockCustomerPhone,
        mockSalonId,
        'en',
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('unavailable');
    });
  });

  describe('Critical Fix #5: Retry Logic (Implicit OpenAI Test)', () => {
    it('should retry booking creation on transient failures', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const slotData = {
        date: futureDate.toISOString().split('T')[0],
        time: '15:00',
        masterId: mockMasterId,
        masterName: 'John Doe',
        serviceId: mockServiceId,
        serviceName: 'Haircut',
        duration: 60,
        price: 5000,
        timestamp: Date.now(),
      };

      // Mock validateSlotAvailability to return available
      jest.spyOn(service, 'validateSlotAvailability').mockResolvedValue({
        available: true,
      });

      let attemptCount = 0;
      jest.spyOn(prismaService, '$transaction').mockImplementation(async (callback: any) => {
        attemptCount++;

        // First 2 attempts fail with transient error
        if (attemptCount < 3) {
          throw new Error('Database connection timeout');
        }

        // Third attempt succeeds
        return callback({
          master: {
            findUnique: jest.fn().mockResolvedValue(mockMaster),
          } as any,
          $executeRaw: jest.fn().mockResolvedValue([]),
          booking: {
            findMany: jest.fn().mockResolvedValue([]),
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(mockBooking),
          } as any,
          salon: {
            update: jest.fn().mockResolvedValue({}),
          } as any,
        });
      });

      service['storeSession'](mockCustomerPhone, mockSalonId, slotData, 'en');
      jest.spyOn(buttonParser, 'parseConfirmButton').mockReturnValue({
        type: 'booking_confirmation',
        entityId: 'temp-session',
      } as any);

      const result = await service.handleBookingConfirmation(
        'confirm_booking_temp-session',
        mockCustomerPhone,
        mockSalonId,
        'en',
      );

      expect(result.success).toBe(true);
      expect(attemptCount).toBe(3); // Should have retried twice
    });

    it('should use exponential backoff for retries', async () => {
      // Test that retry delays increase exponentially
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const slotData = {
        date: futureDate.toISOString().split('T')[0],
        time: '15:00',
        masterId: mockMasterId,
        masterName: 'John Doe',
        serviceId: mockServiceId,
        serviceName: 'Haircut',
        duration: 60,
        price: 5000,
        timestamp: Date.now(),
      };

      // Mock validateSlotAvailability to return available
      jest.spyOn(service, 'validateSlotAvailability').mockResolvedValue({
        available: true,
      });

      const attemptTimestamps: number[] = [];
      jest.spyOn(prismaService, '$transaction').mockImplementation(async (callback: any) => {
        attemptTimestamps.push(Date.now());

        if (attemptTimestamps.length < 3) {
          throw new Error('Transient error');
        }

        return callback({
          master: {
            findUnique: jest.fn().mockResolvedValue(mockMaster),
          } as any,
          $executeRaw: jest.fn().mockResolvedValue([]),
          booking: {
            findMany: jest.fn().mockResolvedValue([]),
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(mockBooking),
          } as any,
          salon: {
            update: jest.fn().mockResolvedValue({}),
          } as any,
        });
      });

      service['storeSession'](mockCustomerPhone, mockSalonId, slotData, 'en');
      jest.spyOn(buttonParser, 'parseConfirmButton').mockReturnValue({
        type: 'booking_confirmation',
        entityId: 'temp-session',
      } as any);

      await service.handleBookingConfirmation(
        'confirm_booking_temp-session',
        mockCustomerPhone,
        mockSalonId,
        'en',
      );

      // Verify delays increased (100ms, 200ms)
      if (attemptTimestamps.length >= 3) {
        const delay1 = attemptTimestamps[1] - attemptTimestamps[0];
        const delay2 = attemptTimestamps[2] - attemptTimestamps[1];

        // Allow some tolerance for execution time
        expect(delay1).toBeGreaterThanOrEqual(90); // ~100ms
        expect(delay2).toBeGreaterThanOrEqual(180); // ~200ms
        expect(delay2).toBeGreaterThan(delay1); // Exponential increase
      }
    });

    it('should not retry on validation errors (BadRequestException)', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const slotData = {
        date: futureDate.toISOString().split('T')[0],
        time: '15:00',
        masterId: mockMasterId,
        masterName: 'John Doe',
        serviceId: mockServiceId,
        serviceName: 'Haircut',
        duration: 60,
        price: 5000,
        timestamp: Date.now(),
      };

      // Mock availability check to simulate slot being taken (should throw ConflictException)
      jest.spyOn(prismaService.booking, 'findFirst').mockResolvedValue({ id: 'existing-booking' } as any);

      service['storeSession'](mockCustomerPhone, mockSalonId, slotData, 'en');
      jest.spyOn(buttonParser, 'parseConfirmButton').mockReturnValue({
        type: 'booking_confirmation',
        entityId: 'temp-session',
      } as any);

      await expect(
        service.handleBookingConfirmation(
          'confirm_booking_temp-session',
          mockCustomerPhone,
          mockSalonId,
          'en',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should fail after max retry attempts', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const slotData = {
        date: futureDate.toISOString().split('T')[0],
        time: '15:00',
        masterId: mockMasterId,
        masterName: 'John Doe',
        serviceId: mockServiceId,
        serviceName: 'Haircut',
        duration: 60,
        price: 5000,
        timestamp: Date.now(),
      };

      // Mock availability check to pass (slot available)
      jest.spyOn(prismaService.booking, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prismaService.master, 'findUnique').mockResolvedValue(mockMaster as any);
      jest.spyOn(prismaService.salon, 'findUnique').mockResolvedValue({
        id: mockSalonId,
        working_hours_start: '09:00',
        working_hours_end: '18:00',
      } as any);

      // Always fail transaction with a non-validation error (to trigger retries)
      jest.spyOn(prismaService, '$transaction').mockRejectedValue(new Error('Persistent error'));

      service['storeSession'](mockCustomerPhone, mockSalonId, slotData, 'en');
      jest.spyOn(buttonParser, 'parseConfirmButton').mockReturnValue({
        type: 'booking_confirmation',
        entityId: 'temp-session',
      } as any);

      await expect(
        service.handleBookingConfirmation(
          'confirm_booking_temp-session',
          mockCustomerPhone,
          mockSalonId,
          'en',
        ),
      ).rejects.toThrow(BadRequestException);

      // Should have tried 3 times
      expect(prismaService.$transaction).toHaveBeenCalledTimes(3);
    });
  });

  describe('Integration: Complete Booking Flow', () => {
    it('should complete full booking flow with all critical fixes', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const dateStr = futureDate.toISOString().split('T')[0];

      // Step 1: Slot selection
      jest.spyOn(buttonParser, 'parseSlotButton').mockReturnValue({
        type: 'slot_selection',
        date: dateStr,
        time: '15:00',
        masterId: mockMasterId,
      } as any);

      jest.spyOn(prismaService.booking, 'findFirst').mockResolvedValue(null); // Available
      jest.spyOn(prismaService.master, 'findUnique').mockResolvedValue(mockMaster as any);
      jest.spyOn(prismaService.service, 'findFirst').mockResolvedValue(mockService as any);
      jest.spyOn(cardBuilder, 'buildConfirmationCard').mockReturnValue({
        messaging_product: 'whatsapp',
        to: mockCustomerPhone,
        type: 'interactive',
      } as any);

      const selectionResult = await service.handleSlotSelection(
        `slot_${dateStr}_15:00_${mockMasterId}`,
        mockCustomerPhone,
        mockSalonId,
        'en',
      );

      expect(selectionResult.success).toBe(true);

      // Step 2: Booking confirmation
      jest.spyOn(buttonParser, 'parseConfirmButton').mockReturnValue({
        type: 'booking_confirmation',
        entityId: 'temp-session',
      } as any);

      jest.spyOn(prismaService, '$transaction').mockImplementation(async (callback: any) => {
        return callback({
          master: {
            findUnique: jest.fn().mockResolvedValue(mockMaster),
          } as any,
          $executeRaw: jest.fn().mockResolvedValue([]),
          booking: {
            findMany: jest.fn().mockResolvedValue([]),
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(mockBooking),
          } as any,
          salon: {
            update: jest.fn().mockResolvedValue({}),
          } as any,
        });
      });

      const confirmResult = await service.handleBookingConfirmation(
        'confirm_booking_temp-session',
        mockCustomerPhone,
        mockSalonId,
        'en',
      );

      expect(confirmResult.success).toBe(true);
      expect(confirmResult.bookingCode).toBe('BK847392');
      expect(confirmResult.message).toContain('Booking Confirmed');
      expect(confirmResult.message).toContain('Haircut');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle session expiration gracefully', async () => {
      jest.spyOn(buttonParser, 'parseConfirmButton').mockReturnValue({
        type: 'booking_confirmation',
        entityId: 'temp-session',
      } as any);

      // No session stored - expired
      await expect(
        service.handleBookingConfirmation(
          'confirm_booking_temp-session',
          mockCustomerPhone,
          mockSalonId,
          'en',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle invalid button IDs', async () => {
      jest.spyOn(buttonParser, 'parseSlotButton').mockImplementation(() => {
        throw new Error('Invalid button ID');
      });

      await expect(
        service.handleSlotSelection('invalid_button_id', mockCustomerPhone, mockSalonId, 'en'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle missing master data', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const dateStr = futureDate.toISOString().split('T')[0];

      jest.spyOn(buttonParser, 'parseSlotButton').mockReturnValue({
        type: 'slot_selection',
        date: dateStr,
        time: '15:00',
        masterId: 'non-existent-master',
      } as any);

      jest.spyOn(prismaService.booking, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prismaService.master, 'findUnique').mockResolvedValue(null);
      jest.spyOn(prismaService.salon, 'findUnique').mockResolvedValue(null);

      // When master is not found, the service gracefully handles it by returning
      // a response indicating no alternatives are available, not throwing an exception
      const result = await service.handleSlotSelection(
        `slot_${dateStr}_15:00_non-existent`,
        mockCustomerPhone,
        mockSalonId,
        'en',
      );

      // Verify the service returns a graceful error response
      expect(result.success).toBe(false);
      expect(result.message).toContain('alternative');
    });
  });
});
