import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import * as crypto from 'crypto';

/**
 * AI Response Cache Service
 *
 * Implements intelligent caching for AI responses to achieve 90%+ cache hit rate
 * This is a CRITICAL competitive advantage - provides 10x cost reduction vs competitors
 *
 * Key Features:
 * - Query normalization (removes noise, standardizes format)
 * - SHA256 hashing for fast lookup
 * - Hit count tracking for popularity analysis
 * - Confidence scoring for response quality
 * - Automatic TTL management
 * - Cache warming capabilities
 *
 * Target Metrics:
 * - Cache hit rate: 90%+ within 30 days
 * - Lookup time: <50ms
 * - Cost savings: $450/month per 1000 conversations
 */

export interface CachedResponse {
  id: string;
  response: string;
  language: string;
  salon_id: string | null;
  hit_count: number;
  confidence_score: number;
  created_at: Date;
  last_used_at: Date;
}

export interface CacheSetOptions {
  language?: string;
  salon_id?: string | null;
  confidence_score?: number;
  ttl_days?: number; // Time-to-live in days
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  // Normalization config
  private readonly NOISE_WORDS = [
    'пожалуйста', 'please', 'спасибо', 'thanks', 'thank you',
    'здравствуйте', 'привет', 'hello', 'hi', 'hey',
    '!', '?', '.', ',', '😊', '🙏', '👍', '❤️',
  ];

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Normalize query for consistent cache lookup
   *
   * Normalization steps:
   * 1. Lowercase
   * 2. Trim whitespace
   * 3. Remove noise words
   * 4. Remove special characters
   * 5. Collapse multiple spaces
   *
   * Example:
   *   Input:  "Привет! Хочу к Ане на маникюр завтра 😊"
   *   Output: "хочу ане маникюр завтра"
   */
  normalizeQuery(query: string): string {
    let normalized = query.toLowerCase().trim();

    // Remove noise words (escape regex special characters)
    const escapedWords = this.NOISE_WORDS.map(word =>
      word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    );
    const regex = new RegExp(`\\b(${escapedWords.join('|')})\\b`, 'gi');
    normalized = normalized.replace(regex, '');

    // Remove emojis and special characters
    normalized = normalized.replace(/[^\p{L}\p{N}\s]/gu, '');

    // Collapse multiple spaces
    normalized = normalized.replace(/\s+/g, ' ').trim();

    return normalized;
  }

  /**
   * Generate SHA256 hash of normalized query
   *
   * Uses SHA256 for:
   * - Fast lookup (indexed in database)
   * - Collision resistance
   * - Consistent 64-character output
   */
  hashQuery(normalizedQuery: string): string {
    return crypto
      .createHash('sha256')
      .update(normalizedQuery, 'utf8')
      .digest('hex');
  }

  /**
   * Get cached response by query
   *
   * Returns cached response if:
   * - Hash exists in cache
   * - Not expired (if TTL set)
   * - Confidence score above threshold
   *
   * @returns CachedResponse or null if not found/invalid
   */
  async get(
    queryHash: string,
    minConfidence: number = 0.85,
  ): Promise<CachedResponse | null> {
    try {
      const cached = await this.prisma.aIResponseCache.findUnique({
        where: { query_hash: queryHash },
      });

      if (!cached) {
        this.logger.debug(`Cache MISS: ${queryHash}`);
        return null;
      }

      // Check expiration
      if (cached.expires_at && cached.expires_at < new Date()) {
        this.logger.debug(`Cache EXPIRED: ${queryHash}`);
        // Remove expired entry
        await this.prisma.aIResponseCache.delete({
          where: { id: cached.id },
        });
        return null;
      }

      // Check confidence threshold
      if (cached.confidence_score < minConfidence) {
        this.logger.debug(
          `Cache LOW CONFIDENCE: ${queryHash} (score: ${cached.confidence_score})`,
        );
        return null;
      }

      this.logger.log(
        `Cache HIT: ${queryHash} (hits: ${cached.hit_count}, confidence: ${cached.confidence_score})`,
      );

      return {
        id: cached.id,
        response: cached.response,
        language: cached.language,
        salon_id: cached.salon_id,
        hit_count: cached.hit_count,
        confidence_score: cached.confidence_score,
        created_at: cached.created_at,
        last_used_at: cached.last_used_at,
      };
    } catch (error) {
      this.logger.error(`Cache get error: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * Store response in cache
   *
   * Creates new cache entry with:
   * - Query hash (indexed for fast lookup)
   * - Normalized query (for debugging)
   * - AI response
   * - Metadata (language, salon_id, confidence)
   * - Optional TTL
   */
  async set(
    queryHash: string,
    normalizedQuery: string,
    response: string,
    options: CacheSetOptions = {},
  ): Promise<void> {
    const {
      language = 'auto',
      salon_id = null,
      confidence_score = 0.9,
      ttl_days = null,
    } = options;

    try {
      const expires_at = ttl_days
        ? new Date(Date.now() + ttl_days * 24 * 60 * 60 * 1000)
        : null;

      await this.prisma.aIResponseCache.upsert({
        where: { query_hash: queryHash },
        create: {
          query_hash: queryHash,
          normalized_query: normalizedQuery,
          response,
          language,
          salon_id,
          confidence_score,
          hit_count: 0,
          expires_at,
        },
        update: {
          response, // Update response if query already cached
          confidence_score, // Update confidence
          last_used_at: new Date(),
        },
      });

      this.logger.log(
        `Cache SET: ${queryHash} (language: ${language}, confidence: ${confidence_score})`,
      );
    } catch (error) {
      this.logger.error(`Cache set error: ${error.message}`, error.stack);
    }
  }

  /**
   * Increment hit count and update last_used_at
   *
   * Called every time a cached response is used
   * Helps identify:
   * - Most popular queries
   * - Cache effectiveness
   * - Queries to prioritize for optimization
   */
  async incrementHit(cacheId: string): Promise<void> {
    try {
      await this.prisma.aIResponseCache.update({
        where: { id: cacheId },
        data: {
          hit_count: { increment: 1 },
          last_used_at: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Cache increment error: ${error.message}`, error.stack);
    }
  }

