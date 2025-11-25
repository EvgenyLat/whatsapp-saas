/**
 * Service Interfaces for WhatsApp Interactive Quick Booking
 *
 * Complete contract definitions for all 6 new services
 *
 * @see spec.md Technical Architecture
 * @see data-model.md Section 3.2 Service Interfaces
 */

import {
  SlotSuggestion,
  SlotSearchParams,
  SlotSearchResult,
  BookingIntent,
  IntentUpdate,
  PopularTimeSlot,
  PopularTimesQuery,
  PopularTimesResult,
  WaitlistEntry,
  CustomerPreferences,
  InteractiveMessagePayload,
} from '@/types';

// ============================================================================
// 1. SLOT FINDER SERVICE
// ============================================================================

/**
 * Slot Finder Service Interface
 *
 * Infinite slot search up to 30 days ahead with batch query optimization
 *
 * @see spec.md FR-006 Infinite Availability Search
 * @see research.md Section 2.1 30-Day Search Performance
 * @performance <3s for 30-day window with 1000 bookings
 */
export interface ISlotFinderService {
  /**
   * Find available slots with infinite search capability
   *
   * Algorithm:
   * 1. Query all bookings for next 30 days (single batch query)
   * 2. For each day, calculate free slots (working hours - booked times)
   * 3. Return up to 20 slots or stop at 30-day limit
   *
   * @param params - Search parameters
   * @returns Ranked available slots
   * @throws NoAvailabilityError if 0 slots in 30 days (triggers waitlist flow)
   *
   * @example
   * const result = await slotFinder.findSlots({
   *   salonId: '123',
   *   serviceId: '456',
   *   preferredDate: '2024-10-25',
   *   preferredTime: '15:00',
   *   maxDaysAhead: 30
   * });
   * // Returns: { slots: [...], totalFound: 15, searchedDays: 7, hasMore: false }
   */
  findSlots(params: SlotSearchParams): Promise<SlotSearchResult>;

  /**
   * Check if specific slot is available (fast single-slot check)
   *
   * Uses indexed query for <50ms performance
   *
   * @param slot - Slot identifier
   * @returns Availability status
   *
   * @performance <50ms with idx_bookings_availability index
   */
  checkSlotAvailable(slot: {
    masterId: string;
    date: string; // ISO date: YYYY-MM-DD
    time: string; // HH:mm
  }): Promise<boolean>;

  /**
   * Get master's working hours for specific date
   *
   * @param masterId - Master ID
   * @param date - Date to check
   * @returns Working hours or null if master doesn't work that day
   *
   * @example
   * const hours = await slotFinder.getWorkingHours('m123', new Date('2024-10-25'));
   * // Returns: { start: '09:00', end: '18:00' } or null
   */
  getWorkingHours(
    masterId: string,
    date: Date
  ): Promise<{ start: string; end: string } | null>;

  /**
   * Calculate free time slots (working hours - booked slots)
   *
   * @param masterId - Master ID
   * @param date - Date to calculate
   * @param serviceDuration - Service duration in minutes
   * @returns Array of free time slots
   *
   * @example
   * const freeSlots = await slotFinder.calculateFreeSlots('m123', new Date(), 60);
   * // Returns: [{ startTime: '10:00', endTime: '11:00' }, { startTime: '14:00', endTime: '15:00' }]
   */
  calculateFreeSlots(
    masterId: string,
    date: Date,
    serviceDuration: number
  ): Promise<Array<{ startTime: string; endTime: string; duration: number }>>;
}

// ============================================================================
// 2. ALTERNATIVE SUGGESTER SERVICE
// ============================================================================

/**
 * Alternative Suggester Service Interface
 *
 * Ranks slot alternatives by proximity to customer's preferred time
 *
 * @see spec.md FR-007 Alternative Slot Ranking Algorithm
 * @see research.md Section 2.1 Ranking Algorithm
 */
export interface IAlternativeSuggesterService {
  /**
   * Rank slots by proximity score
   *
   * Scoring algorithm:
   * - Same master (if specified): +1000 points
   * - Within 1 hour of preferred time: +500 points
   * - Within 2 hours: +300 points
   * - Same day: +200 points
   * - Time difference penalty: -(minutes_diff / 10)
   *
   * @param slots - Available slots
   * @param intent - Customer's booking intent
   * @returns Slots sorted by rank (highest first)
   *
   * @example
   * const ranked = await suggester.rankSlots(slots, {
   *   preferredTime: '15:00',
   *   masterId: 'm123',
   *   ...intent
   * });
   * // ranked[0] has highest proximity score
   */
  rankSlots(
    slots: SlotSuggestion[],
    intent: BookingIntent
  ): Promise<SlotSuggestion[]>;

  /**
   * Calculate proximity score for single slot
   *
   * @param slot - Slot to score
   * @param intent - Customer's intent
   * @returns Proximity score (typical range: 0-2000)
   */
  calculateProximityScore(
    slot: SlotSuggestion,
    intent: BookingIntent
  ): number;

