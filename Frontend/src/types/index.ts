/**
 * Types Barrel Export
 * WhatsApp SaaS Platform
 *
 * This file serves as the central export point for all type definitions.
 * Import types from this file instead of individual type modules.
 *
 * @example
 * import { User, Booking, ApiResponse, ButtonProps } from '@/types';
 */

// ============================================================================
// Enums and Constants
// ============================================================================

export {
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
  WebhookStatus,
  ServiceCategory,
  TEMPLATE_LANGUAGES,
  WEEKDAYS,
  COLOR_VARIANTS,
  SIZE_VARIANTS,
} from './enums';

export type {
  BookingStatusType,
  MessageDirectionType,
  MessageTypeType,
  MessageStatusType,
  TemplateStatusType,
  ConversationStatusType,
  UserRoleType,
  SalonStatusType,
  PlanTypeType,
  AIModelType,
  WebhookStatusType,
  ServiceCategoryType,
  TemplateLanguage,
  Weekday,
  ColorVariant,
  SizeVariant,
} from './enums';

// ============================================================================
// Core Domain Models
// ============================================================================

export type {
  BaseModel,
  Salon,
  SalonWithRelations,
  Booking,
  BookingWithRelations,
  Message,
  MessageWithRelations,
  Template,
  TemplateWithRelations,
  Conversation,
  WebhookLog,
  AIConversation,
  AIMessage,
  User,
  UserWithRelations,
  DashboardStats,
  AnalyticsData,
  BusinessHours,
  SalonSettings,
  CustomerProfile,
  Notification,
  Master,
  MasterListItem,
  MasterAvailability,
  MasterScheduleItem,
  MasterSpecialization,
  TimeSlot,
  DaySchedule,
  WorkingHours,
  StaffMember,
  StaffListItem,
  Service,
  ServiceListItem,
  BookingId,
  MessageId,
  SalonId,
  UserId,
  ConversationId,
  TemplateId,
  PhoneNumber,
  EmailAddress,
  ISODateString,
  UUID,
} from './models';

// ============================================================================
// API Types
// ============================================================================

export type {
  ApiResponse,
  ApiError,
  PaginatedResponse,
  PaginationParams,
  DateRangeParams,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  PasswordResetRequest,
  PasswordResetConfirmRequest,
  CreateSalonRequest,
  UpdateSalonRequest,
  GetSalonsParams,
  CreateBookingRequest,
  UpdateBookingRequest,
  GetBookingsParams,
  BulkUpdateBookingsRequest,
  SendMessageRequest,
  SendTemplateMessageRequest,
  GetMessagesParams,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  GetTemplatesParams,
  GetConversationsParams,
  UpdateConversationRequest,
  GetDashboardStatsParams,
  GetAnalyticsParams,
  AnalyticsResponse,
  GetCustomersParams,
  CreateMasterRequest,
  UpdateMasterRequest,
  GetMastersParams,
  GetMasterAvailabilityParams,
  GetMasterScheduleParams,
  CreateStaffRequest,
  UpdateStaffRequest,
  GetStaffParams,
  CreateServiceRequest,
  UpdateServiceRequest,
  GetServicesParams,
  CustomerListItem,
  WhatsAppWebhookPayload,
  FileUploadRequest,
  FileUploadResponse,
  ExtractData,
  ExtractItem,
  ListResponse,
  DetailResponse,
  CreateResponse,
  UpdateResponse,
  DeleteResponse,
} from './api';

// NOTE: Type aliases exported from ./api for backwards compatibility
// See src/types/api.ts for AuthResponse and LoginCredentials definitions

export { isApiError } from './api';
export type { AuthResponse, LoginCredentials } from './api';

// ============================================================================
// Component Prop Types
// ============================================================================

export type {
  BaseComponentProps,
  ButtonVariant,
  ButtonProps,
  IconButtonProps,
  InputProps,
  TextareaProps,
  SelectProps,
  CheckboxProps,
  RadioProps,
  SwitchProps,
  CardProps,
  CardHeaderProps,
  ModalProps,
  DrawerProps,
  TableColumn,
  TableProps,
  BadgeProps,
  TagProps,
  LoadingSpinnerProps,
  SkeletonProps,
  AlertType,
  AlertProps,
  ToastProps,
  MenuItem,
  DropdownProps,
  PaginationProps,
  AvatarProps,
  AvatarGroupProps,
  BreadcrumbItem,
  BreadcrumbProps,
  FormFieldError,
  FormProps,
} from './components';

// ============================================================================
// Utility Types
// ============================================================================

