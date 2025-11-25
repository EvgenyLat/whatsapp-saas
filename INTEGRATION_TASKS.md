# Integration & Production Launch Tasks

**Project**: WhatsApp SaaS Platform  
**Created**: 2025-10-31  
**Priority**: HIGH - Pre-Production Launch  
**Estimated Total Time**: 2-3 weeks (80-120 hours)

---

## 🎯 OVERVIEW

This document contains 4 critical task groups to make the platform production-ready:

1. **QuickBooking Integration** - Connect AI Service with Interactive Buttons (15-20 hours)
2. **AWS Infrastructure Deployment** - Deploy production infrastructure (20-30 hours)  
3. **Integration Tests** - End-to-end testing (15-20 hours)
4. **Production Launch Checklist** - Final verification (10-15 hours)

---

## 📋 TASK 1: QUICKBOOKING + AI SERVICE INTEGRATION

**Goal**: Integrate QuickBookingService with AI Service to enable zero-typing booking flow with multi-language interactive buttons.

**Current State**:
- ✅ AI Service works (language detection, intent parsing)
- ✅ QuickBooking Service written (interactive cards, button handling)
- ❌ **NOT CONNECTED** - they run in parallel, not unified

**Target State**:
```
Customer message → Language Detection → AI Intent → QuickBooking → Interactive Buttons (in customer's language)
```

---

### Task 1.1: Create Unified Message Router

**File**: `Backend/src/modules/whatsapp/webhook.service.ts`

**Current implementation**:
```typescript
// Currently only uses AI Service
async handleIncomingMessage(message: WhatsAppInboundMessage) {
  // ... validation ...
  
  // Direct to AI Service only
  const aiResponse = await this.aiService.processMessage({
    salon_id: phoneNumberMapping.salon_id,
    phone_number: message.from,
    message: message.text.body,
    conversation_id: conversationId,
  });
  
  // Send text response
  await this.whatsappService.sendMessage(...);
}
```

**New implementation needed**:

1. **Add to constructor**:
```typescript
constructor(
  // ... existing dependencies ...
  private readonly languageDetector: LanguageDetectorService,
  private readonly quickBookingService: QuickBookingService,
) {}
```

2. **Create classifyMessageType() method**:
```typescript
private classifyMessageType(message: WhatsAppInboundMessage): string {
  // Check if it's a button click response
  if (message.type === 'interactive') {
    return 'BUTTON_CLICK';
  }
  
  // Check if text contains booking intent keywords
  const bookingKeywords = [
    'booking', 'appointment', 'reservation', 'book',
    'запись', 'записаться', 'хочу', 'нужно',
    'reserva', 'cita', 'agendar',
    'agendamento', 'marcar',
    'תור', 'לקבוע'
  ];
  
  const text = message.text?.body?.toLowerCase() || '';
  const hasBookingIntent = bookingKeywords.some(kw => text.includes(kw));
  
  if (hasBookingIntent) {
    return 'BOOKING_REQUEST';
  }
  
  return 'CONVERSATION';
}
```

3. **Create handleBookingRequest() method**:
```typescript
private async handleBookingRequest(
  message: WhatsAppInboundMessage,
  language: string,
  phoneNumberMapping: any
) {
  // Use QuickBookingService for interactive booking
  const response = await this.quickBookingService.handleBookingRequest({
    text: message.text.body,
    customerPhone: message.from,
    salonId: phoneNumberMapping.salon_id,
    language: language,
  });
  
  // Send interactive card or text
  if (response.type === 'INTERACTIVE_CARD') {
    await this.whatsappService.sendInteractiveMessage({
      phoneNumberId: message.metadata.phone_number_id,
      to: message.from,
      interactive: response.payload,
    });
  } else {
    await this.whatsappService.sendMessage({
      phoneNumberId: message.metadata.phone_number_id,
      to: message.from,
      message: response.message,
    });
  }
}
```

4. **Create handleButtonClick() method**:
```typescript
private async handleButtonClick(
  message: WhatsAppInboundMessage,
  language: string,
  phoneNumberMapping: any
) {
  const buttonId = message.interactive.button_reply?.id || 
                   message.interactive.list_reply?.id;
  
  const response = await this.quickBookingService.handleButtonClick(
    buttonId,
    message.from,
    language
  );
  
  if (response.type === 'INTERACTIVE_CARD') {
    await this.whatsappService.sendInteractiveMessage({
      phoneNumberId: message.metadata.phone_number_id,
      to: message.from,
      interactive: response.payload,
    });
  } else {
    await this.whatsappService.sendMessage({
      phoneNumberId: message.metadata.phone_number_id,
      to: message.from,
      message: response.message,
    });
  }
}
```

