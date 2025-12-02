import { Test, TestingModule } from '@nestjs/testing';
import { SalonsController } from './salons.controller';
import { SalonsService } from './salons.service';
import { CreateSalonDto, UpdateSalonDto, SalonResponseDto } from './dto';

describe('SalonsController', () => {
  let controller: SalonsController;
  let service: SalonsService;

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockSalonId = '223e4567-e89b-12d3-a456-426614174000';

  const mockSalonResponse: SalonResponseDto = {
    id: mockSalonId,
    name: 'Elite Beauty Salon',
    phone_number_id: '102951292676262',
    is_active: true,
    owner_id: mockUserId,
    working_hours_start: '09:00',
    working_hours_end: '20:00',
    slot_duration_minutes: 30,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockSalonsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SalonsController],
      providers: [{ provide: SalonsService, useValue: mockSalonsService }],
    }).compile();

    controller = module.get<SalonsController>(SalonsController);
    service = module.get<SalonsService>(SalonsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const createSalonDto: CreateSalonDto = {
      name: 'Elite Beauty Salon',
      phone_number_id: '102951292676262',
      access_token: 'EAAx1234567890...',
      is_active: true,
    };

    it('should create a new salon', async () => {
      mockSalonsService.create.mockResolvedValue(mockSalonResponse);

      const result = await controller.create(mockUserId, createSalonDto);

      expect(result).toEqual(mockSalonResponse);
      expect(mockSalonsService.create).toHaveBeenCalledWith(mockUserId, createSalonDto);
    });
  });

  describe('findAll', () => {
    it('should return all salons for the user', async () => {
      const mockSalons = [mockSalonResponse];
      mockSalonsService.findAll.mockResolvedValue(mockSalons);

      const result = await controller.findAll(mockUserId, 'SALON_OWNER');

      expect(result).toEqual(mockSalons);
      expect(mockSalonsService.findAll).toHaveBeenCalledWith(mockUserId, 'SALON_OWNER');
    });
  });

  describe('findOne', () => {
    it('should return a single salon', async () => {
      mockSalonsService.findOne.mockResolvedValue(mockSalonResponse);

      const result = await controller.findOne(mockSalonId, mockUserId, 'SALON_OWNER');

      expect(result).toEqual(mockSalonResponse);
      expect(mockSalonsService.findOne).toHaveBeenCalledWith(
        mockSalonId,
        mockUserId,
        'SALON_OWNER',
      );
    });
  });

  describe('update', () => {
    const updateSalonDto: UpdateSalonDto = {
      name: 'Updated Salon Name',
      is_active: false,
    };

    it('should update a salon', async () => {
      const updatedSalon = { ...mockSalonResponse, ...updateSalonDto };
      mockSalonsService.update.mockResolvedValue(updatedSalon);

      const result = await controller.update(
        mockSalonId,
        mockUserId,
        'SALON_OWNER',
        updateSalonDto,
      );

      expect(result).toEqual(updatedSalon);
      expect(mockSalonsService.update).toHaveBeenCalledWith(
        mockSalonId,
        mockUserId,
        'SALON_OWNER',
        updateSalonDto,
      );
    });
  });

  describe('remove', () => {
    it('should delete a salon', async () => {
      const mockResponse = { message: 'Salon deleted successfully' };
      mockSalonsService.remove.mockResolvedValue(mockResponse);

      const result = await controller.remove(mockSalonId, mockUserId, 'SALON_OWNER');

      expect(result).toEqual(mockResponse);
      expect(mockSalonsService.remove).toHaveBeenCalledWith(mockSalonId, mockUserId, 'SALON_OWNER');
    });
  });
});
