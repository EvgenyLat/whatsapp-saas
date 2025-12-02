import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAI } from 'openai';

/**
 * Booking Intent Interface
 *
 * Structured representation of customer's booking request
 *
 * @see specs/001-whatsapp-quick-booking/contracts/services/all-services.interface.ts
 */
export interface BookingIntent {
  /** Service ID (resolved after matching) */
  serviceId?: string;
  /** Service name extracted from text */
  serviceName?: string;
  /** Master ID (resolved after matching) */
  masterId?: string;
  /** Master name extracted from text */
  masterName?: string;
  /** Preferred date in ISO format: YYYY-MM-DD */
  preferredDate?: string;
  /** Preferred time in 24h format: HH:mm */
  preferredTime?: string;
  /** Day of week: monday, tuesday, etc. */
  preferredDayOfWeek?: string;
  /** Time of day: morning, afternoon, evening */
  preferredTimeOfDay?: string;
  /** Whether customer is flexible with date/time */
  isFlexible?: boolean;
  /** Detected language: en, ru, es, pt, he */
  language?: string;
}

/**
 * Salon Context for AI Prompting
 *
 * Available services and masters for the salon
 */
export interface SalonContext {
  /** Array of service names with details */
  services: string[];
  /** Array of master names */
  masters: string[];
}

/**
 * OpenAI Raw Response
 *
 * Expected JSON structure from GPT-3.5-turbo
 */
interface OpenAIIntentResponse {
  serviceName?: string;
  preferredDate?: string;
  preferredTime?: string;
  preferredDayOfWeek?: string;
  preferredTimeOfDay?: string;
  masterName?: string;
  isFlexible?: boolean;
  language?: string;
}

/**
 * Intent Parser Service
 *
 * Parses natural language booking requests into structured intents using OpenAI GPT-3.5-turbo
 *
 * Purpose:
 * - Extract booking details from customer messages like "Haircut Friday 3pm"
 * - Detect language automatically
 * - Convert relative dates to ISO format
 * - Match service/master names to salon context
 *
 * Performance Target: <2 seconds for API call
 *
 * @see specs/001-whatsapp-quick-booking/contracts/services/all-services.interface.ts
 * @see spec.md FR-005 AI Intent Parsing
 *
 * @example
 * ```typescript
 * const intent = await intentParser.parseIntent(
 *   "Haircut Friday 3pm with Sarah",
 *   "salon_123"
 * );
 * // Returns: {
 * //   serviceName: "Haircut",
 * //   preferredDate: "2024-10-25",
 * //   preferredTime: "15:00",
 * //   masterName: "Sarah",
 * //   language: "en"
 * // }
 * ```
 */
@Injectable()
export class IntentParserService {
  private readonly logger = new Logger(IntentParserService.name);
  private readonly openai: OpenAI;
  private readonly model = 'gpt-3.5-turbo';
  private readonly temperature = 0.3; // Low for consistency
  private readonly timeout = 5000; // 5 seconds

  /**
   * Supported languages
   */
  private readonly SUPPORTED_LANGUAGES = ['en', 'ru', 'es', 'pt', 'he'];

  /**
   * Retry configuration for exponential backoff
   */
  private readonly MAX_RETRIES = 3;
  private readonly INITIAL_RETRY_DELAY = 1000; // 1 second
  private readonly RETRY_MULTIPLIER = 2; // Exponential backoff: 1s, 2s, 4s

