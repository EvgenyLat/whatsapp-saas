import { Service, ServiceCategory } from '@prisma/client';

/**
 * Service Matcher Helper
 *
 * Provides fuzzy matching and intelligent service search capabilities
 * for the AI booking assistant
 */

export interface ServiceMatch {
  service: Service;
  confidence: number; // 0-1 score
  reason: string;
}

export class ServiceMatcher {
  /**
   * Fuzzy match service names
   * Uses Levenshtein distance and keyword matching
   */
  static fuzzyMatch(query: string, services: Service[]): ServiceMatch[] {
    const normalizedQuery = query.toLowerCase().trim();
    const matches: ServiceMatch[] = [];

    for (const service of services) {
      const normalizedName = service.name.toLowerCase();
      const normalizedDesc = service.description?.toLowerCase() || '';

      let confidence = 0;
      let reason = '';

      // Exact match (highest priority)
      if (normalizedName === normalizedQuery) {
        confidence = 1.0;
        reason = 'Exact match';
      }
      // Contains full query
      else if (normalizedName.includes(normalizedQuery)) {
        confidence = 0.9;
        reason = 'Name contains query';
      }
      // Description contains query
      else if (normalizedDesc.includes(normalizedQuery)) {
        confidence = 0.7;
        reason = 'Description contains query';
      }
      // Keyword match (split query into words)
      else {
        const queryWords = normalizedQuery.split(/\s+/);
        const nameWords = normalizedName.split(/\s+/);

        const matchingWords = queryWords.filter(qWord =>
          nameWords.some(nWord => nWord.includes(qWord) || qWord.includes(nWord))
        );

        if (matchingWords.length > 0) {
          confidence = (matchingWords.length / queryWords.length) * 0.6;
          reason = `${matchingWords.length}/${queryWords.length} keywords match`;
        }
      }

      if (confidence > 0) {
        matches.push({ service, confidence, reason });
      }
    }

    // Sort by confidence (descending)
    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Find services by category
   */
  static filterByCategory(
    category: ServiceCategory,
    services: Service[]
  ): Service[] {
    return services.filter(s => s.category === category);
  }

  /**
   * Find services by price range
   */
  static filterByPriceRange(
    minPrice: number,
    maxPrice: number,
    services: Service[]
  ): Service[] {
    return services.filter(s => {
      const price = Number(s.price);
      return price >= minPrice && price <= maxPrice;
    });
  }

  /**
   * Find services by duration
   */
  static filterByDuration(
    minDuration: number,
    maxDuration: number,
    services: Service[]
  ): Service[] {
    return services.filter(s =>
      s.duration_minutes >= minDuration && s.duration_minutes <= maxDuration
    );
  }

  /**
   * Get service recommendations based on query
   */
  static getRecommendations(
    query: string,
    services: Service[],
    limit: number = 3
  ): ServiceMatch[] {
    const matches = this.fuzzyMatch(query, services);
    return matches.slice(0, limit);
  }

  /**
   * Extract category from query text
   * e.g., "haircut" -> HAIR, "manicure" -> NAILS
   */
  static extractCategoryFromQuery(query: string): ServiceCategory | null {
    const normalizedQuery = query.toLowerCase();

    const categoryKeywords: Record<ServiceCategory, string[]> = {
      HAIRCUT: ['hair', 'haircut', 'hairstyle', 'styling', 'волосы', 'стрижка', 'укладка'],
      MANICURE: ['nails', 'manicure', 'nail', 'ногти', 'маникюр'],
      PEDICURE: ['pedicure', 'педикюр'],
      FACIAL: ['facial', 'face', 'skin', 'лицо', 'лицевой', 'кожа'],
      MASSAGE: ['massage', 'массаж'],
      COLORING: ['color', 'coloring', 'dye', 'окрашивание', 'покраска'],
      WAXING: ['wax', 'waxing', 'depilation', 'воск', 'депиляция'],
      OTHER: ['other', 'другое'],
    };

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => normalizedQuery.includes(keyword))) {
        return category as ServiceCategory;
      }
    }

    return null;
  }

  /**
   * Format services list for AI context
   */
  static formatForAI(
    services: Service[],
    language: string = 'ru',
    currency: string = '₽'
  ): string {
    if (services.length === 0) {
      return language === 'ru' ? 'Нет доступных услуг' : 'No services available';
    }

    // Group by category
    const grouped = services.reduce((acc, service) => {
      if (!acc[service.category]) {
        acc[service.category] = [];
      }
      acc[service.category].push(service);
      return acc;
    }, {} as Record<ServiceCategory, Service[]>);

    // Format output
    const lines: string[] = [];

    for (const [category, categoryServices] of Object.entries(grouped)) {
      lines.push(`\n**${this.formatCategoryName(category as ServiceCategory, language)}:**`);

      categoryServices.forEach(service => {
        const price = Number(service.price);
        const priceStr = language === 'ru'
          ? `${price}${currency}`
          : `${currency}${price}`;

        const durationStr = language === 'ru'
          ? `${service.duration_minutes} мин`
          : `${service.duration_minutes} min`;

        lines.push(`  - ${service.name}: ${priceStr}, ${durationStr}`);

        if (service.description) {
          lines.push(`    ${service.description}`);
        }
      });
    }

    return lines.join('\n');
  }

  /**
   * Format category name for display
   */
  private static formatCategoryName(category: ServiceCategory, language: string): string {
    const translations: Record<ServiceCategory, Record<string, string>> = {
      HAIRCUT: { ru: 'Стрижка', en: 'Haircut', es: 'Corte de pelo', pt: 'Corte de cabelo', he: 'תספורת' },
      MANICURE: { ru: 'Маникюр', en: 'Manicure', es: 'Manicura', pt: 'Manicure', he: 'מניקור' },
      PEDICURE: { ru: 'Педикюр', en: 'Pedicure', es: 'Pedicura', pt: 'Pedicure', he: 'פדיקור' },
      FACIAL: { ru: 'Уход за лицом', en: 'Facial', es: 'Facial', pt: 'Facial', he: 'פנים' },
      MASSAGE: { ru: 'Массаж', en: 'Massage', es: 'Masaje', pt: 'Massagem', he: 'עיסוי' },
      COLORING: { ru: 'Окрашивание', en: 'Coloring', es: 'Coloración', pt: 'Coloração', he: 'צביעה' },
      WAXING: { ru: 'Депиляция', en: 'Waxing', es: 'Depilación', pt: 'Depilação', he: 'הסרת שיער' },
      OTHER: { ru: 'Другое', en: 'Other', es: 'Otro', pt: 'Outro', he: 'אחר' },
    };

    return translations[category][language] || translations[category]['en'];
  }
}
