# AI Booking Assistant Enhancement - Services & Staff Integration

## Overview

The WhatsApp AI booking assistant has been enhanced to include full integration with Services and Masters (staff) modules, enabling intelligent service discovery, staff availability checking, and comprehensive booking flow management.

## Key Enhancements

### 1. Service Discovery & Matching
- **Fuzzy matching** for service names (handles typos and variations)
- **Category-based filtering** (HAIR, NAILS, FACIAL, MASSAGE, etc.)
- **Price and duration information** in real-time
- **Multi-language service names** support

### 2. Staff Availability Management
- **Real-time availability checking** for specific staff members
- **Working hours verification** (respects staff schedules and breaks)
- **Alternative staff suggestions** with same specialization
- **Time slot recommendations** when preferred times unavailable

### 3. Enhanced System Prompts
- **Dynamic context injection** (services & staff list)
- **Language-specific formatting** (5 languages supported)
- **Culturally-optimized communication** styles
- **Price and currency localization**

### 4. New AI Functions

#### `get_service_info(service_name)`
Retrieves detailed service information including:
- Service name and description
- Price and currency
- Duration in minutes
- Category classification
- Confidence score for fuzzy matches

#### `get_staff_availability(service_name, date_time)`
Finds available staff for a service at specific time:
- Checks all active staff members
- Verifies working hours
- Considers existing bookings
- Returns list of available staff with specializations

#### `check_availability(master_name, service_name, date_time)`
Enhanced availability check:
- Validates specific staff member availability
- Considers service duration
- Checks for booking conflicts
- Suggests alternative times if unavailable

#### `create_booking(customer_name, customer_phone, master_name, service_name, date_time)`
Smart booking creation:
- Validates service exists
- Confirms staff availability
- Creates booking with all details
- Returns formatted confirmation with price & duration

---

## Test Scenarios

### Scenario 1: Service Information Request

**Customer:** "What services do you offer?"

**Expected AI Behavior:**
1. List all services grouped by category
2. Show prices and durations
3. Ask which category interests them
4. Be ready to provide more details

**Example Response (Russian):**
```
У нас доступны следующие услуги:

**Волосы:**
  - Женская стрижка: 2000₽, 45 мин
  - Мужская стрижка: 1500₽, 30 мин
  - Окрашивание: 4000₽, 120 мин

**Ногти:**
  - Маникюр с гель-лаком: 1800₽, 60 мин
  - Педикюр: 2000₽, 75 мин

Какая категория вас интересует? 💅
```

**Function Calls:**
- None (services already in system prompt context)

---

### Scenario 2: Specific Service Price Inquiry

**Customer:** "How much is a manicure?"

**Expected AI Behavior:**
1. Call `get_service_info("manicure")`
2. Show all matching manicure services
3. Explain differences between options
4. Ask if they want to book

**Example Response (English):**
```
We have several manicure options:

💅 Classic Manicure: $30, 45 min
💅 Gel Polish Manicure: $45, 60 min
💅 Manicure with Design: $60, 75 min

Which one would you like? I can check availability for you! 😊
```

**Function Calls:**
```json
{
  "name": "get_service_info",
  "arguments": {
    "service_name": "manicure"
  }
}
```

---

### Scenario 3: Booking with Preferred Time

**Customer:** "I want a haircut tomorrow at 2pm"

**Expected AI Behavior:**
1. Call `get_service_info("haircut")` to clarify type
2. Ask which type of haircut (if multiple options)
3. Call `get_staff_availability("Women's Haircut", "2025-10-26T14:00:00Z")`
4. Show available staff
5. Ask customer preference or suggest first available
6. Confirm before booking

**Example Response (Spanish):**
```
Tenemos estos cortes de cabello:
- Corte de mujer: $35, 45 min
- Corte de hombre: $25, 30 min
- Corte de niño: $20, 20 min

¿Cuál prefieres?

Para mañana a las 14:00, estos estilistas están disponibles:
👨‍🎨 María (especialista en cortes de mujer)
👨‍🎨 Carlos (todos los estilos)

¿Con quién te gustaría reservar? 💇
```

**Function Calls:**
```json
[
  {
    "name": "get_service_info",
    "arguments": { "service_name": "haircut" }
  },
  {
    "name": "get_staff_availability",
    "arguments": {
      "service_name": "Women's Haircut",
      "date_time": "2025-10-26T14:00:00Z"
    }
  }
]
```

---

### Scenario 4: Staff Availability Check

**Customer:** "Is Sarah available on Friday?"

**Expected AI Behavior:**
1. Ask what time on Friday
2. Ask what service they want
3. Call `check_availability("Sarah", "service_name", "2025-10-28T15:00:00Z")`
4. If unavailable, call `get_staff_availability()` for alternatives
5. Suggest best options

