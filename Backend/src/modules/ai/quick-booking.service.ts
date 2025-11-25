import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@database/prisma.service';
import { IntentParserService, BookingIntent } from './services/intent-parser.service';
import { ButtonParserService } from './button-parser.service';
import { InteractiveCardBuilderService } from './interactive-card-builder.service';
import { US1AnalyticsService } from './analytics/us1-analytics.service';
import { SlotFinderService } from './services/slot-finder.service';
import { AlternativeSuggesterService } from './services/alternative-suggester.service';
import { MessageBuilderService } from './services/message-builder.service';
import { SessionContextService } from './services/session-context.service';
import {
  SlotSuggestion,
  CustomerPreferences,
  InteractiveMessagePayload,
} from './types/booking-intent.types';
import {
  ChoiceType,
  BookingContext,
  RankedSlot,
} from './types/choice.types';

/**
 * Quick Booking Service
 *
 * Main orchestrator for zero-typing booking flow. Coordinates:
 * - Intent parsing (IntentParserService)
 * - Slot finding (SlotFinderService - Phase 4)
 * - Alternative ranking (AlternativeSuggesterService - Phase 5)
 * - Interactive card building (InteractiveCardBuilder)
 * - Button click routing
 *
 * @see specs/001-whatsapp-quick-booking/contracts/services/all-services.interface.ts
 * @see specs/001-whatsapp-quick-booking User Story 1 - Zero-Typing Touch-Based Booking
 *
 * @performance
 * - Returning customers (bypass AI): <500ms
 * - New customers (AI parse): <2s
 */
@Injectable()
export class QuickBookingService {
  private readonly logger = new Logger(QuickBookingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly intentParser: IntentParserService,
    private readonly buttonParser: ButtonParserService,
    private readonly cardBuilder: InteractiveCardBuilderService,
    private readonly analytics: US1AnalyticsService,
    private readonly slotFinder: SlotFinderService,
    private readonly alternativeSuggester: AlternativeSuggesterService,
    private readonly messageBuilder: MessageBuilderService,
    private readonly sessionContext: SessionContextService,
  ) {
    // Session cleanup is handled by Redis TTL (30 minutes)
    // No need for interval-based cleanup
  }

