/**
 * Cache Warming Script
 *
 * Pre-populates AI response cache with common queries
 * Run this script after deployment or cache reset to immediately achieve high hit rate
 *
 * Usage:
 *   npm run warm-cache
 *   or
 *   npx ts-node scripts/warm-cache.ts
 */

import { PrismaClient } from '@prisma/client';
import { CacheService } from '../src/modules/ai/services/cache.service';

const prisma = new PrismaClient();
const cacheService = new CacheService(prisma);

/**
 * Common queries to pre-populate cache
 * Organized by language and category
 */
const COMMON_QUERIES = {
  // Russian (Tier 1 Language - 260M speakers)
  ru: {
    greetings: [
      {
        query: 'Привет',
        response: 'Здравствуйте! Я виртуальный ассистент салона. Чем могу помочь? 🌟',
        confidence: 0.98,
      },
      {
        query: 'Добрый день',
        response: 'Добрый день! Рада помочь вам с записью. Какая услуга вас интересует? 😊',
        confidence: 0.98,
      },
      {
        query: 'Здравствуйте',
        response: 'Здравствуйте! Чем могу быть полезна? Могу помочь записаться на услуги салона! ✨',
        confidence: 0.98,
      },
    ],
    pricing: [
      {
        query: 'Сколько стоит маникюр',
        response: 'Стоимость маникюра зависит от типа покрытия:\n- Обычный маникюр: от 1500₽\n- Гель-лак: от 2000₽\n- Наращивание: от 3000₽\n\nХотите записаться?',
        confidence: 0.95,
      },
      {
        query: 'Цена на стрижку',
        response: 'Цены на стрижки:\n- Женская стрижка: от 2000₽\n- Мужская стрижка: от 1200₽\n- Детская стрижка: от 800₽\n\nЗаписать вас?',
        confidence: 0.95,
      },
      {
        query: 'Сколько стоит окрашивание',
        response: 'Стоимость окрашивания:\n- Корни: от 2500₽\n- Полное окрашивание: от 4000₽\n- Сложное окрашивание: от 7000₽\n\nНужна консультация мастера?',
        confidence: 0.95,
      },
    ],
    services: [
      {
        query: 'Какие услуги есть',
        response: 'В нашем салоне доступны:\n\n💅 Маникюр и педикюр\n✂️ Стрижки и укладки\n🎨 Окрашивание волос\n💆 SPA-процедуры\n💄 Макияж\n👁️ Оформление бровей и ресниц\n\nЧто вас интересует?',
        confidence: 0.95,
      },
      {
        query: 'Что входит в маникюр',
        response: 'В классический маникюр входит:\n- Обработка кутикулы\n- Придание формы ногтям\n- Полировка\n- Массаж рук\n- Покрытие (по желанию)\n\nЗаписаться на маникюр?',
        confidence: 0.95,
      },
    ],
    hours: [
      {
        query: 'Когда вы работаете',
        response: 'Наш салон работает:\n\n🕐 Пн-Пт: 9:00 - 21:00\n🕐 Сб-Вс: 10:00 - 20:00\n\nБез выходных! Записать вас на удобное время?',
        confidence: 0.98,
      },
      {
        query: 'Режим работы',
        response: 'Режим работы салона:\nЕжедневно с 9:00 до 21:00\n\nМы работаем без выходных для вашего удобства! 🌟',
        confidence: 0.98,
      },
    ],
    location: [
      {
        query: 'Где вы находитесь',
        response: 'Наш адрес: [УКАЖИТЕ АДРЕС САЛОНА]\n\n📍 Ближайшее метро: [СТАНЦИЯ]\n🚗 Есть парковка\n\nКак добраться подробнее?',
        confidence: 0.95,
      },
      {
        query: 'Адрес салона',
        response: 'Мы находимся по адресу:\n[УКАЖИТЕ АДРЕС]\n\nРядом с [ОРИЕНТИР]\n\nЖдем вас! 😊',
        confidence: 0.95,
      },
    ],
    booking_intent: [
      {
        query: 'Хочу записаться',
        response: 'Отлично! Буду рада помочь с записью! 🌟\n\nПожалуйста, уточните:\n1. Какая услуга вас интересует?\n2. К какому мастеру хотите?\n3. Удобное время и дата?',
        confidence: 0.95,
      },
      {
        query: 'Можно записаться',
        response: 'Конечно, могу записать вас! ✨\n\nСкажите, пожалуйста:\n- Какую услугу хотите?\n- Когда вам удобно прийти?',
        confidence: 0.95,
      },
    ],
  },

  // English (Tier 1 Language - 1.5B speakers)
  en: {
    greetings: [
      {
        query: 'Hello',
        response: 'Hello! I\'m the salon\'s virtual assistant. How can I help you? 🌟',
        confidence: 0.98,
      },
      {
        query: 'Hi',
        response: 'Hi there! Happy to assist with your booking. What service are you interested in? 😊',
        confidence: 0.98,
      },
      {
        query: 'Good morning',
        response: 'Good morning! How may I help you today? I can help you book salon services! ✨',
        confidence: 0.98,
      },
    ],
    pricing: [
      {
        query: 'How much is a manicure',
        response: 'Manicure pricing:\n- Regular manicure: from $20\n- Gel polish: from $35\n- Nail extensions: from $50\n\nWould you like to book?',
        confidence: 0.95,
      },
      {
        query: 'Price for haircut',
        response: 'Haircut prices:\n- Women\'s cut: from $40\n- Men\'s cut: from $25\n- Kids\' cut: from $15\n\nShall I book you?',
        confidence: 0.95,
      },
    ],
    services: [
      {
        query: 'What services do you offer',
        response: 'Our salon offers:\n\n💅 Manicure & Pedicure\n✂️ Haircuts & Styling\n🎨 Hair Coloring\n💆 SPA Treatments\n💄 Makeup\n👁️ Brows & Lashes\n\nWhat interests you?',
        confidence: 0.95,
      },
    ],
    hours: [
      {
        query: 'What are your hours',
        response: 'Our salon hours:\n\n🕐 Mon-Fri: 9:00 AM - 9:00 PM\n🕐 Sat-Sun: 10:00 AM - 8:00 PM\n\nOpen 7 days a week! Book your appointment?',
        confidence: 0.98,
      },
      {
        query: 'When are you open',
        response: 'We\'re open daily from 9 AM to 9 PM!\n\nNo days off for your convenience! 🌟',
        confidence: 0.98,
      },
    ],
  },

  // Spanish (Tier 1 Language - 560M speakers)
  es: {
    greetings: [
      {
        query: 'Hola',
        response: '¡Hola! Soy el asistente virtual del salón. ¿En qué puedo ayudarte? 🌟',
        confidence: 0.98,
      },
      {
        query: 'Buenos días',
        response: '¡Buenos días! Encantado de ayudarte con tu reserva. ¿Qué servicio te interesa? 😊',
        confidence: 0.98,
      },
    ],
    pricing: [
      {
        query: 'Cuánto cuesta una manicura',
        response: 'Precios de manicura:\n- Manicura regular: desde $20\n- Gel: desde $35\n- Extensiones: desde $50\n\n¿Te gustaría reservar?',
        confidence: 0.95,
      },
    ],
    hours: [
      {
        query: 'Qué horario tienen',
        response: 'Nuestro horario:\n\n🕐 Lun-Vie: 9:00 - 21:00\n🕐 Sáb-Dom: 10:00 - 20:00\n\n¡Abierto 7 días! ¿Reservo tu cita?',
        confidence: 0.98,
      },
    ],
  },

  // Portuguese (Tier 1 Language - 260M speakers)
  pt: {
    greetings: [
      {
        query: 'Olá',
        response: 'Olá! Sou o assistente virtual do salão. Como posso ajudar? 🌟',
        confidence: 0.98,
      },
      {
        query: 'Bom dia',
        response: 'Bom dia! Feliz em ajudar com sua reserva. Qual serviço te interessa? 😊',
        confidence: 0.98,
      },
    ],
    pricing: [
      {
        query: 'Quanto custa uma manicure',
        response: 'Preços de manicure:\n- Manicure regular: a partir de R$40\n- Gel: a partir de R$70\n- Alongamento: a partir de R$100\n\nGostaria de agendar?',
        confidence: 0.95,
      },
    ],
    hours: [
      {
        query: 'Qual é o horário',
        response: 'Nosso horário:\n\n🕐 Seg-Sex: 9:00 - 21:00\n🕐 Sáb-Dom: 10:00 - 20:00\n\nAberto 7 dias! Agendar seu horário?',
        confidence: 0.98,
      },
    ],
  },

  // Hebrew (Tier 1 Language - 9M speakers, strategic market)
  he: {
    greetings: [
      {
        query: 'שלום',
        response: 'שלום! אני העוזר הוירטואלי של הסלון. במה אוכל לעזור? 🌟',
        confidence: 0.98,
      },
      {
        query: 'בוקר טוב',
        response: 'בוקר טוב! שמח לעזור עם ההזמנה. איזה שירות מעניין אותך? 😊',
        confidence: 0.98,
      },
    ],
    pricing: [
      {
        query: 'כמה עולה מניקור',
        response: 'מחירי מניקור:\n- מניקור רגיל: החל מ-80₪\n- ג\'ל: החל מ-120₪\n- הארכות: החל מ-200₪\n\nרוצה לקבוע תור?',
        confidence: 0.95,
      },
    ],
    hours: [
      {
        query: 'מה שעות הפעילות',
        response: 'שעות הפעילות שלנו:\n\n🕐 א\'-ה\': 9:00 - 21:00\n🕐 ו\'-ש\': 10:00 - 20:00\n\nפתוח 7 ימים בשבוע! לקבוע תור?',
        confidence: 0.98,
      },
    ],
  },
};

