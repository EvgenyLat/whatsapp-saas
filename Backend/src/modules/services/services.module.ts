import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { SalonsModule } from '../salons/salons.module';
import { ServicesService } from './services.service';
import { ServicesController } from './services.controller';
import { ServicesRepository } from './services.repository';

@Module({
  imports: [DatabaseModule, forwardRef(() => SalonsModule)],
  providers: [ServicesService, ServicesRepository],
  controllers: [ServicesController],
  exports: [ServicesService, ServicesRepository],
})
export class ServicesModule {}
