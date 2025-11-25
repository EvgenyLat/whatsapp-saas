/**
 * API Request and Response Type Definitions
 * WhatsApp SaaS Platform
 *
 * This file contains all types related to API communication,
 * including request payloads, response structures, and error handling.
 */

import type {
  User,
  Salon,
  Booking,
  Message,
  Template,
  Conversation,
  DashboardStats,
  AnalyticsData,
  CustomerProfile,
} from './models';

import type {
  BookingStatus,
  MessageType,
  MessageDirection,
  TemplateStatus,
} from './enums';

/**
 * Standard API response wrapper
 * All API endpoints return this structure for consistency
 *
 * @template T - The type of data being returned
 */
export interface ApiResponse<T> {
  /** Indicates if the request was successful */
  success: boolean;
  /** The response data payload */
  data: T;
  /** Optional success message */
  message?: string;
  /** ISO timestamp of when the response was generated */
  timestamp: string;
}

/**
 * API error response structure
 * Returned when an error occurs during request processing
 */
export interface ApiError {
  /** Always false for error responses */
  success: false;
  /** Error details */
  error: {
    /** Error code (e.g., 'VALIDATION_ERROR', 'NOT_FOUND') */
    code: string;
    /** Human-readable error message */
    message: string;
    /** Additional error details (field-specific errors, stack trace, etc.) */
    details?: Record<string, any>;
    /** HTTP status code */
    statusCode?: number;
  };
  /** Optional error message at root level (for backward compatibility) */
  message?: string;
  /** ISO timestamp of when the error occurred */
  timestamp: string;
}

/**
 * Paginated API response
 * Used for list endpoints that support pagination
 *
 * @template T - The type of items in the list
 */
export interface PaginatedResponse<T> {
  /** Indicates if the request was successful */
  success: boolean;
  /** Array of items for the current page */
  data: T[];
  /** Pagination metadata */
  pagination: {
    /** Current page number (1-indexed) */
    page: number;
    /** Number of items per page */
    limit: number;
    /** Total number of items across all pages */
    total: number;
    /** Total number of pages */
    totalPages: number;
    /** Whether there is a next page */
    hasNext: boolean;
    /** Whether there is a previous page */
    hasPrev: boolean;
  };
  /** Optional message */
  message?: string;
  /** ISO timestamp of response */
  timestamp: string;
}

/**
 * Pagination query parameters
 * Used for requesting paginated data
 */
