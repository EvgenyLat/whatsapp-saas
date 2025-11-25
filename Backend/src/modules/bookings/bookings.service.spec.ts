import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { PrismaService } from '@database/prisma.service';
import { SalonsService } from '../salons/salons.service';
import { CreateBookingDto, UpdateBookingDto, UpdateBookingStatusDto, BookingStatus } from './dto';

describe('BookingsService', () => {
  let service: BookingsService;
  let prisma: PrismaService;
  let salonsService: SalonsService;

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockSalonId = '223e4567-e89b-12d3-a456-426614174000';
  const mockBookingId = '323e4567-e89b-12d3-a456-426614174000';

  const mockBooking = {
    id: mockBookingId,
    booking_code: 'BK-12345',
    salon_id: mockSalonId,
    customer_phone: '+1234567890',
    customer_name: 'John Doe',
    service: 'Haircut',
    start_ts: new Date('2024-12-25T10:00:00.000Z'),
    status: 'CONFIRMED',
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockPrismaService = {
    booking: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockSalonsService = {
    verifySalonOwnership: jest.fn(),
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: SalonsService, useValue: mockSalonsService },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
    prisma = module.get<PrismaService>(PrismaService);
    salonsService = module.get<SalonsService>(SalonsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createBookingDto: CreateBookingDto = {
      salon_id: mockSalonId,
      customer_phone: '+1234567890',
      customer_name: 'John Doe',
      service: 'Haircut',
      start_ts: '2024-12-25T10:00:00.000Z',
    };

    it('should create a new booking successfully', async () => {
      mockSalonsService.verifySalonOwnership.mockResolvedValue(undefined);
      mockPrismaService.booking.findFirst.mockResolvedValue(null);
      mockPrismaService.booking.create.mockResolvedValue(mockBooking);

      const result = await service.create(mockUserId, createBookingDto);

      expect(result.id).toBe(mockBookingId);
      expect(mockSalonsService.verifySalonOwnership).toHaveBeenCalledWith(mockSalonId, mockUserId);
      expect(mockPrismaService.booking.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException if booking code already exists', async () => {
      const dtoWithCode = { ...createBookingDto, booking_code: 'BK-EXISTING' };
      mockSalonsService.verifySalonOwnership.mockResolvedValue(undefined);
      mockPrismaService.booking.findFirst.mockResolvedValue(mockBooking);

      await expect(service.create(mockUserId, dtoWithCode)).rejects.toThrow(BadRequestException);
    });

    it('should throw UnauthorizedException if user does not own salon', async () => {
      mockSalonsService.verifySalonOwnership.mockRejectedValue(new UnauthorizedException());

      await expect(service.create(mockUserId, createBookingDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('findAll', () => {
    const filters: any = { page: 1, limit: 10, skip: 0 };

    it('should return paginated bookings for salon owner', async () => {
      mockSalonsService.findAll.mockResolvedValue([{ id: mockSalonId }]);
      mockPrismaService.booking.count.mockResolvedValue(1);
      mockPrismaService.booking.findMany.mockResolvedValue([mockBooking]);

      const result = await service.findAll(mockUserId, 'SALON_OWNER', filters);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should verify ownership when salon_id filter is provided', async () => {
      const filtersWithSalon: any = { ...filters, salon_id: mockSalonId };
      mockSalonsService.verifySalonOwnership.mockResolvedValue(undefined);
      mockPrismaService.booking.count.mockResolvedValue(0);
      mockPrismaService.booking.findMany.mockResolvedValue([]);

      await service.findAll(mockUserId, 'SALON_OWNER', filtersWithSalon);

      expect(mockSalonsService.verifySalonOwnership).toHaveBeenCalledWith(mockSalonId, mockUserId);
    });
  });

  describe('findOne', () => {
    it('should return booking if user owns the salon', async () => {
      mockPrismaService.booking.findUnique.mockResolvedValue(mockBooking);
      mockSalonsService.verifySalonOwnership.mockResolvedValue(undefined);

      const result = await service.findOne(mockBookingId, mockUserId, 'SALON_OWNER');

      expect(result.id).toBe(mockBookingId);
    });

    it('should throw NotFoundException if booking not found', async () => {
      mockPrismaService.booking.findUnique.mockResolvedValue(null);

      await expect(service.findOne(mockBookingId, mockUserId, 'SALON_OWNER')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateStatus', () => {
    const updateStatusDto: UpdateBookingStatusDto = { status: BookingStatus.IN_PROGRESS };

    it('should update booking status successfully', async () => {
      mockPrismaService.booking.findUnique.mockResolvedValue(mockBooking);
      mockSalonsService.verifySalonOwnership.mockResolvedValue(undefined);
      mockPrismaService.booking.update.mockResolvedValue({
        ...mockBooking,
        status: BookingStatus.IN_PROGRESS,
      });

      const result = await service.updateStatus(
        mockBookingId,
        mockUserId,
        'SALON_OWNER',
        updateStatusDto,
      );

      expect(result.status).toBe(BookingStatus.IN_PROGRESS);
    });

    it('should throw BadRequestException for invalid status transition', async () => {
      const completedBooking = { ...mockBooking, status: BookingStatus.COMPLETED };
      mockPrismaService.booking.findUnique.mockResolvedValue(completedBooking);
      mockSalonsService.verifySalonOwnership.mockResolvedValue(undefined);

      await expect(
        service.updateStatus(mockBookingId, mockUserId, 'SALON_OWNER', updateStatusDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancel', () => {
    it('should cancel booking successfully', async () => {
      mockPrismaService.booking.findUnique.mockResolvedValue(mockBooking);
      mockSalonsService.verifySalonOwnership.mockResolvedValue(undefined);
      mockPrismaService.booking.update.mockResolvedValue({
        ...mockBooking,
        status: BookingStatus.CANCELLED,
      });

      const result = await service.cancel(mockBookingId, mockUserId, 'SALON_OWNER');

      expect(result.deleted).toBe(true);
      expect(result.id).toBe(mockBookingId);
    });
  });
});
