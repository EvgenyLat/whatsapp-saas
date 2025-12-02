import { Injectable } from '@nestjs/common';
import { AIConversation } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';

/**
 * AI Conversation Repository
 * Handles database operations for AI conversations tracking
 */
@Injectable()
export class AIConversationRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find conversation by ID
   */
  async findById(id: string): Promise<AIConversation | null> {
    return this.prisma.aIConversation.findUnique({
      where: { id },
    });
  }

  /**
   * Find conversation by conversation_id (unique identifier)
   */
  async findByConversationId(conversationId: string): Promise<AIConversation | null> {
    return this.prisma.aIConversation.findUnique({
      where: { conversation_id: conversationId },
    });
  }

  /**
   * Find conversation by salon and phone number
   */
  async findBySalonAndPhone(salonId: string, phoneNumber: string): Promise<AIConversation | null> {
    return this.prisma.aIConversation.findUnique({
      where: {
        salon_id_phone_number: {
          salon_id: salonId,
          phone_number: phoneNumber,
        },
      },
    });
  }

  /**
   * Find or create conversation
   * Returns existing conversation or creates a new one
   */
  async findOrCreate(
    salonId: string,
    phoneNumber: string,
    conversationId: string,
    aiModel: string = 'gpt-4',
  ): Promise<AIConversation> {
    // Try to find existing conversation
    let conversation = await this.findByConversationId(conversationId);

    if (!conversation) {
      // Create new conversation
      conversation = await this.prisma.aIConversation.create({
        data: {
          salon_id: salonId,
          phone_number: phoneNumber,
          conversation_id: conversationId,
          ai_model: aiModel,
          total_tokens: 0,
          total_cost: 0,
          message_count: 0,
          last_activity: new Date(),
        },
      });
    } else {
      // Update last activity
      conversation = await this.prisma.aIConversation.update({
        where: { id: conversation.id },
        data: { last_activity: new Date() },
      });
    }

    return conversation;
  }

  /**
   * Update token usage and cost
   */
  async updateTokens(
    conversationId: string,
    tokensUsed: number,
    cost: number,
  ): Promise<AIConversation> {
    const conversation = await this.findByConversationId(conversationId);

    if (!conversation) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }

    return this.prisma.aIConversation.update({
      where: { id: conversation.id },
      data: {
        total_tokens: conversation.total_tokens + tokensUsed,
        total_cost: conversation.total_cost + cost,
        message_count: conversation.message_count + 1,
        last_activity: new Date(),
      },
    });
  }

  /**
   * Find all conversations for a salon
   */
  async findBySalonId(
    salonId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<AIConversation[]> {
    return this.prisma.aIConversation.findMany({
      where: { salon_id: salonId },
      orderBy: { last_activity: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Get conversation statistics for a salon
   */
  async getStats(salonId: string): Promise<{
    totalConversations: number;
    totalMessages: number;
    totalTokens: number;
    totalCost: number;
  }> {
    const stats = await this.prisma.aIConversation.aggregate({
      where: { salon_id: salonId },
      _count: { id: true },
      _sum: {
        message_count: true,
        total_tokens: true,
        total_cost: true,
      },
    });

    return {
      totalConversations: stats._count.id,
      totalMessages: stats._sum.message_count || 0,
      totalTokens: stats._sum.total_tokens || 0,
      totalCost: stats._sum.total_cost || 0,
    };
  }

  /**
   * Delete old conversations (cleanup)
   */
  async deleteOldConversations(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.prisma.aIConversation.deleteMany({
      where: {
        last_activity: {
          lt: cutoffDate,
        },
      },
    });

    return result.count;
  }
}
