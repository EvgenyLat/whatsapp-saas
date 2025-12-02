import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { CreateSalonDto, UpdateSalonDto, SalonResponseDto } from './dto';
import { SalonsRepository } from './salons.repository';

@Injectable()
export class SalonsService {
  constructor(private readonly salonsRepository: SalonsRepository) {}

  /**
   * Create a new salon for the current user
   */
  async create(userId: string, createSalonDto: CreateSalonDto): Promise<SalonResponseDto> {
    // Check if phone_number_id is already in use
    const isInUse = await this.salonsRepository.isPhoneNumberIdInUse(
      createSalonDto.phone_number_id,
    );

    if (isInUse) {
      throw new ConflictException('Phone number ID is already in use by another salon');
    }

    // Create salon
    const salon = await this.salonsRepository.create({
      name: createSalonDto.name,
      address: createSalonDto.address,
      phone_number_id: createSalonDto.phone_number_id,
      access_token: createSalonDto.access_token,
      is_active: createSalonDto.is_active ?? true,
      owner_id: userId,
      working_hours_start: createSalonDto.working_hours_start || '09:00',
      working_hours_end: createSalonDto.working_hours_end || '20:00',
      slot_duration_minutes: createSalonDto.slot_duration_minutes || 30,
    });

    return new SalonResponseDto(salon);
  }

  /**
   * Get all salons for the current user (or all salons for admin)
   */
  async findAll(userId: string, userRole: string): Promise<SalonResponseDto[]> {
    let salons;

    if (userRole === 'SUPER_ADMIN') {
      salons = await this.salonsRepository.findAll({}, { orderBy: { created_at: 'desc' } });
    } else {
      salons = await this.salonsRepository.findByOwnerId(userId);
    }

    return salons.map((salon) => new SalonResponseDto(salon));
  }

  /**
   * Get a single salon by ID
   */
  async findOne(id: string, userId: string, userRole: string): Promise<SalonResponseDto> {
    const salon = await this.salonsRepository.findById(id);

    if (!salon) {
      throw new NotFoundException('Salon not found');
    }

    // Check ownership (unless admin)
    if (userRole !== 'SUPER_ADMIN' && salon.owner_id !== userId) {
      throw new UnauthorizedException('You do not have access to this salon');
    }

    return new SalonResponseDto(salon);
  }

  /**
   * Update salon by ID
   */
  async update(
    id: string,
    userId: string,
    userRole: string,
    updateSalonDto: UpdateSalonDto,
  ): Promise<SalonResponseDto> {
    // Check if salon exists and user has access
    const salon = await this.findOne(id, userId, userRole);

    // If updating phone_number_id, check for conflicts
    if (
      updateSalonDto.phone_number_id &&
      updateSalonDto.phone_number_id !== salon.phone_number_id
    ) {
      const isInUse = await this.salonsRepository.isPhoneNumberIdInUse(
        updateSalonDto.phone_number_id,
        id,
      );

      if (isInUse) {
        throw new ConflictException('Phone number ID is already in use by another salon');
      }
    }

    // Update salon
    const updatedSalon = await this.salonsRepository.update(id, {
      ...(updateSalonDto.name && { name: updateSalonDto.name }),
      ...(updateSalonDto.address !== undefined && { address: updateSalonDto.address }),
      ...(updateSalonDto.phone_number_id && { phone_number_id: updateSalonDto.phone_number_id }),
      ...(updateSalonDto.access_token && { access_token: updateSalonDto.access_token }),
      ...(updateSalonDto.is_active !== undefined && { is_active: updateSalonDto.is_active }),
      ...(updateSalonDto.working_hours_start !== undefined && {
        working_hours_start: updateSalonDto.working_hours_start,
      }),
      ...(updateSalonDto.working_hours_end !== undefined && {
        working_hours_end: updateSalonDto.working_hours_end,
      }),
      ...(updateSalonDto.slot_duration_minutes !== undefined && {
        slot_duration_minutes: updateSalonDto.slot_duration_minutes,
      }),
    });

    return new SalonResponseDto(updatedSalon);
  }

  /**
   * Delete (soft delete) salon by ID
   */
  async remove(id: string, userId: string, userRole: string): Promise<{ message: string }> {
    // Check if salon exists and user has access
    await this.findOne(id, userId, userRole);

    // Soft delete by marking as inactive
    await this.salonsRepository.updateActiveStatus(id, false);

    return { message: 'Salon deleted successfully' };
  }

  /**
   * Helper method to verify salon ownership
   */
  async verifySalonOwnership(salonId: string, userId: string): Promise<void> {
    const salon = await this.salonsRepository.findById(salonId);

    if (!salon) {
      throw new NotFoundException('Salon not found');
    }

    if (salon.owner_id !== userId) {
      throw new UnauthorizedException('You do not have access to this salon');
    }
  }
}
