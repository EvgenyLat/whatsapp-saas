// =============================================================================
// WEBHOOK LOAD TEST
// =============================================================================
// Simulates WhatsApp webhook traffic with message processing and AI flow
// Tests: Webhook verification, message processing, AI conversations
// Pattern: 20 → 100 users over 10 minutes
// =============================================================================

import http from 'k6/http';
import { sleep, check } from 'k6';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import { config } from '../config/config.js';
import {
  makeRequest,
  randomPhoneNumber,
  randomElement,
  generateWebhookEvent,
  sleepBetween,
  logTestStart,
  logTestEnd,
} from '../utils/helpers.js';

// =============================================================================
// TEST CONFIGURATION
// =============================================================================

export const options = {
  stages: config.loadPatterns.webhook.stages,

  thresholds: {
    // Webhook processing includes AI, so higher thresholds
    http_req_duration: [
      `p(95)<${config.thresholds.webhook.p95}`, // P95 < 1000ms
      `p(99)<${config.thresholds.webhook.p99}`, // P99 < 2000ms
    ],
    http_req_failed: [`rate<${config.thresholds.webhook.errorRate}`], // < 2%

    // Per-endpoint thresholds
    'http_req_duration{endpoint:webhook_verify}': ['p(95)<100'],
    'http_req_duration{endpoint:webhook_receive}': ['p(95)<1500'],

    // Success rate
    checks: ['rate>0.98'], // 98% of checks should pass
  },

  tags: {
    test_type: 'webhook_load_test',
  },
};

// =============================================================================
// TEST DATA
// =============================================================================

const conversationFlows = [
  // Booking flow
  [
    'Hi, I want to book an appointment',
    'I need a haircut',
    'Tomorrow at 2pm',
    'John Smith',
    '+1234567890',
  ],

  // Information flow
  [
    'What services do you offer?',
    'How much is a haircut?',
    'What are your hours?',
    'Thank you!',
  ],

  // Cancellation flow
  [
    'I need to cancel my appointment',
    'Yes, cancel it',
    'Thank you',
  ],

  // Short interaction
  [
    'Hello',
    'Is anyone there?',
  ],
];

// =============================================================================
// SETUP
// =============================================================================

export function setup() {
  logTestStart('Webhook Load Test');

  const baseUrl = config.baseUrl;

  // Verify webhook endpoint exists
  const verifyParams = {
    'hub.mode': 'subscribe',
    'hub.verify_token': config.whatsapp.verifyToken,
    'hub.challenge': 'test-challenge',
  };

  const queryString = Object.keys(verifyParams)
    .map((key) => `${key}=${encodeURIComponent(verifyParams[key])}`)
    .join('&');

  const verifyRes = http.get(`${baseUrl}/webhook?${queryString}`);

  if (verifyRes.status !== 200) {
    console.warn(`⚠️  Webhook verification returned: ${verifyRes.status}`);
  } else {
    console.log('✅ Webhook endpoint is accessible');
  }

  console.log(`📍 Base URL: ${baseUrl}`);
  console.log(`👥 Load pattern: ${JSON.stringify(config.loadPatterns.webhook.stages)}`);

  return {
    baseUrl,
  };
}

// =============================================================================
// MAIN TEST SCENARIO
// =============================================================================

export default function (data) {
  const { baseUrl } = data;

  const headers = {
    'Content-Type': 'application/json',
  };

  // Generate test phone number
  const phoneNumber = randomPhoneNumber();

  // Select random conversation flow
  const conversation = randomElement(conversationFlows);

  // ==========================================================================
  // Test 1: Webhook Verification (Occasional)
  // ==========================================================================

  if (Math.random() < 0.1) {
    // 10% of requests test verification
    const verifyParams = {
      'hub.mode': 'subscribe',
      'hub.verify_token': config.whatsapp.verifyToken,
      'hub.challenge': `challenge-${Date.now()}`,
    };

    const queryString = Object.keys(verifyParams)
      .map((key) => `${key}=${encodeURIComponent(verifyParams[key])}`)
      .join('&');

    const verifyRes = http.get(`${baseUrl}/webhook?${queryString}`, {
      tags: { endpoint: 'webhook_verify' },
    });

    makeRequest('Webhook Verification', verifyRes, {
      'status is 200': (r) => r.status === 200,
      'returns challenge': (r) => r.body === verifyParams['hub.challenge'],
    });

    sleep(sleepBetween(0.5, 1));
  }

  // ==========================================================================
  // Test 2: Send Webhook Messages (Conversation Flow)
  // ==========================================================================

  conversation.forEach((messageText, index) => {
    // Generate webhook event
    const webhookPayload = generateWebhookEvent(phoneNumber, messageText);

    // Send webhook
    const webhookRes = http.post(`${baseUrl}/webhook`, JSON.stringify(webhookPayload), {
      headers,
      tags: { endpoint: 'webhook_receive' },
    });

    makeRequest(`Webhook Message ${index + 1}`, webhookRes, {
      'status is 200': (r) => r.status === 200,
      'response time < 3000ms': (r) => r.timings.duration < 3000, // Includes AI processing
    });

    // Simulate thinking time between messages
    if (index < conversation.length - 1) {
      sleep(sleepBetween(2, 5)); // User typing/reading time
    }
  });

  // ==========================================================================
  // Test 3: Status Update Webhooks (Delivery confirmations)
  // ==========================================================================

  if (Math.random() < 0.3) {
    // 30% of conversations send delivery confirmations
    const statusWebhook = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'test-entry-id',
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  display_phone_number: '1234567890',
                  phone_number_id: config.whatsapp.phoneNumberId,
                },
                statuses: [
                  {
                    id: `msg-${Date.now()}`,
                    status: randomElement(['sent', 'delivered', 'read']),
                    timestamp: Math.floor(Date.now() / 1000).toString(),
                    recipient_id: phoneNumber,
                  },
                ],
              },
              field: 'messages',
            },
          ],
        },
      ],
    };

    const statusRes = http.post(`${baseUrl}/webhook`, JSON.stringify(statusWebhook), {
      headers,
      tags: { endpoint: 'webhook_status' },
    });

    makeRequest('Status Update Webhook', statusRes, {
      'status is 200': (r) => r.status === 200,
    });
  }

  // Final wait before next VU iteration
  sleep(sleepBetween(5, 10));
}

// =============================================================================
// TEARDOWN
// =============================================================================

export function teardown(data) {
  logTestEnd('Webhook Load Test');
}

// =============================================================================
// RESULTS HANDLING
// =============================================================================

export function handleSummary(data) {
  console.log('\n📊 Generating reports...');

  // Calculate custom metrics
  const totalRequests = data.metrics.http_reqs?.values?.count || 0;
  const avgDuration = data.metrics.http_req_duration?.values?.avg || 0;
  const p95Duration = data.metrics.http_req_duration?.values['p(95)'] || 0;

  console.log(`\n📈 Webhook Test Results:`);
  console.log(`Total Webhook Calls: ${totalRequests}`);
  console.log(`Average Processing Time: ${avgDuration.toFixed(2)}ms`);
  console.log(`P95 Processing Time: ${p95Duration.toFixed(2)}ms`);

  return {
    './results/webhook-test-summary.html': htmlReport(data),
    './results/webhook-test-summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}
