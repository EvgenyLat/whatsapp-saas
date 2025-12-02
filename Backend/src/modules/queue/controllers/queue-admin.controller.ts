import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { QueueService } from '../queue.service';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';

@ApiTags('queue-admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin/queue')
export class QueueAdminController {
  constructor(private readonly queueService: QueueService) {}

  @Get('stats/:queueName')
  @ApiOperation({ summary: 'Get queue statistics' })
  @ApiResponse({ status: 200, description: 'Queue statistics retrieved successfully' })
  async getQueueStats(@Param('queueName') queueName: string) {
    const stats = await this.queueService.getQueueStats(queueName);
    return {
      success: true,
      data: stats,
    };
  }

  @Post('pause/:queueName')
  @ApiOperation({ summary: 'Pause a queue' })
  @ApiResponse({ status: 200, description: 'Queue paused successfully' })
  async pauseQueue(@Param('queueName') queueName: string) {
    await this.queueService.pauseQueue(queueName);
    return {
      success: true,
      message: `Queue ${queueName} has been paused`,
    };
  }

  @Post('resume/:queueName')
  @ApiOperation({ summary: 'Resume a queue' })
  @ApiResponse({ status: 200, description: 'Queue resumed successfully' })
  async resumeQueue(@Param('queueName') queueName: string) {
    await this.queueService.resumeQueue(queueName);
    return {
      success: true,
      message: `Queue ${queueName} has been resumed`,
    };
  }

  @Post('clean/:queueName')
  @ApiOperation({ summary: 'Clean old jobs from queue' })
  @ApiResponse({ status: 200, description: 'Queue cleaned successfully' })
  async cleanQueue(
    @Param('queueName') queueName: string,
    @Query('grace') grace?: number,
    @Query('status') status?: 'completed' | 'failed',
  ) {
    const cleaned = await this.queueService.cleanQueue(queueName, grace, status);
    return {
      success: true,
      message: `Cleaned ${cleaned.length} jobs from ${queueName}`,
      jobIds: cleaned,
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Check queue system health' })
  @ApiResponse({ status: 200, description: 'Queue system is healthy' })
  async healthCheck() {
    const queues = ['webhook', 'message-status', 'booking-reminder', 'email'];
    const stats = await Promise.all(queues.map((q) => this.queueService.getQueueStats(q)));

    const healthy = stats.every((s) => s.failed < 100 && s.active < 1000);

    return {
      success: true,
      healthy,
      queues: stats,
      timestamp: new Date().toISOString(),
    };
  }
}
