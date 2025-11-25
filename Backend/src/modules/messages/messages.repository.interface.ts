import { Message } from '@prisma/client';
import { IBaseRepository } from '@common/repositories';

/**
 * Messages Repository Interface
 * Defines message-specific data access methods
 */
export interface IMessagesRepository extends IBaseRepository<Message> {
  /**
   * Find messages by salon ID with filters
   * @param salonId - Salon ID
   * @param filters - Additional filters
   * @param options - Query options
   * @returns Array of messages
   */
  findBySalonId(
    salonId: string,
    filters?: MessageFilters,
    options?: MessageQueryOptions,
  ): Promise<Message[]>;

  /**
   * Find messages by multiple salon IDs
   * @param salonIds - Array of salon IDs
   * @param filters - Additional filters
   * @param options - Query options
   * @returns Array of messages
   */
  findByMultipleSalonIds(
    salonIds: string[],
    filters?: MessageFilters,
    options?: MessageQueryOptions,
  ): Promise<Message[]>;

  /**
   * Find messages by phone number
   * @param phoneNumber - Phone number
   * @param salonId - Optional salon ID filter
   * @returns Array of messages
   */
  findByPhoneNumber(phoneNumber: string, salonId?: string): Promise<Message[]>;

  /**
   * Find messages by conversation ID
   * @param conversationId - Conversation ID
   * @returns Array of messages
   */
  findByConversationId(conversationId: string): Promise<Message[]>;

  /**
   * Find messages by direction
   * @param direction - Message direction (INBOUND/OUTBOUND)
   * @param salonId - Optional salon ID filter
   * @returns Array of messages
   */
  findByDirection(direction: string, salonId?: string): Promise<Message[]>;

  /**
   * Find messages by status
   * @param status - Message status
   * @param salonId - Optional salon ID filter
   * @returns Array of messages
   */
  findByStatus(status: string, salonId?: string): Promise<Message[]>;

  /**
   * Find message by WhatsApp ID
   * @param whatsappId - WhatsApp message ID
   * @returns Message or null
   */
  findByWhatsappId(whatsappId: string): Promise<Message | null>;

  /**
   * Update message status
   * @param id - Message ID
   * @param status - New status
   * @returns Updated message
   */
  updateStatus(id: string, status: string): Promise<Message>;

  /**
   * Count messages with filters
   * @param salonId - Optional salon ID filter
   * @param filters - Additional filters
   * @returns Count of matching messages
   */
  countWithFilters(salonId?: string, filters?: MessageFilters): Promise<number>;

  /**
   * Find paginated messages with filters
   * @param salonId - Optional salon ID filter or array of salon IDs
   * @param filters - Additional filters
   * @param page - Page number
   * @param limit - Items per page
   * @returns Paginated messages
   */
  findPaginatedWithFilters(
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
  }>;

  /**
   * Calculate total cost for messages
   * @param salonId - Salon ID
   * @param startDate - Optional start date
   * @param endDate - Optional end date
   * @returns Total cost
   */
  calculateTotalCost(salonId: string, startDate?: Date, endDate?: Date): Promise<number>;
}

/**
 * Message filters
 */
export interface MessageFilters {
  phone_number?: string;
  direction?: string;
  status?: string;
  message_type?: string;
  start_date?: string | Date;
  end_date?: string | Date;
}

/**
 * Message query options
 */
export interface MessageQueryOptions {
  skip?: number;
  take?: number;
  orderBy?: any;
}
