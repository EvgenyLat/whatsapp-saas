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
import { ServicesService } from './services.service';
import {
  CreateServiceDto,
  UpdateServiceDto,
  ServiceResponseDto,
  ServiceFilterDto,
  CategoryStatsResponseDto,
} from './dto';
import { PaginatedResult } from '@common/dto/pagination.dto';

@ApiTags('Services')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new service' })
  @ApiResponse({
    status: 201,
    description: 'Service created successfully',
    type: ServiceResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - User does not own the salon' })
  async create(@Req() req: any, @Body() createServiceDto: CreateServiceDto): Promise<ServiceResponseDto> {
    return this.servicesService.create(req.user.id, createServiceDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all services with filters and pagination' })
  @ApiResponse({
    status: 200,
    description: 'Services retrieved successfully',
    type: [ServiceResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @Req() req: any,
    @Query() filters: ServiceFilterDto,
  ): Promise<PaginatedResult<ServiceResponseDto>> {
    return this.servicesService.findAll(req.user.id, req.user.role, filters);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get category statistics and aggregation' })
  @ApiQuery({
    name: 'salon_id',
    required: false,
    description: 'Salon ID (optional, defaults to user\'s first salon)',
  })
  @ApiResponse({
    status: 200,
    description: 'Category stats retrieved successfully',
    type: CategoryStatsResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - No salon found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - User does not own the salon' })
  async getCategoryStats(
    @Req() req: any,
    @Query('salon_id') salonId?: string,
  ): Promise<CategoryStatsResponseDto> {
    return this.servicesService.getCategoryStats(req.user.id, req.user.role, salonId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get service by ID with statistics' })
  @ApiParam({ name: 'id', description: 'Service ID' })
  @ApiResponse({
    status: 200,
    description: 'Service retrieved successfully',
    type: ServiceResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - User does not own the salon' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async findOne(@Req() req: any, @Param('id') id: string): Promise<ServiceResponseDto> {
    return this.servicesService.findOne(id, req.user.id, req.user.role);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update service by ID' })
  @ApiParam({ name: 'id', description: 'Service ID' })
  @ApiResponse({
    status: 200,
    description: 'Service updated successfully',
    type: ServiceResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - User does not own the salon' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() updateServiceDto: UpdateServiceDto,
  ): Promise<ServiceResponseDto> {
    return this.servicesService.update(id, req.user.id, req.user.role, updateServiceDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate service (soft delete)' })
  @ApiParam({ name: 'id', description: 'Service ID' })
  @ApiResponse({
    status: 200,
    description: 'Service deactivated successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Service deactivated successfully' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - User does not own the salon' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async remove(@Req() req: any, @Param('id') id: string): Promise<{ message: string }> {
    return this.servicesService.remove(id, req.user.id, req.user.role);
  }
}