export interface PaginationParams {
  /** Page number (1-indexed) */
  page?: number;
  /** Number of items per page */
  limit?: number;
  /** Field to sort by */
  sortBy?: string;
  /** Sort order */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Date range filter parameters
 * Used for filtering data by date range
 */
export interface DateRangeParams {
  /** Start date (ISO string or Date) */
  startDate?: string | Date;
  /** End date (ISO string or Date) */
  endDate?: string | Date;
}

// ============================================================================
// Authentication API Types
// ============================================================================

/**
 * Login request payload
 */
export interface LoginRequest {
  /** User's email address */
  email: string;
  /** User's password */
  password: string;
  /** Optional: remember me flag for extended session */
  rememberMe?: boolean;
}

/**
 * Login response payload
 */
export interface LoginResponse {
  /** JWT access token */
  accessToken: string;
  /** JWT refresh token */
  refreshToken: string;
  /** Authenticated user data */
  user: User;
}

/**
 * Register request payload
 * Simplified to only require email and password
 */
export interface RegisterRequest {
  /** User's email address */
  email: string;
  /** User's password (min 8 characters) */
  password: string;
}

/**
 * Register response payload
 */
export interface RegisterResponse {
  /** JWT access token */
  accessToken: string;
  /** JWT refresh token */
  refreshToken: string;
  /** Newly created user data */
  user: User;
}

/**
 * Refresh token request
 */
export interface RefreshTokenRequest {
  /** Refresh token */
  refreshToken: string;
}

/**
 * Refresh token response
 */
export interface RefreshTokenResponse {
  /** New JWT access token */
  token: string;
  /** New refresh token */
  refreshToken: string;
  /** Token expiration time in seconds */
  expiresIn: number;
}

/**
 * Password reset request
 */
export interface PasswordResetRequest {
  /** User's email address */
  email: string;
}

/**
 * Password reset confirm request
 */
export interface PasswordResetConfirmRequest {
  /** Reset token from email */
  token: string;
  /** New password */
  password: string;
  /** Password confirmation */
  confirmPassword: string;
}

// ============================================================================
// Salon API Types
// ============================================================================

/**
 * Create salon request
 */
export interface CreateSalonRequest {
  /** Salon name */
  name: string;
  /** WhatsApp Business Phone Number ID */
  phone_number_id: string;
  /** WhatsApp Business API access token */
  access_token: string;
}

/**
 * Update salon request
 */
export interface UpdateSalonRequest {
  /** Salon name */
  name?: string;
  /** WhatsApp Business Phone Number ID */
  phone_number_id?: string;
  /** WhatsApp Business API access token */
  access_token?: string;
  /** Active status */
  is_active?: boolean;
}

/**
 * Get salons query parameters
 */
export interface GetSalonsParams extends PaginationParams {
  /** Filter by active status */
  is_active?: boolean;
  /** Search by name */
  search?: string;
}

// ============================================================================
// Booking API Types
// ============================================================================

/**
 * Create booking request
 */
export interface CreateBookingRequest {
  /** Salon ID (required) */
  salon_id: string;
  /** Customer's phone number (international format) */
  customer_phone: string;
  /** Customer's full name */
  customer_name: string;
  /** Service type or description */
  service: string;
  /** Appointment start time (ISO string) */
  start_ts: string | Date;
  /** Optional appointment end time (ISO string, auto-calculated if service_id provided) */
  end_ts?: string | Date;
  /** Optional foreign key to service (UUID string) */
  service_id?: string;
  /** Optional foreign key to master/staff member (UUID string) */
  master_id?: string;
  /** Optional booking code (generated if not provided) */
  booking_code?: string;
  /** Optional customer email */
  customer_email?: string;
  /** Optional notes */
  notes?: string;
}

/**
 * Update booking request
 */
export interface UpdateBookingRequest {
  /** Customer's full name */
  customer_name?: string;
  /** Service type or description */
  service?: string;
  /** Foreign key to service (optional) */
  service_id?: number;
  /** Foreign key to master/staff member (optional) */
  master_id?: number;
  /** Appointment start time (ISO string) */
  start_ts?: string | Date;
  /** Booking status */
  status?: BookingStatus;
  /** Optional customer email */
  customer_email?: string;
  /** Optional notes */
  notes?: string;
}

/**
 * Get bookings query parameters
 */
export interface GetBookingsParams extends PaginationParams, DateRangeParams {
  /** Filter by status */
  status?: BookingStatus;
  /** Filter by customer phone */
  customer_phone?: string;
  /** Filter by master/staff ID */
  master_id?: number;
  /** Filter by service ID */
  service_id?: number;
  /** Search by customer name or booking code */
  search?: string;
}

/**
 * Bulk update bookings request
 */
export interface BulkUpdateBookingsRequest {
  /** Array of booking IDs to update */
  bookingIds: string[];
  /** Status to set */
  status: BookingStatus;
}

// ============================================================================
// Message API Types
// ============================================================================

/**
 * Send message request
 */
export interface SendMessageRequest {
  /** Recipient phone number */
  phone_number: string;
  /** Message content */
  content: string;
  /** Message type */
  message_type?: MessageType;
  /** Optional conversation ID */
  conversation_id?: string;
}

/**
 * Send template message request
 */
export interface SendTemplateMessageRequest {
  /** Recipient phone number */
  phone_number: string;
  /** Template name */
  template_name: string;
  /** Template language code */
  language?: string;
  /** Template parameters (for variable substitution) */
  parameters?: Record<string, string | number>;
}

/**
 * Get messages query parameters
 */
export interface GetMessagesParams extends PaginationParams, DateRangeParams {
  /** Filter by conversation ID */
  conversation_id?: string;
  /** Filter by phone number */
  phone_number?: string;
  /** Filter by direction */
  direction?: MessageDirection;
  /** Filter by message type */
  message_type?: MessageType;
}

// ============================================================================
// Template API Types
// ============================================================================

/**
 * Create template request
 */
export interface CreateTemplateRequest {
  /** Template name */
  name: string;
  /** Template language code */
  language: string;
  /** Template category */
  category: string;
  /** Template content/body */
  content: string;
  /** Optional header */
  header?: string;
  /** Optional footer */
  footer?: string;
  /** Optional buttons */
  buttons?: Array<{
    type: string;
    text: string;
  }>;
}

/**
 * Update template request
 */
export interface UpdateTemplateRequest {
  /** Template status */
  status?: TemplateStatus;
}

/**
 * Get templates query parameters
 */
export interface GetTemplatesParams extends PaginationParams {
  /** Filter by status */
  status?: TemplateStatus;
  /** Filter by language */
  language?: string;
  /** Filter by category */
  category?: string;
}

// ============================================================================
// Conversation API Types
// ============================================================================

/**
 * Get conversations query parameters
 */
export interface GetConversationsParams extends PaginationParams {
  /** Filter by status */
  status?: string;
  /** Search by phone number */
  search?: string;
}

/**
 * Update conversation request
 */
export interface UpdateConversationRequest {
  /** Conversation status */
  status?: string;
}

// ============================================================================
// Analytics API Types
// ============================================================================

/**
 * Get dashboard stats query parameters
 */
export interface GetDashboardStatsParams extends DateRangeParams {
  /** Optional comparison period */
  compareWithPrevious?: boolean;
}

/**
 * Get analytics query parameters
 */
export interface GetAnalyticsParams extends DateRangeParams {
  /** Metrics to include */
  metrics?: Array<'bookings' | 'messages' | 'services' | 'peakHours'>;
  /** Grouping interval (hour, day, week, month) */
  interval?: 'hour' | 'day' | 'week' | 'month';
}

/**
 * Analytics response
 */
export interface AnalyticsResponse extends AnalyticsData {
  /** Date range for the analytics */
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

// ============================================================================
// Customer API Types
// ============================================================================

/**
 * Get customers query parameters
 */
export interface GetCustomersParams extends PaginationParams {
  /** Search by name or phone */
  search?: string;
  /** Sort by field */
  sortBy?: 'name' | 'total_bookings' | 'last_seen' | 'first_seen';
}

/**
 * Customer list item
 */
export interface CustomerListItem {
  /** Customer phone number */
  phone_number: string;
  /** Customer name */
  name: string | null;
  /** Total bookings */
  total_bookings: number;
  /** Last interaction timestamp */
  last_seen: string | Date;
  /** Last message preview */
  last_message?: string;
}

// ============================================================================
// Staff API Types
// ============================================================================

/**
 * Create master/staff request
 */
export interface CreateMasterRequest {
  /** Salon ID */
  salon_id: string;
  /** Optional user ID (link to existing user) */
  user_id?: string;
  /** Master's full name */
  name: string;
  /** Phone number (optional, E.164 format) */
  phone?: string;
  /** Email address (optional) */
  email?: string;
  /** Array of specializations */
  specialization: string[];
  /** Weekly working hours schedule */
  working_hours: import('./models').WorkingHours;
}

/**
 * Update master/staff request
 */
export interface UpdateMasterRequest {
  /** Master's name */
  name?: string;
  /** Phone number */
  phone?: string;
  /** Email address */
  email?: string;
  /** Specializations */
  specialization?: string[];
  /** Working hours */
  working_hours?: import('./models').WorkingHours;
  /** Active status */
  is_active?: boolean;
}

/**
 * Get masters query parameters
 */
export interface GetMastersParams extends PaginationParams {
  /** Filter by specialization */
  specialization?: string;
  /** Filter by active status */
  is_active?: boolean;
  /** Search by name, phone, or email */
  search?: string;
}

/**
 * Master availability request parameters
 */
export interface GetMasterAvailabilityParams {
  /** Date in YYYY-MM-DD format */
  date: string;
  /** Service duration in minutes (optional) */
  duration_minutes?: number;
}

/**
 * Master schedule request parameters
 */
export interface GetMasterScheduleParams extends DateRangeParams {
  /** Include booking details */
  includeBookings?: boolean;
}

/**
 * Legacy Staff types (for backward compatibility)
 */
export type CreateStaffRequest = CreateMasterRequest;
export type UpdateStaffRequest = UpdateMasterRequest;
export type GetStaffParams = GetMastersParams;

// ============================================================================
// Service API Types
// ============================================================================

/**
 * Create service request
 */
export interface CreateServiceRequest {
  /** Salon ID (required) */
  salon_id: string;
  /** Service name */
  name: string;
  /** Service category (uppercase enum: HAIRCUT, COLORING, MANICURE, PEDICURE, FACIAL, MASSAGE, WAXING, OTHER) */
  category: string;
  /** Service description */
  description?: string;
  /** Duration in minutes */
  duration_minutes: number;
  /** Price in decimal format (e.g., 50.0 for $50) */
  price: number;
}

/**
 * Update service request
 */
export interface UpdateServiceRequest {
  /** Service name */
  name?: string;
  /** Service category */
  category?: string;
  /** Service description */
  description?: string;
  /** Duration in minutes */
  duration_minutes?: number;
  /** Price in cents */
  price?: number;
  /** Status */
  status?: 'active' | 'inactive';
}

/**
 * Get services query parameters
 */
export interface GetServicesParams extends PaginationParams {
  /** Filter by category */
  category?: string;
  /** Filter by active status */
  is_active?: boolean;
  /** Search by name */
  search?: string;
}

// ============================================================================
// Webhook API Types
// ============================================================================

/**
 * WhatsApp webhook payload (incoming)
 */
export interface WhatsAppWebhookPayload {
  /** Webhook object type */
  object: string;
  /** Array of webhook entries */
  entry: Array<{
    /** Entry ID */
    id: string;
    /** Changes array */
    changes: Array<{
      /** Value object containing the actual data */
      value: {
        /** Messaging product */
        messaging_product: string;
        /** Metadata */
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        /** Contacts */
        contacts?: Array<{
          profile: {
            name: string;
          };
          wa_id: string;
        }>;
        /** Messages */
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          type: string;
          text?: {
            body: string;
          };
          image?: {
            id: string;
            mime_type: string;
          };
          document?: {
            id: string;
            mime_type: string;
            filename: string;
          };
        }>;
        /** Statuses */
        statuses?: Array<{
          id: string;
          status: string;
          timestamp: string;
          recipient_id: string;
        }>;
      };
      /** Field that changed */
      field: string;
    }>;
  }>;
}

// ============================================================================
// File Upload API Types
// ============================================================================

/**
 * File upload request
 */
export interface FileUploadRequest {
  /** File to upload */
  file: File | Blob;
  /** File type */
  type: 'image' | 'document' | 'audio' | 'video';
}

/**
 * File upload response
 */
export interface FileUploadResponse {
  /** Uploaded file ID */
  fileId: string;
  /** File URL */
  url: string;
  /** File mime type */
  mimeType: string;
  /** File size in bytes */
  size: number;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Type guard for checking if response is an error
 */
export function isApiError(response: ApiResponse<any> | ApiError): response is ApiError {
  return !response.success && 'error' in response;
}

/**
 * Extract data type from ApiResponse
 */
export type ExtractData<T> = T extends ApiResponse<infer U> ? U : never;

/**
 * Extract item type from PaginatedResponse
 */
export type ExtractItem<T> = T extends PaginatedResponse<infer U> ? U : never;

/**
 * Generic list response type
 */
export type ListResponse<T> = PaginatedResponse<T>;

/**
 * Generic detail response type
 */
export type DetailResponse<T> = ApiResponse<T>;

/**
 * Generic create response type
 */
export type CreateResponse<T> = ApiResponse<T>;

/**
 * Generic update response type
 */
export type UpdateResponse<T> = ApiResponse<T>;

/**
 * Generic delete response type
 */
export type DeleteResponse = ApiResponse<{ deleted: boolean; id: string }>;

// ============================================================================
// Type Aliases for Backwards Compatibility
// ============================================================================

/**
 * Authentication response (alias for LoginResponse)
 * @deprecated Use LoginResponse instead
 */
export type AuthResponse = LoginResponse;

/**
 * Login credentials (alias for LoginRequest)
 * @deprecated Use LoginRequest instead
 */
export type LoginCredentials = LoginRequest;
