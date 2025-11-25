/**
 * Core Domain Model Type Definitions
 * WhatsApp SaaS Platform
 *
 * This file contains all domain models that match the backend Prisma schema.
 * Field names are kept in sync with the database schema for consistency.
 */

import type {
  BookingStatus,
  MessageDirection,
  MessageType,
  MessageStatus,
  TemplateStatus,
  ConversationStatus,
  UserRole,
  SalonStatus,
  PlanType,
  AIModel,
  Weekday,
} from './enums';

/**
 * Base model interface with common timestamp fields
 * All entities extend this interface for consistent timestamp handling
 */
export interface BaseModel {
  /** Unique identifier (UUID v4) */
  readonly id: string;
  /** Timestamp when the record was created */
  readonly created_at: string | Date;
  /** Timestamp when the record was last updated */
  readonly updated_at: string | Date;
}

/**
 * Salon (Tenant) Model
 * Represents a salon business using the platform
 *
 * Each salon is a tenant with isolated data and WhatsApp integration
 */
export interface Salon extends BaseModel {
  /** Unique identifier */
  readonly id: string;
  /** Salon business name */
  name: string;
  /** Physical address of the salon */
  address?: string | null;
  /** WhatsApp Business Phone Number ID from Meta */
  phone_number_id: string;
  /** WhatsApp Business API access token (encrypted) */
  access_token: string;
  /** Whether the salon is currently active */
  is_active: boolean;
  /** Working hours start time in HH:MM format */
  working_hours_start: string;
  /** Working hours end time in HH:MM format */
  working_hours_end: string;
  /** Slot duration in minutes for bookings */
  slot_duration_minutes: number;
  /** Timestamp when salon was created */
  readonly created_at: string | Date;
  /** Timestamp when salon was last updated */
  readonly updated_at: string | Date;
}

/**
 * Salon with relationships
 * Extended version that includes related entities
 */
export interface SalonWithRelations extends Salon {
  /** All bookings for this salon */
  bookings?: Booking[];
  /** All messages for this salon */
  messages?: Message[];
  /** All message templates for this salon */
  templates?: Template[];
}

/**
 * Booking (Appointment) Model
 * Represents a customer appointment at a salon
 */
export interface Booking extends BaseModel {
  /** Unique identifier */
  readonly id: string;
  /** Unique booking reference code (visible to customers) */
  booking_code: string;
  /** Foreign key to salon */
  salon_id: string;
  /** Customer's phone number (international format) */
  customer_phone: string;
  /** Customer's full name */
  customer_name: string;
  /** Service type or description */
  service: string;
  /** Foreign key to service (if using service model) */
  service_id?: string;
  /** Foreign key to master/staff member */
  master_id?: string;
  /** Appointment start timestamp */
  start_ts: string | Date;
  /** Current booking status */
  status: BookingStatus;
  /** Timestamp when booking was created */
  readonly created_at: string | Date;
  /** Timestamp when booking was last updated */
  readonly updated_at: string | Date;
}

/**
 * Booking with relationships
 * Extended version that includes related entities
 */
export interface BookingWithRelations extends Booking {
  /** The salon this booking belongs to */
  salon?: Salon;
  /** The master/staff member assigned to this booking */
  master?: Master;
  /** The service for this booking */
  serviceDetails?: Service;
}

/**
 * Message Model
 * Represents a WhatsApp message (inbound or outbound)
 */
export interface Message {
  /** Unique identifier */
  readonly id: string;
  /** Foreign key to salon */
  salon_id: string;
  /** Message direction (inbound/outbound) */
  direction: MessageDirection;
  /** Optional conversation grouping ID */
  conversation_id: string | null;
  /** Customer's phone number */
  phone_number: string;
  /** Type of message content */
  message_type: MessageType;
  /** Message content (text or media URL) */
  content: string;
  /** WhatsApp message ID from Meta API */
  whatsapp_id: string | null;
  /** Message delivery status */
  status: MessageStatus;
  /** Cost in USD for this message */
  cost: number | null;
  /** Timestamp when message was created/sent */
  readonly created_at: string | Date;
}

/**
 * Message with relationships
 * Extended version that includes related entities
 */
export interface MessageWithRelations extends Message {
  /** The salon this message belongs to */
  salon?: Salon;
}

/**
 * Template Model
 * Represents a WhatsApp message template
 */
