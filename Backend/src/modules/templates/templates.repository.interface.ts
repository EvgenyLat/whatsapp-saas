import { Template } from '@prisma/client';
import { IBaseRepository } from '@common/repositories';

/**
 * Templates Repository Interface
 * Defines template-specific data access methods
 */
export interface ITemplatesRepository extends IBaseRepository<Template> {
  /**
   * Find templates by salon ID
   * @param salonId - Salon ID
   * @param orderBy - Sort order
   * @returns Array of templates
   */
  findBySalonId(salonId: string, orderBy?: any): Promise<Template[]>;

  /**
   * Find templates by multiple salon IDs
   * @param salonIds - Array of salon IDs
   * @param orderBy - Sort order
   * @returns Array of templates
   */
  findByMultipleSalonIds(salonIds: string[], orderBy?: any): Promise<Template[]>;

  /**
   * Find template by name, salon ID, and language
   * @param name - Template name
   * @param salonId - Salon ID
   * @param language - Template language
   * @returns Template or null
   */
  findByNameSalonIdAndLanguage(
    name: string,
    salonId: string,
    language: string,
  ): Promise<Template | null>;

  /**
   * Find templates by status
   * @param status - Template status (PENDING, APPROVED, REJECTED)
   * @param salonId - Optional salon ID filter
   * @returns Array of templates
   */
  findByStatus(status: string, salonId?: string): Promise<Template[]>;

  /**
   * Find templates by category
   * @param category - Template category
   * @param salonId - Optional salon ID filter
   * @returns Array of templates
   */
  findByCategory(category: string, salonId?: string): Promise<Template[]>;

  /**
   * Find approved templates by salon ID
   * @param salonId - Salon ID
   * @returns Array of approved templates
   */
  findApprovedBySalonId(salonId: string): Promise<Template[]>;

  /**
   * Update template status
   * @param id - Template ID
   * @param status - New status
   * @returns Updated template
   */
  updateStatus(id: string, status: string): Promise<Template>;

  /**
   * Check if template exists with name and language for salon
   * @param name - Template name
   * @param salonId - Salon ID
   * @param language - Template language
   * @param excludeTemplateId - Template ID to exclude from check (for updates)
   * @returns True if exists, false otherwise
   */
  existsByNameAndLanguage(
    name: string,
    salonId: string,
    language: string,
    excludeTemplateId?: string,
  ): Promise<boolean>;
}
