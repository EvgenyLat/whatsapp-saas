# 🚀 WHATSAPP SAAS - DEVELOPMENT ROADMAP
## From Current State to CEO Vision

**Document Version**: 1.0
**Created**: October 24, 2025
**Owner**: CTO (Claude Code)
**Approved By**: CEO/Founder

---

## 📊 EXECUTIVE SUMMARY

**Current State**: 85% Feature Complete | Production-Ready Infrastructure | BETA READY
**Target State**: 100% CEO Vision Alignment | Revenue-Generating SaaS | MARKET READY

**Timeline**: 8-10 weeks to full production launch
**Estimated Effort**: 650 hours total development
**Team Required**: 1 Full-Stack Dev + 1 AI Engineer + 1 DevOps (or 1 senior full-stack working 40 hrs/week)

---

## 🎯 STRATEGIC PRIORITIES (CEO Vision Alignment)

### Priority Matrix

```
IMPACT vs EFFORT:

HIGH IMPACT + LOW EFFORT (DO FIRST):
├─ Phase 1: AI Cache System (90% hit rate) ⚡ COMPETITIVE ADVANTAGE
├─ Phase 2: Multi-Language Support (15+ languages) 🌍 GLOBAL SCALE
└─ Phase 6: Email Service Provider 📧 FUNCTIONAL COMPLETENESS

HIGH IMPACT + HIGH EFFORT (DO NEXT):
├─ Phase 3: Subscription System 💰 REVENUE ENGINE
├─ Phase 4: Payment Integration (Stripe) 💳 MONETIZATION
└─ Phase 5: Trial Management System 🎁 CUSTOMER ACQUISITION

MEDIUM IMPACT (DO LATER):
├─ Phase 7: Staff Scheduling System 👥 SALON OPERATIONS
└─ Phase 8: Calendar UI Enhancement 📅 USER EXPERIENCE

LOW IMPACT (BACKLOG):
├─ Google Calendar Sync
├─ Instagram Integration
└─ Advanced Reporting
```

---

## 📅 8-WEEK DETAILED ROADMAP

### Week 1-2: AI OPTIMIZATION & LANGUAGE SUPPORT (COMPETITIVE MOAT)

**Objective**: Achieve 90% cache hit rate + Support 15 languages = 10x cost reduction

#### **Phase 1: AI Cache System** ⚡
**Status**: 🔴 CRITICAL - Missing (Current: 0% cache hit rate)
**Timeline**: 5 days
**Effort**: 40 hours
**Complexity**: Medium

**Implementation Steps**:
1. **Create Cache Schema** (Day 1)
   - New table: `ai_response_cache`
     ```sql
     - id: UUID
     - query_hash: VARCHAR(64) [indexed, unique]
     - normalized_query: TEXT
     - response: TEXT
     - language: VARCHAR(10)
     - salon_id: UUID [nullable, for salon-specific responses]
     - hit_count: INTEGER [default 0]
     - confidence_score: FLOAT [0.0-1.0]
     - created_at: TIMESTAMP
     - last_used_at: TIMESTAMP
     - expires_at: TIMESTAMP [nullable]
     ```

2. **Build Cache Service** (Day 2)
   - File: `Backend/src/modules/ai/services/cache.service.ts`
   - Methods:
     - `normalizeQuery(query: string): string` - Remove noise, lowercase, trim
     - `hashQuery(normalized: string): string` - SHA256 hash
     - `get(hash: string): CachedResponse | null` - Retrieve from cache
     - `set(hash, response, metadata)` - Store response with TTL
     - `incrementHit(hash)` - Track usage
     - `prune()` - Remove old/low-confidence entries

3. **Implement Cache Layer** (Day 3)
   - Modify `ai.service.ts`:
     ```typescript
     async processMessage(dto: ProcessMessageDto): Promise<AIResponseDto> {
       // 1. Normalize and hash query
       const normalized = this.cacheService.normalizeQuery(dto.message);
       const hash = this.cacheService.hashQuery(normalized);

       // 2. Check cache (90% hit rate target)
       const cached = await this.cacheService.get(hash);
       if (cached && cached.confidence_score > 0.85) {
         await this.cacheService.incrementHit(hash);
         return this.formatCachedResponse(cached);
       }

       // 3. If miss, call OpenAI
       const aiResponse = await this.callOpenAI(dto);

       // 4. Store in cache
       await this.cacheService.set(hash, aiResponse, {
         language: dto.language || 'auto',
         salon_id: dto.salon_id,
         confidence_score: aiResponse.confidence || 0.9,
       });

       return aiResponse;
     }
     ```

4. **Add Cache Warming** (Day 4)
   - Common queries preloading:
     - "Hello", "Hi", "Good morning" → Greeting response
     - "What are your hours?" → Salon hours (salon-specific)
     - "How much is a haircut?" → Pricing info (salon-specific)
     - "Can I book for tomorrow?" → Availability check trigger
   - Script: `Backend/scripts/warm-cache.ts`

5. **Cache Analytics Dashboard** (Day 5)
   - Metrics:
     - Hit rate percentage (target: 90%+)
     - Cost savings calculation
     - Top cached queries
     - Cache size and growth
   - Endpoint: `GET /api/v1/ai/cache/stats`

