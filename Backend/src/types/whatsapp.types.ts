/**
 * WhatsApp Cloud API Type Definitions
 *
 * Comprehensive TypeScript interfaces for WhatsApp interactive messages,
 * webhooks, and button/list payloads.
 *
 * References:
 * - Meta WhatsApp Cloud API Documentation (2024)
 * - specs/001-whatsapp-quick-booking/contracts/whatsapp/
 *
 * @module types/whatsapp
 */

// ============================================================================
// WEBHOOK PAYLOADS (Incoming from WhatsApp)
// ============================================================================

/**
 * Root webhook payload received from WhatsApp Cloud API
 *
 * @example
 * ```json
 * {
 *   "object": "whatsapp_business_account",
 *   "entry": [{ ... }]
 * }
 * ```
 */
export interface WhatsAppWebhookPayload {
  /** Always "whatsapp_business_account" */
  object: 'whatsapp_business_account';
  /** Array of webhook entries (usually one) */
  entry: WebhookEntry[];
}

/**
 * Webhook entry containing business account ID and changes
 */
export interface WebhookEntry {
  /** WhatsApp Business Account ID */
  id: string;
  /** Array of changes (message events, status updates, etc.) */
  changes: WebhookChange[];
}

/**
 * Webhook change event
 */
export interface WebhookChange {
  /** Event data containing messages, contacts, metadata */
  value: WebhookValue;
  /** Always "messages" for message events */
  field: 'messages';
}

/**
 * Webhook value containing the actual message data
 */
export interface WebhookValue {
  /** Always "whatsapp" */
  messaging_product: 'whatsapp';
  /** Business phone number metadata */
  metadata: WebhookMetadata;
  /** Customer contact information */
  contacts?: Contact[];
  /** Incoming messages */
  messages?: Message[];
}

/**
 * Business phone number metadata
 */
export interface WebhookMetadata {
  /** Business phone number (formatted, e.g., "+1 555-123-4567") */
  display_phone_number: string;
  /** Phone number ID (unique identifier) */
  phone_number_id: string;
}

/**
 * Customer contact information
 */
export interface Contact {
  /** Customer profile */
  profile?: {
    /** Customer's WhatsApp profile name */
    name: string;
  };
  /** WhatsApp ID (phone number without +) - matches pattern: [1-9]\d{1,14} */
  wa_id: string;
}

/**
 * Incoming message from customer
 */
export interface Message {
  /** Customer phone number (without +) - matches pattern: [1-9]\d{1,14} */
  from: string;
  /** Message ID (e.g., "wamid.HBgNMTIzNDU2Nzg5MAA=") */
  id: string;
  /** Unix timestamp */
  timestamp: string;
  /** Message type */
  type: 'interactive' | 'text' | 'button' | 'image';
  /** Interactive message payload (for button clicks) */
  interactive?: Interactive;
  /** Text message payload */
  text?: {
    body: string;
  };
}

/**
 * Interactive message response (button click or list selection)
 */
export interface Interactive {
  /** Type of interactive response */
  type: 'button_reply' | 'list_reply';
  /** Button click payload */
  button_reply?: ButtonReply;
  /** List selection payload */
  list_reply?: ListReply;
}

/**
 * Button click payload received when customer clicks a Reply Button
 *
 * @example
 * ```typescript
 * {
 *   id: "slot_2024-10-25_15:00_m123",
 *   title: "3:00 PM - Sarah"
 * }
 * ```
 */
export interface ButtonReply {
  /**
   * Button ID set when sending the message
   *
   * Format: `{type}_{context}`
   * - type: "slot" | "confirm" | "waitlist" | "action" | "nav"
   * - context: Underscore-delimited parameters
   *
   * Max length: 256 characters
   * Pattern: `^(slot|confirm|waitlist|action|nav)_[a-zA-Z0-9_:-]+$`
   *
   * @example "slot_2024-10-25_15:00_m123"
   * @example "confirm_booking_b456"
   * @example "nav_next_page2"
   */
  id: string;

  /**
   * Button display text (max 20 characters)
   * @example "3:00 PM - Sarah"
   */
  title: string;
}

/**
 * List selection payload received when customer selects from List Message
 *
 * @example
 * ```typescript
 * {
 *   id: "slot_2024-10-25_15:00_m123",
 *   title: "3:00 PM - Sarah",
 *   description: "60 min • $50"
 * }
 * ```
 */
export interface ListReply {
  /**
   * Row ID set when sending the message
   *
   * Format: Same as ButtonReply.id
   * Max length: 200 characters
   * Pattern: `^(slot|confirm|waitlist|action|nav)_[a-zA-Z0-9_:-]+$`
   */
  id: string;

  /** Row title (max 24 characters) */
  title: string;

