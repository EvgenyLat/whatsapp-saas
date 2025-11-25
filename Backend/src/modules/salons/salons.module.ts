import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { SalonsService } from './salons.service';
import { SalonsController } from './salons.controller';
import { SalonsRepository } from './salons.repository';
import { UsageTrackingService } from './services/usage-tracking.service';

@Module({
  imports: [DatabaseModule],
  providers: [SalonsService, SalonsRepository, UsageTrackingService],
  controllers: [SalonsController],
  exports: [SalonsService, SalonsRepository, UsageTrackingService],
})
export class SalonsModule {}
