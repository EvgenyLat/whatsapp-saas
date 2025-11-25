/**
 * =============================================================================
 * SECURITY TEST FIXTURES
 * =============================================================================
 *
 * Test data generators and setup/teardown utilities for security tests.
 */

const { db } = require('../../../src/config/database');
const helpers = require('../helpers/security-helpers');

/**
 * Setup security test environment
 */
async function setupSecurityTest() {
  const salon = await createTestSalon();
  const validToken = helpers.generateToken({
    salonId: salon.id,
    role: 'admin',
    expiresIn: '1h',
  });

  return {
    salon,
    validToken,
  };
}

/**
 * Cleanup security test data
 */
async function cleanupSecurityTest(testData) {
  if (testData.salon) {
    await cleanupTestSalon(testData.salon.id);
  }
}

/**
 * Create a test salon
 */
async function createTestSalon(overrides = {}) {
  const defaultData = {
    name: `Test Salon ${Date.now()}`,
    phone: helpers.generateRandomPhone(),
    email: helpers.generateRandomEmail(),
    address: '123 Test Street',
    city: 'Test City',
    state: 'TS',
    zip: '12345',
    country: 'US',
    timezone: 'America/New_York',
    business_hours: {
      monday: { open: '09:00', close: '17:00' },
      tuesday: { open: '09:00', close: '17:00' },
      wednesday: { open: '09:00', close: '17:00' },
      thursday: { open: '09:00', close: '17:00' },
      friday: { open: '09:00', close: '17:00' },
      saturday: { open: '10:00', close: '16:00' },
      sunday: { closed: true },
    },
    ...overrides,
  };

  const salon = await db.models.Salon.create(defaultData);
  return salon;
}

/**
 * Cleanup test salon and all related data
 */
async function cleanupTestSalon(salonId) {
  // Delete related records first
  await db.models.Booking.destroy({ where: { salon_id: salonId }, force: true });
  await db.models.Message.destroy({ where: { salon_id: salonId }, force: true });
  await db.models.Conversation.destroy({ where: { salon_id: salonId }, force: true });

  // Delete salon
  await db.models.Salon.destroy({ where: { id: salonId }, force: true });
}

/**
 * Create a test booking
 */
async function createTestBooking(salonId, overrides = {}) {
  const defaultData = {
    salon_id: salonId,
    customer_name: 'Test Customer',
    customer_phone: helpers.generateRandomPhone(),
    customer_email: helpers.generateRandomEmail(),
    service: 'Haircut',
    datetime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    duration_minutes: 60,
    price: 50.00,
    status: 'pending',
    notes: 'Test booking',
    ...overrides,
  };

  const booking = await db.models.Booking.create(defaultData);
  return booking;
}

/**
 * Create a test message
 */
async function createTestMessage(salonId, customerPhone, overrides = {}) {
  const defaultData = {
    salon_id: salonId,
    from_phone: customerPhone,
    to_phone: helpers.generateRandomPhone(),
    body: 'Test message',
    direction: 'inbound',
    status: 'received',
    message_id: `msg_${Date.now()}`,
    timestamp: new Date(),
    ...overrides,
  };

  const message = await db.models.Message.create(defaultData);
  return message;
}

/**
 * Create webhook payload
 */
function createWebhookPayload(options = {}) {
  const {
    from = helpers.generateRandomPhone(),
    to = helpers.generateRandomPhone(),
    body = 'Test message',
    type = 'text',
    timestamp = Date.now(),
    message_id = `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`,
  } = options;

  const payload = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'test-entry-id',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: to,
                phone_number_id: 'test-phone-id',
              },
              contacts: [
                {
                  profile: {
                    name: 'Test User',
                  },
                  wa_id: from.replace('+', ''),
                },
              ],
              messages: [
                {
                  from: from.replace('+', ''),
                  id: message_id,
                  timestamp: Math.floor(timestamp / 1000).toString(),
                  type,
                  text: type === 'text' ? { body } : undefined,
                  image: type === 'image' ? { id: 'test-image-id' } : undefined,
                },
              ],
            },
            field: 'messages',
          },
        ],
      },
    ],
  };

  // Add media_url if specified
  if (options.media_url) {
    payload.entry[0].changes[0].value.messages[0].image = {
      id: 'test-image-id',
      url: options.media_url,
    };
  }

  return payload;
}

/**
 * Create booking data for POST requests
 */
function createBookingData(overrides = {}) {
  return {
    customer_name: 'Test Customer',
    customer_phone: helpers.generateRandomPhone(),
    customer_email: helpers.generateRandomEmail(),
    service: 'Haircut',
    datetime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    duration_minutes: 60,
    price: 50.00,
    notes: 'Test booking',
    ...overrides,
  };
}

/**
 * Create SQL injection test data
 */
function createSQLInjectionTestData() {
  return helpers.getSQLInjectionPayloads().map(payload => ({
    customer_name: payload,
    customer_phone: helpers.generateRandomPhone(),
    service: 'Haircut',
    datetime: new Date().toISOString(),
  }));
}

/**
 * Create XSS test data
 */
function createXSSTestData() {
  return helpers.getXSSPayloads().map(payload => ({
    customer_name: 'Test User',
    customer_phone: helpers.generateRandomPhone(),
    service: 'Haircut',
    datetime: new Date().toISOString(),
    notes: payload,
  }));
}

/**
 * Create test user with specific role
 */
async function createTestUser(salonId, role = 'viewer') {
  const userData = {
    salon_id: salonId,
    email: helpers.generateRandomEmail(),
    role,
    password_hash: await helpers.hashPassword('test-password-123'),
    created_at: new Date(),
  };

  const user = await db.models.User.create(userData);
  return user;
}

