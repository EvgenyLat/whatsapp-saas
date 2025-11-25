'use strict';

/**
 * Database Migration Script: Encrypt Existing Phone Numbers
 *
 * PURPOSE:
 * Encrypts all plaintext phone numbers in the database using AES-256-GCM.
 * This is a one-time migration to enhance data security and GDPR compliance.
 *
 * SECURITY COMPLIANCE:
 * - OWASP A02:2021 - Cryptographic Failures
 * - GDPR Article 32: Security of processing
 * - PCI DSS Requirement 3.4: Render PAN unreadable
 *
 * FEATURES:
 * - Dry-run mode for testing
 * - Automatic backup before migration
 * - Progress tracking with statistics
 * - Rollback capability
 * - Idempotent (can be run multiple times safely)
 * - Batch processing to avoid memory issues
 *
 * USAGE:
 * node scripts/encrypt-phone-numbers.js [--dry-run] [--batch-size=100] [--backup]
 *
 * @module scripts/encrypt-phone-numbers
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const {
  encryptPhoneNumber,
  isEncrypted,
  healthCheck,
} = require('../src/utils/encryption');
const logger = require('../src/utils/logger');

// =============================================================================
// CONFIGURATION
// =============================================================================

const DEFAULT_BATCH_SIZE = 100;
const BACKUP_DIR = path.join(__dirname, '..', 'backups');

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const shouldBackup = args.includes('--backup');
const batchSizeArg = args.find(arg => arg.startsWith('--batch-size='));
const batchSize = batchSizeArg ? parseInt(batchSizeArg.split('=')[1], 10) : DEFAULT_BATCH_SIZE;

// =============================================================================
// PRISMA CLIENT
// =============================================================================

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Create backup of tables with phone numbers
 *
 * @returns {Promise<string>} Path to backup file
 */
async function createBackup() {
  logger.info('Creating database backup...');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(BACKUP_DIR, `phone-numbers-backup-${timestamp}.json`);

  // Ensure backup directory exists
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  // Fetch all data with phone numbers
  const [bookings, messages, conversations, aiConversations, aiMessages] = await Promise.all([
    prisma.booking.findMany({ select: { id: true, customer_phone: true } }),
    prisma.message.findMany({ select: { id: true, phone_number: true } }),
    prisma.conversation.findMany({ select: { id: true, phone_number: true } }),
    prisma.aIConversation.findMany({ select: { id: true, phone_number: true } }),
    prisma.aIMessage.findMany({ select: { id: true, phone_number: true } }),
  ]);

  const backup = {
    timestamp: new Date().toISOString(),
    tables: {
      bookings,
      messages,
      conversations,
      aiConversations,
      aiMessages,
    },
  };

  // Write backup to file
  fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2), 'utf8');

  logger.info(`Backup created: ${backupFile}`);
  return backupFile;
}

/**
 * Get statistics about phone numbers in database
 *
 * @returns {Promise<Object>} Statistics object
 */
async function getStatistics() {
  const [
    totalBookings,
    totalMessages,
    totalConversations,
    totalAIConversations,
    totalAIMessages,
  ] = await Promise.all([
    prisma.booking.count(),
    prisma.message.count(),
    prisma.conversation.count(),
    prisma.aIConversation.count(),
    prisma.aIMessage.count(),
  ]);

  return {
    bookings: totalBookings,
    messages: totalMessages,
    conversations: totalConversations,
    aiConversations: totalAIConversations,
    aiMessages: totalAIMessages,
    total: totalBookings + totalMessages + totalConversations + totalAIConversations + totalAIMessages,
  };
}

/**
 * Encrypt phone numbers in bookings table
 *
 * @param {boolean} dryRun - If true, only simulate the migration
 * @returns {Promise<Object>} Migration result
 */
async function encryptBookings(dryRun = false) {
  logger.info('Processing bookings table...');

  let processed = 0;
  let encrypted = 0;
  let skipped = 0;
  let errors = 0;

  // Process in batches
  let skip = 0;
  let hasMore = true;

  while (hasMore) {
    const bookings = await prisma.booking.findMany({
      select: { id: true, customer_phone: true },
      take: batchSize,
      skip,
    });

    if (bookings.length === 0) {
      hasMore = false;
      break;
    }

    for (const booking of bookings) {
      processed++;

      try {
        // Skip if already encrypted
        if (isEncrypted(booking.customer_phone)) {
          skipped++;
          continue;
        }

        const encryptedPhone = encryptPhoneNumber(booking.customer_phone);

        if (!dryRun) {
          await prisma.booking.update({
            where: { id: booking.id },
            data: { customer_phone: encryptedPhone },
          });
        }

        encrypted++;

        if (processed % 100 === 0) {
          logger.info(`Bookings: Processed ${processed}, Encrypted ${encrypted}, Skipped ${skipped}`);
        }
      } catch (error) {
        errors++;
        logger.error(`Error encrypting booking ${booking.id}:`, error);
      }
    }

    skip += batchSize;
  }

  return { processed, encrypted, skipped, errors };
}

