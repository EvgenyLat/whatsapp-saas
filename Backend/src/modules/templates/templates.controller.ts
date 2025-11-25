import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto, UpdateTemplateDto, TemplateResponseDto } from './dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';

@ApiTags('templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new template' })
  @ApiResponse({ status: HttpStatus.CREATED, type: TemplateResponseDto })
  async create(@CurrentUser('id') userId: string, @Body() createTemplateDto: CreateTemplateDto): Promise<TemplateResponseDto> {
    return this.templatesService.create(userId, createTemplateDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all templates' })
  @ApiQuery({ name: 'salon_id', required: false })
  @ApiResponse({ status: HttpStatus.OK, type: [TemplateResponseDto] })
  async findAll(@CurrentUser('id') userId: string, @CurrentUser('role') userRole: string, @Query('salon_id') salonId?: string): Promise<TemplateResponseDto[]> {
    return this.templatesService.findAll(userId, userRole, salonId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get template by ID' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: HttpStatus.OK, type: TemplateResponseDto })
  async findOne(@Param('id') id: string, @CurrentUser('id') userId: string, @CurrentUser('role') userRole: string): Promise<TemplateResponseDto> {
    return this.templatesService.findOne(id, userId, userRole);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update template' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: HttpStatus.OK, type: TemplateResponseDto })
  async update(@Param('id') id: string, @CurrentUser('id') userId: string, @CurrentUser('role') userRole: string, @Body() updateTemplateDto: UpdateTemplateDto): Promise<TemplateResponseDto> {
    return this.templatesService.update(id, userId, userRole, updateTemplateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete template' })
  @ApiParam({ name: 'id' })
  async remove(@Param('id') id: string, @CurrentUser('id') userId: string, @CurrentUser('role') userRole: string): Promise<{ message: string }> {
    return this.templatesService.remove(id, userId, userRole);
  }
}