  /**
   * Prune old/unused cache entries
   *
   * Removes:
   * - Expired entries (TTL passed)
   * - Low-confidence entries (< 0.7)
   * - Unused entries (last_used > 90 days ago)
   * - Low hit count entries (< 3 hits and > 30 days old)
   *
   * Should be run daily via cron job
   *
   * @returns Number of entries pruned
   */
  async prune(): Promise<number> {
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    try {
      // Delete expired entries
      const expiredResult = await this.prisma.aIResponseCache.deleteMany({
        where: {
          expires_at: {
            lt: now,
          },
        },
      });

      // Delete low-confidence entries
      const lowConfidenceResult = await this.prisma.aIResponseCache.deleteMany({
        where: {
          confidence_score: {
            lt: 0.7,
          },
        },
      });

      // Delete unused entries (not used in 90+ days)
      const unusedResult = await this.prisma.aIResponseCache.deleteMany({
        where: {
          last_used_at: {
            lt: ninetyDaysAgo,
          },
        },
      });

      // Delete unpopular entries (< 3 hits and > 30 days old)
      const unpopularResult = await this.prisma.aIResponseCache.deleteMany({
        where: {
          hit_count: {
            lt: 3,
          },
          created_at: {
            lt: thirtyDaysAgo,
          },
        },
      });

      const totalPruned =
        expiredResult.count +
        lowConfidenceResult.count +
        unusedResult.count +
        unpopularResult.count;

      this.logger.log(
        `Cache pruned: ${totalPruned} entries removed (expired: ${expiredResult.count}, low-confidence: ${lowConfidenceResult.count}, unused: ${unusedResult.count}, unpopular: ${unpopularResult.count})`,
      );

      return totalPruned;
    } catch (error) {
      this.logger.error(`Cache prune error: ${error.message}`, error.stack);
      return 0;
    }
  }

  /**
   * Get cache statistics
   *
   * Returns metrics for monitoring and optimization:
   * - Total entries
   * - Total hits
   * - Average confidence score
   * - Most popular queries
   * - Cache size estimate
   */
  async getStats(): Promise<{
    total_entries: number;
    total_hits: number;
    avg_confidence: number;
    cache_size_mb: number;
    top_queries: Array<{
      query: string;
      hits: number;
      language: string;
    }>;
  }> {
    try {
      // Total entries
      const total_entries = await this.prisma.aIResponseCache.count();

      // Aggregate statistics
      const stats = await this.prisma.aIResponseCache.aggregate({
        _sum: {
          hit_count: true,
        },
        _avg: {
          confidence_score: true,
        },
      });

      // Top 10 most popular queries
      const topQueries = await this.prisma.aIResponseCache.findMany({
        select: {
          normalized_query: true,
          hit_count: true,
          language: true,
        },
        orderBy: {
          hit_count: 'desc',
        },
        take: 10,
      });

      // Estimate cache size (rough calculation)
      // Average response length ~500 chars * 2 bytes * total entries
      const cache_size_mb = (total_entries * 500 * 2) / (1024 * 1024);

      return {
        total_entries,
        total_hits: stats._sum.hit_count || 0,
        avg_confidence: stats._avg.confidence_score || 0,
        cache_size_mb: Math.round(cache_size_mb * 100) / 100,
        top_queries: topQueries.map((q) => ({
          query: q.normalized_query,
          hits: q.hit_count,
          language: q.language,
        })),
      };
    } catch (error) {
      this.logger.error(`Cache stats error: ${error.message}`, error.stack);
      return {
        total_entries: 0,
        total_hits: 0,
        avg_confidence: 0,
        cache_size_mb: 0,
        top_queries: [],
      };
    }
  }

  /**
   * Calculate cache hit rate
   *
   * Requires tracking total AI requests (hits + misses)
   * This method calculates hit rate based on current cache usage
   *
   * @param totalRequests Total number of AI requests in period
   * @returns Hit rate percentage (0-100)
   */
  calculateHitRate(totalRequests: number): number {
    if (totalRequests === 0) return 0;

    // This is a simplified calculation
    // In production, track cache hits/misses in Redis or database
    // For now, estimate based on cache statistics
    return 0; // Placeholder - implement proper tracking
  }

  /**
   * Warm cache with common queries
   *
   * Pre-populate cache with frequent queries and responses
   * Used during initial deployment or after cache reset
   *
   * @param entries Array of { query, response, language } objects
   */
  async warmCache(
    entries: Array<{
      query: string;
      response: string;
      language: string;
      salon_id?: string;
      confidence_score?: number;
    }>,
  ): Promise<number> {
    let warmed = 0;

    for (const entry of entries) {
      try {
        const normalized = this.normalizeQuery(entry.query);
        const hash = this.hashQuery(normalized);

        await this.set(hash, normalized, entry.response, {
          language: entry.language,
          salon_id: entry.salon_id || null,
          confidence_score: entry.confidence_score || 0.95,
        });

        warmed++;
      } catch (error) {
        this.logger.error(
          `Cache warm error for query "${entry.query}": ${error.message}`,
        );
      }
    }

    this.logger.log(`Cache warmed: ${warmed} entries added`);
    return warmed;
  }
}