5. **Update main handleIncomingMessage() method**:
```typescript
async handleIncomingMessage(message: WhatsAppInboundMessage) {
  // ... existing validation code ...
  
  // 1. Detect language
  const languageDetection = await this.languageDetector.detect(
    message.text?.body || ''
  );
  const language = languageDetection.language;
  
  // 2. Classify message type
  const messageType = this.classifyMessageType(message);
  
  // 3. Route to appropriate handler
  switch (messageType) {
    case 'BUTTON_CLICK':
      return this.handleButtonClick(message, language, phoneNumberMapping);
      
    case 'BOOKING_REQUEST':
      return this.handleBookingRequest(message, language, phoneNumberMapping);
      
    case 'CONVERSATION':
      return this.handleConversation(message, language, phoneNumberMapping);
      
    default:
      return this.handleConversation(message, language, phoneNumberMapping);
  }
}
```

**Dependencies to update**:
- Import `LanguageDetectorService` from `'../ai/services/language-detector.service'`
- Import `QuickBookingService` from `'../ai/quick-booking.service'`
- Add both to `WebhookService` constructor
- Update `WhatsAppModule` providers if needed

**Acceptance Criteria**:
- ✅ WhatsApp message routes to correct handler based on intent
- ✅ Button clicks route to QuickBookingService
- ✅ Booking requests route to QuickBookingService
- ✅ General chat routes to AI Service
- ✅ Language detected and passed to all handlers
- ✅ No breaking changes to existing functionality
- ✅ Code compiles without TypeScript errors

---

### Task 1.2: Update QuickBookingService to Use Language

**File**: `Backend/src/modules/ai/quick-booking.service.ts`

**Changes needed**:

1. Update `handleBookingRequest()` signature and implementation
2. Pass language to `alternativeSuggester.rankByTimeProximity()`
3. Pass language to `cardBuilder.buildSlotCard()`
4. Update all message building to use language parameter

**Acceptance Criteria**:
- ✅ All methods accept language parameter
- ✅ Language passed to all sub-services
- ✅ No hardcoded language strings

---

### Task 1.3: Write Integration Tests

**File**: `Backend/tests/integration/unified-booking-flow.spec.ts`

Create comprehensive tests for:
- Russian booking flow
- English booking flow
- Button click handling
- Language switching
- Error cases

**Acceptance Criteria**:
- ✅ All test scenarios pass
- ✅ Coverage >80%

---

## 🏗️ TASK 2: AWS INFRASTRUCTURE DEPLOYMENT

**Goal**: Deploy production AWS infrastructure

**Estimated Time**: 20-30 hours

### Task 2.1: Setup Terraform

1. Install Terraform
2. Configure AWS credentials
3. Initialize Terraform state

### Task 2.2: Deploy VPC

Deploy networking infrastructure

### Task 2.3: Deploy RDS PostgreSQL

Deploy production database

### Task 2.4: Deploy ElastiCache Redis

Deploy production cache

### Task 2.5: Deploy ECS

Deploy application containers

### Task 2.6: Configure Monitoring

Setup CloudWatch, alarms, dashboards

---

## 🧪 TASK 3: INTEGRATION TESTS

**Goal**: Comprehensive end-to-end testing

**Estimated Time**: 15-20 hours

Create test suites for:
- Unified booking flow
- Multi-language support
- Error handling
- Performance benchmarks

---

## ✅ TASK 4: PRODUCTION LAUNCH CHECKLIST

**Goal**: Final verification before launch

**Estimated Time**: 10-15 hours

Checklist items:
- [ ] Security audit complete
- [ ] Performance verified
- [ ] Monitoring configured
- [ ] Backups automated
- [ ] Documentation complete
- [ ] Legal docs published
- [ ] Team trained

---

## 📊 QUICK START

### To begin integration:

```bash
# 1. Ensure you're in the project directory
cd C:\whatsapp-saas-starter

# 2. Open webhook.service.ts
code Backend\src\modules\whatsapp\webhook.service.ts

# 3. Follow Task 1.1 instructions above

# 4. Test changes
cd Backend
npm run build
npm run test
```

### For Claude Code:

```
Implement Task 1.1 from INTEGRATION_TASKS.md:
Create Unified Message Router in webhook.service.ts
```

---

**Document Version**: 1.0  
**Status**: Ready for Implementation 🚀
