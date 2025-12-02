import { Controller, Get, Patch, Param, Body, UseGuards, Query, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ConversationsService } from './conversations.service';
import { ConversationResponseDto, UpdateConversationStatusDto } from './dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';

@ApiTags('conversations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all conversations' })
  @ApiQuery({ name: 'salon_id', required: false })
  @ApiResponse({ status: HttpStatus.OK, type: [ConversationResponseDto] })
  async findAll(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Query('salon_id') salonId?: string,
  ): Promise<ConversationResponseDto[]> {
    return this.conversationsService.findAll(userId, userRole, salonId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get conversation by ID' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: HttpStatus.OK, type: ConversationResponseDto })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
  ): Promise<ConversationResponseDto> {
    return this.conversationsService.findOne(id, userId, userRole);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update conversation status' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: HttpStatus.OK, type: ConversationResponseDto })
  async updateStatus(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Body() updateStatusDto: UpdateConversationStatusDto,
  ): Promise<ConversationResponseDto> {
    return this.conversationsService.updateStatus(id, userId, userRole, updateStatusDto);
  }
}
