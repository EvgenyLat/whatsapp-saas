# Data Model: WhatsApp Interactive Quick Booking

**Feature**: 001-whatsapp-quick-booking
**Date**: 2025-10-25
**Purpose**: Define all entities, database schema, TypeScript interfaces, and relationships

---

## Table of Contents

1. [Core Entities](#1-core-entities)
2. [Database Schema](#2-database-schema)
3. [TypeScript Type System](#3-typescript-type-system)
4. [Entity Relationships](#4-entity-relationships)
5. [Validation Schemas](#5-validation-schemas)

---

## 1. Core Entities

### 1.1 Interactive Message Payload

**Purpose**: Represents WhatsApp Cloud API interactive message structure for both sending and receiving

**TypeScript Interface**:
```typescript
/**
 * WhatsApp Cloud API Interactive Message Payload
 *
 * @see https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages
 * @see spec.md FR-001 WhatsApp Cloud API Integration
 */
export interface InteractiveMessagePayload {
  messaging_product: 'whatsapp';
  to: string; // Customer phone number (E.164 format: +1234567890)
  type: 'interactive';
  interactive: InteractiveContent;
}

export interface InteractiveContent {
  type: 'button' | 'list';
  header?: InteractiveHeader;
  body: InteractiveBody;
  footer?: InteractiveFooter;
  action: InteractiveAction;
}

export interface InteractiveHeader {
  type: 'text';
  text: string; // Max 60 characters
}

export interface InteractiveBody {
  text: string; // Max 1024 characters
}

export interface InteractiveFooter {
  text: string; // Max 60 characters
}

// For Reply Buttons (max 3 buttons)
export interface InteractiveButtonAction {
  buttons: InteractiveButton[];
}

export interface InteractiveButton {
  type: 'reply';
  reply: {
    id: string; // Max 256 characters, format: {type}_{context}
    title: string; // Max 20 characters
  };
}

// For List Messages (max 10 rows per section)
export interface InteractiveListAction {
  button: string; // Button text, max 20 characters
  sections: InteractiveSection[];
}

export interface InteractiveSection {
  title: string; // Max 24 characters
  rows: InteractiveRow[];
}

export interface InteractiveRow {
  id: string; // Max 200 characters
  title: string; // Max 24 characters
  description?: string; // Max 72 characters
}

/**
 * Incoming webhook payload when customer clicks button
 *
 * @see research.md Section 1.1 Button Click Payload Structure
 */
export interface ButtonClickPayload {
  type: 'button_reply' | 'list_reply';
  button_reply?: {
    id: string;
    title: string;
  };
  list_reply?: {
    id: string;
    title: string;
    description?: string;
  };
}

/**
 * Parsed button click data
 */
export interface ParsedButtonClick {
  action: 'slot' | 'confirm' | 'waitlist' | 'action' | 'nav';
  context: Record<string, any>;
  rawId: string;
  title: string;
}
```

**Validation Rules**:
- Phone number must be E.164 format: `^\+[1-9]\d{1,14}$`
- Button ID must match pattern: `^(slot|confirm|waitlist|action|nav)_[a-zA-Z0-9_:-]+$`
- Max 3 buttons for Reply Buttons
- Max 10 rows per section for List Messages

**Example JSON** (Reply Buttons):
```json
{
  "messaging_product": "whatsapp",
  "to": "+1234567890",
  "type": "interactive",
  "interactive": {
    "type": "button",
    "body": {
      "text": "Available times on Friday:\n\n💇 Women's Haircut\n⏱️  60 min\n💰 $50"
    },
    "action": {
      "buttons": [
        {
          "type": "reply",
          "reply": {
            "id": "slot_2024-10-25_14:00_m123",
            "title": "2:00 PM - Sarah"
          }
        },
        {
          "type": "reply",
          "reply": {
            "id": "slot_2024-10-25_15:00_m123",
            "title": "3:00 PM - Sarah ⭐"
          }
        }
      ]
    },
    "footer": {
      "text": "⭐ Your preferred time | Tap to select"
    }
  }
}
```

---

### 1.2 Slot Suggestion

**Purpose**: Represents an available booking time slot with ranking and metadata

**TypeScript Interface**:
```typescript
/**
 * Available Time Slot Suggestion
 *
 * @see spec.md Key Entities - Slot Suggestion
 * @see research.md Section 2.1 Slot Search Performance
 */
export interface SlotSuggestion {
  slotId: string; // Format: {masterId}_{date}_{time}

  // Temporal data
  date: Date;
  startTime: string; // Format: HH:mm (24-hour)
  endTime: string;
  duration: number; // Minutes

  // Master data
  masterId: string;
  masterName: string;

  // Service data
  serviceId: string;
  serviceName: string;
  price: number; // Cents (e.g., 5000 = $50.00)

  // Availability
  available: boolean;

  // Ranking (from AlternativeSuggesterService)
  rank: number; // Proximity score (higher = better match)
  proximityLabel?: 'exact' | 'close' | 'same-day' | 'same-week' | 'alternative';

  // Metadata
  isPreferred?: boolean; // Customer's preferred master/time
  isPopular?: boolean; // From popular times data
}

/**
 * Slot search parameters
 */
export interface SlotSearchParams {
  salonId: string;
  serviceId: string;
  preferredDate: string; // ISO date: YYYY-MM-DD
  preferredTime?: string; // HH:mm or null for "anytime"
  masterId?: string; // null = any master
  maxDaysAhead: number; // Default: 30
}

/**
 * Slot search result
 */
export interface SlotSearchResult {
  slots: SlotSuggestion[];
  totalFound: number;
  searchedDays: number;
  hasMore: boolean; // True if stopped at maxDaysAhead with >20 slots
  fallbackActions?: ('waitlist' | 'call')[];
}
```

**Ranking Algorithm** (from research.md):
```typescript
// Priority scoring:
// - Same master (if customer specified): +1000
// - Within 1 hour of preferred time: +500
// - Within 2 hours: +300
// - Same day: +200
// - Time difference penalty: -(timeDiffMinutes / 10)

interface RankingFactors {
  sameMasterBonus: 1000;
  within1HourBonus: 500;
  within2HoursBonus: 300;
  sameDayBonus: 200;
  timeDiffPenalty: (minutes: number) => number; // -minutes/10
}
```

---

### 1.3 Booking Intent

**Purpose**: Parsed customer request with extracted preferences and confidence scores

**TypeScript Interface**:
```typescript
/**
 * Booking Intent (parsed from customer's message)
 *
 * @see spec.md Key Entities - Booking Intent
 * @see research.md Section 4.1 AI Optimization
 */
export interface BookingIntent {
  // Extracted preferences
  service?: string; // Service name or null
  serviceId?: string; // Resolved service ID
  master?: string; // Master name or null
  masterId?: string; // Resolved master ID
  preferredDate?: string; // Parsed date (ISO format)
  preferredTime?: string; // Parsed time (HH:mm)

  // Context
  language: string; // ISO 639-1 code (en, ru, es, pt, he)
  confidence: number; // 0-1 (AI extraction confidence)
  isReturningCustomer: boolean;

  // Special cases
  isAnytime: boolean; // Customer said "anytime", "whenever", "flexible"
  isUsual: boolean; // Customer said "book my usual", "same as last time"

  // Raw input
  originalMessage: string;
  customerId: string;
  salonId: string;
}

/**
 * Updated booking intent (after customer types new preference)
 *
 * @see spec.md FR-021 Handle Typed Messages After Buttons
 */
export interface IntentUpdate {
  updatedFields: Partial<BookingIntent>;
  preservedFields: (keyof BookingIntent)[];
  changeReason: string; // e.g., "Customer typed 'Actually Saturday'"
}
```

**Confidence Thresholds**:
- `>= 0.9`: High confidence - proceed directly
- `0.7 - 0.89`: Medium confidence - confirm with customer
- `< 0.7`: Low confidence - ask clarifying question

---

### 1.4 Customer Preferences

**Purpose**: Historical booking patterns for returning customers to enable fast-track booking

**TypeScript Interface**:
```typescript
/**
 * Customer Preferences (learned from booking history)
 *
 * @see spec.md Key Entities - Customer Preferences
 * @see spec.md FR-015 Returning Customer Preference Tracking
 */
export interface CustomerPreferences {
  id: string; // UUID
  customerId: string; // References customers table

  // Favorite patterns
  favoriteMasterId?: string; // Most frequently booked master
  favoriteServiceId?: string; // Most frequently booked service

  // Time preferences
  preferredDayOfWeek?: string; // 'monday', 'friday', etc.
  preferredTimeOfDay?: 'morning' | 'afternoon' | 'evening';
  preferredHour?: number; // 0-23 (most common booking hour)

  // Rebooking pattern
  avgRebookingDays?: number; // Average days between bookings (e.g., 28 = monthly)
  lastBookingDate?: Date;
  nextSuggestedBookingDate?: Date; // lastBookingDate + avgRebookingDays

  // Statistics
  totalBookings: number; // Total bookings by this customer

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Preference calculation input (from booking history)
 */
export interface PreferenceAnalysisInput {
  customerId: string;
  bookings: Array<{
    serviceId: string;
    masterId: string;
    date: Date;
    startTime: string;
  }>;
  minBookings: number; // Minimum bookings required (default: 3)
}
```

**Learning Algorithm**:
```typescript
// Favorite master = most frequently booked (mode)
// Favorite service = most frequently booked (mode)
// Preferred day = most common day of week
// Preferred time = average booking hour (rounded)
// Avg rebooking days = mean(days between consecutive bookings)
```

---

### 1.5 Popular Time Slot

**Purpose**: Historical booking patterns for a salon to suggest popular times when customer says "anytime"

**TypeScript Interface**:
```typescript
/**
 * Popular Time Slot (from historical booking data)
 *
 * @see spec.md Key Entities - Popular Time Slot
 * @see spec.md FR-023 Popular Times Suggestion
 * @see research.md Section 5 Popular Times Algorithm
 */
export interface PopularTimeSlot {
  // Time pattern
  dayOfWeek: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  hour: number; // 0-23

  // Popularity metrics
  bookingCount: number; // Raw count of bookings
  popularityScore: number; // Weighted score (0-1) with recency weighting

  // Availability
  isAvailable: boolean; // Is this time available in next occurrence?
  nextAvailableSlot?: Date; // Next date/time this slot is available

  // Display
  label: string; // e.g., "Friday 3pm"
  isDefault: boolean; // True if using industry default (salon has <10 bookings)
}

/**
 * Popular times query parameters
 */
export interface PopularTimesQuery {
  salonId: string;
  lookbackDays: number; // Default: 90
  limit: number; // Max results, default: 6
  includeAvailability: boolean; // Check if slots are currently available
}

/**
 * Popular times result
 */
export interface PopularTimesResult {
  times: PopularTimeSlot[];
  dataSource: 'historical' | 'industry-default';
  historicalBookingsCount: number; // Total bookings analyzed
  lookbackPeriod: string; // e.g., "90 days"
}
```

**Recency Weighting** (from research.md):
```sql
-- Last 30 days: 2.0x weight
-- Days 31-60: 1.5x weight
-- Days 61-90: 1.0x weight

SUM(
  CASE
    WHEN created_at > NOW() - INTERVAL '30 days' THEN 2.0
    WHEN created_at > NOW() - INTERVAL '60 days' THEN 1.5
    ELSE 1.0
  END
) as weighted_score
```

**Industry Defaults** (for new salons with <10 bookings):
```typescript
const DEFAULT_POPULAR_TIMES: PopularTimeSlot[] = [
  { dayOfWeek: 5, hour: 14, label: "Friday 2pm", isDefault: true },
  { dayOfWeek: 5, hour: 15, label: "Friday 3pm", isDefault: true },
  { dayOfWeek: 6, hour: 10, label: "Saturday 10am", isDefault: true },
  { dayOfWeek: 6, hour: 14, label: "Saturday 2pm", isDefault: true },
];
```

---

### 1.6 Waitlist Entry

**Purpose**: Customer waiting for slot availability with notification tracking

**TypeScript Interface**:
```typescript
/**
 * Waitlist Entry
 *
 * @see spec.md Key Entities - Waitlist Entry
 * @see spec.md FR-022 Waitlist Notification System
 * @see research.md Section 3 Waitlist Technical Design
 */
export interface WaitlistEntry {
  id: string; // UUID

  // References
  salonId: string;
  customerId: string;
  serviceId: string;
  masterId?: string; // null = any master acceptable

  // Preferences
  preferredDate?: Date; // null = any date
  preferredTime?: string; // HH:mm or null = any time

  // Notification settings
  notifyVia: 'whatsapp' | 'email' | 'sms';
  customerPhone?: string;
  customerEmail?: string;

  // Status tracking
  status: WaitlistStatus;
  positionInQueue: number; // 1 = next to be notified

  // Notification lifecycle
  notifiedAt?: Date; // When customer was notified of opening
  notificationExpiresAt?: Date; // notifiedAt + 15 minutes
  bookedAt?: Date; // When customer successfully booked
  slotOfferedId?: string; // The slot that was offered

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export type WaitlistStatus =
  | 'active'    // Waiting in queue
  | 'notified'  // Notified of opening, 15-min timer running
  | 'booked'    // Successfully booked from waitlist
  | 'passed'    // Customer clicked [Pass] button
  | 'expired';  // 15 minutes elapsed with no response

/**
 * Waitlist status transition rules
 */
export interface WaitlistStatusTransition {
  from: WaitlistStatus;
  to: WaitlistStatus;
  trigger: string;
  action: string;
}

const WAITLIST_TRANSITIONS: WaitlistStatusTransition[] = [
  {
    from: 'active',
    to: 'notified',
    trigger: 'Slot becomes available',
    action: 'Send WhatsApp notification with [Book Now] button, start 15-min timer'
  },
  {
    from: 'notified',
    to: 'booked',
    trigger: 'Customer clicks [Book Now] within 15 min',
    action: 'Create booking, remove from waitlist'
  },
  {
    from: 'notified',
    to: 'passed',
    trigger: 'Customer clicks [Pass] button',
    action: 'Cancel timer, notify next person in queue'
  },
  {
    from: 'notified',
    to: 'expired',
    trigger: '15 minutes elapsed with no response',
    action: 'Mark expired, notify next person in queue, send customer "still in queue" message'
  },
];
```

**Queue Management**:
```typescript
/**
 * Waitlist queue operations
 */
export interface WaitlistQueue {
  getNextInQueue(salonId: string, serviceId: string): Promise<WaitlistEntry | null>;
  updatePositions(salonId: string, serviceId: string): Promise<void>;
  notifyCustomer(waitlistId: string, slotId: string): Promise<void>;
  handleExpiry(waitlistId: string): Promise<void>;
}
```

---

## 2. Database Schema

### 2.1 New Tables

**Table: `customer_preferences`**

Stores learned customer booking patterns for fast-track rebooking.

```sql
CREATE TABLE customer_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

  -- Favorite patterns
  favorite_master_id UUID REFERENCES masters(id) ON DELETE SET NULL,
  favorite_service_id UUID REFERENCES services(id) ON DELETE SET NULL,

  -- Time preferences
  preferred_day_of_week VARCHAR(10), -- 'monday', 'friday', etc.
  preferred_time_of_day VARCHAR(10), -- 'morning', 'afternoon', 'evening'
  preferred_hour INT CHECK (preferred_hour >= 0 AND preferred_hour <= 23),

  -- Rebooking pattern
  avg_rebooking_days INT, -- Average days between bookings
  last_booking_date DATE,
  next_suggested_booking_date DATE,

  -- Statistics
  total_bookings INT DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  UNIQUE(customer_id)
);

-- Index for fast customer lookup
CREATE INDEX idx_customer_prefs ON customer_preferences(customer_id);

-- Index for proactive rebooking cron job
CREATE INDEX idx_customer_prefs_next_booking
ON customer_preferences(next_suggested_booking_date)
WHERE next_suggested_booking_date IS NOT NULL;
```

**Table: `waitlist`**

Manages customers waiting for slot availability with notification tracking.

```sql
CREATE TABLE waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  master_id UUID REFERENCES masters(id) ON DELETE SET NULL,

  -- Preferences
  preferred_date DATE,
  preferred_time TIME,

  -- Notification settings
  notify_via VARCHAR(20) DEFAULT 'whatsapp' CHECK (notify_via IN ('whatsapp', 'email', 'sms')),
  customer_phone VARCHAR(20),
  customer_email VARCHAR(255),

  -- Status tracking
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'notified', 'booked', 'passed', 'expired')),
  position_in_queue INT,

  -- Notification lifecycle
  notified_at TIMESTAMP,
  notification_expires_at TIMESTAMP,
  booked_at TIMESTAMP,
  slot_offered_id UUID,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for finding next customer in queue (CRITICAL for performance)
CREATE INDEX idx_waitlist_queue
ON waitlist(salon_id, service_id, position_in_queue, created_at)
WHERE status = 'active';

-- Index for expiry check (BullMQ job queries this)
CREATE INDEX idx_waitlist_expiry
ON waitlist(notification_expires_at)
WHERE status = 'notified';

-- Index for salon waitlist analytics
CREATE INDEX idx_waitlist_salon ON waitlist(salon_id, status, created_at);
```

---

### 2.2 Performance Indexes

From research.md, these indexes are CRITICAL for <3s slot search performance.

**Index 1: Booking Availability Check** (most frequent query)
```sql
-- Used by SlotFinderService to check if slot is available
-- Partial index excludes cancelled bookings (reduces index size)
CREATE INDEX idx_bookings_availability
ON bookings(master_id, date, status)
WHERE status != 'CANCELLED';

-- Query this optimizes:
SELECT * FROM bookings
WHERE master_id = ? AND date = ? AND status != 'CANCELLED';

-- Performance: 1000 bookings → <10ms (vs 100ms without index)
```

**Index 2: Popular Times Historical Query**
```sql
-- Used by PopularTimesService to query last 90 days
CREATE INDEX idx_bookings_popular_times
ON bookings(salon_id, created_at, start_ts)
WHERE status != 'CANCELLED';

-- Query this optimizes:
SELECT
  EXTRACT(DOW FROM start_ts) as day_of_week,
  EXTRACT(HOUR FROM start_ts) as hour,
  COUNT(*) as booking_count
FROM bookings
WHERE salon_id = ? AND created_at > NOW() - INTERVAL '90 days'
  AND status != 'CANCELLED'
GROUP BY day_of_week, hour;

-- Performance: <100ms for 90 days of data
```

**Index 3: Master Working Hours Lookup**
```sql
-- Used for slot availability calculation
-- Multi-column index: master_id first (high selectivity), then date
CREATE INDEX idx_bookings_master_date
ON bookings(master_id, date, start_time, end_time)
WHERE status != 'CANCELLED';

-- Query this optimizes:
SELECT start_time, end_time FROM bookings
WHERE master_id = ? AND date BETWEEN ? AND ?
  AND status != 'CANCELLED'
ORDER BY date, start_time;

-- Performance: <50ms for 30-day range
```

---

### 2.3 Prisma Schema

```prisma
// Backend/prisma/schema.prisma

model CustomerPreferences {
  id                        String   @id @default(uuid())
  customerId                String   @map("customer_id")

  // Favorites
  favoriteMasterId          String?  @map("favorite_master_id")
  favoriteServiceId         String?  @map("favorite_service_id")

  // Time preferences
  preferredDayOfWeek        String?  @map("preferred_day_of_week")
  preferredTimeOfDay        String?  @map("preferred_time_of_day")
  preferredHour             Int?     @map("preferred_hour")

  // Rebooking
  avgRebookingDays          Int?     @map("avg_rebooking_days")
  lastBookingDate           DateTime? @map("last_booking_date") @db.Date
  nextSuggestedBookingDate  DateTime? @map("next_suggested_booking_date") @db.Date

  // Statistics
  totalBookings             Int      @default(0) @map("total_bookings")

  // Timestamps
  createdAt                 DateTime @default(now()) @map("created_at")
  updatedAt                 DateTime @updatedAt @map("updated_at")

  // Relations
  customer                  Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
  favoriteMaster            Master?  @relation("FavoriteMaster", fields: [favoriteMasterId], references: [id], onDelete: SetNull)
  favoriteService           Service? @relation("FavoriteService", fields: [favoriteServiceId], references: [id], onDelete: SetNull)

  @@unique([customerId])
  @@index([customerId])
  @@index([nextSuggestedBookingDate])
  @@map("customer_preferences")
}

model Waitlist {
  id                      String   @id @default(uuid())

  // References
  salonId                 String   @map("salon_id")
  customerId              String   @map("customer_id")
  serviceId               String   @map("service_id")
  masterId                String?  @map("master_id")

  // Preferences
  preferredDate           DateTime? @map("preferred_date") @db.Date
  preferredTime           DateTime? @map("preferred_time") @db.Time

  // Notification
  notifyVia               String   @default("whatsapp") @map("notify_via")
  customerPhone           String?  @map("customer_phone")
  customerEmail           String?  @map("customer_email")

  // Status
  status                  String   @default("active")
  positionInQueue         Int?     @map("position_in_queue")

  // Lifecycle
  notifiedAt              DateTime? @map("notified_at")
  notificationExpiresAt   DateTime? @map("notification_expires_at")
  bookedAt                DateTime? @map("booked_at")
  slotOfferedId           String?  @map("slot_offered_id")

  // Timestamps
  createdAt               DateTime @default(now()) @map("created_at")
  updatedAt               DateTime @updatedAt @map("updated_at")

  // Relations
  salon                   Salon    @relation(fields: [salonId], references: [id], onDelete: Cascade)
  customer                Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
  service                 Service  @relation(fields: [serviceId], references: [id], onDelete: Cascade)
  master                  Master?  @relation(fields: [masterId], references: [id], onDelete: SetNull)

  @@index([salonId, serviceId, positionInQueue, createdAt])
  @@index([notificationExpiresAt])
  @@index([salonId, status, createdAt])
  @@map("waitlist")
}
```

---

### 2.4 Migration Strategy

**Step 1: Create Migration File**
```bash
cd Backend
npx prisma migrate dev --name add-interactive-booking-tables
```

**Step 2: Migration SQL** (auto-generated by Prisma)
```sql
-- CreateTable
CREATE TABLE "customer_preferences" (
  -- [Full schema from section 2.1]
);

-- CreateTable
CREATE TABLE "waitlist" (
  -- [Full schema from section 2.1]
);

-- CreateIndex
CREATE INDEX "idx_customer_prefs" ON "customer_preferences"("customer_id");
-- [All other indexes from section 2.2]
```

**Step 3: Rollback Plan** (if needed)
```sql
DROP TABLE IF EXISTS waitlist;
DROP TABLE IF EXISTS customer_preferences;
DROP INDEX IF EXISTS idx_bookings_availability;
DROP INDEX IF EXISTS idx_bookings_popular_times;
DROP INDEX IF EXISTS idx_bookings_master_date;
```

**Step 4: Data Seeding** (for testing)
```typescript
// Backend/prisma/seed.ts

// Seed customer preferences from existing bookings
const customers = await prisma.customer.findMany({
  include: { bookings: true }
});

for (const customer of customers) {
  if (customer.bookings.length >= 3) {
    const prefs = calculatePreferences(customer.bookings);
    await prisma.customerPreferences.create({
      data: {
        customerId: customer.id,
        ...prefs
      }
    });
  }
}
```

---

## 3. TypeScript Type System

### 3.1 Request/Response Types

**File**: `Backend/src/types/whatsapp.types.ts`

```typescript
/**
 * WhatsApp Interactive Booking Types
 * Auto-generated types for API contracts
 */

// ========================================
// Webhook Request Types
// ========================================

export interface WhatsAppWebhookPayload {
  object: 'whatsapp_business_account';
  entry: WhatsAppWebhookEntry[];
}

export interface WhatsAppWebhookEntry {
  id: string;
  changes: WhatsAppWebhookChange[];
}

export interface WhatsAppWebhookChange {
  value: WhatsAppWebhookValue;
  field: string;
}

export interface WhatsAppWebhookValue {
  messaging_product: 'whatsapp';
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts?: WhatsAppContact[];
  messages?: WhatsAppMessage[];
}

export interface WhatsAppMessage {
  from: string;
  id: string;
  timestamp: string;
  type: 'text' | 'interactive' | 'button' | 'image' | 'video';
  text?: { body: string };
  interactive?: ButtonClickPayload; // From section 1.1
}

// ========================================
// Service Request/Response Types
// ========================================

/**
 * SlotFinderService.findSlots() request
 */
export interface FindSlotsRequest {
  salonId: string;
  serviceId: string;
  preferredDate: string; // ISO date
  preferredTime?: string;
  masterId?: string;
  maxDaysAhead?: number;
}

/**
 * SlotFinderService.findSlots() response
 */
export interface FindSlotsResponse {
  success: boolean;
  slots: SlotSuggestion[];
  totalFound: number;
  searchedDays: number;
  message?: string;
}

/**
 * QuickBookingService.handleBookingRequest() request
 */
export interface QuickBookingRequest {
  text: string;
  customerPhone: string;
  salonId: string;
  language?: string;
}

/**
 * QuickBookingService.handleBookingRequest() response
 */
export interface QuickBookingResponse {
  success: boolean;
  messageType: 'interactive_card' | 'text' | 'error';
  payload: InteractiveMessagePayload | { text: string };
  intent?: BookingIntent;
}

/**
 * WaitlistService.add() request
 */
export interface AddToWaitlistRequest {
  salonId: string;
  customerId: string;
  serviceId: string;
  masterId?: string;
  preferredDate?: string;
  preferredTime?: string;
  notifyVia: 'whatsapp' | 'email';
}

/**
 * WaitlistService.add() response
 */
export interface AddToWaitlistResponse {
  success: boolean;
  waitlistId: string;
  positionInQueue: number;
  estimatedWaitTime?: string;
  message: string;
}
```

---

### 3.2 Service Interfaces

**File**: `Backend/src/modules/bookings/interfaces/slot-finder.interface.ts`

```typescript
import { SlotSuggestion, SlotSearchParams, SlotSearchResult } from '@/types';

/**
 * Slot Finder Service Interface
 *
 * Infinite slot search up to 30 days ahead
 *
 * @see spec.md FR-006 Infinite Availability Search
 * @see research.md Section 2.1 30-Day Search Performance
 */
export interface ISlotFinderService {
  /**
   * Find available slots with infinite search capability
   *
   * @param params - Search parameters
   * @returns Ranked available slots
   * @throws NoAvailabilityError if 0 slots in 30 days
   *
   * @performance <3s for 30-day window with 1000 bookings
   */
  findSlots(params: SlotSearchParams): Promise<SlotSearchResult>;

  /**
   * Check if specific slot is available (fast single-slot check)
   *
   * @param slot - Slot identifier
   * @returns Availability status
   *
   * @performance <50ms with proper indexes
   */
  checkSlotAvailable(slot: {
    masterId: string;
    date: string;
    time: string;
  }): Promise<boolean>;

  /**
   * Get master's working hours for date
   *
   * @param masterId - Master ID
   * @param date - Date to check
   * @returns Working hours or null if master doesn't work that day
   */
  getWorkingHours(
    masterId: string,
    date: Date
  ): Promise<{ start: string; end: string } | null>;

  /**
   * Calculate free slots (working hours - booked slots)
   *
   * @param masterId - Master ID
   * @param date - Date to calculate
   * @param serviceDuration - Service duration in minutes
   * @returns Array of free time slots
   */
  calculateFreeSlots(
    masterId: string,
    date: Date,
    serviceDuration: number
  ): Promise<Array<{ startTime: string; endTime: string }>>;
}
```

**File**: `Backend/src/modules/bookings/interfaces/alternative-suggester.interface.ts`

```typescript
import { SlotSuggestion, BookingIntent } from '@/types';

/**
 * Alternative Suggester Service Interface
 *
 * Ranks slot alternatives by proximity to customer's request
 *
 * @see spec.md FR-007 Alternative Slot Ranking Algorithm
 * @see research.md Section 2.1 Ranking Algorithm
 */
export interface IAlternativeSuggesterService {
  /**
   * Rank slots by proximity to preferred time
   *
   * @param slots - Available slots
   * @param intent - Customer's booking intent
   * @returns Slots sorted by rank (highest first)
   *
   * @algorithm
   * - Same master: +1000 points
   * - Within 1 hour: +500 points
   * - Within 2 hours: +300 points
   * - Same day: +200 points
   * - Time penalty: -(minutes_diff / 10)
   */
  rankSlots(
    slots: SlotSuggestion[],
    intent: BookingIntent
  ): Promise<SlotSuggestion[]>;

  /**
   * Calculate proximity score for a single slot
   *
   * @param slot - Slot to score
   * @param intent - Customer's intent
   * @returns Proximity score (0-2000 range typical)
   */
  calculateProximityScore(
    slot: SlotSuggestion,
    intent: BookingIntent
  ): number;

  /**
   * Label slot with proximity category
   *
   * @param score - Proximity score
   * @returns Label: 'exact' | 'close' | 'same-day' | 'same-week' | 'alternative'
   */
  labelProximity(score: number): 'exact' | 'close' | 'same-day' | 'same-week' | 'alternative';
}
```

---

### 3.3 Error Types

```typescript
/**
 * Custom error types for booking flow
 */

export class NoAvailabilityError extends Error {
  constructor(
    public salonId: string,
    public searchedDays: number,
    public actions: ('waitlist' | 'call')[]
  ) {
    super(`No availability found in ${searchedDays} days`);
    this.name = 'NoAvailabilityError';
  }
}

export class SlotConflictError extends Error {
  constructor(
    public slotId: string,
    public conflictingBookingId: string
  ) {
    super(`Slot ${slotId} already booked`);
    this.name = 'SlotConflictError';
  }
}

export class WaitlistNotificationExpiredError extends Error {
  constructor(
    public waitlistId: string,
    public expiredAt: Date
  ) {
    super(`Waitlist notification expired at ${expiredAt.toISOString()}`);
    this.name = 'WaitlistNotificationExpiredError';
  }
}

export class InvalidButtonIdError extends Error {
  constructor(public buttonId: string) {
    super(`Invalid button ID format: ${buttonId}`);
    this.name = 'InvalidButtonIdError';
  }
}
```

---

## 4. Entity Relationships

### 4.1 Entity Relationship Diagram (ERD)

```
┌─────────────────┐
│    Customer     │
│ ─────────────── │
│ - id            │
│ - phone         │
│ - name          │
└────────┬────────┘
         │
         │ 1:1
         ▼
┌────────────────────────┐
│  CustomerPreferences   │
│ ────────────────────── │
│ - id                   │
│ - customerId          │───┐
│ - favoriteMasterId    │   │
│ - favoriteServiceId   │   │
│ - preferredDayOfWeek  │   │
│ - avgRebookingDays    │   │
└────────────────────────┘   │
                             │
         ┌───────────────────┘
         │
         │ N:1        ┌─────────────┐
         └────────────│   Master    │
                      │ ─────────── │
                      │ - id        │
                      │ - name      │
                      │ - working_  │
                      │   hours     │
                      └──────┬──────┘
                             │
                             │ 1:N
                             ▼
                      ┌─────────────┐
                      │  Booking    │
                      │ ─────────── │
                      │ - id        │
                      │ - master_id │
                      │ - date      │
                      │ - start_ts  │
                      └──────┬──────┘
                             │
                             │ N:1
                             ▼
                      ┌─────────────┐
                      │  Service    │
                      │ ─────────── │
                      │ - id        │
                      │ - name      │
                      │ - duration  │
                      │ - price     │
                      └─────────────┘

┌─────────────────┐
│    Customer     │
└────────┬────────┘
         │
         │ 1:N
         ▼
┌────────────────────────┐
│      Waitlist          │
│ ────────────────────── │
│ - id                   │
│ - customerId          │
│ - salonId             │
│ - serviceId           │
│ - masterId (optional) │
│ - status              │
│ - positionInQueue     │
│ - notifiedAt          │
│ - notificationExpiresAt│
└────────────────────────┘
```

### 4.2 Key Relationships

**1. Customer → CustomerPreferences** (1:1)
- One customer has at most one preferences record
- Preferences created after customer makes 3+ bookings
- Cascade delete: If customer deleted, preferences deleted

**2. Customer → Waitlist** (1:N)
- One customer can be on multiple waitlists (different services/times)
- Cascade delete: If customer deleted, waitlist entries deleted

**3. CustomerPreferences → Master** (N:1)
- Favorite master can be null (no clear favorite yet)
- Set null on delete: If master deleted, clear favorite but keep preferences

**4. CustomerPreferences → Service** (N:1)
- Favorite service can be null
- Set null on delete: If service deleted, clear favorite

**5. Waitlist → Service** (N:1)
- Waitlist entry always references a specific service
- Cascade delete: If service deleted, remove waitlist entries

**6. Booking → Master** (N:1)
- Each booking assigned to one master
- Restrict delete: Cannot delete master with active bookings

---

## 5. Validation Schemas

### 5.1 Zod Schemas (Runtime Validation)

**File**: `Backend/src/validators/whatsapp.validator.ts`

```typescript
import { z } from 'zod';

/**
 * Button ID format validation
 * Pattern: {type}_{context}
 */
export const buttonIdSchema = z
  .string()
  .regex(
    /^(slot|confirm|waitlist|action|nav)_[a-zA-Z0-9_:-]+$/,
    'Invalid button ID format'
  )
  .max(256, 'Button ID too long (max 256 chars)');

/**
 * Phone number validation (E.164 format)
 */
export const phoneNumberSchema = z
  .string()
  .regex(/^\+[1-9]\d{1,14}$/, 'Phone must be E.164 format (+1234567890)');

/**
 * Interactive message payload validation
 */
export const interactiveMessageSchema = z.object({
  messaging_product: z.literal('whatsapp'),
  to: phoneNumberSchema,
  type: z.literal('interactive'),
  interactive: z.object({
    type: z.enum(['button', 'list']),
    body: z.object({
      text: z.string().max(1024, 'Body text too long (max 1024 chars)')
    }),
    action: z.union([
      // Reply buttons
      z.object({
        buttons: z.array(
          z.object({
            type: z.literal('reply'),
            reply: z.object({
              id: buttonIdSchema,
              title: z.string().max(20, 'Button title too long (max 20 chars)')
            })
          })
        ).max(3, 'Max 3 buttons allowed')
      }),
      // List message
      z.object({
        button: z.string().max(20),
        sections: z.array(
          z.object({
            title: z.string().max(24),
            rows: z.array(
              z.object({
                id: z.string().max(200),
                title: z.string().max(24),
                description: z.string().max(72).optional()
              })
            ).max(10, 'Max 10 rows per section')
          })
        )
      })
    ])
  })
});

/**
 * Slot suggestion validation
 */
export const slotSuggestionSchema = z.object({
  slotId: z.string().uuid(),
  date: z.date(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:mm)'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  duration: z.number().int().positive(),
  masterId: z.string().uuid(),
  masterName: z.string().min(1),
  serviceId: z.string().uuid(),
  serviceName: z.string().min(1),
  price: z.number().int().nonnegative(),
  available: z.boolean(),
  rank: z.number(),
  proximityLabel: z.enum(['exact', 'close', 'same-day', 'same-week', 'alternative']).optional(),
  isPreferred: z.boolean().optional(),
  isPopular: z.boolean().optional()
});

/**
 * Booking intent validation
 */
export const bookingIntentSchema = z.object({
  service: z.string().optional(),
  serviceId: z.string().uuid().optional(),
  master: z.string().optional(),
  masterId: z.string().uuid().optional(),
  preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  preferredTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  language: z.string().length(2),
  confidence: z.number().min(0).max(1),
  isReturningCustomer: z.boolean(),
  isAnytime: z.boolean(),
  isUsual: z.boolean(),
  originalMessage: z.string(),
  customerId: z.string().uuid(),
  salonId: z.string().uuid()
});
```

---

## Summary

This data model provides:

✅ **6 Core Entities** with complete TypeScript interfaces
✅ **2 New Database Tables** with optimized schema
✅ **4 Performance Indexes** for <3s slot search
✅ **Complete Type System** with request/response types
✅ **Service Interfaces** for all 6 new services
✅ **Validation Schemas** (Zod) for runtime safety
✅ **Entity Relationships** with cascade rules
✅ **Migration Strategy** with rollback plan

**Next**: Proceed to creating API contracts in `contracts/` directory.