**Expected Outcome**:
- ✅ 90%+ cache hit rate within 30 days of usage
- ✅ 10x reduction in OpenAI API costs
- ✅ Sub-second response times for cached queries
- ✅ $450/month cost savings per 1000 conversations

**Acceptance Criteria**:
- [ ] Cache service implemented with all methods
- [ ] AI service integrated with cache layer
- [ ] Cache warming script functional
- [ ] Hit rate tracking dashboard live
- [ ] Unit tests: 85%+ coverage
- [ ] Performance: <100ms cache lookup

---

#### **Phase 2: Multi-Language Support** 🌍
**Status**: 🔴 CRITICAL - Missing (Current: Russian only)
**Timeline**: 5 days
**Effort**: 40 hours
**Complexity**: Medium

**Implementation Steps**:

1. **Language Detection Service** (Day 1)
   - File: `Backend/src/modules/ai/services/language-detector.service.ts`
   - Strategy:
     ```typescript
     async detectLanguage(text: string): Promise<string> {
       // 1. Pattern-based detection (FREE - 80% accuracy)
       const patterns = {
         'en': /\b(hello|hi|booking|appointment)\b/i,
         'ru': /\b(привет|запись|салон|маникюр)\b/i,
         'es': /\b(hola|cita|reserva|peluquería)\b/i,
         'pt': /\b(olá|agendamento|reserva|salão)\b/i,
         'he': /[\u0590-\u05FF]/,
       };

       for (const [lang, pattern] of Object.entries(patterns)) {
         if (pattern.test(text)) return lang;
       }

       // 2. Fallback to OpenAI (PAID - 20% edge cases)
       return this.detectViaOpenAI(text);
     }
     ```

2. **System Prompts Library** (Day 2)
   - File: `Backend/src/modules/ai/prompts/`
     - `system-prompt.en.ts` - English
     - `system-prompt.ru.ts` - Russian (existing)
     - `system-prompt.es.ts` - Spanish
     - `system-prompt.pt.ts` - Portuguese
     - `system-prompt.he.ts` - Hebrew
   - Each prompt:
     ```typescript
     export const SYSTEM_PROMPT_EN = `You are a professional beauty salon AI assistant.

     Your role:
     - Help clients book appointments
     - Answer questions about services and pricing
     - Be polite, professional, and helpful

     IMPORTANT: Always check availability before booking.
     If the requested time is unavailable, suggest 3 alternative slots.

     Use functions:
     - check_availability - to verify time slots
     - create_booking - to confirm appointments (only if available)
     `;
     ```

3. **Dynamic Prompt Loading** (Day 3)
   - Modify `ai.service.ts`:
     ```typescript
     private async buildSystemPrompt(language: string, salonId: string): Promise<string> {
       // Load language-specific prompt
       const basePrompt = await this.promptService.getPrompt(language);

       // Add salon-specific context
       const salon = await this.getSalonContext(salonId);
       const salonContext = `

       Salon Information:
       - Name: ${salon.name}
       - Services: ${salon.services.map(s => s.name).join(', ')}
       - Working hours: ${salon.working_hours}
       - Masters: ${salon.masters.map(m => m.name).join(', ')}
       `;

       return basePrompt + salonContext;
     }
     ```

4. **Response Localization** (Day 4)
   - File: `Backend/src/modules/ai/i18n/responses.ts`
   - Templates:
     ```typescript
     export const RESPONSES = {
       en: {
         greeting: 'Hello! How can I help you today? 🌟',
         time_unavailable: 'Sorry, {time} is not available. Here are alternatives: {alternatives}',
         booking_confirmed: 'Great! Your appointment is confirmed for {time} with {master}. Booking code: {code}',
       },
       ru: {
         greeting: 'Привет! Чем могу помочь? 🌟',
         time_unavailable: 'К сожалению, {time} занято. Доступны: {alternatives}',
         booking_confirmed: 'Отлично! Запись подтверждена на {time} к мастеру {master}. Код: {code}',
       },
       // ... es, pt, he
     };
     ```

5. **Frontend i18n Integration** (Day 5)
   - Install: `npm install next-intl`
   - Setup: `Frontend/src/i18n/`
     - `en.json` - English translations
     - `ru.json` - Russian translations
     - `es.json` - Spanish translations
     - `pt.json` - Portuguese translations
     - `he.json` - Hebrew translations
   - Language switcher component
   - RTL support for Hebrew

**Expected Outcome**:
- ✅ Support for 5 Tier-1 languages (2.6B speakers)
- ✅ 80% free language detection (pattern-based)
- ✅ Accurate AI responses in user's language
- ✅ UI fully localized

**Acceptance Criteria**:
- [ ] Language detection: 95%+ accuracy
- [ ] All 5 languages supported in AI responses
- [ ] Frontend UI translated
- [ ] RTL support working for Hebrew
- [ ] Unit tests: 80%+ coverage

---

### Week 3-4: MONETIZATION INFRASTRUCTURE

#### **Phase 3: Subscription System** 💰
**Status**: 🔴 CRITICAL - Missing (0% implemented)
**Timeline**: 7 days
**Effort**: 80 hours
**Complexity**: High

**Implementation Steps**:

1. **Database Schema Extension** (Day 1)
   - File: `Backend/prisma/schema.prisma`
   - New tables:
     ```prisma
     model SubscriptionTier {
       id                String   @id @default(uuid())
       name              String   @unique // "FREE", "BASIC", "PRO", "ENTERPRISE"
       price_monthly     Decimal  @db.Decimal(10, 2)
       price_annual      Decimal  @db.Decimal(10, 2) // 17% discount
       max_salons        Int      @default(1)
       max_staff         Int      @default(1)
       max_messages_mo   Int      @default(100)
       ai_enabled        Boolean  @default(false)
       analytics_level   String   @default("BASIC") // BASIC, ADVANCED, CUSTOM
       support_level     String   @default("COMMUNITY") // COMMUNITY, EMAIL, PRIORITY, DEDICATED
       features          Json     // JSON array of feature flags
       is_active         Boolean  @default(true)
       created_at        DateTime @default(now())
       updated_at        DateTime @updatedAt

       subscriptions     Subscription[]
     }

     model Subscription {
       id                String           @id @default(uuid())
       user_id           String
       tier_id           String
       status            SubscriptionStatus @default(TRIALING)
       trial_ends_at     DateTime?
       current_period_start DateTime
       current_period_end   DateTime
       cancel_at_period_end Boolean       @default(false)
       stripe_subscription_id String?     @unique
       stripe_customer_id     String?
       created_at        DateTime         @default(now())
       updated_at        DateTime         @updatedAt

       user              User             @relation(fields: [user_id], references: [id], onDelete: Cascade)
       tier              SubscriptionTier @relation(fields: [tier_id], references: [id])
       invoices          Invoice[]
       usage_records     UsageRecord[]

       @@index([user_id])
       @@index([tier_id])
       @@index([status])
     }

     enum SubscriptionStatus {
       TRIALING
       ACTIVE
       PAST_DUE
       CANCELED
       UNPAID
       PAUSED
     }

     model Invoice {
       id                String   @id @default(uuid())
       subscription_id   String
       amount_due        Decimal  @db.Decimal(10, 2)
       amount_paid       Decimal  @db.Decimal(10, 2) @default(0)
       currency          String   @default("USD")
       status            InvoiceStatus @default(DRAFT)
       billing_reason    String?  // "SUBSCRIPTION_CREATE", "SUBSCRIPTION_CYCLE", "SUBSCRIPTION_UPDATE"
       invoice_pdf       String?  // URL to PDF
       stripe_invoice_id String?  @unique
       due_date          DateTime
       paid_at           DateTime?
       created_at        DateTime @default(now())

       subscription      Subscription @relation(fields: [subscription_id], references: [id], onDelete: Cascade)

       @@index([subscription_id])
       @@index([status])
     }

     enum InvoiceStatus {
       DRAFT
       OPEN
       PAID
       VOID
       UNCOLLECTIBLE
     }

     model UsageRecord {
       id                String   @id @default(uuid())
       subscription_id   String
       salon_id          String
       metric_type       UsageMetric
       quantity          Int
       recorded_at       DateTime @default(now())
       billing_period    String   // "2025-10"

       subscription      Subscription @relation(fields: [subscription_id], references: [id], onDelete: Cascade)
       salon             Salon        @relation(fields: [salon_id], references: [id], onDelete: Cascade)

       @@index([subscription_id])
       @@index([salon_id])
       @@index([billing_period])
     }

     enum UsageMetric {
       MESSAGES_SENT
       AI_REQUESTS
       BOOKINGS_CREATED
       STAFF_MEMBERS
     }
     ```

2. **Subscription Service** (Days 2-3)
   - File: `Backend/src/modules/subscriptions/subscriptions.service.ts`
   - Methods:
     ```typescript
     async createSubscription(userId: string, tierId: string, trialDays: number = 7): Promise<Subscription>
     async getActiveSubscription(userId: string): Promise<Subscription | null>
     async upgradeTier(subscriptionId: string, newTierId: string): Promise<Subscription>
     async downgradeTier(subscriptionId: string, newTierId: string): Promise<Subscription>
     async cancelSubscription(subscriptionId: string, immediately: boolean = false): Promise<void>
     async reactivateSubscription(subscriptionId: string): Promise<Subscription>
     async checkFeatureAccess(userId: string, feature: string): Promise<boolean>
     async checkUsageLimit(userId: string, metric: UsageMetric): Promise<{ allowed: boolean; limit: number; current: number }>
     async recordUsage(subscriptionId: string, metric: UsageMetric, quantity: number = 1): Promise<void>
     ```

3. **Feature Gating Middleware** (Day 4)
   - File: `Backend/src/common/guards/feature-access.guard.ts`
   - Decorator:
     ```typescript
     export const RequiresFeature = (feature: string) => SetMetadata('feature', feature);

     @Injectable()
     export class FeatureAccessGuard implements CanActivate {
       async canActivate(context: ExecutionContext): Promise<boolean> {
         const request = context.switchToHttp().getRequest();
         const user = request.user;
         const feature = this.reflector.get<string>('feature', context.getHandler());

         const hasAccess = await this.subscriptionService.checkFeatureAccess(user.id, feature);

         if (!hasAccess) {
           throw new ForbiddenException('Upgrade your plan to access this feature');
         }

         return true;
       }
     }
     ```
   - Usage:
     ```typescript
     @Post('send-broadcast')
     @RequiresFeature('BROADCAST_MESSAGES')
     @UseGuards(JwtAuthGuard, FeatureAccessGuard)
     async sendBroadcast(@Body() dto: BroadcastDto) {
       // Feature only for PRO and ENTERPRISE tiers
     }
     ```

