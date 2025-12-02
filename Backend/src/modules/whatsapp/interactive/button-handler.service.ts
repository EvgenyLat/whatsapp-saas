/**
 * Button Handler Service
 *
 * Handles button clicks from WhatsApp interactive messages for the Quick Booking feature.
 * Manages slot selection, booking confirmation, session state, and database transactions.
 *
 * Features:
 * - Slot availability validation with row locking
 * - Session-based state management
 * - Booking creation with Prisma transactions
 * - Automatic retry with exponential backoff
 * - Conflict detection and alternative slot suggestions
 * - Multi-language support
 * - Analytics tracking for button interactions
 *
 * Task IDs:
 * - T031: Slot selection handler
 * - T032: Booking confirmation handler
 *
 * @module modules/whatsapp/interactive
 */

import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { InteractiveCardBuilder, TimeSlot } from './interactive-message.builder';
import { ButtonParserService } from './button-parser.service';
import { InteractiveMessagePayload, ParsedSlotButton } from '../../../types/whatsapp.types';
import { Booking } from '@prisma/client';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Slot data stored in session context
 */
export interface SlotData {
  /** Slot date in ISO format (YYYY-MM-DD) */
  date: string;
  /** Slot time in 24-hour format (HH:MM) */
  time: string;
  /** Master ID */
  masterId: string;
  /** Master name */
  masterName: string;
  /** Service ID */
  serviceId: string;
  /** Service name */
  serviceName: string;
  /** Service duration in minutes */
  duration: number;
  /** Service price */
  price: number;
  /** Session timestamp (for expiration) */
  timestamp: number;
}

/**
 * Session context for customer booking flow
 */
export interface SessionContext {
  /** Selected slot data */
  selectedSlot: SlotData;
  /** Customer phone number */
  customerPhone: string;
  /** Customer name */
  customerName?: string;
  /** Salon ID */
  salonId: string;
  /** Language preference */
  language: string;
  /** Session creation timestamp */
  timestamp: number;
}

/**
 * Slot selection response
 */
export interface SlotSelectionResponse {
  /** Operation success status */
  success: boolean;
  /** Interactive message card payload */
  card: InteractiveMessagePayload;
  /** Optional message for logging/debugging */
  message?: string;
}

/**
 * Booking confirmation response
 */
export interface BookingConfirmationResponse {
  /** Operation success status */
  success: boolean;
  /** Success/error message */
  message: string;
  /** Booking ID (if successful) */
  bookingId?: string;
  /** Booking code (if successful) */
  bookingCode?: string;
}

/**
 * Availability check result
 */
interface AvailabilityCheckResult {
  /** Whether the slot is available */
  available: boolean;
  /** Existing booking (if slot is taken) */
  existingBooking?: Booking;
  /** Conflict reason (if unavailable) */
  reason?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Session expiration time in milliseconds (15 minutes) */
const SESSION_EXPIRATION_MS = 15 * 60 * 1000;

/** Maximum retry attempts for database operations */
const MAX_RETRY_ATTEMPTS = 3;

/** Base retry delay in milliseconds */
const RETRY_BASE_DELAY_MS = 100;

/** Booking code prefix */
const BOOKING_CODE_PREFIX = 'BK';

// ============================================================================
// SERVICE
// ============================================================================

/**
 * Button Handler Service
 *
 * Handles WhatsApp button interactions for booking flow:
 * 1. Slot selection (T031)
 * 2. Booking confirmation (T032)
 *
 * @example
 * ```typescript
 * // Handle slot selection
 * const result = await buttonHandler.handleSlotSelection(
 *   'slot_2024-10-25_15:00_m123',
 *   '+1234567890',
 *   'salon-uuid',
 *   'en'
 * );
 *
 * // Handle booking confirmation
 * const confirmation = await buttonHandler.handleBookingConfirmation(
 *   'confirm_booking_temp-session-id',
 *   '+1234567890',
 *   'salon-uuid',
 *   'en'
 * );
 * ```
 */
@Injectable()
export class ButtonHandlerService {
  private readonly logger = new Logger(ButtonHandlerService.name);

  /**
   * In-memory session store
   * Key: `${customerPhone}_${salonId}`
   * Value: SessionContext
   *
   * Note: In production, use Redis for distributed session storage
   */
  private readonly sessions = new Map<string, SessionContext>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly cardBuilder: InteractiveCardBuilder,
    private readonly buttonParser: ButtonParserService,
  ) {
    // Start session cleanup task (every 5 minutes)
    this.startSessionCleanup();
  }

