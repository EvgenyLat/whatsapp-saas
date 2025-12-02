/**
 * WhatsApp Integration Example
 *
 * This file shows how to integrate the AI Service with WhatsApp webhook processing.
 * Copy this code to your webhook processor to enable AI booking assistant.
 */

import { Injectable, Logger } from '@nestjs/common';
import { AIService } from '../ai.service';
import { WhatsAppService } from '@modules/whatsapp/whatsapp.service';

/**
 * Example: WhatsApp Webhook Processor with AI Integration
 */
@Injectable()
export class WhatsAppWebhookProcessor {
  private readonly logger = new Logger(WhatsAppWebhookProcessor.name);

  constructor(
    private readonly aiService: AIService,
    private readonly whatsappService: WhatsAppService,
  ) {}

  /**
   * Process incoming WhatsApp message
   * This is called when a message is received from WhatsApp webhook
   */
  async processInboundMessage(webhookData: any) {
    try {
      // Extract message details from WhatsApp webhook payload
      const message = webhookData.entry[0].changes[0].value.messages[0];
      const from = message.from; // Customer phone number
      const messageType = message.type;
      const salonPhoneNumberId = webhookData.entry[0].changes[0].value.metadata.phone_number_id;

      // Get salon ID from phone_number_id (you need to implement this lookup)
      const salon = await this.getSalonByPhoneNumberId(salonPhoneNumberId);
      if (!salon) {
        this.logger.error(`Salon not found for phone_number_id: ${salonPhoneNumberId}`);
        return;
      }

      // Only process text messages
      if (messageType !== 'text') {
        // TODO: Send message via WhatsApp based on your service interface
        this.logger.warn(`Non-text message type received: ${messageType}`);
        return;
      }

      const messageText = message.text.body;

      // Generate unique conversation ID (salon_id + phone_number)
      const conversationId = this.generateConversationId(salon.id, from);

      // Get customer name if available (from contacts or previous bookings)
      const customerName = await this.getCustomerName(from, salon.id);

      this.logger.log(`Processing AI message from ${from}: "${messageText}"`);

      // Process message through AI
      const aiResponse = await this.aiService.processMessage({
        salon_id: salon.id,
        phone_number: from,
        message: messageText,
        conversation_id: conversationId,
        customer_name: customerName,
      });

      // Log AI usage for billing/monitoring
      this.logger.debug(
        `AI Response: ${aiResponse.tokens_used} tokens, $${aiResponse.cost.toFixed(4)}, ${aiResponse.response_time_ms}ms`,
      );

      // Send AI response back to customer via WhatsApp
      // TODO: Implement based on your WhatsAppService interface
      // await this.whatsappService.sendMessage({
      //   to: from,
      //   text: aiResponse.response,
      //   phone_number_id: salon.phone_number_id,
      //   access_token: salon.access_token,
      // });

      // If a booking was created, send additional confirmation
      if (aiResponse.booking_code) {
        this.logger.log(`Booking created by AI: ${aiResponse.booking_code}`);

        // Optional: Send a template message with booking details
        // await this.sendBookingConfirmationTemplate(from, aiResponse.booking_code, salon);

        // Optional: Schedule reminder messages
        // await this.scheduleBookingReminders(aiResponse.booking_code);
      }

      // Track successful AI interaction
      await this.trackAIInteraction(salon.id, from, aiResponse);
    } catch (error) {
      this.logger.error('Error processing WhatsApp message:', error);

      // Send error message to customer
      // TODO: Implement error message sending based on your WhatsAppService
      this.logger.error('Failed to process message, error response needed');
    }
  }

  /**
   * Generate unique conversation ID
   */
  private generateConversationId(salonId: string, phoneNumber: string): string {
    // Normalize phone number (remove spaces, dashes, etc.)
    const normalizedPhone = phoneNumber.replace(/[^0-9+]/g, '');
    return `conv_${salonId}_${normalizedPhone}`;
  }

  /**
   * Get customer name from database
   * Looks up previous bookings or contact information
   */
  private async getCustomerName(
    _phoneNumber: string,
    _salonId: string,
  ): Promise<string | undefined> {
    // TODO: Implement lookup in your database
    // Example:
    // const booking = await this.bookingsRepository.findFirst({
    //   customer_phone: phoneNumber,
    //   salon_id: salonId,
    // }, { orderBy: { created_at: 'desc' } });
    // return booking?.customer_name;

    return undefined;
  }

  /**
   * Get salon by phone_number_id
   */
  private async getSalonByPhoneNumberId(_phoneNumberId: string): Promise<any> {
    // TODO: Implement salon lookup
    // Example:
    // return this.prisma.salon.findUnique({
    //   where: { phone_number_id: phoneNumberId },
    // });

    return null;
  }