4. **Subscription API Endpoints** (Day 5)
   - File: `Backend/src/modules/subscriptions/subscriptions.controller.ts`
   - Routes:
     - `POST /api/v1/subscriptions/subscribe` - Create subscription
     - `GET /api/v1/subscriptions/me` - Get current subscription
     - `POST /api/v1/subscriptions/upgrade` - Upgrade tier
     - `POST /api/v1/subscriptions/downgrade` - Downgrade tier
     - `DELETE /api/v1/subscriptions/cancel` - Cancel subscription
     - `POST /api/v1/subscriptions/reactivate` - Reactivate
     - `GET /api/v1/subscriptions/features` - List available features
     - `GET /api/v1/subscriptions/usage` - Current usage stats

5. **Seed Pricing Tiers** (Day 6)
   - File: `Backend/prisma/seeds/pricing-tiers.seed.ts`
   - Tiers:
     ```typescript
     const PRICING_TIERS = [
       {
         name: 'BASIC',
         price_monthly: 20.00,
         price_annual: 200.00, // ~17% discount
         max_salons: 1,
         max_staff: 3,
         max_messages_mo: 1000,
         ai_enabled: true,
         analytics_level: 'BASIC',
         support_level: 'EMAIL',
         features: ['ai_booking', 'whatsapp_integration', 'basic_analytics'],
       },
       {
         name: 'PRO',
         price_monthly: 79.00,
         price_annual: 790.00,
         max_salons: 3,
         max_staff: 15,
         max_messages_mo: 5000,
         ai_enabled: true,
         analytics_level: 'ADVANCED',
         support_level: 'PRIORITY',
         features: ['ai_booking', 'whatsapp_integration', 'advanced_analytics', 'broadcast_messages', 'staff_scheduling', 'customer_portal'],
       },
       {
         name: 'ENTERPRISE',
         price_monthly: 299.00,
         price_annual: 2990.00,
         max_salons: 999,
         max_staff: 999,
         max_messages_mo: 999999,
         ai_enabled: true,
         analytics_level: 'CUSTOM',
         support_level: 'DEDICATED',
         features: ['*'], // All features
       },
     ];
     ```

6. **Admin Dashboard Integration** (Day 7)
   - File: `Frontend/src/app/(admin)/subscriptions/page.tsx`
   - Features:
     - List all subscriptions (with filters by tier, status)
     - View subscription details
     - Manual tier changes
     - Cancel/reactivate subscriptions
     - Usage charts per tier
     - Revenue analytics

**Expected Outcome**:
- ✅ 3-tier pricing structure operational
- ✅ Subscription lifecycle management
- ✅ Feature gating enforced across platform
- ✅ Admin can manage all subscriptions

**Acceptance Criteria**:
- [ ] Database migration successful
- [ ] All subscription endpoints functional
- [ ] Feature gating working on test endpoints
- [ ] Admin dashboard shows subscriptions
- [ ] Unit tests: 80%+ coverage
- [ ] E2E tests: Happy path + edge cases

---

#### **Phase 4: Payment Integration (Stripe)** 💳
**Status**: 🔴 CRITICAL - Missing (0% implemented)
**Timeline**: 5 days
**Effort**: 60 hours
**Complexity**: High (requires Stripe expertise)

**Implementation Steps**:

1. **Stripe Setup** (Day 1)
   - Install: `npm install stripe @stripe/stripe-js`
   - Backend: `Backend/src/modules/payments/`
   - Frontend: `Frontend/src/components/payments/`
   - Environment variables:
     ```env
     STRIPE_SECRET_KEY=sk_test_...
     STRIPE_PUBLISHABLE_KEY=pk_test_...
     STRIPE_WEBHOOK_SECRET=whsec_...
     STRIPE_PRICE_ID_BASIC=price_...
     STRIPE_PRICE_ID_PRO=price_...
     STRIPE_PRICE_ID_ENTERPRISE=price_...
     ```

2. **Stripe Service** (Days 2-3)
   - File: `Backend/src/modules/payments/stripe.service.ts`
   - Methods:
     ```typescript
     // Customer Management
     async createCustomer(userId: string, email: string): Promise<string> // Returns Stripe customer ID
     async getCustomer(customerId: string): Promise<Stripe.Customer>
     async updatePaymentMethod(customerId: string, paymentMethodId: string): Promise<void>

     // Subscription Management
     async createSubscription(customerId: string, priceId: string, trialDays: number): Promise<Stripe.Subscription>
     async updateSubscription(subscriptionId: string, newPriceId: string): Promise<Stripe.Subscription>
     async cancelSubscription(subscriptionId: string, immediately: boolean): Promise<Stripe.Subscription>

     // Invoices
     async getUpcomingInvoice(customerId: string): Promise<Stripe.Invoice>
     async payInvoice(invoiceId: string): Promise<Stripe.Invoice>

     // Checkout
     async createCheckoutSession(customerId: string, priceId: string): Promise<string> // Returns session ID
     async createPortalSession(customerId: string): Promise<string> // Returns portal URL
     ```

