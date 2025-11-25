/**
 * T020: WhatsApp Webhook Mock Server
 *
 * This module provides comprehensive mocking utilities for WhatsApp Cloud API responses
 * and webhook payloads. It enables testing of WhatsApp integration without making
 * actual API calls to Meta's servers.
 *
 * Features:
 * - Mock WhatsApp Cloud API responses (send message, get media, etc.)
 * - Mock webhook payloads (button clicks, text messages, media, etc.)
 * - Configurable responses for different test scenarios
 * - Type-safe mock data structures
 * - Realistic webhook event simulation
 *
 * Usage:
 * ```typescript
 * import {
 *   mockWhatsAppAPI,
 *   createTextMessageWebhook,
 *   createButtonClickWebhook,
 *   mockSendMessageResponse,
 * } from './mocks/whatsapp-api.mock';
 *
 * // Mock API responses
 * jest.mock('axios');
 * const mockedAxios = axios as jest.Mocked<typeof axios>;
 * mockedAxios.post.mockResolvedValue(mockSendMessageResponse('msg_123'));
 *
 * // Create webhook payload
 * const webhook = createTextMessageWebhook({
 *   from: '+1234567890',
 *   text: 'Hello!',
 * });
 * ```
 */

import { randomUUID } from 'crypto';

// ============================================================================
// Type Definitions
// ============================================================================

export interface WhatsAppWebhookValue {
  messaging_product: string;
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts?: Array<{
    profile: {
      name: string;
    };
    wa_id: string;
  }>;
  messages?: Array<{
    from: string;
    id: string;
    timestamp: string;
    type: string;
    text?: {
      body: string;
    };
    button?: {
      payload: string;
      text: string;
    };
    interactive?: {
      type: string;
      button_reply?: {
        id: string;
        title: string;
      };
      list_reply?: {
        id: string;
        title: string;
        description?: string;
      };
    };
    image?: {
      id: string;
      mime_type: string;
      sha256: string;
      caption?: string;
    };
    document?: {
      id: string;
      mime_type: string;
      sha256: string;
      filename: string;
      caption?: string;
    };
    audio?: {
      id: string;
      mime_type: string;
      sha256: string;
    };
    video?: {
      id: string;
      mime_type: string;
      sha256: string;
      caption?: string;
    };
    location?: {
      latitude: number;
      longitude: number;
      name?: string;
      address?: string;
    };
    context?: {
      from: string;
      id: string;
    };
  }>;
  statuses?: Array<{
    id: string;
    status: string;
    timestamp: string;
    recipient_id: string;
    conversation?: {
      id: string;
      origin: {
        type: string;
      };
    };
    pricing?: {
      billable: boolean;
      pricing_model: string;
      category: string;
    };
  }>;
}

export interface WhatsAppWebhookEntry {
  id: string;
  changes: Array<{
    value: WhatsAppWebhookValue;
    field: string;
  }>;
}

export interface WhatsAppWebhookPayload {
  object: string;
  entry: WhatsAppWebhookEntry[];
}

// ============================================================================
// Mock Configuration
// ============================================================================

export const MOCK_CONFIG = {
  phoneNumberId: '123456789012345',
  displayPhoneNumber: '+1234567890',
  businessAccountId: '123456789',
  wabaId: 'WABA_123',
  apiVersion: 'v18.0',
  baseUrl: 'https://graph.facebook.com/v18.0',
};

// ============================================================================
// API Response Mocks
// ============================================================================

/**
 * Mock successful send message API response
 */
export function mockSendMessageResponse(messageId?: string) {
  return {
    status: 200,
    data: {
      messaging_product: 'whatsapp',
      contacts: [
        {
          input: '+1234567890',
          wa_id: '1234567890',
        },
      ],
      messages: [
        {
          id: messageId || `wamid.${randomUUID()}`,
        },
      ],
    },
  };
}

/**
 * Mock failed send message API response
 */
