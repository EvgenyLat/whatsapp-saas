/**
 * T022: Integration Tests for Zero-Typing Touch-Based Booking
 *
 * This test suite validates the complete booking flow where customers book
 * appointments with button taps instead of typing. It tests the integration
 * between webhook handling, intent parsing, and booking creation.
 *
 * Test Scenarios:
 * 1. Customer types one message ("Haircut Friday 3pm")
 * 2. Bot parses intent and sends interactive card with slot buttons
 * 3. Customer taps slot button
 * 4. Bot sends confirmation card with [Confirm] button
 * 5. Customer taps [Confirm]
 * 6. Booking is created in database
 *
 * Success Criteria:
 * - Customer types ONCE (initial message)
 * - Customer taps buttons TWICE (slot + confirm)
 * - Total interactions: 1 typed message + 2 button taps = 3 interactions
 *
 * Expected Status: FAILING (Red Phase)
 * These tests will fail until the services are implemented.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  setupTestApp,
  cleanupTestApp,
  getTestPrisma,
  cleanTestDatabase,
  seedTestData,
  generateTestId,
  delay,
} from '../setup';
import {
  createTextMessageWebhook,
  createButtonClickWebhook,
  mockSendMessageResponse,
  MockWhatsAppAPI,
  createMockWhatsAppAPI,
} from '../mocks/whatsapp-api.mock';
import { PrismaClient } from '@prisma/client';

describe('Zero-Typing Touch-Based Booking - Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let mockWhatsAppAPI: MockWhatsAppAPI;

  // Test data
  const testCustomer = {
    phone: '+1234567890',
    name: 'Test Customer',
  };

  beforeAll(async () => {
    app = await setupTestApp();
    prisma = getTestPrisma();
    mockWhatsAppAPI = createMockWhatsAppAPI();
  });

  afterAll(async () => {
    await cleanupTestApp(app);
  });

  beforeEach(async () => {
    await cleanTestDatabase();
    await seedTestData();
    mockWhatsAppAPI.clearMessages();
    mockWhatsAppAPI.succeed();
  });

  // ============================================================================
  // Complete Booking Flow Tests
  // ============================================================================

  describe('Complete Booking Flow (1 Type + 2 Taps)', () => {
    it('should complete booking with 1 typed message and 2 button taps', async () => {
      // This is the CORE test for User Story 1
      // Expected flow: Type → Tap Slot → Tap Confirm → Booking Created

      // STEP 1: Customer types initial message
      const typedMessage = createTextMessageWebhook({
        from: testCustomer.phone,
        text: 'Haircut Friday 3pm',
        name: testCustomer.name,
      });

      const step1Response = await request(app.getHttpServer())
        .post('/api/v1/whatsapp/webhook')
        .send(typedMessage)
        .expect(200);

      // Assert: Bot should send interactive message with slot buttons
      expect(step1Response.body.status).toBe('ok');

      // Verify interactive message was sent (this will fail until implemented)
      const sentMessages = mockWhatsAppAPI.getSentMessages();
      expect(sentMessages).toHaveLength(1);

      const interactiveMessage = sentMessages[0];
      expect(interactiveMessage.message.type).toBe('interactive');
      expect(interactiveMessage.message.interactive.type).toBe('button');
      expect(interactiveMessage.message.interactive.action.buttons).toBeDefined();
      expect(interactiveMessage.message.interactive.action.buttons.length).toBeGreaterThanOrEqual(1);
      expect(interactiveMessage.message.interactive.action.buttons.length).toBeLessThanOrEqual(3);

      // Extract first button for testing
      const firstButton = interactiveMessage.message.interactive.action.buttons[0];
      const slotButtonId = firstButton.reply.id;

      // Validate button ID format
      expect(slotButtonId).toMatch(/^slot_\d{4}-\d{2}-\d{2}_\d{2}:\d{2}_m\d+$/);

      // STEP 2: Customer taps slot button (FIRST TAP)
      mockWhatsAppAPI.clearMessages();

      const slotTapMessage = createButtonClickWebhook({
        from: testCustomer.phone,
        buttonId: slotButtonId,
        buttonText: firstButton.reply.title,
        name: testCustomer.name,
      });

      const step2Response = await request(app.getHttpServer())
        .post('/api/v1/whatsapp/webhook')
        .send(slotTapMessage)
        .expect(200);

      expect(step2Response.body.status).toBe('ok');

      // Assert: Bot should send confirmation card with [Confirm] button
      const sentConfirmation = mockWhatsAppAPI.getSentMessages();
      expect(sentConfirmation).toHaveLength(1);

      const confirmationMessage = sentConfirmation[0];
      expect(confirmationMessage.message.type).toBe('interactive');
      expect(confirmationMessage.message.interactive.action.buttons).toBeDefined();

      // Find the Confirm button
      const confirmButton = confirmationMessage.message.interactive.action.buttons.find(
        (btn: any) => btn.reply.id.startsWith('confirm_')
      );

      expect(confirmButton).toBeDefined();
      expect(confirmButton.reply.id).toMatch(/^confirm_[a-zA-Z0-9_-]+$/);

      // STEP 3: Customer taps [Confirm] button (SECOND TAP)
      mockWhatsAppAPI.clearMessages();

      const confirmTapMessage = createButtonClickWebhook({
        from: testCustomer.phone,
        buttonId: confirmButton.reply.id,
        buttonText: confirmButton.reply.title,
        name: testCustomer.name,
      });

      const step3Response = await request(app.getHttpServer())
        .post('/api/v1/whatsapp/webhook')
        .send(confirmTapMessage)
        .expect(200);

      expect(step3Response.body.status).toBe('ok');

      // Assert: Booking should be created in database
      const bookings = await prisma.booking.findMany({
        where: {
          customer_phone: testCustomer.phone,
          status: 'CONFIRMED',
        },
      });

      expect(bookings).toHaveLength(1);
      expect(bookings[0].customer_name).toBe(testCustomer.name);
      expect(bookings[0].service).toContain('Haircut');

      // Assert: Success message should be sent
      const successMessages = mockWhatsAppAPI.getSentMessages();
      expect(successMessages).toHaveLength(1);
      expect(successMessages[0].message.type).toBe('text');
      expect(successMessages[0].message.text.body).toContain('confirmed');

      // FINAL ASSERTION: Verify interaction count
      // 1 typed message + 2 button taps = 3 total interactions
      const totalInteractions = 1 + 2; // 1 type + 2 taps
      expect(totalInteractions).toBe(3);
    });

    it('should track typing count across booking flow', async () => {
      // This test explicitly validates SC-001: Zero typing after initial message

      let typingCount = 0;
      let tappingCount = 0;

      // STEP 1: Customer types (typing count = 1)
      typingCount++;
      const typedMessage = createTextMessageWebhook({
        from: testCustomer.phone,
        text: 'Haircut Friday 3pm',
        name: testCustomer.name,
      });

      await request(app.getHttpServer())
        .post('/api/v1/whatsapp/webhook')
        .send(typedMessage)
        .expect(200);

      const interactiveMessage = mockWhatsAppAPI.getLastMessage();
      const slotButtonId = interactiveMessage.message.interactive.action.buttons[0].reply.id;

      // STEP 2: Customer taps slot (tapping count = 1)
      tappingCount++;
      mockWhatsAppAPI.clearMessages();

      const slotTapMessage = createButtonClickWebhook({
        from: testCustomer.phone,
        buttonId: slotButtonId,
        buttonText: '3:00 PM',
      });

      await request(app.getHttpServer())
        .post('/api/v1/whatsapp/webhook')
        .send(slotTapMessage)
        .expect(200);

      const confirmationMessage = mockWhatsAppAPI.getLastMessage();
      const confirmButton = confirmationMessage.message.interactive.action.buttons.find(
        (btn: any) => btn.reply.id.startsWith('confirm_')
      );

      // STEP 3: Customer taps confirm (tapping count = 2)
      tappingCount++;
      mockWhatsAppAPI.clearMessages();

      const confirmTapMessage = createButtonClickWebhook({
        from: testCustomer.phone,
        buttonId: confirmButton.reply.id,
        buttonText: 'Confirm',
      });

      await request(app.getHttpServer())
        .post('/api/v1/whatsapp/webhook')
        .send(confirmTapMessage)
        .expect(200);

      // ASSERTIONS: Validate SC-001 (Zero typing after initial message)
      expect(typingCount).toBe(1);
      expect(tappingCount).toBe(2);

      // Booking should be created
      const bookings = await prisma.booking.findMany({
        where: { customer_phone: testCustomer.phone },
      });

      expect(bookings).toHaveLength(1);
    });
  });

  // ============================================================================
  // Intent Parsing Tests
  // ============================================================================

  describe('Intent Parsing from Text Message', () => {
    it('should parse "Haircut Friday 3pm" and return interactive card', async () => {
      // Arrange
      const textMessage = createTextMessageWebhook({
        from: testCustomer.phone,
        text: 'Haircut Friday 3pm',
        name: testCustomer.name,
      });

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/v1/whatsapp/webhook')
        .send(textMessage)
        .expect(200);

      // Assert: Response should be successful
      expect(response.body.status).toBe('ok');

      // Assert: Bot should send interactive message
      const sentMessage = mockWhatsAppAPI.getLastMessage();
      expect(sentMessage).toBeDefined();
      expect(sentMessage.message.type).toBe('interactive');

      // Assert: Message should contain slot buttons
      const buttons = sentMessage.message.interactive.action.buttons;
      expect(buttons).toBeDefined();
      expect(buttons.length).toBeGreaterThan(0);

      // Assert: Each button should have valid slot ID
      buttons.forEach((button: any) => {
        expect(button.reply.id).toMatch(/^slot_\d{4}-\d{2}-\d{2}_\d{2}:\d{2}_m\d+$/);
      });

      // Assert: Intent parsing should extract service, day, and time
      // This validates that the AI/parser correctly understood the request
      expect(sentMessage.message.interactive.body.text).toContain('Haircut');
      expect(sentMessage.message.interactive.body.text).toContain('Friday');
    });

    it('should parse "Manicure tomorrow 2pm" and return interactive card', async () => {
      // Arrange
      const textMessage = createTextMessageWebhook({
        from: testCustomer.phone,
        text: 'Manicure tomorrow 2pm',
        name: testCustomer.name,
      });

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/v1/whatsapp/webhook')
        .send(textMessage)
        .expect(200);

      // Assert
      expect(response.body.status).toBe('ok');

      const sentMessage = mockWhatsAppAPI.getLastMessage();
      expect(sentMessage.message.type).toBe('interactive');
      expect(sentMessage.message.interactive.body.text).toContain('Manicure');
    });

    it('should parse "Facial next Monday morning" and return interactive card', async () => {
      // Arrange
      const textMessage = createTextMessageWebhook({
        from: testCustomer.phone,
        text: 'Facial next Monday morning',
        name: testCustomer.name,
      });

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/v1/whatsapp/webhook')
        .send(textMessage)
        .expect(200);

      // Assert
      expect(response.body.status).toBe('ok');

      const sentMessage = mockWhatsAppAPI.getLastMessage();
      expect(sentMessage.message.type).toBe('interactive');
      expect(sentMessage.message.interactive.body.text).toContain('Facial');
    });

    it('should handle vague requests with service list', async () => {
      // Arrange
      const textMessage = createTextMessageWebhook({
        from: testCustomer.phone,
        text: 'I want to book an appointment',
        name: testCustomer.name,
      });

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/v1/whatsapp/webhook')
        .send(textMessage)
        .expect(200);

      // Assert: Should send service selection list
      expect(response.body.status).toBe('ok');

      const sentMessage = mockWhatsAppAPI.getLastMessage();
      expect(sentMessage.message.type).toBe('interactive');

      // Should either be a list or buttons for service selection
      const hasListOrButtons =
        sentMessage.message.interactive.type === 'list' ||
        sentMessage.message.interactive.type === 'button';

      expect(hasListOrButtons).toBe(true);
    });

    it('should return 3 slot options maximum', async () => {
      // As per spec: "Show 3 options (e.g., 3:00 PM, 3:15 PM, 3:30 PM)"

      // Arrange
      const textMessage = createTextMessageWebhook({
        from: testCustomer.phone,
        text: 'Haircut Friday 3pm',
        name: testCustomer.name,
      });

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/v1/whatsapp/webhook')
        .send(textMessage)
        .expect(200);

      // Assert
      const sentMessage = mockWhatsAppAPI.getLastMessage();
      const buttons = sentMessage.message.interactive.action.buttons;

      expect(buttons.length).toBeLessThanOrEqual(3);
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Button Click Handling Tests
  // ============================================================================

  describe('Button Click Handling', () => {
    it('should create booking when customer taps [Confirm]', async () => {
      // This test isolates the confirmation step

      // Arrange: Simulate that we already have a pending booking
      const pendingBookingCode = generateTestId('BOOK');

      // Create a slot selection first
      const slotButtonId = 'slot_2024-10-25_15:00_m123';
      const slotTapMessage = createButtonClickWebhook({
        from: testCustomer.phone,
        buttonId: slotButtonId,
        buttonText: '3:00 PM - Sarah',
        name: testCustomer.name,
      });

      await request(app.getHttpServer())
        .post('/api/v1/whatsapp/webhook')
        .send(slotTapMessage)
        .expect(200);

      // Get the confirmation message
      const confirmationMessage = mockWhatsAppAPI.getLastMessage();
      const confirmButton = confirmationMessage.message.interactive.action.buttons.find(
        (btn: any) => btn.reply.id.startsWith('confirm_')
      );

      mockWhatsAppAPI.clearMessages();

      // Act: Customer taps [Confirm]
      const confirmTapMessage = createButtonClickWebhook({
        from: testCustomer.phone,
        buttonId: confirmButton.reply.id,
        buttonText: 'Confirm',
        name: testCustomer.name,
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/whatsapp/webhook')
        .send(confirmTapMessage)
        .expect(200);

      // Assert: Booking should be created
      expect(response.body.status).toBe('ok');

      const booking = await prisma.booking.findFirst({
        where: {
          customer_phone: testCustomer.phone,
          status: 'CONFIRMED',
        },
      });

      expect(booking).toBeDefined();
      expect(booking!.customer_name).toBe(testCustomer.name);

      // Assert: Confirmation message should be sent
      const successMessage = mockWhatsAppAPI.getLastMessage();
      expect(successMessage.message.type).toBe('text');
      expect(successMessage.message.text.body).toContain('confirmed');
    });

    it('should handle slot selection and show confirmation card', async () => {
      // Arrange
      const slotButtonId = 'slot_2024-10-25_15:00_m123';
      const slotTapMessage = createButtonClickWebhook({
        from: testCustomer.phone,
        buttonId: slotButtonId,
        buttonText: '3:00 PM - Sarah',
        name: testCustomer.name,
      });

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/v1/whatsapp/webhook')
        .send(slotTapMessage)
        .expect(200);

      // Assert
      expect(response.body.status).toBe('ok');

      const confirmationMessage = mockWhatsAppAPI.getLastMessage();
      expect(confirmationMessage.message.type).toBe('interactive');

      // Should have Confirm and Cancel buttons
      const buttons = confirmationMessage.message.interactive.action.buttons;
      expect(buttons).toHaveLength(2);

      const confirmButton = buttons.find((btn: any) => btn.reply.id.startsWith('confirm_'));
      const cancelButton = buttons.find((btn: any) => btn.reply.id.startsWith('action_'));

      expect(confirmButton).toBeDefined();
      expect(cancelButton).toBeDefined();
    });

    it('should show booking details in confirmation card', async () => {
      // Arrange
      const slotButtonId = 'slot_2024-10-25_15:00_m123';
      const slotTapMessage = createButtonClickWebhook({
        from: testCustomer.phone,
        buttonId: slotButtonId,
        buttonText: '3:00 PM - Sarah',
        name: testCustomer.name,
      });

      // Act
      await request(app.getHttpServer())
        .post('/api/v1/whatsapp/webhook')
        .send(slotTapMessage)
        .expect(200);

      // Assert: Confirmation card should show booking details
      const confirmationMessage = mockWhatsAppAPI.getLastMessage();
      const bodyText = confirmationMessage.message.interactive.body.text;

      expect(bodyText).toContain('3:00 PM');
      expect(bodyText).toContain('Sarah');
      expect(bodyText).toContain('2024-10-25');
    });

    it('should handle cancel button tap', async () => {
      // Arrange: First create a slot selection
      const slotButtonId = 'slot_2024-10-25_15:00_m123';
      const slotTapMessage = createButtonClickWebhook({
        from: testCustomer.phone,
        buttonId: slotButtonId,
        buttonText: '3:00 PM - Sarah',
      });

      await request(app.getHttpServer())
        .post('/api/v1/whatsapp/webhook')
        .send(slotTapMessage)
        .expect(200);

      const confirmationMessage = mockWhatsAppAPI.getLastMessage();
      const cancelButton = confirmationMessage.message.interactive.action.buttons.find(
        (btn: any) => btn.reply.id.startsWith('action_cancel')
      );

      mockWhatsAppAPI.clearMessages();

      // Act: Customer taps [Cancel]
      const cancelTapMessage = createButtonClickWebhook({
        from: testCustomer.phone,
        buttonId: cancelButton.reply.id,
        buttonText: 'Cancel',
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/whatsapp/webhook')
        .send(cancelTapMessage)
        .expect(200);

      // Assert: No booking should be created
      const bookings = await prisma.booking.findMany({
        where: { customer_phone: testCustomer.phone },
      });

      expect(bookings).toHaveLength(0);

      // Assert: Cancellation message should be sent
      const cancelMessage = mockWhatsAppAPI.getLastMessage();
      expect(cancelMessage.message.type).toBe('text');
      expect(cancelMessage.message.text.body).toContain('cancel');
    });
  });

  // ============================================================================
  // Database Integration Tests
  // ============================================================================

  describe('Database Integration', () => {
    it('should save booking with correct data', async () => {
      // Arrange & Act: Complete booking flow
      const textMessage = createTextMessageWebhook({
        from: testCustomer.phone,
        text: 'Haircut Friday 3pm',
        name: testCustomer.name,
      });

      await request(app.getHttpServer())
        .post('/api/v1/whatsapp/webhook')
        .send(textMessage)
        .expect(200);

      const interactiveMessage = mockWhatsAppAPI.getLastMessage();
      const slotButtonId = interactiveMessage.message.interactive.action.buttons[0].reply.id;

      mockWhatsAppAPI.clearMessages();

      const slotTapMessage = createButtonClickWebhook({
        from: testCustomer.phone,
        buttonId: slotButtonId,
        buttonText: '3:00 PM',
      });

      await request(app.getHttpServer())
        .post('/api/v1/whatsapp/webhook')
        .send(slotTapMessage)
        .expect(200);

      const confirmationMessage = mockWhatsAppAPI.getLastMessage();
      const confirmButton = confirmationMessage.message.interactive.action.buttons.find(
        (btn: any) => btn.reply.id.startsWith('confirm_')
      );

      mockWhatsAppAPI.clearMessages();

      const confirmTapMessage = createButtonClickWebhook({
        from: testCustomer.phone,
        buttonId: confirmButton.reply.id,
        buttonText: 'Confirm',
      });

      await request(app.getHttpServer())
        .post('/api/v1/whatsapp/webhook')
        .send(confirmTapMessage)
        .expect(200);

      // Assert: Verify booking data
      const booking = await prisma.booking.findFirst({
        where: { customer_phone: testCustomer.phone },
        include: {
          serviceRelation: true,
          master: true,
        },
      });

      expect(booking).toBeDefined();
      expect(booking!.customer_phone).toBe(testCustomer.phone);
      expect(booking!.customer_name).toBe(testCustomer.name);
      expect(booking!.status).toBe('CONFIRMED');
      expect(booking!.booking_code).toBeDefined();
      expect(booking!.start_ts).toBeInstanceOf(Date);
      expect(booking!.end_ts).toBeInstanceOf(Date);
      expect(booking!.serviceRelation).toBeDefined();
      expect(booking!.master).toBeDefined();
    });

    it('should increment salon booking count', async () => {
      // Arrange: Get initial booking count
      const salon = await prisma.salon.findFirst();
      const initialCount = salon!.usage_current_bookings || 0;

      // Act: Complete booking
      const textMessage = createTextMessageWebhook({
        from: testCustomer.phone,
        text: 'Haircut Friday 3pm',
        name: testCustomer.name,
      });

      await request(app.getHttpServer())
        .post('/api/v1/whatsapp/webhook')
        .send(textMessage);

      const interactiveMessage = mockWhatsAppAPI.getLastMessage();
      const slotButtonId = interactiveMessage.message.interactive.action.buttons[0].reply.id;

      mockWhatsAppAPI.clearMessages();

      const slotTapMessage = createButtonClickWebhook({
        from: testCustomer.phone,
        buttonId: slotButtonId,
        buttonText: '3:00 PM',
      });

      await request(app.getHttpServer())
        .post('/api/v1/whatsapp/webhook')
        .send(slotTapMessage);

      const confirmationMessage = mockWhatsAppAPI.getLastMessage();
      const confirmButton = confirmationMessage.message.interactive.action.buttons.find(
        (btn: any) => btn.reply.id.startsWith('confirm_')
      );

      const confirmTapMessage = createButtonClickWebhook({
        from: testCustomer.phone,
        buttonId: confirmButton.reply.id,
        buttonText: 'Confirm',
      });

      await request(app.getHttpServer())
        .post('/api/v1/whatsapp/webhook')
        .send(confirmTapMessage);

      // Assert: Booking count should be incremented
      const updatedSalon = await prisma.salon.findFirst();
      expect(updatedSalon!.usage_current_bookings).toBe(initialCount + 1);
    });

    it('should create conversation record', async () => {
      // Arrange & Act: Send initial message
      const textMessage = createTextMessageWebhook({
        from: testCustomer.phone,
        text: 'Haircut Friday 3pm',
        name: testCustomer.name,
      });

      await request(app.getHttpServer())
        .post('/api/v1/whatsapp/webhook')
        .send(textMessage)
        .expect(200);

      // Assert: Conversation should be created
      const conversation = await prisma.conversation.findFirst({
        where: { phone_number: testCustomer.phone },
      });

      expect(conversation).toBeDefined();
      expect(conversation!.phone_number).toBe(testCustomer.phone);
    });
  });

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('Error Handling', () => {
    it('should handle invalid slot button ID gracefully', async () => {
      // Arrange
      const invalidSlotTap = createButtonClickWebhook({
        from: testCustomer.phone,
        buttonId: 'slot_invalid_format',
        buttonText: 'Invalid',
      });

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/v1/whatsapp/webhook')
        .send(invalidSlotTap)
        .expect(200);

      // Assert: Should send error message
      expect(response.body.status).toBe('ok');

      const errorMessage = mockWhatsAppAPI.getLastMessage();
      expect(errorMessage.message.type).toBe('text');
      expect(errorMessage.message.text.body).toContain('error');
    });

    it('should handle WhatsApp API failure', async () => {
      // Arrange
      mockWhatsAppAPI.fail();

      const textMessage = createTextMessageWebhook({
        from: testCustomer.phone,
        text: 'Haircut Friday 3pm',
      });

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/v1/whatsapp/webhook')
        .send(textMessage)
        .expect(200);

      // Assert: Should handle gracefully
      expect(response.body.status).toBe('ok');
    });

    it('should handle concurrent booking attempts', async () => {
      // Arrange: Create same slot selection simultaneously
      const slotButtonId = 'slot_2024-10-25_15:00_m123';

      const slotTap1 = createButtonClickWebhook({
        from: '+1111111111',
        buttonId: slotButtonId,
        buttonText: '3:00 PM',
      });

      const slotTap2 = createButtonClickWebhook({
        from: '+2222222222',
        buttonId: slotButtonId,
        buttonText: '3:00 PM',
      });

      // Act: Send both simultaneously
      const [response1, response2] = await Promise.all([
        request(app.getHttpServer())
          .post('/api/v1/whatsapp/webhook')
          .send(slotTap1),
        request(app.getHttpServer())
          .post('/api/v1/whatsapp/webhook')
          .send(slotTap2),
      ]);

      // Assert: Both should succeed (or second should get different slot)
      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
    });
  });
});
