import { Injectable } from '@nestjs/common';
import { Salon } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { BaseRepository } from '@common/repositories';
import { ISalonsRepository } from './salons.repository.interface';

/**
 * Salons Repository
 * Handles all database operations for Salon entities
 */
@Injectable()
export class SalonsRepository extends BaseRepository<Salon> implements ISalonsRepository {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma, 'salon');
  }

  /**
   * Find salon by phone number ID
   */
  async findByPhoneNumberId(phoneNumberId: string): Promise<Salon | null> {
    return this.findOne({ phone_number_id: phoneNumberId });
  }

  /**
   * Find all salons by owner ID
   */
  async findByOwnerId(ownerId: string, orderBy: any = { created_at: 'desc' }): Promise<Salon[]> {
    return this.findAll({ owner_id: ownerId }, { orderBy });
  }

  /**
   * Find salon by ID with owner check
   */
  async findByIdAndOwnerId(id: string, ownerId: string): Promise<Salon | null> {
    return this.findOne({ id, owner_id: ownerId });
  }

  /**
   * Check if phone number ID is already in use
   */
  async isPhoneNumberIdInUse(phoneNumberId: string, excludeSalonId?: string): Promise<boolean> {
    const where: any = { phone_number_id: phoneNumberId };

    if (excludeSalonId) {
      where.id = { not: excludeSalonId };
    }

    return this.exists(where);
  }

  /**
   * Update salon active status
   */
  async updateActiveStatus(id: string, isActive: boolean): Promise<Salon> {
    return this.update(id, { is_active: isActive } as any);
  }

  /**
   * Find all active salons
   */
  async findAllActive(ownerId?: string): Promise<Salon[]> {
    const where: any = { is_active: true };

    if (ownerId) {
      where.owner_id = ownerId;
    }

    return this.findAll(where, { orderBy: { created_at: 'desc' } });
  }
}
