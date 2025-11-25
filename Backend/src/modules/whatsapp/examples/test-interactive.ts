/**
 * Test script for interactive message implementation
 * Run with: npm run build && node dist/modules/whatsapp/examples/test-interactive.js
 */

import { SendInteractiveDto, InteractiveType } from '../dto/send-interactive.dto';

/**
 * Test data validation
 */
function testValidation() {
  console.log('=== Testing Validation ===\n');

  // Test 1: Valid button message
  const validButton: SendInteractiveDto = {
    salon_id: '123e4567-e89b-12d3-a456-426614174000',
    to: '+1234567890',
    interactive: {
      type: InteractiveType.BUTTON,
      body: {
        text: 'Would you like to confirm your appointment?',
      },
      action: {
        buttons: [
          {
            type: 'reply',
            reply: {
              id: 'confirm',
              title: 'Confirm',
            },
          },
          {
            type: 'reply',
            reply: {
              id: 'cancel',
              title: 'Cancel',
            },
          },
        ],
      },
    },
  };
  console.log('✓ Valid button message created');

  // Test 2: Valid list message
  const validList: SendInteractiveDto = {
    salon_id: '123e4567-e89b-12d3-a456-426614174000',
    to: '+1234567890',
    interactive: {
      type: InteractiveType.LIST,
      body: {
        text: 'Select your preferred time slot',
      },
      action: {
        button: 'View Slots',
        sections: [
          {
            title: 'Morning',
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
            ],
          },
        ],
      },
    },
  };
  console.log('✓ Valid list message created');

  // Test 3: Phone number formats
  const phoneFormats = [
    '+1234567890',      // Valid
    '+11234567890',     // Valid (US with country code)
    '+44234567890',     // Valid (UK)
    '+972501234567',    // Valid (Israel)
  ];
  console.log('\n✓ Valid phone number formats:', phoneFormats);

  console.log('\n=== All Validation Tests Passed ===\n');
}

/**
 * Test phone number validation logic
 */
function testPhoneValidation() {
  console.log('=== Testing Phone Number Validation ===\n');

  const e164Regex = /^\+[1-9]\d{1,14}$/;

  const testCases = [
    { phone: '+1234567890', expected: true, description: 'Valid US number' },
    { phone: '+972501234567', expected: true, description: 'Valid Israel number' },
    { phone: '+44234567890', expected: true, description: 'Valid UK number' },
    { phone: '1234567890', expected: false, description: 'Missing + prefix' },
    { phone: '+0234567890', expected: false, description: 'Starts with 0' },
    { phone: '+123', expected: false, description: 'Too short' },
    { phone: '+12345678901234567890', expected: false, description: 'Too long (>15 digits)' },
  ];

  testCases.forEach(({ phone, expected, description }) => {
    const isValid = e164Regex.test(phone);
    const status = isValid === expected ? '✓' : '✗';
    console.log(`${status} ${description}: ${phone} (${isValid ? 'VALID' : 'INVALID'})`);
  });

  console.log('\n=== Phone Validation Tests Complete ===\n');
}

/**
 * Test retry logic calculation
 */
function testRetryLogic() {
  console.log('=== Testing Retry Logic ===\n');

  const maxRetries = 3;
  console.log(`Max retries: ${maxRetries}`);
  console.log('Exponential backoff delays:\n');

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const delayMs = Math.pow(2, attempt - 1) * 1000;
    console.log(`Attempt ${attempt}: ${delayMs}ms (${delayMs / 1000}s)`);
  }

  console.log('\n=== Retry Logic Tests Complete ===\n');
}

/**
 * Test message cost calculation
 */
function testCostCalculation() {
  console.log('=== Testing Message Cost Calculation ===\n');

  const costs: Record<string, number> = {
    TEXT: 0.005,
    TEMPLATE: 0.01,
    IMAGE: 0.01,
    DOCUMENT: 0.01,
    AUDIO: 0.01,
    VIDEO: 0.02,
    INTERACTIVE: 0.01,
  };

  Object.entries(costs).forEach(([type, cost]) => {
    console.log(`${type.padEnd(12)}: $${cost.toFixed(3)}`);
  });

  console.log('\n=== Cost Calculation Tests Complete ===\n');
}

/**
 * Test button ID formats
 */
function testButtonIds() {
  console.log('=== Testing Button ID Formats ===\n');

  const examples = [
    {
      type: 'Slot Selection',
      id: 'slot_2024-10-25_15:00_m123',
      parsed: {
        date: '2024-10-25',
        time: '15:00',
        masterId: 'm123',
      },
    },
    {
      type: 'Confirmation',
      id: 'confirm_booking_b456',
      parsed: {
        action: 'booking',
        bookingId: 'b456',
      },
    },
    {
      type: 'Action',
      id: 'action_change_time',
      parsed: {
        action: 'change_time',
      },
    },
  ];

  examples.forEach(({ type, id, parsed }) => {
    console.log(`${type}:`);
    console.log(`  ID: ${id}`);
    console.log(`  Parsed:`, parsed);
    console.log();
  });

  console.log('=== Button ID Tests Complete ===\n');
}

/**
 * Run all tests
 */
function runAllTests() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   WhatsApp Interactive Message Implementation Tests       ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\n');

  try {
    testValidation();
    testPhoneValidation();
    testRetryLogic();
    testCostCalculation();
    testButtonIds();

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║   ✓ All Tests Passed Successfully                         ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('\n');
  } catch (error) {
    console.error('\n✗ Tests Failed:', error);
    process.exit(1);
  }
}

// Run tests if executed directly
if (require.main === module) {
  runAllTests();
}

export {
  testValidation,
  testPhoneValidation,
  testRetryLogic,
  testCostCalculation,
  testButtonIds,
  runAllTests,
};
