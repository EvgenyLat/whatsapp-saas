/**
 * T023: OpenAI Mock for Integration Tests
 *
 * This module provides a comprehensive mock of the OpenAI client for testing
 * AI-powered intent parsing without making actual API calls.
 *
 * Features:
 * - Mock OpenAI client with chat.completions.create()
 * - Predefined BookingIntent responses for common test inputs
 * - Deterministic parsing logic for test scenarios
 * - Configurable success/failure modes
 * - Pattern matching for service names and time expressions
 *
 * Usage:
 * ```typescript
 * import { createMockOpenAI, getMockOpenAIProvider } from './mocks/openai.mock';
 *
 * // In test setup
 * const moduleFixture = await Test.createTestingModule({
 *   imports: [AppModule],
 * })
 *   .overrideProvider('OpenAI')
 *   .useValue(createMockOpenAI())
 *   .compile();
 *
 * // Or use provider helper
 * .overrideProvider(IntentParserService)
 * .useValue(getMockOpenAIProvider())
 * ```
 */

import { BookingIntent } from '../../src/modules/ai/services/intent-parser.service';

/**
 * Mock OpenAI Chat Completion Response
 */
interface MockChatCompletion {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Test Intent Patterns
 *
 * Maps common test inputs to expected BookingIntent outputs
 */
const TEST_INTENT_PATTERNS: Array<{
  pattern: RegExp;
  intent: Partial<BookingIntent>;
}> = [
  // Haircut patterns
  {
    pattern: /haircut.*friday.*3\s*pm/i,
    intent: {
      serviceName: 'Haircut',
      preferredDate: '2025-10-31', // Next Friday from 2025-10-25
      preferredTime: '15:00',
      preferredDayOfWeek: 'friday',
      preferredTimeOfDay: 'afternoon',
      language: 'en',
      isFlexible: false,
    },
  },
  {
    pattern: /haircut.*friday/i,
    intent: {
      serviceName: 'Haircut',
      preferredDate: '2025-10-31',
      preferredDayOfWeek: 'friday',
      language: 'en',
      isFlexible: false,
    },
  },
  // Manicure patterns
  {
    pattern: /manicure.*tomorrow.*2\s*pm/i,
    intent: {
      serviceName: 'Manicure',
      preferredDate: '2025-10-26', // Tomorrow from 2025-10-25
      preferredTime: '14:00',
      language: 'en',
      isFlexible: false,
    },
  },
  {
    pattern: /manicure.*tomorrow/i,
    intent: {
      serviceName: 'Manicure',
      preferredDate: '2025-10-26',
      language: 'en',
      isFlexible: false,
    },
  },
  // Facial patterns
  {
    pattern: /facial.*next\s+monday.*morning/i,
    intent: {
      serviceName: 'Facial',
      preferredDate: '2025-10-27', // Next Monday from 2025-10-25
      preferredDayOfWeek: 'monday',
      preferredTimeOfDay: 'morning',
      language: 'en',
      isFlexible: false,
    },
  },
  {
    pattern: /facial.*monday/i,
    intent: {
      serviceName: 'Facial',
      preferredDate: '2025-10-27',
      preferredDayOfWeek: 'monday',
      language: 'en',
      isFlexible: false,
    },
  },
  // Generic patterns
  {
    pattern: /haircut/i,
    intent: {
      serviceName: 'Haircut',
      language: 'en',
      isFlexible: true,
    },
  },
  {
    pattern: /manicure/i,
    intent: {
      serviceName: 'Manicure',
      language: 'en',
      isFlexible: true,
    },
  },
  {
    pattern: /facial/i,
    intent: {
      serviceName: 'Facial',
      language: 'en',
      isFlexible: true,
    },
  },
  {
    pattern: /coloring/i,
    intent: {
      serviceName: 'Coloring',
      language: 'en',
      isFlexible: true,
    },
  },
  {
    pattern: /massage/i,
    intent: {
      serviceName: 'Massage',
      language: 'en',
      isFlexible: true,
    },
  },
];

/**
 * Parse test intent from user message
 *
 * Matches user message against predefined patterns and returns
 * the corresponding BookingIntent
 *
 * @param userMessage - Customer's booking request text
 * @returns BookingIntent with extracted information
 *
 * @example
 * ```typescript
 * parseTestIntent("Haircut Friday 3pm");
 * // Returns: {
 * //   serviceName: "Haircut",
 * //   preferredDate: "2025-10-31",
 * //   preferredTime: "15:00",
 * //   language: "en"
 * // }
 * ```
 */
export function parseTestIntent(userMessage: string): BookingIntent {
  const normalizedMessage = userMessage.toLowerCase().trim();

  // Try to match against patterns
  for (const { pattern, intent } of TEST_INTENT_PATTERNS) {
    if (pattern.test(normalizedMessage)) {
      return {
        serviceName: intent.serviceName,
        preferredDate: intent.preferredDate,
        preferredTime: intent.preferredTime,
        preferredDayOfWeek: intent.preferredDayOfWeek,
        preferredTimeOfDay: intent.preferredTimeOfDay,
        language: intent.language || 'en',
        isFlexible: intent.isFlexible ?? false,
      } as BookingIntent;
    }
  }

  // Fallback: extract service if mentioned
  const services = ['haircut', 'manicure', 'facial', 'coloring', 'massage', 'pedicure'];
  const mentionedService = services.find((service) => normalizedMessage.includes(service));

  if (mentionedService) {
    return {
      serviceName: mentionedService.charAt(0).toUpperCase() + mentionedService.slice(1),
      language: 'en',
      isFlexible: true,
    };
  }

  // Default fallback: vague request
  return {
    language: 'en',
    isFlexible: true,
  };
}

/**
 * Mock OpenAI Client
 *
 * Simulates OpenAI API behavior for testing without external calls
 */
export class MockOpenAI {
  private shouldFail: boolean = false;
  private failureError: Error | null = null;
  private callCount: number = 0;
  private callHistory: Array<{ messages: any[]; response: BookingIntent }> = [];