export function mockSendMessageError(errorCode: number = 131047, errorMessage: string = 'Message failed to send') {
  return {
    status: 400,
    data: {
      error: {
        message: errorMessage,
        type: 'OAuthException',
        code: errorCode,
        error_data: {
          messaging_product: 'whatsapp',
          details: errorMessage,
        },
        error_subcode: 2494055,
        fbtrace_id: 'AbCdEfGhIjKl123',
      },
    },
  };
}

/**
 * Mock get media URL API response
 */
export function mockGetMediaUrlResponse(mediaId: string, mimeType: string = 'image/jpeg') {
  return {
    status: 200,
    data: {
      messaging_product: 'whatsapp',
      url: `https://lookaside.fbsbx.com/whatsapp_business/attachments/?mid=${mediaId}&ext=1234567890&hash=AbCdEfGhIjKl`,
      mime_type: mimeType,
      sha256: 'abc123def456',
      file_size: 12345,
      id: mediaId,
    },
  };
}

/**
 * Mock upload media API response
 */
export function mockUploadMediaResponse(mediaId?: string) {
  return {
    status: 200,
    data: {
      id: mediaId || randomUUID(),
    },
  };
}

/**
 * Mock get phone number API response
 */
export function mockGetPhoneNumberResponse() {
  return {
    status: 200,
    data: {
      verified_name: 'Test Salon',
      display_phone_number: MOCK_CONFIG.displayPhoneNumber,
      quality_rating: 'GREEN',
      id: MOCK_CONFIG.phoneNumberId,
    },
  };
}

/**
 * Mock WhatsApp Business Account API response
 */
export function mockGetWABAResponse() {
  return {
    status: 200,
    data: {
      id: MOCK_CONFIG.wabaId,
      name: 'Test Business',
      timezone_id: '1',
      message_template_namespace: 'test_namespace',
    },
  };
}

/**
 * Mock rate limit error
 */
export function mockRateLimitError() {
  return {
    status: 429,
    data: {
      error: {
        message: 'Rate limit exceeded',
        type: 'OAuthException',
        code: 4,
        fbtrace_id: 'RateLimit123',
      },
    },
  };
}

// ============================================================================
// Webhook Payload Mocks - Text Messages
// ============================================================================

/**
 * Create a text message webhook payload
 */
export function createTextMessageWebhook(options: {
  from: string;
  text: string;
  messageId?: string;
  timestamp?: string;
  name?: string;
  phoneNumberId?: string;
  contextMessageId?: string;
}): WhatsAppWebhookPayload {
  const {
    from,
    text,
    messageId = `wamid.${randomUUID()}`,
    timestamp = Math.floor(Date.now() / 1000).toString(),
    name = 'Test User',
    phoneNumberId = MOCK_CONFIG.phoneNumberId,
    contextMessageId,
  } = options;

  const message: any = {
    from,
    id: messageId,
    timestamp,
    type: 'text',
    text: {
      body: text,
    },
  };

  if (contextMessageId) {
    message.context = {
      from,
      id: contextMessageId,
    };
  }

  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: MOCK_CONFIG.businessAccountId,
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: MOCK_CONFIG.displayPhoneNumber,
                phone_number_id: phoneNumberId,
              },
              contacts: [
                {
                  profile: {
                    name,
                  },
                  wa_id: from.replace('+', ''),
                },
              ],
              messages: [message],
            },
            field: 'messages',
          },
        ],
      },
    ],
  };
}

// ============================================================================
// Webhook Payload Mocks - Interactive Messages
// ============================================================================

/**
 * Create a button click webhook payload
 */