**Example Response (Portuguese):**
```
Claro! Para qual horário na sexta-feira você está pensando?
E qual serviço você gostaria de fazer com Sarah?

*[Customer responds: "3pm, manicure"]*

Deixe-me verificar...

Sarah está disponível na sexta às 15:00 para manicure! ✅

Posso confirmar esta reserva para você?
- Serviço: Manicure com gel
- Profissional: Sarah
- Data: 28 de outubro, sexta-feira
- Horário: 15:00
- Duração: 60 min
- Preço: R$70
```

**Function Calls:**
```json
{
  "name": "check_availability",
  "arguments": {
    "master_name": "Sarah",
    "service_name": "Manicure com gel",
    "date_time": "2025-10-28T15:00:00Z"
  }
}
```

---

### Scenario 5: Book with Preferred Staff

**Customer:** "Book me with John for a massage"

**Expected AI Behavior:**
1. Call `get_service_info("massage")` to get options
2. Ask which type of massage
3. Ask preferred date/time
4. Call `check_availability("John", "massage_type", "date_time")`
5. If available, create booking
6. If not, suggest alternatives

**Example Response (Hebrew):**
```
יש לנו מספר אפשרויות עיסוי:
🌟 עיסוי רקמות עמוק: 250₪, 60 דקות
🌟 עיסוי שוודי: 220₪, 60 דקות
🌟 עיסוי ארומתרפיה: 280₪, 75 דקות

איזה סוג עיסוי תרצה?

*[Customer: "Deep tissue, tomorrow 4pm"]*

בודק זמינות של ג'ון...

ג'ון פנוי מחר בשעה 16:00! 🎉

אוכל לקבוע את התור?
📋 פרטי התור:
- שירות: עיסוי רקמות עמוק
- מעסה: ג'ון
- תאריך: 26 באוקטובר
- שעה: 16:00
- משך: 60 דקות
- מחיר: 250₪
```

**Function Calls:**
```json
[
  {
    "name": "get_service_info",
    "arguments": { "service_name": "massage" }
  },
  {
    "name": "check_availability",
    "arguments": {
      "master_name": "John",
      "service_name": "Deep Tissue Massage",
      "date_time": "2025-10-26T16:00:00Z"
    }
  },
  {
    "name": "create_booking",
    "arguments": {
      "customer_name": "Customer Name",
      "customer_phone": "+1234567890",
      "master_name": "John",
      "service_name": "Deep Tissue Massage",
      "date_time": "2025-10-26T16:00:00Z"
    }
  }
]
```

---

### Scenario 6: Unavailable Time Slot

**Customer:** "I want a haircut tomorrow at 10am"

**Expected AI Behavior:**
1. Get service info
2. Check staff availability at requested time
3. If nobody available, call `get_staff_availability()` for nearby times
4. Suggest 2-3 alternative slots
5. Ask customer preference

**Example Response (Russian):**
```
К сожалению, завтра в 10:00 все мастера заняты 😔

Но у нас есть свободные места:
✨ Завтра в 11:00 - с Марией
✨ Завтра в 14:30 - с Ольгой
✨ Завтра в 16:00 - с Анной

Какое время вам подходит? Или могу подобрать другой день? 📅
```

**Function Calls:**
```json
[
  {
    "name": "get_service_info",
    "arguments": { "service_name": "haircut" }
  },
  {
    "name": "get_staff_availability",
    "arguments": {
      "service_name": "Women's Haircut",
      "date_time": "2025-10-26T10:00:00Z"
    }
  }
]
```

---

### Scenario 7: Reschedule with Different Service

**Customer:** "I have a haircut booked, can I change it to coloring instead?"

**Expected AI Behavior:**
1. Ask for booking code or phone to find booking
2. Get new service info (coloring)
3. Explain duration and price difference
4. Check if same staff can do coloring
5. Check availability for same time
6. Offer to update or suggest new time

**Example Response (English):**
```
I'd be happy to help change your appointment!

Let me look up your haircut booking...

Great! I found your appointment:
- Currently: Women's Haircut with Sarah
- Date: Oct 26, 2pm
- Price: $40, 45 min

You want to change to:
- Hair Coloring: $120, 120 min

⚠️ Important:
- Coloring takes 120 minutes (2 hours)
- Your current slot is only 45 minutes
- I'll need to check if Sarah is free for the full 2 hours

Checking availability... Sarah is available from 2pm to 4pm! Perfect! ✅

Would you like me to update your booking to coloring?
New total: $120, 2:00 PM - 4:00 PM
```

**Function Calls:**
```json
[
  {
    "name": "get_service_info",
    "arguments": { "service_name": "coloring" }
  },
  {
    "name": "check_availability",
    "arguments": {
      "master_name": "Sarah",
      "service_name": "Hair Coloring",
      "date_time": "2025-10-26T14:00:00Z"
    }
  }
]
```

---

