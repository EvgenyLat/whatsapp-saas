import { Conversation } from '@prisma/client';
import { IBaseRepository } from '@common/repositories';

/**
 * Conversations Repository Interface
 * Defines conversation-specific data access methods
 */
export interface IConversationsRepository extends IBaseRepository<Conversation> {
  /**
   * Find conversations by salon ID
   * @param salonId - Salon ID
   * @param orderBy - Sort order
   * @returns Array of conversations
   */
  findBySalonId(salonId: string, orderBy?: any): Promise<Conversation[]>;

  /**
   * Find conversations by multiple salon IDs
   * @param salonIds - Array of salon IDs
   * @param orderBy - Sort order
   * @returns Array of conversations
   */
  findByMultipleSalonIds(salonIds: string[], orderBy?: any): Promise<Conversation[]>;

  /**
   * Find conversation by salon ID and phone number
   * @param salonId - Salon ID
   * @param phoneNumber - Phone number
   * @returns Conversation or null
   */
  findBySalonIdAndPhoneNumber(
    salonId: string,
    phoneNumber: string,
  ): Promise<Conversation | null>;

  /**
   * Find conversations by status
   * @param status - Conversation status
   * @param salonId - Optional salon ID filter
   * @returns Array of conversations
   */
  findByStatus(status: string, salonId?: string): Promise<Conversation[]>;

  /**
   * Update conversation status
   * @param id - Conversation ID
   * @param status - New status
   * @returns Updated conversation
   */
  updateStatus(id: string, status: string): Promise<Conversation>;

  /**
   * Update last message timestamp
   * @param id - Conversation ID
   * @param timestamp - Last message timestamp
   * @returns Updated conversation
   */
  updateLastMessageAt(id: string, timestamp: Date): Promise<Conversation>;

  /**
   * Increment message count
   * @param id - Conversation ID
   * @param incrementBy - Number to increment by (default: 1)
   * @returns Updated conversation
   */
  incrementMessageCount(id: string, incrementBy?: number): Promise<Conversation>;

  /**
   * Update conversation cost
   * @param id - Conversation ID
   * @param additionalCost - Cost to add to current total
   * @returns Updated conversation
   */
  addCost(id: string, additionalCost: number): Promise<Conversation>;

  /**
   * Find or create conversation
   * @param salonId - Salon ID
   * @param phoneNumber - Phone number
   * @returns Existing or newly created conversation
   */
  findOrCreate(salonId: string, phoneNumber: string): Promise<Conversation>;

  /**
   * Find active conversations for salon
   * @param salonId - Salon ID
   * @returns Array of active conversations
   */
  findActiveBySalonId(salonId: string): Promise<Conversation[]>;
}