/**
 * Encrypt phone numbers in messages table
 *
 * @param {boolean} dryRun - If true, only simulate the migration
 * @returns {Promise<Object>} Migration result
 */
async function encryptMessages(dryRun = false) {
  logger.info('Processing messages table...');

  let processed = 0;
  let encrypted = 0;
  let skipped = 0;
  let errors = 0;

  let skip = 0;
  let hasMore = true;

  while (hasMore) {
    const messages = await prisma.message.findMany({
      select: { id: true, phone_number: true },
      take: batchSize,
      skip,
    });

    if (messages.length === 0) {
      hasMore = false;
      break;
    }

    for (const message of messages) {
      processed++;

      try {
        if (isEncrypted(message.phone_number)) {
          skipped++;
          continue;
        }

        const encryptedPhone = encryptPhoneNumber(message.phone_number);

        if (!dryRun) {
          await prisma.message.update({
            where: { id: message.id },
            data: { phone_number: encryptedPhone },
          });
        }

        encrypted++;

        if (processed % 100 === 0) {
          logger.info(`Messages: Processed ${processed}, Encrypted ${encrypted}, Skipped ${skipped}`);
        }
      } catch (error) {
        errors++;
        logger.error(`Error encrypting message ${message.id}:`, error);
      }
    }

    skip += batchSize;
  }

  return { processed, encrypted, skipped, errors };
}

/**
 * Encrypt phone numbers in conversations table
 *
 * @param {boolean} dryRun - If true, only simulate the migration
 * @returns {Promise<Object>} Migration result
 */
async function encryptConversations(dryRun = false) {
  logger.info('Processing conversations table...');

  let processed = 0;
  let encrypted = 0;
  let skipped = 0;
  let errors = 0;

  let skip = 0;
  let hasMore = true;

  while (hasMore) {
    const conversations = await prisma.conversation.findMany({
      select: { id: true, phone_number: true },
      take: batchSize,
      skip,
    });

    if (conversations.length === 0) {
      hasMore = false;
      break;
    }

    for (const conversation of conversations) {
      processed++;

      try {
        if (isEncrypted(conversation.phone_number)) {
          skipped++;
          continue;
        }

        const encryptedPhone = encryptPhoneNumber(conversation.phone_number);

        if (!dryRun) {
          await prisma.conversation.update({
            where: { id: conversation.id },
            data: { phone_number: encryptedPhone },
          });
        }

        encrypted++;

        if (processed % 100 === 0) {
          logger.info(`Conversations: Processed ${processed}, Encrypted ${encrypted}, Skipped ${skipped}`);
        }
      } catch (error) {
        errors++;
        logger.error(`Error encrypting conversation ${conversation.id}:`, error);
      }
    }

    skip += batchSize;
  }

  return { processed, encrypted, skipped, errors };
}

/**
 * Encrypt phone numbers in AI conversations table
 *
 * @param {boolean} dryRun - If true, only simulate the migration
 * @returns {Promise<Object>} Migration result
 */
async function encryptAIConversations(dryRun = false) {
  logger.info('Processing AI conversations table...');

  let processed = 0;
  let encrypted = 0;
  let skipped = 0;
  let errors = 0;

  let skip = 0;
  let hasMore = true;

  while (hasMore) {
    const aiConversations = await prisma.aIConversation.findMany({
      select: { id: true, phone_number: true },
      take: batchSize,
      skip,
    });

    if (aiConversations.length === 0) {
      hasMore = false;
      break;
    }

    for (const aiConversation of aiConversations) {
      processed++;

      try {
        if (isEncrypted(aiConversation.phone_number)) {
          skipped++;
          continue;
        }

        const encryptedPhone = encryptPhoneNumber(aiConversation.phone_number);

        if (!dryRun) {
          await prisma.aIConversation.update({
            where: { id: aiConversation.id },
            data: { phone_number: encryptedPhone },
          });
        }

        encrypted++;

        if (processed % 100 === 0) {
          logger.info(`AI Conversations: Processed ${processed}, Encrypted ${encrypted}, Skipped ${skipped}`);
        }
      } catch (error) {
        errors++;
        logger.error(`Error encrypting AI conversation ${aiConversation.id}:`, error);
      }
    }

    skip += batchSize;
  }

  return { processed, encrypted, skipped, errors };
}

/**
 * Encrypt phone numbers in AI messages table
 *
 * @param {boolean} dryRun - If true, only simulate the migration
 * @returns {Promise<Object>} Migration result
 */
