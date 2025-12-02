import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { SalonsService } from '../salons/salons.service';
import {
  SendMessageDto,
  MessageFilterDto,
  UpdateMessageStatusDto,
  MessageResponseDto,
  MessageDirection,
  MessageStatus,
} from './dto';
import { PaginatedResult } from '@common/dto/pagination.dto';
import { MessagesRepository } from './messages.repository';

@Injectable()
export class MessagesService {
  constructor(
    private readonly messagesRepository: MessagesRepository,
    @Inject(forwardRef(() => SalonsService))
    private readonly salonsService: SalonsService,
  ) {}

  async sendMessage(userId: string, sendMessageDto: SendMessageDto): Promise<MessageResponseDto> {
    await this.salonsService.verifySalonOwnership(sendMessageDto.salon_id, userId);

    const message = await this.messagesRepository.create({
      salon_id: sendMessageDto.salon_id,
      direction: MessageDirection.OUTBOUND,
      conversation_id: sendMessageDto.conversation_id || null,
      phone_number: sendMessageDto.phone_number,
      message_type: sendMessageDto.message_type,
      content: sendMessageDto.content,
      status: MessageStatus.SENT,
      cost: sendMessageDto.cost || 0,
    });

    return new MessageResponseDto(message);
  }

  async findAll(
    userId: string,
    userRole: string,
    filters: MessageFilterDto,
  ): Promise<PaginatedResult<MessageResponseDto>> {
    let salonId: string | string[] | null = null;

    if (filters.salon_id) {
      if (userRole !== 'SUPER_ADMIN') {
        await this.salonsService.verifySalonOwnership(filters.salon_id, userId);
      }
      salonId = filters.salon_id;
    } else if (userRole !== 'SUPER_ADMIN') {
      const userSalons = await this.salonsService.findAll(userId, userRole);
      salonId = userSalons.map((s) => s.id);
    }

    const messageFilters = {
      phone_number: filters.phone_number,
      direction: filters.direction,
      status: filters.status,
      start_date: filters.start_date,
      end_date: filters.end_date,
    };

    const result = await this.messagesRepository.findPaginatedWithFilters(
      salonId,
      messageFilters,
      filters.page || 1,
      filters.limit || 10,
    );

    return {
      data: result.data.map((m) => new MessageResponseDto(m)),
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    };
  }

  async findOne(id: string, userId: string, userRole: string): Promise<MessageResponseDto> {
    const message = await this.messagesRepository.findById(id);

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (userRole !== 'SUPER_ADMIN') {
      await this.salonsService.verifySalonOwnership(message.salon_id, userId);
    }

    return new MessageResponseDto(message);
  }

  async updateStatus(
    id: string,
    userId: string,
    userRole: string,
    updateStatusDto: UpdateMessageStatusDto,
  ): Promise<MessageResponseDto> {
    await this.findOne(id, userId, userRole);

    const updatedMessage = await this.messagesRepository.updateStatus(id, updateStatusDto.status);

    return new MessageResponseDto(updatedMessage);
  }
}
