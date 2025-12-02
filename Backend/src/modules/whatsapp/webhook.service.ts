import { Injectable, Logger, Inject, forwardRef, ConflictException } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { WhatsAppWebhookPayload, WhatsAppMessage, WhatsAppStatus } from './interfaces';
import { WhatsAppService } from './whatsapp.service';
import { RemindersService } from '../reminders/reminders.service';
import { ButtonParserService } from './interactive/button-parser.service';
import { ButtonHandlerService } from './interactive/button-handler.service';
import { QuickBookingService } from '../ai/quick-booking.service';
import { LanguageDetectorService } from '../ai/services/language-detector.service';
import { AIIntentService } from '../ai/services/ai-intent.service';
import { IntentType } from '../ai/types/intent.types';
import {
  Message,
  isInteractiveMessage,
  isButtonReply,
  isListReply,
} from '../../types/whatsapp.types';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => WhatsAppService))
    private readonly whatsappService: WhatsAppService,
    @Inject(forwardRef(() => RemindersService))
    private readonly remindersService: RemindersService,
    private readonly buttonParserService: ButtonParserService,
    private readonly buttonHandlerService: ButtonHandlerService,
    @Inject(forwardRef(() => QuickBookingService))
    private readonly quickBookingService: QuickBookingService,
    private readonly languageDetector: LanguageDetectorService,
    private readonly aiIntentService: AIIntentService,
  ) {}

  async processWebhook(payload: WhatsAppWebhookPayload): Promise<void> {
    this.logger.log('Processing WhatsApp webhook event');

    try {
      for (const entry of payload.entry) {
        for (const change of entry.changes) {
          const { value, field } = change;

          if (field !== 'messages') {
            continue;
          }

          const phoneNumberId = value.metadata.phone_number_id;

          const salon = await this.findSalonByPhoneNumberId(phoneNumberId);
          if (!salon) {
            this.logger.warn(`Salon not found for phone_number_id: ${phoneNumberId}`);
            await this.logWebhook(null, 'messages', payload, 'FAILED', 'Salon not found');
            continue;
          }

          if (value.messages) {
            for (const message of value.messages) {
              await this.processIncomingMessage(salon.id, message);
            }
          }

          if (value.statuses) {
            for (const status of value.statuses) {
              await this.processStatusUpdate(salon.id, status);
            }
          }

          await this.logWebhook(salon.id, field, payload, 'SUCCESS', null);
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to process webhook: ${(error as Error).message}`,
        (error as Error).stack,
      );
      await this.logWebhook(null, 'messages', payload, 'FAILED', (error as Error).message);
      throw error;
    }
  }

  async processIncomingMessage(salonId: string, message: WhatsAppMessage): Promise<void> {
    this.logger.log(`Processing incoming message ${message.id} for salon ${salonId}`);

    try {
      const existingMessage = await this.prisma.message.findUnique({
        where: { whatsapp_id: message.id },
      });

      if (existingMessage) {
        this.logger.log(`Message ${message.id} already processed, skipping`);
        return;
      }

      // 1. Detect language
      const languageDetection = await this.languageDetector.detect(message.text?.body || '');
      const language = languageDetection.language;

      this.logger.log(
        `Language detected: ${language} (confidence: ${languageDetection.confidence.toFixed(2)})`,
      );

      // 2. Classify message type for routing using AI-based intent classification
      const routingType = await this.classifyMessageType(message, language);

      this.logger.log(`Routing message type: ${routingType}, language: ${language}`);

      // 3. Store message in database (for all message types)
      let content = '';
      // Defensive check: handle malformed messages without a type field
      let messageType = message.type ? message.type.toUpperCase() : 'UNKNOWN';

      switch (message.type) {
        case 'text':
          content = message.text?.body || '';
          break;
        case 'image':
          content = `IMAGE: ${message.image?.id || 'Unknown'} ${message.image?.caption || ''}`;
          break;
        case 'document':
          content = `DOCUMENT: ${message.document?.filename || message.document?.id || 'Unknown'} ${message.document?.caption || ''}`;
          break;
        case 'audio':
          content = `AUDIO: ${message.audio?.id || 'Unknown'}`;
          break;
        case 'video':
          content = `VIDEO: ${message.video?.id || 'Unknown'} ${message.video?.caption || ''}`;
          break;
        case 'interactive':
          // Handle interactive message (button or list reply) - for content storage only
          content = await this.handleInteractiveMessage(salonId, message as Message);
          break;
        default:
          // Defensive check: handle malformed messages without a type field
          content = `${message.type ? message.type.toUpperCase() : 'UNKNOWN'}: ${message.id}`;
      }

      const conversation = await this.getOrCreateConversation(salonId, message.from);

      await this.prisma.message.create({
        data: {
          salon_id: salonId,
          direction: 'INBOUND',
          conversation_id: conversation.id,
          phone_number: message.from,
          message_type: messageType,
          content: content,
          whatsapp_id: message.id,
          status: 'DELIVERED',
          cost: 0,
        },
      });

      await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          last_message_at: new Date(),
          message_count: { increment: 1 },
        },
      });

      // 4. Route to appropriate handler based on message classification
      switch (routingType) {
        case 'BUTTON_CLICK':
          await this.handleButtonClick(message, language, salonId);
          break;

        case 'BOOKING_REQUEST':
          await this.handleBookingRequest(message, language, salonId);
          break;

        case 'CONVERSATION':
          await this.handleConversation(message, language, salonId);
          break;

        default:
          // Fallback to conversation handler
          await this.handleConversation(message, language, salonId);
      }

      this.logger.log(`Incoming message ${message.id} processed successfully`);
    } catch (error) {
      this.logger.error(
        `Failed to process incoming message: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  /**
   * Handles interactive message (button click or list selection)
   *
   * Parses the button/list ID and routes to the appropriate handler based on type.
   * Logs the interaction for debugging and analytics.
   *
   * @param salonId - The salon ID
   * @param message - The interactive message from WhatsApp
   * @returns Content string to store in the message record
   */
  private async handleInteractiveMessage(salonId: string, message: Message): Promise<string> {
    this.logger.log(`Processing interactive message ${message.id} for salon ${salonId}`);

    // Type guard to ensure this is an interactive message
    if (!isInteractiveMessage(message)) {
      this.logger.warn(`Message ${message.id} is not an interactive message, skipping`);
      return `INTERACTIVE: ${message.id}`;
    }

    const { interactive } = message;
    let buttonId: string;
    let buttonTitle: string;
    let interactiveType: string;

    // Extract button ID and title based on interactive type
    if (isButtonReply(interactive)) {
      buttonId = interactive.button_reply.id;
      buttonTitle = interactive.button_reply.title;
      interactiveType = 'button_reply';

      this.logger.log(
        `Button clicked: "${buttonTitle}" (ID: ${buttonId}) by customer ${message.from}`,
      );
    } else if (isListReply(interactive)) {
      buttonId = interactive.list_reply.id;
      buttonTitle = interactive.list_reply.title;
      interactiveType = 'list_reply';

      this.logger.log(
        `List item selected: "${buttonTitle}" (ID: ${buttonId}) by customer ${message.from}`,
      );
    } else {
      this.logger.warn(`Unknown interactive type for message ${message.id}: ${interactive.type}`);
      return `INTERACTIVE: ${interactive.type} - ${message.id}`;
    }

    // Detect language from button title
    let language = 'en';
    try {
      const languageDetection = await this.languageDetector.detect(buttonTitle);
      language = languageDetection.language;
      this.logger.log(`Language detected from button title: ${language}`);
    } catch (error) {
      this.logger.warn(`Failed to detect language from button title, using default: en`);
    }

    // Parse button ID to determine type and context
    try {
      const parsed = this.buttonParserService.parse(buttonId);

      this.logger.log(`Parsed button: type="${parsed.type}", data=${JSON.stringify(parsed.data)}`);

      // Route to appropriate handler based on button type with detected language
      await this.routeButtonAction(
        salonId,
        message.from,
        parsed.type,
        parsed.data,
        message.id,
        language,
      );

      // Return content string for message storage
      return `INTERACTIVE_${interactiveType.toUpperCase()}: [${parsed.type}] ${buttonTitle} (${buttonId})`;
    } catch (error) {
      this.logger.error(
        `Failed to parse button ID "${buttonId}": ${(error as Error).message}`,
        (error as Error).stack,
      );

      // Still store the message, but mark it as unparseable
      return `INTERACTIVE_ERROR: ${buttonTitle} (${buttonId}) - ${(error as Error).message}`;
    }
  }

  /**
   * Routes button action to the appropriate handler based on button type
   *
   * Integrates with QuickBookingService for the complete booking flow.
   * Routes slot selection and confirmation through ButtonHandlerService.
   *
   * @param salonId - The salon ID
   * @param customerPhone - Customer phone number
   * @param buttonType - The type of button (slot, confirm, waitlist, action, nav)
   * @param data - Parsed button data
   * @param messageId - WhatsApp message ID for logging
   * @param language - Detected language (optional, defaults to 'en')
   */
  private async routeButtonAction(
    salonId: string,
    customerPhone: string,
    buttonType: string,
    data: any,
    messageId: string,
    language: string = 'en',
  ): Promise<void> {
    this.logger.log(
      `Routing button action: type="${buttonType}", customer="${customerPhone}", messageId="${messageId}"`,
    );

    try {
      switch (buttonType) {
        case 'slot':
          // Route to ButtonHandlerService for slot selection
          this.logger.log(`Handling slot selection: ${JSON.stringify(data)}`);

          try {
            // Build button ID from parsed data
            const slotButtonId = `slot_${data.date}_${data.time}_${data.masterId}`;

            const slotResult = await this.buttonHandlerService.handleSlotSelection(
              slotButtonId,
              customerPhone,
              salonId,
              language, // Use detected language
            );

            if (slotResult.success && slotResult.card) {
              // Send confirmation card back to customer
              await this.whatsappService.sendInteractiveMessage(
                'system', // Use 'system' userId for webhook-triggered messages
                {
                  salon_id: salonId,
                  to: customerPhone,
                  interactive: slotResult.card.interactive as any,
                },
              );
            }
          } catch (error) {
            // Handle ConflictException by showing alternative slots
            if (error instanceof ConflictException) {
              this.logger.warn(
                `Slot conflict detected: ${data.date} ${data.time}. Finding alternatives...`,
              );

              // Need serviceId for alternative search - extract from session or button data
              // For now, we'll need to add serviceId to button data or retrieve from session
              // Let's retrieve from the session via QuickBookingService

              // Extract slot info from button data
              const originalDate = data.date;
              const originalTime = data.time;
              const masterId = data.masterId;

              // We need serviceId - let's get it from ButtonHandlerService session
              // For now, use a workaround by checking the database for active services
              const service = await this.prisma.service.findFirst({
                where: { salon_id: salonId, is_active: true },
              });

              if (service) {
                const alternativesResult = await this.quickBookingService.handleSlotConflict(
                  originalDate,
                  originalTime,
                  salonId,
                  service.id,
                  masterId,
                  language,
                );

                if (
                  alternativesResult.success &&
                  alternativesResult.messageType === 'interactive_card'
                ) {
                  // Send alternative slots card
                  await this.whatsappService.sendInteractiveMessage('system', {
                    salon_id: salonId,
                    to: customerPhone,
                    interactive: (alternativesResult.payload as any).interactive,
                  });
                } else {
                  // No alternatives found - send text message
                  await this.whatsappService.sendTextMessage('system', {
                    salon_id: salonId,
                    to: customerPhone,
                    text: (alternativesResult.payload as any).text,
                  });
                }
              } else {
                // Fallback: no service found
                await this.whatsappService.sendTextMessage('system', {
                  salon_id: salonId,
                  to: customerPhone,
                  text: 'Sorry, this time slot is no longer available. Please try selecting another time.',
                });
              }
            } else {
              // Re-throw other errors to be handled by outer catch block
              throw error;
            }
          }
          break;

        case 'confirm':
          // Route to ButtonHandlerService for booking confirmation
          this.logger.log(`Handling booking confirmation: ${JSON.stringify(data)}`);

          try {
            // Build button ID from parsed data
            const confirmButtonId = `confirm_${data.action}_${data.entityId}`;

            const confirmResult = await this.buttonHandlerService.handleBookingConfirmation(
              confirmButtonId,
              customerPhone,
              salonId,
              language, // Use detected language
            );

            if (confirmResult.success && confirmResult.message) {
              // Send final confirmation message to customer
              await this.whatsappService.sendTextMessage('system', {
                salon_id: salonId,
                to: customerPhone,
                text: confirmResult.message,
              });
            }
          } catch (error) {
            // Handle ConflictException during confirmation (rare but possible)
            if (error instanceof ConflictException) {
              this.logger.warn(
                `Booking conflict detected during confirmation. Slot was taken by another customer.`,
              );

              // Send apologetic message with suggestion to select another time
              await this.whatsappService.sendTextMessage('system', {
                salon_id: salonId,
                to: customerPhone,
                text: 'Sorry, this time slot was just booked by another customer. Please select a different time slot from the available options.',
              });
            } else {
              // Re-throw other errors
              throw error;
            }
          }
          break;

        case 'waitlist':
          // TODO Phase 11: Implement waitlist handler
          this.logger.log(`Waitlist button clicked: ${JSON.stringify(data)}`);
          this.logger.warn('Waitlist handler not yet implemented - Phase 11');
          break;

        case 'action':
          // Handle generic actions (change_slot, cancel, etc.)
          this.logger.log(`Action button clicked: ${JSON.stringify(data)}`);

          if (data.action === 'change_slot') {
            // Re-show slot selection
            // TODO: Retrieve original intent and show slots again
            this.logger.warn('Change slot action not yet fully implemented');
          } else {
            this.logger.warn(`Unknown action: ${data.action}`);
          }
          break;

        case 'nav':
          // TODO Phase 6: Implement navigation handler (next, prev, back)
          this.logger.log(`Navigation button clicked: ${JSON.stringify(data)}`);
          this.logger.warn('Navigation handler not yet implemented - Phase 6');
          break;

        default:
          this.logger.warn(`Unknown button type: ${buttonType}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to route button action: ${(error as Error).message}`,
        (error as Error).stack,
      );

      // Send error message to customer
      try {
        await this.whatsappService.sendTextMessage('system', {
          salon_id: salonId,
          to: customerPhone,
          text: 'Sorry, something went wrong processing your selection. Please try again or contact support.',
        });
      } catch (sendError) {
        this.logger.error(`Failed to send error message: ${(sendError as Error).message}`);
      }
    }
  }

  /**
   * Classify message type for routing using AI-based intent detection
   *
   * Determines whether message is:
   * - BUTTON_CLICK: Interactive button/list response
   * - BOOKING_REQUEST: AI-detected booking-related intents (confidence > 0.7)
   * - CONVERSATION: General conversation (fallback)
   *
   * @param message - WhatsApp message to classify
   * @param language - Detected language code
   * @returns Routing type string
   */
  private async classifyMessageType(message: WhatsAppMessage, language: string): Promise<string> {
    // Check if it's a button click response - highest priority
    if (message.type === 'interactive') {
      return 'BUTTON_CLICK';
    }

    // Only classify text messages with AI
    if (message.type !== 'text' || !message.text?.body) {
      return 'CONVERSATION';
    }

    try {
      // Use AI Intent Service for intelligent classification
      const intentResult = await this.aiIntentService.classifyIntent(message.text.body, language);

      // Log cache hit/miss info (will be visible in AIIntentService logs)
      this.logger.log(
        `AI Intent: ${intentResult.intent} (confidence: ${intentResult.confidence.toFixed(2)}, reliable: ${intentResult.isReliable})`,
      );

      // Add cache performance tracking
      if (intentResult.confidence >= 0.7) {
        this.logger.debug('Response is cache-eligible with high confidence');
      }

      // Log alternative intents for debugging
      if (intentResult.alternativeIntents.length > 0) {
        const alternatives = intentResult.alternativeIntents
          .map((alt) => `${alt.intent}:${alt.confidence.toFixed(2)}`)
          .join(', ');
        this.logger.debug(`Alternative intents: ${alternatives}`);
      }

      // Route based on AI intent classification with confidence threshold
      // Only route to booking if confidence is high enough (>0.7)
      if (intentResult.confidence >= 0.7) {
        switch (intentResult.intent) {
          case IntentType.BOOKING_REQUEST:
          case IntentType.BOOKING_MODIFY:
          case IntentType.AVAILABILITY_INQUIRY:
            this.logger.log(`Routing to BOOKING_REQUEST based on intent: ${intentResult.intent}`);
            return 'BOOKING_REQUEST';

          case IntentType.BOOKING_CANCEL:
            // Route to CONVERSATION to let AI handle cancellation naturally
            this.logger.log('Routing to CONVERSATION for cancellation handling via AI');
            return 'CONVERSATION';

          case IntentType.GREETING:
          case IntentType.HELP_REQUEST:
          case IntentType.SERVICE_INQUIRY:
          case IntentType.PRICE_INQUIRY:
          case IntentType.LOCATION_INQUIRY:
          case IntentType.FEEDBACK:
          case IntentType.THANKS:
          case IntentType.CONFIRMATION:
          case IntentType.NEGATION:
            this.logger.log(`Routing to CONVERSATION based on intent: ${intentResult.intent}`);
            return 'CONVERSATION';

          case IntentType.UNKNOWN:
          default:
            // Low confidence or unknown - route to conversation
            this.logger.debug('Intent UNKNOWN or unhandled, routing to CONVERSATION');
            return 'CONVERSATION';
        }
      }

      // Low confidence - fallback to conversation handler
      this.logger.log(
        `Low confidence (${intentResult.confidence.toFixed(2)}) - routing to CONVERSATION`,
      );
      return 'CONVERSATION';
    } catch (error) {
      this.logger.error(
        `AI intent classification failed: ${(error as Error).message}`,
        (error as Error).stack,
      );

      // Fallback to keyword-based classification if AI fails
      return this.fallbackKeywordClassification(message);
    }
  }

  /**
   * Fallback keyword-based classification (used if AI classification fails)
   *
   * @param message - WhatsApp message to classify
   * @returns Routing type string
   */
  private fallbackKeywordClassification(message: WhatsAppMessage): string {
    this.logger.warn('Using fallback keyword-based classification');

    // Check if text contains booking intent keywords
    const bookingKeywords = [
      'booking',
      'appointment',
      'reservation',
      'book',
      'запись',
      'записаться',
      'хочу',
      'нужно',
      'reserva',
      'cita',
      'agendar',
      'agendamento',
      'marcar',
      'תור',
      'לקבוע',
    ];

    const text = message.text?.body?.toLowerCase() || '';
    const hasBookingIntent = bookingKeywords.some((kw) => text.includes(kw));

    if (hasBookingIntent) {
      return 'BOOKING_REQUEST';
    }

    return 'CONVERSATION';
  }

  /**
   * Handle booking request with QuickBookingService
   *
   * Uses QuickBookingService for interactive booking flow.
   * Sends interactive card or text based on response type.
   */
  private async handleBookingRequest(
    message: WhatsAppMessage,
    language: string,
    salonId: string,
  ): Promise<void> {
    try {
      this.logger.log(`Handling booking request with unified router for ${message.from}`);

      // Use QuickBookingService for interactive booking
      const response = await this.quickBookingService.handleBookingRequest({
        text: message.text?.body || '',
        customerPhone: message.from,
        salonId: salonId,
        language: language,
      });

      // Send interactive card or text based on response type
      if (response.messageType === 'interactive_card') {
        await this.whatsappService.sendInteractiveMessage('system', {
          salon_id: salonId,
          to: message.from,
          interactive: (response.payload as any).interactive,
        });

        this.logger.log(`Sent interactive booking card to ${message.from}`);
      } else {
        await this.whatsappService.sendTextMessage('system', {
          salon_id: salonId,
          to: message.from,
          text: (response.payload as any).text,
        });

        this.logger.log(`Sent text response to ${message.from}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to handle booking request: ${(error as Error).message}`,
        (error as Error).stack,
      );

      // Send error message to customer
      try {
        await this.whatsappService.sendTextMessage('system', {
          salon_id: salonId,
          to: message.from,
          text: 'Sorry, I had trouble processing your booking request. Please try again or contact support.',
        });
      } catch (sendError) {
        this.logger.error(`Failed to send error message: ${(sendError as Error).message}`);
      }
    }
  }

  /**
   * Handle button click with QuickBookingService
   *
   * Routes button clicks through QuickBookingService which handles:
   * - Slot selection
   * - Booking confirmation
   * - Choice navigation
   * - Generic actions
   */
  private async handleButtonClick(
    message: WhatsAppMessage,
    language: string,
    salonId: string,
  ): Promise<void> {
    try {
      const buttonId =
        message.interactive?.button_reply?.id || message.interactive?.list_reply?.id || '';

      this.logger.log(`Handling button click: ${buttonId} from ${message.from}`);

      const response = await this.quickBookingService.handleButtonClick(
        buttonId,
        message.from,
        language,
      );

      if (response.messageType === 'interactive_card') {
        await this.whatsappService.sendInteractiveMessage('system', {
          salon_id: salonId,
          to: message.from,
          interactive: (response.payload as any).interactive,
        });

        this.logger.log(`Sent interactive card to ${message.from}`);
      } else if (response.messageType === 'text') {
        await this.whatsappService.sendTextMessage('system', {
          salon_id: salonId,
          to: message.from,
          text: (response.payload as any).text,
        });

        this.logger.log(`Sent text response to ${message.from}`);
      } else if (response.messageType === 'booking_confirmed') {
        const payload = response.payload as any;
        await this.whatsappService.sendTextMessage('system', {
          salon_id: salonId,
          to: message.from,
          text: payload.text || `Booking confirmed! ID: ${payload.bookingId}`,
        });

        this.logger.log(`Sent booking confirmation to ${message.from}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to handle button click: ${(error as Error).message}`,
        (error as Error).stack,
      );

      // Send error message to customer
      try {
        await this.whatsappService.sendTextMessage('system', {
          salon_id: salonId,
          to: message.from,
          text: 'Sorry, something went wrong processing your selection. Please try again or contact support.',
        });
      } catch (sendError) {
        this.logger.error(`Failed to send error message: ${(sendError as Error).message}`);
      }
    }
  }

  /**
   * Handle conversation with existing logic
   *
   * This method preserves existing AI service flow and reminder processing.
   * Falls back to processBookingRequest for text messages.
   */
  private async handleConversation(
    message: WhatsAppMessage,
    language: string,
    salonId: string,
  ): Promise<void> {
    try {
      this.logger.log(`Handling conversation for ${message.from}`);

      // Process reminder response if this is a text message
      if (message.type === 'text' && message.text?.body) {
        await this.processReminderResponse(salonId, message.from, message.text.body);

        // Also check for booking intent with existing logic
        await this.processBookingRequest(salonId, message.from, message.text.body, language);
      }

      // TODO: Add AI service conversation handling here when ready
      // For now, the processBookingRequest handles the flow
    } catch (error) {
      this.logger.error(
        `Failed to handle conversation: ${(error as Error).message}`,
        (error as Error).stack,
      );

      // Send error message to customer
      try {
        await this.whatsappService.sendTextMessage('system', {
          salon_id: salonId,
          to: message.from,
          text: 'Sorry, I encountered an error processing your message. Please try again or contact support.',
        });
      } catch (sendError) {
        this.logger.error(`Failed to send error message: ${(sendError as Error).message}`);
      }
    }
  }

  /**
   * Check if incoming message is a response to a booking reminder
   * and process it accordingly
   */
  private async processReminderResponse(
    salonId: string,
    phoneNumber: string,
    messageText: string,
  ): Promise<void> {
    try {
      // Find booking with sent reminder for this phone number
      const booking = await this.prisma.booking.findFirst({
        where: {
          salon_id: salonId,
          customer_phone: phoneNumber,
          reminder_sent: true,
          status: 'CONFIRMED', // Only process responses for confirmed bookings
        },
        include: {
          reminders: {
            where: { status: 'SENT' },
            orderBy: { sent_at: 'desc' },
            take: 1,
          },
        },
      });

      if (!booking || !booking.reminders || booking.reminders.length === 0) {
        this.logger.debug(`No active reminder found for phone ${phoneNumber}`);
        return;
      }

      this.logger.log(`Processing reminder response for booking ${booking.id}`);
      await this.remindersService.processResponse(booking.id, messageText);
    } catch (error) {
      // Log error but don't fail message processing
      this.logger.error(
        `Failed to process reminder response: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  /**
   * Process booking request from customer text message
   *
   * Checks if the message looks like a booking request and routes it to QuickBookingService.
   * Sends interactive card with available slots back to the customer.
   *
   * @param salonId - The salon ID
   * @param phoneNumber - Customer phone number
   * @param messageText - The text message content
   * @param language - Detected language (optional, defaults to 'en')
   */
  private async processBookingRequest(
    salonId: string,
    phoneNumber: string,
    messageText: string,
    language: string = 'en',
  ): Promise<void> {
    try {
      // Basic heuristic to detect booking requests
      // In production, this could be more sophisticated
      const bookingKeywords = [
        'book',
        'appointment',
        'schedule',
        'reserve',
        'haircut',
        'manicure',
        'pedicure',
        'massage',
        'tomorrow',
        'today',
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
        'sunday',
        'morning',
        'afternoon',
        'evening',
      ];

      const lowerText = messageText.toLowerCase();
      const looksLikeBooking = bookingKeywords.some((keyword) => lowerText.includes(keyword));

      if (!looksLikeBooking) {
        this.logger.debug(`Message doesn't look like a booking request: "${messageText}"`);
        return;
      }

      this.logger.log(`Processing booking request: "${messageText}" from ${phoneNumber}`);

      // Route to QuickBookingService
      const result = await this.quickBookingService.handleBookingRequest({
        text: messageText,
        customerPhone: phoneNumber,
        salonId,
        language: language, // Use detected language
      });

      if (result.success && result.messageType === 'interactive_card') {
        // Send interactive card with slot options
        await this.whatsappService.sendInteractiveMessage('system', {
          salon_id: salonId,
          to: phoneNumber,
          interactive: (result.payload as any).interactive,
        });

        this.logger.log(`Sent slot selection card to ${phoneNumber}`);
      } else if (result.messageType === 'text') {
        // Send text response (e.g., no slots available, error message)
        await this.whatsappService.sendTextMessage('system', {
          salon_id: salonId,
          to: phoneNumber,
          text: (result.payload as any).text,
        });

        this.logger.log(`Sent text response to ${phoneNumber}`);
      }
    } catch (error) {
      // Log error but don't fail message processing
      this.logger.error(
        `Failed to process booking request: ${(error as Error).message}`,
        (error as Error).stack,
      );

      // Optionally send error message to customer
      try {
        await this.whatsappService.sendTextMessage('system', {
          salon_id: salonId,
          to: phoneNumber,
          text: 'Sorry, I had trouble processing your booking request. Please try again or contact support.',
        });
      } catch (sendError) {
        this.logger.error(`Failed to send error message: ${(sendError as Error).message}`);
      }
    }
  }

  async processStatusUpdate(salonId: string, status: WhatsAppStatus): Promise<void> {
    this.logger.log(`Processing status update for message ${status.id} in salon ${salonId}`);

    try {
      const message = await this.prisma.message.findFirst({
        where: {
          whatsapp_id: status.id,
          salon_id: salonId,
        },
      });

      if (!message) {
        this.logger.warn(`Message ${status.id} not found for status update`);
        return;
      }

      const statusMapping: Record<string, string> = {
        sent: 'SENT',
        delivered: 'DELIVERED',
        read: 'READ',
        failed: 'FAILED',
      };

      const newStatus = statusMapping[status.status] || 'SENT';

      if (message.status === 'READ' && newStatus !== 'FAILED') {
        this.logger.log(`Message ${status.id} already marked as READ, skipping status update`);
        return;
      }

      await this.prisma.message.update({
        where: { id: message.id },
        data: { status: newStatus },
      });

      if (status.errors && status.errors.length > 0) {
        this.logger.error(
          `Message ${status.id} failed with errors: ${JSON.stringify(status.errors)}`,
        );
      }

      this.logger.log(
        `Status update for message ${status.id} processed successfully: ${newStatus}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process status update: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  async logWebhook(
    salonId: string | null,
    eventType: string,
    payload: any,
    status: string,
    error: string | null,
  ): Promise<void> {
    try {
      await this.prisma.webhookLog.create({
        data: {
          salon_id: salonId,
          event_type: eventType,
          payload: payload, // PostgreSQL Json type - Prisma handles serialization automatically
          status: status,
          error: error,
        },
      });
    } catch (logError) {
      this.logger.error(
        `Failed to log webhook: ${(logError as Error).message}`,
        (logError as Error).stack,
      );
    }
  }

  private async findSalonByPhoneNumberId(phoneNumberId: string): Promise<any> {
    try {
      return await this.prisma.salon.findUnique({
        where: { phone_number_id: phoneNumberId },
      });
    } catch (error) {
      this.logger.error(
        `Failed to find salon by phone_number_id: ${(error as Error).message}`,
        (error as Error).stack,
      );
      return null;
    }
  }

  private async getOrCreateConversation(salonId: string, phoneNumber: string): Promise<any> {
    const existingConversation = await this.prisma.conversation.findUnique({
      where: {
        salon_id_phone_number: {
          salon_id: salonId,
          phone_number: phoneNumber,
        },
      },
    });

    if (existingConversation) {
      return existingConversation;
    }

    return await this.prisma.conversation.create({
      data: {
        salon_id: salonId,
        phone_number: phoneNumber,
        status: 'ACTIVE',
        message_count: 0,
        cost: 0,
      },
    });
  }
}
