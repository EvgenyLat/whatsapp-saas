import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { MastersService } from './masters.service';
import {
  CreateMasterDto,
  UpdateMasterDto,
  MasterResponseDto,
  MasterFilterDto,
  MasterScheduleDto,
  MasterAvailabilityDto,
  MasterAvailabilityQueryDto,
} from './dto';
import { PaginatedResult } from '@common/dto/pagination.dto';

@ApiTags('Masters')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('masters')
export class MastersController {
  constructor(private readonly mastersService: MastersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new master' })
  @ApiResponse({
    status: 201,
    description: 'Master created successfully',
    type: MasterResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - User does not own the salon' })
  async create(
    @Req() req: any,
    @Body() createMasterDto: CreateMasterDto,
  ): Promise<MasterResponseDto> {
    return this.mastersService.create(req.user.id, createMasterDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all masters with filters and pagination' })
  @ApiResponse({
    status: 200,
    description: 'Masters retrieved successfully',
    type: [MasterResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @Req() req: any,
    @Query() filters: MasterFilterDto,
  ): Promise<PaginatedResult<MasterResponseDto>> {
    return this.mastersService.findAll(req.user.id, req.user.role, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get master by ID with statistics' })
  @ApiParam({ name: 'id', description: 'Master ID' })
  @ApiResponse({
    status: 200,
    description: 'Master retrieved successfully',
    type: MasterResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - User does not own the salon' })
  @ApiResponse({ status: 404, description: 'Master not found' })
  async findOne(@Req() req: any, @Param('id') id: string): Promise<MasterResponseDto> {
    return this.mastersService.findOne(id, req.user.id, req.user.role);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update master by ID' })
  @ApiParam({ name: 'id', description: 'Master ID' })
  @ApiResponse({
    status: 200,
    description: 'Master updated successfully',
    type: MasterResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - User does not own the salon' })
  @ApiResponse({ status: 404, description: 'Master not found' })
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() updateMasterDto: UpdateMasterDto,
  ): Promise<MasterResponseDto> {
    return this.mastersService.update(id, req.user.id, req.user.role, updateMasterDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate master (soft delete)' })
  @ApiParam({ name: 'id', description: 'Master ID' })
  @ApiResponse({
    status: 200,
    description: 'Master deactivated successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Master deactivated successfully' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - User does not own the salon' })
  @ApiResponse({ status: 404, description: 'Master not found' })
  async remove(@Req() req: any, @Param('id') id: string): Promise<{ message: string }> {
    return this.mastersService.remove(id, req.user.id, req.user.role);
  }

  @Get(':id/schedule')
  @ApiOperation({ summary: 'Get master weekly schedule with bookings' })
  @ApiParam({ name: 'id', description: 'Master ID' })
  @ApiQuery({
    name: 'week_start',
    description: 'Week start date (YYYY-MM-DD)',
    example: '2024-12-23',
  })
  @ApiResponse({
    status: 200,
    description: 'Schedule retrieved successfully',
    type: MasterScheduleDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid date format' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - User does not own the salon' })
  @ApiResponse({ status: 404, description: 'Master not found' })
  async getSchedule(
    @Req() req: any,
    @Param('id') id: string,
    @Query('week_start') weekStart: string,
  ): Promise<MasterScheduleDto> {
    return this.mastersService.getSchedule(id, req.user.id, req.user.role, weekStart);
  }

  @Get(':id/availability')
  @ApiOperation({ summary: 'Get master available time slots for a specific date' })
  @ApiParam({ name: 'id', description: 'Master ID' })
  @ApiResponse({
    status: 200,
    description: 'Availability retrieved successfully',
    type: MasterAvailabilityDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid parameters' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - User does not own the salon' })
  @ApiResponse({ status: 404, description: 'Master not found' })
  async getAvailability(
    @Req() req: any,
    @Param('id') id: string,
    @Query() query: MasterAvailabilityQueryDto,
  ): Promise<MasterAvailabilityDto> {
    return this.mastersService.getAvailability(
      id,
      req.user.id,
      req.user.role,
      query.date,
      query.duration_minutes,
    );
  }
}
