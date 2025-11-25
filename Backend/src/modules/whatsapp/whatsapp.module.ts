import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppService } from './whatsapp.service';
import { WebhookService } from './webhook.service';
import { ButtonParserService } from './interactive/button-parser.service';
import { ButtonHandlerService } from './interactive/button-handler.service';
import { InteractiveCardBuilder } from './interactive/interactive-message.builder';
import { WebhookSignatureValidator } from './security/webhook-signature.validator';
import { WebhookSignatureGuard } from './guards/webhook-signature.guard';
import { DatabaseModule } from '@database/database.module';
import { MessagesModule } from '../messages/messages.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { RemindersModule } from '../reminders/reminders.module';
import { AIModule } from '../ai/ai.module';
import whatsappConfig from '@config/whatsapp.config';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    ConfigModule.forFeature(whatsappConfig),
    DatabaseModule,
    forwardRef(() => MessagesModule),
    forwardRef(() => ConversationsModule),
    forwardRef(() => RemindersModule),
    forwardRef(() => AIModule), // Import AIModule for QuickBookingService
  ],
  controllers: [WhatsAppController],
  providers: [
    WhatsAppService,
    WebhookService,
    ButtonParserService,
    ButtonHandlerService,
    InteractiveCardBuilder,
    WebhookSignatureValidator,
    WebhookSignatureGuard,
  ],
  exports: [
    WhatsAppService,
    WebhookService,
    ButtonParserService,
    ButtonHandlerService,
    InteractiveCardBuilder,
    WebhookSignatureValidator,
    WebhookSignatureGuard,
  ],
})
export class WhatsAppModule {}
