# AI Booking Assistant - Quick Start Guide

## For Developers

### What Changed?

The AI booking assistant now understands **services** and **staff**. It can:
- Search for services by name (fuzzy matching)
- Check staff availability in real-time
- Suggest alternatives when times are unavailable
- Format prices and durations correctly
- Speak 5 languages with cultural awareness

---

## Quick Setup

### 1. Environment Variables (Optional)

Add to `.env`:
```env
AI_INCLUDE_PRICES=true
AI_SUGGEST_ALTERNATIVES=true
AI_MAX_ALTERNATIVES=3
AI_ENABLE_SERVICE_MATCHING=true
```

### 2. No Database Changes Required

The enhancement uses existing tables:
- `Service` (salon_id, name, price, duration, category)
- `Master` (salon_id, name, specialization, working_hours)
- `Booking` (existing fields work as-is)

### 3. Test It

```bash
# Send test message via WhatsApp webhook
POST /api/v1/webhooks/whatsapp/message
{
  "salon_id": "your-salon-id",
  "phone_number": "+1234567890",
  "message": "What services do you offer?",
  "conversation_id": "test-conv-123"
}
```

---

## New AI Functions

### 1. Get Service Info
```typescript
// AI calls this when customer asks about a service
await aiService.getServiceInfo(
  salonId: "salon-123",
  serviceName: "manicure",
  language: "ru"
);

// Returns:
{
  found: true,
  services: [
    { name: "Manicure", price: 1800, duration: 60 }
  ],
  message: "Found 1 service: Manicure - 1800₽, 60 min"
}
```

### 2. Get Staff Availability
```typescript
// AI calls this to find available staff
await aiService.getStaffAvailability(
  salonId: "salon-123",
  serviceName: "haircut",
  dateTime: "2025-10-26T14:00:00Z",
  language: "ru"
);

// Returns:
{
  available: true,
  staff: [
    { id: "m1", name: "Sarah", specialization: ["Hair"] },
    { id: "m2", name: "Maria", specialization: ["Hair", "Coloring"] }
  ],
  message: "Available staff: Sarah, Maria"
}
```

### 3. Check Availability (Enhanced)
```typescript
// Now includes service name
await aiService.checkAvailability(
  salonId: "salon-123",
  masterName: "Sarah",
  dateTime: "2025-10-26T14:00:00Z"
);
```

### 4. Create Booking (Enhanced)
```typescript
// Now includes service_name instead of just "service"
await aiService.createBookingFromAI({
  salon_id: "salon-123",
  customer_name: "John Doe",
  customer_phone: "+1234567890",
  master_name: "Sarah",
  service: "Manicure with Gel", // This gets looked up!
  date_time: "2025-10-26T14:00:00Z"
});
```

---

## Helper Functions

### Service Matcher
```typescript
import { ServiceMatcher } from './helpers';

// Fuzzy match services
const matches = ServiceMatcher.fuzzyMatch("manicure", services);
// Returns: [{ service, confidence: 0.95, reason: "Exact match" }]

// Format for AI
const formatted = ServiceMatcher.formatForAI(services, 'ru');
// Returns formatted list grouped by category
```

### Availability Suggester
```typescript
import { AvailabilitySuggester } from './helpers';

// Find next 3 available slots
const slots = AvailabilitySuggester.findNextAvailableSlots(
  requestedDate,
  durationMinutes: 60,
  masters,
  bookingsMap,
  count: 3
);

// Format time slot
const formatted = AvailabilitySuggester.formatTimeSlot(slot, 'ru');
// Returns: "26 октября в 14:00 (мастер: Сара)"
```

### Confirmation Formatter
```typescript
import { ConfirmationFormatter } from './helpers';

// Format booking confirmation
const message = ConfirmationFormatter.formatConfirmation({
  bookingCode: "BK12345",
  serviceName: "Manicure",
  servicePrice: 1800,
  serviceDuration: 60,
  masterName: "Sarah",
  dateTime: new Date("2025-10-26T14:00:00Z"),
  customerName: "John Doe",
  currency: "₽"
}, 'ru');

// Returns beautifully formatted confirmation message
```

---

## Example Conversation Flow

```
Customer: "What services do you have?"

AI Process:
1. System prompt already has services in context
2. Lists services from memory (no function call)
3. Asks what interests them

Customer: "How much is a manicure?"

AI Process:
1. Calls get_service_info("manicure")
2. Gets: { found: true, services: [...], message: "..." }
3. Responds with prices and options

Customer: "Book gel manicure tomorrow at 2pm"

AI Process:
1. Calls get_staff_availability("Gel Manicure", "2025-10-26T14:00")
2. Gets: { available: true, staff: ["Sarah", "Maria"] }
3. Asks customer preference

Customer: "Sarah please"

AI Process:
1. Calls check_availability("Sarah", "Gel Manicure", "2025-10-26T14:00")
2. Gets: { available: true }
3. Calls create_booking(...)
4. Gets: { success: true, bookingCode: "BK12345" }
5. Sends formatted confirmation
```

---

## Debugging

### Check Context Loading
```typescript
const context = await aiService.getContextForConversation("salon-id", "ru");
console.log(context.servicesContext);
console.log(context.staffContext);
```

### Check Service Matching
```typescript
const result = await aiService.getServiceInfo("salon-id", "haircut", "ru");
console.log(result.services); // See what matched
console.log(result.services[0].confidence); // Check match quality
```