### Scenario 8: Service Requiring Specific Staff

**Customer:** "I need a facial treatment"

**Expected AI Behavior:**
1. Get service info for facial treatments
2. Check if certain facials require specific staff certifications
3. Filter available staff by qualifications
4. Present only qualified staff
5. Ask date/time preference

**Example Response (Spanish):**
```
Tenemos estos tratamientos faciales:

🌟 Limpieza Facial Profunda: $50, 60 min
🌟 Tratamiento Anti-Edad: $90, 75 min
🌟 Peeling Químico: $120, 90 min

Para el Peeling Químico, solo nuestras especialistas certificadas pueden realizarlo:
👩‍⚕️ Dra. Ana (dermatóloga certificada)
👩‍⚕️ Laura (esteticista con certificación avanzada)

¿Qué tratamiento te interesa y para cuándo? 📅
```

---

## Analytics Tracking

The enhanced system tracks:

### Service Metrics
- Most requested services
- Most booked services
- Services with highest conversion rate
- Average price per service category

### Staff Metrics
- Most requested staff members
- Most booked staff members
- Staff with highest customer satisfaction
- Staff utilization rate

### Booking Flow Metrics
- Inquiry to booking conversion rate
- Average questions before booking
- Most common failure reasons (unavailable time, no staff, etc.)
- Time to complete booking

### AI Performance
- Function call success rate
- Average response time per function
- Service matching accuracy
- Alternative suggestions acceptance rate

---

## Configuration Options

Add to `.env`:

```env
# AI Service & Staff Features
AI_INCLUDE_PRICES=true
AI_SUGGEST_ALTERNATIVES=true
AI_MAX_ALTERNATIVES=3
AI_ENABLE_SERVICE_MATCHING=true
AI_ENABLE_FUZZY_SEARCH=true
AI_SERVICE_MATCH_THRESHOLD=0.6
AI_MAX_CONTEXT_SERVICES=100
AI_MAX_CONTEXT_STAFF=50
```

---

## Error Handling

### Service Not Found
```
Извините, я не нашла услугу с таким названием 😔

Вот что у нас есть:
- Маникюр
- Педикюр
- Стрижка
- Окрашивание
- Массаж

Попробуйте выбрать из списка? 💅
```

### No Staff Available
```
К сожалению, на выбранное время нет свободных мастеров.

Могу предложить:
1. Другое время в этот же день
2. Этот же час в другой день
3. Другого мастера с той же специализацией

Что предпочитаете? 🤔
```

### Outside Working Hours
```
Извините, салон не работает в это время.

Наш график:
Пн-Пт: 9:00 - 21:00
Сб-Вс: 10:00 - 20:00

Выберите время в рабочих часах? ⏰
```

---

## Testing Recommendations

### Unit Tests
- [ ] Service fuzzy matching accuracy
- [ ] Staff availability calculation
- [ ] Time slot generation
- [ ] Confirmation formatting in all languages

### Integration Tests
- [ ] Full booking flow with services
- [ ] Alternative suggestions when unavailable
- [ ] Multi-language responses
- [ ] Price and duration accuracy

### End-to-End Tests
- [ ] WhatsApp message → Service info → Booking
- [ ] Staff preference → Availability check → Booking
- [ ] Unavailable slot → Alternatives → Booking
- [ ] Service not found → Suggestions → Booking

### Load Tests
- [ ] 100 concurrent service info requests
- [ ] 50 concurrent availability checks
- [ ] Context loading performance (100 services, 50 staff)

---

## Performance Optimizations

1. **Context Caching**: Services and staff lists cached per salon (5 min TTL)
2. **Lazy Loading**: Only load services when explicitly requested
3. **Batch Availability Checks**: Check multiple staff in single query
4. **Index Optimization**: Database indexes on `salon_id`, `is_active`, `category`

---

## Future Enhancements

1. **Smart Recommendations**: ML-based service suggestions based on past bookings
2. **Package Deals**: Offer combined services at discounted rates
3. **Loyalty Integration**: Apply discounts for returning customers
4. **Photo Support**: Send service photos via WhatsApp
5. **Review Integration**: Show staff ratings and reviews
6. **Waitlist Management**: Add to waitlist when fully booked
7. **Reminder System**: Automated reminders 24h before appointment
8. **Feedback Collection**: Post-appointment satisfaction survey

---

## Migration Notes

This enhancement is **backward compatible**. Existing bookings without `service_id` or `master_id` will continue to work, storing service/master info in text fields.

New bookings will:
- Link to `Service` entity via `service_id`
- Link to `Master` entity via `master_id`
- Include price and duration automatically
- Generate detailed confirmations

---

## Support

For issues or questions:
- Check logs in `Backend/src/modules/ai/ai.service.ts`
- Monitor function call success rates
- Review service matching confidence scores
- Test with various service name variations