  // ==========================================================================
  // PUBLIC METHODS - T031: Slot Selection Handler
  // ==========================================================================

  /**
   * Handles slot selection button clicks (T031)
   *
   * Flow:
   * 1. Parse button ID → extract date, time, masterId
   * 2. Check slot availability (query bookings table)
   * 3. If available:
   *    - Store slot in session context
   *    - Build confirmation card
   *    - Return card payload
   * 4. If unavailable:
   *    - Build "slot taken" message
   *    - Show alternative slots
   *    - Return alternatives card
   *
   * @param buttonId - Button ID (format: `slot_{date}_{time}_{masterId}`)
   * @param customerPhone - Customer phone number in E.164 format
   * @param salonId - Salon UUID
   * @param language - Customer language preference
   * @returns Slot selection response with interactive card
   * @throws BadRequestException if button ID is invalid
   *
   * @example
   * ```typescript
   * const result = await handleSlotSelection(
   *   'slot_2024-10-25_15:00_m123',
   *   '+1234567890',
   *   'salon-uuid-123',
   *   'en'
   * );
   *
   * if (result.success) {
   *   // Send confirmation card to customer
   *   await whatsappService.sendMessage(result.card);
   * }
   * ```
   */
  async handleSlotSelection(
    buttonId: string,
    customerPhone: string,
    salonId: string,
    language: string = 'en',
  ): Promise<SlotSelectionResponse> {
    this.logger.log(
      `Handling slot selection: buttonId=${buttonId}, phone=${customerPhone}, salon=${salonId}`,
    );

    // Step 1: Parse button ID
    let parsedSlot: ParsedSlotButton;
    try {
      parsedSlot = this.buttonParser.parseSlotButton(buttonId);
      this.logger.debug(`Parsed slot: ${JSON.stringify(parsedSlot)}`);
    } catch (error) {
      this.logger.error(`Failed to parse slot button ID: ${buttonId}`, error);
      throw new BadRequestException(`Invalid slot button ID: ${buttonId}`);
    }

    const { date, time, masterId } = parsedSlot;

    // Step 2: Check slot availability
    const availabilityResult = await this.validateSlotAvailability(masterId, date, time, salonId);

    // Step 3: Handle slot unavailable
    if (!availabilityResult.available) {
      this.logger.warn(
        `Slot unavailable: ${date} ${time} with master ${masterId}. Reason: ${availabilityResult.reason}`,
      );

      return await this.handleSlotUnavailable(
        masterId,
        date,
        time,
        salonId,
        customerPhone,
        language,
        availabilityResult.reason,
      );
    }

    // Step 4: Fetch master and service details
    const master = await this.prisma.master.findUnique({
      where: { id: masterId, salon_id: salonId },
    });

    if (!master) {
      this.logger.error(`Master not found: ${masterId} in salon ${salonId}`);
      throw new BadRequestException(`Master not found: ${masterId}`);
    }

    // For now, use a default service (in production, extract from session context)
    // TODO: Get actual service from initial booking intent
    const service = await this.prisma.service.findFirst({
      where: { salon_id: salonId, is_active: true },
    });

    if (!service) {
      this.logger.error(`No active services found for salon ${salonId}`);
      throw new BadRequestException(`No services available for booking`);
    }

    // Step 5: Store slot in session
    const slotData: SlotData = {
      date,
      time,
      masterId,
      masterName: master.name,
      serviceId: service.id,
      serviceName: service.name,
      duration: service.duration_minutes,
      price: Number(service.price),
      timestamp: Date.now(),
    };

    this.storeSession(customerPhone, salonId, slotData, language);

    // Step 6: Build confirmation card
    const card = this.cardBuilder.buildConfirmationCard({
      booking: {
        bookingId: 'temp-session', // Temporary ID until confirmation
        serviceName: service.name,
        date,
        time,
        masterName: master.name,
        masterId: master.id,
        duration: service.duration_minutes,
        price: `$${(Number(service.price) / 100).toFixed(2)}`,
      },
      language: language as any,
      customerPhone,
    });

    // Step 7: Track analytics
    await this.trackButtonClick('slot_selection', buttonId, customerPhone, salonId);

    this.logger.log(`Slot selection successful: ${date} ${time} with ${master.name}`);

    return {
      success: true,
      card,
      message: `Slot selected: ${date} ${time} with ${master.name}`,
    };
  }

  // ==========================================================================
  // PUBLIC METHODS - T032: Booking Confirmation Handler
  // ==========================================================================

