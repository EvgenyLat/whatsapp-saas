/**
 * =============================================================================
 * BOOKING FLOW E2E TESTS
 * =============================================================================
 * Tests the complete booking flow from WhatsApp message to database entry
 * =============================================================================
 */

const { test, expect } = require('@playwright/test');
const { WhatsAppHelper } = require('../helpers/whatsapp-helper');
const { DatabaseHelper } = require('../helpers/database-helper');
const { AdminHelper } = require('../helpers/admin-helper');

test.describe('Booking Flow E2E', () => {
  let whatsappHelper;
  let databaseHelper;
  let adminHelper;
  let testSalonId;
  let customerPhone;

  test.beforeAll(async () => {
    databaseHelper = new DatabaseHelper();
    await databaseHelper.connect();

    // Create test salon
    testSalonId = await databaseHelper.createTestSalon({
      name: 'E2E Test Salon',
      phone: '+1234567890',
    });

    customerPhone = '+1987654321';
  });

  test.beforeEach(async ({ page }) => {
    whatsappHelper = new WhatsAppHelper(page);
    adminHelper = new AdminHelper(page);
  });

  test.afterAll(async () => {
    // Cleanup test data
    await databaseHelper.cleanupTestData(testSalonId);
    await databaseHelper.disconnect();
  });

  test('should process booking request from WhatsApp to completion', async ({ page }) => {
    // =========================================================================
    // Step 1: Customer sends WhatsApp message
    // =========================================================================
    const bookingMessage = {
      from: customerPhone,
      to: testSalonId,
      body: 'Hi, I would like to book a haircut for tomorrow at 2pm',
      timestamp: Date.now(),
    };

    const webhookResponse = await whatsappHelper.sendWebhook(bookingMessage);

    // Verify webhook was accepted
    expect(webhookResponse.status).toBe(200);
    expect(webhookResponse.body).toHaveProperty('success', true);

    // =========================================================================
    // Step 2: AI processes booking request
    // =========================================================================
    // Wait for AI processing (max 5 seconds)
    await page.waitForTimeout(5000);

    // Verify AI extracted booking details
    const aiResponse = await databaseHelper.getLatestMessage(customerPhone, testSalonId);
    expect(aiResponse).toBeTruthy();
    expect(aiResponse.ai_processed).toBe(true);
    expect(aiResponse.intent).toBe('booking');

    // =========================================================================
    // Step 3: System creates booking
    // =========================================================================
    const booking = await databaseHelper.getLatestBooking(testSalonId, customerPhone);
    expect(booking).toBeTruthy();
    expect(booking.customer_phone).toBe(customerPhone);
    expect(booking.status).toBe('pending');
    expect(booking.service_type).toBeTruthy();

    // Verify booking date is tomorrow
    const bookingDate = new Date(booking.appointment_date);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(bookingDate.toDateString()).toBe(tomorrow.toDateString());

    // Verify time is 2pm
    expect(bookingDate.getHours()).toBe(14);

    // =========================================================================
    // Step 4: Confirmation sent
    // =========================================================================
    const confirmationMessage = await databaseHelper.getConfirmationMessage(
      customerPhone,
      testSalonId,
      booking.id
    );
    expect(confirmationMessage).toBeTruthy();
    expect(confirmationMessage.body).toContain('confirmed');
    expect(confirmationMessage.body).toContain(booking.id);

    // =========================================================================
    // Step 5: Booking appears in admin panel
    // =========================================================================
    await adminHelper.login(page);
    await adminHelper.navigateToBookings(testSalonId);

    // Verify booking appears in list
    const bookingRow = await page.locator(`[data-booking-id="${booking.id}"]`);
    await expect(bookingRow).toBeVisible();

    // Verify booking details
    await bookingRow.click();
    await expect(page.locator('[data-testid="booking-customer-phone"]')).toHaveText(customerPhone);
    await expect(page.locator('[data-testid="booking-status"]')).toHaveText('pending');

    // =========================================================================
    // Step 6: Verify in database
    // =========================================================================
    const finalBooking = await databaseHelper.getBookingById(booking.id);
    expect(finalBooking).toBeTruthy();
    expect(finalBooking.id).toBe(booking.id);
    expect(finalBooking.salon_id).toBe(testSalonId);
    expect(finalBooking.customer_phone).toBe(customerPhone);
    expect(finalBooking.created_at).toBeTruthy();
    expect(finalBooking.updated_at).toBeTruthy();
  });

  test('should handle booking modification request', async ({ page }) => {
    // Create initial booking
    const booking = await databaseHelper.createTestBooking({
      salon_id: testSalonId,
      customer_phone: customerPhone,
      appointment_date: new Date(Date.now() + 86400000), // Tomorrow
      status: 'confirmed',
    });

    // Customer sends modification request
    const modificationMessage = {
      from: customerPhone,
      to: testSalonId,
      body: `I need to change my booking ${booking.id} to 3pm instead`,
      timestamp: Date.now(),
    };

    const response = await whatsappHelper.sendWebhook(modificationMessage);
    expect(response.status).toBe(200);

    // Wait for processing
    await page.waitForTimeout(5000);

    // Verify booking was updated
    const updatedBooking = await databaseHelper.getBookingById(booking.id);
    expect(updatedBooking.appointment_date.getHours()).toBe(15); // 3pm
    expect(updatedBooking.status).toBe('confirmed'); // Still confirmed

    // Verify confirmation message sent
    const confirmationMessage = await databaseHelper.getLatestMessage(
      customerPhone,
      testSalonId
    );
    expect(confirmationMessage.body).toContain('updated');
    expect(confirmationMessage.body).toContain('3');
  });

  test('should handle booking cancellation request', async ({ page }) => {
    // Create initial booking
    const booking = await databaseHelper.createTestBooking({
      salon_id: testSalonId,
      customer_phone: customerPhone,
      appointment_date: new Date(Date.now() + 86400000),
      status: 'confirmed',
    });

    // Customer sends cancellation request
    const cancellationMessage = {
      from: customerPhone,
      to: testSalonId,
      body: `I need to cancel my booking ${booking.id}`,
      timestamp: Date.now(),
    };

    const response = await whatsappHelper.sendWebhook(cancellationMessage);
    expect(response.status).toBe(200);

    // Wait for processing
    await page.waitForTimeout(5000);

    // Verify booking was cancelled
    const cancelledBooking = await databaseHelper.getBookingById(booking.id);
    expect(cancelledBooking.status).toBe('cancelled');

    // Verify cancellation message sent
    const confirmationMessage = await databaseHelper.getLatestMessage(
      customerPhone,
      testSalonId
    );
    expect(confirmationMessage.body).toContain('cancelled');
  });

  test('should handle invalid booking date gracefully', async ({ page }) => {
    // Customer sends invalid booking request (past date)
    const invalidMessage = {
      from: customerPhone,
      to: testSalonId,
      body: 'I want to book a haircut for yesterday at 2pm',
      timestamp: Date.now(),
    };

    const response = await whatsappHelper.sendWebhook(invalidMessage);
    expect(response.status).toBe(200);

    // Wait for processing
    await page.waitForTimeout(5000);

    // Verify no booking was created
    const bookings = await databaseHelper.getBookings(testSalonId, customerPhone);
    const recentBookings = bookings.filter(
      b => Date.now() - new Date(b.created_at).getTime() < 10000
    );
    expect(recentBookings.length).toBe(0);

    // Verify error message sent
    const errorMessage = await databaseHelper.getLatestMessage(
      customerPhone,
      testSalonId
    );
    expect(errorMessage.body.toLowerCase()).toContain('past');
  });

  test('should handle multiple bookings from same customer', async ({ page }) => {
    // Customer sends first booking
    const firstMessage = {
      from: customerPhone,
      to: testSalonId,
      body: 'Book haircut tomorrow at 2pm',
      timestamp: Date.now(),
    };

    await whatsappHelper.sendWebhook(firstMessage);
    await page.waitForTimeout(5000);

    // Customer sends second booking
    const secondMessage = {
      from: customerPhone,
      to: testSalonId,
      body: 'Book manicure next week at 3pm',
      timestamp: Date.now(),
    };

    await whatsappHelper.sendWebhook(secondMessage);
    await page.waitForTimeout(5000);

    // Verify both bookings exist
    const bookings = await databaseHelper.getBookings(testSalonId, customerPhone);
    expect(bookings.length).toBeGreaterThanOrEqual(2);

    // Verify they have different appointment dates
    const dates = bookings.map(b => b.appointment_date.getTime());
    const uniqueDates = new Set(dates);
    expect(uniqueDates.size).toBeGreaterThanOrEqual(2);
  });

  test('should maintain conversation context across messages', async ({ page }) => {
    // Customer starts conversation
    const firstMessage = {
      from: customerPhone,
      to: testSalonId,
      body: 'Hi, I want to book an appointment',
      timestamp: Date.now(),
    };

    await whatsappHelper.sendWebhook(firstMessage);
    await page.waitForTimeout(3000);

    // AI asks for service type
    let aiResponse = await databaseHelper.getLatestMessage(customerPhone, testSalonId);
    expect(aiResponse.body.toLowerCase()).toMatch(/what service|which service/);

    // Customer provides service
    const secondMessage = {
      from: customerPhone,
      to: testSalonId,
      body: 'Haircut',
      timestamp: Date.now(),
    };

    await whatsappHelper.sendWebhook(secondMessage);
    await page.waitForTimeout(3000);

    // AI asks for date/time
    aiResponse = await databaseHelper.getLatestMessage(customerPhone, testSalonId);
    expect(aiResponse.body.toLowerCase()).toMatch(/when|what time|date/);

    // Customer provides date/time
    const thirdMessage = {
      from: customerPhone,
      to: testSalonId,
      body: 'Tomorrow at 2pm',
      timestamp: Date.now(),
    };

    await whatsappHelper.sendWebhook(thirdMessage);
    await page.waitForTimeout(5000);

    // Verify booking created with correct service
    const booking = await databaseHelper.getLatestBooking(testSalonId, customerPhone);
    expect(booking).toBeTruthy();
    expect(booking.service_type.toLowerCase()).toContain('haircut');
  });
});