  /**
   * Chat completions API mock
   */
  public chat = {
    completions: {
      /**
       * Mock create method
       *
       * Parses user message and returns structured BookingIntent as JSON
       *
       * @param params - OpenAI API parameters
       * @returns Mock chat completion with BookingIntent JSON
       */
      create: jest.fn().mockImplementation(async (params: any): Promise<MockChatCompletion> => {
        this.callCount++;

        // Simulate failure if configured
        if (this.shouldFail) {
          throw this.failureError || new Error('OpenAI API mock failure');
        }

        // Extract user message
        const messages = params.messages || [];
        const userMessage = messages.find((m: any) => m.role === 'user')?.content || '';

        // Parse intent from user message
        const intent = parseTestIntent(userMessage);

        // Store in history
        this.callHistory.push({
          messages,
          response: intent,
        });

        // Build mock response
        const completion: MockChatCompletion = {
          id: `chatcmpl-mock-${this.callCount}`,
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model: params.model || 'gpt-3.5-turbo',
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: JSON.stringify(intent),
              },
              finish_reason: 'stop',
            },
          ],
          usage: {
            prompt_tokens: 150,
            completion_tokens: 50,
            total_tokens: 200,
          },
        };

        return completion;
      }),
    },
  };

  /**
   * Configure mock to succeed
   */
  public succeed(): void {
    this.shouldFail = false;
    this.failureError = null;
  }

  /**
   * Configure mock to fail
   *
   * @param error - Error to throw (default: generic error)
   */
  public fail(error?: Error): void {
    this.shouldFail = true;
    this.failureError = error || new Error('OpenAI API mock failure');
  }

  /**
   * Get number of API calls made
   */
  public getCallCount(): number {
    return this.callCount;
  }

  /**
   * Get call history
   */
  public getCallHistory(): Array<{ messages: any[]; response: BookingIntent }> {
    return this.callHistory;
  }

  /**
   * Reset mock state
   */
  public reset(): void {
    this.callCount = 0;
    this.callHistory = [];
    this.shouldFail = false;
    this.failureError = null;
    (this.chat.completions.create as jest.Mock).mockClear();
  }

  /**
   * Get last call arguments
   */
  public getLastCall(): any {
    const mock = this.chat.completions.create as jest.Mock;
    return mock.mock.calls[mock.mock.calls.length - 1]?.[0];
  }
}

