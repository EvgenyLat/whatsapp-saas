import { ApiProperty } from '@nestjs/swagger';
import { Template } from '@prisma/client';

export class TemplateResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() salon_id: string;
  @ApiProperty() name: string;
  @ApiProperty() language: string;
  @ApiProperty() category: string;
  @ApiProperty() status: string;
  @ApiProperty() created_at: Date;
  @ApiProperty() updated_at: Date;

  constructor(template: Template) {
    this.id = template.id;
    this.salon_id = template.salon_id;
    this.name = template.name;
    this.language = template.language;
    this.category = template.category;
    this.status = template.status;
    this.created_at = template.created_at;
    this.updated_at = template.updated_at;
  }
}
