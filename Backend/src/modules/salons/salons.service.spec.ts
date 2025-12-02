import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { SalonsService } from './salons.service';
import { SalonsRepository } from './salons.repository';
import { CreateSalonDto, UpdateSalonDto } from './dto';

describe('SalonsService', () => {
  let service: SalonsService;
  let salonsRepository: jest.Mocked<SalonsRepository>;

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockSalonId = '223e4567-e89b-12d3-a456-426614174000';
  const mockOtherUserId = '323e4567-e89b-12d3-a456-426614174000';

  const mockSalon = {
    id: mockSalonId,
    name: 'Elite Beauty Salon',
    phone_number_id: '102951292676262',
    access_token: 'EAAx1234567890...',
    is_active: true,
    owner_id: mockUserId,
    created_at: new Date(),
    updated_at: new Date(),
    address: null,
    working_hours_start: '09:00',
    working_hours_end: '20:00',
    slot_duration_minutes: 30,
  };

  const mockSalonsRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    findByOwnerId: jest.fn(),
    update: jest.fn(),
    isPhoneNumberIdInUse: jest.fn(),
    updateActiveStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SalonsService, { provide: SalonsRepository, useValue: mockSalonsRepository }],
    }).compile();

    service = module.get<SalonsService>(SalonsService);
    salonsRepository = module.get(SalonsRepository);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createSalonDto: CreateSalonDto = {
      name: 'Elite Beauty Salon',
      phone_number_id: '102951292676262',
      access_token: 'EAAx1234567890...',
      is_active: true,
    };

    it('should create a new salon successfully', async () => {
      mockSalonsRepository.isPhoneNumberIdInUse.mockResolvedValue(false);
      mockSalonsRepository.create.mockResolvedValue(mockSalon);

      const result = await service.create(mockUserId, createSalonDto);

      expect(result.id).toBe(mockSalonId);
      expect(result.name).toBe(createSalonDto.name);
      expect(mockSalonsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: createSalonDto.name,
          phone_number_id: createSalonDto.phone_number_id,
          access_token: createSalonDto.access_token,
          is_active: true,
          owner_id: mockUserId,
        }),
      );
    });

    it('should throw ConflictException if phone_number_id already exists', async () => {
      mockSalonsRepository.isPhoneNumberIdInUse.mockResolvedValue(true);

      await expect(service.create(mockUserId, createSalonDto)).rejects.toThrow(ConflictException);
      expect(mockSalonsRepository.create).not.toHaveBeenCalled();
    });

    it('should set is_active to true by default if not provided', async () => {
      const dtoWithoutActive = {
        name: 'New Salon',
        phone_number_id: '999999999',
        access_token: 'token123',
      };

      mockSalonsRepository.isPhoneNumberIdInUse.mockResolvedValue(false);
      mockSalonsRepository.create.mockResolvedValue({
        ...mockSalon,
        ...dtoWithoutActive,
        is_active: true,
      });

      await service.create(mockUserId, dtoWithoutActive);

      expect(mockSalonsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          is_active: true,
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return all salons for SUPER_ADMIN', async () => {
      const mockSalons = [mockSalon, { ...mockSalon, id: 'another-id', owner_id: mockOtherUserId }];
      mockSalonsRepository.findAll.mockResolvedValue(mockSalons);

      const result = await service.findAll(mockUserId, 'SUPER_ADMIN');

      expect(result).toHaveLength(2);
      expect(mockSalonsRepository.findAll).toHaveBeenCalledWith({}, { orderBy: { created_at: 'desc' } });
    });

    it('should return only user-owned salons for non-admin users', async () => {
      const mockSalons = [mockSalon];
      mockSalonsRepository.findByOwnerId.mockResolvedValue(mockSalons);

      const result = await service.findAll(mockUserId, 'SALON_OWNER');

      expect(result).toHaveLength(1);
      expect(mockSalonsRepository.findByOwnerId).toHaveBeenCalledWith(mockUserId);
    });

    it('should return empty array if no salons found', async () => {
      mockSalonsRepository.findByOwnerId.mockResolvedValue([]);

      const result = await service.findAll(mockUserId, 'SALON_OWNER');

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return salon if user is the owner', async () => {
      mockSalonsRepository.findById.mockResolvedValue(mockSalon);

      const result = await service.findOne(mockSalonId, mockUserId, 'SALON_OWNER');

      expect(result.id).toBe(mockSalonId);
      expect(result.name).toBe(mockSalon.name);
    });

    it('should return salon if user is SUPER_ADMIN', async () => {
      const otherUserSalon = { ...mockSalon, owner_id: mockOtherUserId };
      mockSalonsRepository.findById.mockResolvedValue(otherUserSalon);

      const result = await service.findOne(mockSalonId, mockUserId, 'SUPER_ADMIN');

      expect(result.id).toBe(mockSalonId);
    });

    it('should throw NotFoundException if salon not found', async () => {
      mockSalonsRepository.findById.mockResolvedValue(null);

      await expect(service.findOne(mockSalonId, mockUserId, 'SALON_OWNER')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw UnauthorizedException if user is not owner and not admin', async () => {
      const otherUserSalon = { ...mockSalon, owner_id: mockOtherUserId };
      mockSalonsRepository.findById.mockResolvedValue(otherUserSalon);

      await expect(service.findOne(mockSalonId, mockUserId, 'SALON_OWNER')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('update', () => {
    const updateSalonDto: UpdateSalonDto = {
      name: 'Updated Salon Name',
      is_active: false,
    };

    it('should update salon successfully', async () => {
      mockSalonsRepository.findById.mockResolvedValue(mockSalon);
      mockSalonsRepository.update.mockResolvedValue({
        ...mockSalon,
        ...updateSalonDto,
      });

      const result = await service.update(mockSalonId, mockUserId, 'SALON_OWNER', updateSalonDto);

      expect(result.name).toBe(updateSalonDto.name);
      expect(result.is_active).toBe(updateSalonDto.is_active);
      expect(mockSalonsRepository.update).toHaveBeenCalled();
    });

    it('should throw ConflictException when updating to existing phone_number_id', async () => {
      const updateDto: UpdateSalonDto = {
        phone_number_id: '999999999',
      };

      mockSalonsRepository.findById.mockResolvedValue(mockSalon);
      mockSalonsRepository.isPhoneNumberIdInUse.mockResolvedValue(true);

      await expect(
        service.update(mockSalonId, mockUserId, 'SALON_OWNER', updateDto),
      ).rejects.toThrow(ConflictException);
    });

    it('should allow updating to same phone_number_id', async () => {
      const updateDto: UpdateSalonDto = {
        phone_number_id: mockSalon.phone_number_id,
      };

      mockSalonsRepository.findById.mockResolvedValue(mockSalon);
      mockSalonsRepository.update.mockResolvedValue(mockSalon);

      const result = await service.update(mockSalonId, mockUserId, 'SALON_OWNER', updateDto);

      expect(result.id).toBe(mockSalonId);
      expect(mockSalonsRepository.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException if salon not found', async () => {
      mockSalonsRepository.findById.mockResolvedValue(null);

      await expect(
        service.update(mockSalonId, mockUserId, 'SALON_OWNER', updateSalonDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw UnauthorizedException if user does not own salon', async () => {
      const otherUserSalon = { ...mockSalon, owner_id: mockOtherUserId };
      mockSalonsRepository.findById.mockResolvedValue(otherUserSalon);

      await expect(
        service.update(mockSalonId, mockUserId, 'SALON_OWNER', updateSalonDto),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('remove', () => {
    it('should soft delete salon successfully', async () => {
      mockSalonsRepository.findById.mockResolvedValue(mockSalon);
      mockSalonsRepository.updateActiveStatus.mockResolvedValue({
        ...mockSalon,
        is_active: false,
      });

      const result = await service.remove(mockSalonId, mockUserId, 'SALON_OWNER');

      expect(result.message).toBe('Salon deleted successfully');
      expect(mockSalonsRepository.updateActiveStatus).toHaveBeenCalledWith(mockSalonId, false);
    });

    it('should throw NotFoundException if salon not found', async () => {
      mockSalonsRepository.findById.mockResolvedValue(null);

      await expect(service.remove(mockSalonId, mockUserId, 'SALON_OWNER')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw UnauthorizedException if user does not own salon', async () => {
      const otherUserSalon = { ...mockSalon, owner_id: mockOtherUserId };
      mockSalonsRepository.findById.mockResolvedValue(otherUserSalon);

      await expect(service.remove(mockSalonId, mockUserId, 'SALON_OWNER')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('verifySalonOwnership', () => {
    it('should verify ownership successfully', async () => {
      mockSalonsRepository.findById.mockResolvedValue(mockSalon);

      await expect(service.verifySalonOwnership(mockSalonId, mockUserId)).resolves.not.toThrow();
    });

    it('should throw NotFoundException if salon not found', async () => {
      mockSalonsRepository.findById.mockResolvedValue(null);

      await expect(service.verifySalonOwnership(mockSalonId, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw UnauthorizedException if user does not own salon', async () => {
      mockSalonsRepository.findById.mockResolvedValue({
        owner_id: mockOtherUserId,
      });

      await expect(service.verifySalonOwnership(mockSalonId, mockUserId)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