3. **Webhook Handler** (Day 4)
   - File: `Backend/src/modules/payments/webhooks.controller.ts`
   - Events to handle:
     ```typescript
     @Post('webhooks/stripe')
     async handleStripeWebhook(@Req() req: RawBodyRequest) {
       const sig = req.headers['stripe-signature'];
       const event = this.stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);

       switch (event.type) {
         case 'customer.subscription.created':
           await this.handleSubscriptionCreated(event.data.object);
           break;

         case 'customer.subscription.updated':
           await this.handleSubscriptionUpdated(event.data.object);
           break;

         case 'customer.subscription.deleted':
           await this.handleSubscriptionCanceled(event.data.object);
           break;

         case 'invoice.payment_succeeded':
           await this.handlePaymentSucceeded(event.data.object);
           break;

         case 'invoice.payment_failed':
           await this.handlePaymentFailed(event.data.object);
           break;

         case 'customer.subscription.trial_will_end':
           await this.handleTrialEnding(event.data.object);
           break;
       }
     }
     ```

4. **Payment UI Components** (Day 5)
   - Pricing Page:
     - File: `Frontend/src/app/(marketing)/pricing/page.tsx`
     - Features:
       - Tier comparison table
       - Monthly/Annual toggle
       - "Choose Plan" buttons → Stripe Checkout

   - Checkout Flow:
     - Redirect to Stripe Checkout (hosted)
     - Success redirect: `/dashboard?subscription=success`
     - Cancel redirect: `/pricing?checkout=canceled`

   - Billing Portal:
     - File: `Frontend/src/app/(dashboard)/settings/billing/page.tsx`
     - Features:
       - Current plan display
       - Usage meters
       - Payment method management
       - Invoice history
       - "Manage Billing" → Stripe Customer Portal

**Expected Outcome**:
- ✅ Stripe fully integrated for subscriptions
- ✅ Automated billing on subscription cycles
- ✅ Payment failure handling
- ✅ Customer portal for self-service

**Acceptance Criteria**:
- [ ] Stripe test mode working
- [ ] Checkout flow functional
- [ ] Webhooks processing successfully
- [ ] Customer portal accessible
- [ ] Invoice generation working
- [ ] Payment failure notifications sent

---

#### **Phase 5: Trial Management System** 🎁
**Status**: 🔴 CRITICAL - Missing (0% implemented)
**Timeline**: 4 days
**Effort**: 30 hours
**Complexity**: Medium

**Implementation Steps**:

1. **Trial Logic** (Day 1)
   - Modify subscription creation to always include trial:
     ```typescript
     async signUp(email: string, password: string): Promise<User> {
       // 1. Create user
       const user = await this.createUser(email, password);

       // 2. Create Stripe customer
       const stripeCustomer = await this.stripeService.createCustomer(user.id, email);

       // 3. Create subscription with trial
       const subscription = await this.subscriptionService.createSubscription(
         user.id,
         'BASIC', // Default tier
         7, // 7-day trial
       );

       // 4. Send welcome email
       await this.emailService.sendWelcomeEmail(user.email, {
         trialEndsAt: subscription.trial_ends_at,
       });

       return user;
     }
     ```

2. **Trial Expiration Worker** (Day 2)
   - File: `Backend/src/modules/subscriptions/workers/trial-expiration.worker.ts`
   - Cron job (runs daily at 00:00 UTC):
     ```typescript
     @Cron('0 0 * * *') // Daily at midnight
     async checkTrialExpirations() {
       const today = new Date();

       // Find trials expiring today
       const expiringTrials = await this.prisma.subscription.findMany({
         where: {
           status: 'TRIALING',
           trial_ends_at: {
             lte: today,
           },
         },
         include: { user: true },
       });

       for (const subscription of expiringTrials) {
         if (subscription.stripe_subscription_id) {
           // Has payment method → Convert to paid
           await this.subscriptionService.convertTrialToPaid(subscription.id);
           await this.emailService.sendTrialConvertedEmail(subscription.user.email);
         } else {
           // No payment method → Suspend
           await this.subscriptionService.suspendSubscription(subscription.id);
           await this.emailService.sendTrialExpiredEmail(subscription.user.email);
         }
       }
     }
     ```

3. **Trial Reminder Emails** (Day 3)
   - Day 1: Welcome + trial info
   - Day 3: "How's it going?" check-in
   - Day 5: "2 days left" warning
   - Day 6: "Trial ends tomorrow" final warning
   - Day 7: Conversion or suspension

4. **Trial Dashboard Widget** (Day 4)
   - Frontend: Show trial countdown banner
   - Backend: API endpoint for trial status
   - Example:
     ```tsx
     {isTrialing && (
       <Alert variant="info">
         <Clock className="h-4 w-4" />
         <AlertTitle>Trial Active</AlertTitle>
         <AlertDescription>
           Your {trialDaysRemaining}-day trial ends on {trialEndsAt}.
           <Link href="/settings/billing">Add payment method</Link> to continue after trial.
         </AlertDescription>
       </Alert>
     )}
     ```

**Expected Outcome**:
- ✅ 7-day trial for all new signups
- ✅ Automated trial-to-paid conversion
- ✅ Email reminders throughout trial
- ✅ Graceful suspension if no payment

**Acceptance Criteria**:
- [ ] Trial created on signup
- [ ] Cron job running daily
- [ ] Trial conversion working
- [ ] Trial suspension working
- [ ] Email reminders sent
- [ ] Dashboard shows trial status

---

### Week 5-6: OPERATIONAL COMPLETENESS

