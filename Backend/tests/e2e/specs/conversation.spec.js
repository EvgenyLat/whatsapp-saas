/**
 * =============================================================================
 * AI CONVERSATION E2E TESTS
 * =============================================================================
 * Tests multi-turn conversations, context retention, and AI-powered interactions
 * =============================================================================
 */

const { test, expect } = require('@playwright/test');
const { WhatsAppHelper } = require('../helpers/whatsapp-helper');
const { DatabaseHelper } = require('../helpers/database-helper');

test.describe('AI Conversation E2E', () => {
  let whatsappHelper;
  let databaseHelper;
  let testSalonId;
  let customerPhone;

  test.beforeAll(async () => {
    databaseHelper = new DatabaseHelper();
    await databaseHelper.connect();

    testSalonId = await databaseHelper.createTestSalon({
      name: 'AI Test Salon',
      phone: '+1234567890',
    });

    customerPhone = '+1555555555';
  });

  test.beforeEach(async ({ page }) => {
    whatsappHelper = new WhatsAppHelper(page);

    // Clear conversation history before each test
    await databaseHelper.clearConversation(customerPhone, testSalonId);
  });

  test.afterAll(async () => {
    await databaseHelper.cleanupTestData(testSalonId);
    await databaseHelper.disconnect();
  });

  // ===========================================================================
  // Multi-turn Conversation Tests
  // ===========================================================================

  test('should handle multi-turn booking conversation', async () => {
    // Turn 1: Customer greets
    await whatsappHelper.sendWebhook({
      from: customerPhone,
      to: testSalonId,
      body: 'Hi there!',
      timestamp: Date.now(),
    });

    await new Promise(resolve => setTimeout(resolve, 3000));
    let aiResponse = await databaseHelper.getLatestOutgoingMessage(customerPhone, testSalonId);
    expect(aiResponse.body.toLowerCase()).toMatch(/hello|hi|welcome|help/);

    // Turn 2: Customer expresses intent
    await whatsappHelper.sendWebhook({
      from: customerPhone,
      to: testSalonId,
      body: 'I want to book an appointment',
      timestamp: Date.now(),
    });

    await new Promise(resolve => setTimeout(resolve, 3000));
    aiResponse = await databaseHelper.getLatestOutgoingMessage(customerPhone, testSalonId);
    expect(aiResponse.body.toLowerCase()).toMatch(/what service|which service|type of service/);

    // Turn 3: Customer provides service
    await whatsappHelper.sendWebhook({
      from: customerPhone,
      to: testSalonId,
      body: 'Haircut and color',
      timestamp: Date.now(),
    });

    await new Promise(resolve => setTimeout(resolve, 3000));
    aiResponse = await databaseHelper.getLatestOutgoingMessage(customerPhone, testSalonId);
    expect(aiResponse.body.toLowerCase()).toMatch(/when|what time|what day|date/);

    // Turn 4: Customer provides date/time
    await whatsappHelper.sendWebhook({
      from: customerPhone,
      to: testSalonId,
      body: 'Tomorrow at 3pm',
      timestamp: Date.now(),
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    // Verify booking was created
    const booking = await databaseHelper.getLatestBooking(testSalonId, customerPhone);
    expect(booking).toBeTruthy();
    expect(booking.service_type.toLowerCase()).toContain('haircut');
    expect(booking.appointment_date.getHours()).toBe(15); // 3pm

    // Verify confirmation sent
    aiResponse = await databaseHelper.getLatestOutgoingMessage(customerPhone, testSalonId);
    expect(aiResponse.body.toLowerCase()).toMatch(/confirmed|booked/);
  });

  test('should maintain context across multiple messages', async () => {
    // Create a conversation
    await whatsappHelper.sendWebhook({
      from: customerPhone,
      to: testSalonId,
      body: 'I want to book an appointment',
      timestamp: Date.now(),
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Send service type
    await whatsappHelper.sendWebhook({
      from: customerPhone,
      to: testSalonId,
      body: 'Manicure',
      timestamp: Date.now(),
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Reference previous context without repeating
    await whatsappHelper.sendWebhook({
      from: customerPhone,
      to: testSalonId,
      body: 'Actually, make it a pedicure instead',
      timestamp: Date.now(),
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    // Verify AI understood the change
    const aiResponse = await databaseHelper.getLatestOutgoingMessage(customerPhone, testSalonId);
    expect(aiResponse.body.toLowerCase()).toMatch(/pedicure|updated|changed/);

    // Verify conversation history was used
    const conversation = await databaseHelper.getConversation(customerPhone, testSalonId);
    expect(conversation).toBeTruthy();
    expect(conversation.context).toBeTruthy();
  });

  test('should handle clarification questions', async () => {
    // Ambiguous request
    await whatsappHelper.sendWebhook({
      from: customerPhone,
      to: testSalonId,
      body: 'I need an appointment tomorrow',
      timestamp: Date.now(),
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    // AI should ask for clarification
    const aiResponse = await databaseHelper.getLatestOutgoingMessage(customerPhone, testSalonId);
    expect(aiResponse.body.toLowerCase()).toMatch(/what service|which service|what type/);

    // Customer clarifies
    await whatsappHelper.sendWebhook({
      from: customerPhone,
      to: testSalonId,
      body: 'Haircut',
      timestamp: Date.now(),
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    // AI should ask for time
    const secondResponse = await databaseHelper.getLatestOutgoingMessage(customerPhone, testSalonId);
    expect(secondResponse.body.toLowerCase()).toMatch(/what time|when/);
  });

  // ===========================================================================
  // Context Retention Tests
  // ===========================================================================

  test('should remember customer name across conversation', async () => {
    // Customer introduces themselves
    await whatsappHelper.sendWebhook({
      from: customerPhone,
      to: testSalonId,
      body: 'Hi, my name is Sarah',
      timestamp: Date.now(),
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Continue conversation
    await whatsappHelper.sendWebhook({
      from: customerPhone,
      to: testSalonId,
      body: 'I want to book a haircut',
      timestamp: Date.now(),
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    // AI should use customer's name
    const aiResponse = await databaseHelper.getLatestOutgoingMessage(customerPhone, testSalonId);
    expect(aiResponse.body).toMatch(/Sarah/);
  });

  test('should maintain context across multiple days', async () => {
    // Day 1: Start booking
    await whatsappHelper.sendWebhook({
      from: customerPhone,
      to: testSalonId,
      body: 'I want to book a haircut for next Monday',
      timestamp: Date.now(),
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    const firstBooking = await databaseHelper.getLatestBooking(testSalonId, customerPhone);
    expect(firstBooking).toBeTruthy();

    // Simulate next day
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Day 2: Reference previous booking
    await whatsappHelper.sendWebhook({
      from: customerPhone,
      to: testSalonId,
      body: 'Can I move my appointment to Tuesday instead?',
      timestamp: Date.now() + 86400000, // Next day
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    // AI should understand the reference
    const aiResponse = await databaseHelper.getLatestOutgoingMessage(customerPhone, testSalonId);
    expect(aiResponse.body.toLowerCase()).toMatch(/moved|updated|changed/);

    // Verify booking was updated
    const updatedBooking = await databaseHelper.getBookingById(firstBooking.id);
    const dayOfWeek = updatedBooking.appointment_date.getDay();
    expect(dayOfWeek).toBe(2); // Tuesday
  });

  // ===========================================================================
  // Booking Modification Tests
  // ===========================================================================

  test('should handle booking time modification', async () => {
    // Create booking
    const booking = await databaseHelper.createTestBooking({
      salon_id: testSalonId,
      customer_phone: customerPhone,
      service_type: 'Haircut',
      appointment_date: new Date(Date.now() + 86400000), // Tomorrow at midnight
      status: 'confirmed',
    });

    // Request modification
    await whatsappHelper.sendWebhook({
      from: customerPhone,
      to: testSalonId,
      body: `Can I change my booking ${booking.id} to 4pm?`,
      timestamp: Date.now(),
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    // Verify modification
    const updated = await databaseHelper.getBookingById(booking.id);
    expect(updated.appointment_date.getHours()).toBe(16); // 4pm

    // Verify confirmation
    const aiResponse = await databaseHelper.getLatestOutgoingMessage(customerPhone, testSalonId);
    expect(aiResponse.body.toLowerCase()).toMatch(/updated|changed|moved/);
    expect(aiResponse.body).toContain('4');
  });

  test('should handle booking date modification', async () => {
    // Create booking for tomorrow
    const tomorrow = new Date(Date.now() + 86400000);
    tomorrow.setHours(14, 0, 0, 0);

    const booking = await databaseHelper.createTestBooking({
      salon_id: testSalonId,
      customer_phone: customerPhone,
      service_type: 'Manicure',
      appointment_date: tomorrow,
      status: 'confirmed',
    });

    // Request date change
    await whatsappHelper.sendWebhook({
      from: customerPhone,
      to: testSalonId,
      body: `I need to reschedule booking ${booking.id} to next Friday`,
      timestamp: Date.now(),
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    // Verify date changed
    const updated = await databaseHelper.getBookingById(booking.id);
    const dayOfWeek = updated.appointment_date.getDay();
    expect(dayOfWeek).toBe(5); // Friday
  });

  test('should handle service type modification', async () => {
    const booking = await databaseHelper.createTestBooking({
      salon_id: testSalonId,
      customer_phone: customerPhone,
      service_type: 'Haircut',
      appointment_date: new Date(Date.now() + 86400000),
      status: 'confirmed',
    });

    // Request service change
    await whatsappHelper.sendWebhook({
      from: customerPhone,
      to: testSalonId,
      body: `Can I change booking ${booking.id} to a haircut and color instead?`,
      timestamp: Date.now(),
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    // Verify service changed
    const updated = await databaseHelper.getBookingById(booking.id);
    expect(updated.service_type.toLowerCase()).toMatch(/haircut.*color|color.*haircut/);
  });

  // ===========================================================================
  // Cancellation Flow Tests
  // ===========================================================================

  test('should handle booking cancellation with confirmation', async () => {
    const booking = await databaseHelper.createTestBooking({
      salon_id: testSalonId,
      customer_phone: customerPhone,
      service_type: 'Haircut',
      appointment_date: new Date(Date.now() + 86400000),
      status: 'confirmed',
    });

    // Request cancellation
    await whatsappHelper.sendWebhook({
      from: customerPhone,
      to: testSalonId,
      body: `I need to cancel booking ${booking.id}`,
      timestamp: Date.now(),
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    // AI should ask for confirmation
    const aiResponse = await databaseHelper.getLatestOutgoingMessage(customerPhone, testSalonId);
    expect(aiResponse.body.toLowerCase()).toMatch(/confirm|sure|cancel/);

    // Customer confirms
    await whatsappHelper.sendWebhook({
      from: customerPhone,
      to: testSalonId,
      body: 'Yes, please cancel it',
      timestamp: Date.now(),
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    // Verify cancellation
    const cancelled = await databaseHelper.getBookingById(booking.id);
    expect(cancelled.status).toBe('cancelled');
  });

  test('should handle cancellation request without booking ID', async () => {
    // Create booking
    const booking = await databaseHelper.createTestBooking({
      salon_id: testSalonId,
      customer_phone: customerPhone,
      service_type: 'Haircut',
      appointment_date: new Date(Date.now() + 86400000),
      status: 'confirmed',
    });

    // Vague cancellation request
    await whatsappHelper.sendWebhook({
      from: customerPhone,
      to: testSalonId,
      body: 'I want to cancel my appointment',
      timestamp: Date.now(),
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    // AI should identify the booking and ask for confirmation
    const aiResponse = await databaseHelper.getLatestOutgoingMessage(customerPhone, testSalonId);
    expect(aiResponse.body).toContain(booking.id);
    expect(aiResponse.body.toLowerCase()).toMatch(/cancel|confirm/);
  });

  // ===========================================================================
  // Error Handling in Conversations
  // ===========================================================================

  test('should handle unrecognized intent gracefully', async () => {
    await whatsappHelper.sendWebhook({
      from: customerPhone,
      to: testSalonId,
      body: 'xyzabc random gibberish 123',
      timestamp: Date.now(),
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    // AI should respond politely
    const aiResponse = await databaseHelper.getLatestOutgoingMessage(customerPhone, testSalonId);
    expect(aiResponse).toBeTruthy();
    expect(aiResponse.body.toLowerCase()).toMatch(/help|understand|assistance/);
  });

  test('should handle offensive language appropriately', async () => {
    await whatsappHelper.sendWebhook({
      from: customerPhone,
      to: testSalonId,
      body: 'This is terrible service!',
      timestamp: Date.now(),
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    // AI should respond professionally
    const aiResponse = await databaseHelper.getLatestOutgoingMessage(customerPhone, testSalonId);
    expect(aiResponse.body.toLowerCase()).toMatch(/sorry|apologize|help/);
  });

  test('should recover from AI processing errors', async () => {
    // Send message that might cause AI error
    await whatsappHelper.sendWebhook({
      from: customerPhone,
      to: testSalonId,
      body: 'A'.repeat(5000), // Very long message
      timestamp: Date.now(),
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    // Should get fallback response
    const aiResponse = await databaseHelper.getLatestOutgoingMessage(customerPhone, testSalonId);
    expect(aiResponse).toBeTruthy();
  });

  // ===========================================================================
  // Special Request Handling
  // ===========================================================================

  test('should handle special requests and notes', async () => {
    await whatsappHelper.sendWebhook({
      from: customerPhone,
      to: testSalonId,
      body: 'Book a haircut for tomorrow at 2pm. I have very thick hair, please allocate extra time.',
      timestamp: Date.now(),
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    // Verify booking created with notes
    const booking = await databaseHelper.getLatestBooking(testSalonId, customerPhone);
    expect(booking).toBeTruthy();
    expect(booking.notes || booking.special_requests).toMatch(/thick hair|extra time/);

    // Verify acknowledgment
    const aiResponse = await databaseHelper.getLatestOutgoingMessage(customerPhone, testSalonId);
    expect(aiResponse.body.toLowerCase()).toMatch(/noted|noted|noted|understand/);
  });

  test('should handle multiple requests in one message', async () => {
    await whatsappHelper.sendWebhook({
      from: customerPhone,
      to: testSalonId,
      body: 'I want to book a haircut tomorrow at 2pm and a manicure next week on Friday at 3pm',
      timestamp: Date.now(),
    });

    await new Promise(resolve => setTimeout(resolve, 7000));

    // Should create two bookings or ask for clarification
    const bookings = await databaseHelper.getBookings(testSalonId, customerPhone);
    const recentBookings = bookings.filter(
      b => Date.now() - new Date(b.created_at).getTime() < 10000
    );

    // Either 2 bookings created or AI asks which one first
    if (recentBookings.length === 2) {
      expect(recentBookings[0].service_type.toLowerCase()).toContain('haircut');
      expect(recentBookings[1].service_type.toLowerCase()).toContain('manicure');
    } else {
      const aiResponse = await databaseHelper.getLatestOutgoingMessage(customerPhone, testSalonId);
      expect(aiResponse.body.toLowerCase()).toMatch(/which|first|one at a time/);
    }
  });
});