  /**
   * Handle initial booking request from customer
   *
   * Flow:
   * 1. Check if returning customer → "Book Your Usual" shortcut (Phase 9)
   * 2. Parse intent with IntentParserService
   * 3. Resolve serviceId and masterId from names (query database)
   * 4. Find available slots with SlotFinderService
   * 5. Build interactive card with InteractiveCardBuilder
   * 6. Store session context for button clicks
   * 7. Track analytics events
   * 8. Return card payload
   *
   * @param request - Customer's message and context
   * @returns Interactive card payload or error
   *
   * @performance
   * - Returning customers (bypass AI): <500ms (Phase 9)
   * - New customers (AI parse): <2s
   *
   * @example
   * const response = await quickBooking.handleBookingRequest({
   *   text: 'Haircut Friday 3pm',
   *   customerPhone: '+1234567890',
   *   salonId: '123',
   *   language: 'en'
   * });
   */
  async handleBookingRequest(request: {
    text: string;
    customerPhone: string;
    salonId: string;
    language?: string;
  }): Promise<{
    success: boolean;
    messageType: 'interactive_card' | 'text' | 'error';
    payload: InteractiveMessagePayload | { text: string };
    intent?: BookingIntent;
    sessionId?: string;
  }> {
    const startTime = Date.now();
    const sessionId = this.generateSessionId();

    this.logger.log(
      `Handling booking request from ${request.customerPhone}: "${request.text}"`,
    );

    try {
      // Step 1: Check if returning customer (Phase 9)
      // TODO: Implement in Phase 9 - "Book Your Usual" shortcut
      const customerId = await this.getOrCreateCustomerId(
        request.customerPhone,
        request.salonId,
      );

      // Initialize analytics session
      await this.analytics.initializeSession(
        sessionId,
        request.salonId,
        customerId,
      );

      // Track: booking_request_received
      await this.analytics.trackEvent({
        eventType: 'booking_request_received',
        salonId: request.salonId,
        customerId,
        sessionId,
        timestamp: new Date(),
        metadata: {
          language: request.language || 'auto',
          typingCount: 1, // Initial message counts as typing
        },
      });

      if (customerId) {
        const isReturning = await this.isReturningCustomer(customerId);
        if (isReturning) {
          this.logger.debug(`Returning customer detected: ${customerId}`);
          // TODO Phase 9: Check if text matches "book usual" pattern
          // If yes, skip AI and use getUsualPreferences()
        }
      }

      // Step 2: Parse intent with AI
      const intent = await this.intentParser.parseIntent(
        request.text,
        request.salonId,
      );

      this.logger.debug(
        `Parsed intent: ${JSON.stringify(intent)}`,
      );

      // Track: intent_parsed
      const intentComplete = this.isIntentComplete(intent);
      await this.analytics.trackEvent({
        eventType: 'intent_parsed',
        salonId: request.salonId,
        customerId,
        sessionId,
        timestamp: new Date(),
        metadata: {
          intentComplete,
          language: intent.language || request.language || 'auto',
        },
      });

      // Step 3: Resolve service and master IDs from intent
      let serviceId = intent.serviceId;
      let masterId = intent.masterId;

      // If service name provided but no ID, resolve it
      if (!serviceId && intent.serviceName) {
        const service = await this.prisma.service.findFirst({
          where: {
            salon_id: request.salonId,
            name: {
              contains: intent.serviceName,
              mode: 'insensitive',
            },
            is_active: true,
          },
        });

        if (service) {
          serviceId = service.id;
          this.logger.debug(`Resolved service "${intent.serviceName}" to ID: ${serviceId}`);
        } else {
          this.logger.warn(`Service not found: ${intent.serviceName}`);
          return {
            success: false,
            messageType: 'text',
            payload: {
              text: `Sorry, I couldn't find a service matching "${intent.serviceName}". Please check the service name and try again.`,
            },
            sessionId,
          };
        }
      }

      // If master name provided but no ID, resolve it
      if (!masterId && intent.masterName) {
        const master = await this.prisma.master.findFirst({
          where: {
            salon_id: request.salonId,
            name: {
              contains: intent.masterName,
              mode: 'insensitive',
            },
            is_active: true,
          },
        });

        if (master) {
          masterId = master.id;
          this.logger.debug(`Resolved master "${intent.masterName}" to ID: ${masterId}`);
        } else {
          this.logger.warn(`Master not found: ${intent.masterName}`);
          // Don't fail - just proceed without master preference
        }
      }

      // Validate we have at least a service ID
      if (!serviceId) {
        this.logger.warn('No service ID could be determined from intent');
        return {
          success: false,
          messageType: 'text',
          payload: {
            text: 'Sorry, I couldn\'t determine which service you\'d like to book. Please specify the service name.',
          },
          sessionId,
        };
      }

      // Step 4: Find available slots with SlotFinderService
      const slotSearchResult = await this.slotFinder.findAvailableSlots({
        salonId: request.salonId,
        serviceId,
        masterId,
        preferredDate: intent.preferredDate,
        preferredTime: intent.preferredTime,
        maxDaysAhead: 7,
        limit: 10,
      });

      if (slotSearchResult.slots.length === 0) {
        // No slots found for preferred date/time - try finding alternatives
        this.logger.log(`No slots found for preferred date/time. Searching for alternatives...`);

        // Search wider date range for alternatives
        const widerSearchResult = await this.slotFinder.findAvailableSlots({
          salonId: request.salonId,
          serviceId,
          masterId,
          maxDaysAhead: 14, // Search up to 2 weeks ahead
          limit: 50,
        });

        if (widerSearchResult.slots.length === 0) {
          // Still no slots - suggest waitlist
          // TODO Phase 11: Trigger waitlist flow
          return {
            success: true,
            messageType: 'text',
            payload: {
              text: this.getNoSlotsMessage(request.language || 'en'),
            },
            sessionId,
          };
        }

        // Find nearby alternatives if user specified date/time
        if (intent.preferredDate && intent.preferredTime) {
          const alternatives = await this.alternativeSuggester.findNearbyAlternatives(
            widerSearchResult.slots,
            intent.preferredDate,
            intent.preferredTime,
            10, // Show up to 10 alternatives
            request.language as any || 'en',
          );

          if (alternatives.length > 0) {
            // Build message and card for alternatives
            const message = this.messageBuilder.buildAlternativeSlotsMessage(
              alternatives,
              request.language as any || 'en',
            );

            const card = this.cardBuilder.buildAlternativeSlotsCard(
              alternatives.slice(0, 10), // Max 10 slots for WhatsApp
              request.language || 'en',
              message,
            );

            // Store session with alternatives
            await this.storeSession(request.customerPhone, {
              intent,
              slots: alternatives,
              salonId: request.salonId,
              sessionId,
              customerId,
              language: request.language || 'en',
              timestamp: Date.now(),
            });

            // Track: slots_shown (alternatives)
            await this.analytics.trackEvent({
              eventType: 'slots_shown',
              salonId: request.salonId,
              customerId,
              sessionId,
              timestamp: new Date(),
              metadata: {
                cardType: 'alternative_slots',
                tapCount: 0,
                typingCount: 1,
                durationMs: Date.now() - startTime,
              },
            });

            return {
              success: true,
              messageType: 'interactive_card',
              payload: card,
              intent,
              sessionId,
            };
          }
        }

        // No good alternatives - show generic message
        return {
          success: true,
          messageType: 'text',
          payload: {
            text: this.getNoSlotsMessage(request.language || 'en'),
          },
          sessionId,
        };
      }

      const rankedSlots = slotSearchResult.slots;

      // Step 5: Build interactive card
      const card = this.cardBuilder.buildSlotSelectionCard(
        rankedSlots.slice(0, 10), // Max 10 slots for WhatsApp list
        request.language || 'en',
      );

      // Step 6: Store session context for button clicks (using Redis)
      await this.storeSession(request.customerPhone, {
        intent,
        slots: rankedSlots,
        salonId: request.salonId,
        sessionId,
        customerId,
        language: request.language || 'en', // Store language for subsequent interactions
        timestamp: Date.now(),
      });

      // Track: slots_shown
      await this.analytics.trackEvent({
        eventType: 'slots_shown',
        salonId: request.salonId,
        customerId,
        sessionId,
        timestamp: new Date(),
        metadata: {
          cardType:
            card.type === 'button'
              ? 'reply_buttons'
              : 'list_message',
          tapCount: 0, // No taps yet
          typingCount: 1, // Customer typed initial message
          durationMs: Date.now() - startTime,
        },
      });

      const duration = Date.now() - startTime;
      this.logger.log(
        `Booking request processed in ${duration}ms. Showing ${rankedSlots.length} slots.`,
      );

      return {
        success: true,
        messageType: 'interactive_card',
        payload: card,
        intent,
        sessionId,
      };
    } catch (error) {
      this.logger.error(`Error handling booking request: ${(error as Error).message}`, (error as Error).stack);

      // Track: error_occurred
      const customerId = await this.getOrCreateCustomerId(
        request.customerPhone,
        request.salonId,
      );
      await this.analytics.trackEvent({
        eventType: 'error_occurred',
        salonId: request.salonId,
        customerId,
        sessionId,
        timestamp: new Date(),
        metadata: {
          errorMessage: (error as Error).message,
          errorType: 'booking_request_failed',
        },
      });

      return {
        success: false,
        messageType: 'error',
        payload: {
          text: this.getErrorMessage(request.language || 'en'),
        },
        sessionId,
      };
    }
  }

