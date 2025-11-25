import { Injectable } from '@nestjs/common';
import { AIMessage } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';

/**
 * AI Message Repository
 * Handles database operations for individual AI messages
 */
@Injectable()
export class AIMessageRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new AI message
   */
  async create(data: {
    conversation_id: string;
    salon_id: string;
    phone_number: string;
    direction: 'INBOUND' | 'OUTBOUND';
    content: string;
    ai_model?: string;
    tokens_used?: number;
    cost?: number;
    response_time_ms?: number;
  }): Promise<AIMessage> {
    return this.prisma.aIMessage.create({
      data: {
        conversation_id: data.conversation_id,
        salon_id: data.salon_id,
        phone_number: data.phone_number,
        direction: data.direction,
        content: data.content,
        ai_model: data.ai_model,
        tokens_used: data.tokens_used,
        cost: data.cost,
        response_time_ms: data.response_time_ms,
        created_at: new Date(),
      },
    });
  }

  /**
   * Find message by ID
   */
  async findById(id: string): Promise<AIMessage | null> {
    return this.prisma.aIMessage.findUnique({
      where: { id },
    });
  }

  /**
   * Find all messages for a conversation
   */
  async findByConversationId(
    conversationId: string,
    limit: number = 100,
    offset: number = 0,
  ): Promise<AIMessage[]> {
    return this.prisma.aIMessage.findMany({
      where: { conversation_id: conversationId },
      orderBy: { created_at: 'asc' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Get last N messages for a conversation
   * Used for building context for AI
   */
  async getLastN(conversationId: string, n: number = 10): Promise<AIMessage[]> {
    const messages = await this.prisma.aIMessage.findMany({
      where: { conversation_id: conversationId },
      orderBy: { created_at: 'desc' },
      take: n,
    });

    // Reverse to get chronological order
    return messages.reverse();
  }

  /**
   * Find messages by salon ID
   */
  async findBySalonId(
    salonId: string,
    limit: number = 100,
    offset: number = 0,
  ): Promise<AIMessage[]> {
    return this.prisma.aIMessage.findMany({
      where: { salon_id: salonId },
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Find messages by phone number
   */
  async findByPhoneNumber(
    phoneNumber: string,
    salonId?: string,
    limit: number = 100,
  ): Promise<AIMessage[]> {
    const where: any = { phone_number: phoneNumber };

    if (salonId) {
      where.salon_id = salonId;
    }

    return this.prisma.aIMessage.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: limit,
    });
  }

  /**
   * Count messages for a conversation
   */
  async countByConversationId(conversationId: string): Promise<number> {
    return this.prisma.aIMessage.count({
      where: { conversation_id: conversationId },
    });
  }

  /**
   * Get message statistics for a salon
   */
  async getStats(
    salonId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    totalMessages: number;
    inboundMessages: number;
    outboundMessages: number;
    totalTokens: number;
    totalCost: number;
    averageResponseTime: number;
  }> {
    const where: any = { salon_id: salonId };

    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) where.created_at.gte = startDate;
      if (endDate) where.created_at.lte = endDate;
    }

    const [total, inbound, outbound, aggregates] = await Promise.all([
      this.prisma.aIMessage.count({ where }),
      this.prisma.aIMessage.count({ where: { ...where, direction: 'INBOUND' } }),
      this.prisma.aIMessage.count({ where: { ...where, direction: 'OUTBOUND' } }),
      this.prisma.aIMessage.aggregate({
        where,
        _sum: {
          tokens_used: true,
          cost: true,
          response_time_ms: true,
        },
        _avg: {
          response_time_ms: true,
        },
      }),
    ]);

    return {
      totalMessages: total,
      inboundMessages: inbound,
      outboundMessages: outbound,
      totalTokens: aggregates._sum.tokens_used || 0,
      totalCost: aggregates._sum.cost || 0,
      averageResponseTime: aggregates._avg.response_time_ms || 0,
    };
  }

  /**
   * Delete old messages (cleanup)
   */
  async deleteOldMessages(daysOld: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.prisma.aIMessage.deleteMany({
      where: {
        created_at: {
          lt: cutoffDate,
        },
      },
    });

    return result.count;
  }

  /**
   * Delete all messages for a conversation
   */
  async deleteByConversationId(conversationId: string): Promise<number> {
    const result = await this.prisma.aIMessage.deleteMany({
      where: { conversation_id: conversationId },
    });

    return result.count;
  }
}