#### **Phase 6: Email Service Provider** 📧
**Status**: ⚠️ PARTIAL - Infrastructure exists, no provider
**Timeline**: 3 days
**Effort**: 20 hours
**Complexity**: Low

**Implementation Steps**:

1. **Provider Selection** (Day 1)
   - **Recommended**: SendGrid (Twilio)
     - Pros: 100 emails/day free, excellent deliverability, easy integration
     - Cons: None for our use case
   - Alternative: AWS SES (if already on AWS)
   - Install: `npm install @sendgrid/mail`

2. **Email Service Implementation** (Day 2)
   - File: `Backend/src/modules/email/email.service.ts`
   - Replace stub with SendGrid:
     ```typescript
     import sgMail from '@sendgrid/mail';

     @Injectable()
     export class EmailService {
       constructor() {
         sgMail.setApiKey(process.env.SENDGRID_API_KEY);
       }

       async send(to: string, subject: string, html: string): Promise<void> {
         const msg = {
           to,
           from: 'noreply@yoursaas.com',
           subject,
           html,
         };

         await sgMail.send(msg);
         this.logger.log(`Email sent to ${to}: ${subject}`);
       }
     }
     ```

3. **Email Templates** (Day 3)
   - File: `Backend/src/modules/email/templates/`
   - Templates:
     - `welcome.html` - Trial welcome
     - `trial-reminder.html` - Trial ending soon
     - `trial-expired.html` - Trial ended
     - `trial-converted.html` - Subscription activated
     - `payment-failed.html` - Payment issue
     - `invoice.html` - Invoice notification
   - Use: Handlebars or EJS for templating

**Expected Outcome**:
- ✅ All email notifications functional
- ✅ Professional HTML templates
- ✅ Reliable delivery (>95% rate)

**Acceptance Criteria**:
- [ ] SendGrid API key configured
- [ ] All templates created
- [ ] Emails sending successfully
- [ ] Bounce tracking enabled
- [ ] Unsubscribe links working

---

#### **Phase 7: Staff Scheduling System** 👥
**Status**: 🟡 MEDIUM PRIORITY - Needed for multi-staff salons
**Timeline**: 6 days
**Effort**: 60 hours
**Complexity**: Medium-High

**Implementation Steps**:

1. **Database Schema** (Day 1)
   ```prisma
   model Master {
     id                String   @id @default(uuid())
     salon_id          String
     name              String
     email             String?
     phone             String?
     avatar_url        String?
     specializations   Json     // Array of service IDs
     is_active         Boolean  @default(true)
     created_at        DateTime @default(now())
     updated_at        DateTime @updatedAt

     salon             Salon    @relation(fields: [salon_id], references: [id], onDelete: Cascade)
     availability      MasterAvailability[]
     bookings          Booking[]

     @@index([salon_id])
   }

   model MasterAvailability {
     id                String   @id @default(uuid())
     master_id         String
     day_of_week       Int      // 0-6 (Sunday-Saturday)
     start_time        String   // "09:00"
     end_time          String   // "18:00"
     is_available      Boolean  @default(true)

     master            Master   @relation(fields: [master_id], references: [id], onDelete: Cascade)

     @@index([master_id])
     @@unique([master_id, day_of_week])
   }

   model Service {
     id                String   @id @default(uuid())
     salon_id          String
     name              String
     description       String?
     duration_minutes  Int      @default(60)
     price             Decimal  @db.Decimal(10, 2)
     category          String   @default("OTHER") // HAIR, NAILS, MAKEUP, SPA, OTHER
     is_active         Boolean  @default(true)
     created_at        DateTime @default(now())
     updated_at        DateTime @updatedAt

     salon             Salon    @relation(fields: [salon_id], references: [id], onDelete: Cascade)
     bookings          Booking[]

     @@index([salon_id])
   }
   ```

2. **Availability Checking Logic** (Days 2-3)
   - File: `Backend/src/modules/ai/services/availability.service.ts`
   - Enhanced logic:
     ```typescript
     async checkAvailability(
       salonId: string,
       serviceId: string,
       requestedDateTime: Date,
       masterName?: string,
     ): Promise<AvailabilityResult> {
       // 1. Get service details
       const service = await this.getService(serviceId);

       // 2. Find available masters
       let masters = await this.getAvailableMasters(salonId, serviceId, requestedDateTime);

       // 3. Filter by name if specified
       if (masterName) {
         masters = masters.filter(m => m.name.toLowerCase().includes(masterName.toLowerCase()));
       }

       // 4. Check each master's schedule
       for (const master of masters) {
         const isAvailable = await this.isMasterAvailable(
           master.id,
           requestedDateTime,
           service.duration_minutes,
         );

         if (isAvailable) {
           return {
             available: true,
             master: master.name,
             time: requestedDateTime,
           };
         }
       }

       // 5. No availability → Find alternatives
       const alternatives = await this.findAlternativeSlots(salonId, serviceId, requestedDateTime);

       return {
         available: false,
         alternatives,
       };
     }

     private async isMasterAvailable(
       masterId: string,
       startTime: Date,
       durationMinutes: number,
     ): Promise<boolean> {
       const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

       // Check working hours
       const dayOfWeek = startTime.getDay();
       const availability = await this.prisma.masterAvailability.findUnique({
         where: {
           master_id_day_of_week: { master_id: masterId, day_of_week: dayOfWeek },
         },
       });

       if (!availability || !availability.is_available) return false;

       // Check existing bookings (no overlap)
       const conflictingBooking = await this.prisma.booking.findFirst({
         where: {
           master_id: masterId,
           status: { in: ['PENDING', 'CONFIRMED'] },
           OR: [
             {
               start_ts: { lt: endTime },
               end_ts: { gt: startTime },
             },
           ],
         },
       });

       return !conflictingBooking;
     }
     ```

