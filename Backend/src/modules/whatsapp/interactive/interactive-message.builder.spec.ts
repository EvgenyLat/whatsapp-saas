/**
 * Unit Tests for InteractiveCardBuilder Service
 *
 * Tests all methods and edge cases for building WhatsApp interactive messages.
 *
 * @module modules/whatsapp/interactive
 */

import { Test, TestingModule } from '@nestjs/testing';
import {
  InteractiveCardBuilder,
  TimeSlot,
  SlotSelectionParams,
  ReplyButtonsParams,
  ListMessageParams,
  ConfirmationParams,
  BookingDetails,
} from './interactive-message.builder';
import {
  InteractiveMessagePayload,
  InteractiveButtons,
  InteractiveList,
} from '../../../types/whatsapp.types';

describe('InteractiveCardBuilder', () => {
  let service: InteractiveCardBuilder;

  // Sample time slots
  const sampleSlots: TimeSlot[] = [
    {
      date: '2024-10-25',
      time: '14:00',
      masterId: 'm123',
      masterName: 'Sarah',
    },
    {
      date: '2024-10-25',
      time: '15:00',
      masterId: 'm123',
      masterName: 'Sarah',
      isPreferred: true,
    },
    {
      date: '2024-10-25',
      time: '16:00',
      masterId: 'm123',
      masterName: 'Sarah',
    },
  ];

  const sampleBooking: BookingDetails = {
    bookingId: 'b456',
    serviceName: "Women's Haircut",
    date: '2024-10-25',
    time: '15:00',
    masterName: 'Sarah',
    masterId: 'm123',
    duration: 60,
    price: '$50',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InteractiveCardBuilder],
    }).compile();

    service = module.get<InteractiveCardBuilder>(InteractiveCardBuilder);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==========================================================================
  // buildSlotSelectionCard() Tests
  // ==========================================================================

  describe('buildSlotSelectionCard', () => {
    it('should build Reply Buttons card for 1-3 slots', () => {
      const params: SlotSelectionParams = {
        slots: sampleSlots,
        language: 'en',
        customerPhone: '+1234567890',
      };

      const result = service.buildSlotSelectionCard(params);

      expect(result.type).toBe('interactive');
      expect(result.to).toBe('+1234567890');
      expect((result.interactive as InteractiveButtons).type).toBe('button');
      expect((result.interactive as InteractiveButtons).action.buttons).toHaveLength(3);
    });

    it('should build List Message card for 4-10 slots', () => {
      const fourSlots: TimeSlot[] = [
        ...sampleSlots,
        { date: '2024-10-26', time: '10:00', masterId: 'm456', masterName: 'Alex' },
      ];

      const params: SlotSelectionParams = {
        slots: fourSlots,
        language: 'en',
        customerPhone: '+1234567890',
      };

      const result = service.buildSlotSelectionCard(params);

      expect(result.type).toBe('interactive');
      expect((result.interactive as InteractiveList).type).toBe('list');
      expect((result.interactive as InteractiveList).action.sections.length).toBeGreaterThan(0);
    });

    it('should throw error for empty slots', () => {
      const params: SlotSelectionParams = {
        slots: [],
        language: 'en',
        customerPhone: '+1234567890',
      };

      expect(() => service.buildSlotSelectionCard(params)).toThrow(
        'Cannot build slot selection card: no slots provided',
      );
    });

    it('should throw error for more than 10 slots', () => {
      const elevenSlots: TimeSlot[] = [
        ...Array(11)
          .fill(null)
          .map((_, i) => ({
            date: '2024-10-25',
            time: `${10 + i}:00`,
            masterId: 'm123',
            masterName: 'Sarah',
          })),
      ];

      const params: SlotSelectionParams = {
        slots: elevenSlots,
        language: 'en',
        customerPhone: '+1234567890',
      };

      expect(() => service.buildSlotSelectionCard(params)).toThrow('Too many slots: 11 (max 10)');
    });

    it('should include service name in body text', () => {
      const params: SlotSelectionParams = {
        slots: sampleSlots,
        language: 'en',
        customerPhone: '+1234567890',
        serviceName: "Women's Haircut",
      };

      const result = service.buildSlotSelectionCard(params);
      const interactive = result.interactive as InteractiveButtons;

      expect(interactive.body.text).toContain("Women's Haircut");
    });
  });

  // ==========================================================================
  // buildReplyButtonsCard() Tests
  // ==========================================================================

  describe('buildReplyButtonsCard', () => {
    it('should build valid Reply Buttons message', () => {
      const params: ReplyButtonsParams = {
        slots: sampleSlots,
        language: 'en',
        customerPhone: '+1234567890',
      };

      const result = service.buildReplyButtonsCard(params);

      expect(result.messaging_product).toBe('whatsapp');
      expect(result.to).toBe('+1234567890');
      expect(result.type).toBe('interactive');

      const interactive = result.interactive as InteractiveButtons;
      expect(interactive.type).toBe('button');
      expect(interactive.body.text).toBeTruthy();
      expect(interactive.footer?.text).toBe('Tap to select your time');
      expect(interactive.action.buttons).toHaveLength(3);
    });

    it('should create correct button IDs', () => {
      const params: ReplyButtonsParams = {
        slots: [sampleSlots[0]],
        language: 'en',
        customerPhone: '+1234567890',
      };

      const result = service.buildReplyButtonsCard(params);
      const interactive = result.interactive as InteractiveButtons;
      const button = interactive.action.buttons[0];

      expect(button.reply.id).toBe('slot_2024-10-25_14:00_m123');
    });

    it('should create button titles with time and master name', () => {
      const params: ReplyButtonsParams = {
        slots: [sampleSlots[0]],
        language: 'en',
        customerPhone: '+1234567890',
      };

      const result = service.buildReplyButtonsCard(params);
      const interactive = result.interactive as InteractiveButtons;
      const button = interactive.action.buttons[0];

      expect(button.reply.title).toContain('2:00 PM');
      expect(button.reply.title).toContain('Sarah');
    });

    it('should mark preferred slots with star', () => {
      const params: ReplyButtonsParams = {
        slots: [sampleSlots[1]], // isPreferred: true
        language: 'en',
        customerPhone: '+1234567890',
      };

      const result = service.buildReplyButtonsCard(params);
      const interactive = result.interactive as InteractiveButtons;
      const button = interactive.action.buttons[0];

      expect(button.reply.title).toContain('⭐');
    });

    it('should include service details in body', () => {
      const params: ReplyButtonsParams = {
        slots: sampleSlots,
        language: 'en',
        customerPhone: '+1234567890',
        serviceName: "Women's Haircut",
        duration: 60,
        price: '$50',
      };

      const result = service.buildReplyButtonsCard(params);
      const interactive = result.interactive as InteractiveButtons;

      expect(interactive.body.text).toContain("Women's Haircut");
      expect(interactive.body.text).toContain('60 min');
      expect(interactive.body.text).toContain('$50');
    });

    it('should throw error for more than 3 slots', () => {
      const fourSlots: TimeSlot[] = [
        ...sampleSlots,
        { date: '2024-10-25', time: '17:00', masterId: 'm123', masterName: 'Sarah' },
      ];

      const params: ReplyButtonsParams = {
        slots: fourSlots,
        language: 'en',
        customerPhone: '+1234567890',
      };

      expect(() => service.buildReplyButtonsCard(params)).toThrow(
        'Too many slots for Reply Buttons: 4 (max 3)',
      );
    });

    it('should respect button title max length (20 chars)', () => {
      const params: ReplyButtonsParams = {
        slots: [
          {
            date: '2024-10-25',
            time: '14:00',
            masterId: 'm123',
            masterName: 'VeryLongMasterName',
          },
        ],
        language: 'en',
        customerPhone: '+1234567890',
      };

      const result = service.buildReplyButtonsCard(params);
      const interactive = result.interactive as InteractiveButtons;
      const button = interactive.action.buttons[0];

      expect(button.reply.title.length).toBeLessThanOrEqual(20);
    });
  });

  // ==========================================================================
  // buildListMessageCard() Tests
  // ==========================================================================

  describe('buildListMessageCard', () => {
    const fourSlots: TimeSlot[] = [
      { date: '2024-10-25', time: '14:00', masterId: 'm123', masterName: 'Sarah' },
      {
        date: '2024-10-25',
        time: '15:00',
        masterId: 'm123',
        masterName: 'Sarah',
        isPreferred: true,
      },
      { date: '2024-10-26', time: '10:00', masterId: 'm456', masterName: 'Alex' },
      { date: '2024-10-26', time: '14:00', masterId: 'm123', masterName: 'Sarah' },
    ];

    it('should build valid List Message', () => {
      const params: ListMessageParams = {
        slots: fourSlots,
        language: 'en',
        customerPhone: '+1234567890',
      };

      const result = service.buildListMessageCard(params);

      expect(result.messaging_product).toBe('whatsapp');
      expect(result.to).toBe('+1234567890');
      expect(result.type).toBe('interactive');

      const interactive = result.interactive as InteractiveList;
      expect(interactive.type).toBe('list');
      expect(interactive.header?.text).toBe('Next available times');
      expect(interactive.body.text).toBeTruthy();
      expect(interactive.footer?.text).toBe('Tap to select your time');
      expect(interactive.action.button).toBe('Select Time');
      expect(interactive.action.sections.length).toBeGreaterThan(0);
    });

    it('should group slots by day', () => {
      const params: ListMessageParams = {
        slots: fourSlots,
        language: 'en',
        customerPhone: '+1234567890',
      };

      const result = service.buildListMessageCard(params);
      const interactive = result.interactive as InteractiveList;

      expect(interactive.action.sections).toHaveLength(2); // Two days
      expect(interactive.action.sections[0].rows).toHaveLength(2); // 2 slots on Oct 25
      expect(interactive.action.sections[1].rows).toHaveLength(2); // 2 slots on Oct 26
    });

    it('should format section titles with day names', () => {
      const params: ListMessageParams = {
        slots: fourSlots,
        language: 'en',
        customerPhone: '+1234567890',
      };

      const result = service.buildListMessageCard(params);
      const interactive = result.interactive as InteractiveList;

      expect(interactive.action.sections[0].title).toContain('Oct');
      expect(interactive.action.sections[0].title).toContain('25');
    });

    it('should create correct row IDs', () => {
      const params: ListMessageParams = {
        slots: fourSlots,
        language: 'en',
        customerPhone: '+1234567890',
      };

      const result = service.buildListMessageCard(params);
      const interactive = result.interactive as InteractiveList;
      const firstRow = interactive.action.sections[0].rows[0];

      expect(firstRow.id).toBe('slot_2024-10-25_14:00_m123');
    });

    it('should include service details in row descriptions', () => {
      const params: ListMessageParams = {
        slots: fourSlots,
        language: 'en',
        customerPhone: '+1234567890',
        duration: 60,
        price: '$50',
      };

      const result = service.buildListMessageCard(params);
      const interactive = result.interactive as InteractiveList;
      const firstRow = interactive.action.sections[0].rows[0];

      expect(firstRow.description).toContain('60 min');
      expect(firstRow.description).toContain('$50');
    });

    it('should throw error for less than 4 slots', () => {
      const params: ListMessageParams = {
        slots: sampleSlots.slice(0, 3),
        language: 'en',
        customerPhone: '+1234567890',
      };

      expect(() => service.buildListMessageCard(params)).toThrow(
        'Too few slots for List Message: 3 (min 4)',
      );
    });

    it('should throw error for more than 10 slots', () => {
      const elevenSlots: TimeSlot[] = [
        ...Array(11)
          .fill(null)
          .map((_, i) => ({
            date: '2024-10-25',
            time: `${10 + i}:00`,
            masterId: 'm123',
            masterName: 'Sarah',
          })),
      ];

      const params: ListMessageParams = {
        slots: elevenSlots,
        language: 'en',
        customerPhone: '+1234567890',
      };

      expect(() => service.buildListMessageCard(params)).toThrow(
        'Too many slots for List Message: 11 (max 10)',
      );
    });

    it('should respect row title max length (24 chars)', () => {
      const params: ListMessageParams = {
        slots: [
          ...fourSlots.slice(0, 3),
          {
            date: '2024-10-26',
            time: '15:00',
            masterId: 'm123',
            masterName: 'VeryLongMasterName',
          },
        ],
        language: 'en',
        customerPhone: '+1234567890',
      };

      const result = service.buildListMessageCard(params);
      const interactive = result.interactive as InteractiveList;

      interactive.action.sections.forEach((section) => {
        section.rows.forEach((row) => {
          expect(row.title.length).toBeLessThanOrEqual(24);
        });
      });
    });
  });

  // ==========================================================================
  // buildConfirmationCard() Tests
  // ==========================================================================

  describe('buildConfirmationCard', () => {
    it('should build valid confirmation card', () => {
      const params: ConfirmationParams = {
        booking: sampleBooking,
        language: 'en',
        customerPhone: '+1234567890',
      };

      const result = service.buildConfirmationCard(params);

      expect(result.messaging_product).toBe('whatsapp');
      expect(result.to).toBe('+1234567890');
      expect(result.type).toBe('interactive');

      const interactive = result.interactive as InteractiveButtons;
      expect(interactive.type).toBe('button');
      expect(interactive.action.buttons).toHaveLength(2);
    });

    it('should include booking details in body', () => {
      const params: ConfirmationParams = {
        booking: sampleBooking,
        language: 'en',
        customerPhone: '+1234567890',
      };

      const result = service.buildConfirmationCard(params);
      const interactive = result.interactive as InteractiveButtons;

      expect(interactive.body.text).toContain("Women's Haircut");
      expect(interactive.body.text).toContain('Sarah');
      expect(interactive.body.text).toContain('60');
      expect(interactive.body.text).toContain('$50');
    });

    it('should create Confirm and Change Time buttons', () => {
      const params: ConfirmationParams = {
        booking: sampleBooking,
        language: 'en',
        customerPhone: '+1234567890',
      };

      const result = service.buildConfirmationCard(params);
      const interactive = result.interactive as InteractiveButtons;
      const buttons = interactive.action.buttons;

      expect(buttons[0].reply.id).toBe('confirm_booking_b456');
      expect(buttons[0].reply.title).toBe('Confirm');
      expect(buttons[1].reply.id).toBe('action_change_time');
      expect(buttons[1].reply.title).toBe('Change Time');
    });
  });

  // ==========================================================================
  // formatTime() Tests
  // ==========================================================================

  describe('formatTime', () => {
    it('should format time in 12-hour format for English', () => {
      const time = service.formatTime('15:30', 'en');
      expect(time).toBe('3:30 PM');
    });

    it('should format time in 24-hour format for Russian', () => {
      const time = service.formatTime('15:30', 'ru');
      expect(time).toBe('15:30');
    });

    it('should handle midnight correctly', () => {
      const time = service.formatTime('00:00', 'en');
      expect(time).toBe('12:00 AM');
    });

    it('should handle noon correctly', () => {
      const time = service.formatTime('12:00', 'en');
      expect(time).toBe('12:00 PM');
    });
  });

  // ==========================================================================
  // formatDate() Tests
  // ==========================================================================

  describe('formatDate', () => {
    const date = new Date(2024, 9, 25); // October 25, 2024

    it('should format date in MM/DD/YYYY for English', () => {
      const formatted = service.formatDate(date, 'en');
      expect(formatted).toBe('10/25/2024');
    });

    it('should format date in DD/MM/YYYY for Russian', () => {
      const formatted = service.formatDate(date, 'ru');
      expect(formatted).toBe('25/10/2024');
    });

    it('should format date in DD/MM/YYYY for Spanish', () => {
      const formatted = service.formatDate(date, 'es');
      expect(formatted).toBe('25/10/2024');
    });

    it('should format date in DD/MM/YYYY for Portuguese', () => {
      const formatted = service.formatDate(date, 'pt');
      expect(formatted).toBe('25/10/2024');
    });

    it('should format date in DD/MM/YYYY for Hebrew', () => {
      const formatted = service.formatDate(date, 'he');
      expect(formatted).toBe('25/10/2024');
    });
  });

  // ==========================================================================
  // groupByDay() Tests
  // ==========================================================================

  describe('groupByDay', () => {
    it('should group slots by date', () => {
      const slots: TimeSlot[] = [
        { date: '2024-10-25', time: '14:00', masterId: 'm123', masterName: 'Sarah' },
        { date: '2024-10-25', time: '15:00', masterId: 'm123', masterName: 'Sarah' },
        { date: '2024-10-26', time: '10:00', masterId: 'm456', masterName: 'Alex' },
      ];

      const grouped = service.groupByDay(slots, 'en');

      expect(grouped).toHaveLength(2);
      expect(grouped[0].date).toBe('2024-10-25');
      expect(grouped[0].slots).toHaveLength(2);
      expect(grouped[1].date).toBe('2024-10-26');
      expect(grouped[1].slots).toHaveLength(1);
    });

    it('should format date headers with day names', () => {
      const slots: TimeSlot[] = [
        { date: '2024-10-25', time: '14:00', masterId: 'm123', masterName: 'Sarah' },
      ];

      const grouped = service.groupByDay(slots, 'en');

      expect(grouped[0].formattedDate).toContain('Oct');
      expect(grouped[0].formattedDate).toContain('25');
    });

    it('should sort groups by date', () => {
      const slots: TimeSlot[] = [
        { date: '2024-10-27', time: '10:00', masterId: 'm123', masterName: 'Sarah' },
        { date: '2024-10-25', time: '14:00', masterId: 'm123', masterName: 'Sarah' },
        { date: '2024-10-26', time: '15:00', masterId: 'm123', masterName: 'Sarah' },
      ];

      const grouped = service.groupByDay(slots, 'en');

      expect(grouped[0].date).toBe('2024-10-25');
      expect(grouped[1].date).toBe('2024-10-26');
      expect(grouped[2].date).toBe('2024-10-27');
    });
  });

  // ==========================================================================
  // Multi-Language Tests
  // ==========================================================================

  describe('Multi-Language Support', () => {
    it('should build Reply Buttons in Russian', () => {
      const params: ReplyButtonsParams = {
        slots: sampleSlots,
        language: 'ru',
        customerPhone: '+79001234567',
      };

      const result = service.buildReplyButtonsCard(params);
      const interactive = result.interactive as InteractiveButtons;

      expect(interactive.footer?.text).toBe('Нажмите, чтобы выбрать время');
    });

    it('should build Reply Buttons in Spanish', () => {
      const params: ReplyButtonsParams = {
        slots: sampleSlots,
        language: 'es',
        customerPhone: '+34612345678',
      };

      const result = service.buildReplyButtonsCard(params);
      const interactive = result.interactive as InteractiveButtons;

      expect(interactive.footer?.text).toBe('Toca para seleccionar tu horario');
    });

    it('should build Reply Buttons in Portuguese', () => {
      const params: ReplyButtonsParams = {
        slots: sampleSlots,
        language: 'pt',
        customerPhone: '+5511912345678',
      };

      const result = service.buildReplyButtonsCard(params);
      const interactive = result.interactive as InteractiveButtons;

      expect(interactive.footer?.text).toBe('Toque para selecionar seu horário');
    });

    it('should build Reply Buttons in Hebrew', () => {
      const params: ReplyButtonsParams = {
        slots: sampleSlots,
        language: 'he',
        customerPhone: '+972501234567',
      };

      const result = service.buildReplyButtonsCard(params);
      const interactive = result.interactive as InteractiveButtons;

      expect(interactive.footer?.text).toBe('לחץ לבחירת השעה');
    });

    it('should format time in 24-hour format for Russian', () => {
      const params: ReplyButtonsParams = {
        slots: [sampleSlots[0]],
        language: 'ru',
        customerPhone: '+79001234567',
      };

      const result = service.buildReplyButtonsCard(params);
      const interactive = result.interactive as InteractiveButtons;
      const button = interactive.action.buttons[0];

      expect(button.reply.title).toContain('14:00');
    });
  });

  // ==========================================================================
  // Edge Cases and Validation
  // ==========================================================================

  describe('Edge Cases and Validation', () => {
    it('should handle slots with very long master names', () => {
      const slots: TimeSlot[] = [
        {
          date: '2024-10-25',
          time: '14:00',
          masterId: 'm123',
          masterName: 'VeryLongMasterNameThatExceedsTheLimit',
        },
      ];

      const params: ReplyButtonsParams = {
        slots,
        language: 'en',
        customerPhone: '+1234567890',
      };

      const result = service.buildReplyButtonsCard(params);
      const interactive = result.interactive as InteractiveButtons;
      const button = interactive.action.buttons[0];

      expect(button.reply.title.length).toBeLessThanOrEqual(20);
    });

    it('should handle slots with very long service names', () => {
      const params: ReplyButtonsParams = {
        slots: sampleSlots,
        language: 'en',
        customerPhone: '+1234567890',
        serviceName: 'Very Long Service Name That Might Exceed The Body Text Limit',
      };

      const result = service.buildReplyButtonsCard(params);
      const interactive = result.interactive as InteractiveButtons;

      expect(interactive.body.text.length).toBeLessThanOrEqual(1024);
    });

    it('should handle button IDs near max length', () => {
      const slots: TimeSlot[] = [
        {
          date: '2024-10-25',
          time: '14:00',
          masterId: 'm' + 'x'.repeat(240), // Very long master ID
          masterName: 'Sarah',
        },
      ];

      const params: ReplyButtonsParams = {
        slots,
        language: 'en',
        customerPhone: '+1234567890',
      };

      const result = service.buildReplyButtonsCard(params);
      const interactive = result.interactive as InteractiveButtons;
      const button = interactive.action.buttons[0];

      expect(button.reply.id.length).toBeLessThanOrEqual(256);
    });

    it('should handle single slot', () => {
      const params: SlotSelectionParams = {
        slots: [sampleSlots[0]],
        language: 'en',
        customerPhone: '+1234567890',
      };

      const result = service.buildSlotSelectionCard(params);

      expect(result.type).toBe('interactive');
      expect((result.interactive as InteractiveButtons).action.buttons).toHaveLength(1);
    });

    it('should handle slots at boundary (exactly 3 slots)', () => {
      const params: SlotSelectionParams = {
        slots: sampleSlots,
        language: 'en',
        customerPhone: '+1234567890',
      };

      const result = service.buildSlotSelectionCard(params);

      expect((result.interactive as InteractiveButtons).type).toBe('button');
      expect((result.interactive as InteractiveButtons).action.buttons).toHaveLength(3);
    });

    it('should handle slots at boundary (exactly 4 slots)', () => {
      const fourSlots: TimeSlot[] = [
        ...sampleSlots,
        { date: '2024-10-25', time: '17:00', masterId: 'm123', masterName: 'Sarah' },
      ];

      const params: SlotSelectionParams = {
        slots: fourSlots,
        language: 'en',
        customerPhone: '+1234567890',
      };

      const result = service.buildSlotSelectionCard(params);

      expect((result.interactive as InteractiveList).type).toBe('list');
    });
  });
});
