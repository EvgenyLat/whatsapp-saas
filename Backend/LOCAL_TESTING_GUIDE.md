# Локальное Тестирование WhatsApp SaaS MVP

## 🚀 Как проверить работу без деплоя

### Метод 1: Интеграционные Тесты (Рекомендуется)

**Самый быстрый способ** - запустить готовые интеграционные тесты:

```bash
cd Backend

# Установить зависимости (если еще не установлены)
npm install

# Запустить базу данных PostgreSQL
docker-compose up -d postgres

# Применить миграции
npx prisma migrate deploy

# Запустить интеграционные тесты
npm run test:integration -- --testPathPattern="zero-typing"
```

**Что проверяют тесты:**
- ✅ Парсинг намерений AI (OpenAI GPT-3.5-turbo)
- ✅ Поиск доступных слотов в базе данных
- ✅ Создание интерактивных карточек WhatsApp
- ✅ Обработка нажатий на кнопки
- ✅ Создание бронирований в БД
- ✅ Полный flow: Текст → Кнопки → Подтверждение → Бронирование

---

### Метод 2: Локальный Сервер + ngrok + Настоящий WhatsApp

**Самый реалистичный способ** - подключить настоящий WhatsApp Business Account:

#### Шаг 1: Запустить локальный сервер

```bash
cd Backend

# Создать .env файл с настройками
cp .env.example .env

# Заполнить .env:
# OPENAI_API_KEY=sk-your-openai-key
# DATABASE_URL=postgresql://user:password@localhost:5432/whatsapp_saas
# WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
# WHATSAPP_ACCESS_TOKEN=your-access-token
# WHATSAPP_WEBHOOK_VERIFY_TOKEN=your-verify-token

# Запустить БД
docker-compose up -d postgres redis

# Применить миграции
npx prisma migrate deploy

# Заполнить тестовыми данными
npx ts-node prisma/seed.ts

# Запустить сервер в режиме разработки
npm run start:dev
```

Сервер запустится на `http://localhost:3000`

#### Шаг 2: Открыть туннель с ngrok

```bash
# Установить ngrok (если не установлен)
# Windows: https://ngrok.com/download
# Или через npm: npm install -g ngrok

# Запустить туннель
ngrok http 3000
```

Вы получите публичный URL типа: `https://abc123.ngrok.io`

#### Шаг 3: Настроить WhatsApp Webhook

1. Откройте Meta Developer Dashboard: https://developers.facebook.com/
2. Выберите ваше приложение → WhatsApp → Configuration
3. В разделе Webhook:
   - **Callback URL**: `https://abc123.ngrok.io/api/v1/whatsapp/webhook`
   - **Verify Token**: Значение из вашего `.env` файла
4. Нажмите "Verify and Save"
5. Подпишитесь на события: `messages`, `message_status`

#### Шаг 4: Протестировать реальный WhatsApp

Теперь отправьте сообщение на ваш WhatsApp Business номер:

```
Стрижка в пятницу в 15:00
```

**Ожидаемый результат:**
1. Бот отправит интерактивную карточку с 3 доступными слотами
2. Вы нажмете на кнопку слота
3. Бот отправит карточку подтверждения
4. Вы нажмете [Подтвердить]
5. Бот создаст бронирование и отправит подтверждение с номером

**Логи в консоли:**
```
[WhatsAppController] Webhook event received
[WebhookService] Processing booking request: "Стрижка в пятницу в 15:00"
[IntentParserService] Parsing intent with OpenAI...
[SlotFinderService] Finding slots for service: Haircut
[QuickBookingService] Found 3 available slots
[WhatsAppService] Sending interactive message...
```

---

### Метод 3: Postman/Thunder Client (API тестирование)

**Для тестирования отдельных эндпоинтов:**

#### Установка Postman коллекции

```bash
# Экспортировать Swagger документацию
# Сервер должен быть запущен
curl http://localhost:3000/api/docs-json > postman-collection.json

# Импортировать в Postman:
# File → Import → postman-collection.json
```

#### Тестовые запросы

**1. Проверить здоровье сервера:**
```http
GET http://localhost:3000/api/v1/health
```

**2. Симулировать WhatsApp webhook (текстовое сообщение):**
```http
POST http://localhost:3000/api/v1/whatsapp/webhook
Content-Type: application/json

{
  "entry": [{
    "changes": [{
      "value": {
        "messages": [{
          "from": "+1234567890",
          "type": "text",
          "text": {
            "body": "Haircut Friday 3pm"
          }
        }],
        "contacts": [{
          "profile": {
            "name": "Test Customer"
          }
        }]
      }
    }]
  }]
}
```

