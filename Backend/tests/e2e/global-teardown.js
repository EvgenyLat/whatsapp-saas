/**
 * =============================================================================
 * GLOBAL TEARDOWN
 * =============================================================================
 * Runs once after all tests
 * =============================================================================
 */

const { DatabaseHelper } = require('./helpers/database-helper');
const { RedisHelper } = require('./helpers/redis-helper');

module.exports = async function globalTeardown(config) {
  console.log('\n🧹 Starting E2E Test Suite Teardown...\n');

  // Clean up database
  try {
    console.log('📦 Connecting to database...');
    const dbHelper = new DatabaseHelper();
    await dbHelper.connect();

    console.log('🧹 Cleaning up test data...');
    await dbHelper.cleanupAllTestData();

    const tables = ['salons', 'bookings', 'messages', 'conversations'];
    for (const table of tables) {
      const count = await dbHelper.getTableRowCount(table);
      console.log(`   - ${table}: ${count} rows remaining`);
    }

    await dbHelper.disconnect();
    console.log('✅ Database cleanup complete');
  } catch (error) {
    console.error('❌ Database cleanup failed:', error.message);
  }

  // Clean up Redis
  try {
    console.log('📦 Connecting to Redis...');
    const redisHelper = new RedisHelper();
    await redisHelper.connect();

    console.log('🧹 Flushing Redis test data...');
    const deleted = await redisHelper.flushTestData();
    console.log(`   - Deleted ${deleted} test keys`);

    await redisHelper.disconnect();
    console.log('✅ Redis cleanup complete');
  } catch (error) {
    console.log('⚠️  Redis cleanup skipped (not available)');
  }

  console.log('\n✅ Global teardown complete!\n');
};
