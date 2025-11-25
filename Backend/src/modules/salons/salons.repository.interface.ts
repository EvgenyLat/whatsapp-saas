import { Salon } from '@prisma/client';
import { IBaseRepository } from '@common/repositories';

/**
 * Salons Repository Interface
 * Defines salon-specific data access methods
 */
export interface ISalonsRepository extends IBaseRepository<Salon> {
  /**
   * Find salon by phone number ID
   * @param phoneNumberId - WhatsApp phone number ID
   * @returns Salon or null
   */
  findByPhoneNumberId(phoneNumberId: string): Promise<Salon | null>;

  /**
   * Find all salons by owner ID
   * @param ownerId - Owner user ID
   * @param orderBy - Sort order
   * @returns Array of salons
   */
  findByOwnerId(ownerId: string, orderBy?: any): Promise<Salon[]>;

  /**
   * Find salon by ID with owner check
   * @param id - Salon ID
   * @param ownerId - Owner user ID to verify ownership
   * @returns Salon or null
   */
  findByIdAndOwnerId(id: string, ownerId: string): Promise<Salon | null>;

  /**
   * Check if phone number ID is already in use
   * @param phoneNumberId - WhatsApp phone number ID
   * @param excludeSalonId - Salon ID to exclude from check (for updates)
   * @returns True if in use, false otherwise
   */
  isPhoneNumberIdInUse(phoneNumberId: string, excludeSalonId?: string): Promise<boolean>;

  /**
   * Update salon active status
   * @param id - Salon ID
   * @param isActive - Active status
   * @returns Updated salon
   */
  updateActiveStatus(id: string, isActive: boolean): Promise<Salon>;

  /**
   * Find all active salons
   * @param ownerId - Optional owner ID filter
   * @returns Array of active salons
   */
  findAllActive(ownerId?: string): Promise<Salon[]>;
}
