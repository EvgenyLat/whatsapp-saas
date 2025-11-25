/**
 * MessageBubble Component
 * WhatsApp SaaS Platform
 *
 * Displays a message in WhatsApp-style bubble format:
 * - Inbound messages (from customer): White background, left-aligned
 * - Outbound messages (from salon): Green background, right-aligned
 * - Timestamp formatting with date-fns
 * - Status indicators for outbound messages (sent, delivered, read)
 * - Media type indicators
 */

'use client';

import React, { memo } from 'react';
import { format } from 'date-fns';
import { Check, CheckCheck, Clock, Image, Video, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MessageDirection, MessageStatus, MessageType } from '@/types';

export interface MessageBubbleProps {
  variant: 'inbound' | 'outbound';
  text: string;
  timestamp: string | Date;
  status?: MessageStatus;
  messageType?: MessageType;
  mediaUrl?: string | null;
  className?: string;
}

const STATUS_ICONS = {
  SENT: Clock,
  DELIVERED: Check,
  READ: CheckCheck,
  FAILED: null,
} as const;

const MEDIA_TYPE_ICONS = {
  TEXT: null,
  IMAGE: Image,
  VIDEO: Video,
  AUDIO: Mic,
  DOCUMENT: null,
} as const;

/**
 * MessageBubble Component
 *
 * @example
 * ```tsx
 * // Inbound message
 * <MessageBubble
 *   variant="inbound"
 *   text="Hi, I'd like to book an appointment"
 *   timestamp={new Date()}
 * />
 *
 * // Outbound message with status
 * <MessageBubble
 *   variant="outbound"
 *   text="Great! What time works for you?"
 *   timestamp={new Date()}
 *   status="READ"
 * />
 * ```
 */
export const MessageBubble = memo<MessageBubbleProps>(
  ({ variant, text, timestamp, status, messageType = 'TEXT', mediaUrl, className }) => {
    const isOutbound = variant === 'outbound';
    const StatusIcon = status ? STATUS_ICONS[status] : null;
    const MediaIcon = messageType !== 'TEXT' ? (MEDIA_TYPE_ICONS[messageType as keyof typeof MEDIA_TYPE_ICONS]) : null;

    const formattedTime = format(
      typeof timestamp === 'string' ? new Date(timestamp) : timestamp,
      'h:mm a',
    );

    return (
      <div
        className={cn(
          'flex w-full mb-2',
          isOutbound ? 'justify-end' : 'justify-start',
          className,
        )}
      >
        <div
          role="article"
          aria-label={`${isOutbound ? 'Sent' : 'Received'} message at ${formattedTime}: ${text}`}
          className={cn(
            'relative max-w-[70%] rounded-lg px-4 py-2 shadow-sm',
            'break-words',
            isOutbound
              ? 'bg-[#25D366] text-white rounded-br-none'
              : 'bg-white text-neutral-900 border border-neutral-200 rounded-bl-none',
          )}
        >
          {/* Media Preview */}
          {mediaUrl && MediaIcon && (
            <div className="mb-2 flex items-center gap-2 text-sm opacity-75">
              <MediaIcon size={16} />
              <span className="text-xs">Media attached</span>
            </div>
          )}

          {/* Message Text */}
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{text}</p>

          {/* Timestamp and Status */}
          <div
            className={cn(
              'flex items-center gap-1 mt-1 text-xs',
              isOutbound ? 'text-white/70 justify-end' : 'text-neutral-500 justify-start',
            )}
          >
            <span>{formattedTime}</span>
            {isOutbound && StatusIcon && (
              <StatusIcon
                size={14}
                className={cn(
                  status === 'READ' && 'text-blue-300',
                  status === 'DELIVERED' && 'text-white/70',
                  status === 'SENT' && 'text-white/50',
                )}
              />
            )}
          </div>

          {/* Bubble Tail */}
          <div
            className={cn(
              'absolute bottom-0 w-0 h-0',
              'border-solid border-8',
              isOutbound
                ? 'right-[-8px] border-t-transparent border-r-transparent border-b-[#25D366] border-l-[#25D366]'
                : 'left-[-8px] border-t-transparent border-l-transparent border-b-white border-r-white',
            )}
            aria-hidden="true"
          />
        </div>
      </div>
    );
  },
);

MessageBubble.displayName = 'MessageBubble';