  /**
   * Handles booking confirmation button clicks (T032)
   *
   * Flow:
   * 1. Parse button ID → extract booking context
   * 2. Retrieve selected slot from session
   * 3. Create booking in database:
   *    - Use Prisma transaction
   *    - Add row locking to prevent double-booking
   *    - Generate unique booking code
   * 4. Send confirmation message
   * 5. Clear session context
   * 6. Return success response with booking ID
   *
   * @param buttonId - Button ID (format: `confirm_booking_{entityId}`)
   * @param customerPhone - Customer phone number in E.164 format
   * @param salonId - Salon UUID
   * @param language - Customer language preference
   * @returns Booking confirmation response
   * @throws BadRequestException if session expired or invalid
   * @throws ConflictException if slot was booked by another customer
   *
   * @example
   * ```typescript
   * const result = await handleBookingConfirmation(
   *   'confirm_booking_temp-session',
   *   '+1234567890',
   *   'salon-uuid-123',
   *   'en'
   * );
   *
   * if (result.success) {
   *   console.log(`Booking confirmed: ${result.bookingId}`);
   * }
   * ```
   */
  async handleBookingConfirmation(
    buttonId: string,
    customerPhone: string,
    salonId: string,
    language: string = 'en',
  ): Promise<BookingConfirmationResponse> {
    this.logger.log(
      `Handling booking confirmation: buttonId=${buttonId}, phone=${customerPhone}, salon=${salonId}`,
    );

    // Step 1: Parse button ID
    let parsedButton;
    try {
      parsedButton = this.buttonParser.parseConfirmButton(buttonId);
      this.logger.debug(`Parsed confirm button: ${JSON.stringify(parsedButton)}`);
    } catch (error) {
      this.logger.error(`Failed to parse confirm button ID: ${buttonId}`, error);
      throw new BadRequestException(`Invalid confirm button ID: ${buttonId}`);
    }

    // Step 2: Retrieve slot from session
    const session = this.getSession(customerPhone, salonId);

    if (!session) {
      this.logger.warn(`Session not found or expired for ${customerPhone} in salon ${salonId}`);
      throw new BadRequestException('Session expired. Please select a time slot again.');
    }

    const { selectedSlot, customerName } = session;

    // Step 3: Final availability check (prevent race conditions)
    const availabilityResult = await this.validateSlotAvailability(
      selectedSlot.masterId,
      selectedSlot.date,
      selectedSlot.time,
      salonId,
    );

    if (!availabilityResult.available) {
      this.logger.warn(
        `Slot became unavailable during confirmation: ${selectedSlot.date} ${selectedSlot.time}`,
      );

      // Clear session and notify customer
      this.clearSession(customerPhone, salonId);

      throw new ConflictException(
        `Sorry, this time slot was just booked by another customer. Please select another time.`,
      );
    }

    // Step 4: Create booking with retry logic
    let bookingId: string;
    let bookingCode: string;

    try {
      const result = await this.createBookingWithRetry(
        customerPhone,
        customerName || 'Customer',
        salonId,
        selectedSlot,
      );

      bookingId = result.id;
      bookingCode = result.booking_code;

      this.logger.log(`Booking created successfully: ${bookingCode} (${bookingId})`);
    } catch (error) {
      this.logger.error(`Failed to create booking after retries:`, error);

      // Clear session on failure
      this.clearSession(customerPhone, salonId);

      throw new BadRequestException(
        'Failed to create booking. Please try again or contact support.',
      );
    }

    // Step 5: Build confirmation message
    const confirmationMessage = this.buildConfirmationMessage(selectedSlot, bookingCode, language);

    // Step 6: Clear session
    this.clearSession(customerPhone, salonId);

    // Step 7: Track analytics
    await this.trackButtonClick('booking_confirmation', buttonId, customerPhone, salonId);

    this.logger.log(`Booking confirmation successful: ${bookingCode} for ${customerPhone}`);

    // Note: The confirmation message is sent by the webhook service (webhook.service.ts:319-326)
    // after this method returns. We return the message for the webhook to send.
    return {
      success: true,
      message: confirmationMessage,
      bookingId,
      bookingCode,
    };
  }

  // ==========================================================================
  // PUBLIC METHODS - Slot Availability Validation
  // ==========================================================================

