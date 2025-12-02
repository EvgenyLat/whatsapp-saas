import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { SalonsService } from '../salons/salons.service';
import { CreateTemplateDto, UpdateTemplateDto, TemplateResponseDto, TemplateStatus } from './dto';
import { TemplatesRepository } from './templates.repository';

@Injectable()
export class TemplatesService {
  constructor(
    private readonly templatesRepository: TemplatesRepository,
    @Inject(forwardRef(() => SalonsService))
    private readonly salonsService: SalonsService,
  ) {}

  async create(userId: string, createTemplateDto: CreateTemplateDto): Promise<TemplateResponseDto> {
    await this.salonsService.verifySalonOwnership(createTemplateDto.salon_id, userId);

    const language = createTemplateDto.language || 'ru';

    const exists = await this.templatesRepository.existsByNameAndLanguage(
      createTemplateDto.name,
      createTemplateDto.salon_id,
      language,
    );

    if (exists) {
      throw new ConflictException(
        'Template with this name and language already exists for this salon',
      );
    }

    const template = await this.templatesRepository.create({
      salon_id: createTemplateDto.salon_id,
      name: createTemplateDto.name,
      language,
      category: createTemplateDto.category,
      status: TemplateStatus.PENDING,
    });

    return new TemplateResponseDto(template);
  }

  async findAll(
    userId: string,
    userRole: string,
    salonId?: string,
  ): Promise<TemplateResponseDto[]> {
    let templates;

    if (salonId) {
      if (userRole !== 'SUPER_ADMIN') {
        await this.salonsService.verifySalonOwnership(salonId, userId);
      }
      templates = await this.templatesRepository.findBySalonId(salonId);
    } else if (userRole !== 'SUPER_ADMIN') {
      const userSalons = await this.salonsService.findAll(userId, userRole);
      const salonIds = userSalons.map((s) => s.id);
      templates = await this.templatesRepository.findByMultipleSalonIds(salonIds);
    } else {
      templates = await this.templatesRepository.findAll({}, { orderBy: { created_at: 'desc' } });
    }

    return templates.map((t) => new TemplateResponseDto(t));
  }

  async findOne(id: string, userId: string, userRole: string): Promise<TemplateResponseDto> {
    const template = await this.templatesRepository.findById(id);

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    if (userRole !== 'SUPER_ADMIN') {
      await this.salonsService.verifySalonOwnership(template.salon_id, userId);
    }

    return new TemplateResponseDto(template);
  }

  async update(
    id: string,
    userId: string,
    userRole: string,
    updateTemplateDto: UpdateTemplateDto,
  ): Promise<TemplateResponseDto> {
    await this.findOne(id, userId, userRole);

    const updatedTemplate = await this.templatesRepository.update(id, updateTemplateDto);

    return new TemplateResponseDto(updatedTemplate);
  }

  async remove(id: string, userId: string, userRole: string): Promise<{ message: string }> {
    await this.findOne(id, userId, userRole);

    await this.templatesRepository.delete(id);

    return { message: 'Template deleted successfully' };
  }
}
