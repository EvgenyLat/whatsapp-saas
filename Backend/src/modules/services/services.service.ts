import {
  Injectable,
  NotFoundException,
  BadRequestException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { SalonsService } from '../salons/salons.service';
import { ServicesRepository } from './services.repository';
import {
  CreateServiceDto,
  UpdateServiceDto,
  ServiceResponseDto,
  ServiceFilterDto,
  CategoryStatsResponseDto,
} from './dto';
import { PaginatedResult } from '@common/dto/pagination.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class ServicesService {
  constructor(
    private readonly servicesRepository: ServicesRepository,
    @Inject(forwardRef(() => SalonsService))
    private readonly salonsService: SalonsService,
  ) {}

  async create(userId: string, createServiceDto: CreateServiceDto): Promise<ServiceResponseDto> {
    // Verify user owns the salon
    await this.salonsService.verifySalonOwnership(createServiceDto.salon_id, userId);

    // Create service
    const service = await this.servicesRepository.create({
      salon: {
        connect: { id: createServiceDto.salon_id },
      },
      name: createServiceDto.name,
      description: createServiceDto.description,
      duration_minutes: createServiceDto.duration_minutes,
      price: new Decimal(createServiceDto.price),
      category: createServiceDto.category,
    });

    return new ServiceResponseDto(service);
  }

  async findAll(
    userId: string,
    userRole: string,
    filters: ServiceFilterDto,
  ): Promise<PaginatedResult<ServiceResponseDto>> {
    let salonIds: string | string[];

    // Get user's salons
    if (userRole !== 'SUPER_ADMIN') {
      const userSalons = await this.salonsService.findAll(userId, userRole);
      salonIds = userSalons.map((s) => s.id);

      if (salonIds.length === 0) {
        return {
          data: [],
          meta: {
            total: 0,
            page: filters.page || 1,
            limit: filters.limit || 10,
            totalPages: 0,
          },
        };
      }
    } else {
      // Super admin can see all services
      salonIds = [];
    }

    const result = await this.servicesRepository.findPaginatedWithFilters(
      salonIds,
      {
        category: filters.category,
        search: filters.search,
        is_active: filters.is_active,
      },
      filters.page || 1,
      filters.limit || 10,
    );

    return {
      data: result.data.map((s) => new ServiceResponseDto(s)),
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    };
  }

  async findOne(id: string, userId: string, userRole: string): Promise<ServiceResponseDto> {
    const service = await this.servicesRepository.findByIdWithStats(id);

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    // Verify user has access to this service's salon
    if (userRole !== 'SUPER_ADMIN') {
      await this.salonsService.verifySalonOwnership(service.salon_id, userId);
    }

    return new ServiceResponseDto(service);
  }

  async update(
    id: string,
    userId: string,
    userRole: string,
    updateServiceDto: UpdateServiceDto,
  ): Promise<ServiceResponseDto> {
    // Verify service exists and user has access
    const existingService = await this.findOne(id, userId, userRole);

    // Update service
    const updated = await this.servicesRepository.update(id, {
      ...(updateServiceDto.name && { name: updateServiceDto.name }),
      ...(updateServiceDto.description !== undefined && { description: updateServiceDto.description }),
      ...(updateServiceDto.duration_minutes && { duration_minutes: updateServiceDto.duration_minutes }),
      ...(updateServiceDto.price !== undefined && { price: new Decimal(updateServiceDto.price) }),
      ...(updateServiceDto.category && { category: updateServiceDto.category }),
    });

    return new ServiceResponseDto(updated);
  }

  async remove(id: string, userId: string, userRole: string): Promise<{ message: string }> {
    // Verify service exists and user has access
    await this.findOne(id, userId, userRole);

    // Soft delete
    await this.servicesRepository.softDelete(id);

    return { message: 'Service deactivated successfully' };
  }

  async getCategoryStats(
    userId: string,
    userRole: string,
    salonId?: string,
  ): Promise<CategoryStatsResponseDto> {
    // Determine which salon to get stats for
    let targetSalonId: string;

    if (salonId) {
      // Verify user has access to this salon
      if (userRole !== 'SUPER_ADMIN') {
        await this.salonsService.verifySalonOwnership(salonId, userId);
      }
      targetSalonId = salonId;
    } else {
      // Get user's first salon
      const userSalons = await this.salonsService.findAll(userId, userRole);
      if (userSalons.length === 0) {
        throw new BadRequestException('No salon found for this user');
      }
      targetSalonId = userSalons[0].id;
    }

    // Get category stats
    const stats = await this.servicesRepository.getCategoryStats(targetSalonId);

    return {
      salon_id: targetSalonId,
      categories: stats.categories,
      total_services: stats.total_services,
      total_bookings: stats.total_bookings,
      total_revenue: stats.total_revenue,
    };
  }
}
