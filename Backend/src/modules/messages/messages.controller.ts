import { Controller, Get, Post, Body, Patch, Param, UseGuards, Query, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { SendMessageDto, MessageFilterDto, UpdateMessageStatusDto, MessageResponseDto } from './dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { PaginatedResult } from '@common/dto/pagination.dto';

@ApiTags('messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  @ApiOperation({ summary: 'Send a new message' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Message sent successfully', type: MessageResponseDto })
  async sendMessage(@CurrentUser('id') userId: string, @Body() sendMessageDto: SendMessageDto): Promise<MessageResponseDto> {
    return this.messagesService.sendMessage(userId, sendMessageDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all messages with filters and pagination' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Messages retrieved successfully' })
  async findAll(@CurrentUser('id') userId: string, @CurrentUser('role') userRole: string, @Query() filters: MessageFilterDto): Promise<PaginatedResult<MessageResponseDto>> {
    return this.messagesService.findAll(userId, userRole, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get message by ID' })
  @ApiParam({ name: 'id', description: 'Message ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Message retrieved successfully', type: MessageResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Message not found' })
  async findOne(@Param('id') id: string, @CurrentUser('id') userId: string, @CurrentUser('role') userRole: string): Promise<MessageResponseDto> {
    return this.messagesService.findOne(id, userId, userRole);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update message status' })
  @ApiParam({ name: 'id', description: 'Message ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Message status updated successfully', type: MessageResponseDto })
  async updateStatus(@Param('id') id: string, @CurrentUser('id') userId: string, @CurrentUser('role') userRole: string, @Body() updateStatusDto: UpdateMessageStatusDto): Promise<MessageResponseDto> {
    return this.messagesService.updateStatus(id, userId, userRole, updateStatusDto);
  }
}
