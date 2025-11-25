# Quick Start Guide: Empathetic AI Dialog Enhancement

**Feature**: 002-empathetic-ai-dialog
**Parent Feature**: 001-whatsapp-quick-booking
**Version**: 1.0.0

## Overview

This guide helps developers implement and use the empathetic dialog enhancement for WhatsApp booking. The enhancement transforms simple button lists into context-aware, empathetic conversations with smart categorical choices.

## Prerequisites

✅ **Required**: Feature 001-whatsapp-quick-booking must be fully implemented
✅ Node.js 20+ with npm 9+
✅ PostgreSQL 15+ (for popular times analysis)
✅ Redis 7+ (for session context)
✅ TypeScript 5.x knowledge
✅ Basic understanding of WhatsApp Cloud API

## Installation

### 1. Switch to Feature Branch

```bash
git checkout 002-empathetic-ai-dialog
```

### 2. Install Dependencies

```bash
cd Backend
npm install
```

No new dependencies required - uses existing infrastructure.

### 3. Environment Configuration

Add to `Backend/.env`:

```env
# Redis for session management (existing)
REDIS_URL=redis://localhost:6379

# Session configuration
SESSION_TTL=1800              # 30 minutes default
SESSION_MAX_TTL=3600          # 1 hour maximum
SESSION_EXTENSION_TTL=900     # 15 minutes extension

# Popular times configuration
POPULAR_TIMES_CACHE_TTL=3600  # 1 hour cache
POPULAR_TIMES_LOOKBACK=90     # 90 days history
POPULAR_TIMES_MIN_BOOKINGS=3  # Minimum for significance

# Message configuration
DEFAULT_LANGUAGE=en           # Fallback language
MESSAGE_CACHE_ENABLED=true     # Enable message caching
```

## Implementation Steps

### Step 1: Create New Services

#### 1.1 Alternative Suggester Service

```typescript
// Backend/src/modules/ai/services/alternative-suggester.service.ts

import { Injectable } from '@nestjs/common';
import { differenceInMinutes, differenceInDays } from 'date-fns';
import { SlotSuggestion, RankedSlot } from '../types';

@Injectable()
export class AlternativeSuggesterService {
  async rankByTimeProximity(
    slots: SlotSuggestion[],
    targetTime: string
  ): Promise<RankedSlot[]> {
    return slots
      .map(slot => {
        const slotMinutes = this.timeToMinutes(slot.startTime);
        const targetMinutes = this.timeToMinutes(targetTime);
        const timeDiff = Math.abs(slotMinutes - targetMinutes);

        let score = 0;
        let showStar = false;

        if (timeDiff <= 60) {
          score = 500;
          showStar = true;
        } else if (timeDiff <= 120) {
          score = 300;
        } else if (timeDiff <= 180) {
          score = 100;
        }

        return {
          ...slot,
          score: { totalScore: score },
          rank: 0,
          indicators: {
            showStar,
            proximityText: this.getProximityText(timeDiff)
          }
        };
      })
      .sort((a, b) => b.score.totalScore - a.score.totalScore)
      .map((slot, index) => ({ ...slot, rank: index + 1 }));
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private getProximityText(diffMinutes: number): string {
    const hours = Math.floor(diffMinutes / 60);
    if (hours === 0) return 'Same time';
    return `${hours} hour${hours > 1 ? 's' : ''} ${diffMinutes < 0 ? 'earlier' : 'later'}`;
  }
}
```

#### 1.2 Message Builder Service

```typescript
// Backend/src/modules/ai/services/message-builder.service.ts

import { Injectable } from '@nestjs/common';
import { MESSAGE_TEMPLATES } from '../constants/message-templates';

@Injectable()
export class MessageBuilderService {
  private cache = new Map<string, string>();

  getMessage(
    key: string,
    language: string,
    params?: Record<string, any>
  ): string {
    const cacheKey = `${key}:${language}:${JSON.stringify(params || {})}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const template = MESSAGE_TEMPLATES[key]?.[language] || MESSAGE_TEMPLATES[key]?.['en'];
    if (!template) {
      console.warn(`Message template not found: ${key}`);
      return 'Message not available';
    }

    const message = this.interpolate(template, params);
    this.cache.set(cacheKey, message);
    return message;
  }

  private interpolate(template: string, params?: Record<string, any>): string {
    if (!params) return template;

    return template.replace(/{(\w+)}/g, (match, key) => {
      return params[key]?.toString() || match;
    });
  }
}
```

### Step 2: Update Quick Booking Service

```typescript
// Backend/src/modules/ai/quick-booking.service.ts

