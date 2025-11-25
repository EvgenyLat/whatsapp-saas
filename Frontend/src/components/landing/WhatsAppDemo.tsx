/**
 * WhatsApp Demo Component
 * Interactive WhatsApp chat demonstration
 * Shows automated booking conversation with pagination
 */

'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, ChevronLeft, ChevronRight, Check, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';

interface Message {
  id: string;
  type: 'user' | 'bot';
  text: string;
  timestamp?: string;
  options?: string[];
  selectedOption?: number;
}

interface Conversation {
  id: string;
  messages: Message[];
}

/**
 * Demo conversations showcasing different booking scenarios
 */
const demoConversations: Conversation[] = [
  {
    id: 'haircut-booking',
    messages: [
      {
        id: '1',
        type: 'user',
        text: 'Hi! I want to book a haircut for Friday at 3pm',
        timestamp: '14:32',
      },
      {
        id: '2',
        type: 'bot',
        text: 'Perfect! I have these slots available on Friday:',
        timestamp: '14:32',
        options: ['2:00 PM - Available', '3:00 PM - Available', '4:00 PM - Available'],
        selectedOption: 1,
      },
      {
        id: '3',
        type: 'bot',
        text: '3:00 PM works perfectly! ✂️\n\nI\'ve booked your haircut with Sarah for Friday, May 12th at 3:00 PM.\n\nYou\'ll receive a confirmation and reminder 24 hours before your appointment. Looking forward to seeing you!',
        timestamp: '14:33',
      },
    ],
  },
  {
    id: 'manicure-booking',
    messages: [
      {
        id: '1',
        type: 'user',
        text: 'Do you have availability for a manicure tomorrow afternoon?',
        timestamp: '10:15',
      },
      {
        id: '2',
        type: 'bot',
        text: 'Great! I have these slots available tomorrow:',
        timestamp: '10:15',
        options: ['1:00 PM - Available', '2:30 PM - Available', '4:00 PM - Available'],
      },
      {
        id: '3',
        type: 'user',
        text: '2:30 PM works for me!',
        timestamp: '10:16',
      },
      {
        id: '4',
        type: 'bot',
        text: 'Excellent choice! 💅\n\nYour manicure is confirmed for tomorrow at 2:30 PM with Jessica. The service takes approximately 45 minutes.\n\nSee you tomorrow!',
        timestamp: '10:16',
      },
    ],
  },
  {
    id: 'reschedule',
    messages: [
      {
        id: '1',
        type: 'user',
        text: 'I need to reschedule my appointment for tomorrow',
        timestamp: '16:45',
      },
      {
        id: '2',
        type: 'bot',
        text: 'No problem! I found your booking for tomorrow at 3:00 PM.\n\nWhen would you like to reschedule?',
        timestamp: '16:45',
        options: ['Next Monday', 'Next Wednesday', 'Next Friday'],
      },
      {
        id: '3',
        type: 'user',
        text: 'Next Wednesday would be great',
        timestamp: '16:46',
      },
      {
        id: '4',
        type: 'bot',
        text: 'Perfect! ✨\n\nI\'ve rescheduled your appointment to Wednesday, May 17th at 3:00 PM.\n\nYou\'ll receive a new confirmation shortly. Is there anything else I can help you with?',
        timestamp: '16:46',
      },
    ],
  },
];

