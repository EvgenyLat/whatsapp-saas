/**
 * Comprehensive API Service
 * WhatsApp SaaS Platform
 *
 * Complete API client with all endpoints:
 * - Authentication (login, register, logout, refresh, profile)
 * - Bookings (CRUD, bulk operations, stats)
 * - Messages (send, templates, conversations)
 * - Salons (CRUD, management)
 * - Templates (CRUD, WhatsApp templates)
 * - Analytics (dashboard, reports, metrics)
 * - Customers (profiles, history)
 * - Conversations (thread management)
 *
 * All methods include:
 * - Full TypeScript type safety
 * - Comprehensive JSDoc documentation
 * - Error handling
 * - Request/response examples
 */

import apiClient from './client';
import type {
  ApiResponse,
  PaginatedResponse,
  // Models
  User,
  Booking,
  Message,
  Salon,
  Template,
  Conversation,
  DashboardStats,
  AnalyticsResponse,
  CustomerProfile,
  CustomerListItem,
  Master,
  MasterListItem,
  MasterAvailability,
  MasterScheduleItem,
  StaffMember,
  StaffListItem,
  Service,
  ServiceListItem,
  // Auth types
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  PasswordResetRequest,
  PasswordResetConfirmRequest,
  // Booking types
  CreateBookingRequest,
  UpdateBookingRequest,
  GetBookingsParams,
  BulkUpdateBookingsRequest,
  // Message types
  SendMessageRequest,
  SendTemplateMessageRequest,
  GetMessagesParams,
  // Salon types
  CreateSalonRequest,
  UpdateSalonRequest,
  GetSalonsParams,
  // Template types
  CreateTemplateRequest,
  UpdateTemplateRequest,
  GetTemplatesParams,
  // Conversation types
  GetConversationsParams,
  UpdateConversationRequest,
  // Analytics types
  GetDashboardStatsParams,
  GetAnalyticsParams,
  // Customer types
  GetCustomersParams,
  // Master types
  CreateMasterRequest,
  UpdateMasterRequest,
  GetMastersParams,
  GetMasterAvailabilityParams,
  GetMasterScheduleParams,
  // Staff types
  CreateStaffRequest,
  UpdateStaffRequest,
  GetStaffParams,
  // Service types
  CreateServiceRequest,
  UpdateServiceRequest,
  GetServicesParams,
  // Generic types
  DeleteResponse,
} from '@/types';

// ============================================================================
// AUTHENTICATION API
// ============================================================================

/**
 * Authentication API endpoints
 * Handles user authentication, registration, and profile management
 * Matches backend JWT auth endpoints (POST /api/v1/auth/*)
 */
