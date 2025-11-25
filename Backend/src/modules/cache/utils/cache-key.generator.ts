import { createHash } from 'crypto';
import { LanguageCode } from '../enums';
import { CACHE_PREFIX } from '../constants';

/**
 * Cache Key Generator Utility
 *
 * Generates deterministic cache keys using SHA256 hashing.
 * Keys are namespaced by language and use cryptographic hashing for collision prevention.
 */
export class CacheKeyGenerator {
  /**
   * Generate a cache key for an AI response
   *
   * Format: "ai:response:{language}:{sha256_hash}"
   *
   * @param normalizedQuery - The normalized query text
   * @param language - The language code
   * @returns Cache key string
   */
  static generateResponseKey(normalizedQuery: string, language: LanguageCode): string {
    const hash = this.generateHash(normalizedQuery);
    return `${CACHE_PREFIX.AI_RESPONSE}${language}:${hash}`;
  }

  /**
   * Generate a cache key for a query pattern
   *
   * Format: "ai:pattern:{language}:{sha256_hash}"
   *
   * @param pattern - The normalized pattern
   * @param language - The language code
   * @returns Cache key string
   */
  static generatePatternKey(pattern: string, language: LanguageCode): string {
    const hash = this.generateHash(pattern);
    return `${CACHE_PREFIX.QUERY_PATTERN}${language}:${hash}`;
  }

  /**
   * Generate a cache key for statistics
   *
   * Format: "ai:stats:{period}:{date}"
   *
   * @param period - The period type (hourly, daily, etc.)
   * @param date - The date identifier
   * @returns Cache key string
   */
  static generateStatsKey(period: string, date: string): string {
    return `${CACHE_PREFIX.STATISTICS}${period}:${date}`;
  }

  /**
   * Generate a health check cache key
   *
   * Format: "ai:health:{timestamp}"
   *
   * @returns Cache key string
   */
  static generateHealthKey(): string {
    const timestamp = Math.floor(Date.now() / 60000); // 1-minute buckets
    return `${CACHE_PREFIX.HEALTH}${timestamp}`;
  }

  /**
   * Generate SHA256 hash of input string
   *
   * @param input - The string to hash
   * @returns 64-character hexadecimal hash
   */
  private static generateHash(input: string): string {
    return createHash('sha256').update(input, 'utf8').digest('hex');
  }

  /**
   * Parse a cache key to extract components
   *
   * @param cacheKey - The cache key to parse
   * @returns Object with prefix, language, and hash
   */
  static parseKey(cacheKey: string): {
    prefix: string;
    language?: LanguageCode;
    hash?: string;
    valid: boolean;
  } {
    const parts = cacheKey.split(':');

    if (parts.length < 3) {
      return { prefix: '', valid: false };
    }

    const prefix = `${parts[0]}:${parts[1]}:`;
    const language = parts[2] as LanguageCode;
    const hash = parts[3];

    return {
      prefix,
      language,
      hash,
      valid: this.isValidHash(hash),
    };
  }

  /**
   * Validate if a string is a valid SHA256 hash
   *
   * @param hash - The hash to validate
   * @returns True if valid SHA256 hash
   */
  private static isValidHash(hash?: string): boolean {
    if (!hash) return false;
    return /^[a-f0-9]{64}$/i.test(hash);
  }

  /**
   * Extract language from cache key
   *
   * @param cacheKey - The cache key
   * @returns Language code or undefined
   */
  static extractLanguage(cacheKey: string): LanguageCode | undefined {
    const parsed = this.parseKey(cacheKey);
    return parsed.valid ? parsed.language : undefined;
  }

  /**
   * Verify cache key format is valid
   *
   * @param cacheKey - The cache key to verify
   * @returns True if valid format
   */
  static isValidCacheKey(cacheKey: string): boolean {
    return this.parseKey(cacheKey).valid;
  }
}