**3. Симулировать нажатие кнопки:**
```http
POST http://localhost:3000/api/v1/whatsapp/webhook
Content-Type: application/json

{
  "entry": [{
    "changes": [{
      "value": {
        "messages": [{
          "from": "+1234567890",
          "type": "interactive",
          "interactive": {
            "type": "button_reply",
            "button_reply": {
              "id": "slot_2025-10-31_15:00_m123",
              "title": "3:00 PM - Sarah"
            }
          }
        }]
      }
    }]
  }]
}
```

**4. Получить статистику аналитики:**
```http
GET http://localhost:3000/api/ai/analytics/us1/success-criteria
```

---

### Метод 4: Просмотр Логов и Базы Данных

#### Просмотр логов в реальном времени

```bash
# В отдельном терминале
cd Backend
npm run start:dev

# Логи будут выводиться в консоль
```

#### Просмотр базы данных

```bash
# Prisma Studio - веб-интерфейс для БД
npx prisma studio

# Откроется на http://localhost:5555
```

**В Prisma Studio можно:**
- Просматривать все таблицы (bookings, masters, services, etc.)
- Редактировать данные
- Добавлять тестовые записи
- Отслеживать созданные бронирования

#### Проверка Redis (кэш)

```bash
# Подключиться к Redis CLI
docker exec -it whatsapp-redis redis-cli

# Просмотреть все ключи
KEYS *

# Получить значение
GET some-key

# Очистить кэш
FLUSHALL
```

---

### Метод 5: Отладка в VS Code

**Для пошаговой отладки:**

#### Создать `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug NestJS",
      "runtimeArgs": [
        "-r",
        "ts-node/register",
        "-r",
        "tsconfig-paths/register"
      ],
      "args": ["${workspaceFolder}/Backend/src/main.ts"],
      "cwd": "${workspaceFolder}/Backend",
      "protocol": "inspector",
      "env": {
        "NODE_ENV": "development"
      }
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Tests",
      "runtimeArgs": [
        "--inspect-brk",
        "${workspaceFolder}/Backend/node_modules/.bin/jest",
        "--runInBand",
        "--testPathPattern=zero-typing"
      ],
      "cwd": "${workspaceFolder}/Backend",
      "protocol": "inspector"
    }
  ]
}
```

**Использование:**
1. Поставьте breakpoint в коде (нажмите на номер строки)
2. Нажмите F5 или Debug → Start Debugging
3. Выполните запрос через Postman
4. Код остановится на breakpoint

---

## 🔍 Что можно проверить локально

### 1. AI Парсинг (OpenAI)

```bash
# Запустить unit тест для IntentParserService
npm test -- intent-parser.service.spec.ts

# Проверить в Postman:
POST http://localhost:3000/api/ai/parse-intent
{
  "text": "Стрижка завтра в 14:00",
  "salonId": "salon-uuid-here"
}
```

### 2. Поиск Слотов

```bash
# Запустить unit тест для SlotFinderService
npm test -- slot-finder.service.spec.ts

# Проверить через базу данных:
npx prisma studio
# Открыть таблицу Masters → проверить working_hours
# Открыть таблицу Bookings → проверить существующие бронирования
```

### 3. Полный Booking Flow

```bash
# Запустить интеграционный тест
npm run test:integration -- zero-typing

# Или вручную через Postman:
# 1. POST /webhook (текст)
# 2. Получить interactive message
# 3. POST /webhook (button click)
# 4. Получить confirmation
# 5. POST /webhook (confirm button)
# 6. Проверить booking в Prisma Studio
```

### 4. Аналитика

```bash
# Проверить в БД
SELECT * FROM us1_analytics_events ORDER BY timestamp DESC;

# Или через API
GET http://localhost:3000/api/ai/analytics/us1/success-criteria
```

---

## 📊 Мониторинг во время тестирования

### Полезные команды

```bash
# Просмотр логов PostgreSQL
docker logs whatsapp-postgres -f

# Просмотр логов Redis
docker logs whatsapp-redis -f

# Просмотр активных подключений
docker ps

# Проверка использования памяти
docker stats

