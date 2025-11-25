/**
 * Zod Validation Schema Definitions
 * WhatsApp SaaS Platform
 *
 * This file contains Zod schemas for runtime validation of user inputs,
 * API requests, and form data. These schemas ensure type safety at runtime.
 */

import { z } from 'zod';
import { BookingStatus, MessageType, MessageDirection, TemplateStatus } from './enums';

// ============================================================================
// Common Validation Schemas
// ============================================================================

/**
 * Email validation schema
 */
export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Invalid email address')
  .toLowerCase()
  .trim();

/**
 * Password validation schema
 * Requires minimum 8 characters, at least one uppercase, one lowercase, and one number
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password must not exceed 100 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

/**
 * Phone number validation schema (international format)
 * Expects format: +1234567890 or +12345678901234
 */
export const phoneNumberSchema = z
  .string()
  .min(1, 'Phone number is required')
  .regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number format. Use international format (e.g., +12345678901)');

/**
 * UUID validation schema
 */
export const uuidSchema = z.string().uuid('Invalid UUID format');

/**
 * ISO date string validation schema
 */
export const isoDateSchema = z.string().datetime('Invalid ISO date format');

/**
 * URL validation schema
 */
export const urlSchema = z.string().url('Invalid URL format');

/**
 * Non-empty string schema
 */
export const nonEmptyStringSchema = z.string().min(1, 'This field is required').trim();

/**
 * Positive number schema
 */
export const positiveNumberSchema = z.number().positive('Must be a positive number');

/**
 * Non-negative number schema
 */
export const nonNegativeNumberSchema = z.number().nonnegative('Must be a non-negative number');

// ============================================================================
// Authentication Schemas
// ============================================================================

/**
 * Login form validation schema
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

/**
 * Infer TypeScript type from login schema
 */
export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Register form validation schema
 */
export const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long').trim(),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    salonId: uuidSchema.optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

/**
 * Infer TypeScript type from register schema
 */
export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Password reset request schema
 */
export const passwordResetRequestSchema = z.object({
  email: emailSchema,
});

/**
 * Infer TypeScript type from password reset request schema
 */
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;

/**
 * Password reset confirm schema
 */
