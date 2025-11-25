import { Injectable, Logger, Optional } from '@nestjs/common';
import {
  IntentType,
  IntentClassificationResult,
  ConfidenceLevel,
  ExtractedEntities,
  IntentPattern,
  LanguageIntentPatterns,
  MultiLanguageIntentPatterns,
} from '../types/intent.types';
import { AiCacheService } from '../../cache/services/ai-cache.service';
import { ResponseCategory } from '../../cache/enums/response-category.enum';
import { QueryNormalizer } from '../../cache/utils/query-normalizer';
import { Language, LanguageCode } from '../../cache/enums/language.enum';

/**
 * AI Intent Classification Service
 *
 * Provides advanced multi-language intent detection for WhatsApp messages
 * using pattern matching, keyword analysis, and weighted scoring algorithms.
 *
 * @example
 * ```typescript
 * const result = await aiIntentService.classifyIntent(
 *   "I want to book tomorrow at 3pm",
 *   "en"
 * );
 * console.log(result.intent); // BOOKING_REQUEST
 * console.log(result.confidence); // 0.85
 * ```
 */
@Injectable()
export class AIIntentService {
  private readonly logger = new Logger(AIIntentService.name);

  constructor(
    @Optional() private readonly cacheService?: AiCacheService,
  ) {}

  /**
   * Minimum confidence threshold for reliable classification
   */
  private readonly RELIABILITY_THRESHOLD = 0.4;