export function createButtonClickWebhook(options: {
  from: string;
  buttonId: string;
  buttonText: string;
  messageId?: string;
  timestamp?: string;
  name?: string;
}): WhatsAppWebhookPayload {
  const {
    from,
    buttonId,
    buttonText,
    messageId = `wamid.${randomUUID()}`,
    timestamp = Math.floor(Date.now() / 1000).toString(),
    name = 'Test User',
  } = options;

  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: MOCK_CONFIG.businessAccountId,
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: MOCK_CONFIG.displayPhoneNumber,
                phone_number_id: MOCK_CONFIG.phoneNumberId,
              },
              contacts: [
                {
                  profile: {
                    name,
                  },
                  wa_id: from.replace('+', ''),
                },
              ],
              messages: [
                {
                  from,
                  id: messageId,
                  timestamp,
                  type: 'interactive',
                  interactive: {
                    type: 'button_reply',
                    button_reply: {
                      id: buttonId,
                      title: buttonText,
                    },
                  },
                },
              ],
            },
            field: 'messages',
          },
        ],
      },
    ],
  };
}

/**
 * Create a list reply webhook payload
 */
export function createListReplyWebhook(options: {
  from: string;
  listId: string;
  listTitle: string;
  listDescription?: string;
  messageId?: string;
  timestamp?: string;
  name?: string;
}): WhatsAppWebhookPayload {
  const {
    from,
    listId,
    listTitle,
    listDescription,
    messageId = `wamid.${randomUUID()}`,
    timestamp = Math.floor(Date.now() / 1000).toString(),
    name = 'Test User',
  } = options;

  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: MOCK_CONFIG.businessAccountId,
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: MOCK_CONFIG.displayPhoneNumber,
                phone_number_id: MOCK_CONFIG.phoneNumberId,
              },
              contacts: [
                {
                  profile: {
                    name,
                  },
                  wa_id: from.replace('+', ''),
                },
              ],
              messages: [
                {
                  from,
                  id: messageId,
                  timestamp,
                  type: 'interactive',
                  interactive: {
                    type: 'list_reply',
                    list_reply: {
                      id: listId,
                      title: listTitle,
                      description: listDescription,
                    },
                  },
                },
              ],
            },
            field: 'messages',
          },
        ],
      },
    ],
  };
}

// ============================================================================
// Webhook Payload Mocks - Media Messages
// ============================================================================

/**
 * Create an image message webhook payload
 */
export function createImageMessageWebhook(options: {
  from: string;
  imageId: string;
  mimeType?: string;
  caption?: string;
  messageId?: string;
  timestamp?: string;
  name?: string;
}): WhatsAppWebhookPayload {
  const {
    from,
    imageId,
    mimeType = 'image/jpeg',
    caption,
    messageId = `wamid.${randomUUID()}`,
    timestamp = Math.floor(Date.now() / 1000).toString(),
    name = 'Test User',
  } = options;

  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: MOCK_CONFIG.businessAccountId,
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: MOCK_CONFIG.displayPhoneNumber,
                phone_number_id: MOCK_CONFIG.phoneNumberId,
              },
              contacts: [
                {
                  profile: {
                    name,
                  },
                  wa_id: from.replace('+', ''),
                },
              ],
              messages: [
                {
                  from,
                  id: messageId,
                  timestamp,
                  type: 'image',
                  image: {
                    id: imageId,
                    mime_type: mimeType,
                    sha256: 'abc123def456',
                    caption,
                  },
                },
              ],
            },
            field: 'messages',
          },
        ],
      },
    ],
  };
}

/**
 * Create a document message webhook payload
 */
export function createDocumentMessageWebhook(options: {
  from: string;
  documentId: string;
  filename: string;
  mimeType?: string;
  caption?: string;
  messageId?: string;
  timestamp?: string;
  name?: string;
}): WhatsAppWebhookPayload {
  const {
    from,
    documentId,
    filename,
    mimeType = 'application/pdf',
    caption,
    messageId = `wamid.${randomUUID()}`,
    timestamp = Math.floor(Date.now() / 1000).toString(),
    name = 'Test User',
  } = options;

  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: MOCK_CONFIG.businessAccountId,
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: MOCK_CONFIG.displayPhoneNumber,
                phone_number_id: MOCK_CONFIG.phoneNumberId,
              },
              contacts: [
                {
                  profile: {
                    name,
                  },
                  wa_id: from.replace('+', ''),
                },
              ],
              messages: [
                {
                  from,
                  id: messageId,
                  timestamp,
                  type: 'document',
                  document: {
                    id: documentId,
                    mime_type: mimeType,
                    sha256: 'abc123def456',
                    filename,
                    caption,
                  },
                },
              ],
            },
            field: 'messages',
          },
        ],
      },
    ],
  };
}