  /** Row description (max 72 characters, optional) */
  description?: string;
}

// ============================================================================
// OUTGOING MESSAGE PAYLOADS (Sending to WhatsApp)
// ============================================================================

/**
 * Base message payload for sending any message to customer
 */
export interface OutgoingMessageBase {
  /** Always "whatsapp" */
  messaging_product: 'whatsapp';
  /** Customer phone number in E.164 format (e.g., "+1234567890") */
  to: string;
}

/**
 * Interactive message payload (base for buttons and lists)
 */
export interface InteractiveMessagePayload extends OutgoingMessageBase {
  /** Always "interactive" for buttons/lists */
  type: 'interactive';
  /** Interactive message content */
  interactive: InteractiveButtons | InteractiveList;
}

/**
 * Reply Buttons interactive message (max 3 buttons)
 *
 * Use when presenting 1-3 options to the customer.
 * For 4+ options, use InteractiveList instead.
 *
 * @example
 * ```typescript
 * {
 *   type: "button",
 *   body: { text: "Available times on Friday..." },
 *   action: {
 *     buttons: [
 *       { type: "reply", reply: { id: "slot_2024-10-25_14:00_m123", title: "2:00 PM - Sarah" } },
 *       { type: "reply", reply: { id: "slot_2024-10-25_15:00_m123", title: "3:00 PM - Sarah" } }
 *     ]
 *   }
 * }
 * ```
 */
export interface InteractiveButtons {
  /** Always "button" for Reply Buttons */
  type: 'button';
  /** Optional header */
  header?: InteractiveHeader;
  /** Main message body (required) */
  body: InteractiveBody;
  /** Optional footer */
  footer?: InteractiveFooter;
  /** Buttons action */
  action: ButtonAction;
}

/**
 * List Message interactive message (4-10 items per section)
 *
 * Use when presenting 4+ options to the customer.
 * For 1-3 options, use InteractiveButtons instead.
 *
 * @example
 * ```typescript
 * {
 *   type: "list",
 *   header: { type: "text", text: "Next Available Times" },
 *   body: { text: "Friday is fully booked. Here are alternatives:" },
 *   action: {
 *     button: "Select Time",
 *     sections: [
 *       {
 *         title: "Saturday, Oct 26",
 *         rows: [
 *           { id: "slot_2024-10-26_10:00_m123", title: "10:00 AM - Sarah", description: "60 min • $50" }
 *         ]
 *       }
 *     ]
 *   }
 * }
 * ```
 */
export interface InteractiveList {
  /** Always "list" for List Messages */
  type: 'list';
  /** Optional header */
  header?: InteractiveHeader;
  /** Main message body (required) */
  body: InteractiveBody;
  /** Optional footer */
  footer?: InteractiveFooter;
  /** List action */
  action: ListAction;
}

/**
 * Interactive message header
 */
export interface InteractiveHeader {
  /** Always "text" for text headers */
  type: 'text';
  /** Header text (max 60 characters) */
  text: string;
}

/**
 * Interactive message body
 */
export interface InteractiveBody {
  /** Main message text (max 1024 characters) */
  text: string;
}

/**
 * Interactive message footer
 */
export interface InteractiveFooter {
  /** Footer text (max 60 characters) */
  text: string;
}

/**
 * Button action for Reply Buttons
 */
export interface ButtonAction {
  /** Array of Reply Buttons (min 1, max 3) */
  buttons: ReplyButton[];
}

/**
 * Reply Button definition
 *
 * @example
 * ```typescript
 * {
 *   type: "reply",
 *   reply: {
 *     id: "slot_2024-10-25_15:00_m123",
 *     title: "3:00 PM - Sarah"
 *   }
 * }
 * ```
 */
export interface ReplyButton {
  /** Always "reply" for Reply Buttons */
  type: 'reply';
  /** Button content */
  reply: ReplyButtonContent;
}

/**
 * Reply Button content
 */
export interface ReplyButtonContent {
  /**
   * Button ID (max 256 characters)
   * Pattern: `^(slot|confirm|waitlist|action|nav)_[a-zA-Z0-9_:-]+$`
   */
  id: string;
  /** Button display text (max 20 characters) */
  title: string;
}

/**
 * List action for List Messages
 */
export interface ListAction {
  /**
   * Button text to open list (max 20 characters)
   * @example "Select Time"
   */
  button: string;
  /** Array of sections (group rows by category) */
  sections: ListSection[];
}

/**
 * List section (group of rows)
 */
export interface ListSection {
  /**
   * Section title (max 24 characters)
   * @example "Saturday, Oct 26"
   */
  title: string;
  /** Array of rows (min 1, max 10 per section) */
  rows: ListRow[];
}

