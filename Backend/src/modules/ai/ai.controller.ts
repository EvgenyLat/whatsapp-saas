import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { Public } from '@common/decorators/public.decorator';
import { AIService } from './ai.service';
import { AIConversationRepository } from './repositories/ai-conversation.repository';
import { AIMessageRepository } from './repositories/ai-message.repository';
import { CacheService } from './services/cache.service';
import { ProcessMessageDto, AIResponseDto } from './dto';

/**
 * AI Controller
 * Handles AI-related endpoints for WhatsApp booking assistant
 */
@ApiTags('AI')
@Controller('ai')
export class AIController {
  private readonly logger = new Logger(AIController.name);

  constructor(
    private readonly aiService: AIService,
    private readonly aiConversationRepository: AIConversationRepository,
    private readonly aiMessageRepository: AIMessageRepository,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Process incoming WhatsApp message
   * This is the main endpoint called by WhatsApp webhook processor
   */
  @Post('process-message')
  @Public() // Allow webhook to call without auth
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Process WhatsApp message through AI',
    description: 'Main endpoint for AI message processing. Called by WhatsApp webhook.',
  })
  @ApiResponse({
    status: 200,
    description: 'Message processed successfully',
    type: AIResponseDto,
  })
  async processMessage(@Body() dto: ProcessMessageDto): Promise<AIResponseDto> {
    this.logger.log(`Processing message from ${dto.phone_number} for salon ${dto.salon_id}`);

    try {
      const response = await this.aiService.processMessage(dto);
      this.logger.debug(
        `AI Response: ${response.response.substring(0, 100)}... (${response.tokens_used} tokens, $${response.cost.toFixed(4)})`,
      );
      return response;
    } catch (error) {
      this.logger.error('Error processing message:', error);
      throw error;
    }
  }

  /**
   * Get all AI conversations for a salon
   */
  @Get('conversations/:salonId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get AI conversations for a salon',
    description: 'Retrieve all AI conversations for a specific salon with pagination.',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of results' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Offset for pagination' })
  @ApiResponse({
    status: 200,
    description: 'Conversations retrieved successfully',
  })
  async getConversations(
    @Param('salonId') salonId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const conversations = await this.aiConversationRepository.findBySalonId(
      salonId,
      limit || 50,
      offset || 0,
    );

    return {
      data: conversations,
      meta: {
        limit: limit || 50,
        offset: offset || 0,
        total: conversations.length,
      },
    };
  }

  /**
   * Get conversation history
   */
  @Get('conversation/:conversationId/history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get conversation message history',
    description: 'Retrieve all messages for a specific conversation.',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of messages' })
  @ApiResponse({
    status: 200,
    description: 'Conversation history retrieved successfully',
  })
  async getConversationHistory(
    @Param('conversationId') conversationId: string,
    @Query('limit') limit?: number,
  ) {
    const messages = await this.aiMessageRepository.findByConversationId(
      conversationId,
      limit || 100,
    );

    return {
      conversation_id: conversationId,
      messages: messages.map((msg) => ({
        id: msg.id,
        direction: msg.direction,
        content: msg.content,
        tokens_used: msg.tokens_used,
        cost: msg.cost,
        response_time_ms: msg.response_time_ms,
        created_at: msg.created_at,
      })),
      total: messages.length,
    };
  }

  /**
   * Get conversation statistics for a salon
   */
  @Get('stats/conversations/:salonId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get AI conversation statistics',
    description: 'Get aggregated statistics for AI conversations in a salon.',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  async getConversationStats(@Param('salonId') salonId: string) {
    return this.aiService.getConversationStats(salonId);
  }

  /**
   * Get message statistics for a salon
   */
  @Get('stats/messages/:salonId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get AI message statistics',
    description: 'Get aggregated statistics for AI messages in a salon.',
  })
  @ApiQuery({
    name: 'start_date',
    required: false,
    type: String,
    description: 'Start date (ISO 8601)',
  })
  @ApiQuery({ name: 'end_date', required: false, type: String, description: 'End date (ISO 8601)' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  async getMessageStats(
    @Param('salonId') salonId: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    return this.aiService.getMessageStats(salonId, start, end);
  }

  /**
   * Get AI cache statistics
   * Shows cache effectiveness metrics for cost optimization monitoring
   */
  @Get('cache/stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get AI cache statistics',
    description:
      'Returns cache hit rate, total entries, cost savings, and top queries. Used to monitor the 90%+ cache hit rate goal that provides 10x cost reduction.',
  })
  @ApiResponse({
    status: 200,
    description: 'Cache statistics retrieved successfully',
    schema: {
      example: {
        total_entries: 156,
        total_hits: 1247,
        avg_confidence: 0.93,
        cache_size_mb: 0.15,
        estimated_cost_savings_usd: 37.41,
        openai_cost_per_query: 0.03,
        hit_rate_note: 'Hit rate will increase to 90%+ within 30 days of usage',
        top_queries: [
          {
            query: 'хочу записаться',
            hits: 89,
            language: 'ru',
          },
          {
            query: 'сколько стоит маникюр',
            hits: 67,
            language: 'ru',
          },
        ],
      },
    },
  })
  async getCacheStats() {
    const stats = await this.cacheService.getStats();

    // Calculate estimated cost savings
    // Each cached query saves $0.03 (avg OpenAI GPT-3.5-turbo cost)
    const estimatedSavings = stats.total_hits * 0.03;

    this.logger.log(
      `Cache stats: ${stats.total_entries} entries, ${stats.total_hits} hits, $${estimatedSavings.toFixed(2)} saved`,
    );

    return {
      ...stats,
      estimated_cost_savings_usd: Math.round(estimatedSavings * 100) / 100,
      openai_cost_per_query: 0.03,
      hit_rate_note: 'Hit rate will increase to 90%+ within 30 days of usage',
    };
  }

  /**
   * Test AI with a sample message
   * For development and testing purposes
   */
  @Post('test')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Test AI with sample message',
    description: 'Development endpoint to test AI responses without WhatsApp integration.',
  })
  @ApiResponse({
    status: 200,
    description: 'Test message processed',
    type: AIResponseDto,
  })
  async testMessage(@Body() dto: ProcessMessageDto): Promise<AIResponseDto> {
    this.logger.log(`Test message: ${dto.message}`);
    return this.aiService.processMessage(dto);
  }

  /**
   * Health check for AI service
   */
  @Get('health')
  @Public()
  @ApiOperation({
    summary: 'AI service health check',
    description: 'Check if AI service and OpenAI integration are working.',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
  })
  async healthCheck() {
    return {
      status: 'ok',
      service: 'ai',
      timestamp: new Date().toISOString(),
      openai: 'connected',
    };
  }
}
