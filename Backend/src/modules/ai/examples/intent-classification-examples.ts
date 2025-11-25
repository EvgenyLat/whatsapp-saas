/**
 * AI Intent Classification Service - Usage Examples
 *
 * This file demonstrates various use cases for the AIIntentService
 * across different languages and scenarios.
 */

import { AIIntentService } from '../services/ai-intent.service';
import { IntentType, ConfidenceLevel } from '../types/intent.types';

/**
 * Example 1: Basic Booking Intent Detection
 */
async function basicBookingExample(service: AIIntentService): Promise<void> {
  console.log('=== Example 1: Basic Booking Intent Detection ===\n');

  const messages = [
    'I want to book an appointment for tomorrow at 3pm',
    'Can I schedule for next Monday?',
    'Book me in for a haircut',
    'Need to reserve a slot',
  ];

  for (const message of messages) {
    const result = await service.classifyIntent(message, 'en');
    console.log(`Message: "${message}"`);
    console.log(`Intent: ${result.intent}`);
    console.log(`Confidence: ${result.confidence.toFixed(2)} (${result.confidenceLevel})`);
    console.log(`Reliable: ${result.isReliable}`);
    console.log('---\n');
  }
}

/**
 * Example 2: Multi-Language Intent Detection
 */
async function multiLanguageExample(service: AIIntentService): Promise<void> {
  console.log('=== Example 2: Multi-Language Intent Detection ===\n');

  const messages = [
    { text: 'I want to book tomorrow at 3pm', lang: 'en', name: 'English' },
    { text: 'Хочу записаться на завтра в 15:00', lang: 'ru', name: 'Russian' },
    { text: 'Quiero reservar mañana a las 3pm', lang: 'es', name: 'Spanish' },
    { text: 'Preciso agendar amanhã às 15h', lang: 'pt', name: 'Portuguese' },
    { text: 'רוצה לקבוע תור למחר ב 3', lang: 'he', name: 'Hebrew' },
  ];

  for (const { text, lang, name } of messages) {
    const result = await service.classifyIntent(text, lang);
    console.log(`Language: ${name} (${lang})`);
    console.log(`Message: "${text}"`);
    console.log(`Intent: ${result.intent}`);
    console.log(`Confidence: ${result.confidence.toFixed(2)}`);
    console.log('---\n');
  }
}

/**
 * Example 3: Entity Extraction
 */
async function entityExtractionExample(service: AIIntentService): Promise<void> {
  console.log('=== Example 3: Entity Extraction ===\n');

  const result = await service.classifyIntent(
    'I want to book tomorrow at 3pm or 4:30pm for a haircut. My email is john@example.com and my booking ID was 12345',
    'en',
  );

  console.log(`Message: "${result.originalText}"`);
  console.log(`Intent: ${result.intent}`);
  console.log(`\nExtracted Entities:`);
  console.log(`- Time References: ${JSON.stringify(result.entities.timeReferences)}`);
  console.log(`- Date References: ${JSON.stringify(result.entities.dateReferences)}`);
  console.log(`- Numbers: ${JSON.stringify(result.entities.numbers)}`);
  console.log(`- Emails: ${JSON.stringify(result.entities.emails)}`);
  console.log('---\n');
}

/**
 * Example 4: Alternative Intent Analysis
 */
async function alternativeIntentsExample(service: AIIntentService): Promise<void> {
  console.log('=== Example 4: Alternative Intent Analysis ===\n');

  const result = await service.classifyIntent(
    'Are you available tomorrow? I need to book something',
    'en',
  );

  console.log(`Message: "${result.originalText}"`);
  console.log(`Primary Intent: ${result.intent} (${result.confidence.toFixed(2)})`);
  console.log(`\nAlternative Intents:`);

  result.alternativeIntents.forEach((alt, index) => {
    console.log(`${index + 1}. ${alt.intent}: ${alt.confidence.toFixed(2)}`);
  });
  console.log('---\n');
}

/**
 * Example 5: Booking Cancellation and Modification
 */
async function bookingChangesExample(service: AIIntentService): Promise<void> {
  console.log('=== Example 5: Booking Changes ===\n');

  const messages = [
    'I need to cancel my booking',
    'Can I reschedule my appointment?',
    'Change my booking to next week',
    'Move my appointment to Friday',
  ];

  for (const message of messages) {
    const result = await service.classifyIntent(message, 'en');
    console.log(`Message: "${message}"`);
    console.log(`Intent: ${result.intent}`);
    console.log(`Confidence: ${result.confidence.toFixed(2)}`);
    console.log('---\n');
  }
}