  /**
   * Validates if a time slot is still available
   *
   * Checks the bookings table for existing confirmed bookings
   * that overlap with the requested slot.
   *
   * @param masterId - Master UUID
   * @param date - Slot date in ISO format (YYYY-MM-DD)
   * @param time - Slot time in 24-hour format (HH:MM)
   * @param salonId - Salon UUID (optional, for additional validation)
   * @returns True if slot is available, false otherwise
   *
   * @example
   * ```typescript
   * const isAvailable = await validateSlotAvailability(
   *   'm123',
   *   '2024-10-25',
   *   '15:00'
   * );
   *
   * if (isAvailable) {
   *   // Proceed with booking
   * }
   * ```
   */
  async validateSlotAvailability(
    masterId: string,
    date: string,
    time: string,
    salonId?: string,
  ): Promise<AvailabilityCheckResult> {
    this.logger.debug(
      `Validating slot availability: master=${masterId}, date=${date}, time=${time}`,
    );

    // Build datetime for query (using local timezone for consistent comparison)
    const startTs = new Date(`${date}T${time}:00`);

    // Check if the slot is in the past
    const now = new Date();
    if (startTs < now) {
      this.logger.warn(
        `Slot is in the past: ${date} ${time} (requested: ${startTs.toISOString()}, now: ${now.toISOString()})`,
      );
      return {
        available: false,
        reason: 'Cannot book time slots in the past',
      };
    }

    // Variables to track for later use
    let salon: { working_hours_start: string; working_hours_end: string } | null = null;
    let workingHours: Record<string, any> | null = null;
    let dayName: string | null = null;

    // Step 1: Check salon working hours
    if (salonId) {
      salon = await this.prisma.salon.findUnique({
        where: { id: salonId },
        select: {
          working_hours_start: true,
          working_hours_end: true,
        },
      });

      if (salon) {
        const requestedTime = time; // "14:00" format

        // Compare times as strings (HH:MM format)
        if (requestedTime < salon.working_hours_start || requestedTime >= salon.working_hours_end) {
          this.logger.warn(
            `Slot outside salon working hours: ${requestedTime} (salon hours: ${salon.working_hours_start} - ${salon.working_hours_end})`,
          );

          // Format hours for user-friendly display
          const startHour = this.formatTimeForDisplay(salon.working_hours_start);
          const endHour = this.formatTimeForDisplay(salon.working_hours_end);

          return {
            available: false,
            reason: `Salon is closed at this time. Working hours: ${startHour} - ${endHour}`,
          };
        }

        this.logger.debug(
          `Salon working hours check passed: ${requestedTime} is within ${salon.working_hours_start} - ${salon.working_hours_end}`,
        );
      }
    }

    // Step 2: Check master availability and working hours
    const master = await this.prisma.master.findUnique({
      where: { id: masterId },
      select: {
        working_hours: true,
        is_active: true,
        name: true,
      },
    });

    if (!master || !master.is_active) {
      this.logger.warn(`Master not found or inactive: ${masterId}`);
      return {
        available: false,
        reason: 'This staff member is not available',
      };
    }

    // Step 3: Validate master working hours for the requested day/time
    try {
      const requestedDate = new Date(`${date}T00:00:00`);
      const dayNames = [
        'sunday',
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
      ];
      dayName = dayNames[requestedDate.getDay()];

      workingHours = master.working_hours as Record<string, any>;

      if (workingHours && typeof workingHours === 'object') {
        const daySchedule = workingHours[dayName];

        if (!daySchedule || !daySchedule.start || !daySchedule.end) {
          this.logger.warn(`Master ${master.name} doesn't work on ${dayName}`);
          return {
            available: false,
            reason: `This staff member is not available on ${dayName}s`,
          };
        }

        // Check if requested time is within master's working hours
        const requestedTime = time; // "14:00" format
        if (requestedTime < daySchedule.start || requestedTime >= daySchedule.end) {
          this.logger.warn(
            `Slot outside master working hours: ${requestedTime} (master ${master.name} hours on ${dayName}: ${daySchedule.start} - ${daySchedule.end})`,
          );

          const startHour = this.formatTimeForDisplay(daySchedule.start);
          const endHour = this.formatTimeForDisplay(daySchedule.end);

          return {
            available: false,
            reason: `This staff member is not available at this time. Working hours: ${startHour} - ${endHour}`,
          };
        }

        this.logger.debug(
          `Master working hours check passed: ${requestedTime} is within ${daySchedule.start} - ${daySchedule.end} on ${dayName}`,
        );
      } else {
        // Graceful degradation: if working_hours is not properly structured, log warning and allow booking
        this.logger.warn(
          `Master ${masterId} has invalid working_hours format. Skipping working hours validation (graceful degradation).`,
        );
      }
    } catch (error) {
      // Graceful degradation: if anything fails during working hours parsing, log and continue
      this.logger.warn(
        `Error parsing master working hours for ${masterId}: ${error.message}. Continuing with booking (graceful degradation).`,
      );
    }

    // Step 4: Check service duration doesn't exceed available time
    // Note: We need to get service info from the session or context
    // For now, we'll do a best-effort check using the master's working hours
    try {
      if (
        workingHours &&
        typeof workingHours === 'object' &&
        dayName &&
        typeof dayName === 'string'
      ) {
        const daySchedule = workingHours[dayName as string];

        if (daySchedule && daySchedule.end) {
          // Get service duration from session context or default to 60 minutes
          // This is a simplified check - in production, get actual service duration from session
          const estimatedServiceDuration = 60; // Default 60 minutes

          // Calculate end time of the booking
          const [startHour, startMinute] = time.split(':').map(Number);
          const endMinute = startMinute + estimatedServiceDuration;
          const endHour = startHour + Math.floor(endMinute / 60);
          const actualEndMinute = endMinute % 60;

          const bookingEndTime = `${endHour.toString().padStart(2, '0')}:${actualEndMinute.toString().padStart(2, '0')}`;

          // Check if booking end time exceeds working hours
          if (bookingEndTime > daySchedule.end) {
            this.logger.warn(
              `Service duration exceeds available time: booking would end at ${bookingEndTime}, but working hours end at ${daySchedule.end}`,
            );

            return {
              available: false,
              reason: 'Service duration exceeds available time slot',
            };
          }

          this.logger.debug(
            `Service duration check passed: booking ends at ${bookingEndTime}, within working hours ending at ${daySchedule.end}`,
          );
        }
      }

      // Also check against salon working hours if available
      if (salonId && salon) {
        const [startHour, startMinute] = time.split(':').map(Number);
        const estimatedServiceDuration = 60; // Default 60 minutes
        const endMinute = startMinute + estimatedServiceDuration;
        const endHour = startHour + Math.floor(endMinute / 60);
        const actualEndMinute = endMinute % 60;

        const bookingEndTime = `${endHour.toString().padStart(2, '0')}:${actualEndMinute.toString().padStart(2, '0')}`;

        if (bookingEndTime > salon.working_hours_end) {
          this.logger.warn(
            `Service duration exceeds salon hours: booking would end at ${bookingEndTime}, but salon closes at ${salon.working_hours_end}`,
          );

          const endHourFormatted = this.formatTimeForDisplay(salon.working_hours_end);

          return {
            available: false,
            reason: `Service duration exceeds available time. Salon closes at ${endHourFormatted}`,
          };
        }
      }
    } catch (error) {
      // Graceful degradation: if duration check fails, log and continue
      this.logger.warn(
        `Error checking service duration overlap: ${error.message}. Continuing with booking (graceful degradation).`,
      );
    }

    // Step 5: Query for overlapping bookings
    const whereClause: any = {
      master_id: masterId,
      start_ts: startTs,
      status: {
        in: ['CONFIRMED', 'PENDING', 'IN_PROGRESS'], // Standard status filter
      },
    };

    if (salonId) {
      whereClause.salon_id = salonId;
    }

    const existingBooking = await this.prisma.booking.findFirst({
      where: whereClause,
    });

    if (existingBooking) {
      this.logger.debug(`Slot unavailable: existing booking ${existingBooking.booking_code}`);

      return {
        available: false,
        existingBooking,
        reason: `Slot already booked (${existingBooking.booking_code})`,
      };
    }

    this.logger.debug(`Slot available: ${date} ${time} with master ${masterId}`);

    return {
      available: true,
    };
  }