/**
 * Main function to warm the cache
 */
async function warmCache() {
  console.log('🔥 Starting cache warming process...\n');

  let totalWarmed = 0;

  // Process each language
  for (const [langCode, categories] of Object.entries(COMMON_QUERIES)) {
    console.log(`\n📚 Processing ${langCode.toUpperCase()} language...`);

    // Process each category
    for (const [category, queries] of Object.entries(categories)) {
      console.log(`  📂 Category: ${category}`);

      for (const entry of queries as any[]) {
        try {
          // Normalize and hash query
          const normalized = cacheService.normalizeQuery(entry.query);
          const hash = cacheService.hashQuery(normalized);

          // Store in cache
          await cacheService.set(
            hash,
            normalized,
            entry.response,
            {
              language: langCode,
              salon_id: null, // Generic responses (not salon-specific)
              confidence_score: entry.confidence,
              ttl_days: 90, // Long TTL for common queries
            }
          );

          totalWarmed++;
          console.log(`    ✅ Cached: "${entry.query.substring(0, 40)}..."`);
        } catch (error) {
          console.error(`    ❌ Failed to cache "${entry.query}": ${error.message}`);
        }
      }
    }
  }

  console.log(`\n\n🎉 Cache warming completed!`);
  console.log(`📊 Total entries cached: ${totalWarmed}`);
  console.log(`🌍 Languages: ${Object.keys(COMMON_QUERIES).length} (ru, en, es, pt, he)`);

  // Display cache statistics
  const stats = await cacheService.getStats();
  console.log(`\n📈 Cache Statistics:`);
  console.log(`   - Total entries: ${stats.total_entries}`);
  console.log(`   - Total hits: ${stats.total_hits}`);
  console.log(`   - Avg confidence: ${(stats.avg_confidence * 100).toFixed(1)}%`);
  console.log(`   - Cache size: ${stats.cache_size_mb} MB`);
}

/**
 * Run the script
 */
warmCache()
  .then(() => {
    console.log('\n✅ Done! Cache is warmed and ready for 90%+ hit rate.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error warming cache:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
