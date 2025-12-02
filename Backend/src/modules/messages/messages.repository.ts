import { Injectable } from '@nestjs/common';
import { Message } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { BaseRepository } from '@common/repositories';
import {
  IMessagesRepository,
  MessageFilters,
  MessageQueryOptions,
} from './messages.repository.interface';

/**
 * Messages Repository
 * Handles all database operations for Message entities
 */
@Injectable()
export class MessagesRepository extends BaseRepository<Message> implements IMessagesRepository {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma, 'message');
  }

  /**
   * Find messages by salon ID with filters
   */
  async findBySalonId(
    salonId: string,
    filters?: MessageFilters,
    options?: MessageQueryOptions,
  ): Promise<Message[]> {
    const where = this.buildWhereClause(salonId, filters);

    return this.findAll(where, {
      skip: options?.skip,
      take: options?.take,
      orderBy: options?.orderBy || { created_at: 'desc' },
    });
  }

  /**
   * Find messages by multiple salon IDs
   */
  async findByMultipleSalonIds(
    salonIds: string[],
    filters?: MessageFilters,
    options?: MessageQueryOptions,
  ): Promise<Message[]> {
    const where = this.buildWhereClause(salonIds, filters);

    return this.findAll(where, {
      skip: options?.skip,
      take: options?.take,
      orderBy: options?.orderBy || { created_at: 'desc' },
    });
  }

  /**
   * Find messages by phone number
   */
  async findByPhoneNumber(phoneNumber: string, salonId?: string): Promise<Message[]> {
    const where: any = { phone_number: phoneNumber };

    if (salonId) {
      where.salon_id = salonId;
    }

    return this.findAll(where, { orderBy: { created_at: 'desc' } });
  }

  /**
   * Find messages by conversation ID
   */
  async findByConversationId(conversationId: string): Promise<Message[]> {
    return this.findAll({ conversation_id: conversationId }, { orderBy: { created_at: 'asc' } });
  }

  /**
   * Find messages by direction
   */
  async findByDirection(direction: string, salonId?: string): Promise<Message[]> {
    const where: any = { direction };

    if (salonId) {
      where.salon_id = salonId;
    }

    return this.findAll(where, { orderBy: { created_at: 'desc' } });
  }

  /**
   * Find messages by status
   */
  async findByStatus(status: string, salonId?: string): Promise<Message[]> {
    const where: any = { status };

    if (salonId) {
      where.salon_id = salonId;
    }

    return this.findAll(where, { orderBy: { created_at: 'desc' } });
  }

  /**
   * Find message by WhatsApp ID
   */
  async findByWhatsappId(whatsappId: string): Promise<Message | null> {
    return this.findOne({ whatsapp_id: whatsappId });
  }

  /**
   * Update message status
   */
  async updateStatus(id: string, status: string): Promise<Message> {
    return this.update(id, { status } as any);
  }

  /**
   * Count messages with filters
   */
  async countWithFilters(salonId?: string, filters?: MessageFilters): Promise<number> {
    const where = this.buildWhereClause(salonId ?? null, filters);
    return this.count(where);
  }

  /**
   * Find paginated messages with filters
   */
  async findPaginatedWithFilters(
    salonId: string | string[] | null,
    filters: MessageFilters,
    page: number,
    limit: number,
  ): Promise<{
    data: Message[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const where = this.buildWhereClause(salonId, filters);

    return this.findPaginated(where, page, limit, { created_at: 'desc' });
  }

  /**
   * Calculate total cost for messages
   */
  async calculateTotalCost(salonId: string, startDate?: Date, endDate?: Date): Promise<number> {
    const where: any = { salon_id: salonId };

    if (startDate || endDate) {
      where.created_at = {};

      if (startDate) {
        where.created_at.gte = startDate;
      }

      if (endDate) {
        where.created_at.lte = endDate;
      }
    }

    const result = await this.prisma.message.aggregate({
      where,
      _sum: {
        cost: true,
      },
    });

    return result._sum.cost || 0;
  }

  /**
   * Build where clause from filters
   */
  private buildWhereClause(salonId: string | string[] | null, filters?: MessageFilters): any {
    const where: any = {};

    // Handle salon ID filter
    if (salonId) {
      if (Array.isArray(salonId)) {
        where.salon_id = { in: salonId };
      } else {
        where.salon_id = salonId;
      }
    }

    // Apply additional filters
    if (filters) {
      if (filters.phone_number) {
        where.phone_number = filters.phone_number;
      }

      if (filters.direction) {
        where.direction = filters.direction;
      }

      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.message_type) {
        where.message_type = filters.message_type;
      }

      if (filters.start_date || filters.end_date) {
        where.created_at = {};

        if (filters.start_date) {
          where.created_at.gte = new Date(filters.start_date);
        }

        if (filters.end_date) {
          where.created_at.lte = new Date(filters.end_date);
        }
      }
    }

    return where;
  }
}
