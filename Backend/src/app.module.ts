import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { CacheModule } from './modules/cache/cache.module';
import { QueueModule } from './modules/queue/queue.module';
import { AuthModule } from './modules/auth/auth.module';
import { SalonsModule } from './modules/salons/salons.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { MastersModule } from './modules/masters/masters.module';
import { ServicesModule } from './modules/services/services.module';
import { MessagesModule } from './modules/messages/messages.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { WhatsAppModule } from './modules/whatsapp/whatsapp.module';
import { AIModule } from './modules/ai/ai.module';
import { RemindersModule } from './modules/reminders/reminders.module';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import whatsappConfig from './config/whatsapp.config';
import cacheConfig from './config/cache.config';
import queueConfig from './config/queue.config';
import { validateEnvironment } from './common/config/env.validation';

@Module({
  imports: [
    // Configuration module - loads .env files
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig, whatsappConfig, cacheConfig, queueConfig],
      envFilePath: [`.env.${process.env.NODE_ENV || 'development'}`, '.env'],
      cache: true,
      validate: validateEnvironment,
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 seconds
        limit: 100, // 100 requests per minute
      },
    ]),

    // Database module with Prisma
    DatabaseModule,

    // Redis cache module (global)
    CacheModule,

    // BullMQ queue module (global)
    QueueModule,

    // Feature modules
    AuthModule,
    SalonsModule,
    BookingsModule,
    MastersModule,
    ServicesModule,
    MessagesModule,
    TemplatesModule,
    ConversationsModule,
    AnalyticsModule,
    WhatsAppModule,
    AIModule,
    RemindersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
