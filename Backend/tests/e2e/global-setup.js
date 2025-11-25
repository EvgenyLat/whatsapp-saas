/**
 * =============================================================================
 * GLOBAL SETUP
 * =============================================================================
 * Runs once before all tests
 * =============================================================================
 */

const { DatabaseHelper } = require('./helpers/database-helper');
const { RedisHelper } = require('./helpers/redis-helper');

module.exports = async function globalSetup(config) {
  console.log('\n🚀 Starting E2E Test Suite Setup...\n');

  // Connect to database
  console.log('📦 Connecting to database...');
  const dbHelper = new DatabaseHelper();
  await dbHelper.connect();

  // Clean up any existing test data
  console.log('🧹 Cleaning up existing test data...');
  await dbHelper.cleanupAllTestData();

  // Verify database schema
  console.log('✅ Verifying database schema...');
  const tables = ['salons', 'bookings', 'messages', 'conversations'];
  for (const table of tables) {
    const count = await dbHelper.getTableRowCount(table);
    console.log(`   - ${table}: ${count} rows`);
  }

  await dbHelper.disconnect();

  // Connect to Redis (if available)
  try {
    console.log('📦 Connecting to Redis...');
    const redisHelper = new RedisHelper();
    await redisHelper.connect();

    // Flush test data
    console.log('🧹 Flushing Redis test data...');
    await redisHelper.flushTestData();

    const keyCount = await redisHelper.getKeyCount();
    console.log(`   - Redis keys: ${keyCount}`);

    await redisHelper.disconnect();
  } catch (error) {
    console.log('⚠️  Redis not available (tests will continue without it)');
  }

  // Verify environment variables
  console.log('🔧 Verifying environment variables...');
  const requiredEnvVars = ['BASE_URL', 'ADMIN_TOKEN'];
  const optionalEnvVars = [
    'DB_HOST',
    'DB_PORT',
    'DB_NAME',
    'DB_USER',
    'WHATSAPP_WEBHOOK_SECRET',
    'REDIS_HOST',
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.warn(`   ⚠️  Missing required env var: ${envVar}`);
    } else {
      console.log(`   ✅ ${envVar}: ${process.env[envVar]}`);
    }
  }

  for (const envVar of optionalEnvVars) {
    if (process.env[envVar]) {
      console.log(`   ✅ ${envVar}: ${process.env[envVar]}`);
    }
  }

  console.log('\n✅ Global setup complete!\n');
};