  /**
   * Label slot with proximity category
   *
   * @param score - Proximity score
   * @returns Label indicating how close the slot is to customer's preference
   */
  labelProximity(
    score: number
  ): 'exact' | 'close' | 'same-day' | 'same-week' | 'alternative';
}

// ============================================================================
// 3. POPULAR TIMES SERVICE
// ============================================================================

/**
 * Popular Times Service Interface
 *
 * Analyzes historical booking data to suggest popular booking times
 *
 * @see spec.md FR-023 Popular Times Suggestion
 * @see research.md Section 5 Popular Times Algorithm
 */
export interface IPopularTimesService {
  /**
   * Get popular booking times for salon
   *
   * Algorithm:
   * 1. Query last 90 days of bookings
   * 2. Group by day-of-week and hour
   * 3. Apply recency weighting (last 30 days = 2x, 31-60 days = 1.5x, 61-90 = 1x)
   * 4. Sort by weighted score
   * 5. Check current availability
   * 6. Fallback to industry defaults if <10 bookings
   *
   * @param query - Query parameters
   * @returns Popular time slots with availability status
   *
   * @performance <100ms with Redis cache (1-hour TTL)
   *
   * @example
   * const result = await popularTimes.getPopularTimes({
   *   salonId: '123',
   *   lookbackDays: 90,
   *   limit: 6,
   *   includeAvailability: true
   * });
   * // Returns: { times: [...], dataSource: 'historical', historicalBookingsCount: 150 }
   */
  getPopularTimes(query: PopularTimesQuery): Promise<PopularTimesResult>;

  /**
   * Get industry default popular times (for new salons)
   *
   * @returns Default time slots (Friday 2-3pm, Saturday 10am/2pm)
   */
  getDefaultPopularTimes(): PopularTimeSlot[];

  /**
   * Clear cached popular times for salon
   *
   * Call this after new bookings to invalidate cache
   *
   * @param salonId - Salon ID
   */
  clearCache(salonId: string): Promise<void>;
}

// ============================================================================
// 4. WAITLIST NOTIFIER SERVICE
// ============================================================================

/**
 * Waitlist Notifier Service Interface
 *
 * Manages waitlist notifications with 15-minute expiry timers
 *
 * @see spec.md FR-022 Waitlist Notification System
 * @see research.md Section 3 Waitlist Technical Design
 */
export interface IWaitlistNotifierService {
  /**
   * Notify first customer in waitlist of slot opening
   *
   * Flow:
   * 1. Find first active waitlist entry for service
   * 2. Send WhatsApp notification with [Book Now] button
   * 3. Update status to 'notified'
   * 4. Schedule 15-minute expiry check (BullMQ delayed job)
   *
   * @param slotId - Slot that became available
   * @returns Notified waitlist entry or null if queue empty
   *
   * @example
   * await waitlistNotifier.notifyWaitlistOfOpening('slot_123');
   * // Sends WhatsApp message, starts 15-min timer
   */
  notifyWaitlistOfOpening(slotId: string): Promise<WaitlistEntry | null>;

  /**
   * Handle customer clicking [Book Now] within 15 minutes
   *
   * Flow:
   * 1. Check expiry time (reject if >15 min)
   * 2. Check slot still available (race condition handling)
   * 3. Create booking with PostgreSQL row lock
   * 4. Update waitlist status to 'booked'
   * 5. Cancel expiry timer
   *
   * @param waitlistId - Waitlist entry ID
   * @param slotId - Slot customer wants to book
   * @returns Booking or error if expired/unavailable
   *
   * @throws WaitlistNotificationExpiredError if >15 min elapsed
   * @throws SlotConflictError if slot already booked
   */
  handleWaitlistBooking(
    waitlistId: string,
    slotId: string
  ): Promise<{ bookingId: string; message: string }>;

  /**
   * Handle customer clicking [Pass] button
   *
   * Flow:
   * 1. Mark waitlist entry as 'passed'
   * 2. Cancel expiry timer
   * 3. Notify next person in queue
   *
   * @param waitlistId - Waitlist entry ID
   */
  handleWaitlistPass(waitlistId: string): Promise<void>;

  /**
   * Handle 15-minute expiry (called by BullMQ job)
   *
   * Flow:
   * 1. Check if still 'notified' (may have booked/passed already)
   * 2. Mark as 'expired'
   * 3. Send customer "offer expired, still in queue" message
   * 4. Recursively notify next person
   *
   * @param waitlistId - Waitlist entry ID
   */
  handleWaitlistExpiry(waitlistId: string): Promise<void>;

  /**
   * Get customer's position in waitlist queue
   *
   * @param waitlistId - Waitlist entry ID
   * @returns Position (1 = next to be notified)
   */
  getQueuePosition(waitlistId: string): Promise<number>;
}

// ============================================================================
// 5. QUICK BOOKING SERVICE (Main Orchestrator)
// ============================================================================