export const authApi = {
  /**
   * Login with email and password
   * Backend: POST /api/v1/auth/login
   *
   * @param credentials - User credentials
   * @returns Authentication response with access_token, refresh_token, and user data
   * @throws ApiError on authentication failure
   *
   * @example
   * ```ts
   * const { access_token, refresh_token, user } = await authApi.login({
   *   email: 'user@example.com',
   *   password: 'password123'
   * });
   * ```
   */
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>(
      '/auth/login',
      credentials,
      { skipAuth: true } as any
    );
    return response.data;
  },

  /**
   * Register a new user account
   * Backend: POST /api/v1/auth/register
   *
   * @param data - Registration data
   * @returns Authentication response with access_token, refresh_token, and user data
   * @throws ApiError if registration fails (email exists, validation error, etc.)
   *
   * @example
   * ```ts
   * const { access_token, refresh_token, user } = await authApi.register({
   *   email: 'john@example.com',
   *   password: 'securePass123',
   *   first_name: 'John',
   *   last_name: 'Doe'
   * });
   * ```
   */
  register: async (data: RegisterRequest): Promise<RegisterResponse> => {
    // Simplified registration - backend expects only email and password
    // Backend RegisterDto: { email: string, password: string }
    // Frontend RegisterRequest: { email: string, password: string }

    // Prepare backend-compatible payload (email + password only)
    const backendPayload = {
      email: data.email,
      password: data.password,
    };

    const response = await apiClient.post<RegisterResponse>(
      '/auth/register',
      backendPayload,
      { skipAuth: true } as any
    );
    return response.data;
  },

  /**
   * Refresh access token using refresh token
   * Backend: POST /api/v1/auth/refresh
   * Automatically called by axios interceptor on 401 errors
   *
   * @param refreshToken - Refresh token
   * @returns New access_token and refresh_token
   * @throws ApiError if refresh token is invalid or expired
   *
   * @example
   * ```ts
   * const { access_token, refresh_token } = await authApi.refresh('current-refresh-token');
   * ```
   */
  refresh: async (refreshToken: string): Promise<RefreshTokenResponse> => {
    const response = await apiClient.post<RefreshTokenResponse>(
      '/auth/refresh',
      { refreshToken }, // Backend expects camelCase
      { skipAuth: true } as any
    );
    return response.data;
  },

  /**
   * Get current authenticated user profile
   * Backend: GET /api/v1/auth/me
   *
   * @returns Current user data
   * @throws ApiError if not authenticated
   *
   * @example
   * ```ts
   * const user = await authApi.getProfile();
   * console.log(`Welcome, ${user.first_name}`);
   * ```
   */
  getProfile: async (): Promise<User> => {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  },

  /**
   * Verify email with token
   * Backend: POST /api/v1/auth/verify-email
   *
   * @param token - Email verification token
   * @throws ApiError if token is invalid or expired
   *
   * @example
   * ```ts
   * await authApi.verifyEmail('verification-token');
   * ```
   */
  verifyEmail: async (token: string): Promise<void> => {
    await apiClient.post('/auth/verify-email', { token });
  },

  /**
   * Request password reset email
   * Backend: POST /api/v1/auth/request-password-reset
   *
   * @param email - Email address
   * @throws ApiError if email not found
   *
   * @example
   * ```ts
   * await authApi.requestPasswordReset('user@example.com');
   * ```
   */
  requestPasswordReset: async (email: string): Promise<void> => {
    await apiClient.post(
      '/auth/request-password-reset',
      { email },
      { skipAuth: true } as any
    );
  },

  /**
   * Reset password with token
   * Backend: POST /api/v1/auth/reset-password
   *
   * @param token - Reset token from email
   * @param new_password - New password
   * @throws ApiError if token is invalid or expired
   *
   * @example
   * ```ts
   * await authApi.resetPassword('reset-token', 'newSecurePass123');
   * ```
   */
  resetPassword: async (token: string, new_password: string): Promise<void> => {
    await apiClient.post(
      '/auth/reset-password',
      { token, new_password },
      { skipAuth: true } as any
    );
  },

  /**
   * Change user password (authenticated)
   * Backend: POST /api/v1/auth/change-password
   *
   * @param old_password - Current password
   * @param new_password - New password
   * @throws ApiError if current password is incorrect
   *
   * @example
   * ```ts
   * await authApi.changePassword('oldPass123', 'newPass456');
   * ```
   */
  changePassword: async (old_password: string, new_password: string): Promise<void> => {
    await apiClient.post('/auth/change-password', {
      old_password,
      new_password,
    });
  },

  /**
   * Logout current user (client-side only)
   * Backend uses stateless JWT so no server-side logout needed
   *
   * @example
   * ```ts
   * await authApi.logout();
   * // Clear local state after logout
   * ```
   */
  logout: async (): Promise<void> => {
    // Just clear client-side state
    // Backend uses stateless JWT so no server-side logout needed
  },
};

// ============================================================================
// BOOKING API
// ============================================================================

/**
 * Booking API endpoints
 * Manages salon bookings, appointments, and scheduling
 */
