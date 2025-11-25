/**
 * Enum and Constant Type Definitions
 * WhatsApp SaaS Platform
 *
 * This file contains all enum types matching the backend Prisma schema.
 * These provide type-safe constants for status values, message types, and other categorical data.
 */

/**
 * Booking status enumeration
 * Represents the lifecycle states of a booking/appointment
 */

/**
 * Union type for booking status (useful for discriminated unions)
 */
export type BookingStatusType = `${BookingStatus}`;

/**
 * Message direction enumeration
 * Indicates whether a message was sent or received
 */
export enum MessageDirection {
  /** Message received from customer */
  INBOUND = 'INBOUND',
  /** Message sent to customer */
  OUTBOUND = 'OUTBOUND',
}

/**
 * Union type for message direction
 */
export type MessageDirectionType = `${MessageDirection}`;

/**
 * Message type enumeration
 * Represents the type of content in a WhatsApp message
 */
export enum MessageType {
  /** Plain text message */
  TEXT = 'TEXT',
  /** WhatsApp template message */
  TEMPLATE = 'TEMPLATE',
  /** Image file */
  IMAGE = 'IMAGE',
  /** Document file (PDF, DOCX, etc.) */
  DOCUMENT = 'DOCUMENT',
  /** Audio file or voice message */
  AUDIO = 'AUDIO',
  /** Video file */
  VIDEO = 'VIDEO',
}

/**
 * Union type for message type
 */
export type MessageTypeType = `${MessageType}`;

/**
 * Message status enumeration
 * Tracks the delivery status of outbound messages
 */
export enum MessageStatus {
  /** Message has been sent to WhatsApp */
  SENT = 'SENT',
  /** Message has been delivered to recipient */
  DELIVERED = 'DELIVERED',
  /** Message has been read by recipient */
  READ = 'READ',
  /** Message delivery failed */
  FAILED = 'FAILED',
}

/**
 * Union type for message status
 */
export type MessageStatusType = `${MessageStatus}`;

/**
 * Template status enumeration
 * Represents approval status of WhatsApp message templates
 */
export enum TemplateStatus {
  /** Template is awaiting approval from WhatsApp */
  PENDING = 'PENDING',
  /** Template has been approved and can be used */
  APPROVED = 'APPROVED',
  /** Template was rejected by WhatsApp */
  REJECTED = 'REJECTED',
}

/**
 * Union type for template status
 */
export type TemplateStatusType = `${TemplateStatus}`;

/**
 * Conversation status enumeration
 * Tracks the state of customer conversations
 */
export enum ConversationStatus {
  /** Conversation is currently active */
  ACTIVE = 'ACTIVE',
  /** Conversation window has expired (24hr limit) */
  EXPIRED = 'EXPIRED',
  /** Customer or salon has blocked the conversation */
  BLOCKED = 'BLOCKED',
}

/**
 * Union type for conversation status
 */
export type ConversationStatusType = `${ConversationStatus}`;

/**
 * User role enumeration
 * Defines permission levels in the system
 */
export enum UserRole {
  /** Super administrator with full system access */
  SUPER_ADMIN = 'SUPER_ADMIN',
  /** Salon owner/admin with full access to their salon */
  SALON_ADMIN = 'SALON_ADMIN',
  /** Staff member with limited permissions */
  STAFF = 'STAFF',
}

/**
 * Union type for user role
 */
export type UserRoleType = `${UserRole}`;

/**
 * Salon status enumeration
 * Represents the operational status of a salon
 */
export enum SalonStatus {
  /** Salon is active and operational */
  ACTIVE = 'ACTIVE',
  /** Salon is temporarily inactive */
  INACTIVE = 'INACTIVE',
  /** Salon has been suspended (e.g., for policy violations) */
  SUSPENDED = 'SUSPENDED',
}

/**
 * Union type for salon status
 */
export type SalonStatusType = `${SalonStatus}`;

/**
 * Subscription plan enumeration
 * Defines the pricing tiers
 */
export enum PlanType {
  /** Free trial plan */
  FREE = 'FREE',
  /** Basic paid plan */
  BASIC = 'BASIC',
  /** Premium plan with additional features */
  PREMIUM = 'PREMIUM',
  /** Enterprise plan with custom features */
  ENTERPRISE = 'ENTERPRISE',
}