/**
 * Quick Booking Service Interface
 *
 * Main orchestrator for zero-typing booking flow
 *
 * @see spec.md User Story 1 - Zero-Typing Touch-Based Booking
 * @see research.md Section 4.1 AI Optimization
 */
export interface IQuickBookingService {
  /**
   * Handle initial booking request from customer
   *
   * Flow:
   * 1. Check if returning customer + "book usual" → bypass AI
   * 2. Otherwise, parse intent with GPT-3.5-turbo
   * 3. Find available slots (infinite search)
   * 4. Rank alternatives by proximity
   * 5. Build interactive card (Reply Buttons or List Message)
   * 6. Send to customer via WhatsApp
   *
   * @param request - Customer's message and context
   * @returns Interactive card payload or error
   *
   * @performance
   * - Returning customers (bypass AI): <500ms
   * - New customers (AI parse): <2s
   *
   * @example
   * const response = await quickBooking.handleBookingRequest({
   *   text: 'Haircut Friday 3pm',
   *   customerPhone: '+1234567890',
   *   salonId: '123',
   *   language: 'en'
   * });
   * // Returns: { success: true, messageType: 'interactive_card', payload: {...} }
   */
  handleBookingRequest(request: {
    text: string;
    customerPhone: string;
    salonId: string;
    language?: string;
  }): Promise<{
    success: boolean;
    messageType: 'interactive_card' | 'text' | 'error';
    payload: InteractiveMessagePayload | { text: string };
    intent?: BookingIntent;
  }>;

  /**
   * Handle button click from interactive card
   *
   * Flow:
   * 1. Parse button ID (slot_*, confirm_*, etc.)
   * 2. Route to appropriate handler
   * 3. Return next card or confirmation message
   *
   * @param buttonId - Button ID from webhook
   * @param customerPhone - Customer phone number
   * @returns Next step in booking flow
   */
  handleButtonClick(
    buttonId: string,
    customerPhone: string
  ): Promise<{
    success: boolean;
    messageType: 'interactive_card' | 'text' | 'booking_confirmed';
    payload: InteractiveMessagePayload | { text: string } | { bookingId: string };
  }>;

  /**
   * Check if customer is eligible for "Book Your Usual" fast-track
   *
   * Criteria: 3+ past bookings
   *
   * @param customerId - Customer ID
   * @returns True if eligible
   */
  isReturningCustomer(customerId: string): Promise<boolean>;

  /**
   * Get customer's usual booking preferences
   *
   * @param customerId - Customer ID
   * @returns Preferences or null if <3 bookings
   */
  getUsualPreferences(customerId: string): Promise<CustomerPreferences | null>;
}

// ============================================================================
// 6. TYPED MESSAGE HANDLER SERVICE
// ============================================================================

/**
 * Typed Message Handler Service Interface
 *
 * Handles typed messages after interactive buttons shown (graceful fallback)
 *
 * @see spec.md FR-021 Handle Typed Messages After Buttons
 */
export interface ITypedMessageHandlerService {
  /**
   * Handle typed message after buttons were shown
   *
   * Flow:
   * 1. Parse new preference from text (e.g., "Actually Saturday")
   * 2. Merge with existing context (preserve service, master if not changed)
   * 3. Return updated intent WITHOUT restarting entire flow
   *
   * @param params - Typed message and current context
   * @returns Updated intent with preserved fields
   *
   * @example
   * // Bot showed Friday slots, customer types "Actually Saturday"
   * const result = await typedHandler.handleTypedMessageAfterButtons({
   *   text: 'Actually Saturday',
   *   conversationContext: { serviceId: '456', masterId: 'm123', preferredDate: '2024-10-25' }
   * });
   * // Returns: { updatedContext: { ..., preferredDate: '2024-10-26' }, shouldShowNewSlots: true }
   */
  handleTypedMessageAfterButtons(params: {
    text: string;
    conversationContext: BookingIntent;
  }): Promise<{
    updatedContext: BookingIntent;
    shouldShowNewSlots: boolean;
    message: string;
  }>;

  /**
   * Parse intent update from typed message
   *
   * Extracts only changed fields (e.g., new date but keep same service)
   *
   * @param text - Customer's typed message
   * @param currentContext - Current conversation context
   * @returns Partial intent with only updated fields
   */
  parseIntentUpdate(
    text: string,
    currentContext: BookingIntent
  ): Promise<IntentUpdate>;

  /**
   * Detect if typed message is a preference change
   *
   * Examples: "Different master", "Saturday instead", "Earlier time"
   *
   * @param text - Customer's message
   * @returns True if likely a preference update
   */
  isPreferenceChange(text: string): boolean;
}

// ============================================================================
// EXPORTS
// ============================================================================

export type {
  ISlotFinderService,
  IAlternativeSuggesterService,
  IPopularTimesService,
  IWaitlistNotifierService,
  IQuickBookingService,
  ITypedMessageHandlerService,
};