export const bookingsApi = {
  /**
   * Get all bookings for a salon
   *
   * @param salonId - Salon ID
   * @param params - Query parameters (pagination, filtering, sorting)
   * @returns Paginated list of bookings
   *
   * @example
   * ```ts
   * const response = await bookingsApi.getAll('salon-123', {
   *   page: 1,
   *   limit: 20,
   *   status: 'CONFIRMED',
   *   startDate: '2024-01-01',
   *   endDate: '2024-01-31'
   * });
   * ```
   */
  getAll: async (
    salonId: string,
    params?: GetBookingsParams
  ): Promise<PaginatedResponse<Booking>> => {
    const response = await apiClient.get<PaginatedResponse<Booking>>(
      `/bookings`,
      { params: { ...params, salon_id: salonId } }
    );
    return response.data;
  },

  /**
   * Get booking by ID
   *
   * @param salonId - Salon ID
   * @param bookingId - Booking ID
   * @returns Booking details
   * @throws ApiError if booking not found
   *
   * @example
   * ```ts
   * const booking = await bookingsApi.getById('salon-123', 'booking-456');
   * ```
   */
  getById: async (salonId: string, bookingId: string): Promise<Booking> => {
    const response = await apiClient.get<ApiResponse<Booking>>(
      `/bookings/${bookingId}`
    );
    return response.data.data;
  },

  /**
   * Create a new booking
   *
   * @param salonId - Salon ID
   * @param data - Booking data
   * @returns Created booking
   * @throws ApiError if validation fails or time slot is unavailable
   *
   * @example
   * ```ts
   * const booking = await bookingsApi.create('salon-123', {
   *   customer_phone: '+1234567890',
   *   customer_name: 'John Doe',
   *   service: 'Haircut',
   *   start_ts: '2024-01-15T10:00:00Z'
   * });
   * ```
   */
  create: async (salonId: string, data: CreateBookingRequest): Promise<Booking> => {
    const response = await apiClient.post<ApiResponse<Booking>>(
      `/bookings`,
      data
    );
    return response.data.data;
  },

  /**
   * Update a booking
   *
   * @param salonId - Salon ID
   * @param bookingId - Booking ID
   * @param data - Update data
   * @returns Updated booking
   * @throws ApiError if booking not found or validation fails
   *
   * @example
   * ```ts
   * const updated = await bookingsApi.update('salon-123', 'booking-456', {
   *   status: 'CONFIRMED',
   *   start_ts: '2024-01-15T11:00:00Z'
   * });
   * ```
   */
  update: async (
    salonId: string,
    bookingId: string,
    data: UpdateBookingRequest
  ): Promise<Booking> => {
    const response = await apiClient.patch<ApiResponse<Booking>>(
      `/bookings/${bookingId}`,
      data
    );
    return response.data.data;
  },

  /**
   * Delete a booking
   *
   * @param salonId - Salon ID
   * @param bookingId - Booking ID
   * @returns Deletion confirmation
   * @throws ApiError if booking not found
   *
   * @example
   * ```ts
   * await bookingsApi.delete('salon-123', 'booking-456');
   * ```
   */
  delete: async (salonId: string, bookingId: string): Promise<DeleteResponse> => {
    const response = await apiClient.delete<DeleteResponse>(
      `/bookings/${bookingId}`
    );
    return response.data;
  },

  /**
   * Bulk update multiple bookings
   * Useful for batch status changes or cancellations
   *
   * @param salonId - Salon ID
   * @param data - Bulk update data
   * @returns Array of updated bookings
   * @throws ApiError if any booking ID is invalid
   *
   * @example
   * ```ts
   * const updated = await bookingsApi.bulkUpdate('salon-123', {
   *   bookingIds: ['booking-1', 'booking-2'],
   *   status: 'CANCELLED'
   * });
   * ```
   */
  bulkUpdate: async (
    salonId: string,
    data: BulkUpdateBookingsRequest
  ): Promise<Booking[]> => {
    const response = await apiClient.post<ApiResponse<Booking[]>>(
      `/bookings/${salonId}/bulk-update`,
      data
    );
    return response.data.data;
  },

  /**
   * Get booking statistics for a salon
   *
   * @param salonId - Salon ID
   * @returns Booking statistics (counts by status, etc.)
   *
   * @example
   * ```ts
   * const stats = await bookingsApi.getStats('salon-123');
   * console.log(`Confirmed: ${stats.CONFIRMED}`);
   * ```
   */
  getStats: async (salonId: string): Promise<Record<string, number>> => {
    const response = await apiClient.get<ApiResponse<Record<string, number>>>(
      `/bookings/${salonId}/stats`
    );
    return response.data.data;
  },
};

// ============================================================================
// MESSAGE API
// ============================================================================

/**
 * Message API endpoints
 * Handles WhatsApp messages, templates, and conversations
 */
export const messagesApi = {
  /**
   * Get all messages for a salon
   *
   * @param salonId - Salon ID
   * @param params - Query parameters (pagination, filtering)
   * @returns Paginated list of messages
   *
   * @example
   * ```ts
   * const messages = await messagesApi.getAll('salon-123', {
   *   page: 1,
   *   limit: 50,
   *   conversation_id: 'conv-456',
   *   direction: 'INBOUND'
   * });
   * ```
   */
  getAll: async (
    salonId: string,
    params?: GetMessagesParams
  ): Promise<PaginatedResponse<Message>> => {
    const response = await apiClient.get<PaginatedResponse<Message>>(
      `/messages/${salonId}`,
      { params }
    );
    return response.data;
  },

  /**
   * Get message by ID
   *
   * @param messageId - Message ID
   * @returns Message details
   * @throws ApiError if message not found
   *
   * @example
   * ```ts
   * const message = await messagesApi.getById('msg-123');
   * ```
   */
  getById: async (messageId: string): Promise<Message> => {
    const response = await apiClient.get<ApiResponse<Message>>(
      `/messages/detail/${messageId}`
    );
    return response.data.data;
  },

  /**
   * Send a text message
   *
   * @param salonId - Salon ID
   * @param data - Message data
   * @returns Sent message with WhatsApp message ID
   * @throws ApiError if WhatsApp API fails
   *
   * @example
   * ```ts
   * const message = await messagesApi.send('salon-123', {
   *   phone_number: '+1234567890',
   *   content: 'Your appointment is confirmed!',
   *   message_type: 'TEXT'
   * });
   * ```
   */
  send: async (salonId: string, data: SendMessageRequest): Promise<Message> => {
    const response = await apiClient.post<ApiResponse<Message>>(
      `/messages/${salonId}/send`,
      data
    );
    return response.data.data;
  },

  /**
   * Send a template message
   * Uses pre-approved WhatsApp message templates
   *
   * @param salonId - Salon ID
   * @param data - Template message data
   * @returns Sent message
   * @throws ApiError if template not found or WhatsApp API fails
   *
   * @example
   * ```ts
   * const message = await messagesApi.sendTemplate('salon-123', {
   *   phone_number: '+1234567890',
   *   template_name: 'booking_confirmation',
   *   language: 'en',
   *   parameters: {
   *     customer_name: 'John',
   *     booking_time: '2024-01-15 10:00 AM'
   *   }
   * });
   * ```
   */
  sendTemplate: async (
    salonId: string,
    data: SendTemplateMessageRequest
  ): Promise<Message> => {
    const response = await apiClient.post<ApiResponse<Message>>(
      `/messages/${salonId}/send-template`,
      data
    );
    return response.data.data;
  },

  /**
   * Mark message as read
   *
   * @param messageId - Message ID
   * @returns Updated message
   * @throws ApiError if message not found
   *
   * @example
   * ```ts
   * await messagesApi.markAsRead('msg-123');
   * ```
   */
  markAsRead: async (messageId: string): Promise<Message> => {
    const response = await apiClient.patch<ApiResponse<Message>>(
      `/messages/${messageId}/read`
    );
    return response.data.data;
  },
};