### Check Staff Availability
```typescript
const result = await aiService.getStaffAvailability(
  "salon-id",
  "Manicure",
  "2025-10-26T14:00:00Z",
  "ru"
);
console.log(result.staff); // See who's available
```

---

## Common Issues

### Issue: Service not found
**Cause:** Service name doesn't match database
**Solution:** Check fuzzy matching threshold, add synonyms

### Issue: No staff available
**Cause:** All staff busy or outside working hours
**Solution:** AI will suggest alternatives automatically

### Issue: Booking fails
**Cause:** Availability changed between check and booking
**Solution:** Add retry logic or optimistic locking

---

## Performance Tips

1. **Cache Context:** Services/staff rarely change, cache for 5 mins
2. **Limit Context Size:** Max 100 services, 50 staff per salon
3. **Batch Checks:** Check multiple staff in one query
4. **Use Indexes:** Ensure `salon_id`, `is_active` are indexed

---

## Testing

### Unit Tests
```bash
npm test ai.service.spec.ts
```

### Integration Tests
```bash
npm test ai.integration.spec.ts
```

### Manual Testing
```bash
# Use the WhatsApp webhook endpoint
curl -X POST http://localhost:3000/api/v1/webhooks/whatsapp/message \
  -H "Content-Type: application/json" \
  -d '{
    "salon_id": "test-salon",
    "phone_number": "+1234567890",
    "message": "What services do you offer?",
    "conversation_id": "test-123"
  }'
```

---

## Monitoring

### Key Metrics

1. **Function Call Success Rate**
   - Target: > 95%
   - Monitor: AIMessage table, check function_calls field

2. **Service Match Accuracy**
   - Target: > 80% confidence
   - Monitor: getServiceInfo logs

3. **Booking Conversion**
   - Target: > 60% from inquiry to booking
   - Monitor: AIConversation stats

4. **Response Time**
   - Target: < 3 seconds
   - Monitor: response_time_ms in AIMessage

---

## API Reference

### AIService Methods

```typescript
class AIService {
  // Main entry point
  async processMessage(dto: ProcessMessageDto): Promise<AIResponseDto>

  // Get services and staff context
  async getContextForConversation(
    salonId: string,
    language: string = 'ru'
  ): Promise<ContextVariables>

  // Service discovery
  async getServiceInfo(
    salonId: string,
    serviceName: string,
    language: string = 'ru'
  ): Promise<ServiceInfoResult>

  // Staff availability
  async getStaffAvailability(
    salonId: string,
    serviceName: string,
    dateTime: string,
    language: string = 'ru'
  ): Promise<StaffAvailabilityResult>

  // Enhanced availability check
  async checkAvailability(
    salonId: string,
    masterName: string,
    dateTime: string
  ): Promise<CheckAvailabilityResult>

  // Smart booking creation
  async createBookingFromAI(
    data: BookingExtractionDto
  ): Promise<CreateBookingResult>
}
```

---

## File Structure

```
Backend/src/modules/ai/
├── ai.service.ts              # Main service (enhanced)
├── ai.module.ts               # Module config (updated)
├── ai.controller.ts           # HTTP endpoints
├── prompts/
│   └── system-prompts.ts      # Multi-language prompts (enhanced)
├── helpers/                   # NEW!
│   ├── service-matcher.ts     # Service search & matching
│   ├── availability-suggester.ts  # Time slot suggestions
│   ├── confirmation-formatter.ts  # Booking confirmations
│   └── index.ts               # Exports
├── repositories/
│   ├── ai-conversation.repository.ts
│   └── ai-message.repository.ts
├── services/
│   ├── cache.service.ts
│   └── language-detector.service.ts
└── dto/
    ├── process-message.dto.ts
    ├── ai-response.dto.ts
    └── booking-extraction.dto.ts
```

---

## Rollback Procedure

If you need to rollback:

```bash
# 1. Revert ai.service.ts
git checkout HEAD~1 -- Backend/src/modules/ai/ai.service.ts

# 2. Revert ai.module.ts
git checkout HEAD~1 -- Backend/src/modules/ai/ai.module.ts

# 3. Restart server
npm run build
npm run start:prod
```

The helpers can stay (they won't be imported if not used).

---

## Support

- **Documentation:** `AI_BOOKING_ASSISTANT_ENHANCEMENT.md`
- **Test Scenarios:** 8 detailed scenarios in docs
- **Logs:** Check `Backend/src/modules/ai/ai.service.ts` logger
- **Issues:** Monitor function call errors in AIMessage table

---

## Quick Reference

### Service Categories
- `HAIR` - Haircuts, styling
- `NAILS` - Manicure, pedicure
- `FACIAL` - Facials, skincare
- `MASSAGE` - All massage types
- `MAKEUP` - Makeup services
- `COLORING` - Hair coloring
- `WAXING` - Hair removal
- `BROWS_LASHES` - Brow/lash services
- `SPA` - Spa treatments
- `OTHER` - Other services

### Supported Languages
- `ru` - Russian (default)
- `en` - English
- `es` - Spanish
- `pt` - Portuguese
- `he` - Hebrew

### Confidence Thresholds
- `1.0` - Exact match
- `0.9` - Name contains query
- `0.7` - Description contains query
- `0.6` - Partial keyword match
- `< 0.6` - Not recommended

---

**Ready to use!** Start testing with real WhatsApp messages. 🚀