  /**
   * Track AI interaction for analytics
   */
  private async trackAIInteraction(_salonId: string, _phoneNumber: string, _aiResponse: any) {
    // TODO: Implement analytics tracking
    // Example:
    // await this.analyticsService.trackEvent({
    //   event: 'ai_interaction',
    //   salon_id: salonId,
    //   phone_number: phoneNumber,
    //   tokens_used: aiResponse.tokens_used,
    //   cost: aiResponse.cost,
    //   booking_created: !!aiResponse.booking_code,
    // });
  }

  /**
   * Send booking confirmation template (optional)
   */
  private async sendBookingConfirmationTemplate(
    _phoneNumber: string,
    _bookingCode: string,
    _salon: any,
  ) {
    // TODO: Implement template sending
    // Example:
    // await this.whatsappService.sendTemplate(
    //   phoneNumber,
    //   'booking_confirmation',
    //   [
    //     { type: 'text', text: bookingCode },
    //     { type: 'text', text: salon.name },
    //   ],
    //   salon.phone_number_id,
    //   salon.access_token,
    // );
  }

  /**
   * Schedule booking reminders (optional)
   */
  private async scheduleBookingReminders(_bookingCode: string) {
    // TODO: Implement reminder scheduling
    // Example:
    // await this.queueService.scheduleBookingReminder({
    //   booking_code: bookingCode,
    //   reminder_time: '24_hours_before',
    // });
  }
}

/**
 * Example: Simpler integration for testing
 */
@Injectable()
export class SimpleAIIntegration {
  constructor(
    private readonly aiService: AIService,
    private readonly whatsappService: WhatsAppService,
  ) {}

  /**
   * Simple message processor (for testing)
   */
  async handleMessage(salonId: string, from: string, message: string) {
    // Generate conversation ID
    const conversationId = `conv_${salonId}_${from}`;

    // Process through AI
    const response = await this.aiService.processMessage({
      salon_id: salonId,
      phone_number: from,
      message,
      conversation_id: conversationId,
    });

    // Log result
    console.log('AI Response:', response.response);
    console.log('Cost:', `$${response.cost.toFixed(4)}`);
    console.log('Tokens:', response.tokens_used);

    return response;
  }
}

/**
 * Example: Testing the AI service locally
 */
export async function testAIService(aiService: AIService) {
  const testCases = [
    {
      message: 'Хочу к Ане на маникюр завтра в 15:00',
      description: 'Booking request with all details',
    },
    {
      message: 'Сколько стоит стрижка?',
      description: 'Price inquiry',
    },
    {
      message: 'В какое время вы работаете?',
      description: 'Working hours question',
    },
    {
      message: 'Запишите меня на окрашивание',
      description: 'Incomplete booking request',
    },
  ];

  const salonId = 'test-salon-id';
  const phoneNumber = '+79001234567';

  for (const testCase of testCases) {
    console.log('\n' + '='.repeat(50));
    console.log('Test:', testCase.description);
    console.log('Message:', testCase.message);
    console.log('-'.repeat(50));

    const response = await aiService.processMessage({
      salon_id: salonId,
      phone_number: phoneNumber,
      message: testCase.message,
      conversation_id: `test_conv_${Date.now()}`,
    });

    console.log('Response:', response.response);
    console.log('Tokens:', response.tokens_used);
    console.log('Cost:', `$${response.cost.toFixed(4)}`);
    console.log('Time:', `${response.response_time_ms}ms`);
  }
}

/**
 * Example: Cost monitoring
 */
@Injectable()
export class AICostMonitor {
  private readonly logger = new Logger(AICostMonitor.name);

  constructor(private readonly aiService: AIService) {}

  /**
   * Get daily AI costs for a salon
   */
  async getDailyCosts(salonId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const stats = await this.aiService.getMessageStats(salonId, today, tomorrow);
    return stats.totalCost;
  }

  /**
   * Alert if daily cost exceeds threshold
   */
  async checkCostThreshold(salonId: string, threshold: number = 10.0) {
    const dailyCost = await this.getDailyCosts(salonId);

    if (dailyCost > threshold) {
      this.logger.warn(
        `⚠️ AI costs for salon ${salonId} exceeded threshold: $${dailyCost.toFixed(2)} > $${threshold}`,
      );

      // TODO: Send alert notification
      // await this.notificationService.sendAlert({
      //   type: 'ai_cost_threshold_exceeded',
      //   salon_id: salonId,
      //   daily_cost: dailyCost,
      //   threshold,
      // });
    }

    return dailyCost;
  }

  /**
   * Get cost breakdown by conversation
   */
  async getCostBreakdown(salonId: string): Promise<any[]> {
    await this.aiService.getConversationStats(salonId);
    // TODO: Implement detailed breakdown
    return [];
  }
}
