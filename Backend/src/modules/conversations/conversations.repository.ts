import { Injectable } from '@nestjs/common';
import { Conversation } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { BaseRepository } from '@common/repositories';
import { IConversationsRepository } from './conversations.repository.interface';

/**
 * Conversations Repository
 * Handles all database operations for Conversation entities
 */
@Injectable()
export class ConversationsRepository
  extends BaseRepository<Conversation>
  implements IConversationsRepository
{
  constructor(protected readonly prisma: PrismaService) {
    super(prisma, 'conversation');
  }

  /**
   * Find conversations by salon ID
   */
  async findBySalonId(
    salonId: string,
    orderBy: any = { last_message_at: 'desc' },
  ): Promise<Conversation[]> {
    return this.findAll({ salon_id: salonId }, { orderBy });
  }

  /**
   * Find conversations by multiple salon IDs
   */
  async findByMultipleSalonIds(
    salonIds: string[],
    orderBy: any = { last_message_at: 'desc' },
  ): Promise<Conversation[]> {
    return this.findAll({ salon_id: { in: salonIds } }, { orderBy });
  }

  /**
   * Find conversation by salon ID and phone number
   */
  async findBySalonIdAndPhoneNumber(
    salonId: string,
    phoneNumber: string,
  ): Promise<Conversation | null> {
    return this.findOne({ salon_id: salonId, phone_number: phoneNumber });
  }

  /**
   * Find conversations by status
   */
  async findByStatus(status: string, salonId?: string): Promise<Conversation[]> {
    const where: any = { status };

    if (salonId) {
      where.salon_id = salonId;
    }

    return this.findAll(where, { orderBy: { last_message_at: 'desc' } });
  }

  /**
   * Update conversation status
   */
  async updateStatus(id: string, status: string): Promise<Conversation> {
    return this.update(id, { status } as any);
  }

  /**
   * Update last message timestamp
   */
  async updateLastMessageAt(id: string, timestamp: Date): Promise<Conversation> {
    return this.update(id, { last_message_at: timestamp } as any);
  }

  /**
   * Increment message count
   */
  async incrementMessageCount(id: string, incrementBy: number = 1): Promise<Conversation> {
    return this.prisma.conversation.update({
      where: { id },
      data: {
        message_count: {
          increment: incrementBy,
        },
      },
    });
  }

  /**
   * Update conversation cost
   */
  async addCost(id: string, additionalCost: number): Promise<Conversation> {
    return this.prisma.conversation.update({
      where: { id },
      data: {
        cost: {
          increment: additionalCost,
        },
      },
    });
  }

  /**
   * Find or create conversation
   */
  async findOrCreate(salonId: string, phoneNumber: string): Promise<Conversation> {
    // Try to find existing conversation
    const existing = await this.findBySalonIdAndPhoneNumber(salonId, phoneNumber);

    if (existing) {
      return existing;
    }

    // Create new conversation
    return this.create({
      salon_id: salonId,
      phone_number: phoneNumber,
      status: 'ACTIVE',
      started_at: new Date(),
      last_message_at: new Date(),
      message_count: 0,
      cost: 0,
    } as any);
  }

  /**
   * Find active conversations for salon
   */
  async findActiveBySalonId(salonId: string): Promise<Conversation[]> {
    return this.findAll(
      {
        salon_id: salonId,
        status: 'ACTIVE',
      },
      { orderBy: { last_message_at: 'desc' } },
    );
  }
}
