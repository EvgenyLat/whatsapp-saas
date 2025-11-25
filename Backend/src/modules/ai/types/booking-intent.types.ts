/**
 * Booking Intent Type Definitions
 *
 * Type definitions for the Quick Booking flow
 *
 * @see specs/001-whatsapp-quick-booking/contracts/services/all-services.interface.ts
 */

/**
 * Customer's booking intent parsed from natural language
 */
export interface BookingIntent {
  /** Service ID if identified */
  serviceId?: string;

  /** Service name (for display) */
  serviceName?: string;

  /** Preferred master ID if specified */
  masterId?: string;

  /** Master name (for display) */
  masterName?: string;

  /** Preferred date in ISO format (YYYY-MM-DD) */
  preferredDate?: string;

  /** Preferred time in HH:mm format */
  preferredTime?: string;

  /** Flexible with time (e.g., "anytime Friday") */
  isFlexible?: boolean;

  /** Additional notes or preferences */
  notes?: string;

  /** Confidence score (0-1) from AI parsing */
  confidence?: number;

  /** Detected language */
  language?: string;
}

/**
 * Partial intent update from typed message
 */
export interface IntentUpdate {
  /** Updated service ID */
  serviceId?: string;

  /** Updated master ID */
  masterId?: string;

  /** Updated preferred date */
  preferredDate?: string;

  /** Updated preferred time */
  preferredTime?: string;

  /** Updated flexibility */
  isFlexible?: boolean;
}

/**
 * Available time slot suggestion
 */
export interface SlotSuggestion {
  /** Unique slot identifier */
  id: string;

  /** Date in ISO format (YYYY-MM-DD) */
  date: string;

  /** Start time in HH:mm format */
  startTime: string;

  /** End time in HH:mm format */
  endTime: string;

  /** Duration in minutes */
  duration: number;

  /** Master ID */
  masterId: string;

  /** Master name */
  masterName: string;

  /** Service ID */
  serviceId: string;

  /** Service name */
  serviceName: string;

  /** Price in cents */
  price: number;

  /** Is this customer's preferred master */
  isPreferred?: boolean;

  /** Proximity score (higher = closer to customer's preference) */
  proximityScore?: number;

  /** Proximity label */
  proximityLabel?: 'exact' | 'close' | 'same-day' | 'same-week' | 'alternative';
}

/**
 * Customer's usual booking preferences
 */
export interface CustomerPreferences {
  /** Most frequently booked service ID */
  usualServiceId: string;

  /** Most frequently booked service name */
  usualServiceName: string;

  /** Preferred master ID */
  preferredMasterId?: string;

  /** Preferred master name */
  preferredMasterName?: string;

  /** Preferred day of week (0-6, 0=Sunday) */
  preferredDayOfWeek?: number;

  /** Preferred time of day in HH:mm format */
  preferredTime?: string;

  /** Number of past bookings */
  bookingCount: number;

  /** Last booking date */
  lastBookingDate: Date;
}

/**
 * Interactive message payload (WhatsApp format)
 */
export interface InteractiveMessagePayload {
  /** Message type */
  type: 'button' | 'list';

  /** Header (optional) */
  header?: {
    type: 'text';
    text: string;
  };

  /** Body text */
  body: {
    text: string;
  };

  /** Footer (optional) */
  footer?: {
    text: string;
  };

  /** Action buttons or list */
  action: InteractiveAction;
}

/**
 * Interactive action (buttons or list)
 */
export interface InteractiveAction {
  /** Button actions */
  buttons?: InteractiveButton[];

  /** List button */
  button?: string;

  /** List sections */
  sections?: InteractiveSection[];
}

/**
 * Interactive button
 */
export interface InteractiveButton {
  /** Button type */
  type: 'reply';

  /** Reply data */
  reply: {
    id: string;
    title: string;
  };
}

/**
 * Interactive list section
 */
export interface InteractiveSection {
  /** Section title */
  title: string;

  /** Section rows */
  rows: InteractiveRow[];
}

/**
 * Interactive list row
 */
export interface InteractiveRow {
  /** Row ID */
  id: string;

  /** Row title */
  title: string;

  /** Row description */
  description?: string;
}

/**
 * Slot search parameters
 */
export interface SlotSearchParams {
  /** Salon ID */
  salonId: string;

  /** Service ID */
  serviceId: string;

  /** Preferred date (optional) */
  preferredDate?: string;

  /** Preferred time (optional) */
  preferredTime?: string;

  /** Preferred master ID (optional) */
  masterId?: string;

  /** Max days to search ahead */
  maxDaysAhead?: number;

  /** Max slots to return */
  limit?: number;
}

/**
 * Slot search result
 */
export interface SlotSearchResult {
  /** Available slots */
  slots: SlotSuggestion[];

  /** Total slots found */
  totalFound: number;

  /** Days searched */
  searchedDays: number;

  /** More slots available beyond limit */
  hasMore: boolean;
}

/**
 * Popular time slot
 */
export interface PopularTimeSlot {
  /** Day of week (0-6, 0=Sunday) */
  dayOfWeek: number;

  /** Time in HH:mm format */
  time: string;

  /** Booking count */
  bookingCount: number;

  /** Weighted score */
  score: number;

  /** Is available now */
  isAvailable?: boolean;
}

/**
 * Popular times query
 */
export interface PopularTimesQuery {
  /** Salon ID */
  salonId: string;

  /** Days to look back */
  lookbackDays?: number;

  /** Max results to return */
  limit?: number;

  /** Include availability status */
  includeAvailability?: boolean;
}

/**
 * Popular times result
 */
export interface PopularTimesResult {
  /** Popular time slots */
  times: PopularTimeSlot[];

  /** Data source */
  dataSource: 'historical' | 'default';

  /** Historical bookings count */
  historicalBookingsCount?: number;
}

/**
 * Waitlist entry
 */
export interface WaitlistEntry {
  /** Entry ID */
  id: string;

  /** Customer phone */
  customerPhone: string;

  /** Customer name */
  customerName?: string;

  /** Service ID */
  serviceId: string;

  /** Preferred date */
  preferredDate?: string;

  /** Preferred time */
  preferredTime?: string;

  /** Status */
  status: 'pending' | 'notified' | 'booked' | 'passed' | 'expired';

  /** Notified at */
  notifiedAt?: Date;

  /** Expires at */
  expiresAt?: Date;

  /** Created at */
  createdAt: Date;
}
