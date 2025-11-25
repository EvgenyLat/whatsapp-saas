import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const webhookDuration = new Trend('webhook_duration');

export const options = {
  stages: [
    { duration: '1m', target: 10 },   // Warm up: ramp to 10 users
    { duration: '3m', target: 50 },   // Normal load: 50 concurrent users
    { duration: '2m', target: 100 },  // Peak load: 100 concurrent users
    { duration: '1m', target: 200 },  // Stress test: 200 concurrent users
    { duration: '2m', target: 100 },  // Scale back down
    { duration: '1m', target: 0 },    // Cool down
  ],
  thresholds: {
    // API performance requirements
    'http_req_duration': ['p(95)<2000'], // 95% of requests under 2s
    'http_req_duration{endpoint:webhook}': ['p(95)<1500'],
    'http_req_failed': ['rate<0.05'],    // Less than 5% errors
    'errors': ['rate<0.1'],              // Less than 10% business logic errors
    'webhook_duration': ['p(95)<2000'],  // 95% processed under 2s
  },
  ext: {
    loadimpact: {
      projectID: 3569463,
      name: 'WhatsApp Webhook Load Test'
    }
  }
};

const BASE_URL = __ENV.API_BASE || 'http://localhost:4000';
const VERIFY_TOKEN = __ENV.META_VERIFY_TOKEN || 'verify_token_here';

// Sample messages for testing
const messages = [
  'Хочу записаться на стрижку завтра в 14:00',
  'Запишите меня на маникюр на завтра в 15:00. Меня зовут Анна',
  'Отмените бронирование ABC123',
  'Сколько стоит стрижка?',
  'Какие у вас услуги?',
  'Запись на окрашивание 25.10.2025 в 16:00',
  'Хочу на педикюр в понедельник',
  'Отмена записи XYZ789',
];

export function setup() {
  // Verify webhook endpoint is accessible
  const res = http.get(`${BASE_URL}/healthz`);
  if (res.status !== 200) {
    throw new Error(`Health check failed: ${res.status}`);
  }
  console.log('Setup complete - API is healthy');
}

export default function () {
  const phoneNumber = `7${String(__VU).padStart(9, '0')}`; // Unique per VU
  const messageText = messages[Math.floor(Math.random() * messages.length)];

  // Simulate WhatsApp webhook payload
  const payload = JSON.stringify({
    object: 'whatsapp_business_account',
    entry: [{
      id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
      changes: [{
        value: {
          messaging_product: 'whatsapp',
          metadata: {
            display_phone_number: '15551234567',
            phone_number_id: 'PHONE_NUMBER_ID'
          },
          contacts: [{
            profile: {
              name: `Test User ${__VU}`
            },
            wa_id: phoneNumber
          }],
          messages: [{
            from: phoneNumber,
            id: `wamid.${Date.now()}.${__VU}`,
            timestamp: Math.floor(Date.now() / 1000).toString(),
            type: 'text',
            text: {
              body: messageText
            }
          }]
        },
        field: 'messages'
      }]
    }]
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'x-hub-signature-256': 'sha256=test_signature', // Mock signature for testing
    },
    tags: { endpoint: 'webhook' }
  };

  const startTime = new Date();
  const res = http.post(`${BASE_URL}/webhook`, payload, params);
  const duration = new Date() - startTime;

  // Record custom metrics
  webhookDuration.add(duration);

  // Validate response
  const success = check(res, {
    'webhook returns 200': (r) => r.status === 200,
    'webhook acknowledges receipt': (r) => r.body.includes('EVENT_RECEIVED') || r.status === 200,
    'response time acceptable': (r) => r.timings.duration < 3000,
  });

  if (!success) {
    errorRate.add(1);
    console.error(`Request failed: VU=${__VU}, Status=${res.status}, Duration=${duration}ms`);
  } else {
    errorRate.add(0);
  }

  // Simulate realistic user behavior
  sleep(Math.random() * 3 + 1); // 1-4 seconds between messages
}

export function teardown(data) {
  console.log('Load test completed');
}