  /**
   * Day of week mappings for relative date parsing
   */
  private readonly DAYS_OF_WEEK = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ];

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      this.logger.warn('OPENAI_API_KEY not configured - intent parsing will fail');
    }
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * Parse customer booking request into structured intent
   *
   * Flow:
   * 1. Validate input text
   * 2. Detect language from text
   * 3. Build system prompt with salon context
   * 4. Call OpenAI GPT-3.5-turbo
   * 5. Parse and validate response
   * 6. Return structured intent
   *
   * @param text - Customer's message text
   * @param salonId - Salon ID for context (future: fetch services/masters)
   * @returns Structured booking intent
   *
   * @throws BadRequestException if text is empty
   * @throws InternalServerErrorException if OpenAI API fails
   *
   * @performance <2 seconds target
   *
   * @example
   * ```typescript
   * const intent = await parseIntent("Haircut tomorrow at 3pm", "salon_123");
   * // Returns: {
   * //   serviceName: "Haircut",
   * //   preferredDate: "2024-10-26",
   * //   preferredTime: "15:00",
   * //   language: "en"
   * // }
   * ```
   */
  async parseIntent(text: string, _salonId: string): Promise<BookingIntent> {
    const startTime = Date.now();

    // Validate input
    if (!text || text.trim().length === 0) {
      throw new BadRequestException('Text cannot be empty');
    }

    try {
      // 1. Detect language
      const language = await this.detectLanguage(text);

      // 2. Build salon context (future: fetch from database)
      const salonContext: SalonContext = {
        services: [
          'Haircut ($50, 60min)',
          'Coloring ($120, 90min)',
          'Manicure ($40, 45min)',
          'Pedicure ($50, 60min)',
          'Massage ($80, 60min)',
        ],
        masters: ['Sarah Johnson', 'Alex Smith', 'Maria Garcia', 'John Doe'],
      };

      // 3. Build system prompt
      const systemPrompt = this.buildSystemPrompt(salonContext);

      // 4. Call OpenAI API with exponential backoff retry
      const completion = await this.callOpenAIWithRetry(systemPrompt, text);

      // 5. Parse response
      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        throw new InternalServerErrorException('OpenAI returned empty response');
      }

      const parsedResponse: OpenAIIntentResponse = JSON.parse(responseContent);

      // 6. Build structured intent
      const intent: BookingIntent = {
        serviceName: parsedResponse.serviceName,
        masterName: parsedResponse.masterName,
        preferredDate: parsedResponse.preferredDate,
        preferredTime: parsedResponse.preferredTime,
        preferredDayOfWeek: parsedResponse.preferredDayOfWeek?.toLowerCase(),
        preferredTimeOfDay: parsedResponse.preferredTimeOfDay?.toLowerCase(),
        isFlexible: parsedResponse.isFlexible ?? true,
        language: parsedResponse.language || language,
      };

      const duration = Date.now() - startTime;
      this.logger.log(
        `Intent parsed successfully in ${duration}ms: ${JSON.stringify(this.sanitizeForLogging(intent))}`,
      );

      return intent;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Intent parsing failed after ${duration}ms: ${error.message}`, error.stack);

      // Handle timeout
      if (error.name === 'TimeoutError') {
        throw new InternalServerErrorException('Intent parsing timed out after 5 seconds');
      }

      // Handle JSON parse errors
      if (error instanceof SyntaxError) {
        throw new InternalServerErrorException('Failed to parse OpenAI response as JSON');
      }

      // Handle OpenAI API errors
      if (error.status) {
        throw new InternalServerErrorException(
          `OpenAI API error (${error.status}): ${error.message}`,
        );
      }

      throw new InternalServerErrorException(`Intent parsing failed: ${error.message}`);
    }
  }

  /**
   * Call OpenAI API with exponential backoff retry
   *
   * Implements retry logic for transient failures:
   * - Attempt 1: Immediate
   * - Attempt 2: Wait 1 second
   * - Attempt 3: Wait 2 seconds
   * - Attempt 4: Wait 4 seconds
   *
   * Retries on:
   * - Rate limit errors (429)
   * - Server errors (500, 502, 503, 504)
   * - Timeout errors
   * - Network errors
   *
   * Does NOT retry on:
   * - Invalid API key (401)
   * - Bad request (400)
   * - Other client errors (4xx)
   *
   * @param systemPrompt - System prompt for OpenAI
   * @param userText - User message text
   * @returns OpenAI completion response
   *
   * @throws InternalServerErrorException if all retries fail
   *
   * @example
   * ```typescript
   * const completion = await callOpenAIWithRetry(systemPrompt, "Haircut Friday 3pm");
   * ```
   */
  private async callOpenAIWithRetry(
    systemPrompt: string,
    userText: string,
  ): Promise<OpenAI.Chat.Completions.ChatCompletion> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        // Calculate delay for exponential backoff
        if (attempt > 0) {
          const delay = this.INITIAL_RETRY_DELAY * Math.pow(this.RETRY_MULTIPLIER, attempt - 1);
          this.logger.warn(
            `OpenAI API retry attempt ${attempt + 1}/${this.MAX_RETRIES} after ${delay}ms delay`,
          );
          await this.sleep(delay);
        }

        // Make API call with timeout
        const completion = (await Promise.race([
          this.openai.chat.completions.create({
            model: this.model,
            messages: [
              {
                role: 'system',
                content: systemPrompt,
              },
              {
                role: 'user',
                content: userText,
              },
            ],
            temperature: this.temperature,
            max_tokens: 300,
            response_format: { type: 'json_object' },
          }),
          this.createTimeout(),
        ])) as OpenAI.Chat.Completions.ChatCompletion;

        // Success - log if retried
        if (attempt > 0) {
          this.logger.log(`OpenAI API succeeded on attempt ${attempt + 1}/${this.MAX_RETRIES}`);
        }

        return completion;
      } catch (error: any) {
        lastError = error;

        // Determine if error is retryable
        const isRetryable = this.isRetryableError(error);
        const isLastAttempt = attempt === this.MAX_RETRIES - 1;

        if (!isRetryable || isLastAttempt) {
          // Don't retry - throw immediately
          this.logger.error(
            `OpenAI API failed on attempt ${attempt + 1}/${this.MAX_RETRIES}: ${error.message}`,
            error.stack,
          );
          throw error;
        }

        // Log and retry
        this.logger.warn(
          `OpenAI API retryable error on attempt ${attempt + 1}/${this.MAX_RETRIES}: ${error.message}`,
        );
      }
    }

    // All retries exhausted
    throw new InternalServerErrorException(
      `OpenAI API failed after ${this.MAX_RETRIES} attempts: ${lastError?.message}`,
    );
  }

  /**
   * Determine if error is retryable
   *
   * Retryable errors:
   * - Rate limits (429)
   * - Server errors (500, 502, 503, 504)
   * - Timeout errors
   * - Network errors (ECONNRESET, ETIMEDOUT, etc.)
   *
   * Non-retryable errors:
   * - Authentication (401)
   * - Bad request (400)
   * - Not found (404)
   * - Other client errors (4xx except 429)
   *
   * @param error - Error object from OpenAI API
   * @returns True if error should be retried
   *
   * @example
   * ```typescript
   * isRetryableError({ status: 429 }); // true - rate limit
   * isRetryableError({ status: 401 }); // false - auth error
   * isRetryableError({ name: 'TimeoutError' }); // true
   * ```
   */
  private isRetryableError(error: any): boolean {
    // Timeout errors
    if (error.name === 'TimeoutError') {
      return true;
    }

    // HTTP status codes
    if (error.status) {
      const status = error.status;

      // Rate limit - always retry
      if (status === 429) {
        return true;
      }

      // Server errors - retry
      if (status >= 500 && status < 600) {
        return true;
      }

      // Client errors (except rate limit) - don't retry
      if (status >= 400 && status < 500) {
        return false;
      }
    }

    // Network errors - retry
    if (error.code) {
      const retryCodes = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED'];
      if (retryCodes.includes(error.code)) {
        return true;
      }
    }

    // Default: don't retry unknown errors
    return false;
  }

  /**
   * Sleep utility for retry delays
   *
   * @param ms - Milliseconds to sleep
   * @returns Promise that resolves after delay
   *
   * @example
   * ```typescript
   * await sleep(1000); // Wait 1 second
   * ```
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Detect language from text
   *
   * Simple pattern-based detection for supported languages:
   * - en (English): Latin alphabet
   * - ru (Russian): Cyrillic alphabet
   * - es (Spanish): Spanish diacritics (á, é, í, ó, ú, ñ)
   * - pt (Portuguese): Portuguese diacritics (ã, õ, ç)
   * - he (Hebrew): Hebrew alphabet
   *
   * @param text - Text to detect language for
   * @returns ISO 639-1 language code (default: 'en')
   *
   * @example
   * ```typescript
   * await detectLanguage("Стрижка в пятницу"); // Returns: "ru"
   * await detectLanguage("Corte de pelo"); // Returns: "es"
   * await detectLanguage("Haircut Friday"); // Returns: "en"
   * ```
   */
  async detectLanguage(text: string): Promise<string> {
    const normalized = text.toLowerCase();

    // Cyrillic alphabet → Russian
    if (/[\u0400-\u04FF]/.test(normalized)) {
      return 'ru';
    }

    // Hebrew alphabet
    if (/[\u0590-\u05FF]/.test(normalized)) {
      return 'he';
    }

    // Spanish diacritics
    if (/[áéíóúüñ¿¡]/.test(normalized)) {
      return 'es';
    }

    // Portuguese diacritics (ã, õ are distinctive)
    if (/[ãõç]/.test(normalized)) {
      return 'pt';
    }

    // Default to English
    return 'en';
  }

  /**
   * Build system prompt for OpenAI with salon context
   *
   * Instructs GPT to:
   * 1. Extract service name (match to available services)
   * 2. Extract preferred date/time (convert relative dates)
   * 3. Extract master name if mentioned
   * 4. Detect language
   * 5. Return JSON only
   *
   * @param salonContext - Available services and masters
   * @returns System prompt string
   *
   * @example
   * ```typescript
   * const prompt = buildSystemPrompt({
   *   services: ['Haircut ($50, 60min)', 'Coloring ($120, 90min)'],
   *   masters: ['Sarah Johnson', 'Alex Smith']
   * });
   * ```
   */
  buildSystemPrompt(salonContext: SalonContext): string {
    const today = new Date();
    const todayISO = this.formatDateToISO(today);
    const dayOfWeek = this.DAYS_OF_WEEK[today.getDay()];

    return `You are a booking assistant AI. Parse customer booking requests and extract structured information.

TODAY'S DATE: ${todayISO} (${dayOfWeek})

AVAILABLE SERVICES:
${salonContext.services.map((s, i) => `${i + 1}. ${s}`).join('\n')}

AVAILABLE MASTERS:
${salonContext.masters.map((m, i) => `${i + 1}. ${m}`).join('\n')}

INSTRUCTIONS:
1. Extract service name (match to available services above, use closest match)
2. Extract preferred date:
   - Convert relative dates: "tomorrow" → calculate ISO date
   - Convert day names: "Friday" → calculate next Friday's ISO date
   - Format: YYYY-MM-DD (ISO 8601)
3. Extract preferred time:
   - Convert to 24-hour format: "3pm" → "15:00"
   - Format: HH:mm
4. Extract day of week if mentioned: "monday", "tuesday", etc.
5. Extract time of day if mentioned: "morning", "afternoon", "evening"
6. Extract master name (first name is enough, match to available masters)
7. Detect language: ${this.SUPPORTED_LANGUAGES.join(', ')}
8. Determine if customer is flexible (words like "maybe", "around", "flexible")

IMPORTANT:
- Only extract information explicitly mentioned or clearly implied
- If date/time not specified, omit those fields
- Return ONLY valid JSON, no explanation text

RESPONSE FORMAT (JSON only):
{
  "serviceName": "Haircut" | null,
  "preferredDate": "2024-10-25" | null,
  "preferredTime": "15:00" | null,
  "preferredDayOfWeek": "friday" | null,
  "preferredTimeOfDay": "afternoon" | null,
  "masterName": "Sarah" | null,
  "isFlexible": true | false,
  "language": "en" | "ru" | "es" | "pt" | "he"
}

EXAMPLES:
Input: "Haircut Friday 3pm"
Output: {"serviceName":"Haircut","preferredDate":"2024-10-25","preferredTime":"15:00","preferredDayOfWeek":"friday","preferredTimeOfDay":"afternoon","masterName":null,"isFlexible":false,"language":"en"}

Input: "Стрижка завтра"
Output: {"serviceName":"Haircut","preferredDate":"2024-10-26","preferredTime":null,"preferredDayOfWeek":null,"preferredTimeOfDay":null,"masterName":null,"isFlexible":false,"language":"ru"}

Input: "Manicure with Sarah maybe tomorrow afternoon"
Output: {"serviceName":"Manicure","preferredDate":"2024-10-26","preferredTime":null,"preferredDayOfWeek":null,"preferredTimeOfDay":"afternoon","masterName":"Sarah","isFlexible":true,"language":"en"}

Now parse the customer's message:`;
  }

  /**
   * Create timeout promise
   *
   * Rejects after configured timeout period
   *
   * @returns Promise that rejects with TimeoutError
   */
  private createTimeout(): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        const error = new Error('OpenAI API timeout');
        error.name = 'TimeoutError';
        reject(error);
      }, this.timeout);
    });
  }

  /**
   * Format date to ISO string (YYYY-MM-DD)
   *
   * @param date - Date object
   * @returns ISO date string
   *
   * @example
   * ```typescript
   * formatDateToISO(new Date('2024-10-25')); // "2024-10-25"
   * ```
   */
  private formatDateToISO(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Sanitize intent for logging
   *
   * Removes sensitive information before logging
   *
   * @param intent - Booking intent object
   * @returns Sanitized intent for logging
   */
  private sanitizeForLogging(intent: BookingIntent): Partial<BookingIntent> {
    return {
      serviceName: intent.serviceName,
      preferredDate: intent.preferredDate,
      preferredTime: intent.preferredTime,
      language: intent.language,
      isFlexible: intent.isFlexible,
      // Omit master name for privacy
    };
  }

  /**
   * Parse multiple intents in batch
   *
   * Optimized for bulk processing with parallel API calls
   *
   * @param requests - Array of { text, salonId } objects
   * @returns Array of booking intents
   *
   * @example
   * ```typescript
   * const intents = await parseIntentBatch([
   *   { text: "Haircut Friday 3pm", salonId: "salon_123" },
   *   { text: "Manicure tomorrow", salonId: "salon_123" }
   * ]);
   * ```
   */
  async parseIntentBatch(
    requests: Array<{ text: string; salonId: string }>,
  ): Promise<BookingIntent[]> {
    this.logger.log(`Parsing ${requests.length} intents in batch`);

    const promises = requests.map((req) => this.parseIntent(req.text, req.salonId));

    try {
      return await Promise.all(promises);
    } catch (error) {
      this.logger.error(`Batch intent parsing failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validate booking intent completeness
   *
   * Checks if intent has minimum required fields for booking
   *
   * @param intent - Booking intent to validate
   * @returns True if intent is complete enough to proceed
   *
   * @example
   * ```typescript
   * const isValid = isIntentComplete({
   *   serviceName: "Haircut",
   *   preferredDate: "2024-10-25",
   *   language: "en"
   * }); // true
   *
   * const isInvalid = isIntentComplete({
   *   language: "en"
   * }); // false - missing service
   * ```
   */
  isIntentComplete(intent: BookingIntent): boolean {
    // Minimum requirements: service name OR service ID
    const hasService = !!(intent.serviceName || intent.serviceId);

    return hasService;
  }

  /**
   * Get missing fields from intent
   *
   * Returns array of field names that are missing or incomplete
   *
   * @param intent - Booking intent to analyze
   * @returns Array of missing field names
   *
   * @example
   * ```typescript
   * const missing = getMissingFields({
   *   serviceName: "Haircut",
   *   language: "en"
   * });
   * // Returns: ["preferredDate", "preferredTime"]
   * ```
   */
  getMissingFields(intent: BookingIntent): string[] {
    const missing: string[] = [];

    if (!intent.serviceName && !intent.serviceId) {
      missing.push('service');
    }

    if (!intent.preferredDate && !intent.preferredDayOfWeek) {
      missing.push('date');
    }

    if (!intent.preferredTime && !intent.preferredTimeOfDay) {
      missing.push('time');
    }

    return missing;
  }
}
