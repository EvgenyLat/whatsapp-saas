import { LanguageCode } from '../enums';
import { NORMALIZATION } from '../constants';

/**
 * Query Normalizer Utility
 *
 * Normalizes customer queries to maximize cache hits across similar queries.
 * Handles multi-language support with language-specific rules.
 */
export class QueryNormalizer {
  /**
   * Normalize a query for cache lookup
   *
   * Steps:
   * 1. Convert to lowercase
   * 2. Remove extra whitespace
   * 3. Remove punctuation
   * 4. Remove stop words (language-specific)
   * 5. Sort tokens alphabetically
   * 6. Trim to max length
   *
   * @param query - The original query text
   * @param language - The language code
   * @returns Normalized query string
   */
  static normalize(query: string, language: LanguageCode): string {
    if (!query || typeof query !== 'string') {
      return '';
    }

    // Trim to max length
    let normalized = query.slice(0, NORMALIZATION.MAX_QUERY_LENGTH);

    // Convert to lowercase
    normalized = normalized.toLowerCase();

    // Remove extra whitespace and trim
    normalized = normalized.replace(/\s+/g, ' ').trim();

    // Remove punctuation but keep spaces
    normalized = this.removePunctuation(normalized, language);

    // Remove stop words
    normalized = this.removeStopWords(normalized, language);

    // Sort tokens alphabetically for consistent hashing
    normalized = this.sortTokens(normalized);

    return normalized.trim();
  }

  /**
   * Remove punctuation while preserving language-specific characters
   */
  private static removePunctuation(text: string, language: LanguageCode): string {
    switch (language) {
      case 'he':
        // Hebrew: Keep Hebrew characters, remove everything else except spaces
        return text.replace(/[^\u0590-\u05FF\s]/g, '');

      case 'ru':
        // Russian: Keep Cyrillic characters
        return text.replace(/[^\u0400-\u04FF\s]/g, '');

      case 'es':
      case 'pt':
        // Spanish/Portuguese: Keep accented characters and letters
        return text.replace(/[^a-záéíóúñüàèìòùâêîôûäëïöü\s]/gi, '');

      case 'en':
      default:
        // English: Keep only letters and spaces
        return text.replace(/[^a-z\s]/g, '');
    }
  }

  /**
   * Remove stop words based on language
   */
  private static removeStopWords(text: string, language: LanguageCode): string {
    const stopWords = NORMALIZATION.STOP_WORDS[language];

    if (!stopWords) {
      return text;
    }

    const tokens = text.split(' ');
    const stopWordsArray = Array.from(stopWords) as string[];
    const filtered = tokens.filter(token => !stopWordsArray.includes(token));

    return filtered.join(' ');
  }

  /**
   * Sort tokens alphabetically for consistent ordering
   */
  private static sortTokens(text: string): string {
    const tokens = text.split(' ').filter(t => t.length > 0);
    return tokens.sort().join(' ');
  }

  /**
   * Extract key terms from a query (for pattern matching)
   */
  static extractKeyTerms(query: string, language: LanguageCode): string[] {
    const normalized = this.normalize(query, language);
    return normalized.split(' ').filter(term => term.length > 2);
  }

  /**
   * Calculate similarity between two normalized queries (0-1)
   */
  static calculateSimilarity(query1: string, query2: string, language: LanguageCode): number {
    const normalized1 = this.normalize(query1, language);
    const normalized2 = this.normalize(query2, language);

    if (normalized1 === normalized2) {
      return 1.0;
    }

    const terms1 = normalized1.split(' ');
    const terms2 = normalized2.split(' ');

    const terms1Set = new Set(terms1);
    const terms2Set = new Set(terms2);

    // Calculate intersection
    const intersection = terms1.filter(x => terms2Set.has(x));

    // Calculate union size
    const unionSize = terms1Set.size + terms2Set.size - intersection.length;

    // Jaccard similarity
    return unionSize > 0 ? intersection.length / unionSize : 0;
  }

  /**
   * Validate query before processing
   */
  static isValidQuery(query: string): boolean {
    if (!query || typeof query !== 'string') {
      return false;
    }

    const trimmed = query.trim();
    return trimmed.length > 0 && trimmed.length <= NORMALIZATION.MAX_QUERY_LENGTH;
  }
}
