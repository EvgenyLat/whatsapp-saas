/**
 * Interactive Message Examples
 *
 * This file provides examples of how to use the sendInteractiveMessage method
 * to send Reply Button and List interactive messages via WhatsApp Cloud API.
 */

import { SendInteractiveDto, InteractiveType } from '../dto';

/**
 * Example 1: Reply Buttons - Appointment Confirmation
 * Max 3 buttons, each with max 20 characters
 */
export const appointmentConfirmationExample: SendInteractiveDto = {
  salon_id: '123e4567-e89b-12d3-a456-426614174000',
  to: '+1234567890',
  interactive: {
    type: InteractiveType.BUTTON,
    header: {
      type: 'text',
      text: 'Appointment Reminder',
    },
    body: {
      text: 'You have an appointment tomorrow at 10:00 AM for a haircut with Sarah. Would you like to confirm or reschedule?',
    },
    footer: {
      text: 'Powered by Salon Pro',
    },
    action: {
      buttons: [
        {
          type: 'reply',
          reply: {
            id: 'confirm_appointment',
            title: 'Confirm',
          },
        },
        {
          type: 'reply',
          reply: {
            id: 'reschedule_appointment',
            title: 'Reschedule',
          },
        },
        {
          type: 'reply',
          reply: {
            id: 'cancel_appointment',
            title: 'Cancel',
          },
        },
      ],
    },
  },
  conversation_id: '123e4567-e89b-12d3-a456-426614174001',
};

/**
 * Example 2: List Message - Time Slot Selection
 * Max 10 sections, each section can have max 10 rows
 */
export const timeSlotSelectionExample: SendInteractiveDto = {
  salon_id: '123e4567-e89b-12d3-a456-426614174000',
  to: '+1234567890',
  interactive: {
    type: InteractiveType.LIST,
    header: {
      type: 'text',
      text: 'Available Time Slots',
    },
    body: {
      text: 'Please select your preferred appointment time for tomorrow, December 15th.',
    },
    footer: {
      text: 'All times are in your local timezone',
    },
    action: {
      button: 'View Slots',
      sections: [
        {
          title: 'Morning Slots',
          rows: [
            {
              id: 'slot_9am',
              title: '9:00 AM',
              description: 'Available with Sarah',
            },
            {
              id: 'slot_10am',
              title: '10:00 AM',
              description: 'Available with Mike',
            },
            {
              id: 'slot_11am',
              title: '11:00 AM',
              description: 'Available with Sarah',
            },
          ],
        },
        {
          title: 'Afternoon Slots',
          rows: [
            {
              id: 'slot_1pm',
              title: '1:00 PM',
              description: 'Available with Mike',
            },
            {
              id: 'slot_2pm',
              title: '2:00 PM',
              description: 'Available with Sarah',
            },
            {
              id: 'slot_3pm',
              title: '3:00 PM',
              description: 'Available with Jessica',
            },
          ],
        },
        {
          title: 'Evening Slots',
          rows: [
            {
              id: 'slot_5pm',
              title: '5:00 PM',
              description: 'Available with Mike',
            },
            {
              id: 'slot_6pm',
              title: '6:00 PM',
              description: 'Available with Sarah',
            },
          ],
        },
      ],
    },
  },
  conversation_id: '123e4567-e89b-12d3-a456-426614174001',
};

/**
 * Example 3: Simple Reply Buttons - Quick Response
 * Minimal configuration without header and footer
 */
export const quickResponseExample: SendInteractiveDto = {
  salon_id: '123e4567-e89b-12d3-a456-426614174000',
  to: '+1234567890',
  interactive: {
    type: InteractiveType.BUTTON,
    body: {
      text: 'Would you like to book a haircut appointment?',
    },
    action: {
      buttons: [
        {
          type: 'reply',
          reply: {
            id: 'book_yes',
            title: 'Yes, Book Now',
          },
        },
        {
          type: 'reply',
          reply: {
            id: 'book_no',
            title: 'No, Thanks',
          },
        },
      ],
    },
  },
};

/**
 * Example 4: Service Selection List
 */
export const serviceSelectionExample: SendInteractiveDto = {
  salon_id: '123e4567-e89b-12d3-a456-426614174000',
  to: '+1234567890',
  interactive: {
    type: InteractiveType.LIST,
    body: {
      text: 'What service would you like to book?',
    },
    action: {
      button: 'Select Service',
      sections: [
        {
          rows: [
            {
              id: 'service_haircut',
              title: 'Haircut',
              description: '$45 - 45 minutes',
            },
            {
              id: 'service_color',
              title: 'Hair Coloring',
              description: '$120 - 2 hours',
            },
            {
              id: 'service_styling',
              title: 'Hair Styling',
              description: '$60 - 1 hour',
            },
            {
              id: 'service_treatment',
              title: 'Hair Treatment',
              description: '$80 - 1.5 hours',
            },
            {
              id: 'service_manicure',
              title: 'Manicure',
              description: '$35 - 45 minutes',
            },
            {
              id: 'service_pedicure',
              title: 'Pedicure',
              description: '$50 - 1 hour',
            },
          ],
        },
      ],
    },
  },
};

/**
 * Usage Example in a Service or Controller
 */
export const usageExample = `
import { Injectable } from '@nestjs/common';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { appointmentConfirmationExample } from '../whatsapp/examples/interactive-message-examples';

@Injectable()
export class AppointmentService {
  constructor(private readonly whatsappService: WhatsAppService) {}

  async sendAppointmentConfirmation(userId: string, phoneNumber: string, salonId: string) {
    // Customize the interactive message
    const interactiveMessage = {
      ...appointmentConfirmationExample,
      salon_id: salonId,
      to: phoneNumber,
    };

    // Send the message
    const result = await this.whatsappService.sendInteractiveMessage(
      userId, // or 'system' for AI bot
      interactiveMessage
    );

    console.log(\`Message sent: \${result.whatsapp_id}\`);
    console.log(\`Database record: \${result.message_id}\`);

    return result;
  }
}
`;

/**
 * WhatsApp Interactive Message Limits
 */
export const whatsappLimits = {
  replyButtons: {
    maxButtons: 3,
    maxTitleLength: 20,
    headerRequired: false,
    footerRequired: false,
  },
  listMessage: {
    maxSections: 10,
    maxRowsPerSection: 10,
    maxTotalRows: 10, // Note: Total across all sections
    maxTitleLength: 24,
    maxDescriptionLength: 72,
    buttonTextMaxLength: 20,
    headerRequired: false,
    footerRequired: false,
  },
  common: {
    bodyMaxLength: 1024,
    headerTextMaxLength: 60,
    footerTextMaxLength: 60,
  },
};
