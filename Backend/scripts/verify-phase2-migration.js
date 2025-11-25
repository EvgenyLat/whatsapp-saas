/**
 * Phase 2 Migration Verification Script
 *
 * Verifies that all database changes from T006-T010 are correctly applied
 *
 * Usage:
 *   node scripts/verify-phase2-migration.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyMigration() {
  console.log('\n🔍 Phase 2 Migration Verification\n');
  console.log('='.repeat(60));

  let allChecks = true;

  try {
    // Test 1: Verify customer_preferences model exists
    console.log('\n✅ Test 1: CustomerPreferences model');
    try {
      await prisma.customerPreferences.findMany({ take: 1 });
      console.log('   ✓ Model accessible and queryable');
    } catch (error) {
      console.error('   ✗ Model not accessible:', error.message);
      allChecks = false;
    }

    // Test 2: Verify waitlist model exists
    console.log('\n✅ Test 2: Waitlist model');
    try {
      await prisma.waitlist.findMany({ take: 1 });
      console.log('   ✓ Model accessible and queryable');
    } catch (error) {
      console.error('   ✗ Model not accessible:', error.message);
      allChecks = false;
    }

    // Test 3: Verify customer_preferences constraints
    console.log('\n✅ Test 3: CustomerPreferences constraints');
    try {
      // Test CHECK constraint (should fail)
      try {
        await prisma.$executeRaw`
          INSERT INTO customer_preferences (id, customer_id, preferred_hour, created_at, updated_at)
          VALUES ('test-invalid-hour', 'test-customer-check', 25, NOW(), NOW());
        `;
        console.error('   ✗ CHECK constraint not working (allowed invalid hour)');
        allChecks = false;
        // Cleanup
        await prisma.$executeRaw`DELETE FROM customer_preferences WHERE id = 'test-invalid-hour';`;
      } catch (error) {
        if (error.message.includes('chk_preferred_hour') || error.message.includes('violates check constraint')) {
          console.log('   ✓ CHECK constraint working (preferred_hour 0-23)');
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('   ✗ Constraint test failed:', error.message);
      allChecks = false;
    }

    // Test 4: Verify indexes exist
    console.log('\n✅ Test 4: Performance indexes');
    try {
      const indexes = await prisma.$queryRaw`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename IN ('customer_preferences', 'waitlist', 'bookings')
        AND indexname IN (
          'idx_customer_prefs',
          'idx_customer_prefs_next_booking',
          'idx_waitlist_queue',
          'idx_waitlist_expiry',
          'idx_waitlist_salon',
          'idx_bookings_availability',
          'idx_bookings_popular_times'
        )
        ORDER BY indexname;
      `;

      const expectedIndexes = [
        'idx_bookings_availability',
        'idx_bookings_popular_times',
        'idx_customer_prefs',
        'idx_customer_prefs_next_booking',
        'idx_waitlist_expiry',
        'idx_waitlist_queue',
        'idx_waitlist_salon'
      ];

      const foundIndexes = indexes.map(i => i.indexname);
      const missingIndexes = expectedIndexes.filter(i => !foundIndexes.includes(i));

      if (missingIndexes.length === 0) {
        console.log('   ✓ All 7 performance indexes created');
        foundIndexes.forEach(idx => {
          console.log(`     - ${idx}`);
        });
      } else {
        console.error('   ✗ Missing indexes:', missingIndexes);
        allChecks = false;
      }
    } catch (error) {
      console.error('   ✗ Index verification failed:', error.message);
      allChecks = false;
    }

    // Test 5: Verify foreign key relationships
    console.log('\n✅ Test 5: Foreign key relationships');
    try {
      const foreignKeys = await prisma.$queryRaw`
        SELECT
          tc.constraint_name,
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          rc.delete_rule
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        JOIN information_schema.referential_constraints AS rc
          ON rc.constraint_name = tc.constraint_name
        WHERE tc.table_name IN ('customer_preferences', 'waitlist')
        AND tc.constraint_type = 'FOREIGN KEY'
        ORDER BY tc.table_name, kcu.column_name;
      `;

      console.log(`   ✓ Found ${foreignKeys.length} foreign key constraints`);
      foreignKeys.forEach(fk => {
        console.log(`     - ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name} (ON DELETE ${fk.delete_rule})`);
      });
    } catch (error) {
      console.error('   ✗ Foreign key verification failed:', error.message);
      allChecks = false;
    }

    // Test 6: Test CRUD operations
    console.log('\n✅ Test 6: CRUD operations');
    try {
      // Create test preference (if master and service exist)
      const masters = await prisma.master.findMany({ take: 1 });
      const services = await prisma.service.findMany({ take: 1 });

      if (masters.length > 0 && services.length > 0) {
        const testPref = await prisma.customerPreferences.create({
          data: {
            customer_id: 'test-customer-' + Date.now(),
            favorite_master_id: masters[0].id,
            favorite_service_id: services[0].id,
            preferred_day_of_week: 'friday',
            preferred_time_of_day: 'afternoon',
            preferred_hour: 15,
            total_bookings: 5
          }
        });

        console.log('   ✓ CREATE operation successful');

        // Read
        const found = await prisma.customerPreferences.findUnique({
          where: { id: testPref.id }
        });
        console.log('   ✓ READ operation successful');

        // Update
        await prisma.customerPreferences.update({
          where: { id: testPref.id },
          data: { total_bookings: 6 }
        });
        console.log('   ✓ UPDATE operation successful');

        // Delete
        await prisma.customerPreferences.delete({
          where: { id: testPref.id }
        });
        console.log('   ✓ DELETE operation successful');
      } else {
        console.log('   ⚠ Skipped (no masters or services for testing)');
      }
    } catch (error) {
      console.error('   ✗ CRUD test failed:', error.message);
      allChecks = false;
    }

    // Test 7: Verify migration status
    console.log('\n✅ Test 7: Migration status');
    try {
      const migrations = await prisma.$queryRaw`
        SELECT migration_name
        FROM _prisma_migrations
        WHERE migration_name LIKE '%customer_preferences_and_waitlist%'
        ORDER BY finished_at DESC
        LIMIT 1;
      `;

      if (migrations.length > 0) {
        console.log('   ✓ Migration applied:', migrations[0].migration_name);
      } else {
        console.error('   ✗ Migration not found in _prisma_migrations table');
        allChecks = false;
      }
    } catch (error) {
      console.error('   ✗ Migration status check failed:', error.message);
      allChecks = false;
    }

    console.log('\n' + '='.repeat(60));

    if (allChecks) {
      console.log('\n✅ ALL CHECKS PASSED - Phase 2 migration successful!\n');
      console.log('Database is ready for Phase 3 implementation.\n');
      return 0;
    } else {
      console.log('\n❌ SOME CHECKS FAILED - Please review errors above\n');
      return 1;
    }

  } catch (error) {
    console.error('\n❌ Verification failed with error:', error.message);
    console.error(error.stack);
    return 1;
  } finally {
    await prisma.$disconnect();
  }
}

// Run verification
verifyMigration()
  .then(exitCode => {
    process.exit(exitCode);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
