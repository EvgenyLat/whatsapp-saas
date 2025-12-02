import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '@database/prisma.service';
import { SalonsService } from '../salons/salons.service';
import { CacheService } from '../cache/cache.service';
import { AnalyticsFilterDto } from './dto';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let prismaService: PrismaService;
  let cacheService: CacheService;
  let salonsService: SalonsService;

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockSalonId = 'salon-123';

  // Mock data
  const mockBookings = [
    {
      id: 'booking-1',
      status: 'CONFIRMED',
      customer_phone: '+1234567890',
      created_at: new Date('2025-10-23T10:00:00Z'),
    },
    {
      id: 'booking-2',
      status: 'PENDING',
      customer_phone: '+1234567891',
      created_at: new Date('2025-10-23T11:00:00Z'),
    },
    {
      id: 'booking-3',
      status: 'COMPLETED',
      customer_phone: '+1234567890',
      created_at: new Date('2025-10-20T10:00:00Z'),
    },
    {
      id: 'booking-4',
      status: 'CANCELLED',
      customer_phone: '+1234567892',
      created_at: new Date('2025-10-16T10:00:00Z'),
    },
    {
      id: 'booking-5',
      status: 'NO_SHOW',
      customer_phone: '+1234567893',
      created_at: new Date('2025-10-10T10:00:00Z'),
    },
  ];

  const mockMessages = [
    {
      id: 'msg-1',
      direction: 'INBOUND',
      created_at: new Date('2025-10-23T10:00:00Z'),
    },
    {
      id: 'msg-2',
      direction: 'OUTBOUND',
      created_at: new Date('2025-10-23T10:05:00Z'),
    },
    {
      id: 'msg-3',
      direction: 'INBOUND',
      created_at: new Date('2025-10-20T10:00:00Z'),
    },
    {
      id: 'msg-4',
      direction: 'OUTBOUND',
      created_at: new Date('2025-10-20T10:05:00Z'),
    },
    {
      id: 'msg-5',
      direction: 'INBOUND',
      created_at: new Date('2025-10-15T10:00:00Z'),
    },
  ];

  const mockSalons = [{ id: mockSalonId, name: 'Test Salon', owner_id: mockUserId }];

  const mockPrismaService = {
    booking: {
      findMany: jest.fn(),
    },
    message: {
      findMany: jest.fn(),
    },
    conversation: {
      count: jest.fn(),
    },
  };

  const mockCacheService = {
    getDashboardStats: jest.fn(),
    setDashboardStats: jest.fn(),
    invalidateDashboardStats: jest.fn(),
  };

  const mockSalonsService = {
    verifySalonOwnership: jest.fn(),
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CacheService, useValue: mockCacheService },
        { provide: SalonsService, useValue: mockSalonsService },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    prismaService = module.get<PrismaService>(PrismaService);
    cacheService = module.get<CacheService>(CacheService);
    salonsService = module.get<SalonsService>(SalonsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getDashboardStats', () => {
    const filters: AnalyticsFilterDto = { salon_id: mockSalonId };

    it('should return cached stats if available', async () => {
      const cachedStats = {
        totalBookings: 100,
        todayBookings: 5,
        activeChats: 10,
        responseRate: 95.5,
        bookingsByStatus: {
          PENDING: 10,
          CONFIRMED: 20,
          CANCELLED: 5,
          COMPLETED: 60,
          NO_SHOW: 5,
        },
        recentActivity: {
          bookings: 15,
          messages: 50,
          newCustomers: 8,
        },
        trends: {
          bookingsChange: 15.5,
          messagesChange: -5.2,
          responseRateChange: 2.3,
        },
      };

      mockCacheService.getDashboardStats.mockResolvedValue(cachedStats);

      const result = await service.getDashboardStats(mockUserId, 'SALON_OWNER', filters);

      expect(result).toEqual(cachedStats);
      expect(cacheService.getDashboardStats).toHaveBeenCalledWith(mockUserId, mockSalonId);
      expect(prismaService.booking.findMany).not.toHaveBeenCalled();
    });

    it('should fetch and calculate stats when cache miss', async () => {
      mockCacheService.getDashboardStats.mockResolvedValue(null);
      mockSalonsService.verifySalonOwnership.mockResolvedValue(true);
      mockPrismaService.booking.findMany.mockResolvedValue(mockBookings);
      mockPrismaService.message.findMany.mockResolvedValue(mockMessages);
      mockPrismaService.conversation.count.mockResolvedValue(5);

      const result = await service.getDashboardStats(mockUserId, 'SALON_OWNER', filters);

      expect(result).toBeDefined();
      expect(result.totalBookings).toBe(mockBookings.length);
      expect(result.bookingsByStatus.CONFIRMED).toBe(1);
      expect(result.bookingsByStatus.PENDING).toBe(1);
      expect(result.bookingsByStatus.COMPLETED).toBe(1);
      expect(result.bookingsByStatus.CANCELLED).toBe(1);
      expect(result.bookingsByStatus.NO_SHOW).toBe(1);
      expect(result.activeChats).toBe(5);
      expect(cacheService.setDashboardStats).toHaveBeenCalled();
    });

    it('should verify salon ownership for non-admin users', async () => {
      mockCacheService.getDashboardStats.mockResolvedValue(null);
      mockSalonsService.verifySalonOwnership.mockResolvedValue(true);
      mockPrismaService.booking.findMany.mockResolvedValue([]);
      mockPrismaService.message.findMany.mockResolvedValue([]);
      mockPrismaService.conversation.count.mockResolvedValue(0);

      await service.getDashboardStats(mockUserId, 'SALON_OWNER', filters);

      expect(salonsService.verifySalonOwnership).toHaveBeenCalledWith(mockSalonId, mockUserId);
    });

    it('should skip ownership verification for SUPER_ADMIN', async () => {
      mockCacheService.getDashboardStats.mockResolvedValue(null);
      mockPrismaService.booking.findMany.mockResolvedValue([]);
      mockPrismaService.message.findMany.mockResolvedValue([]);
      mockPrismaService.conversation.count.mockResolvedValue(0);

      await service.getDashboardStats(mockUserId, 'SUPER_ADMIN', filters);

      expect(salonsService.verifySalonOwnership).not.toHaveBeenCalled();
    });

    it('should query all user salons when no salon_id provided', async () => {
      mockCacheService.getDashboardStats.mockResolvedValue(null);
      mockSalonsService.findAll.mockResolvedValue(mockSalons);
      mockPrismaService.booking.findMany.mockResolvedValue([]);
      mockPrismaService.message.findMany.mockResolvedValue([]);
      mockPrismaService.conversation.count.mockResolvedValue(0);

      await service.getDashboardStats(mockUserId, 'SALON_OWNER', {});

      expect(salonsService.findAll).toHaveBeenCalledWith(mockUserId, 'SALON_OWNER');
      expect(prismaService.booking.findMany).toHaveBeenCalledWith({
        where: { salon_id: { in: [mockSalonId] } },
        select: {
          id: true,
          status: true,
          created_at: true,
          customer_phone: true,
        },
      });
    });

    it('should calculate response rate correctly', async () => {
      const messagesWithResponses = [
        { id: 'msg-1', direction: 'INBOUND', created_at: new Date('2025-10-23T10:00:00Z') },
        { id: 'msg-2', direction: 'OUTBOUND', created_at: new Date('2025-10-23T10:01:00Z') },
        { id: 'msg-3', direction: 'INBOUND', created_at: new Date('2025-10-23T11:00:00Z') },
        { id: 'msg-4', direction: 'OUTBOUND', created_at: new Date('2025-10-23T11:01:00Z') },
      ];

      mockCacheService.getDashboardStats.mockResolvedValue(null);
      mockSalonsService.verifySalonOwnership.mockResolvedValue(true);
      mockPrismaService.booking.findMany.mockResolvedValue([]);
      mockPrismaService.message.findMany.mockResolvedValue(messagesWithResponses);
      mockPrismaService.conversation.count.mockResolvedValue(0);

      const result = await service.getDashboardStats(mockUserId, 'SALON_OWNER', filters);

      // 2 inbound, 2 outbound = 100% response rate
      expect(result.responseRate).toBe(100);
    });

    it('should calculate response rate as 0 when no inbound messages', async () => {
      const outboundOnlyMessages = [
        { id: 'msg-1', direction: 'OUTBOUND', created_at: new Date('2025-10-23T10:00:00Z') },
        { id: 'msg-2', direction: 'OUTBOUND', created_at: new Date('2025-10-23T10:01:00Z') },
      ];

      mockCacheService.getDashboardStats.mockResolvedValue(null);
      mockSalonsService.verifySalonOwnership.mockResolvedValue(true);
      mockPrismaService.booking.findMany.mockResolvedValue([]);
      mockPrismaService.message.findMany.mockResolvedValue(outboundOnlyMessages);
      mockPrismaService.conversation.count.mockResolvedValue(0);

      const result = await service.getDashboardStats(mockUserId, 'SALON_OWNER', filters);

      expect(result.responseRate).toBe(0);
    });

    it('should calculate today bookings correctly', async () => {
      const today = new Date();
      const todayBookings = [
        {
          id: 'booking-today-1',
          status: 'PENDING',
          customer_phone: '+1111111111',
          created_at: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0),
        },
        {
          id: 'booking-today-2',
          status: 'CONFIRMED',
          customer_phone: '+2222222222',
          created_at: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 30),
        },
      ];

      mockCacheService.getDashboardStats.mockResolvedValue(null);
      mockSalonsService.verifySalonOwnership.mockResolvedValue(true);
      mockPrismaService.booking.findMany.mockResolvedValue(todayBookings);
      mockPrismaService.message.findMany.mockResolvedValue([]);
      mockPrismaService.conversation.count.mockResolvedValue(0);

      const result = await service.getDashboardStats(mockUserId, 'SALON_OWNER', filters);

      expect(result.todayBookings).toBe(2);
    });

    it('should calculate unique customers in last 7 days', async () => {
      const now = new Date();
      const recentBookings = [
        {
          id: 'booking-1',
          status: 'CONFIRMED',
          customer_phone: '+1111111111',
          created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        },
        {
          id: 'booking-2',
          status: 'PENDING',
          customer_phone: '+1111111111', // Same customer
          created_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        },
        {
          id: 'booking-3',
          status: 'CONFIRMED',
          customer_phone: '+2222222222', // Different customer
          created_at: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
        },
      ];

      mockCacheService.getDashboardStats.mockResolvedValue(null);
      mockSalonsService.verifySalonOwnership.mockResolvedValue(true);
      mockPrismaService.booking.findMany.mockResolvedValue(recentBookings);
      mockPrismaService.message.findMany.mockResolvedValue([]);
      mockPrismaService.conversation.count.mockResolvedValue(0);

      const result = await service.getDashboardStats(mockUserId, 'SALON_OWNER', filters);

      expect(result.recentActivity.newCustomers).toBe(2); // 2 unique phone numbers
    });

    it('should calculate trends correctly with positive growth', async () => {
      const now = new Date();

      // 10 bookings in last 30 days, 5 in previous 30 days = 100% growth
      const bookingsWithGrowth = [
        ...Array(10)
          .fill(null)
          .map((_, i) => ({
            id: `booking-recent-${i}`,
            status: 'CONFIRMED',
            customer_phone: `+111111111${i}`,
            created_at: new Date(now.getTime() - (i + 1) * 24 * 60 * 60 * 1000), // Last 10 days
          })),
        ...Array(5)
          .fill(null)
          .map((_, i) => ({
            id: `booking-old-${i}`,
            status: 'CONFIRMED',
            customer_phone: `+222222222${i}`,
            created_at: new Date(now.getTime() - (35 + i) * 24 * 60 * 60 * 1000), // 35-40 days ago
          })),
      ];

      mockCacheService.getDashboardStats.mockResolvedValue(null);
      mockSalonsService.verifySalonOwnership.mockResolvedValue(true);
      mockPrismaService.booking.findMany.mockResolvedValue(bookingsWithGrowth);
      mockPrismaService.message.findMany.mockResolvedValue([]);
      mockPrismaService.conversation.count.mockResolvedValue(0);

      const result = await service.getDashboardStats(mockUserId, 'SALON_OWNER', filters);

      expect(result.trends.bookingsChange).toBeGreaterThan(0); // Positive growth
    });

    it('should handle empty data gracefully', async () => {
      mockCacheService.getDashboardStats.mockResolvedValue(null);
      mockSalonsService.verifySalonOwnership.mockResolvedValue(true);
      mockPrismaService.booking.findMany.mockResolvedValue([]);
      mockPrismaService.message.findMany.mockResolvedValue([]);
      mockPrismaService.conversation.count.mockResolvedValue(0);

      const result = await service.getDashboardStats(mockUserId, 'SALON_OWNER', filters);

      expect(result.totalBookings).toBe(0);
      expect(result.todayBookings).toBe(0);
      expect(result.activeChats).toBe(0);
      expect(result.responseRate).toBe(0);
      expect(result.bookingsByStatus.PENDING).toBe(0);
      expect(result.recentActivity.bookings).toBe(0);
      expect(result.recentActivity.messages).toBe(0);
      expect(result.recentActivity.newCustomers).toBe(0);
    });
  });

  describe('invalidateDashboardCache', () => {
    it('should invalidate cache for user and salon', async () => {
      await service.invalidateDashboardCache(mockUserId, mockSalonId);

      expect(cacheService.invalidateDashboardStats).toHaveBeenCalledWith(mockUserId, mockSalonId);
    });

    it('should invalidate cache for user without salon', async () => {
      await service.invalidateDashboardCache(mockUserId);

      expect(cacheService.invalidateDashboardStats).toHaveBeenCalledWith(mockUserId, undefined);
    });
  });
});
