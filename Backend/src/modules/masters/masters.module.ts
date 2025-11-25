import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { SalonsModule } from '../salons/salons.module';
import { MastersService } from './masters.service';
import { MastersController } from './masters.controller';
import { MastersRepository } from './masters.repository';

@Module({
  imports: [DatabaseModule, forwardRef(() => SalonsModule)],
  providers: [MastersService, MastersRepository],
  controllers: [MastersController],
  exports: [MastersService, MastersRepository],
})
export class MastersModule {}