/**
 * Create a location message webhook payload
 */
export function createLocationMessageWebhook(options: {
  from: string;
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
  messageId?: string;
  timestamp?: string;
  userName?: string;
}): WhatsAppWebhookPayload {
  const {
    from,
    latitude,
    longitude,
    name,
    address,
    messageId = `wamid.${randomUUID()}`,
    timestamp = Math.floor(Date.now() / 1000).toString(),
    userName = 'Test User',
  } = options;

  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: MOCK_CONFIG.businessAccountId,
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: MOCK_CONFIG.displayPhoneNumber,
                phone_number_id: MOCK_CONFIG.phoneNumberId,
              },
              contacts: [
                {
                  profile: {
                    name: userName,
                  },
                  wa_id: from.replace('+', ''),
                },
              ],
              messages: [
                {
                  from,
                  id: messageId,
                  timestamp,
                  type: 'location',
                  location: {
                    latitude,
                    longitude,
                    name,
                    address,
                  },
                },
              ],
            },
            field: 'messages',
          },
        ],
      },
    ],
  };
}

// ============================================================================
// Webhook Payload Mocks - Status Updates
// ============================================================================

/**
 * Create a message status update webhook payload
 */
export function createMessageStatusWebhook(options: {
  messageId: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  recipientId: string;
  timestamp?: string;
  errorCode?: number;
  errorMessage?: string;
}): WhatsAppWebhookPayload {
  const {
    messageId,
    status,
    recipientId,
    timestamp = Math.floor(Date.now() / 1000).toString(),
    errorCode,
    errorMessage,
  } = options;

  const statusUpdate: any = {
    id: messageId,
    status,
    timestamp,
    recipient_id: recipientId,
  };

  if (status === 'failed' && errorCode && errorMessage) {
    statusUpdate.errors = [
      {
        code: errorCode,
        title: errorMessage,
      },
    ];
  }

  if (status === 'delivered' || status === 'read') {
    statusUpdate.conversation = {
      id: `conversation_${randomUUID()}`,
      origin: {
        type: 'service',
      },
    };
    statusUpdate.pricing = {
      billable: true,
      pricing_model: 'CBP',
      category: 'service',
    };
  }

  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: MOCK_CONFIG.businessAccountId,
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: MOCK_CONFIG.displayPhoneNumber,
                phone_number_id: MOCK_CONFIG.phoneNumberId,
              },
              statuses: [statusUpdate],
            },
            field: 'messages',
          },
        ],
      },
    ],
  };
}

// ============================================================================
// Mock WhatsApp API Client
// ============================================================================

/**
 * Create a mock WhatsApp API client for testing
 */
export class MockWhatsAppAPI {
  private messageQueue: any[] = [];
  private messageResponses: Map<string, any> = new Map();
  private shouldFail: boolean = false;
  private failureReason: any = null;

  /**
   * Configure the mock to return successful responses
   */
  public succeed() {
    this.shouldFail = false;
    this.failureReason = null;
  }

  /**
   * Configure the mock to return error responses
   */
  public fail(error?: any) {
    this.shouldFail = true;
    this.failureReason = error || mockSendMessageError();
  }

  /**
   * Mock send message method
   */
  public async sendMessage(to: string, message: any): Promise<any> {
    if (this.shouldFail) {
      throw this.failureReason;
    }

    const messageId = `wamid.${randomUUID()}`;
    const response = mockSendMessageResponse(messageId);

    this.messageQueue.push({
      to,
      message,
      messageId,
      timestamp: new Date(),
    });

    this.messageResponses.set(messageId, response);

    return response.data;
  }

