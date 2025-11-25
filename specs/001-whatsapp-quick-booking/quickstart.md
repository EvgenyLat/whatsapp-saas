# Quick Start: WhatsApp Interactive Quick Booking

**Feature**: 001-whatsapp-quick-booking
**Estimated Setup Time**: 30-45 minutes
**Difficulty**: Intermediate

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Setup](#database-setup)
4. [Running Backend](#running-backend)
5. [Setup WhatsApp Webhook](#setup-whatsapp-webhook)
6. [Testing the Flow](#testing-the-flow)
7. [Running Tests](#running-tests)
8. [Development Workflow](#development-workflow)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, ensure you have:

### Required Software
- **Node.js 20+** with npm 9+
- **PostgreSQL 15+** (running locally or via Docker)
- **Redis 7+** (for caching and Bull queues)
- **Git** for version control

### Required Accounts
- **WhatsApp Business Account** with Cloud API access
  - Get started: https://developers.facebook.com/docs/whatsapp/cloud-api/get-started
  - You'll need: Phone Number ID, Access Token, Webhook Verify Token
- **OpenAI API Key** (for intent parsing)
  - Get key: https://platform.openai.com/api-keys
- **ngrok Account** (for local webhook testing)
  - Sign up: https://ngrok.com/

### Knowledge Prerequisites
- Basic TypeScript/Node.js knowledge
- Familiarity with NestJS framework
- Understanding of REST APIs and webhooks
- Basic PostgreSQL/Prisma ORM knowledge

---

## Environment Setup

### 1. Clone Repository and Checkout Feature Branch

```bash
git clone <repository-url>
cd whatsapp-saas-starter
git checkout 001-whatsapp-quick-booking
```

### 2. Install Dependencies

**Backend**:
```bash
cd Backend
npm install
```

**Frontend** (for analytics dashboard):
```bash
cd ../Frontend
npm install
```

### 3. Configure Environment Variables

**Backend Environment**:

```bash
cd Backend
cp .env.example .env
```

Edit `Backend/.env` with your credentials:

```env
# ============================================
# WhatsApp Cloud API
# ============================================
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_TOKEN=your_access_token
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_secret_verify_token

# ============================================
# OpenAI (for intent parsing)
# ============================================
OPENAI_API_KEY=sk-your-openai-key
OPENAI_MODEL=gpt-3.5-turbo  # Cost-optimized model

# ============================================
# Database
# ============================================
DATABASE_URL=postgresql://user:password@localhost:5432/whatsapp_saas

# ============================================
# Redis (for caching + Bull queues)
# ============================================
REDIS_URL=redis://localhost:6379

# ============================================
# Application
# ============================================
NODE_ENV=development
PORT=3000

# ============================================
# Feature Flags
# ============================================
WHATSAPP_INTERACTIVE_ENABLED=true
MAX_SLOT_SEARCH_DAYS=30
WAITLIST_ENABLED=true
```

**Get WhatsApp Credentials**:
1. Go to https://developers.facebook.com/apps
2. Select your WhatsApp Business App
3. In left sidebar: WhatsApp > API Setup
4. Copy **Phone Number ID**
5. Generate or copy **Temporary Access Token**
6. Create a **Webhook Verify Token** (any random string, e.g., `my-secret-token-123`)

### 4. Start Required Services

**PostgreSQL** (if using Docker):
```bash
docker run --name postgres-whatsapp \
  -e POSTGRES_PASSWORD=your_password \
  -e POSTGRES_DB=whatsapp_saas \
  -p 5432:5432 \
  -d postgres:15
```

**Redis** (if using Docker):
```bash
docker run --name redis-whatsapp \
  -p 6379:6379 \
  -d redis:7-alpine
```

Verify services are running:
```bash
# PostgreSQL
psql -h localhost -U postgres -d whatsapp_saas

# Redis
redis-cli ping
# Should respond: PONG
```

---

## Database Setup

### 1. Run Migrations

```bash
cd Backend
npx prisma migrate dev --name add-interactive-booking-tables
```

This creates:
- `customer_preferences` table
- `waitlist` table
- 4 performance indexes:
  - `idx_bookings_availability`
  - `idx_bookings_popular_times`
  - `idx_customer_prefs`
  - `idx_waitlist_queue`

### 2. Seed Test Data

```bash
npx prisma db seed
```

This creates:
- 1 test salon ("Test Salon")
- 3 masters (Sarah, Alex, Jordan)
- 5 services (Haircut $50, Coloring $80, etc.)
- 20 sample bookings (for popular times testing)
- 2 customers with preferences (for fast-track testing)

### 3. Verify Database

```bash
npx prisma studio
```

Opens Prisma Studio at http://localhost:5555 to browse data.

---

## Running Backend

### 1. Start Development Server

```bash
cd Backend
npm run start:dev
```

You should see:
```
[Nest] Starting Nest application...
[Nest] WhatsAppModule initialized
[Nest] AIModule initialized
[Nest] BookingsModule initialized
[Nest] NotificationsModule initialized
[Nest] NestApplication successfully started
[Nest] Application is running on: http://localhost:3000
```

### 2. Verify Backend Health

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "redis": { "status": "up" }
  }
}
```

### 3. Access Swagger Documentation

Open browser: http://localhost:3000/api/docs

You should see OpenAPI documentation for all endpoints including:
- `POST /api/v1/whatsapp/webhook` (updated for interactive messages)
- `GET /api/v1/analytics/zero-typing-metrics`
- `GET /api/v1/analytics/waitlist-metrics`

---

## Setup WhatsApp Webhook

### 1. Start ngrok

```bash
ngrok http 3000
```

You'll see output like:
```
Session Status                online
Forwarding                    https://abc123.ngrok.io -> http://localhost:3000
```

Copy the `https://` URL (e.g., `https://abc123.ngrok.io`)

### 2. Configure WhatsApp Webhook

1. Go to https://developers.facebook.com/apps
2. Select your WhatsApp Business App
3. Navigate to: WhatsApp > Configuration
4. Under "Webhook", click "Edit"

**Callback URL**: `https://abc123.ngrok.io/api/v1/whatsapp/webhook`

**Verify Token**: (same as `WHATSAPP_WEBHOOK_VERIFY_TOKEN` in .env)

5. Click "Verify and Save"

### 3. Subscribe to Webhook Events

In the same "Configuration" page:

Under "Webhook Fields", subscribe to:
- ✅ messages

### 4. Test Webhook Connection

Send a test message to your WhatsApp Business number:

```
"Hello"
```

Check Backend logs:
```bash
cd Backend
tail -f logs/app.log
```

You should see:
```
[WhatsAppService] Received message from 1234567890: Hello
[AIService] Processing intent...
```

---

## Testing the Flow

### 1. Zero-Typing Booking Flow (Happy Path)

**Send WhatsApp message**:
```
"Haircut Friday 3pm"
```

**Expected flow**:

1. **Bot responds with Interactive Card** (Reply Buttons):
   ```
   Available times on Friday:

   💇 Women's Haircut
   ⏱️  60 min
   💰 $50

   [2:00 PM - Sarah] [3:00 PM - Sarah ⭐] [4:00 PM - Sarah]

   ⭐ Your preferred time | Tap to select
   ```

2. **Tap "3:00 PM - Sarah"**

3. **Bot shows confirmation card**:
   ```
   Confirm Your Booking

   You selected:
   📅 Friday, October 25, 2025
   🕐 3:00 PM - 4:00 PM
   💇 Women's Haircut
   👤 Sarah Johnson
   💰 $50.00

   [✅ Confirm] [Change Time]

   You'll receive a reminder 24h before
   ```

4. **Tap "✅ Confirm"**

5. **Bot confirms**:
   ```
   ✅ Booked!

   Women's Haircut with Sarah Johnson
   Friday, October 25, 2025 at 3:00 PM

   Booking Code: BK-ABC123

   See you soon! 💇
   ```

**Total**: 1 message typed + 2 button taps = <30 seconds ✅

---

### 2. Alternative Slots Flow (Preferred Time Unavailable)

**Send**:
```
"Haircut Friday 3pm"
```

**If 3pm is booked**, bot shows:
```
Next Available Times

Friday 3pm is booked. Close alternatives:

[2:00 PM - Sarah] ⭐1h before
[4:00 PM - Sarah] ⭐1h after
[3:00 PM - Saturday] ⭐Same time next day

Tap to select your time
```

**Tap any alternative** → Proceeds to confirmation

---

### 3. Waitlist Flow (All Slots Booked)

**Send**:
```
"Haircut this week"
```

**If week is fully booked**, bot shows:
```
We're Very Busy! 🎉

Fully booked for this week!

Earliest availability:
📅 Monday, Nov 4 at 2:00 PM
👤 Sarah Johnson

Want earlier?

[Join Waitlist] [Book Nov 4] [Call Salon]
```

**Tap "Join Waitlist"** → Added to queue, receives:
```
✅ You're on the waitlist!

We'll notify you if a slot opens.
Your position: #3

We'll text you within 15 minutes if someone cancels.
```

**When slot opens** → Receives notification:
```
Good news! A slot just opened:

📅 Friday, October 25
🕐 3:00 PM
💇 Haircut
👤 Sarah

⏱️ Reserved for you for 15 minutes

[Book Now] [Pass]
```

---

### 4. Returning Customer Fast-Track

**Send** (as customer with 3+ past bookings):
```
"Book my usual"
```

**Bot responds**:
```
Welcome back, John!

Book your usual?

💇 Haircut with Sarah
📅 Friday 3:00 PM
💰 $50

[Book Now ⭐] [See All Times]
```

**Tap "Book Now ⭐"** → Instant booking (1 tap total!)

---

### 5. Popular Times Suggestion

**Send**:
```
"Haircut anytime"
```

**Bot shows**:
```
Most customers book:

📊 Popular Times

[Friday 2pm] ⭐ 23 bookings
[Friday 3pm] ⭐ 19 bookings
[Saturday 10am] ⭐ 17 bookings
[Saturday 2pm] ⭐ 15 bookings

[Select Time] [See All Times]
```

---

## Running Tests

### 1. Unit Tests

```bash
cd Backend
npm run test
```

Tests all service logic:
- SlotFinderService (30-day search, working hours parsing)
- AlternativeSuggesterService (ranking algorithm)
- PopularTimesService (SQL query, default times)
- WaitlistNotifierService (15-min timer, race conditions)
- TypedMessageHandlerService (context preservation)

**Target**: 80%+ coverage

### 2. Integration Tests

```bash
npm run test:integration
```

Tests API endpoints:
- Webhook `/whatsapp/webhook` with interactive messages
- Button click → booking creation flow
- Waitlist signup → notification → booking flow

**Target**: 85%+ coverage on webhook handlers

### 3. E2E Tests

```bash
npm run test:e2e
```

Tests complete user flows:
- Happy path: "Haircut Friday 3pm" → tap → confirm → booked
- Alternative flow: Unavailable time → show alternatives → book
- Waitlist flow: Full week → join waitlist → notified → book

**Target**: 100% coverage on critical user stories (US1-US5)

### 4. Coverage Report

```bash
npm run test:cov
```

Generates coverage report at `Backend/coverage/index.html`

Open in browser to see line-by-line coverage.

---

## Development Workflow

### 1. Branch Strategy

**Feature branch**: `001-whatsapp-quick-booking` (already checked out)

**Create task branch** (for specific task):
```bash
git checkout -b 001-whatsapp-quick-booking-slot-finder
```

### 2. TDD Workflow (MANDATORY)

**Step 1: Write Test FIRST**

```bash
cd Backend
touch src/modules/bookings/__tests__/slot-finder.service.spec.ts
```

```typescript
// slot-finder.service.spec.ts
describe('SlotFinderService', () => {
  it('should find available slots in 30-day window', async () => {
    // Arrange
    const service = new SlotFinderService(mockPrisma);
    const params = {
      salonId: '123',
      serviceId: '456',
      preferredDate: '2024-10-25',
      maxDaysAhead: 30
    };

    // Act
    const result = await service.findSlots(params);

    // Assert
    expect(result.slots).toHaveLength(5);
    expect(result.searchedDays).toBeLessThanOrEqual(30);
  });
});
```

**Step 2: Run Test (should FAIL)**

```bash
npm run test -- slot-finder.service.spec.ts
```

**Step 3: Write Implementation**

```typescript
// slot-finder.service.ts
export class SlotFinderService {
  async findSlots(params: SlotSearchParams): Promise<SlotSearchResult> {
    // Implementation here
  }
}
```

**Step 4: Run Test (should PASS)**

```bash
npm run test -- slot-finder.service.spec.ts
```

**Step 5: Refactor + Repeat**

### 3. Code Review Checklist

Before creating PR:

- ✅ All tests passing (`npm run test`)
- ✅ Coverage ≥80% (`npm run test:cov`)
- ✅ No TypeScript errors (`npx tsc --noEmit`)
- ✅ Linting passed (`npm run lint`)
- ✅ Formatted code (`npm run format`)
- ✅ No secrets in code (check with `git diff`)
- ✅ Documentation updated (JSDoc comments)
- ✅ Database migration created (if schema changed)

### 4. Commit Convention

```bash
git commit -m "feat(bookings): add SlotFinderService with 30-day search

- Implement infinite slot search up to 30 days
- Add batch query optimization for performance
- Add unit tests with 95% coverage

Relates to FR-006 Infinite Availability Search

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

**Commit types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `test`: Tests only
- `refactor`: Code refactoring

---

## Troubleshooting

### Issue: Webhook not receiving messages

**Symptoms**: Send WhatsApp message, no logs in backend

**Solution**:

1. **Check ngrok is running**:
   ```bash
   curl https://abc123.ngrok.io/health
   ```
   Should return `{"status":"ok"}`

2. **Check webhook subscription**:
   - Go to WhatsApp > Configuration
   - Verify "messages" is checked under Webhook Fields

3. **Check WhatsApp signature verification**:
   - Temporarily disable signature check (for debugging only):
   ```typescript
   // webhook.controller.ts
   @Post()
   async handleWebhook(@Body() body: any) {
     // Skip signature verification temporarily
     return this.webhookService.process(body);
   }
   ```

4. **Check Backend logs**:
   ```bash
   tail -f Backend/logs/app.log
   ```

---

### Issue: Button click not working

**Symptoms**: Tap button, nothing happens or error

**Solution**:

1. **Check button ID format**:
   ```typescript
   // Must match pattern: ^(slot|confirm|waitlist|action|nav)_[a-zA-Z0-9_:-]+$
   {
     id: "slot_2024-10-25_15:00_m123", // ✅ Valid
     id: "book-this-slot", // ❌ Invalid (doesn't match pattern)
   }
   ```

2. **Check webhook handler**:
   ```bash
   # Search logs for button click event
   grep "button_reply" Backend/logs/app.log
   ```

3. **Test with curl**:
   ```bash
   curl -X POST http://localhost:3000/api/v1/whatsapp/webhook \
     -H "Content-Type: application/json" \
     -d '{
       "object": "whatsapp_business_account",
       "entry": [{
         "changes": [{
           "value": {
             "messages": [{
               "from": "1234567890",
               "type": "interactive",
               "interactive": {
                 "type": "button_reply",
                 "button_reply": {
                   "id": "slot_2024-10-25_15:00_m123",
                   "title": "3:00 PM - Sarah"
                 }
               }
             }]
           }
         }]
       }]
     }'
   ```

---

### Issue: Slow slot search (>3s)

**Symptoms**: Customer waits >3 seconds for slot suggestions

**Solution**:

1. **Check database indexes**:
   ```sql
   -- Should return 4 indexes
   SELECT indexname FROM pg_indexes
   WHERE tablename = 'bookings'
   AND indexname LIKE 'idx_%';
   ```

2. **Analyze query performance**:
   ```sql
   EXPLAIN ANALYZE
   SELECT * FROM bookings
   WHERE master_id = 'm123'
     AND date BETWEEN '2024-10-25' AND '2024-11-25'
     AND status != 'CANCELLED';
   ```

   Should show "Index Scan using idx_bookings_availability"

3. **Reduce search window** (temporary):
   ```env
   # .env
   MAX_SLOT_SEARCH_DAYS=14  # Reduce from 30 to 14
   ```

---

### Issue: Waitlist notification not sent

**Symptoms**: Slot opens, waitlist customer not notified

**Solution**:

1. **Check Bull queue**:
   ```bash
   npm run bull:dashboard
   # Visit http://localhost:3001
   ```

   Look for:
   - Queue: `waitlist-expiry`
   - Jobs: `check-expiry`
   - Status: `completed` or `failed`

2. **Check Redis connection**:
   ```bash
   redis-cli ping
   # Should respond: PONG
   ```

3. **Check waitlist status**:
   ```sql
   SELECT * FROM waitlist
   WHERE status = 'active'
   ORDER BY position_in_queue;
   ```

   Should have entries with `status='active'`

4. **Manual trigger** (for testing):
   ```typescript
   // In NestJS console or test
   await waitlistNotifier.notifyWaitlistOfOpening('slot_123');
   ```

---

### Issue: AI cost too high

**Symptoms**: OpenAI bill higher than expected

**Solution**:

1. **Check model usage**:
   ```env
   # Ensure using gpt-3.5-turbo, NOT gpt-4
   OPENAI_MODEL=gpt-3.5-turbo
   ```

2. **Check cache hit rate**:
   ```bash
   redis-cli
   > DBSIZE
   # Should show cached AI responses
   ```

3. **Enable preference bypass**:
   ```typescript
   // In QuickBookingService
   if (await this.isReturningCustomer(customerId)) {
     // Bypass AI, use preferences
     const prefs = await this.getUsualPreferences(customerId);
     return this.buildCardFromPreferences(prefs);
   }
   ```

4. **Monitor AI calls**:
   ```sql
   SELECT
     COUNT(*) as total_bookings,
     COUNT(*) FILTER (WHERE ai_used = true) as ai_calls,
     AVG(ai_cost) as avg_cost
   FROM bookings
   WHERE created_at > NOW() - INTERVAL '1 day';
   ```

   Target: <30% ai_calls (70% use preferences)

---

## Next Steps

Once basic flow is working:

1. **Implement Phase 2 Features** (from spec.md):
   - Multi-language support (US8)
   - Proactive rebooking (FR-017)
   - Analytics dashboard (Frontend)

2. **Performance Optimization**:
   - Add Redis caching for popular times (1-hour TTL)
   - Optimize database queries with EXPLAIN ANALYZE
   - Load test with 100 concurrent users

3. **Production Deployment**:
   - See [DEPLOYMENT.md](../../DEPLOYMENT.md) for production setup
   - Configure production WhatsApp webhook URL
   - Set up monitoring (Sentry, DataDog)

---

## Getting Help

**Documentation**:
- Feature spec: `specs/001-whatsapp-quick-booking/spec.md`
- Data model: `specs/001-whatsapp-quick-booking/data-model.md`
- API contracts: `specs/001-whatsapp-quick-booking/contracts/`

**External Resources**:
- WhatsApp Cloud API Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
- NestJS Docs: https://docs.nestjs.com
- Prisma Docs: https://www.prisma.io/docs

**Team Support**:
- Slack: #whatsapp-booking-dev
- Email: dev-team@example.com

---

## Checklist: Development Environment Ready

Before proceeding to implementation:

- [ ] Node.js 20+, PostgreSQL 15+, Redis 7+ installed
- [ ] WhatsApp Business Account configured
- [ ] OpenAI API key obtained
- [ ] Environment variables configured (`.env`)
- [ ] Database migrated and seeded
- [ ] Backend running on http://localhost:3000
- [ ] ngrok tunnel active
- [ ] WhatsApp webhook verified and subscribed
- [ ] Test message sent and received successfully
- [ ] All tests passing (`npm run test`)

**If all checked ✅**, you're ready to start implementation!

---

**Happy coding! 🚀**