import { Injectable } from '@nestjs/common';
// ... existing imports
import { AlternativeSuggesterService } from './services/alternative-suggester.service';
import { MessageBuilderService } from './services/message-builder.service';
import { SessionContextService } from './services/session-context.service';

@Injectable()
export class QuickBookingService {
  constructor(
    // ... existing dependencies
    private readonly alternativeSuggester: AlternativeSuggesterService,
    private readonly messageBuilder: MessageBuilderService,
    private readonly sessionContext: SessionContextService,
  ) {}

  async handleBookingRequest(request: {
    text: string;
    customerPhone: string;
    salonId: string;
  }) {
    // Detect language
    const language = await this.detectLanguage(request.text);

    // Parse intent
    const intent = await this.parseIntent(request.text, language);

    // Check for exact slot
    const exactSlot = await this.slotFinder.checkExactSlot({
      date: intent.date,
      time: intent.time,
      serviceId: intent.serviceId,
    });

    if (exactSlot.available) {
      // Exact match found - show success
      const message = this.messageBuilder.getMessage(
        'SLOT_AVAILABLE',
        language,
        { time: intent.time, day: intent.date }
      );

      return this.cardBuilder.buildSlotCard({
        message,
        slots: exactSlot.masters,
        language,
      });
    }

    // No exact match - show empathetic choice
    const message = this.messageBuilder.getMessage(
      'SLOT_TAKEN',
      language,
      { time: intent.time, day: intent.date }
    );

    // Save context for next interaction
    const sessionId = `${request.customerPhone}:${request.salonId}`;
    await this.sessionContext.save(sessionId, {
      originalIntent: intent,
      language,
      customerId: request.customerPhone,
      salonId: request.salonId,
      state: 'choice_presented',
    });

    return this.cardBuilder.buildChoiceCard({
      message,
      choices: [
        {
          id: 'same_day_diff_time',
          label: this.messageBuilder.getMessage('SAME_DAY_DIFF_TIME', language),
          emoji: '✅',
        },
        {
          id: 'diff_day_same_time',
          label: this.messageBuilder.getMessage('DIFF_DAY_SAME_TIME', language),
          emoji: '📅',
        },
      ],
      language,
    });
  }

  async handleChoice(choiceId: string, sessionId: string) {
    // Retrieve context
    const context = await this.sessionContext.get(sessionId);
    if (!context) {
      return this.messageBuilder.getMessage('SESSION_EXPIRED', 'en');
    }

    // Handle choice
    if (choiceId === 'same_day_diff_time') {
      const slots = await this.slotFinder.findSlotsOnDay({
        date: context.originalIntent.date,
        serviceId: context.originalIntent.serviceId,
      });

      const ranked = await this.alternativeSuggester.rankByTimeProximity(
        slots,
        context.originalIntent.time
      );

      return this.cardBuilder.buildSlotCard({
        message: this.messageBuilder.getMessage(
          'SAME_DAY_OPTIONS',
          context.language,
          { day: context.originalIntent.date }
        ),
        slots: ranked.slice(0, 5),
        language: context.language,
      });
    }

    // ... handle other choices
  }
}
```

### Step 3: Create Message Templates

```typescript
// Backend/src/modules/ai/constants/message-templates.ts