  /**
   * Mock send interactive message method
   */
  public async sendInteractiveMessage(to: string, interactive: any): Promise<any> {
    if (this.shouldFail) {
      throw this.failureReason;
    }

    const messageId = `wamid.${randomUUID()}`;
    const response = mockSendMessageResponse(messageId);

    const message = {
      type: 'interactive',
      interactive,
    };

    this.messageQueue.push({
      to,
      message,
      messageId,
      timestamp: new Date(),
    });

    this.messageResponses.set(messageId, response);

    return response.data;
  }

  /**
   * Mock send text message method
   */
  public async sendTextMessage(to: string, text: string): Promise<any> {
    if (this.shouldFail) {
      throw this.failureReason;
    }

    const messageId = `wamid.${randomUUID()}`;
    const response = mockSendMessageResponse(messageId);

    const message = {
      type: 'text',
      text: { body: text },
    };

    this.messageQueue.push({
      to,
      message,
      messageId,
      timestamp: new Date(),
    });

    this.messageResponses.set(messageId, response);

    return response.data;
  }

  /**
   * Get all sent messages
   */
  public getSentMessages() {
    return this.messageQueue;
  }

  /**
   * Clear message queue
   */
  public clearMessages() {
    this.messageQueue = [];
    this.messageResponses.clear();
  }

  /**
   * Get last sent message
   */
  public getLastMessage() {
    return this.messageQueue[this.messageQueue.length - 1];
  }

  /**
   * Check if a message was sent
   */
  public hasMessageBeenSent(predicate: (msg: any) => boolean): boolean {
    return this.messageQueue.some(predicate);
  }
}

/**
 * Create a fresh mock WhatsApp API instance
 */
export function createMockWhatsAppAPI(): MockWhatsAppAPI {
  return new MockWhatsAppAPI();
}

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Validate webhook payload structure
 */
export function validateWebhookPayload(payload: any): boolean {
  if (!payload || typeof payload !== 'object') return false;
  if (payload.object !== 'whatsapp_business_account') return false;
  if (!Array.isArray(payload.entry)) return false;
  if (payload.entry.length === 0) return false;

  const entry = payload.entry[0];
  if (!Array.isArray(entry.changes)) return false;
  if (entry.changes.length === 0) return false;

  return true;
}

/**
 * Extract message from webhook payload
 */
export function extractMessageFromWebhook(payload: WhatsAppWebhookPayload): any {
  const change = payload.entry[0]?.changes[0];
  if (!change) return null;

  const messages = change.value.messages;
  return messages && messages.length > 0 ? messages[0] : null;
}

/**
 * Extract status from webhook payload
 */
export function extractStatusFromWebhook(payload: WhatsAppWebhookPayload): any {
  const change = payload.entry[0]?.changes[0];
  if (!change) return null;

  const statuses = change.value.statuses;
  return statuses && statuses.length > 0 ? statuses[0] : null;
}

// ============================================================================
// Example Usage
// ============================================================================

/**
 * Example: Testing booking flow with mocked webhooks
 */
export function getBookingFlowMocks() {
  return {
    // User initiates booking
    userStartsBooking: createTextMessageWebhook({
      from: '+1234567890',
      text: 'I want to book an appointment',
    }),

    // User selects service
    userSelectsService: createButtonClickWebhook({
      from: '+1234567890',
      buttonId: 'service_haircut',
      buttonText: 'Haircut',
    }),

    // User selects date
    userSelectsDate: createListReplyWebhook({
      from: '+1234567890',
      listId: 'date_2024-01-15',
      listTitle: 'January 15, 2024',
    }),

    // User selects time
    userSelectsTime: createButtonClickWebhook({
      from: '+1234567890',
      buttonId: 'time_10:00',
      buttonText: '10:00 AM',
    }),

    // Confirmation message delivered
    confirmationDelivered: createMessageStatusWebhook({
      messageId: 'msg_123',
      status: 'delivered',
      recipientId: '1234567890',
    }),
  };
}