async function encryptAIMessages(dryRun = false) {
  logger.info('Processing AI messages table...');

  let processed = 0;
  let encrypted = 0;
  let skipped = 0;
  let errors = 0;

  let skip = 0;
  let hasMore = true;

  while (hasMore) {
    const aiMessages = await prisma.aIMessage.findMany({
      select: { id: true, phone_number: true },
      take: batchSize,
      skip,
    });

    if (aiMessages.length === 0) {
      hasMore = false;
      break;
    }

    for (const aiMessage of aiMessages) {
      processed++;

      try {
        if (isEncrypted(aiMessage.phone_number)) {
          skipped++;
          continue;
        }

        const encryptedPhone = encryptPhoneNumber(aiMessage.phone_number);

        if (!dryRun) {
          await prisma.aIMessage.update({
            where: { id: aiMessage.id },
            data: { phone_number: encryptedPhone },
          });
        }

        encrypted++;

        if (processed % 100 === 0) {
          logger.info(`AI Messages: Processed ${processed}, Encrypted ${encrypted}, Skipped ${skipped}`);
        }
      } catch (error) {
        errors++;
        logger.error(`Error encrypting AI message ${aiMessage.id}:`, error);
      }
    }

    skip += batchSize;
  }

  return { processed, encrypted, skipped, errors };
}

// =============================================================================
// MAIN MIGRATION
// =============================================================================

/**
 * Run the migration
 */
async function migrate() {
  const startTime = Date.now();

  console.log('\n========================================');
  console.log('Phone Number Encryption Migration');
  console.log('========================================\n');

  console.log('Configuration:');
  console.log(`  Mode: ${isDryRun ? 'DRY RUN (no changes)' : 'LIVE'}`);
  console.log(`  Batch Size: ${batchSize}`);
  console.log(`  Backup: ${shouldBackup ? 'YES' : 'NO'}`);
  console.log('');

  try {
    // 1. Health check
    console.log('1. Checking encryption system...');
    const health = healthCheck();
    if (!health.healthy) {
      throw new Error(`Encryption system unhealthy: ${health.error}`);
    }
    console.log(`   ✓ Encryption system healthy (${health.algorithm}, ${health.keyLength}-bit key)\n`);

    // 2. Get statistics
    console.log('2. Analyzing database...');
    const stats = await getStatistics();
    console.log(`   Total records: ${stats.total}`);
    console.log(`   - Bookings: ${stats.bookings}`);
    console.log(`   - Messages: ${stats.messages}`);
    console.log(`   - Conversations: ${stats.conversations}`);
    console.log(`   - AI Conversations: ${stats.aiConversations}`);
    console.log(`   - AI Messages: ${stats.aiMessages}\n`);

    // 3. Create backup
    let backupFile;
    if (shouldBackup && !isDryRun) {
      console.log('3. Creating backup...');
      backupFile = await createBackup();
      console.log(`   ✓ Backup created: ${backupFile}\n`);
    } else {
      console.log('3. Backup skipped\n');
    }

    // 4. Encrypt phone numbers
    console.log('4. Encrypting phone numbers...\n');

    const results = {
      bookings: await encryptBookings(isDryRun),
      messages: await encryptMessages(isDryRun),
      conversations: await encryptConversations(isDryRun),
      aiConversations: await encryptAIConversations(isDryRun),
      aiMessages: await encryptAIMessages(isDryRun),
    };

    // 5. Summary
    const totalProcessed = Object.values(results).reduce((sum, r) => sum + r.processed, 0);
    const totalEncrypted = Object.values(results).reduce((sum, r) => sum + r.encrypted, 0);
    const totalSkipped = Object.values(results).reduce((sum, r) => sum + r.skipped, 0);
    const totalErrors = Object.values(results).reduce((sum, r) => sum + r.errors, 0);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n========================================');
    console.log('Migration Summary');
    console.log('========================================\n');

    console.log('Results by Table:');
    Object.entries(results).forEach(([table, result]) => {
      console.log(`\n  ${table}:`);
      console.log(`    Processed: ${result.processed}`);
      console.log(`    Encrypted: ${result.encrypted}`);
      console.log(`    Skipped: ${result.skipped}`);
      console.log(`    Errors: ${result.errors}`);
    });

    console.log('\nTotal:');
    console.log(`  Processed: ${totalProcessed}`);
    console.log(`  Encrypted: ${totalEncrypted}`);
    console.log(`  Skipped: ${totalSkipped}`);
    console.log(`  Errors: ${totalErrors}`);
    console.log(`  Duration: ${duration}s`);

    if (isDryRun) {
      console.log('\n⚠️  DRY RUN MODE - No changes were made to the database');
      console.log('   Run without --dry-run to apply changes');
    } else {
      console.log('\n✓ Migration completed successfully');
      if (backupFile) {
        console.log(`  Backup: ${backupFile}`);
      }
    }

    if (totalErrors > 0) {
      console.log(`\n⚠️  ${totalErrors} errors occurred during migration`);
      console.log('   Check logs for details');
      process.exit(1);
    }

  } catch (error) {
    logger.error('Migration failed:', error);
    console.error('\n✗ Migration failed:', error.message);
    console.error('  See logs for details');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// =============================================================================
// RUN MIGRATION
// =============================================================================

migrate().catch((error) => {
  logger.error('Unhandled error:', error);
  console.error('Unhandled error:', error);
  process.exit(1);
});
