# Module Dependency Diagram

## Overview

Visual representation of module dependencies and service injection chains for the WhatsApp SaaS application.

---

## High-Level Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                          AppModule                              │
├────────────────────────────────────────────────────────────────┤
│  Global Modules:                                                │
│  • ConfigModule (environment variables, configs)                │
│  • DatabaseModule (Prisma ORM)                                  │
│  • CacheModule (Redis)                                          │
│  • QueueModule (BullMQ)                                         │
│  • ThrottlerModule (Rate limiting)                              │
└────────────────────────────────────────────────────────────────┘
                                   │
                   ┌───────────────┴───────────────┐
                   │                               │
                   ▼                               ▼
         ┌──────────────────┐          ┌──────────────────┐
         │  WhatsAppModule  │          │    AIModule      │
         └──────────────────┘          └──────────────────┘
                   │                               │
                   └───────────────┬───────────────┘
                                   │
                         (forwardRef circular dependency)
```

---

## AIModule - Service Providers

```
┌─────────────────────────────────────────────────────────────────┐
│                         AIModule                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Imports:                                                        │
│  ├─ ConfigModule                                                │
│  ├─ DatabaseModule                                              │
│  ├─ SalonsModule                                                │
│  ├─ ServicesModule                                              │
│  ├─ MastersModule                                               │
│  └─ forwardRef(() => BookingsModule)                            │
│                                                                  │
│  Providers:                                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 'OPENAI_CLIENT' (Factory Provider)                       │  │
│  │ ├─ useFactory: (ConfigService) => new OpenAI()          │  │
│  │ └─ inject: [ConfigService]                               │  │
│  └──────────────────────────────────────────────────────────┘  │
│  │                                                              │
│  ├─ AIService                                                  │
│  ├─ AIConversationRepository                                   │
│  ├─ AIMessageRepository                                        │
│  ├─ CacheService                                               │
│  ├─ LanguageDetectorService                                    │
│  │                                                              │
│  │  Quick Booking Services (Phase 3+):                         │
│  ├─ QuickBookingService                                        │
│  ├─ IntentParserService                                        │
│  ├─ SlotFinderService                                          │
│  ├─ ButtonParserService                                        │
│  ├─ InteractiveCardBuilderService                             │
│  │                                                              │
│  │  Analytics Services:                                        │
│  └─ US1AnalyticsService                                        │
│                                                                  │
│  Exports: (All providers above)                                 │
│  ✓ Makes services available to other modules                    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## WhatsAppModule - Service Providers

```
┌──────────────────────────────────────────────────────────────────┐
│                       WhatsAppModule                              │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Imports:                                                         │
│  ├─ HttpModule (Axios for WhatsApp API calls)                   │
│  ├─ ConfigModule.forFeature(whatsappConfig)                     │
│  ├─ DatabaseModule                                               │
│  ├─ forwardRef(() => MessagesModule)                            │
│  ├─ forwardRef(() => ConversationsModule)                       │
│  ├─ forwardRef(() => RemindersModule)                           │
│  └─ forwardRef(() => AIModule)  ← IMPORTS AI SERVICES           │
│                                                                   │
│  Providers:                                                       │
│  ├─ WhatsAppService                                             │
│  ├─ WebhookService                                              │
│  ├─ ButtonParserService (WhatsApp-specific)                     │
│  ├─ ButtonHandlerService                                        │
│  └─ InteractiveCardBuilder                                      │
│                                                                   │
│  Exports:                                                         │
│  └─ All providers above                                          │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

---

## Service Injection Chains

### QuickBookingService Dependencies

```
QuickBookingService
├── Constructor Parameters:
│   ├── PrismaService (from DatabaseModule - global)
│   ├── ConfigService (from ConfigModule - global)
│   ├── IntentParserService (from AIModule)
│   ├── ButtonParserService (from AIModule)
│   ├── InteractiveCardBuilderService (from AIModule)
│   ├── US1AnalyticsService (from AIModule)
│   └── SlotFinderService (from AIModule)
│
└── Methods:
    ├── handleBookingRequest()
    ├── handleSlotSelection()
    ├── handleConfirmation()
    ├── handleButtonClick()
    └── getUsualPreferences()