export const MESSAGE_TEMPLATES = {
  SLOT_TAKEN: {
    ru: 'К сожалению, {time} в {day} уже занято 😔\n\nНо не переживайте! Я нашёл отличные варианты 🎯\n\nЧто вам удобнее?',
    en: 'Unfortunately, {time} on {day} is already booked 😔\n\nBut don\'t worry! I found great options 🎯\n\nWhat works better for you?',
    es: 'Desafortunadamente, {time} el {day} ya está reservado 😔\n\n¡Pero no te preocupes! Encontré excelentes opciones 🎯\n\n¿Qué te conviene más?',
    pt: 'Infelizmente, {time} em {day} já está reservado 😔\n\nMas não se preocupe! Encontrei ótimas opções 🎯\n\nO que funciona melhor para você?',
    he: 'לצערנו, {time} ב{day} כבר תפוס 😔\n\nאבל אל דאגה! מצאתי אפשרויות מעולות 🎯\n\nמה מתאים לך יותר?',
  },

  SLOT_AVAILABLE: {
    ru: 'Отлично! {day} в {time} свободно 🎉\n\nВот доступные мастера:',
    en: 'Great! {day} at {time} is available 🎉\n\nHere are available specialists:',
    es: '¡Genial! {day} a las {time} está disponible 🎉\n\nAquí están los especialistas disponibles:',
    pt: 'Ótimo! {day} às {time} está disponível 🎉\n\nAqui estão os especialistas disponíveis:',
    he: 'מצוין! {day} ב{time} פנוי 🎉\n\nהנה המומחים הזמינים:',
  },

  SAME_DAY_DIFF_TIME: {
    ru: '✅ {day}, но другое время',
    en: '✅ {day}, but different time',
    es: '✅ {day}, pero diferente hora',
    pt: '✅ {day}, mas horário diferente',
    he: '✅ {day}, אבל זמן אחר',
  },

  DIFF_DAY_SAME_TIME: {
    ru: '📅 Другой день, но в {time}',
    en: '📅 Different day, but at {time}',
    es: '📅 Otro día, pero a las {time}',
    pt: '📅 Outro dia, mas às {time}',
    he: '📅 יום אחר, אבל ב{time}',
  },
};
```

### Step 4: Update AI Module

```typescript
// Backend/src/modules/ai/ai.module.ts

import { Module } from '@nestjs/common';
// ... existing imports
import { AlternativeSuggesterService } from './services/alternative-suggester.service';
import { MessageBuilderService } from './services/message-builder.service';
import { SessionContextService } from './services/session-context.service';
import { PopularTimesService } from './services/popular-times.service';

@Module({
  imports: [
    // ... existing imports
  ],
  providers: [
    // ... existing providers
    AlternativeSuggesterService,
    MessageBuilderService,
    SessionContextService,
    PopularTimesService,
  ],
  exports: [
    // ... existing exports
    AlternativeSuggesterService,
    MessageBuilderService,
    SessionContextService,
    PopularTimesService,
  ],
})
export class AiModule {}
```

## Testing

### Unit Tests

```bash
# Run unit tests
npm run test:unit -- alternative-suggester
npm run test:unit -- message-builder
npm run test:unit -- session-context
```

### Integration Tests

```bash
# Test complete empathetic flow
npm run test:integration -- empathetic-choice-flow

# Test popular times
npm run test:integration -- popular-times-flow
```

### Manual Testing

1. **Test Empathetic Response**:
   ```
   User: "Haircut Friday 3pm"
   Bot: "Unfortunately, 3:00 PM on Friday is already booked 😔

         But don't worry! I found great options 🎯

         What works better for you?

         [ ✅ Friday, but different time ]
         [ 📅 Different day, but at 3:00 PM ]"
   ```

2. **Test Choice Navigation**:
   ```
   User: [Taps "Friday, but different time"]
   Bot: "Here are available times on Friday near 3:00 PM:

         [ 2:00 PM - Sarah ⭐ ]
         [ 4:00 PM - Sarah ⭐ ]
         [ 1:00 PM - Anna ]
         [ 5:00 PM - Maria ]"
   ```

## Common Scenarios

### Scenario 1: Time Unavailable

```typescript
// When exact time is booked
if (!exactSlot.available) {
  // Show empathetic message with choices
  return showChoiceCard('time_unavailable', language);
}
```

### Scenario 2: Entire Day Booked

```typescript
// When whole day is full
if (daySlots.length === 0) {
  // Show alternative days
  return showChoiceCard('day_full', language);
}
```

### Scenario 3: Popular Times

```typescript
// When user says "anytime"
if (intent.isFlexible) {
  const popular = await popularTimesService.getPopularTimes(salonId);
  return showPopularTimesCard(popular, language);
}
```

## Monitoring & Metrics

### Key Metrics to Track

```typescript
// Track choice effectiveness
analytics.track('choice_selected', {
  choiceId: 'same_day_diff_time',
  sessionId,
  resultedInBooking: true,
});

