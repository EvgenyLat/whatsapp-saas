/**
 * Session Context Service Interface
 *
 * Manages conversation state across multiple interactions using Redis.
 * Handles context preservation, expiry, and recovery.
 *
 * @module contracts/session-context
 * @see spec.md FR-005 Session Context Management
 */

import { BookingContext, Language, ConversationState } from '../types';

/**
 * Service for managing session context
 */
export interface ISessionContextService {
  /**
   * Save or update session context
   *
   * @param sessionId - Unique session identifier
   * @param context - Booking context to save
   * @returns Promise resolving when saved
   *
   * @example
   * ```typescript
   * await sessionContext.save('session-123', {
   *   sessionId: 'session-123',
   *   customerId: '+1234567890',
   *   salonId: 'salon-456',
   *   originalIntent: { service: 'haircut', time: '15:00' },
   *   language: 'ru',
   *   state: 'choice_presented'
   * });
   * ```
   *
   * @redis Key: `session:${customerId}:${salonId}`
   * @ttl 30 minutes, extends on each save
   * @performance <10ms Redis SET operation
   */
  save(sessionId: string, context: BookingContext): Promise<void>;

  /**
   * Retrieve session context
   *
   * @param sessionId - Session identifier to retrieve
   * @returns Context if exists and not expired, null otherwise
   *
   * @example
   * ```typescript
   * const context = await sessionContext.get('session-123');
   * if (context) {
   *   console.log(`Resuming conversation in ${context.language}`);
   * }
   * ```
   *
   * @performance <10ms Redis GET operation
   */
  get(sessionId: string): Promise<BookingContext | null>;

  /**
   * Get context by customer and salon
   *
   * @param customerId - WhatsApp phone number
   * @param salonId - Salon identifier
   * @returns Most recent context if exists
   *
   * @example
   * ```typescript
   * const context = await sessionContext.getByCustomer(
   *   '+1234567890',
   *   'salon-456'
   * );
   * ```
   */
  getByCustomer(
    customerId: string,
    salonId: string
  ): Promise<BookingContext | null>;

  /**
   * Extend session TTL
   *
   * @param sessionId - Session to extend
   * @param additionalSeconds - Seconds to add (default: 900)
   * @returns True if extended, false if not found
   *
   * @example
   * ```typescript
   * const extended = await sessionContext.extend('session-123');
   * // Adds 15 more minutes to session
   * ```
   *
   * @constraint Maximum total lifetime: 1 hour
   */
  extend(sessionId: string, additionalSeconds?: number): Promise<boolean>;

  /**
   * Update conversation state
   *
   * @param sessionId - Session to update
   * @param state - New conversation state
   * @returns Updated context
   *
   * @example
   * ```typescript
   * await sessionContext.updateState(
   *   'session-123',
   *   'slots_shown'
   * );
   * ```
   */
  updateState(
    sessionId: string,
    state: ConversationState
  ): Promise<BookingContext | null>;

  /**
   * Add a choice to the navigation history
   *
   * @param sessionId - Session to update
   * @param choice - Choice made by user
   * @returns Updated context
   *
   * @example
   * ```typescript
   * await sessionContext.addChoice('session-123', {
   *   choiceId: 'same_day_diff_time',
   *   selectedAt: new Date(),
   *   resultShown: false
   * });
   * ```
   *
   * @constraint Maximum 10 choices stored
   */
  addChoice(
    sessionId: string,
    choice: ChoiceRecord
  ): Promise<BookingContext | null>;

  /**
   * Delete session context
   *
   * @param sessionId - Session to delete
   * @returns True if deleted, false if not found
   *
   * @example
   * ```typescript
   * await sessionContext.delete('session-123');
   * ```
   */
  delete(sessionId: string): Promise<boolean>;

  /**
   * Check if session exists and is valid
   *
   * @param sessionId - Session to check
   * @returns True if exists and not expired
   */
  exists(sessionId: string): Promise<boolean>;

  /**
   * Get session metadata without full context
   *
   * @param sessionId - Session to query
   * @returns Lightweight metadata
   *
   * @example
   * ```typescript
   * const meta = await sessionContext.getMetadata('session-123');
   * // { exists: true, ttl: 1200, state: 'choice_presented' }
   * ```
   */
  getMetadata(sessionId: string): Promise<SessionMetadata | null>;

  /**
   * Attempt to recover context from message history
   *
   * @param customerId - Customer phone number
   * @param messages - Recent WhatsApp messages
   * @returns Reconstructed context if possible
   *
   * @fallback Used when Redis is unavailable
   */
  recoverFromHistory(
    customerId: string,
    messages: WhatsAppMessage[]
  ): Promise<BookingContext | null>;

  /**
   * Clean up expired sessions
   *
   * @returns Number of sessions cleaned
   *
   * @note Usually handled by Redis TTL, but useful for maintenance
   */
  cleanup(): Promise<number>;

  /**
   * Get active session count
   *
   * @param salonId - Optional salon filter
   * @returns Number of active sessions
   */
  getActiveCount(salonId?: string): Promise<number>;
}

/**
 * Choice record for navigation history
 */
export interface ChoiceRecord {
  /** Choice identifier */
  choiceId: string;

  /** When choice was selected */
  selectedAt: Date;

  /** Whether results were shown */
  resultShown: boolean;

  /** Optional result metadata */
  resultMetadata?: Record<string, any>;
}

/**
 * Lightweight session metadata
 */
export interface SessionMetadata {
  /** Whether session exists */
  exists: boolean;

  /** Time to live in seconds */
  ttl?: number;

  /** Current conversation state */
  state?: ConversationState;

  /** Session creation time */
  createdAt?: Date;

  /** Last interaction time */
  lastInteraction?: Date;

  /** Number of messages */
  messageCount?: number;
}

/**
 * WhatsApp message for recovery
 */
export interface WhatsAppMessage {
  /** Message ID */
  id: string;

  /** Message type */
  type: 'text' | 'interactive';

  /** Message text */
  text?: string;

  /** Button click ID */
  buttonId?: string;

  /** Timestamp */
  timestamp: Date;

  /** Direction */
  direction: 'inbound' | 'outbound';
}

/**
 * Service configuration
 */
export interface SessionContextConfig {
  /** Redis connection string */
  redisUrl?: string;

  /** Default TTL in seconds (default: 1800) */
  defaultTTL?: number;

  /** Maximum TTL in seconds (default: 3600) */
  maxTTL?: number;

  /** TTL extension on interaction (default: 900) */
  extensionTTL?: number;

  /** Maximum choices to store (default: 10) */
  maxChoices?: number;

  /** Enable recovery from history */
  enableRecovery?: boolean;

  /** Key prefix for Redis */
  keyPrefix?: string;

  /** Enable debug logging */
  debug?: boolean;
}