/**
 * List row definition
 *
 * @example
 * ```typescript
 * {
 *   id: "slot_2024-10-26_10:00_m123",
 *   title: "10:00 AM - Sarah",
 *   description: "60 min • $50"
 * }
 * ```
 */
export interface ListRow {
  /**
   * Row ID (max 200 characters)
   * Pattern: `^(slot|confirm|waitlist|action|nav)_[a-zA-Z0-9_:-]+$`
   */
  id: string;
  /** Row title (max 24 characters) */
  title: string;
  /** Row description (max 72 characters, optional) */
  description?: string;
}

// ============================================================================
// BUTTON ID PARSING
// ============================================================================

/**
 * Button ID type prefix
 */
export type ButtonIdType = 'slot' | 'confirm' | 'waitlist' | 'action' | 'nav';

/**
 * Parsed button ID structure
 *
 * @example
 * ```typescript
 * // Input: "slot_2024-10-25_15:00_m123"
 * {
 *   type: "slot",
 *   context: "2024-10-25_15:00_m123"
 * }
 * ```
 */
export interface ParsedButtonId {
  /** Button type */
  type: ButtonIdType;
  /** Context string (everything after first underscore) */
  context: string;
}

/**
 * Parsed slot button ID
 *
 * Format: `slot_{date}_{time}_{masterId}`
 *
 * @example
 * ```typescript
 * // Input: "slot_2024-10-25_15:00_m123"
 * {
 *   date: "2024-10-25",
 *   time: "15:00",
 *   masterId: "m123"
 * }
 * ```
 */
export interface ParsedSlotButton {
  /** Date in ISO format (YYYY-MM-DD) */
  date: string;
  /** Time in 24-hour format (HH:MM) */
  time: string;
  /** Master ID (e.g., "m123") */
  masterId: string;
}

/**
 * Parsed action button ID
 *
 * Format: `action_{actionName}`
 *
 * @example
 * ```typescript
 * // Input: "action_cancel"
 * { action: "cancel" }
 *
 * // Input: "action_call_salon"
 * { action: "call_salon" }
 * ```
 */
export interface ParsedActionButton {
  /** Action name */
  action: string;
}

/**
 * Parsed navigation button ID
 *
 * Format: `nav_{direction}` or `nav_{direction}_{page}`
 *
 * @example
 * ```typescript
 * // Input: "nav_next"
 * { direction: "next", page: undefined }
 *
 * // Input: "nav_prev_2"
 * { direction: "prev", page: "2" }
 * ```
 */
export interface ParsedNavigationButton {
  /** Navigation direction */
  direction: string;
  /** Optional page number */
  page?: string;
}

/**
 * Parsed confirm button ID
 *
 * Format: `confirm_{action}_{entityId}`
 *
 * @example
 * ```typescript
 * // Input: "confirm_booking_b456"
 * {
 *   action: "booking",
 *   entityId: "b456"
 * }
 * ```
 */
export interface ParsedConfirmButton {
  /** Confirmation action */
  action: string;
  /** Entity ID being confirmed */
  entityId: string;
}

/**
 * Parsed waitlist button ID
 *
 * Format: `waitlist_{action}_{waitlistId}`
 *
 * @example
 * ```typescript
 * // Input: "waitlist_join_w789"
 * {
 *   action: "join",
 *   waitlistId: "w789"
 * }
 * ```
 */
export interface ParsedWaitlistButton {
  /** Waitlist action */
  action: string;
  /** Waitlist ID */
  waitlistId: string;
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * WhatsApp message status
 */
export type MessageStatus = 'sent' | 'delivered' | 'read' | 'failed';

/**
 * WhatsApp error response
 */
export interface WhatsAppError {
  error: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id: string;
  };
}

/**
 * Type guard to check if response is a WhatsApp error
 */
export function isWhatsAppError(obj: unknown): obj is WhatsAppError {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'error' in obj &&
    typeof (obj as WhatsAppError).error === 'object' &&
    'message' in (obj as WhatsAppError).error
  );
}

/**
 * Type guard to check if message is interactive
 */
export function isInteractiveMessage(message: Message): message is Message & { interactive: Interactive } {
  return message.type === 'interactive' && message.interactive !== undefined;
}

/**
 * Type guard to check if interactive response is button reply
 */
export function isButtonReply(interactive: Interactive): interactive is Interactive & { button_reply: ButtonReply } {
  return interactive.type === 'button_reply' && interactive.button_reply !== undefined;
}

/**
 * Type guard to check if interactive response is list reply
 */
export function isListReply(interactive: Interactive): interactive is Interactive & { list_reply: ListReply } {
  return interactive.type === 'list_reply' && interactive.list_reply !== undefined;
}
