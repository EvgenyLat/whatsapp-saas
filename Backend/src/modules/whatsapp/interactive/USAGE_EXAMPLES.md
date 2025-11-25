# InteractiveCardBuilder - Usage Examples

Real-world integration examples for the WhatsApp Interactive Message Builder service.

## Table of Contents

1. [Basic Setup](#basic-setup)
2. [Scenario 1: Send Available Slots](#scenario-1-send-available-slots)
3. [Scenario 2: Handle Button Click Response](#scenario-2-handle-button-click-response)
4. [Scenario 3: Multi-Day Slot Selection](#scenario-3-multi-day-slot-selection)
5. [Scenario 4: Booking Confirmation Flow](#scenario-4-booking-confirmation-flow)
6. [Scenario 5: Error Handling](#scenario-5-error-handling)
7. [Scenario 6: Pagination for Many Slots](#scenario-6-pagination-for-many-slots)
8. [Scenario 7: Preferred Time Slots](#scenario-7-preferred-time-slots)
9. [Scenario 8: Multi-Language Support](#scenario-8-multi-language-support)

## Basic Setup

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InteractiveCardBuilder, TimeSlot } from './interactive/interactive-message.builder';
import { ButtonParserService } from './interactive/button-parser.service';
import { WhatsAppService } from './whatsapp.service';

@Injectable()
export class QuickBookingService {
  private readonly logger = new Logger(QuickBookingService.name);

  constructor(
    private readonly cardBuilder: InteractiveCardBuilder,
    private readonly buttonParser: ButtonParserService,
    private readonly whatsappService: WhatsAppService,
  ) {}

  // Methods below...
}
```

## Scenario 1: Send Available Slots

Customer asks for available times - service finds slots and sends interactive message.

```typescript
/**
 * Send available time slots to customer
 */
async sendAvailableSlots(
  customerPhone: string,
  serviceId: string,
  targetDate: string,
  language: string = 'en',
): Promise<void> {
  try {
    // 1. Fetch available slots from database
    const slots = await this.slotsRepository.findAvailableSlots({
      serviceId,
      date: targetDate,
      limit: 10, // Max 10 slots for WhatsApp
    });

    // 2. Check if any slots available
    if (slots.length === 0) {
      await this.sendNoSlotsMessage(customerPhone, language);
      return;
    }

    // 3. Transform to TimeSlot format
    const timeSlots: TimeSlot[] = slots.map(slot => ({
      date: slot.date,
      time: slot.startTime,
      masterId: slot.masterId,
      masterName: slot.master.name,
      isPreferred: slot.masterId === await this.getPreferredMaster(customerPhone),
    }));

    // 4. Get service details for context
    const service = await this.servicesRepository.findById(serviceId);

    // 5. Build interactive message (auto-selects format)
    const message = this.cardBuilder.buildSlotSelectionCard({
      slots: timeSlots,
      language: language as SupportedLanguage,
      customerPhone,
      serviceName: service.name,
    });

    // 6. Send via WhatsApp API
    await this.whatsappService.sendMessage(message);

    this.logger.log(
      `Sent ${timeSlots.length} slots to ${customerPhone} for service ${serviceId}`,
    );
  } catch (error) {
    this.logger.error(`Failed to send available slots: ${error.message}`);
    throw error;
  }
}

/**
 * Send "no slots available" message
 */
private async sendNoSlotsMessage(
  customerPhone: string,
  language: string,
): Promise<void> {
  const t = getTranslations(language as SupportedLanguage);

  await this.whatsappService.sendTextMessage({
    to: customerPhone,
    text: t.messages.noAvailableTimes,
  });
}

/**
 * Get customer's preferred master
 */
private async getPreferredMaster(customerPhone: string): Promise<string | null> {
  const bookingHistory = await this.bookingsRepository.findByCustomer(customerPhone);

  if (bookingHistory.length === 0) return null;

  // Find most frequently booked master
  const masterCounts = new Map<string, number>();
  for (const booking of bookingHistory) {
    const count = masterCounts.get(booking.masterId) || 0;
    masterCounts.set(booking.masterId, count + 1);
  }

  let preferredMasterId: string | null = null;
  let maxCount = 0;
  for (const [masterId, count] of masterCounts.entries()) {
    if (count > maxCount) {
      maxCount = count;
      preferredMasterId = masterId;
    }
  }

  return preferredMasterId;
}
```

## Scenario 2: Handle Button Click Response

Customer clicks a slot button - service parses and creates booking.

```typescript
/**
 * Handle slot selection from customer
 */
async handleSlotSelection(
  customerPhone: string,
  buttonId: string,
  buttonTitle: string,
): Promise<void> {
  try {
    // 1. Parse button ID
    const parsed = this.buttonParser.parseButtonId(buttonId);

    if (parsed.type !== 'slot') {
      throw new Error(`Invalid button type: ${parsed.type}`);
    }

    // 2. Extract slot details
    const slotData = this.buttonParser.parseSlotButton(parsed.context);
    // { date: "2024-10-25", time: "15:00", masterId: "m123" }

    // 3. Verify slot is still available
    const isAvailable = await this.slotsRepository.isSlotAvailable({
      date: slotData.date,
      time: slotData.time,
      masterId: slotData.masterId,
    });

    if (!isAvailable) {
      await this.sendSlotUnavailableMessage(customerPhone);
      return;
    }

    // 4. Get customer details
    const customer = await this.customersRepository.findByPhone(customerPhone);

    // 5. Create pending booking
    const booking = await this.bookingsRepository.create({
      customerPhone,
      customerName: customer.name,
      masterId: slotData.masterId,
      date: slotData.date,
      startTime: slotData.time,
      status: 'PENDING',
    });

    // 6. Send confirmation card
    await this.sendBookingConfirmation(
      customerPhone,
      booking.id,
      customer.language,
    );

    this.logger.log(
      `Created pending booking ${booking.id} for ${customerPhone} on ${slotData.date} at ${slotData.time}`,
    );
  } catch (error) {
    this.logger.error(`Failed to handle slot selection: ${error.message}`);
    throw error;
  }
}

/**
 * Send "slot unavailable" message
 */
private async sendSlotUnavailableMessage(customerPhone: string): Promise<void> {
  const customer = await this.customersRepository.findByPhone(customerPhone);
  const t = getTranslations(customer.language as SupportedLanguage);

  await this.whatsappService.sendTextMessage({
    to: customerPhone,
    text: t.messages.slotAlreadyBooked,
  });
}
```

## Scenario 3: Multi-Day Slot Selection

Show slots across multiple days with List Message format.

```typescript
/**
 * Send next available slots (multi-day)
 */
async sendNextAvailableSlots(
  customerPhone: string,
  serviceId: string,
  language: string = 'en',
): Promise<void> {
  try {
    // 1. Get service details
    const service = await this.servicesRepository.findById(serviceId);

    // 2. Find next available slots across multiple days
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7); // Next 7 days

    const slots = await this.slotsRepository.findAvailableSlots({
      serviceId,
      startDate,
      endDate,
      limit: 10,
    });

    if (slots.length === 0) {
      await this.sendNoSlotsMessage(customerPhone, language);
      return;
    }

    // 3. Transform to TimeSlot format
    const timeSlots: TimeSlot[] = slots.map(slot => ({
      date: slot.date,
      time: slot.startTime,
      masterId: slot.masterId,
      masterName: slot.master.name,
      duration: service.durationMinutes,
      price: this.formatPrice(service.price, language),
    }));

    // 4. Build List Message (grouped by day)
    const message = this.cardBuilder.buildListMessageCard({
      slots: timeSlots,
      language: language as SupportedLanguage,
      customerPhone,
      serviceName: service.name,
      duration: service.durationMinutes,
      price: this.formatPrice(service.price, language),
    });

    // 5. Send via WhatsApp API
    await this.whatsappService.sendMessage(message);

    this.logger.log(
      `Sent multi-day slots to ${customerPhone}: ${timeSlots.length} slots across ${new Set(timeSlots.map(s => s.date)).size} days`,
    );
  } catch (error) {
    this.logger.error(`Failed to send multi-day slots: ${error.message}`);
    throw error;
  }
}

/**
 * Format price based on language/region
 */
private formatPrice(price: number, language: string): string {
  const formatters: Record<string, (price: number) => string> = {
    en: (p) => `$${p.toFixed(2)}`,
    ru: (p) => `${p.toFixed(0)}₽`,
    es: (p) => `€${p.toFixed(2)}`,
    pt: (p) => `R$${p.toFixed(2)}`,
    he: (p) => `₪${p.toFixed(2)}`,
  };

  const formatter = formatters[language] || formatters.en;
  return formatter(price);
}
```

## Scenario 4: Booking Confirmation Flow

Send confirmation card and handle confirm/change responses.

```typescript
/**
 * Send booking confirmation card
 */
async sendBookingConfirmation(
  customerPhone: string,
  bookingId: string,
  language: string = 'en',
): Promise<void> {
  try {
    // 1. Fetch booking details
    const booking = await this.bookingsRepository.findById(bookingId, {
      include: ['master', 'service'],
    });

    if (!booking) {
      throw new Error(`Booking not found: ${bookingId}`);
    }

    // 2. Build confirmation card
    const message = this.cardBuilder.buildConfirmationCard({
      booking: {
        bookingId: booking.id,
        serviceName: booking.service.name,
        date: booking.date,
        time: booking.startTime,
        masterName: booking.master.name,
        masterId: booking.masterId,
        duration: booking.service.durationMinutes,
        price: this.formatPrice(booking.service.price, language),
      },
      language: language as SupportedLanguage,
      customerPhone,
    });

    // 3. Send via WhatsApp API
    await this.whatsappService.sendMessage(message);

    this.logger.log(`Sent confirmation card for booking ${bookingId} to ${customerPhone}`);
  } catch (error) {
    this.logger.error(`Failed to send booking confirmation: ${error.message}`);
    throw error;
  }
}

/**
 * Handle confirmation button click
 */
async handleBookingConfirmation(
  customerPhone: string,
  buttonId: string,
): Promise<void> {
  try {
    // 1. Parse button ID
    const parsed = this.buttonParser.parseButtonId(buttonId);
    // buttonId: "confirm_booking_b456"
    // parsed: { type: "confirm", context: "booking_b456" }

    if (parsed.type !== 'confirm') {
      throw new Error(`Invalid button type: ${parsed.type}`);
    }

    // 2. Extract booking ID
    const confirmData = this.buttonParser.parseConfirmButton(parsed.context);
    // { action: "booking", entityId: "b456" }

    // 3. Confirm the booking
    const booking = await this.bookingsRepository.updateStatus(
      confirmData.entityId,
      'CONFIRMED',
    );

    // 4. Send confirmation message
    const customer = await this.customersRepository.findByPhone(customerPhone);
    const t = getTranslations(customer.language as SupportedLanguage);

    await this.whatsappService.sendTextMessage({
      to: customerPhone,
      text: t.messages.bookingConfirmed,
    });

    // 5. Schedule reminder
    await this.reminderService.scheduleReminder({
      bookingId: booking.id,
      customerPhone,
      scheduledAt: new Date(booking.startTs.getTime() - 24 * 60 * 60 * 1000), // 24h before
    });

    this.logger.log(`Booking confirmed: ${confirmData.entityId} for ${customerPhone}`);
  } catch (error) {
    this.logger.error(`Failed to confirm booking: ${error.message}`);
    throw error;
  }
}

/**
 * Handle "Change Time" button click
 */
async handleChangeTime(
  customerPhone: string,
  bookingId: string,
): Promise<void> {
  try {
    // 1. Delete pending booking
    await this.bookingsRepository.delete(bookingId);

    // 2. Send available slots again
    const booking = await this.bookingsRepository.findById(bookingId);
    const customer = await this.customersRepository.findByPhone(customerPhone);

    await this.sendAvailableSlots(
      customerPhone,
      booking.serviceId,
      booking.date,
      customer.language,
    );

    this.logger.log(`Customer ${customerPhone} changed time for booking ${bookingId}`);
  } catch (error) {
    this.logger.error(`Failed to handle change time: ${error.message}`);
    throw error;
  }
}
```

## Scenario 5: Error Handling

Handle edge cases and errors gracefully.

```typescript
/**
 * Send available slots with comprehensive error handling
 */
async sendAvailableSlotsWithErrorHandling(
  customerPhone: string,
  serviceId: string,
  targetDate: string,
  language: string = 'en',
): Promise<void> {
  try {
    // Validate inputs
    if (!this.isValidPhone(customerPhone)) {
      throw new Error(`Invalid phone number: ${customerPhone}`);
    }

    if (!this.isValidServiceId(serviceId)) {
      throw new Error(`Invalid service ID: ${serviceId}`);
    }

    // Fetch slots
    const slots = await this.slotsRepository.findAvailableSlots({
      serviceId,
      date: targetDate,
      limit: 10,
    });

    // Handle no slots
    if (slots.length === 0) {
      await this.sendNoSlotsMessage(customerPhone, language);
      return;
    }

    // Handle too many slots (pagination)
    if (slots.length > 10) {
      this.logger.warn(`Too many slots (${slots.length}), showing first 10`);
      slots.splice(10); // Keep first 10
    }

    // Transform slots
    const timeSlots: TimeSlot[] = slots.map(slot => ({
      date: slot.date,
      time: slot.startTime,
      masterId: slot.masterId,
      masterName: this.truncateName(slot.master.name, 15), // Prevent long names
    }));

    // Get service details
    const service = await this.servicesRepository.findById(serviceId);

    // Build message
    const message = this.cardBuilder.buildSlotSelectionCard({
      slots: timeSlots,
      language: language as SupportedLanguage,
      customerPhone,
      serviceName: service.name,
    });

    // Send with retry logic
    await this.sendWithRetry(message, 3);

    this.logger.log(`Successfully sent slots to ${customerPhone}`);
  } catch (error) {
    this.logger.error(`Failed to send slots: ${error.message}`, error.stack);

    // Send fallback error message
    await this.sendErrorMessage(customerPhone, language);
  }
}

/**
 * Send message with retry logic
 */
private async sendWithRetry(
  message: any,
  maxRetries: number = 3,
): Promise<void> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await this.whatsappService.sendMessage(message);
      return; // Success
    } catch (error) {
      lastError = error;
      this.logger.warn(`Send attempt ${attempt} failed: ${error.message}`);

      if (attempt < maxRetries) {
        await this.sleep(1000 * attempt); // Exponential backoff
      }
    }
  }

  throw lastError!;
}

/**
 * Send generic error message
 */
private async sendErrorMessage(
  customerPhone: string,
  language: string,
): Promise<void> {
  const t = getTranslations(language as SupportedLanguage);

  await this.whatsappService.sendTextMessage({
    to: customerPhone,
    text: t.messages.genericError,
  });
}

/**
 * Truncate long names to fit button constraints
 */
private truncateName(name: string, maxLength: number): string {
  if (name.length <= maxLength) {
    return name;
  }
  return name.substring(0, maxLength - 3) + '...';
}

private isValidPhone(phone: string): boolean {
  return /^\+[1-9]\d{1,14}$/.test(phone);
}

private isValidServiceId(serviceId: string): boolean {
  return /^[a-z0-9-]+$/.test(serviceId);
}

private sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

## Scenario 6: Pagination for Many Slots

Handle more than 10 slots with pagination.

```typescript
/**
 * Send paginated slots with "See More" button
 */
async sendPaginatedSlots(
  customerPhone: string,
  serviceId: string,
  targetDate: string,
  page: number = 1,
  language: string = 'en',
): Promise<void> {
  try {
    const pageSize = 10;
    const offset = (page - 1) * pageSize;

    // Fetch slots with pagination
    const slots = await this.slotsRepository.findAvailableSlots({
      serviceId,
      date: targetDate,
      limit: pageSize + 1, // Fetch one extra to check if more exist
      offset,
    });

    // Check if more slots exist
    const hasMore = slots.length > pageSize;
    const displaySlots = hasMore ? slots.slice(0, pageSize) : slots;

    // Transform slots
    const timeSlots: TimeSlot[] = displaySlots.map(slot => ({
      date: slot.date,
      time: slot.startTime,
      masterId: slot.masterId,
      masterName: slot.master.name,
    }));

    // Get service details
    const service = await this.servicesRepository.findById(serviceId);

    // Build message
    const message = this.cardBuilder.buildSlotSelectionCard({
      slots: timeSlots,
      language: language as SupportedLanguage,
      customerPhone,
      serviceName: service.name,
    });

    // Send message
    await this.whatsappService.sendMessage(message);

    // If more slots exist, send "See More" button
    if (hasMore) {
      await this.sendSeeMoreButton(
        customerPhone,
        serviceId,
        targetDate,
        page + 1,
        language,
      );
    }

    this.logger.log(
      `Sent paginated slots to ${customerPhone}: page ${page}, ${timeSlots.length} slots`,
    );
  } catch (error) {
    this.logger.error(`Failed to send paginated slots: ${error.message}`);
    throw error;
  }
}

/**
 * Send "See More" button
 */
private async sendSeeMoreButton(
  customerPhone: string,
  serviceId: string,
  targetDate: string,
  nextPage: number,
  language: string,
): Promise<void> {
  const t = getTranslations(language as SupportedLanguage);

  // Build simple Reply Button for "See More"
  const message: InteractiveMessagePayload = {
    messaging_product: 'whatsapp',
    to: customerPhone,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: {
        text: 'More slots available',
      },
      action: {
        buttons: [
          {
            type: 'reply',
            reply: {
              id: `nav_next_${nextPage}_${serviceId}_${targetDate}`,
              title: t.buttons.seeMoreButton,
            },
          },
        ],
      },
    },
  };

  await this.whatsappService.sendMessage(message);
}
```

## Scenario 7: Preferred Time Slots

Identify and mark customer's preferred times.

```typescript
/**
 * Send slots with preferred times marked
 */
async sendSlotsWithPreferences(
  customerPhone: string,
  serviceId: string,
  targetDate: string,
  language: string = 'en',
): Promise<void> {
  try {
    // 1. Fetch available slots
    const slots = await this.slotsRepository.findAvailableSlots({
      serviceId,
      date: targetDate,
      limit: 10,
    });

    // 2. Get customer's booking history
    const bookingHistory = await this.bookingsRepository.findByCustomer(customerPhone);

    // 3. Analyze preferences
    const preferences = this.analyzePreferences(bookingHistory);

    // 4. Transform slots and mark preferred ones
    const timeSlots: TimeSlot[] = slots.map(slot => {
      const isPreferredMaster = slot.masterId === preferences.preferredMaster;
      const isPreferredTime = this.isPreferredTime(slot.startTime, preferences.preferredTimes);

      return {
        date: slot.date,
        time: slot.startTime,
        masterId: slot.masterId,
        masterName: slot.master.name,
        isPreferred: isPreferredMaster || isPreferredTime, // Mark if master OR time is preferred
      };
    });

    // 5. Get service details
    const service = await this.servicesRepository.findById(serviceId);

    // 6. Build message
    const message = this.cardBuilder.buildSlotSelectionCard({
      slots: timeSlots,
      language: language as SupportedLanguage,
      customerPhone,
      serviceName: service.name,
    });

    // 7. Send message
    await this.whatsappService.sendMessage(message);

    this.logger.log(
      `Sent slots with preferences to ${customerPhone}: ${timeSlots.filter(s => s.isPreferred).length} preferred`,
    );
  } catch (error) {
    this.logger.error(`Failed to send slots with preferences: ${error.message}`);
    throw error;
  }
}

/**
 * Analyze customer preferences from booking history
 */
private analyzePreferences(bookingHistory: any[]): {
  preferredMaster: string | null;
  preferredTimes: string[];
} {
  if (bookingHistory.length === 0) {
    return { preferredMaster: null, preferredTimes: [] };
  }

  // Find most frequent master
  const masterCounts = new Map<string, number>();
  const timeCounts = new Map<string, number>();

  for (const booking of bookingHistory) {
    // Count masters
    const masterCount = masterCounts.get(booking.masterId) || 0;
    masterCounts.set(booking.masterId, masterCount + 1);

    // Count time slots (group by hour)
    const hour = booking.startTime.split(':')[0];
    const timeCount = timeCounts.get(hour) || 0;
    timeCounts.set(hour, timeCount + 1);
  }

  // Find preferred master
  let preferredMaster: string | null = null;
  let maxMasterCount = 0;
  for (const [masterId, count] of masterCounts.entries()) {
    if (count > maxMasterCount) {
      maxMasterCount = count;
      preferredMaster = masterId;
    }
  }

  // Find preferred times (top 3 hours)
  const preferredTimes = Array.from(timeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([hour]) => hour);

  return { preferredMaster, preferredTimes };
}

/**
 * Check if time matches preferred times
 */
private isPreferredTime(time: string, preferredTimes: string[]): boolean {
  const hour = time.split(':')[0];
  return preferredTimes.includes(hour);
}
```

## Scenario 8: Multi-Language Support

Handle multiple languages dynamically.

```typescript
/**
 * Send slots with language detection
 */
async sendSlotsWithLanguageDetection(
  customerPhone: string,
  serviceId: string,
  targetDate: string,
): Promise<void> {
  try {
    // 1. Detect customer's language
    const language = await this.detectCustomerLanguage(customerPhone);

    // 2. Fetch and send slots
    await this.sendAvailableSlots(
      customerPhone,
      serviceId,
      targetDate,
      language,
    );

    this.logger.log(`Sent slots to ${customerPhone} in language: ${language}`);
  } catch (error) {
    this.logger.error(`Failed to send slots with language detection: ${error.message}`);
    throw error;
  }
}

/**
 * Detect customer's preferred language
 */
private async detectCustomerLanguage(customerPhone: string): Promise<string> {
  // 1. Check customer profile
  const customer = await this.customersRepository.findByPhone(customerPhone);
  if (customer?.language) {
    return customer.language;
  }

  // 2. Check recent conversation history
  const recentMessages = await this.messagesRepository.findRecent(customerPhone, 10);
  if (recentMessages.length > 0) {
    const detectedLanguage = await this.languageDetectionService.detect(
      recentMessages.map(m => m.text).join(' '),
    );

    if (detectedLanguage) {
      // Save detected language to customer profile
      await this.customersRepository.update(customerPhone, {
        language: detectedLanguage,
      });

      return detectedLanguage;
    }
  }

  // 3. Detect by phone country code
  const countryCode = customerPhone.substring(1, 3);
  const languageMap: Record<string, string> = {
    '1': 'en',   // USA/Canada
    '7': 'ru',   // Russia
    '34': 'es',  // Spain
    '55': 'pt',  // Brazil
    '972': 'he', // Israel
  };

  for (const [code, lang] of Object.entries(languageMap)) {
    if (customerPhone.startsWith(`+${code}`)) {
      return lang;
    }
  }

  // 4. Default to English
  return 'en';
}
```

## Complete Integration Example

Full example of Quick Booking flow:

```typescript
@Injectable()
export class QuickBookingFlowService {
  constructor(
    private readonly cardBuilder: InteractiveCardBuilder,
    private readonly buttonParser: ButtonParserService,
    private readonly whatsappService: WhatsAppService,
    private readonly slotsRepository: SlotsRepository,
    private readonly bookingsRepository: BookingsRepository,
    private readonly customersRepository: CustomersRepository,
  ) {}

  /**
   * Main entry point - handle webhook message
   */
  async handleWebhookMessage(webhook: WhatsAppWebhookPayload): Promise<void> {
    const message = webhook.entry[0].changes[0].value.messages?.[0];
    if (!message) return;

    const customerPhone = `+${message.from}`;

    // Handle interactive button clicks
    if (message.type === 'interactive' && message.interactive) {
      await this.handleInteractiveResponse(
        customerPhone,
        message.interactive,
      );
      return;
    }

    // Handle text messages (AI intent detection)
    if (message.type === 'text' && message.text) {
      await this.handleTextMessage(customerPhone, message.text.body);
      return;
    }
  }

  /**
   * Handle interactive button/list responses
   */
  private async handleInteractiveResponse(
    customerPhone: string,
    interactive: Interactive,
  ): Promise<void> {
    const buttonId =
      interactive.type === 'button_reply'
        ? interactive.button_reply!.id
        : interactive.list_reply!.id;

    const parsed = this.buttonParser.parseButtonId(buttonId);

    switch (parsed.type) {
      case 'slot':
        await this.handleSlotSelection(customerPhone, parsed.context);
        break;
      case 'confirm':
        await this.handleConfirmation(customerPhone, parsed.context);
        break;
      case 'action':
        await this.handleAction(customerPhone, parsed.context);
        break;
      default:
        this.logger.warn(`Unknown button type: ${parsed.type}`);
    }
  }

  /**
   * Handle text message (AI intent detection)
   */
  private async handleTextMessage(
    customerPhone: string,
    text: string,
  ): Promise<void> {
    // Use AI to detect intent
    const intent = await this.aiService.detectIntent(text);

    if (intent.type === 'book_appointment') {
      await this.sendAvailableSlots(
        customerPhone,
        intent.serviceId,
        intent.date,
      );
    }
  }
}
```

## Summary

These examples demonstrate:

1. Building and sending interactive messages
2. Parsing button responses
3. Handling confirmation flows
4. Error handling and edge cases
5. Pagination for many slots
6. Preferred slot marking
7. Multi-language support
8. Full integration with webhook handler

For more details, see [README.md](./README.md) and the service source code.
