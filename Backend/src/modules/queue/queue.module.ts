import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import queueConfig from '@config/queue.config';
import { QueueService } from './queue.service';
import { WhatsappWebhookProcessor } from './processors/whatsapp-webhook.processor';
import { MessageStatusProcessor } from './processors/message-status.processor';
import { BookingReminderProcessor } from './processors/booking-reminder.processor';
import { EmailNotificationProcessor } from './processors/email-notification.processor';
import { QueueAdminController } from './controllers/queue-admin.controller';
import { BullBoardConfigModule } from './bull-board.module';
import { DatabaseModule } from '@database/database.module';
import { AIModule } from '@modules/ai/ai.module';
import { WhatsAppModule } from '@modules/whatsapp/whatsapp.module';

@Global()
@Module({
  imports: [
    ConfigModule.forFeature(queueConfig),
    AIModule,
    WhatsAppModule,

    // Configure BullMQ with Redis connection
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const queueConf = configService.get('queue');
        return {
          connection: queueConf.connection,
          defaultJobOptions: queueConf.defaultJobOptions,
        };
      },
    }),

    // Register queues
    BullModule.registerQueue(
      { name: 'whatsapp:webhook' },
      { name: 'whatsapp:message-status' },
      { name: 'booking:reminder' },
      { name: 'notification:email' },
    ),

    // Bull Board for queue monitoring UI
    BullBoardConfigModule,

    DatabaseModule,
  ],
  controllers: [QueueAdminController],
  providers: [
    QueueService,
    WhatsappWebhookProcessor,
    MessageStatusProcessor,
    BookingReminderProcessor,
    EmailNotificationProcessor,
  ],
  exports: [QueueService, BullModule],
})
export class QueueModule {}
