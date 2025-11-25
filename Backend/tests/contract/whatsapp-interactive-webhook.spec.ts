/**
 * T021: Contract Tests for WhatsApp Interactive Webhook Payloads
 *
 * This test suite validates the structure and format of WhatsApp webhook payloads
 * for interactive messages (button_reply and list_reply). It ensures that the
 * webhook payloads conform to the contract defined in the spec.
 *
 * Contract Reference:
 * specs/001-whatsapp-quick-booking/contracts/api/webhook-interactive.schema.json
 *
 * Test Categories:
 * 1. Payload Structure Validation
 * 2. Button ID Format Validation
 * 3. Interactive Message Type Validation
 * 4. Required Fields Validation
 *
 * Expected Status: FAILING (Red Phase)
 * These tests will fail until the webhook handler is implemented.
 */

import {
  createButtonClickWebhook,
  createListReplyWebhook,
  validateWebhookPayload,
  extractMessageFromWebhook,
  WhatsAppWebhookPayload,
} from '../mocks/whatsapp-api.mock';

describe('WhatsApp Interactive Webhook Contract Tests', () => {
  // ============================================================================
  // Button Reply Payload Tests
  // ============================================================================

  describe('Button Reply Webhook Payloads', () => {
    it('should validate button_reply webhook payload structure', () => {
      // Arrange
      const webhook = createButtonClickWebhook({
        from: '1234567890',
        buttonId: 'slot_2024-10-25_15:00_m123',
        buttonText: '3:00 PM - Sarah',
      });

      // Act
      const isValid = validateWebhookPayload(webhook);
      const message = extractMessageFromWebhook(webhook);

      // Assert
      expect(isValid).toBe(true);
      expect(webhook.object).toBe('whatsapp_business_account');
      expect(webhook.entry).toHaveLength(1);
      expect(webhook.entry[0].changes).toHaveLength(1);
      expect(webhook.entry[0].changes[0].field).toBe('messages');
      expect(webhook.entry[0].changes[0].value.messaging_product).toBe('whatsapp');

      // Validate message structure
      expect(message).toBeDefined();
      expect(message.type).toBe('interactive');
      expect(message.interactive).toBeDefined();
      expect(message.interactive.type).toBe('button_reply');
      expect(message.interactive.button_reply).toBeDefined();
      expect(message.interactive.button_reply.id).toBe('slot_2024-10-25_15:00_m123');
      expect(message.interactive.button_reply.title).toBe('3:00 PM - Sarah');
    });

    it('should validate button ID format for slot buttons', () => {
      // Arrange
      const validSlotButtonIds = [
        'slot_2024-10-25_15:00_m123',
        'slot_2024-12-31_23:59_m999',
        'slot_2025-01-01_00:00_m1',
      ];

      const buttonIdRegex = /^(slot|confirm|waitlist|action|nav)_[a-zA-Z0-9_:-]+$/;

      // Act & Assert
      validSlotButtonIds.forEach((buttonId) => {
        expect(buttonId).toMatch(buttonIdRegex);

        const webhook = createButtonClickWebhook({
          from: '1234567890',
          buttonId,
          buttonText: 'Test Button',
        });

        const message = extractMessageFromWebhook(webhook);
        expect(message.interactive.button_reply.id).toMatch(buttonIdRegex);
      });
    });

    it('should validate button ID format for confirm buttons', () => {
      // Arrange
      const validConfirmButtonIds = [
        'confirm_booking123',
        'confirm_BOOK001',
        'confirm_abc-def-123',
      ];

      const buttonIdRegex = /^(slot|confirm|waitlist|action|nav)_[a-zA-Z0-9_:-]+$/;

      // Act & Assert
      validConfirmButtonIds.forEach((buttonId) => {
        expect(buttonId).toMatch(buttonIdRegex);

        const webhook = createButtonClickWebhook({
          from: '1234567890',
          buttonId,
          buttonText: 'Confirm',
        });

        const message = extractMessageFromWebhook(webhook);
        expect(message.interactive.button_reply.id).toMatch(buttonIdRegex);
      });
    });

    it('should validate button ID format for waitlist buttons', () => {
      // Arrange
      const validWaitlistButtonIds = [
        'waitlist_join',
        'waitlist_cancel_123',
        'waitlist_notify_yes',
      ];

      const buttonIdRegex = /^(slot|confirm|waitlist|action|nav)_[a-zA-Z0-9_:-]+$/;

      // Act & Assert
      validWaitlistButtonIds.forEach((buttonId) => {
        expect(buttonId).toMatch(buttonIdRegex);

        const webhook = createButtonClickWebhook({
          from: '1234567890',
          buttonId,
          buttonText: 'Join Waitlist',
        });

        const message = extractMessageFromWebhook(webhook);
        expect(message.interactive.button_reply.id).toMatch(buttonIdRegex);
      });
    });

    it('should validate button ID format for action buttons', () => {
      // Arrange
      const validActionButtonIds = [
        'action_view_bookings',
        'action_cancel_booking',
        'action_reschedule_123',
      ];

      const buttonIdRegex = /^(slot|confirm|waitlist|action|nav)_[a-zA-Z0-9_:-]+$/;

      // Act & Assert
      validActionButtonIds.forEach((buttonId) => {
        expect(buttonId).toMatch(buttonIdRegex);

        const webhook = createButtonClickWebhook({
          from: '1234567890',
          buttonId,
          buttonText: 'View Bookings',
        });

        const message = extractMessageFromWebhook(webhook);
        expect(message.interactive.button_reply.id).toMatch(buttonIdRegex);
      });
    });

    it('should validate button ID format for navigation buttons', () => {
      // Arrange
      const validNavButtonIds = [
        'nav_back',
        'nav_home',
        'nav_services',
      ];

      const buttonIdRegex = /^(slot|confirm|waitlist|action|nav)_[a-zA-Z0-9_:-]+$/;

      // Act & Assert
      validNavButtonIds.forEach((buttonId) => {
        expect(buttonId).toMatch(buttonIdRegex);

        const webhook = createButtonClickWebhook({
          from: '1234567890',
          buttonId,
          buttonText: 'Back',
        });

        const message = extractMessageFromWebhook(webhook);
        expect(message.interactive.button_reply.id).toMatch(buttonIdRegex);
      });
    });

    it('should reject invalid button ID formats', () => {
      // Arrange
      const invalidButtonIds = [
        'invalid_button',        // doesn't match allowed prefixes
        'slot',                  // missing data after prefix
        'slot_',                 // missing data after underscore
        'confirm-booking123',    // using dash instead of underscore
        'slotbutton',           // missing separator
        'slot button',          // contains space
        '',                     // empty string
      ];

      const buttonIdRegex = /^(slot|confirm|waitlist|action|nav)_[a-zA-Z0-9_:-]+$/;

      // Act & Assert
      invalidButtonIds.forEach((buttonId) => {
        if (buttonId) {
          expect(buttonId).not.toMatch(buttonIdRegex);
        }
      });
    });

    it('should include metadata in button_reply payload', () => {
      // Arrange
      const webhook = createButtonClickWebhook({
        from: '1234567890',
        buttonId: 'confirm_booking123',
        buttonText: 'Confirm',
        name: 'Test Customer',
      });

      // Act
      const metadata = webhook.entry[0].changes[0].value.metadata;
      const contacts = webhook.entry[0].changes[0].value.contacts;

      // Assert
      expect(metadata).toBeDefined();
      expect(metadata.phone_number_id).toBeDefined();
      expect(metadata.display_phone_number).toBeDefined();

      expect(contacts).toBeDefined();
      expect(contacts).toHaveLength(1);
      expect(contacts![0].profile.name).toBe('Test Customer');
      expect(contacts![0].wa_id).toBe('1234567890');
    });

    it('should include timestamp in button_reply payload', () => {
      // Arrange
      const webhook = createButtonClickWebhook({
        from: '1234567890',
        buttonId: 'slot_2024-10-25_15:00_m123',
        buttonText: '3:00 PM',
      });

      // Act
      const message = extractMessageFromWebhook(webhook);

      // Assert
      expect(message.timestamp).toBeDefined();
      expect(typeof message.timestamp).toBe('string');
      expect(parseInt(message.timestamp)).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // List Reply Payload Tests
  // ============================================================================

  describe('List Reply Webhook Payloads', () => {
    it('should validate list_reply webhook payload structure', () => {
      // Arrange
      const webhook = createListReplyWebhook({
        from: '1234567890',
        listId: 'slot_2024-10-25_15:00_m123',
        listTitle: '3:00 PM - Sarah',
        listDescription: 'Haircut appointment',
      });

      // Act
      const isValid = validateWebhookPayload(webhook);
      const message = extractMessageFromWebhook(webhook);

      // Assert
      expect(isValid).toBe(true);
      expect(webhook.object).toBe('whatsapp_business_account');
      expect(webhook.entry).toHaveLength(1);
      expect(webhook.entry[0].changes).toHaveLength(1);

      // Validate message structure
      expect(message).toBeDefined();
      expect(message.type).toBe('interactive');
      expect(message.interactive).toBeDefined();
      expect(message.interactive.type).toBe('list_reply');
      expect(message.interactive.list_reply).toBeDefined();
      expect(message.interactive.list_reply.id).toBe('slot_2024-10-25_15:00_m123');
      expect(message.interactive.list_reply.title).toBe('3:00 PM - Sarah');
      expect(message.interactive.list_reply.description).toBe('Haircut appointment');
    });

    it('should validate list ID format matches button ID format', () => {
      // Arrange
      const validListIds = [
        'slot_2024-10-25_15:00_m123',
        'confirm_booking123',
        'action_view_bookings',
      ];

      const buttonIdRegex = /^(slot|confirm|waitlist|action|nav)_[a-zA-Z0-9_:-]+$/;

      // Act & Assert
      validListIds.forEach((listId) => {
        expect(listId).toMatch(buttonIdRegex);

        const webhook = createListReplyWebhook({
          from: '1234567890',
          listId,
          listTitle: 'Test List Item',
        });

        const message = extractMessageFromWebhook(webhook);
        expect(message.interactive.list_reply.id).toMatch(buttonIdRegex);
      });
    });

    it('should handle list_reply without description', () => {
      // Arrange
      const webhook = createListReplyWebhook({
        from: '1234567890',
        listId: 'slot_2024-10-25_15:00_m123',
        listTitle: '3:00 PM - Sarah',
        // description is optional
      });

      // Act
      const message = extractMessageFromWebhook(webhook);

      // Assert
      expect(message.interactive.list_reply).toBeDefined();
      expect(message.interactive.list_reply.id).toBe('slot_2024-10-25_15:00_m123');
      expect(message.interactive.list_reply.title).toBe('3:00 PM - Sarah');
    });

    it('should include metadata in list_reply payload', () => {
      // Arrange
      const webhook = createListReplyWebhook({
        from: '1234567890',
        listId: 'slot_2024-10-25_15:00_m123',
        listTitle: '3:00 PM',
        name: 'Test Customer',
      });

      // Act
      const metadata = webhook.entry[0].changes[0].value.metadata;
      const contacts = webhook.entry[0].changes[0].value.contacts;

      // Assert
      expect(metadata).toBeDefined();
      expect(metadata.phone_number_id).toBeDefined();
      expect(metadata.display_phone_number).toBeDefined();

      expect(contacts).toBeDefined();
      expect(contacts).toHaveLength(1);
      expect(contacts![0].profile.name).toBe('Test Customer');
    });
  });

  // ============================================================================
  // Payload Validation Tests
  // ============================================================================

  describe('Webhook Payload Validation', () => {
    it('should reject payload without object field', () => {
      // Arrange
      const invalidPayload: any = {
        entry: [],
      };

      // Act
      const isValid = validateWebhookPayload(invalidPayload);

      // Assert
      expect(isValid).toBe(false);
    });

    it('should reject payload with incorrect object value', () => {
      // Arrange
      const invalidPayload: any = {
        object: 'invalid_object_type',
        entry: [],
      };

      // Act
      const isValid = validateWebhookPayload(invalidPayload);

      // Assert
      expect(isValid).toBe(false);
    });

    it('should reject payload without entry array', () => {
      // Arrange
      const invalidPayload: any = {
        object: 'whatsapp_business_account',
      };

      // Act
      const isValid = validateWebhookPayload(invalidPayload);

      // Assert
      expect(isValid).toBe(false);
    });

    it('should reject payload with empty entry array', () => {
      // Arrange
      const invalidPayload: any = {
        object: 'whatsapp_business_account',
        entry: [],
      };

      // Act
      const isValid = validateWebhookPayload(invalidPayload);

      // Assert
      expect(isValid).toBe(false);
    });

    it('should reject payload without changes array', () => {
      // Arrange
      const invalidPayload: any = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: '123456789',
          },
        ],
      };

      // Act
      const isValid = validateWebhookPayload(invalidPayload);

      // Assert
      expect(isValid).toBe(false);
    });

    it('should validate required message fields', () => {
      // Arrange
      const webhook = createButtonClickWebhook({
        from: '1234567890',
        buttonId: 'slot_2024-10-25_15:00_m123',
        buttonText: '3:00 PM',
      });

      // Act
      const message = extractMessageFromWebhook(webhook);

      // Assert - Required fields as per contract
      expect(message.from).toBeDefined();
      expect(message.id).toBeDefined();
      expect(message.timestamp).toBeDefined();
      expect(message.type).toBeDefined();

      // Validate 'from' field format (E.164 without '+')
      expect(message.from).toMatch(/^[1-9]\d{1,14}$/);
    });

    it('should validate messaging_product is always "whatsapp"', () => {
      // Arrange
      const webhook = createButtonClickWebhook({
        from: '1234567890',
        buttonId: 'confirm_booking123',
        buttonText: 'Confirm',
      });

      // Act
      const value = webhook.entry[0].changes[0].value;

      // Assert
      expect(value.messaging_product).toBe('whatsapp');
    });

    it('should validate field is always "messages"', () => {
      // Arrange
      const webhook = createButtonClickWebhook({
        from: '1234567890',
        buttonId: 'confirm_booking123',
        buttonText: 'Confirm',
      });

      // Act
      const field = webhook.entry[0].changes[0].field;

      // Assert
      expect(field).toBe('messages');
    });
  });

  // ============================================================================
  // Slot Button ID Parsing Tests
  // ============================================================================

  describe('Slot Button ID Parsing', () => {
    it('should parse slot button ID components', () => {
      // Arrange
      const slotButtonId = 'slot_2024-10-25_15:00_m123';

      // Act
      const parts = slotButtonId.split('_');
      const prefix = parts[0];
      const date = parts[1];
      const time = parts[2];
      const masterId = parts[3];

      // Assert
      expect(prefix).toBe('slot');
      expect(date).toBe('2024-10-25');
      expect(time).toBe('15:00');
      expect(masterId).toBe('m123');

      // Validate date format
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      // Validate time format
      expect(time).toMatch(/^\d{2}:\d{2}$/);
    });

    it('should handle different time formats in slot button ID', () => {
      // Arrange
      const slotButtonIds = [
        'slot_2024-10-25_09:00_m1',
        'slot_2024-10-25_15:30_m2',
        'slot_2024-10-25_23:59_m3',
      ];

      // Act & Assert
      slotButtonIds.forEach((buttonId) => {
        const parts = buttonId.split('_');
        const time = parts[2];

        expect(time).toMatch(/^\d{2}:\d{2}$/);

        const [hours, minutes] = time.split(':');
        expect(parseInt(hours)).toBeGreaterThanOrEqual(0);
        expect(parseInt(hours)).toBeLessThanOrEqual(23);
        expect(parseInt(minutes)).toBeGreaterThanOrEqual(0);
        expect(parseInt(minutes)).toBeLessThanOrEqual(59);
      });
    });

    it('should handle different master IDs in slot button ID', () => {
      // Arrange
      const slotButtonIds = [
        'slot_2024-10-25_15:00_m1',
        'slot_2024-10-25_15:00_m999',
        'slot_2024-10-25_15:00_master123',
      ];

      // Act & Assert
      slotButtonIds.forEach((buttonId) => {
        const parts = buttonId.split('_');
        const masterId = parts[3];

        expect(masterId).toBeDefined();
        expect(masterId).toMatch(/^[a-zA-Z0-9]+$/);
      });
    });
  });

  // ============================================================================
  // Confirm Button ID Parsing Tests
  // ============================================================================

  describe('Confirm Button ID Parsing', () => {
    it('should parse confirm button ID components', () => {
      // Arrange
      const confirmButtonIds = [
        'confirm_booking123',
        'confirm_BOOK001',
        'confirm_abc-def-123',
      ];

      // Act & Assert
      confirmButtonIds.forEach((buttonId) => {
        const parts = buttonId.split('_');
        const prefix = parts[0];
        const bookingCode = parts.slice(1).join('_');

        expect(prefix).toBe('confirm');
        expect(bookingCode).toBeDefined();
        expect(bookingCode.length).toBeGreaterThan(0);
      });
    });
  });

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('Error Handling', () => {
    it('should handle missing interactive object gracefully', () => {
      // Arrange
      const webhook: WhatsAppWebhookPayload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: '123456789',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '+1234567890',
                    phone_number_id: '987654321',
                  },
                  messages: [
                    {
                      from: '1234567890',
                      id: 'wamid.XXX',
                      timestamp: '1234567890',
                      type: 'text',
                      text: {
                        body: 'Hello',
                      },
                    },
                  ],
                },
                field: 'messages',
              },
            ],
          },
        ],
      };

      // Act
      const message = extractMessageFromWebhook(webhook);

      // Assert
      expect(message.type).toBe('text');
      expect(message.interactive).toBeUndefined();
    });

    it('should extract null for empty webhook', () => {
      // Arrange
      const emptyWebhook: WhatsAppWebhookPayload = {
        object: 'whatsapp_business_account',
        entry: [],
      };

      // Act
      const message = extractMessageFromWebhook(emptyWebhook);

      // Assert
      expect(message).toBeNull();
    });
  });
});