export type {
  DeepPartial,
  DeepReadonly,
  DeepRequired,
  RequiredBy,
  OptionalBy,
  Nullable,
  Optional,
  Maybe,
  NonNullish,
  ValueOf,
  KeysOf,
  KeysMatching,
  PathsOf,
  AsyncState,
  LoadingState,
  Paginated,
  Awaited,
  ArrayElement,
  Mutable,
  DeepMutable,
  PartialBy,
  Merge,
  DeepMerge,
  Fn,
  FunctionParams,
  FunctionReturn,
  Brand,
  Opaque,
  JSONValue,
  JSONObject,
  JSONArray,
  Prettify,
  NonFunctionPropertyNames,
  NonFunctionProperties,
  FunctionPropertyNames,
  FunctionProperties,
  MapToType,
  TupleToUnion,
  UnionToIntersection,
  StringLiteral,
  Extends,
  If,
  StrictOmit,
  StrictPick,
  TypeGuard,
  TypePredicate,
  DiscriminateUnion,
  Reverse,
  Constructor,
  AbstractConstructor,
} from './utils';

// ============================================================================
// Validation Schemas (Zod)
// ============================================================================

export {
  emailSchema,
  passwordSchema,
  phoneNumberSchema,
  uuidSchema,
  isoDateSchema,
  urlSchema,
  nonEmptyStringSchema,
  positiveNumberSchema,
  nonNegativeNumberSchema,
  loginSchema,
  registerSchema,
  passwordResetRequestSchema,
  passwordResetConfirmSchema,
  createSalonSchema,
  updateSalonSchema,
  createBookingSchema,
  updateBookingSchema,
  bookingFilterSchema,
  sendMessageSchema,
  sendTemplateMessageSchema,
  messageFilterSchema,
  templateButtonSchema,
  createTemplateSchema,
  updateTemplateSchema,
  templateFilterSchema,
  paginationSchema,
  dateRangeSchema,
  businessHoursDaySchema,
  businessHoursSchema,
  searchSchema,
  fileUploadSchema,
  validate,
  formatZodErrors,
  getFirstZodError,
} from './schemas';

export type {
  LoginInput,
  RegisterInput,
  PasswordResetRequestInput,
  PasswordResetConfirmInput,
  CreateSalonInput,
  UpdateSalonInput,
  CreateBookingInput,
  UpdateBookingInput,
  BookingFilterInput,
  SendMessageInput,
  SendTemplateMessageInput,
  MessageFilterInput,
  CreateTemplateInput,
  UpdateTemplateInput,
  TemplateFilterInput,
  PaginationInput,
  DateRangeInput,
  BusinessHoursInput,
  SearchInput,
  FileUploadInput,
} from './schemas';

// ============================================================================
// Type Aliases for Common Patterns
// ============================================================================

/**
 * Common async data loading state
 */
export type DataState<T> = import('./utils').AsyncState<T, Error>;

/**
 * Common paginated data type
 */
export type PaginatedData<T> = import('./api').PaginatedResponse<T>;

/**
 * Common API result type (success or error)
 */
export type ApiResult<T> = import('./api').ApiResponse<T> | import('./api').ApiError;

/**
 * Event handler type for React events
 */
export type EventHandler<T = Element> = (event: React.SyntheticEvent<T>) => void;

/**
 * Change handler type for form inputs
 */
export type ChangeHandler<T = HTMLInputElement> = (event: React.ChangeEvent<T>) => void;

/**
 * Click handler type for clickable elements
 */
export type ClickHandler<T = HTMLElement> = (event: React.MouseEvent<T>) => void;

/**
 * Submit handler type for forms
 */
export type SubmitHandler = (event: React.FormEvent<HTMLFormElement>) => void;

/**
 * Async function type
 */
export type AsyncFunction<T = void> = () => Promise<T>;

/**
 * Callback function type with single parameter
 */
export type Callback<T = void, R = void> = (arg: T) => R;

/**
 * Void callback type
 */
export type VoidCallback = () => void;

/**
 * ID type (UUID string)
 */
export type ID = string;

/**
 * Timestamp type (ISO date string or Date)
 */
export type Timestamp = string | Date;

/**
 * Status type for common status values
 */
export type Status = 'idle' | 'loading' | 'success' | 'error';

/**
 * Sort order type
 */
export type SortOrder = 'asc' | 'desc';

/**
 * Theme mode type
 */
export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * Responsive breakpoint type
 */
export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

// ============================================================================
// Re-export React types for convenience
// ============================================================================

export type {
  ReactNode,
  ReactElement,
  FC,
  ComponentProps,
  ComponentPropsWithRef,
  ComponentPropsWithoutRef,
  RefObject,
  MutableRefObject,
  CSSProperties,
} from 'react';