# Очистка тестовых данных
npx prisma migrate reset --force
npx ts-node prisma/seed.ts
```

### Полезные SQL запросы

```sql
-- Все бронирования за сегодня
SELECT * FROM bookings
WHERE DATE(start_ts) = CURRENT_DATE
ORDER BY start_ts;

-- Статистика по мастерам
SELECT
  m.name,
  COUNT(b.id) as total_bookings,
  SUM(CASE WHEN b.status = 'CONFIRMED' THEN 1 ELSE 0 END) as confirmed
FROM masters m
LEFT JOIN bookings b ON m.id = b.master_id
GROUP BY m.id, m.name;

-- Последние 10 событий аналитики
SELECT * FROM us1_analytics_events
ORDER BY timestamp DESC
LIMIT 10;
```

---

## 🎯 Рекомендуемый Workflow для Тестирования

### Быстрая проверка (5 минут)

```bash
# 1. Запустить БД
docker-compose up -d postgres

# 2. Запустить интеграционные тесты
npm run test:integration -- zero-typing

# 3. Просмотреть результаты
# Тесты покажут что работает, что нет
```

### Полная проверка (30 минут)

```bash
# 1. Запустить все сервисы
docker-compose up -d

# 2. Применить миграции
npx prisma migrate deploy

# 3. Заполнить тестовыми данными
npx ts-node prisma/seed.ts

# 4. Запустить сервер
npm run start:dev

# 5. В другом терминале - ngrok
ngrok http 3000

# 6. Настроить WhatsApp webhook (см. выше)

# 7. Отправить сообщение на WhatsApp

# 8. Проверить результаты:
#    - Консоль (логи)
#    - Prisma Studio (БД)
#    - WhatsApp (сообщения)
```

### Отладка проблем (1 час)

```bash
# 1. Включить подробные логи
# В .env:
DEBUG=*
LOG_LEVEL=debug

# 2. Запустить в режиме отладки
npm run start:debug

# 3. Подключить VS Code debugger

# 4. Поставить breakpoints в:
#    - webhook.service.ts (line ~76)
#    - quick-booking.service.ts (line ~90)
#    - intent-parser.service.ts (line ~120)
#    - slot-finder.service.ts (line ~80)

# 5. Отправить тестовый запрос

# 6. Пошагово пройти код
```

---

## 🐛 Типичные Проблемы и Решения

### 1. "Cannot connect to database"

```bash
# Проверить что PostgreSQL запущен
docker ps | grep postgres

# Если нет - запустить
docker-compose up -d postgres

# Проверить подключение
npx prisma db pull
```

### 2. "OpenAI API key invalid"

```bash
# Проверить .env
cat .env | grep OPENAI

# Убедиться что ключ начинается с sk-
# Получить новый: https://platform.openai.com/api-keys
```

### 3. "No available slots"

```bash
# Проверить что есть мастера с рабочими часами
npx prisma studio
# Открыть Masters → проверить working_hours

# Проверить что есть услуги
# Открыть Services → должны быть записи

# Проверить существующие бронирования
# Открыть Bookings → возможно все слоты заняты
```

### 4. "Webhook not receiving messages"

```bash
# Проверить ngrok
curl https://your-ngrok-url.ngrok.io/api/v1/health

# Проверить webhook в Meta Dashboard
# Configuration → Webhooks → проверить URL и токен

# Проверить подписки
# Webhooks → Subscriptions → должны быть messages, message_status
```

---

## 📝 Чеклист Перед Тестированием

- [ ] PostgreSQL запущен (`docker ps`)
- [ ] Redis запущен (опционально)
- [ ] Миграции применены (`npx prisma migrate deploy`)
- [ ] Тестовые данные созданы (`npx prisma db seed`)
- [ ] .env файл заполнен (OPENAI_API_KEY, DATABASE_URL, etc.)
- [ ] Зависимости установлены (`npm install`)
- [ ] Сервер запускается (`npm run start:dev`)
- [ ] Health endpoint работает (`curl localhost:3000/api/v1/health`)

---

## 🎉 Готово!

Теперь вы можете полностью протестировать приложение локально без деплоя:

✅ Интеграционные тесты для автоматической проверки
✅ Локальный сервер + ngrok для реального WhatsApp
✅ Postman для API тестирования
✅ Prisma Studio для просмотра БД
✅ VS Code Debugger для отладки

**Рекомендация:** Начните с интеграционных тестов, затем переходите к ngrok + WhatsApp для полной проверки.
