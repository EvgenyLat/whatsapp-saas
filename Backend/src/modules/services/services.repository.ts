import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { Service, Prisma, ServiceCategory } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export interface ServiceWithStats extends Service {
  total_bookings?: number;
  total_revenue?: string;
}

export interface CategoryStats {
  category: ServiceCategory;
  total_services: number;
  total_bookings: number;
  total_revenue: string;
  average_price: string;
}

@Injectable()
export class ServicesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.ServiceCreateInput): Promise<Service> {
    return this.prisma.service.create({ data });
  }

  async findById(id: string): Promise<Service | null> {
    return this.prisma.service.findUnique({
      where: { id },
    });
  }

  async findByIdWithStats(id: string): Promise<ServiceWithStats | null> {
    const service = await this.prisma.service.findUnique({
      where: { id },
    });

    if (!service) {
      return null;
    }

    // Get total bookings for this service
    const totalBookings = await this.prisma.booking.count({
      where: {
        service_id: id,
        status: 'COMPLETED',
      },
    });

    // Calculate total revenue
    const totalRevenue = Number(service.price) * totalBookings;

    return {
      ...service,
      total_bookings: totalBookings,
      total_revenue: totalRevenue.toFixed(2),
    };
  }

  async findPaginatedWithFilters(
    salonId: string | string[],
    filters: {
      category?: ServiceCategory;
      search?: string;
      is_active?: boolean;
    },
    page: number,
    limit: number,
  ): Promise<{
    data: Service[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const where: Prisma.ServiceWhereInput = {
      salon_id: Array.isArray(salonId) ? { in: salonId } : salonId,
    };

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.search) {
      where.name = {
        contains: filters.search,
        mode: 'insensitive',
      };
    }

    if (filters.is_active !== undefined) {
      where.is_active = filters.is_active;
    }

    const [data, total] = await Promise.all([
      this.prisma.service.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.service.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async update(id: string, data: Prisma.ServiceUpdateInput): Promise<Service> {
    return this.prisma.service.update({
      where: { id },
      data,
    });
  }

  async softDelete(id: string): Promise<Service> {
    return this.prisma.service.update({
      where: { id },
      data: { is_active: false },
    });
  }

  async getCategoryStats(salonId: string): Promise<{
    categories: CategoryStats[];
    total_services: number;
    total_bookings: number;
    total_revenue: string;
  }> {
    // Get all services for the salon
    const services = await this.prisma.service.findMany({
      where: { salon_id: salonId, is_active: true },
      include: {
        bookings: {
          where: { status: 'COMPLETED' },
        },
      },
    });

    // Group by category
    const categoryMap = new Map<
      ServiceCategory,
      {
        services: Service[];
        bookings: number;
        revenue: number;
      }
    >();

    services.forEach((service) => {
      const category = service.category;
      const existing = categoryMap.get(category) || {
        services: [],
        bookings: 0,
        revenue: 0,
      };

      const serviceBookings = service.bookings.length;
      const serviceRevenue = Number(service.price) * serviceBookings;

      categoryMap.set(category, {
        services: [...existing.services, service],
        bookings: existing.bookings + serviceBookings,
        revenue: existing.revenue + serviceRevenue,
      });
    });

    // Build category stats
    const categories: CategoryStats[] = [];
    let totalServices = 0;
    let totalBookings = 0;
    let totalRevenue = 0;

    categoryMap.forEach((data, category) => {
      const avgPrice =
        data.services.reduce((sum, s) => sum + Number(s.price), 0) / data.services.length;

      categories.push({
        category,
        total_services: data.services.length,
        total_bookings: data.bookings,
        total_revenue: data.revenue.toFixed(2),
        average_price: avgPrice.toFixed(2),
      });

      totalServices += data.services.length;
      totalBookings += data.bookings;
      totalRevenue += data.revenue;
    });

    return {
      categories,
      total_services: totalServices,
      total_bookings: totalBookings,
      total_revenue: totalRevenue.toFixed(2),
    };
  }
}