export interface Template extends BaseModel {
  /** Unique identifier */
  readonly id: string;
  /** Foreign key to salon */
  salon_id: string;
  /** Template name (unique per salon and language) */
  name: string;
  /** Template language code */
  language: string;
  /** Template category (MARKETING, UTILITY, AUTHENTICATION) */
  category: string;
  /** Template approval status */
  status: TemplateStatus;
  /** Optional header */
  header?: {
    type: 'text' | 'image';
    content: string;
  };
  /** Message body with variable placeholders */
  body: string;
  /** Optional footer text */
  footer?: string;
  /** Optional buttons */
  buttons?: Array<{
    type: 'url' | 'phone' | 'quick_reply';
    text: string;
    value?: string;
  }>;
  /** Usage statistics */
  stats?: {
    totalSent: number;
    deliveryRate: number;
    readRate: number;
    responseRate: number;
  };
  /** Timestamp when template was created */
  readonly created_at: string | Date;
  /** Timestamp when template was last updated */
  readonly updated_at: string | Date;
}

/**
 * Template with relationships
 * Extended version that includes related entities
 */
export interface TemplateWithRelations extends Template {
  /** The salon this template belongs to */
  salon?: Salon;
}

/**
 * Conversation Model
 * Represents a conversation thread with a customer
 */
export interface Conversation {
  /** Unique identifier */
  readonly id: string;
  /** Foreign key to salon */
  salon_id: string;
  /** Customer's phone number */
  phone_number: string;
  /** Current conversation status */
  status: ConversationStatus;
  /** Timestamp when conversation started */
  readonly started_at: string | Date;
  /** Timestamp of last message in conversation */
  readonly last_message_at: string | Date;
  /** Total number of messages in conversation */
  message_count: number;
  /** Total cost of conversation in USD */
  cost: number;
}

/**
 * Webhook Log Model
 * Records incoming webhook events for debugging and auditing
 */
export interface WebhookLog {
  /** Unique identifier */
  readonly id: string;
  /** Optional foreign key to salon (if event is salon-specific) */
  salon_id: string | null;
  /** Type of webhook event */
  event_type: string;
  /** Full webhook payload (JSON) */
  payload: Record<string, any>;
  /** Processing status */
  status: string;
  /** Error message if processing failed */
  error: string | null;
  /** Timestamp when webhook was received */
  readonly created_at: string | Date;
}

/**
 * AI Conversation Model
 * Tracks AI-powered conversation sessions
 */
export interface AIConversation {
  /** Unique identifier */
  readonly id: string;
  /** Foreign key to salon */
  salon_id: string;
  /** Customer's phone number */
  phone_number: string;
  /** Related conversation ID */
  conversation_id: string;
  /** AI model being used */
  ai_model: AIModel | string;
  /** Total tokens consumed */
  total_tokens: number;
  /** Total cost in USD */
  total_cost: number;
  /** Total message count */
  message_count: number;
  /** Timestamp of last activity */
  readonly last_activity: string | Date;
  /** Timestamp when AI conversation was created */
  readonly created_at: string | Date;
}

/**
 * AI Message Model
 * Individual AI conversation messages with metrics
 */
export interface AIMessage {
  /** Unique identifier */
  readonly id: string;
  /** Foreign key to AI conversation */
  conversation_id: string;
  /** Foreign key to salon */
  salon_id: string;
  /** Customer's phone number */
  phone_number: string;
  /** Message direction */
  direction: MessageDirection;
  /** Message content */
  content: string;
  /** AI model used for this message */
  ai_model: string | null;
  /** Tokens used for this message */
  tokens_used: number | null;
  /** Cost for this message in USD */
  cost: number | null;
  /** Response time in milliseconds */
  response_time_ms: number | null;
  /** Timestamp when message was created */
  readonly created_at: string | Date;
}

/**
 * User Model
 * Represents a user account (admin, salon owner, staff)
 */
export interface User {
  /** Unique identifier */
  readonly id: string;
  /** User's email address (unique) */
  email: string;
  /** User's first name */
  firstName?: string;
  /** User's last name */
  lastName?: string;
  /** User's role in the system */
  role: UserRole | string;
  /** Whether email is verified */
  isEmailVerified?: boolean;
  /** Optional foreign key to salon (null for super admins) */
  salon_id?: string | null;
  /** Optional avatar URL */
  avatar?: string | null;
  /** Timestamp when user was created */
  readonly created_at?: string | Date;
  /** Timestamp when user was last updated */
  readonly updated_at?: string | Date;
}

/**
 * User with relationships
 * Extended version that includes related entities
 */
export interface UserWithRelations extends User {
  /** The salon this user belongs to (if any) */
  salon?: Salon;
}