```

### IntentParserService Dependencies

```
IntentParserService
├── Constructor Parameters:
│   ├── @Inject('OPENAI_CLIENT') openai: OpenAI  ← INJECTED!
│   ├── ConfigService (from ConfigModule - global)
│   └── PrismaService (from DatabaseModule - global)
│
└── Methods:
    ├── parseIntent(text: string, salonId: string)
    ├── detectLanguage(text: string)
    ├── isIntentComplete(intent: BookingIntent)
    └── getMissingFields(intent: BookingIntent)
```

### AIService Dependencies

```
AIService (Legacy - for AI-powered chat)
├── Constructor Parameters:
│   ├── @Inject('OPENAI_CLIENT') openai: OpenAI  ← INJECTED!
│   ├── ConfigService (from ConfigModule - global)
│   ├── BookingsService (from BookingsModule)
│   ├── BookingsRepository (from BookingsModule)
│   ├── ServicesService (from ServicesModule)
│   ├── MastersService (from MastersModule)
│   ├── UsageTrackingService (from SalonsModule)
│   ├── AIConversationRepository (from AIModule)
│   ├── AIMessageRepository (from AIModule)
│   ├── CacheService (from AIModule)
│   └── LanguageDetectorService (from AIModule)
│
└── Methods:
    ├── processMessage(dto: ProcessMessageDto)
    ├── checkAvailability(args: CheckAvailabilityArgs)
    └── createBooking(args: CreateBookingArgs)
```

### WebhookService Dependencies

```
WebhookService
├── Constructor Parameters:
│   ├── WhatsAppService (from WhatsAppModule)
│   ├── QuickBookingService (from AIModule - IMPORTED!)  ← KEY!
│   ├── MessagesRepository (from MessagesModule)
│   ├── ConversationsRepository (from ConversationsModule)
│   └── PrismaService (from DatabaseModule - global)
│
└── Methods:
    ├── processIncomingMessage()
    ├── handleTextMessage()
    ├── handleButtonReply()
    ├── handleListReply()
    └── sendInteractiveMessage()
```

---

## Data Flow: Customer Books Appointment

```
1. Customer sends WhatsApp message: "Haircut Friday 3pm"
   │
   ▼
2. WhatsApp Cloud API → POST /webhook
   │
   ▼
3. WhatsAppController.handleWebhook()
   │
   ▼
4. WebhookService.processIncomingMessage()
   │
   ├─→ If text message → WebhookService.handleTextMessage()
   │   │
   │   ├─→ QuickBookingService.handleBookingRequest()
   │   │   │
   │   │   ├─→ IntentParserService.parseIntent()
   │   │   │   │
   │   │   │   └─→ OpenAI.chat.completions.create()  ← INJECTED MOCK IN TESTS
   │   │   │       └─→ Returns BookingIntent {serviceName, date, time}
   │   │   │
   │   │   ├─→ SlotFinderService.findAvailableSlots()
   │   │   │   │
   │   │   │   └─→ Prisma queries for masters, existing bookings
   │   │   │       └─→ Returns SlotSuggestion[]
   │   │   │
   │   │   ├─→ InteractiveCardBuilderService.buildSlotSelectionCard()
   │   │   │   │
   │   │   │   └─→ Returns WhatsApp Interactive Message payload
   │   │   │
   │   │   └─→ Store session in sessionStore (Map or Redis)
   │   │
   │   └─→ WhatsAppService.sendInteractiveMessage()
   │       │
   │       └─→ POST to WhatsApp Cloud API
   │
   └─→ If button click → WebhookService.handleButtonReply()
       │
       ├─→ ButtonParserService.parseButtonId()
       │   │
       │   └─→ Returns { type: 'slot', slotId, masterId, ... }
       │
       └─→ QuickBookingService.handleSlotSelection()
           │
           └─→ Creates booking in database via Prisma
               └─→ Returns confirmation message