  // ==========================================================================
  // PRIVATE METHODS - Booking Creation
  // ==========================================================================

  /**
   * Creates a booking with retry logic and exponential backoff
   *
   * Uses Prisma transactions with row locking to prevent double-booking.
   * Automatically retries on transient errors.
   *
   * @param customerPhone - Customer phone number
   * @param customerName - Customer name
   * @param salonId - Salon UUID
   * @param slot - Slot data
   * @returns Created booking
   * @throws Error if all retry attempts fail
   */
  private async createBookingWithRetry(
    customerPhone: string,
    customerName: string,
    salonId: string,
    slot: SlotData,
  ): Promise<Booking> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        this.logger.debug(`Creating booking (attempt ${attempt}/${MAX_RETRY_ATTEMPTS})`);

        const booking = await this.createBooking(customerPhone, customerName, salonId, slot);

        this.logger.log(`Booking created on attempt ${attempt}`);
        return booking;
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(`Booking creation failed on attempt ${attempt}: ${lastError.message}`);

        // Don't retry on validation errors
        if (error instanceof BadRequestException || error instanceof ConflictException) {
          throw error;
        }

        // Exponential backoff before retry
        if (attempt < MAX_RETRY_ATTEMPTS) {
          const delayMs = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
          this.logger.debug(`Retrying in ${delayMs}ms...`);
          await this.sleep(delayMs);
        }
      }
    }

    throw new Error(
      `Failed to create booking after ${MAX_RETRY_ATTEMPTS} attempts: ${lastError?.message}`,
    );
  }

  /**
   * Creates a booking in the database using Prisma transaction
   *
   * Uses row locking (`FOR UPDATE`) to prevent race conditions.
   * Generates a unique booking code.
   *
   * @param customerPhone - Customer phone number
   * @param customerName - Customer name
   * @param salonId - Salon UUID
   * @param slot - Slot data
   * @returns Created booking
   */
  private async createBooking(
    customerPhone: string,
    customerName: string,
    salonId: string,
    slot: SlotData,
  ): Promise<Booking> {
    // Validate that slot is not in the past BEFORE starting transaction
    const slotDateTime = new Date(`${slot.date}T${slot.time}:00`);
    const now = new Date();
    if (slotDateTime < now) {
      this.logger.error(
        `Attempted to book past slot: ${slot.date} ${slot.time} (slot: ${slotDateTime.toISOString()}, now: ${now.toISOString()})`,
      );
      throw new BadRequestException(
        'Cannot book time slots in the past. Please choose a future time.',
      );
    }

    return await this.prisma.$transaction(async (tx) => {
      // Step 1: Lock the MASTER row first (always exists, prevents race condition)
      const master = await tx.master.findUnique({
        where: { id: slot.masterId },
        select: { id: true },
      });

      if (!master) {
        throw new NotFoundException('Master not found');
      }

      // Lock the master row to serialize all bookings for this master
      await tx.$executeRaw`
        SELECT * FROM masters
        WHERE id = ${slot.masterId}
        FOR UPDATE
      `;

      // Step 2: Check for time overlap conflicts (now race-condition free)
      const startTs = new Date(`${slot.date}T${slot.time}:00`);
      const endTs = new Date(startTs.getTime() + slot.duration * 60 * 1000);

      // Check for ANY overlap: new booking overlaps with existing bookings
      const existingBookings = await tx.booking.findMany({
        where: {
          master_id: slot.masterId,
          status: {
            in: ['CONFIRMED', 'PENDING', 'IN_PROGRESS'],
          },
          OR: [
            // Case 1: Existing booking starts during new booking
            {
              start_ts: {
                gte: startTs,
                lt: endTs,
              },
            },
            // Case 2: Existing booking ends during new booking
            {
              end_ts: {
                gt: startTs,
                lte: endTs,
              },
            },
            // Case 3: Existing booking completely contains new booking
            {
              start_ts: {
                lte: startTs,
              },
              end_ts: {
                gte: endTs,
              },
            },
          ],
        },
      });

      if (existingBookings.length > 0) {
        this.logger.warn(
          `Booking conflict detected for master ${slot.masterId} at ${startTs.toISOString()}. Existing booking: ${existingBookings[0].booking_code}`,
        );
        throw new ConflictException(
          `This time slot is no longer available. Please choose another time.`,
        );
      }

      // Step 3: Generate unique booking code
      const bookingCode = await this.generateBookingCode(tx);

      // Step 4: Create booking
      const booking = await tx.booking.create({
        data: {
          booking_code: bookingCode,
          salon_id: salonId,
          customer_phone: customerPhone,
          customer_name: customerName,
          service: slot.serviceName,
          start_ts: startTs,
          end_ts: endTs,
          status: 'CONFIRMED',
          master_id: slot.masterId,
          service_id: slot.serviceId,
          metadata: {
            price: slot.price,
            duration: slot.duration,
            created_via: 'whatsapp_quick_booking',
            button_handler: 'v1',
          },
        },
      });

      // Step 5: Increment salon usage counter
      await tx.salon.update({
        where: { id: salonId },
        data: {
          usage_current_bookings: {
            increment: 1,
          },
        },
      });

      return booking;
    });
  }

  /**
   * Generates a unique booking code
   *
   * Format: `BK{random-6-digits}`
   * Example: `BK847392`
   *
   * @param tx - Prisma transaction client
   * @returns Unique booking code
   */
  private async generateBookingCode(tx: any): Promise<string> {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const randomSuffix = Math.floor(100000 + Math.random() * 900000); // 6 digits
      const bookingCode = `${BOOKING_CODE_PREFIX}${randomSuffix}`;

      // Check if code already exists
      const existing = await tx.booking.findFirst({
        where: { booking_code: bookingCode },
      });

      if (!existing) {
        return bookingCode;
      }

      attempts++;
    }

    throw new Error('Failed to generate unique booking code');
  }

  // ==========================================================================
  // PRIVATE METHODS - Slot Unavailable Handling
  // ==========================================================================

  /**
   * Handles slot unavailable scenario
   *
   * Fetches alternative slots and builds a message with suggestions.
   *
   * @param masterId - Master ID
   * @param date - Original date
   * @param time - Original time
   * @param salonId - Salon ID
   * @param customerPhone - Customer phone
   * @param language - Language preference
   * @param reason - Unavailability reason
   * @returns Slot selection response with alternatives
   */
  private async handleSlotUnavailable(
    masterId: string,
    date: string,
    time: string,
    salonId: string,
    customerPhone: string,
    language: string,
    _reason?: string,
  ): Promise<SlotSelectionResponse> {
    // Fetch alternative slots (next 3 available slots for same master)
    const alternativeSlots = await this.fetchAlternativeSlots(masterId, salonId, date, 3);

    if (alternativeSlots.length === 0) {
      // No alternatives available
      return {
        success: false,
        card: {
          messaging_product: 'whatsapp',
          to: customerPhone,
          type: 'text',
          text: {
            body: `Sorry, the selected time slot (${date} ${time}) is no longer available and we couldn't find alternative times. Please try selecting a different date or master.`,
          },
        } as any,
        message: 'No alternative slots available',
      };
    }

    // Build card with alternative slots
    const card = this.cardBuilder.buildSlotSelectionCard({
      slots: alternativeSlots,
      language: language as any,
      customerPhone,
      serviceName: 'Alternative Times',
    });

    return {
      success: false,
      card,
      message: `Slot unavailable. Showing ${alternativeSlots.length} alternatives.`,
    };
  }

  /**
   * Fetches alternative time slots
   *
   * Finds available slots for the same master starting from the requested date.
   *
   * @param masterId - Master ID
   * @param salonId - Salon ID
   * @param fromDate - Start date for search
   * @param limit - Maximum number of slots to return
   * @returns Array of available time slots
   */
  private async fetchAlternativeSlots(
    masterId: string,
    salonId: string,
    fromDate: string,
    limit: number,
  ): Promise<TimeSlot[]> {
    // This is a simplified implementation
    // In production, use a slot availability service to generate available slots

    const master = await this.prisma.master.findUnique({
      where: { id: masterId },
    });

    if (!master) {
      return [];
    }

    // Mock alternative slots (replace with actual availability logic)
    const slots: TimeSlot[] = [
      {
        date: fromDate,
        time: '16:00',
        masterId,
        masterName: master.name,
      },
      {
        date: fromDate,
        time: '17:00',
        masterId,
        masterName: master.name,
      },
      {
        date: fromDate,
        time: '18:00',
        masterId,
        masterName: master.name,
      },
    ];

    return slots.slice(0, limit);
  }

  // ==========================================================================
  // PRIVATE METHODS - Session Management
  // ==========================================================================

  /**
   * Stores slot data in session context
   *
   * @param customerPhone - Customer phone number
   * @param salonId - Salon ID
   * @param slotData - Slot data to store
   * @param language - Language preference
   */
  private storeSession(
    customerPhone: string,
    salonId: string,
    slotData: SlotData,
    language: string,
    customerName?: string,
  ): void {
    const sessionKey = this.getSessionKey(customerPhone, salonId);

    const sessionContext: SessionContext = {
      selectedSlot: slotData,
      customerPhone,
      customerName,
      salonId,
      language,
      timestamp: Date.now(),
    };

    this.sessions.set(sessionKey, sessionContext);

    this.logger.debug(`Session stored for ${customerPhone}: ${JSON.stringify(slotData)}`);
  }

  /**
   * Retrieves session context
   *
   * @param customerPhone - Customer phone number
   * @param salonId - Salon ID
   * @returns Session context or null if expired/not found
   */
  private getSession(customerPhone: string, salonId: string): SessionContext | null {
    const sessionKey = this.getSessionKey(customerPhone, salonId);
    const session = this.sessions.get(sessionKey);

    if (!session) {
      return null;
    }

    // Check expiration
    const age = Date.now() - session.timestamp;
    if (age > SESSION_EXPIRATION_MS) {
      this.logger.debug(`Session expired for ${customerPhone} (age: ${age}ms)`);
      this.sessions.delete(sessionKey);
      return null;
    }

    return session;
  }

  /**
   * Clears session context
   *
   * @param customerPhone - Customer phone number
   * @param salonId - Salon ID
   */
  private clearSession(customerPhone: string, salonId: string): void {
    const sessionKey = this.getSessionKey(customerPhone, salonId);
    this.sessions.delete(sessionKey);

    this.logger.debug(`Session cleared for ${customerPhone}`);
  }

  /**
   * Generates session key
   *
   * @param customerPhone - Customer phone number
   * @param salonId - Salon ID
   * @returns Session key
   */
  private getSessionKey(customerPhone: string, salonId: string): string {
    return `${customerPhone}_${salonId}`;
  }

  /**
   * Starts periodic session cleanup task
   *
   * Runs every 5 minutes to remove expired sessions.
   */
  private startSessionCleanup(): void {
    setInterval(
      () => {
        const now = Date.now();
        let expiredCount = 0;

        for (const [key, session] of this.sessions.entries()) {
          const age = now - session.timestamp;
          if (age > SESSION_EXPIRATION_MS) {
            this.sessions.delete(key);
            expiredCount++;
          }
        }

        if (expiredCount > 0) {
          this.logger.debug(`Cleaned up ${expiredCount} expired sessions`);
        }
      },
      5 * 60 * 1000,
    ); // Every 5 minutes
  }

  // ==========================================================================
  // PRIVATE METHODS - Analytics
  // ==========================================================================

  /**
   * Tracks button click analytics
   *
   * Logs button interactions for analytics and debugging.
   *
   * @param eventType - Event type
   * @param buttonId - Button ID
   * @param customerPhone - Customer phone
   * @param salonId - Salon ID
   */
  private async trackButtonClick(
    eventType: string,
    buttonId: string,
    customerPhone: string,
    salonId: string,
  ): Promise<void> {
    try {
      // In production, send to analytics service (e.g., Mixpanel, Segment)
      this.logger.log(
        `Analytics: ${eventType} | button=${buttonId} | phone=${customerPhone} | salon=${salonId}`,
      );

      // Could also store in database for reporting
      // await this.prisma.analyticsEvent.create({ ... });
    } catch (error) {
      // Don't fail the operation if analytics fails
      this.logger.error(`Failed to track button click:`, error);
    }
  }

  // ==========================================================================
  // PRIVATE METHODS - Message Building
  // ==========================================================================

  /**
   * Builds booking confirmation message in English
   *
   * @param slot - Slot data
   * @param bookingCode - Booking code
   * @param language - Language preference (currently English only)
   * @returns Formatted confirmation message
   */
  private buildConfirmationMessage(slot: SlotData, bookingCode: string, _language: string): string {
    // Format date
    const dateObj = new Date(`${slot.date}T00:00:00`);
    const formattedDate = dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });

    // Format time
    const [hours, minutes] = slot.time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const formattedTime = `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;

    // Build message in English
    const message = `✅ Booking Confirmed!

Service: ${slot.serviceName}
Date: ${formattedDate}
Time: ${formattedTime}
Master: ${slot.masterName}

Booking Code: ${bookingCode}

We'll send you a reminder 24 hours before your appointment.

See you soon! 👋`;

    return message;
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Sleep utility for retry delays
   *
   * @param ms - Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Format time string for user-friendly display
   *
   * Converts 24-hour format (HH:MM) to 12-hour format with AM/PM
   *
   * @param time - Time in 24-hour format (e.g., "14:00", "09:30")
   * @returns Formatted time string (e.g., "2:00 PM", "9:30 AM")
   *
   * @example
   * ```typescript
   * formatTimeForDisplay("09:00") // "9:00 AM"
   * formatTimeForDisplay("14:30") // "2:30 PM"
   * formatTimeForDisplay("00:00") // "12:00 AM"
   * formatTimeForDisplay("12:00") // "12:00 PM"
   * ```
   */
  private formatTimeForDisplay(time: string): string {
    try {
      const [hours, minutes] = time.split(':').map(Number);
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12; // Convert 0 to 12 for midnight
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    } catch (error) {
      // Fallback: return original time if parsing fails
      this.logger.warn(`Failed to format time for display: ${time}`, error);
      return time;
    }
  }
}
