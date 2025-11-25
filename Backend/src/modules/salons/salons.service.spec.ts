import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { SalonsService } from './salons.service';
import { PrismaService } from '@database/prisma.service';
import { CreateSalonDto, UpdateSalonDto } from './dto';

describe('SalonsService', () => {
  let service: SalonsService;
  let prisma: PrismaService;

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
  };

  const mockPrismaService = {
    salon: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalonsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<SalonsService>(SalonsService);
    prisma = module.get<PrismaService>(PrismaService);

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
      mockPrismaService.salon.findUnique.mockResolvedValue(null);
      mockPrismaService.salon.create.mockResolvedValue(mockSalon);

      const result = await service.create(mockUserId, createSalonDto);

      expect(result.id).toBe(mockSalonId);
      expect(result.name).toBe(createSalonDto.name);
      expect(mockPrismaService.salon.create).toHaveBeenCalledWith({
        data: {
          name: createSalonDto.name,
          phone_number_id: createSalonDto.phone_number_id,
          access_token: createSalonDto.access_token,
          is_active: true,
          owner_id: mockUserId,
        },
      });
    });

    it('should throw ConflictException if phone_number_id already exists', async () => {
      mockPrismaService.salon.findUnique.mockResolvedValue(mockSalon);

      await expect(service.create(mockUserId, createSalonDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockPrismaService.salon.create).not.toHaveBeenCalled();
    });

    it('should set is_active to true by default if not provided', async () => {
      const dtoWithoutActive = {
        name: 'New Salon',
        phone_number_id: '999999999',
        access_token: 'token123',
      };

      mockPrismaService.salon.findUnique.mockResolvedValue(null);
      mockPrismaService.salon.create.mockResolvedValue({
        ...mockSalon,
        ...dtoWithoutActive,
        is_active: true,
      });

      await service.create(mockUserId, dtoWithoutActive);

      expect(mockPrismaService.salon.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          is_active: true,
        }),
      });
    });
  });

  describe('findAll', () => {
    it('should return all salons for SUPER_ADMIN', async () => {
      const mockSalons = [mockSalon, { ...mockSalon, id: 'another-id', owner_id: mockOtherUserId }];
      mockPrismaService.salon.findMany.mockResolvedValue(mockSalons);

      const result = await service.findAll(mockUserId, 'SUPER_ADMIN');

      expect(result).toHaveLength(2);
      expect(mockPrismaService.salon.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { created_at: 'desc' },
      });
    });

    it('should return only user-owned salons for non-admin users', async () => {
      const mockSalons = [mockSalon];
      mockPrismaService.salon.findMany.mockResolvedValue(mockSalons);

      const result = await service.findAll(mockUserId, 'SALON_OWNER');

      expect(result).toHaveLength(1);
      expect(mockPrismaService.salon.findMany).toHaveBeenCalledWith({
        where: { owner_id: mockUserId },
        orderBy: { created_at: 'desc' },
      });
    });

    it('should return empty array if no salons found', async () => {
      mockPrismaService.salon.findMany.mockResolvedValue([]);

      const result = await service.findAll(mockUserId, 'SALON_OWNER');

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return salon if user is the owner', async () => {
      mockPrismaService.salon.findUnique.mockResolvedValue(mockSalon);

      const result = await service.findOne(mockSalonId, mockUserId, 'SALON_OWNER');

      expect(result.id).toBe(mockSalonId);
      expect(result.name).toBe(mockSalon.name);
    });

    it('should return salon if user is SUPER_ADMIN', async () => {
      const otherUserSalon = { ...mockSalon, owner_id: mockOtherUserId };
      mockPrismaService.salon.findUnique.mockResolvedValue(otherUserSalon);

      const result = await service.findOne(mockSalonId, mockUserId, 'SUPER_ADMIN');

      expect(result.id).toBe(mockSalonId);
    });

    it('should throw NotFoundException if salon not found', async () => {
      mockPrismaService.salon.findUnique.mockResolvedValue(null);

      await expect(
        service.findOne(mockSalonId, mockUserId, 'SALON_OWNER'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw UnauthorizedException if user is not owner and not admin', async () => {
      const otherUserSalon = { ...mockSalon, owner_id: mockOtherUserId };
      mockPrismaService.salon.findUnique.mockResolvedValue(otherUserSalon);

      await expect(
        service.findOne(mockSalonId, mockUserId, 'SALON_OWNER'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('update', () => {
    const updateSalonDto: UpdateSalonDto = {
      name: 'Updated Salon Name',
      is_active: false,
    };

    it('should update salon successfully', async () => {
      mockPrismaService.salon.findUnique.mockResolvedValue(mockSalon);
      mockPrismaService.salon.update.mockResolvedValue({
        ...mockSalon,
        ...updateSalonDto,
      });

      const result = await service.update(
        mockSalonId,
        mockUserId,
        'SALON_OWNER',
        updateSalonDto,
      );

      expect(result.name).toBe(updateSalonDto.name);
      expect(result.is_active).toBe(updateSalonDto.is_active);
      expect(mockPrismaService.salon.update).toHaveBeenCalled();
    });

    it('should throw ConflictException when updating to existing phone_number_id', async () => {
      const updateDto: UpdateSalonDto = {
        phone_number_id: '999999999',
      };

      mockPrismaService.salon.findUnique
        .mockResolvedValueOnce(mockSalon) // First call for findOne
        .mockResolvedValueOnce({ ...mockSalon, id: 'different-id' }); // Second call for conflict check

      await expect(
        service.update(mockSalonId, mockUserId, 'SALON_OWNER', updateDto),
      ).rejects.toThrow(ConflictException);
    });

    it('should allow updating to same phone_number_id', async () => {
      const updateDto: UpdateSalonDto = {
        phone_number_id: mockSalon.phone_number_id,
      };

      mockPrismaService.salon.findUnique.mockResolvedValue(mockSalon);
      mockPrismaService.salon.update.mockResolvedValue(mockSalon);

      const result = await service.update(
        mockSalonId,
        mockUserId,
        'SALON_OWNER',
        updateDto,
      );

      expect(result.id).toBe(mockSalonId);
      expect(mockPrismaService.salon.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException if salon not found', async () => {
      mockPrismaService.salon.findUnique.mockResolvedValue(null);

      await expect(
        service.update(mockSalonId, mockUserId, 'SALON_OWNER', updateSalonDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw UnauthorizedException if user does not own salon', async () => {
      const otherUserSalon = { ...mockSalon, owner_id: mockOtherUserId };
      mockPrismaService.salon.findUnique.mockResolvedValue(otherUserSalon);

      await expect(
        service.update(mockSalonId, mockUserId, 'SALON_OWNER', updateSalonDto),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('remove', () => {
    it('should soft delete salon successfully', async () => {
      mockPrismaService.salon.findUnique.mockResolvedValue(mockSalon);
      mockPrismaService.salon.update.mockResolvedValue({
        ...mockSalon,
        is_active: false,
      });

      const result = await service.remove(mockSalonId, mockUserId, 'SALON_OWNER');

      expect(result.message).toBe('Salon deleted successfully');
      expect(mockPrismaService.salon.update).toHaveBeenCalledWith({
        where: { id: mockSalonId },
        data: { is_active: false },
      });
    });

    it('should throw NotFoundException if salon not found', async () => {
      mockPrismaService.salon.findUnique.mockResolvedValue(null);

      await expect(
        service.remove(mockSalonId, mockUserId, 'SALON_OWNER'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw UnauthorizedException if user does not own salon', async () => {
      const otherUserSalon = { ...mockSalon, owner_id: mockOtherUserId };
      mockPrismaService.salon.findUnique.mockResolvedValue(otherUserSalon);

      await expect(
        service.remove(mockSalonId, mockUserId, 'SALON_OWNER'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('verifySalonOwnership', () => {
    it('should verify ownership successfully', async () => {
      mockPrismaService.salon.findUnique.mockResolvedValue(mockSalon);

      await expect(
        service.verifySalonOwnership(mockSalonId, mockUserId),
      ).resolves.not.toThrow();
    });

    it('should throw NotFoundException if salon not found', async () => {
      mockPrismaService.salon.findUnique.mockResolvedValue(null);

      await expect(
        service.verifySalonOwnership(mockSalonId, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw UnauthorizedException if user does not own salon', async () => {
      mockPrismaService.salon.findUnique.mockResolvedValue({
        owner_id: mockOtherUserId,
      });

      await expect(
        service.verifySalonOwnership(mockSalonId, mockUserId),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