```

---

## Test Environment: Provider Overrides

```
┌────────────────────────────────────────────────────────────────┐
│                      Test Setup (setup.ts)                      │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Production Provider          Test Override                    │
│  ═══════════════════          ═══════════════                  │
│                                                                 │
│  ConfigService (real)    →    ConfigService (mock)             │
│  ├─ Reads .env files          ├─ Returns testConfig values    │
│  └─ Environment variables     └─ Dot notation: 'openai.apiKey'│
│                                                                 │
│  PrismaClient (real)     →    PrismaClient (test DB)           │
│  ├─ Connects to prod DB       ├─ Connects to test DB          │
│  └─ DATABASE_URL              └─ whatsapp_saas_test_1         │
│                                                                 │
│  OPENAI_CLIENT (real)    →    MockOpenAI                       │
│  ├─ Calls OpenAI API          ├─ Deterministic responses      │
│  ├─ Costs money                ├─ Pattern matching             │
│  ├─ Variable responses        ├─ No API calls                 │
│  └─ Requires internet         └─ Works offline                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Test Override Implementation

```typescript
const moduleFixture = await Test.createTestingModule({
  imports: [AppModule],
})
  // Override 1: ConfigService with test values
  .overrideProvider(ConfigService)
  .useValue({
    get: (key: string, defaultValue?: any) => {
      const value = getTestConfigValue(key);  // From test.config.ts
      return value !== undefined ? value : defaultValue;
    },
  })

  // Override 2: PrismaClient with test database
  .overrideProvider(PrismaClient)
  .useValue(getTestPrisma())  // whatsapp_saas_test_1

  // Override 3: OpenAI with mock
  .overrideProvider('OPENAI_CLIENT')
  .useFactory({
    factory: () => createMockOpenAI(),  // Returns MockOpenAI instance
  })

  .compile();
```

---

## Mock OpenAI Behavior

```
Input: "Haircut Friday 3pm"
   │
   ▼
MockOpenAI.chat.completions.create()
   │
   ├─→ Pattern matching against test inputs
   │   └─→ /haircut.*friday.*3\s*pm/i → MATCH
   │
   └─→ Returns:
       {
         choices: [{
           message: {
             role: 'assistant',
             content: JSON.stringify({
               serviceName: 'Haircut',
               preferredDate: '2025-10-31',  // Next Friday
               preferredTime: '15:00',
               preferredDayOfWeek: 'friday',
               language: 'en',
               isFlexible: false
             })
           }
         }],
         usage: {
           prompt_tokens: 150,
           completion_tokens: 50,
           total_tokens: 200
         }
       }
```

---

## Circular Dependency Handling

### Problem: Modules Need Each Other

```
WhatsAppModule needs:
  ├─ QuickBookingService (from AIModule)
  └─ IntentParserService (from AIModule)

AIModule needs:
  └─ BookingsService (from BookingsModule)

BookingsModule might need:
  └─ WhatsAppService (to send notifications)
```

### Solution: forwardRef()

```typescript
// In WhatsAppModule
@Module({
  imports: [
    forwardRef(() => AIModule),  // Forward reference breaks circular dependency
  ],
})
export class WhatsAppModule {}

// In AIModule
@Module({
  imports: [
    forwardRef(() => BookingsModule),  // Forward reference
  ],
})
export class AIModule {}
```

**How it works:**
1. NestJS creates module placeholders
2. Resolves dependencies in multiple passes
3. forwardRef() tells NestJS: "I'll need this module, but resolve it later"
4. By the time services are instantiated, all modules are loaded

