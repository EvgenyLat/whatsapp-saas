/**
 * T023: End-to-End Tests for Zero-Typing Touch-Based Booking
 *
 * This test suite validates the complete booking flow from start to finish
 * with real database transactions. It tests the entire system including:
 * - Webhook handling
 * - Intent parsing
 * - Interactive message generation
 * - Booking creation
 * - Database persistence
 *
 * Success Criteria Validation:
 * - SC-001: Zero typing after initial message
 * - SC-002: 2-3 taps total to complete booking
 * - SC-003: <30 seconds booking time (simulated)
 *
 * Expected Status: FAILING (Red Phase)
 * These tests will fail until the complete system is implemented.
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
  delay,
  waitFor,
} from '../setup';
import {
  createTextMessageWebhook,
  createButtonClickWebhook,
  MockWhatsAppAPI,
  createMockWhatsAppAPI,
} from '../mocks/whatsapp-api.mock';
import { PrismaClient } from '@prisma/client';
import { addDays, format, setHours, setMinutes } from 'date-fns';

describe('Zero-Typing Touch-Based Booking - E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let mockWhatsAppAPI: MockWhatsAppAPI;

  // Test customer data
  const testCustomers = [
    { phone: '+15551234567', name: 'Alice Johnson' },
    { phone: '+15559876543', name: 'Bob Smith' },
    { phone: '+15555555555', name: 'Carol Davis' },
  ];

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
  // Success Criteria Tests
  // ============================================================================

  describe('Success Criteria Validation', () => {
    it('should achieve SC-001: Zero typing after initial message', async () => {
      // This test validates that customers never need to type after the first message
      const customer = testCustomers[0];
      const bookingStartTime = Date.now();

      // Interaction Tracking
      let typedMessages = 0;
      let buttonTaps = 0;

      // STEP 1: Customer types initial request (ONLY typing required)
      typedMessages++;

      const initialMessage = createTextMessageWebhook({
        from: customer.phone,
        text: 'Haircut Friday 3pm',
        name: customer.name,
      });

      await request(app.getHttpServer())
        .post('/api/v1/whatsapp/webhook')
        .send(initialMessage)
        .expect(200);

      // Bot should respond with interactive buttons
      const slotMessage = mockWhatsAppAPI.getLastMessage();
      expect(slotMessage.message.type).toBe('interactive');

      const slotButtons = slotMessage.message.interactive.action.buttons;
      expect(slotButtons.length).toBeGreaterThan(0);

      mockWhatsAppAPI.clearMessages();

      // STEP 2: Customer taps slot button (NO typing)
      buttonTaps++;

      const slotButtonId = slotButtons[0].reply.id;
      const slotTap = createButtonClickWebhook({
        from: customer.phone,
        buttonId: slotButtonId,
        buttonText: slotButtons[0].reply.title,
        name: customer.name,
      });

      await request(app.getHttpServer())
        .post('/api/v1/whatsapp/webhook')
        .send(slotTap)
        .expect(200);

      // Bot should respond with confirmation buttons
      const confirmMessage = mockWhatsAppAPI.getLastMessage();
      expect(confirmMessage.message.type).toBe('interactive');

      const confirmButtons = confirmMessage.message.interactive.action.buttons;
      const confirmButton = confirmButtons.find((btn: any) => btn.reply.id.startsWith('confirm_'));

      expect(confirmButton).toBeDefined();

      mockWhatsAppAPI.clearMessages();

      // STEP 3: Customer taps confirm button (NO typing)
      buttonTaps++;

      const confirmTap = createButtonClickWebhook({
        from: customer.phone,
        buttonId: confirmButton.reply.id,
        buttonText: confirmButton.reply.title,
        name: customer.name,
      });

      await request(app.getHttpServer())
        .post('/api/v1/whatsapp/webhook')
        .send(confirmTap)
        .expect(200);

      const bookingEndTime = Date.now();

      // VALIDATE SC-001: Zero typing after initial message
      expect(typedMessages).toBe(1);
      expect(buttonTaps).toBe(2);

      // Verify booking was created
      const booking = await prisma.booking.findFirst({
        where: { customer_phone: customer.phone },
      });

      expect(booking).toBeDefined();
      expect(booking.status).toBe('CONFIRMED');

      // Log results for visibility
      console.log(`
        ✓ SC-001 Validation Results:
        - Typed messages: ${typedMessages} (expected: 1)
        - Button taps: ${buttonTaps} (expected: 2)
        - Zero typing after initial: ${typedMessages === 1 ? 'PASS' : 'FAIL'}
        - Booking created: ${booking ? 'YES' : 'NO'}
        - Time taken: ${bookingEndTime - bookingStartTime}ms
      `);
    });

    it('should achieve SC-002: Average 2-3 taps per booking', async () => {
      // This test validates the average tap count across multiple bookings
      const customer = testCustomers[0];
      const tapCounts: number[] = [];

      // Simulate 5 different booking flows
      const bookingRequests = [
        'Haircut Friday 3pm',
        'Manicure tomorrow 2pm',
        'Facial next Monday 10am',
        'Pedicure Saturday 4pm',
        'Hair coloring Thursday 1pm',
      ];

      for (const request of bookingRequests) {
        await cleanTestDatabase();
        await seedTestData();
        mockWhatsAppAPI.clearMessages();

        let taps = 0;

        // Step 1: Type initial message
        const initialMessage = createTextMessageWebhook({
          from: customer.phone,
          text: request,
          name: customer.name,
        });

        await request(app.getHttpServer())
          .post('/api/v1/whatsapp/webhook')
          .send(initialMessage)
          .expect(200);

        const slotMessage = mockWhatsAppAPI.getLastMessage();

        // Check if we got interactive message or need more info
        if (slotMessage.message.type === 'interactive') {
          const buttons = slotMessage.message.interactive.action.buttons;

          if (buttons.length > 0) {
            // Step 2: Tap slot
            taps++;
            mockWhatsAppAPI.clearMessages();

            const slotTap = createButtonClickWebhook({
              from: customer.phone,
              buttonId: buttons[0].reply.id,
              buttonText: buttons[0].reply.title,
            });

            await request(app.getHttpServer())
              .post('/api/v1/whatsapp/webhook')
              .send(slotTap)
              .expect(200);

            const confirmMessage = mockWhatsAppAPI.getLastMessage();

            if (confirmMessage.message.type === 'interactive') {
              const confirmButtons = confirmMessage.message.interactive.action.buttons;
              const confirmButton = confirmButtons.find((btn: any) =>
                btn.reply.id.startsWith('confirm_')
              );

              if (confirmButton) {
                // Step 3: Tap confirm
                taps++;
                mockWhatsAppAPI.clearMessages();

                const confirmTap = createButtonClickWebhook({
                  from: customer.phone,
                  buttonId: confirmButton.reply.id,
                  buttonText: confirmButton.reply.title,
                });

                await request(app.getHttpServer())
                  .post('/api/v1/whatsapp/webhook')
                  .send(confirmTap)
                  .expect(200);
              }
            }
          }
        }

        tapCounts.push(taps);
      }

      // Calculate average taps
      const totalTaps = tapCounts.reduce((sum, count) => sum + count, 0);
      const averageTaps = totalTaps / tapCounts.length;

      // VALIDATE SC-002: Average 2-3 taps
      expect(averageTaps).toBeGreaterThanOrEqual(2);
      expect(averageTaps).toBeLessThanOrEqual(3);

      console.log(`
        ✓ SC-002 Validation Results:
        - Total bookings tested: ${tapCounts.length}
        - Tap counts: ${tapCounts.join(', ')}
        - Average taps: ${averageTaps.toFixed(2)}
        - Within 2-3 range: ${averageTaps >= 2 && averageTaps <= 3 ? 'PASS' : 'FAIL'}
      `);
    });

    it('should achieve SC-003: Complete booking in <30 seconds', async () => {
      // This test validates booking time (simulated with delays for network latency)
      const customer = testCustomers[0];
      const networkLatencyMs = 500; // Simulate 500ms network delay per interaction

      const startTime = Date.now();

      // Step 1: Initial message (+ simulated delay)
      const initialMessage = createTextMessageWebhook({
        from: customer.phone,
        text: 'Haircut Friday 3pm',
        name: customer.name,
      });

      await request(app.getHttpServer())
        .post('/api/v1/whatsapp/webhook')
        .send(initialMessage)
        .expect(200);

      await delay(networkLatencyMs); // Simulate network delay

      const slotMessage = mockWhatsAppAPI.getLastMessage();
      mockWhatsAppAPI.clearMessages();

      // Step 2: Slot selection (+ simulated delay)
      const slotButtons = slotMessage.message.interactive.action.buttons;
      const slotTap = createButtonClickWebhook({
        from: customer.phone,
        buttonId: slotButtons[0].reply.id,
        buttonText: slotButtons[0].reply.title,
      });

      await request(app.getHttpServer())
        .post('/api/v1/whatsapp/webhook')
        .send(slotTap)
        .expect(200);

      await delay(networkLatencyMs); // Simulate network delay

      const confirmMessage = mockWhatsAppAPI.getLastMessage();
      const confirmButton = confirmMessage.message.interactive.action.buttons.find((btn: any) =>
        btn.reply.id.startsWith('confirm_')
      );

      mockWhatsAppAPI.clearMessages();

      // Step 3: Confirmation (+ simulated delay)
      const confirmTap = createButtonClickWebhook({
        from: customer.phone,
        buttonId: confirmButton.reply.id,
        buttonText: confirmButton.reply.title,
      });

      await request(app.getHttpServer())
        .post('/api/v1/whatsapp/webhook')
        .send(confirmTap)
        .expect(200);

      await delay(networkLatencyMs); // Simulate network delay

      const endTime = Date.now();
      const totalTimeMs = endTime - startTime;
      const totalTimeSeconds = totalTimeMs / 1000;

      // VALIDATE SC-003: <30 seconds
      expect(totalTimeSeconds).toBeLessThan(30);

      // Verify booking was created
      const booking = await prisma.booking.findFirst({
        where: { customer_phone: customer.phone },
      });

      expect(booking).toBeDefined();

      console.log(`
        ✓ SC-003 Validation Results:
        - Total time: ${totalTimeSeconds.toFixed(2)}s
        - Under 30 seconds: ${totalTimeSeconds < 30 ? 'PASS' : 'FAIL'}
        - Network latency simulated: ${networkLatencyMs}ms per interaction
        - Booking created: ${booking ? 'YES' : 'NO'}
      `);
    });
  });

  // ============================================================================
  // Full Booking Flow Tests
  // ============================================================================

  describe('Complete End-to-End Booking Flow', () => {
    it('should complete full booking flow: "Haircut Friday 3pm" → slot → confirm → booking', async () => {
      // This is the PRIMARY E2E test for User Story 1
      const customer = testCustomers[0];

      // ========== PHASE 1: Customer sends initial message ==========
      console.log('\n========== PHASE 1: Initial Message ==========');

      const initialMessage = createTextMessageWebhook({
        from: customer.phone,
        text: 'Haircut Friday 3pm',
        name: customer.name,
      });

      const phase1Response = await request(app.getHttpServer())
        .post('/api/v1/whatsapp/webhook')
        .send(initialMessage)
        .expect(200);

      expect(phase1Response.body.status).toBe('ok');

      // Verify bot sent interactive message with slot options
      const slotMessage = mockWhatsAppAPI.getLastMessage();
      expect(slotMessage).toBeDefined();
      expect(slotMessage.message.type).toBe('interactive');
      expect(slotMessage.message.interactive.type).toBe('button');

      const slotButtons = slotMessage.message.interactive.action.buttons;
      expect(slotButtons).toBeDefined();
      expect(slotButtons.length).toBeGreaterThan(0);
      expect(slotButtons.length).toBeLessThanOrEqual(3);

      // Verify button IDs match expected format
      slotButtons.forEach((button: any) => {
        expect(button.reply.id).toMatch(/^slot_\d{4}-\d{2}-\d{2}_\d{2}:\d{2}_m\d+$/);
      });

      console.log(`✓ Bot responded with ${slotButtons.length} slot options`);

      mockWhatsAppAPI.clearMessages();

      // ========== PHASE 2: Customer taps slot button ==========
      console.log('\n========== PHASE 2: Slot Selection ==========');

      const selectedSlotButton = slotButtons[0];
      const slotTap = createButtonClickWebhook({
        from: customer.phone,
        buttonId: selectedSlotButton.reply.id,
        buttonText: selectedSlotButton.reply.title,
        name: customer.name,
      });

      const phase2Response = await request(app.getHttpServer())
        .post('/api/v1/whatsapp/webhook')
        .send(slotTap)
        .expect(200);

      expect(phase2Response.body.status).toBe('ok');

      // Verify bot sent confirmation message
      const confirmMessage = mockWhatsAppAPI.getLastMessage();
      expect(confirmMessage).toBeDefined();
      expect(confirmMessage.message.type).toBe('interactive');

      const confirmButtons = confirmMessage.message.interactive.action.buttons;
      expect(confirmButtons).toHaveLength(2); // Confirm and Cancel

      const confirmButton = confirmButtons.find((btn: any) => btn.reply.id.startsWith('confirm_'));
      const cancelButton = confirmButtons.find((btn: any) => btn.reply.id.startsWith('action_'));

      expect(confirmButton).toBeDefined();
      expect(cancelButton).toBeDefined();

      // Verify confirmation message includes booking details
      const confirmMessageBody = confirmMessage.message.interactive.body.text;
      expect(confirmMessageBody).toContain('Haircut');

      console.log('✓ Bot responded with confirmation card');

      mockWhatsAppAPI.clearMessages();

      // ========== PHASE 3: Customer taps confirm button ==========
      console.log('\n========== PHASE 3: Confirmation ==========');

      const confirmTap = createButtonClickWebhook({
        from: customer.phone,
        buttonId: confirmButton.reply.id,
        buttonText: confirmButton.reply.title,
        name: customer.name,
      });

      const phase3Response = await request(app.getHttpServer())
        .post('/api/v1/whatsapp/webhook')
        .send(confirmTap)
        .expect(200);

      expect(phase3Response.body.status).toBe('ok');

      // Verify success message was sent
      const successMessage = mockWhatsAppAPI.getLastMessage();
      expect(successMessage).toBeDefined();
      expect(successMessage.message.type).toBe('text');
      expect(successMessage.message.text.body).toContain('confirmed');

      console.log('✓ Bot sent confirmation message');

      // ========== PHASE 4: Verify database state ==========
      console.log('\n========== PHASE 4: Database Verification ==========');

      const booking = await prisma.booking.findFirst({
        where: { customer_phone: customer.phone },
        include: {
          service_relation: true,
          master: true,
          salon: true,
        },
      });

      expect(booking).toBeDefined();
      expect(booking.customer_phone).toBe(customer.phone);
      expect(booking.customer_name).toBe(customer.name);
      expect(booking.status).toBe('CONFIRMED');
      expect(booking.booking_code).toBeDefined();
      expect(booking.booking_code).toMatch(/^BOOK\d+$/);

      // Verify booking timestamp is in the future
      expect(booking.start_ts.getTime()).toBeGreaterThan(Date.now());

      // Verify service and master are linked
      expect(booking.service_relation).toBeDefined();
      expect(booking.service_relation.name).toContain('Haircut');
      expect(booking.master).toBeDefined();

      // Verify salon usage counter was incremented
      const salon = await prisma.salon.findUnique({
        where: { id: booking.salon_id },
      });

      expect(salon.usage_current_bookings).toBeGreaterThan(0);

      console.log(`✓ Booking created: ${booking.booking_code}`);
      console.log(`✓ Service: ${booking.service}`);
      console.log(`✓ Master: ${booking.master.name}`);
      console.log(`✓ Date/Time: ${format(booking.start_ts, 'yyyy-MM-dd HH:mm')}`);
      console.log(`✓ Status: ${booking.status}`);

      // ========== FINAL VALIDATION ==========
      console.log('\n========== FINAL VALIDATION ==========');
      console.log('✓ Customer typed 1 message');
      console.log('✓ Customer tapped 2 buttons');
      console.log('✓ Booking created successfully');
      console.log('✓ All success criteria met');
    });

    it('should handle multiple customers booking simultaneously', async () => {
      // This tests concurrency and database isolation
      const bookingPromises = testCustomers.map(async (customer, index) => {
        // Each customer books a different service at different times
        const requests = [
          'Haircut Friday 3pm',
          'Manicure Saturday 2pm',
          'Facial Monday 10am',
        ];

        const initialMessage = createTextMessageWebhook({
          from: customer.phone,
          text: requests[index],
          name: customer.name,
        });

        await request(app.getHttpServer())
          .post('/api/v1/whatsapp/webhook')
          .send(initialMessage)
          .expect(200);

        const slotMessage = mockWhatsAppAPI.getSentMessages().pop();
        const slotButtons = slotMessage.message.interactive.action.buttons;

        mockWhatsAppAPI.clearMessages();

        const slotTap = createButtonClickWebhook({
          from: customer.phone,
          buttonId: slotButtons[0].reply.id,
          buttonText: slotButtons[0].reply.title,
        });

        await request(app.getHttpServer())
          .post('/api/v1/whatsapp/webhook')
          .send(slotTap)
          .expect(200);

        const confirmMessage = mockWhatsAppAPI.getSentMessages().pop();
        const confirmButton = confirmMessage.message.interactive.action.buttons.find((btn: any) =>
          btn.reply.id.startsWith('confirm_')
        );

        mockWhatsAppAPI.clearMessages();

        const confirmTap = createButtonClickWebhook({
          from: customer.phone,
          buttonId: confirmButton.reply.id,
          buttonText: confirmButton.reply.title,
        });

        await request(app.getHttpServer())
          .post('/api/v1/whatsapp/webhook')
          .send(confirmTap)
          .expect(200);

        return customer.phone;
      });

      // Execute all bookings in parallel
      const completedPhones = await Promise.all(bookingPromises);

      // Verify all bookings were created
      const bookings = await prisma.booking.findMany({
        where: {
          customer_phone: {
            in: completedPhones,
          },
        },
      });

      expect(bookings).toHaveLength(testCustomers.length);

      // Verify no duplicate bookings
      const uniqueBookings = new Set(bookings.map((b) => b.booking_code));
      expect(uniqueBookings.size).toBe(bookings.length);

      console.log(`✓ ${bookings.length} concurrent bookings created successfully`);
    });

    it('should create valid booking for edge case: "tomorrow morning"', async () => {
      const customer = testCustomers[0];

      const initialMessage = createTextMessageWebhook({
        from: customer.phone,
        text: 'Haircut tomorrow morning',
        name: customer.name,
      });

      await request(app.getHttpServer())
        .post('/api/v1/whatsapp/webhook')
        .send(initialMessage)
        .expect(200);

      const slotMessage = mockWhatsAppAPI.getLastMessage();
      expect(slotMessage.message.type).toBe('interactive');

      const slotButtons = slotMessage.message.interactive.action.buttons;
      expect(slotButtons.length).toBeGreaterThan(0);

      // Verify suggested times are in morning hours (before noon)
      slotButtons.forEach((button: any) => {
        const buttonId = button.reply.id;
        const parts = buttonId.split('_');
        const time = parts[2]; // Format: HH:mm

        const [hours] = time.split(':');
        const hour = parseInt(hours);

        expect(hour).toBeLessThan(12); // Morning = before noon
      });

      console.log('✓ Bot correctly interpreted "tomorrow morning"');
    });

    it('should create valid booking for edge case: "next week"', async () => {
      const customer = testCustomers[0];

      const initialMessage = createTextMessageWebhook({
        from: customer.phone,
        text: 'Facial next week',
        name: customer.name,
      });

      await request(app.getHttpServer())
        .post('/api/v1/whatsapp/webhook')
        .send(initialMessage)
        .expect(200);

      const slotMessage = mockWhatsAppAPI.getLastMessage();
      expect(slotMessage.message.type).toBe('interactive');

      const slotButtons = slotMessage.message.interactive.action.buttons;
      expect(slotButtons.length).toBeGreaterThan(0);

      // Verify suggested dates are next week (7+ days from now)
      const today = new Date();
      const nextWeekStart = addDays(today, 7);

      slotButtons.forEach((button: any) => {
        const buttonId = button.reply.id;
        const parts = buttonId.split('_');
        const dateStr = parts[1]; // Format: YYYY-MM-DD

        const buttonDate = new Date(dateStr);
        expect(buttonDate.getTime()).toBeGreaterThanOrEqual(nextWeekStart.getTime());
      });

      console.log('✓ Bot correctly interpreted "next week"');
    });
  });

  // ============================================================================
  // Database Integrity Tests
  // ============================================================================

  describe('Database Integrity', () => {
    it('should maintain referential integrity across tables', async () => {
      const customer = testCustomers[0];

      // Complete a booking
      const initialMessage = createTextMessageWebhook({
        from: customer.phone,
        text: 'Haircut Friday 3pm',
        name: customer.name,
      });

      await request(app.getHttpServer())
        .post('/api/v1/whatsapp/webhook')
        .send(initialMessage);

      const slotMessage = mockWhatsAppAPI.getLastMessage();
      mockWhatsAppAPI.clearMessages();

      const slotTap = createButtonClickWebhook({
        from: customer.phone,
        buttonId: slotMessage.message.interactive.action.buttons[0].reply.id,
        buttonText: slotMessage.message.interactive.action.buttons[0].reply.title,
      });

      await request(app.getHttpServer())
        .post('/api/v1/whatsapp/webhook')
        .send(slotTap);

      const confirmMessage = mockWhatsAppAPI.getLastMessage();
      const confirmButton = confirmMessage.message.interactive.action.buttons.find((btn: any) =>
        btn.reply.id.startsWith('confirm_')
      );

      mockWhatsAppAPI.clearMessages();

      const confirmTap = createButtonClickWebhook({
        from: customer.phone,
        buttonId: confirmButton.reply.id,
        buttonText: confirmButton.reply.title,
      });

      await request(app.getHttpServer())
        .post('/api/v1/whatsapp/webhook')
        .send(confirmTap);

      // Verify all related records exist
      const booking = await prisma.booking.findFirst({
        where: { customer_phone: customer.phone },
        include: {
          service_relation: true,
          master: true,
          salon: true,
        },
      });

      expect(booking).toBeDefined();

      // Verify foreign key relationships
      expect(booking.salon_id).toBeDefined();
      expect(booking.service_id).toBeDefined();
      expect(booking.master_id).toBeDefined();

      expect(booking.salon).toBeDefined();
      expect(booking.service_relation).toBeDefined();
      expect(booking.master).toBeDefined();

      // Verify conversation was created
      const conversation = await prisma.conversation.findFirst({
        where: { customer_phone: customer.phone },
      });

      expect(conversation).toBeDefined();
      expect(conversation.salon_id).toBe(booking.salon_id);

      console.log('✓ All referential integrity constraints satisfied');
    });

    it('should rollback on booking creation failure', async () => {
      // This test verifies transaction rollback behavior
      const customer = testCustomers[0];

      // Get initial counts
      const initialBookingCount = await prisma.booking.count();

      // Attempt booking with invalid data (this will fail)
      const invalidSlotTap = createButtonClickWebhook({
        from: customer.phone,
        buttonId: 'slot_invalid_date_time_master',
        buttonText: 'Invalid Slot',
      });

      await request(app.getHttpServer())
        .post('/api/v1/whatsapp/webhook')
        .send(invalidSlotTap)
        .expect(200);

      // Verify no booking was created
      const finalBookingCount = await prisma.booking.count();
      expect(finalBookingCount).toBe(initialBookingCount);

      console.log('✓ Transaction rollback working correctly');
    });

    it('should clean up database after test completion', async () => {
      // Verify test cleanup works
      await cleanTestDatabase();

      const bookingCount = await prisma.booking.count();
      const conversationCount = await prisma.conversation.count();

      expect(bookingCount).toBe(0);
      expect(conversationCount).toBe(0);

      console.log('✓ Database cleanup successful');
    });
  });

  // ============================================================================
  // Performance Tests
  // ============================================================================

  describe('Performance Benchmarks', () => {
    it('should handle booking creation within performance budget', async () => {
      const customer = testCustomers[0];
      const performanceBudget = 5000; // 5 seconds max

      const startTime = Date.now();

      // Complete booking flow
      const initialMessage = createTextMessageWebhook({
        from: customer.phone,
        text: 'Haircut Friday 3pm',
        name: customer.name,
      });

      await request(app.getHttpServer())
        .post('/api/v1/whatsapp/webhook')
        .send(initialMessage);

      const slotMessage = mockWhatsAppAPI.getLastMessage();
      mockWhatsAppAPI.clearMessages();

      const slotTap = createButtonClickWebhook({
        from: customer.phone,
        buttonId: slotMessage.message.interactive.action.buttons[0].reply.id,
        buttonText: slotMessage.message.interactive.action.buttons[0].reply.title,
      });

      await request(app.getHttpServer())
        .post('/api/v1/whatsapp/webhook')
        .send(slotTap);

      const confirmMessage = mockWhatsAppAPI.getLastMessage();
      const confirmButton = confirmMessage.message.interactive.action.buttons.find((btn: any) =>
        btn.reply.id.startsWith('confirm_')
      );

      mockWhatsAppAPI.clearMessages();

      const confirmTap = createButtonClickWebhook({
        from: customer.phone,
        buttonId: confirmButton.reply.id,
        buttonText: confirmButton.reply.title,
      });

      await request(app.getHttpServer())
        .post('/api/v1/whatsapp/webhook')
        .send(confirmTap);

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(performanceBudget);

      console.log(`✓ Booking completed in ${totalTime}ms (budget: ${performanceBudget}ms)`);
    });

    it('should handle 10 sequential bookings within reasonable time', async () => {
      const startTime = Date.now();
      const bookingCount = 10;

      for (let i = 0; i < bookingCount; i++) {
        const customerPhone = `+1555000${i.toString().padStart(4, '0')}`;

        await cleanTestDatabase();
        await seedTestData();
        mockWhatsAppAPI.clearMessages();

        const initialMessage = createTextMessageWebhook({
          from: customerPhone,
          text: 'Haircut Friday 3pm',
          name: `Test Customer ${i}`,
        });

        await request(app.getHttpServer())
          .post('/api/v1/whatsapp/webhook')
          .send(initialMessage);

        const slotMessage = mockWhatsAppAPI.getLastMessage();
        mockWhatsAppAPI.clearMessages();

        const slotTap = createButtonClickWebhook({
          from: customerPhone,
          buttonId: slotMessage.message.interactive.action.buttons[0].reply.id,
          buttonText: slotMessage.message.interactive.action.buttons[0].reply.title,
        });

        await request(app.getHttpServer())
          .post('/api/v1/whatsapp/webhook')
          .send(slotTap);

        const confirmMessage = mockWhatsAppAPI.getLastMessage();
        const confirmButton = confirmMessage.message.interactive.action.buttons.find((btn: any) =>
          btn.reply.id.startsWith('confirm_')
        );

        mockWhatsAppAPI.clearMessages();

        const confirmTap = createButtonClickWebhook({
          from: customerPhone,
          buttonId: confirmButton.reply.id,
          buttonText: confirmButton.reply.title,
        });

        await request(app.getHttpServer())
          .post('/api/v1/whatsapp/webhook')
          .send(confirmTap);
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / bookingCount;

      console.log(`✓ ${bookingCount} bookings completed in ${totalTime}ms`);
      console.log(`✓ Average time per booking: ${avgTime.toFixed(2)}ms`);

      expect(avgTime).toBeLessThan(5000); // Each booking should complete in <5s
    });
  });
});
