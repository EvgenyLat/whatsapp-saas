import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsRepository } from './bookings.repository';
import { SalonsService } from '../salons/salons.service';
import { UsageTrackingService } from '../salons/services/usage-tracking.service';
import { RemindersService } from '../reminders/reminders.service';
import { CreateBookingDto, UpdateBookingStatusDto, BookingStatus } from './dto';

describe('BookingsService', () => {
  let service: BookingsService;

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

  const mockBookingsRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    findByCode: jest.fn(),
    findByBookingCodeAndSalonId: jest.fn(),
    findAll: jest.fn(),
    findPaginatedWithFilters: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn(),
    codeExists: jest.fn(),
  };

  const mockSalonsService = {
    verifySalonOwnership: jest.fn(),
    findAll: jest.fn(),
  };

  const mockUsageTrackingService = {
    checkBookingLimit: jest.fn().mockResolvedValue({ allowed: true }),
    incrementBookingUsage: jest.fn(),
  };

  const mockRemindersService = {
    scheduleBookingReminders: jest.fn(),
    cancelReminders: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: BookingsRepository, useValue: mockBookingsRepository },
        { provide: SalonsService, useValue: mockSalonsService },
        { provide: UsageTrackingService, useValue: mockUsageTrackingService },
        { provide: RemindersService, useValue: mockRemindersService },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);

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
      mockBookingsRepository.findByBookingCodeAndSalonId.mockResolvedValue(null);
      mockBookingsRepository.create.mockResolvedValue(mockBooking);

      const result = await service.create(mockUserId, createBookingDto);

      expect(result.id).toBe(mockBookingId);
      expect(mockSalonsService.verifySalonOwnership).toHaveBeenCalledWith(mockSalonId, mockUserId);
      expect(mockBookingsRepository.create).toHaveBeenCalled();
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
      mockBookingsRepository.findPaginatedWithFilters.mockResolvedValue({
        data: [mockBooking],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      const result = await service.findAll(mockUserId, 'SALON_OWNER', filters);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should verify ownership when salon_id filter is provided', async () => {
      const filtersWithSalon: any = { ...filters, salon_id: mockSalonId };
      mockSalonsService.verifySalonOwnership.mockResolvedValue(undefined);
      mockBookingsRepository.findPaginatedWithFilters.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });

      await service.findAll(mockUserId, 'SALON_OWNER', filtersWithSalon);

      expect(mockSalonsService.verifySalonOwnership).toHaveBeenCalledWith(mockSalonId, mockUserId);
    });
  });

  describe('findOne', () => {
    it('should return booking if user owns the salon', async () => {
      mockBookingsRepository.findById.mockResolvedValue(mockBooking);
      mockSalonsService.verifySalonOwnership.mockResolvedValue(undefined);

      const result = await service.findOne(mockBookingId, mockUserId, 'SALON_OWNER');

      expect(result.id).toBe(mockBookingId);
    });

    it('should throw NotFoundException if booking not found', async () => {
      mockBookingsRepository.findById.mockResolvedValue(null);

      await expect(service.findOne(mockBookingId, mockUserId, 'SALON_OWNER')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateStatus', () => {
    const updateStatusDto: UpdateBookingStatusDto = { status: BookingStatus.IN_PROGRESS };

    it('should update booking status successfully', async () => {
      mockBookingsRepository.findById.mockResolvedValue(mockBooking);
      mockSalonsService.verifySalonOwnership.mockResolvedValue(undefined);
      mockBookingsRepository.updateStatus.mockResolvedValue({
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
      mockBookingsRepository.findById.mockResolvedValue(completedBooking);
      mockSalonsService.verifySalonOwnership.mockResolvedValue(undefined);

      await expect(
        service.updateStatus(mockBookingId, mockUserId, 'SALON_OWNER', updateStatusDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancel', () => {
    it('should cancel booking successfully', async () => {
      mockBookingsRepository.findById.mockResolvedValue(mockBooking);
      mockSalonsService.verifySalonOwnership.mockResolvedValue(undefined);
      mockBookingsRepository.updateStatus.mockResolvedValue({
        ...mockBooking,
        status: BookingStatus.CANCELLED,
      });
      mockRemindersService.cancelReminders.mockResolvedValue(undefined);

      const result = await service.cancel(mockBookingId, mockUserId, 'SALON_OWNER');

      expect(result.deleted).toBe(true);
      expect(result.id).toBe(mockBookingId);
    });
  });
});