  /**
   * Multi-language intent patterns with weighted keywords and regex patterns
   */
  private readonly intentPatterns: MultiLanguageIntentPatterns = {
    // English patterns
    en: {
      [IntentType.BOOKING_REQUEST]: {
        keywords: [
          'book',
          'booking',
          'appointment',
          'schedule',
          'reserve',
          'reservation',
          'arrange',
          'set up',
          'make',
          'need',
          'want',
          'would like',
        ],
        patterns: [
          /\b(book|schedule|reserve)\s+(a|an|me|for)\b/i,
          /\b(make|need)\s+(a|an)\s+(booking|appointment|reservation)\b/i,
          /\b(want|would like)\s+to\s+(book|schedule|reserve)\b/i,
          /\bat\s+\d{1,2}(:\d{2})?\s*(am|pm|h)\b/i, // time patterns
          /\b(tomorrow|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i, // date patterns
        ],
        weight: 0.9,
        isStrong: true,
      },
      [IntentType.BOOKING_CANCEL]: {
        keywords: ['cancel', 'cancellation', 'remove', 'delete', 'abort', 'drop'],
        patterns: [
          /\bcancel\s+(my|the)?\s*(booking|appointment|reservation)\b/i,
          /\b(want|need)\s+to\s+cancel\b/i,
          /\bcancel\b/i,
        ],
        weight: 0.9,
        isStrong: true,
      },
      [IntentType.BOOKING_MODIFY]: {
        keywords: [
          'change',
          'modify',
          'reschedule',
          'move',
          'update',
          'adjust',
          'different',
          'another',
          'shift',
        ],
        patterns: [
          /\b(change|modify|reschedule)\s+(my|the)?\s*(booking|appointment)\b/i,
          /\bmove\s+(my|the)?\s*(booking|appointment)\s+to\b/i,
          /\breschedule\b/i,
        ],
        weight: 0.9,
        isStrong: true,
      },
      [IntentType.AVAILABILITY_INQUIRY]: {
        keywords: [
          'available',
          'availability',
          'free',
          'open',
          'slot',
          'when',
          'hours',
        ],
        patterns: [
          /\b(when|what time)\s+(are you|is)\s+(available|open|free)\b/i,
          /\bdo you have\s+(any)?\s*(available|free|open)\s*(time|slot)/i,
          /\bavailable\s+(times?|slots?|hours?)\b/i,
          /\bwhat\s+times?\s+are\s+available\b/i,
        ],
        weight: 0.9,
        isStrong: true,
      },
      [IntentType.SERVICE_INQUIRY]: {
        keywords: [
          'service',
          'services',
          'offer',
          'provide',
          'do you do',
          'what do you',
          'treatment',
        ],
        patterns: [
          /\bwhat\s+(services?|treatments?)\s+do you\s+(offer|provide|have)\b/i,
          /\bdo you\s+(do|offer|provide|have)\b/i,
        ],
        weight: 0.75,
      },
      [IntentType.PRICE_INQUIRY]: {
        keywords: [
          'price',
          'cost',
          'how much',
          'pricing',
          'fee',
          'charge',
          'rate',
          'expensive',
          'cheap',
        ],
        patterns: [
          /\bhow much\s+(does|is|do|are|will)\b/i,
          /\bwhat('?s| is)\s+the\s+(price|cost|fee)\b/i,
        ],
        weight: 0.8,
      },
      [IntentType.LOCATION_INQUIRY]: {
        keywords: [
          'where',
          'location',
          'address',
          'directions',
          'find',
          'located',
          'place',
        ],
        patterns: [
          /\bwhere\s+(are you|is)\s+(located|your)?\b/i,
          /\bwhat('?s| is)\s+your\s+(address|location)\b/i,
        ],
        weight: 0.8,
      },
      [IntentType.GREETING]: {
        keywords: [
          'hello',
          'hi',
          'hey',
          'greetings',
          'good morning',
          'good afternoon',
          'good evening',
        ],
        patterns: [/^(hi|hey|hello|greetings)\b/i, /\bhello\b/i],
        weight: 0.9,
      },
      [IntentType.THANKS]: {
        keywords: ['thank', 'thanks', 'thank you', 'appreciate', 'grateful'],
        patterns: [/\bthank(s| you)\b/i],
        weight: 0.9,
      },
      [IntentType.CONFIRMATION]: {
        keywords: ['yes', 'yeah', 'yep', 'sure', 'ok', 'okay', 'correct', 'right', 'confirm'],
        patterns: [/^(yes|yeah|yep|sure|ok|okay)\b/i],
        weight: 0.9,
      },
      [IntentType.NEGATION]: {
        keywords: ['no', 'nope', 'not', "don't", 'wrong', 'incorrect'],
        patterns: [/^(no|nope)\b/i, /\b(don't|do not)\s+want\b/i],
        weight: 0.9,
      },
      [IntentType.HELP_REQUEST]: {
        keywords: ['help', 'assist', 'support', 'question', 'confused'],
        patterns: [/\b(can you|could you|please)\s+help\b/i, /\bneed\s+help\b/i],
        weight: 0.75,
      },
      [IntentType.FEEDBACK]: {
        keywords: [
          'feedback',
          'complaint',
          'complain',
          'issue',
          'problem',
          'satisfied',
          'disappointed',
        ],
        patterns: [/\bhave\s+(a|an)\s+(complaint|issue|problem)\b/i],
        weight: 0.7,
      },
    },

    // Russian patterns
    ru: {
      [IntentType.BOOKING_REQUEST]: {
        keywords: [
          'забронировать',
          'записаться',
          'запись',
          'бронирование',
          'хочу',
          'нужно',
          'можно',
        ],
        patterns: [
          /\b(хочу|нужно|можно)\s+(записаться|забронировать)\b/i,
          /\bв\s+\d{1,2}(:\d{2})?\b/i, // time patterns
          /\b(завтра|сегодня|понедельник|вторник|среда|четверг|пятница|суббота|воскресенье)\b/i,
        ],
        weight: 0.9,
        isStrong: true,
      },
      [IntentType.BOOKING_CANCEL]: {
        keywords: ['отменить', 'отмена', 'удалить', 'аннулировать'],
        patterns: [/\bотменить\s+(запись|бронирование)\b/i],
        weight: 0.85,
        isStrong: true,
      },
      [IntentType.BOOKING_MODIFY]: {
        keywords: ['изменить', 'перенести', 'поменять', 'другое время'],
        patterns: [/\b(изменить|перенести)\s+(запись|бронирование)\b/i],
        weight: 0.85,
        isStrong: true,
      },
      [IntentType.AVAILABILITY_INQUIRY]: {
        keywords: ['свободно', 'доступно', 'когда', 'время', 'часы'],
        patterns: [/\bкогда\s+(можно|свободно|доступно)\b/i],
        weight: 0.8,
      },
      [IntentType.PRICE_INQUIRY]: {
        keywords: ['цена', 'стоимость', 'сколько', 'дорого', 'дешево'],
        patterns: [/\bсколько\s+стоит\b/i, /\bкакая\s+цена\b/i],
        weight: 0.8,
      },
      [IntentType.GREETING]: {
        keywords: ['привет', 'здравствуйте', 'добрый день', 'доброе утро', 'добрый вечер'],
        patterns: [/^(привет|здравствуйте)\b/i],
        weight: 0.7,
      },
      [IntentType.THANKS]: {
        keywords: ['спасибо', 'благодарю', 'благодарен'],
        patterns: [/\bспасибо\b/i],
        weight: 0.7,
      },
      [IntentType.CONFIRMATION]: {
        keywords: ['да', 'ага', 'хорошо', 'ок', 'верно', 'правильно'],
        patterns: [/^(да|ага|хорошо|ок)\b/i],
        weight: 0.6,
      },
      [IntentType.NEGATION]: {
        keywords: ['нет', 'не', 'неправильно', 'ошибка'],
        patterns: [/^нет\b/i],
        weight: 0.6,
      },
    },

    // Spanish patterns
    es: {
      [IntentType.BOOKING_REQUEST]: {
        keywords: [
          'reservar',
          'reserva',
          'cita',
          'agendar',
          'programar',
          'quiero',
          'necesito',
        ],
        patterns: [
          /\b(quiero|necesito|puedo)\s+(reservar|agendar|una cita)\b/i,
          /\ba las?\s+\d{1,2}(:\d{2})?\b/i, // time patterns
          /\b(mañana|hoy|lunes|martes|miércoles|jueves|viernes|sábado|domingo)\b/i,
        ],
        weight: 0.9,
        isStrong: true,
      },
      [IntentType.BOOKING_CANCEL]: {
        keywords: ['cancelar', 'cancelación', 'eliminar', 'anular'],
        patterns: [/\bcancelar\s+(la|mi)?\s*(reserva|cita)\b/i],
        weight: 0.85,
        isStrong: true,
      },
      [IntentType.BOOKING_MODIFY]: {
        keywords: ['cambiar', 'modificar', 'reprogramar', 'mover', 'otra'],
        patterns: [/\b(cambiar|modificar|reprogramar)\s+(la|mi)?\s*(reserva|cita)\b/i],
        weight: 0.85,
        isStrong: true,
      },
      [IntentType.AVAILABILITY_INQUIRY]: {
        keywords: ['disponible', 'disponibilidad', 'libre', 'horario', 'cuándo'],
        patterns: [/\bcuándo\s+(está|hay|tienen)\s+(disponible|libre)\b/i],
        weight: 0.8,
      },
      [IntentType.PRICE_INQUIRY]: {
        keywords: ['precio', 'costo', 'cuánto', 'valor', 'tarifa', 'caro', 'barato'],
        patterns: [/\bcuánto\s+(cuesta|vale|es)\b/i, /\bcuál es el precio\b/i],
        weight: 0.8,
      },
      [IntentType.GREETING]: {
        keywords: ['hola', 'buenos días', 'buenas tardes', 'buenas noches', 'saludos'],
        patterns: [/^(hola|buenos?)\b/i],
        weight: 0.7,
      },
      [IntentType.THANKS]: {
        keywords: ['gracias', 'agradezco', 'muchas gracias'],
        patterns: [/\bgracias\b/i],
        weight: 0.7,
      },
      [IntentType.CONFIRMATION]: {
        keywords: ['sí', 'si', 'claro', 'vale', 'ok', 'correcto', 'exacto'],
        patterns: [/^(sí|si|claro|vale)\b/i],
        weight: 0.6,
      },
      [IntentType.NEGATION]: {
        keywords: ['no', 'nada', 'incorrecto', 'mal'],
        patterns: [/^no\b/i],
        weight: 0.6,
      },
    },

    // Portuguese patterns
    pt: {
      [IntentType.BOOKING_REQUEST]: {
        keywords: [
          'reservar',
          'reserva',
          'agendar',
          'agendamento',
          'marcar',
          'quero',
          'preciso',
        ],
        patterns: [
          /\b(quero|preciso|posso)\s+(reservar|agendar|marcar)\b/i,
          /\bàs\s+\d{1,2}(:\d{2})?\b/i, // time patterns
          /\b(amanhã|hoje|segunda|terça|quarta|quinta|sexta|sábado|domingo)\b/i,
        ],
        weight: 0.9,
        isStrong: true,
      },
      [IntentType.BOOKING_CANCEL]: {
        keywords: ['cancelar', 'cancelamento', 'desmarcar', 'anular'],
        patterns: [/\bcancelar\s+(a|minha)?\s*(reserva|marcação)\b/i],
        weight: 0.85,
        isStrong: true,
      },
      [IntentType.BOOKING_MODIFY]: {
        keywords: ['mudar', 'alterar', 'remarcar', 'modificar', 'outro'],
        patterns: [/\b(mudar|alterar|remarcar)\s+(a|minha)?\s*(reserva|marcação)\b/i],
        weight: 0.85,
        isStrong: true,
      },
      [IntentType.AVAILABILITY_INQUIRY]: {
        keywords: ['disponível', 'disponibilidade', 'livre', 'horário', 'quando'],
        patterns: [/\bquando\s+(está|tem|há)\s+(disponível|livre)\b/i],
        weight: 0.8,
      },
      [IntentType.PRICE_INQUIRY]: {
        keywords: ['preço', 'custo', 'quanto', 'valor', 'caro', 'barato'],
        patterns: [/\bquanto\s+(custa|é)\b/i, /\bqual é o preço\b/i],
        weight: 0.8,
      },
      [IntentType.GREETING]: {
        keywords: ['olá', 'oi', 'bom dia', 'boa tarde', 'boa noite'],
        patterns: [/^(olá|oi|bom)\b/i],
        weight: 0.7,
      },
      [IntentType.THANKS]: {
        keywords: ['obrigado', 'obrigada', 'agradeço', 'valeu'],
        patterns: [/\bobrigad[oa]\b/i],
        weight: 0.7,
      },
      [IntentType.CONFIRMATION]: {
        keywords: ['sim', 'claro', 'ok', 'certo', 'correto', 'exato'],
        patterns: [/^(sim|claro|ok)\b/i],
        weight: 0.6,
      },
      [IntentType.NEGATION]: {
        keywords: ['não', 'nada', 'incorreto', 'errado'],
        patterns: [/^não\b/i],
        weight: 0.6,
      },
    },

    // Hebrew patterns
    he: {
      [IntentType.BOOKING_REQUEST]: {
        keywords: [
          'להזמין',
          'הזמנה',
          'לקבוע',
          'תור',
          'רוצה',
          'צריך',
          'אפשר',
        ],
        patterns: [
          /\b(רוצה|צריך|אפשר)\s+(להזמין|לקבוע|תור)\b/i,
          /\bב\s*\d{1,2}(:\d{2})?\b/i, // time patterns
          /\b(מחר|היום|ראשון|שני|שלישי|רביעי|חמישי|שישי|שבת)\b/i,
        ],
        weight: 0.9,
        isStrong: true,
      },
      [IntentType.BOOKING_CANCEL]: {
        keywords: ['לבטל', 'ביטול', 'למחוק'],
        patterns: [/\bלבטל\s+(את)?\s*(ההזמנה|התור)\b/i],
        weight: 0.85,
        isStrong: true,
      },
      [IntentType.BOOKING_MODIFY]: {
        keywords: ['לשנות', 'לדחות', 'להעביר', 'לשנות תור'],
        patterns: [/\b(לשנות|לדחות|להעביר)\s+(את)?\s*(ההזמנה|התור)\b/i],
        weight: 0.85,
        isStrong: true,
      },
      [IntentType.AVAILABILITY_INQUIRY]: {
        keywords: ['פנוי', 'זמין', 'מתי', 'שעות'],
        patterns: [/\bמתי\s+(יש|פנוי|זמין)\b/i],
        weight: 0.8,
      },
      [IntentType.PRICE_INQUIRY]: {
        keywords: ['מחיר', 'עלות', 'כמה', 'יקר', 'זול'],
        patterns: [/\bכמה\s+(זה עולה|עולה)\b/i, /\bמה המחיר\b/i],
        weight: 0.8,
      },
      [IntentType.GREETING]: {
        keywords: ['שלום', 'היי', 'הי', 'בוקר טוב', 'ערב טוב'],
        patterns: [/^(שלום|היי|הי)\b/i],
        weight: 0.7,
      },
      [IntentType.THANKS]: {
        keywords: ['תודה', 'תודה רבה', 'מעריך'],
        patterns: [/\bתודה\b/i],
        weight: 0.7,
      },
      [IntentType.CONFIRMATION]: {
        keywords: ['כן', 'בטח', 'אוקיי', 'נכון', 'מסכים'],
        patterns: [/^(כן|בטח|אוקיי)\b/i],
        weight: 0.6,
      },
      [IntentType.NEGATION]: {
        keywords: ['לא', 'לא נכון', 'טעות'],
        patterns: [/^לא\b/i],
        weight: 0.6,
      },
    },
  };

  /**
   * Classifies the intent of a user message with confidence scoring
   *
   * @param text - The user's message text
   * @param language - ISO language code (ru, en, es, pt, he)
   * @returns Intent classification result with confidence scores and extracted entities
   *
   * @throws {Error} If text is empty or language is unsupported
   */
  async classifyIntent(
    text: string,
    language: string,
  ): Promise<IntentClassificationResult> {
    try {
      // Validate input
      if (!text || text.trim().length === 0) {
        this.logger.warn('Empty text provided for intent classification');
        return this.createUnknownResult(text, language, 'Empty input');
      }

      // Normalize language code
      const normalizedLanguage = this.normalizeLanguage(language);

      // Check if language is supported
      if (!this.intentPatterns[normalizedLanguage]) {
        this.logger.warn(`Unsupported language: ${language}, falling back to English`);
        return this.classifyIntent(text, 'en');
      }

      // Check cache first if available
      if (this.cacheService) {
        // Use lookup method with proper input structure
        const cacheResult = await this.cacheService.lookup({
          query: text,
          language: this.mapLanguageToEnum(normalizedLanguage),
        });

        if (cacheResult.hit && cacheResult.response) {
          this.logger.debug(`Cache hit for query: "${text.substring(0, 50)}..."`);

          // Parse cached result from response text
          const cachedResult = JSON.parse(cacheResult.response.responseText);

          // Return cached intent classification result
          return cachedResult as IntentClassificationResult;
        }
      }

      // Normalize text for processing
      const normalizedText = this.normalizeText(text);

      this.logger.debug(
        `Classifying intent for text: "${text.substring(0, 50)}..." in language: ${normalizedLanguage}`,
      );

      // Calculate scores for each intent type
      const intentScores = this.calculateIntentScores(
        normalizedText,
        normalizedLanguage,
      );

      // Sort by score descending
      const sortedIntents = Object.entries(intentScores)
        .map(([intent, score]) => ({
          intent: intent as IntentType,
          confidence: score,
        }))
        .sort((a, b) => b.confidence - a.confidence);

      // Get primary intent and alternatives
      const primaryIntent = sortedIntents[0];
      const alternativeIntents = sortedIntents.slice(1, 4); // Top 3 alternatives

      // Extract entities from text
      const entities = this.extractEntities(normalizedText, normalizedLanguage);

      // Determine confidence level
      const confidenceLevel = this.getConfidenceLevel(primaryIntent.confidence);

      // Check if classification is reliable
      const isReliable = primaryIntent.confidence >= this.RELIABILITY_THRESHOLD;

      const result: IntentClassificationResult = {
        intent: primaryIntent.intent,
        confidence: primaryIntent.confidence,
        confidenceLevel,
        alternativeIntents,
        entities,
        language: normalizedLanguage,
        originalText: text,
        normalizedText,
        isReliable,
      };

      this.logger.log(
        `Intent classified: ${result.intent} (confidence: ${result.confidence.toFixed(2)}, reliable: ${isReliable})`,
      );

      // Cache result if confidence is high enough and cache service is available
      if (this.cacheService && result.confidence >= 0.7) {
        // Determine category based on intent type
        const category = this.mapIntentToCategory(result.intent);

        // Normalize query for consistent cache key
        const normalizedQuery = QueryNormalizer.normalize(text, this.mapLanguageToEnum(normalizedLanguage));

        // Use store method with proper input structure
        await this.cacheService.store({
          originalQuery: text,
          normalizedQuery: normalizedQuery,
          language: this.mapLanguageToEnum(normalizedLanguage),
          responseText: JSON.stringify(result),
          confidenceScore: result.confidence,
          responseCategory: category,
          originalResponseTime: 100, // Estimated AI response time in ms
        });

        this.logger.debug(`Cached intent classification result for: "${text.substring(0, 50)}..."`);
      }

      return result;
    } catch (error) {
      this.logger.error(
        `Error classifying intent: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );

      return this.createUnknownResult(text, language, 'Classification error');
    }
  }

  /**
   * Calculates confidence scores for all intent types
   */
  private calculateIntentScores(
    text: string,
    language: string,
  ): Record<IntentType, number> {
    const patterns = this.intentPatterns[language];
    const scores: Partial<Record<IntentType, number>> = {};

    // Initialize all scores to 0
    Object.values(IntentType).forEach((intent) => {
      scores[intent] = 0;
    });

    // Calculate score for each intent
    for (const [intentKey, pattern] of Object.entries(patterns)) {
      const intent = intentKey as IntentType;
      let score = 0;
      let matchCount = 0;

      // Check keyword matches
      for (const keyword of pattern.keywords) {
        if (this.containsKeyword(text, keyword)) {
          matchCount++;
          // Strong indicators get higher base score
          score += pattern.isStrong ? 0.4 : 0.2;
        }
      }

      // Check pattern matches (regex)
      if (pattern.patterns) {
        for (const regex of pattern.patterns) {
          if (regex.test(text)) {
            matchCount++;
            score += pattern.isStrong ? 0.45 : 0.25;
          }
        }
      }

      // Apply weight and normalize
      if (matchCount > 0) {
        score = Math.min(score * pattern.weight, 1.0);

        // Bonus for multiple matches
        if (matchCount >= 2) {
          score = Math.min(score + 0.15, 1.0);
        }
        if (matchCount >= 3) {
          score = Math.min(score + 0.15, 1.0);
        }
      }

      scores[intent] = score;
    }

    // Handle conflicting intents - prioritize specific intents over general booking
    if (scores[IntentType.BOOKING_CANCEL] && scores[IntentType.BOOKING_CANCEL] > 0.3) {
      // If cancel is detected, reduce booking request score significantly
      scores[IntentType.BOOKING_REQUEST] = Math.min(
        scores[IntentType.BOOKING_REQUEST] || 0,
        0.3,
      );
    }
    if (scores[IntentType.BOOKING_MODIFY] && scores[IntentType.BOOKING_MODIFY] > 0.3) {
      // If modify is detected, reduce booking request score
      scores[IntentType.BOOKING_REQUEST] = Math.min(
        scores[IntentType.BOOKING_REQUEST] || 0,
        0.3,
      );
    }
    if (scores[IntentType.AVAILABILITY_INQUIRY] && scores[IntentType.AVAILABILITY_INQUIRY] > 0.5) {
      // If availability inquiry is detected, reduce booking request score
      scores[IntentType.BOOKING_REQUEST] = Math.min(
        scores[IntentType.BOOKING_REQUEST] || 0,
        0.4,
      );
    }

    // If no strong matches found, mark as UNKNOWN (with low confidence to mark as unreliable)
    const maxScore = Math.max(...Object.values(scores).filter((s): s is number => s !== undefined));
    if (maxScore < 0.2) {
      scores[IntentType.UNKNOWN] = 0.3; // Below reliability threshold of 0.4
    }

    return scores as Record<IntentType, number>;
  }

  /**
   * Extracts entities (dates, times, services, etc.) from text
   */
  private extractEntities(text: string, language: string): ExtractedEntities {
    // Build entities object with optional properties
    const entitiesBuilder: {
      dateReferences?: string[];
      timeReferences?: string[];
      serviceMentions?: string[];
      numbers?: string[];
      emails?: string[];
    } = {};

    // Extract time references
    const timePatterns = [
      /\b\d{1,2}(:\d{2})?\s*(am|pm|h)\b/gi,
      /\b(morning|afternoon|evening|night)\b/gi,
      /\b(утро|день|вечер|ночь)\b/gi, // Russian
      /\b(mañana|tarde|noche)\b/gi, // Spanish
      /\b(manhã|tarde|noite)\b/gi, // Portuguese
      /\b(בוקר|צהריים|ערב|לילה)\b/gi, // Hebrew
    ];

    const timeMatches = new Set<string>();
    for (const pattern of timePatterns) {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach((match) => timeMatches.add(match.toLowerCase()));
      }
    }
    if (timeMatches.size > 0) {
      entitiesBuilder.timeReferences = Array.from(timeMatches);
    }

    // Extract date references
    const datePatterns = [
      /\b(today|tomorrow|yesterday|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
      /\b(сегодня|завтра|вчера|понедельник|вторник|среда|четверг|пятница|суббота|воскресенье)\b/gi,
      /\b(hoy|mañana|ayer|lunes|martes|miércoles|jueves|viernes|sábado|domingo)\b/gi,
      /\b(hoje|amanhã|ontem|segunda|terça|quarta|quinta|sexta|sábado|domingo)\b/gi,
      /\b(היום|מחר|אתמול|ראשון|שני|שלישי|רביעי|חמישי|שישי|שבת)\b/gi,
      /\b\d{1,2}[/-]\d{1,2}([/-]\d{2,4})?\b/g, // Date formats
    ];

    const dateMatches = new Set<string>();
    for (const pattern of datePatterns) {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach((match) => dateMatches.add(match.toLowerCase()));
      }
    }
    if (dateMatches.size > 0) {
      entitiesBuilder.dateReferences = Array.from(dateMatches);
    }

    // Extract numbers (could be booking IDs, phone numbers, etc.)
    const numberPattern = /\b\d{3,}\b/g;
    const numberMatches = text.match(numberPattern);
    if (numberMatches) {
      entitiesBuilder.numbers = numberMatches;
    }

    // Extract email addresses
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emailMatches = text.match(emailPattern);
    if (emailMatches) {
      entitiesBuilder.emails = emailMatches;
    }

    return entitiesBuilder;
  }

  /**
   * Normalizes text for consistent processing
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' '); // Normalize whitespace only
  }

  /**
   * Normalizes language code to supported format
   */
  private normalizeLanguage(language: string): string {
    const normalized = language.toLowerCase().split('-')[0]; // Handle en-US -> en
    return ['en', 'ru', 'es', 'pt', 'he'].includes(normalized) ? normalized : 'en';
  }

  /**
   * Checks if text contains a keyword (case-insensitive, whole word match)
   */
  private containsKeyword(text: string, keyword: string): boolean {
    // For multi-word keywords, use exact match
    if (keyword.includes(' ')) {
      return text.includes(keyword.toLowerCase());
    }

    // For single words, use word boundary matching
    const regex = new RegExp(`\\b${this.escapeRegex(keyword)}\\b`, 'i');
    return regex.test(text);
  }

  /**
   * Escapes special regex characters in a string
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Determines confidence level category from numeric score
   */
  private getConfidenceLevel(confidence: number): ConfidenceLevel {
    if (confidence >= 0.8) return ConfidenceLevel.VERY_HIGH;
    if (confidence >= 0.6) return ConfidenceLevel.HIGH;
    if (confidence >= 0.4) return ConfidenceLevel.MEDIUM;
    if (confidence >= 0.2) return ConfidenceLevel.LOW;
    return ConfidenceLevel.VERY_LOW;
  }

  /**
   * Creates an UNKNOWN intent result for error cases
   */
  private createUnknownResult(
    text: string,
    language: string,
    reason: string,
  ): IntentClassificationResult {
    this.logger.debug(`Creating UNKNOWN result: ${reason}`);

    return {
      intent: IntentType.UNKNOWN,
      confidence: 0.0,
      confidenceLevel: ConfidenceLevel.VERY_LOW,
      alternativeIntents: [],
      entities: {},
      language: this.normalizeLanguage(language),
      originalText: text,
      normalizedText: this.normalizeText(text),
      isReliable: false,
    };
  }

  /**
   * Gets all supported languages
   */
  getSupportedLanguages(): string[] {
    return Object.keys(this.intentPatterns);
  }

  /**
   * Checks if a language is supported
   */
  isLanguageSupported(language: string): boolean {
    const normalized = language.toLowerCase().split('-')[0]; // Handle en-US -> en
    return ['en', 'ru', 'es', 'pt', 'he'].includes(normalized);
  }

  /**
   * Maps intent type to cache response category
   * @param intent The intent type to map
   * @returns The corresponding response category for caching
   */
  private mapIntentToCategory(intent: IntentType): ResponseCategory {
    switch (intent) {
      case IntentType.GREETING:
        return ResponseCategory.GREETING;
      case IntentType.BOOKING_REQUEST:
      case IntentType.BOOKING_CANCEL:
      case IntentType.BOOKING_MODIFY:
      case IntentType.CONFIRMATION:
        return ResponseCategory.BOOKING;
      case IntentType.SERVICE_INQUIRY:
        return ResponseCategory.SERVICES;
      case IntentType.PRICE_INQUIRY:
        return ResponseCategory.PRICING;
      case IntentType.LOCATION_INQUIRY:
        return ResponseCategory.LOCATION;
      case IntentType.AVAILABILITY_INQUIRY:
        return ResponseCategory.AVAILABILITY;
      case IntentType.GENERAL_QUESTION:
      case IntentType.HELP_REQUEST:
      case IntentType.FEEDBACK:
      case IntentType.THANKS:
      case IntentType.NEGATION:
      default:
        return ResponseCategory.GENERAL;
    }
  }

  /**
   * Maps language string to Language enum
   * @param language The language string to map
   * @returns The corresponding Language enum value
   */
  private mapLanguageToEnum(language: string): LanguageCode {
    const normalized = language.toLowerCase();
    switch (normalized) {
      case 'ru':
        return 'ru';
      case 'en':
        return 'en';
      case 'es':
        return 'es';
      case 'pt':
        return 'pt';
      case 'he':
        return 'he';
      default:
        return 'en'; // Default to English
    }
  }
}