  /**
   * Handle button click from interactive card
   *
   * Flow:
   * 1. Parse button ID with ButtonParserService
   * 2. Retrieve session context
   * 3. Route to appropriate handler based on button type:
   *    - slot_* → slot selection handler
   *    - confirm_* → booking confirmation handler
   *    - waitlist_* → waitlist handler (Phase 11)
   *    - action_* → generic action handler
   *    - nav_* → navigation handler (Phase 6)
   * 4. Return next card or confirmation
   *
   * @param buttonId - Button ID from webhook
   * @param customerPhone - Customer phone number
   * @param language - Optional language override (defaults to session language or 'en')
   * @returns Next step in booking flow
   *
   * @example
   * const response = await quickBooking.handleButtonClick(
   *   'slot_abc123',
   *   '+1234567890',
   *   'ru'
   * );
   */
  async handleButtonClick(
    buttonId: string,
    customerPhone: string,
    language?: string,
  ): Promise<{
    success: boolean;
    messageType: 'interactive_card' | 'text' | 'booking_confirmed';
    payload: InteractiveMessagePayload | { text: string } | { bookingId: string };
  }> {
    const startTime = Date.now();
    this.logger.log(`Handling button click: ${buttonId} from ${customerPhone}`);

    try {
      // Step 1: Parse button ID
      const parsed = this.buttonParser.parseButtonId(buttonId);
      this.logger.debug(`Parsed button: ${JSON.stringify(parsed)}`);

      // Step 2: Retrieve session context
      const session = await this.getSession(customerPhone);
      if (!session) {
        throw new BadRequestException('Session expired. Please start a new booking.');
      }

      // Step 3: Determine language (priority: parameter > session > default)
      const lang = language || session?.language || 'en';

      // Store language in session if it was overridden
      if (language && language !== session.language) {
        await this.updateSessionLanguage(customerPhone, language);
      }

      // Step 4: Route to handler based on button type
      switch (parsed.type) {
        case 'slot_selection':
          return await this.handleSlotSelection(parsed.slotId!, session, customerPhone);

        case 'booking_confirmation':
          return await this.handleBookingConfirmation(
            parsed.bookingId!,
            session,
            customerPhone,
          );

        case 'choice_selection':
          // Handle choice navigation (same_day_diff_time or diff_day_same_time)
          return await this.handleChoice(
            parsed.choiceId as ChoiceType,
            customerPhone,
          );

        case 'waitlist_action':
          // TODO Phase 11: Implement waitlist handler
          return {
            success: false,
            messageType: 'text',
            payload: { text: 'Waitlist feature coming soon!' },
          };

        case 'generic_action':
          return await this.handleGenericAction(parsed.action!, session, customerPhone);

        case 'navigation':
          // TODO Phase 6: Implement navigation handler (prev/next page)
          return {
            success: false,
            messageType: 'text',
            payload: { text: 'Navigation coming soon!' },
          };

        default:
          throw new BadRequestException(`Unknown button type: ${parsed.type}`);
      }
    } catch (error) {
      this.logger.error(`Error handling button click: ${(error as Error).message}`, (error as Error).stack);

      return {
        success: false,
        messageType: 'text',
        payload: {
          text: 'Sorry, something went wrong. Please try again.',
        },
      };
    }
  }