3. **Admin UI - Staff Management** (Days 4-5)
   - File: `Frontend/src/app/(dashboard)/staff/page.tsx`
   - Features:
     - List all masters
     - Add new master
     - Edit master details (name, specializations)
     - Set weekly availability schedule
     - Toggle active/inactive status
     - View master's bookings

4. **Booking Form Enhancement** (Day 6)
   - File: `Frontend/src/app/(dashboard)/bookings/new/page.tsx`
   - New fields:
     - Service selection (dropdown)
     - Master preference (optional dropdown)
     - Auto-calculate end time based on service duration

**Expected Outcome**:
- ✅ Multi-master salon support
- ✅ Accurate availability checking
- ✅ Service catalog management
- ✅ Intelligent booking recommendations

**Acceptance Criteria**:
- [ ] Masters CRUD working
- [ ] Availability schedule configurable
- [ ] Booking creation checks conflicts
- [ ] AI understands service requests
- [ ] Dashboard shows master schedules

---

#### **Phase 8: Calendar UI Enhancement** 📅
**Status**: 🟡 MEDIUM PRIORITY - UX improvement
**Timeline**: 5 days
**Effort**: 40 hours
**Complexity**: Medium

**Implementation Steps**:

1. **Library Selection** (Day 1)
   - **Recommended**: `react-big-calendar` or `FullCalendar`
   - Install: `npm install react-big-calendar date-fns`
   - Features needed:
     - Month/week/day views
     - Drag-and-drop rescheduling
     - Color-coding by master/service
     - Click to view booking details

2. **Calendar Component** (Days 2-3)
   - File: `Frontend/src/components/calendar/BookingCalendar.tsx`
   - Features:
     ```tsx
     export function BookingCalendar() {
       const [view, setView] = useState<'month' | 'week' | 'day'>('week');
       const [date, setDate] = useState(new Date());

       const { data: bookings } = useBookings({ start: startOfWeek(date), end: endOfWeek(date) });

       const events = bookings.map(booking => ({
         id: booking.id,
         title: `${booking.customer_name} - ${booking.service_name}`,
         start: new Date(booking.start_ts),
         end: new Date(booking.end_ts),
         resource: {
           masterId: booking.master_id,
           status: booking.status,
         },
       }));

       return (
         <Calendar
           localizer={dateFnsLocalizer}
           events={events}
           view={view}
           onView={setView}
           date={date}
           onNavigate={setDate}
           onSelectEvent={handleEventClick}
           onEventDrop={handleEventDrop}
           eventPropGetter={getEventStyle}
           components={{
             event: BookingEventCard,
           }}
         />
       );
     }
     ```

3. **Drag-and-Drop Rescheduling** (Day 4)
   - Enable `react-big-calendar` DnD
   - On drop:
     ```typescript
     async function handleEventDrop({ event, start, end }) {
       // 1. Check new time slot availability
       const isAvailable = await checkAvailability(event.resource.masterId, start, end);

       if (!isAvailable) {
         toast.error('Time slot not available');
         return;
       }

       // 2. Update booking
       await updateBooking(event.id, {
         start_ts: start,
         end_ts: end,
       });

       // 3. Notify customer (WhatsApp + Email)
       await sendRescheduleNotification(event.id);

       toast.success('Booking rescheduled successfully');
     }
     ```

4. **Calendar Filters** (Day 5)
   - Filters:
     - By master (multi-select)
     - By service (multi-select)
     - By status (PENDING, CONFIRMED, COMPLETED, CANCELLED)
   - Color-coding:
     - Blue: PENDING
     - Green: CONFIRMED
     - Gray: COMPLETED
     - Red: CANCELLED

**Expected Outcome**:
- ✅ Visual calendar for booking management
- ✅ Drag-and-drop rescheduling
- ✅ Color-coded by status/master
- ✅ Responsive (mobile-friendly)

**Acceptance Criteria**:
- [ ] Calendar rendering correctly
- [ ] Drag-and-drop working
- [ ] Filters functional
- [ ] Mobile-responsive
- [ ] Performance: <1s load time

---

### Week 7-8: POLISH & LAUNCH PREP

#### **Phase 9: Onboarding Wizard** 🧙‍♂️
**Timeline**: 4 days
**Effort**: 30 hours

**Steps**:
1. WhatsApp Business Account connection guide
2. Phone number verification flow
3. Salon profile setup (name, address, hours)
4. Add first service
5. Add first master
6. Test message flow
7. Dashboard walkthrough

---

#### **Phase 10: Testing & QA** 🧪
**Timeline**: 5 days
**Effort**: 50 hours

**Coverage**:
- Unit tests: 85%+ target
- Integration tests: All API endpoints
- E2E tests: Critical user flows
- Load testing: 100 concurrent users
- Security audit: OWASP Top 10
- Payment testing: Stripe test mode

---

#### **Phase 11: Documentation** 📚
**Timeline**: 3 days
**Effort**: 25 hours

