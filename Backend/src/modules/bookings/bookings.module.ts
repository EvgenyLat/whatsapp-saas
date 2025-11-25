import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { SalonsModule } from '../salons/salons.module';
import { RemindersModule } from '../reminders/reminders.module';
import { MastersModule } from '../masters/masters.module';
import { ServicesModule } from '../services/services.module';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { BookingsRepository } from './bookings.repository';

@Module({
  imports: [
    DatabaseModule,
    forwardRef(() => SalonsModule),
    forwardRef(() => RemindersModule),
    forwardRef(() => MastersModule),
    forwardRef(() => ServicesModule),
  ],
  providers: [BookingsService, BookingsRepository],
  controllers: [BookingsController],
  exports: [BookingsService, BookingsRepository],
})
export class BookingsModule {}