/**
 * Example 6: Various Inquiry Types
 */
async function inquiryTypesExample(service: AIIntentService): Promise<void> {
  console.log('=== Example 6: Various Inquiry Types ===\n');

  const messages = [
    { text: 'What times are available?', expectedIntent: IntentType.AVAILABILITY_INQUIRY },
    { text: 'What services do you offer?', expectedIntent: IntentType.SERVICE_INQUIRY },
    { text: 'How much does it cost?', expectedIntent: IntentType.PRICE_INQUIRY },
    { text: 'Where are you located?', expectedIntent: IntentType.LOCATION_INQUIRY },
  ];

  for (const { text, expectedIntent } of messages) {
    const result = await service.classifyIntent(text, 'en');
    const match = result.intent === expectedIntent ? '✓' : '✗';
    console.log(`${match} Message: "${text}"`);
    console.log(`  Intent: ${result.intent} (expected: ${expectedIntent})`);
    console.log(`  Confidence: ${result.confidence.toFixed(2)}`);
    console.log('---\n');
  }
}

/**
 * Example 7: Simple Conversational Intents
 */
async function conversationalIntentsExample(
  service: AIIntentService,
): Promise<void> {
  console.log('=== Example 7: Conversational Intents ===\n');

  const messages = [
    { text: 'Hello!', expectedIntent: IntentType.GREETING },
    { text: 'Thank you so much!', expectedIntent: IntentType.THANKS },
    { text: 'Yes, that works', expectedIntent: IntentType.CONFIRMATION },
    { text: 'No thanks', expectedIntent: IntentType.NEGATION },
    { text: 'I need help', expectedIntent: IntentType.HELP_REQUEST },
  ];

  for (const { text, expectedIntent } of messages) {
    const result = await service.classifyIntent(text, 'en');
    const match = result.intent === expectedIntent ? '✓' : '✗';
    console.log(`${match} Message: "${text}"`);
    console.log(`  Intent: ${result.intent}`);
    console.log(`  Confidence: ${result.confidence.toFixed(2)}`);
    console.log('---\n');
  }
}

/**
 * Example 8: Confidence Level Analysis
 */
async function confidenceLevelExample(service: AIIntentService): Promise<void> {
  console.log('=== Example 8: Confidence Level Analysis ===\n');

  const messages = [
    'I want to book an appointment tomorrow at 3pm for a haircut', // Very high confidence
    'book tomorrow', // High confidence
    'maybe schedule something', // Medium confidence
    'what about later?', // Low confidence
    'xyz abc', // Very low confidence
  ];

  for (const message of messages) {
    const result = await service.classifyIntent(message, 'en');
    console.log(`Message: "${message}"`);
    console.log(`Intent: ${result.intent}`);
    console.log(`Confidence: ${result.confidence.toFixed(2)}`);
    console.log(`Level: ${result.confidenceLevel}`);
    console.log(`Reliable: ${result.isReliable ? 'Yes' : 'No'}`);
    console.log('---\n');
  }
}

/**
 * Example 9: Real-World WhatsApp Conversation Simulation
 */
async function whatsappConversationExample(
  service: AIIntentService,
): Promise<void> {
  console.log('=== Example 9: WhatsApp Conversation Simulation ===\n');

  const conversation = [
    { user: 'Customer', message: 'Hi!', lang: 'en' },
    { user: 'Bot', message: 'Hello! How can I help you today?', lang: 'en' },
    { user: 'Customer', message: 'What services do you offer?', lang: 'en' },
    { user: 'Bot', message: 'We offer haircuts, coloring, styling...', lang: 'en' },
    { user: 'Customer', message: 'How much is a haircut?', lang: 'en' },
    { user: 'Bot', message: 'A standard haircut is $50', lang: 'en' },
    {
      user: 'Customer',
      message: 'I want to book tomorrow at 3pm',
      lang: 'en',
    },
    { user: 'Bot', message: 'Let me check availability...', lang: 'en' },
  ];

  for (const turn of conversation) {
    if (turn.user === 'Customer') {
      const result = await service.classifyIntent(turn.message, turn.lang);
      console.log(`👤 Customer: "${turn.message}"`);
      console.log(
        `   🤖 Detected Intent: ${result.intent} (confidence: ${result.confidence.toFixed(2)})`,
      );
    } else {
      console.log(`🤖 Bot: "${turn.message}"`);
    }
    console.log();
  }
}

