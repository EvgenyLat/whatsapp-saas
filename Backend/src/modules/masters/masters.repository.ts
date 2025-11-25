import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { Master, Prisma } from '@prisma/client';

export interface MasterWithStats extends Master {
  upcoming_bookings_count?: number;
  total_completed_bookings?: number;
  total_revenue?: string;
}

@Injectable()
export class MastersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.MasterCreateInput): Promise<Master> {
    return this.prisma.master.create({ data });
  }

  async findById(id: string): Promise<Master | null> {
    return this.prisma.master.findUnique({
      where: { id },
    });
  }

  async findByIdWithStats(id: string): Promise<MasterWithStats | null> {
    const master = await this.prisma.master.findUnique({
      where: { id },
    });

    if (!master) {
      return null;
    }

    const now = new Date();

    // Get upcoming bookings count
    const upcomingBookingsCount = await this.prisma.booking.count({
      where: {
        master_id: id,
        start_ts: { gte: now },
        status: { in: ['CONFIRMED', 'IN_PROGRESS'] },
      },
    });

    // Get total completed bookings
    const totalCompletedBookings = await this.prisma.booking.count({
      where: {
        master_id: id,
        status: 'COMPLETED',
      },
    });

    // Get total revenue from completed bookings with service relation
    const revenueResult = await this.prisma.booking.findMany({
      where: {
        master_id: id,
        status: 'COMPLETED',
        service_id: { not: null },
      },
      include: {
        serviceRelation: true,
      },
    });

    const totalRevenue = revenueResult
      .filter((b) => b.serviceRelation)
      .reduce((sum, b) => sum + Number(b.serviceRelation!.price), 0);

    return {
      ...master,
      upcoming_bookings_count: upcomingBookingsCount,
      total_completed_bookings: totalCompletedBookings,
      total_revenue: totalRevenue.toFixed(2),
    };
  }

  async findPaginatedWithFilters(
    salonId: string | string[],
    filters: {
      search?: string;
      is_active?: boolean;
      specialization?: string;
    },
    page: number,
    limit: number,
  ): Promise<{
    data: Master[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const where: Prisma.MasterWhereInput = {
      salon_id: Array.isArray(salonId) ? { in: salonId } : salonId,
    };

    if (filters.search) {
      where.name = {
        contains: filters.search,
        mode: 'insensitive',
      };
    }

    if (filters.is_active !== undefined) {
      where.is_active = filters.is_active;
    }

    if (filters.specialization) {
      where.specialization = {
        has: filters.specialization,
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.master.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.master.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async update(id: string, data: Prisma.MasterUpdateInput): Promise<Master> {
    return this.prisma.master.update({
      where: { id },
      data,
    });
  }

  async softDelete(id: string): Promise<Master> {
    return this.prisma.master.update({
      where: { id },
      data: { is_active: false },
    });
  }

  async getBookingsForDateRange(
    masterId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Array<{
    id: string;
    booking_code: string;
    customer_name: string;
    service: string;
    start_ts: Date;
    end_ts: Date | null;
    status: string;
  }>> {
    return this.prisma.booking.findMany({
      where: {
        master_id: masterId,
        start_ts: {
          gte: startDate,
          lte: endDate,
        },
        status: { notIn: ['CANCELLED'] },
      },
      select: {
        id: true,
        booking_code: true,
        customer_name: true,
        service: true,
        start_ts: true,
        end_ts: true,
        status: true,
      },
      orderBy: { start_ts: 'asc' },
    });
  }

  async getBookingsForDate(
    masterId: string,
    date: Date,
  ): Promise<Array<{
    start_ts: Date;
    end_ts: Date | null;
  }>> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.prisma.booking.findMany({
      where: {
        master_id: masterId,
        start_ts: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: { notIn: ['CANCELLED'] },
      },
      select: {
        start_ts: true,
        end_ts: true,
      },
      orderBy: { start_ts: 'asc' },
    });
  }
}