  /**
   * Handle slot conflict by finding and showing alternative slots
   *
   * Called when a selected slot becomes unavailable (ConflictException)
   *
   * @param originalDate - Original requested date
   * @param originalTime - Original requested time
   * @param salonId - Salon ID
   * @param serviceId - Service ID
   * @param masterId - Master ID (optional)
   * @param language - Language preference
   * @returns Interactive card with alternative slots or error message
   */
  async handleSlotConflict(
    originalDate: string,
    originalTime: string,
    salonId: string,
    serviceId: string,
    masterId: string | undefined,
    language: string = 'en',
  ): Promise<{
    success: boolean;
    messageType: 'interactive_card' | 'text';
    payload: InteractiveMessagePayload | { text: string };
  }> {
    const startTime = Date.now();

    this.logger.log(
      `Handling slot conflict: ${originalDate} ${originalTime} in salon ${salonId}`,
    );

    try {
      // Step 1: Find all available slots
      const slotSearchResult = await this.slotFinder.findAvailableSlots({
        salonId,
        serviceId,
        masterId,
        maxDaysAhead: 14, // Search up to 2 weeks ahead
        limit: 50, // Get more slots for better alternatives
      });

      if (slotSearchResult.slots.length === 0) {
        // No slots available at all
        return {
          success: false,
          messageType: 'text',
          payload: {
            text: this.messageBuilder.getMessage('NO_ALTERNATIVES', language as any),
          },
        };
      }

      // Step 2: Find nearby alternatives using AlternativeSuggesterService
      const alternatives = await this.alternativeSuggester.findNearbyAlternatives(
        slotSearchResult.slots,
        originalDate,
        originalTime,
        5, // Max 5 alternatives
        language as any,
      );

      if (alternatives.length === 0) {
        // No good alternatives found
        return {
          success: false,
          messageType: 'text',
          payload: {
            text: this.messageBuilder.getMessage('NO_ALTERNATIVES', language as any),
          },
        };
      }

      // Step 3: Build message and card
      const message = this.messageBuilder.buildAlternativeSlotsMessage(
        alternatives,
        language as any,
      );

      const card = this.cardBuilder.buildAlternativeSlotsCard(
        alternatives,
        language,
        message,
      );

      const duration = Date.now() - startTime;
      this.logger.log(
        `Slot conflict resolved in ${duration}ms. Showing ${alternatives.length} alternatives.`,
      );

      return {
        success: true,
        messageType: 'interactive_card',
        payload: card,
      };
    } catch (error) {
      this.logger.error(
        `Error handling slot conflict: ${(error as Error).message}`,
        (error as Error).stack,
      );

      return {
        success: false,
        messageType: 'text',
        payload: {
          text: this.messageBuilder.getMessage('ERROR', language as any),
        },
      };
    }
  }

  /**
   * Handle slot selection (customer chose a time slot)
   */
  private async handleSlotSelection(
    slotId: string,
    session: any,
    customerPhone: string,
  ): Promise<any> {
    this.logger.debug(`Handling slot selection: ${slotId}`);

    // Find selected slot
    const slot = session.slots.find((s: SlotSuggestion) => s.id === slotId);
    if (!slot) {
      throw new BadRequestException('Slot not found');
    }

    // Get session metrics
    const sessionMetrics = await this.analytics.getSessionMetrics(
      session.sessionId,
    );
    const tapCount = (sessionMetrics?.tapCount || 0) + 1;
    const durationMs = Date.now() - (sessionMetrics?.startTime || Date.now());

    // Track: slot_selected
    await this.analytics.trackEvent({
      eventType: 'slot_selected',
      salonId: session.salonId,
      customerId: session.customerId,
      sessionId: session.sessionId,
      timestamp: new Date(),
      metadata: {
        slotId,
        tapCount,
        durationMs,
      },
    });

    // Update session with selected slot
    session.selectedSlot = slot;
    await this.storeSession(customerPhone, session);

    // Build confirmation card
    const card = this.cardBuilder.buildConfirmationCard(
      slot,
      session.language || 'en',
    );

    // Track: confirmation_shown
    await this.analytics.trackEvent({
      eventType: 'confirmation_shown',
      salonId: session.salonId,
      customerId: session.customerId,
      sessionId: session.sessionId,
      timestamp: new Date(),
      metadata: {
        tapCount,
        durationMs,
      },
    });

    return {
      success: true,
      messageType: 'interactive_card',
      payload: card,
    };
  }

