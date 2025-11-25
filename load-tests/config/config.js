// =============================================================================
// LOAD TEST CONFIGURATION
// =============================================================================
// Centralized configuration for all k6 load tests
// =============================================================================

export const config = {
  // Base URL for API tests
  baseUrl: __ENV.BASE_URL || 'http://localhost:4000',

  // Admin token for authenticated endpoints
  adminToken: __ENV.ADMIN_TOKEN || 'your-admin-token-here',

  // Test salon ID (create in advance)
  testSalonId: __ENV.TEST_SALON_ID || 'test-salon-123',

  // WhatsApp API configuration
  whatsapp: {
    verifyToken: __ENV.WHATSAPP_VERIFY_TOKEN || 'your-verify-token',
    phoneNumberId: __ENV.PHONE_NUMBER_ID || '1234567890',
  },

  // Thresholds for different test types
  thresholds: {
    api: {
      p95: 200, // ms
      p99: 500, // ms
      errorRate: 0.01, // 1%
    },
    webhook: {
      p95: 1000, // ms (includes AI processing)
      p99: 2000, // ms
      errorRate: 0.02, // 2%
    },
    database: {
      p95: 100, // ms
      p99: 200, // ms
      errorRate: 0.005, // 0.5%
    },
  },

  // Load patterns
  loadPatterns: {
    // Gradual ramp for API tests
    gradual: {
      stages: [
        { duration: '2m', target: 10 },  // Ramp to 10 users
        { duration: '3m', target: 50 },  // Ramp to 50 users
        { duration: '3m', target: 100 }, // Ramp to 100 users
        { duration: '2m', target: 0 },   // Ramp down
      ],
    },

    // Spike test pattern
    spike: {
      stages: [
        { duration: '10s', target: 10 },  // Warm up
        { duration: '1m', target: 500 },  // Spike!
        { duration: '2m', target: 500 },  // Hold
        { duration: '1m', target: 10 },   // Recover
        { duration: '10s', target: 0 },   // End
      ],
    },

    // Soak test pattern (stability)
    soak: {
      stages: [
        { duration: '2m', target: 50 },   // Ramp up
        { duration: '56m', target: 50 },  // Hold for 56 min
        { duration: '2m', target: 0 },    // Ramp down
      ],
    },

    // Stress test pattern (breaking point)
    stress: {
      stages: [
        { duration: '2m', target: 50 },
        { duration: '5m', target: 100 },
        { duration: '5m', target: 200 },
        { duration: '5m', target: 300 },
        { duration: '5m', target: 400 },
        { duration: '5m', target: 500 },
        { duration: '10m', target: 500 },
        { duration: '2m', target: 0 },
      ],
    },

    // Webhook test pattern
    webhook: {
      stages: [
        { duration: '1m', target: 20 },
        { duration: '5m', target: 100 },
        { duration: '2m', target: 100 },
        { duration: '2m', target: 0 },
      ],
    },

    // Database test pattern
    database: {
      stages: [
        { duration: '1m', target: 50 },
        { duration: '3m', target: 200 },
        { duration: '4m', target: 200 },
        { duration: '2m', target: 0 },
      ],
    },
  },

  // Sample test data
  testData: {
    salons: [
      {
        id: 'salon-001',
        name: 'Test Salon 1',
        phone: '+1234567890',
        whatsapp_business_id: 'test-business-123',
      },
    ],
    services: ['haircut', 'coloring', 'styling', 'treatment'],
    messageTypes: ['text', 'button', 'list', 'template'],
  },
};

export default config;