/**
 * Create test API key
 */
async function createTestApiKey(salonId, scopes = ['read:bookings']) {
  const apiKeyData = {
    salon_id: salonId,
    key_hash: await helpers.hashPassword(helpers.generateSecureRandom()),
    scopes: JSON.stringify(scopes),
    name: 'Test API Key',
    created_at: new Date(),
    expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
  };

  const apiKey = await db.models.ApiKey.create(apiKeyData);
  return apiKey;
}

/**
 * Create audit log entry
 */
async function createAuditLog(action, resourceType, resourceId, userId) {
  const auditData = {
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    user_id: userId,
    ip_address: '127.0.0.1',
    user_agent: 'test-agent',
    timestamp: new Date(),
    details: JSON.stringify({ test: true }),
  };

  const log = await db.models.AuditLog.create(auditData);
  return log;
}

/**
 * Create test conversation
 */
async function createTestConversation(salonId, customerPhone) {
  const conversationData = {
    salon_id: salonId,
    customer_phone: customerPhone,
    status: 'active',
    started_at: new Date(),
    context: JSON.stringify({
      intent: 'booking',
      entities: {},
    }),
  };

  const conversation = await db.models.Conversation.create(conversationData);
  return conversation;
}

/**
 * Create consent record
 */
async function createConsentRecord(salonId, customerPhone, consentType = 'marketing') {
  const consentData = {
    salon_id: salonId,
    customer_phone: customerPhone,
    consent_type: consentType,
    granted: true,
    granted_at: new Date(),
    ip_address: '127.0.0.1',
  };

  const consent = await db.models.Consent.create(consentData);
  return consent;
}

/**
 * Create rate limit test data
 */
function createRateLimitRequests(count = 100) {
  const requests = [];

  for (let i = 0; i < count; i++) {
    requests.push({
      customer_name: `Customer ${i}`,
      customer_phone: helpers.generateRandomPhone(),
      service: 'Haircut',
      datetime: new Date().toISOString(),
    });
  }

  return requests;
}

/**
 * Create malicious payloads for comprehensive testing
 */
function createMaliciousPayloads() {
  return {
    sql_injection: helpers.getSQLInjectionPayloads(),
    xss: helpers.getXSSPayloads(),
    command_injection: helpers.getCommandInjectionPayloads(),
    path_traversal: helpers.getPathTraversalPayloads(),
  };
}

/**
 * Create encrypted test data
 */
function createEncryptedTestData(data) {
  return helpers.encryptData(JSON.stringify(data));
}

/**
 * Create test file for upload testing
 */
function createTestFile(type = 'image', size = 1024) {
  const extensions = {
    image: 'jpg',
    document: 'pdf',
    video: 'mp4',
  };

  const buffer = Buffer.alloc(size);
  const filename = `test-file.${extensions[type] || 'txt'}`;

  return {
    buffer,
    filename,
    mimetype: `${type}/${extensions[type] || 'plain'}`,
  };
}

/**
 * Setup rate limit test environment
 */
async function setupRateLimitTest(redis) {
  // Clear any existing rate limit data
  const keys = await redis.keys('ratelimit:*');
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}

/**
 * Verify data is encrypted in database
 */
async function verifyDataEncryption(tableName, recordId, fieldName) {
  const result = await db.query(
    `SELECT ${fieldName} FROM ${tableName} WHERE id = $1`,
    [recordId]
  );

  const value = result.rows[0]?.[fieldName];

  if (!value) return false;

  // Check if value looks encrypted (base64 pattern)
  return /^[A-Za-z0-9+/=]+$/.test(value);
}

/**
 * Create test with expired token
 */
function createExpiredToken(salonId) {
  return helpers.generateToken({
    salonId,
    expiresIn: '-1h', // Already expired
  });
}

/**
 * Create test with tampered token
 */
function createTamperedToken(salonId) {
  const validToken = helpers.generateToken({ salonId });
  const parts = validToken.split('.');

  // Tamper with payload
  const tamperedPayload = Buffer.from('{"sub":"hacker"}').toString('base64');

  return `${parts[0]}.${tamperedPayload}.${parts[2]}`;
}

/**
 * Cleanup all test data
 */
async function cleanupAllTestData() {
  // Get all test salons (created with 'Test Salon' prefix)
  const testSalons = await db.models.Salon.findAll({
    where: {
      name: {
        [db.Sequelize.Op.like]: 'Test Salon%',
      },
    },
  });

  // Cleanup each salon
  for (const salon of testSalons) {
    await cleanupTestSalon(salon.id);
  }
}

module.exports = {
  // Setup/Teardown
  setupSecurityTest,
  cleanupSecurityTest,
  cleanupAllTestData,

  // Salon
  createTestSalon,
  cleanupTestSalon,

  // Bookings
  createTestBooking,
  createBookingData,

  // Messages
  createTestMessage,

  // Webhooks
  createWebhookPayload,

  // Users and Auth
  createTestUser,
  createTestApiKey,
  createExpiredToken,
  createTamperedToken,

  // Security Test Data
  createSQLInjectionTestData,
  createXSSTestData,
  createMaliciousPayloads,

  // Audit and Compliance
  createAuditLog,
  createConsentRecord,

  // Conversations
  createTestConversation,

  // Rate Limiting
  createRateLimitRequests,
  setupRateLimitTest,

  // Encryption
  createEncryptedTestData,
  verifyDataEncryption,

  // File Upload
  createTestFile,
};