  /**
   * Handle booking confirmation (customer confirmed the booking)
   */
  private async handleBookingConfirmation(
    bookingId: string,
    session: any,
    customerPhone: string,
  ): Promise<any> {
    this.logger.log(`Confirming booking for ${customerPhone}`);

    const slot = session.selectedSlot;
    if (!slot) {
      throw new BadRequestException('No slot selected');
    }

    // Get session metrics
    const sessionMetrics = await this.analytics.getSessionMetrics(
      session.sessionId,
    );
    const tapCount = (sessionMetrics?.tapCount || 0) + 1; // Second tap
    const typingCount = sessionMetrics?.typingCount || 1;
    const durationMs = Date.now() - (sessionMetrics?.startTime || Date.now());

    // Track: booking_confirmed
    await this.analytics.trackEvent({
      eventType: 'booking_confirmed',
      salonId: session.salonId,
      customerId: session.customerId,
      sessionId: session.sessionId,
      timestamp: new Date(),
      metadata: {
        tapCount,
        typingCount,
        durationMs,
      },
    });

    // Create booking in database
    const booking = await this.createBooking(
      customerPhone,
      slot,
      session.intent,
      session.salonId,
    );

    // Track: booking_completed with final metrics
    await this.analytics.trackEvent({
      eventType: 'booking_completed',
      salonId: session.salonId,
      customerId: session.customerId,
      sessionId: session.sessionId,
      timestamp: new Date(),
      metadata: {
        bookingId: booking.id,
        tapCount,
        typingCount,
        durationMs,
      },
    });

    // Mark analytics session as complete
    await this.analytics.completeSession(session.sessionId, booking.id);

    // Log success criteria achievement
    const achievedZeroTyping = typingCount === 1;
    const achievedTapTarget = tapCount <= 3;
    const achievedTimeTarget = durationMs < 30000;

    this.logger.log({
      event: 'us1.booking_completed',
      bookingId: booking.id,
      sessionId: session.sessionId,
      metrics: {
        tapCount,
        typingCount,
        durationMs,
        durationSeconds: (durationMs / 1000).toFixed(2),
        achievedZeroTyping, // SC-001
        achievedTapTarget, // SC-002
        achievedTimeTarget, // SC-003
      },
    });

    // Clear session
    await this.clearSession(customerPhone);

    this.logger.log(`Booking confirmed: ${booking.id}`);

    return {
      success: true,
      messageType: 'booking_confirmed',
      payload: {
        bookingId: booking.id,
        text: this.getConfirmationMessage(booking, session.language || 'en'),
      },
    };
  }

  /**
   * Handle generic action (e.g., "change slot")
   */
  private async handleGenericAction(
    action: string,
    session: any,
    customerPhone: string,
  ): Promise<any> {
    this.logger.debug(`Handling generic action: ${action}`);

    switch (action) {
      case 'change_slot':
        // Show slots again
        const card = this.cardBuilder.buildSlotSelectionCard(
          session.slots.slice(0, 10),
          session.language || 'en',
        );

        return {
          success: true,
          messageType: 'interactive_card',
          payload: card,
        };

      default:
        throw new BadRequestException(`Unknown action: ${action}`);
    }
  }

  /**
   * Check if customer is eligible for "Book Your Usual" fast-track
   *
   * Criteria: 3+ past bookings
   *
   * TODO: Implement in Phase 9
   *
   * @param customerId - Customer ID
   * @returns True if eligible
   */
  async isReturningCustomer(customerId: string): Promise<boolean> {
    // TODO Phase 9: Implement actual logic
    // Count bookings for this customer
    // Return true if >= 3 bookings

    // STUB: Always return false for now
    return false;
  }

  /**
   * Get customer's usual booking preferences
   *
   * TODO: Implement in Phase 9
   *
   * @param customerId - Customer ID
   * @returns Preferences or null if <3 bookings
   */
  async getUsualPreferences(customerId: string): Promise<CustomerPreferences | null> {
    // TODO Phase 9: Implement actual logic
    // Query most frequently booked service, master, day, time
    // Calculate from last 10 bookings

    // STUB: Always return null for now
    return null;
  }