---

## Service Availability Matrix

| Service | Available In | Exported | Used By |
|---------|-------------|----------|---------|
| OPENAI_CLIENT | AIModule | ✅ Yes | IntentParserService, AIService |
| QuickBookingService | AIModule | ✅ Yes | WebhookService (WhatsAppModule) |
| IntentParserService | AIModule | ✅ Yes | QuickBookingService |
| SlotFinderService | AIModule | ✅ Yes | QuickBookingService |
| ButtonParserService (AI) | AIModule | ✅ Yes | QuickBookingService |
| InteractiveCardBuilderService | AIModule | ✅ Yes | QuickBookingService |
| US1AnalyticsService | AIModule | ✅ Yes | QuickBookingService |
| WhatsAppService | WhatsAppModule | ✅ Yes | WebhookService, Controllers |
| WebhookService | WhatsAppModule | ✅ Yes | WhatsAppController |
| PrismaService | DatabaseModule | ✅ Yes (global) | All modules |
| ConfigService | ConfigModule | ✅ Yes (global) | All modules |

---

## Testing: Service Injection

### How to Inject Services in Tests

```typescript
import { setupTestApp, cleanupTestApp } from '../setup';

describe('Integration Test', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await setupTestApp();  // Sets up with all overrides
  });

  afterAll(async () => {
    await cleanupTestApp(app);
  });

  it('should inject QuickBookingService', () => {
    // Get service from DI container
    const service = app.get(QuickBookingService);

    // Service is fully wired with all dependencies
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(QuickBookingService);

    // All dependencies are injected
    // QuickBookingService has:
    //   - IntentParserService (with mocked OpenAI)
    //   - SlotFinderService
    //   - ButtonParserService
    //   - InteractiveCardBuilderService
    //   - US1AnalyticsService
  });

  it('should have mocked OpenAI', () => {
    // Get OpenAI mock
    const openai = app.get('OPENAI_CLIENT');

    expect(openai).toBeDefined();
    expect(openai.chat.completions.create).toBeDefined();

    // This is MockOpenAI, not real OpenAI
    // Calls to .create() will use pattern matching
  });
});
```

---

## Dependency Resolution Order

```
1. Global Modules First
   ├─ ConfigModule
   ├─ DatabaseModule (Prisma)
   ├─ CacheModule (Redis)
   └─ QueueModule (BullMQ)

2. Feature Modules (topological order)
   ├─ SalonsModule
   ├─ ServicesModule
   ├─ MastersModule
   ├─ BookingsModule
   ├─ MessagesModule
   ├─ ConversationsModule
   ├─ TemplatesModule
   ├─ AnalyticsModule
   ├─ RemindersModule
   ├─ AIModule  ← Depends on above modules
   └─ WhatsAppModule  ← Depends on AIModule

3. Provider Instantiation
   ├─ Repositories first (depend only on Prisma)
   ├─ Utility services (LanguageDetector, CacheService)
   ├─ Factory providers (OPENAI_CLIENT)
   ├─ Core services (AIService, IntentParserService)
   ├─ Orchestrator services (QuickBookingService)
   └─ Controllers last (depend on services)
```

---

## Summary

**Module wiring is complete and correct:**

✅ OpenAI is injectable (not instantiated directly)
✅ All AI services are exported from AIModule
✅ WhatsAppModule can import and use AI services
✅ Tests override external dependencies (OpenAI, Config, Prisma)
✅ Circular dependencies handled with forwardRef()
✅ Service injection chains are valid
✅ MockOpenAI provides deterministic test behavior

**Ready for integration testing!**

---

For detailed code examples and implementation, see:
- `Backend/MODULE_WIRING_COMPLETE.md` - Full documentation
- `Backend/MODULE_WIRING_SUMMARY.md` - Executive summary
- `Backend/tests/integration/module-wiring.spec.ts` - Test examples
