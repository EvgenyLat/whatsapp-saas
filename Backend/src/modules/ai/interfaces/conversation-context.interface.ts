/**
 * Conversation Context Interface
 * Contains all context needed for AI to process a message
 */
export interface ConversationContext {
  salonId: string;
  phoneNumber: string;
  conversationId: string;
  messageHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
  metadata?: {
    customerName?: string;
    previousBookings?: Array<{
      service: string;
      date: Date;
      status: string;
    }>;
  };
}

/**
 * AI Processing Result
 */
export interface AIProcessingResult {
  response: string;
  tokensUsed: number;
  cost: number;
  responseTimeMs: number;
  functionCalls?: Array<{
    name: string;
    arguments: any;
    result: any;
  }>;
}
