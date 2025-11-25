import { Injectable } from '@nestjs/common';
import { Booking } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { BaseRepository } from '@common/repositories';
import {
  IBookingsRepository,
  BookingFilters,
  BookingQueryOptions,
} from './bookings.repository.interface';

/**
 * Bookings Repository
 * Handles all database operations for Booking entities
 */
@Injectable()
export class BookingsRepository
  extends BaseRepository<Booking>
  implements IBookingsRepository
{
  constructor(protected readonly prisma: PrismaService) {
    super(prisma, 'booking');
  }

  /**
   * Find booking by booking code and salon ID
   */
  async findByBookingCodeAndSalonId(
    bookingCode: string,
    salonId: string,
  ): Promise<Booking | null> {
    return this.findFirst({
      booking_code: bookingCode,
      salon_id: salonId,
    });
  }

  /**
   * Find bookings by salon ID with filters
   */
  async findBySalonId(
    salonId: string,
    filters?: BookingFilters,
    options?: BookingQueryOptions,
  ): Promise<Booking[]> {
    const where = this.buildWhereClause(salonId, filters);

    return this.findAll(where, {
      skip: options?.skip,
      take: options?.take,
      orderBy: options?.orderBy || { created_at: 'desc' },
    });
  }

  /**
   * Find bookings by multiple salon IDs
   */
  async findByMultipleSalonIds(
    salonIds: string[],
    filters?: BookingFilters,
    options?: BookingQueryOptions,
  ): Promise<Booking[]> {
    const where = this.buildWhereClause(salonIds, filters);

    return this.findAll(where, {
      skip: options?.skip,
      take: options?.take,
      orderBy: options?.orderBy || { created_at: 'desc' },
    });
  }

  /**
   * Find bookings by customer phone
   */
  async findByCustomerPhone(customerPhone: string, salonId?: string): Promise<Booking[]> {
    const where: any = { customer_phone: customerPhone };

    if (salonId) {
      where.salon_id = salonId;
    }

    return this.findAll(where, { orderBy: { start_ts: 'desc' } });
  }

  /**
   * Find bookings by status
   */
  async findByStatus(status: string, salonId?: string): Promise<Booking[]> {
    const where: any = { status };

    if (salonId) {
      where.salon_id = salonId;
    }

    return this.findAll(where, { orderBy: { start_ts: 'desc' } });
  }

  /**
   * Find bookings by date range
   */
  async findByDateRange(salonId: string, startDate: Date, endDate: Date): Promise<Booking[]> {
    return this.findAll(
      {
        salon_id: salonId,
        start_ts: {
          gte: startDate,
          lte: endDate,
        },
      },
      { orderBy: { start_ts: 'asc' } },
    );
  }

  /**
   * Update booking status
   */
  async updateStatus(id: string, status: string): Promise<Booking> {
    return this.update(id, { status } as any);
  }

  /**
   * Find booking by phone number and booking code
   * Used for customer-initiated cancellations via WhatsApp
   */
  async findByPhoneAndCode(
    salonId: string,
    customerPhone: string,
    bookingCode: string,
  ): Promise<Booking | null> {
    return this.findFirst({
      salon_id: salonId,
      customer_phone: customerPhone,
      booking_code: bookingCode,
      status: { not: 'CANCELLED' },
    });
  }

  /**
   * Count bookings with filters
   */
  async countWithFilters(salonId?: string, filters?: BookingFilters): Promise<number> {
    const where = this.buildWhereClause(salonId ?? null, filters);
    return this.count(where);
  }

  /**
   * Find paginated bookings with filters
   */
  async findPaginatedWithFilters(
    salonId: string | string[] | null,
    filters: BookingFilters,
    page: number,
    limit: number,
  ): Promise<{
    data: Booking[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const where = this.buildWhereClause(salonId, filters);

    return this.findPaginated(where, page, limit, { created_at: 'desc' });
  }

  /**
   * Find service by ID (for end_ts calculation)
   */
  async findServiceById(serviceId: string): Promise<{ duration_minutes: number } | null> {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      select: { duration_minutes: true },
    });
    return service;
  }

  /**
   * Build where clause from filters
   */
  private buildWhereClause(
    salonId: string | string[] | null,
    filters?: BookingFilters,
  ): any {
    const where: any = {};

    // Handle salon ID filter
    if (salonId) {
      if (Array.isArray(salonId)) {
        where.salon_id = { in: salonId };
      } else {
        where.salon_id = salonId;
      }
    }

    // By default, exclude CANCELLED bookings from calendar view
    // unless explicitly requested via status filter
    if (!filters?.status) {
      where.status = { not: 'CANCELLED' };
    }

    // Apply additional filters
    if (filters) {
      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.customer_phone) {
        where.customer_phone = filters.customer_phone;
      }

      if (filters.start_date || filters.end_date) {
        where.start_ts = {};

        if (filters.start_date) {
          where.start_ts.gte = new Date(filters.start_date);
        }

        if (filters.end_date) {
          where.start_ts.lte = new Date(filters.end_date);
        }
      }

      if (filters.master_id) {
        where.master_id = filters.master_id;
      }

      if (filters.service_id) {
        where.service_id = filters.service_id;
      }
    }

    return where;
  }

  /**
   * Override findById to include master and service relations
   */
  async findById(id: string): Promise<any | null> {
    return this.prisma.booking.findUnique({
      where: { id },
      include: {
        master: {
          select: {
            id: true,
            name: true,
            specialization: true,
          },
        },
        serviceRelation: {
          select: {
            id: true,
            name: true,
            duration_minutes: true,
            price: true,
            category: true,
          },
        },
      },
    });
  }

  /**
   * Override findPaginated to include master and service relations
   */
  async findPaginated(
    where: any,
    page: number,
    limit: number,
    orderBy?: any,
  ): Promise<{
    data: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const [data, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: orderBy || { created_at: 'desc' },
        include: {
          master: {
            select: {
              id: true,
              name: true,
              specialization: true,
            },
          },
          serviceRelation: {
            select: {
              id: true,
              name: true,
              duration_minutes: true,
              price: true,
              category: true,
            },
          },
        },
      }),
      this.count(where),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