/**
 * Dashboard Statistics
 * Aggregated metrics for the dashboard view
 */
export interface DashboardStats {
  /** Total number of bookings (all time) */
  totalBookings: number;
  /** Number of bookings today */
  todayBookings: number;
  /** Number of active chat conversations */
  activeChats: number;
  /** Average response rate percentage (0-100) */
  responseRate: number;
  /** Breakdown of bookings by status */
  bookingsByStatus: {
    [BookingStatus.PENDING]: number;
    [BookingStatus.CONFIRMED]: number;
    [BookingStatus.CANCELLED]: number;
    [BookingStatus.COMPLETED]: number;
    [BookingStatus.NO_SHOW]: number;
  };
  /** Recent activity metrics */
  recentActivity: {
    /** Bookings in last 7 days */
    bookings: number;
    /** Messages in last 7 days */
    messages: number;
    /** New customers in last 7 days */
    newCustomers: number;
  };
  /** Trend indicators (percentage change) */
  trends: {
    /** Percentage change in bookings vs previous period */
    bookingsChange: number;
    /** Percentage change in messages vs previous period */
    messagesChange: number;
    /** Percentage change in response rate vs previous period */
    responseRateChange: number;
  };
}

/**
 * Analytics Data
 * Detailed analytics data for charts and reports
 */
export interface AnalyticsData {
  /** Booking volume over time */
  bookingsOverTime: Array<{
    /** Date in ISO format */
    date: string;
    /** Number of bookings */
    count: number;
  }>;
  /** Message volume over time (split by direction) */
  messageVolume: Array<{
    /** Date in ISO format */
    date: string;
    /** Inbound message count */
    inbound: number;
    /** Outbound message count */
    outbound: number;
  }>;
  /** Most popular services */
  topServices: Array<{
    /** Service name */
    service: string;
    /** Number of bookings */
    count: number;
    /** Percentage of total bookings */
    percentage: number;
  }>;
  /** Peak booking hours */
  peakHours: Array<{
    /** Hour of day (0-23) */
    hour: number;
    /** Number of bookings */
    count: number;
  }>;
}

/**
 * Business Hours Configuration
 * Defines salon operating hours for each day
 */
export interface BusinessHours {
  /** Hours configuration for each weekday */
  [key: string]: {
    /** Opening time (HH:mm format) */
    open: string;
    /** Closing time (HH:mm format) */
    close: string;
    /** Whether the salon is closed this day */
    closed?: boolean;
  };
}

/**
 * Salon Settings
 * Extended salon configuration with business details
 */
export interface SalonSettings extends Salon {
  /** Business contact email */
  email: string;
  /** Physical address */
  address: string | null;
  /** City */
  city: string | null;
  /** State/Province */
  state: string | null;
  /** Postal/ZIP code */
  zipCode: string | null;
  /** Operating hours */
  businessHours: BusinessHours | null;
  /** List of services offered */
  services: string[] | null;
  /** Current operational status */
  status: SalonStatus;
  /** Subscription plan */
  plan: PlanType | null;
}

/**
 * Customer Profile
 * Aggregated customer information
 */
export interface CustomerProfile {
  /** Customer's phone number (primary identifier) */
  phone_number: string;
  /** Customer's name (from most recent booking/message) */
  name: string | null;
  /** Total number of bookings */
  total_bookings: number;
  /** Total number of messages */
  total_messages: number;
  /** Timestamp of first interaction */
  first_seen: string | Date;
  /** Timestamp of last interaction */
  last_seen: string | Date;
  /** Customer's most booked service */
  favorite_service: string | null;
  /** Total amount spent (if available) */
  lifetime_value: number | null;
}

/**
 * Time Slot for breaks and availability
 */
export interface TimeSlot {
  /** Start time in HH:MM format */
  start: string;
  /** End time in HH:MM format */
  end: string;
}

/**
 * Day Schedule for working hours
 */
export interface DaySchedule {
  /** Whether the master works this day */
  enabled: boolean;
  /** Start time in HH:MM format */
  start?: string;
  /** End time in HH:MM format */
  end?: string;
  /** Break times */
  breaks?: TimeSlot[];
}

/**
 * Working Hours for a week
 */
