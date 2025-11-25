import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { SalonsModule } from '../salons/salons.module';
import { TemplatesService } from './templates.service';
import { TemplatesController } from './templates.controller';
import { TemplatesRepository } from './templates.repository';

@Module({
  imports: [DatabaseModule, forwardRef(() => SalonsModule)],
  providers: [TemplatesService, TemplatesRepository],
  controllers: [TemplatesController],
  exports: [TemplatesService, TemplatesRepository],
})
export class TemplatesModule {}
