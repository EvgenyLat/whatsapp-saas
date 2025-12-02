import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { SalonsService } from './salons.service';
import { UsageTrackingService } from './services/usage-tracking.service';
import { CreateSalonDto, UpdateSalonDto, SalonResponseDto } from './dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';

@ApiTags('salons')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('salons')
export class SalonsController {
  constructor(
    private readonly salonsService: SalonsService,
    private readonly usageTracking: UsageTrackingService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new salon' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Salon created successfully',
    type: SalonResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Phone number ID already in use',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized',
  })
  async create(
    @CurrentUser('id') userId: string,
    @Body() createSalonDto: CreateSalonDto,
  ): Promise<SalonResponseDto> {
    return this.salonsService.create(userId, createSalonDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all salons (user owns or all if admin)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Salons retrieved successfully',
    type: [SalonResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized',
  })
  async findAll(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
  ): Promise<SalonResponseDto[]> {
    return this.salonsService.findAll(userId, userRole);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get salon by ID' })
  @ApiParam({ name: 'id', description: 'Salon ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Salon retrieved successfully',
    type: SalonResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Salon not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized or no access to this salon',
  })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
  ): Promise<SalonResponseDto> {
    return this.salonsService.findOne(id, userId, userRole);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update salon by ID' })
  @ApiParam({ name: 'id', description: 'Salon ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Salon updated successfully',
    type: SalonResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Salon not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Phone number ID already in use',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized or no access to this salon',
  })
  async update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Body() updateSalonDto: UpdateSalonDto,
  ): Promise<SalonResponseDto> {
    return this.salonsService.update(id, userId, userRole, updateSalonDto);
  }

  @Get(':id/usage')
  @ApiOperation({ summary: 'Get usage statistics for a salon' })
  @ApiParam({ name: 'id', description: 'Salon ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Usage statistics retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Salon not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized or no access to this salon',
  })
  async getUsageStats(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
  ) {
    // Verify user has access to this salon
    await this.salonsService.findOne(id, userId, userRole);

    // Get usage statistics
    return this.usageTracking.getUsageStats(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete salon by ID (soft delete)' })
  @ApiParam({ name: 'id', description: 'Salon ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Salon deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Salon not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized or no access to this salon',
  })
  async remove(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
  ): Promise<{ message: string }> {
    return this.salonsService.remove(id, userId, userRole);
  }
}