export interface WorkingHours {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

/**
 * Master/Staff Member Specialization
 */
export type MasterSpecialization =
  | 'HAIRSTYLIST'
  | 'MAKEUP_ARTIST'
  | 'NAIL_TECHNICIAN'
  | 'MASSAGE_THERAPIST'
  | 'BEAUTICIAN'
  | 'BARBER'
  | 'ESTHETICIAN'
  | 'OTHER';

/**
 * Master/Staff Member Model
 * Represents a staff member/master working at a salon
 */
export interface Master extends BaseModel {
  /** Unique identifier */
  readonly id: string;
  /** Foreign key to salon */
  salon_id: string;
  /** Optional foreign key to user account */
  user_id?: string | null;
  /** Master's full name */
  name: string;
  /** Phone number (international format) */
  phone?: string | null;
  /** Email address */
  email?: string | null;
  /** Array of specializations */
  specialization: string[];
  /** Weekly working hours schedule */
  working_hours: WorkingHours;
  /** Whether the master is currently active */
  is_active: boolean;
  /** Timestamp when master was created */
  readonly created_at: string | Date;
  /** Timestamp when master was last updated */
  readonly updated_at: string | Date;
}

/**
 * Master List Item
 * Simplified master data for list views
 */
export interface MasterListItem {
  /** Unique identifier */
  id: string;
  /** Master's name */
  name: string;
  /** Phone number */
  phone?: string | null;
  /** Email address */
  email?: string | null;
  /** Specializations */
  specialization: string[];
  /** Active status */
  is_active: boolean;
  /** Working days (derived from working_hours) */
  workingDays?: string[];
}

/**
 * Master Availability Response
 */
export interface MasterAvailability {
  /** Master ID */
  master_id: string;
  /** Date in YYYY-MM-DD format */
  date: string;
  /** Available time slots */
  available_slots: TimeSlot[];
  /** Booked time slots */
  booked_slots: Array<{
    start: string;
    end: string;
    booking_id: string;
    customer_name: string;
    service: string;
  }>;
}

/**
 * Master Schedule Item
 */
export interface MasterScheduleItem {
  /** Date in YYYY-MM-DD format */
  date: string;
  /** Day of week */
  dayOfWeek: string;
  /** Whether master is available this day */
  isAvailable: boolean;
  /** Working hours for this day */
  workingHours?: {
    start: string;
    end: string;
  };
  /** Bookings for this day */
  bookings: Array<{
    id: string;
    customer_name: string;
    service: string;
    start_ts: string;
    end_ts: string;
    status: string;
  }>;
}

/**
 * Legacy Staff Member type alias
 * For backward compatibility - maps to Master
 */
export type StaffMember = Master;

/**
 * Legacy Staff List Item type alias
 * For backward compatibility - maps to MasterListItem
 */
export type StaffListItem = MasterListItem;

/**
 * Service Model
 * Represents a service offered by the salon
 */
export interface Service extends BaseModel {
  /** Unique identifier */
  readonly id: string;
  /** Foreign key to salon */
  salon_id: string;
  /** Service name */
  name: string;
  /** Service category (Haircut, Coloring, Treatment, Styling, etc.) */
  category: string;
  /** Service description */
  description: string | null;
  /** Duration in minutes */
  duration_minutes: number;
  /** Price in decimal format (e.g., "50.00" for $50) - can be string or number */
  price: string | number;
  /** Service active status */
  is_active: boolean;
  /** Timestamp when service was created */
  readonly created_at: string | Date;
  /** Timestamp when service was last updated */
  readonly updated_at: string | Date;
}

/**
 * Service List Item
 * Simplified service data for list views
 */
export interface ServiceListItem {
  /** Unique identifier */
  id: string;
  /** Service name */
  name: string;
  /** Category */
  category: string;
  /** Duration in minutes */
  duration_minutes: number;
  /** Price in decimal format (can be string or number) */
  price: string | number;
  /** Active status */
  is_active: boolean;
}

/**
 * Notification Model
 * System or user notifications
 */
export interface Notification {
  /** Unique identifier */
  readonly id: string;
  /** Foreign key to user */
  user_id: string;
  /** Notification title */
  title: string;
  /** Notification message */
  message: string;
  /** Notification type */
  type: 'info' | 'success' | 'warning' | 'error';
  /** Whether notification has been read */
  is_read: boolean;
  /** Optional action URL */
  action_url: string | null;
  /** Timestamp when notification was created */
  readonly created_at: string | Date;
}

/**
 * Export additional type aliases for convenience
 */
export type BookingId = string;
export type MessageId = string;
export type SalonId = string;
export type UserId = string;
export type ConversationId = string;
export type TemplateId = string;
export type PhoneNumber = string;
export type EmailAddress = string;
export type ISODateString = string;
export type UUID = string;
