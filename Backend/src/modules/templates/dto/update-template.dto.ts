import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TemplateStatus } from './create-template.dto';

export class UpdateTemplateDto {
  @ApiPropertyOptional({ example: 'booking_confirmation' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'ru' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ example: 'MARKETING' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ enum: TemplateStatus })
  @IsOptional()
  @IsEnum(TemplateStatus)
  status?: TemplateStatus;
}
