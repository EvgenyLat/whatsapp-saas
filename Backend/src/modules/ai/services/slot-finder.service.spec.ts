import { Test, TestingModule } from '@nestjs/testing';
import { SlotFinderService } from './slot-finder.service';
import { PrismaService } from '@database/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * SlotFinderService Unit Tests
 *
 * Tests the slot finding algorithm including:
 * - Master filtering by service
 * - Slot generation from working hours
 * - Booking conflict detection
 * - Slot ranking and sorting
 */
describe('SlotFinderService', () => {
  let service: SlotFinderService;
  let prismaService: PrismaService;

  // Mock data
  const mockService = {
    id: 'service-1',
    salon_id: 'salon-1',
    name: 'Haircut',
    description: 'Professional haircut',
    duration_minutes: 60,
    price: new Decimal('50.00'),
    category: 'HAIRCUT' as any,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockMaster1 = {
    id: 'master-1',
    name: 'John Doe',
    specialization: ['HAIRCUT', 'COLORING'],
    working_hours: {
      monday: { start: '09:00', end: '18:00' },
      tuesday: { start: '09:00', end: '18:00' },
      wednesday: { start: '09:00', end: '18:00' },
      thursday: { start: '09:00', end: '18:00' },
      friday: { start: '09:00', end: '18:00' },
      saturday: { start: '10:00', end: '16:00' },
      sunday: { start: null, end: null }, // Not working
    },
  };

  const mockMaster2 = {
    id: 'master-2',
    name: 'Jane Smith',
    specialization: ['HAIRCUT', 'MANICURE'],
    working_hours: {
      monday: { start: '10:00', end: '19:00' },
      tuesday: { start: '10:00', end: '19:00' },
      wednesday: { start: '10:00', end: '19:00' },
      thursday: { start: '10:00', end: '19:00' },
      friday: { start: '10:00', end: '19:00' },
      saturday: { start: '09:00', end: '17:00' },
      sunday: { start: null, end: null },
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SlotFinderService,
        {
          provide: PrismaService,
          useValue: {
            service: {
              findUnique: jest.fn(),
            },
            master: {
              findFirst: jest.fn(),
              findMany: jest.fn(),
            },
            booking: {
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<SlotFinderService>(SlotFinderService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAvailableSlots', () => {
    it('should find slots for a service with multiple masters', async () => {
      // Mock service lookup
      jest.spyOn(prismaService.service, 'findUnique').mockResolvedValue(mockService);

      // Mock masters lookup
      jest.spyOn(prismaService.master, 'findMany').mockResolvedValue([
        mockMaster1 as any,
        mockMaster2 as any,
      ]);

      // Mock empty bookings (all slots available)
      jest.spyOn(prismaService.booking, 'findMany').mockResolvedValue([]);

      const result = await service.findAvailableSlots({
        salonId: 'salon-1',
        serviceId: 'service-1',
        maxDaysAhead: 3,
        limit: 10,
      });

      expect(result.slots.length).toBeGreaterThan(0);
      expect(result.totalFound).toBeGreaterThan(0);
      expect(result.searchedDays).toBe(3);
    });

    it('should rank preferred master slots higher', async () => {
      jest.spyOn(prismaService.service, 'findUnique').mockResolvedValue(mockService);

      jest.spyOn(prismaService.master, 'findMany').mockResolvedValue([
        mockMaster1 as any,
        mockMaster2 as any,
      ]);

      jest.spyOn(prismaService.booking, 'findMany').mockResolvedValue([]);

      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const result = await service.findAvailableSlots({
        salonId: 'salon-1',
        serviceId: 'service-1',
        masterId: 'master-1', // Prefer master-1
        preferredDate: tomorrow.toISOString().split('T')[0],
        preferredTime: '14:00',
        maxDaysAhead: 7,
        limit: 10,
      });

      expect(result.slots.length).toBeGreaterThan(0);

      // First slot should be from preferred master
      const firstSlot = result.slots[0];
      expect(firstSlot.isPreferred).toBe(true);
      expect(firstSlot.masterId).toBe('master-1');
    });

    it('should exclude slots that conflict with bookings', async () => {
      jest.spyOn(prismaService.service, 'findUnique').mockResolvedValue(mockService);

      jest.spyOn(prismaService.master, 'findMany').mockResolvedValue([
        mockMaster1 as any,
      ]);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(14, 0, 0, 0);

      const bookingEnd = new Date(tomorrow);
      bookingEnd.setHours(15, 0, 0, 0);

      // Mock booking at 14:00-15:00 tomorrow
      jest.spyOn(prismaService.booking, 'findMany').mockResolvedValue([
        {
          id: 'booking-1',
          master_id: 'master-1',
          start_ts: tomorrow,
          end_ts: bookingEnd,
          status: 'CONFIRMED',
        } as any,
      ]);

      const result = await service.findAvailableSlots({
        salonId: 'salon-1',
        serviceId: 'service-1',
        maxDaysAhead: 3,
        limit: 20,
      });

      // Check that 14:00 slot is NOT in results
      const conflictingSlot = result.slots.find(
        (slot) =>
          slot.date === tomorrow.toISOString().split('T')[0] &&
          slot.startTime === '14:00',
      );

      expect(conflictingSlot).toBeUndefined();
    });

    it('should not include slots outside working hours', async () => {
      jest.spyOn(prismaService.service, 'findUnique').mockResolvedValue(mockService);

      jest.spyOn(prismaService.master, 'findMany').mockResolvedValue([
        mockMaster1 as any,
      ]);

      jest.spyOn(prismaService.booking, 'findMany').mockResolvedValue([]);

      const result = await service.findAvailableSlots({
        salonId: 'salon-1',
        serviceId: 'service-1',
        maxDaysAhead: 3,
        limit: 50,
      });

      // Check no slots before 09:00 or after 18:00 on weekdays
      const invalidSlots = result.slots.filter((slot) => {
        const [hours] = slot.startTime.split(':').map(Number);
        return hours < 9 || hours >= 18;
      });

      expect(invalidSlots.length).toBe(0);
    });

    it('should return empty result when no service found', async () => {
      jest.spyOn(prismaService.service, 'findUnique').mockResolvedValue(null);

      const result = await service.findAvailableSlots({
        salonId: 'salon-1',
        serviceId: 'invalid-service',
        maxDaysAhead: 7,
        limit: 10,
      });

      expect(result.slots).toEqual([]);
      expect(result.totalFound).toBe(0);
    });

    it('should return empty result when no masters available', async () => {
      jest.spyOn(prismaService.service, 'findUnique').mockResolvedValue(mockService);

      jest.spyOn(prismaService.master, 'findMany').mockResolvedValue([]);

      const result = await service.findAvailableSlots({
        salonId: 'salon-1',
        serviceId: 'service-1',
        maxDaysAhead: 7,
        limit: 10,
      });

      expect(result.slots).toEqual([]);
      expect(result.totalFound).toBe(0);
    });

    it('should limit results to specified limit', async () => {
      jest.spyOn(prismaService.service, 'findUnique').mockResolvedValue(mockService);

      jest.spyOn(prismaService.master, 'findMany').mockResolvedValue([
        mockMaster1 as any,
        mockMaster2 as any,
      ]);

      jest.spyOn(prismaService.booking, 'findMany').mockResolvedValue([]);

      const result = await service.findAvailableSlots({
        salonId: 'salon-1',
        serviceId: 'service-1',
        maxDaysAhead: 7,
        limit: 5,
      });

      expect(result.slots.length).toBeLessThanOrEqual(5);
      if (result.totalFound > 5) {
        expect(result.hasMore).toBe(true);
      }
    });

    it('should include slot metadata (duration, price, names)', async () => {
      jest.spyOn(prismaService.service, 'findUnique').mockResolvedValue(mockService);

      jest.spyOn(prismaService.master, 'findMany').mockResolvedValue([
        mockMaster1 as any,
      ]);

      jest.spyOn(prismaService.booking, 'findMany').mockResolvedValue([]);

      const result = await service.findAvailableSlots({
        salonId: 'salon-1',
        serviceId: 'service-1',
        maxDaysAhead: 3,
        limit: 1,
      });

      expect(result.slots.length).toBeGreaterThan(0);

      const slot = result.slots[0];
      expect(slot.serviceId).toBe('service-1');
      expect(slot.serviceName).toBe('Haircut');
      expect(slot.duration).toBe(60);
      expect(slot.price).toBe(50);
      expect(slot.masterName).toBe('John Doe');
    });
  });
});