export const passwordResetConfirmSchema = z
  .object({
    token: z.string().min(1, 'Reset token is required'),
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

/**
 * Infer TypeScript type from password reset confirm schema
 */
export type PasswordResetConfirmInput = z.infer<typeof passwordResetConfirmSchema>;

// ============================================================================
// Salon Schemas
// ============================================================================

/**
 * Create salon schema
 */
export const createSalonSchema = z.object({
  name: z.string().min(2, 'Salon name must be at least 2 characters').max(200, 'Name is too long').trim(),
  phone_number_id: z.string().min(1, 'Phone Number ID is required'),
  access_token: z.string().min(1, 'Access token is required'),
});

/**
 * Infer TypeScript type from create salon schema
 */
export type CreateSalonInput = z.infer<typeof createSalonSchema>;

/**
 * Update salon schema
 */
export const updateSalonSchema = z.object({
  name: z.string().min(2, 'Salon name must be at least 2 characters').max(200, 'Name is too long').trim().optional(),
  phone_number_id: z.string().min(1, 'Phone Number ID is required').optional(),
  access_token: z.string().min(1, 'Access token is required').optional(),
  is_active: z.boolean().optional(),
});

/**
 * Infer TypeScript type from update salon schema
 */
export type UpdateSalonInput = z.infer<typeof updateSalonSchema>;

// ============================================================================
// Booking Schemas
// ============================================================================

/**
 * Create booking schema
 */
export const createBookingSchema = z.object({
  customer_phone: phoneNumberSchema,
  customer_name: z.string().min(2, 'Customer name must be at least 2 characters').max(100, 'Name is too long').trim(),
  service: z.string().min(2, 'Service must be at least 2 characters').max(200, 'Service description is too long').trim(),
  start_ts: z.union([z.string().datetime(), z.date()], {
    errorMap: () => ({ message: 'Invalid date format' }),
  }),
  booking_code: z.string().max(50).optional(),
});

/**
 * Infer TypeScript type from create booking schema
 */
export type CreateBookingInput = z.infer<typeof createBookingSchema>;

/**
 * Update booking schema
 */
export const updateBookingSchema = z.object({
  customer_name: z.string().min(2, 'Customer name must be at least 2 characters').max(100, 'Name is too long').trim().optional(),
  service: z.string().min(2, 'Service must be at least 2 characters').max(200, 'Service description is too long').trim().optional(),
  start_ts: z.union([z.string().datetime(), z.date()]).optional(),
  status: z.nativeEnum(BookingStatus).optional(),
});

/**
 * Infer TypeScript type from update booking schema
 */
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;

/**
 * Booking filter schema
 */
export const bookingFilterSchema = z.object({
  status: z.nativeEnum(BookingStatus).optional(),
  customer_phone: phoneNumberSchema.optional(),
  search: z.string().optional(),
  startDate: z.union([z.string().datetime(), z.date()]).optional(),
  endDate: z.union([z.string().datetime(), z.date()]).optional(),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

/**
 * Infer TypeScript type from booking filter schema
 */
export type BookingFilterInput = z.infer<typeof bookingFilterSchema>;

// ============================================================================
// Message Schemas
// ============================================================================

/**
 * Send message schema
 */
export const sendMessageSchema = z.object({
  phone_number: phoneNumberSchema,
  content: z.string().min(1, 'Message content is required').max(4096, 'Message is too long'),
  message_type: z.nativeEnum(MessageType).optional(),
  conversation_id: uuidSchema.optional(),
});

/**
 * Infer TypeScript type from send message schema
 */
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

/**
 * Send template message schema
 */
export const sendTemplateMessageSchema = z.object({
  phone_number: phoneNumberSchema,
  template_name: z.string().min(1, 'Template name is required'),
  language: z.string().length(2, 'Language code must be 2 characters').optional(),
  parameters: z.record(z.union([z.string(), z.number()])).optional(),
});

/**
 * Infer TypeScript type from send template message schema
 */
export type SendTemplateMessageInput = z.infer<typeof sendTemplateMessageSchema>;

/**
 * Message filter schema
 */
export const messageFilterSchema = z.object({
  conversation_id: uuidSchema.optional(),
  phone_number: phoneNumberSchema.optional(),
  direction: z.nativeEnum(MessageDirection).optional(),
  message_type: z.nativeEnum(MessageType).optional(),
  startDate: z.union([z.string().datetime(), z.date()]).optional(),
  endDate: z.union([z.string().datetime(), z.date()]).optional(),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

/**
 * Infer TypeScript type from message filter schema
 */
export type MessageFilterInput = z.infer<typeof messageFilterSchema>;

// ============================================================================
// Template Schemas
// ============================================================================

/**
 * Template button schema
 */
export const templateButtonSchema = z.object({
  type: z.enum(['QUICK_REPLY', 'CALL_TO_ACTION', 'URL']),
  text: z.string().min(1, 'Button text is required').max(25, 'Button text is too long'),
  url: z.string().url().optional(),
  phone_number: phoneNumberSchema.optional(),
});

/**
 * Create template schema
 */
export const createTemplateSchema = z.object({
  name: z.string()
    .min(1, 'Template name is required')
    .max(512, 'Template name is too long')
    .regex(/^[a-z0-9_]+$/, 'Template name can only contain lowercase letters, numbers, and underscores'),
  language: z.string().length(2, 'Language code must be 2 characters'),
  category: z.enum(['MARKETING', 'UTILITY', 'AUTHENTICATION'], {
    errorMap: () => ({ message: 'Invalid template category' }),
  }),
  content: z.string().min(1, 'Template content is required').max(1024, 'Template content is too long'),
  header: z.string().max(60, 'Header is too long').optional(),
  footer: z.string().max(60, 'Footer is too long').optional(),
  buttons: z.array(templateButtonSchema).max(3, 'Maximum 3 buttons allowed').optional(),
});

/**
 * Infer TypeScript type from create template schema
 */
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;

/**
 * Update template schema
 */
export const updateTemplateSchema = z.object({
  status: z.nativeEnum(TemplateStatus).optional(),
});

/**
 * Infer TypeScript type from update template schema
 */
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;

/**
 * Template filter schema
 */
export const templateFilterSchema = z.object({
  status: z.nativeEnum(TemplateStatus).optional(),
  language: z.string().length(2).optional(),
  category: z.enum(['MARKETING', 'UTILITY', 'AUTHENTICATION']).optional(),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

/**
 * Infer TypeScript type from template filter schema
 */
export type TemplateFilterInput = z.infer<typeof templateFilterSchema>;

// ============================================================================
// Pagination Schemas
// ============================================================================

/**
 * Pagination params schema
 */
export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Infer TypeScript type from pagination schema
 */
export type PaginationInput = z.infer<typeof paginationSchema>;

/**
 * Date range schema
 */
export const dateRangeSchema = z.object({
  startDate: z.union([z.string().datetime(), z.date()]).optional(),
  endDate: z.union([z.string().datetime(), z.date()]).optional(),
});

/**
 * Infer TypeScript type from date range schema
 */
export type DateRangeInput = z.infer<typeof dateRangeSchema>;

// ============================================================================
// Business Hours Schema
// ============================================================================

/**
 * Business hours day schema
 */
export const businessHoursDaySchema = z.object({
  open: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (use HH:mm)'),
  close: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (use HH:mm)'),
  closed: z.boolean().optional(),
});

/**
 * Business hours schema
 */
export const businessHoursSchema = z.record(
  z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
  businessHoursDaySchema,
);

/**
 * Infer TypeScript type from business hours schema
 */
export type BusinessHoursInput = z.infer<typeof businessHoursSchema>;

// ============================================================================
// Search and Filter Schemas
// ============================================================================

/**
 * Search schema
 */
export const searchSchema = z.object({
  query: z.string().min(1, 'Search query is required').max(200, 'Search query is too long'),
  filters: z.record(z.any()).optional(),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional(),
});

/**
 * Infer TypeScript type from search schema
 */
export type SearchInput = z.infer<typeof searchSchema>;

// ============================================================================
// File Upload Schema
// ============================================================================

/**
 * File upload schema
 */
export const fileUploadSchema = z.object({
  file: z.instanceof(File, { message: 'File is required' }),
  type: z.enum(['image', 'document', 'audio', 'video']),
});

/**
 * Infer TypeScript type from file upload schema
 */
export type FileUploadInput = z.infer<typeof fileUploadSchema>;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Validates data against a Zod schema and returns typed result
 *
 * @template T - The schema type
 * @param schema - The Zod schema to validate against
 * @param data - The data to validate
 * @returns Validation result with typed data or errors
 */
export function validate<T extends z.ZodType>(
  schema: T,
  data: unknown,
): { success: true; data: z.infer<T> } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, errors: result.error };
  }
}

/**
 * Formats Zod validation errors into a user-friendly format
 *
 * @param error - The Zod error object
 * @returns Object mapping field names to error messages
 */
export function formatZodErrors(error: z.ZodError): Record<string, string> {
  const formattedErrors: Record<string, string> = {};

  error.errors.forEach((err) => {
    const path = err.path.join('.');
    formattedErrors[path] = err.message;
  });

  return formattedErrors;
}

/**
 * Extracts first error message from a Zod error
 *
 * @param error - The Zod error object
 * @returns First error message
 */
export function getFirstZodError(error: z.ZodError): string {
  return error.errors[0]?.message || 'Validation error';
}