/**
 * Create a fresh mock OpenAI instance
 *
 * @returns Mock OpenAI client
 *
 * @example
 * ```typescript
 * const mockOpenAI = createMockOpenAI();
 * const result = await mockOpenAI.chat.completions.create({
 *   model: 'gpt-3.5-turbo',
 *   messages: [
 *     { role: 'user', content: 'Haircut Friday 3pm' }
 *   ]
 * });
 * ```
 */
export function createMockOpenAI(): MockOpenAI {
  return new MockOpenAI();
}

/**
 * Create mock OpenAI provider for NestJS dependency injection
 *
 * @returns Provider configuration object
 *
 * @example
 * ```typescript
 * const moduleFixture = await Test.createTestingModule({
 *   imports: [AppModule],
 * })
 *   .overrideProvider('OpenAI')
 *   .useFactory(getMockOpenAIProvider())
 *   .compile();
 * ```
 */
export function getMockOpenAIProvider() {
  return {
    provide: 'OpenAI',
    useFactory: () => createMockOpenAI(),
  };
}

/**
 * Create mock IntentParserService for testing
 *
 * Provides a simplified mock that directly uses parseTestIntent
 * without needing to override OpenAI client
 *
 * @returns Mock IntentParserService
 *
 * @example
 * ```typescript
 * const mockIntentParser = createMockIntentParser();
 * const intent = await mockIntentParser.parseIntent("Haircut Friday 3pm", "salon_123");
 * ```
 */
export function createMockIntentParser() {
  return {
    parseIntent: jest.fn().mockImplementation(async (text: string, salonId: string) => {
      return parseTestIntent(text);
    }),
    detectLanguage: jest.fn().mockImplementation(async (text: string) => {
      // Simple language detection
      if (/[\u0400-\u04FF]/.test(text)) return 'ru';
      if (/[\u0590-\u05FF]/.test(text)) return 'he';
      if (/[áéíóúüñ]/.test(text)) return 'es';
      if (/[ãõç]/.test(text)) return 'pt';
      return 'en';
    }),
    isIntentComplete: jest.fn().mockImplementation((intent: BookingIntent) => {
      return !!(intent.serviceName || intent.serviceId);
    }),
    getMissingFields: jest.fn().mockImplementation((intent: BookingIntent) => {
      const missing: string[] = [];
      if (!intent.serviceName && !intent.serviceId) missing.push('service');
      if (!intent.preferredDate && !intent.preferredDayOfWeek) missing.push('date');
      if (!intent.preferredTime && !intent.preferredTimeOfDay) missing.push('time');
      return missing;
    }),
  };
}

/**
 * Test Utilities
 */

/**
 * Validate mock OpenAI response structure
 *
 * @param response - Response from mock OpenAI
 * @returns True if response is valid
 */
export function validateMockResponse(response: any): boolean {
  if (!response) return false;
  if (!response.choices || !Array.isArray(response.choices)) return false;
  if (response.choices.length === 0) return false;
  if (!response.choices[0].message) return false;
  if (!response.choices[0].message.content) return false;

  try {
    const intent = JSON.parse(response.choices[0].message.content);
    return typeof intent === 'object';
  } catch {
    return false;
  }
}

/**
 * Extract BookingIntent from mock response
 *
 * @param response - Response from mock OpenAI
 * @returns Parsed BookingIntent
 */
export function extractIntentFromMockResponse(response: MockChatCompletion): BookingIntent {
  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No content in mock response');
  }
  return JSON.parse(content);
}

// Export types
export type { MockChatCompletion };