**Deliverables**:
- User Guide (for salon owners)
- API Documentation (Swagger)
- Admin Guide (platform management)
- Developer Setup Guide
- Deployment Guide

---

#### **Phase 12: Beta Launch** 🚀
**Timeline**: Week 8
**Effort**: Coordination + Monitoring

**Checklist**:
- [ ] 20 beta salons recruited (Israel)
- [ ] Production environment ready
- [ ] Monitoring dashboards live
- [ ] Support system operational
- [ ] Payment processing tested
- [ ] Rollback plan prepared
- [ ] Launch announcement ready

---

## 📊 EFFORT SUMMARY

| Phase | Effort (hours) | Timeline | Priority |
|-------|---------------|----------|----------|
| Phase 1: AI Cache System | 40 | 5 days | 🔴 CRITICAL |
| Phase 2: Multi-Language | 40 | 5 days | 🔴 CRITICAL |
| Phase 3: Subscriptions | 80 | 7 days | 🔴 CRITICAL |
| Phase 4: Stripe Payments | 60 | 5 days | 🔴 CRITICAL |
| Phase 5: Trial System | 30 | 4 days | 🔴 CRITICAL |
| Phase 6: Email Provider | 20 | 3 days | 🟡 HIGH |
| Phase 7: Staff Scheduling | 60 | 6 days | 🟡 MEDIUM |
| Phase 8: Calendar UI | 40 | 5 days | 🟡 MEDIUM |
| Phase 9: Onboarding | 30 | 4 days | 🟡 MEDIUM |
| Phase 10: Testing & QA | 50 | 5 days | 🟢 LOW |
| Phase 11: Documentation | 25 | 3 days | 🟢 LOW |
| **TOTAL** | **475 hours** | **~52 days** | **8-10 weeks** |

---

## 🎯 SUCCESS CRITERIA

### Technical Metrics
- [ ] 90%+ AI cache hit rate (Week 2)
- [ ] <2s average response time
- [ ] 99.9% uptime SLA
- [ ] 85%+ test coverage
- [ ] Zero critical security vulnerabilities

### Business Metrics
- [ ] 20 beta salons onboarded (Week 8)
- [ ] 30%+ trial-to-paid conversion
- [ ] <10% monthly churn
- [ ] $10K MRR by Month 3
- [ ] 40+ NPS score

### Product Metrics
- [ ] 5 languages supported (en, ru, es, pt, he)
- [ ] 3 subscription tiers operational
- [ ] Stripe payments processing
- [ ] Email notifications 100% functional
- [ ] Staff scheduling working for 10+ master salons

---

## 🚨 RISK MITIGATION

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Stripe integration delays | HIGH | MEDIUM | Start Phase 4 early, use test mode |
| AI costs exceed budget | MEDIUM | LOW | Phase 1 cache system addresses this |
| Multi-language quality issues | MEDIUM | MEDIUM | Native speaker review, A/B testing |
| Beta salon churn | HIGH | MEDIUM | Strong onboarding, dedicated support |
| Payment failure handling bugs | HIGH | LOW | Extensive webhook testing |

---

## 👥 TEAM RECOMMENDATIONS

**Minimum Viable Team**:
- 1 Senior Full-Stack Developer (you, CTO)
- 1 AI Engineer (for Phases 1-2, can be part-time)
- 1 DevOps/Backend (for Stripe + infrastructure)

**Ideal Team**:
- 1 CTO (architecture, code review)
- 1 Senior Backend Developer (subscriptions, payments)
- 1 AI Engineer (cache system, multi-language)
- 1 Frontend Developer (calendar UI, onboarding)
- 1 DevOps Engineer (deployment, monitoring)
- 1 QA Engineer (testing, automation)

---

## 📅 NEXT ACTIONS (Immediate)

**Week 1 Sprints**:

**Sprint 1 (Days 1-2): AI Cache Foundation**
- [ ] Create `ai_response_cache` table migration
- [ ] Implement `cache.service.ts`
- [ ] Integrate cache into `ai.service.ts`
- [ ] Unit tests for cache service

**Sprint 2 (Days 3-5): Cache Optimization**
- [ ] Cache warming script
- [ ] Cache analytics endpoint
- [ ] Hit rate dashboard
- [ ] Performance benchmarks

**Sprint 3 (Days 6-7): Language Detection**
- [ ] Pattern-based language detector
- [ ] OpenAI fallback for edge cases
- [ ] Unit tests (95% accuracy target)

---

## 🎉 CONCLUSION

This roadmap transforms the current **85% complete platform** into a **100% production-ready SaaS** in 8-10 weeks.

**Key Competitive Advantages Being Built**:
1. ✅ 90% cache hit rate → 10x cost reduction vs competitors
2. ✅ 15 languages → 2.6B potential customers
3. ✅ 7-day trial → Low-friction customer acquisition
4. ✅ $20-299 pricing → ROI-focused value proposition

**Timeline to Revenue**:
- Week 4: First paying customer (after Stripe integration)
- Week 6: Beta launch (20 salons)
- Week 8: Product launch (100+ salons target)
- Month 3: $10K MRR milestone

**Ready to execute?** Let's start with Phase 1: AI Cache System! 🚀

---

**Document Owner**: CTO (Claude Code)
**Last Updated**: October 24, 2025
**Status**: APPROVED - Ready for execution