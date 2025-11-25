import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { RemindersService } from './reminders.service';
import { RemindersController } from './reminders.controller';
import { ReminderProcessor } from './reminder.processor';

/**
 * Reminders Module
 * Handles automated booking reminders via WhatsApp
 *
 * Features:
 * - Automated reminder scheduling 24 hours before appointment
 * - WhatsApp message delivery with delivery tracking
 * - Customer response processing (confirm/cancel/reschedule)
 * - Reminder analytics and statistics
 * - BullMQ queue integration for reliable delivery
 */
@Module({
  imports: [
    // Database access for reminder CRUD operations
    DatabaseModule,

    // WhatsApp integration for sending messages
    forwardRef(() => WhatsAppModule),

    // Register BullMQ queue for reminder processing
    BullModule.registerQueue({
      name: 'reminder',
    }),
  ],
  controllers: [RemindersController],
  providers: [
    RemindersService,
    ReminderProcessor, // BullMQ processor for reminder queue
  ],
  exports: [RemindersService],
})
export class RemindersModule {}