// Track message clarity
analytics.track('message_clarity', {
  messageKey: 'SLOT_TAKEN',
  userTypedClarification: false,
});

// Track session recovery
analytics.track('session_recovery', {
  recoveryMethod: 'redis' | 'history',
  success: true,
});
```

### Redis Monitoring

```bash
# Check active sessions
redis-cli --scan --pattern "session:*" | wc -l

# Check popular times cache
redis-cli --scan --pattern "popular:*"

# Monitor memory usage
redis-cli INFO memory | grep used_memory_human
```

## Troubleshooting

### Issue: Session Context Not Found

**Symptom**: "Session expired" message appears too soon

**Solution**:
```bash
# Check Redis connection
redis-cli ping

# Verify TTL settings
echo $SESSION_TTL  # Should be 1800 (30 min)

# Check session key
redis-cli GET "session:+1234567890:salon-123"
```

### Issue: Messages Not Localized

**Symptom**: English messages appear for non-English users

**Solution**:
```typescript
// Verify language detection
console.log('Detected language:', language);

// Check template exists
console.log('Template exists:', MESSAGE_TEMPLATES[key]?.[language]);

// Fallback to English if needed
const message = templates[language] || templates['en'];
```

### Issue: Popular Times Empty

**Symptom**: No popular times shown for established salon

**Solution**:
```sql
-- Check booking history
SELECT COUNT(*) FROM bookings
WHERE salon_id = 'salon-123'
  AND start_ts > NOW() - INTERVAL '90 days';

-- Verify minimum threshold (need 3+ bookings)
SELECT EXTRACT(DOW FROM start_ts) as day,
       EXTRACT(HOUR FROM start_ts) as hour,
       COUNT(*) as count
FROM bookings
WHERE salon_id = 'salon-123'
GROUP BY day, hour
HAVING COUNT(*) >= 3;
```

## Best Practices

### 1. Always Explain Before Choices

```typescript
// ❌ Bad: Just show buttons
return showButtons(['14:00', '16:00', 'Saturday']);

// ✅ Good: Explain then offer choices
const message = messageBuilder.getMessage('SLOT_TAKEN', language, params);
return showChoiceCard(message, choices);
```

### 2. Limit Message Length

```typescript
// Keep messages under 3 lines
const MAX_LINES = 3;
const message = formatWithLimits(template, MAX_LINES);
```

### 3. Use Visual Indicators

```typescript
// Add ⭐ for best matches
if (proximityScore > 400) {
  slot.displayText += ' ⭐';
}
```

### 4. Handle Context Gracefully

```typescript
// Always check context exists
const context = await sessionContext.get(sessionId);
if (!context) {
  // Fallback to stateless operation
  return startFreshConversation();
}
```

## Production Checklist

- [ ] Environment variables configured
- [ ] Redis connection verified
- [ ] Message templates for all 5 languages
- [ ] Unit tests passing (>80% coverage)
- [ ] Integration tests passing
- [ ] Manual testing completed
- [ ] Monitoring dashboards configured
- [ ] Error handling for Redis failures
- [ ] Performance targets met (<100ms message generation)
- [ ] Documentation updated

## Support

For issues or questions:
- Check the [troubleshooting section](#troubleshooting)
- Review the [contracts documentation](./contracts/)
- Consult the [data model](./data-model.md)
- Reference the [research findings](./research.md)

## Next Steps

After implementing the empathetic dialog enhancement:

1. Monitor user satisfaction metrics
2. A/B test message variations
3. Consider implementing popular times analysis
4. Plan for multi-level choice navigation (Phase 2)
5. Add personalization based on customer history

---

**Happy coding! Your users will love the empathetic touch! 🎯✨**