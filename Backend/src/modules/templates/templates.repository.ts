import { Injectable } from '@nestjs/common';
import { Template } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { BaseRepository } from '@common/repositories';
import { ITemplatesRepository } from './templates.repository.interface';

/**
 * Templates Repository
 * Handles all database operations for Template entities
 */
@Injectable()
export class TemplatesRepository extends BaseRepository<Template> implements ITemplatesRepository {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma, 'template');
  }

  /**
   * Find templates by salon ID
   */
  async findBySalonId(salonId: string, orderBy: any = { created_at: 'desc' }): Promise<Template[]> {
    return this.findAll({ salon_id: salonId }, { orderBy });
  }

  /**
   * Find templates by multiple salon IDs
   */
  async findByMultipleSalonIds(
    salonIds: string[],
    orderBy: any = { created_at: 'desc' },
  ): Promise<Template[]> {
    return this.findAll({ salon_id: { in: salonIds } }, { orderBy });
  }

  /**
   * Find template by name, salon ID, and language
   */
  async findByNameSalonIdAndLanguage(
    name: string,
    salonId: string,
    language: string,
  ): Promise<Template | null> {
    return this.findFirst({
      name,
      salon_id: salonId,
      language,
    });
  }

  /**
   * Find templates by status
   */
  async findByStatus(status: string, salonId?: string): Promise<Template[]> {
    const where: any = { status };

    if (salonId) {
      where.salon_id = salonId;
    }

    return this.findAll(where, { orderBy: { created_at: 'desc' } });
  }

  /**
   * Find templates by category
   */
  async findByCategory(category: string, salonId?: string): Promise<Template[]> {
    const where: any = { category };

    if (salonId) {
      where.salon_id = salonId;
    }

    return this.findAll(where, { orderBy: { created_at: 'desc' } });
  }

  /**
   * Find approved templates by salon ID
   */
  async findApprovedBySalonId(salonId: string): Promise<Template[]> {
    return this.findAll(
      {
        salon_id: salonId,
        status: 'APPROVED',
      },
      { orderBy: { name: 'asc' } },
    );
  }

  /**
   * Update template status
   */
  async updateStatus(id: string, status: string): Promise<Template> {
    return this.update(id, { status } as any);
  }

  /**
   * Check if template exists with name and language for salon
   */
  async existsByNameAndLanguage(
    name: string,
    salonId: string,
    language: string,
    excludeTemplateId?: string,
  ): Promise<boolean> {
    const where: any = {
      name,
      salon_id: salonId,
      language,
    };

    if (excludeTemplateId) {
      where.id = { not: excludeTemplateId };
    }

    return this.exists(where);
  }
}
