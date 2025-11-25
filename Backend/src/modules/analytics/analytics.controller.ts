import { Controller, Get, UseGuards, Query, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { AnalyticsFilterDto, DashboardStatsDto } from './dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  @ApiResponse({ status: HttpStatus.OK, type: DashboardStatsDto })
  async getDashboardStats(@CurrentUser('id') userId: string, @CurrentUser('role') userRole: string, @Query() filters: AnalyticsFilterDto): Promise<{ success: boolean; data: DashboardStatsDto; timestamp: string }> {
    const data = await this.analyticsService.getDashboardStats(userId, userRole, filters);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }
}