  /**
   * Handle customer's choice from navigation card
   *
   * Flow:
   * 1. Get context from Redis
   * 2. Apply filter based on choice
   * 3. Find and rank slots
   * 4. Build message and card
   * 5. Update context
   *
   * @param choiceId - Choice type (same_day_diff_time or diff_day_same_time)
   * @param customerPhone - Customer phone number
   * @returns Interactive card or text message
   *
   * @example
   * const response = await quickBooking.handleChoice(
   *   'same_day_diff_time',
   *   '+1234567890'
   * );
   */
  async handleChoice(
    choiceId: ChoiceType,
    customerPhone: string,
  ): Promise<{
    success: boolean;
    messageType: 'interactive_card' | 'text';
    payload: InteractiveMessagePayload | { text: string };
  }> {
    const startTime = Date.now();

    this.logger.log(`Handling choice: ${choiceId} from ${customerPhone}`);

    try {
      // Step 1: Get context from Redis
      const context = await this.sessionContext.get(customerPhone);

      if (!context) {
        // Context expired or Redis unavailable
        return {
          success: false,
          messageType: 'text',
          payload: {
            text: this.messageBuilder.getMessage(
              'SESSION_EXPIRED',
              'en', // Fallback to English (international default)
            ),
          },
        };
      }

      // Step 2: Apply filter based on choice
      let slots: SlotSuggestion[];
      let rankedSlots: RankedSlot[];
      let message: string;

      if (choiceId === 'same_day_diff_time') {
        // Customer chose: "Same day, but different time"

        // Find slots on the same day
        const slotSearchResult = await this.slotFinder.findAvailableSlots({
          salonId: context.salonId,
          serviceId: context.originalIntent.serviceId!,
          masterId: context.originalIntent.masterId,
          preferredDate: context.originalIntent.date!, // Same day!
          maxDaysAhead: 0, // Only this day
          limit: 20,
        });

        slots = slotSearchResult.slots;

        // Rank by time proximity
        rankedSlots = await this.alternativeSuggester.rankByTimeProximity(
          slots,
          context.originalIntent.time!,
          context.language,
        );

        // Build message
        message = this.messageBuilder.getMessage(
          'SAME_DAY_OPTIONS',
          context.language,
          {
            day: this.formatDate(context.originalIntent.date!, context.language),
            time: context.originalIntent.time,
          },
        );

      } else if (choiceId === 'diff_day_same_time') {
        // Customer chose: "Different day, but same time"

        // Find slots on other days with the same time
        const slotSearchResult = await this.slotFinder.findAvailableSlots({
          salonId: context.salonId,
          serviceId: context.originalIntent.serviceId!,
          masterId: context.originalIntent.masterId,
          preferredTime: context.originalIntent.time!, // Same time!
          maxDaysAhead: 14, // Search up to 2 weeks ahead
          limit: 20,
        });

        slots = slotSearchResult.slots;

        // Rank by date proximity
        rankedSlots = await this.alternativeSuggester.rankByDateProximity(
          slots,
          context.originalIntent.date!,
          context.language,
        );

        // Build message
        message = this.messageBuilder.getMessage(
          'DIFF_DAY_OPTIONS',
          context.language,
          {
            time: context.originalIntent.time,
          },
        );
      } else {
        // Unknown choice type
        return {
          success: false,
          messageType: 'text',
          payload: {
            text: this.messageBuilder.getMessage('ERROR', context.language),
          },
        };
      }

      // If no slots - return text message
      if (rankedSlots.length === 0) {
        return {
          success: true,
          messageType: 'text',
          payload: {
            text: this.messageBuilder.getMessage(
              'NO_ALTERNATIVES',
              context.language,
            ),
          },
        };
      }

      // Step 3: Build card with slots
      const card = this.cardBuilder.buildSlotSelectionCard(
        rankedSlots.slice(0, 10), // Max 10 slots for WhatsApp
        context.language,
        message, // Pass message
      );

      // Step 4: Update context (add choice + extend TTL)
      await this.sessionContext.update(customerPhone, {
        ...context,
        choices: [
          ...context.choices,
          {
            choiceId,
            selectedAt: new Date(),
          },
        ],
        lastInteractionAt: new Date(),
      });

      // Track analytics
      await this.analytics.trackEvent({
        eventType: 'choice_selected',
        salonId: context.salonId,
        customerId: context.customerId,
        sessionId: context.sessionId,
        timestamp: new Date(),
        metadata: {
          choiceId,
          slotsShown: rankedSlots.length,
          durationMs: Date.now() - startTime,
        },
      });

      const duration = Date.now() - startTime;
      this.logger.log(
        `Choice handled in ${duration}ms. Showing ${rankedSlots.length} alternatives.`,
      );

      return {
        success: true,
        messageType: 'interactive_card',
        payload: card,
      };

    } catch (error) {
      this.logger.error(
        `Error handling choice: ${(error as Error).message}`,
        (error as Error).stack,
      );

      return {
        success: false,
        messageType: 'text',
        payload: {
          text: this.messageBuilder.getMessage('ERROR', 'en'), // Fallback to English (international default)
        },
      };
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================


  /**
   * Create booking in database
   */
  private async createBooking(
    customerPhone: string,
    slot: SlotSuggestion,
    intent: BookingIntent,
    salonId: string,
  ): Promise<any> {
    this.logger.log(`Creating booking for ${customerPhone} - ${slot.serviceName} on ${slot.date} at ${slot.startTime}`);

    // Extract customer name from phone or use default
    const customerName = 'Customer'; // TODO: Get from customer profile when available

    // Create booking in database with master relation
    const booking = await this.prisma.booking.create({
      data: {
        booking_code: this.generateBookingCode(),
        salon_id: salonId,
        customer_phone: customerPhone,
        customer_name: customerName,
        service: slot.serviceName,
        start_ts: new Date(`${slot.date}T${slot.startTime}`),
        end_ts: new Date(`${slot.date}T${slot.endTime}`),
        status: 'CONFIRMED',
        master_id: slot.masterId,
        service_id: slot.serviceId,
      },
      include: {
        master: {
          select: {
            name: true,
          },
        },
      },
    });

    this.logger.log(`Booking created successfully: ${booking.id} (${booking.booking_code})`);

    return booking;
  }

  /**
   * Get customer ID from phone number
   */
  private async getCustomerId(
    phone: string,
    salonId: string,
  ): Promise<string | null> {
    // TODO Phase 9: Implement customer lookup
    // Query bookings table for this phone + salon
    // Return customer ID if found

    return null;
  }

  /**
   * Get or create customer ID from phone number
   * For analytics purposes, we need a stable customer ID
   */
  private async getOrCreateCustomerId(
    phone: string,
    salonId: string,
  ): Promise<string> {
    const existingCustomerId = await this.getCustomerId(phone, salonId);
    if (existingCustomerId) {
      return existingCustomerId;
    }

    // Create deterministic customer ID from phone + salon
    // In production, this should query/create actual customer record
    return `customer_${phone}_${salonId}`;
  }

  /**
   * Check if intent has all required information
   */
  private isIntentComplete(intent: BookingIntent): boolean {
    return !!(
      intent.serviceName &&
      intent.preferredDate &&
      intent.preferredTime
    );
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Generate unique booking code
   */
  private generateBookingCode(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 7);
    return `BK-${timestamp}-${random}`.toUpperCase();
  }

  // ============================================================================
  // SESSION MANAGEMENT (using Redis via SessionContextService)
  // ============================================================================

  /**
   * Store session data in Redis
   * Migrates old sessions without language field
   *
   * @param customerPhone - Customer phone number
   * @param data - Session data to store
   * @private
   */
  private async storeSession(customerPhone: string, data: any): Promise<void> {
    try {
      // Migration: Ensure language field exists (default to 'en')
      const language = data.language || 'en';

      // Build BookingContext compatible with SessionContextService
      const context: BookingContext = {
        sessionId: data.sessionId,
        customerId: data.customerId,
        salonId: data.salonId,
        language: language as any, // Migrate to typed language
        originalIntent: {
          serviceName: data.intent?.serviceName,
          serviceId: data.intent?.serviceId,
          date: data.intent?.preferredDate,
          time: data.intent?.preferredTime,
          masterId: data.intent?.masterId,
          masterName: data.intent?.masterName,
        },
        choices: data.choices || [],
        createdAt: data.createdAt || new Date(),
        lastInteractionAt: new Date(),
      };

      // Store additional session data in a separate structure
      // Since BookingContext doesn't have slots/selectedSlot
      const extendedData = {
        ...context,
        slots: data.slots || [],
        selectedSlot: data.selectedSlot,
        intent: data.intent,
        timestamp: Date.now(),
      };

      // Save to Redis using SessionContextService
      await this.sessionContext.save(customerPhone, extendedData as any);

      this.logger.debug(`Session stored for ${customerPhone} (language: ${language})`);
    } catch (error) {
      this.logger.error(
        `Failed to store session for ${customerPhone}: ${(error as Error).message}`,
      );
      // Don't throw - graceful degradation
    }
  }

  /**
   * Retrieve session data from Redis
   * Automatically migrates sessions without language field
   *
   * @param customerPhone - Customer phone number
   * @returns Session data or null if not found/expired
   * @private
   */
  private async getSession(customerPhone: string): Promise<any | null> {
    try {
      const context = await this.sessionContext.get(customerPhone);

      if (!context) {
        return null;
      }

      // Migration: Add language field if missing (backward compatibility)
      const migratedContext = {
        ...context,
        language: context.language || 'en', // Default to English for old sessions
      };

      // If language was missing, update the session
      if (!context.language) {
        this.logger.debug(
          `Migrating session for ${customerPhone}: adding language field (default: 'en')`,
        );
        await this.sessionContext.save(customerPhone, migratedContext as any);
      }

      this.logger.debug(`Session retrieved for ${customerPhone}`);
      return migratedContext;
    } catch (error) {
      this.logger.error(
        `Failed to get session for ${customerPhone}: ${(error as Error).message}`,
      );
      return null; // Graceful degradation
    }
  }

  /**
   * Clear session data from Redis
   *
   * @param customerPhone - Customer phone number
   * @private
   */
  private async clearSession(customerPhone: string): Promise<void> {
    try {
      await this.sessionContext.delete(customerPhone);
      this.logger.debug(`Session cleared for ${customerPhone}`);
    } catch (error) {
      this.logger.error(
        `Failed to clear session for ${customerPhone}: ${(error as Error).message}`,
      );
      // Don't throw - graceful degradation
    }
  }

  /**
   * Update session language
   * Used when language parameter is provided in handleButtonClick
   *
   * @param customerPhone - Customer phone number
   * @param language - New language code
   * @private
   */
  private async updateSessionLanguage(
    customerPhone: string,
    language: string,
  ): Promise<void> {
    try {
      const session = await this.getSession(customerPhone);
      if (session) {
        session.language = language;
        await this.storeSession(customerPhone, session);
        this.logger.debug(
          `Language updated to '${language}' for ${customerPhone}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to update language for ${customerPhone}: ${(error as Error).message}`,
      );
      // Don't throw - graceful degradation
    }
  }

  // ============================================================================
  // METRICS TRACKING (handled by US1AnalyticsService)
  // ============================================================================
  // All metrics tracking is now handled by the injected US1AnalyticsService
  // See trackEvent() calls throughout the booking flow

  // ============================================================================
  // LOCALIZED MESSAGES
  // ============================================================================

  private getNoSlotsMessage(language: string): string {
    const messages: Record<string, string> = {
      en: 'Sorry, no available slots found for your requested time. Would you like to join the waitlist?',
      ru: 'К сожалению, нет доступных слотов на выбранное время. Хотите добавиться в лист ожидания?',
      es: 'Lo sentimos, no hay horarios disponibles. ¿Te gustaría unirte a la lista de espera?',
      pt: 'Desculpe, não há horários disponíveis. Gostaria de entrar na lista de espera?',
      he: 'מצטערים, אין זמנים פנויים. האם תרצה להצטרף לרשימת ההמתנה?',
    };
    // Default to English (primary language)
    return messages[language] || messages.en;
  }

  private getErrorMessage(language: string): string {
    const messages: Record<string, string> = {
      en: 'Sorry, something went wrong. Please try again or contact support.',
      ru: 'Извините, что-то пошло не так. Попробуйте снова или свяжитесь с поддержкой.',
      es: 'Lo sentimos, algo salió mal. Por favor, inténtalo de nuevo.',
      pt: 'Desculpe, algo deu errado. Por favor, tente novamente.',
      he: 'מצטערים, משהו השתבש. אנא נסה שנית.',
    };
    // Default to English (primary language)
    return messages[language] || messages.en;
  }

  private getConfirmationMessage(booking: any, language: string): string {
    // Format date and time for display
    const startDate = new Date(booking.start_ts);
    const formattedDate = startDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });

    const hours = startDate.getHours();
    const minutes = startDate.getMinutes();
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const formattedTime = `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;

    // Build detailed confirmation message in English (primary language)
    const englishMessage = `✅ Booking Confirmed!

Service: ${booking.service || 'Service'}
Date: ${formattedDate}
Time: ${formattedTime}
Master: ${booking.master?.name || 'Your specialist'}

Booking Code: ${booking.booking_code}

We'll send you a reminder 24 hours before your appointment.

See you soon! 👋`;

    const templates: Record<string, string> = {
      en: englishMessage,
      ru: `✅ Бронирование подтверждено!

Услуга: ${booking.service || 'Услуга'}
Дата: ${formattedDate}
Время: ${formattedTime}
Мастер: ${booking.master?.name || 'Ваш специалист'}

Код бронирования: ${booking.booking_code}

Мы отправим вам напоминание за 24 часа до визита.

До встречи! 👋`,
      es: `✅ ¡Reserva Confirmada!

Servicio: ${booking.service || 'Servicio'}
Fecha: ${formattedDate}
Hora: ${formattedTime}
Especialista: ${booking.master?.name || 'Tu especialista'}

Código de Reserva: ${booking.booking_code}

Te enviaremos un recordatorio 24 horas antes de tu cita.

¡Hasta pronto! 👋`,
      pt: `✅ Reserva Confirmada!

Serviço: ${booking.service || 'Serviço'}
Data: ${formattedDate}
Hora: ${formattedTime}
Profissional: ${booking.master?.name || 'Seu especialista'}

Código de Reserva: ${booking.booking_code}

Enviaremos um lembrete 24 horas antes do seu agendamento.

Até breve! 👋`,
      he: `✅ ההזמנה אושרה!

שירות: ${booking.service || 'שירות'}
תאריך: ${formattedDate}
שעה: ${formattedTime}
מומחה: ${booking.master?.name || 'המומחה שלך'}

קוד הזמנה: ${booking.booking_code}

נשלח לך תזכורת 24 שעות לפני התור.

נתראה בקרוב! 👋`,
    };

    // Default to English (primary language)
    return templates[language] || templates.en;
  }

  /**
   * Format date for display
   *
   * @param date - ISO date string
   * @param language - Target language
   * @returns Formatted date string (e.g., "Friday" in English)
   *
   * @private
   */
  private formatDate(date: string, language: string): string {
    const d = new Date(date);
    const localeMap: Record<string, string> = {
      en: 'en-US',
      ru: 'ru-RU',
      es: 'es-ES',
      pt: 'pt-BR',
      he: 'he-IL',
    };

    const locale = localeMap[language] || 'en-US'; // Default to English
    const formatter = new Intl.DateTimeFormat(locale, { weekday: 'long' });
    return formatter.format(d);
  }
}