export function WhatsAppDemo() {
  const { t } = useI18n();
  const [currentConversationIndex, setCurrentConversationIndex] = React.useState(0);
  const [visibleMessages, setVisibleMessages] = React.useState<string[]>([]);
  const [isInitialLoad, setIsInitialLoad] = React.useState(true);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const currentConversation = demoConversations[currentConversationIndex];

  // Animate messages appearing one by one
  React.useEffect(() => {
    if (!currentConversation) return;

    setVisibleMessages([]);
    const messageIds = currentConversation.messages.map((m) => m.id);

    messageIds.forEach((id, index) => {
      setTimeout(() => {
        setVisibleMessages((prev) => [...prev, id]);
      }, index * 600);
    });

    // Mark initial load as complete after all messages are shown
    setTimeout(() => {
      setIsInitialLoad(false);
    }, messageIds.length * 600 + 100);
  }, [currentConversationIndex, currentConversation]);

  // Auto-scroll to bottom when new message appears (only within chat container, skip initial load)
  React.useEffect(() => {
    // Skip auto-scroll on initial page load
    if (isInitialLoad) return;

    if (messagesEndRef.current) {
      const chatContainer = messagesEndRef.current.parentElement?.parentElement;
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }
  }, [visibleMessages, isInitialLoad]);

  const goToPrevious = () => {
    setCurrentConversationIndex((prev) =>
      prev === 0 ? demoConversations.length - 1 : prev - 1
    );
  };

  const goToNext = () => {
    setCurrentConversationIndex((prev) =>
      prev === demoConversations.length - 1 ? 0 : prev + 1
    );
  };

  return (
    <div className="relative w-full max-w-md">
      {/* WhatsApp-style chat window */}
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-700 dark:bg-neutral-800">
        {/* Chat Header */}
        <div className="flex items-center gap-3 bg-primary-500 px-4 py-3 text-white">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
            <Bot className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">{t.hero.demo.header}</h3>
            <p className="text-xs text-primary-100">{t.hero.demo.online}</p>
          </div>
          <div className="flex h-2 w-2 items-center justify-center">
            <span className="absolute h-2 w-2 animate-ping rounded-full bg-white opacity-75"></span>
            <span className="relative h-2 w-2 rounded-full bg-white"></span>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="h-[400px] overflow-y-auto bg-[#ECE5DD] p-4 dark:bg-neutral-900/50">
          <div className="space-y-3">
            <AnimatePresence>
              {currentConversation?.messages.map((message) => {
                const isVisible = visibleMessages.includes(message.id);
                if (!isVisible) return null;

                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    className={cn(
                      'flex',
                      message.type === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        'relative max-w-[85%] rounded-lg px-3 py-2 shadow-sm',
                        message.type === 'user'
                          ? 'bg-[#DCF8C6] dark:bg-primary-900/30'
                          : 'bg-white dark:bg-neutral-800'
                      )}
                    >
                      <p className="whitespace-pre-line text-sm text-neutral-900 dark:text-neutral-100">
                        {message.text}
                      </p>

                      {/* Time slots options */}
                      {message.options && (
                        <div className="mt-2 space-y-2">
                          {message.options.map((option, index) => (
                            <button
                              key={index}
                              className={cn(
                                'w-full rounded-md border px-3 py-2 text-left text-sm font-medium transition-colors',
                                message.selectedOption === index
                                  ? 'border-primary-500 bg-white text-primary-700 dark:bg-neutral-700 dark:text-primary-400'
                                  : 'border-neutral-300 bg-white text-neutral-700 hover:border-primary-400 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-300'
                              )}
                            >
                              {option}
                              {message.selectedOption === index && (
                                <span className="ml-2">✓</span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Timestamp and read status */}
                      <div
                        className={cn(
                          'mt-1 flex items-center justify-end gap-1 text-xs',
                          message.type === 'user'
                            ? 'text-neutral-600 dark:text-neutral-400'
                            : 'text-neutral-500 dark:text-neutral-500'
                        )}
                      >
                        <span>{message.timestamp}</span>
                        {message.type === 'user' && (
                          <CheckCheck className="h-3 w-3 text-primary-600" />
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between border-t border-neutral-200 bg-white px-4 py-3 dark:border-neutral-700 dark:bg-neutral-800">
          <button
            onClick={goToPrevious}
            className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-700"
            aria-label="Previous conversation"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {currentConversationIndex + 1} / {demoConversations.length}
            </span>
          </div>

          <button
            onClick={goToNext}
            className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-700"
            aria-label="Next conversation"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Floating stat cards */}
      <motion.div
        className="absolute -left-4 -top-4 rounded-lg bg-white px-3 py-2 shadow-lg dark:bg-neutral-800 sm:-left-8"
        animate={{
          y: [0, -8, 0],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <div className="flex items-center gap-2 text-sm">
          <span className="text-xl">⚡</span>
          <div>
            <p className="font-semibold text-neutral-900 dark:text-white">Instant</p>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">AI responses</p>
          </div>
        </div>
      </motion.div>

      <motion.div
        className="absolute -bottom-4 -right-4 rounded-lg bg-white px-3 py-2 shadow-lg dark:bg-neutral-800 sm:-right-8"
        animate={{
          y: [0, 8, 0],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 1.5,
        }}
      >
        <div className="flex items-center gap-2 text-sm">
          <span className="text-xl">📈</span>
          <div>
            <p className="font-semibold text-neutral-900 dark:text-white">+127%</p>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">Bookings</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