/**
 * Union type for plan type
 */
export type PlanTypeType = `${PlanType}`;

/**
 * AI model enumeration
 * Supported AI models for conversation handling
 */
export enum AIModel {
  /** GPT-4 model */
  GPT_4 = 'gpt-4',
  /** GPT-4 Turbo model */
  GPT_4_TURBO = 'gpt-4-turbo',
  /** GPT-3.5 Turbo model */
  GPT_3_5_TURBO = 'gpt-3.5-turbo',
}

/**
 * Union type for AI model
 */
export type AIModelType = `${AIModel}`;

/**
 * Webhook log status
 * Tracks processing status of webhook events
 */
export enum WebhookStatus {
  /** Webhook processed successfully */
  SUCCESS = 'SUCCESS',
  /** Webhook processing failed */
  FAILED = 'FAILED',
  /** Webhook is being processed */
  PROCESSING = 'PROCESSING',
  /** Webhook is queued for processing */
  QUEUED = 'QUEUED',
}

/**
 * Union type for webhook status
 */
export type WebhookStatusType = `${WebhookStatus}`;

/**
 * Template language codes
 * Supported languages for WhatsApp templates
 */
export const TEMPLATE_LANGUAGES = {
  RUSSIAN: 'ru',
  ENGLISH: 'en',
  SPANISH: 'es',
  GERMAN: 'de',
  FRENCH: 'fr',
} as const;

/**
 * Template language type
 */
export type TemplateLanguage = typeof TEMPLATE_LANGUAGES[keyof typeof TEMPLATE_LANGUAGES];

/**
 * Days of week for business hours
 */
export const WEEKDAYS = {
  MONDAY: 'monday',
  TUESDAY: 'tuesday',
  WEDNESDAY: 'wednesday',
  THURSDAY: 'thursday',
  FRIDAY: 'friday',
  SATURDAY: 'saturday',
  SUNDAY: 'sunday',
} as const;

/**
 * Weekday type
 */
export type Weekday = typeof WEEKDAYS[keyof typeof WEEKDAYS];

/**
 * Color variants for UI components
 */
export const COLOR_VARIANTS = {
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
  SUCCESS: 'success',
  DANGER: 'danger',
  WARNING: 'warning',
  INFO: 'info',
} as const;

/**
 * Color variant type
 */
export type ColorVariant = typeof COLOR_VARIANTS[keyof typeof COLOR_VARIANTS];

/**
 * Size variants for UI components
 */
export const SIZE_VARIANTS = {
  XS: 'xs',
  SM: 'sm',
  MD: 'md',
  LG: 'lg',
  XL: 'xl',
} as const;

/**
 * Size variant type
 */
export type SizeVariant = typeof SIZE_VARIANTS[keyof typeof SIZE_VARIANTS];

/**
 * Service category enumeration
 * Represents the types of services offered by salons
 */
export enum ServiceCategory {
  /** Haircut services */
  HAIRCUT = 'HAIRCUT',
  /** Hair coloring services */
  COLORING = 'COLORING',
  /** Hair styling services */
  STYLING = 'STYLING',
  /** Manicure services */
  MANICURE = 'MANICURE',
  /** Pedicure services */
  PEDICURE = 'PEDICURE',
  /** Facial treatments */
  FACIAL = 'FACIAL',
  /** Massage services */
  MASSAGE = 'MASSAGE',
  /** Makeup services */
  MAKEUP = 'MAKEUP',
  /** Waxing services */
  WAXING = 'WAXING',
  /** Threading services */
  THREADING = 'THREADING',
  /** Tattoo services */
  TATTOO = 'TATTOO',
  /** Piercing services */
  PIERCING = 'PIERCING',
}

/**
 * Union type for service category
 */
export type ServiceCategoryType = `${ServiceCategory}`;

export enum BookingStatus {
  /** Booking is pending confirmation */
  PENDING = 'PENDING',
  /** Booking is confirmed and scheduled */
  CONFIRMED = 'CONFIRMED',
  /** Booking has been cancelled by customer or salon */
  CANCELLED = 'CANCELLED',
  /** Service has been completed */
  COMPLETED = 'COMPLETED',
  /** Customer did not show up for the appointment */
  NO_SHOW = 'NO_SHOW',
}