// ============================================================================
// CONVERSATION API
// ============================================================================

/**
 * Conversation API endpoints
 * Manages message threads and conversation states
 */
export const conversationsApi = {
  /**
   * Get all conversations for a salon
   *
   * @param salonId - Salon ID
   * @param params - Query parameters (pagination, filtering)
   * @returns Paginated list of conversations
   *
   * @example
   * ```ts
   * const conversations = await conversationsApi.getAll('salon-123', {
   *   page: 1,
   *   limit: 20,
   *   status: 'active'
   * });
   * ```
   */
  getAll: async (
    salonId: string,
    params?: GetConversationsParams
  ): Promise<PaginatedResponse<Conversation>> => {
    const response = await apiClient.get<PaginatedResponse<Conversation>>(
      `/conversations/${salonId}`,
      { params }
    );
    return response.data;
  },

  /**
   * Get conversation by ID
   *
   * @param conversationId - Conversation ID
   * @returns Conversation details
   * @throws ApiError if conversation not found
   *
   * @example
   * ```ts
   * const conversation = await conversationsApi.getById('conv-123');
   * ```
   */
  getById: async (conversationId: string): Promise<Conversation> => {
    const response = await apiClient.get<ApiResponse<Conversation>>(
      `/conversations/detail/${conversationId}`
    );
    return response.data.data;
  },

  /**
   * Update conversation
   * Can update status, metadata, etc.
   *
   * @param conversationId - Conversation ID
   * @param data - Update data
   * @returns Updated conversation
   * @throws ApiError if conversation not found
   *
   * @example
   * ```ts
   * const updated = await conversationsApi.update('conv-123', {
   *   status: 'archived'
   * });
   * ```
   */
  update: async (
    conversationId: string,
    data: UpdateConversationRequest
  ): Promise<Conversation> => {
    const response = await apiClient.patch<ApiResponse<Conversation>>(
      `/conversations/${conversationId}`,
      data
    );
    return response.data.data;
  },
};

// ============================================================================
// SALON API
// ============================================================================

/**
 * Salon API endpoints
 * Manages salon accounts and WhatsApp Business API configuration
 */
