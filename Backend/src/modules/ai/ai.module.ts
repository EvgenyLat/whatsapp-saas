import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseModule } from '@database/database.module';
import { BookingsModule } from '../bookings/bookings.module';
import { SalonsModule } from '../salons/salons.module';
import { ServicesModule } from '../services/services.module';
import { MastersModule } from '../masters/masters.module';
import { RemindersModule } from '../reminders/reminders.module';
import { CacheModule } from '../cache/cache.module';
import * as Redis from 'redis';
import { AIService } from './ai.service';
import { AIController } from './ai.controller';
import { AIConversationRepository } from './repositories/ai-conversation.repository';
import { AIMessageRepository } from './repositories/ai-message.repository';
import { CacheService } from './services/cache.service';
import { LanguageDetectorService } from './services/language-detector.service';
import { IntentParserService } from './services/intent-parser.service';
import { AIIntentService } from './services/ai-intent.service';
import { AlternativeSuggesterService } from './services/alternative-suggester.service';
import { MessageBuilderService } from './services/message-builder.service';
import { SessionContextService } from './services/session-context.service';
import { QuickBookingService } from './quick-booking.service';
import { ButtonParserService } from './button-parser.service';
import { InteractiveCardBuilderService } from './interactive-card-builder.service';
import { US1AnalyticsService } from './analytics/us1-analytics.service';
import { US1AnalyticsController } from './analytics/us1-analytics.controller';
import { SlotFinderService } from './services/slot-finder.service';
import OpenAI from 'openai';

/**
 * AI Module
 * Provides AI-powered WhatsApp booking assistant functionality
 *
 * Features:
 * - Natural language understanding for booking requests
 * - Service discovery and recommendation
 * - Staff availability checking and suggestions
 * - Real-time slot finding with database queries
 * - Availability checking before booking creation
 * - Conversation history management
 * - Token usage and cost tracking
 * - Integration with OpenAI GPT-4
 * - 90%+ cache hit rate for cost optimization (10x cost reduction)
 * - Multi-language support (Russian, English, Spanish, Portuguese, Hebrew)
 * - Zero-typing touch-based booking flow (Phase 3+)
 * - Interactive WhatsApp cards with buttons and lists
 */
@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    CacheModule, // Import CacheModule for Redis and cache services
    SalonsModule,
    ServicesModule,
    MastersModule,
    forwardRef(() => BookingsModule), // Use forwardRef to avoid circular dependency
    forwardRef(() => RemindersModule), // Need RemindersService for cancellation
  ],
  controllers: [AIController, US1AnalyticsController],
  providers: [
    // Redis Client Provider
    {
      provide: 'REDIS_CLIENT',
      useFactory: async (configService: ConfigService) => {
        const client = Redis.createClient({
          url: configService.get<string>('REDIS_URL') || 'redis://localhost:6379',
        });
        await client.connect();
        return client;
      },
      inject: [ConfigService],
    },
    // OpenAI Provider - Injectable for testing
    {
      provide: 'OPENAI_CLIENT',
      useFactory: (configService: ConfigService) => {
        const apiKey = configService.get<string>('OPENAI_API_KEY');
        if (!apiKey) {
          throw new Error('OPENAI_API_KEY is not configured');
        }
        return new OpenAI({ apiKey });
      },
      inject: [ConfigService],
    },
    AIService,
    AIConversationRepository,
    AIMessageRepository,
    CacheService,
    LanguageDetectorService,
    AIIntentService,
    // Quick Booking Services (Phase 3+)
    QuickBookingService,
    IntentParserService,
    ButtonParserService,
    InteractiveCardBuilderService,
    SlotFinderService,
    AlternativeSuggesterService,
    MessageBuilderService,
    SessionContextService,
    // Analytics Services
    US1AnalyticsService,
  ],
  exports: [
    'OPENAI_CLIENT',
    AIService,
    AIConversationRepository,
    AIMessageRepository,
    CacheService,
    LanguageDetectorService,
    AIIntentService,
    // Quick Booking Services
    QuickBookingService,
    IntentParserService,
    ButtonParserService,
    InteractiveCardBuilderService,
    SlotFinderService,
    AlternativeSuggesterService,
    MessageBuilderService,
    SessionContextService,
    // Analytics Services
    US1AnalyticsService,
  ],
})
export class AIModule {}
