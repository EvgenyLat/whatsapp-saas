import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { SalonsService } from '../salons/salons.service';
import { ConversationResponseDto, UpdateConversationStatusDto } from './dto';
import { ConversationsRepository } from './conversations.repository';

@Injectable()
export class ConversationsService {
  constructor(
    private readonly conversationsRepository: ConversationsRepository,
    @Inject(forwardRef(() => SalonsService))
    private readonly salonsService: SalonsService,
  ) {}

  async findAll(userId: string, userRole: string, salonId?: string): Promise<ConversationResponseDto[]> {
    let conversations;

    if (salonId) {
      if (userRole !== 'SUPER_ADMIN') {
        await this.salonsService.verifySalonOwnership(salonId, userId);
      }
      conversations = await this.conversationsRepository.findBySalonId(salonId);
    } else if (userRole !== 'SUPER_ADMIN') {
      const userSalons = await this.salonsService.findAll(userId, userRole);
      const salonIds = userSalons.map((s) => s.id);
      conversations = await this.conversationsRepository.findByMultipleSalonIds(salonIds);
    } else {
      conversations = await this.conversationsRepository.findAll({}, { orderBy: { last_message_at: 'desc' } });
    }

    return conversations.map((c) => new ConversationResponseDto(c));
  }

  async findOne(id: string, userId: string, userRole: string): Promise<ConversationResponseDto> {
    const conversation = await this.conversationsRepository.findById(id);

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (userRole !== 'SUPER_ADMIN') {
      await this.salonsService.verifySalonOwnership(conversation.salon_id, userId);
    }

    return new ConversationResponseDto(conversation);
  }

  async updateStatus(id: string, userId: string, userRole: string, updateStatusDto: UpdateConversationStatusDto): Promise<ConversationResponseDto> {
    await this.findOne(id, userId, userRole);

    const updatedConversation = await this.conversationsRepository.updateStatus(id, updateStatusDto.status);

    return new ConversationResponseDto(updatedConversation);
  }
}