export const salonsApi = {
  /**
   * Get all salons
   * Super admins can see all salons, salon admins see only their salon
   *
   * @param params - Query parameters (pagination, filtering)
   * @returns Array of salons (backend returns array, not paginated response)
   *
   * @example
   * ```ts
   * const salons = await salonsApi.getAll({
   *   limit: 20,
   *   is_active: true
   * });
   * ```
   */
  getAll: async (params?: GetSalonsParams): Promise<Salon[]> => {
    const response = await apiClient.get<Salon[]>('/salons', {
      params,
    });
    return response.data;
  },

  /**
   * Get salon by ID
   *
   * @param salonId - Salon ID
   * @returns Salon details
   * @throws ApiError if salon not found or access denied
   *
   * @example
   * ```ts
   * const salon = await salonsApi.getById('salon-123');
   * ```
   */
  getById: async (salonId: string): Promise<Salon> => {
    const response = await apiClient.get<Salon>(`/salons/${salonId}`);
    return response.data;
  },

  /**
   * Create a new salon
   * Requires super admin role
   *
   * @param data - Salon data
   * @returns Created salon
   * @throws ApiError if validation fails or phone_number_id already exists
   *
   * @example
   * ```ts
   * const salon = await salonsApi.create({
   *   name: 'Luxury Salon & Spa',
   *   phone_number_id: '1234567890',
   *   access_token: 'whatsapp-api-token'
   * });
   * ```
   */
  create: async (data: CreateSalonRequest): Promise<Salon> => {
    const response = await apiClient.post<Salon>('/salons', data);
    return response.data;
  },

  /**
   * Update a salon
   * Can update configuration, credentials, status
   *
   * @param salonId - Salon ID
   * @param data - Update data
   * @returns Updated salon
   * @throws ApiError if salon not found or validation fails
   *
   * @example
   * ```ts
   * const updated = await salonsApi.update('salon-123', {
   *   name: 'New Salon Name',
   *   is_active: true
   * });
   * ```
   */
  update: async (salonId: string, data: UpdateSalonRequest): Promise<Salon> => {
    const response = await apiClient.patch<Salon>(
      `/salons/${salonId}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a salon
   * Soft delete - marks as inactive
   *
   * @param salonId - Salon ID
   * @returns Deletion confirmation
   * @throws ApiError if salon not found
   *
   * @example
   * ```ts
   * await salonsApi.delete('salon-123');
   * ```
   */
  delete: async (salonId: string): Promise<DeleteResponse> => {
    const response = await apiClient.delete<DeleteResponse>(`/salons/${salonId}`);
    return response.data;
  },
};

// ============================================================================
// TEMPLATE API
// ============================================================================

/**
 * Template API endpoints
 * Manages WhatsApp message templates
 */
export const templatesApi = {
  /**
   * Get all templates for a salon
   *
   * @param salonId - Salon ID
   * @param params - Query parameters (pagination, filtering)
   * @returns Paginated list of templates
   *
   * @example
   * ```ts
   * const templates = await templatesApi.getAll('salon-123', {
   *   page: 1,
   *   limit: 20,
   *   status: 'APPROVED',
   *   language: 'en'
   * });
   * ```
   */
  getAll: async (
    salonId: string,
    params?: GetTemplatesParams
  ): Promise<PaginatedResponse<Template>> => {
    const response = await apiClient.get<PaginatedResponse<Template>>(
      `/templates/${salonId}`,
      { params }
    );
    return response.data;
  },

  /**
   * Get template by ID
   *
   * @param templateId - Template ID
   * @returns Template details
   * @throws ApiError if template not found
   *
   * @example
   * ```ts
   * const template = await templatesApi.getById('template-123');
   * ```
   */
  getById: async (templateId: string): Promise<Template> => {
    const response = await apiClient.get<ApiResponse<Template>>(
      `/templates/detail/${templateId}`
    );
    return response.data.data;
  },

  /**
   * Create a new template
   * Submits template to WhatsApp for approval
   *
   * @param salonId - Salon ID
   * @param data - Template data
   * @returns Created template (pending approval)
   * @throws ApiError if validation fails or WhatsApp API rejects
   *
   * @example
   * ```ts
   * const template = await templatesApi.create('salon-123', {
   *   name: 'booking_reminder',
   *   language: 'en',
   *   category: 'TRANSACTIONAL',
   *   content: 'Hi {{1}}, your booking is tomorrow at {{2}}',
   *   buttons: [{ type: 'QUICK_REPLY', text: 'Confirm' }]
   * });
   * ```
   */
  create: async (salonId: string, data: CreateTemplateRequest): Promise<Template> => {
    const response = await apiClient.post<ApiResponse<Template>>(
      `/templates/${salonId}`,
      data
    );
    return response.data.data;
  },

  /**
   * Update a template
   * Can only update status (enable/disable)
   *
   * @param templateId - Template ID
   * @param data - Update data
   * @returns Updated template
   * @throws ApiError if template not found
   *
   * @example
   * ```ts
   * const updated = await templatesApi.update('template-123', {
   *   status: 'DISABLED'
   * });
   * ```
   */
  update: async (templateId: string, data: UpdateTemplateRequest): Promise<Template> => {
    const response = await apiClient.patch<ApiResponse<Template>>(
      `/templates/${templateId}`,
      data
    );
    return response.data.data;
  },

  /**
   * Delete a template
   *
   * @param templateId - Template ID
   * @returns Deletion confirmation
   * @throws ApiError if template not found
   *
   * @example
   * ```ts
   * await templatesApi.delete('template-123');
   * ```
   */
  delete: async (templateId: string): Promise<DeleteResponse> => {
    const response = await apiClient.delete<DeleteResponse>(
      `/api/templates/${templateId}`
    );
    return response.data;
  },
};

// ============================================================================
// ANALYTICS API
// ============================================================================

/**
 * Analytics API endpoints
 * Provides dashboard statistics and detailed analytics
 */
export const analyticsApi = {
  /**
   * Get dashboard statistics
   * Summary metrics for salon dashboard
   *
   * @param salonId - Salon ID
   * @param params - Query parameters (date range, comparison)
   * @returns Dashboard statistics
   *
   * @example
   * ```ts
   * const stats = await analyticsApi.getDashboard('salon-123', {
   *   startDate: '2024-01-01',
   *   endDate: '2024-01-31',
   *   compareWithPrevious: true
   * });
   * ```
   */
  getDashboard: async (
    salonId: string,
    params?: GetDashboardStatsParams
  ): Promise<DashboardStats> => {
    const response = await apiClient.get<ApiResponse<DashboardStats>>(
      `/analytics/dashboard`,
      { params: { ...params, salon_id: salonId } }
    );
    return response.data.data;
  },

  /**
   * Get booking analytics
   * Detailed booking trends and metrics
   *
   * @param salonId - Salon ID
   * @param params - Query parameters (date range, metrics, interval)
   * @returns Analytics data with time series
   *
   * @example
   * ```ts
   * const analytics = await analyticsApi.getBookingAnalytics('salon-123', {
   *   startDate: '2024-01-01',
   *   endDate: '2024-01-31',
   *   interval: 'day',
   *   metrics: ['bookings', 'services']
   * });
   * ```
   */
  getBookingAnalytics: async (
    salonId: string,
    params?: GetAnalyticsParams
  ): Promise<AnalyticsResponse> => {
    const response = await apiClient.get<ApiResponse<AnalyticsResponse>>(
      `/analytics/${salonId}/bookings`,
      { params }
    );
    return response.data.data;
  },

  /**
   * Get message analytics
   * Message volume and engagement metrics
   *
   * @param salonId - Salon ID
   * @param params - Query parameters
   * @returns Analytics data
   *
   * @example
   * ```ts
   * const analytics = await analyticsApi.getMessageAnalytics('salon-123', {
   *   startDate: '2024-01-01',
   *   endDate: '2024-01-31',
   *   interval: 'day'
   * });
   * ```
   */
  getMessageAnalytics: async (
    salonId: string,
    params?: GetAnalyticsParams
  ): Promise<AnalyticsResponse> => {
    const response = await apiClient.get<ApiResponse<AnalyticsResponse>>(
      `/analytics/${salonId}/messages`,
      { params }
    );
    return response.data.data;
  },

  /**
   * Get revenue analytics
   * Revenue trends and service performance
   *
   * @param salonId - Salon ID
   * @param params - Query parameters
   * @returns Analytics data
   *
   * @example
   * ```ts
   * const analytics = await analyticsApi.getRevenueAnalytics('salon-123', {
   *   startDate: '2024-01-01',
   *   endDate: '2024-01-31',
   *   interval: 'week'
   * });
   * ```
   */
  getRevenueAnalytics: async (
    salonId: string,
    params?: GetAnalyticsParams
  ): Promise<AnalyticsResponse> => {
    const response = await apiClient.get<ApiResponse<AnalyticsResponse>>(
      `/analytics/${salonId}/revenue`,
      { params }
    );
    return response.data.data;
  },
};

// ============================================================================
// CUSTOMER API
// ============================================================================

/**
 * Customer API endpoints
 * Manages customer profiles and interaction history
 */
export const customersApi = {
  /**
   * Get all customers for a salon
   *
   * @param salonId - Salon ID
   * @param params - Query parameters (pagination, search, sorting)
   * @returns Paginated list of customers
   *
   * @example
   * ```ts
   * const customers = await customersApi.getAll('salon-123', {
   *   page: 1,
   *   limit: 20,
   *   search: 'john',
   *   sortBy: 'total_bookings',
   *   sortOrder: 'desc'
   * });
   * ```
   */
  getAll: async (
    salonId: string,
    params?: GetCustomersParams
  ): Promise<PaginatedResponse<CustomerListItem>> => {
    const response = await apiClient.get<PaginatedResponse<CustomerListItem>>(
      `/customers/${salonId}`,
      { params }
    );
    return response.data;
  },

  /**
   * Get customer by ID
   *
   * @param salonId - Salon ID
   * @param customerId - Customer ID
   * @returns Customer profile with full details
   * @throws ApiError if customer not found
   *
   * @example
   * ```ts
   * const customer = await customersApi.getById('salon-123', 'customer-456');
   * ```
   */
  getById: async (salonId: string, customerId: string): Promise<CustomerProfile> => {
    const response = await apiClient.get<ApiResponse<CustomerProfile>>(
      `/customers/${salonId}/${customerId}`
    );
    return response.data.data;
  },

  /**
   * Get customer profile by phone number
   * Includes booking history, message history, and preferences
   *
   * @param salonId - Salon ID
   * @param phoneNumber - Customer phone number
   * @returns Customer profile with full history
   * @throws ApiError if customer not found
   *
   * @example
   * ```ts
   * const profile = await customersApi.getProfile('salon-123', '+1234567890');
   * console.log(`Total bookings: ${profile.total_bookings}`);
   * ```
   */
  getProfile: async (salonId: string, phoneNumber: string): Promise<CustomerProfile> => {
    const response = await apiClient.get<ApiResponse<CustomerProfile>>(
      `/customers/${salonId}/phone/${encodeURIComponent(phoneNumber)}`
    );
    return response.data.data;
  },

  /**
   * Create a new customer
   *
   * @param salonId - Salon ID
   * @param data - Customer data
   * @returns Created customer profile
   * @throws ApiError if validation fails
   *
   * @example
   * ```ts
   * const customer = await customersApi.create('salon-123', {
   *   phone_number: '+1234567890',
   *   name: 'John Doe',
   *   email: 'john@example.com'
   * });
   * ```
   */
  create: async (salonId: string, data: any): Promise<CustomerProfile> => {
    const response = await apiClient.post<ApiResponse<CustomerProfile>>(
      `/customers/${salonId}`,
      data
    );
    return response.data.data;
  },

  /**
   * Update a customer
   *
   * @param salonId - Salon ID
   * @param customerId - Customer ID
   * @param data - Update data
   * @returns Updated customer profile
   * @throws ApiError if customer not found or validation fails
   *
   * @example
   * ```ts
   * const updated = await customersApi.update('salon-123', 'customer-456', {
   *   name: 'Jane Doe',
   *   email: 'jane@example.com'
   * });
   * ```
   */
  update: async (salonId: string, customerId: string, data: any): Promise<CustomerProfile> => {
    const response = await apiClient.patch<ApiResponse<CustomerProfile>>(
      `/customers/${salonId}/${customerId}`,
      data
    );
    return response.data.data;
  },

  /**
   * Delete a customer
   *
   * @param salonId - Salon ID
   * @param customerId - Customer ID
   * @returns Deletion confirmation
   * @throws ApiError if customer not found
   *
   * @example
   * ```ts
   * await customersApi.delete('salon-123', 'customer-456');
   * ```
   */
  delete: async (salonId: string, customerId: string): Promise<DeleteResponse> => {
    const response = await apiClient.delete<DeleteResponse>(
      `/customers/${salonId}/${customerId}`
    );
    return response.data;
  },
};

// ============================================================================
// MASTERS API
// ============================================================================

/**
 * Masters API endpoints
 * Manages salon staff members (masters) with schedules and specializations
 */
export const mastersApi = {
  /**
   * Get all masters for a salon
   *
   * @param salonId - Salon ID
   * @param params - Query parameters (pagination, filtering, search)
   * @returns Paginated list of masters
   *
   * @example
   * ```ts
   * const masters = await mastersApi.list('salon-123', {
   *   page: 1,
   *   limit: 20,
   *   specialization: 'HAIRSTYLIST',
   *   is_active: true
   * });
   * ```
   */
  list: async (
    salonId: string,
    params?: GetMastersParams
  ): Promise<PaginatedResponse<MasterListItem>> => {
    const response = await apiClient.get<PaginatedResponse<MasterListItem>>(
      `/masters`,
      { params: { ...params, salon_id: salonId } }
    );
    return response.data;
  },

  /**
   * Get master by ID
   *
   * @param salonId - Salon ID
   * @param masterId - Master ID
   * @returns Master details
   * @throws ApiError if master not found
   *
   * @example
   * ```ts
   * const master = await mastersApi.getById('salon-123', 'master-456');
   * ```
   */
  getById: async (salonId: string, masterId: string): Promise<Master> => {
    const response = await apiClient.get<ApiResponse<Master>>(
      `/masters/${masterId}`
    );
    return response.data.data;
  },

  /**
   * Create a new master
   *
   * @param salonId - Salon ID
   * @param data - Master data
   * @returns Created master
   * @throws ApiError if validation fails or email/phone already exists
   *
   * @example
   * ```ts
   * const master = await mastersApi.create('salon-123', {
   *   salon_id: 'salon-123',
   *   name: 'Jane Smith',
   *   phone: '+1234567890',
   *   email: 'jane@salon.com',
   *   specialization: ['HAIRSTYLIST', 'MAKEUP_ARTIST'],
   *   working_hours: {
   *     monday: { enabled: true, start: '09:00', end: '18:00', breaks: [] },
   *     // ... other days
   *   }
   * });
   * ```
   */
  create: async (salonId: string, data: CreateMasterRequest): Promise<Master> => {
    const response = await apiClient.post<Master>(
      `/masters`,
      data
    );
    return response.data;
  },

  /**
   * Update a master
   *
   * @param salonId - Salon ID
   * @param masterId - Master ID
   * @param data - Update data
   * @returns Updated master
   * @throws ApiError if master not found or validation fails
   *
   * @example
   * ```ts
   * const updated = await mastersApi.update('salon-123', 'master-456', {
   *   name: 'Jane Doe',
   *   specialization: ['HAIRSTYLIST'],
   *   is_active: true
   * });
   * ```
   */
  update: async (
    salonId: string,
    masterId: string,
    data: UpdateMasterRequest
  ): Promise<Master> => {
    const response = await apiClient.patch<ApiResponse<Master>>(
      `/masters/${masterId}`,
      data
    );
    return response.data.data;
  },

  /**
   * Delete a master
   *
   * @param salonId - Salon ID
   * @param masterId - Master ID
   * @returns Deletion confirmation
   * @throws ApiError if master not found
   *
   * @example
   * ```ts
   * await mastersApi.delete('salon-123', 'master-456');
   * ```
   */
  delete: async (salonId: string, masterId: string): Promise<DeleteResponse> => {
    const response = await apiClient.delete<DeleteResponse>(
      `/masters/${masterId}`
    );
    return response.data;
  },

  /**
   * Get master availability for a specific date
   *
   * @param salonId - Salon ID
   * @param masterId - Master ID
   * @param params - Availability parameters (date, duration)
   * @returns Available and booked time slots
   *
   * @example
   * ```ts
   * const availability = await mastersApi.getAvailability(
   *   'salon-123',
   *   'master-456',
   *   { date: '2024-01-15', duration: 60 }
   * );
   * ```
   */
  getAvailability: async (
    salonId: string,
    masterId: string,
    params: GetMasterAvailabilityParams
  ): Promise<MasterAvailability> => {
    const response = await apiClient.get<ApiResponse<MasterAvailability>>(
      `/masters/${masterId}/availability`,
      { params }
    );
    return response.data.data;
  },

  /**
   * Get master schedule for a date range
   *
   * @param salonId - Salon ID
   * @param masterId - Master ID
   * @param params - Schedule parameters (date range, include bookings)
   * @returns Schedule with bookings
   *
   * @example
   * ```ts
   * const schedule = await mastersApi.getSchedule(
   *   'salon-123',
   *   'master-456',
   *   {
   *     startDate: '2024-01-01',
   *     endDate: '2024-01-31',
   *     includeBookings: true
   *   }
   * );
   * ```
   */
  getSchedule: async (
    salonId: string,
    masterId: string,
    params?: GetMasterScheduleParams
  ): Promise<MasterScheduleItem[]> => {
    const response = await apiClient.get<ApiResponse<MasterScheduleItem[]>>(
      `/masters/${salonId}/${masterId}/schedule`,
      { params }
    );
    return response.data.data;
  },
};

/**
 * Legacy Staff API (points to masters API for backward compatibility)
 * @deprecated Use mastersApi instead
 */
export const staffApi = mastersApi;

// ============================================================================
// SERVICES API
// ============================================================================

/**
 * Services API endpoints
 * Manages salon services and pricing
 */
export const servicesApi = {
  /**
   * Get all services for a salon
   *
   * @param params - Query parameters (pagination, filtering, search)
   * @returns Paginated list of services
   *
   * @example
   * ```ts
   * const services = await servicesApi.list({
   *   salon_id: 'salon-123',
   *   page: 1,
   *   limit: 20,
   *   category: 'Haircut',
   *   status: 'active'
   * });
   * ```
   */
  list: async (
    params?: GetServicesParams
  ): Promise<PaginatedResponse<ServiceListItem>> => {
    const response = await apiClient.get<PaginatedResponse<ServiceListItem>>(
      `/services`,
      { params }
    );
    return response.data;
  },

  /**
   * Get service by ID
   *
   * @param serviceId - Service ID
   * @returns Service details
   * @throws ApiError if service not found
   *
   * @example
   * ```ts
   * const service = await servicesApi.getById('service-456');
   * ```
   */
  getById: async (serviceId: string): Promise<Service> => {
    const response = await apiClient.get<Service>(
      `/services/${serviceId}`
    );
    return response.data;
  },

  /**
   * Create a new service
   *
   * @param salonId - Salon ID
   * @param data - Service data
   * @returns Created service
   * @throws ApiError if validation fails
   *
   * @example
   * ```ts
   * const service = await servicesApi.create('salon-123', {
   *   name: 'Premium Haircut',
   *   category: 'Haircut',
   *   duration: 60,
   *   price: 5000, // $50.00 in cents
   *   description: 'Includes wash, cut, and style'
   * });
   * ```
   */
  create: async (salonId: string, data: CreateServiceRequest): Promise<Service> => {
    const response = await apiClient.post<Service>(
      `/services`,
      {
        ...data,
        salon_id: salonId,
      }
    );
    return response.data;
  },

  /**
   * Update a service
   *
   * @param serviceId - Service ID
   * @param data - Update data
   * @returns Updated service
   * @throws ApiError if service not found or validation fails
   *
   * @example
   * ```ts
   * const updated = await servicesApi.update('service-456', {
   *   price: 5500,
   *   duration: 45,
   *   status: 'active'
   * });
   * ```
   */
  update: async (
    serviceId: string,
    data: UpdateServiceRequest
  ): Promise<Service> => {
    const response = await apiClient.put<Service>(
      `/services/${serviceId}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a service
   *
   * @param serviceId - Service ID
   * @returns Deletion confirmation
   * @throws ApiError if service not found
   *
   * @example
   * ```ts
   * await servicesApi.delete('service-456');
   * ```
   */
  delete: async (serviceId: string): Promise<DeleteResponse> => {
    const response = await apiClient.delete<DeleteResponse>(
      `/services/${serviceId}`
    );
    return response.data;
  },
};

// ============================================================================
// COMBINED API OBJECT
// ============================================================================

/**
 * Complete API client
 * All endpoints organized by resource
 *
 * @example
 * ```ts
 * import { api } from '@/lib/api';
 *
 * // Authentication
 * const { token, user } = await api.auth.login({ ... });
 *
 * // Bookings
 * const bookings = await api.bookings.getAll('salon-123');
 *
 * // Messages
 * await api.messages.send('salon-123', { ... });
 * ```
 */
export const api = {
  auth: authApi,
  bookings: bookingsApi,
  messages: messagesApi,
  conversations: conversationsApi,
  salons: salonsApi,
  templates: templatesApi,
  analytics: analyticsApi,
  customers: customersApi,
  masters: mastersApi,
  staff: staffApi, // Deprecated: use masters instead
  services: servicesApi,
};

/**
 * Export default API object
 */
export default api;

/**
 * Re-export individual API modules for tree-shaking
 * Note: These are already declared above, just re-exported here
 */