/**
 * Example 10: Error Handling and Edge Cases
 */
async function errorHandlingExample(service: AIIntentService): Promise<void> {
  console.log('=== Example 10: Error Handling and Edge Cases ===\n');

  const testCases = [
    { text: '', description: 'Empty string' },
    { text: '   ', description: 'Whitespace only' },
    { text: '😀😃😄', description: 'Only emojis' },
    { text: '123 456 789', description: 'Only numbers' },
    {
      text: 'asdfghjkl qwertyuiop',
      description: 'Random characters',
    },
  ];

  for (const { text, description } of testCases) {
    const result = await service.classifyIntent(text || ' ', 'en');
    console.log(`Test: ${description}`);
    console.log(`Input: "${text}"`);
    console.log(`Intent: ${result.intent}`);
    console.log(`Confidence: ${result.confidence.toFixed(2)}`);
    console.log(`Reliable: ${result.isReliable}`);
    console.log('---\n');
  }
}

/**
 * Example 11: Performance Metrics
 */
async function performanceMetricsExample(
  service: AIIntentService,
): Promise<void> {
  console.log('=== Example 11: Performance Metrics ===\n');

  const messages = Array(100).fill('I want to book tomorrow at 3pm');

  const startTime = Date.now();

  for (const message of messages) {
    await service.classifyIntent(message, 'en');
  }

  const endTime = Date.now();
  const totalTime = endTime - startTime;
  const avgTime = totalTime / messages.length;

  console.log(`Total classifications: ${messages.length}`);
  console.log(`Total time: ${totalTime}ms`);
  console.log(`Average time per classification: ${avgTime.toFixed(2)}ms`);
  console.log('---\n');
}

/**
 * Example 12: Integration Example (Controller/Service Usage)
 */
async function integrationExample(service: AIIntentService): Promise<void> {
  console.log('=== Example 12: Integration Example ===\n');

  // Simulate a WhatsApp webhook message
  const incomingMessage = {
    from: '+1234567890',
    text: 'I want to book tomorrow at 3pm',
    timestamp: Date.now(),
  };

  console.log('Incoming WhatsApp Message:');
  console.log(JSON.stringify(incomingMessage, null, 2));
  console.log();

  // Classify intent
  const result = await service.classifyIntent(incomingMessage.text, 'en');

  console.log('Intent Classification Result:');
  console.log(JSON.stringify(result, null, 2));
  console.log();

  // Route based on intent
  if (result.isReliable) {
    switch (result.intent) {
      case IntentType.BOOKING_REQUEST:
        console.log('→ Route to booking flow');
        console.log(`→ Extracted times: ${result.entities.timeReferences?.join(', ')}`);
        console.log(`→ Extracted dates: ${result.entities.dateReferences?.join(', ')}`);
        break;
      case IntentType.AVAILABILITY_INQUIRY:
        console.log('→ Route to availability checker');
        break;
      case IntentType.PRICE_INQUIRY:
        console.log('→ Route to pricing service');
        break;
      default:
        console.log('→ Route to general conversation handler');
    }
  } else {
    console.log('→ Low confidence, ask for clarification');
  }
}

/**
 * Run all examples
 */
export async function runAllExamples(): Promise<void> {
  const service = new AIIntentService();

  console.log('\n🚀 AI Intent Classification Service - Examples\n');
  console.log('='.repeat(60));
  console.log('\n');

  await basicBookingExample(service);
  await multiLanguageExample(service);
  await entityExtractionExample(service);
  await alternativeIntentsExample(service);
  await bookingChangesExample(service);
  await inquiryTypesExample(service);
  await conversationalIntentsExample(service);
  await confidenceLevelExample(service);
  await whatsappConversationExample(service);
  await errorHandlingExample(service);
  await performanceMetricsExample(service);
  await integrationExample(service);

  console.log('='.repeat(60));
  console.log('\n✅ All examples completed!\n');
}

/**
 * Run examples if this file is executed directly
 */
if (require.main === module) {
  runAllExamples().catch(console.error);
}
