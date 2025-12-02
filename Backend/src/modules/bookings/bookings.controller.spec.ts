import { Test, TestingModule } from '@nestjs/testing';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

describe('BookingsController', () => {
  let controller: BookingsController;
  let service: BookingsService;

  const mockBookingsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn(),
    cancel: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookingsController],
      providers: [{ provide: BookingsService, useValue: mockBookingsService }],
    }).compile();

    controller = module.get<BookingsController>(BookingsController);
    service = module.get<BookingsService>(BookingsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a booking', async () => {
      const dto = {
        salon_id: 'salon-1',
        customer_phone: '+123',
        customer_name: 'John',
        service: 'Cut',
        start_ts: '2024-12-25T10:00:00Z',
      };
      mockBookingsService.create.mockResolvedValue({ id: 'booking-1', ...dto });

      const result = await controller.create('user-1', dto);

      expect(result.id).toBe('booking-1');
      expect(mockBookingsService.create).toHaveBeenCalledWith('user-1', dto);
    });
  });

  describe('findAll', () => {
    it('should return paginated bookings', async () => {
      const mockResult = { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } };
      mockBookingsService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll('user-1', 'SALON_OWNER', {
        page: 1,
        limit: 10,
        skip: 0,
      } as any);

      expect(result).toEqual(mockResult);
    });
  });
});
